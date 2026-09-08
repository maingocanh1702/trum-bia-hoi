# 🧮 SPEC — Economy Constants & Formulas — Trùm Bia Hơi (v1.2.7)

> **Tương ứng với `economy-spec-from-bundle.md` của game gốc**, nhưng cho Trùm Bia Hơi: **mọi hằng số & công thức gom về một chỗ**, dev cầm là code được. Bản máy đọc: **`docs/config/economy.tbh.json`** (cùng số, cùng tên trường). Script kiểm số Phase 0 khớp prototype: `python3 scripts/check_economy_config.py`.
> Ngày: 2026-09-08. Nguồn: `02-GDD-trum-bia-hoi.md` v1.8 (thắng khi mâu thuẫn) · `03-SPEC-he-ban.md` · `04-SPEC-prototype-phase0.md` · `07-SPEC-shop-mua-giai-worldcup.md` · `docs/features/F07–F26` · `docs/item-list-upgrade-levels.md` v1.4 · `economy-spec-from-bundle.md` (số gốc trumviahe) · `prototype/src/engine/constants.ts` (số đang chạy).
> Nhãn: 🟢 CORE (không đổi) · 🟡 TUNE (số khởi điểm, chỉnh bằng playtest/sim, đổi trong JSON không cần sửa spec) · 🔵 làm sau cùng nhưng **vẫn trong scope 1 phase** (founder 09/09, `00-HANDOFF` §4) — đã có số để không mơ hồ.
> **Từ v1.2 — mọi số trong doc này là CONFIG, không hardcode:** JSON là *seed* của Config Registry trong admin (`trum-bia-hoi-brd-admin.md` §5.2); production đổi số qua admin, không deploy. Bảng key → tier/role/effectiveAt ở §22.

---

## 0. Quy ước đọc số — ĐỌC TRƯỚC

1. **Hệ số `k` = 2.5** (🟡, đo lại được; xem §1). Mọi giá trị **xu** và **uy tín-thưởng/uy tín-giá** trong doc này ghi ở dạng **base** (số gốc trumviahe hoặc số base bia hơi) và **×k** (số hiển thị trong game). Trong JSON, trường kết thúc bằng `Base` được nhân `k` lúc load; trường thời gian/hệ số/xác suất **KHÔNG** nhân.
2. **Không nhân k:** mọi thời gian (ms), mọi hệ số nhân (mult), %margin, tip 30%/vách 60%, weight khách, số lượng (cốc, ghế, slot), uy tín cộng theo lượt phục vụ (+3/+1) và trừ khi mất khách (−5/khách).
3. **Có nhân k:** giá món & vốn (đã là số bia hơi, xem §2 — không nhân thêm), giá nâng cấp, rent/cọc, phạt, thưởng nhiệm vụ/mốc (xu **và** uy tín-thưởng), ngưỡng Giải Nhậu/Đường Lên Trùm, trần ngày, giá shop, giá vé số, phí/thưởng bảo kê, giá uy tín (kick, ghế tựa, tờ rơi, biển vàng).
4. **Menu (§2) là số bia hơi đã chốt, KHÔNG nhân k** — k được **suy ra** từ menu (k = giá trị/lượt ÷ 82.5), nên nhân k vào menu là đếm hai lần.
5. Khi doc này và JSON lệch nhau → **JSON là nguồn chạy**, sửa doc cho khớp (append changelog). Khi JSON lệch GDD về *quyết định* (không phải số) → GDD thắng.
6. Cột "Gốc" = trumviahe (để truy vết). Cột "Nguồn" = doc bia hơi đã chốt số đó.
7. **Không hardcode (quyết định founder 08/09):** *mọi* giá trị trong doc này — kể cả 🟢 CORE như `K_ANCHOR`, thời gian ca, số ca/ngày — đều là **config đọc từ Config Registry** (admin) theo `configVersion` ghi vào từng ca; code chỉ giữ schema + default fallback để chạy offline/test. 🟢 nghĩa là "thiết kế không đổi", **không** nghĩa là "được ghi cứng vào code". Key = đường dẫn trong `docs/config/economy.tbh.json`; tier/role/thời điểm hiệu lực ở §22; cơ chế server ở `10-SPEC` §7.

---

## 1. Hệ số k & bất biến đo

| Hằng số | Giá trị | Nhãn | Ghi chú |
|---|--:|:--:|---|
| `K_ANCHOR` (giá trị/lượt trà đá gốc) | **82.5 xu** | 🟢 | KHÔNG đổi (GDD §3, 04 §5) |
| `k` (hệ số rescale) | **2.5** | 🟡 | Giả định GDD §3. **Đo được trong prototype (5 seed, 3 món): 2.24–2.34** — trong band. Sẽ đo lại khi đủ 6 món (F11 §6). |
| Band chấp nhận | 2.0–3.0 | 🟢 | ngoài band → đổi số k, KHÔNG đổi cách tính |
| Cách tính k | `k = mean(payment + tip) / 82.5` trên ≥500 lượt served | 🟢 | **Throughput (bàn/đợt/thiết bị) KHÔNG bao giờ vào k** (04 §5) |
| Bất biến giữ khi rescale | "số lượt phục vụ để chạm trần ngày" ≈ 2.420 lượt | 🟢 | 500k ÷ 207 ≈ 2.420 (GDD §3) |

---

## 2. Menu — 6 món (Lớp 1: unit economy) 🟢 danh mục · 🟡 số

Giá **xu bia hơi đã chốt** (neo 1 xu ≈ 300 VND; bia cốc 50 xu ≈ 15k). `id` = tên dùng trong code (`prototype/src/engine/types.ts` đang dùng `bia|lac|nem`).

| id | Món | Giá bán | Vốn sỉ/đv | Vốn lẻ/đv 🟡 | Margin | Lời/đv | Cần cốc | Prep | Trạm | Mở khoá | Phase |
|---|---|--:|--:|--:|--:|--:|:--:|--:|---|---|:--:|
| `bia` | Bia hơi (cốc) | **50** | 10 | 12 | 80% | 40 | ✅ | 3.000ms | `tap` | từ đầu | P0 |
| `lac` | Lạc (đậu phộng) | 75 | 26 | 31 | 65% | 49 | ❌ | 0 | `instant` | từ đầu | P0 |
| `nem` | Nem chua | 150 | 60 | 72 | 60% | 90 | ❌ | 0 | `instant` | từ đầu | P0 |
| `dau` | Đậu tẩm hành | 100 | 45 | 54 | 55% | 55 | ❌ | 8.000ms 🟡 | `kitchen` | Bếp Lv1 | P2 |
| `topmo` | Tóp mỡ Triều Khúc | 165 | 82 | 98 | 50% | 83 | ❌ | 10.000ms 🟡 | `kitchen` | Bếp Lv1 | P2 |
| `long` | Lòng xào dưa | **280** | 155 | 186 | 45% | 125 | ❌ | 15.000ms 🟡 | `kitchen` | Bếp Lv2 | P2 |

**Nguyên liệu (kho) — mỗi món 1 nguyên liệu tương ứng, mua theo lô 10** (giữ cơ chế `unitPrice`/`bulkPrice` gốc, chiết khấu sỉ ~17%):

| Nguyên liệu | id kho | unitPrice (lẻ) 🟡 | bulkPrice (+10) | Cap kho | Tiêu hao |
|---|---|--:|--:|---|---|
| Bia (thùng, tính theo cốc) | `bia` | 12 | 100 | theo Quầy/Kho (§8.4) | 1/cốc rót |
| Lạc | `lac` | 31 | 260 | Quầy | 1/đĩa |
| Nem chua | `nem` | 72 | 600 | Quầy | 1/đĩa |
| Đậu | `dau` | 54 | 450 | Quầy | 1/đĩa |
| Tóp mỡ | `topmo` | 98 | 820 | Quầy | 1/đĩa |
| Lòng + dưa | `long` | 186 | 1.550 | Quầy | 1/đĩa |

