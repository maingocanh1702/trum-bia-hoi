#!/usr/bin/env python3
"""Original procedural SFX. No samples, speech, external assets or copyrighted tunes."""
from pathlib import Path
import hashlib, json, math, random, struct, subprocess, wave
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
presets = json.loads((ROOT / 'assets/_raw/audio/core-presets.json').read_text())
manifest_path = ROOT / 'assets/manifest.json'
manifest = json.loads(manifest_path.read_text())
SR = 44100
ids = {row[1] for row in presets}
manifest['assets'] = [a for a in manifest['assets'] if a.get('audioId') not in ids]
for group, identifier, event, kind, freq, seconds in presets:
    rng = random.Random(int.from_bytes(hashlib.sha256(identifier.encode()).digest()[:4], 'big'))
    raw = ROOT / 'assets/_raw/audio' / group / f'{identifier}.wav'
    raw.parent.mkdir(parents=True, exist_ok=True)
    count = round(seconds * SR)
    samples = []
    filtered = 0
    for i in range(count):
        t = i / SR
        attack = min(1, t / .008)
        tail = min(1, (seconds-t) / .045)
        envelope = attack * tail
        phase = 2 * math.pi * freq * t
        if kind == 'water':
            filtered = filtered * .80 + rng.uniform(-1, 1) * .20
            sample = filtered * .6 + math.sin(phase * (1 + .08 * math.sin(t * 7))) * .06
            envelope *= .7 + .3 * math.sin(t * 9) ** 2
        elif kind == 'wood':
            sample = math.sin(phase) * math.exp(-t * 22) + rng.uniform(-1, 1) * .13 * math.exp(-t * 40)
        elif kind == 'bell':
            sample = (math.sin(phase) + .35 * math.sin(phase * 2.76) + .12 * math.sin(phase * 4.07)) * math.exp(-t * 6)
        else:
            direction = 1 if kind == 'rise' else -1
            sample = math.sin(phase * (1 + direction * .18 * t / seconds)) * math.exp(-t * 5)
        samples.append(max(-32767, min(32767, round(sample * envelope * 14000))))
    with wave.open(str(raw), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)
        out.writeframes(struct.pack('<'+'h'*len(samples), *samples))
    target_dir = ROOT / 'assets/audio' / group
    target_dir.mkdir(parents=True, exist_ok=True)
    for ext, codec in [('ogg','libvorbis'),('m4a','aac')]:
        target = target_dir / f'{identifier}.{ext}'
        normalized = raw.with_name(identifier + '-normalized.wav')
        if ext == 'ogg':
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','loudnorm=I=-14:TP=-1:LRA=7','-ar',str(SR),str(normalized)],check=True)
            data, rate = sf.read(normalized)
            sf.write(target, data, rate, format='OGG', subtype='VORBIS')
            normalized.unlink()
        else:
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','loudnorm=I=-14:TP=-1:LRA=7','-ar',str(SR),'-c:a',codec,str(target)],check=True)
        manifest['assets'].append({'id':f'audio:{identifier}:{ext}','audioId':identifier,'type':'audio','path':str(target.relative_to(ROOT)), 'format':ext, 'source':'original_procedural_synthesis','group':group,'dimensions':None,'transparent':False,'usage':[event],'loop':False,'status':'draft','license_note':'Original project synthesis; no external samples. Reproduce with scripts/generate_core_audio.py.', 'review_notes':'44.1 kHz mono; loudnorm -14 LUFS / -1 dBTP. Listening QA pending.'})
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Generated {len(presets)} distinct core SFX, Ogg + AAC; listening QA pending.')
