"""Export the 2026-09-10 imagegen table batch; reuse the existing crop/anchor pipeline."""
import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from asset_postprocess import build_parser, process_one

ROOT = Path(__file__).resolve().parent.parent
RECEIPT = ROOT / 'docs/reference/assets-owner-2026-09-08/table-upgrades-imagegen.json'


def export():
    receipt = json.loads(RECEIPT.read_text())
    tokens = dict(re.findall(r'\| `([^`]+)` \| `(#[0-9a-fA-F]{6})`', (ROOT / 'docs/design-tokens.md').read_text()))
    outline = (58, 39, 48)
    previews = []
    for asset in receipt['assets']:
        assert hashlib.sha256((ROOT / asset['rawPath']).read_bytes()).hexdigest() == asset['sourceSha256']
        name = asset['id'] + '-imagegen-v1'
        opts = build_parser().parse_args(['--force', '--downscale', 'nearest', '--qa', 'off'])
        result = process_one(ROOT / asset['rawPath'], name, opts)
        assert result.status not in ('FAIL', 'REVIEW'), result.notes
        path = ROOT / 'assets' / (name + '.png')
        rgba = np.array(Image.open(path).convert('RGBA'))
        # Three token-derived steps per material; no dithering or generated red fringe.
        materials = ['inox'] if asset['id'] != 'table-lv4-empty' else ['inox', 'beerFoam', 'panel', 'coinGold']
        palette = [outline]
        for token in materials:
            color = np.array([int(tokens[token][i:i+2], 16) for i in (1, 3, 5)])
            palette.extend(tuple(np.clip(color * shade, 0, 255).astype(int)) for shade in (.70, 1, 1.12))
        colors = np.array(palette, dtype=np.int32)
        # Remove generated sub-pixel texture before the fixed palette, without dithering.
        smooth = np.array(Image.fromarray(rgba[..., :3]).filter(ImageFilter.MedianFilter(3)))
        delta = smooth.astype(np.int32)[..., None, :] - colors
        rgba[..., :3] = colors[np.argmin((delta * delta).sum(axis=-1), axis=-1)]
        alpha = Image.fromarray(np.where(rgba[..., 3] >= 128, 255, 0).astype('uint8'))
        # Enforce a two-native-pixel outline inside the silhouette, including leg gaps.
        edge = np.array(alpha) > np.array(alpha.filter(ImageFilter.MinFilter(5)))
        rgba[edge, :3] = outline
        rgba[..., 3] = np.array(alpha)
        rgba[rgba[..., 3] == 0] = 0
        final = Image.fromarray(rgba)
        final.save(path)
        bbox = final.getbbox()
        assert bbox and min(bbox[0], bbox[1], final.width-bbox[2], final.height-bbox[3]) >= 2
        assert set(np.unique(rgba[..., 3])) == {0, 255}
        assert {tuple(c) for c in rgba[rgba[..., 3] > 0, :3]} <= set(palette)
        asset.update(path=str(path.relative_to(ROOT)), dimensions=list(final.size), palette=colors.tolist(), sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        previews.append((asset['id'], final))
    sheet = Image.new('RGB', (760, 610), '#adc6cd')
    draw = ImageDraw.Draw(sheet)
    previews.insert(0, ('glass-full anchor', Image.open(ROOT / 'assets/glass-full.png').convert('RGBA')))
    for row, (name, img) in enumerate(previews):
        y = 12 + row * 150
        draw.text((12, y), name, fill='#173c30')
        for x, size in ((210, 128), (440, 64), (610, 32)):
            thumb = img.copy()
            thumb.thumbnail((size, size), Image.Resampling.NEAREST)
            sheet.paste(thumb, (x+(size-thumb.width)//2, y+140-thumb.height), thumb)
            draw.text((x, y), str(size)+' px', fill='#173c30')
    qa = ROOT / 'assets/_qa/contact-table-upgrades-imagegen-v1.png'
    qa.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(qa)
    receipt['exportScript'] = 'scripts/export_table_art.py'
    receipt['contactSheet'] = str(qa.relative_to(ROOT))
    receipt['qa'] = 'Native RGBA, binary alpha, two-pixel silhouette outline, token palette with three shade steps per material, bottom anchors; production approval pending.'
    RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
    print('PASS: 3 exports, palette/alpha/padding checks, contact sheet and SHA-256 receipt')


if __name__ == '__main__':
    export()
