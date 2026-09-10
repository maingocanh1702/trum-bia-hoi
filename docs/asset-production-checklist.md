# 🍺 ASSET PRODUCTION CHECKLIST — Trùm Bia Hơi (v1.0)

> **Mục đích:** một file duy nhất để đi từ *cần vẽ gì* → *mỗi cấp đổi cái gì* → *gen bằng prompt nào* → *đã xong chưa*. Trước đây thông tin nằm rải ở 3 doc và phải tra chéo mới làm việc được.
>
> **Gộp từ:** `asset-list-designer.md` v0.7 (danh sách + naming) · `item-list-upgrade-levels.md` v1.4 (level, stats, giá, gate) · `asset-generation-prompts.md` (prompt + native crop §2) · quét thật thư mục `assets/`.
>
> **Ngày:** 2026-09-08 · **Quét assets/:** 8/11 file khớp naming convention.
>
> ⚠️ File này **không thay thế** 3 doc nguồn — nguồn sự thật vẫn là chúng. Đây là bảng làm việc. Khi doc nguồn đổi, cập nhật lại file này (xem §Đối chiếu nguồn cuối file).

---

## 0. Cách dùng

**Ký hiệu cột `✓`:** ✅ đã có trong `assets/` · 🟡 có nhưng cần làm lại · ⬜ chưa có

**Prompt hoàn chỉnh cho một output** (ghép 4 phần, mỗi output là **một** call riêng — không gen contact sheet):

```text
{GLOBAL_STYLE_LOCK}          ← asset-generation-prompts.md §1.1
{GROUP_LOCK}                 ← §1.2 WORLD_OBJECT / §1.3 ICON / §1.4 CHARACTER / §1.6 BACKGROUND
{Prompt trong file này}
{TRANSPARENCY_LOCK}          ← §1.8, key #00ff00 (hoặc #ff00ff nếu subject có màu xanh lá)
```

Kèm `assets/glass-half.png` làm **Image 1 = STYLE REFERENCE**, không phải edit target.

**Sau khi gen:** bỏ file vào `assets/_raw/`, chạy `scripts/asset_postprocess.py` — script tự tách chroma-key, crop theo alpha, resize về đúng cột **Crop** trong file này, đổi tên và chạy QA.

**Nguyên tắc progression (áp cho mọi family có level):** Lv1 thô sơ/tạm bợ → Lv3 bán chuyên → Lv5 công nghiệp. **Không đổi góc nhìn, hướng sáng, điểm chạm đất và tỉ lệ giữa các cấp.** Cấp cao hơn phải đổi *hình dạng và năng lực nhìn thấy được*, không chỉ thêm sao/glow.

---

## 1. Tổng quan

| Phần | Nhóm | Số asset | Đã có |
|------|------|---------:|------:|
| **A** | Có level/upgrade — mô tả chi tiết từng cấp | **~117** (bếp 4 cấp, rare glass 2 file, 9 mặt bằng + 1 biến thể) | 8 |
| **B1–B6** | Không có level — sprite/icon/frame | **~358** (B1 12 icon) | 0 |
| **B7** | Audio (id; mỗi id = `.ogg` + `.m4a`) | **75** | 0 |
| | **Tổng** | **~550** (~475 sprite/icon + 75 audio) | **8** |

> Số dòng liệt kê từng asset trong file này: **203**; phần còn lại (B3 HUD ~140 icon, B2 skin/portrait, B5 cut-in, B6 frame) đếm theo số ghi ở tiêu đề nhóm. Đối soát 08/09.

Đường tới hạn cho Phase 1 (theo production order §15 prompt bible):

```
✅ 1. Cốc bia × 7 state          ← XONG, đang là style anchor
✅ 2. menu-beer                  ← XONG
⬜ 3. chair-plastic + table-lv1  ← BƯỚC KẾ TIẾP, khoá style cho bàn/ghế
⬜ 4. Icon HUD core (10)
⬜ 5. Chủ quán × 3 thời tiết
⬜ 6. Khách 7 type × 3 thời tiết
⬜ 7. Bàn Lv2 + thiết bị Lv1-3
⬜ 8. bg-quanbia-default
```

---

# PHẦN A — ASSET CÓ LEVEL / UPGRADE

---

## A1. 🪑 Bàn — 4 cấp × 9 state

Bàn = container cho nhóm khách. Mỗi cấp đổi sprite + tăng sức chứa.
**Visual progression:** nhựa nhỏ → inox vuông → inox dài → VIP khăn trải + đèn.

### A1.1 Base sprite theo cấp

| ✓ | Asset | Cấp | Sức chứa | Giá ×k | Gate | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|:--------:|-------:|------|----------------------|-----:|:-----:|
| ⬜ | `table-lv1` | Lv1 | 2 khách | có sẵn | — | Bàn nhựa đỏ thấp, phai nắng, xước nhẹ, rẻ tiền. Phải nhìn **nhỏ và rẻ hơn hẳn** mọi cấp sau | 224×176 | P0 |
| 🟡 | `table-lv2` | Lv2 | 4 khách | 1.750 | — | Chuyển **nhựa → inox**: mặt inox chải xước, chân ống gấp, vuông vức và chắc hơn Lv1 | 256×192 | P1 |
| 🟡 | `table-lv3` | Lv3 | 6 khách | 6.250 | — | Kéo **dài ra**: bàn inox chữ nhật dài, chân gia cố, thêm thanh giằng dưới gầm, mặt phục vụ rộng hơn | 352×208 | P2 |
| 🟡 | `table-lv4` | Lv4 | 8-10 khách | 43.750 | Huy hiệu Kết Nối + uy tín 3k-40k ⭐ | **Bàn tiệc VIP**: ghép nhiều bàn, khăn trải kem, đèn bàn sợi đốt kiểu cũ, viền nẹp nâng cấp | 448×240 | P3 |

**Prompt 4 cấp:**

```text
table-lv1 → Asset name: table-lv1. Create one low sun-faded red plastic sidewalk table for two people, slightly scuffed and inexpensive, broad enough for two bia-hoi glasses and one snack plate. No chairs. This is the humble starting table and must be visibly smaller and cheaper than every later level.

table-lv2 → Asset name: table-lv2. Create one square low inox table for four people, scratched brushed-metal top, tubular folding legs, sturdier and cleaner than Lv1. No chairs. Keep the same camera and anchor as Lv1.

table-lv3 → Asset name: table-lv3. Create one long rectangular inox table for six people, reinforced legs, wider serving surface, a few practical under-table braces, clearly larger and more capable than Lv2. No chairs.

table-lv4 → Asset name: table-lv4. Create one long VIP street-banquet table for eight to ten people, made by joining sturdy tables, with a tasteful cream cloth runner, small old-fashioned incandescent table lamp and upgraded edge trim. Premium but still believable for a Vietnamese sidewalk bia-hoi stall. No chairs, no food, no guests, no text.
```

### A1.2 State overlay — 9 state dùng chung cho cả 4 cấp

> **Quan trọng:** runtime dùng compositing → chỉ cần **4 base + 9 overlay = 13 asset**, KHÔNG phải bake 36 tổ hợp `table-lv{1..4}-{state}`.

| ✓ | State | Khi nào | Cue hình cần vẽ |
|:-:|-------|---------|-----------------|
| ⬜ | `-empty` | Không có khách | Bàn trống hoàn toàn, chỉ còn chi tiết cố định. Không đĩa, cốc, marker, glow |
| ⬜ | `-seating` | Khách đang ngồi xuống | Vài cue chuyển động ở vị trí ghế + 1 ghế kéo ra. **Không** vẽ khách |
| ⬜ | `-awaiting` | Đơn sẵn sàng phục vụ | 1 khay order hổ phách nhỏ + viền vàng ấm "sẵn sàng". Không chữ/số |
| ⬜ | `-grace` | Patience < 30% | Viền đỏ nhấp nháy đứt đoạn + đồng hồ cát gần cạn phía sau. Không đổi geometry bàn |
| ⬜ | `-consuming` | Đang nhậu | 2-3 cốc đã dùng + đĩa mồi xếp tự nhiên + tia cụng ly nhỏ |
| ⬜ | `-paying` | Khách thanh toán | Tờ hoá đơn giấy cũ, bút chì, đĩa đựng tiền ở góc trước + ánh vàng nhẹ. Không QR, không chữ |
| ⬜ | `-cleaning` | Cần dọn | Cốc bẩn rỗng, vụn bánh, 1 khăn lau gấp. Bừa nhưng không ghê |
| ⬜ | `-occupied` | Có khách, chưa có cue gì | 2-4 cốc + 1 đĩa, **không** cue sẵn sàng/nguy hiểm/thanh toán |
| ⬜ | `-broken` | Bàn hỏng (côn đồ) | Chân cong, mặt bàn nứt/móp góc, 1 thanh giằng lỏng + cue hư hại đỏ. Vẫn nhận ra cấp gốc |

**Legacy mapping** (code cũ dùng 5 state): `has_customer`→`occupied` · `needs_serve`→`awaiting` · `overdue`→`grace` · `enjoying`→`consuming`

**Prompt 9 state:** xem `asset-generation-prompts.md` §3.1 "Table state prompts" — ghép `{TABLE LEVEL PROMPT} + {TABLE STATE PROMPT}`.

---

## A2. 🪑 Ghế và object sân quán

> **Ghế KHÔNG có 16 identity riêng.** Kinh tế có 7 lần mua ghế + 9 lần nâng ghế tựa, nhưng đó là **state economy** — reuse `chair-plastic` cho mọi ghế thường và `chair-upgraded` cho mọi ghế tựa, chỉ đổi layout/count bằng code.

