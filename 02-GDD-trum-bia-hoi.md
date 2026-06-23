# 🍺 GAME DESIGN DOCUMENT — Trùm Bia Hơi (v1.5)

> Tài liệu thiết kế game hoàn chỉnh. Tổng hợp từ nghiên cứu game tham chiếu `trumviahe.com` (`00-TONG-HOP`, `economy-spec-from-bundle`) + các quyết định chuyển hóa trong `01-MAP-tra-da-to-bia-hoi.md` (v0.9). Ngày: 2026-06. Người chơi mục tiêu: người Việt, mobile-first.
>
> **Quy ước:** số có 🔧 = đề xuất cần xác nhận qua playtest. `k = 2.5` là hệ số rescale economy (xem §3). Mọi hằng số thời gian/%margin/tip/weight **giữ nguyên** từ trumviahe; chỉ giá trị xu được ×k.

> **⚠️ Mức độ cam kết — đọc trước.** Tài liệu này KHÔNG đồng nhất "đã chốt". Mỗi quyết định gắn 1 trong 3 nhãn:
> - 🟢 **CORE** — hướng thiết kế cốt lõi, ổn định (concept: phục vụ theo ca, hệ bàn, bia mất hơi, 5 lớp economy, server-authoritative).
> - 🟡 **PROTOTYPE-ASSUMPTION** — giả định để bắt đầu, **được phép đổi sau khi đo** (k_value, số freshness/prep/giá cấp, hậu quả mất hơi).
> - 🔵 **POST-MVP** — ý tưởng để sau, chưa cam kết, một số cần review (World Cup API, xổ số/Vietlott, Giải Nhậu/Đường Lên Trùm đầy đủ, bảo kê, donation).
> Xem bảng tổng ở §20.

---

## 1. Tổng quan

**Một câu:** Game idle/tycoon **phục vụ khách theo ca** ở một **quán bia hơi vỉa hè Việt Nam** — rót bia kịp lúc, dọn bàn nhậu, sống sót qua giờ tan tầm và mùa World Cup, leo từ hẻm nhỏ lên trùm bia.

**Thể loại:** Idle/tycoon phục vụ thời gian thực, mobile-first web.
**Nền tảng:** Web (Pixi.js canvas + React DOM overlay), **server-authoritative** (API + websocket). Xem §18.
**Chủ đề & bản sắc:** quán bia hơi vỉa hè — bàn inox, ghế nhựa đỏ, bom bia, mồi nhậu Bắc Bộ, "dô dô", vé số dạo, xem bóng đá. Tagline kế thừa: "rèn tư duy kinh doanh".
**Triết lý kinh tế:** giữ **5 lớp economy** đã được chứng minh ở trà đá (unit · throughput · demand-mix · risk · meta), thay toàn bộ "vỏ" sang bia hơi, thêm 2 cơ chế đặc thù: **bàn nhậu** và **bia mất hơi**.

**Vòng lặp cốt lõi (core loop):**
```
Mở ca (thể lực 100%)
  → khách đổ vào theo bàn (~ca 12 phút)
  → rót bia kịp "độ hơi" + làm mồi + phục vụ đúng bàn/đúng món
  → thu tiền + tip + uy tín; dọn bàn, rửa cốc (bottleneck)
  → sống qua rush (tan tầm / giờ trận World Cup) & rủi ro (bảo kê, kiểm tra)
  → hết thể lực đóng ca → xem sổ sách → nâng cấp (bàn/bom/rửa/bếp/hầm lạnh)
  → leo Giải Nhậu theo Vụ Bia + Đường Lên Trùm + đổi mặt bằng
```

---

## 2. Kinh tế đơn vị — Menu (Lớp 1)

6 món: 1 đồ uống lõi (quay vòng cốc) + 5 mồi (3 tầng prep). Giá tính bằng **xu** (neo: 1 xu ≈ 300 VND, bia cốc = 50 xu = 15k thật).

| # | Món | Giá bán (xu) | Vốn sỉ (xu) | Margin | Lời/đơn vị | Cần cốc? | Prep | Mở khóa |
|---|---|--:|--:|--:|--:|:--:|---|---|
| 1 | **Bia hơi (cốc)** | 50 | 10 | 80% | 40 | ✅ | rót ~3s | từ đầu |
| 2 | Lạc (đậu phộng) | 75 | 26 | 65% | 49 | ❌ | tức thì | từ đầu |
| 3 | Nem chua | 150 | 60 | 60% | 90 | ❌ | tức thì | từ đầu |
| 4 | Đậu tẩm hành | 100 | 45 | 55% | 55 | ❌ | 🔧 ~8s | Bếp Lv1 |
| 5 | Tóp mỡ Triều Khúc | 165 | 82 | 50% | 83 | ❌ | 🔧 ~10s | Bếp Lv1 |
| 6 | **Lòng xào dưa** | 280 | 155 | 45% | 125 | ❌ | 🔧 ~15s | Bếp Lv2 |

**Đặc tính kinh tế quan trọng (khác trà đá có chủ đích):**
- **Bia = workhorse**: rẻ nhất, tần suất cao nhất, kéo khách & quay vòng cốc; lời/đơn vị thấp nhưng volume.
- **Mồi cao cấp = trung tâm lợi nhuận**: lòng xào dưa lời ~125 ≈ 3× bia → upsell tại bàn là trục kiếm tiền.
- **Margin vẫn cao (45–80%)** → đúng triết lý gốc: **burn không nằm ở COGS** mà ở nâng cấp/rent/phạt.
- Mua nguyên liệu giữ cơ chế **+10 (giá sỉ, chiết khấu ~17–25% so unitPrice) / Đầy (gói 10 giá sỉ + đuôi lẻ giá lẻ)** như gốc (✅ xác nhận `unitPrice`/`bulkPrice`).
- **Quà nguyên liệu tràn kho → tự đổi xu theo `unitPrice`** (✅ đo live: thưởng 37 trà, kho nhận 14, 23 thừa → 115 xu = 23×5). Luật chung cho mọi quà NL (chairman/mùa/nhiệm vụ/crate) → không phí phần thưởng, không lo kho đầy.

---

## 3. Re-tune Economy & hệ số k (cách giữ "chạy y hệt trumviahe")

**Vấn đề:** giá trị đơn trung bình bia hơi cao hơn trà đá (bia + mồi đắt). Nếu không xử lý, người chơi chạm trần ngày quá nhanh → ca nhạt.

**Đo k (mô hình Monte Carlo, script `scripts/measure_k.py`):**
- Trà đá: **82.5 xu/lượt** (kiểm chứng: ×Chợ Đêm 1.2 ≈ 99 ≈ live ~94 ✓).
- Bia hơi: **207 xu/lượt** (≤1 mồi, xác suất gọi mồi 70%) → **k_value = 2.5** (ổn định 2.0–3.0 theo sensitivity).

