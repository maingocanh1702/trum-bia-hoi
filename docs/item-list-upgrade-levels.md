# 🍺 ITEM LIST — Trùm Bia Hơi — Danh mục vật phẩm & nâng cấp theo Level (v1.4)

> **Mục đích:** Liệt kê đầy đủ mọi item trong game, tổ chức theo **level nâng cấp**, ghi rõ chi phí (xu ×k=2.5), stats từng cấp, visual progression, và gate mở khoá. Dùng cho designer (vẽ sprite theo level), developer (implement upgrade system), và economy tuning.
> **Nguồn:** GDD v1.5 (§2-§17), `economy-spec-from-bundle.md` (§9), `00-TONG-HOP-trumviahe.md`.
> **Quy ước giá:** Cột "Giá gốc" = giá trumviahe. Cột "×k" = giá bia hơi (×2.5). **Giá gốc lấy từ bundle**, giá ×k là đề xuất.

---

## 0. Quy ước asset generation

> Source of truth cho prompt AI, size/export, palette, batch rule, QA, customer visual skins và feature UI components nằm ở `docs/asset-list-designer.md` v0.7. File này chỉ bổ sung progression/stats để prompt từng level không bị chung chung.

Khi gen bằng ChatGPT, dùng rule:
- **Icon/menu/material/HUD:** xuất `128x128 PNG transparent`, không chữ, không emoji, không nền/card.
- **Sprite gameplay:** xuất `128x128 PNG base tile`, giữ cùng camera/scale giữa các level.
- **Level progression:** Lv1 phải đơn sơ, ít chi tiết; Lv3 rõ bán chuyên; Lv5 công nghiệp/cao cấp. Không đổi góc nhìn giữa các level.
- **State progression:** `empty`, `has_customer`, `needs_serve`, `overdue`, `enjoying` dùng cùng sprite nền, chỉ thay overlay/cue rõ ràng.
- **Import naming:** dùng đúng asset name trong `docs/asset-list-designer.md`; không dùng tên tiếng Việt làm filename.

---

## 1. 🪑 BÀN — 4 cấp (đơn vị chính — GDD §5)

> Bàn = container cho nhóm khách. Mỗi cấp đổi sprite + tăng sức chứa.
> **Visual progression:** nhựa nhỏ → inox vuông → inox dài → VIP khăn trải + đèn.
> **Gate bàn VIP = free progression** (uy tín + huy hiệu Kết Nối, KHÔNG donation).

| Cấp | Tên | Sức chứa | Giá gốc (xu) | Giá ×k (xu) | Gate | Visual | Phase |
|:---:|-----|:--------:|:------------:|:-----------:|------|--------|:-----:|
| Lv1 | **Bàn con** (khởi đầu) | 2 | có sẵn | có sẵn | — | Bàn nhựa thấp, ghế nhựa là asset riêng đặt quanh bàn | P0 |
| Lv2 | **Bàn vuông** | 4 | ~700 | ~1,750 | — | Bàn inox vuông, 4 ghế | P1 |
| Lv3 | **Bàn dài** | 6 | ~2,500 | ~6,250 | — | Bàn inox dài, 6 ghế | P2 |
| Lv4 | **Bàn VIP / kê dài** | 8-10 | ~17,500 | ~43,750 | Huy hiệu Kết Nối + uy tín 3k-40k | Có khăn trải, đèn bàn, ghế tựa | P3 |

### Ghế — theo bàn (mua thêm từng chiếc)

> Gốc trumviahe: mua từng ghế nhựa, giá tăng dần. Bia hơi: ghế gắn vào bàn → mua bàn = có ghế.

| Ghế # | Giá gốc (xu) | Giá ×k (xu) | Ghi chú |
|:-----:|:------------:|:-----------:|---------|
| 4 (có sẵn 3) | 200 | 500 | Mua thêm ghế đầu tiên |
| 5 | 500 | 1,250 | |
| 6 | 1,000 | 2,500 | |
| 7 | 1,500 | 3,750 | |
| 8 | 2,500 | 6,250 | |
| 9 | 5,000 | 12,500 | |
| 10 | 10,000 | 25,000 | Max ghế nhựa |

### Ghế tựa (upgrade ghế nhựa → cho khách gọi 2 món)

> Nâng từng ghế nhựa lên ghế tựa. **Gate:** đủ 9 ghế nhựa + huy hiệu Kết Nối.
> **Xu tăng tuyến tính, uy tín tăng lồi** → uy tín là cổng thật cuối game.

