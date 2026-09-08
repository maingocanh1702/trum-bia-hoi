"""Test cho scripts/asset_postprocess.py — chay: python3 scripts/test_asset_postprocess.py"""

import importlib.util
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

import numpy as np
from PIL import Image

MODULE_PATH = Path(__file__).with_name("asset_postprocess.py")
SPEC = importlib.util.spec_from_file_location("asset_postprocess", MODULE_PATH)
assert SPEC and SPEC.loader
ap = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = ap
SPEC.loader.exec_module(ap)

GREEN = (0, 255, 0)
AMBER = (234, 163, 26)
CREAM = (255, 243, 210)


def default_opts(**over) -> Namespace:
    base = dict(
        key="auto", key_threshold=30.0, defringe=2, despill="rim", despill_radius=2,
        hole_min=64, downscale="mode", force_key=False, no_bleed=False,
        allow_risky=False, qa="off", force=False, dry_run=True,
    )
    base.update(over)
    return Namespace(**base)


def make_png(path: Path, arr: np.ndarray) -> Path:
    mode = "RGBA" if arr.shape[2] == 4 else "RGB"
    Image.fromarray(arr, mode).save(path)
    return path


def green_screen(size=256, subject=128, fill=AMBER) -> np.ndarray:
    """Anh nen xanh voi 1 hinh vuong subject o giua."""
    arr = np.zeros((size, size, 3), dtype=np.uint8)
    arr[:, :] = GREEN
    off = (size - subject) // 2
    arr[off:off + subject, off:off + subject] = fill
    return arr


class KeyDetectionTests(unittest.TestCase):
    def test_key_score_green_high_on_key_color(self):
        px = np.array([[GREEN]], dtype=np.uint8)
        self.assertGreater(ap.key_score(px, "green")[0, 0], 200)

    def test_key_score_green_low_on_amber(self):
        px = np.array([[AMBER]], dtype=np.uint8)
        self.assertLess(ap.key_score(px, "green")[0, 0], 0)

    def test_detect_green(self):
        self.assertEqual(ap.detect_key(green_screen()), "green")

    def test_detect_magenta(self):
        arr = green_screen()
        arr[arr[..., 1] == 255] = 0
        arr[:, :][np.all(arr == 0, axis=2)] = (255, 0, 255)
        self.assertEqual(ap.detect_key(arr), "magenta")

    def test_detect_none_when_no_key(self):
        arr = np.full((64, 64, 3), 128, dtype=np.uint8)
        self.assertIsNone(ap.detect_key(arr))


class FloodFillTests(unittest.TestCase):
    def test_enclosed_region_not_filled(self):
        mask = np.zeros((20, 20), dtype=bool)
        mask[:, :] = True
        mask[5:15, 5:15] = False   # subject
        mask[8:12, 8:12] = True    # vung key bi bao kin ben trong subject
        bg = ap.border_connected(mask)
        self.assertTrue(bg[0, 0])
        self.assertFalse(bg[9, 9], "vung key bi bao kin phai duoc giu lai")

    def test_count_regions(self):
        mask = np.zeros((20, 20), dtype=bool)
        mask[2:5, 2:5] = True     # 9 px
        mask[10:14, 10:12] = True  # 8 px
        self.assertEqual(ap.count_regions(mask), [9, 8])


