# Multi-system journeys

Journeys that cross engine↔web, local↔remote, or touch shift/save/season together. Per-feature
selectors live in the linked files — read those first, then sequence the journey. This file is
explicitly **not** for single-tier golden-path tests (most of those are already cited by a
single-feature file); it's for the crossings.

## Observable contract

- **Local-mode persistence (engine↔web↔IndexedDB)**: save state lives in IndexedDB `tbh.career.v1`
  (`head`/`commands`/`events`/`backups` stores), not `localStorage`. `localStorage['tbh.save.v1']` is
  a **legacy-only** key — `local.ts`'s `boot()` reads IndexedDB first and only falls back to it (via
  `storage.migrateLegacy(original)`) on an empty IndexedDB. Nearly every `game.spec.ts` test seeds
  `tbh.save.v1` via `page.addInitScript`, so **every one of those tests exercises the legacy-migration
  boundary at boot**, even ones that look single-tier.
- **Reload-persistence, observably**: `.money strong` text, `.table-space` state classes, translated
  button/dialog names (after a mid-test locale switch), and specific `save.events`/`save.log`
  entries must be byte-identical before/after a real `page.reload()`.
- **Remote-mode (web↔server)**: `.network-status` text (`'Đã đồng bộ'` synced / `'Đang kết nối lại'`
  reconnecting), the `tbh.remote.v1` outbox journal in `localStorage`
  (`{playerId,clientId,nextSeq,heartbeatSeq,cursor,pending}`), and server truth via `GET
  /api/player/state` must agree with DOM state after any disruption.
- **Local↔remote fork, observably**: on remote-build boot, a pre-existing `tbh.save.v1` triggers a
  choice screen (`'Tiến độ đã lưu trên máy'`) before any server session exists; `tbh.remote.v1` stays
  `null` until the user explicitly opts into a server career.
- **Engine↔web (local mode), observably**: `local.ts`'s `boot()` directly constructs/decodes a `Game`,
  calls `game.command()`/`game.advance()`, then saves — no HTTP hop; the "crossing" is browser
  runtime calling pure engine code in-process, including an offline-catch-up sequence
  (pause→advance-to-now→resume) that runs on **every single boot**, not just explicitly-offline
  tests.

## How to reach it

- Engine: mostly N/A here — the engine side of a crossing is invoked in-process (local mode) or via
  test fixtures (`execFileSync`), not driven as its own step.
- UI reload: `page.reload()`, or the `reloadAtSameGameTime(page)` helper
  (`apps/web/test/game.spec.ts:7-13`, freezes `Date.now` across the reload so elapsed-time assertions
  stay exact).
- UI offline/hidden: `Object.defineProperty(document,'hidden',{value:true})` +
  `dispatchEvent(new Event('visibilitychange'))`.
- UI time-jump (harder than reload — fully tears down the document): `page.goto('about:blank')` →
  `page.clock.setSystemTime(new Date(t+86400000))` → `page.goto('/')`.
- UI switch-tab/new-writer: `context.newPage()` (second tab), or `page.close()` + `context.newPage()`
  (full session teardown/rebuild, new-tab continuity).
- Locale switch: `Cài đặt` → `Ngôn ngữ` select.
- Remote API routes exercised across these journeys: `POST /api/player/command`, `GET
  /api/player/state`, `POST /api/player/heartbeat`, `GET /api/player/events`, `GET/POST
  /api/auth/session`, `POST /api/auth/logout`, `POST /api/auth/google/challenge`, plus test-only
  `POST /api/__test/advance?ms=`, `GET /api/__test/clock`, and (playable-test only) `POST
  /api/__test/overnight`.

## Existing proof

