#!/usr/bin/env python3
"""Check manifest paths, PNG dimensions and paired codecs; --release forbids unresolved placeholders."""
from pathlib import Path
import json, struct, sys

root = Path(__file__).resolve().parent.parent
assets = json.loads((root / 'assets/manifest.json').read_text())['assets']
seen = set()
audio = {}
errors = []
for asset in assets:
    identifier = asset['id']
    if identifier in seen:
        errors.append(f'duplicate id: {identifier}')
    seen.add(identifier)
    if '--release' in sys.argv and asset['status'] not in {'approved', 'draft'}:
        errors.append(f'unresolved asset: {identifier} ({asset["status"]})')
    if asset['status'] == 'placeholder':
        if asset.get('path') is not None:
            errors.append(f'placeholder has a path: {identifier}')
        continue
    path = root / asset['path']
    if not path.is_file() or path.stat().st_size == 0:
        errors.append(f'missing/empty: {path}')
        continue
    if asset['type'] == 'sprite':
        data = path.read_bytes()
        if data[:8] != b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II', data[16:24])) != asset['dimensions']:
            errors.append(f'PNG dimensions mismatch: {identifier}')
    if asset['type'] == 'audio':
        audio.setdefault(asset['audioId'], set()).add(asset['format'])
        if not asset.get('license_note') or not asset.get('usage'):
            errors.append(f'audio provenance/usage missing: {identifier}')
for identifier, formats in audio.items():
    if formats != {'ogg', 'm4a'}:
        errors.append(f'codec pair missing: {identifier}')
if errors:
    sys.exit('\n'.join(errors))
print(f'PASS: {len(assets)} manifest entries, {len(audio)} paired SFX. '
      f'{sum(a["status"] == "placeholder" for a in assets)} sprite placeholders; '
      f'{sum(a["status"] == "draft" for a in assets)} draft files (drafts accepted for release).')
