# Shift lifecycle (03-SPEC-he-ban.md §8 "Edge cases & quy tắc"; runtime-rules-v4 manual-close)

## `phase` has three values and three ways into `'closing'`

`World.phase: 'resting' | 'open' | 'closing'` (`types.ts:72`) — no `'prepare'`/`'wash'` literal value
exists despite the plan doc's shorthand ("prepare/wash/rush/close"): prep/wash are autonomous
*pipelines* (kitchen/production, already covered by [order-rounds-kitchen](order-rounds-kitchen.md)
and [glass-beer-flat](glass-beer-flat.md)), not `phase` states. A fresh `Game` starts
`phase:'resting'` (`engine.ts:60`).

`'open'` → `'closing'` happens three separate ways, not one:
1. **Player-initiated** — `{type:'endShift'}` (`engine.ts:825-826`), unconditional once
   `phase==='open'`, emits a plain `shift_closing` (no payload).
2. **Natural timeout** — `w.now >= s.endsAt` while `phase==='open'`, checked at two tick sites
   (`engine.ts:354`, `:357`), same plain `shift_closing` emit.
3. **Disconnection-triggered** — `engine.ts:185`, fires only from the connection-loss path while
   `phase==='open'`, and is the **only** call site that attaches a payload: `{reason:'disconnected'}`.
   Grep-confirmed: no test anywhere asserts this reason (see Uncovered paths).

