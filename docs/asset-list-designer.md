# 🎨 ASSET LIST — Trùm Bia Hơi — Danh sách vẽ cho Designer (v0.7)

> **Mục đích:** Liệt kê **toàn bộ** item, icon, sprite, animation cần vẽ — đếm được, ưu tiên rõ, naming sẵn. Designer đọc file này → biết cần vẽ bao nhiêu thứ, phong cách gì, kích thước nào.
> **Nguồn:** GDD v1.5 (§2–§17), `design-component-catalog-trumviahe.md`, `05-SPEC-design-uiux.md`.
> **Ngày:** 2026-06-11. **Phase 0** dùng placeholder — danh sách này cho **Phase 1+ (art thật)**.

---

## 0. Phong cách tổng quan

| Yếu tố | Chốt |
|---------|------|
| **Art style** | Pixel-art ấm, vỉa hè Việt Nam — bàn inox, ghế nhựa đỏ, bom bia, mồi nhậu Bắc Bộ |
| **Palette chủ đạo** | Vàng bia (amber) · bọt kem · đỏ ghế nhựa · **panel nâu ấm** · nền nắng vàng — hex chốt ở `design-tokens.md` |
| **Font** | Be Vietnam Pro (body) + Chakra Petch (số/nút CTA) |
| **Nền minh hoạ** | Cảnh hẻm phố vẽ tay (khác pixel gameplay) — cho màn chuyển/nghỉ |
| **Biến thể thời tiết** | Mỗi nhân vật có 3 phiên bản: **thường / hot / cold** (đổi trang phục/biểu cảm) |
| **Format** | Source từng file PNG nền trong suốt; spritesheet/.webp là bước pack sau |
| **Kích thước** | Icon/item: 128×128px. Sprite gameplay: 128×128px base tile. Background: theo viewport |

### 0.1 AI generation contract — dùng trực tiếp với ChatGPT

**Mục tiêu:** Mỗi asset phải đọc được ở size nhỏ, cùng góc nhìn, cùng viền, cùng palette. Không dùng emoji làm asset cuối; emoji trong docs chỉ là gợi ý ý nghĩa.

| Hạng mục | Chốt sản xuất |
|---|---|
| **Canvas icon/item** | 128×128 PNG, transparent background, subject centered, 10-14px safe padding |
| **Canvas sprite gameplay** | 128×128 PNG base tile; vật lớn có thể dùng 2×1 hoặc 2×2 tile nhưng vẫn export theo naming riêng |
| **Pixel density** | Pixel-art chunky, đọc tốt ở 32×32; không anti-alias mềm kiểu vector/app icon |
| **Sharpness** | Pixel sắc kiểu nearest-neighbor, cụm màu rõ; không blur/soft-focus, không painterly smudge, không upscale/downsample làm nhòe |
| **Camera** | Icon/item: 3/4 top-down product shot. Bàn/thiết bị: 3/4 top-down isometric-lite. Nhân vật: front 3/4 |
| **Outline** | Viền ngoài 2px màu nâu tím đậm `#3a2730`; chi tiết trong dùng 1px khi cần |
| **Shadow** | Bóng đổ nhỏ, mềm kiểu pixel, màu `#2a182433`, nằm dưới vật, không vẽ nền/card |
| **Palette fixed** | **Bám `docs/design-tokens.md` v1.0** (nguồn sự thật). Bia `#eaa31a`, bia đậm `#c07a12`, bọt `#fff3d2`, ghế đỏ `#de4126`, inox `#c4cecb`, nền nắng `#f1d585`, panel nâu `#3a2a1c`, confirm `#3fa564`, cảnh báo `#f4c23f`, đỏ lỗi `#d23a2a` |
| **Không được có** | Chữ, watermark, emoji, UI frame, nền màu, ảnh chụp, 3D render, quá nhiều chi tiết nhỏ, crop sát mép |

**Global prompt prefix:**

```text
Pixel-art game asset for a warm Vietnamese bia hoi street-stall management game, 2000s street nostalgia, slightly faded not neon. 128x128 transparent PNG, centered subject, 3/4 top-down view, chunky readable silhouette, crisp hard-edged pixel clusters, nearest-neighbor look, 2px dark warm outline (#3a2730), subtle pixel shadow under the object. Palette: warm amber beer #eaa31a, cream foam #fff3d2, red plastic stool #de4126, cool inox metal #c4cecb, aged brown wood #3a2a1c. No text, no emoji, no UI frame, no background, no watermark, no blur, no soft-focus, no painterly smudge, not photorealistic, not vector-flat.
```

**Prompt template từng asset:**

```text
Use the global style. Asset name: {asset_name}. Subject: {subject}. Gameplay meaning: {meaning}. Must include: {must_include}. Must avoid: {must_avoid}. Variant/state note: {variant_or_state}. Keep the same camera, scale, outline thickness, and padding as the rest of the set.
```

**Batch rule:** Gen theo batch 6-10 icon cùng loại. Sau mỗi batch, chọn 1 style winner rồi dùng winner đó làm reference cho batch sau. Không trộn icon HUD với sprite gameplay trong cùng batch.

**Production export rule:** File ChatGPT gốc thường là canvas lớn có halo/nền bán trong suốt; chỉ dùng làm source/reference. Trước khi import game phải crop theo alpha thật, bỏ halo/nền rộng, resize nearest-neighbor về `128x128`, căn giữa với 10-14px padding, rồi đặt filename đúng asset name.

**QA pass trước khi import game:**

| Check | Pass nếu |
|---|---|
| Readability | Nhìn ở 32×32 vẫn nhận ra vật |
| Sharpness | Viền và chi tiết chính sắc, không bị nhòe do blur/downsample |
| Silhouette | Không nhầm giữa món bán và nguyên liệu kho |
| Consistency | Cùng camera/padding/outline với batch trước |
| State clarity | State như `dirty`, `stale`, `overdue` khác rõ mà không cần chữ |
| Export | Đúng filename, `128x128` PNG transparent, không nền/card/halo rộng |

### 0.2 Prompt modifiers theo nhóm

| Nhóm asset | Modifier thêm vào prompt |
|---|---|
| `menu-*` | Đặt món trên đĩa/bát nhỏ kiểu quán nhậu vỉa hè, focus vào món đã chế biến, nhìn ngon và sạch |
| `mat-*` | Hiển thị dạng nguyên liệu/kho: bao, thùng, gói, xô, lọ; khác rõ với món đã nấu |
| `icon-*` | Biểu tượng HUD cực đơn giản, high contrast, ít chi tiết, đọc tốt ở 24×24 |
| `badge-*` | Badge nhỏ không chữ, dùng hình/ màu nhận diện; có thể dùng sao, tia tốc độ, ly say, túi ship |
| `table-*` | Giữ cùng góc và footprint giữa các level/state; chỉ thay số ghế, chất liệu, overlay state |
| `keg/washer/fridge/counter/kitchen` | Level progression rõ: Lv1 thô sơ, Lv3 bán chuyên, Lv5 công nghiệp; cùng góc nhìn và scale |
| `customer-*` | Cùng body scale; khác bằng trang phục, dáng đứng/ngồi, phụ kiện; biến thể hot/cold không đổi identity |
| `customer-skin-*` | Skin visual cho cùng gameplay type; thay trang phục/phụ kiện, không tự tạo logic spawn mới |
| `bg-*` | Không pixel gameplay; vẽ tay ấm, nhiều không khí, dùng cho splash/background |

---

### 0.3 Chuẩn thời đại — vibe 2000s (ÁP CHO MỌI ASSET) ✅

> **Nguyên tắc lõi:** mọi vật thể "có thật trong quán" (diegetic) phải mang **hình thái Việt Nam thập niên 2000** — đồ nhôm/inox cũ, nhựa, gỗ mộc, sơn tay, hơi sờn cũ, ấm áp hoài niệm. Mọi prompt **phải append `{era_modifier}`** ở §0.3.D. Đây là lớp dùng chung — KHÔNG cần lặp ở từng dòng asset; khi một asset có hình thái nhạy thời đại thì tra bảng §0.3.B.
>
> **Ngoại lệ — icon meta/hệ thống thuần (`icon-payment-*`, `icon-session-pass`, `icon-google-login`, `icon-ai-*`, `connection-status`, leaderboard…):** giữ **rõ chức năng** trước, không ép hình thái cổ; nhưng vẫn dùng palette + pixel-art của bộ này, và **nếu khoác được lớp vỏ hoài niệm thì ưu tiên** (vd trợ lý AI "Bia Đấm" tạo hình **đài/loa phường cũ**; QR thanh toán = **tờ giấy in dán trên bìa carton/tường**, không phải thẻ NFC bóng bẩy).

**A. Cảm giác chung:** ảnh chụp film cũ buổi trưa/chiều — màu hơi ngả nắng, vật dụng sờn, nhựa phai, inox xước, gỗ mộc. Bình dân, đông đúc, thân thuộc. KHÔNG bóng bẩy/tối giản/hi-tech.

**B. Bảng tra hình thái 2000s (áp khi asset rơi vào nhóm này):**

