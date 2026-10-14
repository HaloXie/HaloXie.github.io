import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseExif, hasEnoughExifForQuiz } from './exif-parser.mjs';

test('invalid JPEG metadata does not prevent parsing another photo', () => {
  const broken = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0, 8]).buffer;
  const sample = readFileSync(new URL('./samples/bee-eater.jpg', import.meta.url));
  const valid = sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength);
  assert.equal(hasEnoughExifForQuiz(parseExif(broken)), false);
  assert.equal(hasEnoughExifForQuiz(parseExif(valid)), true);
});

test('quiz rejects missing, zero and non-finite values used in scoring', () => {
  const valid = { hasExif: true, fNumber: 8, exposureTime: 0.001, iso: 400, focalLength: 300 };
  assert.equal(hasEnoughExifForQuiz(valid), true);
  for (const key of ['fNumber', 'exposureTime', 'iso', 'focalLength']) {
    for (const value of [undefined, 0, -1, Infinity, NaN]) {
      assert.equal(hasEnoughExifForQuiz({ ...valid, [key]: value }), false, `${key}=${value}`);
    }
  }
  assert.equal(hasEnoughExifForQuiz({ ...valid, focalLengthIn35mm: 0 }), false);
});
