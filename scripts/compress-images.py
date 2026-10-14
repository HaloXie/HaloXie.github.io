#!/usr/bin/env python3
"""Create WebP copies with a bounded quality floor; never overwrite sources."""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


SUPPORTED = {'.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'}
TARGET_BYTES = 100 * 1024
MAX_BYTES = 150 * 1024
QUALITIES = (90, 85, 80, 75)


def image_jobs(inputs, output):
    output = output.resolve()
    jobs = {}
    sources = set()
    for source in inputs:
        source = source.resolve(strict=True)
        if source.is_dir():
            if output == source or source in output.parents:
                raise ValueError('Output must be outside the input directory')
            files = sorted(p for p in source.rglob('*') if p.suffix.lower() in SUPPORTED and p.is_file())
        else:
            files = [source]
        for image in files:
            if image.suffix.lower() not in SUPPORTED:
                raise ValueError(f'Unsupported image: {image}')
            relative = image.relative_to(source) if source.is_dir() else Path(image.name)
            destination = output / relative.with_suffix('.webp')
            if destination in jobs and jobs[destination] != image:
                raise ValueError(f'Two inputs map to {destination}; select one source')
            jobs[destination] = image
            sources.add(image.resolve())
    if not jobs:
        raise ValueError('No supported images found')
    for destination in jobs:
        if destination.resolve() in sources:
            raise ValueError(f'Output would overwrite a source: {destination}')
        if destination.exists():
            raise ValueError(f'Output already exists: {destination}; use a new output directory')
    return jobs


def compress(source, candidate):
    original = source.read_bytes()
    is_webp = original[:4] == b'RIFF' and original[8:12] == b'WEBP'
    if is_webp and len(original) <= TARGET_BYTES:
        candidate.write_bytes(original)
        return 'unchanged'

    best = original if is_webp else None
    selected_quality = 'unchanged'
    frames = subprocess.run(['magick', 'identify', '-format', '%n\n', str(source)],
                            capture_output=True, text=True, check=True).stdout.splitlines()
    if frames != ['1']:
        raise ValueError(f'{source}: animated or multi-page images are not supported')
    normalized = candidate.with_suffix('.png')
    subprocess.run(['magick', str(source), '-auto-orient', '-colorspace', 'sRGB',
                    '-strip', f'PNG32:{normalized}'], capture_output=True, text=True, check=True)
    for quality in QUALITIES:
        result = subprocess.run(
            ['cwebp', '-quiet', '-m', '6', '-q', str(quality), '-sharp_yuv',
             str(normalized), '-o', str(candidate)],
            capture_output=True, text=True, check=False,
        )
        if result.returncode:
            raise ValueError(f'{source}: cwebp failed: {result.stderr.strip()}')
        encoded = candidate.read_bytes()
        if best is None or len(encoded) < len(best):
            best, selected_quality = encoded, quality
        if len(best) <= TARGET_BYTES:
            break
    if len(best) > MAX_BYTES:
        raise ValueError(f'{source}: still {len(best) / 1024:.1f} KiB at quality floor 75; simplify or resize the source')
    candidate.write_bytes(best)
    return selected_quality


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', nargs='+', type=Path, help='PNG/JPEG/TIFF/WebP files or directories')
    parser.add_argument('--output', required=True, type=Path, help='Separate output directory; existing files are never overwritten')
    args = parser.parse_args()
    if not shutil.which('cwebp'):
        parser.error('cwebp is required (macOS: brew install webp)')
    if not shutil.which('magick'):
        parser.error('ImageMagick is required (macOS: brew install imagemagick)')
    try:
        jobs = image_jobs(args.inputs, args.output.resolve())
        total_before = total_after = 0
        # Encode the whole batch before publishing any file, so a failed input leaves no partial batch.
        with tempfile.TemporaryDirectory(prefix='blog-webp-') as temporary:
            prepared = []
            for index, (destination, source) in enumerate(jobs.items()):
                candidate = Path(temporary) / f'{index}.webp'
                quality = compress(source, candidate)
                prepared.append((source, destination, candidate, quality))
            for source, destination, candidate, quality in prepared:
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open('xb') as output:
                    output.write(candidate.read_bytes())
                before, after = source.stat().st_size, destination.stat().st_size
                total_before += before
                total_after += after
                target_note = ' (above 100 KiB target)' if after > TARGET_BYTES else ''
                print(f'{source.name}: {before / 1024:.1f} -> {after / 1024:.1f} KiB; quality={quality}{target_note}; {destination}')
        print(f'Total: {total_before / 1024:.1f} -> {total_after / 1024:.1f} KiB ({100 * (1 - total_after / total_before):.1f}% smaller)')
        return 0
    except subprocess.CalledProcessError as error:
        print(f'Image decoding failed: {error.stderr.strip()}', file=sys.stderr)
        return 1
    except (OSError, ValueError) as error:
        print(f'Compression failed: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
