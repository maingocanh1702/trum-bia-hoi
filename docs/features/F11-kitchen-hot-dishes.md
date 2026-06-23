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
- Higher levels: reduce prepMs by 10-25% and add slots, tuned by F10.

## 5. Order integration

- Instant items become `ready` immediately if stock available.
- Kitchen items create `KitchenJob`.
- Player can queue kitchen items only if stock and slot/queue capacity allow.
- Order can be served only when all items ready and enough beer freshness remains.
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
