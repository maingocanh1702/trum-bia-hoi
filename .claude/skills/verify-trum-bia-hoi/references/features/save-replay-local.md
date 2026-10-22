# Save, replay & local persistence (`apps/web/README.md` §"Existing local careers"; `apps/server/README.md` §"Local archive claim core")

## Observable contract

- Engine save shape (`packages/engine/src/save.ts`): `saveMetadata(game)` (`:7-12`) →
  `{version, seed, createdAt, playerId, config, ...(configs.length ? {configs} : {})}`. Version is
  auto-selected (`:10`): `CATALOG_SAVE_VERSION` (3) when `game.configs` has more than one entry; else
  `1` when any log entry lacks `rulesVersion` or any event lacks `idempotencyKey`; else `2`.
  `encodeSave(game)` (`:13-15`) → `JSON.stringify({...saveMetadata(game), log, events, now})`.
  `decodeSave(text)` (`:24-51`) **replays**, it does not deserialize a snapshot — rebuilds a `Game`
  from `config`/`seed`/`createdAt`/`playerId` only, replays every log entry through `game.replay()`,
  requires a byte-for-byte match, then `game.advance(save.now)`.
- Error codes: `save:unsupported` (`:26`), `save:configCatalog` (`:31` missing/empty `configs`, `:35`
  duplicate/unused config version — two distinct sites), `save:invalid-log` (`:41` envelope/ordering,
  `:47` v3-only log-length equality — two distinct sites), `save:invalid-version` (`:43`),
  `save:replay-mismatch` (`:45`), `save:event-mismatch` (`:49`, version-gated — see Gotchas).
- Browser IndexedDB (`apps/web/src/browser-save.ts`): DB `tbh.career.v1` v1, stores `['head',
  'commands','events','backups']` (`:4-5`). `Head = {revision, metadata, now, commands, events}`
  (`:6`). Errors: `storage:aborted`, `storage:corrupt`, `storage:writerAlreadyLoaded` (`:47`),
  `storage:blocked` (`:38`), `storage:alreadyMigrated` (`:65`), `storage:replacing` (`:68,80`),
  `storage:wrongGame` (`:70-71`), `storage:historyTruncated` (`:88`), `storage:conflict` (`:98`).
- Server SQLite (`apps/server/src/store.ts`): `SCHEMA_VERSION = 10` (`:14`). Append-only
  `RAISE(ABORT,'store:appendOnly')` triggers cover **more than `commands`/`events`**: also `configs`
  (`:73-75`), `client_receipts` (`:89-90`), `account_logins` (`:101-102`), `local_imports`
  (`:110-111`). `hydrate()`'s trusted-checkpoint branch has **three separate**
  `store:checkpointMismatch` throw sites (`:521,523,525` — configVersion/revision/hash triple,
  digest, and world identity are each their own check, none falls back to replay on failure).
  `store:projectionMismatch` (`:533`), `store:commandSequence` (`:506,508`), `store:eventSequence`
  (`:512,514`), `store:localArchiveSize` (`:291`), `store:importConflict` (`:293,304`),
  `store:accountConflict` (`:285,300`), `store:importOwnerChanged` (`:278,300`).