| Lần nâng (t) | Giá xu gốc | Giá xu ×k | Uy tín cần | Hiệu ứng |
|:---:|:---:|:---:|:---:|---|
| 0 | 100,000 | 250,000 | 3,000 ⭐ | Ghế #1 → 2 món |
| 1 | 150,000 | 375,000 | 4,500 ⭐ | Ghế #2 → 2 món |
| 2 | 200,000 | 500,000 | 6,500 ⭐ | |
| 3 | 250,000 | 625,000 | 9,000 ⭐ | |
| 4 | 300,000 | 750,000 | 12,000 ⭐ | |
| 5 | 350,000 | 875,000 | 16,000 ⭐ | |
| 6 | 400,000 | 1,000,000 | 22,000 ⭐ | |
| 7 | 450,000 | 1,125,000 | 30,000 ⭐ | |
| 8 | 500,000 | 1,250,000 | 40,000 ⭐ | Ghế #9 (max) |
| **Tổng** | **2,700,000** | **6,750,000** | **143,000 ⭐** | |

### States cần vẽ cho BÀN (mỗi cấp)

| State | Visual cue | Khi nào |
|-------|-----------|---------|
| `empty` | Bàn trống, ghế rời | Không có khách |
| `has_customer` | Nhóm ngồi, đĩa/cốc trên bàn | Có order |
| `needs_serve` | Viền vàng highlight | Đơn sẵn sàng |
| `overdue` | Viền đỏ nhấp nháy | Patience < 30% |
| `enjoying` | Cụng ly animation, vui vẻ | Đang nhậu |

**Subtotal bàn: 4 cấp × 5 states = 20 sprites**

---

## 2. 🍺 BOM BIA + VÒI RÓT — 5 cấp (GDD §4 — thay Ấm tích)

> Rót bia: batch size + tốc độ. **Vòi = pipeline auto + progress bar.**
> Visual: thô sơ → bom to hơn → nhiều vòi → hệ thống áp suất → công nghiệp.

| Cấp | Tên | Giá gốc | Giá ×k | Storage | Batch | Brew/Pour time | Visual |
|:---:|-----|:-------:|:------:|:-------:|:-----:|:--------------:|--------|
| Lv1 | **Bom nhựa + vòi tay** | có sẵn | có sẵn | 3 cốc | 1 | ~15s/cốc | Bom nhựa xanh, vòi nhỏ |
| Lv2 | **Bom inox nhỏ** | 3,000 | 7,500 | 5 cốc | 2 | ~13s | Bom inox, vòi rót nhanh hơn |
| Lv3 | **Bom inox lớn** | 12,000 | 30,000 | 8 cốc | 3 | ~11s | Bom to, 2 vòi |
| Lv4 | **Hệ thống áp suất** | 50,000 | 125,000 | 18 cốc | 6 | ~8s | Tower beer, áp suất CO2 |
| Lv5 | **Trạm rót công nghiệp** | 200,000 | 500,000 | 40 cốc | 12 | ~6s | Multi-tower, tự động |

**Subtotal: 5 sprites (mỗi cấp 1 sprite + trạng thái hoạt động/idle)**

---

## 3. 🪣 BỒN RỬA CỐC — 5 cấp (GDD §4 — thay Bộ rửa ly)

> Vòng đời cốc: clean → in_use → dirty → washing → clean. **Bottleneck chính**.

| Cấp | Tên | Giá gốc | Giá ×k | Thời gian rửa | Slots song song | Visual |
|:---:|-----|:-------:|:------:|:-------------:|:-------:|--------|
| Lv1 | **Chậu nhôm** | có sẵn | có sẵn | 7s | 1 | Chậu nhôm nhỏ, rửa tay |
| Lv2 | **Chậu đôi** | 2,500 | 6,250 | 5s | 1 | Chậu inox đôi |
| Lv3 | **Bồn rửa inox** | 10,000 | 25,000 | 4s | 2 | Bồn rửa 2 ngăn |
| Lv4 | **Máy rửa bán tự động** | 40,000 | 100,000 | 2.5s | 3 | Máy rửa mini |
| Lv5 | **Máy rửa công nghiệp** | 150,000 | 375,000 | 1.5s | 5 | Máy rửa lớn, tự động |

**Subtotal: 5 sprites**

---

## 4. ❄️ HẦM/TỦ GIỮ LẠNH — 5 cấp (GDD §4+§6 — thay Thùng đá)

> Giữ bia lạnh, chống mất hơi. **Cấp 5 = freshness vĩnh viễn** (bia không bao giờ hết hơi).

| Cấp | Tên | Giá gốc | Giá ×k | Freshness cốc | Freshness bom | Visual |
|:---:|-----|:-------:|:------:|:-------------:|:-------------:|--------|
| Lv1 | **Thùng xốp + đá** | có sẵn | có sẵn | 12s | ~4 phút | Thùng xốp trắng |
| Lv2 | **Thùng inox + đá** | 2,000 | 5,000 | 20s | ~6 phút | Thùng inox, nắp |
| Lv3 | **Tủ mát mini** | 8,000 | 20,000 | 35s | ~9 phút | Tủ mát nhỏ |
| Lv4 | **Tủ lạnh bàn** | 30,000 | 75,000 | 60s | ~15 phút | Tủ lạnh ngang |
| Lv5 | **Hầm lạnh** | 100,000 | 250,000 | **∞** (không mất hơi) | ∞ | Hầm lạnh công nghiệp |

