#!/usr/bin/env python3
"""
asset_postprocess.py — Post-process asset thô (ChatGPT/ImageGen) -> asset production.

Pipeline: chroma-key removal -> despill -> alpha crop -> resize (nearest/mode/box)
          -> pad + anchor -> rename theo naming convention -> QA report.

Nguon spec:
  docs/asset-generation-prompts.md  §1.8 (TRANSPARENCY_LOCK, key color), §2 (native crop), §16 (QA)
  docs/asset-list-designer.md       §0.1 (production export rule), §11 (naming convention)

Vi du:
  # 1. Bo file thô vao assets/_raw/ roi tao manifest
  python3 scripts/asset_postprocess.py --init-manifest

  # 2. Sua cot `name` trong assets/_raw/manifest.tsv, roi chay thu
  python3 scripts/asset_postprocess.py --dry-run

  # 3. Ghi that
  python3 scripts/asset_postprocess.py

  # File le, khong can manifest
  python3 scripts/asset_postprocess.py --input raw.png --name washer-lv3
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    sys.exit(f"Thieu dependency: {exc}. Chay: pip3 install --user Pillow numpy")

REPO = Path(__file__).resolve().parent.parent
RAW_DIR = REPO / "assets" / "_raw"
OUT_DIR = REPO / "assets"
QA_DIR = REPO / "assets" / "_qa"
MANIFEST = RAW_DIR / "manifest.tsv"
DOC_FILES = [
    REPO / "docs" / "asset-generation-prompts.md",
    REPO / "docs" / "asset-list-designer.md",
]

# --------------------------------------------------------------------------
# 1. Bang rule size — docs/asset-generation-prompts.md §2 "Native production crop"
#    Match theo thu tu; regex dau tien khop se thang.
#    (regex, (w, h), anchor, padding_pct)
# --------------------------------------------------------------------------
SIZE_RULES: list[tuple[str, tuple[int, int], str, float]] = [
    # Background / scene / splash
    (r"^bg-.*-(splash|login|loading)$",   (2560, 1440), "center", 0.0),
    (r"^bg-",                             (1200, 1440), "center", 0.0),
    (r"^cutin-",                          (1200,  900), "center", 0.0),
    (r"^stall-|^scene-",                  ( 960,  720), "bottom", 0.02),
    # UI texture 9-slice
    (r"^panel-|^ui-|-9slice$",            ( 192,  192), "center", 0.0),
    # Portrait / avatar
    (r"^portrait-|^avatar-",              ( 256,  256), "center", 0.06),
    # Nhan vat gameplay
    (r"^(customer|owner|chairman|gangster|npc|dog|shipper)-",
                                          ( 160,  192), "bottom", 0.05),
    # Ban theo level — §2
    (r"^table-lv4",                       ( 448,  240), "bottom", 0.04),
    (r"^table-lv3",                       ( 352,  208), "bottom", 0.04),
    (r"^table-lv[12]",                    ( 256,  192), "bottom", 0.04),
    (r"^table-",                          ( 256,  192), "bottom", 0.04),
    # Thiet bi — Lv1-2 nho, Lv3+ lon
    (r"^(keg|washer|fridge|counter|kitchen)-lv[12]$",
                                          ( 256,  224), "bottom", 0.04),
    (r"^(keg|washer|fridge|counter|kitchen)-lv[345]$",
                                          ( 448,  320), "bottom", 0.04),
    (r"^(keg|washer|fridge|counter|kitchen)-",
                                          ( 256,  224), "bottom", 0.04),
    # Ghe / prop dung nho
    (r"^(chair|stool|prop|lantern|sign|plant)-",
                                          ( 128,  160), "bottom", 0.06),
    # Particle nho
    (r"^particle-|^fx-",                  (  32,   32), "center", 0.0),
    (r"^emote-",                          (  32,   32), "center", 0.08),
    # HUD / badge / menu / nguyen lieu / cosmetic icon — mac dinh 128
    (r"^(icon|badge|emoji|menu|mat|glass|item|theme|medal|leaderboard)-",
                                          ( 128,  128), "center", 0.12),
]
DEFAULT_SIZE = (128, 128)
DEFAULT_ANCHOR = "center"
DEFAULT_PAD_PCT = 0.12

# Asset co edge phuc tap — §1.8: "neu alpha chroma bi mat highlight hoac vien ban,
# dung va xin xac nhan truoc khi doi sang workflow native transparency".
RISKY_PATTERNS = [
    r"^glass-", r"smoke", r"^cutin-", r"^dog-", r"foam", r"^particle-",
    r"^fx-", r"steam", r"rain", r"^weather-",
]

KEYS = {
    "green":   (0, 255, 0),
    "magenta": (255, 0, 255),
}

NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


# --------------------------------------------------------------------------
# 2. Rule lookup
# --------------------------------------------------------------------------
def rel(path: Path) -> str:
    """Duong dan goi cho nguoi doc; khong vo neu path nam ngoai repo."""
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return str(path)


def rule_for(name: str) -> tuple[tuple[int, int], str, float, bool]:
    """Tra ve (size, anchor, pad_pct, matched). matched=False -> khong co rule."""
    for pattern, size, anchor, pad in SIZE_RULES:
        if re.search(pattern, name):
            return size, anchor, pad, True
    return DEFAULT_SIZE, DEFAULT_ANCHOR, DEFAULT_PAD_PCT, False


def is_risky(name: str) -> bool:
    return any(re.search(p, name) for p in RISKY_PATTERNS)


_CATALOG: set[str] | None = None


def catalog_names() -> set[str]:
    """Tap ten asset xuat hien trong docs (de canh bao ten sai chinh ta)."""
    global _CATALOG
    if _CATALOG is None:
        names: set[str] = set()
        for doc in DOC_FILES:
            if doc.exists():
                text = doc.read_text(encoding="utf-8", errors="replace")
                names |= set(re.findall(r"`([a-z0-9]+(?:-[a-z0-9]+)+)`", text))
        _CATALOG = names
    return _CATALOG


# --------------------------------------------------------------------------
# 3. Chroma-key
# --------------------------------------------------------------------------
def key_score(rgb: np.ndarray, key: str) -> np.ndarray:
    """Do 'giong key' bat bien voi do sang. Cao = giong nen key.

    green:   g troi hon ca r va b
    magenta: r va b cung troi hon g
    """
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    if key == "green":
        return (g - np.maximum(r, b)).astype(np.float32)
    return (np.minimum(r, b) - g).astype(np.float32)


def detect_key(rgb: np.ndarray) -> str | None:
    """Doan key tu vien anh. None = anh khong dung chroma-key."""
    border = np.concatenate([
        rgb[0, :].reshape(-1, 3), rgb[-1, :].reshape(-1, 3),
        rgb[:, 0].reshape(-1, 3), rgb[:, -1].reshape(-1, 3),
    ])
    best, best_frac = None, 0.0
    for name in KEYS:
        frac = float((key_score(border, name) > 60).mean())
        if frac > best_frac:
            best, best_frac = name, frac
    # Can it nhat 50% vien la mau key moi coi la chroma-key
    return best if best_frac >= 0.5 else None


def border_connected(mask: np.ndarray) -> np.ndarray:
    """Scanline flood fill: chi lay vung mask noi voi vien anh.

    Giu nguyen vung mau key BI BAO KIN ben trong subject (vd ao xanh, la cay),
    dung §1.8 'Do not use {KEY_COLOR} anywhere inside the subject' — neu van co
    thi bao cao cho nguoi quyet dinh, khong tu dong duc thung.
    """
    h, w = mask.shape
    out = np.zeros_like(mask)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        if mask[0, x]:
            stack.append((0, x))
        if mask[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if mask[y, 0]:
            stack.append((y, 0))
        if mask[y, w - 1]:
            stack.append((y, w - 1))

    while stack:
        y, x = stack.pop()
        if out[y, x] or not mask[y, x]:
            continue
        x1 = x
        while x1 > 0 and mask[y, x1 - 1] and not out[y, x1 - 1]:
            x1 -= 1
        x2 = x
        while x2 < w - 1 and mask[y, x2 + 1] and not out[y, x2 + 1]:
            x2 += 1
        out[y, x1:x2 + 1] = True
        for ny in (y - 1, y + 1):
            if 0 <= ny < h:
                cand = mask[ny, x1:x2 + 1] & ~out[ny, x1:x2 + 1]
                idx = np.flatnonzero(cand)
                if idx.size:
                    starts = idx[np.concatenate(([True], np.diff(idx) > 1))]
                    for i in starts:
                        stack.append((ny, x1 + int(i)))
    return out


def dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        acc = out.copy()
        acc[1:, :] |= out[:-1, :]
        acc[:-1, :] |= out[1:, :]
        acc[:, 1:] |= out[:, :-1]
        acc[:, :-1] |= out[:, 1:]
        out = acc
    return out


def count_regions(mask: np.ndarray) -> list[int]:
    """Dem cac vung roi rac trong mask, tra ve list dien tich (giam dan)."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    areas: list[int] = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if seen[sy, sx]:
            continue
        area = 0
        stack = [(sy, sx)]
        while stack:
            y, x = stack.pop()
            if seen[y, x] or not mask[y, x]:
                continue
            x1 = x
            while x1 > 0 and mask[y, x1 - 1] and not seen[y, x1 - 1]:
                x1 -= 1
            x2 = x
            while x2 < w - 1 and mask[y, x2 + 1] and not seen[y, x2 + 1]:
                x2 += 1
            seen[y, x1:x2 + 1] = True
            area += x2 - x1 + 1
            for ny in (y - 1, y + 1):
                if 0 <= ny < h:
                    cand = mask[ny, x1:x2 + 1] & ~seen[ny, x1:x2 + 1]
                    idx = np.flatnonzero(cand)
                    if idx.size:
                        starts = idx[np.concatenate(([True], np.diff(idx) > 1))]
                        for i in starts:
                            stack.append((ny, x1 + int(i)))
        areas.append(area)
    areas.sort(reverse=True)
    return areas