- `apps/web/test/quick-beer-stock.spec.ts` — `A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) uses a real DOM purchase and replay inspection to assert full-quote quantity/cost, stock including in-flight batches, one restock event, unpaused timer/reload, 44px and warning-specific axe. Boundaries: `A2 empty raw beer stock remains a refill warning while a batch is still preparing`, `A2 low beer stock keeps the exact unaffordable quote disabled in ${locale}`, and `A2 full beer stock has no low-stock warning or zero-quantity quick purchase`. `A2 stock at the configured batch boundary has no warning despite a nonzero refill quote` pins `stock === batchSize < cap` separately from the full-stock boundary.
- `apps/web/remote-test/quick-beer-stock.spec.ts` — `A2 quick beer refill uses the real server while the shift remains live and reloads once` consumes stock through DOM serving against the isolated API, purchases through the HUD, and checks the authoritative charge/stock, no pause and reload. Run `TBH_PORT_BASE=4178 npx playwright test --config playwright.remote.config.ts apps/web/remote-test/quick-beer-stock.spec.ts`; 4179/4180 must be free because this fixture binds those test ports. Local proof uses `npx playwright test apps/web/test/quick-beer-stock.spec.ts`.


**`apps/web/test/game.spec.ts`** — local mode only (`VITE_TBH_LOCAL=1`), 22 top-level tests, 40
runtime executions once viewport/mode loops are counted. **None of these 22 cross local↔remote** —
the crossing they exercise is reload-persistence / legacy-migration / locale. 15 of 22 genuinely
cross a boundary (reload-persistence, backup-recovery, or a viewport-mode-matrix combined with a
reload), including: `` `guest serves, reloads, opens paused sheets and switches locale at
${viewport}` `` (×4 viewports, reload+locale+viewport matrix in one test), `` `multi-dish service
shows the actual ${mode} reward and guest reaction` `` (reload + outcome-mode matrix), `'corrupt
saves are preserved and the app offers the original for recovery'`, `'recovery rejects a bad import,
accepts a valid backup and preserves the original'`, `'starting fresh requires an explicit choice and
retains the corrupt backup'` (all three: legacy-localStorage↔engine-decode-failure↔recovery-UI,
IndexedDB `backups` store), `` `manual close shows its fee, allows cancellation and debits consuming
guests once at ${viewport}px` `` (reload + shift-close×save), `'hidden and offline time preserves the
current order and remaining shift'` (reload via `about:blank`+clock jump + offline), plus 7 more
reload+viewport-matrix tests across rush/dog/life-path/shipper/signboard/flyer features. The
remaining 7 of 22 are single-tier (fixture-seeded state, cross-checked in-session, no reload) —
already cited by their own single-feature files.

**`apps/web/playable-test/shift.spec.ts`** — 1 test, `'default guest full shift'`, the richest
specimen in the repo: remote mode against a real in-process server
(`apps/web/playable-test/server.ts`, real `GameStore`+`createGameServer`, SQLite `:memory:`), runs
under 3 viewport projects. Real-time 20-minute shift play; mid-shift reload checking `shift.id`/
`playerId` survive (reload-persistence, network-backed); `page.close()`+`context.newPage()` checking
`playerId`/`completedShifts`/`coins`/`equipment`/`shift.id` persist server-side (new-tab
continuity); a test-only `/api/__test/overnight` fast-forward + reload + new shift open, checking
`shift.id` actually changed (shift-season-save: day/shift rollover via server-authoritative clock,
verified through reload). Spans reload-persistence + shift-season-save simultaneously.

**`apps/web/remote-test/remote.spec.ts`** — 11 top-level tests (16 runtime executions with loops),
the offline-queue/reconnect proof. The clearest ones: `'real server serves once after lost
acknowledgement, retains queue across reload, menus pause and reports resync'` (aborts a request
after the server received it, reloads while cut, un-cuts, confirms no double-charge — ack-loss +
reload + resync in one test), `'existing local archive is untouched and a second tab cannot
overwrite the remote action stream'` (**the local-remote-fork test**: seeds `tbh.save.v1`, boots the
remote build, confirms the choice screen, confirms `tbh.remote.v1` stays null until opt-in, confirms
the local archive is unchanged after opting in, then a second tab gets a one-writer-lock alert),
`` `normal startup preserves ${damage} forensic recovery before any server career is created` `` (×2
damage modes — **the deepest engine↔web↔storage crossing**: directly constructs a real
`Game`+`BrowserSave` in-browser, corrupts IndexedDB, boots the remote build, proves recovery UI
appears and the remote journal/session stay untouched until the user chooses), plus offline-restock,
server-closes-beyond-grace, storage-failure, account-rotation-vs-stale-queue, hung-transport,
fresh-guest-before-heartbeat, and two `M1-*` viewport-matrix tests cross-checking DOM against `GET
/api/player/state`.