**Subtotal: 5 sprites**

---

## 5. 📦 QUẦY/KHO — 5 cấp (GDD §4 — sức chứa nguyên liệu)

> Quầy Lv3 = gate mở biển hiệu.

| Cấp | Tên | Giá gốc | Giá ×k | Sức chứa NL | Visual |
|:---:|-----|:-------:|:------:|:----------:|--------|
| Lv1 | **Bàn bày** | có sẵn | có sẵn | 15 | Bàn gỗ nhỏ, vài hộp |
| Lv2 | **Kệ nhôm** | 1,000 | 2,500 | 25 | Kệ nhôm 2 tầng |
| Lv3 | **Tủ kệ inox** | 5,000 | 12,500 | 45 | Tủ inox 3 tầng **(gate biển hiệu)** |
| Lv4 | **Quầy bar mini** | 20,000 | 50,000 | 80 | Quầy bar gỗ + kệ |
| Lv5 | **Quầy bar cao cấp** | 80,000 | 200,000 | 150 | Quầy bar đầy đủ, tủ kính |

**Subtotal: 5 sprites**

---

## 6. 🍳 BẾP — 5 cấp (GDD §4 — MỚI, mở mồi nóng)

> Bếp mở thêm 3 món nóng (đậu tẩm hành, tóp mỡ, lòng xào dưa). Giảm prep time.

| Cấp | Tên | Giá ×k (đề xuất) | Mở món | Prep time | Visual |
|:---:|-----|:-----------------:|--------|:---------:|--------|
| Lv1 | **Bếp than tổ ong** | 5,000 | Đậu tẩm hành | ~8s | Bếp than, chảo gang |
| Lv2 | **Bếp gas nhỏ** | 15,000 | + Tóp mỡ Triều Khúc | ~7s | Bếp gas 1 lò |
| Lv3 | **Bếp gas đôi** | 40,000 | + **Lòng xào dưa** | ~5s | Bếp gas 2 lò |
| Lv4 | **Bếp công nghiệp** | 100,000 | — (giảm prep) | ~3s | Bếp inox lớn, quạt hút |
| Lv5 | **Bếp master** | 250,000 | — (giảm prep) | ~2s | Bếp pro, nhiều nồi/chảo |

**Subtotal: 5 sprites**

---

## 7. 🍺 CỐC BIA — 7 trạng thái (GDD §4+§6)

> **Mua tối đa 10 cốc** (buy-cap). Kho chứa tối đa 20 (vượt nhờ quà Chủ tịch +1/lần).
> Giá mua: **~500 xu×k** mỗi cốc (GDD §4 note).

| # | Trạng thái | Asset name | Visual | Ghi chú |
|:---:|-----------|-----------|--------|---------|
| 1 | Sạch | `glass-clean` | Cốc bia hơi Hà Nội không quai, thân cao vừa/hơi thuôn, thủy tinh xanh dày có gân dọc, rỗng/sáng | Sẵn dùng |
| 2 | Đầy bọt | `glass-full` | Cùng cốc không quai, bia vàng + bọt trắng tràn nhẹ | Vừa rót xong |
| 3 | Bọt xẹp | `glass-half` | Cùng cốc không quai, bia còn khoảng nửa/2 phần 3, bọt ít hơn | Freshness đang giảm |
| 4 | Cờ vàng ⚠️ | `glass-stale` | Cùng cốc không quai, bia nhạt + cờ vàng | Sắp mất hơi (~75% time) |
| 5 | Hết hơi 💀 | `glass-flat` | Cùng cốc không quai, bia xỉn màu, không bọt | Quá hạn freshness |
| 6 | Bẩn | `glass-dirty` | Cùng cốc không quai, vệt dơ/mờ đục trên thủy tinh xanh | Cần rửa |
| 7 | Đang rửa | `glass-washing` | Cùng cốc không quai trong bồn rửa, bong bóng xà phòng | Trong bồn rửa |

**Subtotal: 7 sprites**

---

## 8. 🍽️ MENU — 6 món (GDD §2)

### Món bán

