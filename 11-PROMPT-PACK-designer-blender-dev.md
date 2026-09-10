# 🎯 PROMPT PACK — Designer & Dev — Trùm Bia Hơi (v1.14)

> **Mục đích:** 2 bản giao việc để dán cho 2 agent — (A) **Designer** tạo game asset bằng imagegen (Blender đang tạm dừng), (B) **Dev** code game. Cả hai đều **chỉ ràng buộc đầu vào / đầu ra / QA**; *cách làm, kiến trúc, layout, design do agent tự quyết*.
> Ngày: 2026-09-09. Nguồn sự thật: `00-HANDOFF-trum-bia-hoi.md` → `02-GDD-trum-bia-hoi.md` (quyết định) → `08-SPEC-economy-constants.md` + `docs/config/economy.tbh.json` (số) → `trum-bia-hoi-brd-admin.md` §5.2 (config admin).
> **Thân prompt viết bằng tiếng Anh** (để dán thẳng vào Claude Code / Codex); phần hướng dẫn cho người vẫn tiếng Việt.

---

## 0. Cách dùng

### 0.1 Chuẩn bị agent

| Agent | Cần có | Quyền ghi |
|---|---|---|
| **Designer** | Claude Code hoặc Codex + **image generation** (owner 10/09; Blender tạm dừng) + Python 3 có Pillow/numpy | `assets/`, `scripts/`, `docs/asset-*` |
| **Dev** | Claude Code hoặc Codex, Node 22, npm | toàn repo; **tự quyết quy trình build** (branch, slice, review, merge, tooling) — Level 3/autopilot **không còn bắt buộc** (chủ dự án 08/09); ràng buộc duy nhất = "WHAT IS BINDING" ở Phần B |

### 0.2 Thứ tự & cổng (gate)

- **Designer và Dev chạy song song.** Dev không chờ asset: thiếu thì dùng placeholder, thay dần khi asset vào `assets/manifest.json`.
- Trong Phần B, thứ tự slice do dev tự xếp; chỉ 3 ràng buộc thứ tự: **config loader trước mọi thứ đọc số** · **luật phục vụ (engine thuần) + lưu localStorage trước** (M1) · **server (M4) trước** xếp hạng/thanh toán/anti-cheat. Mốc chi tiết: `06-ROADMAP` v3.0.
- Mỗi batch/slice kết thúc bằng báo cáo mẫu §0.3.
- **`prototype/` không còn là điểm xuất phát.** Đó là bản thử nghiệm lưu trữ (đã đo được k = 2.24–2.34); dev **không** phải kế thừa code, layout hay màn hình của nó.

### 0.3 Mẫu báo cáo (dán vào cuối mọi prompt)

```text
TASK: <A batch name | B slice name>
STATUS: DONE | PARTIAL | BLOCKED
CREATED/CHANGED: <relative file paths>
QA: <pass/fail per check; contact sheet or test output>
DEVIATIONS: <what you did differently from the docs, and why>
HANDOFF: <what the next task needs to know>
```

---

## PHẦN A — DESIGNER BRIEF (paste to a Claude Code / Codex agent)

> Owner update 2026-09-10 10:50: PAUSE Blender asset generation. Built-in image generation is allowed for UI/game assets, following the existing style, naming, palette, camera, manifest and QA contract. Preserve completed Blender sources; no runtime/economy change.