| Asset / nhóm | Hình thái 2000s ĐÚNG | Tránh (hiện đại) |
|---|---|---|
| `glass-*` (cốc) | **Cốc bia hơi Hà Nội truyền thống**: cốc thủy tinh dày màu xanh ve chai/xanh rêu, **không quai**, thân cao vừa và hơi thuôn (cao khoảng 1.3× bề ngang), miệng chỉ loe nhẹ, đáy dày, nhiều gân dọc nhỏ sát nhau | cốc có quai, beer mug/stein, ly pint mảnh, ly thấp bè/squat tumbler, ly thuỷ tinh trong vắt cao cấp |
| `keg-lv*` (bom+vòi) | bom **nhôm/inox móp cũ**, vòi đồng/thau; Lv5 mới sáng bóng | keg inox công nghiệp bóng từ Lv1 |
| `table-*`, `chair-*` | bàn **nhựa/inox thấp kiểu vỉa hè**, mặt bàn rộng vừa đủ để đặt 2-3 cốc + mồi; **ghế nhựa thấp vẽ asset riêng** | bàn cafe gỗ cao, ghế bar, ghế designer, bake ghế vào asset bàn |
| `tv-off`/`tv-on` | **TV bầu CRT vỏ nhựa**, có nút vặn/râu ăng-ten | TV LCD/LED phẳng, smart TV |
| `phone` (shipper) | **điện thoại "cục gạch" phím bấm** (kiểu Nokia generic, không logo) | smartphone cảm ứng, iPhone |
| `customer-skin-shipper-bike` | **xe số Honda Dream/Wave/Cub generic**, mũ bảo hiểm nửa đầu | xe ga SH, xe điện, app-ship hiện đại |
| `sign-*` (biển) | **biển tôn sơn tay/chữ viết tay**, `sign-neon` = **đèn neon ống thuỷ tinh** đời cũ | biển LED ma trận, bảng acrylic in kỹ thuật số |
| `closing-ledger-*`, quầy | **sổ giấy kẻ ô + bút bi + bàn tính gảy / máy tính cầm tay cũ** | tablet, POS cảm ứng, laptop mỏng |
| `icon-lottery-ticket` | **vé số giấy in offset** sờn | vé điện tử/app |
| nền & prop ambient (`bg-*`, owner) | **quạt cây/quạt trần cũ, đèn tuýp huỳnh quang + bóng sợi đốt vàng, phích nước Rạng Đông, ấm nhôm, két bia nhựa/gỗ, mẹt tre, rổ nhựa, lá chuối** | đèn LED dây, quạt tháp, nội thất minimal |
| trang phục khách (`customer-*`) | **áo sơ mi/ba lỗ, quần tây, dép tổ ong/dép lê, mũ cối, túi cói**; công sở = sơ mi + cặp da + ĐT phím bấm | đồ thể thao có logo thật, tai nghe bluetooth, đồ hi-fashion |
| chữ/loa (`icon-ai-assistant`, ambient) | trợ lý AI = **đài/loa phường cũ**; loa nén, radio cassette | trợ lý robot/AI bong bóng chat hiện đại |

**C. Blocklist anachronism (tuyệt đối tránh trên vật diegetic):** smartphone cảm ứng · TV/màn hình phẳng · xe ga/xe điện đời mới · đèn LED dây/RGB · thuỷ tinh & nội thất tối giản hiện đại · logo thương hiệu thật (bia/đội bóng/điện thoại) · POS/tablet/laptop mỏng · QR dạng thẻ bóng bẩy (chỉ dùng QR-giấy-dán).

**D. Era modifier — APPEND vào MỌI prompt asset (sau global prefix):**

```text
Era: Vietnam early-to-mid 2000s street vibe — aged aluminum/inox, worn red plastic, raw wood, hand-painted signage, fluorescent tube + warm incandescent light, slightly faded and lived-in. Traditional Hanoi bia hoi glass tumbler: no handle, thick recycled green glass, vertical fluted ribs, taller slim body about 1.3x height-to-width, slightly flared rim, heavy base (not beer mug/stein, not thin pint, not short squat tumbler). CRT tube TV (not flat screen), keypad feature phone (not smartphone), step-through motorbike (not scooter). No real brand logos, no modern minimalist hi-tech objects.
```

---

## 1. SPRITE GAMEPLAY — Đối tượng trong sân quán

> 🕰️ **Mọi asset dưới đây áp lớp "Chuẩn thời đại 2000s" §0.3** (append `{era_modifier}` + tra bảng §0.3.B khi vật có hình thái nhạy thời đại).

### 1.1 Bàn — 4 cấp × trạng thái

| # | Asset | Mô tả | States cần vẽ | Phase |
|---|-------|-------|:-------------:|:-----:|
| 1 | `table-lv1` | Bàn con (khởi đầu, 2-3 người) — bàn nhựa thấp, **không kèm ghế**, dành anchor cho ghế/khách quanh bàn | empty · has_customer · needs_serve · overdue · enjoying | P0 |
| 2 | `table-lv2` | Bàn vuông (4 ghế) — bàn inox | ← tương tự | P1 |
| 3 | `table-lv3` | Bàn dài (6 ghế) — bàn inox lớn | ← tương tự | P2 |
| 4 | `table-lv4` | Bàn VIP / kê dài (8-10 ghế) — có khăn trải, đèn | ← tương tự | P3 |

> **Visual progression:** mỗi cấp phải khác biệt rõ — to hơn, chất liệu đẹp hơn, thêm chi tiết.
> **State indicators:** empty = bàn trống; has_customer = có nhóm ngồi; needs_serve = highlight viền vàng; overdue = viền đỏ/nhấp nháy (phạt cụm); enjoying = cụng ly/vui vẻ.

**Subtotal:** 4 cấp × 5 states = **20 sprites**

### 1.2 Ghế — theo bàn

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 5 | `chair-plastic` | Ghế nhựa đỏ (mặc định) | P1 |
| 6 | `chair-upgraded` | Ghế tựa/nâng cấp | P2 |
| 7 | `chair-broken` | Ghế bị côn đồ phá (cần sửa) | P3 |
| 8 | `chair-empty` | Ghế trống (placeholder) | P1 |

**Subtotal: 4 sprites**

### 1.3 Thiết bị — 5 loại × 5 cấp

| # | Asset prefix | Thiết bị | Vai trò (GDD §4) | Phase |
|---|-------------|----------|-------------------|:-----:|
| 9-13 | `keg-lv1..5` | **Bom bia + vòi rót** | Rót bia (batch + tốc độ) | P1 |
| 14-18 | `washer-lv1..5` | **Bồn rửa cốc** | Vòng đời cốc | P1 |
| 19-23 | `fridge-lv1..5` | **Hầm/tủ giữ lạnh** | Giữ bia lạnh, chống mất hơi | P1 |
| 24-28 | `counter-lv1..5` | **Quầy/kho** | Sức chứa kho | P1 |
| 29-33 | `kitchen-lv1..5` | **Bếp** (mới) | Mồi nóng: đậu/tóp mỡ/lòng | P2 |

> Mỗi cấp **đổi hẳn hình** (visual progression) — cấp 1 = thô sơ, cấp 5 = công nghiệp/sáng bóng.
> Mỗi thiết bị có **progress bar overlay** khi đang hoạt động (rót/rửa/nấu) — vẽ riêng hoặc render code.

**Subtotal:** 5 loại × 5 cấp = **25 sprites**

### 1.4 Cốc bia — trạng thái vòng đời

> **Chuẩn shape bắt buộc cho mọi `glass-*` và `menu-beer`:** cùng một **cốc bia hơi Hà Nội truyền thống**, **không quai**, thủy tinh xanh ve chai/xanh rêu dày, thân cao vừa/hơi thuôn (cao khoảng 1.3× bề ngang), miệng chỉ loe nhẹ, đáy dày, gân dọc nhỏ chạy quanh thân. Luôn tránh beer mug/stein/cốc có quai/ly pint/ly thấp bè.
>
> **Reference production đã pass:** `assets/glass-clean.png` (`128x128`, transparent, visible bbox ~`67x108+30+10`). Mọi biến thể `glass-full`, `glass-half`, `glass-stale`, `glass-flat`, `glass-dirty`, `glass-washing` và `menu-beer` phải giữ cùng silhouette/camera/padding/outline như file này; chỉ đổi phần bia, bọt, bẩn, cảnh báo hoặc bong bóng rửa.

| # | Asset | Mô tả | Visual cue | Phase |
|---|-------|-------|-----------|:-----:|
| 34 | `glass-clean` | Cốc sạch, sẵn dùng | Cốc bia hơi Hà Nội không quai, thân cao vừa/hơi thuôn, thủy tinh xanh dày có gân dọc, rỗng/sáng | P0 |
| 35 | `glass-full` | Cốc vừa rót, đầy bọt | Cùng cốc không quai, bia vàng đầy, bọt trắng tràn nhẹ | P0 |
| 36 | `glass-half` | Bọt xẹp (freshness đang giảm) | Cùng cốc không quai, bia còn khoảng nửa/2 phần 3, bọt ít hơn | P0 |
| 37 | `glass-stale` | **Cờ vàng** — sắp mất hơi | Cùng cốc không quai, bia nhạt hơn + cờ vàng cảnh báo | P0 |
| 38 | `glass-flat` | Hết hơi (bia ngả) | Cùng cốc không quai, bia xỉn màu, không bọt | P1 |
| 39 | `glass-dirty` | Cốc bẩn, cần rửa | Cùng cốc không quai, vệt dơ/mờ đục trên thủy tinh xanh | P0 |
| 40 | `glass-washing` | Đang rửa (trong bồn) | Cùng cốc không quai trong bồn rửa, bong bóng xà phòng | P1 |

**Subtotal: 7 sprites** (P0 cần tối thiểu 5: clean, full, half, stale, dirty)

---

## 2. NHÂN VẬT

### 2.1 Chủ quán — 3 biến thể thời tiết

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 41 | `owner` | Chủ quán (thường) — tạp dề, lăng xăng | P1 |
| 42 | `owner-hot` | Thời tiết nóng — xắn tay, khăn lau | P2 |
| 43 | `owner-cold` | Thời tiết lạnh — áo khoác | P2 |

### 2.2 Khách hàng — 7 gameplay type × 3 thời tiết