| # | Món | Giá (xu) | Vốn sỉ | Margin | Cần cốc | Prep | Mở khoá | Asset name | Visual prompt focus |
|:---:|-----|:-------:|:------:|:------:|:-------:|:----:|---------|------------|---------------------|
| 1 | **Bia hơi (cốc)** | 50 | 10 | 80% | ✅ | ~3s rót | Từ đầu | `menu-beer` | Cốc bia hơi Hà Nội không quai, thân cao vừa/hơi thuôn, thủy tinh xanh dày có gân, bia vàng đầy bọt trắng tràn nhẹ |
| 2 | **Lạc (đậu phộng)** | 75 | 26 | 65% | ❌ | Tức thì | Từ đầu | `menu-peanut` | Đĩa lạc rang vàng nâu, vài hạt văng tự nhiên |
| 3 | **Nem chua** | 150 | 60 | 60% | ❌ | Tức thì | Từ đầu | `menu-nemchua` | Nem chua cuộn lá chuối, cắt lát thấy màu hồng, có lá xanh |
| 4 | **Đậu tẩm hành** | 100 | 45 | 55% | ❌ | ~8s | Bếp Lv1 | `menu-friedbean` | Bát/đĩa đậu chiên vàng, hành phi xanh/vàng phía trên |
| 5 | **Tóp mỡ Triều Khúc** | 165 | 82 | 50% | ❌ | ~10s | Bếp Lv2 | `menu-crackle` | Đĩa tóp mỡ vàng giòn, miếng vuông nhỏ, bóng nhẹ |
| 6 | **Lòng xào dưa** | 280 | 155 | 45% | ❌ | ~15s | Bếp Lv3 | `menu-intestine` | Đĩa lòng xào dưa chua, miếng lòng sáng, dưa vàng xanh, hơi nóng |

### Nguyên liệu (kho)

| # | NL | Giá lẻ | Giá sỉ (+10) | CK sỉ | Asset name | Visual prompt focus |
|:---:|-----|:------:|:-----------:|:-----:|------------|---------------------|
| 1 | Nguyên liệu bia | 10 | 80 | -20% | `mat-beer-barrel` | Thùng/bom nguyên liệu bia nhập sỉ, không giống cốc bia bán |
| 2 | Lạc sống | 26 | 210 | -19% | `mat-peanut-raw` | Bao lạc sống hoặc túi lạc chưa rang, màu mộc |
| 3 | Nem chua gói | 60 | 480 | -20% | `mat-nemchua-pack` | Gói nem bó lá chuối/bao hàng, cảm giác hàng nhập kho |
| 4 | Đậu sống | 45 | 360 | -20% | `mat-bean-raw` | Bao đậu sống/khối đậu trắng chưa chiên |
| 5 | Mỡ lợn | 82 | 660 | -20% | `mat-pork-fat` | Khối mỡ lợn trắng hồng trong khay nhỏ, chưa chế biến |
| 6 | Lòng + dưa chua | 155 | 1,240 | -20% | `mat-intestine-raw` | Xô/hũ nguyên liệu có lòng sống và dưa chua, phân biệt với món đã xào |
| 7 | Hành phi | ~20 | ~160 | -20% | `mat-onion` | Lọ hành phi/bao hành khô vàng, dùng như gia vị |
| 8 | Đá lạnh | ~5 | ~40 | -20% | `mat-ice` | Bịch đá viên trong suốt xanh nhạt, dùng giữ lạnh |

**Subtotal: 6 icons món + 8 icons NL = 14 icons**

---

## 9. 🐕 CHÓ — 3 cấp (GDD §13)

> Mua chó → bảo hiểm gangster + trộm offline. Cho ăn để nâng cấp.

| Cấp | Tên | Chi phí mua/nâng | HP | ATK | Khả năng | Visual |
|:---:|-----|:----------------:|:--:|:---:|---------|--------|
| Lv1 | **Chó con** | 2,000 xu + 20 đá lạnh | 1 | 1 | Chặn trộm nhỏ | Chó nhỏ, idle |
| Lv2 | **Chó trưởng thành** | 8,000 xu + 20 kẹo | 2 | 2 | Đánh gangster thường | Chó to hơn, cơ bắp |
| Lv3 | **Chó chiến** | 25,000 xu + 40 kẹo | 3 | 3 | One-shot côn đồ, thắng sạch | Chó to, dữ, cổ đeo |

> **Thua gangster → chó bị bắt** (`dogCaptured`, mất 1 thời gian).

### States cần vẽ

| State | Asset | Mô tả |
|-------|-------|-------|
| Idle | `dog-idle-lv{1-3}` | Ngồi/nằm canh quán |
| Attack | `dog-attack-lv{1-3}` | Vồ côn đồ (animation 3 frames) |
| Captured | `dog-captured` | Bị bắt (dây xích, buồn) |

**Subtotal: 3 cấp × 2 states + 1 captured = 7 sprites**

---

## 10. 🏪 BIỂN HIỆU — 5 style (economy-spec §7 — đổi customer mix)

> **Gate:** Quầy Lv3 + 20,000 xu lắp lần đầu. Mỗi style có hiệu ứng gameplay.

| # | Style | Giá gốc | Giá ×k | Hiệu ứng | Visual |
|:---:|-------|:-------:|:------:|---------|--------|
| 1 | **Gỗ** (mặc định) | 0 | 0 | VIP spawn ×2 | Biển gỗ mộc, chữ viết tay |
| 2 | **Neon** | 15,000 | 37,500 | VIP ×2, shipper ×1.2 | Biển neon ống thủy tinh kiểu cũ, hơi chập chờn |
| 3 | **Vintage** | 20,000 | 50,000 | VIP ×2, Giờ Vàng ×0.5 | Biển vintage retro |
| 4 | **Thư pháp** | 25,000 | 62,500 | VIP ×2, stubborn ×0.8 | Biển thư pháp Hán Nôm |
| 5 | **Hoàng kim** 🌟 | 30,000 + **5,000⭐** | 75,000 + **12,500⭐** | **VIP ×3** | Biển vàng sang trọng |