**Phương án tối ưu — rescale CHỈ theo k = 2.5:**
- Đại lượng bất biến cần giữ = **"số lượt phục vụ để chạm trần"** (~2.420 lượt). 207 × 2.420 ≈ 500k = 200k × 2.5 ✅.
- **Throughput (bàn/thiết bị) KHÔNG bù vào k** — nó là *đòn bẩy thưởng* giúp chạm trần nhanh hơn (đúng thiết kế gốc: trần 200k cố định bất kể số ghế).
- Nhân **k=2.5** vào: trần ngày, Giải Nhậu, Đường Lên Trùm, giá nâng cấp, rent, phạt, thưởng. **Giữ nguyên:** thời gian, %margin, tip, weight.

| Hằng số gốc | → ×2.5 |
|---|--:|
| Trần ngày 200.000 | **500.000** |
| Giải Nhậu: Cốc Thủy Tinh/Vại Sành/Vại Đồng/Bom Bạc/Bom Vàng/Vua Bia/Trùm Bia Hơi 20k/60k/120k/180k/300k/500k/1M | 50k/150k/300k/450k/750k/1.25M/**2.5M** |
| Ghế/bàn cao nhất 10.000 | 25.000 |
| Bom/ấm 200k · Hầm lạnh 100k · Rửa cốc 150k · Quầy 80k | 500k · 250k · 375k · 200k |

> **Vai trò prototype (làm rõ):** prototype **ĐƯỢC PHÉP điều chỉnh k_value** dựa trên giá trị/lượt đo thật — nếu món-mix lệch giả định thì cập nhật `k = DT_bia_mỗi_lượt / 82.5` (vd ra 2.3 hay 2.8 đều OK). **Bất biến DUY NHẤT không được đổi:** throughput (bàn lai rai gọi nhiều đợt) **không bao giờ** được cộng vào k — nó là đòn bẩy thưởng. Tức là: con số k có thể đổi, *cách tính* k (chỉ từ giá trị/lượt) thì không.

---

## 4. Throughput — bottleneck (Lớp 2)

Cốc là **tài nguyên quay vòng định danh** (`reservedGlassId`) = lõi bottleneck, giữ y nguyên cơ chế trà đá. Các pipeline tự động + thanh tiến độ như gốc.

| Thiết bị (gốc → bia hơi) | Vai trò | Đường cong giá (×k) | Stats theo cấp |
|---|---|---|---|
| Ấm tích → **Bom bia + vòi rót** | rót bia (batch + tốc độ) | 0/3k/12k/50k/200k → ×2.5 | rót 1→nhiều vòi; brew 15s→6s |
| Bộ rửa ly → **Bồn rửa cốc** | vòng đời cốc clean→dùng→bẩn→rửa | 0/2.5k/10k/40k/150k → ×2.5 | wash 7s→1.5s, slot 1→5 |
| Thùng đá → **Hầm/tủ giữ lạnh** | giữ bia lạnh, chống mất hơi | 0/2k/8k/30k/100k → ×2.5 | freshness 12s→∞ (xem §6) |
| Quầy → **Quầy/kho** | sức chứa kho (bia, nguyên liệu mồi) | 0/1k/5k/20k/80k → ×2.5 | cap 15→150 |
| — (mới) | **Bếp** (mồi nóng: đậu/tóp mỡ/lòng) | 🔧 theo đường cong tương tự | mở dần món 4→5→6, giảm prep |

Vòng đời cốc: `clean → in_use(reservedGlassId) → dirty → queue → washing → clean`.
**Cơ chế số cốc (✅ làm rõ từ quan sát top1 + xác nhận):** **mua tối đa 10 cốc** (buy-cap), nhưng **kho chứa tối đa 20** (storage-cap). Khoảng dôi 10→20 chỉ lấp được bằng **quà**: Chí Phèo → "Chủ tịch giả nghèo" tặng **+1 cốc/lần lộ** → vượt buy-cap (vd top1 có 17 = 10 mua + 7 tặng). → cốc thừa = throughput "miễn phí" thưởng cho việc **chịu đựng Chí Phèo** = nối lớp risk (Chí Phèo) vào lớp throughput (cốc). Bia hơi nên giữ ý này: lootbox khách quậy có thể nhả **cốc/vại** (tài nguyên bottleneck), không chỉ xu.

---

## 5. Hệ Bàn (đơn vị chính, Lớp 2 mở rộng)

**Domain model:**
```ts
type Table = {
  id: string
  level: number                 // cấp bàn → sprite + capacity
  type: 'thuong' | 'vip'
  capacity: number              // số khách tối đa (tăng theo cấp)
  seats: Customer[]
  orders: Order[]               // nhiều ĐỢT gọi món / buổi (lai rai)
}
type Customer = {               // giữ field gốc
  id; type; state; tableId
  order; secondaryOrder
  patience; maxPatience
  enjoyTime; maxEnjoyTime
  reservedGlassId               // cốc định danh
  payment; receivedTip; pendingServe
}
```

**Cấp bàn** (sức chứa = "ghế quy đổi", tái dùng đường cong ghế gốc 4→10.000, ×k):
| Bàn | Sức chứa | Chi phí (xu, ×k) | Gate |
|---|--:|--:|---|
| Bàn con (khởi đầu) | 2 | có sẵn | — |
| Bàn vuông | 4 | ~ (200+500)×2.5 | — |
| Bàn dài | 6 | ~ (1.000+1.500)×2.5 | — |
| Bàn VIP / kê dài | 8–10 | ~ (2.5k+5k+10k)×2.5 + uy tín [3k–40k] | huy hiệu Kết Nối (**free-only**) |

> **Gate bàn VIP = free progression** (uy tín + huy hiệu Kết Nối kiếm qua **referral**, KHÔNG qua donation) → tránh pay-to-win (xem §16).
- Tổng "ghế quy đổi" toàn quán → công thức hàng đợi gốc `queue = 2 + ⌊tổngGhế/3⌋`.
- 📐 **State machine + 4 quyết định triển khai (serve theo khách/bàn, phạt cụm, mua thêm bàn vs nâng sức chứa): xem `03-SPEC-he-ban.md`.**
- **MVP dùng rule một-bàn-một-nhóm** (không ghép nhóm lạ vào bàn đang có khách); chi tiết **`OrderItem` gắn `customerId`** để tính tiền/tip theo khách (đặc biệt VIP ×10) nằm trong spec hệ bàn.
- Số lượng bàn cũng nâng được (mua thêm bàn). Mỗi cấp đổi sprite (visual progression).
- **Vì sao sâu hơn ghế đơn:** gọi nhiều đợt ("lai rai") = nhiều serve event/bàn; combo theo bàn (bia+mồi) = đơn lớn; bàn VIP = nhiều ×10 cùng lúc; "ngồi lỳ" thành feature (ngồi lâu *miễn còn gọi*).
- **Rủi ro tương xứng:** phục vụ trễ cả bàn → **phạt cụm**.

---

## 6. Bia mất hơi (cơ chế đặc thù — thay "đá tan")

Đồng hồ áp lực thứ 2, gắn **trực tiếp vào món lõi** (khác đá tan vốn chỉ ảnh hưởng kho).

**Tầng 1 — Cốc đã rót (chính):** mỗi cốc rót xong có `beerFreshnessMs`. Quá hạn → bia hết hơi. Buộc **rót đúng nhịp, không tích trữ cốc**.
- 🟡 **Hậu quả — MVP (mềm, dễ test):** phục vụ cốc hết hơi → **tip ×0 + giảm uy tín nhẹ (−1)**, **VẪN thu payment** (khách "uống tạm"). Tránh quá gắt khi chưa cân bằng.
- 🔵 **Hậu quả — Post-MVP (gắt hơn, nếu cần độ khó):** có thể nâng thành khách từ chối/đổ bỏ cốc (mất payment) — **chỉ bật sau khi economy ổn**.
- Hai hướng này ảnh hưởng economy rất khác nhau → MVP chọn hướng mềm, đo rồi mới quyết.
- Base **12s** (= 3–4× thời gian 1 lượt rót-bưng ≈ 5s → đệm ~2 cốc; cốc thứ 3+ mới rủi ro → chỉ phạt tích trữ).
- Nâng qua **Hầm lạnh** theo đường cong Thùng đá: L1 12s · L2 20s · L3 35s · L4 60s · L5 ∞.
- Thời tiết nóng ×0.67 (mất hơi nhanh hơn ~1.5× — ánh xạ đá tan ×1.5).

**Tầng 2 — Bom đã mở (phụ, optional):** `kegFreshnessMs` base ~4 phút, nâng cùng Hầm lạnh (×1.5/cấp). Quá hạn → giảm tip toàn quán tới khi thay bom (= "cap + tan" tầng kho).

**Tích hợp công thức:** thêm cờ `freshness` vào tip → `tipMult = freshnessOK ? 1 : 0`. Hai đồng hồ (patience khách / freshness cốc) chạy song song → quyết định "rót lúc nào" thành chiến thuật.
**UX an toàn:** cốc đầy bọt → bọt xẹp → "cờ vàng" cảnh báo trước khi mất hơi (tránh phạt oan).

---

## 7. Loại khách (demand-mix, Lớp 3)

Giữ nguyên weight & cơ chế gốc, đổi vỏ.

| Loại | Weight | Đặc điểm (giữ cơ chế gốc) |
|---|--:|---|
| Dân nhậu thường | 1.0 | nền tảng |
| Khách làm ly nhanh (tan ca tạt qua) | 0.3 | patience ×0.611 → xử nhanh; đông giờ rush |
| **Khách sộp / sếp bao mâm (VIP)** | 0.1 | **tip ×10, phạt mất ×10** → ưu tiên #1; vách đá 60% chênh ~5.5× |
| Khách quậy / xỉn không trả (Chí Phèo) | 0.03 | không trả + chiếm ghế (patience ×5); tích đủ **lộ "đại gia" → quà** (xu 350–390 ×k / nguyên liệu); humid ×1.5 |
| Bàn lai rai (ngồi lỳ) | 0.1 | trả+tip bình thường, **giữ ghế 50–100s** (enjoy ×10); với hệ bàn → ngồi lâu *nhưng gọi nhiều đợt* = nguồn thu ổn |
| Ship bia/mồi mang về (shipper) | timer ~220s | đơn bundle, **−25% chiết khấu**, **không tốn cốc**, lỡ phạt 50% gross |
| Nhóm cổ vũ bóng đá (mới) | event | spawn cụm trong giờ trận World Cup (§14) |

Mỗi loại ép một quyết định: VIP/vội = tốc độ, bàn lai rai = quản bàn, Chí Phèo = đánh đổi rủi-ro-lấy-quà, shipper = tận dụng năng lực thừa.

---

## 8. Tip · Uy tín · Phạt (công thức — giữ nguyên 100%, chỉ thêm freshness)

**Tip** (`ub`): nếu `patience/maxPatience < 0.6` → **0**; ngược lại `round(payment × 0.3)`. Rồi ×rush ×weather ×type(VIP 10) ×QR(ceil 1.2) ×Tỉnh Táo(1.1). **Thêm:** ×freshness (mục §6).
→ Vách đá 60%: VIP sớm vs trễ chênh ~5.5×. Một khách sộp đáng từ ~60 đến ~400+ xu (×k).

**Uy tín ca** = Σ(+3 có tip / +1 không tip) − ~5 × (số bỏ đi). Thước đo chất lượng phục vụ.

**Phạt mất khách** (`ab`): `round(gross × 0.1 × leavePenaltyMult)` ×rush (light 1.8 / heavy 2.5). VIP ×10 = mất nguyên đơn. Bàn → phục vụ trễ có thể phạt cụm. Mất khách = 3 tầng: mất đơn + phạt xu + tụt uy tín.

**QR (+20% tip)** → **mã QR chuyển khoản** (rất thực tế ở quán nhậu).

---

## 9. Thời tiết & Rush (lớp hệ số)

**Thời tiết** (sunny35/hot20/humid10/rain20/cold15):
- Nóng: bia mất hơi nhanh ×1.5, tip ×1.15, shipper ×1.5, **bán chạy hơn**.
- Oi bức/humid: mất hơi ×2, tip ×1.2, shipper ×2, Chí Phèo ×1.5, patience ×0.75.
- Mưa: shipper ×3, khách quậy ×2.
- Lạnh: ít người uống hơn 🔧 (cân nhắc đảo so với "trà đá lạnh cần ít đá" — bia hơi lạnh bán chậm hơn).

**Rush** (giữ 2 mức gốc):
- **Nhẹ** (90s): pay ×1.05, tip ×1.1, phạt ×1.8, spawn interval ×0.35 → **điểm ngọt** (vừa sức, 100% phục vụ, 0 phạt).
- **Nặng** (150s): pay ×1.1, tip ×1.18, phạt ×2.5, spawn interval ×0.2 → **canh bạc throughput**.
- **Sàn spawn** (`rushMinIntervalMs`): nhẹ 1.000ms / nặng **700ms** → trần đầu vào ~1,43 khách/giây. ✅ **Đo live: trần phục vụ ~0,74 ly/giây ổn định** (heavy: 143 vào/150s nhưng chỉ phục vụ ~111 → ~22% bỏ = phần vượt công suất). → cân throughput quanh mốc này; Tỉnh Táo ×1.1 đo được **+~21% thực thu** trên 1 Giờ Vàng nặng.
- **Ô "Cao điểm tới" telegraph**: lịch rush pre-roll có seed (location×session), hiện loại+ETA → cho người chơi chuẩn bị (đầy đá/cốc, tiễn bàn lỳ).
- Theme bia hơi: **giờ tan tầm** + **giờ trận World Cup** (§14). Humid + heavy = tệ nhất (tip sụp ~9%).

---

## 10. Thể lực, Ca & Trần ngày (gating)

- Thể lực **12 phút/ca**; hồi 0.4×realtime (~30 phút, **chỉ đếm khi active**); phải đầy 100% mới mở ca.
- Cooldown tính **từ khi khách về hết**. Anti-idle: pause khi không theo dõi tab.
- Trần **8/6/5 ca/ngày** (newbie/regular/veteran); **hard cap doanh thu = 500.000 xu/ngày** (= 200k ×k). Sau cap: vẫn phục vụ nhưng `appliedCoin=0`. ✅ **Đo live (gốc): với veteran, SỐ CA (5) thường ràng buộc TRƯỚC trần tiền** (5 ca ≈ 145k < 200k) → trần tiền chỉ chặn top-throughput.
- ✅ **Rollover ngày (server-side, giờ VN) — phải xử rõ:** trần (ca + tiền) + nhiệm vụ + điểm danh reset theo **ngày lịch VN tại nửa đêm thực** (KHÔNG theo lúc mở ca; client chỉ mirror, chống chỉnh đồng hồ). **Ca vắt qua 00:00:** tiền tính per-earn theo bucket ngày tại lúc earn (chia tại 00:00); **cap 200k per-day độc lập** → 1 ca liên tục có thể góp cả 2 cap; **số ca credit lúc finalize → vào ngày đóng ca** (ca đóng sau 00:00 = ca #1 ngày mới) → "refund" 1 suất ca + cap mới quanh nửa đêm. → **Bài học: chốt rõ đơn vị attribution (per-earn vs per-shift) + xử edge nửa đêm, kẻo lỗ hổng double-cap.**
- **Tỉnh Táo ×1.1** (10 phút sau nghỉ >6h). *(gốc: well-rested)*
- Đóng ca = "closing" grace (khách đang uống ở lại; bàn lai rai kéo dài; `kick-all` đóng ngay). ✅ **Credit "hoàn thành ca" (nhiệm vụ 3 ca + mở ca kế) chỉ tick khi ĐÓNG HẲN** (closing→closed, màn tổng kết hiện), KHÔNG phải lúc hết giờ → khách ngồi lỳ (enjoy ×10) trì hoãn cả credit → "Mời về" để đóng ngay.

---

## 11. Hai hệ tiến trình + Vụ Bia (meta, Lớp 5)

> **Bảng đổi tên (cascade từ `item-list-upgrade-levels.md` v1.4):** League → **Giải Nhậu**, Season → **Vụ Bia**, Life Path → **Đường Lên Trùm**, Đền Thiêng → **Bàn Thờ Ông Địa**. Chi tiết bảng tên bậc/mốc: xem `docs/item-list-upgrade-levels.md` §15.

- **Giải Nhậu theo Vụ Bia** (điểm = `seasonEarned` = doanh thu phục vụ + shipper, **loại trừ thưởng nhiệm vụ/xổ số**; `seasonEarned` KHÔNG giảm khi tiêu xu): 8 bậc theo `minSeasonEarned` — 🥤 Cốc Nhựa 0 / 🍺 Cốc Thủy Tinh 20k / 🏺 Vại Sành 60k / ⚔️ Vại Đồng 120k / 💎 Bom Bạc 180k / 🍻 Bom Vàng 300k / 👑 Vua Bia 500k / 🏆 Trùm Bia Hơi 1M (×k §3).
- ✅ **HAI bảng tách biệt (đo live):** (a) **"Xếp hạng" chính** (`/leaderboard`) = gom theo **BẬC Giải Nhậu, XUYÊN mặt bằng**, sort seasonEarned giảm dần, **tie-break = ai đạt mốc TRƯỚC** (`firstReachedCurrentSeasonEarnedAt`); tab ‹›, bậc trống = "Chưa có ai". (b) **"Dạo Phố"** (`/social/street`) = gom theo **location × Giải Nhậu** (hàng xóm). ⭐ cạnh tên = `seasonReputationScore` (chỉ hiển thị, KHÔNG xếp hạng); tiêu đề = mốc Đường Lên Trùm. → **Bài học: leaderboard theo bậc (ai cũng đua với người ngang tầm) + street theo khu = 2 cảm giác cạnh tranh; bậc cao trống = "vô địch mở" tạo mục tiêu.**
- **2 Vụ Bia song song:** Phân Hạng (7 ngày, thưởng đậm + top10 huy chương + Bàn Thờ Ông Địa) / Tranh Bá (14 ngày, thưởng nhẹ). Neo epoch như gốc, tz VN. **Thưởng cuối Vụ = bó nguyên liệu theo hạng (KHÔNG bơm xu)** → chống lạm phát, giao qua hòm thư.
- **Đường Lên Trùm LP0–LP7**: mốc trọn đời (50k→50M ×k) → thưởng xu + thùng hàng + mảnh huy hiệu + tem trang trí; **gate tính năng & mặt bằng**. Tên mốc: Bưng Bê → Phụ Quán → Tay Ngang → Chủ Sạp → Chủ Quán → Ông Chủ → Đại Gia Bia → Trùm Bia Hơi.

**Tiền tệ — 3 sổ tách biệt** (giữ gốc): số dư (`coins`, tiêu được) / thu Vụ (`seasonEarned`, điểm hạng, không giảm khi tiêu) / thu liên Vụ (Đường Lên Trùm).
**Uy tín = meta-currency 2 chiều:** kiếm (phục vụ/nhiệm vụ), mất (bỏ khách); tiêu (tiễn bàn lỳ ∝ giây ngồi, mở bàn VIP, tờ rơi/marketing); gate (golden sign 5k⭐, bàn VIP cần huy hiệu Kết Nối).
**Mảnh huy hiệu → huy hiệu**; **tem trang trí** (từ Đường Lên Trùm).

**Referral & huy hiệu Kết Nối (gộp gọn so với trumviahe gốc) 🟡:**
> Bản gốc có 4 huy hiệu xã hội cho 3 mốc referral (4-vs-3 lệch, mơ hồ mốc nào ra huy hiệu nào). Trùm Bia Hơi **gộp cho rõ**: tách bạch "thứ có tác dụng" và "thứ để khoe".
- **Điều kiện người được mời ("qualified referee"):** bạn được rủ phải là **người chơi thật** — đăng ký + mở quán + chơi vài phiên. **Self-invite/acc ảo không tính.** Validate **server-side**.
- **3 mốc, thưởng tăng dần (đều là uy tín ⭐, ×k):**
  | Mốc | Điều kiện | Thưởng | Huy hiệu |
  |---|---|--:|---|
  | 1 | mời **1** bạn qualified | ⭐250 ×k + **huy hiệu Kết Nối** | 🫱 **Kết Nối (CÓ tác dụng)** |
  | 2 | **3** bạn qualified | ⭐1.000 ×k | danh hiệu (prestige) |
  | 3 | bạn đạt **LP2** | ⭐3.000 ×k | 🤝 danh hiệu cao (prestige) |
- **Tác dụng huy hiệu:** **CHỈ Kết Nối có tác dụng gameplay = gate mở bàn VIP** (§5). Các huy hiệu mốc 2/3 là **danh hiệu/khoe** (hiển thị profile), KHÔNG buff/mở khóa gì → tránh lạm phát quyền lực.
- **Đặt Kết Nối ở MỐC 1** (chỉ cần 1 bạn thật) → đường free vào bàn VIP **khả thi sớm**, đúng nguyên tắc "gate gameplay = free-only, không qua donation" (§16).

---

## 12. Mặt bằng (multiplier + rent + cọc)

9 vị trí vỉa hè, multiplier ×1.0→×1.8, rent/ngày `Dn(e)=round(700·(e/5)·(1+e/50)) ×k`. Trả trước cả kỳ (**7 ngày**) + **cọc 25% (hoàn lại)**; rời sớm mất cọc + về Hẻm Nhỏ. Gate theo Đường Lên Trùm.
- Hẻm Nhỏ (start) → … → **Gần Sân Vận Động** (vị trí hot mới, ăn theo World Cup) → Phố Cổ (LP4) → Ga Metro (LP5) → Khu Phố Tây (LP6).

---

## 13. Sự kiện & Rủi ro (Lớp 4)

**Bảo kê vỉa hè** (gangster, live): phí = 90×số tên (×k), thưởng thắng = 225×số tên (×k — ✅ đo live 3 tên = 675), 20s quyết định; **HP côn đồ tăng theo thứ tự (#1=1, #2=2, #3=3; atk cũng tăng)** → nhiều tên = tên sau trâu hơn. Đánh **theo lượt (turn-based, `battleReplay`)**; chó (hp/atk=level) tham chiến — chó Lv3 one-shot từng tên côn đồ thường → **thắng sạch** (`feePenalty:0, brokenChairCount:0`). **Thua → `dogCaptured` (chó bị bắt 1 thời gian) + đập đồ (sửa bàn ×3 = 50×index×3 ×k) + feePenalty.** Bỏ mặc → tự cống nạp (tệ nhất). Boss = server-only. → Nuôi chó Lv3 = gần miễn nhiễm côn đồ thường, **luôn nên Phản kháng** (675 ≫ cống nạp 270).
**Kiểm tra ATTP / trật tự đô thị / nồng độ cồn** (thay tổ kiểm tra): quiz ~15s, 2 lần thử; **trượt → thu chứng chỉ + ĐÌNH CHỈ CA** (mất thu còn lại). 1 lần/ca, server gửi câu hỏi.
**Khách xỉn → hóa đại gia** (Chí Phèo → Chủ tịch): lootbox **3 category** (✅ đo live) — **xu** (~350–390 ×k) / **nguyên liệu** (roll rộng, có thể ≥37) / **uy tín** (vd 92). Cơ chế **pity** (`pityCounter` tích từ Chí Phèo, reset khi lộ); **KHÔNG giới hạn 1 lần/ca** — lộ nhiều lần/ca, tần suất ∝ lượng Chí Phèo (humid/nóng ×1.5 → nhiều hơn). → biến khách "lỗ" thành mỏ thưởng, người chơi bớt ghét Chí Phèo.
**Say xỉn/đánh nhau tại quán** (mới): cần can/đuổi, để loạn → mất uy tín.
**Trộm offline:** nghỉ không chó → mất xu/nguyên liệu (server-only).
**Chó / bảo vệ:** mua 2k + 20 đá (×k); nâng cấp +nguyên liệu. Bảo hiểm rủi ro/trộm + đánh bảo kê.

---

## 14. Event World Cup (thời vụ — gắn vào hệ rush/event)

**4 trụ cơ chế (3 cơ chế gốc + 1 cosmetic mới):**
1. **Mua bản quyền phát sóng** (sink 1 lần, hạn mùa giải, 🔧 ~50k ×k): lắp TV/màn chiếu → trong giờ trận, quán có TV được **rush "xem bóng"** (spawn ×, patience ×, ngồi lâu gọi nhiều). Không mua → bỏ lỡ đợt khách bóng đá (FOMO, không pay-to-win vì mua bằng xu). **Gate chính** của mùa bóng.
2. **Giờ trận = rush có LỊCH THẬT** (§14.1).
3. **Mua lịch thi đấu** (booster marketing, **bằng xu**, hạn mùa giải, 🟡 ~15k ×k): (a) **hiện lịch trận trong HUD** để người chơi canh suất chiếu + chuẩn bị nguyên liệu trước rush; (b) +nhận diện → **nhóm cổ vũ spawn ×1.15 suốt mùa** (🟡). Là **amplifier**, rẻ hơn TV: phải có TV mới có rush bóng đá, lịch chỉ khuếch đại + tiện canh nhịp.
4. **🆕 Theme đội tuyển** (cosmetic thuần, **mua bằng xu**, **sở hữu vĩnh viễn**, 🟡 ~8k ×k/đội): re-hue **cờ + đèn lồng + biển hiệu** của quán sang bảng màu một đội tham dự (trang trí nhẹ, gắn vào hệ cosmetic biển/đèn/cây §17). **KHÔNG có tác dụng gameplay** (không đụng spawn/tip/patience/rush) → **không pay-to-win**, đúng §16. Combo **"Cờ Mùa Giải"** (tự chọn 6 đội) 🟡 ~36k ×k (giảm ~25% so mua lẻ).

**§14.0 — Shop mùa giải** (đơn vị giá: **base ×k**; cột xu thực tính ở k=2.5 để dễ hình dung — số `×k` mới là chuẩn, tự co theo k đo lại):

| Item | Giá (base ×k) | ≈ xu (k=2.5) | Loại | Thời hạn | P2W? |
|---|--:|--:|---|---|:--:|
| Bản quyền phát sóng (TV) | ~50k ×k | 125.000 | gate rush bóng đá | 1 mùa giải | Không (xu) |
| Lịch thi đấu | ~15k ×k | 37.500 | booster spawn + UI lịch | 1 mùa giải | Không (xu) |
| Theme đội (mỗi đội) | ~8k ×k | 20.000 | cosmetic thuần | vĩnh viễn | Không (cosmetic) |
| Combo "Cờ Mùa Giải" (6 đội tự chọn) | ~36k ×k | 90.000 | cosmetic bundle (−25%) | vĩnh viễn | Không (cosmetic) |

> **Neo giá (so trần thu/ngày 500k xu):** TV ≈ ¼ ngày cày → gate đáng cân nhắc; lịch ≈ 7,5% ngày → impulse booster; theme đội ≈ 4% ngày → sink cosmetic gom bộ dần cả Vụ. Tất cả mua bằng **xu kiếm trong game** (không bán bằng tiền thật) → không phá trần ngày/Giải Nhậu, không pay-to-win.
> **Danh sách đội = động, server-driven:** theme khả dụng = tập **đội tham dự mùa hiện tại** (fetch cùng nguồn lịch/tỉ số §14.1, **KHÔNG hardcode**). Mùa mới đổi đội → shop tự cập nhật. WC hiện tại = 48 đội (🔧 art có thể giới hạn subset phổ biến nếu vẽ riêng; xem note IP/art ở "Lưu ý").

**§14.1 — Lịch thật + mô phỏng tỉ số thật (server-side):**
1. Server giữ **lịch trận thật** + **fetch kết quả thật** sau mỗi trận → `{matchId, kickoffReal, endReal, score, teams}`.
2. Suất chiếu trong game mở tại `broadcastTime = endReal + ~20 phút` → push qua websocket như event gốc.
3. Trong suất chiếu: **TV hiển thị đúng tỉ số thật** + tên đội → heavy rush, nhóm cổ vũ đội thắng đông hơn.
4. Trận lớn = heavy++; vòng bảng = light.

**Lưu ý:**
- Event chỉ × throughput/demand → **không phá trần ngày & Giải Nhậu** (vẫn chịu cap 500k).
- Cần nguồn API tỉ số + lịch (server fetch, client render); lịch là dữ liệu động, không hardcode.
- Múi giờ VN; trận hoãn → server cập nhật `broadcastTime`.
- **IP an toàn:** nhại tên ("Cúp Bóng Đá Thế Giới"), tránh logo/nhãn hiệu FIFA.
- **IP cho theme đội (§14.0):** dùng **bảng màu quốc gia + biệt danh nhại** (vd "Vũ Công Samba" vàng-xanh, "Vũ Điệu Tango" xanh-trắng, "Cỗ Xe Tăng" đen-đỏ-vàng, "Gà Trống" lam, "Tam Sư" trắng-đỏ). Cờ quốc gia (không phải nhãn hiệu FIFA) dùng được; **tránh** huy hiệu/logo liên đoàn, áo đấu chính chủ, tên/emblem giải. 🔧 Art: theme = **re-hue tài sản nền chung** (cờ/đèn/biển) → 48 đội khả thi rẻ; nếu vẽ riêng từng đội thì chốt subset phổ biến với fan VN (Brazil/Argentina/Đức/Pháp/Anh/TBN/BĐN/Hàn/Nhật...).
- Combo "Xem bóng" (bia + mồi cao cấp giờ trận) → thưởng combo ×.

---

## 15. 🔵 Xổ số (POST-MVP — cần legal review; currency sink, KHÔNG pay-to-win, KHÔNG cá độ)

> **Trạng thái: POST-MVP, KHÔNG đưa vào MVP.** Dù dùng xu in-game & không bán vé bằng tiền thật, đây là **vùng nhạy cảm** → cần **legal review** trước khi build, và phải tránh trở thành retention loop kiểu cờ bạc. Giữ ý tưởng dưới đây làm tham khảo, quyết định triển khai sau.

**Mục tiêu:** đốt xu chống lạm phát + bản sắc (vé số dạo ở quán nhậu). **Là xổ số kiến thiết/Vietlott thật**, KHÔNG phải cá độ bóng đá.

**2 chế độ (cả hai đều POST-MVP):**
- **A — Kiến thiết (vé in):** NPC bán vé dạo qua bàn → mua vé bằng xu (🔧 ~200 ×k), vé 6 số cố định; dò **số đuôi** (trùng 2/3/4/6 số cuối). Nếu có làm thì làm chế độ này trước.
- **B — Vietlott (tự chọn):** tự chọn 6 số (Mega 6/45) → đối chiếu số trùng (3/4/5/6), jackpot progressive.

**Nguồn quay = KẾT QUẢ XỔ SỐ THẬT THEO NGÀY** (server fetch, minh bạch RNG): A dùng XSMB hằng ngày; B dùng kỳ Vietlott thật (ngày không quay → fallback A).

**Cơ cấu giải (kiến thiết):**
| Bậc | Điều kiện | Thưởng | Xác suất |
|---|---|--:|--:|
| Nhỏ | trùng 2 số cuối | 1.5× vé | ~1/100 |
| Khá | trùng 3 số cuối | 8× | ~1/1.000 |
| Lớn | trùng 4 số cuối | 50× | ~1/10.000 |
| Đặc biệt | trùng 6 số | jackpot | rất hiếm |

**Ràng buộc (then chốt):** EV < 1 (~0.6–0.8 → net SINK). Mua bằng xu in-game; thưởng = **xu tiêu được (`coins`)**, **KHÔNG cộng `seasonEarned`/Đường Lên Trùm** → không ảnh hưởng Giải Nhậu, **không pay-to-win**. Giới hạn vé/ngày. Quay + payout server-side. Đóng khung "chơi cho vui", không có nạp tiền thật mua vé.

---

## 16. Hệ nhiệm vụ & Monetization

**Nhiệm vụ (7 nhánh, giữ khung gốc, thưởng ×k):** Ngày (3 slot: serve_*/perfect_tip/zero_loss, +uy tín; xong cả 3 → tờ rơi + mảnh huy hiệu) · Shift (3 ca → 1.000xu+100 uy tín) · Gift · Điểm danh 7 ngày (uy tín 2→128) · Referral (250/1.000/3.000⭐) · Sign-in · Đường Lên Trùm.
→ Thưởng nhiệm vụ = uy tín + xu nhỏ + vật phẩm, **KHÔNG tính xếp hạng** → retention phụ, không phá cân bằng.
- ✅ **Cơ chế gán (đo live, lưu ý cho bia hơi):** 5 nhiệm vụ/ngày = 3 lõi (bốc 1/bucket bằng **seed theo ngày**, reward cố định theo bucket 120/220/320xu+5⭐) + 2 cố định (3 ca = 1.000+100; gửi quà 3 người KHÁC nhau = 300+15). **Target co giãn theo TIER** (`pm()`: base→max theo `((tier-1)/8)^1.5`) → veteran ghim gần MAX. **Vấn đề gốc: pool bucket quá nhỏ (3/2/1) + target ghim tier → nhiệm vụ "trông y hệt mỗi ngày"** → bia hơi nên **pool loại lớn hơn + đa dạng target** để cảm giác tươi mới. Gửi quà = transfer NL P2P (chống farm: 1 tin chưa đọc/người + trần gửi/nhận ngày + đếm uniqueRecipients).

