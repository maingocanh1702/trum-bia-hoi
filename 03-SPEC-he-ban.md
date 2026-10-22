# 📐 SPEC — Hệ Bàn (Table System) — Trùm Bia Hơi

> 🟢 **Owner 17–18/09/2026 (v1.4) — đè lên §5 "mua thêm bàn vs nâng sức chứa":** `Table.capacity` = số ghế (1–2), mua từng ghế; `Table.level` không còn quyết định sức chứa mà là **lợi ích** (Lv2 `extraRounds` +1, Lv3 `pExtraMoi`, Lv4 `tipMult` 1,25); mâm mỗi khách theo số ghế (1 ghế: bia *hoặc* 1 mồi tức thì; 2 ghế: bia + 1 mồi); nhóm ≤ 2, cỡ nhóm độc lập với quán (`spawn.pPair`), cặp không có bàn 2 ghế → `queue_overflow{reason:noSeat}` không phạt; ghế 2 chỉ mở sau đủ 4 bàn, nâng bàn cần 2 ghế; số bàn tối đa theo mặt bằng (`tableSlots`); mua bàn/ghế/nâng cấp không đòi bàn trống (áp cho nhóm kế); hàng đợi `1 + ghế/8`; command mới `kickTable` (mời bàn nhâm nhi về, tốn xu + uy tín). Luật đầy đủ + số: `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3, §II.3.

> Spec triển khai cho dev. Đào sâu §5 của `02-GDD-trum-bia-hoi.md`. Trả lời 4 câu hỏi còn thiếu: (1) state machine bàn+khách, (2) serve theo khách hay bàn, (3) phạt cụm tính sao, (4) mua thêm bàn vs nâng sức chứa. Nhãn: 🟢 CORE = cốt lõi; 🟡 = số cần playtest.
> Ngày: 2026-06. Bám cơ chế gốc trumviahe (ghế đơn) nhưng nâng đơn vị thành **bàn**.

---

## 1. Khái niệm & domain model 🟢

Đơn vị chỗ ngồi là **Bàn (Table)**, mỗi bàn chứa nhiều **Khách (Customer)**. Khách vẫn là entity độc lập (giữ field gốc: patience, cốc định danh, tip…). Bàn là *container* + thêm trạng thái nhóm.

```ts
type Dish = 'bia' | 'lac' | 'nem' | 'dau' | 'topmo' | 'long'

// 1 OrderItem = 1 món của ĐÚNG 1 khách (để tính tiền/tip theo khách + cấp cốc định danh).
// VD bàn 4 người gọi 4 bia + 1 lòng -> 5 OrderItem, mỗi cái gắn customerId cụ thể.
type OrderItem = {
  dish: Dish
  needsGlass: boolean
  customerId: string        // ⭐ khách nào gọi món này (BẮT BUỘC) — nhờ vậy biết bia của VIP để tip ×10
  glassId?: string          // cốc định danh khi đã rót (chỉ món cần cốc)
  prepState: 'pending' | 'preparing' | 'ready'
}

type Order = {              // MỘT đợt gọi món của 1 bàn (gom item của nhiều khách trong đợt)
  id: string
  tableId: string
  items: OrderItem[]        // mỗi item gắn customerId
  placedAt: number          // lúc gọi
  patienceMs: number        // hạn phục vụ đợt này (xem §4)
  state: 'pending' | 'preparing' | 'grace_leaving' | 'served' | 'expired'
}

type Customer = {           // giữ field gốc
  id: string
  type: 'thuong' | 'voi' | 'vip' | 'chipheo' | 'ngoily'
  tableId: string
  seatIndex: number
  state: CustomerState      // §3
  patience: number; maxPatience: number
  enjoyTime: number; maxEnjoyTime: number
  reservedGlassId?: string  // cốc định danh (1 cốc/khách đang uống bia)
  payment: number; receivedTip: number
}

type Table = {
  id: string
  level: number             // cấp bàn -> sprite; rules 28: lợi ích Lv2–4 cho nhóm kế (§6), không đổi sức chứa
  variant: 'thuong' | 'vip'
  capacity: number          // số ghế; rules 28: 1–2 ghế mua từng chiếc (§6); snapshot sức chứa cũ: "ghế quy đổi" theo cấp
  chairLevel?: number       // rules 28: cấp ghế 1–3 (§6)
  seats: (Customer | null)[]// length = capacity
  state: TableState         // §2
  orders: Order[]           // nhiều ĐỢT theo thời gian (lai rai)
  groupArrivedAt: number
  groupTimer?: number       // hẹn đợt gọi tiếp theo
}
```

**Sức chứa quán** = Σ `capacity` của các bàn = "tổng ghế quy đổi" → đưa vào công thức hàng đợi gốc: `queueSlots = 2 + ⌊tổngGhế / 3⌋`. Vượt → `queueOverflow` (từ chối tại cửa, gần như không phạt — giữ cơ chế gốc).

> 🟢 **Rules 28 (S3 `eco21-capacity-demand`, JSON 2.0.22):** game mới (snapshot bàn ghế) dùng `queueSlots = runtime.queueBaseSlots + ⌊tổngGhế / runtime.queueSeatsPerSlot⌋` với 1 và 8 → **`1 + ⌊tổngGhế / 8⌋`** (D25; 1 bàn 1 ghế = 1 chỗ đợi, 4 bàn × 2 ghế = 2); công thức `2 + ⌊tổngGhế / 3⌋` ở trên còn cho snapshot sức chứa và pin ≤ 2.0.21. Chi tiết ở §7.

> 🟢 **QUY TẮC NỀN — MỘT BÀN = MỘT NHÓM (MVP).** Một `Table` chỉ phục vụ **đúng 1 nhóm** tại một thời điểm. **KHÔNG ghép nhóm lạ** vào bàn đang có khách (kể cả bàn còn ghế trống). Bàn chỉ nhận nhóm mới khi đã về `EMPTY`. → tránh phải quản nhiều `groupTimer`/nhiều payment trên cùng bàn. (Ghép-bàn-chung là 🔵 post-MVP, nếu cần.) Vì vậy `groupTimer`/`orders` luôn thuộc về 1 nhóm duy nhất.

---

## 2. State machine — BÀN 🟢

```
        (spawn nhóm nếu còn chỗ)
EMPTY ───────────────────────────────▶ SEATING
                                          │ (khách ngồi vào ghế)
                                          ▼
                                     ORDERING ◀───────────┐
                                          │ (bàn phát 1 Order) │
                                          ▼                    │ (đợt kế: groupTimer)
                                   AWAITING_SERVE              │
                                          │ (player phục vụ Order)
                                          ▼                    │
                                     CONSUMING ────────────────┘
                                          │ (nhóm xong, không gọi nữa / hết enjoy)
                                          ▼
                                      PAYING
                                          │ (thu tiền, cốc -> dirty)
                                          ▼
                                     CLEANING
                                          │ (dọn bàn xong)
                                          ▼
                                        EMPTY
