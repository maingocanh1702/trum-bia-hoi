# Table lifecycle (03-SPEC-he-ban.md §1-§9)

**Spec vs. code diverge — code is ground truth.** 03-SPEC's `Table`/`Order`/`Customer` TypeScript
sketches (§1) are aspirational design, not what shipped. Trust `packages/engine/src/types.ts` over
the spec's blocks:

| Spec sketch (§1) | Actual code (`types.ts`) |
|---|---|
| `Table.state: 'EMPTY'\|'SEATING'\|'ORDERING'\|'AWAITING_SERVE'\|'CONSUMING'\|'PAYING'\|'CLEANING'` | `'empty'\|'seating'\|'waiting'\|'consuming'\|'occupied'\|'cleaning'\|'broken'` (`:16`, lowercase) — `ORDERING`+`AWAITING_SERVE` collapse into one `'waiting'` state; `PAYING` doesn't exist as a stored state (see Gotchas); `'occupied'` and `'broken'` were added — the first matches spec intent (§8's Chí Phèo case), the second is reserved for a *different, later* doc than 03-SPEC (see Uncovered paths). |
| `Table{seats, orders: Order[], variant, groupTimer?}` | `Table{group: Group\|null, order: Order\|null (singular), until, roundsServed}` (`:14-18`) — no `variant` field anywhere. |
| `Order.state: 'pending'\|'preparing'\|'grace_leaving'\|'served'\|'expired'` | `'pending'\|'grace'\|'served'\|'expired'\|'cancelled'` (`:10`) — no `'preparing'` on Order (tracked per-`Item` instead), `grace_leaving`→`'grace'`, added `'cancelled'` (kickAll only). |
| `Customer{state: CustomerState, tableId, seatIndex, ...}` | `Customer{id, type, patienceMs, enjoyMs}` (`:3`) — **no state field at all**; §3's `ARRIVING→SEATED→…→LEFT` machine has no code counterpart, "state" is entirely implicit in which array (`table.group`, `world.queue`) holds the customer. |

## Observable contract

- `World.tables: Table[]` (`types.ts:14-18`): `{id, level, capacity, state, group, order, until,
  roundsServed}`. `World.queue: Group[]`.
- `Table.state` literal values: `'empty' | 'seating' | 'waiting' | 'consuming' | 'occupied' |
  'cleaning' | 'broken'`. `Order.state`: `'pending' | 'grace' | 'served' | 'expired' | 'cancelled'`.
  `Item.state`: `'pending' | 'preparing' | 'ready' | 'served' | 'wasted'` (`types.ts:5`).
- `Result.outcome` (`types.ts:126`): `'early' | 'late' | 'grace' | 'expired' | 'stale'` — returned
  only by `serve`/`serveDelivery`. Don't confuse with `Order.state==='grace'` (the order currently
  sitting in the grace window, unserved) — `outcome:'grace'` is "served during grace", a different
  thing that happens to share a name.
- Events: `group_seated` (`engine.ts:536`), `order_placed` (`:604`), `order_grace` (`:389`),
  `order_expired` (`:512`), `order_served` (`:891`), `table_occupied` (`:400`), `table_cleaning`
  (`:496`), `table_cleaned` (`:406`), `dish_wasted` (`:520`), `customer_dismissed` (`:838`),
  `guests_dismissed` (`:847`), `queue_overflow` (`:567`), `customer_spawned` (`:570`).
- DOM: `apps/web/src/App.tsx:302` — table class is literally `` `table-${index} state-${table.state}` ``,
  i.e. `state-empty`/`state-seating`/`state-waiting`/`state-consuming`/`state-occupied`/
  `state-cleaning`/`state-broken` map 1:1 to `Table.state`; `is-urgent` when the order is in
  `'grace'`. Seats render `.seat` / `.seat-customer[data-customer-id]` / `.seat-empty`.
- ARIA: table trigger `aria-label="Xem mâm · bàn {n}"` (i18n `order.details`); order dialog
  `role=dialog aria-label="Bàn {n}"`; serve button text `"Phục vụ cả mâm"`, wired at `App.tsx:487` to
  `run({type:'serve', tableId, orderId})`, `disabled={!ready}`.

