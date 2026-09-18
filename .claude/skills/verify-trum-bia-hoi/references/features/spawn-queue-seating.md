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