| ✓ | Asset | Vai trò | Mô tả | Crop | Phase |
|:-:|-------|---------|-------|-----:|:-----:|
| ⬜ | `chair-plastic` | Ghế thường (mọi ghế 1-10) | Ghế nhựa đúc đỏ thấp vỉa hè, phai nắng, xước nhẹ, còn nguyên vẹn | 128×160 | P0 |
| ⬜ | `chair-empty` | Anchor ghế trống | Cùng ghế nhựa, hơi nhạt màu để đọc là "ghế còn trống". Không glow/chữ | 128×160 | P1 |
| ⬜ | `chair-upgraded` | Ghế tựa (9 lần nâng) | Ghế lưng thấp: đệm nhựa đỏ sờn + khung kim loại + tay vịn nhỏ. Thoải mái hơn nhưng vẫn rẻ tiền, đúng thời đại | 160×176 | P3 |
| ⬜ | `chair-broken` | Ghế thường hỏng | `chair-plastic` sau hư hại: nứt mặt ngồi, chân cong, vết xước. Không lửa, không mảnh vỡ phóng đại | 160×176 | P3 |
| ⬜ | `chair-upgraded-broken` | Ghế tựa hỏng | `chair-upgraded` sau hư hại: tay vịn cong, lưng nứt, 1 thanh kim loại lỏng | 160×176 | P3 |
| ⬜ | `chair-damage-overlay` | Overlay hư hại dùng lại | 2 vết nứt to + 1 cue kim loại cong + 3 mảnh cảnh báo đỏ nhỏ. **Không** có ghế bên dưới | 128×128 | P3 |
| ⬜ | `glass-rack` | Giá để cốc cạnh bồn rửa | Khung inox xước, **2 tầng tách bạch rõ**, 6 cốc bia hơi xanh dày. Phải đọc là kho cốc, không phải bồn rửa | 224×176 | P2 |
| ⬜ | `queue-ground-marker` | Vạch xếp hàng | Dấu chân sơn phai + đường gạch đứt, tile được dọc mép quán. Không chữ/số | 192×96 | P1 |

**Prompt:** `asset-generation-prompts.md` §3.2 (đầy đủ cho cả 8 asset).

---

## A3. 🍺 Bom bia + vòi rót — 5 cấp

Rót bia: batch size + tốc độ rót. Vòi = pipeline auto + progress bar.
**Visual progression:** nhựa thô sơ → inox nhỏ → 2 vòi → hệ áp suất CO2 → trạm công nghiệp nhiều vòi.

| ✓ | Asset | Cấp | Giá ×k | Storage | Batch | Pour | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|-------:|:-------:|:-----:|:----:|----------------------|-----:|:-----:|
| ⬜ | `keg-lv1` | Lv1 | có sẵn | 3 cốc | 1 | ~15s | Bom **nhựa** xanh lục, 1 vòi đồng vặn tay, xước xát tạm bợ. Trạm rót rẻ nhất | 192×192 | P1 |
| 🟡 | `keg-lv2` | Lv2 | 7.500 | 5 cốc | 2 | ~13s | Chuyển **nhựa → inox**: bom inox móp nhỏ, vòi đồng chắc hơn, thêm **khay hứng**, chỗ cho 2 cốc | 224×208 | P1 |
| 🟡 | `keg-lv3` | Lv3 | 30.000 | 8 cốc | 3 | ~11s | Bom inox **to hơn hẳn**, **2 vòi** thay vì 1, chân đế gia cố, khay hứng rộng | 256×224 | P2 |
| 🟡 | `keg-lv4` | Lv4 | 125.000 | 18 cốc | 6 | ~8s | **Nhảy bậc công nghệ**: tháp rót đôi cao kiểu cũ, đồng hồ áp suất, bình CO2 giấu phía sau. Không màn hình số | 320×240 | P3 |
| 🟡 | `keg-lv5` | Lv5 | 500.000 | 40 cốc | 12 | ~6s | Trạm rót công nghiệp: nhiều vòi đồng đồng bộ, bể inox lớn, khay rộng, van cơ khí. Vẫn analog, không màn hình | 384×256 | P4 |

**Prompt 4 cấp:**

```text
keg-lv1 → Create one humble blue-green plastic beer barrel with a small hand-operated brass tap, capacity for one glass at a time, scuffed and improvised. It must look like the cheapest starter pouring station.

keg-lv2 → Create one small dented inox beer keg with a single sturdier brass tap, simple drip tray and room for two glasses. Clearly better than the plastic Lv1, still manual.

keg-lv3 → Create one large aged inox beer keg with two brass taps, reinforced stand and wider drip tray for three-glass batches. Larger and more professional than Lv2.

keg-lv4 → Create one semi-professional pressure beer system with a tall old-fashioned twin-tap tower, visible generic pressure gauge and CO2 cylinder tucked behind, designed for six-glass batches. No modern digital display.

keg-lv5 → Create one premium industrial bia-hoi pouring station with several coordinated brass taps, large inox reservoir, broad drip tray and mechanical valves, designed for twelve-glass batches. Clean and impressive but still analog and period-plausible, no screen.
```

**Biến thể active (5 file `keg-lv{1..5}-active`)** — edit từ sprite idle đã duyệt của **đúng cấp đó**:

```text
Input images: Image 1 is the approved idle sprite for this exact level.
Change only the operating state: show amber beer flowing from the tap into one traditional green fluted handleless bia-hoi glass, with compact cream foam. Preserve every pixel-level proportion, camera, anchor, equipment material and background key color. Output one active sprite only.
```

---

## A4. 🪣 Bồn rửa cốc — 5 cấp

Vòng đời cốc: clean → in_use → dirty → washing → clean. **Đây là bottleneck chính của game.**
**Visual progression:** chậu nhôm rửa tay → chậu đôi → bồn 2 ngăn → máy bán tự động → máy công nghiệp.

| ✓ | Asset | Cấp | Giá ×k | Thời gian rửa | Slot song song | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|-------:|:-------------:|:--------------:|----------------------|-----:|:-----:|
| ⬜ | `washer-lv1` | Lv1 | có sẵn | 7s | 1 | Chậu **nhôm móp** đặt trên ghế thấp, 1 bàn chải tay, 1 gáo múc. Rửa tay thủ công hoàn toàn | 192×160 | P1 |
| ⬜ | `washer-lv2` | Lv2 | 6.250 | 5s | 1 | Bộ chậu nhôm + inox ghép đôi, thêm **vòi nước** và rổ ráo. Vẫn 1 chỗ rửa nhưng nhanh và gọn hơn | 224×176 | P1 |
| ⬜ | `washer-lv3` | Lv3 | 25.000 | 4s | **2** | Bồn inox **2 ngăn** xước, vòi, mặt ráo nước thấy rõ, **2 vị trí rửa song song**. Vẫn hở và thủ công | 256×192 | P2 |
| ⬜ | `washer-lv4` | Lv4 | 100.000 | 2.5s | **3** | **Chuyển sang máy**: tủ inox cao ngang hông, **3 khe rửa tròn**, cần gạt cơ khí, khay thoát. Không màn hình | 320×224 | P3 |
| ⬜ | `washer-lv5` | Lv5 | 375.000 | 1.5s | **5** | Trạm rửa công nghiệp: thân inox **kín**, 5 vị trí giá, nút bấm analog, giá ráo hai bên | 384×256 | P4 |

**Prompt 5 cấp:**

```text
washer-lv1 → Create one small dented aluminum wash basin on a low stool, one hand brush, one glass-washing slot and a simple water dipper. Primitive hand-washing setup, cheapest level.

washer-lv2 → Create one paired aluminum-and-inox basin setup with a simple faucet and draining basket, still one active washing position but quicker and tidier than Lv1.

washer-lv3 → Create one scratched two-basin inox street-stall sink with faucet, visible drainboard and two parallel glass-washing positions. Larger and more capable than Lv2, still fully open and manual.

washer-lv4 → Create one compact semi-automatic glass washer, waist-high inox cabinet, three circular washing slots, mechanical lever and drain tray. No screen, no futuristic controls.

washer-lv5 → Create one large industrial glass-washing station with enclosed inox body, five visible rack positions, analog buttons and side drain racks. Cleanest and most automated level while preserving 2000s mechanical design.
```

---

## A5. ❄️ Hầm / tủ giữ lạnh — 5 cấp

Giữ bia lạnh, chống mất hơi. **Lv5 = freshness vĩnh viễn** (bia không bao giờ hết hơi) — đây là mốc gameplay lớn, visual phải xứng đáng.
**Visual progression:** thùng xốp → thùng inox → tủ mát mini → tủ lạnh bàn → hầm lạnh.

| ✓ | Asset | Cấp | Giá ×k | Freshness cốc | Freshness bom | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|-------:|:-------------:|:-------------:|----------------------|-----:|:-----:|
| ⬜ | `fridge-lv1` | Lv1 | có sẵn | 12s | ~4 phút | Thùng **xốp trắng** rẻ tiền đầy đá cục, nắp lệch, đọng nước. Rõ ràng tạm bợ, làm lạnh thủ công | 192×160 | P1 |
| ⬜ | `fridge-lv2` | Lv2 | 5.000 | 20s | ~6 phút | Chuyển **xốp → inox**: thùng đá inox xước có nắp và quai bên, cách nhiệt tốt hơn. **Chưa có điện** | 224×176 | P1 |
| ⬜ | `fridge-lv3` | Lv3 | 20.000 | 35s | ~9 phút | **Có điện lần đầu**: tủ mát mini góc bo tròn, cửa kính nhỏ, núm chỉnh nhiệt analog, hơi ố vàng vì cũ | 224×256 | P2 |
| ⬜ | `fridge-lv4` | Lv4 | 75.000 | 60s | ~15 phút | Tủ lạnh **nằm ngang** gầm quầy, 2 cánh, thân inox chải, mặt bàn làm việc chắc, đồng hồ nhiệt analog | 352×224 | P3 |
| ⬜ | `fridge-lv5` | Lv5 | 250.000 | **∞** | **∞** | **Hầm lạnh**: cửa cách nhiệt dày, ống lộ, đồng hồ analog, thấy thùng bia xếp bên trong. Gợi ý "tươi vĩnh viễn" mà không viễn tưởng | 448×288 | P4 |

**Prompt 5 cấp:**

```text
fridge-lv1 → Create one cheap white foam cooler packed with rough ice cubes, crooked lid and condensation, clearly temporary and manually cooled.

fridge-lv2 → Create one lidded scratched inox ice chest with side handles, visible ice and better insulation than Lv1. No electricity or display.

fridge-lv3 → Create one compact old mini cooler cabinet with rounded corners, small glass-front door and analog thermostat knob, slightly yellowed from age.

fridge-lv4 → Create one horizontal under-counter refrigerator with two doors, brushed inox body, sturdy worktop and old analog temperature dial. Larger capacity than Lv3.

fridge-lv5 → Create one industrial cold-room entrance and cooling unit for the stall, thick insulated door, exposed pipe, analog gauge and stacked beer containers visible inside. It must suggest effectively permanent freshness without looking futuristic.
```

---

## A6. 📦 Quầy / kho — 5 cấp

Sức chứa nguyên liệu. **Quầy Lv3 = gate mở hệ biển hiệu** — cấp này phải nhìn ra "đủ ngăn nắp để xứng có biển".
**Visual progression:** bàn gỗ bày → kệ nhôm → tủ inox 3 tầng → quầy bar mini → quầy bar cao cấp.

