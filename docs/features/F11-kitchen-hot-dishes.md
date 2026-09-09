# F11 — Bếp & Mồi Nóng (Kitchen & Hot Dishes)

> Phase 2. Mở đủ 6 món và prep pipeline cho mồi nóng. Phụ thuộc F10 `kitchen` upgrade và F03 order model.

## 1. Scope

- Thêm món `dau`, `topmo`, `long`.
- Thêm bếp với prep queue, slots, durations.
- Tích hợp Order cấp bàn: Order chỉ giao khi mọi item `ready`.

## 2. Data model

```ts
type Dish = 'bia' | 'lac' | 'nem' | 'dau' | 'topmo' | 'long'

type DishConfig = {
  dish: Dish
  price: number
  bulkCost: number
  needsGlass: boolean
  prepMs: number
  station: 'tap' | 'instant' | 'kitchen'
  unlock: { kitchenLevel?: number }
}

type KitchenJob = {
  id: string
  orderItemId: string
  dish: Dish
  startedAt: number
  endsAt: number
  state: 'queued' | 'cooking' | 'ready' | 'wasted'
}
```

## 3. Dish config

| Dish | Price | Bulk cost | Prep | Station | Unlock |
|---|--:|--:|--:|---|---|
| `bia` | 50 | 10 | 3000ms | tap | start |
| `lac` | 75 | 26 | 0 | instant | start |
| `nem` | 150 | 60 | 0 | instant | start |
| `dau` | 100 | 45 | 8000ms | kitchen | Lv1 |
| `topmo` | 165 | 82 | 10000ms | kitchen | Lv1 |
| `long` | 280 | 155 | 15000ms | kitchen | Lv2 |

## 4. Kitchen station

- Lv0: locked.
- Lv1: 1 slot, unlock `dau`, `topmo`.
- Lv2: 2 slots, unlock `long`.
- Every level reads `upgrades.kitchen.prepMult` and `slots` from the JSON; F10 owns purchase prerequisites and prices. No inferred interpolation between levels.

## 5. Order integration

- Instant items become `ready` immediately if stock available.
- Runtime items use the existing `Item.state`/`readyAt` as the kitchen queue; the conceptual `KitchenJob` above is not a second persisted job store.
- Prep starts automatically when the ordered dish is unlocked, stock is available and a configured burner is free. Pending items consume no stock; a started item consumes one unit once.
- Serve the whole table only when all items are ready. Stale beer still permits service with the existing no-tip soft outcome (GDD/03-SPEC); freshness is not a hard rejection.
- If Order expires, ready/preparing kitchen items become `wasted`; stock is not refunded.

## 6. Menu mix

- Phase 2 spawn can generate 0-2 mồi per table round.
- Hot dishes should appear more in `ngoily`, `football_fan`, and VIP-heavy groups.
- Re-run `k_value` measurement after enabling all 6 dishes; k remains value-per-serve only.

## 7. UI

- Kitchen panel shows slots, timers, dish icons.
- Order bubble groups hot dishes separately from beer count.
- Warning when kitchen job will finish after patience is likely gone.

## 8. Analytics

- `dish_ordered {dish, customerType, tableSize}`
- `kitchen_job_started {dish, prepMs}`
- `kitchen_job_ready {dish}`
- `dish_wasted {dish, reason}`
- `menu_mix_summary {shiftId, avgTicket, kValue}`

## 9. Acceptance

- Locked dish never appears before unlock.
- Kitchen jobs survive frame drops and complete by timestamp.
- Expired order wastes prepared food exactly once.
- Adding 6 món triggers a balance report with `kValue`.

## 10. Local kitchen presentation — rules13 baseline, 2026-09-09

`packages/engine/src/kitchen.ts` projects the existing pipeline without changing
commands, RNG, save format or rules13 replay. Burner counts and preparation
multipliers come from `upgrades.kitchen` in the JSON, including all four levels.
The yard appliance and live VI/EN sheet display configured occupancy, actual
countdowns, pending stock/slot states and ready dishes until their order is served
or expires. Selecting a dish opens its existing whole-table popover. The restock
and upgrade actions reuse their existing commands and guards.

Only a started dish has a known finish time. A warning appears when `readyAt`
reaches or exceeds normal patience (equality enters grace); pending dishes have
no invented ETA. Expired, cancelled and served orders are absent from the sheet.
Hidden local time follows the existing pause rule; opening a sheet does not pause.
Ready/preparing food on expiry becomes wasted once, without inventory refunds;
untouched pending food never consumes stock.

The original rules13 presentation used `dish_preparing`/`dish_ready` aliases.
Rules14 below adds the dedicated per-dish provenance and report. Future
customer-specific hot-dish demand remains in full F11 scope; canonical config
currently has no dedicated coefficients for those preferences. No coefficients
were invented to close the feature prematurely.

Focused checks live in `packages/engine/test/kitchen.test.ts` and
`apps/web/test/kitchen.spec.ts`, using real command-created saves. They cover all
levels, exact timestamps, restock, expiry, frame drops, hidden time, full replay,
partial-mâm refusal, stale-mâm service and mobile/short-landscape navigation.
The seven kitchen/hot-dish images have native-alpha provenance in
`docs/reference/assets-owner-2026-09-08/kitchen-art.json`; they remain art drafts.

## 11. Local menu analytics and shift book — rules14, 2026-09-09

The five event names in §8 now exist, with identities, timestamps and coverage
specified in `../analytics-events.md`. One shared discard handler emits waste
for preparing/ready food on expiry or confirmed dismissal; pending items consume
nothing and served rounds never become waste. Instant configured kitchen jobs
emit start and ready at the same timestamp. The Item pipeline remains canonical.

`menuReport` reads current-shift event/serve cursors. `serveValueStats`, also used
by the headless sim, computes nominal payment+tip per served customer for k, and
separately per distinct served mâm for avgTicket. Caps, Tỉnh Táo bonus, delivery
and throughput are excluded. No serves or unsafe value produces an unavailable
average, not a fabricated zero. New shifts have full coverage; legacy adoption
is explicitly partial, and already-closed legacy shifts stay unavailable.

The VI/EN Sổ ca displays six dish rows (ordered/sold/discarded), mâm count and
average, updating without pausing play. Its rest-screen button reopens the last
shift after reload. Chunky raised metric surfaces follow the latest F24 owner
brief. No prices, demand weights or config values changed. Art remains draft;
server analytics, customer-specific demand and full F11 acceptance remain open.

Focused engine/browser checks are `menu.test.ts` and `menu.spec.ts`. They use
actual commands and genuine captured v13 saves from product af16833, covering
all six dishes, repeated rounds, cap/bonus/delivery exclusions, zero-duration
cooking, disposal/retry/refusal, frame drops, hidden time, replay and mobile UI.
See `../build-progress.md` for final verification and independent review status.

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Added live kitchen projection/UI and focused actual pipeline checks. Documented reuse of Item timestamps, automatic prep and GDD/03 stale soft service instead of a duplicate queue or freshness rejection; mapped current events and retained missing analytics/demand work. |
| 2026-09-09 | Implemented rules14 per-dish analytics, shared nominal value helper and localized Sổ ca report; documented partial legacy data, zero-duration jobs and last-shift access. Customer-specific demand/server/art remain open. |
