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
| 2026-10-19 S1 rules 28 | Đã cài: cỡ nhóm theo `spawn.pPair` (0,5); cặp gặp quán không có bàn 2 ghế → `queue_overflow{reason:'noSeat'}` tại cửa, không phạt/không trừ uy tín/không `lost`, đếm `stats.rejected` + `stats.noSeat` (toast + sổ ca ở S3). Mâm theo số ghế lúc nhóm ngồi: 1 ghế bia *hoặc* 1 mồi tức thì, 2 ghế bia + mồi. Hàng đợi/kiên nhẫn chưa đổi (S3). |
| 2026-10-20 S3 rules 28 | Đã cài (JSON 2.0.22): kiên nhẫn khách thường 24 s (`patience.thuongMs`), hàng đợi `1 + ⌊ghế/8⌋` (`runtime.queueBaseSlots` 1, `queueSeatsPerSlot` 8), cầu theo sức chứa `spawn.capacityDemand{refTables 6, maxMult 4}` (khoảng cách tới nhóm kế × 4 · 3 · 2 · 1,5 với 1 · 2 · 3 · 4 bàn). Từ chối tại cửa (`noSeat` hoặc `full`) không phạt xu/uy tín, không `lost`; sổ ca thêm "Cặp không có chỗ: n". Snapshot sức chứa và pin ≤ 2.0.21 giữ 18 s / `2 + ⌊ghế/3⌋` / không có cầu theo sức chứa. 03-SPEC §7 ghi chú rules 28. |
| 2026-10-20 S4 rules 28 | Cấp bàn/ghế đổi cách một nhóm khách ngồi bàn (JSON 2.0.23), chốt lúc nhóm ngồi: Lv2 thêm 1 đợt gọi cho nhóm; Lv3 mỗi khách sau mồi đầu có `pExtraMoi` 0,35 gọi mồi thứ 2 (chỉ món còn hàng); Lv4 nhân tip ×1,25 của nhóm ở bàn đó; ghế nâng nhân kiên nhẫn chờ món của đơn ×1 / 1,15 / 1,30 (kiên nhẫn ở hàng đợi cửa và cửa sổ tip 60 % của từng khách không đổi). Bàn 1 ghế không hưởng cấp bàn. Pin ≤ 2.0.22 không đổi. 03-SPEC §6 ghi chú. |
| 2026-10-22 Đợt 3 `fun-kick-table` rules 28 | "Mời về" (`kickTable`, D3): khách **đang nhâm nhi** sau khi được phục vụ — bàn lai rai (`ngoily`, nhâm nhi ×10 giữa các đợt) hay mọi nhóm đang ngồi với mâm đã giao (`consuming`), và Chí Phèo còn giữ bàn sau đợt cuối (`occupied`) — được người chơi mời về: xu = Σ round(gross đơn gần nhất của khách × `kickTable.feeRate` 1,5 × `leavePenaltyMult`) → VIP ×10, Chí Phèo 0 xu và −2 uy tín (D3), mọi khách khác ×1; uy tín −2 mỗi khách, không ×k; không tính `lost`, không phạt −5, nhóm bỏ các đợt còn lại; khách đang chờ món không mời về được. Huy hiệu loại khách trên popover giữ màu; nhãn "Bàn lai rai" sẫm hơn (#2f6e99, tương phản 5,2:1 với chữ kem; trước 4,17:1 dưới mức AA). 03-SPEC §2 ghi chú 🟢; 08-SPEC §9/§22. |
| 2026-10-22 vòng quyết định owner (stage 07b), JSON 2.1.1 | "Mời về": `feeRate` **0,5** (quyết định owner 1 của founder: luật +10 % đọc theo thu nhập ròng sau phí), nên mời một VIP tốn 0,5 × 10 = **5×** gross mâm của anh ta (Đợt 3 ở 1,5 là 15×); Chí Phèo vẫn 0 xu, −2 uy tín; "đang nhâm nhi" = mọi nhóm ngồi với mâm đã giao (`consuming`, kể cả bàn lai rai giữa các đợt) hoặc chỉ còn Chí Phèo (`occupied`) — giữ như niêm phong (quyết định owner 2). DECISIONS `## 07 · owner calls 2026-10-22`. |
| 2026-10-22 founder override (JSON 2.1.2) | "Mời về" hiện cùng cổng HUD (`show.hud`), mà HUD nay hiện từ ca 1 (`hudAfterShifts` 0, founder 22/10/2026): bàn nhâm nhi của ca 1 cũng có dòng giá và nút "Mời về"; trước đó nút chỉ hiện từ ca 2. Luật, giá (`feeRate` 0,5) và `kickTableQuote` không đổi. Test: `kick-table.spec.ts` (ca 1 có nút). |
| 2026-10-22 founder (JSON 2.1.3) | Ca 1 (onboarding, chưa xong ca nào) **không có "Bàn lai rai"** (`ngoily`): `onboarding.firstShift.excludedCustomerTypes` ["ngoily"], các loại còn lại chia lại phần bốc (như `ngoily` nặng 0); từ ca 2 `ngoily` đến như cũ. "Mời về" lại **chỉ từ ca 2** (ngưỡng riêng `featureReveal.kickAfterShifts` 1, AND với HUD; dòng 2.1.2 ngay trên là lịch sử). Các loại khác vẫn đến ở ca 1, không đổi số: `thuong` 1,0 · `voi` 0,3 · `vip` 0,1 · `chipheo` 0,03 (Oi bức ×1,5); `football_fan` 0, `shipper` không dùng bàn. Loại vẫn **ngồi lại sau mâm** ở ca 1: chỉ Chí Phèo (`occupied` tới lúc hết kiên nhẫn ×5, không trả xu; đo trên 2.1.2: 200 ca 1, 1 191 nhóm ngồi = thuong 68,7 % · voi 16,5 % · ngoily 6,3 % · vip 5,9 % · chipheo 2,7 %, 31 lần `table_occupied`). **Câu hỏi mở cho founder (review A-r1, 23/10/2026; chưa chọn gì, không đổi code):** ở ca 1 (1 bàn × 1 ghế) một Chí Phèo (trọng số 0,03, Oi bức ×1,5) giữ cái bàn duy nhất — bàn ghi "Lai rai chưa về" (`table.occupied`) — tới **120 s** sau khi đến (90 s khi Oi bức, 138 s khi Mưa phùn), trả 0 xu và 0 boa; trên 2.1.2: 31 lần `table_occupied` trong 200 ca 1, ở 30 game (khoảng 1 game mới trong 7; trên 2.1.3: 26 game trong 200; probe `.autopilot-state/probes/a-shift1-types.mjs`, log `autopilot-logs/a-shift1-types-{before,after}.log`). Với A1 (và nút "Mời tất cả về" của sổ ca, nay cũng theo `show.kick`), ca 1 **không còn cách nào mời anh ta về** (2.1.2 cho "Mời về" 0 xu, −2 uy tín). Phương án: (a) chấp nhận (anh ta tự về trong 120 s); (b) thêm `chipheo` vào `excludedCustomerTypes` (chỉ config, nhưng lại đổi phần bốc của ca 1, nên phải đo lại `sim:balance` — B1 sẽ đo lại); (c) cho "Mời về" ở ca 1 chỉ với bàn đang ngồi lại. |
| 2026-10-23 founder 22/10 (JSON 2.1.4, Part B1) | Cỡ nhóm: khi chưa bàn nào có 2 ghế mọi nhóm là 1 khách (`spawn.singlesUntilPairSeat`, Tier A), từ bàn 2 ghế đầu tiên `pPair` 0,5 như cũ; không còn cặp bị từ chối "Hết chỗ" ở quán mới (pin ≤ 2.1.3 giữ luật cũ). Trọng số các loại khách không đổi; câu hỏi Chí Phèo ở ca 1 (dòng 2.1.3) vẫn mở. STOP: `sim:balance` + `sim:career:gate` đỏ, chờ founder (08-SPEC changelog 2026-10-23 / JSON 2.1.4). |
