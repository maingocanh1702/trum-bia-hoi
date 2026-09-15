# Assets manifest & runtime art/audio resolution (`scripts/check_assets.py`; `assets/manifest.json`)

## Observable contract

- `assets/manifest.json` shape: `{version: 1, assets: [...]}`, 132 entries measured on this commit
  (see Existing proof). Every entry carries: `id` (unique string — sprite ids are plain, e.g.
  `glass-clean`/`table-lv1-empty`; audio ids are composite `audio:<audioId>:<format>`, e.g.
  `audio:ui-tap:ogg`), `type` (`sprite` | `audio` — 68 / 64 measured), `status` (`approved` |
  `draft` | `placeholder` — 8 / 121 / 3 measured), `source` (`existing_project_anchor` |
  `imagegen_builtin` | `imagegen` | `blender` | `original_procedural_synthesis` | `placeholder` — 8 /
  46 / 7 / 4 / 64 / 3 measured), `path` (repo-relative file path, or `null` — required `null` when
  `status: placeholder`, and only then), `dimensions` (`[width, height]`; `null` on every audio row
  sampled), `transparent` (boolean; meaningful for sprites, `false` on the audio row sampled),
  `usage` (`string[]` — sprite tags like `["glass"]`/`["gameplay"]`; audio tags like `["ui:tap"]`,
  matched against a `DomainEvent.type`-derived key at playback), `review_notes` (free text, present
  on both types). Audio rows additionally carry: `audioId` (pairing key — 32 distinct ids measured,
  each requiring exactly one `ogg` + one `m4a` row), `format` (`ogg` | `m4a`), `group` (mute-group
  key, e.g. `"ui"`), `loop` (boolean), `license_note` (non-empty required). Generation-provenance
  fields seen only on some `imagegen`/`blender` sprite rows — `raw`, `script`, `prompt`, `blend` —
  are informational only: not read by any consumer or by `check_assets.py`.
- **A `placeholder` row still carries a real `dimensions` value** (sampled: `chair-plastic-red` →
  `[128, 128]`) — `check_assets.py` only asserts `path is None` for placeholders; it never reads or
  validates their `dimensions`.
- Runtime placeholder rendering: an id with no resolvable `path` renders
  `<span aria-hidden="true" className="sprite placeholder ${className}">` (`apps/web/src/assets.tsx:15`)
  — an empty, non-visual, screen-reader-invisible box, not a broken-image icon or a console error.
- Runtime audio gating: a sound plays only when `config.values.audio.enabled` is true, the `group`
  parsed from the resolved path's 3rd segment (`entry.path.split('/')[2]`, e.g.
  `assets/audio/ui/...` → group `"ui"`) is enabled in `config.values.audio.groupsEnabled`, and
  `HTMLAudioElement.canPlayType('audio/ogg; codecs="vorbis"')` picks `ogg` else falls back to `m4a`
  (`apps/web/src/audio.ts:16`). A repeat of the same `event` key within
  `config.values.audio.dedupeWindowMs` is silently dropped (`:13-14`); a new sound for the same
  `owner` key pauses and replaces whichever instance of that owner is currently playing (`:23`), so
  continuous per-object sounds never stack.

## How to reach it

- Sprites: `<Sprite id className>` (`apps/web/src/assets.tsx:7-15`) looks up
  `manifest.assets.find(a => a.type==='sprite' && a.id===id)`. Two fallback heuristics, both
  inline-flagged as deliberate corner-cuts: (1) an `<equipment>-lv<N>` id (`keg`/`washer`/`cooler`)
  with no art yet substitutes the highest-level *finished* sprite at or below `N` for that equipment
  (`:10-11`, `# ponytail: keep equipment recognizable with the nearest finished sprite until its
  level art arrives`); (2) a `stall-lv<N>` id with no art substitutes the fixed `table-lv1-empty`
  sprite (`:12-13`). `hasSpriteArt(id)` (`:6`) is the boolean pre-check other components use before
  deciding whether to render a `<Sprite>` at all. `menuAsset` (`:5`) is the fixed `Dish → sprite-id`
  map (`bia→menu-beer`, `lac→menu-peanut`, `nem→menu-nemchua`, `dau→menu-friedbean`,
  `topmo→menu-crackle`, `long→menu-intestine`) used by the order/menu UI.
