#!/usr/bin/env python3
"""
chair_sprites.py — the two chair-level sprites of S6 (plan D15: "2 asset ghế mới"), drawn procedurally with Pillow + numpy.

  chair-backrest  "ghế tựa nhựa"  — the red moulded-plastic chair with a backrest (chair level 2)
  chair-cushion   "ghế gỗ đệm"    — the wooden chair with a red cushion (chair level 3)

Style = the existing table exports (scripts/export_table_art.py): the token palette of docs/design-tokens.md (three steps per material,
x0.70 / x1 / x1.12), a two-pixel outline #3a2730 inside the silhouette, hard alpha, no text, no background; the chair crop of the asset
pipeline (asset_postprocess.SIZE_RULES: 128x160, bottom anchor, 6 % padding) so the ground contact and padding match chair-plastic.
Deterministic: the same script always writes the same bytes, which `--check` verifies against the files in assets/ (no image API, no RNG).

  python3 scripts/chair_sprites.py            # writes assets/chair-*-procedural-v1.png, assets/_qa/*-qa.png and the contact sheet
  python3 scripts/chair_sprites.py --check    # renders in memory and compares with the committed files (exit 1 on any drift)
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import asset_postprocess as post

ROOT = Path(__file__).resolve().parent.parent
OUTLINE = (58, 39, 48)  # #3a2730 — design-tokens.md §8 "Outline: viền ngoài 2px nâu tím đậm"
SHADES = (0.70, 1.0, 1.12)  # dark / base / light, the three steps per material of export_table_art.py
VERSION = 'procedural-v1'

CHAIRS = {  # `label` is ASCII on purpose: the contact sheet is drawn with Pillow's bitmap font, which has no Vietnamese glyphs; the manifest carries the names with their marks
    'chair-backrest': {'label': 'ghe tua nhua (plastic chair with a backrest)', 'materials': ['stoolRed']},
    'chair-cushion': {'label': 'ghe go dem (cushioned wooden chair)', 'materials': ['panelBorder', 'stoolRed']},
}
# QA / review anchors: the stool these two follow, and the tree-level contact sheet.
ANCHOR = ROOT / 'assets/chair-plastic-illustrated-v1.png'
CONTACT = ROOT / 'assets/_qa/contact-chair-levels-procedural-v1.png'


def tokens() -> dict[str, str]:
    """The hex of every token in docs/design-tokens.md (the only source of colour)."""
    text = (ROOT / 'docs/design-tokens.md').read_text(encoding='utf-8')
    return dict(re.findall(r'\| `([^`]+)` \| `(#[0-9a-fA-F]{6})`', text))


def shades(hex_value: str) -> tuple[tuple[int, int, int], ...]:
    base = np.array([int(hex_value[i:i + 2], 16) for i in (1, 3, 5)])
    return tuple(tuple(int(v) for v in np.clip(base * s, 0, 255).astype(int)) for s in SHADES)


class Canvas:
    """A 1:1 RGBA canvas with flat polygons; the outline is added afterwards from the alpha."""

    def __init__(self, size: tuple[int, int]):
        self.image = Image.new('RGBA', size, (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.image)

    def poly(self, points, color):
        self.draw.polygon([tuple(p) for p in points], fill=(*color, 255))

    def quad(self, a, b, c, d, color):
        self.poly([a, b, c, d], color)

    def leg(self, top_left, top_right, bottom_left, bottom_right, base, dark):
        """A leg: front face in the base shade, a two-pixel darker strip on its right for roundness."""
        self.quad(top_left, top_right, bottom_right, bottom_left, base)
        tx0, ty0 = top_left; tx1, ty1 = top_right; bx0, by0 = bottom_left; bx1, by1 = bottom_right
        self.quad((tx1 - 2, ty1), (tx1, ty1), (bx1, by1), (bx1 - 2, by1), dark)

    def rounded_top(self, left, right, top, bottom, color, radius):
        """A panel whose two top corners are rounded (the back of a moulded plastic chair)."""
        self.draw.rounded_rectangle([left, top, right, bottom], radius=radius, fill=(*color, 255))


# Seat quad shared by both chairs (3/4 view from above-front, the camera of the tables: the front edge is lower and wider).
BL, BR, FR, FL = (34, 90), (92, 86), (106, 108), (20, 114)
GROUND = 149  # the last row of the front legs: the bottom padding of the chair crop (6 % of 160 = 10 rows) starts at row 150
BACK_GROUND = 132  # the back legs end higher: they stand farther from the camera


def draw_backrest(cv: Canvas, pal: dict[str, tuple]) -> None:
    dark, base, light = pal['stoolRed']
    # Back legs first (behind the seat), then the seat, then the front legs and the backrest.
    cv.leg((36, 96), (44, 96), (33, BACK_GROUND), (41, BACK_GROUND), base, dark)
    cv.leg((86, 92), (94, 92), (92, BACK_GROUND - 4), (100, BACK_GROUND - 4), base, dark)
    # Ring brace between the back legs (plastic chairs carry one): a thin bar.
    cv.quad((40, 118), (94, 114), (94, 118), (40, 122), dark)
    # Seat: top (light), front face (base), right face (dark), 9 px thick.
    cv.quad(BL, BR, FR, FL, light)
    cv.quad(FL, FR, (FR[0], FR[1] + 9), (FL[0], FL[1] + 9), base)
    cv.quad(BR, FR, (FR[0], FR[1] + 9), (BR[0], BR[1] + 9), dark)
    # Moulded seat rim: a slightly darker inset band along the front of the top surface (the lip of the plastic).
    cv.quad((26, 108), (102, 103), (104, 107), (24, 112), base)
    # Front legs (splayed a little outward, like the stool's).
    cv.leg((20, 123), (29, 123), (14, GROUND), (23, GROUND), base, dark)
    cv.leg((97, 117), (106, 117), (104, GROUND - 4), (113, GROUND - 4), base, dark)
    # Ring brace between the front legs.
    cv.quad((17, 134), (109, 129), (109, 133), (17, 138), base)
    # Backrest: two posts rising from the back corners, a moulded back panel with rounded top corners and a highlight band.
    cv.quad((34, 92), (42, 91), (40, 34), (33, 35), base)
    cv.quad((88, 88), (96, 87), (98, 30), (91, 31), base)
    cv.rounded_top(36, 97, 30, 68, base, 9)
    cv.quad((40, 34), (94, 32), (94, 41), (40, 43), light)  # the top highlight of the back panel
    cv.quad((92, 40), (97, 40), (97, 68), (92, 68), dark)  # its right edge, in shade
    cv.quad((44, 50), (90, 48), (90, 52), (44, 54), dark)  # the moulded slot in the back


def draw_cushion(cv: Canvas, pal: dict[str, tuple]) -> None:
    wdark, wood, wlight = pal['panelBorder']
    cdark, cushion, clight = pal['stoolRed']
    # Back legs (square wooden posts), then the seat frame, the cushion, the front legs, the stretchers and the slatted back.
    cv.leg((37, 96), (44, 96), (36, BACK_GROUND), (43, BACK_GROUND), wood, wdark)
    cv.leg((87, 92), (94, 92), (89, BACK_GROUND - 4), (96, BACK_GROUND - 4), wood, wdark)
    cv.quad((40, 116), (93, 112), (93, 116), (40, 120), wdark)  # back stretcher
    # Seat frame: top rim (light wood), front face (wood), right face (dark wood), 8 px thick.
    cv.quad(BL, BR, FR, FL, wlight)
    cv.quad(FL, FR, (FR[0], FR[1] + 8), (FL[0], FL[1] + 8), wood)
    cv.quad(BR, FR, (FR[0], FR[1] + 8), (BR[0], BR[1] + 8), wdark)
    # The cushion: inset on the frame, puffed (a light top-left, a dark front edge).
    cv.quad((40, 95), (87, 91), (98, 106), (28, 110), cushion)
    cv.quad((40, 95), (87, 91), (80, 95), (36, 99), clight)
    cv.quad((30, 107), (97, 102), (98, 106), (28, 110), cdark)
    cv.quad((44, 99), (56, 98), (55, 102), (44, 103), clight)  # a tuft highlight
    # Front legs (straight, square).
    cv.leg((21, 122), (28, 122), (18, GROUND), (25, GROUND), wood, wdark)
    cv.leg((98, 116), (105, 116), (103, GROUND - 4), (110, GROUND - 4), wood, wdark)
    # Stretchers: front and right side.
    cv.quad((20, 136), (106, 131), (106, 135), (20, 140), wood)
    cv.quad((104, 128), (94, 118), (97, 118), (107, 128), wdark)
    # Backrest: two posts and two slats; the top rail is lighter where the light hits it.
    cv.quad((35, 92), (42, 91), (40, 28), (34, 29), wood)
    cv.quad((88, 88), (95, 87), (97, 24), (91, 25), wood)
    cv.quad((40, 30), (92, 26), (92, 36), (40, 40), wood)   # top rail
    cv.quad((40, 30), (92, 26), (92, 29), (40, 33), wlight)
    cv.quad((40, 48), (92, 44), (92, 52), (40, 56), wood)   # middle slat
    cv.quad((40, 48), (92, 44), (92, 46), (40, 50), wlight)
    cv.quad((40, 64), (92, 60), (92, 68), (40, 72), wood)   # lower slat
    cv.quad((40, 64), (92, 60), (92, 62), (40, 66), wlight)


DRAW = {'chair-backrest': draw_backrest, 'chair-cushion': draw_cushion}


def render(name: str, hexes: dict[str, str]) -> tuple[Image.Image, list[tuple[int, int, int]]]:
    """Draw one chair and return the sprite with the palette it may use (outline + three shades per material)."""
    size, anchor, pad, matched = post.rule_for(name)
    assert matched and anchor == 'bottom' and size == (128, 160), 'the chair rule of the asset pipeline'
    pal = {material: shades(hexes[material]) for material in CHAIRS[name]['materials']}
    palette = [OUTLINE] + [c for material in CHAIRS[name]['materials'] for c in pal[material]]
    cv = Canvas(size)
    DRAW[name](cv, pal)
    rgba = np.array(cv.image)
    alpha = Image.fromarray(np.where(rgba[..., 3] >= 128, 255, 0).astype('uint8'))
    # The two-pixel outline inside the silhouette, leg gaps included (the rule of export_table_art.py).
    edge = np.array(alpha) > np.array(alpha.filter(ImageFilter.MinFilter(5)))
    rgba[edge, :3] = OUTLINE
    rgba[..., 3] = np.array(alpha)
    rgba[rgba[..., 3] == 0] = 0
    final = Image.fromarray(rgba)
    # The checks of the table exports: padding, hard alpha, palette, size, and the chair pipeline's padding on the ground side.
    bbox = final.getbbox()
    pad_x, pad_y = round(size[0] * pad), round(size[1] * pad)
    assert bbox and bbox[0] >= pad_x and bbox[1] >= pad_y and size[0] - bbox[2] >= pad_x and size[1] - bbox[3] >= pad_y, f'{name}: padding {bbox}'
    assert size[1] - bbox[3] == pad_y, f'{name}: the ground contact must sit on the padding line like every bottom-anchored sprite'
    assert set(np.unique(rgba[..., 3])) == {0, 255}, f'{name}: hard alpha'
    assert {tuple(c) for c in rgba[rgba[..., 3] > 0, :3]} <= set(palette), f'{name}: a colour outside the token palette'
    assert list(final.size) == list(size)
    return final, palette


def contact_sheet(previews: list[tuple[str, Image.Image]]) -> Image.Image:
    sheet = Image.new('RGB', (760, 10 + len(previews) * 150), '#adc6cd')
    draw = ImageDraw.Draw(sheet)
    for row, (label, img) in enumerate(previews):
        y = 12 + row * 150
        draw.text((12, y), label, fill='#173c30')
        for x, size in ((210, 128), (440, 64), (610, 32)):
            thumb = img.copy()
            thumb.thumbnail((size, size), Image.Resampling.NEAREST)
            sheet.paste(thumb, (x + (size - thumb.width) // 2, y + 140 - thumb.height), thumb)
            draw.text((x, y), f'{size} px', fill='#173c30')
    return sheet


def output_path(name: str) -> Path:
    return ROOT / 'assets' / f'{name}-{VERSION}.png'


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='render in memory and compare with the committed files; exit 1 on drift')
    opts = parser.parse_args(argv)
    hexes = tokens()
    rendered = {name: render(name, hexes) for name in CHAIRS}
    if opts.check:
        drift = []
        for name, (image, _) in rendered.items():
            path = output_path(name)
            fresh = hashlib.sha256(np.array(image).tobytes()).hexdigest()
            committed = hashlib.sha256(np.array(Image.open(path).convert('RGBA')).tobytes()).hexdigest() if path.exists() else None
            if fresh != committed:
                drift.append(f'{post.rel(path)}: committed {committed} != rendered {fresh}')
        if drift:
            print('\n'.join(drift))
            return 1
        print(f'PASS: {len(rendered)} chair sprites reproduce byte for byte ({", ".join(post.rel(output_path(n)) for n in rendered)})')
        return 0
    previews = [('chair-plastic (anchor, chair level 1)', Image.open(ANCHOR).convert('RGBA'))]
    for name, (image, palette) in rendered.items():
        path = output_path(name)
        image.save(path, optimize=True)
        post.qa_preview(np.array(image), post.QA_DIR / f'{name}-qa.png')
        previews.append((f'{name} ({CHAIRS[name]["label"]}, chair level {len(previews) + 1})', image))
        print(f'wrote {post.rel(path)} {image.size[0]}x{image.size[1]} palette {len(palette)} colours ({len(CHAIRS[name]["materials"])} materials x 3 steps + outline)')
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    contact_sheet(previews).save(CONTACT)
    print(f'wrote {post.rel(CONTACT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
