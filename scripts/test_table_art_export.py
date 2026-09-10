"""Run with Python + Pillow/numpy: failed reproduction must not touch selected assets."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import export_table_art as art


class ReproductionSafety(unittest.TestCase):
    def test_invalid_size_or_changed_bytes_leave_assets_and_receipt_untouched(self):
        receipt = json.loads(art.RECEIPT.read_text())
        paths = [art.RECEIPT, art.ROOT / receipt['contactSheet'], *[art.ROOT / a['path'] for a in receipt['assets']]]
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


if __name__ == '__main__':
    unittest.main()