**🔵 Account & access monetization (Post-MVP/production):**
- **Ngôn ngữ đầu game:** người chơi chọn `vi` hoặc `en` trước khi vào gameplay; đổi được trong settings. Spec: `docs/features/F25-localization-account.md`.
- **Tài khoản:** cho phép chơi guest không đăng nhập, nhưng nhắc tạo tài khoản/đăng nhập Google để **lưu tiến trình, chơi đa thiết bị, đua top, gửi quà/referral, thanh toán**. Guest có thể migrate progress vào Google account. Spec: `docs/features/F25-localization-account.md`.
- **Session access:** free user được **1 session/ngày** (theo ngày VN). Người chơi đăng nhập có thể **thanh toán mua Session Pass** để mở khóa toàn bộ số session còn lại trong ngày/kỳ theo normal daily cap (8/6/5 tùy segment), vẫn chịu stamina/cap doanh thu/anti-cheat. Đây là **pay-for-access**, không bán xu/power/hạng trực tiếp. Spec: `docs/features/F26-daily-session-pass-payments.md`.
- **Donation "Mời Bia" vẫn cosmetic-only:** chuyển khoản/ủng hộ 20k/50k VND → chọn quà cảm ơn cosmetic (đèn lồng / cây cảnh / biển hiệu / cờ mùa giải). **KHÔNG** tặng vật phẩm có tác dụng gameplay.
- **Gate gameplay tách bạch:** thứ mở khóa lối chơi (vd **bàn VIP**) **CHỈ** unlock bằng **free progression / referral / uy tín** — không bao giờ qua donation. Session Pass chỉ mở quyền chơi thêm ca, không grant tài nguyên.
- **Cosmetic đến từ 2 nguồn, cả hai đều cosmetic-only:** (a) **xu in-game** (currency-sink — vd **theme đội tuyển** mùa World Cup §14.0, đèn/cây/biển mua bằng xu); (b) **donation** tiền thật. Trang trí không đụng spawn/tip/rush/hạng.

