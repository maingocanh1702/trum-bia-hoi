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

- **Rules 28 / config 2.0.20 (S1):** saves accept rules 1–28. Pre-seat 2.x snapshots validate against the frozen `docs/config/legacy/economy-2.0.4.json`; replay refuses a seat-model snapshot or a `buyChair` entry below rules 28. D2 runs inside the first `startShift` that pins a seat-model snapshot over a capacity one: first `tableSlots` tables kept, each `min(2, seats)`, levels kept, no refund, `seat_model_adopted{shiftId, tablesBefore, tablesAfter, seatsBefore, seatsAfter}` once; the rules-27 prefix (log and events) is never rewritten.

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
  fresh playable game over the old save'`, `'a real three-day career larger than localStorage
  survives IndexedDB close and reopen exactly'`, plus a templated test (line 115) looping over
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

- `packages/engine/test/seat-model.test.ts` — `D2 migration: a 3-table x6-seat Lv3 save becomes 3 tables x2 chairs at level 3, once and replayably` and `D2 migration keeps only the first tableSlots tables of a larger shop` start from `packages/engine/test/fixtures/capacity-lv3x3-v27.json` / `capacity-lv3x6-v27.json` (recorded by the pre-change engine at a775fc0 via `fixtures/capacity-v27.ts`; their world SHA-256 must still match); `seat-model commands and snapshots refuse pre-28 replay entries`; `every committed replay fixture still decodes to its recorded log` (every save fixture in packages/engine/test/fixtures and apps/web/test/fixtures).
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