**Subtotal: 5 sprites**

---

## 11. 🎨 COSMETIC — Trang trí quán (Phase 3+)

> Cosmetic-only: KHÔNG ảnh hưởng gameplay. Hiển thị trên thẻ "Dạo Phố".
> Mua bằng **xu in-game** HOẶC **donation** (tiền thật → chọn quà cosmetic).

### Lồng đèn — 4 style

| # | Style | Giá ×k (đề xuất) | Visual |
|:---:|-------|:-----------------:|--------|
| 1 | Đèn Nhật (izakaya) | 5,000 | Đèn giấy Nhật đỏ |
| 2 | Đèn hoa sen | 8,000 | Đèn hình hoa sen |
| 3 | Đèn lồng đỏ | 6,000 | Đèn lồng TQ truyền thống |
| 4 | Đèn cổ điển | 10,000 | Đèn dầu/vintage |

### Cây cảnh — 4 style

| # | Style | Giá ×k | Visual |
|:---:|-------|:------:|--------|
| 1 | Trúc | 4,000 | Bụi trúc xanh |
| 2 | Bonsai | 12,000 | Cây bonsai nhỏ |
| 3 | Lan | 8,000 | Chậu lan |
| 4 | Sen đá | 3,000 | Chậu sen đá |

### Theme đội tuyển WC — 48 palettes (Phase 4)

| # | Item | Giá ×k | Mô tả |
|:---:|------|:------:|-------|
| 1 | Theme đội (mỗi đội) | ~20,000 | Re-hue cờ/đèn/biển sang bảng màu đội |
| 2 | Combo "Cờ Vụ Bia" (6 đội) | ~90,000 | Bundle −25% |

> Dùng **1 bộ mask grayscale chung** + palette `{primary, secondary, accent}` per đội → re-hue runtime.

**Subtotal cosmetic: 8 sprites + 3 mask + 48 palettes**

---

## 12. 📱 MỞ KHOÁ MỘT LẦN (sink)

| # | Item | Giá gốc | Giá ×k | Mở khoá | Tác dụng |
|:---:|------|:-------:|:------:|---------|---------|
| 1 | **Điện thoại cục gạch** | 5,000 | 12,500 | — | Mở người giao đồ xe số, nhận đơn qua điện thoại phím bấm |
| 2 | **Bảng QR giấy dán** | 8,000 | 20,000 | Cần điện thoại + LP2 | Tip +20% (ceil ×1.2); ngoại lệ meta hiện đại, visual là giấy in dán tường/bìa carton |
| 3 | **Biển hiệu (phí lắp)** | 20,000 | 50,000 | Quầy Lv3 | Mở hệ biển hiệu |
| 4 | **Bản quyền phát sóng TV** | ~50,000 ×k | 125,000 | — | Gate Giờ Vàng World Cup (1 Vụ Bia) |
| 5 | **Lịch thi đấu** | ~15,000 ×k | 37,500 | — | HUD lịch trận + cổ vũ ×1.15 (1 mùa) |
| 6 | **Tờ rơi (quảng cáo)** | Kiếm qua nhiệm vụ | — | LP2 | Campaign 90s, khách ×3.6 |

---

## 13. 👥 NHÂN VẬT — 7 loại khách + chủ quán + NPC

### Chủ quán — 3 biến thể thời tiết

| # | Variant | Visual |
|:---:|---------|--------|
| 1 | Thường | Tạp dề, lăng xăng |
| 2 | Nóng | Xắn tay, khăn lau mồ hôi |
| 3 | Lạnh | Áo khoác, tay đút túi |

### Khách hàng — 7 loại

| # | Loại | Weight | Badge | Visual đặc trưng | Biến thể |
|:---:|------|:------:|:-----:|-----------------|:--------:|
| 1 | Dân nhậu thường | 1.0 | — | Áo thun, dép lê | ×3 thời tiết |
| 2 | Khách vội (tan ca) | 0.3 | 🔴 VỘI | Đồ công sở, vội vã | ×3 |
| 3 | **Khách sộp VIP** | 0.1 | 🟡 VIP | Áo sơ mi, kính, vàng bling | ×3 |
| 4 | Chí Phèo (quậy) | 0.03 | 🟤 XỈN | Say, áo rách, mặt đỏ | ×3 |
| 5 | Bàn lai rai (ngồi lỳ) | 0.1 | 🟢 LỲ | Thoải mái, ngả ghế | ×3 |
| 6 | Shipper | timer | 🔵 SHIP | Đồng phục giao hàng | ×3 |
| 7 | Nhóm cổ vũ bóng đá | event | ⚽ CỔ VŨ | Áo đội bóng, cờ, kèn | ×1 |