---

## 17. UI/UX & Art Direction

- **Fonts:** Be Vietnam Pro (body) + Chakra Petch (nút/số). **Màu:** vàng bia (amber) + bọt trắng + đỏ ghế nhựa + navy modal + CTA đỏ. Bo góc 8–16px, nút min-height 52px.
- **HUD 3 vùng:** top (trạng thái: thể lực, xu, uy tín, thời tiết, rush timer) / center (sân quán: bàn, khách, cốc) / bottom (hành động). Rail tài nguyên hệ "pill".
- **Phục vụ = chạm**; có grace window. Cốc có animation bọt (đầy → xẹp → cờ vàng mất hơi).
- **Sprite progression:** bàn 4 cấp, thiết bị 5 cấp, khách thường + đặc biệt (×biến thể thời tiết hot/cold), cốc bia trạng thái, chó idle/attack, gangster 1/2/3/boss, cosmetic (biển/đèn/cây), TV World Cup.
- **Microcopy cá tính:** "Dô đi anh!", "Một hai ba… dô!", "Bia Đấm", "chốt mâm", "Lấy em tờ vé lấy hên!".
- **Trợ lý AI realtime** tư vấn theo state (giữ tính năng gốc). ✅ **Kiến trúc gốc (test live):** server-side LLM (`/ai-chat`), **nạp state người chơi** → tư vấn cá nhân hoá đúng số (league, cấp thiết bị, xu); **quota ~20 tin/ngày** + chống burst; định tuyến 4 intent (hỏi cách chơi / báo lỗi / góp ý / ticket) + `/bridge` sang hỗ trợ người thật; lịch sử phù du. → **Bia hơi: post-MVP** (tốn LLM); MVP dùng FAQ/RAG nhẹ trước.
- **3 vòng UX song song:** Operate (vận hành ca) · Learn (guide/AI/ledger/changelog) · Belong (rank/shrine/street/decor/profile).

