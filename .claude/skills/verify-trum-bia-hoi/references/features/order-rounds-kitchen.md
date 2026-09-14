# Order rounds & kitchen (03-SPEC-he-ban.md §2 "lai rai"; `docs/config/economy.tbh.json` `_pipelineRule`)

`docs/config/economy.tbh.json:888` `_pipelineRule` (owner note, 2026-09-09): every station (keg,
washer, kitchen) is an **autonomous pipeline** — the player never taps a station, only Serve. Each
station is defined by a batch duration + a batch size; the engine reads
`keg.refillMs`/`kegBatch`, `washer.washMs`/`slots`, `kitchen.prepMs`/`slots` (pan count) ×
`portionsPerPan`.

## Observable contract

- `Group.rounds: number` (`types.ts:13`) — target round count, set once at group spawn from
  `docs/config/economy.tbh.json` `rounds` ranges (`thuong:[1,2]`, `voi:[1,1]`, `ngoily:[3,5]`,
  `vip:[1,2]`).
- `Table.roundsServed: number` (`types.ts:17`) — counter, incremented on each successful `serve`.
- `Table.state` — **the real union is `'empty'|'seating'|'waiting'|'consuming'|'occupied'|
  'cleaning'|'broken'` (`types.ts:16`) — there is no literal `AWAITING_SERVE`/`ORDERING` value; the
  design doc's conceptual `ORDERING → AWAITING_SERVE` both collapse into the single `'waiting'`
  state in code.** Within `'waiting'`, `Order.state` (`pending`→ready-to-serve) and the
  `order_ready` event are what actually distinguish "just ordered, still prepping" from "tray ready".
- `Order.state` — **`'pending'|'grace'|'served'|'expired'|'cancelled'` (`types.ts:10`)** — note this
  does *not* literally match 03-SPEC's Vietnamese-derived vocabulary (`grace_leaving`, no explicit
  `cancelled`); code is the source of truth, cite code names in any change.
- `Item.state`: `'pending'|'preparing'|'ready'|'served'|'wasted'` (`types.ts:5`); `Item.kitchenBatchId?:
  string` (`:6`, pan/batch grouping id).
- `kitchenStatus(w,c)` (`packages/engine/src/kitchen.ts:20`) → `{level, slots, busy, portionsPerPan,
  jobs}`; each job (`:12-16`) → `{itemId, batchId, tableId, tableNumber, orderId, dish, state,
  remainingMs, late}`, `state ∈ {'locked','stock','queued','preparing','ready'}`.
- `beerStatus(w,c)` (`production.ts:11-16`) → `{pouring, tapSlots, pourMs, enabled, available,
  reserved, stored, capacity, batchSize, durationMs, busy, remainingMs, progress}`.
- `washerStatus(w,c)` (`production.ts:21-26`) → `{clean, capacity, queued, busy, batchSize,
  durationMs, remainingMs, progress}`.
- Events: `order_placed`, `dish_ordered` (`engine.ts:604-605`); `dish_preparing`/`beer_pouring`
  (`:640`); `beer_poured` (`:641,377`); `kitchen_job_started`/`kitchen_job_ready` (`:643-644,378`);
  `dish_ready` (`:377`); `order_ready` (`:648`); `beer_batch_started`/`beer_batch_ready`
  (`:658/373`); `glass_washing`/`glass_washed` (`:670/367`); `glass_stale` (`:383`); `order_grace`
  (`:389`); `order_expired` (`:512`); `dish_wasted` (`:520`); `order_served` (`:891`);
  `table_occupied` (`:400`, the Chí Phèo-lingers branch — see Uncovered); `table_cleaning`/
  `table_cleaned` (`:496/406`).
- `Result` (`types.ts:126`): `{ok, reason?, outcome?, amount?}`. `serve` reasons (`engine.ts:858-863`):
  `'orderGone'`, `'orderExpired'`, `'orderNotReady'` (not every item `'ready'` yet), `'serveCooldown'`.