def despill(rgb: np.ndarray, key: str, where: np.ndarray) -> tuple[np.ndarray, int]:
    """Khu vien mau key con sot (halo/fringe) — QA §16.1.

    Chi ap trong vung `where` (mac dinh: rim quanh alpha) de khong lam bay mau
    subject that su co mau key.
    """
    out = rgb.astype(np.int16)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    if key == "green":
        cap = np.maximum(r, b)
        excess = (g - cap) > 0
        hit = excess & where
        g[hit] = cap[hit]
    else:
        cap = np.maximum(g, np.minimum(r, b) // 1)
        excess_r = (r - np.maximum(g, b)) > 0
        excess_b = (b - np.maximum(g, r)) > 0
        hit_r = excess_r & where
        hit_b = excess_b & where
        r[hit_r] = np.maximum(g, b)[hit_r]
        b[hit_b] = np.maximum(g, r)[hit_b]
        hit = hit_r | hit_b
        _ = cap
    return np.clip(out, 0, 255).astype(np.uint8), int(hit.sum())


# --------------------------------------------------------------------------
# 4. Crop / resize / pad
# --------------------------------------------------------------------------
def alpha_bbox(alpha: np.ndarray, threshold: int = 8) -> tuple[int, int, int, int] | None:
    """Bbox theo alpha THAT (§0.1 'crop theo alpha that, bo halo/nen rong')."""
    solid = alpha > threshold
    if not solid.any():
        return None
    ys = np.flatnonzero(solid.any(axis=1))
    xs = np.flatnonzero(solid.any(axis=0))
    return int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1


def mode_downscale(rgba: np.ndarray, factor: int) -> np.ndarray:
    """Downscale lay MAU PHO BIEN NHAT moi block factor x factor.

    Giu mau pixel-art sac net hon nearest (khong lam roi chi tiet 1px) va khong
    lam nhoe nhu box average. Chi dung khi factor la so nguyen.
    """
    h, w = rgba.shape[:2]
    th, tw = h // factor, w // factor
    src = rgba[: th * factor, : tw * factor]
    # Ma hoa RGBA -> 1 so nguyen de tim mode
    code = (src[..., 0].astype(np.uint32) << 24 | src[..., 1].astype(np.uint32) << 16
            | src[..., 2].astype(np.uint32) << 8 | src[..., 3].astype(np.uint32))
    blocks = code.reshape(th, factor, tw, factor).transpose(0, 2, 1, 3)
    blocks = blocks.reshape(th * tw, factor * factor)
    blocks.sort(axis=1)
    # Do dai run dai nhat trong moi hang da sort = mode
    change = np.ones_like(blocks, dtype=bool)
    change[:, 1:] = blocks[:, 1:] != blocks[:, :-1]
    run_id = np.cumsum(change, axis=1) - 1
    n_runs = int(run_id.max()) + 1
    rows = np.repeat(np.arange(blocks.shape[0]), blocks.shape[1])
    counts = np.zeros((blocks.shape[0], n_runs), dtype=np.int32)
    np.add.at(counts, (rows, run_id.ravel()), 1)
    best_run = counts.argmax(axis=1)
    first_idx = np.argmax(run_id == best_run[:, None], axis=1)
    winner = blocks[np.arange(blocks.shape[0]), first_idx]
    out = np.empty((th * tw, 4), dtype=np.uint8)
    out[:, 0] = (winner >> 24) & 0xFF
    out[:, 1] = (winner >> 16) & 0xFF
    out[:, 2] = (winner >> 8) & 0xFF
    out[:, 3] = winner & 0xFF
    return out.reshape(th, tw, 4)


def resize_rgba(rgba: np.ndarray, tw: int, th: int, mode: str) -> tuple[np.ndarray, str]:
    """Resize ve (tw, th). Tra ve (anh, ghi_chu_thuc_te_da_dung)."""
    h, w = rgba.shape[:2]
    if (w, h) == (tw, th):
        return rgba, "1:1"
    note = mode
    if mode == "mode" and w >= tw and h >= th:
        # Ha bang majority filter o boi so nguyen lon nhat con an toan, phan le
        # con lai moi dung nearest. Mot buoc nearest tu 1024 -> 128 se lay mau
        # diem va lam roi chi tiet 1px; hai buoc thi khong.
        f = int(min(w // tw, h // th))
        if f >= 2:
            rgba = mode_downscale(rgba, f)
            h, w = rgba.shape[:2]
            note = f"mode /{f}"
            if (w, h) == (tw, th):
                return rgba, note
            note += "+nn"
        else:
            note = "nearest"
        img = Image.fromarray(rgba, "RGBA").resize((tw, th), Image.NEAREST)
        return np.asarray(img), note
    resample = {"nearest": Image.NEAREST, "box": Image.BOX}.get(mode, Image.NEAREST)
    img = Image.fromarray(rgba, "RGBA").resize((tw, th), resample)
    return np.asarray(img), note


def fit_into(rgba: np.ndarray, size: tuple[int, int], anchor: str,
             pad_pct: float, mode: str) -> tuple[np.ndarray, str, float]:
    """Scale giu ti le vao khung size voi padding, roi dat theo anchor."""
    tw, th = size
    pad_x = int(round(tw * pad_pct))
    pad_y = int(round(th * pad_pct))
    inner_w, inner_h = max(1, tw - 2 * pad_x), max(1, th - 2 * pad_y)
    h, w = rgba.shape[:2]
    scale = min(inner_w / w, inner_h / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    scaled, used = resize_rgba(rgba, nw, nh, mode)
    canvas = np.zeros((th, tw, 4), dtype=np.uint8)
    ox = (tw - nw) // 2
    oy = th - pad_y - nh if anchor == "bottom" else (th - nh) // 2
    oy = max(0, min(oy, th - nh))
    canvas[oy:oy + nh, ox:ox + nw] = scaled
    return canvas, used, scale


def alpha_bleed(rgba: np.ndarray, passes: int = 2) -> np.ndarray:
    """Lan mau ra vung trong suot de Pixi khong sinh vien den khi sampling."""
    out = rgba.copy()
    for _ in range(passes):
        opaque = out[..., 3] > 0
        if opaque.all():
            break
        acc = np.zeros(out.shape[:2] + (3,), dtype=np.uint16)
        cnt = np.zeros(out.shape[:2], dtype=np.uint16)
        rgb = out[..., :3].astype(np.uint16)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            sh_rgb = np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
            sh_op = np.roll(np.roll(opaque, dy, axis=0), dx, axis=1)
            acc += sh_rgb * sh_op[..., None]
            cnt += sh_op
        fill = (~opaque) & (cnt > 0)
        if not fill.any():
            break
        out[..., :3][fill] = (acc[fill] // np.maximum(cnt[fill], 1)[:, None]).astype(np.uint8)
    return out


def checkerboard(h: int, w: int, cell: int = 8) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w]
    board = (((yy // cell) + (xx // cell)) % 2).astype(np.uint8)
    return np.where(board[..., None] == 0, 210, 170).repeat(3, axis=2).astype(np.uint8)


def composite(rgba: np.ndarray) -> np.ndarray:
    bg = checkerboard(*rgba.shape[:2])
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    return (rgba[..., :3] * a + bg * (1 - a)).astype(np.uint8)


def qa_preview(rgba: np.ndarray, path: Path) -> None:
    """Strip QA: 4x / 1x / 32px — kiem tra §16.1 'doc duoc o kich thuoc nho nhat'."""
    h, w = rgba.shape[:2]
    tiles = []
    for scale_w, scale_h in ((w * 4, h * 4), (w, h), (32, max(1, round(32 * h / w)))):
        img = Image.fromarray(rgba, "RGBA").resize(
            (max(1, scale_w), max(1, scale_h)), Image.NEAREST)
        tiles.append(np.asarray(img))
    gap = 12
    total_w = sum(t.shape[1] for t in tiles) + gap * (len(tiles) + 1)
    total_h = max(t.shape[0] for t in tiles) + gap * 2
    canvas = np.zeros((total_h, total_w, 4), dtype=np.uint8)
    x = gap
    for tile in tiles:
        y = (total_h - tile.shape[0]) // 2
        canvas[y:y + tile.shape[0], x:x + tile.shape[1]] = tile
        x += tile.shape[1] + gap
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(composite(canvas), "RGB").save(path)


# --------------------------------------------------------------------------
# 5. Pipeline mot file
# --------------------------------------------------------------------------
@dataclass
class Result:
    source: Path
    name: str
    status: str = "OK"
    size: tuple[int, int] = (0, 0)
    key: str = "-"
    scale: float = 1.0
    resample: str = "-"
    coverage: float = 0.0
    written: Path | None = None
    notes: list[str] = field(default_factory=list)

    def flag(self, level: str, msg: str) -> None:
        order = {"OK": 0, "WARN": 1, "REVIEW": 2, "FAIL": 3}
        if order[level] > order[self.status]:
            self.status = level
        self.notes.append(f"[{level}] {msg}")


def process_one(src: Path, name: str, opts: argparse.Namespace,
                size_override: tuple[int, int] | None = None,
                anchor_override: str | None = None,
                pad_override: float | None = None) -> Result:
    res = Result(source=src, name=name)

    if not NAME_RE.match(name):
        res.flag("FAIL", f"ten '{name}' khong dung kebab-case (§11 naming convention)")
        return res
    if catalog_names() and name not in catalog_names():
        res.flag("WARN", "ten khong co trong docs catalog — kiem tra chinh ta")

    size, anchor, pad_pct, matched = rule_for(name)
    size = size_override or size
    anchor = anchor_override or anchor
    pad_pct = pad_override if pad_override is not None else pad_pct
    res.size = size
    if not matched and size_override is None:
        res.flag("WARN", f"khong co rule size cho '{name}', dung mac dinh {size[0]}x{size[1]}")

    img = Image.open(src).convert("RGBA")
    rgba = np.array(img)
    rgba_full_size = (rgba.shape[1], rgba.shape[0])
    rgb, alpha = rgba[..., :3].copy(), rgba[..., 3].copy()

    # -- Chroma-key hoac alpha san co --
    native_alpha = float((alpha < 250).mean()) > 0.02
    if native_alpha and not opts.force_key:
        res.key = "native"
        res.notes.append("[INFO] anh da co alpha that, bo qua chroma-key")
    else:
        key = opts.key if opts.key != "auto" else detect_key(rgb)
        if key is None:
            res.flag("FAIL", "khong phat hien nen chroma-key (#00ff00/#ff00ff) va cung khong co alpha")
            return res
        res.key = key
        score = key_score(rgb, key)
        hard = score > opts.key_threshold
        bg = border_connected(hard)
        # Bat vien mo/anti-alias quanh nen
        soft = score > opts.key_threshold * 0.35
        for _ in range(max(0, opts.defringe)):
            bg = dilate(bg, 1) & (soft | bg)
        enclosed = hard & ~bg
        if enclosed.any():
            areas = [a for a in count_regions(enclosed) if a >= opts.hole_min]
            if areas:
                res.flag("WARN",
                         f"{len(areas)} vung mau key bi bao kin (max {areas[0]}px) — "
                         f"giu nguyen mau; neu do la lo thung thi sua thu cong")
        alpha = np.where(bg, 0, 255).astype(np.uint8)
        rim = dilate(bg, max(1, opts.despill_radius)) & ~bg
        target = np.ones_like(bg) if opts.despill == "all" else rim
        rgb, n_spill = despill(rgb, key, target)
        if n_spill:
            res.notes.append(f"[INFO] despill {n_spill}px")
        # Vung key bi bao kin da co canh bao rieng — khong tinh lai vao halo/fringe
        residual = int(((key_score(rgb, key) > opts.key_threshold * 0.5)
                        & (alpha > 0) & ~enclosed).sum())
        opaque_n = max(1, int((alpha > 0).sum()))
        if residual / opaque_n > 0.005:
            res.flag("WARN", f"con {residual}px am mau key trong subject (halo/fringe) — §16.1")

    res.coverage = float((alpha > 0).mean())
    if res.coverage < 0.02:
        res.flag("FAIL", f"chi con {res.coverage:.1%} pixel dac — key da an mat subject")
        return res
    if res.coverage > 0.95 and res.key != "native":
        res.flag("WARN", f"{res.coverage:.1%} pixel dac — chroma-key gan nhu khong an")

    rgba = np.dstack([rgb, alpha])
    box = alpha_bbox(alpha)
    if box is None:
        res.flag("FAIL", "anh rong sau khi tach alpha")
        return res
    x0, y0, x1, y1 = box
    rgba = rgba[y0:y1, x0:x1]

    if is_risky(name):
        res.flag("REVIEW",
                 "asset edge phuc tap (§1.8) — kiem tra highlight/vien truoc khi dung")

    if res.key == "native" and (x1 - x0, y1 - y0) != size and rgba_full_size == size:
        # Asset da qua post-process (dung kich thuoc + alpha that): giu nguyen,
        # khong crop/pad lai — chay lai script se khong lam no teo dan.
        out, used, scale = np.dstack([rgb, alpha]), "passthrough", 1.0
        res.notes.append("[INFO] da dung kich thuoc dich, giu nguyen khong crop/pad lai")
    else:
        out, used, scale = fit_into(rgba, size, anchor, pad_pct, opts.downscale)
    res.resample, res.scale = used, scale
    if scale > 1.05:
        res.flag("WARN", f"phai phong to x{scale:.2f} — source nho hon crop dich, gen lai o do phan giai cao hon")
    if not opts.no_bleed:
        out = alpha_bleed(out, passes=2)

    corners = out[[0, 0, -1, -1], [0, -1, 0, -1], 3]
    if (corners > 0).any():
        res.flag("WARN", "goc anh khong trong suot (§16.1)")
    return _write(res, out, opts)


def _write(res: Result, out: np.ndarray, opts: argparse.Namespace) -> Result:
    if opts.dry_run:
        return res
    if res.status == "REVIEW" and not opts.allow_risky:
        dest = OUT_DIR / "_review" / f"{res.name}.png"
        res.notes.append("[INFO] ghi vao assets/_review/ — duyet mat roi chuyen sang assets/")
    else:
        dest = OUT_DIR / f"{res.name}.png"
    if dest.exists() and not opts.force:
        res.flag("WARN", f"{dest.name} da ton tai — bo qua (dung --force de ghi de)")
        return res
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(dest, optimize=True)
    res.written = dest
    if opts.qa == "all" or (opts.qa == "flagged" and res.status != "OK"):
        qa_preview(out, QA_DIR / f"{res.name}-qa.png")
    return res


# --------------------------------------------------------------------------
# 6. Manifest
# --------------------------------------------------------------------------
MANIFEST_HEADER = "source\tname\tsize\tanchor\tpad"


def init_manifest() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in RAW_DIR.iterdir()
                   if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    if not files:
        print(f"Khong co anh nao trong {rel(RAW_DIR)}/ — bo file thô vao do truoc.")
        return 1
    existing: dict[str, str] = {}
    if MANIFEST.exists():
        for row in _manifest_rows():
            existing[row[0]] = row[1]
    lines = [
        "# manifest post-process — dien cot `name` theo naming convention (docs §11).",
        "# size/anchor/pad de trong = lay theo rule trong script (docs §2).",
        "# size: WxH | anchor: center|bottom | pad: 0.0-0.4",
        MANIFEST_HEADER,
    ]
    for f in files:
        guess = existing.get(f.name, "")
        if not guess:
            stem = re.sub(r"[^a-z0-9]+", "-", f.stem.lower()).strip("-")
            guess = stem if NAME_RE.match(stem) and stem in catalog_names() else ""
        lines.append(f"{f.name}\t{guess}\t\t\t")
    MANIFEST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    todo = sum(1 for line in lines[4:] if line.split("\t")[1] == "")
    print(f"Da ghi {rel(MANIFEST)} ({len(files)} file, {todo} dong can dien `name`).")
    return 0


def _manifest_rows() -> list[list[str]]:
    rows = []
    for raw in MANIFEST.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line or line.startswith("#") or line.startswith("source\t"):
            continue
        parts = (line.split("\t") + ["", "", "", ""])[:5]
        rows.append(parts)
    return rows


def parse_size(text: str) -> tuple[int, int] | None:
    m = re.fullmatch(r"\s*(\d+)\s*[xX*]\s*(\d+)\s*", text or "")
    return (int(m.group(1)), int(m.group(2))) if m else None


# --------------------------------------------------------------------------
# 7. CLI
# --------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="asset_postprocess.py",
        description="Chroma-key removal + alpha crop + nearest-neighbor resize + rename.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--input", type=Path, help="Xu ly 1 file (bo qua manifest)")
    p.add_argument("--name", help="Ten asset dich khi dung --input")
    p.add_argument("--size", help="Ep kich thuoc, vd 256x192")
    p.add_argument("--anchor", choices=["center", "bottom"], help="Diem neo khi pad")
    p.add_argument("--pad", type=float, help="Ti le padding 0.0-0.4")
    p.add_argument("--init-manifest", action="store_true",
                   help="Tao/cap nhat assets/_raw/manifest.tsv tu file co san")
    p.add_argument("--key", choices=["auto", "green", "magenta"], default="auto")
    p.add_argument("--key-threshold", type=float, default=30.0,
                   help="Nguong 'giong key' (mac dinh 30). Tang neu subject bi an mat.")
    p.add_argument("--defringe", type=int, default=2,
                   help="So vong noi rong nen de an vien anti-alias (mac dinh 2)")
    p.add_argument("--despill", choices=["rim", "all"], default="rim")
    p.add_argument("--despill-radius", type=int, default=2)
    p.add_argument("--hole-min", type=int, default=64,
                   help="Bo qua vung key bi bao kin nho hon nguong nay (px)")
    p.add_argument("--downscale", choices=["mode", "nearest", "box"], default="mode",
                   help="mode = mau pho bien nhat moi block (net nhat, mac dinh); "
                        "nearest = dung §0.1; box = trung binh (nhoe)")
    p.add_argument("--force-key", action="store_true",
                   help="Chay chroma-key ngay ca khi anh da co alpha")
    p.add_argument("--no-bleed", action="store_true", help="Tat alpha bleed")
    p.add_argument("--allow-risky", action="store_true",
                   help="Ghi thang asset REVIEW vao assets/ thay vi assets/_review/")
    p.add_argument("--qa", choices=["off", "flagged", "all"], default="flagged",
                   help="Xuat anh QA 4x/1x/32px vao assets/_qa/")
    p.add_argument("--force", action="store_true", help="Ghi de file da ton tai")
    p.add_argument("--dry-run", action="store_true", help="Chi bao cao, khong ghi file")
    return p


def report(results: list[Result], opts: argparse.Namespace) -> int:
    if not results:
        print("Khong co gi de xu ly.")
        return 1
    icon = {"OK": "OK  ", "WARN": "WARN", "REVIEW": "RVW ", "FAIL": "FAIL"}
    width = max(len(r.name or r.source.name) for r in results)
    print()
    print(f"{'':4}  {'asset':<{width}}  {'crop':>9}  {'key':<7}  {'resample':<9}  {'scale':>6}  {'alpha':>6}")
    print("-" * (4 + 2 + width + 2 + 9 + 2 + 7 + 2 + 9 + 2 + 6 + 2 + 6))
    for r in results:
        label = r.name or r.source.name
        crop = f"{r.size[0]}x{r.size[1]}" if r.size[0] else "-"
        print(f"{icon[r.status]}  {label:<{width}}  {crop:>9}  {r.key:<7}  "
              f"{r.resample:<9}  {r.scale:>6.2f}  {r.coverage:>5.1%}")
        for note in r.notes:
            print(f"      {note}")
    counts = {s: sum(1 for r in results if r.status == s) for s in ("OK", "WARN", "REVIEW", "FAIL")}
    written = sum(1 for r in results if r.written)
    print()
    print(f"Tong {len(results)}: OK {counts['OK']} | WARN {counts['WARN']} | "
          f"REVIEW {counts['REVIEW']} | FAIL {counts['FAIL']} — da ghi {written} file"
          + (" (dry-run)" if opts.dry_run else ""))
    if counts["REVIEW"]:
        print("REVIEW = asset edge phuc tap theo §1.8: xem assets/_qa/ roi quyet dinh, "
              "dung tu doi sang workflow khac.")
    return 1 if counts["FAIL"] else 0


def main(argv: list[str] | None = None) -> int:
    opts = build_parser().parse_args(argv)
    if opts.init_manifest:
        return init_manifest()

    jobs: list[tuple[Path, str, tuple[int, int] | None, str | None, float | None]] = []
    if opts.input:
        if not opts.name:
            print("Thieu --name khi dung --input.", file=sys.stderr)
            return 2
        jobs.append((opts.input, opts.name, parse_size(opts.size or ""), opts.anchor, opts.pad))
    else:
        if not MANIFEST.exists():
            print(f"Chua co {rel(MANIFEST)}. Chay --init-manifest truoc.", file=sys.stderr)
            return 2
        for src_name, name, size_s, anchor_s, pad_s in _manifest_rows():
            if not name:
                print(f"[bo qua] {src_name}: chua dien `name` trong manifest")
                continue
            src = RAW_DIR / src_name
            if not src.exists():
                print(f"[bo qua] {src_name}: khong tim thay file")
                continue
            pad_v = float(pad_s) if pad_s.strip() else None
            jobs.append((src, name, parse_size(size_s), anchor_s.strip() or None, pad_v))

    results = [process_one(src, name, opts, size, anchor, pad)
               for src, name, size, anchor, pad in jobs]
    return report(results, opts)


if __name__ == "__main__":
    sys.exit(main())