- **Rules 28 seat model (S1):** `Table.capacity` is the chair count (1–2). Buying a table or a chair never needs an empty table; the seated group keeps the chairs it sat down with in `Group.seats` (set in `seatQueue` on seat-model shifts) and orders that tray for every round, so a new chair serves the next group. D2: the first opening that pins a seat-model snapshot over a capacity save keeps the first `tableSlots` tables at `min(2, seats)` and emits `seat_model_adopted` once (see [save-replay-local](save-replay-local.md)).

## How to reach it

Engine commands (`Command` union, `types.ts:97-121`; handlers in `engine.ts`'s `execute()` switch):
- `{type:'serve', tableId, orderId}` — `case 'serve':` (`engine.ts:856-893`). Gate at **862**:
  `if (!o.items.every(i => i.state === 'ready')) return fail('orderNotReady')` — the whole-order-serve
  rule. Success (`:888-889`): `o.state='served'`, items→`'served'`, `t.roundsServed++`,
  `t.state='consuming'`, `t.until=now+max(enjoyMs)`.
- `{type:'endShift'}` — `case 'endShift':` (`:824-826`): sets `w.phase='closing'`, touches **no**
  table — this is the "closing grace" 03-SPEC §8 describes; `AWAITING_SERVE`(`'waiting'`) tables keep
  living normally, order deadlines still apply.
- `{type:'kickAll', shiftId, maxCost}` — `case 'kickAll':` (`:827-855`): quotes a fee
  (`kickAllQuote`, `rules.ts:92-100`), spends coins, then **unconditionally and immediately**
  cancels every `pending`/`grace` order (`:841`, `order.state='cancelled'`) and cleans every table
  with guests (`:844`) — a distinct, opposite-philosophy operation from `endShift`, don't conflate
  "closing the shift" with "kicking everyone out now."
- `{type:'upgradeTable'}`/`{type:'buyTable'}` (`:1005-1053`) — affect `capacity`/`level`, not
  lifecycle state; `upgradeTable` independently refuses a non-`'empty'` table (`reason:'tableBusy'`,
  `:1008`) — a second enforcement point for "don't touch a busy table."
- No player command exists for "seat a group" or "place an order" — both are **autonomous**, driven
  by `processDue()` on every `command()`/`advance()` tick, not by a `Command`.

Autonomous transitions (`processDue()`, `engine.ts:345-445`):
- `seatQueue()` (`:529-538`): assigns the smallest table with `state==='empty' && capacity >=
  group.size` to a queued group (`:531`). **This `state==='empty'` filter is the entire "one table =
  one group" enforcement** — no other code path assigns a group to an occupied table.
- Tick loop (`:387-408`), when `t.until` elapses: `'seating'` → `order(t)` builds the `Order` and
  jumps straight to **`'waiting'`** (`:393,602-603` — spec's `ORDERING` is not a stored state, it's
  this one synchronous step). `'consuming'` (post-serve dwell) → `releaseGlasses(t)`, then: if
  `roundsServed < group.rounds` → `order(t)` again (the "lai rai" repeat-round loop, `:396`); else if
  a `chipheo` customer remains → **`t.state='occupied'`**, `t.until` = that customer's own patience
  deadline (`:397-401`, event `table_occupied`); else `clean(t)`. `'occupied'` → `clean(t)` once that
  deadline elapses (`:403`). `'cleaning'` → reset to `'empty'`, clear `group/order/until/roundsServed`
  (`:404-407`).
- Order patience: `pending`→`grace` at `placedAt+patienceMs` (`:388-389`); `grace`→`expired` at
  `+graceMs` more (`:391,509`), then `waste()`+`clean(t)`.
- Overflow (`:566-567`): `queue.length >= queueSlots(...) && no empty table fits` → rejected, emits
  `queue_overflow`. `queueSlots` (`rules.ts:29-31`) = `queueBaseSlots + floor(Σcapacity /
  queueSeatsPerSlot)` — config values `2`/`3` (`economy.tbh.json:1766-1767`) match 03-SPEC's `2 +
  ⌊totalSeats/3⌋` exactly.
- `currentGuests(table)` (`rules.ts:85-90`) **throws** (`state:tableOrder`/`state:tableGroup`) on
  malformed table state — a guarded invariant, not a soft filter.

UI (local & remote identical): tap `Xem mâm · bàn N` → order dialog `Bàn N` → `Phục vụ cả mâm`
(disabled until every item is ready) → `{type:'serve', ...}`. Manual close: `Sổ ca` → `Mời tất cả về
· {cost} xu` → confirm `Trả {cost} xu và đóng ca` (or defer via `Đợi khách dùng xong`) →
`{type:'kickAll', ...}`. Local mode dispatches `game.command()` in-browser (`local.ts:57-58`); remote
mode journals the same envelope and POSTs to `/api/player/command`; the server imports the same
`@tbh/engine` package (`http.ts:5`) — no divergent table/order logic server-side, only
sequencing/idempotency/session wrapping.

## Existing proof

- `packages/engine/test/game.test.ts` (table-relevant, of 24 total): `'first guest gets one customer
  and one beer, with auto pour, a single serve and auto wash'`, `'late service keeps payment, loses
  tip, and does not fine the group'`, `'grace rescues the whole table; exact grace end expires and
  charges only once'`, `'flat beer keeps payment and has only one reputation penalty even when
  late'`, `'retries cannot duplicate serving money or replay an old order against a new group'`,
  `'loss feedback reports actual clamped coins and reputation once per expired table'`, `'a patient
  guest beside a hurried guest keeps their own tip clock (03-SPEC section 4)'`, `'custom normal, VIP,
  hurried and leisurely round ranges reach spawned groups'` (round **assignment** only, not the
  repeat-loop execution), `'queued groups leave exactly at patience, without the seated-order
  grace'`, `'an early zero-tip guest keeps reputation when manually dismissed, with only the explicit
  close fee'`, `'hidden time freezes pending orders and freshness while preserving real calendar
  time and replay'`, `'mixed-group round precedence survives hurried nonconstant sampling'` (round
  assignment only).
- `packages/engine/test/kitchen.test.ts:90` — `'a partial hot-food order is refused and its whole
  ready mâm can still be served with stale beer'` — direct proof of the whole-order-serve gate.
- `packages/engine/test/manual-close.test.ts` (all 8, kickAll/table-related): `'manual close charges
  every assigned order once, including consuming guests, without abandonment penalties'`, `'close
  quote reuses VIP and rush pricing, and only a remaining Chi Pheo occupies a finished mixed table'`
  (hand-sets `table.state='occupied'` rather than driving the organic transition — see Uncovered),
  `'quoting unassigned queue and seating guests is pure, costs zero and never invents orders'`,
  `'insufficient funds and invalid or stale confirmation fail before debiting or dismissing
  guests'`, `'expired guests are never charged twice and a lower current fee stays within the
  confirmed maximum'`, `'a damaged active table cannot silently become a zero-cost dismissal'` (not a
  `'broken'`-state test — sets `table.order=null`, asserts the `currentGuests` invariant throws),
  `'the actual v3 close save retains its free served-table dismissal, results and event
  identifiers'`, `'a new group between quote and confirmation cannot raise the approved fee
  silently'`.
- `packages/engine/test/economy2.test.ts:132` — `'an expired order waiting for table cleanup no
  longer reserves the last side dish'` — constructs the `'cleaning'` boundary directly.
- `packages/engine/test/live-upgrades.test.ts:8` — `'a real saved v16 paused shift keeps its old
  refusals but upgrades every device and an empty table without closing'` — asserts `upgradeTable` on
  a busy table fails `reason:'tableBusy'`.
- Web fixture generators: `apps/web/test/fixtures/service-states.ts` (real replayed saves for
  `early|late|grace|stale|rested` serve outcomes), `apps/web/test/fixtures/mixed-grace.ts` (mixed
  `thuong`+`voi` group order in `Order.state==='grace'`), `apps/web/test/fixtures/manual-close.ts`
  (`poor`/`occupied` modes — `occupied` is the **only place the organic Chí Phèo `'occupied'`
  transition is exercised** via `advance()`, not manual field assignment). No such fixture exists
  under `packages/engine/test/fixtures/` for table states.
- `apps/web/test/game.spec.ts` (table-relevant, of 22 total): `` `guest serves, reloads, opens paused
  sheets and switches locale at ${viewport}` `` (×4 viewports), `'tapped order stays live, returns
  keyboard focus, and closes on customer expiry'`, `'mixed customers retain their urgent identity
  and a live grace countdown when beer is out'`, `` `multi-dish service shows the actual ${mode}
  reward and guest reaction` `` (modes `early|late|grace|stale`), `'hidden and offline time preserves
  the current order and remaining shift'`, `` `manual close shows its fee, allows cancellation and
  debits consuming guests once at ${viewport}px` `` (×2), `'insufficient close funds keep the guest
  paused until choosing to wait, then natural expiry charges no second fee'`, `'a mixed occupied
  table renders only the remaining Chi Pheo and closes with zero fee'`.
- Server transport (idempotency/sequencing over `serve`/`kickAll`, not new state-machine claims):
  `apps/server/test/client-sequence.test.ts` (`'response loss after serving survives process cache
  loss, ordered retries and another tab without paying twice'`; `'gaps and altered retries do not
  consume sequence...'` — contains the repo's only `reason:'orderGone'` assertion), `apps/server/test/
  checkpoint.test.ts` (`'checkpoint failure rolls back money, appended history, revision and cache;
  the original command succeeds once after recovery'`), `apps/server/test/http.test.ts` (`'real HTTP
  guests own separate state; serving retries, paused stock purchases and event catch-up survive
  restart'`), `apps/server/test/presence.test.ts` (`'durable loss precedes catch-up; hidden menu
  recovery freezes wait and exact action retries serve only once'`).

- `packages/engine/test/seat-model.test.ts` — `buying tables and a chair while a table is occupied keeps the seated group` (Chi Pheo `occupied`: same group, state and `until`) and `a chair bought mid-visit changes the tray only for the next group, never for the seated one` (three solo rounds, then the next group's pair tray).

## Verification procedure

- `node --import tsx --test packages/engine/test/game.test.ts packages/engine/test/kitchen.test.ts
  packages/engine/test/manual-close.test.ts` (or `npm test` for the full suite — bare `tsx` is not
  guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/game.spec.ts` (or `npm run test:e2e`).
- Config sanity for table timers: `economy.tbh.json` `tableSeatingMs:800`, `tableCleaningMs:1000`,
  `graceMs:2500`.

## Uncovered paths

- **`Table.state==='broken'` is unassigned by any current code path, but it is not dead/removable —
  it's reserved for an owner-deferred mechanic, not an orphan.** Exactly 3 hits repo-wide: the type
  union and two defensive allow-lists (`engine.ts:425`, `rules.ts:86`); the only assignment anywhere
  is `game.test.ts:238`, a test-isolation trick to force a table non-seatable. The real mechanic lives
  in `docs/features/F15-risk-events.md` (Phase 3 risk layer, depends on F18 dog/guard + F23 server —
  not 03-SPEC, which is why the discrepancy table above doesn't find it there): §6 "Drunk fight" —
  "Ignore -> reputation loss and possible table dirty/broken" — and §3 "Gangster" — a lost fight "can
  break tables/chairs". `docs/playable-v0.md` confirms the whole risk layer is owner-deferred and
  hidden from the shipped UI ("M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release... Risk controls
  are hidden in the shipped UI; legacy risk UI is available only in an explicit development test
  preview, `VITE_TBH_RISK_PREVIEW=1`"). Today's only trace of that flag is a UI-only stub,
  `apps/web/src/App.tsx:21` (`showDeferredRisk = import.meta.env.DEV &&
  import.meta.env.VITE_TBH_RISK_PREVIEW === '1'`) — it doesn't touch `Table.state`, confirming F15's
  engine side (including the table-break consequence) isn't built yet. Don't flag `'broken'` as a
  removal candidate; treat it as reserved for F15.
- **`Result.outcome:'expired'`** (the already-expired-order re-tap guard, `engine.ts:860`) is never
  asserted by any test.
- **`reason:'orderNotReady'`/`'orderExpired'` are never asserted by exact string.**
  `kitchen.test.ts:90` triggers the `orderNotReady` path but only checks `result.ok===false`. Only
  `'orderGone'` (server-side, once) and `serveDelivery`'s `'serveCooldown'` are asserted by string.
- **`queue_overflow` is never triggered/asserted in any test** — it appears only in two unrelated
  defensive filter lists, neither test drives the queue full enough to hit `engine.ts:566-567`.
- **The multi-round "lai rai" loop IS exercised end-to-end, but not by name.**
  `packages/engine/test/menu.test.ts`'s `'mâm average stays separate from per-customer k across
  repeated rounds, with no cap or bonus credit in either value'` drives real `advance()`+`serve()`
  service (via the `playMenu()` helper) until the same customer appears under two distinct
  `orderId`s — i.e. the table really did cycle back through `order()` a second time. What's still
  missing: no test directly asserts `table.roundsServed` or the `waiting→consuming→waiting` state
  sequence itself — the two "round ranges"/"round precedence" tests only assert how many rounds a
  group is **assigned** (`group.rounds` sampling), and the repeated-rounds proof above only checks
  the resulting serve records, not the table/state fields.
- **The organic Chí Phèo `'occupied'` transition has no direct engine-layer unit test** — only the
  manual-field-assignment version (`manual-close.test.ts:43`) plus one layer removed via the web
  fixture (`manual-close.ts` `occupied` mode) consumed by `game.spec.ts`'s Chí Phèo UI test.
- **Table-capacity-vs-group-size fit boundary** and **"one table = one group" with a spare-seat
  occupied table present** have no dedicated tests — both are structurally guaranteed by
  `seatQueue()`'s `state==='empty'` filter, not behaviorally pinned.

## Variants

- **success** — `game.test.ts`'s first-guest test; multi-dish `early` (`game.spec.ts`).
- **cancel** — `kickAll` → `order.state='cancelled'` + waste (`manual-close.test.ts`, `game.spec.ts`
  manual-close UI test).
- **reason** — `'tableBusy'`, `'orderGone'` (server), `'shiftChanged'`/`'closeCostChanged'`/
  `'notEnoughCoins'` all proved; `'orderNotReady'`/`'orderExpired'` not proved by string (Uncovered).
- **empty** — `Table.state==='empty'` pervasively asserted (DOM class, `live-upgrades.test.ts`).
- **persistence** — `decodeSave(encodeSave(g))` round-trips against table/order state throughout.
- **capacity** — only indirect (capacity used to force a group size), no dedicated boundary test.
- **duplicate/idempotent** — `game.test.ts`'s retry test; `manual-close.test.ts`'s duplicate-envelope
  send.
- **stale** — serve outcome `'stale'` (`game.test.ts`, `kitchen.test.ts`, `game.spec.ts`).
- **time-jump** — `game.test.ts`'s fine-vs-coarse-stepping test exercises the full table tick loop
  under both.
- **offline-reconnect** — `game.test.ts`'s hidden-time test and `game.spec.ts`'s offline-time test
  freeze table/order state correctly across a hidden/offline gap. True server-side reconnect is a
  distinct feature area (see Related).

## Gotchas

- The whole-table-serve gate is `engine.ts:862` (`every(i.state==='ready')`), six lines below the
  `case 'serve': {` line itself — cite the check, not the case label.
- Spec's `ORDERING`/`PAYING` don't exist as stored `Table.state` values — both are instantaneous
  (`order()` builds the Order AND jumps to `'waiting'`; `serve` pays AND jumps to `'consuming'` in the
  same step). A doc claiming "table transitions to PAYING" won't find matching code.
- `kickAll` (paid, immediate) and `endShift` (free, lets `'waiting'` tables finish naturally) are
  opposite-philosophy operations that both eventually reach `phase==='resting'` — don't conflate them.
- `currentGuests()` throws on malformed state; `manual-close.test.ts` exploits this deliberately to
  test the guard itself.

## Related

[order-rounds-kitchen](order-rounds-kitchen.md) (`Item.state`/prep timing, independent of
`Table.state`), [serve-outcomes](serve-outcomes.md) (the `early/late/grace/stale` computation
consumed by `case 'serve':`), [glass-beer-flat](glass-beer-flat.md) (`Glass.state`, freshness clock,
`releaseGlasses` on table clean), [economy-k-ledger](economy-k-ledger.md) (`credit`/`penalize`/`spend`
handle all money movement triggered by table transitions).

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: purchases never need an empty table; `Group.seats` keeps the seated tray; tests cited. |
| 2026-10-20 | S3: `queueSlots` = `queueBaseSlots + ⌊seats / queueSeatsPerSlot⌋` reads the pinned snapshot: 1 and 8 on JSON 2.0.22 (one chair queues one group, eight chairs two), 2 and 3 on capacity pins and pins ≤ 2.0.21. A full queue turns the arrival away (`queue_overflow{reason:'full'}`) with no coins, reputation or `lost`: `packages/engine/test/capacity-demand.test.ts` `D12: a group turned away because the door queue is full …` and `queue slots are queueBaseSlots + floor(seats / queueSeatsPerSlot) …`. The old "`queue_overflow` is never asserted in any test" gap closed with S1's `seat-model.test.ts` (noSeat) and S3's (full). |