| ✓ | Asset | Cấp | Giá ×k | Sức chứa NL | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|-------:|:-----------:|----------------------|-----:|:-----:|
| ⬜ | `counter-lv1` | Lv1 | có sẵn | 15 | Bàn **gỗ mộc** nhỏ, 2 thùng lệch bộ, vài bó nguyên liệu. Sức chứa nhìn là thấy ít | 256×176 | P1 |
| ⬜ | `counter-lv2` | Lv2 | 2.500 | 25 | Kệ **nhôm 2 tầng**, bao nguyên liệu xếp gọn, két nhựa sứt, mặt sơ chế hẹp | 256×224 | P1 |
| ⬜ | `counter-lv3` | Lv3 | 12.500 | 45 | Tủ **inox 3 tầng** kệ hở, thẻ dán mã màu (không chữ đọc được). **Đủ ngăn nắp để mở khoá biển hiệu** | 304×256 | P2 |
| ⬜ | `counter-lv4` | Lv4 | 50.000 | 80 | **Thành quầy phục vụ**: gỗ + inox kiểu cũ, kệ sau, thùng nguyên liệu, chỗ để sổ giấy, ngăn kính nhỏ. Không POS/màn hình | 384×256 | P3 |
| ⬜ | `counter-lv5` | Lv5 | 200.000 | 150 | Quầy bar vỉa hè đầy đủ: gỗ cũ đánh bóng, mặt inox, tủ kính, két xếp gọn, ngăn kéo tiền cơ khí | 480×304 | P4 |

**Prompt 5 cấp:**

```text
counter-lv1 → Create one small raw-wood display table with two mismatched boxes and a few ingredient bundles, storage capacity visibly limited.

counter-lv2 → Create one two-tier aluminum shelf with organized ingredient bags, chipped plastic crates and a narrow prep top. More capacity than Lv1.

counter-lv3 → Create one three-tier scratched inox storage cabinet with open shelves, labeled only by color-coded blank tags, enough organization to unlock signage. No readable text.

counter-lv4 → Create one compact old-style wood-and-inox service counter with rear shelves, ingredient bins, paper ledger space and a small glass display section. No POS or screen.

counter-lv5 → Create one premium full street-stall bar counter with polished aged wood, inox worktop, glass-front storage, organized crates and analog cash drawer. Impressive maximum capacity, still warm and non-modern.
```

---

## A7. 🍳 Bếp — 4 cấp (chốt 08 §8.5: Lv1 mở `dau`+`topmo`, Lv2 mở `long`, Lv3–4 chỉ tăng slot/giảm prep)

Bếp mở thêm 3 món nóng và giảm prep time. **Lv1-Lv3 mỗi cấp mở 1 món mới** — đây là family duy nhất mà cấp mở nội dung, nên khác biệt visual giữa Lv1/Lv2/Lv3 phải rõ nhất.
**Visual progression:** bếp than tổ ong → gas 1 lò → gas 2 lò → bếp inox công nghiệp. Số họng lửa phải đếm được ở 64 px (1/2/2/3 slot).

| ✓ | Asset | Cấp | Giá ×k | Mở món | Prep | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|-------:|--------|:----:|----------------------|-----:|:-----:|
| ⬜ | `kitchen-lv1` | Lv1 | 20.000 | Đậu tẩm hành + Tóp mỡ (1 slot) | prep ×1.00 | Bếp **than tổ ong**, chảo gang đen, kẹp than, vết muội. 1 chỗ nấu, khói và nghèo nàn | 224×192 | P2 |
| ⬜ | `kitchen-lv2` | Lv2 | 87.500 | + Lòng xào dưa (2 slot) | ×0.90 | Chuyển **than → gas**: bếp gas mini 1 lò, bình gas đỏ cũ ló ra, 1 chảo, tấm chắn dầu | 240×192 | P2 |
| ⬜ | `kitchen-lv3` | Lv3 | 300.000 | — (2 slot) | ×0.75 | Bếp gas **2 lò** chắc chắn, 2 chảo, mép sơ chế rộng hơn, chung 1 bình gas cũ. **2 chỗ nấu cùng lúc** | 304×208 | P3 |
| ⬜ | `kitchen-lv4` | Lv4 | 750.000 | — (3 slot) | ×0.60 | Bếp **inox thương mại** lớn nhiều họng lửa nặng, tấm chắn cao, chụp hút kim loại cũ. Chuyên nghiệp nhưng analog | 400×288 | P3 |

**Prompt 5 cấp:**

```text
kitchen-lv1 → Create one Vietnamese honeycomb-coal stove with a blackened cast-iron pan, small charcoal tongs and soot marks. One cooking position, humble and smoky.

kitchen-lv2 → Create one small single-burner tabletop gas stove with old red cylinder partly visible, one wok and a simple splash guard. Clearly faster than the coal stove.

kitchen-lv3 → Create one sturdy double-burner gas stove with two pans, wider prep edge and shared old gas cylinder. Two simultaneous cooking positions.

kitchen-lv4 → Create one large inox commercial stove with several heavy burners, tall backsplash and old metal exhaust hood. Professional but analog, no digital controls.

```

---

## A8. 🍺 Cốc bia — 7 state vòng đời + rare

> **Identity lock — append vào MỌI prompt `glass-*` và `menu-beer`:**
>
> ```text
> The vessel must be the same traditional Hanoi bia-hoi tumbler as Image 1: no handle, thick recycled green glass, many close vertical fluted ribs, moderately tall slim body about 1.3 times height-to-width, slightly flared rim and heavy base. Preserve the exact silhouette, camera, padding and outline across the whole lifecycle. Never make a beer mug, stein, thin pint glass or short squat tumbler.
> ```

Mua tối đa 10 cốc (buy-cap), kho chứa tối đa 20, ~500 xu×k/cốc.

| ✓ | Asset | State | Khi nào | Đổi gì so với `glass-clean` | Crop |
|:-:|-------|-------|---------|----------------------------|-----:|
| ✅ | `glass-clean` | Sạch | Sẵn dùng | — (đây là gốc) | 128×128 |
| ✅ | `glass-full` | Đầy bọt | Vừa rót xong | Bia hổ phách gần miệng + **bọt kem tràn nhẹ trên vành** | 128×128 |
| ✅ | `glass-half` | Bọt xẹp | Freshness đang giảm | Còn ~1/2–2/3 bia, **lớp bọt mỏng đi rõ**, vẫn tươi | 128×128 |
| ✅ | `glass-stale` | Cờ vàng ⚠️ | ~75% thời gian freshness | Bia **nhạt màu**, bọt gần sập, + **1 cờ vàng vật lý nhỏ** gài sau vành. Không emoji/chữ | 128×128 |
| ✅ | `glass-flat` | Hết hơi 💀 | Quá hạn freshness | Bia **xỉn, mất bão hoà**, không bọt, rất ít bong bóng. Nhạt nhẽo nhưng **không bẩn** | 128×128 |
| ✅ | `glass-dirty` | Bẩn | Cần rửa | Rỗng + **vân tay đục, vòng bọt khô, vệt nâu**. Phải đọc là bẩn, không phải vỡ | 128×128 |
| ✅ | `glass-washing` | Đang rửa | Trong bồn rửa | Cốc **chìm một phần** trong chậu inox + bọt xà phòng cục + nước bắn | 128×128 (chốt 08/09: cả family cốc 128) |
| ⬜ | `glass-rare-chairman` | Rare reward | Quà Chủ tịch | Thuỷ tinh **xanh ngọc dày hơn**, viền vàng tiết chế, 1 dấu triện nhỏ không chữ. Sang nhưng vẫn là cốc bia hơi thật | 128×128 |

✅ Chốt 08/09: `glass-washing` giữ **128×128** như 6 anchor còn lại (đổi spec, không gen lại).

**Rare glass — chốt 08/09:** chỉ **2 file**: `glass-rare-chairman` (identity, dùng cho clean/full) + `glass-rare-chairman-dirty`; các state khác (half/stale/flat/washing) dùng cốc thường. Prompt dưới chỉ dùng cho file `-dirty`:

```text
Input images: Image 1 is the approved glass-rare-chairman identity sprite; Image 2 is the matching normal lifecycle state reference.
Change only the liquid, foam, dirt or washing state to match Image 2. Preserve the rare glass silhouette, emerald tone, gold rim accent, seal, camera and padding exactly. Output one state only.
```

**Prompt 8 asset:** `asset-generation-prompts.md` §5.2.

---

## A9. 🐕 Chó canh quán — 3 cấp × 2 state + captured

Mua chó → bảo hiểm chống gangster + trộm offline. Cho ăn để nâng cấp.
**Visual progression:** chó con tò mò → chó trưởng thành cảnh giác → chó chiến dữ dằn. **Phải là cùng một con chó lớn lên**, không đổi giống.

| ✓ | Asset | Cấp | Chi phí nâng | HP | ATK | Khả năng | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|--------------|:--:|:---:|----------|----------------------|-----:|:-----:|
| ⬜ | `dog-idle-lv1` | Lv1 | 2.000 xu + 20 đá | 1 | 1 | Chặn trộm nhỏ | Chó con lai, **tai cụp**, vòng cổ đỏ mảnh, tò mò chứ không dữ. Nhỏ nhất | 160×144 | P3 |
| ⬜ | `dog-idle-lv2` | Lv2 | 8.000 xu + 20 kẹo | 2 | 2 | Đánh gangster thường | **Cùng con chó** trưởng thành: thân to hơn, **tai vểnh cảnh giác**, ngực nở, vòng cổ sờn chắc | 176×160 | P3 |
| ⬜ | `dog-idle-lv3` | Lv3 | 25.000 xu + 40 kẹo | 3 | 3 | One-shot côn đồ | Chó giữ nhà lực lưỡng: ngực rộng, thế đứng tự tin, **vòng da dày đinh tán**. Đe doạ nhưng vẫn thật | 192×176 | P3 |
| ⬜ | `dog-attack-lv1` | Lv1 | — | | | | Chó con lao tới ngắn, chân duỗi, mồm há — **hài hơn là nguy hiểm** | 176×144 | P3 |
| ⬜ | `dog-attack-lv2` | Lv2 | — | | | | Chó trưởng thành **bật nhảy** mạnh, thân duỗi, tập trung. Không có mục tiêu, không máu me | 192×160 | P3 |
| ⬜ | `dog-attack-lv3` | Lv3 | — | | | | Chó chiến **vồ có kiểm soát**, bóng lớn, chuyển động dứt khoát | 224×176 | P3 |
| ⬜ | `dog-captured` | — | — | | | Thua gangster | Cùng con chó ngồi buồn, **xích lỏng** bên cạnh, tai cụp. Không lồng, không thương tích | 176×160 | P3 |

