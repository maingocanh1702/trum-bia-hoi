# Customer spawn, queue & shipper lane (03-SPEC-he-ban.md §7 "Spawn nhóm & cỡ nhóm", §8 "Đơn shipper riêng")

03-SPEC §8 calls the shipper lane out as a deliberately separate mechanic ("Đơn shipper riêng...
Đơn này không chiếm bàn/hàng đợi/cốc") — confirmed in code: `customerTypes.shipper` config has
`usesTable:false, usesGlass:false` (`docs/config/economy.tbh.json`), and `World.delivery`/
`nextDeliveryAt` are their own fields, never touching `World.queue`/`World.tables`/`World.glasses`.
This file covers both halves — seated-customer arrival cadence feeding the queue, and the
independent shipper lane — because they share the same autonomous tick machinery
(`processDue()`/`processDelivery()`) even though their state is fully disjoint. Full seating/queue
**capacity** enforcement (`seatQueue()`, `queueSlots`, one-table-one-group) is
[table-lifecycle](table-lifecycle.md)'s territory, not restated here.

## Observable contract

- `World.shift.nextSpawnAt: number` (`types.ts:44`) — countdown to the next `spawn()` tick.
- `Group` (`types.ts:13`): `{id, customers, rounds, arrivedAt}`; `World.queue: Group[]` (`types.ts:80`)
  — full queue/seating semantics belong to [table-lifecycle](table-lifecycle.md); this file owns only
  the arrival-rate/mix that feeds it.
- `DeliveryOrder` (`types.ts:12`): `{id, placedAt, expiresAt, lines: {dish, quantity}[]}`.
  `World.delivery: DeliveryOrder | null`, `World.nextDeliveryAt: number | null` (`types.ts:83`) — the
  shipper lane's own state.
- `Shift.stats` delivery fields (`types.ts:36`): `deliveryCompleted?/deliveryMissed?/deliveryNet?/
  deliveryBonus?`.
- Events: `customer_spawned` (`engine.ts:570`), `queue_overflow` (`:567`) — both already the subject
  of [table-lifecycle](table-lifecycle.md)'s Observable contract/Uncovered paths (`queue_overflow` is
  never triggered/asserted anywhere — still true here, cross-link, not re-claimed as a new finding);
  cited here only for the arrival-rate angle. `customer_left` (`:416`, `reason:'queue'`) — the queue's
  own timeout sweep (`queueDeadline()`, see How to reach it), distinct from `queue_overflow`'s
  arrival-time rejection above; the same event name also fires `reason:'expired'` at `:505` for an
  in-service dismissal, which is [table-lifecycle](table-lifecycle.md)/[serve-outcomes](serve-outcomes.md)'s
  concern, not this file's. `shipper_arrived` (`:461`), `shipper_missed` (`:452`), `shipper_completed`
  (`:904`).
- `Result` reasons for `serveDelivery` (`engine.ts:894-905`, shape-validated `:1085`): `'deliveryGone'`
  (`:896` — wrong/stale id, already-resolved, or `remainingMs===0`), `'deliveryStock'` (`:897`,
  missing an ingredient), `'serveCooldown'` (shared with table `serve` — see Gotchas),
  `'rewardOverflow'` (the `deliveryQuote.safe` fail-closed guard). Plus the standalone
  `'deliveryPending'` reason on `kickAll` (`:829`) blocking paid closure while a delivery is
  outstanding.
- `deliveryQuote(w, c)` (`rules.ts:141`) → `{order, lines: {dish,quantity,have}[], gross, net, bonus,
  credited, creditedBonus, safe, penalty, ready, remainingMs}`. `deliveryInterval(w, c)` (`rules.ts:137`)
  applies the signboard neon multiplier (see [flyer-signboard-dog](flyer-signboard-dog.md)) and
  `weather[...].shipperMult` on top of `customerTypes.shipper.spawnIntervalMs`.
- A successful `serveDelivery` also credits `reputation.serveNoTip` (`game.test.ts`-style pattern,
  directly asserted in `shipper.test.ts` — see Existing proof) even though there is no glass/tip
  concept for a delivery — don't assume deliveries are reputation-neutral.