- Nút **"+10"** = `bulkPrice`. Nút **"Đầy"** = `⌊thiếu/10⌋ × bulkPrice + (thiếu mod 10) × unitPrice` (gốc §3).
- **Quà nguyên liệu tràn kho → tự đổi xu theo `unitPrice`** (GDD §2, luật chung cho mọi quà).
- 🟡 **Đá lạnh KHÔNG phải nguyên liệu tiêu hao** ở Trùm Bia Hơi (Hầm lạnh thay cơ chế "đá tan"). Mọi chỗ gốc dùng "đá/kẹo" làm vật liệu (chó, thùng hàng) ánh xạ sang `lac`/`nem` (§12, §14). Nếu sau này muốn có đá cho mồi đặc thù → thêm vào JSON, không đổi spec.
- **Demand-mix (xác suất gọi món) — 🟡 giả định prototype, đo lại:** mỗi khách luôn gọi 1 `bia`; `P_MOI = 0.85` gọi kèm 1 mồi; trong số đó `P_NEM_GIVEN_MOI = 0.65` nem / 0.35 lạc (P0). Phase 2 (6 món): 0–2 mồi/đợt; nhóm ngồi lỳ / cổ vũ / có VIP thiên về mồi nóng (F11 §6). Đợt 2: `P_SECOND_ROUND = 0.35` (nhóm thường), vội = 0, ngồi lỳ = 3–5 đợt (03 §2).

---

## 3. Spawn, patience, enjoy, nhóm & sức chứa (Lớp 2) 🟢 cơ chế · 🟡 số

| Hằng số | Giá trị | Gốc | Nguồn | Ghi chú |
|---|--:|--:|---|---|
| `SPAWN_BASE_MS` | **10.500** | 10.500 | 04 §4 | nhịp **mỗi khách**; nhóm N người tiêu N nhịp (fix 2026-07-15) |
| `SPAWN_WARMUP_MULT` | 1.6 | 1.6 | 04 §4 | lượt đầu ca = 16.800ms |
| `spawnEffective` | `max(base × weather.spawnMult × rush.spawnMult × marketing.spawnMult, rush.floorMs)` | — | F08 §5 | |
| `PATIENCE_THUONG_MS` | **18.000** | 18.000 | 04 §4 | × weather.patienceMult × type.patienceMult |
| `PATIENCE_RUSH_MULT` (vội/VIP) | 0.611 | 0.611 | F07 | ≈ 11.000ms |
| `ENJOY_MIN/MAX_MS` | 5.000–10.000 | 5–10s | 04 §4 | × type.enjoyMult (ngồi lỳ ×10 → 50–100s) |
| Cỡ nhóm | P0: 1–2 · P1+: 1..capacity(bàn) | 1 (ghế đơn) | 03 §7 | random đều 🟡 |
| Một-bàn-một-nhóm | bàn chỉ nhận nhóm khi `EMPTY` | — | 03 §1 | 🟢 |
| Order.patienceMs | `min(patience các khách trong nhóm)` lúc gọi | — | 03 §4 | 🟢 |
| `QUEUE_SLOTS` | `2 + ⌊Σcapacity / 3⌋` | 2+⌊ghế/3⌋ | 03 §1 | P0: 3 bàn × 2 = 6 → **4** slot |
| Queue patience | `min(patience nhóm)` từ lúc xếp hàng | — | engine.ts | quá → cả nhóm bỏ (đếm `lostCustomers`) |
| Overflow | hết bàn + hết queue → từ chối tại cửa (`rejectedAtDoor`), **không phạt** | ✓ | 03 §8 | 🟢 |
| Grace window `graceMs` | 2.000–3.000 🟡 (**P0/P1 chưa bật** = 0) | — | 03 §9 | Phase 1 bật; serve nhận cả `pending` lẫn `grace_leaving` |
| Bàn cấp/capacity | Lv1 2 · Lv2 4 · Lv3 6 · Lv4 8–10 | ghế 4→10 | 03 §6 | giá §8.6 |

**Sàn spawn khi Giờ Vàng** (`rush.floorMs`): xem §6. **Trần tay người chơi gốc ≈ 0,73–0,74 lượt/giây** (đo live) — mốc để cân throughput.

---

## 4. Loại khách (Lớp 3: demand-mix) — F07

| id | Tên hiển thị | Weight | patience× | enjoy× | tip× | phạt× | Trả tiền | Dùng bàn/cốc | Phase |
|---|---|--:|--:|--:|--:|--:|:--:|:--:|:--:|
| `thuong` | Dân nhậu | 1.0 | 1.0 | 1.0 | 1 | 1 | ✅ | ✅/✅ | P0 |
| `voi` | Làm ly nhanh | 0.3 | 0.611 | 0.8 | 1 | 1 | ✅ | ✅/✅ | P0 |
| `vip` | Khách sộp / sếp bao mâm | 0.1 | 0.611 | 1.0 | **10** | **10** | ✅ | ✅/✅ | P0 |
| `chipheo` | Khách quậy / xỉn không trả | 0.03 | 5.0 | 5.0 | 0 | 0 | ❌ (payment 0) | ✅/✅ | P2 |
| `ngoily` | Bàn lai rai (ngồi lỳ) | 0.1 | 1.0 | **10** | 1 | 1 | ✅ | ✅/✅ | P2 |
| `shipper` | Ship bia/mồi | timer ~220s | 45.000ms cố định | 0 | 0 | 0.5 × gross | net = gross × 0.75 | ❌/❌ | P2 |
| `football_fan` | Nhóm cổ vũ | event | 1.0 | 2.0–4.0 🟡 | 1 | 1 | ✅ | ✅/✅ | P4 |

- Xác suất VIP nền (không biển) = 0.1/1.53 = **6,5%**; biển Gỗ ×2 → 12,3%; Hoàng kim ×3 → 17,3% (§10).
- Thời tiết nhân weight: humid `chipheo ×1.5`; rain `ngoily ×2` (§5). Rush nhân weight `voi` (§6).
- 🟡 Phase 2: tối đa **1 VIP/nhóm** (F07 §4) cho tới khi phạt cụm cân xong.
- Shipper: spawn base **220.000ms** × weather.shipperMult; đơn 4–7 món gross 180–290 **×k** 🟡; cần **Điện thoại** (§11); không đóng ca khi đơn đang chạy.
- **Prototype đang chạy 3 loại** (`CUSTOMER_WEIGHTS` = {thuong 1.0, voi 0.3, vip 0.1}).

---

## 5. Thời tiết (lớp hệ số) — F09 🟡

Phân bố weight 35/20/10/20/15 (roll 1 lần khi mở ca; server-side từ Phase 3).

| id | Tên | Weight | Độ hơi× (freshness) | patience× | tip× | spawnInterval× | shipper× | Weight khách đặc biệt | Copy HUD |
|---|---|--:|--:|--:|--:|--:|--:|---|---|
| `sunny` | Nắng | 35 | 1.00 | 1.00 | 1.00 | 1.00 | 1.0 | — | "Đẹp trời, bán đều tay" |
| `hot` | Nóng | 20 | **0.67** | 1.00 | 1.15 | 0.95 | 1.5 | — | "Nóng — bia bay hơi nhanh, khách boa đậm" |
| `humid` | Oi bức | 10 | **0.50** | 0.75 | 1.20 | 0.90 | 2.0 | `chipheo ×1.5` | "Oi bức — khách cáu, bia mất hơi cực nhanh" |
| `rain` | Mưa phùn | 20 | 1.05 | 1.15 | 1.00 | 1.10 | 3.0 | `ngoily ×2` | "Mưa — vắng khách, nhiều ship, khách ngồi dai" |
| `cold` | Lạnh | 15 | 1.20 | 1.00 | 0.95 | 1.20 | 0.8 | — | "Lạnh — bia hơi ế, mồi nóng bán chạy" 🟡 |

- Đây là **bảng đã đảo cho bia hơi** (GDD §9 chốt "lạnh = ít uống hơn", khác trà đá "lạnh không cần đá"). Số gốc trumviahe (hot: spawn 1.15/patience 0.85; cold: spawn 0.9/patience 0.8; snack× 0.4/0.25/1/1.5) **không dùng** — giữ ở `economy-spec-from-bundle.md` §5 để truy vết.
- Phase 1 chỉ bật `sunny/hot/rain` (F09 §1). Overlay tint theo thời tiết: `docs/design-tokens.md` §4.

---

## 6. Giờ Vàng (rush) — F08 🟡