- DOM/aria: `Kitchen.tsx:5` region `aria-label={t('kitchen.live')}` (EN "Live kitchen" / VI "Tại
  bếp"); job rows `data-item`/`data-state`, `.is-late`; burner slots `.kitchen-slots span.is-cooking`.
- Server: no kitchen-specific route — everything rides `POST /player/command`
  (`apps/server/src/http.ts:290`).

## How to reach it

- Engine: prep is **entirely autonomous**, driven by `Game.advance(now)` → `processDue()`
  (`engine.ts:345`), in order per tick: lease/season sync → glass-wash completion (`:363-369`) →
  beer-batch completion (`:370-374`) → item-ready sweep for kitchen/beer (`:375-386`) → order
  grace/expiry sweep (`:387-391`) → table until-timer sweep, **including the round-repeat branch**
  (`:392-408`) → queue-timeout sweep (`:410-418`) → `seatQueue()` → `spawn()` → `prepare()` (`:422`)
  → `wash()` (`:423`). No player command drives prep directly.
- The round-repeat trigger (`engine.ts:392-402`, condensed):
  ```
  if (t.state === 'consuming') {
    this.releaseGlasses(t);
    if (w.phase === 'open' && t.group && t.roundsServed < t.group.rounds) this.order(t);
    else if (t.group?.customers.some(x => x.type === 'chipheo')) { /* → 'occupied' or clean */ }
    else this.clean(t);
  }
  ```
  i.e. after a served round's `enjoyMs` window elapses, a fresh `roundsServed < group.rounds` check
  either places another `Order` (loops back to `'waiting'`) or moves to occupied/cleaning.
- The only player command touching this pipeline: `{type:'serve', tableId, orderId}` (`types.ts:101`,
  `engine.ts:856-893`), gated on `o.items.every(i => i.state === 'ready')` (`:862`). On success,
  `t.roundsServed++` and `t.state='consuming'` with `t.until = now + max(customers' enjoyMs)`
  (`:888-889`), which re-arms the round-repeat check above.
- UI, **both modes**: `kitchenStatus`/`beerStatus`/`washerStatus` are recomputed **client-side** from
  `game.world`/`game.config` on every render (`App.tsx:270-271`), regardless of local vs remote — the
  server never ships kitchen-panel-shaped data; both modes run the identical projection over whatever
  `WorldView` they hold. Nav opens the "Bếp"/"Kitchen" sheet; tapping a job routes to that table's
  order dialog.

## Existing proof

- `packages/engine/test/kitchen.test.ts`: `'actual upgrades open exactly the configured dishes and
  all intermediate burner limits'`, `'stock shortage starts no cooking; one real restock starts only
  one matching dish and the rest waits'`, `'actual completion deadline and hidden pause agree under
  fine and coarse time steps'`, `'patience warning uses the actual started-job timestamp including
  equality, never a queued estimate'`, `'expired preparing food is wasted once without refund, and
  pending stock was never consumed'`, `'a partial hot-food order is refused and its whole ready mâm
  can still be served with stale beer'`, `'a completed recipe releases its burner at the exact
  timestamp for the next queued dish'`.
- `packages/engine/test/production.test.ts`: `'level one fills five servings before any customer and
  refills the vacancy as a glass leaves for service'`, `'a table larger than the tank assembles across
  batches without overflowing storage or double-consuming stock'`, `'a partial raw stock starts
  immediately; restocking and a live upgrade cannot advance or resize the paused batch'`, `'a wash
  batch takes only its level capacity, keeps new dirty glasses queued and preserves timing through
  upgrade and pause'`, `'the actual v17 paused save replays exactly and adopts enabled batches only
  at its next config pin'`, `'batch capacity, units and deadlines reject fractional, oversized or
  invalid config'`, `'an upgraded tank holds forty servings independently of the reusable glass pool,
  and reserve freshness waits for the tray'`, `'a legacy wash without a start timestamp keeps its
  real deadline and reports indeterminate progress'`.
- `packages/engine/test/economy2.test.ts:31` — `'two simultaneous same-dish pans cook four portions,
  never six, then release capacity at their exact deadline'` (asserts `kitchenStatus(...).busy`
  directly — the pan-batching/`portionsPerPan` cap proof).
- `packages/engine/test/game.test.ts:217,311` — `'custom normal, VIP, hurried and leisurely round
  ranges reach spawned groups'`, `'mixed-group round precedence survives hurried nonconstant
  sampling'` — assert `group.rounds` assignment at spawn only; neither drives a table through actual
  repeat rounds.
- `packages/engine/test/manual-close.test.ts:16,43` — `'manual close charges every assigned order
  once, including consuming guests, without abandonment penalties'`, `'close quote reuses VIP and
  rush pricing, and only a remaining Chi Pheo occupies a finished mixed table'` (the second test
  hand-sets `table.state = 'occupied'` rather than driving the real chipheo-lingering branch — see
  Uncovered paths).
- `packages/engine/test/menu.test.ts` — `'mâm average stays separate from per-customer k across
  repeated rounds, with no cap or bonus credit in either value'` — drives real service via the
  `playMenu()` helper (`packages/engine/test/fixtures/menu.ts`, repeated `advance()`+`serve()`) until
  the *same customer* appears in two distinct `Order`s, i.e. the table actually cycled back through
  `order()` a second time (`engine.ts:396`) — **this is the round-repeat mechanism exercised
  end-to-end**, correcting the Uncovered-paths claim below.
- `apps/web/test/kitchen.spec.ts`: `` `live kitchen shows real timers and routes to the whole table at ${viewport.width}×${viewport.height}` `` (×3 viewports), `'kitchen warning disappears after real expiry and never leaves a stale dish link'`, `'out-of-stock recipe opens the existing restock sheet'`, `'max-level kitchen shows all three configured burners'`, `'an unowned kitchen is purchasable mid-shift without showing a fake owned yard appliance'`.
- `apps/web/test/production.spec.ts`: `` `stocked beer capacity and upgrade comparison update live, with frozen batch progress in menus at ${width}px` `` (×2 widths), `'legacy washing shows an indeterminate bar in the yard and paused equipment panel'`, `'reload immediately after a completed beer batch warns while its save is pending and preserves the batch'`, `'washer, cooler and counter upgrade cards show their own per-level draft sprites'`.

## Verification procedure

- Engine: `node --import tsx --test packages/engine/test/kitchen.test.ts
  packages/engine/test/production.test.ts packages/engine/test/economy2.test.ts
  packages/engine/test/game.test.ts packages/engine/test/manual-close.test.ts
  packages/engine/test/menu.test.ts`.
- UI: `npx playwright test apps/web/test/kitchen.spec.ts apps/web/test/production.spec.ts`.
- `npm run sim:onboarding` / `sim:rush` / `sim:career:gate` exercise many repeat-order cycles
  incidentally (long randomized runs) but assert nothing about `roundsServed` or kitchen state
  specifically — they're economy/k proof, not kitchen-pipeline proof.

## Uncovered paths

- **`washerStatus` is never called inside `Game#wash()`** (`engine.ts:663-672` only imports
  `kitchenStatus`/`beerStatus`; `wash()` recomputes its own `slots` from
  `c.upgrades.washer.slots[...]` independently). Not dead code — `washerStatus` is genuinely called
  from `App.tsx:271` for UI render and unit-tested directly (8 call sites in `production.test.ts`) —
  but it is a **second, independent implementation** of washer-capacity math with no shared source of
  truth against `wash()`'s own computation. A future change to one without the other is a real drift
  risk, not a hypothetical one.
- **`Table.roundsServed` has zero direct test assertions** (`grep -rn "roundsServed"
  packages/engine/test apps/web/test` → no hits). The only round-cycle proof is `group.rounds`
  assignment at spawn (`game.test.ts` above, never drives a real repeat loop) plus incidental
  exercise inside long randomized `sim:*` runs, which assert nothing about it.
- **`table_occupied` event has zero references outside its own emit site** (`engine.ts:400`; grep
  confirms no test reads this event name). The nearest test
  (`manual-close.test.ts`'s Chí Phèo case) does **not** exercise this branch through real
  `advance()`/`serve()` ticks — it hand-writes `table.state = 'occupied'` directly, bypassing
  `engine.ts:392-402` entirely.
- **`Result.reason === 'orderNotReady'`** (`engine.ts:862`) is never asserted by string anywhere
  (only the source line and the i18n key `error.orderNotReady` reference it). `kitchen.test.ts`'s
  partial-hot-food test triggers this path but only checks `result.ok === false`.
- **The round-repeat mechanism itself IS exercised end-to-end** (`menu.test.ts`, above) — but
  **`Table.roundsServed` and `Table.state` are never directly asserted** by that test or any other;
  proof is inferred from the same customer appearing under two distinct `orderId`s in `world.serves`,
  not from reading the field/state values themselves. A test asserting `table.roundsServed` and the
  `waiting→consuming→waiting` state sequence directly is still missing.
- The `'locked'` kitchen job state (`kitchen.ts:13`, fires when `!dishUnlocked`) appears structurally
  unreachable in normal play — `order()` only ever assigns already-unlocked dishes and kitchen-level
  unlocks are monotonic. No test exercises this branch; not exhaustively confirmed unreachable via
  save-import-with-downgraded-config edge cases.

## Variants

- **success** — implicit in nearly every kitchen/production test (dish reaches `'ready'`, beer
  poured, glass washed).
- **cancel** — `manual-close.test.ts`'s first test drives `'preparing'|'pending'|'grace'` orders to
  `order.state === 'cancelled'` via `kickAll`; does not separately assert `dish_wasted` by reason name.
- **reason** — `'orderNotReady'` defined but not string-asserted (see Uncovered paths).
- **empty** — kitchen-level-0/no-slots path: `kitchen.test.ts` test 1's `level=0` iteration;
  `kitchen.spec.ts`'s unowned-kitchen-purchasable test.
- **persistence** — `assert.deepEqual(decodeSave(encodeSave(g)).world, w)` repeated across nearly
  every `kitchen.test.ts`/`production.test.ts` test.
- **capacity** — burner slots per level (`kitchen.test.ts` test 1); keg tank capacity
  (`production.test.ts`'s tank-assembly and 40-serving tests); washer capacity
  (`production.test.ts`'s wash-batch test); pan/`portionsPerPan` cap (`economy2.test.ts:31`).
- **duplicate/idempotent** — `production.test.ts`'s first test sends the same `serve` command twice
  and asserts `assert.deepEqual(w, after)`.
- **stale** — `kitchen.test.ts`'s partial-hot-food test explicitly asserts `served.outcome ===
  'stale'`.
- **time-jump** — `kitchen.test.ts`'s deadline test compares fine 100ms-step advance vs one large
  jump, asserting identical resulting world state.
- **offline/reconnect** — not directly covered here (true network disconnect/reconnect is
  `disconnection.test.ts`'s scope, not this file's). The pause analog IS covered: the same
  `kitchen.test.ts` deadline test pauses via `{type:'activity', active:false}`, jumps 86,400,000ms,
  and asserts `kitchenStatus` is frozen identical; `production.test.ts` has the equivalent for
  beer-batch/washer progress.

## Gotchas

- `washerStatus`/`wash()` duplicate-logic finding above is a real risk, not dead code — flag it on
  any change to washer capacity math.
- `beerStatus.pouring` (`production.ts:10`) scans **all** tables' order items regardless of order
  state, while `beerStatus.reserved` (`:7-8`) filters to `['pending','grace']` orders only — an
  asymmetry to watch if reusing `pouring` assuming the same scope as `reserved`.
- No literal `AWAITING_SERVE` table state exists in code — see Observable contract.
- `apps/web/src/i18n/vi.json:33` `"error.orderGone": "Đợt gọi này đã kết thúc."` confirms "đợt gọi"
  (round/order-batch) is the game's own vocabulary, matching 03-SPEC's terminology even though the
  TS state names diverge from it.
- Kitchen level-indexed arrays (`docs/config/economy.tbh.json:743-776`) are aligned 0-4:
  `slots=[0,1,2,2,3]`, `prepMult=[null,1.0,0.9,0.8,0.7]`, `portionsPerPan=[0,2,2,3,3]`.
- All rules-version gates relevant here (`MENU_RULES=14`, `BATCH_RULES=18`, `ECONOMY_RULES=21`) sit
  well below the current max (`RulesVersion=24`) — on a freshly-created `Game`, the batched
  kitchen-pan/keg-batch behavior described above is simply current default behavior, not an opt-in
  legacy branch.

## Related

[table-lifecycle](table-lifecycle.md) (`Table.state` machine and `roundsServed`/`group.rounds` gate
the `consuming→waiting` reorder transition), [serve-outcomes](serve-outcomes.md) (`serve` is the sole
consumer of "is the tray ready"), [glass-beer-flat](glass-beer-flat.md) (`beerStatus`, glass state
machine, and `prepare()`'s `needsGlass` branch are the beer half of this same pipeline),
[economy-k-ledger](economy-k-ledger.md) — **not** "round count multiplies the ticket denominator
feeding `kValue`": `serveValueStats` (`menu.ts:5-12`) computes `kValue` from `mean = total /
served` where `served = serves.length` is the **per-customer** `ServeRecord` count, one row per
customer per round; `avgTicket` is the separate figure computed from `orders = new
Set(serves.map(s=>s.orderId)).size` (the unique-order/round count). More rounds add more
independent per-customer samples to `served` — that doesn't systematically move `kValue`, only
`avgTicket` (order-sized ticket) is order-count-sensitive.
