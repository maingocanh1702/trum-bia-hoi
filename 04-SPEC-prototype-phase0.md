# 🧪 SPEC — Prototype Phase 0 (client-only) — Trùm Bia Hơi

> Spec tối thiểu để dựng prototype validate **"feel"** và **đo lại `k_value`** trước khi cam kết stack/scope đầy đủ. Nguồn số: `02-GDD-trum-bia-hoi.md` (v1.3) §2/§3/§4/§6/§7/§8 + `economy-spec-from-bundle.md` §3/§4 + `03-SPEC-he-ban.md`. **GDD vẫn là nguồn sự thật**; doc này chỉ cụ thể hóa con số khởi điểm cho prototype.
> Ngày: 2026-06-09. Nhãn: 🟢 CORE = không đổi trong Phase 0 · 🟡 = số khởi điểm, **được phép chỉnh khi đo**.

---

## 1. Mục tiêu — câu hỏi prototype phải trả lời

1. **`k_value` thật là bao nhiêu?** Giả định 2.5; đo `DT_bia_mỗi_lượt` thực rồi tính `k = DT_bia_mỗi_lượt / 82.5`. Chấp nhận 2.0–3.0.
2. **Bia mất hơi có "feel" đúng không?** Base 12s có tạo căng thẳng "rót đúng nhịp, đừng tích cốc" mà không phạt oan?
3. **Bàn nhóm có "feel" đúng không?** Phục vụ theo bàn (nhiều khách/đợt) sướng hay rối?
4. **Nhịp tay ở 2 mức rush** có đủ dồn dập mà không quá tải?
5. **Bottleneck cốc (vòng đời + rửa)** có đúng là điểm nghẽn chính như thiết kế?

> Prototype **không** nhằm vui/đẹp/đầy đủ. Chỉ cần đủ để cảm 5 thứ trên + log số để đo.

---

## 2. Phạm vi

**TRONG (build):** 1 màn quán · **3 bàn** (2 ghế/bàn = 6 chỗ) · menu **3 món**: bia + 2 mồi (lạc, nem chua — đều prep tức thì để khỏi cần hệ Bếp) · **freshness cốc** · **vòng đời cốc + rửa** · **tip/patience** · **2 mức rush** (thường / cao điểm) · log đo.

**NGOÀI (Phase 0 không làm):** meta (uy tín dài hạn, league, Life Path, mặt bằng) · sự kiện (World Cup, xổ số) · risk (bảo kê, kiểm tra ATTP) · Bếp + 3 mồi nóng · shipper · biển hiệu/cosmetic · server (chạy client-only, không persist) · Chí Phèo & quà cốc (giữ buy-cap 10 cố định, bỏ cơ chế tặng).

> ⚠️ **Design/UIUX/icon — KHÔNG làm ở Phase 0 (cố ý).** Prototype chỉ đo *feel* + *k_value*; art đẹp sẽ làm lệch đánh giá "core có vui không". Dùng **placeholder thuần**: hình hộp/vòng tròn màu, emoji (🍺 cốc bia · 🥜 lạc · 🍢 nem · 🔴 cờ vàng mất hơi đổi sang ⚠️), text nhãn, không sprite/animation chỉn chu. Màu chỉ cần phân biệt trạng thái (clean/dirty/in_use, fresh/cảnh báo/hết hơi). Design tokens + asset/icon thật bắt đầu ở Phase 1 — xem `05-SPEC-design-uiux.md`.

---

## 3. State model tối thiểu 🟢

```ts
type Dish = 'bia' | 'lac' | 'nem'

type Glass = { id: string; state: 'clean' | 'in_use' | 'dirty' | 'washing' }

type OrderItem = {
  dish: Dish
  customerId: string
  needsGlass: boolean          // chỉ 'bia' = true
  glassId?: string             // gán khi rót
  pouredAt?: number            // mốc bắt đầu đếm freshness (chỉ bia)
  state: 'pending' | 'ready' | 'served'
}

type Customer = {
  id: string
  type: 'thuong' | 'voi' | 'vip'   // Phase 0 chỉ 3 loại
  tableId: string
  seatIndex: number
  state: 'waiting' | 'ordered' | 'served' | 'enjoying' | 'left'
  patienceMs: number; maxPatienceMs: number
  payment: number; tip: number
}

type Table = {
  id: string
  seats: (Customer | null)[]       // 2 ghế
  orders: OrderItem[]              // gom item của các khách trong bàn
}

type World = {
  coins: number
  glasses: Glass[]                 // tối đa 10 (buy-cap), Phase 0 cố định
  tables: Table[]                  // 3 bàn
  queue: Customer[]                // hàng đợi
  shift: { elapsedMs: number; rush: 'normal' | 'peak' }
  log: ServeEvent[]                // §5 đo k
}
```

Vòng đời cốc 🟢: `clean → in_use → dirty → washing → clean`.
State machine khách 🟢: `waiting → ordered → (rót/làm mồi) → served → enjoying → left`. Hết patience trước `served` → `left` (mất khách).

---

## 4. Số khởi điểm 🟡 (đều chỉnh được khi đo)

**Menu (xu — giữ nguyên GDD §2):**

| Món | Giá bán | Vốn sỉ | Lời/đv | Cần cốc | Prep |
|---|--:|--:|--:|:--:|---|
| Bia hơi | 50 | 10 | 40 | ✅ | rót 3.000ms |
| Lạc | 75 | 26 | 49 | ❌ | tức thì |
| Nem chua | 150 | 60 | 90 | ❌ | tức thì |

