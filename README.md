# Trùm Bia Hơi

The new game lives in `packages/engine` and `apps/web`. `prototype/` is archived.
Product authority: [00-HANDOFF](00-HANDOFF-trum-bia-hoi.md).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Node 22.12+ is required. The current build has
guest play, automatic preparation/washing, one-tap table service, stock, equipment,
Vietnamese/English, onboarding and replayed local saves. It is a development build:
server/accounts, full meta/risk/events, final art/audio and release QA remain in scope.
See [build progress](docs/build-progress.md) for precise status.

```sh
npm run verify       # config + typecheck/build + unit/replay tests + 5-seed sim
npm run check:assets # file/manifest integrity (allows declared drafts/placeholders)
npm run test:e2e     # first run: npx playwright install chromium
```

`npm run build` writes the static bundle to `apps/web/dist`. The settings panel can
download a save backup. Corrupt/unsupported saves are preserved, never reset silently.
The current local save replays the original command log and pinned config snapshot.
This is local progress, not verified server ranking evidence.

Economy changes belong in `docs/config/economy.tbh.json` and its registry tier/spec.
Values ending in `Base` scale once; menu prices are already in displayed coins.
The k sim uses real customer payment + tip divided by the anchor, never throughput.

Core audio can be reproduced with:

```sh
uv run --with soundfile python scripts/generate_core_audio.py
```

This needs FFmpeg (AAC + loudnorm) and libsndfile via the soundfile wheel (Vorbis).
Audio source presets/WAVs are under `assets/_raw/audio`; all clips are original
procedural synthesis. Audio listening QA and remaining B7 clips are pending.
`python3 scripts/check_assets.py --release` intentionally fails while any manifest
entry is a draft or placeholder.