```text
ROLE
You are the art lead for "Trùm Bia Hơi", a mobile-first idle/tycoon web game set at a Hanoi
sidewalk draft-beer stall in the 2000s. Warm pixel-art, slightly faded, no neon.
You own ~550 game assets (~475 sprites/icons + 75 audio ids, each exported as .ogg + .m4a). HOW you make them is entirely your call — studio setup, modelling
approach, batch size, post-processing. This brief fixes only the tools, the inputs, the
outputs and the QA bar.

TOOLS
- Built-in image generation is the current asset tool (owner, 2026-09-10). Blender generation is paused; retain existing .blend/render files.
- Python 3 + Pillow/numpy for post-processing. `scripts/asset_postprocess.py` already exists
  (resize/crop/anchor via SIZE_RULES) — reuse, extend or replace it as you see fit.
- `docs/asset-blender-pipeline.md` is a PROVEN SUGGESTION (studio, 3 locked ortho cameras,
  cel-shading, pixelate/quantize/outline), not a mandatory procedure. If you deviate, append
  the reason to that file's changelog.
- Do NOT pull gameplay assets from PolyHaven/Sketchfab/Hyper3D (licensing + style drift).

INPUTS
- docs/asset-production-checklist.md  — the per-asset list: id, description, size, priority, ✓ column
- docs/asset-list-designer.md         — overall style, 2000s period accuracy, §11 NAMING CONVENTION
- docs/design-tokens.md               — palette; every colour must be a token
- docs/item-list-upgrade-levels.md    — visual progression per level (Lv1 makeshift → Lv5 semi-pro)
- 08-SPEC-economy-constants.md §2/§4/§8 — stats the art must read as: keg Lv3 = 2 taps,
                                          sink Lv3 = 2 basins, 7 customer types, 6 dishes
- assets/glass-*.png (7) + assets/menu-beer.png — STYLE ANCHOR. New art must sit next to these
                                                  8 files without looking off.
- docs/asset-generation-prompts.md    — per-object descriptions, if you want ideas

ASSET LIST (~550 total incl. 75 audio ids, 8 already done)
 #  group                                                        qty   output prefix                    detail
 1  Tables 4 levels x 9 states + plastic stools + yard objects   ~50   table-lv{1..4}-{state}, chair-*  checklist A1-A2
 2  Dish + ingredient icons                                       12   menu-*, ingredient-*            B1; ids bia/lac/nem/dau/topmo/long
 3  HUD & system icons (do the ~26 core ones first)              ~140  icon-*, btn-*                   B3; asset-list §4
 4  Customer badges + emotion faces                                ~8   badge-*                         asset-list §5
 5  Equipment: keg/washer/cooler/stall x 5 levels, kitchen x 4     ~33   keg-/washer-/cooler-/stall-lv{1..5}, kitchen-lv{1..4}  A3-A7
 6  Beer glass 7 lifecycle states + rare glass                      8   glass-*                         A8 — 7 DONE, these are the anchor
 7  Characters: owner x3 weather, 7 customer types x3 weather,    ~75   stall-owner-*, customer-*,      B2; asset-list §2
    20 visual skins, event NPCs, 256x256 portraits                      portrait-*
 8  Guard dog 3 levels x 2 states + captured; thugs 4 tiers       ~11   dog-*, gangster-*               A9-A10
 9  Signboards 5 styles; cosmetics (4 lanterns, 4 plants,         ~25   sign-*, lantern-*, plant-*,     A11-A12, A14
    3 team-theme masks + palettes); one-off unlock items                unlock-*
10  Backgrounds for 9 locations + splash + 5 weather overlays     ~20   bg-quanbia-*, overlay-*         A13, B4; asset-list §8
11  Event cut-ins & raster UI overlays                            ~15   cutin-*, overlay-*              B5
12  Animation frames (pour, foam settle, wash, cheers, dog...)    ~40   <object>-f{1..n}                B6; asset-list §9
13  Audio: every player action + every engine domain event has a    75   assets/audio/<group>/<id>.{ogg,m4a}  B7.1-B7.10 — no Blender; tool is your call;
    sound (UI taps, shift open/close, customer arrive/order/cheers/                                                ogg + m4a fallback, LUFS targets, manifest
    finish/leave, 4 serve outcomes, pour/stale/wash, kitchen, coins,                                               usage = event id, license note per file
    upgrades, rush/weather/risk/events) + 7 ambient loops

Suggested critical path (only a suggestion): stool + table Lv1 -> core HUD icons -> owner +
7 customer types -> equipment Lv1-3 -> bg-quanbia-default -> everything else.
Do NOT render what checklist §B8 says code must draw (warning outlines, progress bars, particles).

OUTPUTS
1. PNG RGBA, transparent background, in assets/ (audio in assets/audio/), named per
   asset-list-designer.md §11, sized per the checklist (default 128x128; backgrounds and
   portraits per SIZE_RULES). Audio: one file per event id in checklist B7, exported as
   .ogg + .m4a into the per-group folders of B7.10 (ambient/<theme>/, ui/, shift/, customer/,
   serve/, beer/, kitchen/, economy/, events/) so any group or ambient theme can be swapped
   later without touching code; loudness/loop/content rules in B7.10.
2. The final image must READ AS PIXEL ART matching the anchor, whatever technique you used.
   3D is only a means to keep ~478 assets consistent in angle, scale and lighting.
3. assets/manifest.json — one entry per asset (schema: game-extended-workflow-cl.md §14 —
   id, type, path, source, dimensions, transparent, usage, status, review_notes;
   audio adds license_note).
4. A contact sheet per batch in assets/_qa/ — new sprites beside the anchor at 128/64/32 px.
5. Tick the ✓ column in docs/asset-production-checklist.md.
6. Keep sources (.blend, scripts) under assets/_raw/ and scripts/ so any asset can be re-rendered.
7. Report per §0.3 after each batch.

INVARIANTS (only 5 — everything else is your call)
1. Within a group: same camera, same scale, same light direction, same ground-contact point,
   same padding. Change one of the five -> re-render the whole group.
2. Colours only from docs/design-tokens.md (derived shade/highlight steps allowed). No dithering.
3. 2px outer outline #3a2730; at most 4 colour steps per object.
4. Readable at 32x32; equipment level countable (taps/basins/burners) at 64px.
5. No text, no emoji, no background inside a sprite. No real logos or IP.

QA BEFORE REPORTING DONE
Place next to glass-full.png / menu-beer.png: no size drift (±5%), same outline weight, same
saturation. All states of one object share the ground-contact point. Manifest matches the files
on disk. Checklist ticked. One failure = redo that batch.
```