| id | Tên | Kéo dài | spawnInterval× | Sàn (`floorMs`) | pay× | tip× | phạt× | weight `voi`× | Phase |
|---|---|--:|--:|--:|--:|--:|--:|--:|:--:|
| `none` | Nhịp thường | — | 1.00 | 10.500 | 1.00 | 1.00 | 1.0 | 1 | P0 |
| `peak` (P0 only) | Cao điểm (toggle) | tay | **0.66** | — | 1.00 | 1.00 | 1.0 | 1 | P0 |
| `light` | Giờ Vàng nhẹ | 90s | 0.35 | 1.000 | 1.05 | 1.10 | 1.8 | 2 | P1 |
| `heavy` | Giờ Vàng nặng | 150s | 0.20 | 700 | 1.10 | 1.18 | 2.5 | 3 (+enjoy ×1.15) | P2 |
| `lunch_light` | Cao điểm trưa | 90s | 0.45 | 1.000 | 1.03 | 1.05 | 1.5 | 2.5 | P2 |
| `football` | Giờ Vàng xem bóng | theo suất chiếu | 0.20–0.35 | 700 | 1.10 | 1.18 | 2.5 | cổ vũ | P4 |

- **Lịch:** seed theo `locationId + shiftId + dayBucket`; **2 đợt/ca** định sẵn 🟡; không rush trong 30s đầu ca; **telegraph 20s trước** (gốc 45–60s) hiện loại + ETA (F08 §4). Ưu tiên khi trùng: inspection/gangster > football > heavy > light.
- **Stacking:** payment/tip/penalty nhân theo chuỗi `base → location → rush → weather → type`; spawn theo công thức §3. Throughput do rush **không vào k**.
- Prototype: `PEAK_SPAWN_MULT = 0.66` (feel test, nhẹ hơn heavy thật).

---

## 7. Độ hơi bia (freshness) — GDD §6 🟢 cơ chế · 🟡 số

| Hằng số | Giá trị | Nguồn |
|---|--:|---|
| `FRESHNESS_MS` (cốc, Hầm Lv1) | **12.000** | 04 §4 |
| `FRESHNESS_WARN_MS` (cờ vàng) | 9.000 (75%) | 04 §4 |
| Theo cấp Hầm lạnh | L1 12s · L2 20s · L3 35s · L4 60s · L5 ∞ | GDD §6, §8.3 |
| Thời tiết | × `weather.freshnessMult` (§5) | F09 |
| Bom đã mở `kegFreshnessMs` (tầng 2, 🔵 optional) | L1 4' · L2 6' · L3 9' · L4 15' · L5 ∞ | item-list §4 |
| Hậu quả MVP (mềm) | giao cốc quá hạn: **tip ×0 + uy tín −1**, vẫn thu payment | GDD §6 |
| Hậu quả 🔵 gắt (post-MVP) | khách từ chối / mất payment — chỉ bật sau khi economy ổn | GDD §6 |
| Cốc đã rót khi Order expire | → `dirty` (mất công rót + 1 vòng rửa) | 03 §8 |

`freshnessOk = (now − pouredAt) ≤ FRESHNESS_MS × weather.freshnessMult` tại **thời điểm giao**. Freshness tính **theo từng cốc**; Order chỉ giao khi mọi món `ready` (cốc stale vẫn giao được — chỉ mất tip).

---

## 8. Nâng cấp (sink chính) — F10 + item-list

Giá hiển thị = `round(priceBase × k)`. Mua bằng `coins`, không giảm `seasonEarned`. **Phase 1: nâng cấp chỉ ngoài ca** (F10 §4). Mỗi cấp đổi sprite (Phase 2).

### 8.1 Bom bia + vòi rót (`keg`) — thay Ấm tích 🟡

| Lv | Tên | priceBase | ×k | Vòi (`pourSlots`) | `pourMs` | Bom: `kegStorage` / `batch` / `refillMs` (P2) |
|:--:|---|--:|--:|:--:|--:|---|
| 1 | Bom nhựa + vòi tay | 0 | 0 | 1 | 3.000 | 3 / 1 / 15.000 |
| 2 | Bom inox nhỏ | 3.000 | 7.500 | 1 | 2.700 | 5 / 2 / 13.000 |
| 3 | Bom inox lớn | 12.000 | 30.000 | 2 | 2.400 | 8 / 3 / 11.000 |
| 4 | Hệ thống áp suất | 50.000 | 125.000 | 2 | 2.100 | 18 / 6 / 8.000 |
| 5 | Trạm rót công nghiệp | 200.000 | 500.000 | 3 | 1.800 | 40 / 12 / 6.000 |

- **Chốt hai lớp:** `pourSlots/pourMs` (F10) là lớp **Phase 0–1** (prototype có 1 vòi × 3.000ms, không có bom-refill). `kegStorage/batch/refillMs` (item-list §2, ánh xạ ấm tích gốc) là lớp **Phase 2** khi có kho: vòi chỉ rót khi bom còn bia; bom tự châm từ kho theo batch. Bật/tắt bằng `keg.refillEnabled`.

### 8.2 Bồn rửa cốc (`washer`) 🟢 số gốc

| Lv | Tên | priceBase | ×k | `washMs` | `slots` |
|:--:|---|--:|--:|--:|:--:|
| 1 | Chậu nhôm | 0 | 0 | 7.000 | 1 |
| 2 | Chậu đôi | 2.500 | 6.250 | 5.000 | 1 |
| 3 | Bồn rửa inox | 10.000 | 25.000 | 4.000 | 2 |
| 4 | Máy rửa bán tự động | 40.000 | 100.000 | 2.500 | 3 |
| 5 | Máy rửa công nghiệp | 150.000 | 375.000 | 1.500 | 5 |

Prototype: `WASH_BASE = {1, 7000}`, `WASH_UPGRADED = {3, 2500}` (= Lv4, toggle đo gate).

### 8.3 Hầm / tủ giữ lạnh (`cooler`) — thay Thùng đá

| Lv | Tên | priceBase | ×k | Freshness cốc | Freshness bom (🔵) |
|:--:|---|--:|--:|--:|--:|
| 1 | Thùng xốp + đá | 0 | 0 | 12s | 4' |
| 2 | Thùng inox + đá | 2.000 | 5.000 | 20s | 6' |
| 3 | Tủ mát mini | 8.000 | 20.000 | 35s | 9' |
| 4 | Tủ lạnh bàn | 30.000 | 75.000 | 60s | 15' |
| 5 | Hầm lạnh | 100.000 | 250.000 | ∞ | ∞ |

### 8.4 Quầy / kho (`stall`) — sức chứa nguyên liệu

| Lv | Tên | priceBase | ×k | Cap mỗi nguyên liệu | Gate mở |
|:--:|---|--:|--:|--:|---|
| 1 | Bàn bày | 0 | 0 | 15 | — |
| 2 | Kệ nhôm | 1.000 | 2.500 | 25 | — |
| 3 | Tủ kệ inox | 5.000 | 12.500 | 45 | **mở Biển hiệu** (§10) |
| 4 | Quầy bar mini | 20.000 | 50.000 | 80 | — |
| 5 | Quầy bar cao cấp | 80.000 | 200.000 | 150 | — |

### 8.5 Bếp (`kitchen`) — MỚI, mở mồi nóng 🟡

| Lv | Tên | priceBase | ×k | Slot | Prep× | Mở món |
|:--:|---|--:|--:|:--:|--:|---|
| 0 | (chưa có bếp) | — | — | 0 | — | — |
| 1 | Bếp than tổ ong | 8.000 | 20.000 | 1 | 1.00 | `dau`, `topmo` |
| 2 | Bếp gas nhỏ | 35.000 | 87.500 | 2 | 0.90 | `long` |
| 3 | Bếp gas đôi | 120.000 | 300.000 | 2 | 0.75 | — |
| 4 | Bếp công nghiệp | 300.000 | 750.000 | 3 | 0.60 | — |

- ⚠️ **Mâu thuẫn đã chốt:** `item-list-upgrade-levels.md` §6 ghi 5 cấp giá ×k 5k/15k/40k/100k/250k và đặt Lòng ở Lv3; `F10`/`F11`/GDD §2 ghi Lòng mở **Bếp Lv2** và giá base 8k/35k/120k/300k. **Chốt theo GDD + F10/F11** (4 cấp trả tiền, Lòng ở Lv2). Cần sửa item-list §6 (sprite Lv5 "Bếp master" giữ làm cosmetic/visual của Lv4 hoặc bỏ).