- DOM/aria (`apps/web/src/App.tsx`): phone nav button `aria-label={t('delivery.open')}` (visible once
  `BUSINESS_UNLOCKS` includes `'phone'`), class `has-delivery`/`is-urgent`, accessible description
  matching `/Hạn giao còn lại.*mm:ss/`; delivery sheet `role=dialog aria-label={t('delivery.title')}`
  ("Đơn giao hàng"); `.delivery-lines li` per ingredient with a met/missing `aria-label`; serve button
  text `t('delivery.serve', {n})` ("Giao cả đơn…"), wired to `run({type:'serveDelivery', deliveryId})`,
  `disabled={!ready || !safe || !remainingMs}`.

- **Rules 28 seat model (S1):** group size is `spawn.pPair` (pair) else one guest, independent of the shop (D17). A pair when no table has two chairs leaves at the door: `queue_overflow{size, reason:'noSeat'}`, counted in `stats.rejected` and `stats.noSeat`, no penalty, no reputation, never `lost`/`lostStreak`, never queued. A full queue on seat-model shifts says `reason:'full'`; rules <= 27 keep `{size}`. Seating stays smallest-fitting-empty-table (singles prefer one-chair tables).

## How to reach it

- Engine, arrival: fully autonomous — `processDue()` (`engine.ts:345`) calls `spawn()` (`:539`)
  whenever `now >= shift.nextSpawnAt` (`:420`). No player command creates a group.
  - Group size/mix (`:540-557`): size is randomized up to the largest table's capacity (the
    onboarding first shift forces a fixed size/type from config); customer-type weights are adjusted
    by weather (`customerWeightMult`), rush (`voiWeightMult`), and signboard style (`signWeightMult`,
    rules-gated) — cross-link `rush-weather` for the weather/rush multiplier values themselves,
    [flyer-signboard-dog](flyer-signboard-dog.md) for `signWeightMult`.
  - Arrival cadence (`:574-575`): `interval = arrivalIntervalMs(...)` (rules-gated,
    `rulesVersion >= ARRIVAL_INTERVAL_RULES = 10`, `engine.ts:21`) or the legacy inline formula, then
    `× size` when `spawn.perCustomer` is true (config default). The actual weather/rush multiplier
    *values* are `rush-weather`'s territory — this file owns only the wiring (who calls it, how the
    result is applied to `nextSpawnAt`).
  - Overflow gate (`:566-567`): `queue.length >= queueSlots(...) && no empty table fits` → emits
    `queue_overflow`, adds to `stats.rejected` — `queueSlots`/`seatQueue()`'s capacity enforcement is
    [table-lifecycle](table-lifecycle.md)'s territory; this file's angle is purely "an arrival that
    finds no room."
  - Queue timeout sweep (`:410-417`, runs every tick, before `seatQueue()`): once
    `w.now >= this.queueDeadline(group)` (`:112`, config-driven per-group deadline), the group is
    dropped from `w.queue`, `w.lostStreak` increments, and `customer_left` fires with
    `reason:'queue'` — a group that successfully formed a queue slot but gave up waiting, distinct
    from the overflow gate above (which rejects an arrival before it ever queues at all).
- Engine, shipper lane: `processDelivery()` (`engine.ts:446-462`), called from `processDue()` only
  when `rulesVersion >= DELIVERY_RULES = 7` (`:421`, `engine.ts:18`). Ordering inside one tick matters:
  an overdue existing delivery is missed first (`:448-453` — `penalize()` + `shipper_missed`, sets
  `delivery=null`) **before** a new one can arrive in the same call (`:455-462`) — a delivery is never
  silently overwritten. First arm: `engine.ts:722`, seeded once `rulesVersion >= DELIVERY_RULES` and
  the shipper's required unlock (`customerTypes.shipper.requires`, config value `'phone'`) is owned.
  - Player command: `{type:'serveDelivery', deliveryId}` (`types.ts:102`, `engine.ts:894-905`) —
    gated on the live `deliveryQuote` matching the given id and every ingredient in stock
    (`:896-897`); success debits inventory, credits `net+bonus` through the same `credit()`-family
    path as any other income (cross-link [economy-k-ledger](economy-k-ledger.md)), clears
    `delivery`, increments `shift.stats.deliveryCompleted/-Net/-Bonus`.
  - `kickAll` refuses outright while a delivery is outstanding (`:829`, reason `'deliveryPending'`) —
    a distinct, harder block than any table-related `kickAll` refusal in
    [table-lifecycle](table-lifecycle.md).