---

## 18. Kiến trúc kỹ thuật

**Giữ stack trumviahe — đủ & phù hợp:**
- **Pixi.js** (canvas, render cảnh động hiệu năng cao) + **React DOM** overlay (HUD/modal/accessibility) + **Zustand** (state client).
- **Server-authoritative** (`api` + **websocket**): serve/giá/reward/cap/event/gangster/shipper/inspection/xổ số/World Cup **validate & fetch server-side**. Client chỉ render. **CAPTCHA** chống bot.
- **Account/payment:** Google login, guest migration, locale, session entitlement và payment webhook đều xử server-side; client không tự quyết quyền chơi session #2+ trong ngày.
- **Vì sao giữ:** chống gian lận & xếp hạng công bằng; event/dữ liệu thật (tỉ số WC, kết quả xổ số) cần server fetch; web mobile-first = rào cản gia nhập thấp.
- ✅ **Enforcement + appeal (xác nhận gốc):** ngoài chặn kỹ thuật (server-authoritative + CAPTCHA), gốc có **hệ xử phạt/gắn cờ** (`status:"flagged"`) + **kênh khiếu nại có quy trình** (ticket `anticheat-appeal` / `pardon_dispute`). → Một game đua hạng nghiêm túc cần cả enforcement lẫn due-process appeal, không chỉ chặn bot. (Bia hơi: Phase 3.)
- **Thêm mới (không đổi kiến trúc):** model `Table` + logic nhiều order/bàn; timer `beerFreshnessMs`/`kegFreshnessMs`; bộ asset mới.
- **🔵 Post-MVP integrations (Phase 4, KHÔNG phải scope kiến trúc sớm):** tích hợp 2 nguồn dữ liệu thật — tỉ số/lịch World Cup & kết quả xổ số. Chỉ làm khi tới Phase 4 (xem §19).