**Vật phẩm cho chó:** `icon-dog-food` (bát cơm thịt + xương) · `icon-dog-candy` (túi giấy bánh thưởng) · `icon-dog-captured` (vòng cổ + xích + tai cụp) — 128×128.

**Prompt:** `asset-generation-prompts.md` §7.2.

---

## A10. 🔪 Côn đồ — 4 mức

**Visual progression:** gầy → to đậm → cơ bắp → boss điềm tĩnh. Mức đe doạ tăng bằng **thể hình và thần thái**, không bằng vũ khí hay máu me.

| ✓ | Asset | Mức | HP | Đổi gì nhìn thấy được | Crop | Phase |
|:-:|-------|:---:|:--:|----------------------|-----:|:-----:|
| ⬜ | `gangster-1` | #1 | 1 | Côn đồ gầy, **áo ba lỗ**, dây chuyền rẻ tiền, thế đứng hăm doạ. Mức thấp nhất, không tập trung vào vũ khí | 160×192 | P3 |
| ⬜ | `gangster-2` | #2 | 2 | To đậm hơn, **tay áo xắn**, hình xăm phai, thế đứng nặng. Rõ ràng cứng hơn #1 | 176×208 | P3 |
| ⬜ | `gangster-3` | #3 | 3 | **Cơ bắp**, áo gi-lê tối, cue sẹo, thế áp đảo. Mức thường cao nhất — **không** giải phẫu phóng đại kiểu fantasy | 192×224 | P3 |
| ⬜ | `gangster-boss` | Boss | — | Ông trùm lớn tuổi **điềm tĩnh**: sơ mi cổ mở, nhẫn vàng, áo khoác dài. **Uy quyền chứ không phải giáp trụ hoạt hình** | 192×224 | P3+ |

**Prompt:** `asset-generation-prompts.md` §7.1.

---

## A11. 🏪 Biển hiệu — 5 style

**Gate:** Quầy Lv3 + 20.000 xu phí lắp lần đầu. Đây **không phải level tuyến tính** — 5 style song song, mỗi style đổi customer mix khác nhau.
Mọi biển phải **chừa vùng giữa trống** cho code render chữ.

| ✓ | Asset | Style | Giá ×k | Hiệu ứng gameplay | Mô tả hình | Crop | Phase |
|:-:|-------|-------|-------:|-------------------|-----------|-----:|:-----:|
| ⬜ | `sign-wood` | Gỗ (mặc định) | 0 | VIP spawn ×2 | Ván gỗ mộc không đều, nét cọ sơn tay màu kem **chỉ để trang trí**, dây treo, mép sờn | 320×160 | P3 |
| ⬜ | `sign-neon` | Neon | 37.500 | VIP ×2, shipper ×1.2 | **Ống thuỷ tinh neon kiểu cũ** hổ phách + đỏ phai, hơi chập chờn, đế kim loại cũ. Không LED matrix | 320×176 | P3 |
| ⬜ | `sign-vintage` | Vintage | 50.000 | VIP ×2, Giờ Vàng ×0.5 | Biển **tôn sơn tay retro**, lớp xanh mòng két / kem / đỏ phai, góc sứt | 320×176 | P3 |
| ⬜ | `sign-calligraphy` | Thư pháp | 62.500 | VIP ×2, stubborn ×0.8 | Gỗ sẫm + **giấy dó** lót, khối triện đỏ trống, hình nét cọ trang trí. Không chữ Hán-Nôm đọc được | 320×176 | P3 |
| ⬜ | `sign-golden` | Hoàng kim 🌟 | 75.000 + 12.500⭐ | **VIP ×3** | **Vàng cũ cao cấp** + nền gỗ chạm, hoạ tiết bọt bia tiết chế, bóng đèn ấm. Sang nhưng không cung điện | 352×192 | P3 |

**Prompt:** `asset-generation-prompts.md` §8.2.

---

## A12. 🎨 Cosmetic — lồng đèn, cây cảnh, theme World Cup

> Cosmetic-only: **KHÔNG ảnh hưởng gameplay**. Hiển thị trên thẻ "Dạo Phố". Mua bằng xu HOẶC donation.

### Lồng đèn — 4 style (song song, không phải cấp)

| ✓ | Asset | Style | Giá ×k | Mô tả hình | Crop | Phase |
|:-:|-------|-------|-------:|-----------|-----:|:-----:|
| ⬜ | `lantern-japanese` | Đèn Nhật (izakaya) | 5.000 | Đèn giấy đỏ-kem kiểu izakaya cũ, **không chữ**, thấy bóng đèn ấm, hơi sờn | 128×160 | P3 |
| ⬜ | `lantern-lotus` | Đèn hoa sen | 8.000 | Đèn hình hoa sen thủ công, cánh giấy hồng/kem phai, bóng cũ ấm, khung dây đơn giản | 128×160 | P3 |
| ⬜ | `lantern-red` | Đèn lồng đỏ | 6.000 | Đèn vải đỏ truyền thống, viền vàng sờn, tua rua. **Không chữ**, không bóng loáng hiện đại | 128×160 | P3 |
| ⬜ | `lantern-vintage` | Đèn cổ điển | 10.000 | Đèn dầu treo cải sang bóng điện ấm, đồng cũ, kính mờ | 128×160 | P3 |

### Cây cảnh — 4 style

| ✓ | Asset | Style | Giá ×k | Mô tả hình | Crop | Phase |
|:-:|-------|-------|-------:|-----------|-----:|:-----:|
| ⬜ | `plant-bamboo` | Trúc | 4.000 | Bụi trúc trong chậu gốm sứt, **bóng dọc rõ** | 128×160 | P3 |
| ⬜ | `plant-bonsai` | Bonsai | 12.000 | Bonsai nhỏ tạo dáng kỹ trong chậu đất nung nông, tán bất đối xứng đọc được | 128×160 | P3 |
| ⬜ | `plant-orchid` | Lan | 8.000 | Chậu lan vài bông tím nhạt, que đỡ dây, chậu gốm cũ | 128×160 | P3 |
| ⬜ | `plant-succulent` | Sen đá | 3.000 | Sen đá hình hoa thị trong **cốc men sứt dùng làm chậu**, bóng gọn | 128×160 | P3 |

### Theme đội tuyển World Cup — 3 mask + 48 palette

> **Không vẽ 48 bộ asset.** Vẽ **1 bộ mask grayscale dùng chung**, runtime re-hue bằng palette `{primary, secondary, accent}` của từng đội.

| ✓ | Asset | Mô tả | Crop | Phase |
|:-:|-------|-------|-----:|:-----:|
| ⬜ | `theme-flag-mask` | Mask cờ vải grayscale, **3 vùng giá trị tách bạch** cho primary/secondary/accent. Không emblem, không chữ, không gắn với nước có thật | 192×192 | P4 |
| ⬜ | `theme-lantern-mask` | Mask lồng đèn giấy grayscale, 3 vùng tông tách bạch | 128×160 | P4 |
| ⬜ | `theme-sign-mask` | Mask biển tôn sơn tay grayscale, 3 vùng tông + **giữa trống** cho chữ runtime | 320×176 | P4 |

Giá: theme mỗi đội ~20.000 ×k · combo "Cờ Vụ Bia" 6 đội ~90.000 ×k (−25%).

---

## A13. 🗺️ Mặt bằng — 9 vị trí (chốt theo `economy.tbh.json` `locations.list` / F14 / 08 §16 — 08/09)

> Mỗi mặt bằng = **1 background illustration riêng**, full screen. Multiplier áp lên payment. Rent trả trước 7 ngày + cọc 25%. Rent ×k dưới đây lấy từ JSON (`rentPerDayBase` × 2.5); đổi số = đổi JSON, không sửa bảng này. Tên file = `bg-location-<id JSON, gạch ngang>`.

| ✓ | Asset | Vị trí | Rent/ngày ×k | Multiplier | Gate | Mô tả cảnh | Mốc |
|:-:|-------|--------|-------------:|:----------:|:----:|-----------|:-----:|
| ⬜ | `bg-quanbia-default` | **Hẻm Nhỏ** (khởi đầu) | 0 | ×1.00 | — | Hẻm nhà ở kiểu Hà Nội hẹp: tường vữa phai, mái tôn, dây điện lộ, đèn tuýp cũ, vết ố nước | M1 |
| ⬜ | `bg-location-ngo-cho` | **Ngõ Chợ** | 4.200 | ×1.10 | LP1 | Ngõ ra chợ chiều: mái bạt, sạp gỗ đóng dở, rổ nhựa, bóng sợi đốt, xe đẩy cũ. Ấm, lộn xộn có trật tự, không neon | M5 |
| ⬜ | `bg-location-ben-xe` | **Bến Xe** | 6.825 | ×1.20 | LP1 | Rìa bến xe khách: đuôi xe ca cũ, hàng rào sắt, biển số tuyến để trống, ghế chờ, bụi nhẹ, hàng rong xa | M5 |
| ⬜ | `bg-location-gan-cong-so` | **Gần Công Sở** | 9.800 | ×1.30 | LP2 | Vỉa hè khu công sở đầu 2000s: mặt tiền ốp gạch, bãi xe máy, đèn tuýp sảnh, vỉa hè lát đá sạch hơn | M5 |
| ⬜ | `bg-location-gan-svd` | **Gần Sân Vận Động** | 13.125 | ×1.40 | LP3 | Đường ngoài tường sân vận động cũ: cột đèn pha chung chung, cờ đuôi nheo vải, bóng khán đài xa | M5 |
| ⬜ | `bg-location-ho-bia-dem` | **Hồ Bia Đêm** | 16.800 | ×1.50 | LP3 | Bờ hồ buổi tối: lan can đá, cây rủ, đèn dây vàng ấm, mặt nước phản chiếu, gió nhẹ — không neon | M5 |
| ⬜ | `bg-location-pho-co` | **Phố Cổ** | 20.825 | ×1.60 | LP4 | Mặt tiền phố cổ Hà Nội: nhà ống hẹp màu hoàng thổ, cửa gỗ lá sách, biển hiệu cũ **để trống**, dây điện chằng | M5 |
| ⬜ | `bg-location-ga-metro` | **Ga Metro** | 25.200 | ×1.70 | LP5 | Đầu mối giao thông cách điệu hợp thế giới game: lối vào bê tông, ghế chờ cũ, cue đường sắt đô thị, không logo thật | M5 |
| ⬜ | `bg-location-pho-tay` | **Khu Phố Tây** | 29.925 | ×1.80 | LP6 | Phố Tây sôi động: mặt tiền nhà cổ pha trộn, bóng đèn quán ấm, panel biển **hình song ngữ để trống**, bảng đen | M5 |
| ⬜ | `bg-quanbia-upgrade` | (biến thể quán nâng cấp) | — | — | — | Bản nâng cấp của hẻm mặc định. **Giữ nguyên mọi anchor gameplay và camera.** Chỉ cải thiện chất liệu/đèn | M5 |