**Season/shift × save crossing**: `apps/web/test/seasons.spec.ts` — `` `offline guest board preserves
customer pause and calendar rollover without exposing account history at ${width}px in ${locale}` ``
is the one test in the whole suite that literally combines season-rollover + save + reload: fast-forwards
past `seasons.ranking.endsAt`, asserts the post-rollover snapshot, then reloads and re-asserts
`seasons.results` still match. Local mode only — no remote-mode season-rollover-in-browser test
exists. Shift-close × save is covered by `game.spec.ts`'s manual-close tests above; no test combines
shift-close **and** season-rollover **and** save in one flow.

**Engine/server-tier files** (`packages/engine/test/disconnection.test.ts` 28 cases,
`apps/server/test/client-sequence.test.ts` 4 cases, `apps/server/test/presence.test.ts` 10 cases) all
use `node:test` directly against `Game`/`GameStore` — **no Playwright, no browser, no IndexedDB/
localStorage** (one exception: `presence.test.ts`'s `'native HTTP heartbeat authenticates views,
reports protocol clocks and autonomously closes offline shifts after restart'` spins up a real HTTP
server and makes real `fetch()` calls, Node-to-Node, still no browser). These are the non-UI half of
a crossing — cite them alongside a UI test when a change spans both, never as a substitute for one.

## Verification procedure

No single command covers this feature — run the configs relevant to what crossed:
```
npm test                                                      # engine+server tier
npx playwright test apps/web/test/game.spec.ts apps/web/test/seasons.spec.ts   # (or npm run test:e2e for the full local suite)
npx playwright test --config playwright.remote.config.ts      # outbox/reconnect/local-remote-fork
npx playwright test --config playwright.playable.config.ts    # apps/web/playable-test/shift.spec.ts, 3 viewports
npx playwright test --config playwright.admin.config.ts       # admin UI crossings
```
For reload-persistence/legacy-migration/backup-recovery changes: `test:e2e` at minimum. For anything
touching the outbox journal, Web Lock, or reconnect state machine: `playwright.remote.config.ts` is
mandatory. For real HTTP+SQLite store semantics end to end: `npm test` plus
`playwright.playable.config.ts`.

## Uncovered paths

Checked each Wave-V5 candidate from the plan against a real grep — results vary, don't assume they're
all still open:

- **Remote-mode serve outcome toasts** — **confirmed uncovered.** `.toast-gain` has zero matches
  anywhere under `apps/web/remote-test/`; only `.toast-loss` and a generic queue-full `.toast` are
  asserted there. Local mode covers `.toast-gain` extensively.
- **`serveDelivery` UI path** — **confirmed uncovered in remote/playable tiers**, zero `shipper`/
  `delivery` matches there. Already covered in local mode (`game.spec.ts`'s shipper tests).
- **Keg-empty UI state** — **confirmed uncovered in remote/playable tiers** (all `keg` hits there are
  about upgrades, never empty state). Already covered in local mode (`game.spec.ts`'s "beer is out"
  test, via `fixtures/mixed-grace.ts` zeroing starting stock).
- **Lease early-exit UI** — means the location-rental lease (`Locations.tsx`, the `leaveLocation`
  command → `leaveLease()` → `lease_left` event, `engine.ts:338-343`), not the unrelated server
  presence/session lease in `presence.test.ts`. **Already covered, not a gap** — local mode only,
  `apps/web/test/locations.spec.ts`'s `` `rental quote, early move, pause and reload at ${width}px in
  ${locale}` `` (its `vi@360px` iteration clicks the early-leave button; `en@390px` lets the lease
  expire naturally instead). No remote-mode equivalent exists.
- **Season rollover in the browser** — **already covered, not a gap.** `seasons.spec.ts` (above)
  does exactly this, including reload. Local mode only.
- **Admin rollback UI** — **already covered**, just not under the literal English word: `apps/web/
  admin-test/admin.spec.ts`'s `'loading a published scope preserves its audience and permits an
  explicit empty withdrawal'` clicks the Vietnamese-labeled rollback button (`admin.rollback` i18n
  key). A literal grep for "rollback" finds nothing because the UI text is localized — search by
  i18n key, not by English guesses, when checking UI coverage in this repo.