---

## 19. Roadmap

**Phase 0 — Prototype (client-only, validate "feel"):**
- Scope cụ thể xem `04-SPEC-prototype-phase0.md`: 1 màn quán, **3 bàn** (2 ghế/bàn), bia + 2 mồi tức thì, **2 mức rush** (thường / cao điểm), freshness cốc, vòng đời cốc + rửa, tip/patience, log đo.
- Mục tiêu: **đo lại k_value** (bắt đầu từ giả định 2.5, được phép điều chỉnh theo giá trị/lượt thật) + feel mất hơi + feel bàn nhóm + nhịp tay 2 mức rush.

**Phase 1 — MVP (THU HẸP — chỉ core feel + economy; có thể client-only hoặc server tối thiểu):**
Mục tiêu: chứng minh **vòng lặp vận hành ca vui & economy cân**. KHÔNG nhồi meta/event.
- Ca 12 phút + thể lực + trần ngày (rescaled ×2.5).
- **2–3 loại bàn** (mua thêm + nâng sức chứa) — theo `03-SPEC-he-ban.md`.
- **Bia + 2–3 mồi** (chưa cần đủ 6 món/bếp đầy đủ).
- **Freshness cốc** (hậu quả MVP mềm: tip×0 + uy tín −1).
- Vòng đời **cốc + rửa**; tip/patience/phạt; rush **đơn giản (1 mức)**.
- Nâng cấp cơ bản (bom/rửa/hầm/bàn). Thời tiết tối giản.