**Canvas:** 1200×1440 (logical 600×720) · **Prompt:** `asset-generation-prompts.md` §10.2.
**Constraint chung:** không bake khách, chủ quán, bàn ghế, thiết bị, HUD, chữ hay thời tiết vào background. Giữ **giữa và dưới-giữa trống** làm vùng chơi.

---

## A14. 📱 Mở khoá một lần (sink)

Không phải level, nhưng là upgrade một chiều có gate — gom vào đây cho đủ.

| ✓ | Asset | Item | Giá ×k | Gate | Tác dụng | Mô tả hình | Crop | Phase |
|:-:|-------|------|-------:|------|----------|-----------|-----:|:-----:|
| ⬜ | `phone` | Điện thoại cục gạch | 12.500 | — | Mở shipper xe số | Điện thoại phím bấm đầu 2000s, màn đơn sắc nhỏ, vỏ xám sờn, vạch rung. Không logo | 128×128 | P2 |
| ⬜ | `qr-payment` | Bảng QR giấy dán | 20.000 | Điện thoại + LP2 | Tip +20% | **Ngoại lệ meta hiện đại:** ô QR đen trắng trống in trên giấy trắng cũ **dán lên bìa carton**, góc sờn. Data QR do code render | 192×160 | P3 |
| ⬜ | `icon-broadcast-license` | Bản quyền phát sóng | 125.000 | — | Gate Giờ Vàng WC | Giấy phép gấp có triện ăng-ten CRT + dấu sáp nhỏ. Không chữ, không logo thể thao thật | 128×128 | P4 |
| ⬜ | `icon-match-schedule` | Lịch thi đấu | 37.500 | — | HUD lịch + cổ vũ ×1.15 | Lịch treo tường giấy có quả bóng nhỏ + đồng hồ cũ, ô ngày **để trống** | 128×128 | P4 |
| ⬜ | `flyer-bundle` | Tờ rơi | Nhiệm vụ | LP2 | Campaign 90s, khách ×3.6 | Bó tờ rơi in offset rẻ, khối đỏ/vàng/xanh phai, **không chữ đọc được**, quăn góc | 128×128 | P3 |
| ⬜ | `tv-off` | TV (tắt) | — | Bản quyền | Nền Giờ Vàng WC | TV CRT bụng phình trên chân sắt thấp, màn cong tối, núm bên, ăng-ten râu | 256×224 | P4 |
| ⬜ | `tv-on` | TV (bật) | — | — | — | Cùng TV bật: ánh sân cỏ xanh chung chung + 2 khối màu đội trừu tượng. **Không tỉ số, logo, mặt cầu thủ hay chữ** | 256×224 | P4 |

**Prompt:** `asset-generation-prompts.md` §8.1.

---

# PHẦN B — ASSET KHÔNG CÓ LEVEL (checklist gọn)

> Nhóm này không có progression theo cấp nên chỉ liệt kê để tick. Prompt đầy đủ ở `asset-generation-prompts.md` mục tương ứng (ghi ở đầu mỗi bảng).

---

## B1. 🍽️ Món bán & nguyên liệu — 12 icon · 128×128 (bỏ `mat-onion`, `mat-ice` — 08/09)

**Prompt:** §5.3 (món) và §5.4 (nguyên liệu).
**Quy tắc phân biệt:** `menu-*` = **món đã chế biến** trên đĩa/bát, nhìn ngon và sạch. `mat-*` = **nguyên liệu kho** dạng bao/thùng/gói/xô/lọ. Silhouette hai nhóm không được nhầm nhau (QA §16.1).

| ✓ | Asset | Món | Giá | Vốn | Mở khoá | Focus hình |
|:-:|-------|-----|----:|----:|---------|-----------|
| ✅ | `menu-beer` | Bia hơi (cốc) | 50 | 10 | Từ đầu | Cốc bia hơi đầy bọt, dùng lại identity `glass-full`, không đĩa/nền |
| ⬜ | `menu-peanut` | Lạc | 75 | 26 | Từ đầu | Đĩa men sứt đựng lạc rang vàng nâu, vài hạt văng |
| ⬜ | `menu-nemchua` | Nem chua | 150 | 60 | Từ đầu | Nem cuộn lá chuối mở dở, lát hồng, lá xanh, chút ớt |
| ⬜ | `menu-friedbean` | Đậu tẩm hành | 100 | 45 | Bếp Lv1 | Đĩa đậu chiên vàng + mỡ hành + hành phi giòn, rõ là **đã nấu** |
| ⬜ | `menu-crackle` | Tóp mỡ Triều Khúc | 165 | 82 | Bếp Lv2 | Đĩa tóp mỡ vàng giòn, miếng vuông nhỏ, bóng nhẹ, không ngấy |
| ⬜ | `menu-intestine` | Lòng xào dưa | 280 | 155 | Bếp Lv3 | Đĩa oval lòng xào dưa chua, thấy hơi nóng và độ bóng chảo |

| ✓ | Asset | Nguyên liệu | Giá lẻ | Focus hình |
|:-:|-------|-------------|-------:|-----------|
| ⬜ | `mat-beer-barrel` | Nguyên liệu bia | 10 | Bom nhôm móp niêm phong + thẻ giấy trống + quai dây. **Không được giống cốc bia bán** |
| ⬜ | `mat-peanut-raw` | Lạc sống | 26 | Bao đay mở đựng lạc chưa bóc, be nâu mộc, bụi bặm |
| ⬜ | `mat-nemchua-pack` | Nem chua gói | 60 | Bó nem lá chuối buộc dây thô + thẻ giấy trống, **không phải món đã bày đĩa** |
| ⬜ | `mat-bean-raw` | Đậu sống | 45 | Két nông đựng khối đậu trắng sống phủ khăn ẩm |
| ⬜ | `mat-pork-fat` | Mỡ lợn | 82 | Khay men đựng khối mỡ hồng nhạt sống trên đá vụn, trung tính không ghê |
| ⬜ | `mat-intestine-raw` | Lòng + dưa chua | 155 | Xô men có nắp, lòng sống và dưa chua tách riêng gọn, **không ghê**, rõ là nguyên liệu |
| ~~⬜~~ **bỏ 08/09** (hành phi = chi tiết món đậu; đá không tiêu hao) | `mat-onion` | Hành phi | ~20 | Lọ thuỷ tinh cũ + túi giấy hành phi/hành khô, nhãn trống |
| ~~⬜~~ **bỏ 08/09** (hành phi = chi tiết món đậu; đá không tiêu hao) | `mat-ice` | Đá lạnh | ~5 | Túi nilon trong buộc đá viên cục, highlight xanh mát, đọng nước, không logo |

---

## B2. 👥 Nhân vật — ~75 sprite

**Prompt:** §6 (chủ quán, khách, weather/action modifier, portrait) · §7.1 (NPC).

### Chủ quán — 3 biến thể thời tiết
`owner` (thường — tạp dề, khăn vắt hông, dáng sẵn sàng phục vụ) · `owner-hot` (xắn tay cao hơn, khăn lau trán) · `owner-cold` (áo khoác ô-liu sờn khoác ngoài tạp dề, hơi thở trắng tách khỏi silhouette) — 160×192, P1-P2

> Tên base là `owner`, **không phải** `owner-normal`.

### Khách gameplay — 7 type × 3 thời tiết = 21
| ✓ | Asset base | Loại | Weight | Badge | Đặc trưng |
|:-:|-----------|------|:------:|:-----:|----------|
| ⬜ | `customer-normal` | Dân nhậu thường | 1.0 | — | Áo thun, dép lê |
| ⬜ | `customer-rush` | Khách vội (tan ca) | 0.3 | 🔴 VỘI | Đồ công sở, cặp da cũ, ĐT phím bấm, chồm người |
| ⬜ | `customer-vip` | Khách sộp VIP | 0.1 | 🟡 VIP | Sơ mi đóng thùng, kính râm, đồng hồ vàng tiết chế |
| ⬜ | `customer-chipheo` | Chí Phèo (quậy) | 0.03 | 🟤 XỈN | Say, áo rách, mặt đỏ |
| ⬜ | `customer-laurai` | Bàn lai rai (ngồi lỳ) | 0.1 | 🟢 LỲ | Thoải mái, ngả ghế |
| ⬜ | `customer-shipper` | Shipper | timer | 🔵 SHIP | Đồng phục giao hàng, xe số |
| ⬜ | `customer-football` | Nhóm cổ vũ | event | ⚽ CỔ VŨ | Áo đội bóng, cờ, kèn (×1, không biến thể thời tiết) |

**Weather modifier** (áp lên mỗi identity, không đổi nhận dạng): `-hot` xắn tay/quạt giấy/mồ hôi · `-cold` áo khoác/khăn quàng/co ro.

### Customer visual skin — 20 skin (chỉ đổi hình + badge, KHÔNG tạo logic spawn mới)
`customer-skin-runner` · `-badminton` · `-pickleball` · `-office-worker` · `-construction-worker` · `-student` · `-aunties` · `-regular-bia-lover` · `-drunk-happy` · `-drunk-rowdy` · `-drunk-sleepy` · `-retiree` · `-cyclist` · `-tourist` · `-foodie` · `-football-fan` · `-football-ultra` · `-shipper-bike` · `-boss-host` · `-solo` — 160×192, P1-P3

### NPC & event
| ✓ | Asset | NPC | Phase |
|:-:|-------|-----|:-----:|
| ⬜ | `chairman-poor` | Chủ tịch giả nghèo trước reveal — có **1 manh mối chất lượng nhỏ** (đồng hồ cũ giữ kỹ) | P2 |
| ⬜ | `chairman-reveal` | Sau reveal: vest sẫm đúng thời, sơ mi kem, đồng hồ vàng. **Giữ mặt và dáng** để biến hình tin được | P2 |
| ⬜ | `chairman-smoke` | Cụm khói reveal kem + bạc hà nhạt + tia hổ phách, không người, không chữ | P2 |
| ⬜ | `npc-inspector` | Đội trật tự/ATTP: đồng phục kaki dân phòng, kẹp hồ sơ, mũ. Không phù hiệu đọc được | P3 |
| ⬜ | `npc-lottery-seller` | Bán vé số dạo: mũ nan, bảng vé giấy, túi vải. Vé là khối màu, **không số đọc được** | P4 |
| ⬜ | `npc-thief` | Trộm đêm: đồ tối đầu 2000s, mũ vải, dáng lom khom, bao nguyên liệu. Hài chứ không bạo lực | P3 |