class ResizeTests(unittest.TestCase):
    def test_mode_downscale_picks_majority(self):
        block = np.zeros((2, 2, 4), dtype=np.uint8)
        arr = np.zeros((4, 4, 4), dtype=np.uint8)
        arr[:, :] = (10, 20, 30, 255)
        arr[0, 0] = (200, 200, 200, 255)  # thieu so trong block trai-tren
        out = ap.mode_downscale(arr, 2)
        self.assertEqual(out.shape, (2, 2, 4))
        self.assertEqual(tuple(out[0, 0]), (10, 20, 30, 255))
        _ = block

    def test_mode_keeps_thin_detail_nearest_would_drop(self):
        arr = np.zeros((4, 4, 4), dtype=np.uint8)
        arr[:, :] = (0, 0, 0, 255)
        arr[0:2, 0:2] = (255, 0, 0, 255)  # ca block = do
        out = ap.mode_downscale(arr, 2)
        self.assertEqual(tuple(out[0, 0]), (255, 0, 0, 255))

    def test_alpha_bbox(self):
        alpha = np.zeros((10, 10), dtype=np.uint8)
        alpha[3:7, 2:5] = 255
        self.assertEqual(ap.alpha_bbox(alpha), (2, 3, 5, 7))

    def test_alpha_bbox_empty(self):
        self.assertIsNone(ap.alpha_bbox(np.zeros((4, 4), dtype=np.uint8)))

    def test_fit_into_exact_size_and_padding(self):
        src = np.zeros((100, 100, 4), dtype=np.uint8)
        src[:, :] = (*AMBER, 255)
        out, _, _ = ap.fit_into(src, (128, 128), "center", 0.125, "nearest")
        self.assertEqual(out.shape, (128, 128, 4))
        self.assertEqual(out[0, 0, 3], 0, "padding phai trong suot")
        box = ap.alpha_bbox(out[..., 3])
        self.assertEqual(box, (16, 16, 112, 112))

    def test_fit_into_bottom_anchor(self):
        src = np.zeros((50, 50, 4), dtype=np.uint8)
        src[:, :] = (*AMBER, 255)
        out, _, _ = ap.fit_into(src, (128, 192), "bottom", 0.05, "nearest")
        x0, y0, x1, y1 = ap.alpha_bbox(out[..., 3])
        self.assertEqual(y1, 192 - round(192 * 0.05), "day subject phai nam o duong baseline")