- Audio: `createSound(config, muted)` (`apps/web/src/audio.ts:5-37`) returns `{play, mute, event}`.
  `event(domainEvent)` (`:30-35`) is the one call site wired into the game loop: `beer_poured` stops
  the previous pour sound for that `itemId` before playing the next; `order_served` collapses
  `late`/`stale` outcomes onto the same key as `early` (see Gotchas); `customer_served` with `tip>0`
  plays an extra `serve_tip`. Manual `play(event, owner)` is also exported for non-`DomainEvent`
  triggers (e.g. UI taps against `usage: ["ui:tap"]`).
- Static validation: `npm run check:assets` (`scripts/check_assets.py`) — duplicate-`id` check
  across the file; every non-placeholder row's `path` must exist on disk and be non-empty; every
  `sprite` row's on-disk PNG must start with the PNG magic bytes and its big-endian IHDR
  width/height (bytes 16-24) must equal the manifest's declared `dimensions`; every `audio` row must
  carry non-empty `license_note` and `usage`; every distinct `audioId` must have both an `ogg` and an
  `m4a` row (`formats != {'ogg','m4a'}` fails); a `placeholder` row is only allowed a `null` path (a
  non-null path on a placeholder is itself an error). `--release` additionally fails any row whose
  `status` isn't `approved` or `draft` (i.e. fails on any remaining `placeholder`).

## Existing proof

- `npm run check:assets` (real run on this commit): `PASS: 132 manifest entries, 32 paired SFX. 3
  sprite placeholders; 121 draft files (drafts accepted for release).` — exit 0.
- `python3 scripts/check_assets.py --release` (real run on this commit): exit 1 —
  `unresolved asset: chair-plastic-red (placeholder)`, `unresolved asset: stall-owner-normal
  (placeholder)`, `unresolved asset: customer-football-fan (placeholder)`. See Uncovered paths.
- `apps/web/test/production.spec.ts:106` `'washer, cooler and counter upgrade cards show their own
  per-level draft sprites'` **is** runtime proof of manifest-backed `<Sprite>` resolution: it asserts
  each upgrade card's `img[src]` matches the manifest-driven `${id}-lv2-imagegen-v1`/
  `${id}-lv3-imagegen-v1` filename pattern before/after an upgrade, and that every rendered `img`
  actually finished loading (`img.complete && img.naturalWidth > 0`, `:116`). Run via `npx playwright
  test apps/web/test/production.spec.ts` (default `playwright.config.ts`). This is the normal
  (non-fallback) resolution path only — a grep for the literal identifiers `manifest.json`/
  `hasSpriteArt`/`createSound`/`check_assets` still returns zero hits in `apps/web/test`/
  `apps/server/test`/`apps/web/*-test`, which is why an earlier pass here missed this test; grepping
  for identifiers misses behavior that exercises the manifest indirectly through `<Sprite>`.
  `<Sprite>`'s two fallback branches and `audio.ts`'s negotiation/dedupe/group-mute logic remain
  unexercised by any test — see Uncovered paths.

## Verification procedure

- `npm run check:assets` — **not** part of `npm run verify` (`package.json:20`'s verify chain is
  `check:config && check:i18n && build && test && sim:onboarding && sim:rush &&
  sim:career:gate` — no `check:assets`); SKILL.md's Required Sequence says to run it by hand
  whenever a diff touches `assets/manifest.json` or files under `assets/`.
- `python3 scripts/check_assets.py --release` — not wired into any npm script or CI: the repo has no
  `.github/` directory at all, and `package.json` only invokes the script without `--release`. This
  mode is manual/on-demand only, never enforced automatically today.
- `<Sprite>`'s normal resolution path has a tier: `apps/web/test/production.spec.ts` (see Existing
  proof) — extend it for a change there. `<Sprite>`'s two fallback branches and `createSound`/
  `audio.ts`'s behavior still have no existing tier to target — write a new test in whichever tier
  owns the change and cite it here in the same commit, per SKILL.md's "New behaviour without a
  citation" rule.