| # | Type | Loại khách | Đặc điểm visual | Biến thể | Phase |
|---|------|-----------|-----------------|:--------:|:-----:|
| 44-46 | `customer-normal` | Dân nhậu thường | Áo thun, dép lê | normal/hot/cold | P1 |
| 47-49 | `customer-rush` | Khách vội (tan ca) | Còn mặc đồ công sở, vội vã | normal/hot/cold | P1 |
| 50-52 | `customer-vip` | Khách sộp / sếp bao mâm | Áo sơ mi đẹp, kính, vàng bling | normal/hot/cold | P1 |
| 53-55 | `customer-chipheo` | Khách quậy / xỉn | Say, áo rách, mặt đỏ | normal/hot/cold | P2 |
| 56-58 | `customer-laurai` | Bàn lai rai (ngồi lỳ) | Thoải mái, ngả ghế | normal/hot/cold | P2 |
| 59-61 | `customer-shipper` | Shipper mang về | Đồng phục giao hàng, túi | normal/hot/cold | P2 |
| 62-64 | `customer-football` | Nhóm cổ vũ bóng đá | Áo đội bóng, cờ, kèn | normal only × 3 var | P4 |

> **Gốc có 30 "khuôn mặt" × 3 biến thể = 90 sprites.** Bia hơi có thể bắt đầu **10 khuôn mặt × 3 = 30 sprites** ở P1, mở rộng dần.
> Mỗi loại đặc biệt cần **badge nhỏ** trên đầu: VIP (vàng), vội (đỏ), Chí Phèo (nâu), ngồi lỳ (xanh lá), shipper (xanh dương).

**Subtotal P1:** ~30 sprites (10 face × 3 weather) + 3 VIP + 3 khách vội = **~36 sprites**
**Subtotal full:** ~90+ sprites (mở rộng theo phase)

### 2.2.1 Customer visual archetypes — skin để gen đa dạng khách

> **Cách dùng:** `customer-*` ở §2.2 là gameplay type. Các skin dưới đây là **visual archetype** để thay đổi ngoại hình/đời sống phố phường mà vẫn map vào type gameplay. Mỗi skin ưu tiên 3 weather variant (`normal/hot/cold`) nếu là khách thường xuyên xuất hiện. Skin P3/P4 có thể bắt đầu `normal` trước, thêm weather sau.

| ID | Asset prefix | Map gameplay type | Archetype | Visual prompt focus | Variants | Phase |
|---|---|---|---|---|:---:|:---:|
| C01 | `customer-skin-runner` | `customer-rush` | Runner chạy bộ | Áo thể thao, giày chạy, đồng hồ thể thao, khăn thấm mồ hôi, ghé uống nhanh | ×3 | P1 |
| C02 | `customer-skin-badminton` | `customer-rush` / `customer-normal` | Người chơi cầu lông | Áo thể thao sáng màu, vợt cầu lông, túi vợt, cầu lông nhỏ | ×3 | P1 |
| C03 | `customer-skin-pickleball` | `customer-rush` / `customer-normal` | Người chơi pickleball | Paddle pickleball, outfit thể thao, bóng nhỏ vàng, dáng vừa tập xong | ×3 | P1 |
| C04 | `customer-skin-office-worker` | `customer-rush` | Dân văn phòng tan ca | Sơ mi xắn tay, cà vạt lỏng, cặp da/cặp tài liệu cũ, ĐT phím bấm, mặt hơi mệt | ×3 | P1 |
| C05 | `customer-skin-construction-worker` | `customer-normal` / `customer-rush` | Công nhân công trường | Áo phản quang, mũ bảo hộ cầm tay, bụi nhẹ, uống giải khát sau ca | ×3 | P1 |
| C06 | `customer-skin-student` | `customer-normal` | Sinh viên | Áo thun, balo, dép/sneaker, ví mỏng, vui tươi | ×3 | P1 |
| C07 | `customer-skin-aunties` | `customer-laurai` / `customer-normal` | Hội chị em | 2-3 cô/chị ngồi cùng, túi xách, tóc/áo đa dạng, nói chuyện rôm rả | ×3 | P2 |
| C08 | `customer-skin-regular-bia-lover` | `customer-laurai` | Bợm nhậu quen quán | Bụng bia nhẹ, áo ba lỗ/áo thun cũ, khăn vai, dáng thoải mái thân quen | ×3 | P2 |
| C09 | `customer-skin-drunk-happy` | `customer-chipheo` | Say vui | Mặt đỏ, cười lớn, nâng ly, lảo đảo nhẹ nhưng không dữ | ×3 | P2 |
| C10 | `customer-skin-drunk-rowdy` | `customer-chipheo` | Say gây sự | Áo xộc xệch, mặt đỏ, chỉ tay/cà khịa, dáng mất kiểm soát | ×3 | P2 |
| C11 | `customer-skin-drunk-sleepy` | `customer-laurai` / `customer-chipheo` | Say ngủ gục | Gục đầu trên bàn, ly/cốc bên cạnh, cần gọi dậy hoặc tiễn | ×3 | P2 |
| C12 | `customer-skin-retiree` | `customer-laurai` | Chú/bác nghỉ hưu | Áo polo, mũ lưỡi trai/nón cối, báo giấy/cờ tướng mini, uống chậm | ×3 | P2 |
| C13 | `customer-skin-cyclist` | `customer-rush` | Người đạp xe | Mũ bảo hiểm xe đạp, áo bó thể thao, bình nước, xe đạp gợi ý bằng phụ kiện nhỏ | ×3 | P2 |
| C14 | `customer-skin-tourist` | `customer-vip` / `customer-normal` | Khách du lịch | Máy ảnh, balo nhỏ, kính mát, tò mò với bia hơi, chi tiêu tốt | ×3 | P2 |
| C15 | `customer-skin-foodie` | `customer-vip` | Food reviewer/foodie | Máy ảnh compact/điện thoại phím bấm chụp món, túi đeo vải, biểu cảm hào hứng, gọi nhiều mồi | ×3 | P2 |
| C16 | `customer-skin-football-fan` | `customer-football` | Fan bóng đá | Áo đội bóng generic, khăn/cờ không logo thật, kèn cổ vũ | normal | P4 |
| C17 | `customer-skin-football-ultra` | `customer-football` | Hội cổ động nhiệt | Mặt vẽ màu generic, trống/kèn, năng lượng cao, đi nhóm | normal | P4 |
| C18 | `customer-skin-shipper-bike` | `customer-shipper` | Người giao đồ xe số | Áo khoác giao hàng generic không app-logo, mũ bảo hiểm nửa đầu, túi giữ nhiệt thô, điện thoại phím bấm | ×3 | P2 |
| C19 | `customer-skin-boss-host` | `customer-vip` | **Sếp bao mâm / đại gia tiếp khách** | Áo sơ mi đóng thùng hoặc áo khoác da, đồng hồ, ĐT cục gạch "xịn", cử chỉ vung tay gọi cả mâm, chi đậm | ×3 | P1 |
| C20 | `customer-skin-solo` | `customer-laurai` / `customer-normal` | **Khách một mình** | Ngồi một mình, uống chậm trầm tư, gác chân/nhìn xa, 1 cốc + đĩa mồi nhỏ | ×3 | P2 |

**Subtotal visual skins:** 20 skin × 3 weather tối đa = **~60 sprites**. Scope đề xuất: P1 gen 7 skin đầu ×3 = **21 sprites**; P2 gen 11 skin tiếp ×3 = **33 sprites**; P4 gen 2 fan skin normal = **2 sprites**.

**Prompt rule cho skin:** giữ cùng skeleton/scale như `customer-normal`; không dùng logo thương hiệu thật, logo đội bóng thật, hoặc chữ trên áo. Dùng phụ kiện/silhouette để nhận diện.

> **Ngoại lệ chủ ý (user chốt 2026-06-11) — GIỮ, không coi là lỗi thời đại:**
> - `customer-skin-pickleball` (C03): pickleball thật ra phổ biến ở VN ~2020s, nhưng **giữ** để đa dạng thể thao — game là bia hơi *stylized hoài niệm*, không mô phỏng lịch sử nghiêm ngặt.
> - `customer-skin-aunties` (C07) & nữ giới uống bia: ở 2000s ít phổ biến hơn nay nhưng **giữ đủ weight bình thường** theo ý user (không hạ thấp).
> - Hai skin này vẫn bám palette + pixel-art của bộ; chỉ KHÔNG bị ràng buộc "đồ vật 2000s" ở §0.3.C như các vật diegetic khác.

### 2.2.2 Nhóm / dịp — biên chế (group composition, KHÔNG phải face skin riêng)

> **Cách dùng:** đây là **mẫu biên chế nhóm** (mỗi nhóm = vài khách ghép lại theo skin sẵn ở §2.2.1) — gắn vào hệ bàn (`03-SPEC-he-ban.md`: group size + số đợt) và demand-mix (GDD §7). **Phần lớn TÁI DÙNG skin, không vẽ mặt mới**; chỉ vẽ mới khi ghi rõ ở cột Asset.