- Local-archive worker validation (`apps/server/src/local-archive.ts`): `LOCAL_ARCHIVE_BYTES = 128 *
  1024 * 1024` (`:7`, 128 MiB), `WORKER_TIMEOUT_MS = 120000`, `WORKER_HEAP_MB = 1024` (`:8`).
  Module-level `let validating = false` (`:13`) is a literal single-process single-flight lock —
  explicit `ponytail:` comment: "one replay per process; use a bounded shared queue before
  multi-host uploads." Errors: `store:invalidLocalArchive`, `store:unknownLocalConfig`,
  `store:localArchiveSize` (`:45`, a second guard vs. `store.ts:291`'s plain-text pre-check),
  `store:importBusy` (`:46`, the single-flight lock), `store:importInterrupted` (worker
  timeout/crash/exit).

- **Rules 28 / config 2.0.21 (S1; the bundle was labelled 2.0.20 on S1's earlier tip, before Wave 1's keys joined it):** saves accept rules 1–28. Pre-seat 2.x snapshots validate against the frozen `docs/config/legacy/economy-2.0.4.json`; replay refuses a seat-model snapshot or a `buyChair` entry below rules 28. D2 runs inside the first `startShift` that pins a seat-model snapshot over a capacity one: first `tableSlots` tables kept, each `min(2, seats)`, levels kept, no refund, `seat_model_adopted{shiftId, tablesBefore, tablesAfter, seatsBefore, seatsAfter}` once; the rules-27 prefix (log and events) is never rewritten.

## How to reach it

- Engine: `encodeSave`/`decodeSave` (`save.ts:13,24`). `Game.checkpoint()`/`Game.restoreTrusted()` —
  a separate trusted-snapshot path with no replay, used by `store.ts` and by
  `packages/engine/test/checkpoint.test.ts` directly.
- Web-local boot: `apps/web/src/local.ts` `boot()` (`:23-50`) calls `decodeSave(original)` at
  **local.ts:32** whenever a prior save exists — no snapshot fast path on this tier, every load
  replays. `replaceSave()` (`:52+`) also calls `decodeSave(text)` (`:54`) for the corruption-recovery
  file-upload path.
- UI, exact ARIA strings driven by the specs (`account-local.spec.ts`, `browser-save.spec.ts`):
  button `'Cài đặt'` (settings; the `'Vào quán'` language screen was removed 2026-10-15), `'Tải bản lưu dự phòng'` (export/download
  backup), `/Tài khoản/` (account panel trigger), dialog named `'Tài khoản'` containing text
  `'Tiến độ này đang lưu trên thiết bị'`, button `'Chơi không đăng nhập'` (continue-local — declines
  Google), button `'Tiếp tục với Google'` (Google continue, present but not exercised by this spec),
  corrupt-save alert containing `'Bản lưu chưa đọc được'` with button `'Tải bản lưu localStorage cũ'`
  + `input[type=file]` upload, storage-unavailable alert containing `'Chưa mở được dữ liệu'`.
- Server: `store.claimLocal(token, text)` (`store.ts:289`) — internal, authenticated-Google-only
  (`googleOwner`), idempotent-by-digest, gated by `requireEmptyClaimTarget` (`:282-286`, refuses a
  destination account that already has real progress). **This has no HTTP route** — see below.

## Existing proof

- `packages/engine/test/feedback.test.ts` — `genuine rules25 losses and summaries replay unchanged, then mixed old and new evidence remains explicitly unknown`. Fixture `legacy-feedback-v25.json` was generated from07430a95ec6f8f2799650344511dbda2f8a19f12; SHA256 pins the entire original world, including closed summary, before current-rule adoption. `A4 ${locale} ${mode} advice uses observed losses and survives reload` in `apps/web/test/feedback.spec.ts` covers local migration/reload.

- `packages/engine/test/checkpoint.test.ts` (ENGINE tier, pure in-memory, no I/O), 5 tests: `'every
  archived replay state restores its actual bookkeeping and continues with identical events,
  currency and retry results'`, `'rules1 through24 preserve an active rush through closing and
  retain the original producing batch deadlines'`, `'successful and rejected opening config
  candidates restore independently of the last logged candidate'`, `'unknown checkpoint versions,
  missing pins, wrong history counts and duplicate retry keys are not restored'`, `'rules24 hidden
  recovery and resting loss checkpoint exactly, including a retry after a later outage'`.
- `apps/server/test/checkpoint.test.ts` — **a different file, same basename**, SQLite
  `engine_checkpoints` caching/fault-injection via `GameStore`, 5 tests: `'cold server reads and
  retries restore verified checkpoints without replay, while warm revisions avoid rehydration'`,
  `'checkpoint metadata, projection, origin, raw history and registry order must all match before
  trusted restore'`, `'schema5 history is replayed once and checkpointed even on an unchanged read;
  subsequent restart preserves exact state'`, `'checkpoint failure rolls back money, appended
  history, revision and cache; the original command succeeds once after recovery'`, `'legacy rows
  needing additive replay enrichment keep that verified replay path without rewriting immutable
  history'`.
- `apps/server/test/local-import.test.ts`, 8 tests: `'claiming a local live shift preserves its full
  archive, source IDs and pending review across rotation, replay and restart'`, `'a progressed
  account, source identity collision or second account cannot overwrite or claim an existing game'`,
  `'unknown or changed configuration, malformed history and future frontiers are refused before any
  import mutation'`, `'logout, expiry or successful gameplay during worker replay invalidates claim
  authorization at commit'`, `'one worker admission and SQLite rollback preserve both accounts and
  allow a safe retry after a late audit failure'`, `'schema4 migration and approved legacy
  configuration retain the original v1 archive without inventing approval'`, `'a local career
  spanning two registered configurations retains its opening pins and current shift after server
  restart'`, `'uploaded checkpoint and projection fields never bypass full local replay or become
  trusted server state'`.
- `apps/web/test/browser-save.spec.ts`, 6 call sites / 11 runtime names: `'overlapping autosaves
  append only new history and publish the latest committed frontier'`, `'an aborted write or
  replacement keeps the old archive and retry preserves every command'`, `'two loaded revisions
  cannot overwrite each other and damaged chunks fail closed'`, `'unavailable storage never boots a
  fresh playable game over the old save'`, `'a real five-day career larger than localStorage
  survives IndexedDB close and reopen exactly'` (S5: it was three days; with the JSON 2.1.0 economy the plan's bot buys tables 2-8 first and three days make 3.7 MiB, four 5.07, so `fixtures/browser-career-save.ts` runs five days, 8.3 MiB and 40 shifts), plus a templated test (line 115) looping over
  `['missing chunk','invalid revision','invalid frontier','invalid command','invalid event','invalid
  metadata']`, each expanding to `` `<damage> exposes recovery and preserves raw rows before
  importing the legacy archive` ``.
- `apps/web/test/account-local.spec.ts`, 1 test: `'local account panel preserves the live archive and
  never creates a server career or Google request'` — the exact export/continue-local UI decision
  point the README describes: opens the account panel, asserts the Google button is hidden until a
  1200ms wait, clicks continue-local, re-exports, and asserts playerId/shift/coins/completedShifts
  are unchanged and zero `/api/` or `accounts.google.com` requests fired.
- `apps/web/test/config-pinning.spec.ts`, 1 test: `'a mixed-config save imports through recovery,
  preserves its backup and continues the pinned shift after browser reload'` — exercises the v3
  (`CATALOG_SAVE_VERSION`) multi-config save shape through the same corruption-recovery upload path.
- Corroborating but not dedicated: `apps/server/test/http.test.ts:292`, `competition.test.ts`,
  `leaderboard.test.ts:29`, `admin-auth.test.ts:317` all call `store.claimLocal()` directly as
  fixture/setup, not as save-replay proof themselves.

- `packages/engine/test/seat-model.test.ts` — `D2 migration: a 3-table x6-seat Lv3 save becomes 3 tables x2 chairs at level 3, once and replayably` and `D2 migration keeps only the first tableSlots tables of a larger shop` start from `packages/engine/test/fixtures/capacity-lv3x3-v27.json` / `capacity-lv3x6-v27.json` (recorded by the pre-change engine at a775fc0 via `fixtures/capacity-v27.ts`; their world SHA-256 must still match); `a Wave 1 save (rules 27, pinned the way the Wave 1 build wrote it) replays byte for byte and adopts the seat model once at its next opening` (stage 00: the same genuine `capacity-lv3x3-v27.json` history with its pinned config carrying the Tier C presentation keys JSON 2.0.6 added — the shape of every browser save of the deployed Wave 1 build — still matches its world SHA-256, re-encodes byte for byte before anything is played, adopts the bundled 2.0.21 seat model at the first `startShift`, 3 x6 seats Lv3 -> 3 x2 chairs Lv3, no refund, `seat_model_adopted` once, and the adoption replays byte for byte); `a pre-seat snapshot from Wave 1 (JSON 2.0.5/2.0.6: the capacity model plus presentation keys) still loads, bytes kept; a bad key or tier list still fails closed`; `Wave 1 presentation keys extend the frozen capacity shape alone: the same keys on a 1.x snapshot are refused as on main, each one stays optional on a pre-seat 2.0 pin` (stage 00 round 1: a 1.7.3 snapshot carrying any of the six presentation keys, or `nextGoal` in its tier C list, is refused with `config:…:keys`; the same keys on the frozen 2.0.4 shape load with their bytes kept); `a snapshot key named like an Object.prototype member is an unknown key at every object node, never a known one` (an own `constructor` / `toString` / `valueOf` / … or `__proto__` key is refused on the seat-model and the capacity shape); `seat-model commands and snapshots refuse pre-28 replay entries`; `every committed replay fixture still decodes to its recorded log` (every save fixture in packages/engine/test/fixtures and apps/web/test/fixtures).
- `apps/web/test/improve-lp1.spec.ts` — the browser adopts the bundle at the next opening (D2) and buys the fourth table that LP1 now counts.

## Verification procedure

- `npm test` (= `tsx --test packages/engine/test/*.test.ts apps/server/test/*.test.ts`) runs both
  `checkpoint.test.ts` files and `local-import.test.ts`. Targeted (bare `tsx` is not guaranteed on
  `PATH` outside an npm script — use `node --import tsx --test`):
  `node --import tsx --test packages/engine/test/checkpoint.test.ts` /
  `node --import tsx --test apps/server/test/checkpoint.test.ts apps/server/test/local-import.test.ts`.
- `npm run test:e2e` (`playwright.config.ts`, `testDir: apps/web/test`) runs `browser-save.spec.ts`,
  `account-local.spec.ts`, `config-pinning.spec.ts`.
- `npx playwright test --config playwright.remote.config.ts` / `--config playwright.admin.config.ts`
  spin up `apps/web/remote-test/server.ts` / `apps/web/admin-test/server.ts`, whose `/__test/rank` and
  `/__test/moderation` seeding endpoints call `claimLocal` server-side as a fixture primitive (not as
  upload-path proof — see Uncovered paths).
- `npm run check:config` for config-catalog sanity (save.ts's version logic depends on it).
- `npm run verify` is the whole-repo gate for any change here.

## Uncovered paths

- **`claimLocal` has no HTTP route, and neither does the read-only `localImport` status check.**
  `grep -nE "localImport|local-import|localArchive|claimLocal" apps/server/src/http.ts` → zero
  matches across the full 348-line file and its 94 route strings. This is a confirmed
  **owner-deferred** gap, not a bug or unknown — cite it that way, corroborated four ways: (1)
  `store.ts:287-288`'s own doc comment, "Internal claim boundary; no public upload route until its
  transport and recovery are ready"; (2) `apps/web/README.md` §"Existing local careers" (quoted
  below); (3) `apps/server/README.md`, "Transport isolation/recovery and cold-read performance must
  be addressed before web cutover"; (4) `docs/features/F25-localization-account.md`, "No HTTP
  upload, approval or cloud UI is active." `apps/web/README.md` verbatim: *"An existing local archive
  is preserved. Before creating a server career, the UI offers export/continue-local or an
  explicitly separate new server stall. Nothing is uploaded, merged, repriced or discarded by that
  choice. [...] local.ts/IndexedDB remain for the explicit legacy continuation and test fixtures
  while the owner-deferred public archive upload/review flow is unfinished. Local earnings cannot
  reach server balances/ranking."*
- **No test anywhere exercises an HTTP client actually uploading archive text into `claimLocal`.**
  Even the two fixture servers that call `claimLocal` (`remote-test/server.ts:53`,
  `admin-test/server.ts:41`) build the archive **entirely server-side, in-process** via
  `encodeSave(game)` — the text never travels over HTTP. All real coverage is direct in-process
  `store.claimLocal()` calls.
- No test calls `claimLocal` with a genuinely empty-string archive (`store:localArchiveSize`'s
  `!text.length` branch is covered only for malformed/oversized inputs, not bare `''`).
- `apps/server/src/local-archive-worker.mjs` (the actual worker entry) is unverified by this pass —
  its wiring to `replayLocalArchive`/`validateLocalArchive` is inferred from naming and the
  message-passing contract, not line-confirmed.

## Variants

- **success** — `local-import.test.ts` test 1; all `browser-save.spec.ts` normal-save tests.
- **cancel** — not evidenced. `account-local.spec.ts`'s "decline Google, stay local" choice is closer
  to a declined offer than an in-flight-claim cancel; no dedicated cancel test found.
- **reason** — extensive: every `store:*`/`save:*`/`storage:*` error above is asserted via
  `assert.rejects`/`assert.throws` somewhere in the cited files.
- **empty** — partial: an empty IndexedDB read returning `null` is implicitly exercised by every
  spec's post-`open()` read; explicit empty-string `claimLocal` archive is not tested.
- **persistence** — `browser-save.spec.ts`'s three-day-career IndexedDB test; both `checkpoint.test.ts`
  files' restart-survival tests.
- **capacity** — `LOCAL_ARCHIVE_BYTES` (128 MiB) tested via `store:localArchiveSize`; `CHUNK=1000`
  chunking in `browser-save.ts:85-109`; the multi-MB three-day-career test.
- **duplicate/idempotent** — `local-import.test.ts` test 1 explicitly re-claims the same token and
  asserts the second call returns no new token; server `checkpoint.test.ts`'s rollback test retries
  the same idempotency-keyed command across restarts and asserts exactly one row lands.
- **stale** — `browser-save.spec.ts`'s two-loaded-revisions test (`storage:conflict`);
  `local-import.test.ts`'s "logout, expiry or successful gameplay during worker replay invalidates
  claim authorization at commit".
- **time-jump** — engine `checkpoint.test.ts` steps `[1, 15000]` plus a 24h (`86400000`) catch-up
  jump; server `checkpoint.test.ts` advances `f.now += 11100`.
- **offline-reconnect** — engine `checkpoint.test.ts` test 5 drives disconnect/reconnect cycles
  including a second, later outage.

## Gotchas

- `decodeSave`'s event-match check (`save.ts:49`) does three different things by version: v1 skips it
  entirely; v2 requires one-directional match (`save.events` ⊆ replayed `world.events` per field —
  replay may enrich old payloads with additive fields, per the doc comment at `save.ts:17`); only
  v3/`CATALOG_SAVE_VERSION` adds the reverse-direction check too, requiring exact equivalence.
- **Correction worth pinning:** `browser-save.ts`'s incremental-write cursor is `head.commands`/
  `head.events` (row counts, used at commit time to find "new since last write"), **not**
  `head.revision`. `revision` is a `crypto.randomUUID()` — purely the optimistic-concurrency
  comparison token behind `storage:conflict`, structurally separate from what determines which rows
  are new.
- Append-only SQLite triggers cover `configs`/`commands`/`events`/`client_receipts`/
  `account_logins`/`local_imports` — broader than "just commands and events".
- Tamper-resistance is explicit and tested, not assumed: `apps/server/README.md`, *"Untrusted local
  imports always go through full worker replay against known configs. `Game.restoreTrusted` is for
  integrity-checked, server-owned data only; any uploaded checkpoint or world fields are ignored and
  cannot skip replay."* — a crafted save with an inflated `coins` field or a forged checkpoint is
  silently discarded in favor of full replay-derived state; `local-import.test.ts`'s "uploaded
  checkpoint and projection fields never bypass full local replay..." is the direct proof.
- `docs/features/F25-localization-account.md` and `apps/server/README.md` both carry changelog rows
  dated 2026-09-10 marked "(review pending)" for this area — treat the no-HTTP-route gap as
  actively-tracked, not an oversight.

## Related

[economy-k-ledger](economy-k-ledger.md) — `claimLocal` preserves `coins`/`reputation` byte-for-byte
via replay-verification (never re-derived), and imported local history feeds competitive/leaderboard
scoring only after owner review (`review: 'pending'`); *"Local earnings cannot reach server
balances/ranking"* is a hard boundary, not a soft default. [multi-system-journeys](multi-system-journeys.md)
— the local→Google→claim→server flow spans browser IndexedDB, Google OAuth, and the SQLite server
store in one player-facing journey; `local.ts`'s `boot()` is the substrate every other web-local
session resumes through.


### A1 — 2026-09-16 proof
- `apps/web/test/local-config.test.ts`: newer bundled config adoption only at next successful opening; running/historical pins, custom/newer versions and replay retained.
- `packages/engine/test/progression.test.ts`: LP1 scaled threshold/four seats without dog; old pinned dog requirement still enforced.
- `apps/web/test/improve-lp1.spec.ts`: production browser guest with real previously earned income migrates LP1, opens next shift, reloads unchanged with no visible dog. Run `npx playwright test --config playwright.improve.config.ts improve-lp1.spec.ts`.

## Changelog — A4
| Date | Change |
|---|---|
| 2026-09-16 | Add current order feedback and rules26 loss evidence regression citations; historical replay remains unchanged. |


### Wave B — 2026-09-16 proof
- `packages/engine/test/menu.test.ts` — 'genuine rules26 close events remain byte-equivalent before adding rules27 metrics on a new shift'. `apps/web/test/menu.spec.ts` — 'Sổ ca shows actual dish counts, pauses while open and updates after closing and survives reload at …' now checks actual backup-button downloads contain every exact KPI. Rules27 adds close-event fields; rules≤26 payloads remain exact.

## Netlify guest build — 2026-09-16

`apps/web/guest-test/guest.spec.ts` → `static guest serves, restocks, upgrades, closes shift and persists across reload/new tab without API`: production guest build on 360×740, 390×844, 1280×720; full service/restock/pause/upgrade/next-day journey, Settings SHA, six close KPIs equal backup, reload/new-tab preservation, admin/online-ranking hidden and zero API/Google requests. Run `npm run build:guest`, copy `apps/web/dist` to `.qa/guest-dist`, then `npx playwright test --config playwright.guest.config.ts`; `TBH_GUEST_URL` targets the verified draft or live URL without a local server. Normal remote/account mechanics are unchanged.

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: D2 adoption, legacy 2.0.4 shape, pre-28 replay guards and the fixture guard cited. |
| 2026-10-20 | S2 rules 28: a rules-27 history recorded by the pre-S2 engine (`capacity-lv3x{3,6}-v27.json`) replays to the same world hash and keeps its 2 s tap (`instant-pour.test.ts` `a recorded rules-27 shift on ${3|6} capacity tables replays byte for byte and shows the tap it was recorded with`); a loaded rules-27 save keeps the tap through its live rules-28 commands and pours instantly only at the opening that adopts the seat model (`a rules-27 save keeps the tap through its live rules-28 commands and pours instantly only at the opening that adopts the seat model`). The existing `legacy-*` fixtures of `npm test` replay unchanged. |

## Changelog — S3 capacity demand
| Date | Change |
|---|---|
| 2026-10-20 | S3 (JSON 2.0.22): `loadConfig` shapes a seat-model snapshot labelled before 2.0.22 that lacks `spawn.capacityDemand` with the seed minus the S3 keys (`seatShape()`: exact, version-gated, nothing loosened); a rules-28 history recorded on 2.0.21 by the S2 engine (`packages/engine/test/fixtures/seat-2.0.21-v28.json`) still decodes, re-encodes byte for byte and repins to the bundle at its next opening (`capacity-demand.test.ts`: first and last tests); in the real app the same save opens without the recovery screen and its next "Mở ca" pins the bundled seed once (`apps/web/test/config-pinning.spec.ts` `a browser save pinned to JSON 2.0.21 opens without recovery, then adopts the bundled seed once when its next shift opens`; it fails when `seatShape` is removed, `02-pw-pin-mutation.log`). Rules-28 saves recorded by S1's tip still fail since S2 (instant pour changed their events). |

## Changelog — S4 table and chair levels
| Date | Change |
|---|---|
| 2026-10-20 | S4 (JSON 2.0.23): `SEAT_KEYS_ADDED_LATER` gains a `since: 2.0.23` row with a `restore` list; `seatShape()` shapes a seat snapshot labelled before 2.0.23 that carries neither `upgrades.table.tableUpgrade` nor `chairUpgrade` with the seed minus those keys and their Tier A entries PLUS `upgrades.backrest` (copied from the frozen 2.0.4 file: the key the ladders replaced); half-way shapes are refused (`packages/engine/test/table-chair-upgrades.test.ts` `snapshots from before the keys load, bytes kept, and refuse every half-way shape; the new keys never loosen an older shape`, 10 refused shapes). A rules-28 history recorded on 2.0.22 by the S3 engine (`packages/engine/test/fixtures/seat-2.0.22-v28.json`, generator `fixtures/seat-v28-2022.ts`: four pairs, three table levels, 50 orders, 70 serves) replays to the recorded world hash and re-encodes byte for byte (`a rules-28 history recorded on JSON 2.0.22 replays byte for byte and re-encodes unchanged: ...`); a pinned 2.0.22 save adopts the bundle at its next opening and its tables keep their levels (`a pinned 2.0.22 save adopts the new bundle at its next opening: ...`); `replay()` refuses an `upgradeChair` entry below rules 28 (`upgradeChair is a rules-28 command: ...`); the browser case is `apps/web/test/config-pinning.spec.ts` `a browser save pinned to JSON 2.0.22 keeps its old table cards, then adopts the bundled seed once when its next shift opens and its levels give their perks`. |

## Changelog — S5 balance pass
| Date | Change |
|---|---|
| 2026-10-20 | S5 `eco21-balance-pass` (JSON 2.1.0): `SEAT_KEYS_ADDED_LATER` gains a `since: 2.1.0` row for `shift.noCooldownFirstShifts` (no `restore` list: a pin before 2.1.0 simply has no key, so the first-shifts allowance is off for it and its history replays byte for byte); the rules-28 history recorded on 2.0.23 by the S4 engine is a fixture (`packages/engine/test/fixtures/seat-2.0.23-v28.json`) replayed by `no-cooldown.test.ts`. `apps/web/test/browser-save.spec.ts` runs a five-day career (title changed). |
| 2026-10-22 | Wave 3 `fun-kick-table` (the label stays 2.1.0, its eighth content in git history: 62d2ecb, 088ff1b, e6e3ea2, adc4b24, 63aaf2f, ea33595, 2f47715, f4855d2): `SEAT_KEYS_ADDED_LATER` gains the row `{ since: '2.1.0', paths: ['kickTable'], tiers: { A: ['kickTable'] }, optionalAt: ['2.1.0'] }` — a seat pin labelled 2.1.0 may lack the whole `kickTable` group (the S5/S6 contents of the label), a later label must carry it, half of it is refused; the template cache of `seatShape()` is keyed by row index (two groups share the label 2.1.0). A rules-28 history recorded on the S6 content of 2.1.0 by the S6 engine (`packages/engine/test/fixtures/seat-2.1.0-v28.json`, generator `fixtures/seat-v28-210.ts`, tip 7186ab1; lingering `consuming` and 8 `table_occupied`) replays byte for byte. Proof: `packages/engine/test/kick-table.test.ts` — `a rules-28 history recorded on JSON 2.1.0 by the S6 engine replays byte for byte and re-encodes unchanged; on that pin no table can be sent home`, `the S6 save keeps its pin: the bundled 2.1.0 now carries kickTable, so opening a shift with the bundle is refused as a second content of the same label` (the documented cost of keeping the label: `configVersionConflict`; the browser never offers it because it adopts only a newer X.Y.Z), `snapshots from before kickTable load with their bytes; every half-way shape is refused; kickTable never loosens an older shape`, `a history that sends tables home replays byte for byte`, `kickTable is a rules-28 command: the envelope needs a table and a whole maxCost, and replay refuses an entry below rules 28`. Browser: `apps/web/test/kick-table.spec.ts` `Wave 3 ${why}` (a save pinned to the S6 content keeps its pin and offers no "Mời về"); the lingering case reloads and keeps its one `kickTable`. |
| 2026-10-22 | Owner calls of PR #30 (stage 07b): the bundle is labelled **2.1.1** (`kickTable.feeRate` 0.5, a ninth content of 2.1.0). Every 2.1.0 content keeps loading with its bytes and replaying byte for byte, and a save pinned to one now ADOPTS 2.1.1 at its next opening (numerically newer; `local.ts` `openingConfig`), so an S5/S6 pin gets "Mời về" from then on; a different content under the same label is still refused. The engine case of the row above was renamed with its new premise: `packages/engine/test/kick-table.test.ts` `the S6 save adopts the bundled 2.1.1 at its next opening (a newer label, not a second content of 2.1.0): its tables can then be sent home, and the history replays byte for byte`; browser: `apps/web/test/kick-table.spec.ts` `Wave 3 a save pinned to the S6 content of JSON 2.1.0 adopts the bundled 2.1.1 at its next Mở ca, and with it Mời về at the founder's price` (fixture mode `pin-rest`) beside `Wave 3 a save pinned to the S6 content of JSON 2.1.0 (no kickTable section) offers no Mời về in the shift it is pinned for`. |
