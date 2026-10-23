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

- **Founder 2026-10-22, Part B2.8 (the yard fits one screen; 09-SPEC §3.1 settled).** `apps/web/test/one-screen-yard.spec.ts` `` `B2.8 the yard fits one screen: no page scroll, all 8 places whole above the nav, tap targets ≥ 44 px (${mode}) at ${viewport.width}×${viewport.height}` `` (new save / live shift / full alley at 390×844, 360×740, 1280×720: `scrollHeight ≤ innerHeight`, no horizontal scroll, eight places inside the screen and above the sticky nav, every table, empty place, order bubble and nav button ≥ 44 × 44, axe 0) and `` `B2.8 with the quick beer refill prompt up, the eight tables of a busy alley stay whole above the nav at …` `` and `` `B2.8 a hint banner stays whole above the nav, its button uncovered, the eight places whole above it, axe 0, at ${viewport.width}×${viewport.height}` `` (fixtures/hints.ts `slot`: the banner, the closing line and the nav share the sticky bottom dock, so a banner the one-screen page has no room for at 360×740 / 1280×720 stays above the nav with its 44 px button its own and the eight places above it, axe 0; it fails with the old dock-less layout, `.bottom-dock { display: contents }`, as the a11y tier did: target-size on `.guide > button`). Regressions of the first full tier, fixed in b61f4fc and pinned by existing specs: the dog keeps the classic stall (`game.spec.ts` `dog purchase has a reachable stock path, three sprites and exact reload at …`), the reputation button keeps 46 px in the landscape strip (`game.spec.ts` `guest serves, reloads, opens paused sheets and switches locale at 1280×400`), and scrolling to a control stops above the landscape nav (`kitchen.spec.ts` at 1280×400); `apps/web/test/yard.spec.ts` A3 test now also at 844×390 (the sticky landscape nav: review A-r1 F1), the busy alleys on two rows of four (`rows` 2; `linger-rows` lingers row 1 over every open order of row 2). Measurements: the worktree's `autopilot-logs/b2-measure/{before,after}/` (probe `autopilot-logs/probes/b2-measure.spec.ts`). **Second pass (founder 2026-10-23, "Thêm một lượt cho đầu game").** `apps/web/test/one-screen-yard.spec.ts` (rewritten): `` `B2.8 the yard fits one screen: no page scroll, all 8 places whole above the nav, tap targets ≥ 44 px (${state}, ${locale}) at ${viewport.width}×${viewport.height}` `` for new / guide / live / full / prompt / hint / stock hint / closing × vi, en × 390×844, 360×740, 1280×720 (scroll ≤ 1 px, exactly one message in `.message-slot`, all 8 places above the dock with their centres their own, the opening note the one allowed cover on the first screen, targets ≥ 44 px, axe 0); `` `B2.8 a message coming or going never resizes the tables at …` ``; `` `B2.8 a stall with the kitchen scrolls by at most its accepted residual at …` `` (0 / 52 / 65 px). The two first-pass cases (`… with the quick beer refill prompt up …`, `… a hint banner stays whole above the nav …`) are folded into these. Measurement matrix: the worktree's `autopilot-logs/b2-measure/after/` (probe `autopilot-logs/probes/b2-measure.spec.ts`).

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
- **Wave 3 "Mời về" (`kickTable {tableId, maxCost}`, event `table_kicked`)** — `packages/engine/test/kick-table.test.ts`: `only a table whose guests linger after their tray accepts: seating, waiting (pending or in grace), cleaning, empty and an unknown table are refused` (every state driven through real commands; `consuming` and `occupied` accepted), `the price is feeRate x the gross of each guest's latest order x the type's leavePenaltyMult: VIP x10 (a pair with a VIP pays both), the reputation -repPerGuest per guest`, `the latest order prices the kick: a lai rai table in its second round pays for that round, not for the whole visit`, `D3: a Chi Pheo who keeps a table goes home for 0 coins and -2 reputation`, `a price that moved is refused with kickCostChanged before the wallet; a short wallet with notEnoughCoins; neither costs anything`, `idempotent: the same key answers the same result and charges once; another key on the cleaned table is refused`, `the guests are not lost: no customer_left, no -5, no lostStreak; the coins are spent, the table is cleaned and seats the next queued group`, `the reputation never goes below zero: the event records what was really taken`, `kickTableQuote answers what kickTable will, at every sampled moment of two busy shifts: the same refusal, the same price`, `a snapshot without the section refuses kickTable: a capacity pin at rules 28 (an old save) and a copy of the seed without it`, `kickTable is a rules-28 command: the envelope needs a table and a whole maxCost, and replay refuses an entry below rules 28`, `a history that sends tables home replays byte for byte`. UI: `apps/web/test/kick-table.spec.ts` — `Wave 3 Mời về on a lingering table shows its coins and reputation, one tap sends it home and the waiting group sits down (${locale}) at ${viewport.width}px` (vi/en × 390/360/1280: price line from the quote, the button's description, ≥ 44 px, in view, axe 0, one tap → one `kickTable`, coins and reputation once, `state-cleaning`, the waiting group seated after `tableCleaningMs`, reload), `Wave 3 a table whose guests wait for their food shows Mời về dimmed with exactly one reason, next to the serve button (${locale}) at ${viewport.width}px`, `Wave 3 a short wallet: the price stays on screen and Mời về is dimmed with "not enough coins" at ${viewport.width}px`, `Wave 3 D3: a Chi Pheo who keeps his table goes home for 0 coins and the reputation of one guest`, `Wave 3 a save pinned to the S6 content of JSON 2.1.0 (no kickTable section) offers no Mời về in the shift it is pinned for` (the S6 pin offers none), `Wave 3 in shift 1 Mời về is not shown yet, though the HUD is: it is revealed after one completed shift (JSON 2.1.3, founder 2026-10-22)` (shift 1 offers none, neither in the popover nor as the book's "Mời tất cả về") and `Wave 3 after one completed shift Mời về is on a lingering table: the price line and the button (JSON 2.1.3, founder 2026-10-22)` (both from shift 2; these three replace the `Wave 3 ${why}` loop that PR #32 split), `Wave 3 ${reduce ? 'with' : 'without'} reduced motion: ...` (fixtures `apps/web/test/fixtures/kick-table.ts`: linger · poor · occupied · pin · first · second · inspect, real engine). Server: `apps/server/test/kick-table.test.ts` — `the server sends a lingering table home once per key, at the price of the pinned snapshot, and the result survives a restart`.

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
| 2026-10-20 | S4 `eco21-table-chair-upgrades` (JSON 2.0.23): a group sitting down records the table's level (counted only at two chairs: `Group.level`, else 1) and its chair level (`Group.chairLevel`) and gets the Lv2 round added to `Group.rounds` right there (`seatQueue`); the group at the table is never changed by an upgrade bought during its visit — `packages/engine/test/table-chair-upgrades.test.ts` `a benefit serves the NEXT group: the group already seated keeps its level, its rounds, its chair level and the patience of every later round` and `a table level only works with two chairs: a one-chair table that kept a level (a migrated save) gives its group nothing`. Tables carry `chairLevel?` (written by the first `upgradeChair`); a snapshot without the ladders adds no field to the table or the group. |
| 2026-10-21 | S6 `eco21-ui-assets` (UI only): the yard (`section.yard[data-slots]`) is a grid of every place of the location (`tableSlots(w, c)`: 8 on JSON 2.1.0, `maxTables` 6 on a capacity pin); `.table-space.table-<i>` for a bought table (now `position: relative`, two abreast on a phone, three from a 640 px container; no hand-set positions), `.table-space.table-slot[role=img]` (`yard.slot` "Chỗ đặt bàn còn trống") for each unbought place, no `.seat` inside. Per table: `.table-object[data-level]` with `table-lv<level>-empty`, `.table-space[data-chair-level]`, the `.seat` sprites by `table.chairLevel` (`chairAsset`: chair-plastic / chair-backrest / chair-cushion), `.tray[data-dishes]` with one sprite per dish the level allows (`trayDishes(c, table)`: 1 / 2 / 3; engine `config.ts`, pinned against real orders by `packages/engine/test/tray-dishes.test.ts`), caption `table.seats` · `table.tray` while no group sits. Proof: `apps/web/test/yard.spec.ts` — `S6 a full first alley: eight tables of two chairs fit the yard, each drawn by its table level, chair level and tray, at ${viewport.width}px` ×3 (fixture `fixtures/yard.ts full`: 8 tables, levels 1–4 and chair levels 1–3 spread; 16 seats, sprite src per level, tray counts, every image decoded, no horizontal scroll, every table ≥ 44 px inside the viewport, no two tables overlap, no `[data-spotlight]`, axe 0), `S6 a new shop shows its one table and seven empty places, the tray of a solo table and the plastic stool (${locale}) at 390×844` ×2, `S6 with reduced motion nothing in the yard animates, and the static cues (chairs, tray, empty spots) stay`. Run `npx playwright test apps/web/test/yard.spec.ts`. |
| 2026-10-21 | S6 review round 1: the yard is `section.yard` > `div.yard-door` (the door queue, `.door` as a row at the top of the yard, `position: relative`; it was pinned to the yard's bottom-left, below the fold once eight places were drawn) + `div.yard-grid` (the places, `padding-top: 56px` for the first row's order bubbles, so a bubble never covers `#beer-supply-status` or the door band). Proof: `apps/web/test/first-shift-visual.spec.ts` `P0 the door shows patience rings and a refused group of ${size} says "${label}" at ${viewport.width}px` (×6: the queued guest, its ring, the turned-away guest and its bubble `toBeInViewport({ ratio: 1 })`), `apps/web/test/yard.spec.ts` `S6 on a live shift the order bubble of a first-row table stays below the beer line and the door band, and one thing blinks, at ${viewport.width}px` (×3, fixture `fixtures/yard.ts live`: two one-chair tables, a ready order) and `S6 reduced motion: the live yard animates (the spotlight pulse) without it and not at all with it ...` (running animations > 0, then 0 after `emulateMedia({ reducedMotion: 'reduce' })`). |
| 2026-10-22 | S6 review round 2: a capacity block prints its effect line only while the item still has a price (`App.tsx` `effectLine()`: `goal.effect && goal.cost !== null`), so a full alley no longer reads "+1 chỗ" above the dimmed "Mua thêm bàn" whose one reason is "Quán đã đủ bàn"; `goals.ts` and the chip are untouched. Proof: `apps/web/test/seat-model.spec.ts` `seat model sells tables 2-8, a second chair once four tables stand, each with its price and one reason (${locale}) at ${viewport.width}×${viewport.height}` (vi + en × 3 viewports; `[data-goal="buyTable"] .goal-effect` count 0 on the full alley, the "+1 chỗ" line still shown while a table can be bought). The door draws only the newest refused group since this round (`DoorQueue.tsx`, see onboarding-guide.md / spawn-queue-seating.md). |
| 2026-10-22 | Wave 3 `fun-kick-table` (rules 28, JSON 2.1.0 with the Tier A section `kickTable {feeRate 1.5, repPerGuest 2}`): new command `kickTable {tableId, maxCost}` and event `table_kicked` — a third way out of a visit besides a finished last round and an expired order: a table whose guests linger after their tray (`consuming`, or `occupied` by a Chi Pheo) goes to `cleaning` at once (glasses released), then `empty`, and seats the next queued group; `seating` / `waiting` / `cleaning` / `empty` answer `tableNotLingering`. Price per guest `round(gross of the latest order x feeRate x leavePenaltyMult)` (VIP x10, Chi Pheo 0), `spend` (stats.spent), reputation `-repPerGuest` per guest clamped at 0; not `lost`, no `customer_left`, no -5, no `lostStreak`. Pure quote `kickTableQuote` (rules.ts) beside `kickAllQuote`; the UI reads it. A snapshot without the section (capacity pin, the S5/S6 content of 2.1.0) has no such command (`kickTableUnavailable`). Proof: the Wave 3 line of "Existing proof" above. Run `node --import tsx --test packages/engine/test/kick-table.test.ts apps/server/test/kick-table.test.ts` and `npx playwright test apps/web/test/kick-table.spec.ts`. |
| 2026-10-22 | Stage 07, review round 1 (W1, W4): on the eight-place yard a row-2+ order bubble (about 55 px with its patience track) covered the caption, state and enjoy countdown of the table above; every row now keeps row 1's 56 px band (`.yard-grid` `row-gap: 31px`, the smallest gap that passes): `apps/web/test/yard.spec.ts` `S6 a busy alley: the order bubbles of every row cover no other table's caption or drawing, at ${viewport.width}px` (fixture `rows`; red on the old CSS and at 24 / 28 / 30 px). Fixture `full` plays one shift so the yard, not the opening note, is on screen (`.opening-note` count 0 asserted). The reduced-motion case cited in the S6 row above carries the name `S6 reduced motion: the live yard animates (the spotlight pulse) without it and not at all with it, while the static cues (chairs, tray, spots) stay` since S6 review round 1. |
| 2026-10-22 | Stage 07, review round 1, second look at W1: the 31 px gap above cleared only tables that wait for their order. A lingering table's caption (guest label, state and the enjoy countdown "Mời về" relies on) hangs 21 px below its space, and a row-2+ bubble still covered it by 10 px (the regenerated kick-table screenshots showed it). `.yard-grid` `row-gap: 49px`, the smallest gap that passes: `apps/web/test/yard.spec.ts` `S6 a busy alley under lingering tables: no order bubble covers the label, state or countdown of the table above, at ${viewport.width}px` (fixture `linger-rows`: "lai rai" pairs sipping their served trays at tables 1-3 and 5-6 right above open orders at tables 4, 7 and 8; red at 31 and 48 px). The rows case above stays green. |
| 2026-10-22 | Stage 07, review round 2: the band claims of the rows above (S6 "never covers the beer line or the door band", round 1 "covers no other table's caption") hold for a ONE-row order bubble over the measured captions (fixtures `rows` / `linger-rows`: Lv1 tables, at most three dish icons, the fallback UI font; 0 px to spare at 49 px); not covered (review 07 r2, recorded, not fixed): a spotlit Lv3+ pair table whose order holds three or more different snacks wraps its bubble into a second row that covers about 25 px of a lingering countdown above (22 px of the door band on row 1; four different snacks wrap even unlit), and a UI font taller than the fallback adds about 2 px; remedy if it shows: a one-row bubble (`flex-wrap: nowrap`, narrower sprites past three icons) and a `linger-rows` variant with Lv3 pair tables. The layout is unchanged (comment-only round). |
| 2026-10-22 | Owner calls of PR #30 (stage 07b): "Mời về" price `kickTable.feeRate` 0.5 (the founder, owner call 1; JSON 2.1.1, rules 28): a guest's kick is `round(gross × 0.5 × leavePenaltyMult)` (VIP 5× his tray, Chi Pheo 0); lingering = `consuming` + `occupied` confirmed (owner call 2, no change). Sealed values: `packages/engine/test/kick-table.test.ts` `the bundled seed carries kickTable {feeRate 0.5, repPerGuest 2} as a Tier A section that k does not scale, under the label 2.1.1` and `the price is feeRate x the gross of each guest's latest order x the type's leavePenaltyMult: VIP x10 (a pair with a VIP pays both), the reputation -repPerGuest per guest` (×0.5); every other case of the file reads the fee from the config and is unchanged. |
| 2026-10-23 | Founder 2026-10-22, Part B2.3: the S6 row's `yard.spec.ts` test "… stays below the beer line and the door band …" is now `S6 on a live shift the order bubble of a first-row table stays below the keg's numbers and the door band, and one thing blinks, at ${viewport.width}px` (the beer line is `sr-only`; the bubble is checked against the keg badge). The order popover has one trait line under the guest type (`customer.trait.<type>`): `apps/web/test/early-labels.spec.ts` `B2.3 the order card says one trait of the guest type under the type (${type}, ${locale}) at 390×844`. |
| 2026-10-23 | Founder 2026-10-22, Part B2.8 (UI only): the yard is four places abreast in two rows on every screen, a size container (`.yard`) whose height is what the HUD and the nav leave; a table is drawn at `--dw × --dh` (registered properties, `reference-layout.css`; the drawing in `cqw` of its table, `art.css`), never under 44 px; the bubble bands stay 56 / 49 / 51 px. `linger-rows` now lingers tables 1-4 over the open orders of 5-8. Proof under Existing proof. |
| 2026-10-23 | Founder 2026-10-23 second pass of B2.8 + review B2-r1 (UI only): one reserved message slot above the nav, compact HUD / stall / nav; captions never wrap (busy-alley tests in vi and en and with a wide font). Proof under Existing proof (B2.8 bullet). |
| 2026-10-23 | Review B2-r2 (UI only): a caption shows a short label (`caption.customer.*`, `caption.table.*`: Lingering, VIP, Hurried, Rowdy, Fans, Sipping, Staying on) where the English one ended in "…"; the full label stays in the caption for screen readers and on the order card (vi keeps its words). Proof: `apps/web/test/yard.spec.ts` `S6 a busy alley under lingering tables: no order bubble covers the label, state or countdown of the table above…` (the full type in the DOM; no caption line cut in the app font, vi and en); the one-screen test title moved (ui-shell-i18n-a11y). |
| 2026-10-24 | Review B2-r3 + Linux CI (UI only): Vietnamese captions get short labels too (`caption.*`: Đại gia, Quậy, Lai rai, Nhâm nhi, Chưa về, Vào bàn, Gọi món, Dọn bàn; English adds Seating), since Linux renders the app font as DejaVu Sans. `apps/web/test/yard.spec.ts` (the lingering busy alley) asserts whole captions in the app and the wide font; `apps/web/test/game.spec.ts` reads the visible "Lai rai" and the full "Bàn lai rai". |
