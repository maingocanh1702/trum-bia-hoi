# Serve outcomes (03-SPEC-he-ban.md §9 "Serve race & grace window")

## Why the code has 5 outcomes, not the spec's 4

`Result.outcome` (`packages/engine/src/types.ts:126`) is literally `'early' | 'late' | 'grace' |
'expired' | 'stale'` — five values. 03-SPEC §9.3's "Bốn kết cục" table (lines 222-228) isn't wrong,
it describes 4 timing buckets on the **patience clock alone**; §9.4 then adds freshness as a
cross-cutting second axis with a no-stacking/worst-reason-wins rule. **The engine reifies that
cross-cutting rule as its own top-priority enum value** rather than a boolean flag beside a timing
tag — that reification is the 5th value, `'stale'`.

Exact logic, `engine.ts:887`:
```
const outcome = anyStale ? 'stale' : grace ? 'grace' : (early-ratio check) ? 'early' : 'late';
```
`anyStale` (OR'd across every customer in the order, `:879`) is checked **first**, before `grace`
(`o.state === 'grace'`) and before early/late — so `'stale'` unconditionally overrides the others,
never adds to them. `'expired'` sits outside this ternary entirely: it's produced only by the
early-return at `engine.ts:860` (`if (o.state === 'expired') return {ok:false,
reason:'orderExpired', outcome:'expired'}`), which fires *before* staleness is ever computed — a
hard-expired order structurally can never also be tagged `'stale'`. This matches §9.4's severity
ranking ("mất cụm > cốc hết hơi") by construction, not by an explicit comparison.

Confirmed behaviourally: `packages/engine/test/game.test.ts:77` sends a serve at a tick where the
order is still `'pending'` (would be `'late'`) but the glass is flat, and asserts `outcome:'stale'`
(not `'late'`), the late-tier `amount` (not the early-tier tip amount), and exactly one −1 reputation
delta — nothing stacks. `apps/web/test/game.spec.ts:169-172` treats `{early,late,grace,stale}` as 4
sibling "you got paid" outcomes in one parameterized loop, with `'expired'` handled by a completely
separate UI path (a different toast class, no `outcome.expired` i18n key exists — `'expired'` uses
`loss.aria` instead).

Two secondary naming drifts worth knowing when reading the spec: the spec's `grace_leaving` is
literally `'grace'` in code everywhere (`Order.state`, `types.ts:10`); and the spec's "preparing"
lives on `Item.state` (`types.ts:5`), not `Order.state` — `Order.state` has no `'preparing'` value at
all, but does have `'cancelled'` (kickAll only, no row in §9.3's table since it's an operator
dismissal, not a tap-serve outcome).

## Observable contract

- `Order` (`types.ts:8-11`): `{id, placedAt, patienceMs, items, state: 'pending'|'grace'|'served'|
  'expired'|'cancelled', readyEmitted}`.
- `ServeRecord` (`:23-27`): `{t, customerId, customerType, orderId, dishes, payment, tip, credited,
  hadMoi, stale, patienceRatio, wellRestedBonus?}` — the per-customer proof record pushed at
  `engine.ts:883`.
- `Result` (`:126`): `{ok, reason?, outcome?: 'early'|'late'|'grace'|'expired'|'stale', amount?}`.
- Events: `order_grace` (`:389`), `glass_stale` (`:383`), `order_served` (`:891`, `{tableId, orderId,
  outcome, amount, tipped}` — the **only** place `outcome` reaches the event stream, and only ever
  `'early'|'late'|'grace'|'stale'`, never `'expired'` since that branch returns before emitting),
  `customer_served` (`:884`, per-customer `{customerId, type, payment, tip, stale}`), `order_expired`
  (`:512`, `{tableId, orderId, penalty, reputation, count}`, fired once per lost cluster from
  `lose()`).
- Config: `tip.patienceThreshold: 0.6` (the "≥60%" boundary), `tip.graceForcedPatienceRatio: 0.1`
  (the "ép ≈10%" grace ratio), `reputation.staleGlass:-1`/`serveWithTip:3`/`serveNoTip:1`/
  `customerLeft:-5`; `reputation.combineRule` is a config comment that literally documents §9.4's
  rule. **The real VIP ×10 path is `customerTypes.vip.tipMult`/`leavePenaltyMult`** (`rules.ts:79,82`)
  — `tip.vipMult`/`penalty.vipMult` also exist in the JSON but are dead (zero reads anywhere), don't
  cite them as the mechanism.
- DOM/aria (`apps/web/src/App.tsx`): gain toast (`:397-398`) — `role="status"
  aria-label={toast.text}` wrapping `aria-hidden` emoji+amount (sighted users see icon+number only;
  screen readers get the full localized sentence). Loss toast similarly wraps two `aria-hidden` spans
  behind `aria-label={t('loss.aria', {...})}`. Toast `kind` is computed straight from the event's
  `outcome` field (`:157`). i18n has `outcome.early|late|grace|stale|earlyNoTip` — **no
  `outcome.expired` key**, expired uses `loss.aria` instead. Reaction emoji
  (`apps/web/src/assets.tsx:18`): `{early:'🤩', earlyNoTip:'🙂', late:'😐', grace:'😥', stale:'😖'}`.
  Table visuals: `.is-urgent` (order in `'grace'`), `.patience-track.is-low` (below
  `tip.patienceThreshold`).

## How to reach it

- Command: `{type:'serve', tableId, orderId}` (`types.ts:101`), validated `engine.ts:1084`.
- Exact `advance()` sequences to produce each outcome (from the real fixture
  `apps/web/test/fixtures/service-states.ts`, which deliberately pins freshness huge for
  `late`/`grace` modes so the two clocks don't cross-contaminate):
  - **early**: advance to spawn+seating, then in small steps until every item `'ready'`, serve
    immediately.
  - **late**: `advance(placedAt + ceil(patienceMs * (1 - patienceThreshold/2)))` — lands at 70%
    elapsed (ratio 0.3 < 0.6), order still `'pending'`.
  - **grace**: `advance(placedAt + patienceMs + 100)` — 100ms past the patience deadline, order
    already `'grace'`.
  - **stale**: `advance(max(item.readyAt for glass items) + freshnessMs(...))` — patience untouched,
    only the freshness clock is pushed past deadline.
  - **expired**: advance to `placedAt + patienceMs + graceMs` (exact `>=` boundary), then attempt
    `serve` → fails; or serve directly on an already-`'expired'` order for `{ok:false,
    reason:'orderExpired', outcome:'expired'}`.
  - **rested** (a modifier, not its own outcome): advance past `wellRested.requiresRestHours` before
    starting the shift, then serve early — exercises `wellRestedBonus()` stacking on any outcome.
- UI taps by aria name (`game.spec.ts`): `'Mở ca'` → `'Xem mâm · bàn 1'` →
  `'Phục vụ cả mâm'` (disabled until `o.items.every(i.state==='ready')`) → `'Đóng'`.

## Existing proof

- `packages/engine/test/game.test.ts`: `'first guest gets one customer and one beer, with auto pour,
  a single serve and auto wash'` (`outcome:'early'`), `'late service keeps payment, loses tip, and
  does not fine the group'` (`outcome:'late'`), `'grace rescues the whole table; exact grace end
  expires and charges only once'` (`outcome:'grace'`, exact-boundary expiry), `'flat beer keeps
  payment and has only one reputation penalty even when late'` (`outcome:'stale'`, the
  stale-overrides-late proof), `'retries cannot duplicate serving money or replay an old order
  against a new group'` (idempotency), `'daily cap counts only actual gameplay credit, and
  spending/reward cannot inflate ranking'`, `'small ticks and a large time jump produce identical
  autonomous events/state'`, `'local save reload exactly replays the running order, finances and
  glass ownership'`, `'loss feedback reports actual clamped coins and reputation once per expired
  table'`.
- `packages/engine/test/economy2.test.ts` — `'an expired order waiting for table cleanup no longer
  reserves the last side dish'`.
- `packages/engine/test/kitchen.test.ts` — `'expired preparing food is wasted once without refund,
  and pending stock was never consumed'`, `'a partial hot-food order is refused and its whole ready
  mâm can still be served with stale beer'`.
- `packages/engine/test/menu.test.ts` — `'expired food is wasted once with a reason, while
  never-stocked hot orders count as ordered but not wasted'`, `'genuine rules13 queued, expired and
  served histories remain exact; only the observed current portion is reportable'`.
- `packages/engine/test/quests.test.ts` — `'stale beer does not satisfy fresh beer or tip quality,
  and blocked claims never mutate balances'`.
- `packages/engine/test/manual-close.test.ts` — `'close quote reuses VIP and rush pricing, and only a
  remaining Chi Pheo occupies a finished mixed table'` (VIP+rush via the same `customerValue`
  formula as `lose()`), `'expired guests are never charged twice and a lower current fee stays within
  the confirmed maximum'`.
- `apps/web/test/game.spec.ts`: `` `guest serves, reloads, opens paused sheets and switches locale at
  ${viewport}` `` (toast-gain accessible-name assertion), `'a neglected first shift closes after
  remaining guests expire and shows the numbers of the loss with exactly one reason'` (`.toast-loss` + accessible name
  regex + its single `.loss-reason` "Chờ lâu quá"; since 2026-10-19 the toast names one reason, PLAN P3), `'tapped order stays live, returns keyboard focus, and closes on customer expiry'`, `'mixed
  customers retain their urgent identity and a live grace countdown when beer is out'`, `` `multi-dish
  service shows the actual ${mode} reward and guest reaction` `` (mode ∈ `early|late|grace|stale` —
  **the direct taxonomy proof**: `toMatchObject({ok:true, outcome:mode})`), `` `well-rested timer
  pauses offline and actual bonus appears in the shift book at ${width}px` `` (mode `'rested'`),
  `'hidden and offline time preserves the current order and remaining shift'`, `'a pending shipper
  blocks paid closure and expires with a numeric-only penalty'` (shipper reuses the same
  `.toast-loss` mechanism).
- `apps/web/test/kitchen.spec.ts` — `'kitchen warning disappears after real expiry and never leaves a
  stale dish link'`.
- `apps/web/test/bridge.spec.ts` — `'serving a whole table increases economy.coins by exactly that
  serve's coin_gain amount'`: the first UI-tier serve proof driven through `window.__TBH_VERIFY__`
  instead of only DOM text — takes a `tbh.snapshot()` before serving, drives the same `'Phục vụ cả
  mâm'` button as `game.spec.ts`, waits for the real `coin_gain` domain event, then asserts
  `economy.coins` increased by exactly that event's `amount` (not just that a toast appeared). Its
  golden-path selectors are copied verbatim from `game.spec.ts` (see the file's own header comment),
  so this adds event/state-level proof on top of the existing DOM-only citation above, it doesn't
  replace it.
- Fixtures: `apps/web/test/fixtures/service-states.ts` (modes `early|late|grace|stale|rested`, real
  engine commands); `apps/web/test/fixtures/mixed-grace.ts` — **name is misleading for this feature**,
  it reaches `'grace'` via a beer-stockout (items never ready), not via the freshness clock, so its
  only consumer (`game.spec.ts`'s "beer is out" test) is a countdown-display test, not a
  serve-outcome test.

## Verification procedure

- `node --import tsx --test packages/engine/test/game.test.ts` (or `npm test` for the full suite —
  bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/game.spec.ts apps/web/test/bridge.spec.ts` (or `npm run test:e2e`).
- `npm run check:config` before touching any of `patienceThreshold`, `graceForcedPatienceRatio`,
  `staleGlass`, `customerTypes.vip.tipMult`/`leavePenaltyMult` in `docs/config/economy.tbh.json`.
- Manual fixture reproduction: `node --import tsx apps/web/test/fixtures/service-states.ts
  <early|late|grace|stale|rested>` prints the exact result JSON the e2e loop consumes.

## Uncovered paths

- **No test combines `'grace'` state with a stale glass simultaneously** — the "even when late"
  combo pairs stale with `'pending'`-state lateness only; `service-states.ts` deliberately isolates
  the two clocks. `anyStale`-before-`grace` precedence is exercised for stale+late but not
  stale+grace specifically.
- **No test asserts the VIP ×10 tip multiplier inside an actual successful `serve`.**
  `customerTypes.vip.tipMult` is exercised for the *penalty* side (`manual-close.test.ts`) but no
  test reads a serve `amount`/tip for a VIP customer to confirm the tip-side multiplier fires.
- **No test asserts reputation stays single-deducted when an order is both hard-expired and had a
  stale glass** — structurally guaranteed (`lose()` never reads staleness), not test-asserted.
- **`tip.vipMult`/`penalty.vipMult` are dead config** — zero references in any source file; no test
  can or does cover them.
- **`'cancelled'` (kickAll) has no test cross-referencing it against the 5-value `outcome` union** —
  tested only as a `kickAllQuote`/penalty consumer, not as a variant of the serve-outcome contract.

## Variants

- **success** — `outcome ∈ {early,late,grace,stale}` all return `ok:true`.
- **cancel** — a different mechanism: `Order.state='cancelled'` only via `kickAll`, not tap-serve;
  not a row in the `outcome` union.
- **reason** — `'orderGone'`, `'orderNotReady'`, `'serveCooldown'`, `'rewardOverflow'` (all via the
  bare `fail()` helper, no `outcome`), plus the hand-built `'orderExpired'` (the only reason that also
  carries `outcome`).
- **empty** — not a distinct path; a table with no assigned order collapses into `'orderGone'`.
- **persistence** — save-reload round-trips the running order/finances/glass ownership; offline
  day-jump preserves rested-badge state.
- **capacity** — not applicable to the outcome taxonomy itself.
- **duplicate/idempotent** — `game.test.ts`'s retry test, exact idempotency-key replay guard.
- **stale** — see the discrepancy-resolution section above; extensively covered.
- **time-jump** — determinism of pending→grace→expired under large `advance()` jumps.
- **offline-reconnect** — browser-tab offline/visibility for an active order is covered
  (`game.spec.ts`'s hidden/offline test). **Don't conflate with `disconnection.test.ts`'s "grace"
  hits** — those are `network.reconnectGraceMs` (a network-drop grace), a different config value from
  `patience.graceMs` (the order patience/freshness grace covered here).

## Gotchas

- `'stale'` overrides, it never combines — see the discrepancy section.
- `anyStale`/`anyTip`/`anyEarly` are OR'd across **every** customer in the order (`engine.ts:879-880`)
  — one flat glass in a multi-customer order taints the whole order's `outcome` to `'stale'`, even if
  other customers' beers were fine. Matches §9.5's "one aggregate pill per Order."
  `fail()` (`engine.ts:739`) never sets `outcome` — only the two hand-built returns in `case 'serve'`
  (`:892` success, `:860` expired) carry it.
- Sighted UI shows icon+number only; the full sentence lives in `aria-label`/`role="status"` — matches
  §9.5's requirement exactly, verify both when touching a toast.

## Related

[table-lifecycle](table-lifecycle.md) (`Table.state` driven by outcomes: success→`'consuming'`,
expiry→`clean()` via `lose()`), [order-rounds-kitchen](order-rounds-kitchen.md) (`Item.state`
lifecycle, `waste()`), [glass-beer-flat](glass-beer-flat.md) (the literal source of the `stale`
computation this file's precedence rule consumes), [economy-k-ledger](economy-k-ledger.md) (every
outcome's `amount` flows through `credit()`/`creditBatchSafe()`; `rewardOverflow` is a
`serve`-specific failure gated on it).