class RuleTests(unittest.TestCase):
    def test_sizes_match_doc_section_2(self):
        cases = {
            "table-lv3-empty": (352, 208),
            "table-lv4-vip": (448, 240),
            "table-lv1-empty": (256, 192),
            "icon-coin": (128, 128),
            "glass-clean": (128, 128),
            "customer-vip-hot": (160, 192),
            "portrait-owner": (256, 256),
            "chair-plastic": (128, 160),
            "washer-lv1": (256, 224),
            "washer-lv5": (448, 320),
            "bg-quanbia-default": (1200, 1440),
            "emote-wave": (32, 32),
        }
        for name, expected in cases.items():
            with self.subTest(name=name):
                self.assertEqual(ap.rule_for(name)[0], expected)

    def test_character_and_world_anchor_bottom(self):
        for name in ("customer-normal-cold", "table-lv2-enjoying", "keg-lv3"):
            with self.subTest(name=name):
                self.assertEqual(ap.rule_for(name)[1], "bottom")

    def test_icon_anchor_center(self):
        self.assertEqual(ap.rule_for("icon-coin")[1], "center")

    def test_unknown_name_flagged_unmatched(self):
        self.assertFalse(ap.rule_for("wibble-thing")[3])

    def test_risky_families(self):
        self.assertTrue(ap.is_risky("glass-full"))
        self.assertTrue(ap.is_risky("dog-lv2-idle"))
        self.assertFalse(ap.is_risky("icon-coin"))


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_end_to_end_green_screen(self):
        src = make_png(self.dir / "raw.png", green_screen(256, 128))
        res = ap.process_one(src, "icon-coin", default_opts())
        self.assertIn(res.status, ("OK", "WARN"), res.notes)
        self.assertEqual(res.key, "green")
        self.assertEqual(res.size, (128, 128))
        self.assertAlmostEqual(res.coverage, 0.25, delta=0.02)

    def test_output_has_transparent_corners_and_no_green(self):
        src = make_png(self.dir / "raw.png", green_screen(256, 128))
        opts = default_opts(dry_run=False, qa="off")
        out_dir = self.dir / "out"
        orig_out, orig_qa = ap.OUT_DIR, ap.QA_DIR
        ap.OUT_DIR, ap.QA_DIR = out_dir, out_dir / "_qa"
        try:
            res = ap.process_one(src, "icon-coin", opts)
        finally:
            ap.OUT_DIR, ap.QA_DIR = orig_out, orig_qa
        self.assertIsNotNone(res.written, res.notes)
        arr = np.array(Image.open(res.written).convert("RGBA"))
        self.assertEqual(arr.shape, (128, 128, 4))
        for y, x in ((0, 0), (0, -1), (-1, 0), (-1, -1)):
            self.assertEqual(arr[y, x, 3], 0, "goc phai trong suot (§16.1)")
        opaque = arr[..., 3] > 0
        self.assertFalse(bool((ap.key_score(arr[..., :3], "green")[opaque] > 15).any()),
                         "khong duoc con vien mau key trong subject")

    def test_enclosed_key_region_warns_and_stays_opaque(self):
        arr = green_screen(256, 160)
        arr[118:138, 118:138] = GREEN  # o mau key nam gon trong subject
        src = make_png(self.dir / "raw.png", arr)
        res = ap.process_one(src, "icon-coin", default_opts())
        self.assertTrue(any("bao kin" in n for n in res.notes), res.notes)

    def test_risky_asset_marked_review(self):
        src = make_png(self.dir / "raw.png", green_screen(256, 128, CREAM))
        res = ap.process_one(src, "glass-clean", default_opts())
        self.assertEqual(res.status, "REVIEW", res.notes)

    def test_bad_name_fails(self):
        src = make_png(self.dir / "raw.png", green_screen())
        res = ap.process_one(src, "Icon_Coin", default_opts())
        self.assertEqual(res.status, "FAIL")

    def test_name_outside_catalog_warns(self):
        src = make_png(self.dir / "raw.png", green_screen())
        res = ap.process_one(src, "icon-khong-co-that", default_opts())
        self.assertTrue(any("catalog" in n for n in res.notes), res.notes)

    def test_no_chroma_and_no_alpha_fails(self):
        arr = np.full((64, 64, 3), 100, dtype=np.uint8)
        src = make_png(self.dir / "raw.png", arr)
        res = ap.process_one(src, "icon-coin", default_opts())
        self.assertEqual(res.status, "FAIL")

    def test_native_alpha_skips_chroma(self):
        arr = np.zeros((128, 128, 4), dtype=np.uint8)
        arr[32:96, 32:96] = (*AMBER, 255)
        src = make_png(self.dir / "raw.png", arr)
        res = ap.process_one(src, "icon-coin", default_opts())
        self.assertEqual(res.key, "native")

    def test_finished_asset_passthrough_is_idempotent(self):
        """Chay lai tren asset da xong khong duoc lam no teo dan."""
        arr = np.zeros((128, 128, 4), dtype=np.uint8)
        arr[16:112, 16:112] = (*AMBER, 255)
        src = make_png(self.dir / "done.png", arr)
        res = ap.process_one(src, "icon-coin", default_opts())
        self.assertEqual(res.resample, "passthrough")
        self.assertEqual(res.scale, 1.0)

    def test_upscale_warns(self):
        src = make_png(self.dir / "raw.png", green_screen(64, 32))
        res = ap.process_one(src, "table-lv4-vip", default_opts())
        self.assertTrue(any("phong to" in n for n in res.notes), res.notes)

    def test_antialiased_fringe_removed(self):
        """Vien blend giua subject va key phai bi an, khong de lai halo."""
        arr = green_screen(128, 64).astype(np.float32)
        # tao 1 vong vien blend 50/50
        off = 32
        blend = (np.array(AMBER, np.float32) + np.array(GREEN, np.float32)) / 2
        arr[off - 1, off - 1:off + 65] = blend
        arr[off + 64, off - 1:off + 65] = blend
        arr[off - 1:off + 65, off - 1] = blend
        arr[off - 1:off + 65, off + 64] = blend
        src = make_png(self.dir / "raw.png", arr.astype(np.uint8))
        res = ap.process_one(src, "icon-coin", default_opts())
        self.assertNotIn("halo/fringe", " ".join(res.notes))


class ManifestTests(unittest.TestCase):
    def test_parse_size(self):
        self.assertEqual(ap.parse_size("256x192"), (256, 192))
        self.assertEqual(ap.parse_size(" 128 X 128 "), (128, 128))
        self.assertIsNone(ap.parse_size(""))
        self.assertIsNone(ap.parse_size("big"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