| ID | Nhóm / dịp | Biên chế (size + skin) | Hành vi gameplay | Asset cần | Phase |
|---|---|---|---|---|:---:|
| GA1 | **Hội bạn thân / chiến hữu** | 2–4 · `normal` + `regular-bia-lover` | thân mật, cụng ly nhiều, **lai rai nhiều đợt**, tip ổn | reuse skin + bong bóng "Dô!" | P1 |
| GA2 | **Đồng nghiệp tan ca** | 3–5 · `office-worker` (+`rush`) | đến giờ tan tầm, xử nhanh, ít đợt | reuse `office-worker` | P1 |
| GA3 | **Liên hoan / tiệc mừng** (mừng công, tất niên, sinh nhật, thắng độ; kiểu "đám cưới/đầy tháng" vỉa hè) | **6–10** · `normal` + `boss-host`(VIP) | **bàn dài/VIP bắt buộc**, đơn lớn, **nhiều đợt**, tip cụm to, ồn ào | reuse skins + **`prop-celebration`** (§7) | P3 |
| GA4 | **Khách một mình** | 1 · `solo` (C20) | uống chậm, **patience cao, ít đợt, tip nhỏ**, lấp ghế lẻ | **`customer-skin-solo`** (mới, C20) | P2 |
| GA5 | Cặp đôi / đi hai | 2 · `normal` + nữ (`aunties` skin) | gọi ít, ngồi lâu, tip ổn | reuse skin | P2 |
| GA6 | Gia đình cuối tuần *(tuỳ chọn)* | 2 lớn (+trẻ ăn mồi, không bia) | gọi **nhiều mồi**, ít bia | reuse + (child skin nếu làm) | P3 |

> **Lưu ý thực tế 2000s:** "đám cưới" đúng nghĩa hiếm ở bia hơi (thường ở nhà hàng/hội trường) → mô hình hoá thành **liên hoan / tiệc mừng** cho đúng chất quán. Biên chế nhóm + số đợt gọi là **cơ chế hệ bàn** (`03-SPEC-he-ban.md`), không phải asset; ở đây chỉ chốt skin & prop cần vẽ.

### 2.3 Chairman "Chủ tịch giả nghèo" — reveal animation

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 65 | `chairman-reveal` | Chí Phèo lộ ra là đại gia (biến hình) | P2 |
| 66 | `chairman-smoke` | Hiệu ứng khói khi lộ diện | P2 |

### 2.4 Côn đồ (gangster) — 4 mức

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 67 | `gangster-1` | Côn đồ thường (HP=1, ATK nhẹ) | P3 |
| 68 | `gangster-2` | Côn đồ mạnh (HP=2) | P3 |
| 69 | `gangster-3` | Côn đồ trâu (HP=3) | P3 |
| 70 | `gangster-boss` | Boss (server-only, post-MVP) | P3+ |

### 2.5 Chó — 3 cấp × 3 states

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 71-73 | `dog-idle-lv1..3` | Chó đứng yên (3 cấp nâng) | P3 |
| 74-76 | `dog-attack-lv1..3` | Chó tấn công (3 cấp) — animation combat | P3 |
| 77 | `dog-captured` | Chó bị bắt sau khi thua gangster — buồn, dây xích | P3 |

**Subtotal chó: 7 sprites**

---

## 3. MÓN ĂN & NGUYÊN LIỆU — Icon menu + kho

### 3.1 Icon món bán (menu 6 món — GDD §2)

| # | Asset | Món | Mô tả visual | Phase |
|---|-------|-----|-------------|:-----:|
| 78 | `menu-beer` | **Bia hơi (cốc)** | Cốc bia hơi Hà Nội không quai, thân cao vừa/hơi thuôn, thủy tinh xanh dày có gân, bia vàng đầy bọt | P0 |
| 79 | `menu-peanut` | **Lạc (đậu phộng)** | Đĩa lạc rang | P0 |
| 80 | `menu-nemchua` | **Nem chua** | Nem chua cuộn lá chuối | P0 |
| 81 | `menu-friedbean` | **Đậu tẩm hành** | Bát đậu chiên giòn + hành phi | P2 |
| 82 | `menu-crackle` | **Tóp mỡ Triều Khúc** | Đĩa tóp mỡ vàng giòn | P2 |
| 83 | `menu-intestine` | **Lòng xào dưa** | Đĩa lòng xào dưa chua | P2 |

**Subtotal: 6 icons**

### 3.2 Icon nguyên liệu (kho)

| # | Asset | Nguyên liệu | Ghi chú | Phase |
|---|-------|-------------|---------|:-----:|
| 84 | `mat-beer-barrel` | Thùng bia / nguyên liệu bia | Nhập sỉ | P1 |
| 85 | `mat-peanut-raw` | Lạc sống | Nguyên liệu lạc | P1 |
| 86 | `mat-nemchua-pack` | Nem chua (gói) | Nhập sỉ | P1 |
| 87 | `mat-bean-raw` | Đậu sống | Cho đậu tẩm hành | P2 |
| 88 | `mat-pork-fat` | Mỡ lợn | Cho tóp mỡ | P2 |
| 89 | `mat-intestine-raw` | Lòng + dưa chua | Cho lòng xào dưa | P2 |
| 90 | `mat-onion` | Hành phi | Gia vị chung | P2 |
| 91 | `mat-ice` | Đá lạnh | Giữ bia (hầm lạnh supplement) | P1 |

**Subtotal: 8 icons**

---

## 4. ICON HUD & HỆ THỐNG

### 4.1 Thanh trạng thái (top bar)

| # | Asset | Ý nghĩa | Vị trí | Phase |
|---|-------|---------|--------|:-----:|
| 92 | `icon-coin` | Xu (số dư) 💰 | Top-left | P0 |
| 93 | `icon-stamina` | Thể lực ⚡ + số ca (x/5) | Top | P0 |
| 94 | `icon-reputation` | Uy tín ⭐ | Bottom-left | P0 |
| 95 | `icon-rush-light` | Giờ Vàng nhẹ 🟡 | Top | P0 |
| 96 | `icon-rush-heavy` | Giờ Vàng nặng 🔴 | Top | P0 |
| 97 | `icon-weather-sunny` | Nắng ☀ | Top | P1 |
| 98 | `icon-weather-hot` | Nóng 🔥 | Top | P1 |
| 99 | `icon-weather-humid` | Oi bức 🥵 | Top | P2 |
| 100 | `icon-weather-rain` | Mưa 🌧 | Top | P1 |
| 101 | `icon-weather-cold` | Lạnh ❄ | Top | P2 |

### 4.2 Rail bên (side rail)

| # | Asset | Ý nghĩa | Phase |
|---|-------|---------|:-----:|
| 102 | `icon-notification` | Chuông thông báo 🔔 | P1 |
| 103 | `icon-sound-on` | Bật tiếng 🔊 | P1 |
| 104 | `icon-sound-off` | Tắt tiếng 🔇 | P1 |
| 105 | `icon-quest` | Nhiệm vụ 🎯 (x/5) | P2 |
| 106 | `icon-ai-assistant` | Trợ lý AI 🤖 "Bia Đấm" | P3 |
| 107 | `icon-shrine` | Bàn Thờ Ông Địa ⛩ *(gốc: Đền Thiêng)* | P3 |

### 4.3 Thanh dưới (bottom bar)

| # | Asset | Ý nghĩa | Phase |
|---|-------|---------|:-----:|
| 108 | `icon-trophy` | Xếp hạng 🏆 | P3 |
| 109 | `btn-shift` | Nút MỞ CA / ĐÓNG CA | P0 |
| 110 | `btn-restock` | Nút NHẬP HÀNG | P1 |
| 111 | `btn-upgrade` | Nút NÂNG CẤP | P1 |
| 112 | `btn-leaderboard` | Nút XẾP HẠNG | P3 |

### 4.4 Tiền tệ & meta

| # | Asset | Ý nghĩa | Phase |
|---|-------|---------|:-----:|
| 113 | `icon-coin-inline` | Xu nhỏ (inline trong text) | P1 |
| 114 | `icon-reputation-star` | Sao uy tín nhỏ | P1 |
| 115 | `icon-badge-shard` | Mảnh huy hiệu | P3 |
| 116 | `icon-cosmetic-token` | Tem Trang Trí | P3 |
| 117 | `icon-gift-box` | Thùng Hàng / quà | P2 |

**Subtotal HUD/system: 26 icons**

---

## 5. ICON KHÁCH HÀNG (badge & cảm xúc)

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 118 | `badge-vip` | Nhãn VIP vàng | P1 |
| 119 | `badge-rush` | Nhãn VỘI đỏ | P1 |
| 120 | `badge-chipheo` | Nhãn CHÍ PHÈO nâu | P2 |
| 121 | `badge-laurai` | Nhãn NGỒI LỲ xanh lá | P2 |
| 122 | `badge-shipper` | Nhãn SHIPPER xanh dương | P2 |
| 123 | `badge-football` | Nhãn CỔ VŨ | P4 |
| 124 | `emoji-happy` | Mặt vui 🤩 (tip tốt) | P1 |
| 125 | `emoji-angry` | Mặt giận 😤 (patience thấp) | P1 |
| 126 | `emoji-cool` | Mặt ngầu 😎 (VIP hài lòng) | P1 |
| 127 | `emoji-drunk` | Mặt say 🥴 (Chí Phèo) | P2 |

**Subtotal: 10 sprites**

### 5.1 Icon/badge customer archetype — thiếu từ visual skins

| ID | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| B01 | `badge-runner` | Giày chạy/tia tốc độ — nhận diện runner | P1 |
| B02 | `badge-badminton` | Vợt + cầu lông mini | P1 |
| B03 | `badge-pickleball` | Paddle + bóng pickleball | P1 |
| B04 | `badge-office` | Cặp da/cặp tài liệu + cà vạt lỏng | P1 |
| B05 | `badge-construction` | Mũ bảo hộ nhỏ | P1 |
| B06 | `badge-student` | Balo/sách nhỏ | P1 |
| B07 | `badge-aunties` | Hai ly cụng + túi xách nhỏ | P2 |
| B08 | `badge-regular` | Ly bia + khăn vai — khách quen/bợm nhậu | P2 |
| B09 | `badge-drunk-happy` | Ly nghiêng + mặt cười đỏ | P2 |
| B10 | `badge-drunk-rowdy` | Ly vỡ/tia cảnh báo — say gây sự | P2 |
| B11 | `badge-drunk-sleepy` | Bong bóng ngủ + ly bia | P2 |
| B12 | `badge-retiree` | Mũ/nón + quân cờ nhỏ | P2 |
| B13 | `badge-cyclist` | Bánh xe + bình nước | P2 |
| B14 | `badge-tourist` | Máy ảnh + kính mát | P2 |
| B15 | `badge-foodie` | Máy ảnh compact/điện thoại phím bấm + đũa | P2 |