```

| State | Mô tả | Chuyển tiếp |
|---|---|---|
| `EMPTY` | bàn trống, sẵn sàng nhận nhóm | có nhóm + còn chỗ → `SEATING` |
| `SEATING` | khách đang vào ghế (anim ngắn) | ngồi xong → `ORDERING` |
| `ORDERING` | bàn quyết định gọi gì → phát 1 `Order` (state pending) | phát order → `AWAITING_SERVE` |
| `AWAITING_SERVE` | có ≥1 Order `pending`/`preparing`; đồng hồ patience chạy | phục vụ hết order hiện tại → `CONSUMING`; quá hạn → mất (xem §4) |
| `CONSUMING` | nhóm đang ăn/uống (enjoyTime). Có thể **gọi đợt tiếp** | tới `groupTimer` & còn "nhu cầu" → quay lại `ORDERING`; hết nhu cầu/enjoy → `PAYING` |
| `PAYING` | thu tiền + tip cả bàn; cốc → `dirty` vào hàng rửa | xong → `CLEANING` |
| `CLEANING` | dọn bàn (anim) | xong → `EMPTY` |

> **Lai rai = vòng `ORDERING → AWAITING_SERVE → CONSUMING → ORDERING`** lặp `n` đợt. Số đợt `n` 🟡 theo loại nhóm: thường 1–2, **bàn ngồi-lỳ 3–5** (đặc thù bia hơi), khách vội 1.
> **2 nhánh thoát đặc biệt:** (a) Order đợt ≥2 hết hạn → kết thúc buổi sớm (§5); (b) còn **Chí Phèo** ngồi khi nhóm đã trả → bàn ở trạng thái **bị chiếm**, chưa về `EMPTY` (§8).

> 🟢 **Rules 28 (Đợt 3 `fun-kick-table`, JSON 2.1.0; FEEDBACK II.3, D3) — nhánh thoát thứ 3: "Mời về".** Lệnh `kickTable {tableId, maxCost}` của người chơi đưa một bàn **đang nhâm nhi** — khách đã được phục vụ và ngồi lại: `CONSUMING` (mã `consuming`, nhóm ngồi với mâm đã giao, kể cả giữa hai đợt lai rai) hoặc **bị chiếm** (mã `occupied`, chỉ còn Chí Phèo) — sang `CLEANING` ngay, rồi `EMPTY` và nhận nhóm đang chờ ở cửa; **không** áp dụng khi khách đang ngồi vào (`seating`) hay đang chờ món (`AWAITING_SERVE`, mã `waiting`, đơn `pending` hoặc trong grace), bàn đang dọn hay trống (`tableNotLingering`). Giá: Σ mỗi khách còn ở bàn `round(gross đơn gần nhất của khách × kickTable.feeRate × leavePenaltyMult)` (VIP ×10, Chí Phèo 0 xu; `feeRate` 0,5 — quyết định owner 1, 22/10/2026, JSON 2.1.1: luật +10 % đọc theo thu nhập ròng; Đợt 3 từng chốt 1,5 theo thu nhập gộp), trả từ ví, ghi `spent`; uy tín −`kickTable.repPerGuest` (2) mỗi khách, không ×k, không xuống dưới 0. Không phải mất khách: không `lost`, không −5 `customerLeft`, không `lostStreak`, không `customer_left`; các đợt còn lại của nhóm bỏ, cốc đang dùng về rửa (`releaseGlasses`), event `table_kicked{shiftId, tableId, groupId, orderId, count, cost, reputation, vip, chipheo}` rồi `table_cleaning`. `maxCost` = giá người chơi đã thấy: giá thật cao hơn → `kickCostChanged` (trước khi xét ví), thiếu xu → `notEnoughCoins`; cùng khoá idempotency trả cùng kết quả, không trừ hai lần. UI: popover bàn có dòng giá "n xu · −m uy tín" và nút "Mời về" một chạm; mờ với đúng một lý do ("Khách chưa dùng món xong" / "Chưa đủ xu"); hiện từ khi HUD mở (sau ca 1 tới 21/10/2026; **từ ca 1 kể từ 22/10/2026 — founder override, JSON 2.1.2: HUD mở từ ca 1**) và chỉ khi ca đang mở (khi đóng ca, "Mời tất cả về" của sổ ca rẻ hơn; lệnh vẫn nhận bàn đang nhâm nhi trong lúc đóng ca). Snapshot không có `kickTable` (nội dung S5/S6 của 2.1.0, pin cũ) không có lệnh này (`kickTableUnavailable`) nên vòng đời bàn của nó giữ nguyên từng byte.

---

## 3. State machine — KHÁCH (trong bàn) 🟢

```
ARRIVING → SEATED → (thuộc Order của bàn) → WAITING_SERVE → DRINKING/EATING → DONE → LEFT
                                                  │ hết patience
                                                  ▼
                                               LEAVING_ANGRY (phạt)