### UI portrait / avatar — 256×256 master
Tạo portrait cho: `owner` · 7 gameplay customer type · 20 customer skin · `chairman-poor` · `chairman-reveal` · `gangster-1..boss` · `npc-inspector` · `npc-lottery-seller` · `npc-thief` — **giữ đúng nhận dạng và màu trang phục** của sprite gameplay tương ứng.

---

## B3. 🎛️ HUD & icon hệ thống — ~140 icon · 128×128

**Prompt:** §9.1 (HUD core) · §9.2 (system/progression/account) · §9.3 (badge & expression) · §9.4 (leaderboard & social).
**Lock:** `ICON_LOCK` — 1 biểu tượng đậm ở giữa, padding 12-16%, **đọc được ở 24px**, không chữ, không số, không nền card.

| Nhóm | Số | Asset |
|------|---:|-------|
| **Top bar** | 10 | `icon-coin` `icon-stamina` `icon-reputation` `icon-rush-light` `icon-rush-heavy` `icon-weather-sunny` `icon-weather-hot` `icon-weather-humid` `icon-weather-rain` `icon-weather-cold` |
| **Side rail** | 6 | `icon-ai-assistant` `icon-notification` `icon-quest` `icon-shrine` `icon-sound-on` `icon-sound-off` |
| **Bottom bar** | 5 | `btn-upgrade` `btn-restock` `btn-shift` `btn-leaderboard` `icon-trophy` |
| **Tiền tệ & meta** | 5 | `icon-coin-inline` `icon-reputation-star` `icon-badge-shard` `icon-cosmetic-token` `icon-gift-box` |
| **Badge khách (gameplay)** | 6 | `badge-rush` `badge-vip` `badge-chipheo` `badge-laurai` `badge-shipper` `badge-football` |
| **Badge khách (skin)** | 15 | `badge-runner` `badge-badminton` `badge-pickleball` `badge-office` `badge-construction` `badge-student` `badge-aunties` `badge-regular` `badge-drunk-happy` `badge-drunk-rowdy` `badge-drunk-sleepy` `badge-retiree` `badge-cyclist` `badge-tourist` `badge-foodie` |
| **Cảm xúc** | 4 | `emoji-happy` `emoji-angry` `emoji-cool` `emoji-drunk` — pixel-art gốc, **không phải glyph emoji font** |
| **Bottleneck** | 4 | `icon-bottleneck-cups` `icon-bottleneck-speed` `icon-bottleneck-stale` `icon-bottleneck-stock` |
| **Giải Nhậu (8 bậc)** | 8 | `icon-league-1..8` — Cốc Nhựa → Trùm Bia Hơi |
| **Đường Lên Trùm (8 mốc)** | 8 | `icon-dlt-lp0..7` — Bưng Bê → Trùm Bia Hơi |
| **Referral & badge** | 3 | `badge-ket-noi` `badge-ban-be` `badge-dong-hanh` ✅ chốt 08/09: Kết Nối → `badge-ket-noi` (có tác dụng gate VIP) · Bạn Bè → `badge-ban-be` · Đồng Hành → `badge-dong-hanh` |
| **Quest** | 5 | `icon-quest-daily` `icon-quest-shift` `icon-quest-referral` `icon-quest-gift` `icon-quest-attendance` |
| **Rủi ro & sự kiện** | 5 | `icon-drunk-fight` `icon-offline-theft` `icon-inspection-question` `icon-certificate-crossed` `icon-table-vip-lock` |
| **Chó** | 3 | `icon-dog-food` `icon-dog-candy` `icon-dog-captured` |
| **Mặt bằng & thuê** | 4 | `icon-rent` `icon-deposit` `icon-lease-expiry` `icon-location-pin` |
| **Xổ số** | 3 | `icon-lottery-ticket` `icon-lottery-draw` `icon-lottery-prize` |
| **World Cup & shop mùa** | 2 | `icon-season-shop` `icon-season-theme` |
| **Tài khoản & đồng bộ** | 6 | `icon-google-login` `icon-guest` `icon-language` `icon-cloud-save` `icon-device-sync` `icon-referral-link` |
| **Donate** | 3 | `icon-payment-qr` `icon-payment-pending` `icon-payment-success` — ~~`icon-session-pass`~~ bỏ 08/09 (chơi free hết) |
| **Donation & quà** | 4 | `icon-donation-gift` `icon-supporter-heart` `icon-gift-send` `icon-gift-receive` |
| **Khác** | 2 | `icon-duong-len-trum` `icon-reward-claim` |
| **Leaderboard & social** | 13 | `leaderboard-medal-gold/silver/bronze` `leaderboard-medal-top10` `icon-champion-crown` `icon-season-placement` `icon-season-conquest` `icon-season-reward-preview` `icon-reputation-season` `icon-street-visit` `icon-profile-views` `icon-block-user` `icon-message-compose` |
| **Emote (32×32)** | 8 | `emote-wave` `emote-laugh` `emote-fire` `emote-strong` + 4 emote còn lại (§9.4) — pixel-art gốc |

---

## B4. 🌆 Background, splash & thời tiết

**Prompt:** §10.3 (splash) · §10.4 (weather overlay + particle).

| ✓ | Asset | Canvas | Mô tả |
|:-:|-------|-------:|-------|
| ⬜ | `bg-rest-illustration` | 2560×1440 | Quán sau giờ đóng: chủ quán ngả ghế nhựa đỏ, radio cũ, bàn sạch, bóng đèn khuya ấm, bóng phố xanh. Chừa khoảng trống rộng cho UI nghỉ |
| ⬜ | `bg-login` | 2560×1440 | Hẻm chiều sớm trước giờ mở: chủ quán kéo mái, ánh sáng màu bia, biển để trống. Chừa vùng giữa-dưới cho chọn ngôn ngữ + login |
| ⬜ | `bg-loading` | 2560×1440 | Bóng hẻm bình minh tối giản, mái đóng, 1 bóng đèn treo, hơi ấm ấm trà xa. Giữa để trống cho logo + thanh loading |
| ⬜ | `bg-shift-summary` | 1536×1024 | Cảnh mặt bàn: sổ kẻ ô cũ, bút bi, xu đồng, bàn tính, 1 cốc rỗng ở mép. **Giấy để trống** cho số runtime |
| ⬜ | `bg-desktop-shell` | 2560×1440 | Mở rộng hẻm quanh cửa sổ gameplay 600×720 ở giữa. Chỉ tường/dây/cây ở lề ngoài. Không UI, người, prop bàn |
| ⬜ | `bg-social-street` | 2560×1440 | Phố có nhiều mặt tiền quán bia xa xa với biển/đèn/cây khác nhau — nền duyệt "Dạo Phố", chừa chỗ cho thẻ |
| ⬜ | `leaderboard-empty-state` | 1024×1024 | Bục vinh danh trống trên phố bia yên tĩnh, 1 cốc chờ ở bậc trên, bình minh ấm. Nhiều khoảng trống cho message |
| ⬜ | `donation-thank-you-illustration` | 1536×1024 | Chủ quán nâng cốc về phía người xem cạnh hộp quà cosmetic nhỏ. Chân thành, **không mưa tiền, không biểu tượng pay-to-win** |
| ⬜ | `ai-assistant-mascot` | 1024×1024 | Linh vật "Bia Đấm": **loa phường cũ ghép radio cassette**, mắt chỉ báo hổ phách nhỏ, dây như khăn. Không màn hình robot, không bong bóng thoại |

**Weather overlay** (alpha nhẹ, **không** đổi geometry background): `weather-overlay-sunny` `-hot` `-humid` `-rain` `-cold` + `weather-popup-bg`
**Particle:** `particle-raindrop` (4×16) · `particle-steam` (16×16) · `particle-snowflake` (8×8) · `particle-leaf` (12×12)

---

## B5. 🖼️ Event cut-in & UI overlay raster

**Cut-in** (`ILLUSTRATION_LOCK`, mỗi output 1 cảnh, chừa chỗ cho chữ code render) — §12:
`cutin-chairman-reveal` · `cutin-gangster-arrival` · `cutin-inspection` · `cutin-lottery-seller` · `cutin-offline-theft` · `cutin-dog-captured` · `cutin-shift-success` · `cutin-shift-failure`

**Overlay/skin nên gen** — §11.1: `rush-banner` `rush-countdown-bg` `tinh-tao-pill` `patience-bar` `freshness-bar` `queue-indicator` `shipper-lane` `combo-marker` `order-bubble` `order-ready-checkmark` `prep-timer-ring` `dish-ready-check` `upgrade-panel-bg` `restock-panel-bg` `loading-skeleton` `onboarding-spotlight` `upgrade-card` `upgrade-stat-arrow` `location-card` `street-card` `quest-mission-card` `risk-modal` `gangster-modal` `dog-panel` `ai-assistant-panel` `donation-thank-you` `payment-status-card` `profile-summary-card` `leaderboard-entry-card` `closing-ledger-panel` `kitchen-panel` `table-state-paying` `table-state-cleaning` `table-state-broken`

**UI texture 9-slice** — §11.2, 192×192, **không bake chữ/nút/card hoàn chỉnh**.

**Event props** — §8.1: `secret-box` `emergency-pack` `inspection-badge` `certificate` `prop-celebration` `prop-thief-report` `rare-glass-gift-box`

---

## B6. 🎬 Animation frame

**Prompt:** §13. Giữ baseline, không nhảy scale, không motion blur mềm. Chỉ pose/state đổi — geometry gốc **không được drift**.

| Animation | Frame | Ghi chú |
|-----------|:-----:|---------|
| Rót bia (keg active) | 3 | 1 frame mỗi cấp keg (dùng edit từ idle) |
| Rửa cốc | 3 | Bọt + nước bắn |
| Cụng ly (bàn consuming) | 2 | Tia sparkle |
| Chó vồ | 3 | `dog-attack-lv{1-3}` |
| Chairman reveal | 3 | poor → smoke → reveal |
| Floating number (+xu, +tip) | 2 | 1 frame mỗi loại |
| Côn đồ tới | 3 | |