- UI: nav phone icon → opens the `'delivery'` sheet → "Nhập nguyên liệu còn thiếu" routes to the stock
  sheet for missing lines → "Giao cả đơn…" sends `serveDelivery`. Same in local and remote mode — the
  generic `run()` dispatcher has no delivery-specific fork.

## Existing proof

- `npm run sim:onboarding` (`packages/engine/sim/headless.ts`) — five seeds in each cold/full-menu
  and onboarding-on/off cohort count unique admitted customer IDs through the real command/advance
  bot. The census reconciles admitted + rejected arrivals with shift stats, reports observed customer
  types, and excludes forced onboarding, unknown-type overflow, weather/rush modifiers and signs
  from the sunny/non-rush/no-sign baseline. Each five-seed baseline must remain within 30% of
  the configured VIP probability adjusted for the per-group cap. Repeated service rounds never
  count as new arrivals. This engine proof does not establish human recognition of a VIP on the
  public build; Wave A3's shift-2 hand-play acceptance remains pending.
- `packages/engine/test/arrival-interval.test.ts` (all 5): `'ordinary hot and humid arrivals get
  their configured speedup across actual seeded groups'` (per-weather `nextSpawnAt`/interval pin
  across 5 seeds), `'ordinary baseline floor and multiplier remain configurable without weakening
  active-rush floors'`, `'fast-weather rush groups retain hard floors and round once after the
  per-customer size factor'` (the `perCustomer × size` rounding rule, all rush kinds), `'config intake
  rejects rounded-zero and unrepresentable ordinary or group arrival intervals'`, `'genuine v9 hot and
  humid histories keep their old cadence until a new interval is scheduled'` (legacy fixture replay
  through a live rules upgrade to 24).
- `packages/engine/test/game.test.ts:245` — `'queued groups leave exactly at patience, without the
  seated-order grace'` — the direct proof of the queue-timeout sweep above (`customer_left`,
  `reason:'queue'`); incidentally also read off the event log (not as a dedicated queue-timeout test)
  by `rush-schedule.test.ts`'s `'expiry mirrors are counted once and zero-service reports have a
  finite stale rate'` and `flyer.test.ts`'s `'campaign reports measure actual seated service and
  losses, not capped-away tips or delivery credit'`.
- `packages/engine/test/shipper.test.ts` (all 10): `'configured bundles respect final menu prices,
  all kitchen unlocks, count and gross bounds'` (`deliveryBundles` content — a pure config-shape test,
  no `Game` instance), `'a retargeted QR gate cannot replace the required phone for shipper access'`
  (config-time refusal, exact `config:shipper` message), `'actual v6 phone-owned history stays inert
  until a current command arms a future delivery'` (legacy fixture: `nextDeliveryAt` stays `null`
  until a live command re-arms it), `'phone bought midshift starts its timer then; weather multiplies
  delivery frequency, not interval'` (direct proof `deliveryInterval` scales by `weather.shipperMult`,
  not the arrival-cadence formula), `'delivery handoff requires every ingredient and debits once
  without tables, glasses or seated k records'` (`deliveryStock` → fill → success → idempotent replay
  → `deliveryGone` on a fresh envelope), `'pending delivery blocks paid kick-all and final closure;
  exact deadline charges the available coins only'` (`deliveryPending` on `kickAll`, then natural
  expiry → `shipper_missed`, exact clamped penalty), `'hidden delivery time and requested closing
  replay a successful handoff without phantom arrivals'` (`activity:false/true` preserves both
  `delivery.expiresAt` and `nextDeliveryAt` by the same offset), `'table and delivery handoffs share
  the service ceiling; a busy delivery never accumulates a backlog'` (`serveCooldown` shared with
  table `serve` — see Gotchas), `'stamina exhaustion stops arrivals but keeps the last delivery
  available until handoff'`, `'delivery uses the actual day cap, rested bonus, midnight bucket and
  safe aggregate preflight'` (`rewardOverflow` fail-closed on coins/seasonEarned/lifetimeEarned
  overflow).