```

- Khách **không tự gọi món riêng lẻ**; món của khách gộp vào `Order` cấp bàn (xem §4 quyết định serve-theo-bàn).
- Khách uống bia giữ `reservedGlassId` suốt `DRINKING`; rời → cốc thành `dirty`.
- `enjoyTime` (giữ ghế sau phục vụ) giữ cơ chế gốc; ngồi-lỳ ×10.

---

## 4. QUYẾT ĐỊNH 1 — Serve theo KHÁCH hay theo BÀN? 🟢

**CHỐT: phục vụ theo ĐỢT GỌI (Order) cấp bàn, KHÔNG theo từng khách lẻ.**

Lý do:
- Đúng thực tế bia hơi: bồi bưng **một khay cho cả bàn**, không bưng từng ly cho từng người.
- Giảm số lần chạm (đỡ rối hơn ghế đơn ×N người), nhưng vẫn giữ áp lực qua **nhiều đợt gọi**.

Cơ chế:
- Mỗi `Order` gom toàn bộ món nhóm gọi đợt đó (vd 4 bia + 1 lòng + 1 lạc).
- Player chuẩn bị đủ món trong Order (rót đủ cốc bia còn **freshness** + làm mồi) → **1 thao tác phục vụ** giao cả Order.
- Order có `patienceMs` riêng (đồng hồ của đợt). **Patience của Order** = min patience của các khách trong nhóm tại thời điểm gọi (🟡) → nhóm có khách vội thì cả đợt gấp hơn.
- **Tip & payment tính theo từng khách** (giữ công thức gốc: tip 30% nếu khách đó được phục vụ khi >60% patience; VIP ×10), rồi **cộng dồn lên Order/bàn** để hiển thị. Tức: tiền theo khách, thao tác theo bàn.

> Hệ quả: cốc freshness vẫn theo **từng cốc** (mỗi khách bia 1 cốc). Phải rót đủ & còn hơi cho mọi cốc trong Order trước khi giao → đây là điểm căng cốt lõi.

> 🟢 **Rules 28 (S2 `eco21-instant-pour`, FEEDBACK II.1) — rót tức thì, thay "phải rót" ở trên cho game mới (snapshot bàn ghế) khi bom còn chế độ nạp `keg.refillEnabled` (mặc định bật, Tier B):** bia gọi mà bom còn cốc rót sẵn (`beer.ready > 0`) **và** còn cốc sạch → món bia `ready` ngay trong tick đặt đơn, không hàng đợi vòi, không chờ `pourMs`: `beer_pouring` + `beer_poured{fromReserve:true}` + `order_ready` cùng `at` với `order_placed`, cốc bắt đầu mất hơi từ lúc đó. Hết `beer.ready` hoặc hết cốc sạch → món chờ mẻ bom kế / cốc rửa xong (nguyên nhân `beerStock` / `beerRefill` / `glasses`; nguyên nhân `tap` không còn xảy ra khi `refillEnabled` bật). Đơn n bia sẵn sàng ngay khi `beer.ready ≥ n` và cốc sạch ≥ n; số "Rót sẵn n cốc" trên bom = min(`beer.ready`, cốc sạch). `pourMs`/`pourSlots` giữ trong JSON cho save ghim snapshot sức chứa (vòi vẫn chạy tới lần mở ca nhận snapshot bàn ghế), replay rules ≤ 27 và snapshot bàn ghế tắt `refillEnabled` (không có bom dự trữ để rót tức thì nên vòi vẫn chạy). Không đổi số nào.

---

## 5. QUYẾT ĐỊNH 2 — Phạt cụm tính thế nào? 🟢

**CHỐT: phạt theo TỪNG KHÁCH bỏ đi, nhưng một Order quá hạn làm CẢ NHÓM bỏ cùng lúc → cảm giác "mất cụm".**

Chi tiết:
- Nếu 1 `Order` của bàn **hết `patienceMs`** mà chưa phục vụ → **mọi khách chưa được phục vụ trong nhóm** chuyển `LEAVING_ANGRY` cùng lúc.
- **Phạt = Σ phạt từng khách** theo công thức gốc `round(grossKhách × 0.1 × leavePenaltyMult) × rush`. VIP trong nhóm ×10.
- **Uy tín:** mỗi khách bỏ −~5 (gốc) → bàn 6 người mất cụm = −30 uy tín → đắt, đúng tinh thần "rush nặng = canh bạc".
- Khách **đã được phục vụ** ở đợt trước (đang `CONSUMING`) **không bị phạt** khi đợt sau hỏng — họ vẫn trả tiền đợt đã phục vụ.

**Order fail giữa buổi (đợt ≥2 hết hạn) — quy tắc kết thúc buổi 🟢:** một `Order` mới `expired` → **kết thúc buổi của cả bàn ngay**:
1. **Thanh toán** mọi `Order` đã `served` trước đó (khách đã uống/ăn → vẫn trả tiền + tip các đợt đó).
2. **Phạt** phần khách thuộc Order fail (Σ phạt từng khách như trên, VIP ×10).
3. Cả bàn → `PAYING` → `CLEANING` → `EMPTY` (không quay lại `ORDERING` nữa).
→ Tránh trạng thái lửng "bàn còn người nhưng đã bỏ 1 đợt".

> Vì sao không phạt "1 cục cố định/bàn": tính theo Σ khách giữ đúng cân bằng economy gốc (phạt ∝ giá trị mất) và tự nhiên scale theo cỡ bàn + có VIP hay không. "Cụm" đến từ việc **đồng loạt rời**, không từ một con số phạt riêng.

> 🟢 **Rules 28 (game bàn ghế):** luật phạt cụm giữ nguyên, nhưng nhóm ≤ 2 (cặp hoặc khách lẻ, §6/§7) nên một cụm mất tối đa 2 khách = −10 uy tín (ví dụ "bàn 6 người" ở trên chỉ còn đúng với snapshot sức chứa cũ). Từ chối tại cửa không phải mất cụm (D12); "Mời về" một bàn đang nhâm nhi (ghi chú dưới §2) cũng không phải.

---

## 6. QUYẾT ĐỊNH 3 — Mua thêm bàn vs Nâng sức chứa bàn? 🟢

> **Bản hiện hành — game bàn ghế, rules 28, JSON 2.1.1** (số S5 chốt ở 2.1.0, không đổi; thân mục viết lại ở Đợt 4 đóng gói "Vui 3 ca", 22/10/2026; ghi chú đầu file và `docs/PLAN-vui-3-ca-2026-09-18.md` §7 gọi mục này là "§5 mua thêm bàn vs nâng sức chứa"). Nguồn quyết định: owner 17–18/09 (D13–D19, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3), hai quyết định owner của S5 ngày 21/10/2026; số: `docs/config/economy.tbh.json` (08-SPEC §8.6, §16, §22). Luật của snapshot sức chứa cũ ở cuối mục.

**CHỐT: không còn "nâng sức chứa bàn". Ghế = sức chứa + hình dạng mâm; cấp bàn = lợi ích cho nhóm kế, không thêm chỗ. Bốn đòn bẩy, mở theo thứ tự D18: bàn 2 → 3 → 4 → ghế 2 từng bàn (chỉ sau đủ 4 bàn) → cấp bàn (bàn phải có 2 ghế) → cấp ghế.**

Quán mới: **1 bàn × 1 ghế** (`upgrades.table.startingTables` 1), ví **750 xu** (300 base). Mỗi nút mua luôn hiện giá và, khi mờ, **đúng một lý do** theo thứ tự trong bảng (quote thuần ở `packages/engine/src/rules.ts`: `buyTableQuote`, `buyChairQuote`, `tableUpgradeQuote`, `chairUpgradeQuote` — lệnh gọi đúng hàm đó, UI đọc đúng hàm đó).

| Đòn bẩy | Lệnh | Giá (base → hiển thị ×k 2,5) | Mờ khi (theo thứ tự) | Tác dụng |
|---|---|---|---|---|
| **Mua bàn** | `buyTable` | bàn thứ n (n = 2…8) = `tablePriceBase[n−2]` = 428 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000 → **1 070** · 9 250 · 14 250 · 24 000 · 32 250 · 39 750 · 40 000 xu | đủ `tableSlots` bàn của mặt bằng đang dùng — **8 ở mọi mặt bằng** (quyết định owner 2 của S5, đảo D13 "hẻm đầu = 4 bàn") → "Quán đã đủ bàn"; thiếu xu → "Chưa đủ xu". Không gate Đời Quán | +1 bàn, kèm 1 ghế (khách lẻ) |
| **Mua ghế 2** | `buyChair {tableId}` | theo số ghế 2 đã mua **toàn quán**: `chairPriceBase` = 400 · 600 · 900 · 1 200 · 1 600 · 2 000 · 2 400 · 2 800 → 1 000 · 1 500 · 2 250 · 3 000 · 4 000 · 5 000 · 6 000 · 7 000 xu | quán chưa có `chairsAfterTables` = 4 bàn → "Mở sau khi đủ 4 bàn"; bàn đã 2 ghế → "Bàn đã đủ ghế"; thiếu xu | bàn 2 ghế đón **cặp** và mâm **bia + 1 mồi** (`orderShape.pair.pMoi` 0,85) |
| **Nâng bàn** Lv1→4 | `upgradeTable {tableId}` | theo **cấp đích**: `priceBase + stepBase × n`, n = số bàn **đã đạt** cấp ≥ cấp đích (tổng tiền không phụ thuộc thứ tự mua): →Lv2 7 000 + 2 500·n · →Lv3 34 000 + 13 500·n · →Lv4 59 500 + 20 500·n → 17 500 + 6 250·n · 85 000 + 33 750·n · 148 750 + 51 250·n xu | bàn 1 ghế → "Bàn cần 2 ghế"; đã Lv4 → "Đã tối đa"; gate Đời Quán Lv2 **LP1** · Lv3 **LP2** · Lv4 **LP4** → "Cần đạt …"; thiếu xu | lợi ích **cộng dồn** (mỗi dòng của thang ghi tổng của cấp): Lv2 **+1 đợt gọi** (`extraRounds`) · Lv3 **mồi thứ 2** (`pExtraMoi` 0,35: sau mồi đầu, chỉ món còn hàng; mâm vẫn chỉ giao khi đủ món, §4) · Lv4 **tip ×1,25** chỉ ở bàn đó (`tipMult`); chỉ có tác dụng khi bàn có 2 ghế |
| **Nâng ghế** Lv1→3 | `upgradeChair {tableId}` | `12 000 + 6 000·t`, t = số lần nâng ghế đã mua toàn quán → 30 000 + 15 000·t xu | đã Lv3 → "Đã tối đa"; gate Lv2 **LP1** · Lv3 **LP2**; thiếu xu (không đòi bàn có 2 ghế) | `patienceMult` 1 / 1,15 / 1,30 nhân kiên nhẫn chờ món của **đơn** — một lần mỗi đơn từ cùng một gốc, không cộng dồn qua các đợt; kiên nhẫn ở hàng đợi cửa và vách tip 60 % giữ nguyên |

- **Nhóm khách độc lập với quán (D17):** cặp với xác suất `spawn.pPair` 0,5, còn lại khách lẻ (nhóm ≤ 2). Cặp tới mà quán **không có bàn 2 ghế** → bỏ đi tại cửa ngay (`queue_overflow{reason:'noSeat'}`, bong bóng "2 ghế"): không trừ xu, không trừ uy tín, không tính `lost` (D12, §7); sổ ca đếm "Cặp không có chỗ: n". Không có luật này ghế 2 vô giá trị — đây là động lực mua ghế nhìn thấy được (ca 1: ~5 cặp bị từ chối).
- **Mâm theo số ghế lúc nhóm ngồi (D14):** bàn 1 ghế = mỗi khách bia (`orderShape.solo.pBeer` 0,7) **hoặc** 1 mồi tức thì còn hàng; bàn 2 ghế = bia + 1 mồi (kể cả mồi bếp). Nhóm ghi số ghế và cấp lúc ngồi (`Group.seats`, `Group.level`) và giữ chúng mọi đợt: **mua bàn/ghế/cấp không đòi bàn trống**, thứ mới áp cho nhóm ngồi sau.
- **Quán lớn hơn thì đông hơn (§1, §7):** khoảng cách giữa hai nhóm khách × `min(4, max(1, 6 / số bàn))` (`spawn.capacityDemand`: 1 bàn ×4 · 2 ×3 · 3 ×2 · 4 ×1,5 · từ 6 bàn ×1); hàng đợi `1 + ⌊tổng ghế / 8⌋`; kiên nhẫn khách thường 24 s. Bia: rót tức thì khi bom còn cốc rót sẵn và còn cốc sạch (§4). Bàn đang nhâm nhi có thể **"Mời về"** (lệnh `kickTable`, ghi chú dưới §2).
- **Nhịp đo được (bot giao thức của S5, `npm run sim:balance`, seed 42 | 99):** bàn 4 ở ca 13 | 13, ghế 2 đầu tiên ca 40 | 40 (cửa sổ cổng 40–56), bàn Lv2 đầu tiên ca 47 | 48, bàn Lv4 đầu tiên ca 81 | 82, 8 bàn Lv4 ca 163 | 165. Bot đó mua đủ 8 bàn rồi mới mua ghế; chip "Mục tiêu kế tiếp" nay không trỏ vào ghế 2 chừng nào còn mua được bàn (quyết định owner 3, 22/10/2026; trước đó chip dẫn mua bốn ghế 2 ngay sau bàn 4), nhưng chỉ gợi ý món giá ≤ 3 × tiền thu trung bình một ca (`nextGoal.reachMult`): khi bàn kế ngoài tầm (bàn 5–8 trong khoảng ca 13–40 trên thu nhập của bot) chip gợi ý thiết bị hoặc món kinh doanh trước, nên nhịp của người theo chip không phải nhịp của bot và chưa được đo (`docs/handoff/2026-10-19-vui3ca/HANDOFF.md` §12). Nút nhanh "Mua ghế" theo chip nên chỉ hiện khi đủ 8 bàn; ghế 2 vẫn mua được trong sheet từ khi đủ 4 bàn.
- **Mua trong ca (owner 09/09, D10):** sheet Nâng cấp tạm dừng ca tới khi đóng; nút nhanh **"Mua ghế bàn n · giá"** trên HUD mua một chạm, **không** mở sheet, **không** pause — chỉ hiện khi ghế 2 là mục tiêu kế tiếp và ví trả nổi.
- **Sân quán (S6):** vẽ mọi chỗ đặt bàn của mặt bằng (8) thành lưới hai cột trên điện thoại (ba cột từ 640 px), dải cửa (hàng đợi, vòng kiên nhẫn, bong bóng nhóm bị từ chối mới nhất) ở trên cùng; chỗ chưa mua là ô trống "Chỗ đặt bàn còn trống"; bàn đã mua theo sprite cấp (`table-lv1…4`), 1–2 ghế theo số ghế, hình ghế theo cấp ghế (ghế nhựa · ghế tựa nhựa · ghế gỗ đệm; hai sprite sau `status: draft`), mâm đúng số món cấp bàn cho phép (`trayDishes`) và chú thích "n chỗ · Mâm m món". Sheet: bốn món của làn Sức chứa là bốn provider của registry chip, mỗi món giá + hiệu ứng trước→sau ("1 → 2 chỗ", "kiên nhẫn ×1 → ×1,15", "+1 đợt gọi") + đúng một lý do.
- **Đời Quán:** LP1 cần "4 bàn" (không còn "4 chỗ": tránh vòng lặp chết, D18); LP7 cần "10 chỗ" (đạt được ở hẻm đầu: 8 bàn × 2 ghế = 16 chỗ).

**Snapshot sức chứa cũ** (pin ≤ 2.0.x và save chưa mở ca nào bằng snapshot bàn ghế): giữ hai đòn bẩy của bản v1.0 — mua thêm bàn (giá theo "ghế quy đổi" `extraSeatPriceBase`) và nâng 1 bàn (level ↑ tăng `capacity` 2 / 4 / 6 / 8–10, bàn phải trống, Bàn VIP cần uy tín + huy hiệu Kết Nối); bảng số ở 08-SPEC §8.6. Lần mở ca đầu tiên ghim snapshot bàn ghế chạy migration D2 một lần (§8); lịch sử rules ≤ 27 replay nguyên hash. Pin 2.0.21–2.0.23 của chuỗi Đợt 2 giữ thang của chính nó (pin ≤ 2.0.22: thang cấp bàn cũ, không lợi ích; pin 2.0.23: thang hạt giống W9) tới lần mở ca nhận bundle.

---

## 7. Spawn nhóm & cỡ nhóm 🟡

> 🟢 **Rules 28 (S1 `eco21-seat-model`, JSON 2.0.20) — thay các gạch dưới cho save mới:** cỡ nhóm = cặp với xác suất `spawn.pPair`, còn lại khách lẻ (nhóm ≤ 2, không phụ thuộc quán). Cặp mà quán **không có bàn nào 2 ghế** → bỏ đi tại cửa ngay khi tới: `queue_overflow{size, reason:'noSeat'}`, không phạt xu, không trừ uy tín, không tính `lost`/`lostStreak`, đếm vào `stats.rejected` và `stats.noSeat`; hàng đợi đầy → `queue_overflow{reason:'full'}`. Xếp bàn vẫn "bàn trống nhỏ nhất vừa nhóm" (khách lẻ ưu tiên bàn 1 ghế). Nhóm ghi số ghế lúc ngồi (`Group.seats`) và giữ mâm đó mọi đợt: bàn 1 ghế = mỗi khách bia *hoặc* 1 mồi tức thì còn hàng (`orderShape.solo.pBeer`); bàn 2 ghế = bia + 1 mồi (`orderShape.pair.pMoi`, kể cả mồi bếp). Mua bàn/ghế/cấp bàn không đòi bàn trống; ghế mới áp cho nhóm kế. Save ghim snapshot sức chứa cũ giữ luật cũ tới lần mở ca nhận snapshot bàn ghế (migration D2, §8).

> 🟢 **Rules 28 (S3 `eco21-capacity-demand`, JSON 2.0.22; D12 D19 D25) — nhịp khách, hàng đợi và kiên nhẫn của game mới:** khoảng cách tới nhóm khách kế = nhịp gốc (§ spawn, ×weather ×rush) × cỡ nhóm (`spawn.perCustomer`) × **`min(maxMult, max(1, refTables / số bàn))`** (`spawn.capacityDemand` 6 / 4: 1 bàn ×4 · 2 bàn ×3 · 3 bàn ×2 · 4 bàn ×1,5 · từ 6 bàn ×1), làm tròn **một lần** sau cả hai hệ số; áp cả trong Giờ Vàng; khách đầu ca (warmup, onboarding) không bị trễ. Hàng đợi `1 + ⌊tổngGhế / 8⌋` và kiên nhẫn khách thường **24 s** nằm trong JSON của snapshot — mô hình bàn ghế chỉ chạy ở rules ≥ 28 nên không cần cổng mã, còn snapshot sức chứa và pin ≤ 2.0.21 giữ 2 + ⌊ghế/3⌋ và 18 s; pin không có key `capacityDemand` chạy ×1 (replay rules 28 ghi trên 2.0.21 giữ nguyên từng byte). **D12:** từ chối tại cửa (`queue_overflow`, lý do `noSeat` hoặc `full`) không trừ xu, không trừ uy tín, không tính `lost`/`lostStreak`; chỉ bỏ đi vì chờ quá lâu (đơn hoặc hàng đợi) mới −5 uy tín (`reputation.customerLeft`). Sổ ca có dòng **"Cặp không có chỗ: n"** (= `stats.noSeat / 2`, cặp bỏ đi vì không bàn nào có 2 ghế; khách lẻ bị từ chối vì hàng đợi đầy nằm trong hàng "Hết chỗ" của "Vì sao khách đi"). Giờ Vàng khi quán < 2 bàn — **chưa cài**: Giờ Vàng vẫn được xếp khi quán < 2 bàn (nên có, không bắt buộc — F08).

- Hệ spawn **nhóm** vào một bàn **`EMPTY`** (theo quy tắc một-bàn-một-nhóm ở §1 — KHÔNG ghép vào bàn đang có khách): cỡ nhóm random ≤ capacity bàn đó (vd 1–4). Nhóm nhỏ hơn capacity thì ghế thừa **bỏ trống tới khi bàn về EMPTY** (không nhận nhóm khác).
- Trộn loại khách trong nhóm theo weight gốc (Thường/Vội/VIP/Chí Phèo/Ngồi lỳ). Một nhóm có thể có 1 VIP "bao mâm".
- Spawn interval & warmup giữ hằng số gốc (×weather ×rush). Rush nặng → nhóm tới dồn → dễ mất cụm.
- **Ngồi lỳ ở cấp nhóm:** nếu nhóm có khách ngồi-lỳ → `groupTimer` đợt kế dài hơn + số đợt `n` cao hơn (ngồi lâu, gọi nhiều) → nguồn thu ổn định nhưng giữ bàn.

---

## 8. Edge cases & quy tắc 🟡
- **Đơn shipper riêng (runtime rules v7):** ngừng đón khách/hết thể lực dừng đơn mới nhưng giữ đơn đang chạy tới khi giao hoặc hết hạn. Đơn này không chiếm bàn/hàng đợi/cốc; ca chưa finalize khi còn đơn. `kick-all` từ chối trước khi trừ phí nếu còn đơn giao.
- **Bàn đang `AWAITING_SERVE` mà đóng ca:** vào grace "closing" — order còn hạn vẫn phục vụ được; hết hạn thì mất như thường. `kick-all` đóng ngay khi không có đơn shipper đang chạy.
- **Chủ động mời về đóng ca (runtime rules v4):** UI hiện tổng phí trước khi xác nhận; ca vẫn chạy. Phí theo `08 §9` cho khách đang chờ/dùng món, không gọi lại nhánh khách bỏ đi: không trừ uy tín hoặc tăng `lost`. Phí ghi `spent`, không giảm `seasonEarned`/`lifetimeEarned`. Thiếu xu thì giữ khách để chờ dùng xong. Khách chưa có Order (queue/seating) có tập món đã gán rỗng nên phí 0; báo giá không tạo Order/RNG hoặc dùng nguyên liệu. Bàn `occupied` chỉ còn Chí Phèo; người đã rời không còn avatar và không tính phí. `empty/cleaning/broken` không tính lại. Đơn chưa phục vụ bị `cancelled`, món đã chuẩn bị bị waste, cốc trả rửa đúng một lần; finalize ca theo luồng hiện hành.
- **Không đủ cốc sạch/bia cho cả Order:** không giao được Order đó → đồng hồ vẫn chạy → áp lực rửa cốc/rót. (Bottleneck cốc giữ nguyên vai trò gốc.)
- **Khách Chí Phèo trong nhóm — quy tắc giữ bàn 🟢:** không trả tiền + giữ ghế lâu (patience ×5). Khi phần còn lại của nhóm sang `PAYING`/`CLEANING` mà Chí Phèo **vẫn ngồi** → **bàn KHÔNG về `EMPTY` ngay**. MVP chọn cách đơn giản: **giữ nguyên cả bàn ở trạng thái "bị chiếm" (occupied)** cho tới khi Chí Phèo tự rời (hết patience ×5) hoặc người chơi **"Mời về"** (rules 28, Đợt 3: `kickTable` trên bàn `occupied`, 0 xu, −2 uy tín mỗi khách — D3, ghi chú dưới §2; thay cách "tiễn bằng uy tín như ngồi lỳ" của bản đầu); lúc đó mới `CLEANING → EMPTY`. → bàn không nhận nhóm mới khi còn Chí Phèo (đúng tinh thần "chiếm chỗ" gốc). (Tách Chí Phèo thành occupant 1-ghế để giải phóng ghế còn lại = 🔵 post-MVP.)
- **Freshness vs Order (batch update 2026-09-09):** bia lấy từ dự trữ bom ra mâm dùng một ly sạch, bắt đầu timer riêng tại thời điểm đó; nếu đưa lên mâm sớm rồi để quá hạn trước khi giao Order → cốc đó mất hơi (hậu quả MVP mềm: tip×0 + uy tín−1, vẫn thu payment).
- **Xử lý món đã chuẩn bị khi Order fail/stale (MVP đơn giản) 🟢:** khi 1 Order `expired` (hoặc bị hủy do kết thúc buổi):
  - **Món đã `ready`/`preparing` của Order đó bị HỦY** (không tự chuyển sang khách khác).
  - **Cốc bia (đã rót) → `dirty`** vào hàng rửa (mất công rót + 1 vòng rửa = phần "phạt ngầm").
  - **Mồi đã làm → waste, KHÔNG hoàn nguyên liệu** (micro-sink hợp lý, phạt nhẹ việc làm sớm).
  - 🔵 Post-MVP có thể cho "đẩy cốc/mồi còn tươi sang đơn khác" nếu muốn giảm độ gắt.
- **Overflow:** khi tổng (ghế + queue) đầy → từ chối nhóm tại cửa (`queueOverflow`, không phạt nặng).
- **Migration D2 (rules 28):** lần mở ca đầu tiên ghim snapshot bàn ghế lên một save mô hình sức chứa: giữ `tableSlots` bàn đầu (theo thứ tự mua) của mặt bằng, mỗi bàn `min(2, sức chứa cũ)` ghế, giữ cấp bàn (chỉ có tác dụng khi bàn có 2 ghế), không hoàn xu; event `seat_model_adopted{shiftId, tablesBefore, tablesAfter, seatsBefore, seatsAfter}` đúng một lần. Lịch sử rules ≤ 27 replay nguyên hash.

---

## 9. Serve race & grace window — "chạm phục vụ nhưng khách bỏ đi" 🟢

Vi-tương-tác **lặp nhiều nhất** trong game. Gốc trumviahe áp ở mức khách lẻ; bia hơi áp ở **mức Order/bàn**. Có thêm **đồng hồ thứ 2 (mất hơi)** mà gốc không có.

### 9.1 Hai đồng hồ độc lập
- **Patience (kiên nhẫn):** của khách; ở cấp Order = `patienceMs` = min patience các khách trong nhóm lúc gọi.
- **Freshness (độ hơi):** của từng cốc bia đã rót (`beerFreshnessMs`, §6 GDD).
→ Một thao tác "Phục vụ" có thể fail vì **một trong hai** (hoặc cả hai).

### 9.2 State của Order + grace (2 tầng thất bại)
```
pending ──(rót/làm đủ, giao kịp)──▶ served
   │ hết patienceMs
   ▼