---

## B7. 🔊 Audio — 75 id (mọi action & domain event đều có tiếng; mỗi id xuất `.ogg` + `.m4a`)

**Nguyên tắc giao việc:** chỉ chốt **đầu vào** (bảng dưới: id · sự kiện kích hoạt · loại · độ dài), **đầu ra** (format, loudness, manifest, license) và **QA**. Công cụ, cách tạo (synth, foley, AI audio gen, thư viện CC0…) do designer/agent **tự quyết** — không dùng Blender cho audio. `docs/asset-generation-prompts.md` §14 chỉ là gợi ý mô tả cho 11 file đầu.

**Sự kiện kích hoạt** lấy từ engine event bus (`10-SPEC` §6) + UI event; dev gắn âm thanh bằng listener, engine không biết audio. Một sự kiện = một id; không dùng chung file cho hai sự kiện khác nghĩa. Ưu tiên: 🔴 làm trước (vòng phục vụ lõi + UI) · 🟠 kế · 🟡 sau cùng.

### B7.1 Ambient / loop (seamless)
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `ambient-bia-hoi` | nền trong ca (mọi thời tiết) | 90s loop, 78 BPM | 🔴 |
| ☐ | `ambient-gossip` | Xả Hơi / ngoài ca (loa phường) | 60s loop | 🟠 |
| ☐ | `amb-weather-rain` | `weather_rolled: rain` (layer trên nền) | 45s loop | 🟠 |
| ☐ | `amb-weather-wind-cold` | `weather_rolled: cold` | 45s loop | 🟡 |
| ☐ | `amb-weather-hot-cicada` | `weather_rolled: hot` (ve kêu) | 45s loop | 🟡 |
| ☐ | `amb-rush-crowd` | `rush_started` light/heavy (layer đông khách) | 30s loop | 🟠 |
| ☐ | `amb-football-crowd` | `rush_started: football` / trận đấu WC | 30s loop | 🟡 |

### B7.2 UI (mọi thao tác chạm đều có phản hồi)
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `ui-tap` | chạm nút/pill bất kỳ | ≤0.15s | 🔴 |
| ☐ | `ui-sheet-open` | mở sheet/modal (Nhập hàng, Nâng cấp, Sổ ca…) | ≤0.4s | 🔴 |
| ☐ | `ui-sheet-close` | đóng sheet/modal | ≤0.4s | 🔴 |
| ☐ | `ui-toggle` | bật/tắt toggle, đổi tab | ≤0.2s | 🟠 |
| ☐ | `ui-denied` | thao tác bị từ chối (thiếu xu, hết kho, chưa đủ cấp) | ≤0.5s | 🔴 |
| ☐ | `ui-notify` | chuông có thông báo/quest mới (chấm đỏ) | ≤0.8s | 🟠 |
| ☐ | `ui-coachmark` | coachmark onboarding hiện | ≤0.5s | 🟠 |

### B7.3 Ca (shift)
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `shift-open` | `shift_opened` (kẻng mở quán) | ≤1.5s | 🔴 |
| ☐ | `shift-close` | `shift_closed` → màn Sổ sách | ≤2s | 🔴 |
| ☐ | `shift-warning` | thể lực còn 60s | ≤0.8s | 🟠 |
| ☐ | `shift-cap-reached` | chạm trần ca/ngày hoặc trần tiền | ≤1s | 🟡 |
| ☐ | `well-rested-start` | Tỉnh Táo ×1.1 bắt đầu | ≤1s | 🟡 |

### B7.4 Khách (customer)
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `customer-arrive` | `customer_spawned` nhóm ngồi xuống (ghế nhựa kéo) | ≤0.8s | 🔴 |
| ☐ | `customer-order` | nhóm gọi món (bong bóng/popover Order hiện) | ≤0.6s | 🔴 |
| ☐ | `customer-order-more` | gọi thêm đợt 2+ | ≤0.6s | 🟠 |
| ☐ | `customer-patience-low` | kiên nhẫn <25% (tick cảnh báo, không lặp dồn) | ≤0.4s | 🔴 |
| ☐ | `customer-cheers` | sau serve: cụng ly "dô" (nonverbal) | ≤1.2s | 🔴 |
| ☐ | `customer-finish` | nhóm dùng xong, đứng dậy trả tiền (`customer_served` → paying) | ≤1s | 🔴 |
| ☐ | `customer-leave-angry` | `customer_left: timeout/stale` (bỏ đi) | ≤1.5s | 🔴 |
| ☐ | `customer-vip-arrive` | khách sộp / Đại gia lộ diện | ≤1.2s | 🟠 |
| ☐ | `customer-chipheo` | Chí Phèo quậy / chiếm bàn | ≤1.2s | 🟠 |
| ☐ | `customer-shipper` | shipper đến lấy hàng (còi xe máy nhẹ) | ≤0.8s | 🟡 |
| ☐ | `customer-kick` | đuổi khách ngồi lỳ | ≤0.8s | 🟡 |

### B7.5 Phục vụ (serve — 4 kết cục 03-SPEC §9.3)
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `order-ready` | đủ món, bàn pulse (`allReady`) | ≤0.5s | 🔴 |
| ☐ | `serve-success` | `order_served` đúng lúc (đặt mâm) | ≤0.7s | 🔴 |
| ☐ | `serve-grace` | serve trong grace (thành công nhưng "suýt") | ≤0.7s | 🟠 |
| ☐ | `serve-fail` | chạm khi nhóm đã đi / mất mâm | ≤0.8s | 🔴 |
| ☐ | `serve-tip` | có boa (chồng lên coin) | ≤0.6s | 🔴 |
| ☐ | `serve-lost-vip` | mất khách sộp (🚨) | ≤1s | 🟠 |

### B7.6 Bia & cốc
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `pour-beer` | bom bia rót (theo `pourMs`, cắt được) | 2.5s | 🔴 |
| ☐ | `glass-warn` | cốc chuyển cờ vàng (`freshness.warn`) | ≤0.4s | 🔴 |
| ☐ | `glass-stale` | `glass_stale` (xì hơi, mất bọt) | ≤0.8s | 🔴 |
| ☐ | `glass-clink` | cụng ly (dùng trong `customer-cheers` hoặc riêng) | ≤0.8s | 🔴 |
| ☐ | `glass-collect` | dọn bàn, gom cốc bẩn | ≤0.6s | 🟠 |
| ☐ | `wash` | bồn rửa chạy (1 slot) | 2s | 🔴 |
| ☐ | `glass-empty-rack` | hết cốc sạch (nghẽn) | ≤0.6s | 🟠 |

### B7.7 Bếp & kho
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `kitchen-start` | bắt đầu nấu mồi nóng (xèo) | ≤1s | 🟠 |
| ☐ | `kitchen-ready` | món xong (ding bếp) | ≤0.6s | 🟠 |
| ☐ | `restock` | `restocked` (bao/két hàng đặt xuống) | ≤0.8s | 🔴 |
| ☐ | `stock-empty` | nguyên liệu hết giữa ca | ≤0.6s | 🟠 |

### B7.8 Kinh tế & meta
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `coin-gain` | +xu (mọi nguồn) | ≤0.6s | 🔴 |
| ☐ | `coin-loss` | −xu (phạt, rent, bảo kê) | ≤0.6s | 🔴 |
| ☐ | `rep-gain` | +uy tín | ≤0.5s | 🟠 |
| ☐ | `rep-loss` | −uy tín | ≤0.5s | 🟠 |
| ☐ | `upgrade` | `upgrade_bought` | ≤1s | 🔴 |
| ☐ | `unlock` | mở khoá một lần / mua bàn / thuê mặt bằng | ≤1.2s | 🟠 |
| ☐ | `quest-complete` | `quest_claimed`, điểm danh | ≤1s | 🟠 |
| ☐ | `crate-open` | mở Thùng Hàng / Thùng Cấp Cứu | ≤1.2s | 🟡 |
| ☐ | `chairman-box-open` | mở Két Bia Bí Ẩn (secretBoxBurst) | ≤1.5s | 🟡 |
| ☐ | `league-tier-up` | `league_tier_reached` | ≤2s | 🟡 |
| ☐ | `life-path-up` | `life_path_level_reached` (Đường Lên Trùm) | ≤2s | 🟡 |
| ☐ | `season-end` | Kết Vụ / lên podium Bàn Thờ | ≤3s | 🟡 |

### B7.9 Giờ Vàng, thời tiết, rủi ro, sự kiện
| ✓ | id | Kích hoạt | Độ dài | Ưu tiên |
|:-:|---|---|---|:-:|
| ☐ | `rush-telegraph` | 20s trước Giờ Vàng (pill shake) | ≤0.8s | 🟠 |
| ☐ | `rush-start` | `rush_started` (kẻng/chuông) | ≤1.2s | 🔴 |
| ☐ | `rush-end` | `rush_ended` | ≤1s | 🟠 |
| ☐ | `weather-change` | `weather_rolled` (sting ngắn, kèm layer B7.1) | ≤1s | 🟠 |
| ☐ | `risk-gangster` | `risk_event_spawned: gangster` | ≤1.5s | 🟠 |
| ☐ | `risk-inspection` | kiểm tra ATTP/trật tự bắt đầu (còi) | ≤1.2s | 🟠 |
| ☐ | `quiz-correct` / `quiz-wrong` | trả lời câu hỏi kiểm tra | ≤0.6s ×2 | 🟠 |
| ☐ | `risk-patrol` | trật tự đô thị (loa dẹp vỉa hè) | ≤1.5s | 🟡 |
| ☐ | `risk-fight` | đánh nhau (đổ bàn, vỡ cốc) | ≤1.5s | 🟡 |
| ☐ | `risk-theft-report` | báo trộm offline khi mở game | ≤1.2s | 🟡 |
| ☐ | `dog-bark` / `dog-attack` / `dog-captured` | chó canh quán 3 trạng thái | ≤1s ×3 | 🟡 |
| ☐ | `football-goal` | bàn thắng trong trận WC (không dùng nhạc/anthem thật) | ≤2s | 🟡 |
| ☐ | `donation-thanks` | Mời Bia Hơi thành công | ≤1.5s | 🟡 |

