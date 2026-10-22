# Rush schedule & weather (`docs/features/F08-rush-system.md`; `F09-weather.md`; `docs/config/economy.tbh.json` `rush`/`weather` blocks)

Two spec-vs-code naming drifts worth knowing before grepping for either mechanic:

- F08's analytics list names `rush_warning_seen {secondsBefore}` (§7); the shipped event is
  `rush_warning` (`engine.ts:289`) — grep-confirmed zero hits for `rush_warning_seen` anywhere
  outside the spec doc itself. Cite `rush_warning`.
- F09's data model names `beerFreshnessMult`/`shipperSpawnMult` (§2); the real config fields
  (`docs/config/economy.tbh.json`'s `weather.*` blocks) are `freshnessMult`/`shipperMult`. Code is
  ground truth, same pattern other feature files in this map already flag for their own areas.

## Observable contract

- `Shift.rushes: {kind:'light'|'heavy', start, end}[]` — the seeded schedule, set once at
  `startShift` from `planRushes()`'s return shape (`rush.ts:6`). `Shift.rush: 'none'|'light'|'heavy'`
  (currently-active kind), `Shift.rushUntil`, `Shift.rushScheduleSeed` (types.ts).
- `rushStatus(w, c)` (`rules.ts:10`) → `{active: {kind, remainingMs} | null, next: {kind,
  remainingMs, warning: boolean} | null}`. Projects the **current** rush first; `next` is only
  populated while `phase==='open'` (no upcoming-rush advertising once closing/resting — matches F08
  §6's HUD rule verbatim). `next.warning` flips true once `next.start - now <= schedule.warningMs`.
- Events: `rush_scheduled` (`engine.ts:820`, once per slot at `startShift`, `{shiftId, slot, seed,
  kind, startsAt, duration}`), `rush_started`/`rush_ended` (`:283`/`:279`), `rush_warning` (`:289`,
  `{kind, startsAt, remainingMs, slot}`), `weather_rolled` (`:819`, `{weather}` — part of the same
  `startShift` event bundle already documented by [shift-lifecycle](shift-lifecycle.md), cross-link
  rather than restate the whole bundle here).
- Config: `rush.schedule.{perShift, seed, noRushFirstMs, warningMs, heavyFromLifePath}`;
  `rush.{light,heavy}.{durationMs, spawnIntervalMult, floorMs, paymentMult, tipMult,
  leavePenaltyMult, voiWeightMult}` plus heavy-only `enjoyMult`; `weather.{sunny,hot,humid,rain,cold}
  .{weight, freshnessMult, patienceMult, tipMult, spawnIntervalMult, shipperMult,
  customerWeightMult}`. `rush.none`/`rush.peak` also exist in config (a P0 normal/peak-toggle
  leftover per F08 §1) but `planRushes()` never schedules either kind — see Uncovered paths.
- `voiWeightMult` (rush-only) and `customerWeightMult` (weather-only) both bias the customer-type
  spawn roll toward specific types — same weighted-pick call site, `engine.ts:549` (spawn) mirrors
  `config.ts:291` (validation-time pre-check): rush biases `'voi'` only; weather's
  `customerWeightMult` biases per-type (`humid`→`chipheo×1.5`, `rain`→`ngoily×2.0` in
  `economy.tbh.json`, matching F09 §3 exactly — no drift on these two numbers).
- DOM/aria: `.rush-label` HUD element, `.is-warning`/`.is-active` state classes, a `<time>` child for
  the countdown text; screen-reader `role="status"` text `'Chuẩn bị đón Giờ Vàng.'` fires on warning;
  the shift-book table `aria-label="Giờ Vàng trong ca"` (VI) / `"Rush results this shift"` (EN)
  renders `summarizeRush()`'s `served/lost/revenue` columns directly from the `rush_ended` payload.

## How to reach it

- No player command — fully autonomous. `startShift` (`engine.ts:784`, gated
  `rulesVersion >= RUSH_SCHEDULE_RULES` [=8]) calls `planRushes(config, locationId, shiftId, day,
  now, lifePath-or-Infinity)`. A `null` return (the schedule can't fit inside `shift.durationMs`)
  fails the **whole** `startShift` command closed with `reason:'rushScheduleUnavailable'` (`:785`) —
  before any state or RNG mutation. Weather is rolled in the same block (`:794`,
  `weighted(w, WEATHER.map(k => [k, c.weather[k].weight]))`, `weighted()` itself in `rng.ts:12`), and
  both fire their opening events together (`:819-820`).
- `planRushes()` uses an **independent** seeded RNG (`seededRng(JSON.stringify([locationId, shiftId,
  day]))`, `rush.ts:8,16`) so changing the rush layout can never consume a customer-spawn RNG roll —
  the layout is fully determined by that exact tuple, re-derivable without replaying commands.
- Per-tick transition into/out of a scheduled window is `updateRush()` under the `RUSH_CLOCK_RULES`
  gate (see [shift-lifecycle](shift-lifecycle.md) for the exact tick mechanics and the legacy
  pre-gate inline branch at `engine.ts:357-361`) — it fires `rush_warning`/`rush_started`/
  `rush_ended` by walking `s.rushes` against `w.now`. **This file owns the schedule** (what windows
  exist, `rush-schedule.test.ts`); shift-lifecycle owns the **countdown clock** itself
  (`rush-clock.test.ts`) — cross-link, don't re-derive either side from here.
- `flyer_ended` (`engine.ts:322`) also calls `summarizeRush()`, for its own campaign window — a
  shared aggregator function, not a rush event; see [flyer-signboard-dog](flyer-signboard-dog.md).
- UI: nothing to tap — the HUD is a pure read of `rushStatus()`/`w.shift.weather` every render.

## Existing proof

- `packages/engine/test/rush-schedule.test.ts` — all 8 (entirely this file's):
  `'seed tuple produces varied balanced schedules with complete durations and warning gaps'`
  (determinism + replay-shift-invariance across 500 layout cases, light/heavy balance within 1),
  `'an impossible or unbounded schedule refuses opening before any state or RNG mutation'`
  (`rushScheduleUnavailable` fail-closed, `assert.deepEqual(g.world, before)`), `'genuine active v7
  schedule and identifiers survive a same-time v8 command without retroactive reports'` (legacy
  replay fixture, no retroactive `rush_scheduled`), `'rush report owns actual capped receipts and
  excludes a serve at its exact end'` (a `rush_ended` report only counts events strictly inside
  `[start,end)` — a serve at the exact end boundary and unrelated `shipper_completed`/`coin_gain`/
  `life_path_reward_claimed` events are excluded from `summarizeRush`), `'expiry mirrors are counted
  once and zero-service reports have a finite stale rate'` (`staleRate` is `0`, not `NaN`, at
  `served===0`), `'hidden time and early finalization retain slot identity and emit one actual end
  report'` (pause/resume preserves `eventStart`/remaining time; `kickAll` ends the active rush report
  exactly once), `'large and small advances retain identical schedule warnings, summaries and later
  customer events'` (fine-vs-coarse `advance()` stepping produces byte-identical worlds), `'heavy
  arrival captures the configured enjoyment multiplier without changing earlier guests'`
  (`enjoyMult` only applies to customers arriving inside the heavy window, not retroactively).
- `packages/engine/sim/rush-pressure.ts` (`npm run sim:rush`) — 5 seeds × `{none, light, heavy}`
  controlled **sunny-only** pulses (all other weather weights zeroed) at each rush's canonical
  duration, with a restock+serve bot. Asserts the spawn floor (`rush[kind].floorMs`) and the
  player-serve ceiling (`spawn.playerServeCeilingPerSec`) are never violated, that every kind's
  `rush_ended` report matches an independently recomputed `summarizeRush()`, and that demand/loss
  strictly increase `none < light < heavy` across every seed. Per
  [economy-k-ledger](economy-k-ledger.md)'s existing note, this sim does **not** check `k` — it's
  timing/pressure proof only.
- `apps/web/test/game.spec.ts` — `'an overlapping upcoming rush cannot interrupt the active-rush HUD
  with a screen-reader warning'` (fixture `apps/web/test/fixtures/rush.ts overlap` mode: with a
  second slot scheduled close behind the active one, the HUD keeps showing the **active** rush and
  its live countdown, and the upcoming-warning `role="status"` announcement stays suppressed) — this
  is the schedule-overlap proof; the sibling test in the same file (`` `rush warning pauses in
  sheets, resumes on closing, active timer wins, and closing ends it at
  ${viewport.width}×${viewport.height}` ``) is already cited by
  [shift-lifecycle](shift-lifecycle.md) for the countdown-display angle — cross-link, not restated
  here.
- **Founder 2026-10-22, Part B1.2 (JSON 2.1.4, `rush.schedule.replanPendingArrival`): a rush opens with guests.** `packages/engine/test/early-pacing.test.ts` — `B1.2 reproduced on a 2.1.3 pin: the arrival planned before the first rush keeps its timer when the rush starts, so the rush can open with a long wait (shift-205 of 22/10)` (the hypothesis confirmed: `nextSpawnAt` is untouched by `rush_started` without the key) and `B1.2 with the key a rush start re-plans the pending arrival to min(remaining, one guest's gap at the rush pace), and the rush end to min(remaining, the normal gap)` (the first rush guest comes to the door one gap after the start; the history replays). Per-rush arrivals / serves / losses at one table: `packages/engine/sim/early-pacing.ts` (information).

## Verification procedure

- `node --import tsx --test packages/engine/test/rush-schedule.test.ts` (or `npm test` for the full
  suite — bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npm run sim:rush` — part of `npm run verify`'s chain.
- `npx playwright test apps/web/test/game.spec.ts` (or `npm run test:e2e`) for the overlap-HUD test.
- `npm run check:config` before touching any `rush.*`/`weather.*` value — `config.ts`'s `validate()`
  enforces `rush.{light,heavy,lunch_light}.durationMs > 0` and rejects an unrepresentable schedule
  shape before either sim or sandbox play would surface it.

## Uncovered paths

- **`lunch_light`/`football` are structurally unreachable by the real scheduler.** Both are full
  members of the `Rush` type union (`config.ts:11`) and match F08 §3's table; `lunch_light` even gets
  partial config validation (`config.ts:155`'s durationMs loop includes it, `football` does not). But
  `planRushes()`'s scheduling pool is hardcoded `const pool: ('light'|'heavy')[] = ...` (`rush.ts:17`)
  — neither kind can ever be selected, regardless of config. `arrival-interval.test.ts:40`'s
  `{none, peak, light, heavy, lunch_light, football}` floor-value table is a config-shape check only
  (asserts the numbers exist and validate), not scheduling proof — don't cite it as evidence either
  kind runs. F08's priority rule ("inspection/gangster modal > football > heavy > light > none",
  §5) is spec-only; none of those higher-priority sources exist in code.
- **`voiWeightMult`'s effect on the actual spawn roll is never asserted.** `engine.ts:549` reads it
  during a rush to bias `'voi'` customer-type selection; the only test touching this field
  (`signboard.test.ts:118`) sets an unrelated signboard-style override to `0`, not the rush spawn
  bias. No `rush-schedule.test.ts`/`arrival-interval.test.ts` test samples the spawn mix during an
  active rush to confirm `'voi'` groups actually appear more often.
- **The weather roll's own distribution fairness (F09 §8's "10,000-roll deviation < 5 points from
  configured weight") has no matching test.** `arrival-interval.test.ts` deliberately **forces** a
  single weather to weight `1` (all others `0`, via its `snapshot(weather)` helper) specifically to
  isolate arrival-cadence math from the roll's randomness — the opposite of testing the roll itself.
  Grep confirms no engine test file exercises `weighted()` (`rng.ts:12`) for a distribution-fairness
  property on the weather table.
- **Corrected claim**: `arrival-interval.test.ts:39`'s `'fast-weather rush groups retain hard floors
  and round once after the per-customer size factor'` DOES combine hot weather
  (`weather.hot.spawnIntervalMult = 0.01`) with an active rush (hand-sets `world.shift.rushes` for
  every non-`'none'` kind) — "no test combines them" was wrong. What's still genuinely uncovered:
  that test's `expected` table (`light:1000`, `heavy:700`, …) is exactly each kind's raw
  `rush.<kind>.floorMs` (config-verified against `docs/config/economy.tbh.json`) — the forced `0.01`
  weather mult crushes the raw `baseMs × weather.mult × rush.mult` product far below any real floor,
  so `Math.max(interval, rush.floorMs)` (`config.ts:21`) always returns the floor verbatim. This
  proves the **hard floor** holds under extreme weather. **Second correction**: the *moderate*-stacking
  case IS covered elsewhere in the same file — `arrival-interval.test.ts:34`'s sibling test
  (`'ordinary baseline floor and multiplier remain configurable without weakening active-rush
  floors'`) asserts `arrivalIntervalMs(c.values, 'hot', 'heavy') === 950`, and `950 = 5000 ×
  weather.hot.spawnIntervalMult(0.95) × rush.heavy.spawnIntervalMult(0.2)` genuinely exceeds
  `rush.heavy.floorMs` (`700`, config-verified) — the floor does *not* bind here, so both mults are
  simultaneously visible in the unclamped result. There is no remaining gap for this specific
  interaction.

## Variants

- **success** — a fitting schedule opens normally; `rush-schedule.test.ts`'s first test (500 cases).
- **reason** — `'rushScheduleUnavailable'` (impossible/unbounded schedule), asserted pre-mutation.
- **empty** — `perShift:0` disables all rush events for the shift (`rush-schedule.test.ts`'s second
  test); `rush.none`'s zero-duration/no-op shape is the same "no active rush" baseline `rushStatus()`
  returns between scheduled slots.
- **persistence** — **corrected claim**: 7 of the 8 cited `rush-schedule.test.ts` tests round-trip
  `decodeSave(encodeSave(g))`; the exception is `'an impossible or unbounded schedule refuses opening
  before any state or RNG mutation'` (a pre-mutation fail-closed check with no state to persist). The
  v7→v8 legacy-replay test is the dedicated persistence/migration proof (no retroactive
  `rush_scheduled` fabricated for pre-v8 saves).
- **capacity** — `perShift` bounded at `10000` (`rush.ts:10`, a config-exempt allocation guard, not
  gameplay tuning); the minimum-fit check (`rush.ts:14-15`) is itself a capacity boundary against
  `shift.durationMs`.
- **duplicate/idempotent** — replaying an already-scheduled legacy save never re-emits
  `rush_scheduled` (the v7→v8 test asserts zero new `rush_scheduled` events on the same-time v8
  command).
- **stale** — not applicable to scheduling itself; `rush-pressure.ts` tracks `stale`/`staleRate` as a
  reported column (via `summarizeRush`) but that's [glass-beer-flat](glass-beer-flat.md)'s mechanic
  riding through this file's aggregator.
- **time-jump** — `rush-schedule.test.ts`'s fine-vs-coarse advance test (byte-identical worlds); the
  hidden-time/early-finalization test (pause preserves slot identity and remaining time exactly).
- **offline-reconnect** — the hidden-time test above is the closest proxy; no test specifically
  reconnects mid-rush over a real network boundary (that's `disconnection.test.ts`'s scope, a
  different feature area entirely, not cross-linked here since it doesn't touch scheduling).

## Gotchas

- `rush_warning_seen` (F08's own analytics naming) does not exist in code — cite `rush_warning`.
- `rush.none`/`rush.peak` are live config entries but dead as far as the **scheduler** is concerned —
  `planRushes()` only ever emits `'light'`/`'heavy'` slots; don't confuse "configured" with
  "schedulable".
- `voiWeightMult` and `customerWeightMult` look like the same kind of knob but bias different axes
  (rush biases one hardcoded type, `'voi'`; weather biases an arbitrary per-type map) — don't assume
  either generalizes to the other's shape.
- The schedule RNG and the customer-spawn RNG are deliberately independent seeds (see How to reach
  it) — a change that accidentally shares one `rng` state across both would silently make rush
  layout sensitive to spawn history, breaking the "layout is a pure function of
  `[locationId,shiftId,day]`" property `rush-schedule.test.ts`'s first test pins.

## Related

[shift-lifecycle](shift-lifecycle.md) (the shift's own rush **countdown clock**, `manual-close`
interaction with an active rush, and the `startShift` event bundle `weather_rolled`/`rush_scheduled`
land inside), [spawn-queue-seating](spawn-queue-seating.md) (arrival-interval math that **consumes**
`rush.spawnIntervalMult`/`weather.spawnIntervalMult`/`shipperMult` as inputs — this file owns the
multiplier sources, not their application), [glass-beer-flat](glass-beer-flat.md) (`weather
.freshnessMult` feeds the same freshness formula this file's config section lists),
[flyer-signboard-dog](flyer-signboard-dog.md) (shares `summarizeRush()` for `flyer_ended` reports; a
neon signboard also reads the shipper interval this file's `shipperMult` weather field influences),
[economy-k-ledger](economy-k-ledger.md) (`sim:rush` measures pressure, not `k`; `sim:onboarding`/
`sim:career:gate` are the actual k-band proofs).

## Changelog — S3 capacity demand
| Date | Change |
|---|---|
| 2026-10-20 | S3: `spawn.capacityDemand` multiplies the gap during a rush too (after the rush floor: gap = max(interval, floor) × group size × demand), so one table in a light rush is offered a guest every ≈ 14.7 s (was 3.7 s). "No rush below two tables" (F08 "nên có, không bắt buộc") is **not** implemented: it needs a new key and a `startShift` change; see DECISIONS `02 · rush below two tables`. Cadence tests keep their numbers by calling `steadyDemand` (`arrival-interval.test.ts`, `flyer.test.ts`, `rush-schedule.test.ts`). |
| 2026-10-20 | S3 review round 1: the rush path of capacity demand is pinned by `packages/engine/test/capacity-demand.test.ts` `capacity demand scales the gap of every rush kind too, after the rush floor and the group-size factor, rounded once (6 kinds x 1-4 tables x single and pair)` — a controlled rush (`shift.rushes = [{ kind, start, end }]`, the trick of `arrival-interval.test.ts`) for each of none · peak · light · heavy · lunch_light · football, 1-4 tables, singles and pairs, in two regimes (the bundled numbers, and one where every rush floor binds) must give `Math.round(perGuest × size × min(maxMult, max(1, refTables / tables)))`; red when the factor applies only while no rush runs, and red when it is applied before the floor (`stage02/02r1-mutation-rush.log`). |
| 2026-10-23 | Founder 2026-10-22, Part B1.2 (JSON 2.1.4): `Game.updateRush()` re-plans the pending arrival at every rush start and end (min of the remaining wait and one guest's gap at the new pace, `arrivalGap(1)`); pins <= 2.1.3 keep the old timer. STOP: `sim:balance` + `sim:career:gate` red on this label, waiting for the founder (08-SPEC changelog 2026-10-23 / JSON 2.1.4). |