### 8.6 Bàn (`table`) — 03 §6, item-list §1

| Lv | Tên | Capacity | priceBase (mua/nâng) | ×k | Gate |
|:--:|---|:--:|--:|--:|---|
| 1 | Bàn con | 2 | 0 (có sẵn 3 bàn ở P0) | 0 | — |
| 2 | Bàn vuông | 4 | 700 | 1.750 | — |
| 3 | Bàn dài | 6 | 2.500 | 6.250 | — |
| 4 | Bàn VIP / kê dài | 8–10 | 17.500 + uy tín 3.000→40.000 | 43.750 + ⭐7.500→100.000 | **huy hiệu Kết Nối** (free-only) |

- **Mua thêm bàn** (đòn bẩy 2): giá theo tổng "ghế quy đổi" hiện có, tái dùng đường cong ghế gốc: ghế thứ 4→200 · 5→500 · 6→1.000 · 7→1.500 · 8→2.500 · 9→5.000 · 10→10.000 (base, ×k) — tức mua bàn con thứ N tính = Σ giá ghế quy đổi tăng thêm 🟡. Số bàn tối đa 🟡 theo màn hình mobile (đề xuất 6).
- **Ghế tựa** (cho ghế đó gọi 2 món, 🔵 late-game): lần nâng t=0..8: xu `100.000 + t×50.000` base (×k), uy tín `[3.000, 4.500, 6.500, 9.000, 12.000, 16.000, 22.000, 30.000, 40.000]` (×k); gate 9 ghế + Kết Nối. Với hệ bàn: "2 món/khách" đã là mặc định (mỗi khách bia + ≤1 mồi) → ghế tựa ở bia hơi = **mở 2 mồi/khách** 🔵.

### 8.7 Cốc (`glasses`) 🟢

| Hằng số | Giá trị |
|---|--:|
| Cốc khởi đầu | **10** (P0 cố định) |
| Buy-cap (mua tối đa) | 10 |
| Storage-cap (kho tối đa) | 20 — phần dôi chỉ lấp bằng quà "đại gia" +1 cốc/lần (§14) |
| Giá mua 1 cốc | 200 base · **500 ×k** 🟡 |
| Vòng đời | `clean → in_use → dirty → washing → clean` |

---

## 9. Tip · Uy tín · Phạt (công thức) 🟢 — GDD §8, 03 §5/§9

```text
// per customer, tại thời điểm Order được giao
patienceRatio = clamp((order.placedAt + order.patienceMs − now) / order.patienceMs, 0, 1)
tip = patienceRatio < 0.6 ? 0 : round(payment × 0.30)
tip ×= rush.tipMult × weather.tipMult × type.tipMult      // VIP 10, chipheo 0
tip = freshnessOk ? tip : 0                                // cốc bia của KHÁCH ĐÓ hết hơi → 0 (MVP mềm)
if (hasQR && tip > 0) tip = ceil(tip × 1.2)
payment = round(Σ price(items của khách) × type.paymentMult × location.mult × rush.payMult)
credited = wellRested ? round((payment + tip) × 1.1) : payment + tip
credited = min(credited, DAILY_EARN_CAP − dayEarned)      // trần ngày; log giữ GROSS cho phép đo k
```

| Hằng số | Giá trị | Ghi chú |
|---|--:|---|
| `TIP_PATIENCE_THRESHOLD` | 0.6 | "vách đá 60%" — VIP sớm/trễ chênh ~5,5× |
| `TIP_RATE` | 0.30 | |
| `TIP_VIP_MULT` | 10 | |
| QR | ceil ×1.2 | cần Điện thoại + LP2 (§11) |
| Tỉnh Táo (well-rested) | ×1.1 lên (payment+tip), 10 phút, 1 lần/ngày, keyed theo **open-day** (`tip.wellRestedKeyedBy`); số ca tính finalize-day, tiền tính per-earn | |
| Grace (03 §9.3) | chạm trong grace: patience ép = 10% → tip 0, vẫn thu tiền, không phạt | P1 |
| Uy tín / lượt | **+3** có tip · **+1** không tip · **−5** mỗi khách bỏ đi (`queueLost`/expired) · **−1** cốc hết hơi (gộp: chỉ trừ 1 lần theo lý do nặng nhất, 03 §9.4) | không ×k |
| Phạt mất khách `ab` | `round(gross × 0.10 × type.leavePenaltyMult) × rush.penaltyMult` — gross = giá gốc chưa tip | ×k (vì gross đã là xu bia hơi → **không nhân thêm**) |
| Phạt cụm | Order expire → **mọi khách chưa phục vụ** trong nhóm bỏ cùng lúc; phạt = Σ từng khách (VIP ×10) | 03 §5 |
| Overflow tại cửa | 0 phạt, chỉ đếm `rejectedAtDoor` | |
| "Mời về để đóng cửa" | phí = Σ `ab(c)` mọi khách còn ngồi (VIP = 100% đơn, Chí Phèo = 0) | gốc §12b |
| Tiễn ngồi lỳ giữa ca | tốn **uy tín** ∝ giây đã ngồi (server); đề xuất `⌈giây/10⌉ × 5 ⭐ ×k` 🟡 | |
| Prototype hiện tại | tip = patience + freshness + VIP; **bỏ** rush/weather/QR/Tỉnh Táo (04 §4) | |

**Ba sổ xu (không gộp):** `coins` (tiêu được) · `seasonEarned` (điểm Giải Nhậu, không giảm khi tiêu) · `lifetimeEarned` (Đường Lên Trùm). Nguồn cộng: payment + tip phục vụ + shipper net. **Không cộng:** nhiệm vụ, điểm danh, vé số, Mời Bia Hơi, đền bù (F12 §4).

---

## 10. Biển hiệu (`signboard`) — đổi customer mix

Phí lắp lần đầu **20.000 base (50.000 ×k)**, gate **Quầy Lv3**.

| id | Style | priceBase | ×k | Hiệu ứng |
|---|---|--:|--:|---|
| `wood` | Gỗ | 0 | 0 | VIP weight ×2 |
| `neon` | Neon | 15.000 | 37.500 | VIP ×2, shipper ×1.2 |
| `vintage` | Vintage | 20.000 | 50.000 | VIP ×2, weight `voi` ×0.5 |
| `calligraphy` | Thư pháp | 25.000 | 62.500 | VIP ×2, `ngoily` ×0.8 |
| `golden` | Hoàng kim | 30.000 + ⭐5.000 | 75.000 + ⭐12.500 | **VIP ×3** |

Biển = modifier risk/reward (VIP ×10 cả tip lẫn phạt), không phải cosmetic. Phase 2.

---

## 11. Mở khoá một lần & marketing

| Item | priceBase | ×k | Gate | Tác dụng | Phase |
|---|--:|--:|---|---|:--:|
| Điện thoại | 5.000 | 12.500 | LP1 | mở shipper + social | P2 |
| QR chuyển khoản | 8.000 | 20.000 | Điện thoại + LP2 | tip ceil ×1.2 | P2 |
| Biển hiệu (phí lắp) | 20.000 | 50.000 | Quầy Lv3 | mở §10 | P2 |
| **Tờ rơi** | ⭐300 base → ⭐750 ×k 🟡 (mua bằng uy tín) · miễn phí khi 5/5 nhiệm vụ ngày | LP2 | chiến dịch **90.000ms**: spawn ×0.28 (≈ demand ×3.6, khách **không** giảm patience) 🟡; tồn kho tối đa **5**; 1 lần/ca | P2 |
| Thùng Cấp Cứu (emergency pack) | miễn phí | khi hết sạch nguyên liệu | = thùng hàng nhỏ (§14) — lưới chống softlock, không phải faucet | P2 |
| TV bản quyền / Lịch thi đấu / Theme đội | 50.000 / 15.000 / 8.000 (bundle 6 đội = Σ×0.75) | 125k / 37.5k / 20k (90k) | Vụ Bia | xem `07-SPEC` | P4 |

---

## 12. Chó giữ quán (`dog`) — F18 🟡 vật liệu ánh xạ

| Lv | Tên | Chi phí | HP/ATK | Tác dụng |
|:--:|---|---|:--:|---|
| 1 | Chó con | 2.000 base (5.000 ×k) + **20 `lac`** | 1/1 | chặn trộm nhỏ |
| 2 | Chó trưởng thành | 8.000 base (20.000 ×k) + 20 `nem` | 2/2 | đánh côn đồ thường |
| 3 | Chó chiến | 25.000 base (62.500 ×k) + 40 `nem` | 3/3 | one-shot từng tên → thắng sạch |