### B7.10 Đầu ra & QA (bắt buộc)
- **Thư mục theo loại (chủ dự án 08/09 — để thay từng nhóm về sau không đụng nhóm khác):**
  ```
  assets/audio/
    ambient/<theme>/   B7.1 nhạc nền + loop thời tiết/rush  (theme mặc định: `default`; thêm theme mới = thêm thư mục, chọn bằng config `audio.ambientTheme` tier C)
    ui/                B7.2
    shift/             B7.3
    customer/          B7.4
    serve/             B7.5
    beer/              B7.6
    kitchen/           B7.7
    economy/           B7.8
    events/            B7.9 (rush, weather sting, risk, football, donation)
  ```
  Code **không** ghi đường dẫn cứng: phát theo `event id` → tra `assets/manifest.json` → path. Đổi/thay file, thêm theme = sửa file + manifest, không sửa code.
- **Format:** mỗi file xuất **`.ogg` (Vorbis) + `.m4a` (AAC) fallback cho Safari/iOS**, 44.1 kHz; SFX mono, ambient stereo. Tên file = `<id>.{ogg,m4a}` trong thư mục nhóm ở trên.
- **Loudness:** ambient ≈ −18 LUFS, SFX ≈ −14 LUFS, true-peak ≤ −1 dBTP; one-shot có fade-out sạch, không click; loop phải seamless (không nghe được mối nối).
- **Nội dung:** không lời nói hiểu được (chỉ nonverbal), không giai điệu/anthem/jingle có bản quyền, không tiếng thương hiệu thật; phong cách **nhẹ, chill, vỉa hè 2000s**, không "casino"/không futuristic.
- **Manifest:** mỗi file 1 entry trong `assets/manifest.json` với `type: "audio"`, `group` = tên thư mục (ambient/ui/…), `theme` (chỉ ambient), `usage` = tên sự kiện kích hoạt ở bảng trên, `loop: true|false`, `license_note` (nguồn/giấy phép/công cụ tạo).
- **Nguồn:** project/preset/prompt để tái tạo lưu ở `assets/_raw/audio/<group>/`, cùng cấu trúc thư mục.
- **QA trước khi báo xong:** nghe 5 file cùng nhóm liên tiếp không lệch âm lượng cảm nhận; `pour-beer` cắt giữa chừng không click; loop chạy 3 vòng không nghe mối nối; toàn bộ id trong bảng có mặt trên đĩa và trong manifest. Dev phía kia chịu trách nhiệm gộp SFX trùng trong 100 ms và toggle 🔇 (09-SPEC §7).

---

## B8. 🚫 KHÔNG gen bằng ImageGen — phải code-native

> Đây là **dữ liệu/UI động**. Gen mockup để tham khảo bố cục thì được, nhưng **không import ảnh mockup vào game**. Danh sách đầy đủ ở §11.3.

`active-hud-topbar` `bottom-action-bar` `glass-rail` `toast-stack` `kitchen-slot` `upgrade-lock-reason` `restock-row` `restock-stock-meter` `closing-ledger-row` `shift-summary-chart` `rental-screen` `lease-timer` `break-even-hint` `life-path-progress-bar` `life-path-reward-ladder` `gate-tooltip` `inspection-quiz-card` `referral-screen` `badge-inventory-card` `vip-table-lock-panel` `quest-progress-ring` `reward-claim-button` `ai-quota-pill` `ai-suggestion-card` `language-select-screen` `login-prompt` `guest-progress-claim` `account-conflict-screen` `leaderboard-lock-prompt` `payment-lock-prompt` `session-gate-panel` `session-pass-product-card` `checkout-screen` `donation-gift-picker` `lottery-result-screen` `lottery-disabled-legal-gate` `wc-match-card` `wc-broadcast-notification` `season-shop-card` `team-theme-card` `connection-status-pill` `connection-status` `server-sync-error` `captcha-panel` `leaderboard-season-header` `leaderboard-season-end-banner` `leaderboard-my-rank` `leaderboard-tab-league` `street-card-bg` `street-location-filter` + QR thật + tỉ số TV

---

# Phụ lục

## P1. Đối chiếu nguồn

| Nội dung | Nguồn sự thật |
|----------|---------------|
| Danh sách asset, naming convention, phase | `docs/asset-list-designer.md` v0.7 |
| Level, stats, giá ×k, gate, unlock | `docs/item-list-upgrade-levels.md` v1.4 |
| Prompt, global lock, native crop, QA | `docs/asset-generation-prompts.md` |
| Palette hex, font, spacing | `docs/design-tokens.md` v1.0 |
| Style anchor thật | `assets/glass-half.png` |
| Post-process | `scripts/asset_postprocess.py` |

Khi 4 doc trên đổi → cập nhật file này. **Không sửa số liệu ở đây rồi để doc nguồn lệch.**

## P2. Gap — đã đóng 08/09 (giữ để truy vết)

| # | Gap | Chốt |
|:-:|-----|------|
| 1 | Location 10 (item-list) vs 9 (F14) | **9** theo `economy.tbh.json` `locations.list`; §A13 viết lại, id file theo id JSON; item-list §14 đồng bộ |
| 2 | Referral badge IDs | `badge-ket-noi` / `badge-ban-be` / `badge-dong-hanh` (F16 §4 cập nhật) |
| 3 | Table state 9 vs 5 | 9 + alias legacy (đã chốt trước) |
| 4 | Size 128 chỉ cho icon/item | native footprint §2 (đã chốt trước) |
| 5 | Rare glass | 2 file: identity + `-dirty`; state khác dùng cốc thường |
| 6 | `glass-washing` 128 vs 160×144 | giữ **128×128**, đổi spec |
| 7 | `table-plastic-{blue,red,yellow}` legacy | **bỏ** — file đã xoá khỏi working tree; không gen lại; bàn/ghế theo §A1–A2 |
| 8 | Bếp 5 cấp vs 08 §8.5 4 cấp | **4 cấp** (bỏ `kitchen-lv5`); brief A nhóm 5 sửa số |

## P3. Trạng thái quét `assets/` (2026-09-08)

**Đã có, khớp convention (8):** `glass-clean` `glass-full` `glass-half` `glass-stale` `glass-flat` `glass-dirty` `glass-washing` `menu-beer`
**Legacy (đã bỏ 08/09, không còn trong working tree):** `table-plastic-blue` `table-plastic-red` `table-plastic-yellow`

Cập nhật lại bằng: `ls assets/*.png`

---

## Changelog

| Ver | Thay đổi |
|-----|----------|
| v1.0 | File đầu. Gộp `asset-list-designer.md` v0.7 + `item-list-upgrade-levels.md` v1.4 + `asset-generation-prompts.md` + quét `assets/`. Phần A: 14 family có level/upgrade, mô tả "đổi gì nhìn thấy được" cho từng cấp + prompt ghép sẵn. Phần B: 8 nhóm checklist gọn. Phụ lục: đối chiếu nguồn, 7 gap còn treo, trạng thái quét. |
| v1.2 | B7.10: audio xếp **thư mục theo nhóm** (`assets/audio/{ambient/<theme>,ui,shift,customer,serve,beer,kitchen,economy,events}/`), ambient có theme chọn bằng config `audio.ambientTheme`; code phát theo event id → manifest, không hardcode path (chủ dự án 08/09). |
| v1.1 | **B7 Audio mở rộng 11 → ~60 file** (chủ dự án 08/09): phủ mọi action/domain event (UI, ca, khách, 4 kết cục serve, bia/cốc, bếp/kho, kinh tế/meta, Giờ Vàng/thời tiết/rủi ro/sự kiện), chia 9 nhóm + đầu ra/QA (ogg+m4a, LUFS, manifest `usage`=event, license). Chỉ định input/output, cách tạo do designer tự quyết. |
| v1.3 | Đóng 8 gap §P2 (9 mặt bằng theo JSON, badge id, rare glass 2 file, glass-washing 128, bỏ table-plastic legacy, bếp 4 cấp); §A13/§A7/§A8 viết lại; nhãn Phase → mốc M. |
| v1.4 | B1: 14 → 12 icon — bỏ `mat-onion`, `mat-ice` theo chốt item-list v1.7 (08/09). |
| v1.5 | Chơi free hết (08/09): bỏ `icon-session-pass`; nhóm B3 "Thanh toán & session" → "Donate" 3 icon. |

| 2026-09-08 build | Initial core audio: 32 original procedural clips in assets/audio, Ogg + AAC with sources/presets; manifest status draft, listening QA pending. No production checklist boxes marked done. |
| 2026-09-09 build | Added three original dog-idle-lv1/2/3 imagegen drafts with native alpha and same-family identity, manifest and prompt provenance. No production boxes marked done. A9 art-table material names are historical: purchase code uses economy.tbh.json dog.levels (lac/nem) and scaled coinBase, never the old tea-game costs. |
| 2026-09-09 build | Added original native-alpha phone and qr-payment drafts, keypad/paper era styling, manifest and exact prompts. Business unlocks render these on the yard; no real payment QR or production approval is implied. |

| 2026-09-09 build | Original native-alpha customer-shipper draft connected to phone order/sheet, exact prompt in reference/assets-owner-2026-09-08/shipper-prompt.md. Existing paired order/fail/early-serve SFX reused for arrival/miss/handoff. Manifest122 entries,32 audio pairs,30 sprite placeholders and84 draft files; no production approval boxes changed. |

| 2026-09-10 build | Table Lv2–Lv4 empty-state imagegen drafts replace three runtime placeholders. Other states use runtime composition. Native-size exports and 128/64/32 contact sheet recorded; final family art approval pending (🟡). Four Blender source renders + studio retained and archived in manifest; Blender generation paused by owner. |

| 2026-09-10 keg batch | Four standalone imagegen idle sprites replace keg-lv2–5 placeholders; source/prompt/hash receipt in reference/assets-owner-2026-09-08/keg-upgrades-imagegen.json. Existing exporter reused with explicit crop/materials; native alpha retained, level3 chroma-key handles enclosed gaps. 128/64/32 sheet inspected; draft family, final art approval remains pending. No engine/economy changes. |


## Owner release decision — 2026-09-11 (Steer10/12)

**owner waiver 2026-09-11: draft assets accepted for release.** A generated asset that passes technical checks (required transparency, sprite dimensions/anchor, recorded checksum and check:assets) can ship as `draft`; no approval/polish pass or taste rerolls. Event id → manifest → path and imagegen source provenance remain.

Steer12 further narrows this build to playable-v0: existing drafts and placeholders are acceptable when their gameplay fallback renders correctly. Generate only visibly missing/broken assets on the happy path; the ~530 inventory target is deferred. M6/M7/M8-only assets stay deferred. Missing/empty files remain defects; a manifest placeholder with a working deliberate fallback is not a missing-file claim.

| 2026-09-11 Steer10/12 | owner waiver 2026-09-11: draft assets accepted for release; playable-v0 accepts existing working placeholders, no full inventory/polish gate. |