**Phase 2 — Mở rộng core (sau khi feel ổn):** đủ 6 món + bếp; rush đầy đủ/lịch tự động; thời tiết đầy đủ; loại khách đặc biệt (VIP/Chí Phèo/ngồi lỳ/shipper); nâng cấp đầy đủ.

**Phase 3 — Meta & social:** Giải Nhậu theo Vụ Bia + Đường Lên Trùm + 9 mặt bằng + 8 huy hiệu + cosmetic; bảo kê + kiểm tra ATTP; trộm offline; trợ lý AI (Bia Đấm); 3 vòng UX. Server-authoritative đầy đủ.

**Phase 4 — Event & sink (cần review):** 🔵 **Event World Cup** (lịch + tỉ số thật); 🔵 **donation** (cosmetic-only); 🔵 **xổ số** (sau **legal review**).

> Lý do thu hẹp: core feel (bàn + mất hơi + economy) phải đúng TRƯỚC. Giải Nhậu/Đường Lên Trùm/bảo kê/WC/xổ số là lớp phủ — thêm sớm sẽ che mất việc core có vui & cân hay không.

---

## 20. Bảng trạng thái quyết định (thay cho "đã chốt")

| Hạng mục | Nhãn | Ghi chú |
|---|---|---|
| Phục vụ theo ca, 5 lớp economy | 🟢 CORE | nền tảng |
| Hệ bàn (đơn vị chính) | 🟢 CORE | spec: `03-SPEC-he-ban.md` |
| Bia mất hơi (concept) | 🟢 CORE | hậu quả thì 🟡 |
| Menu 6 món (danh mục) | 🟢 CORE | giá/vốn cụ thể 🟡 |
| Server-authoritative, Pixi+React | 🟢 CORE | |
| k = 2.5 | 🟡 PROTOTYPE | đo lại được; cách tính (chỉ value, không throughput) là CORE |
| Số freshness/prep/giá từng cấp | 🟡 PROTOTYPE | fine-tune qua playtest |
| Hậu quả mất hơi (tip×0+uy tín / mất payment) | 🟡 PROTOTYPE | MVP dùng bản mềm |
| Thời tiết lạnh cho bia (đảo so trà đá) | 🟡 PROTOTYPE | cần cân bằng |
| Giải Nhậu / Đường Lên Trùm / mặt bằng đầy đủ | 🔵 POST-MVP | Phase 3 |
| Bảo kê / kiểm tra ATTP / trộm | 🔵 POST-MVP | Phase 3 |
| Event World Cup (+ API tỉ số/lịch) | 🔵 POST-MVP | Phase 4 |
| Donation (cosmetic-only) | 🔵 POST-MVP | Phase 4 |
| Localization + Google account / guest migration | 🟢 CORE | cần cho production onboarding/save |
| Session Pass payment (free 1 session/day, paid unlock daily cap) | 🔵 POST-MVP | pay-for-access, cần server/payment |
| Xổ số / Vietlott | 🔵 POST-MVP | Phase 4, **cần legal review** |

