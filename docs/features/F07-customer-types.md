# F07 — Các Kiểu Khách (Customer Types)

> Phase 1-2. Mở rộng từ 3 loại P0 (`thuong`, `voi`, `vip`) lên bộ khách quán bia hơi đầy đủ. Phụ thuộc `F03 Hệ Bàn`, `F06 Tip/Phạt`, `F09 Thời Tiết`, `F15 Sự Cố Quán Nhậu` cho một số biến thể.

## 1. Scope

**Phase 1:** `thuong`, `voi`, `vip` production-ready.

**Phase 2:** thêm `chipheo`, `ngoily`, `shipper`, `football_fan` hook cho F19.

**Ngoài scope:** boss/event server-only chi tiết, AI personalization.

## 2. Data model

```ts
type CustomerType =
  | 'thuong'
  | 'voi'
  | 'vip'
  | 'chipheo'
  | 'ngoily'
  | 'shipper'
  | 'football_fan'

type CustomerTypeConfig = {
  type: CustomerType
  spawnWeight: number
  patienceMult: number
  enjoyMult: number
  tipMult: number
  leavePenaltyMult: number
  pays: boolean
  canOrderMoreRounds: boolean
  usesTable: boolean
  usesGlass: boolean
  tags: string[]
}

type Customer = {
  id: string
  type: CustomerType
  tableId?: string
  state: CustomerState
  patienceMs: number
  maxPatienceMs: number
  enjoyMs: number
  maxEnjoyMs: number
  orderIds: string[]
  payment: number
  tip: number
  reservedGlassId?: string
}
```

## 3. Config khởi điểm

| Type | Weight | Patience | Enjoy | Tip | Phạt | Ghi chú |
|---|--:|--:|--:|--:|--:|---|
| `thuong` | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | nền tảng |
| `voi` | 0.3 | 0.611 | 0.8 | 1.0 | 1.0 | ưu tiên vì patience ngắn |
| `vip` | 0.1 | 0.611 | 1.0 | 10.0 | 10.0 | ưu tiên số 1 |
| `chipheo` | 0.03 | 5.0 | 5.0 | 0 | 0 | không trả, giữ bàn, tích pity |
| `ngoily` | 0.1 | 1.0 | 10.0 | 1.0 | 1.0 | giữ bàn 50-100s, có thể gọi thêm |
| `shipper` | timer | 1.0 | 0 | 0 | 0.5 gross | không dùng bàn/cốc |
| `football_fan` | event | 1.0 | 2.0-4.0 | 1.0 | 1.0 | chỉ khi F19 bật |

## 4. Spawn rules

- Spawn thường đi qua `TableSpawner`: chọn nhóm, chọn bàn `EMPTY`, mix khách theo weight.
- `shipper` đi qua timer riêng, không chiếm bàn, không dùng cốc, không vào `queueSlots`.
- Thời tiết có thể nhân weight: humid/hot tăng `chipheo`, rain tăng `ngoily`/shipper, football event tăng `football_fan`.
- Một nhóm có tối đa 1 `vip` ở Phase 2 để tránh phạt cụm quá gắt; bỏ giới hạn khi balance đã ổn.

## 5. Behavioral rules

- `vip`: payment tính như khách thường nhưng tip/phạt nhân 10 theo `F06`.
- `voi`: cùng order với bàn nhưng `Order.patienceMs = min(customer.patience)` nên cả bàn gấp hơn.
- `chipheo`: `pays=false`; khi nhóm rời mà `chipheo` còn ngồi thì bàn vào `OCCUPIED_BY_CHIPHEO` theo `03-SPEC-he-ban.md`.
- `chipheo` pity: mỗi lần phục vụ/đuổi/đợi qua mốc tăng `pityCounter`; server roll `chairmanReveal` theo F15.
- `ngoily`: tăng `maxEnjoyMs`, tăng số vòng `groupTimer` 3-5 ở Phase 2.
- `shipper`: tạo `DeliveryOrder`, có `deadlineMs=45_000`, reward net = gross x 0.75, miss penalty = gross x 0.5.

## 6. UI requirements

- Badge rõ ở mức bàn: VIP vàng, vội đỏ, Chí Phèo nâu, ngồi lỳ xanh, shipper xanh dương.
- Bubble món vẫn theo `OrderItem`; không vẽ vòng patience cho từng khách khi bàn đông, chỉ highlight khách đặc biệt.
- Priority indicator: bàn có VIP hoặc order shipper gần hết hạn phải thắng màu cảnh báo thường.