### Customer visual archetypes

> Gameplay vẫn chỉ dùng 7 loại trên để tính patience/tip/phạt/spawn. Visual variety dùng skin ở `docs/asset-list-designer.md` §2.2.1: runner, cầu lông, pickleball, văn phòng, công nhân, sinh viên, hội chị em, bợm nhậu quen quán, say vui, say gây sự, say ngủ gục, nghỉ hưu, đạp xe, tourist, foodie, football fan/ultra, shipper xe máy. Skin chỉ đổi hình và badge, không tự tạo multiplier mới.

### NPC đặc biệt

| # | NPC | Visual | Phase |
|:---:|-----|--------|:-----:|
| 1 | Chủ tịch giả nghèo (reveal) | Chí Phèo → biến hình → đại gia vest | P2 |
| 2 | Côn đồ #1 (HP=1) | Côn đồ gầy, dao | P3 |
| 3 | Côn đồ #2 (HP=2) | Côn đồ to hơn, xăm | P3 |
| 4 | Côn đồ #3 (HP=3) | Côn đồ trâu, cơ bắp | P3 |
| 5 | Boss côn đồ | Boss xã hội đen | P3+ |
| 6 | Đội trật tự | Quần áo dân phòng | P3 |
| 7 | Bán vé số dạo | NPC đi bàn bán vé | P4 |

---

## 14. 🗺️ MẶT BẰNG — 10 vị trí (GDD §12)

> Multiplier áp lên payment. Rent trả trước 7 ngày + cọc 25%.

| # | Vị trí | Rent/ngày gốc | Rent/ngày ×k | Tiền kỳ (7d) ×k | Cọc 25% ×k | Multiplier | Gate LP |
|:---:|--------|:----------:|:----------:|:-----------:|:-------:|:----------:|:-------:|
| 1 | **Hẻm Nhỏ** | 0 | 0 | 0 | 0 | ×1.00 | — |
| 2 | Công Trường | 770 | 1,925 | 13,475 | 3,369 | ×1.05 | LP1 |
| 3 | Chung Cư Cũ | 1,680 | 4,200 | 29,400 | 7,350 | ×1.10 | LP1 |
| 4 | Cổng Trường | 2,730 | 6,825 | 47,775 | 11,944 | ×1.15 | LP2 |
| 5 | Chợ Đêm | 3,920 | 9,800 | 68,600 | 17,150 | ×1.20 | LP2 |
| 6 | Khu Văn Phòng | 6,720 | 16,800 | 117,600 | 29,400 | ×1.30 | LP3 |
| 7 | Gần Sân Vận Động | — | ~20,000 | ~140,000 | ~35,000 | ×1.40 | LP3+ |
| 8 | Phố Cổ | 11,970 | 29,925 | 209,475 | 52,369 | ×1.45 | LP4 |
| 9 | Ga Metro | 18,480 | 46,200 | 323,400 | 80,850 | ×1.60 | LP5 |
| 10 | Khu Phố Tây | 29,120 | 72,800 | 509,600 | 127,400 | ×1.80 | LP6 |

> **Mỗi mặt bằng = 1 background illustration riêng** (full screen canvas).

**Subtotal: 10 backgrounds**

---

## 15. 🏆 GIẢI NHẬU & ĐƯỜNG LÊN TRÙM — Progression milestones

> **Rename từ gốc:** League → **Giải Nhậu**, Season → **Vụ Bia**, Life Path → **Đường Lên Trùm**. Tên bậc/mốc đổi theo vibe quán bia hơi vỉa hè, không dùng tên kim loại/đá quý generic.

### Giải Nhậu — Vụ Bia (8 bậc)

| Bậc | Tên cũ (gốc) | → **Tên mới** | minSeasonEarned gốc | ×k | Icon |
|:---:|:-------------:|:-------------:|:-------------------:|:---:|:----:|
| 1 | Đồng | **🥤 Cốc Nhựa** | 0 | 0 | 🥤 |
| 2 | Bạc | **🍺 Cốc Thủy Tinh** | 20,000 | 50,000 | 🍺 |
| 3 | Vàng | **🏺 Vại Sành** | 60,000 | 150,000 | 🏺 |
| 4 | Titan | **⚔️ Vại Đồng** | 120,000 | 300,000 | ⚔️ |
| 5 | Bạch Kim | **💎 Bom Bạc** | 180,000 | 450,000 | 💎 |
| 6 | Hồng Ngọc | **🍻 Bom Vàng** | 300,000 | 750,000 | 🍻 |
| 7 | Kim Cương | **👑 Vua Bia** | 500,000 | 1,250,000 | 👑 |
| 8 | Huyền Thoại | **🏆 Trùm Bia Hơi** | 1,000,000 | 2,500,000 | 🏆 |