`'closing'` → `'resting'` is a single gate (`engine.ts:425-436`): no pending delivery, empty queue,
every table in `{'empty','cleaning','broken'}`. That transition also stamps `w.restStartedAt = w.now`
(`:429`) — the wall-clock anchor [stamina-attendance-lifepath](stamina-attendance-lifepath.md)'s
well-rested check reads back at the *next* `startShift` (`engine.ts:805`) — increments
`w.dayShifts[day]` (`:431`) and `w.completedShifts` (`:426`), then emits `shift_closed` (`:436`) and,
via `menuReport`, `menu_mix_summary` (see [restock-inventory-menu](restock-inventory-menu.md) for that
report's own contract).

## Observable contract

- `World.phase` (`types.ts:72`, above). `World.active: boolean`, `World.paused?: boolean` — both feed
  the same freeze, `gameplayPaused()` (`engine.ts:190-192`): `(!active || !!paused) && rulesVersion
  !== 1 && !disconnection?.timedOut`. `active:false` (hidden/offline) is this file's half;
  `paused:true` (menu-pause) belongs to [restock-inventory-menu](restock-inventory-menu.md) — same
  freeze, two different triggers, don't conflate them.
- `World.staminaMs`/`staminaAnchorMs`/`staminaAnchorAt` (`types.ts`): counts down to 0 across an
  `'open'` shift (`= endsAt - now`, `engine.ts:211`), regenerates only while `phase==='resting' &&
  active` (`:212`, rate `c.shift.regenRate`). Gates `startShift`'s `'restFirst'` failure
  (`c.shift.openRequiresFullStamina`) — distinct from the well-rested *bonus* check, which reads the
  wall-clock `restStartedAt`, not the stamina level; see
  [stamina-attendance-lifepath](stamina-attendance-lifepath.md) for that formula. **S5 (rules 28, JSON 2.1.0):**
  the first `shift.noCooldownFirstShifts` (3) shifts of a save's whole life skip that gate — `restRequired` /
  `noCooldownOpening` in `rules.ts`, read from the snapshot that opens the shift; the opening sets stamina to full
  — so shifts 2 and 3 open the moment the previous one has closed and shift 4 answers `'restFirst'` until the 30
  minutes have passed. The per-day cap `dailyShiftCap` still applies. Proof: `packages/engine/test/no-cooldown.test.ts`
  (engine) and `apps/web/test/rest-first-shifts.spec.ts` (the rest line and the energy bar).
- `World.restStartedAt: number` (`types.ts:77`) — stamped at Game creation and at every
  closing→resting transition (`engine.ts:429`).
- `World.dayShifts: Record<string, number>` — incremented once per completed shift, keyed by
  VN-midnight day (`engine.ts:431`, `dayKey()`).
- Events: `shift_opened` (`:819`), `weather_rolled` (`:819`, cross-link
  [rush-weather](rush-weather.md)), `rush_scheduled` (`:820`, cross-link rush-weather),
  `well_rested_started` (`:821`, cross-link stamina-attendance-lifepath), `beer_initial_fill`
  (`:817`, cross-link [keg-refill](keg-refill.md)), `config_pinned` (`:809`, mid-open config swap —
  not this file's concern), `shift_closing` (three sites above), `shift_closed` (`:436`),
  `menu_mix_summary` (via `menuReport`, cross-link restock-inventory-menu).
- `Result` fail reasons — `startShift`: `'shiftRunning'`, `'configSeasonTiers'`,
  `'configLocationMissing'`, `'restFirst'`, `'configClock'`, `'dailyShiftCap'`, `'dailyEarnCap'`
  (rules1 only), `'configOnboardingTables'`, `'rushScheduleUnavailable'`. `endShift`: `'noShift'`.
  `kickAll`: `'noShift'`, `'deliveryPending'` (cross-link
  [spawn-queue-seating](spawn-queue-seating.md)'s shipper lane).
- DOM/aria: manual-close flow — `'Sổ ca'` nav → `'Mời tất cả về · {cost} xu'` → confirm `'Trả {cost}
  xu và đóng ca'` or defer `'Đợi khách dùng xong'` — already documented by
  [table-lifecycle](table-lifecycle.md); cross-link rather than restate.

## How to reach it

- `{type:'startShift'}` (`engine.ts:769-822`) — the largest handler in the file: gates season tiers,
  location, full-stamina requirement, daily shift/earn caps, onboarding-table fit, plans rushes via
  `planRushes()` (cross-link rush-weather); on success stamps `phase='open'`, seeds `w.shift`, and
  fires the whole `shift_opened`/`weather_rolled`/`rush_scheduled`/`well_rested_started`/
  `beer_initial_fill` cluster above.
- `{type:'endShift'}` (`:825-826`) — only requires `phase==='open'`.
- `{type:'kickAll', shiftId?, maxCost?}` (`:827+`) — quoted via `kickAllQuote` (`rules.ts:92-100`),
  gated on `c.shift.kickAllAllowed` and no pending delivery.
- `{type:'activity', active, paused?}` (`:761-767`) — sets `active`/`paused`, unconditionally resets
  the stamina anchor every call (`staminaAnchorAt=now, staminaAnchorMs=staminaMs`), and — only when
  `cmd.active` is truthy — re-triggers `ensureDailyQuests()`/`observeAttendance(true)`. Not a pure
  visibility flag; know the side effect before assuming otherwise.
- No command drives `'closing'→'resting'` directly — it's autonomous, gated on
  table/queue/delivery being clear (`processDue()`, `engine.ts:425`).
- UI: `'Mở ca'` → `startShift` (the old `'Vào quán'` language screen is gone); `'Sổ ca'` sheet → `endShift`/`kickAll` (exact button
  chain documented in table-lifecycle.md). Hidden/offline: `document.visibilitychange` →
  `syncActivity()` (`App.tsx:177-181`).
- **Corrected claim**: hidden/offline is **not** identical in both runtime modes, and `activity` does
  **not** go over `POST /player/command` in remote mode like `startShift`/`endShift`/`kickAll` do.
  Local mode calls `run({type:'activity', active, paused: active && paused})` — the normal command
  path. Remote mode calls `remote.setPresence(active, paused)` instead (`remote.ts:228-230`), a pure
  client-side state update — `RemoteGame.command()` itself explicitly refuses `activity`
  (`remote.ts:256`: `if (command.type === 'activity' || ...) return {ok:false, reason: this.state}`),
  and if one somehow reached the server, `store.ts:631` rejects it with `error:'presenceManaged'`. The
  server instead learns `active`/`paused` from the **heartbeat** payload (`POST /player/heartbeat`,
  `remote.ts:275`), not from a command result — see
  [restock-inventory-menu](restock-inventory-menu.md) for the same correction and
  `apps/server/test/presence.test.ts` for the actual remote mechanism's own tests. Every *other*
  command in this file genuinely is identical over `POST /player/command` in both modes; only
  `activity` diverges, and the server holds no separate shift-phase logic for those —
  `http.ts` calls straight into `@tbh/engine`.

## Existing proof

- **Founder 2026-10-22, Part B2.5 (a shorter shift book).** `apps/web/test/shift-book.spec.ts` `` `B2.5 the shift book opens on the net and its one suggestion, then three counts that add up to the reasons, the rest under Chi tiết, collapsed (${locale}) at ${viewport.width}px` `` (vi/en × 390/360/1280 on the `buy-reasons.ts book` save: order net · suggestion · counts, then the actions, then `.book-details`; net = credited − penalty − spent; counts = served, lost − queue leavers, rejected + queue leavers, on the sheet's first screen; details closed, its summary ≥ 44 px, the dish table and the reasons hidden until it opens; the reasons then sum to the two loss counts; no row for a locked dish; the money rows under `.ledger-money`; axe 0 closed and open). Specs that read the details now open them first (`bookDetails`): `game.spec.ts`, `buy-reasons.spec.ts`, `menu.spec.ts`, `locations.spec.ts`, `remote-test/remote.spec.ts`, `guest-test/guest.spec.ts`.

- `packages/engine/test/daykey-formatter.test.ts` — all 3 (entirely this file's; the VN-midnight
  day boundary every rollover in this feature keys on): `'dayKey reuses one formatter per timezone
  instead of constructing one per call'` (pins the `Intl.DateTimeFormat` construction count at <= 1
  across ~1050 calls — the v6-sim-career-memory leak: each formatter owns native ICU memory that
  `heapUsed` never counts), `'the cached formatter yields exactly what a fresh formatter yields'`
  (including one millisecond either side of VN midnight and `nextDayAt` landing exactly on it),
  `'a different timezone gets its own cached formatter and never leaks into the first'`. Run
  `node --import tsx --test packages/engine/test/daykey-formatter.test.ts`.
- `packages/engine/test/rush-clock.test.ts` — all 9 (entirely this file's: the shift-local rush
  countdown intersects `endShift`/closing timing, not rush *scheduling*): `'warning fires exactly
  once at the configured boundary and active rush has its own remaining clock'`, `'closing ends the
  current rush on time, prices the boundary serve normally and never starts a later rush'`, `'hidden
  time moves warning/start/end deadlines and never repeats an already shown warning'`, `'manual
  finalization ends an active rush once and rest never advertises a future rush'`, `'tiny and large
  advances preserve all warning and closing-rush event timestamps'`, `'real v4 closing rush replay
  preserves old earnings, then a same-timestamp current command synchronizes the clock'`, `'zero
  warnings or zero scheduled slots disable their events, while fractional time and counts fail
  closed'`, `'stopping arrivals before the first warning cancels upcoming rush activation without
  pausing service'`, `'closing binds the original slot even when a configured later rush has the same
  kind and overlaps it'`.
- `packages/engine/test/manual-close.test.ts` — [table-lifecycle](table-lifecycle.md) already cites
  these 8 for the table/order-state angle; the same tests double as this file's `kickAll`/phase proof,
  especially `'manual close charges every assigned order once, including consuming guests, without
  abandonment penalties'` (fee applies without force-resolving tables), `'quoting unassigned queue and
  seating guests is pure, costs zero and never invents orders'` (`kickAllQuote` has no side effect),
  `'insufficient funds and invalid or stale confirmation fail before debiting or dismissing guests'`
  (a failed `kickAll` leaves `phase` untouched).
- `packages/engine/test/game.test.ts:207` — `'daily cap permits another available shift, with zero
  credited earnings'` (`dailyShiftCap`/`dailyEarnCap` gates on `startShift`).
  `packages/engine/test/game.test.ts:289` (assertions at `:304-305`) — `'Vietnam midnight resets each
  earn bucket while shift count belongs to its closing day'` — asserts
  `g.world.dayShifts['2026-09-09']===1`, the closing-day stamp this file owns, as opposed to the
  earn-bucket amounts [economy-k-ledger](economy-k-ledger.md) owns.
- `apps/web/playable-test/shift.spec.ts` — `'default guest full shift'` (real-time, real-server
  `startShift`→timeout-`endShift` loop; [multi-system-journeys](multi-system-journeys.md) cites the
  same test for its reload/new-tab-continuity angle — this file cites it for the shift-clock golden
  path itself).
- `apps/web/test/game.spec.ts` — `` `rush warning pauses in sheets, resumes on closing, active timer
  wins, and closing ends it at ${viewport.width}×${viewport.height}` `` (×N viewports) — the
  hidden/offline (`active:false`) freeze intersecting the shift's own rush-clock UI.

## Verification procedure

- `node --import tsx --test packages/engine/test/rush-clock.test.ts
  packages/engine/test/manual-close.test.ts packages/engine/test/game.test.ts` (or `npm test` for the
  full suite — bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/game.spec.ts` (or `npm run test:e2e`); `npx playwright test
  --config playwright.playable.config.ts apps/web/playable-test/shift.spec.ts` for the real-time,
  real-server golden path.
- `npm run check:config` before touching `shift.durationMs`, `shift.regenRate`,
  `shift.dailyShiftCap`, `shift.kickAllAllowed`, `shift.openRequiresFullStamina`, `shift.wellRested`
  in `docs/config/economy.tbh.json`.

## Uncovered paths

- **The disconnection-triggered `shift_closing` payload (`{reason:'disconnected'}`, `engine.ts:185`)
  is never asserted by any test** — grep-confirmed zero hits combining `reason` and `disconnected`
  against a `shift_closing` assertion anywhere under `packages/engine/test`. `disconnection.test.ts`
  (28 cases) exercises the connection-loss state machine itself but not this specific event-payload
  shape; that file is out of this slice's scope (future `remote-session-outbox`), so it's flagged
  here as unproven, not claimed as someone else's covered ground.
- **No test compares all three `'closing'`-entry paths side by side** — `endShift` and
  natural-timeout are each exercised (tests above), but nothing asserts they converge on the same
  `phase` value via the same downstream code path.
- **`activity`'s side effect of re-arming `ensureDailyQuests()`/`observeAttendance(true)` on
  `active:true` has no isolating test** — every existing activity/pause test asserts the freeze
  itself (timers/coins unchanged); none specifically asserts a quest/attendance re-check fires on the
  `false→true` edge.
- **`c.shift.kickAllAllowed === false` is never exercised** — every `kickAll` test assumes the
  default `true`; no test sets it `false` and asserts `reason:'noShift'`.

## Variants

- **success** — `startShift`→…→`endShift`/timeout→`'resting'` in `shift.spec.ts`'s golden path.
- **cancel** — `kickAll`'s "wait" deferral (`manual-close.test.ts`'s insufficient-funds test keeps the
  guest instead of forcing dismissal).
- **reason** — `'shiftRunning'`, `'restFirst'`, `'dailyShiftCap'`, `'noShift'`, `'deliveryPending'`
  all proved above; `'configClock'`/`'configOnboardingTables'`/`'rushScheduleUnavailable'` are
  config-edge gates not directly exercised by the files cited in this pass (may be covered under
  `config-pinning.test.ts`, not verified here).
- **empty** — a shift with zero tables ever occupied still reaches `'closing'→'resting'` on
  `endShift` immediately (the `every(...)` gate is vacuously true); no dedicated test.
- **persistence** — `rush-clock.test.ts`'s real-v4-replay test round-trips `phase`/rush state through
  save/replay.
- **capacity** — not applicable to `phase` itself.
- **duplicate/idempotent** — a repeated `endShift` on an already-`'closing'` shift returns
  `fail('noShift')` (phase guard); not exercised by name in the files cited here.
- **stale** — not applicable.
- **time-jump** — `rush-clock.test.ts`'s hidden-time and tiny/large-advance tests drive the full
  closing/resting sequence under both fine and coarse stepping.
- **offline-reconnect** — the disconnection-triggered `'closing'` path exists but is unproven (see
  Uncovered paths above); the actual timer-freeze mechanism (`shiftPauseTimers`, shared with every
  other feature's deadlines) is proved cross-feature in
  [multi-system-journeys](multi-system-journeys.md).

## Gotchas

- The plan doc's shorthand "prepare/wash/rush/close" does **not** map to `phase` literal values —
  `phase` only has `'resting'|'open'|'closing'`; prep/wash are separate autonomous pipelines.
- `activity`'s `active` and `paused` are two independent booleans feeding the same
  `gameplayPaused()` freeze (`engine.ts:190-192`) — a fix that touches one can look like it solved a
  freeze bug the other flag is actually causing. Check both.
- `endShift` (free, lets `'waiting'` tables finish naturally) and `kickAll` (paid, immediate) are
  opposite-philosophy operations that both move `phase` to `'closing'` — already documented in
  [table-lifecycle](table-lifecycle.md)'s Gotchas; it applies to `phase` too, don't re-derive it.
- Stamina counting down during `'open'` is just "time left in the shift" (`endsAt - now`), not an
  activity-consumption meter — don't confuse it with the well-rested wall-clock check, which reads
  `restStartedAt` instead of the stamina level.

## Related

[table-lifecycle](table-lifecycle.md) (manual-close UI chain, `kickAll`'s table-side effects),
[rush-weather](rush-weather.md) (rush *scheduling*/`planRushes` at `startShift`, vs. this file's
shift-local rush *countdown*), [stamina-attendance-lifepath](stamina-attendance-lifepath.md) (the
well-rested bonus formula and stamina thresholds this file only gates/stamps),
[restock-inventory-menu](restock-inventory-menu.md) (the `paused` half of `gameplayPaused()`),
[keg-refill](keg-refill.md) (`beer_initial_fill` at shift-open),
[multi-system-journeys](multi-system-journeys.md) (the shared `shiftPauseTimers` freeze across every
subsystem's deadlines).


### Wave B — 2026-09-16 proof
- `packages/engine/test/menu.test.ts` — 'five production seeds export exact six shift KPIs matching service records and deterministic replay' verifies one final metrics snapshot per completed shift and immutable prior close events after next opening; 'genuine rules26 close events remain byte-equivalent before adding rules27 metrics on a new shift' pins historical compatibility.

### S5 `eco21-balance-pass` — 2026-10-20 proof
- `packages/engine/test/no-cooldown.test.ts` — the first-shifts allowance (9 tests; the replay of a history recorded on JSON 2.0.23 by the S4 engine stays byte for byte; mutations 8/8 killed + 1 equivalent). `packages/engine/test/locations.test.ts` and `packages/engine/test/well-rested.test.ts` call `fixtures/full-cooldown.ts` when the full-stamina opening is their subject.
- `apps/web/test/rest-first-shifts.spec.ts` — `D8 shifts 2 and 3 open at once and shift 4 waits` and `D8 after the third shift the 30 minutes apply and the opening is refused until they pass`, vi + en at 360 / 390 / 1280 (DOM only; saves from the real engine through `fixtures/first-shifts.ts`).
- **Review 07 r1 (2026-10-22, stage 07):** the rest line and the energy bar ask `restRequired` of the snapshot the next opening will use (`apps/web/src/local.ts` `openingConfig`: the bundle when the pin is older, the same rule `dispatch` applies), so a save pinned to an older content in its first three shifts is shown ready, as the engine opens it: `apps/web/test/rest-first-shifts.spec.ts` `D8 across a config adoption: a save pinned to JSON 2.0.4 after one shift is shown ready and opens at once, at ${viewport.width}px` (fixture `first-shifts.ts 1 legacy`, one shift played on the 2.0.4 capacity seed; red before the fix: bar 0 %, "rest until").
- **Review 07 r1 (2026-10-22, stage 07), the rest screen:** between shifts the "Mở ca" of the rest note stays on screen above the bottom nav at every viewport of the tiers (the note hangs from the top of the yard instead of being centred in it): `apps/web/test/yard.spec.ts` `S6 at rest the opening note's start button is whole on screen above the bottom nav (${locale}) at ${viewport.width}px`. The nav's own "Mở ca" is unchanged.
- **Founder 2026-10-22 (A3, JSON 2.1.3), the rest screen:** while the bottom nav is shown the rest note carries no "Mở ca" of its own: the nav's is the one button, whole on screen and in the thumb zone — `apps/web/test/yard.spec.ts` `A3 at rest exactly one Mở ca is on screen, the bottom nav's: whole, uncovered and in the thumb zone, and the opening note points at it (${locale}) at ${viewport.width}px` replaces the test the bullet above cites (kept as history); a pin that still hides the nav keeps the note's button (`first-shift-visual.spec.ts` `A3 a save pinned to 2.1.1 …`).
