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

- `apps/web/test/feedback.spec.ts` — `A4 ${locale} ${mode} advice uses observed losses and survives reload` consumes command-produced saves, migrates to IndexedDB and reloads observed loss evidence. `apps/web/remote-test/feedback.spec.ts` — `A4 real server supplies loss evidence without event history and remote advice survives reconnect` uses DOM commands and the isolated real API, verifies authoritative `menu.losses` without `world.events`, then reloads. Commands: `npx playwright test apps/web/test/feedback.spec.ts`; `TBH_PORT_BASE=4178 npx playwright test --config playwright.remote.config.ts apps/web/remote-test/feedback.spec.ts`.

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

## Changelog — A4
| Date | Change |
|---|---|
| 2026-09-16 | Add current order feedback and rules26 loss evidence regression citations; historical replay remains unchanged. |


### Wave B — 2026-09-16 proof
- Wave B: `packages/engine/test/menu.test.ts` proves five seeded full shifts → exact close-event metrics → encode/decode replay → next-shift preservation. `apps/web/test/menu.spec.ts` verifies actual DOM backup export/reload and empty/partial coverage. `apps/web/remote-test/remote.spec.ts` exercises authoritative report over real API and lost-ack recovery; UI never computes game KPIs.

## Netlify guest build — 2026-09-16

`apps/web/guest-test/guest.spec.ts` → `static guest serves, restocks, upgrades, closes shift and persists across reload/new tab without API`: production guest build on 360×740, 390×844, 1280×720; full service/restock/pause/upgrade/next-day journey, Settings SHA, six close KPIs equal backup, reload/new-tab preservation, admin/online-ranking hidden and zero API/Google requests. Run `npm run build:guest`, copy `apps/web/dist` to `.qa/guest-dist`, then `npx playwright test --config playwright.guest.config.ts`; `TBH_GUEST_URL` targets the verified draft or live URL without a local server. Normal remote/account mechanics are unchanged.

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: a new shop is 1 table × 1 chair, so `apps/web/guest-test/guest.spec.ts` and `apps/web/playable-test/shift.spec.ts` earn **table 2** ("Mua bàn · …") as the first purchase (plan §7 owner line 3) instead of the first equipment level / stall level, and assert the bought tables survive reload and a new tab; the playable flags assert as one object so a red run names the missing step. Whether shift 1 earns the 1.500 xu is S5's balance target. |