> **Vibe:** Cốc nhựa vỉa hè → cốc thủy tinh → vại sành truyền thống → vại đồng cổ → bom bia bạc/vàng → Vua Bia → **Trùm Bia Hơi** (đỉnh cao = tên game). Progression từ uống bình dân → đại gia → ông trùm.

### Đường Lên Trùm (8 mốc)

| Mốc | Tên cũ (gốc) | → **Tên mới** | Điều kiện lifetime ×k | Thưởng ×k |
|:---:|:-------------:|:-------------:|:--------------------:|:---------:|
| LP0 | Tập Tành | **Bưng Bê** | 0 | — |
| LP1 | Vào Nghề | **Phụ Quán** | 125k + 4 ghế + chó | 12,500 + thùng hàng nhỏ |
| LP2 | Quen Tay | **Tay Ngang** | 375k + quầy lv3 + điện thoại | 25,000 + mảnh huy hiệu |
| LP3 | Thạo Việc | **Chủ Sạp** | 1,250k + đồ lv3 + QR | 50,000 + thùng hàng vừa |
| LP4 | Rành Nghề | **Chủ Quán** | 3,750k + tờ rơi + peak BK | 125,000 + mảnh + tem trang trí |
| LP5 | Sáng Tạo | **Ông Chủ** | 12,500k + biển hiệu + peak HN | 250,000 + thùng + tem trang trí |
| LP6 | Bậc Thầy | **Đại Gia Bia** | 37,500k + đồ lv5 + peak KC | 625,000 + thùng lớn |
| LP7 | Huyền Thoại | **Trùm Bia Hơi** | 125,000k + 9 ghế + peak HT | 1,250,000 + thùng |

> **Vibe:** Bưng bê → phụ quán → tay ngang chập chững → chủ sạp nhỏ → chủ quán hẳn hoi → ông chủ nhiều mối → đại gia bia → **Trùm Bia Hơi** (= tên game, đỉnh cao sự nghiệp).

### Bảng đổi tên thuật ngữ chung

| Hệ thống | Tên gốc (Trumviahe) | → **Tên Bia Hơi** | Ghi chú |
|----------|:--------------------:|:------------------:|---------|
| Đua hạng | League | **Giải Nhậu** | Đua nhậu, rất vỉa hè |
| Kỳ hạng | Season / Mùa | **Vụ Bia** | "Vụ" = vụ mùa kinh doanh |
| Tiến trình đời | Life Path | **Đường Lên Trùm** | Giữ nguyên — đã hay |
| AI trợ lý | Trà Đấm | **Bia Đấm** | Đã đổi trong GDD |
| Donation | Mời Trà Đá | **Mời Bia Hơi** | Đã đổi |
| Đền Thiêng | Đền Thiêng / Shrine | **Bàn Thờ Ông Địa** | Ông Địa = thần tài quán nhậu VN |
| Chế độ nghỉ | Tĩnh Tâm | **Xả Hơi** | Pun: "hơi" = hơi bia + nghỉ ngơi |
| Buff nghỉ đủ | Well-rested | **Tỉnh Táo** | Nghỉ đủ → phục vụ nhanh |
| Giờ cao điểm | Rush Hour | **Giờ Vàng** | Quen thuộc kinh doanh VN |
| Hộp quà Chủ tịch | Secret Box | **Két Bia Bí Ẩn** | Phù hợp theme |
| Gói cứu trợ | Emergency Pack | **Thùng Cấp Cứu** | Giữ gần gốc |
| Token cosmetic | Cosmetic Token | **Tem Trang Trí** | "Tem" = voucher vỉa hè |
| Mảnh huy hiệu | Badge Shard | **Mảnh Huy Hiệu** | Giữ nguyên |
| Supply crate | Crate | **Thùng Hàng** | Thùng hàng nhập kho |

---

## 16. 📊 TỔNG HỢP

### Đếm item theo category

| Category | Items | Có cấp/level | Tổng sprites cần vẽ |
|----------|:-----:|:---:|:---:|
| Bàn | 4 cấp + 5 states | ✅ | ~20 |
| Ghế | 2 loại (nhựa + tựa) | ✅ | ~4 |
| Bom bia + vòi | 5 cấp | ✅ | ~10 |
| Bồn rửa | 5 cấp | ✅ | ~10 |
| Hầm lạnh | 5 cấp | ✅ | ~10 |
| Quầy/kho | 5 cấp | ✅ | ~10 |
| Bếp | 5 cấp | ✅ | ~10 |
| Cốc bia | 7 states | — | ~7 |
| Chó | 3 cấp × 3 states | ✅ | ~9 |
| Biển hiệu | 5 styles | — | ~5 |
| Cosmetic | 8 + masks | — | ~11 |
| Mở khoá | 6 items | — | ~6 |
| Nhân vật | 7 loại khách × 3 + NPCs | — | ~30+ |
| Mặt bằng | 10 locations | — | ~10 |
| **TỔNG** | | | **~152+ sprites** |