## Uncovered paths

- **`--release` is red right now**, not hypothetically: exactly the 3 named placeholders above block
  it. None is reachable by its exact id from current source:
  `grep -rn "stall-owner-normal|customer-football-fan|chair-plastic-red" apps/web/src
  packages/engine/src` finds zero hits — the only related string is the unrelated, unsuffixed
  `'chair-plastic'` fallback id at `assets.tsx:24`, and no customer-type literal `football_fan`
  exists in `packages/engine/src/types.ts`. These 3 rows look reserved for content the engine
  doesn't emit yet, not a live rendering gap — but that is inferred from absence, not confirmed by a
  doc; don't treat `--release` readiness as blocking current-scope work without checking again.
- `<Sprite>`'s two fallback branches (equipment nearest-level substitution, `stall-lv*` →
  `table-lv1-empty`) and the placeholder empty-span render have no component/Playwright test
  anywhere — behavior confirmed by reading `assets.tsx` only, not by a passing assertion.
- `audio.ts`'s format negotiation, `dedupeWindowMs` suppression, per-`owner` replace-not-stack, and
  `groupsEnabled` mute gating are all unexercised by any test — same caveat.
- Generation-provenance fields (`raw`, `script`, `prompt`, `blend`) are undocumented by any
  schema/type — their shape was inferred by sampling rows that carry them, not from a spec.

## Variants

- **success** — `check:assets` PASS above; every `approved`/`draft` row's file exists with matching
  dimensions/codec pair.
- **empty/placeholder** — the 3 `status: placeholder` rows; `assets.tsx:15`'s empty-span render is
  the only placeholder behavior, unexercised by a test.
- **duplicate** — `check_assets.py`'s `if identifier in seen` guard; not currently triggered (132
  unique ids), not tested by a fixture with a deliberate duplicate.
- **capacity/pairing** — audio codec-pair completeness (`formats != {'ogg','m4a'}`); currently 32/32
  pairs complete.
- **reason (failure)** — `--release`'s 3 named unresolved-placeholder failures above are real,
  reproducible failure output, not synthetic.
- **stale** — a manifest `dimensions` value not matching the actual PNG's IHDR would fail
  `check:assets`; not currently triggered, not covered by a deliberate-mismatch fixture.

## Gotchas

- `audio.ts:33` routes both `late` and `stale` serve outcomes to the same sound key as `early`:
  `play(\`order_served:${e.data.outcome === 'late' || e.data.outcome === 'stale' ? 'early' :
  e.data.outcome}\`)`. Stated neutrally: there is currently no distinct negative-outcome serve
  sound, whatever the intent.
- `Icon` (`apps/web/src/App.tsx:36`) is a **separate**, inline-SVG-path system (a hardcoded `icons`
  lookup, not `manifest.assets`) — see [ui-shell-i18n-a11y](ui-shell-i18n-a11y.md). Only `<Sprite>`
  (art) and `createSound` (audio) read `assets/manifest.json`; don't confuse the two when tracing
  "where does this glyph/graphic come from."
- `check:assets` runs standalone, separate from `check:config`/`check:economy` — a change that only
  touches `assets/manifest.json` will not fail `npm run verify` even if it breaks the manifest; you
  must run `check:assets` yourself.

## Related

[glass-beer-flat](glass-beer-flat.md) — the per-glass freshness sprite classes it names
(`glass-stale` vs `glass-full`, per-level keg/washer/cooler "draft sprites") are manifest ids from
this file's schema; the keg-reserve sprite substitution on missing art is this file's equipment
fallback heuristic. [onboarding-guide](onboarding-guide.md) — the forced first-shift order
(`c.onboarding.firstShift.firstOrder`) renders through the same `menuAsset` map.
[ui-shell-i18n-a11y](ui-shell-i18n-a11y.md) — `Icon` vs `Sprite` boundary (inline SVG vs
manifest-driven).