grace_leaving  ──(player chạm trong cửa sổ grace ~2–3s 🔧)──▶ served*  (fail mềm)
   │ hết grace
   ▼
expired  (fail cứng: mất cụm)
```
Hàm serve **chấp nhận cả `pending` LẪN `grace_leaving`**.

### 9.3 Bốn kết cục theo thời điểm chạm (cấp Order)
| Chạm lúc | patience | Tiền | Tip cả cụm | Phạt |
|---|---|:--:|:--:|---|
| Sớm | ≥60% | ✅ | ✅ 30% (VIP ×10) | — |
| Trễ (còn `pending`) | <60% | ✅ | ❌ 0 | — |
| **Trong grace** | ép `=⌊max×0.1⌋`≈10% | ✅ | ❌ 0 | — (fail **mềm**) |
| Sau grace → `expired` | — | ❌ | ❌ | ✅ Σ phạt từng khách ×rush, VIP ×10 + tụt uy tín (**mất cụm**, §5) |

> **Lý do giữ grace (2 mục đích):** (a) tha thứ mis-tap; (b) **hấp thụ latency** vì serve là server-authoritative — không để người chơi ăn fail cứng oan do lag.

### 9.4 Quy tắc GỘP 2 đồng hồ (chống double-count) 🟢
Khi chạm phục vụ một Order vừa trễ patience vừa có cốc hết hơi:
- **Tip = 0** nếu *bất kỳ* lý do nào kích (patience <60% **hoặc** cốc stale) — không trừ "âm" thêm.
- **Uy tín:** trừ **một lần** theo lý do nặng nhất — mất cụm (−5/khách) > cốc hết hơi (−1). Nếu vẫn giao được (fail mềm) thì chỉ áp mức nhẹ của lý do tương ứng.
- **Payment:** vẫn thu nếu Order được giao (kể cả grace / cốc stale, theo hậu quả MVP mềm §6 GDD).

### 9.5 UI/UX
- **Cảnh báo ở MỨC BÀN, không phải mỗi khách 1 vòng** (bàn 6 người = 6 vòng → vỡ màn). Dùng **viền bàn đổi màu + 1 timer/bàn** (timer của Order gấp nhất). Khách lẻ chỉ đổi nét mặt.
- **Phản hồi tại bàn:**
  - *Còn cứu:* badge loại (VIP vàng / ngồi lỳ xanh / Chí Phèo nâu) + subtitle dạy người chơi + countdown giây + nút đỏ to **✅ Phục vụ**.
  - *Đã bỏ (owner 2026-09-08):* chỉ hiện toast/noti ngắn gồm icon xu + số xu trừ và icon uy tín + điểm trừ thực tế. Không text giải thích, không popover thất bại, không nút xác nhận/Đóng. Toast tự hết và không pause ca; screen reader vẫn có mô tả mức trừ.
- **Hit area ≥ sprite bàn** (cao điểm dễ miss-tap = ức chế nhất).
- **Floating indicator theo CỤM** (1 pill tổng "+/−" cho cả Order, không phun N pill) → giữ màn sạch lúc heavy rush. Mất cụm có VIP cũng dùng cùng toast số xu/uy tín, không thêm thông báo chữ.

### 9.6 Animation timeline
```
t-3s   viền bàn VÀNG, 1-2 mặt khách nhăn, timer bàn 00:03 nhấp nháy
t-0    Order hết patience → bàn vào GRACE: viền ĐỎ pulse, cả nhóm "đẩy ghế đứng dậy" (chưa rời hẳn)
 ├─ [chạm kịp]  → ngồi lại + uống; floating "+tiền gốc" (xanh) NHƯNG KHÔNG có pill tip → dạy "cứu được, mất tip"
 └─ [không kịp] → hết grace: nhóm đi khỏi khung, ghế trống; toast icon + "−xu / −uy tín";
                  uy tín HUD giảm; bàn → CLEANING → EMPTY
