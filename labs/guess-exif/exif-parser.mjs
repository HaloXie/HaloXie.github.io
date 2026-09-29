/**
 * Minimal JPEG EXIF parser — reads only the 5 tags this game needs:
 * FNumber, ExposureTime, ISOSpeedRatings, FocalLength, FocalLengthIn35mmFilm.
 * No GPS, no thumbnails, no other tags are read or exposed — by design (privacy).
 *
 * Works as:
 *  - a browser <script type="module"> import (exposes parseExif on window too), and
 *  - a Node ES module (imported by test/exif-check.mjs), from the *same* source file
 *    that index.html loads, so page and test share one implementation.
 *
 * Input: ArrayBuffer of the raw file bytes. Never touches network, never persists input.
 */

// EXIF tag IDs we care about (in the Exif IFD, tag 0x8769 sub-IFD of IFD0)
const TAG_EXPOSURE_TIME = 0x829a;
const TAG_FNUMBER = 0x829d;
const TAG_ISO_SPEED = 0x8827;
const TAG_FOCAL_LENGTH = 0x920a;
const TAG_FOCAL_LENGTH_35MM = 0xa405;
const TAG_EXIF_IFD_POINTER = 0x8769;

// TIFF data type sizes in bytes
const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

class ByteReader {
  constructor(view, littleEndian) {
    this.view = view;
    this.le = littleEndian;
  }
  u8(off) {
    return this.view.getUint8(off);
  }
  u16(off) {
    return this.view.getUint16(off, this.le);
  }
  u32(off) {
    return this.view.getUint32(off, this.le);
  }
  i32(off) {
    return this.view.getInt32(off, this.le);
  }
}

/**
 * Read one IFD entry's value as a number (rationals become a float via numerator/denominator).
 * tiffStart = absolute byte offset where the TIFF header ("II"/"MM") begins in the file.
 */
function readValue(reader, entryOffset, tiffStart) {
  const type = reader.u16(entryOffset + 2);
  const count = reader.u32(entryOffset + 4);
  const size = (TYPE_SIZES[type] || 1) * count;
  const valueOffset = size > 4 ? tiffStart + reader.u32(entryOffset + 8) : entryOffset + 8;

  switch (type) {
    case 3: // SHORT
      return reader.u16(valueOffset);
    case 4: // LONG
      return reader.u32(valueOffset);
    case 5: {
      // RATIONAL (unsigned num/den)
      const num = reader.u32(valueOffset);
      const den = reader.u32(valueOffset + 4);
      return den === 0 ? 0 : num / den;
    }
    case 9: // SLONG
      return reader.i32(valueOffset);
    case 10: {
      // SRATIONAL
      const num = reader.i32(valueOffset);
      const den = reader.i32(valueOffset + 4);
      return den === 0 ? 0 : num / den;
    }
    default:
      return undefined;
  }
}

/**
 * Walk one IFD, return a Map<tagId, numericValue> for only the tags we're looking for,
 * plus the Exif sub-IFD pointer if present.
 */
function readIfd(reader, ifdOffset, tiffStart, wantedTags) {
  const found = new Map();
  const entryCount = reader.u16(ifdOffset);
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = reader.u16(entryOffset);
    if (tag === TAG_EXIF_IFD_POINTER) {
      found.set(TAG_EXIF_IFD_POINTER, reader.u32(entryOffset + 8));
      continue;
    }
    if (wantedTags.has(tag)) {
      const val = readValue(reader, entryOffset, tiffStart);
      if (val !== undefined) found.set(tag, val);
    }
  }
  return found;
}

/**
 * Find the APP1 "Exif\0\0" segment in a JPEG and return its TIFF payload offset (absolute
 * byte offset of the "II"/"MM" marker) and length, or null if not found / not a JPEG.
 */