Gốc dùng "20 đá / 20 kẹo / 40 kẹo" — bia hơi không có đá/kẹo → ánh xạ `lac`/`nem` (🟡, đổi trong JSON). Thua → `capturedUntil` (🟡 30 phút) — không bảo vệ, không đánh.

---

## 13. Thể lực, ca, trần ngày, quyền chơi — GDD §10 (chơi FREE hết; F26 bỏ 08/09)

| Hằng số | Giá trị | Nhãn |
|---|--:|:--:|
| `SHIFT_DURATION_MS` (thể lực) | **720.000** (12') | 🟢 |
| Hồi thể lực | 0.4 × realtime (~30' active), chỉ đếm khi tab active; cooldown tính từ lúc **khách về hết** | 🟢 |
| Hồi giảm theo phiên | phiên 1 denom 0.5 · phiên 2 1.0 · phiên 3 1.5 | 🟡 |
| Mở ca | cần thể lực 100% | 🟢 |
| Trần số ca/ngày (normal cap) | newbie **8** · regular **6** · veteran **5** | 🟢 |
| Quyền chơi | **FREE toàn bộ** = normal cap 8/6/5 (chốt 08/09). `entitlements.freeSessionsPerDay` = `dailyShiftCap[segment]`; `sessionPass.enabled=false`. Section chỉ còn dùng cho campaign/override (giảm cap tạm), không có tier trả tiền | 🟢 |
| `DAILY_EARN_CAP` | **500.000 ×k** (200.000 base) — chạm: vẫn phục vụ, `credited = 0`; per-day-bucket theo giờ VN tại **thời điểm earn** | 🟢 |
| Số ca credit | lúc **finalize** (đóng hẳn) → ngày đóng ca | 🟢 |
| Tỉnh Táo | ×1.1, 600.000ms, 1 lần/ngày sau nghỉ >6h | 🟢 |
| Đóng ca | `closing` grace: khách đang uống ở lại, không spawn; `kick-all` đóng ngay (phí §9) | 🟢 |
| Rollover ngày | nửa đêm `Asia/Ho_Chi_Minh`, **server-side**, client mirror | 🟢 |
| State khởi đầu | coins **750 ×k** (300 base) 🟡 · kho: bia 10/15, lac 5/15, nem 5/15 🟡 · cốc 10 · 3 bàn con | 🟡 |
| Prototype | `coins = 0`, không kho, `dayEarned` = vòng đời world | — |

---

## 14. Nhiệm vụ, điểm danh, thùng hàng, quà — F17 (thưởng ×k)

**Nhiệm vụ ngày (5/ngày, seed theo ngày VN + tier):** 3 bucket lõi (bốc 1/bucket) + 2 cố định.

| Bucket | Loại (pool bia hơi mở rộng) | Target base→max (theo tier, `pm()` = base + (max−base)×((tier−1)/8)^1.5) | Thưởng base | ×k |
|---|---|---|--:|--:|
| 1 Phục vụ | serve_customers 21→102 · serve_beer 10→53 · serve_moi 8→51 · **serve_tables** 6→30 🟡 | | 120 xu + ⭐5 | 300 + ⭐12.5 |
| 2 Chất lượng | perfect_tip 9→41 · earn_coins 1.100→9.200 (base ×k) · **no_stale_beer** 10→40 🟡 | | 220 + ⭐5 | 550 + ⭐12.5 |
| 3 Rủi ro | zero_loss_window (240.000ms) · **survive_rush** 1 · **no_lost_vip** 1 🟡 | | 320 + ⭐5 | 800 + ⭐12.5 |
| Cố định A | Hoàn thành **3 ca** | | 1.000 + ⭐100 | 2.500 + ⭐250 |
| Cố định B | Gửi quà **3 người khác nhau** | | 300 + ⭐15 | 750 + ⭐37.5 |
| Bonus 5/5 | | | +1 Tờ rơi + 1 Mảnh huy hiệu | |

- Uy tín thưởng lẻ (⭐12.5) → **làm tròn lên** trong JSON (`⭐13`) hoặc giữ base ⭐5 không ×k — **chốt: uy tín-thưởng nhiệm vụ ×k rồi làm tròn** (GDD §11 quy ước ⭐ ×k).
- **Điểm danh 7 ngày** (uy tín, không ×k? — chốt **×k**): base 2/4/8/16/32/64/128 → ×k 5/10/20/40/80/160/320 (tổng 635 ⭐); lỡ 1 ngày reset về ngày 1.
- **Referral:** mốc 1 (1 bạn qualified) ⭐250 base → ⭐625 + **huy hiệu Kết Nối** · mốc 2 (3 bạn) ⭐1.000 → ⭐2.500 · mốc 3 (bạn đạt LP2) ⭐3.000 → ⭐7.500. Người được mời: thưởng chào mừng 2 giai đoạn (server) 🟡.
- **Gửi quà** = transfer nguyên liệu P2P (≤5 mỗi loại + xu 🟡), 4 tầng chống farm (1 tin chưa đọc/người, trần gửi/nhận ngày, unique recipients, kiểm duyệt).
- **Thùng hàng (crate) ánh xạ:** small {bia 4, lac 2, nem 2} · medium {8, 4, 4} · large {15, 8, 8} (+ mồi nóng 0/2/4 khi đã mở bếp) 🟡.
- **Két Bia Bí Ẩn (quà "đại gia" từ Chí Phèo, pity):** 3 category: xu **350–480 base → 875–1.200 ×k** · nguyên liệu 15–40 đơn vị random · uy tín 51–92 base → ⭐128–230 ×k · **hiếm: +1 cốc** (vượt buy-cap, §8.7). Không giới hạn lần/ca; pity tăng mỗi Chí Phèo, reset khi lộ.
- **Mảnh huy hiệu:** 8 mảnh = 1 huy hiệu (F16 §5). **Tem trang trí:** đổi cosmetic (giá §16).

---

## 15. Giải Nhậu, Vụ Bia, Đường Lên Trùm — F12, F13 (ngưỡng ×k)

**Giải Nhậu (8 bậc, `minSeasonEarned`):**

| # | id | Tên | Base | ×k |
|:--:|---|---|--:|--:|
| 1 | `dong` | 🥤 Cốc Nhựa | 0 | 0 |
| 2 | `bac` | 🍺 Cốc Thủy Tinh | 20.000 | 50.000 |
| 3 | `vang` | 🏺 Vại Sành | 60.000 | 150.000 |
| 4 | `titan` | ⚔️ Vại Đồng | 120.000 | 300.000 |
| 5 | `bach_kim` | 💎 Bom Bạc | 180.000 | 450.000 |
| 6 | `hong_ngoc` | 🍻 Bom Vàng | 300.000 | 750.000 |
| 7 | `kim_cuong` | 👑 Vua Bia | 500.000 | 1.250.000 |
| 8 | `huyen_thoai` | 🏆 Trùm Bia Hơi | 1.000.000 | 2.500.000 |

- 2 Vụ Bia song song: **Phân Hạng 7 ngày** (thưởng đậm + top10 huy chương + Bàn Thờ Ông Địa) · **Tranh Bá 14 ngày** (nhẹ). Epoch neo `2026-04-11T10:00Z` 🟡, tz VN. Tie-break: `firstReachedCurrentSeasonEarnedAt`.
- Thưởng cuối Vụ = **bó nguyên liệu theo hạng** (không xu) qua hòm thư; top 10 → huy chương + khắc tên. 🟡 bảng lượng theo hạng: Cốc Nhựa {bia 20, lac 10, nem 5} … Trùm {bia 300, lac 150, nem 100, long 20} (server config).
- 2 bảng: **Xếp hạng** theo bậc xuyên mặt bằng · **Dạo Phố** theo `location × bậc`.

**Đường Lên Trùm (LP0–LP7, `lifetimeEarned` base ×k):**

| Mốc | Tên | lifetime base | ×k | Điều kiện phụ | Thưởng base | ×k | Gate mở |
|:--:|---|--:|--:|---|---|---|---|
| LP0 | Bưng Bê | 0 | 0 | — | — | — | start |
| LP1 | Phụ Quán | 50.000 | 125.000 | 4 ghế quy đổi + chó | 5.000 + thùng nhỏ | 12.500 | Điện thoại, mặt bằng LP1 |
| LP2 | Tay Ngang | 150.000 | 375.000 | Quầy Lv3 + Điện thoại | 10.000 + mảnh HH | 25.000 | QR, Tờ rơi, mặt bằng LP2 |
| LP3 | Chủ Sạp | 500.000 | 1.250.000 | thiết bị Lv3 + QR | 20.000 + thùng vừa | 50.000 | mặt bằng LP3 |
| LP4 | Chủ Quán | 1.500.000 | 3.750.000 | tờ rơi + peak Bom Bạc | 50.000 + mảnh + tem | 125.000 | Phố Cổ |
| LP5 | Ông Chủ | 5.000.000 | 12.500.000 | biển hiệu + peak Bom Vàng | 100.000 + thùng vừa + tem | 250.000 | Ga Metro |
| LP6 | Đại Gia Bia | 15.000.000 | 37.500.000 | đồ & quầy Lv5 + peak Vua Bia | 250.000 + thùng lớn + 2 mảnh | 625.000 | Khu Phố Tây |
| LP7 | Trùm Bia Hơi | 50.000.000 | 125.000.000 | 10 ghế quy đổi + peak Trùm | 500.000 + thùng | 1.250.000 | prestige |

---

## 16. Mặt bằng — F14 (chốt bảng F14; item-list §14 đã đồng bộ 08/09)

Rent/ngày = `round(700 × (e/5) × (1 + e/50)) × k`; kỳ thuê **7 ngày** trả trước; **cọc 25%** (hoàn khi hết kỳ bình thường); rời sớm mất cọc + về Hẻm Nhỏ. Multiplier áp lên payment **trước** cap. Server lưu `rentPerDay` lúc ký.

| # | id | Tên | Mult | `e` | Rent/ngày base | ×k | Tiền kỳ 7d ×k | Cọc ×k | Gate |
|:--:|---|---|--:|--:|--:|--:|--:|--:|---|
| 1 | `hem_nho` | Hẻm Nhỏ | 1.0 | — | **0** | 0 | 0 | 0 | start (miễn phí, về đây khi bỏ thuê) |
| 2 | `ngo_cho` | Ngõ Chợ | 1.1 | 10 | 1.680 | 4.200 | 29.400 | 7.350 | LP1 |
| 3 | `ben_xe` | Bến Xe | 1.2 | 15 | 2.730 | 6.825 | 47.775 | 11.944 | LP1 |
| 4 | `gan_cong_so` | Gần Công Sở | 1.3 | 20 | 3.920 | 9.800 | 68.600 | 17.150 | LP2 |
| 5 | `gan_svd` | Gần Sân Vận Động | 1.4 | 25 | 5.250 | 13.125 | 91.875 | 22.969 | LP3 |
| 6 | `ho_bia_dem` | Hồ Bia Đêm | 1.5 | 30 | 6.720 | 16.800 | 117.600 | 29.400 | LP3 |
| 7 | `pho_co` | Phố Cổ | 1.6 | 35 | 8.330 | 20.825 | 145.775 | 36.444 | LP4 |
| 8 | `ga_metro` | Ga Metro | 1.7 | 40 | 10.080 | 25.200 | 176.400 | 44.100 | LP5 |
| 9 | `pho_tay` | Khu Phố Tây | 1.8 | 45 | 11.970 | 29.925 | 209.475 | 52.369 | LP6 |

- ⚠️ **Mâu thuẫn đã chốt:** F14 (feature spec) đặt lại tên/multiplier thành bậc đều 0.1 và index `e` 5..45; item-list §14 giữ 10 vị trí + rent gốc (770→29.120). **Chốt theo F14** (dev spec, có Gần SVĐ như GDD §12), **Hẻm Nhỏ rent 0** (F14 ghi e=5 là sai — mặt bằng gốc phải miễn phí để "về Hẻm Nhỏ" không phí). Gate LP1 cho 2 vị trí đầu lấy từ GDD/gốc (F14 để "-"). Cần sửa item-list §14 → 9 vị trí + background theo bảng này.
- Hoà rent (gross/ngày cần): `rent / (mult − 1)` → Ngõ Chợ 42k ×k, Phố Tây ~50k ×k.

---

## 17. Rủi ro — F15, F18 (số ×k)

| Sự kiện | Hằng số | Base | ×k | Ghi chú |
|---|---|--:|--:|---|
| Bảo kê (gangster) | phí cống nạp | 90 × số tên | 225 × n | quyết trong **20s**; không chọn → tự cống nạp |
| | thưởng thắng | 225 × n | 562.5 × n | 3 tên = 1.687.5 |
| | HP/ATK côn đồ | tên #i: hp = i, atk = i | — | boss 🔵 server-only |
| | sửa bàn/ghế bị đập | `50 × index` base; ×3 khi bị đập | ×k | |
| | thua | chó bị bắt `capturedUntil` + feePenalty + đồ vỡ | | |
| | xác suất/ca | 🟡 0.25/ca, tối đa 1/ca, không trùng kiểm tra | | |
| Kiểm tra ATTP / trật tự (inspection) ⏸ **pending 08/09**, ship `enabled=false` | quiz **15.000ms**, 2 lần thử; trượt → thu chứng chỉ + **đình chỉ ca** | — | — | tối đa 1/ca; no-pause; câu hỏi server |
| Đội Trật Tự (urban patrol, 🔵) | minigame gom-3; fail → tịch thu 1 bàn ca này + ca sau (co queue) | — | — | gốc §19; no-pause |
| Chí Phèo → đại gia | pity + lootbox §14 | | | |
| Say xỉn / đánh nhau (mới, 🟡) | spawn khi density cao/rain/humid; bỏ mặc → uy tín −20 ×? (đề xuất −50 ⭐ ×k) + bàn `dirty/broken` | | | F15 §6 |
| Trộm offline | server; không chó → mất ≤ 🟡 5% coins (cap 10.000 ×k) + ≤ 20% mỗi nguyên liệu; chó Lv1/2/3 giảm 50/80/100%; sàn an toàn 500 ×k | | | F15 §7 |

---

## 18. Shop Vụ Bia (World Cup) & Vé số — 🔵 Phase 4

Chi tiết `07-SPEC-shop-mua-giai-worldcup.md` và F19/F21. Số neo:

| Item | Base | ×k | Ghi chú |
|---|--:|--:|---|
| TV bản quyền | 50.000 | 125.000 | gate Giờ Vàng xem bóng, hạn 1 Vụ |
| Lịch thi đấu | 15.000 | 37.500 | HUD lịch + cổ vũ spawn ×1.15 |
| Theme đội | 8.000 | 20.000 | cosmetic vĩnh viễn |
| Bundle 6 đội | Σ × 0.75 | ≈ 90.000 | |
| Suất chiếu | `endReal + 20'`; vòng bảng `light`, knockout/final `heavy` | | |
| Vé số A (kiến thiết) | 200 | 500 | ≤5 vé/ngày; trúng 2/3/4/6 số cuối = ×1.5 / ×8 / ×50 / jackpot; EV 0.6–0.8; thưởng chỉ vào `coins` |

---

## 19. Cosmetic (xu hoặc donation, cosmetic-only) — item-list §11 🟡

Lồng đèn: Nhật 5.000 · Sen 8.000 · Đỏ 6.000 · Cổ điển 10.000 (×k đã tính). Cây cảnh: Trúc 4.000 · Bonsai 12.000 · Lan 8.000 · Sen đá 3.000. Mua bằng **Tem trang trí** 🟡 (1 tem = 1 item) hoặc xu theo bảng. Donation "Mời Bia Hơi" 20k/50k VND → chọn 1 quà cosmetic (một số có `repGate`, vd biển Vàng ⭐12.500).

---

## 20. Số Phase 0 đang chạy (đối chiếu `prototype/src/engine/constants.ts`)

| Hằng số code | Giá trị | Khớp § |
|---|--:|---|
| `K_ANCHOR` | 82.5 | §1 |
| `MENU` bia/lac/nem price·cost | 50·10 / 75·26 / 150·60 | §2 |
| `SPAWN_BASE_MS` / `SPAWN_WARMUP_MULT` / `PEAK_SPAWN_MULT` | 10.500 / 1.6 / 0.66 | §3, §6 |
| `PATIENCE_THUONG_MS` / `PATIENCE_RUSH_MULT` | 18.000 / 0.611 | §3 |
| `ENJOY_MIN_MS` / `ENJOY_MAX_MS` | 5.000 / 10.000 | §3 |
| `GLASS_COUNT` / `POUR_MS` | 10 / 3.000 | §8.7, §8.1 |
| `WASH_BASE` / `WASH_UPGRADED` | {1, 7.000} / {3, 2.500} | §8.2 |
| `FRESHNESS_MS` / `FRESHNESS_WARN_MS` | 12.000 / 9.000 | §7 |
| `TIP_PATIENCE_THRESHOLD` / `TIP_RATE` / `TIP_VIP_MULT` | 0.6 / 0.3 / 10 | §9 |
| `CUSTOMER_WEIGHTS` | thuong 1.0 · voi 0.3 · vip 0.1 | §4 |
| `TABLE_COUNT` / `SEATS_PER_TABLE` / `QUEUE_SLOTS` | 3 / 2 / 4 | §3 |
| `SHIFT_DURATION_MS` / `DAILY_EARN_CAP` | 720.000 / 500.000 | §13 |
| `P_MOI` / `P_NEM_GIVEN_MOI` / `P_SECOND_ROUND` / `GROUP_SIZE` | 0.85 / 0.65 / 0.35 / 1–2 | §2, §3 |

`scripts/check_economy_config.py` đọc cả 2 nguồn và **fail** nếu lệch → chạy trong verification của mọi slice economy.

---

## 21. Mâu thuẫn giữa các doc đã phát hiện & cách chốt (để chủ dự án duyệt)

| # | Chỗ lệch | Chốt trong spec này | Việc cần làm |
|---|---|---|---|
| 1 | Bếp: item-list §6 (5 cấp, ×k 5k…250k, Lòng Lv3) vs F10/F11/GDD (Lòng Lv2, base 8k…300k) | GDD + F10/F11 (§8.5) | ✅ item-list §6 đã sửa 08/09 |
| 2 | Mặt bằng: F14 (9, tên mới, mult đều) vs item-list §14 (10, tên gốc) vs GDD §12 (9, có Gần SVĐ) | F14 + Hẻm Nhỏ rent 0 (§16) | ✅ item-list §14 + F14 đã sửa 08/09 |
| 3 | Bom bia: F10 (`pourSlots/pourMs`) vs item-list §2 (storage/batch/brew) | cả hai, 2 lớp theo phase (§8.1) | không |
| 4 | Thời tiết: F09 (bảng bia hơi) vs GDD §9 (kể theo số gốc trà đá) | F09 (§5) | ✅ GDD §9 đã trỏ 08/09 |
| 5 | Vật liệu chó/thùng hàng "đá/kẹo" (item-list §9, gốc §16) | ánh xạ `lac`/`nem` (§12, §14) | ✅ item-list §9 đã sửa 08/09 |
| 6 | Uy tín-thưởng có ×k không (GDD §11 ⭐250 ×k vs bảng nhiệm vụ gốc) | **×k, làm tròn** (§14); uy tín theo lượt (+3/+1/−5) **không** ×k | ghi vào GDD §8/§16 khi lên v1.7 |
| 7 | Ghế tựa (2 món) với hệ bàn đã cho 2 món/khách | ghế tựa = mở **2 mồi**/khách, 🔵 | ghi 03-SPEC khi tới Phase 3 |
| 8 | Free ca/ngày (F26) vs trần 8/6/5 (GDD §10) — **⛔ F26 bỏ 08/09, free = normal cap** | 2 lớp: entitlement free = **config** (`entitlements.freeSessionsPerDay`, mặc định 1, theo segment/campaign, remote config) → Vé Mở Ca lên normal cap (§13) | sửa F26 §2 (đã sửa 08/09) |

---

## 22. Config Registry — key → tier / role / hiệu lực (khớp `trum-bia-hoi-brd-admin.md` §5.2)

Mọi section của `docs/config/economy.tbh.json` đều nằm trong registry. **Tier A** = đổi tiền thật / tổng xu-ngày / thứ hạng / quyền truy cập → Economy Admin đề xuất, **Super Admin duyệt (dual)**; **Tier B** = cân bằng trong ca → Economy Admin tự publish; **Tier C** = content/ops → Game Admin. Hiệu lực: `immediate` / `next_shift` / `next_day` (00:00 VN) / `next_season`. Override: `player > campaign > segment > default` (override player/campaign bắt buộc `expiresAt`). Key mới chưa xếp → mặc định **B**.

| Section JSON | Keys (tóm tắt) | Tier | Role sửa | Hiệu lực | Ghi chú |
|---|---|:--:|---|---|---|
| `k` | `value`, `band`, `anchorValuePerServe` | **A** | Economy Admin → Super Admin | `next_day` | `anchorValuePerServe` 🟢 thiết kế không đổi nhưng vẫn là config (đổi = quyết định founder) |
| `shift` | `durationMs`, `regenRate`, `regenOnlyActive`, `dailyShiftCap`, `dailyEarnCapBase`, `capBucket`, `wellRested`, `closingGrace`, `kickAllAllowed`, `openRequiresFullStamina` | **A** | Economy Admin → Super Admin | `next_day` | ca đang chạy giữ `configVersion` cũ |
| `entitlements` (chơi free — chỉ campaign/override) | `mode`, `freeSessionsPerDay.{default, bySegment.*, campaignOverride, min, max}`, `sessionPass.enabled=false` | **A** | Economy Admin (default/segment) · Game Admin (campaign) → Super Admin | `next_day`; campaign `immediate` cho ca mở sau publish | ví dụ luồng: BRD §5.2.4; giá Session Pass ở catalog server (tiền thật) |
| `ledgers` | `countedSources`, `excluded` | **A** | Economy Admin → Super Admin | `next_season` | đổi = đổi luật Giải Nhậu |
| `tip` · `reputation` · `penalty` | rate, mult, threshold, `wellRested*`, `graceForcedPatienceRatio`, +3/+1/−5, `leaveRate`, `kickToCloseFormula` | **A** | Economy Admin → Super Admin | `next_day` | `reputation.notScaledByK` là luật, đổi cần GDD |
| `league` · `lifePath` | `tiers`, `seasons` (độ dài/epoch/tieBreak/rewardType), `list` (threshold + reward) | **A** | Economy Admin → Super Admin | `next_season` | không sửa mùa đang active (BRD §6.1) |
| `lottery` | `legalGate`, `ticketBase`, `dailyLimit`, `suffixPayouts`, `targetEV` | **A** | Super Admin | `next_day` | `legalGate` là feature flag; EV cần legal review (§18) |
| `shopSeason` · `cosmetics.donationTiersVnd` | giá `tvBase`/`scheduleBase`/`teamThemeBase`, `bundleRate`, `bundleSize`, mult/offset rush WC, donation tiers VND | **A** | Super Admin | `next_day` | tiền thật → Tier A; `scheduleFanSpawnMult`/`groupRush`/`knockoutRush` có thể hạ B khi có sim |
| Feature flags | `weather.phase1Enabled`, `freshness.kegFreshnessEnabled`, `patience.graceEnabledFromPhase`, `upgrades.phase1UpgradesOutsideShiftOnly`, `shift.kickAllAllowed`, `lottery.legalGate` | **A** | Super Admin | `next_day` | bật/tắt cơ chế → dual approval |
| `menu` | `priceBase`, `unitCostBase`, `bulk`, `prepMs`, `stock`, `station`, `unlock` | **B** | Economy Admin | `next_shift` | đổi giá menu làm đổi k đo được → theo dõi §1 |
| `inventory` · `demandMix` | `bulkSize`, `startingStock`, `overflowGiftToCoinsAt`, `pMoi`, `pNemGivenMoi`, `pSecondRound`, `moiPerRoundPhase2` | **B** | Economy Admin | `next_shift` | |
| `spawn` · `patience` · `enjoy` · `rounds` · `customerTypes` | `baseMs`, `warmupMult`, `perCustomer`, group size, queue slots, `thuongMs`, `rushTypeMult`, `graceMs`, min/max enjoy, rounds theo loại, weight/mult/patience từng loại khách | **B** | Economy Admin | `next_shift` | `playerServeCeilingPerSec` cũng dùng cho anti-cheat (BRD §4) → đổi báo Game Admin |
| `weather` · `rush` | bảng mult từng thời tiết, `rush.{none,peak,light,heavy,lunch_light,football}`, `rush.schedule` | **B** | Economy Admin | `next_shift` | lịch rush theo giờ VN |
| `freshness` | `baseMs`, `warnMs`, `coolerLevelMs`, `kegFreshnessMs`, `staleConsequence`, `expiredOrderGlassState` | **B** | Economy Admin | `next_shift` | |
| `upgrades` · `glasses` · `signboard` · `unlocks` · `dog` | level tables (`keg`, `washer`, `cooler`, `stall`, `kitchen`, `table`), `extraSeatPriceBase`, `backrest`, `glasses.{start,buyCap,storageCap,priceBase}`, `signboard.{installFeeBase,gate,styles}`, `unlocks.{phone,qr,flyer,emergencyPack}`, `dog.{levels,capturedMs,theftReductionByLevel}` | **B** | Economy Admin | `next_shift` | validator: level tăng dần, giá không âm |
| `quests` · `crates` · `chairmanBox` | `daily` target/reward, `loginTrackRepBase`, `loginMissResets`, `referral`, `gift`, `badgeShardsPerBadge`, crate tables, `chairmanBox.*` | **B** | Economy Admin | `next_shift` | pool nhiệm vụ (nội dung) là Tier C |
| `risk` · `locations` | `gangster`/`inspection`/`urbanPatrol`/`drunkFight`/`offlineTheft` (chance, fee, cooldown), `locations.list[]` (rent, mult, gate), `leaseDays`, `depositRate`, `earlyLeaveLosesDeposit` | **B** | Economy Admin | `next_day` | mặt bằng đổi giữa ngày gây lệch cọc → `next_day` |
| `cosmetics` (trừ donation) | `lantern`, `plant`, `pricesAreDisplayed` | **B** | Economy Admin | `next_shift` | |
| `leaderboard` | `topN`, `neighborsWindow`, `refreshMs`, `minShiftsToRank`, `shrineTop`, `wallSize`, `historySeasonsKept`, `hideFlagged` | **A** | Economy Admin → Super Admin | `next_season` (hiển thị `topN`/`refreshMs`: `next_day`) | F28 — thứ hạng, snapshot bất biến |
| `donation` | `enabled`, `tiersVnd`, `guestAllowed`, `provider`, `manualConfirm`, `giftCatalogRef`, `refundPolicy` | **A** | Super Admin | `immediate` | F20 — monetization duy nhất; tiền thật |
| `network` | `reconnectGraceMs`, `reconnectingUiDelayMs`, `commandBufferMax` | **B** | Economy Admin | `next_shift` | F23 §8, 10-SPEC §10 — mất mạng giữa ca |
| `onboarding` | `enabled`, `firstShift.*` (1 khách 1 bia, tắt risk/rush ca 1), `lostStreakToGuide`, `stepGuide.{onFirstPlay, skippable, maxAutoRepeatsPerDay, steps[]}`, `loginPrompt.*`, `hints.*`, `featureReveal.*`, `targets.*` | **C** | Game Admin | `immediate` (ca mở sau) | F27 🟢 — luật chủ dự án 08/09; cách trình bày dev tự quyết |
| `audio` | `enabled`, `ambientTheme`, `dedupeWindowMs`, `masterGainDefault`, `groupsEnabled.*` | **C** | Game Admin | `immediate` | checklist B7; đổi theme = đổi thư mục `assets/audio/ambient/<theme>/` |
| Content / ops (ngoài JSON) | câu hỏi kiểm tra, quest pool composition, announcement, copy i18n, WC fixtures/teams, maintenance flag, min client version | **C** | Game Admin | `immediate` | BRD §6 |
| `prototypePhase0` | — | — | — | — | chỉ prototype offline, **không** vào registry production |

**Hợp đồng với code (10-SPEC §7):** engine đọc mọi số qua `config.get(key)` từ snapshot có `configVersion`; `scripts/check_economy_config.py` chạy trên bản **export** từ registry để repo/sim khớp production.

**Kiểm tự động (đã có):** `npm run check:config` **từ gốc repo** (`package.json` gốc, 08/09; bản trong `prototype/` vẫn chạy) = `check:economy` + `check:config-coverage` (`scripts/check_config_coverage.py`) — fail nếu: section JSON mới chưa xếp tier trong `_meta.governance`, path governance sai, `config.get('x')` trỏ key không có, hoặc bảng §22 này thiếu dòng cho một section. Thêm key mới → cập nhật cả 3 nơi: JSON, `_meta.governance.tiers`, bảng §22.

---

### New game runtime keys (2026-09-08)

`runtime` — tier B: `tableSeatingMs=800`, `tableCleaningMs=1000`, queue `2 + floor(seats/3)` encoded as `queueBaseSlots`/`queueSeatsPerSlot`, initial equipment/table level 1 and kitchen 0. These are tuneable seed defaults for the fresh implementation.


## Changelog (append-only)

| Ver | Thay đổi |
|---|---|
| v1.2.2 | Nhãn 🔵 đọc lại: "làm sau cùng, vẫn trong scope 1 phase" (founder 09/09) thay cho "POST-MVP chưa build". Số không đổi. |
| v1.2.1 | Thêm `scripts/check_config_coverage.py` (+ `npm run check:config`) kiểm §22 ↔ JSON ↔ `_meta.governance` ↔ code; ghi hợp đồng kiểm tự động cuối §22. |
| v1.2 | **Không hardcode toàn bộ** (founder 08/09): §0.7 mọi số là config trong Config Registry admin (JSON = seed); thêm §22 bảng key → tier A/B/C / role / hiệu lực / override, khớp `trum-bia-hoi-brd-admin.md` v0.3 §5.2; JSON thêm `_meta.governance`. |
| v1.1 | Free ca/ngày thành config (`entitlements.freeSessionsPerDay` default/bySegment/campaign, remote config server) — theo yêu cầu founder 08/09; JSON tách section `entitlements`. |
| v1.0 | Bản đầu (2026-09-08): gom toàn bộ hằng số/công thức từ GDD v1.6 + 03/04/07 + F07–F26 + item-list + số gốc bundle; quy ước ×k; bảng đối chiếu prototype; 8 mâu thuẫn chốt. Kèm `docs/config/economy.tbh.json` + `scripts/check_economy_config.py`. |
| v1.2.3 | JSON 1.2.0: thêm section `network` (B), `onboarding` (C, F27), `audio` (C, checklist B7) + xếp tier trong `_meta.governance`; §22 thêm 3 dòng. Không đổi số kinh tế nào. |
| v1.2.4 | JSON 1.3.0: thêm section `leaderboard` (A, F28) + §22. |
| v1.2.5 | JSON 1.4.0: `onboarding` theo F27 v1.1 (1 khách 1 bia, lostStreakToGuide, stepGuide.steps, loginPrompt). |
| v1.2.6 | JSON 1.5.0: `risk.inspection` thêm `status:"pending"` + `enabled:false` (chủ dự án 08/09 — tính năng kiểm tra & ngân hàng câu hỏi chưa chốt). |
| v1.2.7 | Chủ dự án 08/09: chơi free hết — §13 quyền chơi = normal cap, `entitlements.mode="free"`, `sessionPass.enabled=false`; JSON 1.6.0 thêm section `donation` (A) = monetization duy nhất; §22 sửa 2 dòng. |

| v1.3.0 | New engine seed 1.7.0: added registry-owned `runtime` timing/initial-level keys; reconciled `lottery.legalGate=false` with HANDOFF legal hold. `check:config` will target the new engine and actual loader rather than archived constants. |

| v1.3.1 | Runtime rules v3 nối Tỉnh Táo theo JSON hiện hành, không đổi số/config version: `shift.wellRested` canonical, aliases trong `tip` phải trùng. Bonus ghi riêng và credit qua `servePayment`, chịu trần ngày; payment/tip gốc giữ nguyên để đo k. Làm rõ open-day khác finalize-day; nghỉ mới bắt đầu tại createdAt/đóng hẳn ca, offline tính nghỉ nhưng không hồi thể lực. Replay rules v1/v2 giữ nguyên. |
