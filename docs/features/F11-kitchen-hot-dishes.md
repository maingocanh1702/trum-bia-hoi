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

## 10. Local implementation — 2026-09-09

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

Current event mapping: `dish_preparing {itemId,dish}` at the actual start and
`dish_ready {itemId}` at the actual completion represent the two kitchen job
events above. `order_placed`/`order_expired` are table events, not the proposed
per-dish ordered/wasted telemetry. Per-dish waste/menu-mix analytics and future
customer-specific hot-dish demand remain in full F11 scope. Do not claim those
are shipped merely because prep and UI work. Current k sim covers both cold and
six-dish menus; its report is value per served customer, never throughput.

Focused checks live in `packages/engine/test/kitchen.test.ts` and
`apps/web/test/kitchen.spec.ts`, using real command-created saves. They cover all
levels, exact timestamps, restock, expiry, frame drops, hidden time, full replay,
partial-mâm refusal, stale-mâm service and mobile/short-landscape navigation.
The seven kitchen/hot-dish images have native-alpha provenance in
`docs/reference/assets-owner-2026-09-08/kitchen-art.json`; they remain art drafts.

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Added live kitchen projection/UI and focused actual pipeline checks. Documented reuse of Item timestamps, automatic prep and GDD/03 stale soft service instead of a duplicate queue or freshness rejection; mapped current events and retained missing analytics/demand work. |