---

## PHẦN B — DEV BRIEF (paste to a Claude Code / Codex agent in the repo)

> **Từ 08/09 dùng `12-PROMPT-claude-build.md` Phần 1 làm prompt dán vào Claude Code** (đã gói Phần B + vòng lặp Codex review). Phần B dưới đây là bản chi tiết/tra cứu.

```text
ROLE
You are building "Trùm Bia Hơi", a mobile-first web game (idle/tycoon, serve customers in
12-minute shifts at a Hanoi sidewalk beer stall). Ship ONE phase: the complete game with all
five economy layers, not a staged MVP.

YOU DECIDE, FREELY
- Architecture, module boundaries, state management, rendering approach, build tooling.
- Every screen: layout, navigation, controls, feedback, motion, how the player serves a table.
- Which libraries to use. (Pixi.js + React is what the docs assume, but it is a suggestion.)
- Your whole process: slice order, branch strategy, review, merge, tooling. The Level 3 /
  autopilot workflow is NOT required (owner, 2026-09-08); `.autopilot/` and `docs/autopilot-*`
  are archived material you may ignore.
`prototype/` is an ARCHIVED EXPERIMENT, not a starting point: do not inherit its code, its
layout or its screens. Read it only if you want to see how k was measured.
`09-SPEC-uiux-screens.md`, `05-SPEC-design-uiux.md` and `docs/features/F24` are REFERENCE, not
a contract — they show one workable set of screens. Design your own if it plays better.

WHAT IS BINDING
1. GAME RULES — 02-GDD-trum-bia-hoi.md (decisions) and 03-SPEC-he-ban.md (table/order/customer
   state machine, serve the whole table in one tap, beer goes flat 12s after pouring).
   All five economy layers ship: unit economy, throughput, demand-mix, risk, meta
   (see 00-HANDOFF §4 for the full in-scope list).
2. NUMBERS — 08-SPEC-economy-constants.md + docs/config/economy.tbh.json. Fields ending in
   `Base` are multiplied by k at load; times, multipliers and weights are not.
3. NO HARDCODING — every operational parameter is config, resolved from the admin Config
   Registry (trum-bia-hoi-brd-admin.md §5.2, 10-SPEC §7). Code holds schema + default
   fallback only. New number -> add the key to economy.tbh.json, classify it in
   _meta.governance.tiers, add a row to 08-SPEC §22. `npm run check:config` must pass.
   A number that is genuinely not economy gets `// config-exempt: <reason>`.
