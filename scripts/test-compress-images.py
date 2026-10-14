#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('compress-images.py')
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('compress_images', SCRIPT)
images = importlib.util.module_from_spec(spec)
spec.loader.exec_module(images)


class CompressionTest(unittest.TestCase):
    def test_conversion_preserves_dimensions_and_transparency(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output = root / 'input.png', root / 'result.webp'
            subprocess.run(['magick', '-size', '1200x675', 'xc:none', '-fill', '#3280bd',
                            '-draw', 'rectangle 100,100 500,400', str(source)], check=True)
            before = source.read_bytes()
            images.compress(source, output)
            self.assertEqual(source.read_bytes(), before)
            self.assertLessEqual(output.stat().st_size, images.TARGET_BYTES)
            info = subprocess.check_output(['magick', 'identify', '-format', '%wx%h %[opaque]', str(output)], text=True)
            self.assertEqual(info.lower(), '1200x675 false')
            copied = root / 'copy.webp'
            self.assertEqual(images.compress(output, copied), 'unchanged')
            self.assertEqual(copied.read_bytes(), output.read_bytes())

    def test_rejects_collisions_existing_outputs_and_in_place_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            a, b = root / 'same.png', root / 'same.jpg'
            a.touch()
            b.touch()
            with self.assertRaisesRegex(ValueError, 'Two inputs'):
                images.image_jobs([a, b], root / 'out')
            with self.assertRaisesRegex(ValueError, 'outside'):
                images.image_jobs([root], root / 'out')
            webp = root / 'same.webp'
            webp.touch()
            with self.assertRaisesRegex(ValueError, 'overwrite a source'):
                images.image_jobs([webp], root)
            with self.assertRaisesRegex(ValueError, 'already exists'):
                images.image_jobs([a], root)

    def test_failed_batch_does_not_publish_valid_first_image(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            valid, invalid = root / 'good.png', root / 'broken.png'
            subprocess.run(['magick', '-size', '10x10', 'xc:red', str(valid)], check=True)
            invalid.write_text('not an image')
            result = subprocess.run(['python3', str(SCRIPT), str(valid), str(invalid),
                                     '--output', str(root / 'out')], capture_output=True)
            self.assertEqual(result.returncode, 1)
            self.assertFalse((root / 'out').exists())

    def test_oversized_image_fails_instead_of_lowering_quality_forever(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'noise.png'
            subprocess.run(['magick', '-size', '1200x675', 'xc:', '-seed', '42',
                            '+noise', 'Random', str(source)], check=True)
            result = subprocess.run(['python3', str(SCRIPT), str(source), '--output',
                                     str(root / 'out')], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertIn('quality floor 75', result.stderr)
            self.assertFalse((root / 'out').exists())


if __name__ == '__main__':
    unittest.main()