## Variants

- **success** — pervasive (`.toast-gain` local; server-truth coin deltas remote).
- **cancel** — corrupt-save reset flow's `'Hủy'` button.
- **reason** — no literal `reason:` field in the three primary journey files; sibling files carry
  explicit reasons (e.g. `google-link.spec.ts`'s `{ok:false,reason:'conflict'}`,
  `locations.spec.ts`'s `lifePathRequired`) — same grep scope, different file.
- **empty** — keg-empty (local-only) + queue-full (`remote.spec.ts`).
- **persistence** — the dominant variant across nearly every test cited above.
- **capacity** — `remote.spec.ts`'s durable-queue-bound test (`config.network.commandBufferMax`).
- **duplicate/idempotent** — `client-sequence.test.ts`'s process-restart retry test +
  `remote.spec.ts`'s ack-loss retry (no double-charge).
- **stale** — second-tab Web Lock rejection + stale-queue-vs-rotated-account.
- **time-jump** — `game.spec.ts`'s `setSystemTime` +24h tests + `seasons.spec.ts`'s
  `clock.fastForward` past season end.
- **offline-reconnect** — the majority of `remote.spec.ts` (ack-loss, offline-restock,
  closes-beyond-grace, storage-failure, hung-transport, fresh-guest-before-heartbeat).

## Gotchas

- Every viewport/mode `for`-loop in `game.spec.ts` also does a real reload/persistence check inside
  the same test body — the viewport-matrix axis and the reload-persistence axis never appear
  independently in that file, they coincide in all 10 loops.
- `apps/web/README.md`'s phrase list of what `playwright.remote.config.ts` covers maps to 8 of
  `remote.spec.ts`'s 11 tests but doesn't mention 4 that exist today (`a fresh guest visit keeps the
  yard accessible before heartbeat recovery`, the `damage`-loop forensic-recovery test, and the two
  `M1-*` tests) — the README's own "10remote" figure undercounts a direct grep of the file (11); don't
  trust that figure as a coverage ceiling, re-grep before citing a count.
- `game.spec.ts` is entirely local-mode despite testing reload/locale/persistence extensively — it
  never exercises the local↔remote fork itself; that's `remote.spec.ts`'s job alone.
- Two unrelated "lease" concepts share the word in this codebase (location-rental lease vs. server
  presence/session lease) — grepping "lease" without disambiguating conflates them; see Uncovered
  paths above.

## Related

Given this is explicitly the cross-boundary file, it touches nearly every other feature area's UI
surface at least once: [table-lifecycle](table-lifecycle.md), [order-rounds-kitchen](order-rounds-kitchen.md),
[serve-outcomes](serve-outcomes.md), [glass-beer-flat](glass-beer-flat.md),
[economy-k-ledger](economy-k-ledger.md), [save-replay-local](save-replay-local.md) most directly —
plus rush/dog/life-path/shipper/signboard/flyer/seasons/locations/admin areas not yet written as
their own feature files (see the README index).


### A1 — 2026-09-16 proof
- `apps/web/test/local-config.test.ts`: newer bundled config adoption only at next successful opening; running/historical pins, custom/newer versions and replay retained.
- `packages/engine/test/progression.test.ts`: LP1 scaled threshold/four seats without dog; old pinned dog requirement still enforced.
- `apps/web/test/improve-lp1.spec.ts`: production browser guest with real previously earned income migrates LP1, opens next shift, reloads unchanged with no visible dog. Run `npx playwright test --config playwright.improve.config.ts improve-lp1.spec.ts`.

## Changelog

| Date | Change |
|---|---|

| 2026-09-16 A2 | Cite direct HUD full-beer purchase in local and real-server UI; raw empty is distinct from ready/batch reserve. Balance targets remain OPEN in docs/improve-a2-stock.md. |