4. K INVARIANT — k = mean(payment + tip) / 82.5 over >= 500 served orders; throughput never
   enters k (04-SPEC §5). Keep a headless sim that reports k across fixed seeds; k must stay
   in 2.0-3.0. This measurement method does not change.
5. PERSISTENCE ORDER (owner, 2026-09-08): localStorage save FIRST (versioned + migrate),
   server event store AFTER — but design server-ready from day one: every mutation goes
   through an append-only event log with the shared event schema, idempotencyKey, per-shift
   configVersion; switching to the server is swapping the SaveStore adapter, not a rewrite
   (10-SPEC §9). Once the server lands it is authoritative: same engine, replay, anti-cheat,
   reconnect/resync per F23 §8. No rule may exist only on the client.
6. ENGINE PURITY — game rules in a pure module with no DOM/renderer imports, one seedable RNG,
   time passed in (never Date.now() inside), so the same code runs on server, in tests and in
   the sim. UI holds no rules.
7. Admin + Config Registry is built alongside the game, not after (BRD §11).
8. Vietnamese + English locale, guest -> login (F25). The game is FREE end-to-end (owner,
   2026-09-08): no session pass, no paywall, nothing sold for money — F26 is dropped. The ONLY
   monetization is voluntary donation to the admin (F20 "Mời Bia Hơi"): cosmetic thank-you
   gift, never coins/power/ranking, soft prompts only; receiving side is an adapter (default:
   bank QR + manual admin confirmation). Config section `donation` (tier A).
9. Legal gate: lottery stays off (`lottery.legalGate`) until legal review.
10. UI INVARIANTS that survive your free layout (00-HANDOFF §6): one-tap serve of the whole
    table via a table-level order popover/bubble per 03-SPEC §9.5; the 4 serve outcomes are
    visually distinct; hit targets >= 44px; no hover-only; colour never the only signal;
    390x844, 360x740 and 1280x720 with no horizontal scroll; 100% i18n keys;
    prefers-reduced-motion; sheets never pause the shift, penalty dialogs are no-pause.
11. ONBOARDING is binding (owner rules, 2026-09-08 — docs/features/F27-onboarding.md):
    guests play without signing up; Google sign-in is encouraged (save · achievements ·
    leaderboard) and signing in mid-shift attaches the running shift in real time without
    interrupting it; the first shift starts with ONE customer ordering ONE beer, served the
    normal way; not served in time -> the customer leaves; show only a brief toast with actual coin/reputation deductions, no explanatory text or dismissal dialog; three
    consecutive lost customers -> a step-by-step guide runs; first-ever play also runs the
    step guide (skippable). Presentation is yours; guide steps and every threshold are
    tier-C config (`onboarding.*`); hints/guide are event-bus listeners, never engine rules.
12. NETWORK STATE is binding once the server exists — F23 §8: mid-shift disconnect shows a clear state, commands
    are buffered with idempotencyKey, reconnect resyncs from the server event log.
13. AUDIO: every action/event plays the sound mapped in checklist B7 via event id ->
    assets/manifest.json -> path (grouped folders, swappable ambient themes via config
    `audio.ambientTheme`); dedupe within 100 ms; mute toggle. No hardcoded audio paths.

INPUTS
00-HANDOFF-trum-bia-hoi.md (map + scope §4) -> 02-GDD (decisions) -> 03-SPEC (tables) ->
08-SPEC + docs/config/economy.tbh.json (numbers) -> 10-SPEC (architecture SUGGESTION, binding
only where it repeats items 3-6 above) -> docs/features/F07-F28 (per-feature rules, data,
analytics, acceptance; F28 = leaderboard + shrine) -> trum-bia-hoi-brd-admin.md §5.2 (config) ->
game-extended-workflow-cl.md (canvas QA, replay test, asset manifest, perf budget).
Layout reference (preferred by the owner, not a contract): docs/reference/ (README.md indexes
8 screenshots of the original game — spatial yard HUD, upgrade sheet (2 tabs), restock sheet,
mid-shift summary, shrine/leaderboard, flyer dialog, in-place upgrade popover). The card-list
wireframe in 09-SPEC §3.1 is the archived prototype's approach.
Assets arrive progressively in assets/manifest.json; use placeholders until then
(placeholder convention: 00-HANDOFF §4.4).

