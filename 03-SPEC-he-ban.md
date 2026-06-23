# 📐 SPEC — Hệ Bàn (Table System) — Trùm Bia Hơi

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
  level: number             // cấp bàn -> sprite + capacity
  variant: 'thuong' | 'vip'
  capacity: number          // số ghế (= "ghế quy đổi"); xem §5
  seats: (Customer | null)[]// length = capacity
  state: TableState         // §2
  orders: Order[]           // nhiều ĐỢT theo thời gian (lai rai)
  groupArrivedAt: number
  groupTimer?: number       // hẹn đợt gọi tiếp theo
}
```

**Sức chứa quán** = Σ `capacity` của các bàn = "tổng ghế quy đổi" → đưa vào công thức hàng đợi gốc: `queueSlots = 2 + ⌊tổngGhế / 3⌋`. Vượt → `queueOverflow` (từ chối tại cửa, gần như không phạt — giữ cơ chế gốc).

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

---

## 6. QUYẾT ĐỊNH 3 — Mua thêm bàn vs Nâng sức chứa bàn? 🟢

**CHỐT: HAI đòn bẩy tách biệt, cùng tiêu xu, phục vụ 2 mục tiêu khác nhau.**

| | **Mua thêm bàn** | **Nâng cấp 1 bàn (level↑)** |
|---|---|---|
| Tác dụng | +1 bàn mới (capacity nhỏ ban đầu) | tăng `capacity` của bàn đó + đổi sprite |
| Mục tiêu | **nhiều nhóm song song** (đa nhiệm rộng) | **nhóm to hơn/bàn** (combo+VIP cụm sâu) |
| Đánh đổi | rộng nhưng dàn trải thao tác | sâu nhưng dồn rủi ro vào 1 bàn (mất cụm to) |
| Chi phí | đường cong "mua ghế" gốc, ×k | đường cong nâng cấp thiết bị, ×k |

- **Tổng "ghế quy đổi"** = Σ capacity → vẫn nuôi công thức queue gốc, nên cả 2 đều làm tăng throughput nhưng theo hình dạng khác.
- 🟡 Đề xuất cấp bàn (capacity): Bàn con 2 · Bàn vuông 4 · Bàn dài 6 · Bàn VIP 8–10.
- **Gate bàn VIP** = uy tín [3k–40k]×k + huy hiệu Kết Nối (**free-only**, không qua donation — xem GDD §16).
- Số bàn tối đa & capacity tối đa 🟡 cân theo màn hình mobile (đừng để quá rối).

---

## 7. Spawn nhóm & cỡ nhóm 🟡

- Hệ spawn **nhóm** vào một bàn **`EMPTY`** (theo quy tắc một-bàn-một-nhóm ở §1 — KHÔNG ghép vào bàn đang có khách): cỡ nhóm random ≤ capacity bàn đó (vd 1–4). Nhóm nhỏ hơn capacity thì ghế thừa **bỏ trống tới khi bàn về EMPTY** (không nhận nhóm khác).
- Trộn loại khách trong nhóm theo weight gốc (Thường/Vội/VIP/Chí Phèo/Ngồi lỳ). Một nhóm có thể có 1 VIP "bao mâm".
- Spawn interval & warmup giữ hằng số gốc (×weather ×rush). Rush nặng → nhóm tới dồn → dễ mất cụm.
- **Ngồi lỳ ở cấp nhóm:** nếu nhóm có khách ngồi-lỳ → `groupTimer` đợt kế dài hơn + số đợt `n` cao hơn (ngồi lâu, gọi nhiều) → nguồn thu ổn định nhưng giữ bàn.

---

## 8. Edge cases & quy tắc 🟡
- **Bàn đang `AWAITING_SERVE` mà đóng ca:** vào grace "closing" — order còn hạn vẫn phục vụ được; hết hạn thì mất như thường. `kick-all` đóng ngay.
- **Không đủ cốc sạch/bia cho cả Order:** không giao được Order đó → đồng hồ vẫn chạy → áp lực rửa cốc/rót. (Bottleneck cốc giữ nguyên vai trò gốc.)
- **Khách Chí Phèo trong nhóm — quy tắc giữ bàn 🟢:** không trả tiền + giữ ghế lâu (patience ×5). Khi phần còn lại của nhóm sang `PAYING`/`CLEANING` mà Chí Phèo **vẫn ngồi** → **bàn KHÔNG về `EMPTY` ngay**. MVP chọn cách đơn giản: **giữ nguyên cả bàn ở trạng thái "bị chiếm" (occupied)** cho tới khi Chí Phèo tự rời (hết patience ×5) hoặc bị xử (tiễn bằng uy tín như "ngồi lỳ"); lúc đó mới `CLEANING → EMPTY`. → bàn không nhận nhóm mới khi còn Chí Phèo (đúng tinh thần "chiếm chỗ" gốc). (Tách Chí Phèo thành occupant 1-ghế để giải phóng ghế còn lại = 🔵 post-MVP.)
- **Freshness vs Order:** mỗi cốc bia trong Order có timer riêng; nếu rót sớm rồi để quá hạn trước khi giao Order → cốc đó mất hơi (hậu quả MVP mềm: tip×0 + uy tín−1, vẫn thu payment).
- **Xử lý món đã chuẩn bị khi Order fail/stale (MVP đơn giản) 🟢:** khi 1 Order `expired` (hoặc bị hủy do kết thúc buổi):
  - **Món đã `ready`/`preparing` của Order đó bị HỦY** (không tự chuyển sang khách khác).
  - **Cốc bia (đã rót) → `dirty`** vào hàng rửa (mất công rót + 1 vòng rửa = phần "phạt ngầm").
  - **Mồi đã làm → waste, KHÔNG hoàn nguyên liệu** (micro-sink hợp lý, phạt nhẹ việc làm sớm).
  - 🔵 Post-MVP có thể cho "đẩy cốc/mồi còn tươi sang đơn khác" nếu muốn giảm độ gắt.
- **Overflow:** khi tổng (ghế + queue) đầy → từ chối nhóm tại cửa (`queueOverflow`, không phạt nặng).

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
- **Popover 2 trạng thái:**
  - *Còn cứu:* badge loại (VIP vàng / ngồi lỳ xanh / Chí Phèo nâu) + subtitle dạy người chơi + countdown giây + nút đỏ to **✅ Phục vụ**.
  - *Đã bỏ:* popover đỏ — dòng **"😤 Khách bỏ đi"** + nút **"Đóng"** (xác nhận thất bại tường minh, **1 chạm bỏ qua**).
- **Hit area ≥ sprite bàn** (cao điểm dễ miss-tap = ức chế nhất).
- **Floating indicator theo CỤM** (1 pill tổng "+/−" cho cả Order, không phun N pill) → giữ màn sạch lúc heavy rush. Mất cụm có VIP → pill riêng "🚨 Mất khách sộp!".

### 9.6 Animation timeline
```
t-3s   viền bàn VÀNG, 1-2 mặt khách nhăn, timer bàn 00:03 nhấp nháy
t-0    Order hết patience → bàn vào GRACE: viền ĐỎ pulse, cả nhóm "đẩy ghế đứng dậy" (chưa rời hẳn)
 ├─ [chạm kịp]  → ngồi lại + uống; floating "+tiền gốc" (xanh) NHƯNG KHÔNG có pill tip → dạy "cứu được, mất tip"
 └─ [không kịp] → hết grace: nhóm đi khỏi khung, ghế trống; floating "−xu" (đỏ) + "🚨" nếu có VIP;
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
| v1.0 | Bản đầu: domain model bàn + 4 quyết định (state machine §2/§3; serve theo Order §4; phạt cụm §5; mua thêm bàn vs nâng sức chứa §6). |
| v1.1 | 5 điểm review: `OrderItem` gắn `customerId` (§1); chốt một-bàn-một-nhóm (§1,§7); kết thúc buổi khi Order đợt ≥2 fail (§5); giữ bàn khi còn Chí Phèo (§8); hủy/waste món đã chuẩn bị khi Order fail (§8). |
| v1.2 | Thêm §9 "Serve race & grace window" (chạm phục vụ trễ → khách bỏ đi: 2 đồng hồ patience/freshness, grace 2 tầng, quy tắc gộp chống double-count, UI/animation mức bàn). Prototype dời §10. |

*Liên kết: `02-GDD-trum-bia-hoi.md` §5/§6.*