**Subtotal archetype badges: 15 icons**

### 5.2 Icon hệ thống còn thiếu — checklist bổ sung

> Rà theo GDD/F-features: một số hệ thống đã có logic/item nhưng chưa có icon riêng. Các icon dưới đây nên gen trước khi làm modal/feature tương ứng.

| ID | Asset | Hệ thống | Mô tả | Phase |
|---|-------|----------|-------|:-----:|
| I01 | `icon-broadcast-license` | World Cup | Bản quyền phát sóng TV Vụ Bia | P4 |
| I02 | `icon-match-schedule` | World Cup | Lịch thi đấu / fixture booster | P4 |
| I03 | `icon-season-shop` | World Cup | Shop Vụ Bia | P4 |
| I04 | `icon-season-theme` | World Cup | Theme Vụ Bia đội tuyển generic, không logo thật | P4 |
| I05 | `icon-location-pin` | Mặt bằng | Đổi địa điểm/quán | P3 |
| I06 | `icon-rent` | Mặt bằng | Tiền thuê mặt bằng | P3 |
| I07 | `icon-deposit` | Mặt bằng | Tiền cọc 25% | P3 |
| I08 | `icon-lease-expiry` | Mặt bằng | Hết hạn thuê / gia hạn | P3 |
| I09 | `icon-league-1` | Giải Nhậu | 🥤 Cốc Nhựa | P3 |
| I10 | `icon-league-2` | Giải Nhậu | 🍺 Cốc Thủy Tinh | P3 |
| I11 | `icon-league-3` | Giải Nhậu | 🏺 Vại Sành | P3 |
| I12 | `icon-league-4` | Giải Nhậu | ⚔️ Vại Đồng | P3 |
| I13 | `icon-league-5` | Giải Nhậu | 💎 Bom Bạc | P3 |
| I14 | `icon-league-6` | Giải Nhậu | 🍻 Bom Vàng | P3 |
| I15 | `icon-league-7` | Giải Nhậu | 👑 Vua Bia | P3 |
| I16 | `icon-league-8` | Giải Nhậu | 🏆 Trùm Bia Hơi | P3 |
| I17 | `icon-duong-len-trum` | Đường Lên Trùm | Icon chung | P3 |
| I18 | `icon-dlt-lp0` | Đường Lên Trùm | Mốc Bưng Bê | P3 |
| I19 | `icon-dlt-lp1` | Đường Lên Trùm | Mốc Phụ Quán | P3 |
| I20 | `icon-dlt-lp2` | Đường Lên Trùm | Mốc Tay Ngang | P3 |
| I21 | `icon-dlt-lp3` | Đường Lên Trùm | Mốc Chủ Sạp | P3 |
| I22 | `icon-dlt-lp4` | Đường Lên Trùm | Mốc Chủ Quán | P3 |
| I23 | `icon-dlt-lp5` | Đường Lên Trùm | Mốc Ông Chủ | P3 |
| I24 | `icon-dlt-lp6` | Đường Lên Trùm | Mốc Đại Gia Bia | P3 |
| I25 | `icon-dlt-lp7` | Đường Lên Trùm | Mốc Trùm Bia Hơi | P3 |
| I26 | `badge-ket-noi` | Referral | Huy hiệu Kết Nối, gate bàn VIP | P3 |
| I27 | `badge-prestige-1` | Referral | Huy hiệu khoe mốc 2 | P3 |
| I28 | `badge-prestige-2` | Referral | Huy hiệu khoe mốc 3 | P3 |
| I29 | `icon-referral-link` | Referral | Link/mã mời bạn | P3 |
| I30 | `icon-quest-daily` | Quest | Nhiệm vụ ngày | P2 |
| I31 | `icon-quest-shift` | Quest | Nhiệm vụ theo ca | P2 |
| I32 | `icon-quest-gift` | Quest | Nhiệm vụ gửi quà | P2 |
| I33 | `icon-quest-attendance` | Quest | Điểm danh/sign-in | P2 |
| I34 | `icon-quest-referral` | Quest | Nhiệm vụ mời bạn | P3 |
| I35 | `icon-reward-claim` | Quest | Nhận thưởng | P2 |
| I36 | `icon-gift-send` | Social gift | Gửi quà bạn bè | P3 |
| I37 | `icon-gift-receive` | Social gift | Nhận quà | P3 |
| I38 | `icon-lottery-ticket` | Vé Số Lấy Hên | Vé số / vé vui | P4 |
| I39 | `icon-lottery-draw` | Vé Số Lấy Hên | Quay số | P4 |
| I40 | `icon-lottery-prize` | Vé Số Lấy Hên | Trúng thưởng | P4 |
| I41 | `icon-inspection-question` | Risk | Câu hỏi kiểm tra ATTP/trật tự | P3 |
| I42 | `icon-certificate-crossed` | Risk | Chứng chỉ bị thu / đình chỉ ca | P3 |
| I43 | `icon-drunk-fight` | Risk | Say xỉn đánh nhau | P3 |
| I44 | `icon-offline-theft` | Risk | Trộm offline | P3 |
| I45 | `icon-dog-food` | Chó | Thức ăn chó | P3 |
| I46 | `icon-dog-candy` | Chó | Kẹo/đồ thưởng nâng chó | P3 |
| I47 | `icon-dog-captured` | Chó | Trạng thái chó bị bắt | P3 |
| I48 | `icon-language` | Account | Chọn ngôn ngữ | P1 |
| I49 | `icon-guest` | Account | Chơi khách | P1 |
| I50 | `icon-google-login` | Account | Đăng nhập Google generic | P1 |
| I51 | `icon-cloud-save` | Account | Lưu cloud | P1 |
| I52 | `icon-device-sync` | Account | Đồng bộ nhiều thiết bị | P2 |
| I53 | `icon-session-pass` | Payment/access | Session Pass | P3 |
| I54 | `icon-payment-qr` | Payment/access | QR thanh toán pass/donation | P3 |
| I55 | `icon-payment-pending` | Payment/access | Thanh toán chờ xác nhận | P3 |
| I56 | `icon-payment-success` | Payment/access | Thanh toán thành công | P3 |
| I57 | `icon-supporter-heart` | Mời Bia Hơi | Ủng hộ/cảm ơn cosmetic-only | P4 |
| I58 | `icon-donation-gift` | Mời Bia Hơi | Quà cosmetic từ Mời Bia Hơi | P4 |
| I59 | `icon-bottleneck-cups` | Upgrade rec | Thiếu cốc sạch | P1 |
| I60 | `icon-bottleneck-stale` | Upgrade rec | Bia mất hơi nhiều | P1 |
| I61 | `icon-bottleneck-stock` | Upgrade rec | Kho/stock đầy hoặc thiếu | P1 |
| I62 | `icon-bottleneck-speed` | Upgrade rec | Tốc độ phục vụ/rót/rửa yếu | P1 |
| I63 | `icon-table-vip-lock` | Upgrade gate | Bàn VIP bị khóa bởi Kết Nối/uy tín | P3 |

**Subtotal missing system icons: 63 icons**

### 5.3 Leaderboard & Social UI — components cho BXH / Dạo Phố (economy-spec §11, §15)

> Feature Leaderboard gồm 2 bảng: **Xếp hạng** (gom theo bậc Giải Nhậu, xuyên mặt bằng) và **Dạo Phố** (gom theo location × Giải Nhậu — "hàng xóm"). Cả 2 đều là P3 nhưng cần liệt kê assets sớm để designer hiểu scope.

**Leaderboard UI components:**