### Đường cong giá nâng cấp (tóm tắt — giá ×k)

| Thiết bị | Lv1→2 | Lv2→3 | Lv3→4 | Lv4→5 | Tổng |
|----------|:-----:|:-----:|:-----:|:-----:|:----:|
| Bom bia | 7,500 | 30,000 | 125,000 | 500,000 | 662,500 |
| Bồn rửa | 6,250 | 25,000 | 100,000 | 375,000 | 506,250 |
| Hầm lạnh | 5,000 | 20,000 | 75,000 | 250,000 | 350,000 |
| Quầy/kho | 2,500 | 12,500 | 50,000 | 200,000 | 265,000 |
| **Subtotal 4 thiết bị** | | | | | **1,783,750** |

### Tổng sink upgrade TOÀN BỘ (×k)

| Category | Tổng xu ×k | % tổng |
|----------|:---------:|:------:|
| 4 thiết bị cơ bản | 1,783,750 | 19% |
| Bếp (5 cấp) | 410,000 | 4% |
| Ghế nhựa (#4→#10, 7 chiếc) | 51,750 | 0.6% |
| **Ghế tựa (9 lần nâng, dual-gate xu+uy tín)** | **6,750,000** | **72%** |
| Chó (3 cấp) | 87,500 | 0.9% |
| Biển hiệu (lắp + 4 styles) | 275,000 | 2.9% |
| Mở khoá (ĐT + QR) | 32,500 | 0.3% |
| **TỔNG ONE-TIME SINK** | **~9,390,500** | **100%** |

> ⚠️ **Ghế tựa = 72% tổng sink** — dual-gate (xu tuyến tính 250k→1.25M + uy tín lồi 3k→40k⭐). Đây là endgame grind chính.

### Thời gian thực để max (tính NET, không phải GROSS)

| Mốc | Tính toán | Thời gian |
|------|----------|:---------:|
| Gross cap/ngày | 500,000 xu×k | — |
| Gross thực tế (veteran 5 ca) | ~362,000 xu×k | — |
| Trừ restocking (~17%) | −62,000 | — |
| Trừ rent (mid-game) | −25,000 | — |
| **NET thực tế/ngày** | **~275,000** | — |
| Max 4 thiết bị | 1,783,750 ÷ 275k | **~6.5 ngày** |
| Max tất cả (trừ ghế tựa) | 2,640,500 ÷ 275k | **~10 ngày** |
| **Max TẤT CẢ (gồm ghế tựa)** | **9,390,500 ÷ 275k** | **~34 ngày (~5 tuần)** |

> Thiết kế đúng: ghế tựa là **sink late-game kéo dài progression 4-5 tuần**. Economy spec xác nhận veteran thường bị **giới hạn bởi số ca (5/ngày), không phải trần tiền** → thu nhập thực tế luôn dưới cap.

---

## Changelog (append-only)

| Ver | Thay đổi |
|-----|----------|
| v1.4 | **Rebrand toàn bộ tên/text:** League → Giải Nhậu (8 bậc: Cốc Nhựa→Trùm Bia Hơi), Season → Vụ Bia, Life Path → Đường Lên Trùm (8 mốc: Bưng Bê→Trùm Bia Hơi). Thêm bảng đổi tên thuật ngữ chung (15 terms). Đổi tên reward: crate → thùng hàng, badge shard → mảnh huy hiệu, cosmetic token → tem trang trí. |
| v1.3 | Cập nhật source-of-truth sang `asset-list-designer.md` v0.6, bao gồm feature UI components/screens sau audit F07-F26. |
| v1.2 | Đồng bộ customer visual archetypes với `asset-list-designer.md` v0.4: 7 gameplay type giữ nguyên logic, skin chỉ tăng visual variety. |
| v1.1 | Thêm quy ước asset generation tham chiếu asset-list v0.2; bổ sung asset name + visual prompt focus cho menu/nguyên liệu; sửa heading mặt bằng từ 9 thành 10 vị trí. |
| v1.0 | Danh sách đầu: 16 categories, ~152+ sprites, pricing ×k=2.5. Nguồn: GDD v1.5 + `economy-spec-from-bundle.md` §9. Bao gồm: bàn 4 cấp, ghế nhựa/tựa, bom bia 5 cấp, bồn rửa 5 cấp, hầm lạnh 5 cấp, quầy 5 cấp, bếp 5 cấp, cốc 7 states, chó 3 cấp, biển hiệu 5 styles, cosmetic 8+masks, mở khoá 6 items, 7 loại khách, 10 mặt bằng, Giải Nhậu 8 bậc, Đường Lên Trùm 8 mốc. |

*Nguồn: `02-GDD-trum-bia-hoi.md` v1.5, `economy-spec-from-bundle.md`, `00-TONG-HOP-trumviahe.md`.*