OUTPUTS
- A playable, deployable build; a headless sim reporting k; tests; asset manifest wired in.
- `npm run check:config` green; typecheck and build green.
- Docs updated when you deviate: append to the changelog of the doc you contradicted.
- Report per §0.3 per slice.

DEFINITION OF DONE (per slice)
Tests + build pass; replay test passes if the slice touches gameplay; k still in band after
`sim`; no missing assets or console errors; smoke on 2 viewports (390x844, 1280x720); perf
budget held (first playable < 5s on mobile, >= 30fps floor); no new business literal in code;
spec/tracker updated.

FIRST SLICE MUST ALSO CREATE (they do not exist yet — 00-HANDOFF §4.4)
Code lives in THIS repo as npm workspaces: packages/engine (pure rules), apps/web, apps/server
(from M4). Never put new code under prototype/ (archived); do not start a separate repo.
docs/analytics-events.md, i18n vi.json + en.json skeleton, assets/manifest.json, the headless
k sim. `npm run check:config` already runs from the repo root (root package.json); when the
new engine exposes config.get(), point the two python scripts' SRC_DIR/constants at it.

BUILD ORDER (suggestion only)
config loader + engine core + shift loop -> tables/orders/serve + glasses/freshness ->
inventory + equipment upgrades -> full customer mix, weather, rush -> UI you designed ->
server + accounts + config service + admin -> meta (league, life path, locations, quests,
referral) -> risk + dog -> events (World Cup, donation) -> QA, perf, release.
```

---

## PHỤ LỤC — Tra cứu nhanh (không phải ràng buộc)

| Cần gì | Đọc |
|---|---|
| Quyết định gameplay | `02-GDD-trum-bia-hoi.md` |
| Scope (1 phase, 5 lớp economy) | `00-HANDOFF-trum-bia-hoi.md` §4 |
| Hệ bàn / Order / grace | `03-SPEC-he-ban.md` |
| Mọi hằng số + công thức + tier config | `08-SPEC-economy-constants.md`, `docs/config/economy.tbh.json` |
| Cách đo k (bất biến) | `04-SPEC-prototype-phase0.md` §5 |
| Kiến trúc, config service, API/WS, test | `10-SPEC-tech-implementation.md` (gợi ý; ràng buộc chỉ ở phần config/server/engine thuần) |
| Màn hình mẫu, microcopy, a11y | `09-SPEC-uiux-screens.md`, `05-SPEC-design-uiux.md`, F24 — **tham khảo** |
| Config sửa ở admin thế nào | `trum-bia-hoi-brd-admin.md` §5.2 |
| Quy trình game canvas (QA, replay, manifest, perf) | `game-extended-workflow-cl.md` |
| Asset: danh sách, naming, palette | `docs/asset-production-checklist.md`, `docs/asset-list-designer.md` §11, `docs/design-tokens.md` |

---

## Changelog (append-only)

| Ver | Thay đổi |
|---|---|
| v1.14 | Chủ dự án 08/09: bỏ ràng buộc Level 3 — dev tự quyết quy trình build; §0.1 + Phần B "YOU DECIDE". |
| v1.13 | Phần B: chốt vị trí code (`packages/engine`, `apps/web`, `apps/server` — workspaces trong repo này). |
| v1.12 | Binding 8: chơi free hết, F26 bỏ, monetization duy nhất = donate cho admin (F20). |
| v1.11 | Đối soát số 08/09: tổng ~550 (~475 sprite/icon + 75 audio id); nhóm 2 = 12 icon (bỏ mat-onion/mat-ice). |
| v1.10 | Binding 11 onboarding → ràng buộc theo F27 v1.1 (luật chủ dự án 08/09). |
| v1.9 | Inputs: thư mục `docs/reference/` (8 ảnh) thay 1 ảnh; F07–F28 (F28 leaderboard). |
| v1.8 | Chủ dự án 08/09: binding 5 → lưu local trước, server sau (server-ready); 11 → onboarding deferred, F27 draft; 12 áp khi có server; check:config chạy từ root. |
| v1.7 | Theo audit 08/09: Phần A nhóm 10 → 9 mặt bằng; audio theo thư mục nhóm + theme; Phần B thêm binding 10–13 (UI invariants, F27 onboarding outcome, F23 §8 mất mạng, audio qua manifest), input ảnh layout tham khảo + placeholder, mục "first slice must create". |
| v1.6 | Phần A nhóm 13 Audio: 11 → ~60 file, phủ mọi action/domain event (checklist B7.1–B7.10); ogg + m4a, LUFS, manifest `usage`=event, license note. Tổng asset ~530. Vẫn chỉ input/output/QA — cách tạo do agent tự quyết. |
| v1.5 | **Bỏ prototype khỏi đường đi của dev + trả tự do layout/design** (founder 09/09): Phần B viết lại thành bản giao việc (tự quyết kiến trúc/màn hình/thư viện; binding chỉ còn luật chơi, số, không-hardcode, bất biến k, server-authoritative, engine thuần); 09-SPEC/05-SPEC/F24 hạ xuống tham khảo; bỏ Phụ lục T/U (trùng 10-SPEC/09-SPEC) thay bằng bảng tra cứu; **thân prompt chuyển sang tiếng Anh** để dán thẳng vào Claude Code/Codex. |
| v1.4 | Phần A đổi từ 10 prompt cầm tay (A0–A9) sang 1 bản giao việc: công cụ (Blender MCP đã cài trên Codex + Claude Code), đầu vào, bảng danh sách ~478 asset theo 13 nhóm, đầu ra mong muốn, 5 bất biến, QA — cách làm do model tự quyết. `asset-blender-pipeline.md` hạ xuống mức "gợi ý". §0.2 gate + B1/B3 sửa theo nhóm asset thay vì mã A1–A9. |
| v1.3 | Scope 1 phase (founder 09/09): 🔵 = làm sau cùng, không phải cắt; preamble Phần B nói rõ thứ tự prompt ≠ cổng scope. |
| v1.2 | Quy tắc B(4) mở rộng: mọi tham số qua `config.get`, không hardcode kể cả 🟢; B5 thêm Config Service + admin endpoints, entitlement resolve/pin `configVersion` (BRD admin v0.3 §5.2, 10-SPEC v1.2 §7). |
| v1.1 | Trỏ Phụ lục T/U sang bản đầy đủ `10-SPEC-tech-implementation.md` / `09-SPEC-uiux-screens.md`; A0 dùng `docs/asset-blender-pipeline.md` làm spec chính. |
| v1.0 | Bản đầu 2026-09-08: A0–A9 designer (Blender MCP → pixelate theo anchor) + B0–B7 dev (config → asset → engine/UI P1 → P2 → P3 server/meta → P4 event → QA) + Phụ lục T (tech skeleton) + U (screen spec). Thay cho ý định viết 09/10-SPEC riêng. |

*Nguồn: `00-HANDOFF-trum-bia-hoi.md` v1.5, `02-GDD-trum-bia-hoi.md` v1.9, `08-SPEC-economy-constants.md` v1.2.2, `10-SPEC-tech-implementation.md` v1.4, `trum-bia-hoi-brd-admin.md` v0.4, `docs/asset-production-checklist.md`, `game-extended-workflow-cl.md`.*

| 2026-09-08 owner UI update | Lost-customer feedback is a numeric coin/reputation toast only; removed the earlier explanation/dialog requirement. Owner asset references: docs/reference/assets-owner-2026-09-08/. |

| 2026-09-10 owner | Image generation allowed for game/UI assets; Blender generation paused. All style/export/manifest/QA constraints stay. Finished Blender source studies preserved. |