| ID | Asset | Mô tả | Loại | Phase |
|---|-------|-------|------|:-----:|
| L01 | `leaderboard-entry-card` | Card entry: rank + avatar frame + username + seasonEarned + Giải Nhậu badge + location tag | DOM component | P3 |
| L02 | `leaderboard-my-rank` | Highlight card "bạn" (fixed bottom, khác màu, viền vàng) | DOM component | P3 |
| L03 | `leaderboard-tab-league` | Tab ‹ › chuyển bậc Giải Nhậu (Cốc Nhựa→Trùm Bia Hơi) | DOM component | P3 |
| L04 | `leaderboard-empty-state` | Empty state "Chưa có ai" cho bậc Giải Nhậu trống | DOM + icon | P3 |
| L05 | `leaderboard-season-header` | Header: tên Vụ Bia + season ID kỹ thuật (VD: S005) + đếm ngược kết thúc | DOM component | P3 |
| L06 | `icon-champion-crown` | Crown cho quán vô địch Vụ Bia (#1 overall) | Icon 128×128 | P3 |
| L07 | `icon-season-placement` | Icon Vụ Bia Phân Hạng (chu kỳ 7 ngày) | Icon 64×64 | P3 |
| L08 | `icon-season-conquest` | Icon Vụ Bia Tranh Bá (chu kỳ 14 ngày) | Icon 64×64 | P3 |
| L09 | `icon-season-reward-preview` | Icon xem trước thưởng cuối Vụ Bia (bundle nguyên liệu) | Icon 64×64 | P3 |
| L10 | `leaderboard-medal-top3` | Huy chương top 3 (vàng/bạc/đồng — 3 variant) | Icon 64×64 ×3 | P3 |
| L11 | `leaderboard-medal-top10` | Huy chương top 10 (khắc tên Bàn Thờ Ông Địa) | Icon 64×64 | P3 |
| L12 | `leaderboard-season-end-banner` | Banner kết Vụ Bia: thưởng nhận được + huy chương + rank | DOM overlay | P3 |
| L13 | `icon-reputation-season` | ⭐ Uy tín Vụ Bia (seasonReputationScore, hiển thị trên BXH) | Icon 32×32 | P3 |

**Dạo Phố (Social Street) UI components:**

| ID | Asset | Mô tả | Loại | Phase |
|---|-------|-------|------|:-----:|
| L14 | `street-card` | Thẻ mini quán: avatar + tên + seasonEarned + rank + cosmetic preview (sign/lantern/plant) + profileViews | DOM card | P3 |
| L15 | `street-card-bg` | Nền thẻ quán theo location (dùng gradient/tint per mặt bằng, không vẽ 10 bản) | DOM bg tint | P3 |
| L16 | `icon-profile-views` | 👁 Lượt xem quán (vanity metric) | Icon 32×32 | P3 |
| L17 | `icon-street-visit` | "Ghé xem quán" — pause ca hiện tại để xem quán bạn | Icon 64×64 | P3 |
| L18 | `emote-set` | 8 emote reactions: 👋😂🔥💪👀🍵❤️💔 (pixel art, không emoji font) | Icon 32×32 ×8 | P3 |
| L19 | `icon-block-user` | Chặn người chơi | Icon 32×32 | P3 |
| L20 | `icon-message-compose` | Soạn tin nhắn + đính kèm quà (gửi cho hàng xóm) | Icon 64×64 | P3 |
| L21 | `street-location-filter` | Dropdown/tab filter theo khu vực (location × Giải Nhậu) | DOM component | P3 |

> **Lưu ý:** Cosmetic items (biển hiệu, lồng đèn, cây cảnh) đã vẽ ở §6 sẽ hiện trên `street-card` — không cần vẽ lại, chỉ scale down.
> **Emote set:** 8 emote dùng pixel-art style, KHÔNG dùng emoji font — để nhất quán visual với game.

**Subtotal Leaderboard & Social: 21 items** (13 icon/badge + 8 UI components; emote-set = 8 sprites đếm 1 entry)

---

## 6. COSMETIC (trang trí quán — Phase 3+)

### 6.1 Biển hiệu — 5 style

| # | Asset | Style | Phase |
|---|-------|-------|:-----:|
| 128 | `sign-wood` | Biển gỗ mộc | P3 |
| 129 | `sign-neon` | Biển neon sáng | P3 |
| 130 | `sign-calligraphy` | Biển thư pháp | P3 |
| 131 | `sign-vintage` | Biển vintage | P3 |
| 132 | `sign-golden` | Biển vàng (cao cấp) | P3 |

### 6.2 Lồng đèn — 4 style

| # | Asset | Style | Phase |
|---|-------|-------|:-----:|
| 133 | `lantern-japanese` | Đèn Nhật | P3 |
| 134 | `lantern-lotus` | Đèn hoa sen | P3 |
| 135 | `lantern-red` | Đèn lồng đỏ | P3 |
| 136 | `lantern-vintage` | Đèn cổ điển | P3 |

### 6.3 Cây cảnh — 4 style

| # | Asset | Style | Phase |
|---|-------|-------|:-----:|
| 137 | `plant-bamboo` | Trúc | P3 |
| 138 | `plant-bonsai` | Bonsai | P3 |
| 139 | `plant-orchid` | Lan | P3 |
| 140 | `plant-succulent` | Sen đá | P3 |

### 6.4 Theme đội tuyển World Cup — grayscale mask + palette

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 141 | `theme-flag-mask` | Cờ trang trí (grayscale, tint bằng palette đội) | P4 |
| 142 | `theme-lantern-mask` | Đèn lồng (grayscale mask) | P4 |
| 143 | `theme-sign-mask` | Biển hiệu (grayscale mask) | P4 |

> **48 đội** dùng **1 bộ mask chung** + palette `{primary, secondary, accent}` per đội → re-hue runtime (Pixi tint). **Không cần vẽ 48 bộ riêng.**

**Subtotal cosmetic: 16 sprites (+ 48 palettes data)**

---

## 7. EVENT & SỰ KIỆN (sprites đặc biệt)

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 144 | `tv-off` | TV quán (tắt — chưa mua bản quyền) | P4 |
| 145 | `tv-on` | TV đang chiếu trận (hiện tỉ số) | P4 |
| 146 | `secret-box` | Két Bia Bí Ẩn Chủ tịch (lootbox) | P2 |
| 147 | `emergency-pack` | Gói cứu trợ hết hàng | P2 |
| 148 | `flyer-bundle` | Tờ rơi quảng cáo (marketing) | P3 |
| 149 | `qr-payment` | Bảng QR chuyển khoản | P1 |
| 150 | `phone` | Điện thoại (shipper order) | P2 |
| 151 | `inspection-badge` | Huy hiệu đội kiểm tra ATTP | P3 |
| 152 | `certificate` | Chứng chỉ vệ sinh (bị thu → icon crossed) | P3 |
| 153 | `prop-celebration` | Prop liên hoan/tiệc mừng (GA3): bó hoa + ruy băng + băng rôn mừng **generic** (không chữ thật) | P3 |

**Subtotal: 10 sprites**

---

## 8. NỀN & CẢNH

| # | Asset | Mô tả | Kích thước | Phase |
|---|-------|-------|-----------|:-----:|
| 154 | `bg-quanbia-default` | Sân quán mặc định (Hẻm Nhỏ) | Full screen canvas | P1 |
| 155 | `bg-quanbia-upgrade` | Sân quán nâng cấp (visual progression) | Full screen canvas | P2 |
| 156-164 | `bg-location-*` | Nền cho 9 mặt bằng khác (Công Trường → Khu Phố Tây) | Full screen canvas | P3 |
| 165 | `bg-rest-illustration` | Cảnh nghỉ/chuyển ca (vẽ tay, không pixel) | Splash | P1 |
| 166 | `bg-login` | Màn đăng nhập/chọn ngôn ngữ | Splash | P1 |
| 167 | `bg-shift-summary` | Nền sổ sách cuối ca | Modal bg | P1 |
| 168 | `bg-loading` | Màn loading (logo + skeleton bar) | Splash | P0 |

**Subtotal: ~15 illustrations**

### 8.1 Thời tiết overlay & particles — thay đổi theo thời tiết (GDD §9)

> Game gốc dùng **tint/filter trên canvas** + **particle system** cho mưa/gió. Background sân quán KHÔNG vẽ riêng 5 bản — dùng **1 nền + overlay/tint** runtime.

**Ambient tint (Pixi ColorMatrixFilter hoặc overlay sprite):**

| # | Asset | Thời tiết | Visual effect | Phase |
|---|-------|----------|--------------|:-----:|
| 169 | `weather-overlay-sunny` | Nắng ☀️ | Sáng, ánh vàng nhẹ, bóng ngắn | P1 |
| 170 | `weather-overlay-hot` | Nóng 🔥 | Hơi nóng bốc (shimmer lines), tint vàng cam | P1 |
| 171 | `weather-overlay-humid` | Oi bức 🥵 | Hơi nước mờ, tint hơi xanh, ẩm ướt | P2 |
| 172 | `weather-overlay-rain` | Mưa 🌧️ | Tối hơn, giọt mưa trên nền, vũng nước | P1 |
| 173 | `weather-overlay-cold` | Lạnh ❄️ | Hơi sương, tint xanh lạnh, hơi thở trắng | P2 |

> **Cách triển khai:** render 1 sprite overlay bán trong suốt (alpha 0.2-0.4) phủ lên `bg-quanbia-*`. Có thể dùng code Pixi filter thay vì sprite.

**Particles thời tiết (Pixi particle emitter — vẽ 1 sprite nhỏ, code loop):**

| # | Asset | Particle | Kích thước | Phase |
|---|-------|---------|-----------|:-----:|
| 174 | `particle-raindrop` | Giọt mưa rơi xiên | 4×16px | P1 |
| 175 | `particle-steam` | Hơi nước/nóng bốc | 16×16px | P2 |
| 176 | `particle-snowflake` | Bông tuyết/sương | 8×8px | P2 |
| 177 | `particle-leaf` | Lá bay gió | 12×12px | P2 |

> Particle render trên **Pixi canvas** (code emitter), không phải DOM/CSS.

**Popup thời tiết (DOM overlay):**

| # | Asset | Mô tả | Phase |
|---|-------|-------|:-----:|
| 178 | `weather-popup-bg` | Nền popup khi bấm icon thời tiết — hiện hệ số (spawn/tip/mất hơi) | P1 |

**Subtotal weather: 5 overlays + 4 particles + 1 popup = 10 sprites**

### 8.2 Gameplay UI overlays — HUD components (GDD §8-§10, catalog §4)

> Các overlay/indicator render trực tiếp trên canvas hoặc DOM, cần vẽ sprite/icon.

| # | Asset | Mô tả | Render | Phase |
|---|-------|-------|-------|:-----:|
| 179 | `rush-banner` | Banner "🔥 GIỜ VÀNG" — nhẹ (vàng) / nặng (đỏ) | DOM overlay | P0 |
| 180 | `rush-countdown-bg` | Nền đếm ngược "Giờ Vàng tới: mm:ss" | DOM | P1 |
| 181 | `tinh-tao-pill` | Pill tím "×1.10" + đồng hồ + glow (10 phút đầu ca) *(gốc: well-rested)* | DOM | P1 |
| 182 | `patience-bar` | Mini-bar trên đầu khách: xanh→vàng→đỏ theo patience% | Canvas sprite | P0 |
| 183 | `freshness-bar` | Mini-bar trên cốc: bọt trắng xẹp dần + cờ vàng ⚠️ | Canvas sprite | P0 |
| 184 | `queue-indicator` | "Hàng đợi X/Y" — sprite/icon cho vị trí chờ ngoài quán | Canvas + DOM | P1 |
| 185 | `shipper-lane` | Làn riêng cho shipper đỗ chờ + icon phone rung | Canvas sprite | P2 |
| 186 | `combo-marker` | Icon combo khi bàn gọi bia+mồi (bonus indicator) | Canvas overlay | P2 |
| 187 | `upgrade-panel-bg` | Nền panel nâng cấp thiết bị (icon hiện tại → kế + giá) | DOM modal bg | P1 |
| 188 | `restock-panel-bg` | Nền panel nhập hàng (icon NL + nút +10/Đầy + kho) | DOM modal bg | P1 |
| 189 | `shift-summary-chart` | Chart/bảng doanh thu cuối ca (bar chart component) | DOM | P1 |
| 190 | `onboarding-spotlight` | Spotlight/coachmark cho tutorial lần đầu | DOM overlay | P2 |
| 191 | `loading-skeleton` | Skeleton screen loading (placeholder shimmer) | DOM | P0 |

**Subtotal gameplay UI: 13 sprites/components**

### 8.3 Feature screens & modal components — audit bổ sung từ F07-F26

> Rà theo `docs/features/F07..F26`: các icon lõi đã có, nhưng một số feature cần **component/screen asset** riêng để designer không bỏ sót khi lên UI production. Các item dưới đây chủ yếu là DOM components/panel backgrounds, không nhất thiết là bitmap sprite.

| ID | Asset | Feature | Mô tả | Loại | Phase |
|---|-------|---------|-------|------|:-----:|
| U01 | `active-hud-topbar` | F24 | Top bar: xu, stamina/ca, weather, Giờ Vàng countdown, beer/cup status | DOM component | P1 |
| U02 | `bottom-action-bar` | F24 | Bottom nav/action bar: Ca, Nhập hàng, Nâng cấp, Xếp hạng | DOM component | P1 |
| U03 | `order-bubble` | F07/F24 | Bubble order trên bàn: số bia, món ăn, trạng thái ready | Canvas/DOM overlay | P1 |
| U04 | `order-ready-checkmark` | F07/F24 | Checkmark khi món/cốc đã sẵn sàng | Icon 32×32 | P1 |
| U05 | `glass-rail` | F24 | Rail đếm clean/dirty/washing, cảnh báo khi thiếu cốc | DOM component | P1 |
| U06 | `toast-stack` | F24 | Toast stack tối đa 3 dòng, ưu tiên cảnh báo gameplay | DOM component | P1 |
| U07 | `table-state-paying` | F24 | Overlay trạng thái bàn đang trả tiền | Canvas overlay | P1 |
| U08 | `table-state-cleaning` | F24 | Overlay trạng thái bàn cần dọn/rửa cốc | Canvas overlay | P1 |
| U09 | `table-state-broken` | F15/F24 | Overlay bàn/ghế hỏng sau gangster/drunk fight | Canvas overlay | P3 |
| U10 | `kitchen-panel` | F11 | Panel bếp: slots, timers, dish queue | DOM panel | P2 |
| U11 | `kitchen-slot` | F11 | Slot nấu món nóng, có progress và trạng thái locked/ready | DOM component | P2 |
| U12 | `prep-timer-ring` | F11 | Timer vòng cho món đang nấu | Canvas/DOM overlay | P2 |
| U13 | `dish-ready-check` | F11 | Check/shine khi món nóng hoàn tất | Icon 32×32 | P2 |
| U14 | `upgrade-card` | F10/F24 | Card nâng cấp: current stat -> next stat, price, lock reason | DOM card | P1 |
| U15 | `upgrade-stat-arrow` | F10 | Mũi tên/chip chỉ số tăng | Icon/DOM | P1 |
| U16 | `upgrade-lock-reason` | F10/F16 | Chip lý do khóa: thiếu xu, thiếu uy tín, thiếu Kết Nối | DOM chip | P1 |
| U17 | `restock-row` | F24 | Row nhập hàng: icon NL, stock/cap, +10, Full | DOM row | P1 |
| U18 | `restock-stock-meter` | F24 | Meter tồn kho/capacity, đổi màu khi đầy/sắp hết | DOM meter | P1 |
| U19 | `closing-ledger-panel` | F24 | Sổ sách cuối ca: doanh thu, tip, phạt, net | DOM panel | P1 |
| U20 | `closing-ledger-row` | F24 | Row ledger có icon + value + delta | DOM row | P1 |
| U21 | `rental-screen` | F14 | Màn thuê mặt bằng: multiplier, tiền kỳ, cọc, break-even | DOM screen | P3 |
| U22 | `location-card` | F14 | Card địa điểm với preview, rent, LP gate, current lease | DOM card | P3 |
| U23 | `lease-timer` | F14 | Timer còn lại của hợp đồng thuê | DOM pill | P3 |
| U24 | `break-even-hint` | F14 | Hint hòa vốn khi thuê mặt bằng | DOM hint | P3 |
| U25 | `life-path-progress-bar` | F13 | Progress tới mốc Đường Lên Trùm kế tiếp | DOM progress | P3 |
| U26 | `life-path-reward-ladder` | F13 | Ladder thưởng Đường Lên Trùm: claimed/claimable/locked | DOM component | P3 |
| U27 | `gate-tooltip` | F13/F14/F16 | Tooltip giải thích gate bị khóa | DOM tooltip | P3 |
| U28 | `risk-modal` | F15 | Modal sự kiện rủi ro chung: gangster/inspection/drunk/theft | DOM modal | P3 |
| U29 | `inspection-quiz-card` | F15 | Card câu hỏi kiểm tra ATTP/trật tự, 2 lần thử | DOM card | P3 |
| U30 | `gangster-modal` | F15/F18 | Modal gangster: threat, outcome estimate, dog chance | DOM modal | P3 |
| U31 | `dog-panel` | F18 | Panel chó: level, status, captured timer, upgrade CTA | DOM panel | P3 |
| U32 | `referral-screen` | F16 | Screen code/link, progress milestone, claim buttons | DOM screen | P3 |
| U33 | `badge-inventory-card` | F16 | Card huy hiệu equipped/displayed/locked hint | DOM card | P3 |
| U34 | `vip-table-lock-panel` | F16/F10 | Panel giải thích đường free mở bàn VIP | DOM panel | P3 |
| U35 | `quest-mission-card` | F17 | Card nhiệm vụ compact progress + reward | DOM card | P2 |
| U36 | `quest-progress-ring` | F17 | Ring tiến độ nhiệm vụ | DOM/SVG component | P2 |
| U37 | `reward-claim-button` | F17/F13 | Button nhận thưởng có trạng thái claimable/claimed | DOM component | P2 |
| U38 | `ai-assistant-panel` | F22 | Panel trợ lý AI, không che bàn nguy cấp | DOM panel | P3 |
| U39 | `ai-quota-pill` | F22 | Pill quota/lượt hỏi còn lại | DOM pill | P3 |
| U40 | `ai-suggestion-card` | F22 | Card gợi ý nâng cấp/ưu tiên theo state | DOM card | P3 |
| U41 | `language-select-screen` | F25 | First-run language screen VI/EN | DOM screen | P1 |
| U42 | `login-prompt` | F25/F26 | Prompt đăng nhập để lưu tiến trình/đua top/thanh toán | DOM modal | P1 |
| U43 | `guest-progress-claim` | F25 | Màn claim/migrate guest progress | DOM screen | P2 |
| U44 | `account-conflict-screen` | F25 | Màn xử lý Google account đã có progress | DOM screen | P2 |
| U45 | `leaderboard-lock-prompt` | F25 | Prompt khóa leaderboard cho guest | DOM modal | P3 |
| U46 | `payment-lock-prompt` | F25/F26 | Prompt khóa payment cho guest | DOM modal | P3 |
| U47 | `session-gate-panel` | F26 | Gate số ca/ngày: used, free limit, paid unlock | DOM panel | P3 |
| U48 | `session-pass-product-card` | F26 | Card day/week pass, giá, quyền mở ca | DOM card | P3 |
| U49 | `checkout-screen` | F26/F20 | Màn checkout/payment instructions | DOM screen | P3 |
| U50 | `payment-status-card` | F26/F20 | Pending/success/failed/refunded status | DOM card | P3 |
| U51 | `donation-gift-picker` | F20 | Chọn quà cosmetic-only sau donation | DOM screen | P4 |
| U52 | `donation-thank-you` | F20 | Màn cảm ơn supporter, không P2W copy | DOM screen | P4 |
| U53 | `lottery-result-screen` | F21 | Kết quả vé số với nguồn/ngày rõ ràng | DOM screen | P4 |
| U54 | `lottery-disabled-legal-gate` | F21 | Disabled/legal review gate cho lottery | DOM panel | P4 |
| U55 | `wc-match-card` | F19 | Match card: hai đội generic, giờ, trạng thái broadcast | DOM card | P4 |
| U56 | `wc-broadcast-notification` | F19 | Ambient notification khi trận bắt đầu | DOM toast/banner | P4 |
| U57 | `season-shop-card` | F19 | Card item shop Vụ Bia: TV, lịch, theme, bundle | DOM card | P4 |
| U58 | `team-theme-card` | F19 | Card theme đội tuyển generic palette/mask preview | DOM card | P4 |
| U59 | `connection-status-pill` | F23 | Online/reconnecting/offline status | DOM pill | P1 |
| U60 | `server-sync-error` | F23 | Banner lỗi sync/authoritative reject | DOM banner | P1 |
| U61 | `captcha-panel` | F23 | Panel CAPTCHA/chống bot khi server yêu cầu | DOM panel | P3 |
| U62 | `profile-summary-card` | F23/F25 | Profile read model: name, guest/account, Giải Nhậu, ĐLT | DOM card | P2 |

**Subtotal feature screens/components: 62 entries**

### 8.4 Sound assets (audio — không phải sprite, nhưng cần liệt kê)

> Game gốc dùng Web Audio API. Bia hơi giữ triết lý **nhẹ, chill**, thêm sfx đặc trưng.

| # | Asset | Loại | Mô tả | Phase |
|---|-------|------|-------|:-----:|
| S1 | `ambient-bia-hoi.ogg` | BGM | Nhạc nền lofi/chill quán nhậu, loop | P1 |
| S2 | `sfx-pour-beer.ogg` | SFX | Tiếng rót bia (sủi bọt) | P1 |
| S3 | `sfx-glass-clink.ogg` | SFX | Tiếng cụng ly "Dô!" | P1 |
| S4 | `sfx-wash.ogg` | SFX | Tiếng rửa cốc (nước chảy) | P1 |
| S5 | `sfx-coin.ogg` | SFX | Tiếng xu rơi/nhận tiền | P0 |
| S6 | `sfx-serve.ogg` | SFX | Tiếng bưng đồ (đặt đĩa) | P1 |
| S7 | `sfx-rush-start.ogg` | SFX | Tiếng kẻng/chuông báo Giờ Vàng | P1 |
| S8 | `sfx-customer-leave.ogg` | SFX | Tiếng thở dài/bước chân (khách bỏ đi) | P2 |
| S9 | `sfx-upgrade.ogg` | SFX | Tiếng ding nâng cấp thành công | P1 |
| S10 | `sfx-rain.ogg` | Ambient | Tiếng mưa rơi (loop khi mưa) | P2 |
| S11 | `ambient-gossip.ogg` | BGM | Giọng radio "loa phường" khi nghỉ | P3 |

**Subtotal sound: 11 audio files**

---

## 9. ANIMATION FRAMES (chỉ liệt kê cần vẽ frame — animation code khác)

| # | Animation | Frames cần | Mô tả | Phase |
|---|-----------|:----------:|-------|:-----:|
| A1 | Rót bia | 3-4 | Vòi → cốc → bọt dâng | P0 |
| A2 | Rửa cốc | 3 | Cốc vào bồn → bong bóng → sạch | P1 |
| A3 | Nấu bếp | 3 | Chảo/nồi → khói → món xong | P2 |
| A4 | Cốc bọt xẹp | 3 | Bọt đầy → xẹp → cờ vàng | P0 |
| A5 | Chairman reveal | 4 | Chí Phèo → khói → đại gia | P2 |
| A6 | Chó attack | 3 per level | Chó vồ côn đồ | P3 |
| A7 | Gangster arrive | 2-3 | Côn đồ xuất hiện | P3 |
| A8 | Mưa | Particle | Giọt mưa (canvas particle — code, không vẽ frame) | P2 |
| A9 | Floating +xu | 1 | Số xu nổi lên (+40) — code animation | P0 |
| A10 | Floating +tip | 1 | Số tip nổi lên (khác màu xu) | P0 |

**Subtotal: ~25 frames**

---

## 10. TỔNG HỢP & ƯU TIÊN

### Đếm theo phase

| Phase | Sprites | Icons | Illustrations | Overlays/UI | Audio | Anim frames | Tổng |
|:-----:|--------:|------:|:-------------:|:-----------:|:-----:|:-----------:|-----:|
| **P0** (placeholder OK) | ~17 | ~6 | 1 | ~4 | 1 | ~8 | **~37** |
| **P1** (art thật) | ~80 | ~34 | ~4 | ~33 | 7 | ~6 | **~164** |
| **P2** | ~58 | ~25 | ~1 | ~16 | 2 | ~10 | **~112** |
| **P3** | ~32 | ~58 | ~9 | ~33 | 1 | ~6 | **~139** |
| **P4** | ~8 | ~10 | 0 | ~8 | 0 | 0 | **~26** |
| **Tổng** | **~195** | **~133** | **~15** | **~94** | **11** | **~30** | **~478** |

> So sánh: game gốc (trà đá) có **236 file asset**. Bia hơi full production cần **~478** nếu làm đủ customer skins, meta/leaderboard/social icons, feature screens, overlays, UI, audio. MVP nên gen theo priority, không cần làm hết một lượt.

### Ưu tiên vẽ (Phase 0 → P1)

```
1. Cốc bia × 5 states        ← bottleneck lõi, cần ngay cho prototype
2. Icon menu 3 món P0         ← bia + lạc + nem chua
3. Icon HUD cơ bản            ← xu, thể lực, uy tín, Giờ Vàng
4. Bàn lv1 + ghế              ← 1 bàn + ghế plastic cho prototype
5. Floating numbers            ← +xu, +tip (1 frame mỗi loại)
───── Phase 0 done ─────
6. Chủ quán × 3 thời tiết     ← nhân vật chính
7. Khách 10 face × 3          ← 30 sprites khách core
8. Customer skins P1 × 6       ← runner, cầu lông, pickleball, văn phòng, công nhân, sinh viên
9. Missing icons P1            ← account + bottleneck + archetype badges P1
10. Bàn lv2 + thiết bị lv1-3   ← visual progression bắt đầu
11. Nền sân quán               ← background chính
12. Nền nghỉ/login             ← splash screens
```

---

## 11. NAMING CONVENTION

```
{category}-{name}[-{variant}][-{state}]

Ví dụ:
  glass-clean
  glass-full
  glass-stale
  table-lv1-empty
  table-lv1-overdue
  table-lv1-enjoying
  customer-normal-hot
  customer-vip-cold
  keg-lv3
  washer-lv2
  icon-coin
  icon-weather-rain
  sign-neon
  lantern-lotus
  theme-flag-mask
  bg-quanbia-default
```

---

## Changelog (append-only)

| Ver | Thay đổi |
|-----|----------|
| v0.7 | **Rebrand thuật ngữ bia hơi (cascade từ `item-list-upgrade-levels.md` v1.4):** League → Giải Nhậu (8 icon: Cốc Nhựa→Trùm Bia Hơi), Life Path → Đường Lên Trùm (8 icon: Bưng Bê→Trùm Bia Hơi), Đền Thiêng → Bàn Thờ Ông Địa, well-rested → Tỉnh Táo. Cập nhật asset filenames (icon-league-1..8, icon-dlt-lp0..7, tinh-tao-pill). |
| v0.6 | Audit toàn bộ `docs/features/F07..F26`; bổ sung §8.3 Feature screens & modal components (62 entries): active HUD top/bottom, order bubble/checkmark, glass rail, toast stack, table overlays paying/cleaning/broken, kitchen panel/slots/timers, upgrade/restock/closing ledger rows, rental/location/lease UI, Đường Lên Trùm ladder, risk/inspection/gangster/dog panels, referral/badge/VIP lock, quest cards, AI panel/quota/suggestion, localization/login/guest conflict, session gate/checkout/payment status, donation gift flow, lottery result/legal gate, World Cup match/shop/theme cards, server connection/sync/captcha/profile components. Cập nhật tổng ~416→~478. |
| v0.5 | Bổ sung §5.3 Leaderboard & Social UI (21 items): leaderboard entry card, my-rank highlight, Giải Nhậu tab, empty state, Vụ Bia header/banner, champion crown, medals top3/top10, season type icons (Placement/Conquest), reward preview, reputation-season; Dạo Phố: street card, card bg tint, profile views, street visit, 8 emote pixel-art set, block user, message compose, location filter. Cập nhật tổng ~395→~416. |
| v0.4 | Bổ sung §2.2.1 Customer visual archetypes: runner, badminton, pickleball, office worker, công nhân, sinh viên, hội chị em, bợm nhậu, 3 kiểu say xỉn, retiree, cyclist, tourist, foodie, football fan/ultra, shipper bike. Thêm §5.1 archetype badges (15 icon) và §5.2 missing system icons (63 icon) cho World Cup, mặt bằng/rent, Giải Nhậu, Đường Lên Trùm, referral, quest, gift, lottery, risk, dog items, account/login, payment/session pass/donation, upgrade recommendation. Cập nhật tổng full production lên ~395 asset/audio/frame entries. |
| v0.3 | Bổ sung 3 section mới: §8.1 Weather overlays & particles (5 ambient tint + 4 particle sprites + 1 popup = 10), §8.2 Gameplay UI overlays (13 components: rush banner, Tỉnh Táo pill, patience/freshness bars, queue indicator, shipper lane, upgrade/restock panels, shift summary chart, onboarding, loading skeleton), §8.3 Sound assets (11 audio: 2 BGM + 9 SFX). Thêm `bg-loading`. Cập nhật tổng từ ~234 lên ~270. Thêm cột Overlays/UI + Audio vào bảng tổng hợp. |
| v0.2 | Chốt AI generation contract: size/export, palette hex, global prompt, prompt template, batch rule, QA checklist, modifier theo nhóm. Đồng bộ bàn 5 states với item-list, chuyển `table-lv1` sang P0, thêm `dog-captured`, cập nhật tổng asset ~234. |
| v0.1 | Danh sách đầu: ~228 asset (143 sprites + 42 icons + 13 illustrations + 30 animation frames), phân phase P0-P4, naming convention, ưu tiên vẽ. Gom từ GDD v1.5 §2/§4/§5/§6/§7/§13/§14/§17, `design-component-catalog-trumviahe.md`, `05-SPEC-design-uiux.md`. |

*Nguồn: `02-GDD-trum-bia-hoi.md` v1.5, `design-component-catalog-trumviahe.md`, `05-SPEC-design-uiux.md`.*
