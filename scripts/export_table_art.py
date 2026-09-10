"""Reproduce recorded imagegen batches through the existing crop/anchor pipeline."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copyfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import asset_postprocess as post
from asset_postprocess import build_parser, process_one

ROOT = Path(__file__).resolve().parent.parent
RECEIPT = ROOT / 'docs/reference/assets-owner-2026-09-08/table-upgrades-imagegen.json'


def render_asset(asset, staging, tokens):
    outline = (58, 39, 48)
    assert hashlib.sha256((ROOT / asset['rawPath']).read_bytes()).hexdigest() == asset['sourceSha256']
    name = asset['id'] + '-imagegen-v1'
    opts = build_parser().parse_args(['--force', '--downscale', 'nearest', '--qa', 'off'])
    source = ROOT / asset['rawPath']
    if asset.get('keyColor'):
        assert asset['keyColor'] in post.KEYS, 'Unknown source key colour'
        # Explicit per-source opt-in: these mechanical assets contain no key colour.
        # Clear enclosed handle/stand gaps as well as the outer background.
        rgba = np.array(Image.open(source).convert('RGBA'))
        rgba[post.key_score(rgba[..., :3], asset['keyColor']) > opts.key_threshold] = 0
        source = staging / (name + '-keyed.png')
        Image.fromarray(rgba).save(source)
    result = process_one(source, name, opts, size_override=tuple(asset['dimensions']))
    assert result.status not in ('FAIL', 'REVIEW'), result.notes
    path = staging / (name + '.png')
    rgba = np.array(Image.open(path).convert('RGBA'))
    # Three token-derived steps per material; no dithering or generated red fringe.
    materials = asset.get('materials', ['inox'] if asset['id'] != 'table-lv4-empty' else ['inox', 'beerFoam', 'panel', 'coinGold'])
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
    bbox = final.getbbox()
    assert bbox and min(bbox[0], bbox[1], final.width-bbox[2], final.height-bbox[3]) >= 2
    assert set(np.unique(rgba[..., 3])) == {0, 255}
    assert {tuple(c) for c in rgba[rgba[..., 3] > 0, :3]} <= set(palette)
    assert list(final.size) == asset['dimensions']
    final.save(path)
    return final, colors.tolist(), path


def export_staged(staging, receipt_path=None):
    receipt = json.loads((receipt_path or RECEIPT).read_text())
    tokens = dict(re.findall(r'\| `([^`]+)` \| `(#[0-9a-fA-F]{6})`', (ROOT / 'docs/design-tokens.md').read_text()))
    previews = []
    for asset in receipt['assets']:
        final, palette, path = render_asset(asset, staging, tokens)
        assert palette == asset['palette'], 'Palette drift: create a versioned asset and reviewed receipt'
        assert hashlib.sha256(path.read_bytes()).hexdigest() == asset['sha256'], 'Export drift: create a versioned asset and reviewed receipt'
        previews.append((asset['id'], final))
    sheet = Image.new('RGB', (760, 10 + (len(previews) + 1) * 150), '#adc6cd')
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
    qa = staging / 'contact.png'
    qa.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(qa)
    copyfile(qa, ROOT / receipt['contactSheet'])
    for asset in receipt['assets']:
        copyfile(staging / Path(asset['path']).name, ROOT / asset['path'])
    print(f'PASS: {len(previews) - 1} exports, palette/alpha/padding checks, contact sheet and SHA-256 receipt')


def export(receipt_path=None):
    with TemporaryDirectory(prefix='tbh-table-art-') as directory:
        previous = post.OUT_DIR
        try:
            post.OUT_DIR = Path(directory)
            export_staged(Path(directory), receipt_path)
        finally:
            post.OUT_DIR = previous


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', type=Path, default=RECEIPT)
    export(parser.parse_args().receipt)