## 7. Analytics

- `customer_spawned {type, weather, rush, tableSize}`
- `customer_served {type, payment, tip, freshnessOk, patienceRatio}`
- `customer_left {type, reason, penalty}`
- `shipper_completed {gross, net, onTime}`
- `chairman_revealed {rewardType, value, pityCounter}`

## 8. Acceptance

- Mix khách khớp weight trong mô phỏng 5.000 spawn, sai số <10% tương đối.
- VIP sớm tạo tip lớn rõ rệt; VIP trễ/mất tạo phạt đủ đau.
- `chipheo` không làm bàn rơi vào state lửng; bàn luôn về `EMPTY` sau khi rời/đuổi.
- `shipper` không tiêu cốc, không chiếm bàn, không cộng sai vào queue.


## 9. Local delivery implementation — rules v7 (2026-09-09)

- Owned phone starts a separate timer on the next current command while open. One
  active order, no queue/backlog. Weather multiplies frequency (interval divided),
  following GDD/F09; the contradictory interval wording in08 §4 is corrected.
- Seeded selection among finite unlocked-menu bundles satisfies configured unit and
  gross bounds. Gross is the sum of shown final menu prices; no second price scaling.
  Handoff requires the exact active id, a future deadline, every ingredient and the
  shared service cooldown. Consume all stock once; no prep slots, glasses or tables.
- Net and rested bonus use shared counted credit/cap and integer preflight. No tip.
  Successful handoff adds configured serveNoTip reputation; timeout debits available
  coins up to the configured gross penalty, without seated reputation/lost penalties.
- Manual stop/exhaustion stops arrivals, keeps the current delivery serveable and
  delays finalization. Paid kick-all refuses before debit while it remains active.
  Hidden/offline time pauses both arrival and delivery deadlines.
- Phone becomes a blue courier button with a live clock; the native sheet shows
  all quantities/readiness, stock refill, actual credited reward and nominal penalty.
  Urgency includes text, not colour alone. Timeout feedback is numeric/icon loss only.
- Events include deterministic deliveryId and gross; arrival records item quantities,
  completion records net/credited/bonus/onTime, missed records actual coin/rep debit.
  Separate delivery stats stay outside seated serve records and the k measurement.
- This is local runtime coverage. Football mix, full customer acceptance/balance,
  future signboard multiplier and server authority remain separate unfinished work.

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Local shipper rules v7, closing/stock/ledger/replay contract and reference-style phone/sheet/toast UI; no new tuning values. Full F07 remains in progress. |

| 2026-09-09 review correction | Configuration must retain exactly the phone prerequisite; another unlock cannot replace it even if that unlock has a valid customized gate. Added rejection regression for QR substitution. |

| 2026-09-09 review receipt | Local delivery full-diff review ef0c053..307a3b0 CLEAN,77 unit/33 E2E/config/build/assets and30 sim rows green. Full customer mix/football/server acceptance remains in progress. |
| 2026-09-18 owner | Cỡ nhóm **độc lập với quán**: `spawn.pPair` 0,5 (một nửa khách đến theo cặp); cặp gặp quán chưa có bàn 2 ghế → `queue_overflow{reason:noSeat}`, không phạt, không trừ uy tín, có toast + đếm trong sổ ca. Nhóm ≤ 2. Kiên nhẫn thường 18 → 24 s; hàng đợi 1 + ghế/8. Chờ S1/S3, rules 28. Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
| 2026-10-19 fun-buy-buttons-reason | Owner P3 (PLAN 18/09 §0 và hàng "kiểm" §4) thay luật "timeout feedback is numeric/icon loss only": toast khách đi có **đúng 1 lý do** (Hết bia · Hết mồi · Chờ lâu quá · Hết chỗ) cạnh số xu/uy tín; cặp bị từ chối tại cửa chỉ hiện lý do (không phạt). Map: `order_expired.cause` beerStock/beerRefill → bia, foodStock → mồi, còn lại → chờ lâu; `customer_left{reason:'queue'}` → chờ lâu; `queue_overflow` → hết chỗ (`apps/web/src/leave-reasons.ts`). Không đổi luật engine. |