```
- Phân biệt thị giác **fail mềm** (viền vàng, +tiền, không tip) vs **fail cứng** (viền đỏ, −xu) để người chơi học "phục vụ sớm = tiền tip".

### 9.7 Số cần playtest 🟡
- `graceMs` (≈2–3s) — đủ tha lỗi/latency nhưng không phá áp lực.
- Ngưỡng đổi màu viền bàn (vàng tại ~%? đỏ tại grace).
- `beerFreshnessMs` vs thời gian bưng trung bình (§6 GDD) để 2 đồng hồ không cùng quá gắt.

---

## 10. Tối thiểu cho Prototype (Phase 0/1)
Đủ để test "feel" bàn + economy, KHÔNG cần full:
- 2–3 bàn, capacity 2–4; spawn nhóm 1–4; **1–2 đợt gọi/bàn** (chưa cần lai rai 3–5). Phase 0 hiện chốt cấu hình cụ thể ở `04-SPEC-prototype-phase0.md`: **3 bàn × 2 ghế**.
- Serve theo Order (Quyết định 1); phạt theo Σ khách (Quyết định 2).
- 2 đòn bẩy bàn (mua thêm / nâng cấp) ở mức tối giản (Quyết định 3).
- Freshness cốc + bottleneck rửa cốc.
- Mục tiêu đo: **giá trị/lượt thật → đo lại k_value**, và bàn-nhóm có vui/rối không.

---
## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)
| Ver | Thay đổi |
|---|---|
| v1.4 | Owner 17–18/09: mô hình bàn ghế v3.3 (ghế = sức chứa + mâm, cấp bàn = lợi ích, thứ tự bàn→ghế→cấp, cặp độc lập, hàng đợi 1 + ghế/8, `kickTable`) — ghi ở header; §5 cũ chỉ còn giá trị lịch sử. Nguồn: `docs/FEEDBACK-2026-09-17.md` v3.3 · `docs/PLAN-vui-3-ca-2026-09-18.md` v1.6 · `docs/DESIGN-story-3-tuan-2026-09-18.md` v1.1 |
| v1.0 | Bản đầu: domain model bàn + 4 quyết định (state machine §2/§3; serve theo Order §4; phạt cụm §5; mua thêm bàn vs nâng sức chứa §6). |
| v1.1 | 5 điểm review: `OrderItem` gắn `customerId` (§1); chốt một-bàn-một-nhóm (§1,§7); kết thúc buổi khi Order đợt ≥2 fail (§5); giữ bàn khi còn Chí Phèo (§8); hủy/waste món đã chuẩn bị khi Order fail (§8). |
| v1.2 | Thêm §9 "Serve race & grace window" (chạm phục vụ trễ → khách bỏ đi: 2 đồng hồ patience/freshness, grace 2 tầng, quy tắc gộp chống double-count, UI/animation mức bàn). Prototype dời §10. |

*Liên kết: `02-GDD-trum-bia-hoi.md` §5/§6.*

| v1.3 | Owner 2026-09-08: khách bỏ đi chỉ hiện toast xu/uy tín thực trừ; bỏ text giải thích, popover thất bại và thao tác xác nhận. Giữ số ledger, grace và luật phạt. |

| v1.4 | Runtime rules v2: số đợt lấy đủ bounds trong config; nhóm trộn ưu tiên ngồi-lỳ → vội → VIP → thường. Patience hàng đợi không cộng grace của Order. Boa vẫn theo patience từng khách (§4); dọn bàn đã phục vụ không phạt lại. Lịch sử v1 giữ luật cũ khi replay. |

| v1.5 | 2026-09-09: tách phí tự nguyện đóng ca khỏi phạt bỏ đi, làm rõ v1.4 chỉ nói dọn tự nhiên. Xác nhận phí live, thiếu xu giữ nguyên, queue/seating chưa gọi món phí 0, occupied chỉ giữ Chí Phèo. Replay v1–v3 giữ hành vi cũ. |

| v1.6 | 2026-09-09: bổ sung shipper khi closing theo F07/08: dừng arrivals, giải quyết đơn đang chạy trước finalize, chặn kick-all trước debit; không thay đổi vòng đời bàn/cốc. |


## Owner update — management pause (2026-09-09)

Mở Nhập hàng, menu quản lý hoặc chi tiết/nâng cấp thiết bị tự tạm dừng gameplay.
Nhập hàng thành công vẫn giữ menu mở và tạm dừng đến khi người chơi đóng menu.
Thời gian chờ của khách/hàng đợi, chuẩn bị/rửa, độ tươi bia, ca, Giờ Vàng và đơn
giao hàng giữ nguyên phần còn lại. Đóng bằng nút ×, Escape hoặc nền ngoài menu
chạy tiếp từ phần thời gian đó. Chuyển menu hoặc đổi tab rồi trở lại không chạy
lén đồng hồ. Thẻ phục vụ cả mâm khi chạm bàn vẫn là thao tác sân đang chạy.
Các thao tác có chủ đích trong menu vẫn khả dụng theo điều kiện vốn có; điểm danh
và ngày Việt Nam theo lịch thật. Toast trừ tiền/uy tín vẫn chỉ là phản hồi số/icon.

| v1.7 | 2026-09-09: owner chốt auto-pause menu và giữ Nhập hàng mở sau mua; dừng mọi gameplay clock đồng bộ, không đóng băng ngày lịch hoặc khóa thao tác menu. Thay thế chỉ dẫn cũ về menu live. |

| 2026-09-09 batch production | Bom dự trữ tự rót theo08§8.1; lấy ra mâm giải phóng chỗ rót bù, mâm lớn có thể nhận nhiều mẻ. Ly tái sử dụng độc lập, freshness mặc định bắt đầu khi lên mâm; nguyên liệu trừ ở mẻ, không trừ lần hai khi giao. Giữ whole-table/expiry/waste/penalty. |

| v1.3 | Founder 09/09: **giữ nguyên §4 — Order chỉ giao khi ĐỦ món** (không giao mâm thiếu). Chống kẹt theo gameplay: khi gọi món, khách chỉ chọn **mồi còn hàng** (kho − phần khách khác đã gọi chưa làm > 0; hết mồi → chỉ gọi bia); bia luôn gọi, hết bia = khách bỏ đi + phạt như gốc (Thùng Cấp Cứu khi hết sạch). Engine `packages/engine` `order()` đã cài. Số: `demandMix.pHotGivenMoi` 0.5 / `pHotGivenMoiSpecial` 0.8 (08-SPEC §2). |


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |

| 2026-10-19 rules 28 (S1) | Cài header v1.4 phần bàn/ghế/nhóm: 1 bàn × 1 ghế, `buyTable` theo `tablePriceBase` + trần `tableSlots`, `buyChair` sau `chairsAfterTables` bàn (≤ 2 ghế/bàn), cặp không có bàn 2 ghế bỏ đi tại cửa (`noSeat`, không phạt), mâm theo ghế lúc ngồi, nâng bàn cần 2 ghế (lợi ích cấp ở S4), migration D2 ở lần mở ca ghim snapshot bàn ghế. §7/§8 thêm ghi chú; §5/§6 cũ chỉ còn cho save ghim snapshot sức chứa. Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S1. |
| 2026-10-20 config 2.0.21 (stage 00, review vòng 1) | Chỉ đổi nhãn: bản config mang luật bàn ghế rules 28 cùng khóa Tier C của Đợt 1 là JSON **2.0.21** (đầu nhánh S1 trước hợp nhất cũng mang nhãn 2.0.20 nhưng chưa có khóa Đợt 1); dòng "JSON 2.0.20" ở trên chỉ tên đầu nhánh S1 cũ. Không đổi luật hay số nào — xem 08-SPEC §22 changelog. |
| 2026-10-20 rules 28 (S2) | Cài rót tức thì (ghi chú ở §4): `prepare()` không xếp bia vào vòi trên snapshot bàn ghế; món bia `ready` cùng tick khi `beer.ready > 0` + cốc sạch; vòi (`pourSlots`/`pourMs`) ra khỏi đường phục vụ, key giữ cho snapshot sức chứa và replay rules ≤ 27. Không đổi số, không bump JSON (2.0.21). Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S2, `docs/FEEDBACK-2026-09-17.md` II.1. |
| 2026-10-20 rules 28 (S3) | Cài nhịp khách theo sức chứa (`spawn.capacityDemand`), hàng đợi `1 + ⌊ghế/8⌋`, kiên nhẫn 24 s và dòng sổ ca "Cặp không có chỗ" (ghi chú ở §1 và §7). Từ chối tại cửa không phạt đã đúng từ S1, S3 chỉ ghim bằng test cả lý do `full`. JSON 2.0.22; k và bảng bỏ đi của bot career ghi ở 08-SPEC changelog (gate k hoãn cho S5). Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S3, D12 D19 D25. |
| 2026-10-20 rules 28 (S3, review vòng 1) | Sửa một câu của ghi chú S3 ở §7 (chỉ mô tả, mã không đổi): "Giờ Vàng khi quán < 2 bàn: không xếp lịch lại" nói ngược mã — S3 **chưa cài** luật đó, `startShift` vẫn xếp Giờ Vàng nhẹ/nặng khi quán < 2 bàn (ca 1 chỉ bỏ qua nhờ `onboarding.firstShift.rushDisabled`); luật vẫn là "nên có, không bắt buộc" (F08, DECISIONS `02 · "no rush below two tables"`). |
| 2026-10-20 rules 28 (S4) | Cài cấp bàn và cấp ghế (ghi chú ở §6): `upgradeTable` Lv1→4 (bàn 2 ghế; giá theo cấp đích `priceBase + stepBase × n`, n = số bàn đã đạt cấp đó; gate Đời Quán Lv2 LP1 / Lv3 LP2 / Lv4 LP4, bỏ gate Kết Nối), `upgradeChair` Lv1→3 (`4 000 + 2 000·t`, LP1 / LP2). Lợi ích chốt cho nhóm lúc ngồi: Lv2 +1 đợt gọi, Lv3 mồi thứ 2 (`pExtraMoi` 0,35, chỉ món còn hàng, mâm giao khi đủ món), Lv4 tip ×1,25 ở bàn đó, ghế `patienceMult` 1 / 1,15 / 1,30 trên kiên nhẫn của đơn. JSON 2.0.23, thay key postmvp `backrest`; pin ≤ 2.0.22 giữ thang cũ từng byte. Số đo career: 08-SPEC changelog 2026-10-20 S4. Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S4, D14 D15 D18 D19. |
| 2026-10-20 rules 28 (S5) | Số chốt cho bàn/ghế/trần bàn (ghi chú ở §6; JSON 2.1.0): `tablePriceBase` 600 · 2 000 · 4 000 · 7 500 · 12 500 · 20 000 · 31 300, `chairPriceBase` 10 000 … 70 000, `tableSlots` 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8 (thay "mọi mặt bằng = 4" của S1); luật mới duy nhất ở S5 là 3 ca đầu mở không cần cooldown (`shift.noCooldownFirstShifts`; mở ca đặt thể lực = 100 %; chỉ rules 28). Vòng đời bàn, phạt cụm và quy tắc serve không đổi. |
| 2026-10-21 rules 28 (S5, review vòng 1) | Số chốt mới thay dòng 2026-10-20 (ghi chú ở §6; JSON 2.1.0): `tablePriceBase` 600 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000, `chairPriceBase` 400 … 2 800 (gần như miễn phí: bot của plan mua bàn 2…8 trước ghế 2 đầu tiên), `tableSlots` **8** ở mọi mặt bằng, giá nâng bàn/ghế mới; vòng đời bàn, phạt cụm và quy tắc serve không đổi. Với người chơi thật `chairsAfterTables` = 4 vẫn cho mua ghế từ bàn 4. |
| 2026-10-21 rules 28 (S5, review vòng 2) | `tableSlots` 8 ở mọi mặt bằng (§6 ghi chú) là quyết định owner thứ hai của S5 — đảo D13 "hẻm đầu = 4 bàn" (bảng so sánh với 4·4·5·6·6·7·8·8·8 và toàn 4: BLOCKERS `04 · tableSlots`); với tám chỗ ở mọi nơi một mặt bằng không mở thêm bàn nào. Các số bàn / ghế / cấp giữ như dòng vòng 1. |
| 2026-10-21 rules 28 (S5, quyết định owner) | Giá bàn 2 (`tablePriceBase[0]`, ghi chú ở §6; JSON 2.1.0) **600 → 428 base = 1 070 xu** (trước 1 500 xu): quyết định owner 1 của S5 (founder, 21/10/2026): kết ca 1 phải mua nổi bàn 2 ở ≥ 4 lượt trong 5, cơ chế là giá bàn 2; `tableSlots` 8 ở mọi mặt bằng được duyệt (quyết định owner 2, đảo D13). Các số bàn 3…8, ghế, cấp, gate Đời Quán và lợi ích giữ nguyên. Bảng cổng và cách chọn giá: 08-SPEC changelog 2026-10-21 (vòng quyết định owner), DECISIONS `## 04 · owner decision 1`. |
| 2026-10-21 rules 28 (S6) | UI, không đổi luật hay số (ghi chú 🟢 S6 ở §6): sân vẽ mọi chỗ đặt bàn của mặt bằng (8) thành lưới, ô trống cho chỗ chưa mua, bàn theo cấp, ghế theo số ghế và cấp ghế (hai sprite mới `chair-backrest`, `chair-cushion`), mâm đúng số món cấp bàn cho phép (`trayDishes`); sheet Nâng cấp nhận ghế 2 và cấp ghế làm món của registry (chip giữ luật, có thể trỏ vào ghế); nút nhanh "Mua ghế" trên HUD không pause (D10). Bằng chứng: `yard.spec.ts`, `quick-chair.spec.ts`, `tray-dishes.test.ts`, `next-goal.test.ts`. |
| 2026-10-21 rules 28 (S6, review vòng 1) | UI, không đổi luật hay số (ghi chú 🟢 S6 ở §6 giữ nguyên, hai chỗ sửa): (1) cửa hàng đợi (vòng kiên nhẫn, bong bóng "2 ghế" / "Hết chỗ") là **dải trên cùng của sân** (`.yard-door`), lưới 8 chỗ nằm dưới với 56 px trống cho bong bóng gọi món của hàng đầu — trước đó cửa neo đáy sân nên 8 chỗ đẩy nó xuống dưới mép màn hình ở ca 1 (P0(c)); (2) mọi món làn Sức chứa in **hiệu ứng trước→sau** ("1 → 2 chỗ", "kiên nhẫn ×1 → ×1,15", "+1 đợt gọi", "+1 chỗ") và lý do ghế khoá là "Mở sau khi đủ {n} bàn" (n = `chairsAfterTables`, trước đó "Mua đủ bàn trước" sai trên hẻm 8 chỗ). Bằng chứng: `first-shift-visual.spec.ts` (cửa trong khung nhìn), `yard.spec.ts` (ca đang chạy), `seat-model.spec.ts`, `buy-reasons.spec.ts`, `table-upgrades.spec.ts`, `next-goal.test.ts`. |
| 2026-10-22 rules 28 (Đợt 3 `fun-kick-table`) | Nhánh thoát thứ 3 của vòng đời bàn (ghi chú 🟢 dưới §2): `kickTable {tableId, maxCost}` "Mời về" đưa bàn **đang nhâm nhi** (`consuming` hoặc `occupied` chỉ còn Chí Phèo) sang `CLEANING` rồi `EMPTY`, nhóm đang chờ ở cửa vào bàn; không áp dụng khi khách chờ món / đang ngồi vào / bàn dọn / bàn trống. Xu = Σ round(gross đơn gần nhất × `kickTable.feeRate` 1,5 × `leavePenaltyMult`) (VIP ×10, Chí Phèo 0), uy tín −`kickTable.repPerGuest` 2 mỗi khách (không ×k); không `lost`, không phạt −5. Key mới Tier A (08-SPEC §22 dòng `kickTable`, changelog 2026-10-22); JSON giữ nhãn 2.1.0. Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §6, `docs/FEEDBACK-2026-09-17.md` II.3, D3. |
| 2026-10-22 rules 28 (Đợt 3 `fun-kick-table`, review vòng 1) | Ghi chú 🟢 dưới §2: nút "Mời về" chỉ hiện khi ca đang mở (khi đóng ca không còn khách tới, nút "Mời tất cả về" của sổ ca rẻ hơn — `penalty.leaveRate` mỗi khách thay vì `feeRate`); lệnh `kickTable` của engine vẫn nhận bàn đang nhâm nhi trong lúc đóng ca. Lý do khi mờ đổi thành "Khách chưa dùng món xong" (đúng cho cả bàn đang ngồi vào lẫn đang chờ món; trước: "Khách đang chờ món"). Không đổi luật hay số. |
| 2026-10-22 rules 28 (Đợt 4 đóng gói "Vui 3 ca", stage 07) | **Viết lại thân §6** (plan §7: "viết lại thân 03-SPEC §5" — ghi chú đầu file v1.4 và plan gọi mục "mua thêm bàn vs nâng sức chứa" là §5; trong file là §6 "QUYẾT ĐỊNH 3", §5 là phạt cụm từ v1.0): bản hiện hành là mô hình bàn ghế rules 28 với số JSON 2.1.0 — bốn đòn bẩy (mua bàn · ghế 2 · cấp bàn · cấp ghế) trong một bảng giá + lý do khi mờ + tác dụng, nhóm độc lập với quán, mâm theo ghế, cầu theo sức chứa, nhịp đo được của bot S5 và OWNER CALL ghế-trước-bàn-5 (HANDOFF vui3ca §12), mua trong ca, sân S6; ba ghi chú S4/S5/S6 cũ của §6 gộp vào thân (nội dung giữ, số W9 của S4 thay bằng số chốt 2.1.0); luật snapshot sức chứa cũ gọn trong một đoạn cuối mục. Cùng đợt, sửa ba câu sai với rules 28: §1 chú thích `Table.level` / `capacity` (+ `chairLevel`), §5 thêm ghi chú nhóm ≤ 2 (cụm tối đa −10 uy tín), §8 Chí Phèo "tiễn bằng uy tín như ngồi lỳ" → "Mời về" (0 xu, −2 uy tín/khách, D3). Không đổi luật hay số; số đối chiếu với `docs/config/economy.tbh.json` 2.1.0 và `npm run sim:balance`. |
| 2026-10-22 rules 28, JSON 2.1.1 (vòng quyết định owner của PR #30, stage 07b) | Ghi chú 🟢 "Mời về" dưới §2: giá `feeRate` **0,5** (quyết định owner 1: luật +10 % đọc theo thu nhập ròng sau phí; Đợt 3 từng chốt 1,5 theo thu nhập gộp), VIP tốn 5× gross mâm; "đang nhâm nhi" = `consuming` + `occupied` giữ như niêm phong (quyết định owner 2). Thân §6, dòng "Nhịp đo được": chip "Mục tiêu kế tiếp" không gợi ý ghế 2 trước bàn 8 (quyết định owner 3; bộ lọc tầm với có thể cho thiết bị đi trước bàn 5–8, nhịp của người theo chip chưa đo — review 07b vòng 1), nút nhanh "Mua ghế" chỉ hiện sau bàn 8; dòng đầu §6 "Bản hiện hành" ghi JSON 2.1.1. Sửa tại chỗ; DECISIONS `## 07 · owner calls 2026-10-22`. |