- `apps/web/test/fixtures/shipper.ts` — real engine-driven fixture (upgrade stall → restock lac →
  upgradeDog → optional restock bia → startShift → serve one round → buyUnlock phone → advance to
  `nextDeliveryAt`); accepts `ready`/`rested` CLI args to pre-fill stock or grant the well-rested
  bonus before dumping the save/quote JSON.
- `apps/web/test/game.spec.ts`: `` `shipper ingredients, whole handoff, phone focus and reload at
  ${viewport.width}×${viewport.height}` `` (×2 viewports — phone button `has-delivery` class + 44px
  target + accessible countdown, missing-ingredient restock flow, full handoff, `.toast-gain`,
  reload-persistence, locale switch, exactly one `shipper_completed` event in the saved log),
  `'a pending shipper blocks paid closure and expires with a numeric-only penalty'` (already cited by
  [serve-outcomes](serve-outcomes.md) for its `.toast-loss` mechanism — this file's angle is the
  delivery-blocks-`kickAll`/expiry-penalty behaviour itself, not the toast).

- `packages/engine/test/seat-model.test.ts` — `a pair with no two-chair table leaves at the door: no penalty, no reputation change, never lost` (onboarding's forced single still seats; `noSeat` = `rejected`; coins/reputation/lostStreak unchanged; queue empty).
- `packages/engine/test/arrival-interval.test.ts` — `fast-weather rush groups retain hard floors and round once after the per-customer size factor` now forces pairs (`spawn.pPair` 1): the gap after a turned-away pair still scales by two.

- **S3 capacity demand, door queue, patience (rules 28, JSON 2.0.22; D12 D19 D25):** `packages/engine/test/capacity-demand.test.ts` (12) —
  `a rules-28 history recorded on JSON 2.0.21 replays byte for byte and re-encodes unchanged` (fixture `packages/engine/test/fixtures/seat-2.0.21-v28.json`, recorded by the S2 engine, generator `fixtures/seat-v28.ts`) ·
  `the bundled numbers are the plan's W9 set: capacity demand 6 / 4 (D19), queue 1 + seats/8 and patience 24 s (D25), a Tier A key, a version above 2.0.21` (the one test that names the numbers; S5 retunes it) ·
  `capacityDemandMult is min(maxMult, max(1, refTables / tables)); a snapshot from before the key has none` (1 → 8 tables: x4 x3 x2 x1.5 x1.2 x1 x1 x1; clamps; pins x1) ·
  `the gap to the next group is multiplied by the demand factor of the tables owned: x4, x3, x2, x1.5 (singles and pairs, seed 42)` (real `buyTable`, three consecutive gaps per case; the first guest of the shift keeps `baseMs × warmupMult`) ·
  `the gap rounds once, after the group-size and demand factors, and follows the table count live` (hot weather, 4 tables: 14 962.5 → 14 963) ·
  `capacity demand scales the gap of every rush kind too, after the rush floor and the group-size factor, rounded once (6 kinds x 1-4 tables x single and pair)` (a controlled rush per kind, two regimes: the bundled numbers and one where every floor binds; also cited in rush-weather.md) ·
  `queue slots are queueBaseSlots + floor(seats / queueSeatsPerSlot): one seat queues one group, eight seats two; a capacity pin keeps 2 + seats/3` ·
  `D12: a group turned away because the door queue is full costs no coins and no reputation and is never lost; only waiting too long does` (after one real serve gives reputation to lose: ≥ 5 `queue_overflow{reason:'full'}`, coins/reputation/`lostStreak` unchanged, `stats.lost` 0, then the first guest who gives up costs reputation and counts as lost) ·
  `patience.thuongMs is 24 s on the bundled seat seed and stays 18 s on a capacity pin and on a 2.0.21 pin` ·
  `snapshots from before the key load, bytes kept, and refuse every half-way shape; the new keys never loosen an older shape` (2.0.21 and a 2.0.20-like pin load; key without tier entry, tier entry without key, new label without the key, unknown subkey, wrong type, 1.x/2.0.4 + key: all refused) ·
  `capacityDemand fails closed: whole refTables >= 1, finite maxMult >= 1, and a gap that stays a safe integer` ·
  `a pinned 2.0.21 save plays on with its own cadence, then adopts the new bundle at its next opening and never re-migrates its seats` (x1 and 2 queue slots under the pin, then `config_pinned` 2.0.21 → bundle, no `seat_model_adopted`, x4 and 1 slot, whole save replays).
  Suites about other subjects call `packages/engine/test/fixtures/steady-demand.ts` (`maxMult` 1): arrival-interval, flyer, manual-close, rush-schedule, seat-model (tray mix) and the career harness (career.test.ts).
- **Door table (S3 acceptance, a report not a gate):** `packages/engine/test/door-table.test.ts` — `doorTable reports lost / arrived and lost / admitted per band, the stricter reading decides, shift 1 counts arrivals and refused pairs`, `doorTable passes when every band and shift 1 are inside the targets, and says so when the run is too short to cover a band`, `a real career day reports one stats row per closed shift and they add up to the day row`; run it with `npm run sim:career -- --days=30 --seed=42 --door` (and `--seed=99`): prints `DOOR shifts 1-24 / days 8-14 / days 15-21 / shift 1` lines (`packages/engine/sim/door.ts`).
- **UI:** `apps/web/test/first-shift-visual.spec.ts` `P0 the door shows patience rings and a refused group of ${size} says "…" at ${w}px` (×6: a full door = every `queueSlots` slot holds a ringed group, the refused group's bubble reads "2 ghế" / "Hết chỗ") and `P0 two refusals inside one bubble lifetime: the door says the newest reason and no bubble covers a guest at ${w}px` (×3, S6 review round 2: only the newest refused group is drawn; fixture `crowd2`, two `queue_overflow` 630 ms apart); `apps/web/test/buy-reasons.spec.ts` `when a guest leaves the toast says why in one reason (Hết chỗ) …` (the refusal toast: reason alone, no coins, no reputation) and `the shift book lists why guests left, most guests first, at ${w}px` (now also the "Cặp không có chỗ: n" line); `apps/web/test/leave-reasons.test.ts` the two S3 tests (`pairsWithoutSeat`).

## Verification procedure

- `node --import tsx --test packages/engine/test/arrival-interval.test.ts
  packages/engine/test/shipper.test.ts` (or `npm test` for the full suite — bare `tsx` is not
  guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/game.spec.ts` (or `npm run test:e2e`) — both cited UI tests live
  in this one spec file.
- `npm run check:config` before touching `spawn.*`, `customerTypes.shipper.*`, or any
  `weather.*.spawnIntervalMult`/`shipperMult` in `docs/config/economy.tbh.json`.
- Manual fixture reproduction: `node --import tsx apps/web/test/fixtures/shipper.ts [ready|rested]`
  prints the exact save/quote JSON the e2e spec consumes.

## Uncovered paths

- **The same-tick "miss an overdue delivery, then immediately arm a new one" path
  (`processDelivery()`'s two `if` blocks both firing in one call) has no test that jumps far enough to
  hit both in a single `advance()`.** All 10 `shipper.test.ts` cases either stay well inside one
  delivery's window or advance in a way that keeps the offset alignment (the hidden-time test shifts
  both deadlines by the same amount rather than crossing both).
- **`'deliveryGone'` is only exercised for "already resolved" (a fresh envelope after success), never
  for "a stale id from a superseded delivery while a newer one is live."** The service-ceiling test
  gets a second, different-id delivery (`next.id !== q.order.id`) but never calls `serveDelivery` with
  the old `q.order.id` afterward to confirm it also reads `'deliveryGone'`.
- **No test drives `spawn.perCustomer=false` together with a non-default weather/rush combination** —
  the `perCustomer` boolean is exercised for both values in the rush-floor test, but always alongside
  a fixed `'hot'` weather; the ordinary-weather interval tests never vary `perCustomer`.
- **`shipper_missed`'s reputation delta is asserted as `0` only in the one closing-boundary test** —
  no test forces a miss mid-shift (delivery expires while the shift stays `'open'`) to confirm the
  same zero-reputation-cost behaviour outside the closing/resting transition.

## Variants

- **success** — `shipper.test.ts`'s handoff test; `game.spec.ts`'s full UI handoff.
- **cancel** — not applicable: no dedicated cancel command for either an arrival or a live delivery;
  the closest analog is `kickAll`'s outright refusal while a delivery is pending (a block, not a
  cancel of the delivery itself).
- **reason** — `'deliveryGone'`, `'deliveryStock'`, `'serveCooldown'`, `'rewardOverflow'`,
  `'deliveryPending'` (on `kickAll`) — all proved by exact string except the stale-id branch of
  `'deliveryGone'` (see Uncovered paths).
- **empty** — the default `delivery:null, nextDeliveryAt:null` state until `'phone'` is owned
  (`shipper.test.ts`'s v6 legacy-fixture test is the direct proof of staying inert).
- **persistence** — **corrected claim**: only 7 of the 15 cited engine tests explicitly round-trip
  `decodeSave(encodeSave(g))` — both legacy-fixture-replay tests (`'genuine v9 hot and humid
  histories...'`, `'actual v6 phone-owned history...'`) and 5 of `shipper.test.ts`'s later tests
  (`'hidden delivery time...'`, `'table and delivery handoffs share...'`, `'stamina exhaustion stops
  arrivals...'`, `'delivery uses the actual day cap...'`, plus the v6 one already listed). The
  remaining tests (including `'delivery handoff requires every ingredient...'` and `'pending delivery
  blocks paid kick-all...'`) assert command results and event data directly without a save round-trip
  — don't assume persistence coverage from a test's mere presence in this list.
- **capacity** — not directly applicable here: arrival-side capacity is
  [table-lifecycle](table-lifecycle.md)'s `queueSlots`; the delivery lane has an implicit
  capacity-of-one (`!w.delivery && ...` guards a second delivery from ever arriving while one is
  outstanding).
- **duplicate/idempotent** — `shipper.test.ts`'s handoff test resends the identical envelope
  (`g.command(envelope)` twice) and asserts no second debit.
- **stale** — not the freshness/`outcome:'stale'` concept (that belongs to
  [glass-beer-flat](glass-beer-flat.md)/[serve-outcomes](serve-outcomes.md)); the nearest analog here
  is an expired/superseded delivery id reading `'deliveryGone'` — don't conflate the two "stale"
  meanings when grepping this codebase.
- **time-jump** — `arrival-interval.test.ts`'s v9 legacy-fixture test; `shipper.test.ts`'s hidden-time
  test.
- **offline-reconnect** — `shipper.test.ts`'s hidden delivery time test (`activity:false`→`true`)
  covers the pause analogue; true network disconnect/reconnect is `disconnection.test.ts`'s scope, not
  this file's.

## Gotchas

- `'serveCooldown'` is **shared** between table `serve` and `serveDelivery` via the same
  `spawn.playerServeCeilingPerSec`/`lastServedAt` gate — a change to one affects the other; see the
  service-ceiling test above for the direct proof of sharing.
- A successful delivery credits `reputation.serveNoTip` — deliveries are not reputation-neutral even
  though there's no glass/tip mechanic for them.
- `spawn.perCustomer` (default `true`) multiplies the arrival interval by group size — reading
  `spawn.baseMs` alone won't match observed `nextSpawnAt` deltas without this factor.
- The shipper lane's arm-then-consume lifecycle (armed at `:722`/`:460`, cleared at `:453` or
  `:894-905`) never touches `World.queue`/`World.tables`/`World.glasses` — don't route delivery bugs
  through the seating/table code paths, and don't route seating bugs through this file's proof.
- `DELIVERY_RULES = 7` and `ARRIVAL_INTERVAL_RULES = 10` (`engine.ts:18,21`) are both well below the
  current max (`RulesVersion = 24`) — on a freshly-created `Game`, everything described above is
  simply current default behaviour, not an opt-in legacy branch.

## Related

[table-lifecycle](table-lifecycle.md) (`seatQueue`/`queueSlots`/`queue_overflow` — the seating half of
"an arrival feeds something"), `rush-weather` (the weather/rush multipliers this file's arrival
cadence and delivery interval both consume), [flyer-signboard-dog](flyer-signboard-dog.md)
(`signWeightMult` on customer-type mix; neon signboard style shortens the delivery interval),
[economy-k-ledger](economy-k-ledger.md) (delivery net/bonus flow through the same `credit()` family,
but are excluded from `k` itself since `k` only counts seated serves).

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 | Wave A3 adds the five-seed headless VIP arrival census, denominator/exclusion rules and explicit pending human observation. No spawn gate, weight or production behaviour changes. |
| 2026-10-14 fun-onboarding-visual | UI only: queued groups now render at the door with a patience ring (`DoorQueue.tsx`, same arrival + least-patient-guest deadline the engine uses), and a `queue_overflow {size}` shows a bubble `{n} ghế` (pair) / `Hết chỗ` (single) before the group walks off. Proof: `apps/web/test/first-shift-visual.spec.ts` `P0 the door shows patience rings and a refused group of ${size} says "…" at ${w}px` (×6, crowd saves from `apps/web/test/fixtures/first-shift-visual.ts`). No engine rule, spawn number or queue formula changed. |

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: pair arrivals, `noSeat` door rejection and `reason` on `queue_overflow`; tests cited. |

## Changelog — S3 capacity demand
| Date | Change |
|---|---|
| 2026-10-20 | S3 `eco21-capacity-demand` (JSON 2.0.22): `spawn.capacityDemand {refTables 6, maxMult 4}` multiplies the gap to the next group (x4 · x3 · x2 · x1.5 for 1 · 2 · 3 · 4 tables, also in a rush; not the first guest of a shift), the door queue is `1 + ⌊seats / 8⌋`, `patience.thuongMs` 24 s; a pin from before the key keeps x1, 2 + seats/3 and 18 s. D12 (door refusals free of coins, reputation and `lost`) already held since S1 and is now pinned for the `full` reason too. Tests above; the shift book counts "Cặp không có chỗ". |

## Changelog — S4 table and chair levels
| Date | Change |
|---|---|
| 2026-10-20 | S4 `eco21-table-chair-upgrades`: `seatQueue` (the moment a queued group takes a table) records `Group.level` / `Group.chairLevel` and adds the Lv2 round to `Group.rounds`; arrival, queue, door refusal and patience are untouched (S3). Proof: `packages/engine/test/table-chair-upgrades.test.ts` `Lv2 adds exactly one round and it stays at Lv3 and Lv4: ...` and `a benefit serves the NEXT group: ...`. |
| 2026-10-20 | S5 `eco21-balance-pass` (JSON 2.1.0): `locations.list[].tableSlots` 4/4/5/6/6/7/8/8/8 replace S1's all-4 (the 8-table and LP7 "10 seats" gates need five or more slots), table 2…8 `tablePriceBase` 600 · 2 000 · 4 000 · 7 500 · 12 500 · 20 000 · 31 300 and chair `chairPriceBase` 10 000 … 70 000; arrival pace, door queue `1 + ⌊seats / 8⌋`, patience 24 s and `capacityDemand` 6 / 4 are unchanged. The standard sims (`npm run sim`, `sim:onboarding`, `sim:rush`) start on the complete first alley (`packages/engine/sim/scenario.ts furnishFirstAlley`: four tables of two chairs bought with real commands, the wallet topped up by exactly each price: `packages/engine/test/standard-sim.test.ts`). A shop that moves to a location with fewer slots than it has tables keeps them (the folding rule is Wave 5, not built). |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 1 (JSON 2.1.0, re-sealed for the plan's bot): `tableSlots` **8** in every place (the strict seat-saving bot buys tables 2-8 before its first second chair), table 2…8 `tablePriceBase` 600 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000, chair `chairPriceBase` 400 … 2 800; arrival pace, door queue, patience and `capacityDemand` 6 / 4 unchanged. Proof: `packages/engine/test/seat-model.test.ts` (the first alley holds eight; the D2 migration meets an alley of four built from the config), `apps/web/test/seat-model.spec.ts` (tables 2-8, the chair opens with the fourth), `apps/web/test/buy-reasons.spec.ts` (the full-alley case builds the alley's own table count). |