**Còn mở cần quyết khi tới phase tương ứng:** nguồn API (tỉ số/lịch WC, kết quả XSMB/Vietlott); payment provider + giá Session Pass + refund policy; số server-only (boss gangster, lượng trộm, câu hỏi kiểm tra); EV & giới hạn vé xổ số.

---
## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)
| Ver | Thay đổi |
|---|---|
| v1.0 | GDD đầu tiên: tổng hợp research + quyết định v0.5 thành 20 mục (vision, core loop, 5 lớp economy, bàn, mất hơi, khách, tip/uy tín, WC, xổ số, meta, UI/UX, kiến trúc, roadmap). |
| v1.1 | Xử lý 8 điểm review: sửa bug k trong script; phân nhãn Core/Prototype/Post-MVP (§20); làm rõ vai trò prototype (§3); mất hơi MVP mềm (§6); thu hẹp MVP 4 phase (§19); xổ số post-MVP+legal (§15); donation cosmetic-only + gate gameplay free (§16). Tách spec hệ bàn ra `03-SPEC-he-ban.md`. |
| v1.1+ | Vá nhỏ theo review: nguồn MAP v0.6→v0.7; §19→§20 ref; World Cup §13→§14; §5 thêm note một-bàn-một-nhóm + `customerId`; §18 tách post-MVP integrations; §11 gộp referral + huy hiệu Kết Nối (qualified referee, Kết Nối ở mốc 1, huy hiệu khác là prestige). |
| v1.2 | Áp phát hiện live: gangster (HP scale theo index, turn-based, dogCaptured khi thua, 3 tên=675); chairman 3-category (xu/NL/uy tín) + pity nhiều lần/ca; rush spawn floor (700/1000ms) + trần phục vụ ~0,74 ly/s + Tỉnh Táo +21%; chiết khấu sỉ + overflow NL→xu theo unitPrice; closing credit khi đóng hẳn; AI assistant Bia Đấm (state-aware, quota 20/ngày); enforcement+appeal. k=2.5 kiểm chứng lại bằng `measure_k.py` (k_base 2.51). |
| v1.3 | §4 sửa cơ chế cốc (quan sát quán top1): mua tối đa **10**, kho chứa tối đa **20**, vượt buy-cap nhờ quà Chủ tịch (+1 cốc/lần) — đính chính "max 12" cũ (đó là 10 mua + 2 tặng). Gợi ý design: lootbox khách quậy nhả cốc/vại (nối risk↔throughput). |
| v1.3 | Áp tiếp đợt 2: §10 rollover ngày server-side giờ VN + edge ca-vắt-nửa-đêm (per-earn cap bucket, refund suất ca) + số-ca-ràng-buộc-trước-trần-tiền; §11 phân biệt 2 bảng (`/leaderboard` theo bậc xuyên mặt bằng + tie-break `firstReached…` vs `/social/street` theo location×Giải Nhậu) + 8 bậc minSeasonEarned; §16 cơ chế gán nhiệm vụ (seed theo ngày + target ghim tier `pm()` → pool nhỏ gây lặp → bia hơi nên pool lớn hơn) + gửi quà P2P chống farm. (Chi tiết đầy đủ: `economy-spec-from-bundle.md`.) |
| v1.3+ | Đồng bộ roadmap Phase 0 theo `04-SPEC-prototype-phase0.md`: scope cụ thể = 3 bàn, bia + 2 mồi tức thì, 2 mức rush; Phase 2 chuyển thành Giờ Vàng đầy đủ/lịch tự động. |
| v1.4 | §14 mở rộng "3 trụ"→"4 trụ": chốt pricing **lịch thi đấu** (booster bằng xu ~15k×k, hiện lịch HUD + cổ vũ spawn ×1.15/Vụ) + thêm trụ **theme đội tuyển** (cosmetic-only mua bằng xu ~8k×k/đội, sở hữu vĩnh viễn, trang trí nhẹ cờ/đèn/biển; combo 6 đội ~36k×k −25%). Thêm bảng **§14.0 Shop Vụ Bia** (neo giá theo trần 500k/ngày) + danh sách đội động server-driven (WC2026 = 48 đội) + note IP/art cho theme (bảng màu+biệt danh nhại, tránh huy hiệu/logo). §16 thêm ghi chú cosmetic đến từ **cả xu lẫn donation**, đều không P2W. |
| v1.5 | Thêm production onboarding/access: chọn ngôn ngữ `vi/en`, guest play + Google login/cloud save/leaderboard prompt, và Session Pass payment (free 1 session/ngày; paid unlock normal daily cap). Làm rõ đây là pay-for-access, không bán xu/power/hạng; bổ sung server ownership cho locale/account/payment entitlement. |
| v1.6 | **Rebrand thuật ngữ bia hơi (cascade từ `item-list-upgrade-levels.md` v1.4):** League → Giải Nhậu (Cốc Nhựa→Trùm Bia Hơi), Season → Vụ Bia, Life Path → Đường Lên Trùm (Bưng Bê→Trùm Bia Hơi), Đền Thiêng → Bàn Thờ Ông Địa, Well-rested → Tỉnh Táo, Rush Hour → Giờ Vàng, crate → thùng hàng, badge shard → mảnh huy hiệu, cosmetic token → tem trang trí. 15 terms. |

*Nguồn: `00-TONG-HOP-trumviahe.md`, `economy-spec-from-bundle.md`, `01-MAP-tra-da-to-bia-hoi.md`. Spec hệ bàn: `03-SPEC-he-ban.md`. Script: `scripts/measure_k.py`.*