function findExifTiffSegment(view, byteLength) {
  if (byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG (SOI marker)

  let offset = 2;
  while (offset + 4 <= byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break; // corrupt / not a marker, stop
    if (marker === 0xffd8 || marker === 0xffd9) {
      offset += 2;
      continue;
    }
    if (marker >= 0xffd0 && marker <= 0xffd7) {
      offset += 2; // RST markers, no length field
      continue;
    }
    if (marker === 0xff01) {
      offset += 2;
      continue;
    }
    // marker has a 2-byte length that includes itself
    const segLen = view.getUint16(offset + 2);
    if (marker === 0xffe1) {
      // APP1 — check for "Exif\0\0" header
      const headerStart = offset + 4;
      if (
        view.getUint8(headerStart) === 0x45 && // E
        view.getUint8(headerStart + 1) === 0x78 && // x
        view.getUint8(headerStart + 2) === 0x69 && // i
        view.getUint8(headerStart + 3) === 0x66 && // f
        view.getUint8(headerStart + 4) === 0x00 &&
        view.getUint8(headerStart + 5) === 0x00
      ) {
        const tiffStart = headerStart + 6;
        return { tiffStart, tiffLength: segLen - 2 - 6 };
      }
    }
    if (marker === 0xffda) break; // SOS — start of scan data, no more metadata markers follow
    offset += 2 + segLen;
  }
  return null;
}

/**
 * Parse the 5 EXIF tags this game needs out of a JPEG file's raw bytes.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{fNumber?:number, exposureTime?:number, iso?:number, focalLength?:number,
 *            focalLengthIn35mm?:number, hasExif:boolean}}
 */
export function parseExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const seg = findExifTiffSegment(view, arrayBuffer.byteLength);
  if (!seg) return { hasExif: false };

  const { tiffStart } = seg;
  const endianMarker = view.getUint16(tiffStart);
  if (endianMarker !== 0x4949 && endianMarker !== 0x4d4d) return { hasExif: false }; // "II" or "MM"
  const littleEndian = endianMarker === 0x4949;
  const reader = new ByteReader(view, littleEndian);

  const magic = reader.u16(tiffStart + 2);
  if (magic !== 0x002a) return { hasExif: false };

  const ifd0Offset = tiffStart + reader.u32(tiffStart + 4);

  // IFD0 mainly to find the Exif sub-IFD pointer (0x8769); FocalLength etc live in the sub-IFD.
  const ifd0 = readIfd(reader, ifd0Offset, tiffStart, new Set());
  const exifIfdRel = ifd0.get(TAG_EXIF_IFD_POINTER);
  if (exifIfdRel === undefined) return { hasExif: false };

  const wanted = new Set([
    TAG_EXPOSURE_TIME,
    TAG_FNUMBER,
    TAG_ISO_SPEED,
    TAG_FOCAL_LENGTH,
    TAG_FOCAL_LENGTH_35MM,
  ]);
  const exifIfd = readIfd(reader, tiffStart + exifIfdRel, tiffStart, wanted);

  const result = { hasExif: true };
  if (exifIfd.has(TAG_FNUMBER)) result.fNumber = exifIfd.get(TAG_FNUMBER);
  if (exifIfd.has(TAG_EXPOSURE_TIME)) result.exposureTime = exifIfd.get(TAG_EXPOSURE_TIME);
  if (exifIfd.has(TAG_ISO_SPEED)) result.iso = exifIfd.get(TAG_ISO_SPEED);
  if (exifIfd.has(TAG_FOCAL_LENGTH)) result.focalLength = exifIfd.get(TAG_FOCAL_LENGTH);
  if (exifIfd.has(TAG_FOCAL_LENGTH_35MM)) result.focalLengthIn35mm = exifIfd.get(TAG_FOCAL_LENGTH_35MM);

  return result;
}

/**
 * Whether we have enough of the 4 quiz parameters to run a round.
 * (FocalLengthIn35mm substitutes for focalLength when present, so only one of the two is required.)
 */
export function hasEnoughExifForQuiz(exif) {
  return (
    exif.hasExif &&
    exif.fNumber !== undefined &&
    exif.exposureTime !== undefined &&
    exif.iso !== undefined &&
    (exif.focalLength !== undefined || exif.focalLengthIn35mm !== undefined)
  );
}
