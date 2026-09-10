"""Run with Python + Pillow/numpy: failed reproduction must not touch selected assets."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import export_table_art as art


class ReproductionSafety(unittest.TestCase):
    def test_invalid_size_or_changed_bytes_leave_assets_and_receipt_untouched(self):
        self.check_failure(art.RECEIPT)
        self.check_failure(art.ROOT / 'docs/reference/assets-owner-2026-09-08/keg-upgrades-imagegen.json')

    def check_failure(self, receipt_path):
        receipt = json.loads(receipt_path.read_text())
        paths = [receipt_path, art.ROOT / receipt['contactSheet'], *[art.ROOT / a['path'] for a in receipt['assets']]]
        before = [(p.read_bytes(), p.stat().st_mtime_ns) for p in paths]
        for field, bad in [('dimensions', [1, 1]), ('sha256', '0' * 64)]:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as directory:
                candidate = json.loads(json.dumps(receipt))
                candidate['assets'][-1][field] = bad  # Earlier assets must not publish either.
                manifest = Path(directory) / 'receipt.json'
                manifest.write_text(json.dumps(candidate))
                with patch.object(art, 'RECEIPT', manifest), self.assertRaises(AssertionError):
                    art.export()
                self.assertEqual([(p.read_bytes(), p.stat().st_mtime_ns) for p in paths], before)
                self.assertEqual(json.loads(manifest.read_text()), candidate)

    def test_both_recorded_batches_reproduce_without_changing_selected_files(self):
        for name in ['table-upgrades-imagegen.json', 'keg-upgrades-imagegen.json']:
            path = art.ROOT / 'docs/reference/assets-owner-2026-09-08' / name
            receipt = json.loads(path.read_text())
            captured = {}
            def capture(source, target):
                captured[target] = Path(source).read_bytes()
            with patch.object(art, 'copyfile', capture):
                art.export(path)
            for target, content in captured.items():
                self.assertEqual(content, target.read_bytes(), str(target))
            self.assertEqual(len(captured), len(receipt['assets']) + 1)


if __name__ == '__main__':
    unittest.main()