## Changelog — S2 instant pour
| Date | Change |
|---|---|
| 2026-10-20 | S2 rules 28 (instant pour): the engine↔web path "order → tray → serve" loses the old 2 s tap wait on a seat-model game (the tray is ready in the tick of the order); driven by `apps/web/test/game.spec.ts` (`tapped order stays live, returns keyboard focus, and closes on customer expiry`), `apps/web/test/first-shift-visual.spec.ts` (guest → check → Serve → wallet), `apps/web/test/instant-pour.spec.ts`, the local↔remote paths `apps/web/remote-test/remote.spec.ts` and `account-ui.spec.ts` (98/98 run serially, the remote config's own `workers: 1`), the guest build `apps/web/guest-test/guest.spec.ts` (3/3, "Mua bàn · 1.500 xu" bought at every viewport) and the real-clock `apps/web/playable-test/shift.spec.ts` (3/3). A loaded rules-27 save keeps its tap until its next opening adopts the seat model (`packages/engine/test/instant-pour.test.ts`). |

## Changelog — S3 capacity demand
| Date | Change |
|---|---|
| 2026-10-20 | S3 `eco21-capacity-demand` (JSON 2.0.22) crosses engine↔web and save (SKILL step 8: the bundle repin of a browser save), and it thins shift 1: one table is offered a guest every ~42 s (a pair every ~84 s, turned away at the door), so ~9–10 guests are served and the wallet at the end of shift 1 is 1.2–2.7 k against table 2's 1 500. **The table-2 step "Mua bàn · 1.500 xu" is DEFERRED to S5 (plan §7 owner line 3 is S5's balance target), do not read it as a regression:** `apps/web/guest-test/guest.spec.ts` is red at that step on 3 of 3 viewports (button dimmed; a never-committed copy of the journey that only skips the purchase passes 3/3: close, six KPIs, reload, new tab, next day, no API; its three runs showed 1 203 / 1 370 / 1 705 coins at the step, one of them could buy); `apps/web/playable-test/shift.spec.ts` is red at 1280×720 only (`upgraded: false`; the failing run's snapshot shows the chip "Mua bàn mới · +1 chỗ 1.500 xu · thiếu 275" with 1 225 coins, `playable-1280-progress.json` 1 249 coins 235 ms before the end) while 390×844 and 360×740 pass with 2 690 and 1 587 coins; `restored`, `restocked`, `washing` and `readyBuffer` are true everywhere. S5 must clear 1 500 on every viewport and on repeated real-clock runs, not on average (DECISIONS `02 · the playable 1280×720 table-2 step is deferred to S5 with the guest step`). New browser case: `apps/web/test/config-pinning.spec.ts` `a browser save pinned to JSON 2.0.21 opens without recovery, then adopts the bundled seed once when its next shift opens` — the real rules-28 save recorded by the S2 engine (`packages/engine/test/fixtures/seat-2.0.21-v28.json`) opens in the app and its next "Mở ca" pins the bundle once (`config_pinned` 2.0.21 → 2.0.22, no `seat_model_adopted`, the recorded history kept). |

## Changelog — S4 table and chair upgrades
| Date | Change |
|---|---|
| 2026-10-20 | S4 `eco21-table-chair-upgrades` (JSON 2.0.23) crosses engine↔web and save (SKILL step 8) and adds no step to the guest or playable journeys. New browser journeys: `apps/web/test/table-upgrades.spec.ts` (an engine-made shop with four pairs of chairs and the life path at LP1 → goal chip → "Nâng cấp" sheet → table level and chair levels, one price and exactly one reason on every dimmed button, the state read back through the engine, reload; vi/en × 390 · 360 · 1280) and `apps/web/test/config-pinning.spec.ts` `a browser save pinned to JSON 2.0.22 keeps its old table cards, then adopts the bundled seed once when its next shift opens and its levels give their perks` (the real rules-28 save recorded by the S3 engine, `packages/engine/test/fixtures/seat-2.0.22-v28.json`: the cards show no perk line and no chair button until the next "Mở ca" pins the bundle once, `config_pinned` 2.0.22 → 2.0.23, the recorded history and the table levels it bought kept; mutation-checked: it fails when the 2.0.23 row of `SEAT_KEYS_ADDED_LATER` loses its `restore`). Local↔remote: `playwright.remote.config.ts` 98/98 serially; the server whitelist lists `upgradeChair` (`apps/server/test/http.test.ts` `every public action refuses injected authority fields before durable command logging`: a valid command is answered 200 and every injected form 400; the test's own cleanup fails EBUSY on Windows exactly as on main, and a scratch copy that ignores only that cleanup passes 1/1). The S3 deferral persists and stays S5's, shift 1 being untouched by S4: `apps/web/guest-test/guest.spec.ts` is 1/3 (390 passes; at 360 and 1280 "Mua bàn · 1.500 xu" is dimmed after shift 1; a never-committed copy of the journey that only makes that purchase optional passes 3/3) and `apps/web/playable-test/shift.spec.ts` is 3/3 this time (coins at the last tick of shift 1: 1 657 / 2 020 / 1 821 at 360 / 390 / 1280 against the 1 500 of table 2, where S3's run of the same spec showed 1 249 at 1280×720 and failed there), so the step is a coin flip between runs, not a regression: S5 must clear 1 500 on every viewport and on repeated real-clock runs, not on average. |

## Changelog — S5 balance pass
| Date | Change |
|---|---|
| 2026-10-20 | S5 `eco21-balance-pass` (JSON 2.1.0) crosses engine↔web, local↔remote and save and touches shift and season (SKILL step 8). **The deferral recorded under S3 and S4 closes:** the first-purchase step of the guest and playable journeys — after shift 1 the Upgrades sheet holds ONE card, "Mua bàn · 1.500 xu", enabled, and buying it adds table 2 — passes at every viewport: `apps/web/guest-test/guest.spec.ts` 3/3 on the tip and 18/18 in six repeats (the browser seeds a new game at random, so repeats are the sample), `apps/web/playable-test/shift.spec.ts` 3/3 in 13.3 min (coins at the last tick of shift 1: 2 469 / 2 923 / 2 169 at 360 / 390 / 1280, `upgraded: true`). What makes it hold is a number, not luck: the wallet starts at 1 750 xu (the evaluator's 60-seed probe: minimum 1 734 after the keg refill and the full beer stock, both service models) and no device level costs less than table 2, because the goal chip (capacity lane first, items within `reachMult` x an average shift) would otherwise show the stall's card on ~13 % of first shifts (`packages/engine/test/sealed-economy.test.ts` last case, evaluator gate `shift1.firstGoal`). New journey: `apps/web/test/rest-first-shifts.spec.ts` (an engine-made save after 1, 2 and 3 closed shifts → rest line and energy bar → "Mở ca" works at once for the first three, refused with its one reason after the third; vi/en × 390 · 360 · 1280). Season: the engine, server and browser suites about "the ranking resets, the contest continues" build a 7 / 14-day calendar themselves (the sealed one is a single 21-day window). Save: a rules-28 history recorded on JSON 2.0.23 by the S4 engine replays byte for byte (`no-cooldown.test.ts`); `apps/web/test/browser-save.spec.ts` runs a five-day career. Remote: `apps/web/remote-test/` 98/98 serially. |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 1 re-seals JSON 2.1.0 for the plan's own bot (SKILL step 8 again: engine↔web, local↔remote, save, shift, season). The first-purchase step of the guest and playable journeys now starts from the S4 wallet of **750 xu** and EARNS table 2 (1 500 xu) in shift 1 on 15 of 60 probes of the evaluator (the P0 row of the gate table is red, DECISIONS `## 04 · P0` and BLOCKERS); the journeys' re-runs on the re-sealed numbers are in the S5 PR (REVIEW round 1). |
| 2026-10-21 | S5 `eco21-balance-pass`, owner-decision round (table 2 = 1 070 xu; this row supersedes the first-purchase numbers of the rows above): after shift 1 the Upgrades sheet holds ONE card, "Mua bàn · 1.070 xu" (it was 1.500 xu), and the owner's criterion is that at least 4 runs in 5 can buy it (83 % over 300 probes of `npm run sim:balance`, 81 % over 600). The guest journey (`apps/web/guest-test/guest.spec.ts`, static build, six repeats of three viewports) and the real-clock playable journey (`apps/web/playable-test/shift.spec.ts`, three viewports) keep that step SOFT because one random game in five misses it: guest 14 of 18 viewport-runs bought table 2 on the code freeze (six repeats; 13 of 18 on the price commit before) and playable 3 of 3 (2 of 3 on the price commit). The red runs fail ONLY at the soft table-2 lines ("P0: table 2 (1.070 xu) must be affordable ..." and "table 2 is bought"); persistence, reload, new tab, account panel, no API call, no console error, restock, washing, ready buffer, summary, overnight and next shift are green in every run. Local e2e, improve, a11y and remote: local e2e 290/290, improve 1/1, a11y 6/6, remote 98/98 (evidence `artifacts/verification/feat-eco21-balance-pass/stage04/r4/`). |
| 2026-10-21 | S6 `eco21-ui-assets` crosses engine↔web only (SKILL step 8: no server, save or season change; JSON 2.1.0 and rules 28 untouched): the quick HUD chair purchase dispatches the real `buyChair` through `dispatch()` mid-shift and the save round-trips (`quick-chair.spec.ts`: reload keeps the chair, the coins, one `buyChair` entry in the log and the shift clock); the yard reads `trayDishes` / `chairLevel` from the same world the engine serves (`yard.spec.ts`, fixtures from the real engine). The guest (`guest-test/guest.spec.ts`) and playable (`playable-test/shift.spec.ts`) journeys run unchanged on the new yard; their soft table-2 step keeps the S5 owner-decision caveat (about one random game in five misses it). |
| 2026-10-22 | Wave 3 `fun-kick-table` crosses engine↔web (local mode: the popover reads `kickTableQuote` and dispatches the real `kickTable`), local↔remote (the server whitelist and the store path) and save (a new section under the kept label 2.1.0). Journeys: `apps/web/test/kick-table.spec.ts` `Wave 3 Mời về on a lingering table shows its coins and reputation, one tap sends it home and the waiting group sits down (${locale}) at ${viewport.width}px` (engine-made save → popover → one tap → the save read back through the engine: one `kickTable`, coins and reputation once, the table cleaning, the waiting group seated after `tableCleaningMs`, `page.reload()` keeps the one command) and `Wave 3 a save pinned to the S6 content of JSON 2.1.0 (no kickTable section) offers no Mời về in the shift it is pinned for` (a save pinned to the S6 content of 2.1.0 keeps its pin and shows no "Mời về"; cited by its name since PR #32 split the `Wave 3 ${why}` loop); server: `apps/server/test/kick-table.test.ts` (once per key, survives a store reopen); save: `packages/engine/test/kick-table.test.ts` `a rules-28 history recorded on JSON 2.1.0 by the S6 engine replays byte for byte ...`. No step was added to the guest or playable journeys (shift 1 shows no "Mời về": it is revealed with the HUD); both journeys are re-run. |
| 2026-10-22 | Stage 07, review round 1: engine↔web across a config adoption (local mode) — the screen asks `restRequired` of the snapshot `dispatch` will open the shift with (`openingConfig`), not of the pin: `apps/web/test/rest-first-shifts.spec.ts` `D8 across a config adoption: a save pinned to JSON 2.0.4 after one shift is shown ready and opens at once, at ${viewport.width}px` (a 2.0.4 save after one shift is shown ready and "Mở ca" opens at once; the next opening adopts 2.1.0). The yard layout of the busy alley: `apps/web/test/yard.spec.ts` `S6 a busy alley: the order bubbles of every row cover no other table's caption or drawing, at ${viewport.width}px`. Evidence `artifacts/verification/feat-economy-2-1/stage07/`. |
| 2026-10-22 | Owner calls of PR #30 (stage 07b): engine↔web across the label bump 2.1.0 → 2.1.1 — a browser save pinned to the S6 content of 2.1.0 opens its next shift on the bundled 2.1.1 and with it `kickTable` (`apps/web/test/kick-table.spec.ts` `Wave 3 a save pinned to the S6 content of JSON 2.1.0 adopts the bundled 2.1.1 at its next Mở ca, and with it Mời về at the founder's price`, read back through the engine); local↔remote — a server database that registered a 2.1.0 content restarts on the 2.1.1 bundle and keeps serving its published version (`apps/server/test/kick-table.test.ts`, in `npm test`). |
| 2026-10-23 | Part B1 (JSON 2.1.4; founder 2026-10-22, B1.1 as amended 2026-10-23, QD-117) crosses engine↔web (the cooler badge's ∞ and the sheet's `cooler.firstShift` line read the engine's `freshnessMs()` / `noFlatBeerShift()`), save (a browser save adopts 2.1.4 at its next opening: `apps/web/test/kick-table.spec.ts` `Wave 3 a save pinned to the S6 content of JSON 2.1.0 adopts the bundled 2.1.4 at its next Mở ca, and with it Mời về at the founder's price`) and shift play (singles in shifts 1-3, the rush re-plan). Journeys driven: the guest smoke on a local static build (`apps/web/guest-test/guest.spec.ts`, 3 viewports), the playable tier with real dev servers (`apps/web/playable-test/shift.spec.ts` `default guest full shift`, 3 viewports), and `apps/web/test/economy2.spec.ts` `JSON 2.1.4 in shift 1 of a new save beer never goes flat: the cooler badge reads ∞ and its sheet says so, above the level's own seconds for the later shifts (founder 2026-10-22)`. Results and logs: the B1 PR body §7 (`autopilot-logs/b1r-*.log`). |