**Spawn & patience (economy-spec §3):**
- Spawn base: **10.500ms/khách**; lượt đầu ca ×1.6 = **16.800ms** (warmup).
- Patience base: **18.000ms** (khách thường). VIP/vội ×0.611 = **~11.000ms**.
- Enjoy time (giữ ghế sau khi served): random **5.000–10.000ms**.

**Throughput (GDD §4):**
- Cốc: **10 cái** clean lúc mở ca (buy-cap, Phase 0 cố định, không tặng).
- Rửa cốc: khởi điểm **1 slot, wash 7.000ms** (cấp thấp nhất → để cốc là bottleneck rõ; có nút "nâng rửa" giả lập 3 slot × 2.500ms để test feel khi gỡ nghẽn).
- Rót bia: 1 vòi, 3.000ms/cốc.

**Freshness — bia mất hơi (GDD §6, MVP mềm):**
- Base **12.000ms** kể từ `pouredAt`.
- Cảnh báo "cờ vàng" ở ~9.000ms (75%).
- Quá hạn khi phục vụ: **tip ×0**, vẫn thu payment (MVP mềm). Phase 0 bỏ giảm uy tín (chưa có meta).

**Tip (GDD §8):**
- Nếu `patience/maxPatience < 0.6` → tip 0; ngược lại `round(payment × 0.3)`.
- ×freshness (0 nếu cốc hết hơi) ×type (VIP ×10).
- Bỏ ×rush/×weather/×QR/×well-rested ở Phase 0 (giữ công thức tối giản).

**Rush:**
- `normal`: spawn ×1.0.
- `peak`: spawn interval ×0.66 (≈ dồn 1.5×), bật bằng nút để cảm nhịp tay; chưa cần lịch tự động.

**Loại khách (weight, GDD §7):** thường 1.0 · vội 0.3 · VIP 0.1. (Bỏ Chí Phèo/ngồi lỳ/shipper.)

---

## 5. Cách đo `k_value` 🟢 (bất biến phương pháp)

Mỗi lần một khách **served** (trả tiền), ghi 1 `ServeEvent`:

```ts
type ServeEvent = {
  t: number
  customerType: string
  dishes: Dish[]
  payment: number      // chưa gồm tip
  tip: number
  hadMoi: boolean      // có gọi kèm mồi không
}
```

Sau N lượt (mục tiêu ≥ 500 lượt mô phỏng hoặc gộp nhiều ca):
- `DT_bia_mỗi_lượt = mean(payment + tip)` trên tất cả lượt.
- **`k = DT_bia_mỗi_lượt / 82.5`** (82.5 = giá trị/lượt trà đá gốc — hằng số neo, KHÔNG đổi).
- Đối chiếu giả định 207 xu/lượt → 2.5.

**Bất biến tuyệt đối (GDD §3):** throughput (số bàn, bàn gọi nhiều đợt, tốc độ thiết bị) **không bao giờ** cộng vào k — nó chỉ là đòn bẩy giúp chạm trần nhanh hơn. k chỉ tính từ **giá trị/lượt**, không từ tốc độ.

In ra cuối mỗi ca: số lượt, DT_bia_mỗi_lượt, k suy ra, % lượt có mồi, % cốc hết hơi, số khách bỏ đi.

---

## 6. Tiêu chí pass / fail (gate sang Phase 1)

| Hạng mục | PASS khi | Tín hiệu cần chỉnh |
|---|---|---|
| k_value | đo ra ổn định trong **2.0–3.0** qua nhiều ca | lệch xa → cập nhật k (chỉnh số, không chỉnh phương pháp) |
| Mất hơi | người chơi **chủ động giãn nhịp rót**, hiếm phạt oan nhờ cờ vàng | luôn dính phạt dù chơi tốt → tăng base 12s; không bao giờ dính → giảm |
| Bàn nhóm | phục vụ theo bàn **rõ ràng, không rối** thao tác | rối → xem lại gom Order/UI mức bàn (`03-SPEC-he-ban.md`) |
| Bottleneck cốc | cốc/rửa **là** điểm nghẽn cảm nhận được; nâng rửa thấy đỡ ngay | không thấy nghẽn → giảm cốc hoặc tăng wash time |
| Nhịp 2 rush | `peak` dồn dập mà vẫn xử được | quá tải/quá nhạt → chỉnh hệ số spawn |

---

## 7. Việc kế (sau khi spec này được duyệt)

1. **Chốt stack thực thi** cho prototype (Pixi+React đúng đích GDD, hay canvas thuần để lặp nhanh — quyết định riêng).
2. Scaffold theo §3 state model: vòng đời cốc + spawn + serve loop + log §5.
3. Chạy nhiều ca, thu log, điền số thật vào §6, cập nhật `k` trong GDD §3 nếu lệch.
4. Ghi kết quả vào `RESEARCH-LOG-live-play.md` / `SESSION-TRACK-LOG.md`.

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|---|---|
| v0.1 | Bản đầu: mục tiêu, phạm vi in/out, state model tối thiểu, số khởi điểm (bám GDD v1.3 §2/§3/§4/§6/§7/§8 + economy-spec §3), phương pháp đo k (bất biến), tiêu chí pass/fail. |
| v0.2 | Thêm note rõ Phase 0 dùng **placeholder art** (không design/UIUX/icon thật); trỏ design sản xuất sang `05-SPEC-design-uiux.md` (Phase 1). |

*Nguồn: `02-GDD-trum-bia-hoi.md` (v1.3), `economy-spec-from-bundle.md`, `03-SPEC-he-ban.md`, `scripts/measure_k.py`.*
