# 🧮 SPEC — Economy Constants & Formulas — Trùm Bia Hơi (v1.3.11)

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
| `k` (hệ số rescale) | **2.5** | 🟡 | Giả định GDD §3. **Đo được trong prototype (5 seed, 3 món): 2.24–2.34**; engine mới JSON 1.7.0: 2.27–2.51 — trong band. k đo phụ thuộc tip nên đổi `pourMs`/`pourSlots` làm k dịch (§8.1): bot hoàn hảo với bom Lv1 2.000 ms cho **2,64–2,79** (JSON 1.7.1); **2,58–2,72 khi bật bom chứa/refill (JSON 1.9.0, engine 09/09)**; người chơi thật ước ~2,4. Sẽ đo lại khi đủ 6 món (F11 §6). |
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
| `dau` | Đậu tẩm hành | 100 | 45 | 54 | 55% | 55 | ❌ | **4.000ms** 🟡 | `kitchen` | Bếp Lv1 | P2 |
| `topmo` | Tóp mỡ Triều Khúc | 165 | 82 | 98 | 50% | 83 | ❌ | **5.000ms** 🟡 | `kitchen` | Bếp Lv1 | P2 |
| `long` | Lòng xào dưa | **280** | 155 | 186 | 45% | 125 | ❌ | **7.000ms** 🟡 | `kitchen` | Bếp Lv2 | P2 |

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
- **Demand-mix (xác suất gọi món) — 🟡 giả định prototype, đo lại:** mỗi khách luôn gọi 1 `bia`; `P_MOI = 0.85` gọi kèm 1 mồi; trong số đó `P_NEM_GIVEN_MOI = 0.65` nem / 0.35 lạc (P0). **Khi có bếp:** `pHotGivenMoi = 0.5` chọn mồi nóng (đều tay trong nhóm nóng), nhóm có VIP/ngồi lỳ `pHotGivenMoiSpecial = 0.8`. **Khách chỉ gọi mồi còn hàng** (kho − phần đã gọi chưa làm > 0); hết mồi → chỉ bia; bia luôn gọi (03-SPEC v1.3, founder 09/09: Order vẫn chỉ giao khi đủ món). Phase 2 (6 món): 0–2 mồi/đợt; nhóm ngồi lỳ / cổ vũ / có VIP thiên về mồi nóng (F11 §6). Đợt 2: `P_SECOND_ROUND = 0.35` (nhóm thường), vội = 0, ngồi lỳ = 3–5 đợt (03 §2).

---

## 3. Spawn, patience, enjoy, nhóm & sức chứa (Lớp 2) 🟢 cơ chế · 🟡 số

| Hằng số | Giá trị | Gốc | Nguồn | Ghi chú |
|---|--:|--:|---|---|
| `SPAWN_BASE_MS` | **10.500** | 10.500 | 04 §4 | nhịp **mỗi khách**; nhóm N người tiêu N nhịp (fix 2026-07-15) |
| `SPAWN_WARMUP_MULT` | 1.6 | 1.6 | 04 §4 | lượt đầu ca = 16.800ms |
| `spawnEffective` | `none: max(base, floor) × weather × rush × marketing; active: max(base × weather × rush × marketing, floor)` | — | F08 §5 | Nhịp thường áp hệ số sau baseline; sàn Giờ Vàng là giới hạn tuyệt đối. |
| `PATIENCE_THUONG_MS` | **24.000** | 18.000 | 04 §4 | × weather.patienceMult × type.patienceMult (JSON 2.0.22, D25; game bàn ghế — pin cũ giữ 18.000) |
| `PATIENCE_RUSH_MULT` (vội/VIP) | 0.611 | 0.611 | F07 | ≈ 11.000ms |
| `ENJOY_MIN/MAX_MS` | 5.000–10.000 | 5–10s | 04 §4 | × type.enjoyMult (ngồi lỳ ×10 → 50–100s) |
| Cỡ nhóm | game bàn ghế (rules 28, D17): cặp với xác suất `spawn.pPair` **0,5**, còn lại khách lẻ (nhóm ≤ 2, không phụ thuộc quán; cặp không có bàn 2 ghế → từ chối tại cửa `noSeat`, không phạt; **từ JSON 2.1.4** (founder 22/10/2026, `spawn.singlesUntilPairSeat` true, Tier A): khi chưa bàn nào có 2 ghế, xác suất cặp = 0 (cùng lượt bốc), mọi nhóm là khách lẻ, từ bàn 2 ghế đầu tiên `pPair` áp như cấu hình — game mới không còn cặp bị từ chối `noSeat`; pin ≤ 2.1.3 giữ luật cũ); pin cũ: P0 1–2 · P1+ 1..capacity(bàn) | 1 (ghế đơn) | 03 §7 | random đều 🟡 (pin cũ) |
| Cầu theo sức chứa (`spawn.capacityDemand`, rules 28, D19) | khoảng cách tới nhóm kế × `min(maxMult, max(1, refTables / số bàn))` = **refTables 6 / maxMult 4**: 1 bàn ×4 · 2 ×3 · 3 ×2 · 4 ×1,5 · 5 ×1,2 · từ 6 bàn ×1; làm tròn một lần sau hệ số cỡ nhóm; không trễ khách đầu ca | — | 03 §7 | JSON 2.0.22 (S3), giữ ở 2.1.0; pin ≤ 2.0.21 ×1; §22 dòng "Cầu theo sức chứa" |
| Một-bàn-một-nhóm | bàn chỉ nhận nhóm khi `EMPTY` | — | 03 §1 | 🟢 |
| Order.patienceMs | `min(patience các khách trong nhóm)` lúc gọi | — | 03 §4 | 🟢 |
| `QUEUE_SLOTS` | `queueBaseSlots + ⌊Σghế / queueSeatsPerSlot⌋` = `1 + ⌊Σghế / 8⌋` | 2+⌊ghế/3⌋ | 03 §1 | JSON 2.0.22 (D25), game bàn ghế; pin cũ giữ `2 + ⌊ghế/3⌋` |
| Queue patience | `min(patience nhóm)` từ lúc xếp hàng | — | engine.ts | quá → cả nhóm bỏ (đếm `lostCustomers`) |
| Overflow | hết bàn + hết queue → từ chối tại cửa (`rejectedAtDoor`), **không phạt** | ✓ | 03 §8 | 🟢 |
| Grace window `graceMs` | 2.000–3.000 🟡 (**P0/P1 chưa bật** = 0) | — | 03 §9 | Phase 1 bật; serve nhận cả `pending` lẫn `grace_leaving` |
| Bàn / ghế | game bàn ghế (rules 28): bàn 1–2 ghế (`capacity`), cấp bàn Lv1–4 = lợi ích, không còn sức chứa; pin cũ: Lv1 2 · Lv2 4 · Lv3 6 · Lv4 8–10 | ghế 4→10 | 03 §6 | giá §8.6 |

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
- Shipper: spawn interval **round(220.000ms / weather.shipperMult)** (hệ số tần suất: mưa làm đơn tới nhiều hơn); đơn 4–7 món gross 180–290 **×k** 🟡; cần **Điện thoại** (§11); không đóng ca khi đơn đang chạy.
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

Runtime rules v5: `rush.schedule.warningMs` điều khiển báo trước, không hardcode 20s. Closing chỉ giữ đợt đang chạy đến deadline; không mở đợt kế. Hệ số về `none` trước khi tính tiền/phí ở đúng deadline; finalize sớm cũng kết thúc rush.

JSON 2.1.4 (founder 22/10/2026, B1.2, `rush.schedule.replanPendingArrival` true, Tier B): lúc một đợt **bắt đầu hoặc kết thúc**, lượt khách đã hẹn theo nhịp cũ được hẹn lại `min(thời gian còn lại, khoảng cách của 1 khách theo nhịp mới × cầu theo sức chứa)` — đợt mở bằng khách, không bằng một lần chờ đã hẹn trước nó (unit test trên pin 2.1.3 xác nhận lỗi: seed 7, trời lạnh, 1 bàn, khách đầu của đợt light 90 s đến ở giây 84,6 trong khi khoảng cách 1 khách là 17,6 s). Pin ≤ 2.1.3 giữ hẹn giờ cũ.

Runtime rules v8: lịch thường light/heavy cân bằng và xáo bằng seed location/shift/day, giữ đủ duration và khoảng warning, không chồng nhau. Không xếp đủ thì từ chối mở ca trước RNG/id/chi phí; ca lịch sử vẫn replay nguyên trạng. Heavy enjoyMult được chụp khi khách tới, không đổi thời gian đã chụp của khách cũ. Sổ ca dùng revenue thực credit (cap/Tỉnh Táo), payment/tips danh nghĩa tách riêng cho k. Lunch/football và ưu tiên event còn tiếp tục; không tự gán khung giờ trưa.

| id | Tên | Kéo dài | spawnInterval× | Sàn (`floorMs`) | pay× | tip× | phạt× | weight `voi`× | Phase |
|---|---|--:|--:|--:|--:|--:|--:|--:|:--:|
| `none` | Nhịp thường | — | 1.00 | 10.500 | 1.00 | 1.00 | 1.0 | 1 | P0 |
| `peak` (P0 only) | Cao điểm (toggle) | tay | **0.66** | — | 1.00 | 1.00 | 1.0 | 1 | P0 |
| `light` | Giờ Vàng nhẹ | 90s | 0.35 | 1.000 | 1.05 | 1.10 | 1.8 | 2 | P1 |
| `heavy` | Giờ Vàng nặng | 150s | 0.20 | 700 | 1.10 | 1.18 | 2.5 | 3 (+enjoy ×1.15) | P2 — **chỉ từ LP ≥ `rush.schedule.heavyFromLifePath` = 1** (founder 09/09; trước đó cả 2 đợt là light) |
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

JSON 2.1.4 (founder 22/10/2026, B1.3, `onboarding.firstShift.staleDisabled` true, Tier C): trong ca onboarding (onboarding bật, chưa xong ca nào) bia **không hết hơi** — `freshnessMs()` không giới hạn như cấp tủ cao nhất, huy hiệu tủ lạnh hiện `∞`; màn nghỉ sau ca 1 và từ ca 2 đọc lại tủ lạnh. Pin ≤ 2.1.3 giữ luật cũ.

---

## 8. Nâng cấp (sink chính) — F10 + item-list

Giá hiển thị = `round(priceBase × k)`. Mua bằng `coins`, không giảm `seasonEarned`. **Owner 2026-09-09: được nâng cấp ngay trong ca**, menu giữ tạm dừng đến khi đóng (F10 §12). Mỗi cấp đổi sprite (Phase 2).

> 🟢 **S5 `eco21-balance-pass` (JSON 2.1.0) — các bảng giá §8.1–§8.5 là số chốt từ sim cân bằng** (tập `priceBase` Lv2–5 của bom, bồn rửa, hầm lạnh, quầy, bếp; Lv1 = 0, bếp Lv0 chưa có). **Sàn giá:** không bậc thiết bị nào rẻ hơn bàn 2 (428 base = 1.070 xu từ quyết định owner 21/10/2026; trước đó 600 base = 1.500 xu): Lv2 của quầy = 750 base (1.875 xu, trên sàn). Lý do: chip "mục tiêu kế tiếp" gợi ý món trong tầm `reachMult` × thu nhập ca trung bình, làn Sức chứa trước, nên một bậc thiết bị rẻ hơn bàn 2 chen vào trước bàn 2 ở ~13 % ca đầu (thu nhập 417–500 xu) — sheet Nâng cấp chỉ còn thẻ thiết bị và hành trình guest/playable "mua bàn 2 sau ca 1" không còn nút (cổng `shift1.firstGoal` của bộ đánh giá và test `sealed-economy.test.ts`). Cột `priceBase`/×k thay các giá cũ (bom 5.000/20.000/80.000/300.000, rửa 4.000/16.000/60.000/200.000, hầm 3.000/12.000/45.000/150.000, quầy 1.500/8.000/30.000/120.000, bếp 12.000/50.000/160.000/400.000); các cột thời gian/sức chứa giữ nguyên. Bom Lv2–5 giờ chỉ mua dự trữ rót sẵn + mẻ nạp (vòi `pourSlots`/`pourMs` ra khỏi đường phục vụ từ rules 28) nên giá theo thứ đó, không theo tốc độ vòi. Snapshot ghim cũ giữ giá đã ghim. Số liệu chốt và cổng: changelog "2026-10-20 / JSON 2.1.0 (S5)".

**Gate Đường Lên Trùm cho thiết bị (founder 09/09, `upgrades.lifePathGate`):** Lv4 mọi thiết bị cần **LP2**, Lv5 cần **LP3**; bếp Lv3/Lv4 cần LP3/LP4 (`upgrade` trả `lifePathRequired`). Engine tự đánh giá LP theo `lifetimeEarned` sau mỗi lượt phục vụ (§15).

**Nguyên tắc trạm (founder 09/09) 🟢:** mọi trạm — bom rót, bồn rửa, bếp — là **pipeline tự động**; người chơi không bấm trạm, chỉ bấm Phục vụ. Mỗi trạm chỉ có **2 tham số: thời gian 1 mẻ (ms) + số lượng mỗi mẻ (batch)**. Mẻ bắt đầu ngay khi có ≥ 1 việc chờ, lấy tối đa `batch` việc; việc đến giữa mẻ chờ mẻ sau. Nâng cấp = đổi 2 tham số đó (và với bom: thêm sức chứa). Ánh xạ key JSON: bom `refillMs`/`kegBatch` (+ `pourMs`/`pourSlots` cho độ trễ rót); rửa `washMs`/`slots` (= batch); bếp `prepMs × prepMult`/`slots` (= số chảo) × `portionsPerPan`. Đây là cơ chế "ấm tích" của gốc áp cho mọi trạm — thay cho E2 "bếp chảo" đã đề xuất trong audit.

### 8.1 Bom bia + vòi rót (`keg`) — thay Ấm tích 🟡

| Lv | Tên | priceBase | ×k | Vòi (`pourSlots`) | `pourMs` | Cốc rót sẵn: `kegStorage` / `kegBatch` / `refillMs` (**bật**, `refillEnabled=true`) |
|:--:|---|--:|--:|:--:|--:|---|
| 1 | Bom nhựa + vòi tay | 0 | 0 | 1 | 2.000 | **4 / 2 / 12.000** (10 cốc/phút) |
| 2 | Bom inox nhỏ | **2.000** | **5.000** | 2 | 1.800 | **7 / 3 / 8.000** (22) |
| 3 | Bom inox lớn | **7.750** | **19.375** | 3 | 1.600 | **12 / 5 / 6.000** (50) |
| 4 | Hệ thống áp suất | **38.750** | **96.875** | 4 | 1.400 | **20 / 8 / 5.000** (96) |
| 5 | Trạm rót công nghiệp | **146.750** | **366.875** | 6 | 1.200 | **40 / 14 / 4.000** (210) |

- **Hai lớp hoạt động cùng lúc:** đầu ca châm lượng còn thiếu tới `kegStorage` từ kho bia thật, trừ cả lượng đã giữ trong mẻ đang chạy khi tính chỗ trống. Giữ bia dư và mẻ đang chạy qua ca/nâng cấp.
- Vòi cần bia trong bom và ly sạch; tối đa `pourSlots` ly rót đồng thời, mỗi ly mất `pourMs`. Trừ bia trong bom một lần khi bắt đầu rót; freshness của ly bắt đầu khi rót xong.
- Bom bắt đầu mẻ châm ngay khi còn chỗ và nguyên liệu, không đợi khách mới. Mẻ lấy `min(kegBatch, chỗ trống, kho bia)` lúc bắt đầu, hoàn thành sau `refillMs`; việc đến giữa mẻ chờ mẻ sau. Ly trên mâm nằm ngoài sức chứa bom.
- Mẻ đang chạy giữ số lượng/deadline qua nâng cấp. Menu/ẩn trang tạm dừng theo quyết định owner. Không tự tặng thêm ly khi nâng thiết bị. Ca cũ giữ cấu hình đã ghim; bộ số mới áp dụng tại lần mở ca thành công kế tiếp.

> 🟢 **Rules 28 (S2 `eco21-instant-pour`) — thay bullet "Vòi cần bia…" cho game mới (snapshot bàn ghế, `refillEnabled` bật):** vòi không còn trên đường phục vụ. Món bia gọi khi `beer.ready > 0` và có cốc sạch → `ready` cùng tick (không `pourMs`, không giới hạn `pourSlots`); freshness của ly bắt đầu ngay lúc đó. Bom chỉ còn hai tham số của quy ước trạm (`refillMs`, `kegBatch`) cộng sức chứa `kegStorage`; hai cột `pourSlots`/`pourMs` của bảng trên chỉ còn nghĩa với save ghim snapshot sức chứa, replay rules ≤ 27 và snapshot bàn ghế tắt `refillEnabled` (không có bom dự trữ, vòi vẫn chạy) — nâng bom Lv2–5 không còn mua thêm vòi hay vòi nhanh hơn (S5 định giá lại theo sức chứa + mẻ). Số "Rót sẵn n cốc" = min(`beer.ready`, cốc sạch). Không đổi số nào.

> Changelog 2026-09-11 — Owner Steer13, presentation only: `inventory.bia` = Bom bia / Beer keg (Mua bom / Buy keg); `beer.ready` = Cốc rót sẵn / Poured glasses; thiết bị `keg` có tiêu đề Vòi rót / Beer taps, giữ tên cấp. HUD nối ba số bom, rót sẵn và cốc sạch. Không đổi engine, config, economy, refillEnabled hay các dung lượng/thời gian.

### 8.2 Bồn rửa cốc (`washer`) 🟢 washMs/slots số gốc · 🟡 giá cân lại 09/09

Tự động: cốc bẩn vào mẻ ngay; **1 mẻ = tối đa `slots` cốc, mất `washMs`** → bền vững 8,6 / 12 / 30 / 72 / 200 cốc/phút. (`slots` giữ tên key để engine không đổi; nghĩa = số cốc mỗi mẻ.)

| Lv | Tên | priceBase | ×k | `washMs` | `slots` |
|:--:|---|--:|--:|--:|:--:|
| 1 | Chậu nhôm | 0 | 0 | 7.000 | 1 |
| 2 | Chậu đôi | **1.500** | **3.750** | 5.000 | 1 |
| 3 | Bồn rửa inox | **6.250** | **15.625** | 4.000 | 2 |
| 4 | Máy rửa bán tự động | **29.500** | **73.750** | 2.500 | 3 |
| 5 | Máy rửa công nghiệp | **97.750** | **244.375** | 1.500 | 5 |

Rules18: rửa theo một mẻ dùng `slots/washMs`; lấy ngay các ly bẩn hiện có tới giới hạn, không chờ đủ mẻ. Ly bẩn tới thêm xếp hàng đến mẻ kế tiếp. Ly sạch giữ trong pool sẵn dùng. HUD hiển thị sạch/tổng ly và thanh tiến độ; panel ghi số đang chờ + sức rửa mỗi mẻ.

Prototype: `WASH_BASE = {1, 7000}`, `WASH_UPGRADED = {3, 2500}` (= Lv4, toggle đo gate).

### 8.3 Hầm / tủ giữ lạnh (`cooler`) — thay Thùng đá

| Lv | Tên | priceBase | ×k | Freshness cốc | Freshness bom (🔵) |
|:--:|---|--:|--:|--:|--:|
| 1 | Thùng xốp + đá | 0 | 0 | 12s | 4' |
| 2 | Thùng inox + đá | **1.250** | **3.125** | 20s | 6' |
| 3 | Tủ mát mini | **4.500** | **11.250** | 35s | 9' |
| 4 | Tủ lạnh bàn | **22.500** | **56.250** | 60s | 15' |
| 5 | Hầm lạnh | **73.250** | **183.125** | ∞ | ∞ |

### 8.4 Quầy / kho (`stall`) — sức chứa nguyên liệu

| Lv | Tên | priceBase | ×k | Cap mỗi nguyên liệu | Gate mở |
|:--:|---|--:|--:|--:|---|
| 1 | Bàn bày | 0 | 0 | 15 | — |
| 2 | Kệ nhôm | **750** | **1.875** | 25 | — |
| 3 | Tủ kệ inox | **3.250** | **8.125** | 45 | **mở Biển hiệu** (§10) |
| 4 | Quầy bar mini | **14.250** | **35.625** | 80 | — |
| 5 | Quầy bar cao cấp | **59.000** | **147.500** | 150 | — |

### 8.5 Bếp (`kitchen`) — MỚI, mở mồi nóng 🟡

| Lv | Tên | priceBase | ×k | Chảo (`slots`) | Khẩu phần/chảo (`portionsPerPan`) | Prep× | Mở món |
|:--:|---|--:|--:|:--:|:--:|--:|---|
| 0 | (chưa có bếp) | — | — | 0 | 0 | — | — |
| 1 | Bếp than tổ ong | **4.500** | **11.250** | 1 | **2** | 1.00 | `dau`, `topmo` |
| 2 | Bếp gas nhỏ | **19.500** | **48.750** | 2 | **2** | **0.90** | `long` |
| 3 | Bếp gas đôi | **78.500** | **196.250** | 2 | **3** | **0.80** | — |
| 4 | Bếp công nghiệp | **195.500** | **488.750** | 3 | **3** | **0.70** | — |

Tự động nấu theo chảo (founder 09/09): 1 chảo = 1 mẻ tối đa `portionsPerPan` khẩu phần **cùng món** (gom món của cùng Order trước, Order khác nếu còn chỗ), mất `prepMs × prepMult`. Sim tiến trình (bot 1 s): bếp theo chảo cho 26–40 k xu/ca, mất khách 13–29 % — bếp thành bậc tăng thu nhập thay vì bẫy.

- ⚠️ **Audit 09/09:** với nấu *từng đĩa* bếp làm thu nhập về 0 (Order chỉ giao khi mọi món xong + phạt bỏ đi → hết xu → vòng xoáy); prep 4/5/7 s (§2) chỉ giảm còn "cắt nửa". **Đã chốt nấu theo chảo (bảng trên).** Còn chờ **E1 "giao mâm thiếu món không phạt"** (lưới an toàn khi hết hàng/chưa có bếp) — `docs/TRANG-THAI-DOCS.md` mục 4.

- ⚠️ **Mâu thuẫn đã chốt:** `item-list-upgrade-levels.md` §6 ghi 5 cấp giá ×k 5k/15k/40k/100k/250k và đặt Lòng ở Lv3; `F10`/`F11`/GDD §2 ghi Lòng mở **Bếp Lv2** và giá base 8k/35k/120k/300k. **Chốt theo GDD + F10/F11** (4 cấp trả tiền, Lòng ở Lv2). Cần sửa item-list §6 (sprite Lv5 "Bếp master" giữ làm cosmetic/visual của Lv4 hoặc bỏ).

### 8.6 Bàn (`table`) — 03 §6, item-list §1

> 🟢 **Rules 28 — số chốt của game bàn ghế (S1/S4/S5, JSON 2.1.0) thay bảng cũ bên dưới (bảng cũ chỉ còn cho snapshot ghim ≤ 2.0.x):** game mới 1 bàn × 1 ghế. Bàn thứ n (n = 2…8) = `tablePriceBase[n−2]` = **428 · 3.700 · 5.700 · 9.600 · 12.900 · 15.900 · 16.000** base (hiển thị ×2,5: **1.070** · 9.250 · 14.250 · 24.000 · 32.250 · 39.750 · 40.000; bàn 2 là 600 base = 1.500 xu cho tới quyết định owner 21/10/2026, dòng changelog cuối); trần số bàn theo mặt bằng `tableSlots` **8 ở mọi mặt bằng** (§16). Ghế 2 chỉ mở sau `chairsAfterTables` = 4 bàn, giá theo số ghế 2 đã mua toàn quán `chairPriceBase` = **400 · 600 · 900 · 1.200 · 1.600 · 2.000 · 2.400 · 2.800** base (hiển thị ×2,5: 1.000 · 1.500 · 2.250 · 3.000 · 4.000 · 5.000 · 6.000 · 7.000), tối đa 2 ghế/bàn. Nâng bàn →Lv2 `7.000 + 2.500·n` · →Lv3 `34.000 + 13.500·n` · →Lv4 `59.500 + 20.500·n` base (n = số bàn đã đạt cấp ≥ cấp đích; gate LP1/LP2/LP4); nâng ghế `12.000 + 6.000·t` base (t = số lần nâng ghế đã mua toàn quán; gate LP1/LP2) — S5 đổi giá, giữ gate và lợi ích của S4. Lợi ích: Lv2 `extraRounds` 1 · Lv3 `pExtraMoi` 0,35 · Lv4 `tipMult` 1,25; ghế `patienceMult` 1,15/1,30 (03-SPEC §6). Đã bỏ `extraSeatPriceBase`, `table.levels[].capacity/priceBase/repBase/requiredBadge`, `table.maxTables`, `backrest`.

| Lv | Tên | Capacity | priceBase (mua/nâng) | ×k | Gate |
|:--:|---|:--:|--:|--:|---|
| 1 | Bàn con | 2 | 0 (có sẵn 3 bàn ở P0) | 0 | — |
| 2 | Bàn vuông | 4 | **1.500** | **3.750** | — |
| 3 | Bàn dài | 6 | **6.000** | **15.000** | — |
| 4 | Bàn VIP / kê dài | 8–10 | **25.000** + uy tín 3.000→40.000 | **62.500** + ⭐7.500→100.000 | **huy hiệu Kết Nối** (free-only) |

- **Mua thêm bàn** (đòn bẩy 2): giá = Σ giá 2 ghế quy đổi kế tiếp (`extraSeatPriceBase`): ghế 4→200 · 5→500 · 6→1.000 · 7→1.500 · 8→2.500 · 9→5.000 · 10→10.000 · **11→18.000 · 12→22.000 · 13–48 +8 %/ghế** (base, ×k). Từ 3 bàn con: **bàn 4 = 4.000 · bàn 5 = 15.000 · bàn 6 = 40.000** base. Ghế 11–48 thêm 09/09 vì đường cong gốc dừng ở 10 → sau khi nâng bàn lệnh mua bàn thất bại (`seatPriceUnconfigured`). Số bàn tối đa **6**.
- **Ghế tựa** (cho ghế đó gọi 2 món, 🔵 late-game): lần nâng t=0..8: xu `100.000 + t×50.000` base (×k), uy tín `[3.000, 4.500, 6.500, 9.000, 12.000, 16.000, 22.000, 30.000, 40.000]` (×k); gate 9 ghế + Kết Nối. Với hệ bàn: "2 món/khách" đã là mặc định (mỗi khách bia + ≤1 mồi) → ghế tựa ở bia hơi = **mở 2 mồi/khách** 🔵.

### 8.7 Cốc (`glasses`) 🟢 cơ chế · 🟡 cap/giá cân lại 09/09

Audit 09/09: với 10 cốc cố định, nâng 5 bàn lên 6 chỗ làm thu nhập **giảm** (34 k → 22 k xu/ca, mất khách 45–56 %); 30 cốc → 40 k/ca. Cốc là tài nguyên quay vòng — phải theo kịp số chỗ ngồi.

| Hằng số | Giá trị |
|---|--:|
| Cốc khởi đầu | **10** |
| Buy-cap (mua tối đa) | **40** (chốt 09/09 — gốc 10 vì ghế gốc max 10; bia hơi tới 48 chỗ nên cốc phải mua theo chỗ) |
| Storage-cap (kho tối đa) | **50** — phần dôi 40→50 chỉ lấp bằng quà "đại gia" +1 cốc/lần (§14) |
| Giá mua 1 cốc | **400 base · 1.000 ×k** 🟡 (lệnh `buyGlass(count)`, ngoài ca — engine đã cài 09/09; 30 cốc ≈ 1 ca thu nhập) |
| Vòng đời | `clean → in_use → dirty → washing → clean` |

---

## 9. Tip · Uy tín · Phạt (công thức) 🟢 — GDD §8, 03 §5/§9

```text
// per customer, tại thời điểm Order được giao
patienceRatio = clamp((order.placedAt + order.patienceMs − now) / order.patienceMs, 0, 1)
tip = patienceRatio < 0.6 ? 0 : round(payment × 0.17)
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
| `TIP_RATE` | 0.17 | JSON 2.1.0 (S5 sim cân bằng; trước đó 0.30, bản W9 ghi 0.22; lần chốt đầu của S5 là 0.19) |
| `TIP_VIP_MULT` | 10 | |
| QR | ceil ×1.2 | cần Điện thoại + LP2 (§11) |
| Tỉnh Táo (well-rested) | ×1.1 lên (payment+tip), 10 phút, 1 lần/ngày, keyed theo **open-day** (`tip.wellRestedKeyedBy`); số ca tính finalize-day, tiền tính per-earn | |
| Grace (03 §9.3) | chạm trong grace: patience ép = 10% → tip 0, vẫn thu tiền, không phạt | P1 |
| Uy tín / lượt | **+3** có tip · **+1** không tip · **−5** mỗi khách bỏ đi (`queueLost`/expired) · **−1** cốc hết hơi (gộp: chỉ trừ 1 lần theo lý do nặng nhất, 03 §9.4) | không ×k |
| Phạt mất khách `ab` | `round(gross × 0.10 × type.leavePenaltyMult) × rush.penaltyMult` — gross = giá gốc chưa tip | ×k (vì gross đã là xu bia hơi → **không nhân thêm**) |
| Phạt cụm | Order expire → **mọi khách chưa phục vụ** trong nhóm bỏ cùng lúc; phạt = Σ từng khách (VIP ×10) | 03 §5 |
| Overflow tại cửa | 0 phạt, chỉ đếm `rejectedAtDoor` | |
| "Mời về để đóng cửa" | phí = Σ `ab(c)` mọi khách còn ngồi, kể cả đang dùng món (VIP = 100% đơn trước rush, Chí Phèo = 0); queue/seating chưa có món đã gán phí 0 | gốc §12b; xác nhận trước khi chi; ghi `spent`, không phạt uy tín/lost; thiếu xu từ chối |
| Mời về giữa ca (`kickTable`, Đợt 3) 🟢 | chỉ bàn khách **đang nhâm nhi** sau khi được phục vụ (`consuming`: nhóm ngồi lại với mâm đã giao; `occupied`: chỉ còn Chí Phèo giữ bàn) — không khi khách đang chờ món, đang ngồi vào, bàn đang dọn hay trống; xu = Σ `round(gross đơn gần nhất của khách × kickTable.feeRate × type.leavePenaltyMult)` (`feeRate` **0,5** — quyết định owner 1, 22/10/2026: luật +10 % thu nhập 30 ngày của bot mời/không mời đọc theo thu nhập ròng sau phí, changelog 2026-10-22 "JSON 2.1.1"; VIP ×10, tức 5× gross mâm của VIP; Chí Phèo 0 — D3); uy tín −`kickTable.repPerGuest` (2) mỗi khách, **không ×k** (`reputation.notScaledByK`, không xuống dưới 0) | thay dòng 🟡 "Tiễn ngồi lỳ: tốn uy tín ∝ giây đã ngồi, `⌈giây/10⌉ × 5 ⭐ ×k`" (FEEDBACK II.3: ngồi càng lâu càng đắt là ngược trực giác; `penalty.kickStubbornRepBase` giữ cho pin cũ, không còn dùng). Như `ab`: gross đã là xu bia hơi → không nhân k thêm. Xác nhận 1 chạm với giá đã thấy (`maxCost`; giá đổi → `kickCostChanged`); thiếu xu từ chối; ghi `spent`, không phạt uy tín −5 / `lost` / `lostStreak`; bàn sang dọn rồi nhận nhóm kế. §22 dòng `kickTable` |
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
| `golden` | Hoàng kim | 30.000; gate ⭐5.000 | 75.000; gate ⭐12.500 | **VIP ×3** |

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
| Mở ca | cần thể lực 100% (trừ **3 ca đầu**, hàng kế) | 🟢 |
| 3 ca đầu của đời save (`shift.noCooldownFirstShifts` = 3) | mở ca **không đòi thể lực đầy** (không phải chờ cooldown); mở xong thể lực = 100 %; từ ca 4 cooldown ~30' như trên; trần ca/ngày 8/6/5 giữ nguyên. Chỉ game rules 28; save cũ giữ luật cũ | 🟢 owner 18/09 (D8) |
| Trần số ca/ngày (normal cap) | newbie **8** · regular **6** · veteran **5** | 🟢 |
| Quyền chơi | **FREE toàn bộ** = normal cap 8/6/5 (chốt 08/09). `entitlements.freeSessionsPerDay` = `dailyShiftCap[segment]`; `sessionPass.enabled=false`. Section chỉ còn dùng cho campaign/override (giảm cap tạm), không có tier trả tiền | 🟢 |
| `DAILY_EARN_CAP` | **1.000.000 ×k** (400.000 base; D24, JSON 2.1.0, trước đó 500.000; review vòng 1 đã hạ xuống 350.000 rồi vòng 2 trả lại vì không cổng nào cần số khác) — chạm: vẫn phục vụ, `credited = 0`; per-day-bucket theo giờ VN tại **thời điểm earn** | 🟢 |
| Số ca credit | lúc **finalize** (đóng hẳn) → ngày đóng ca | 🟢 |
| Tỉnh Táo | ×1.1, 600.000ms, 1 lần/ngày sau nghỉ >6h | 🟢 |
| Đóng ca | `closing` grace: khách đang uống ở lại, không spawn; `kick-all` đóng ngay (phí §9) | 🟢 |
| Rollover ngày | nửa đêm `Asia/Ho_Chi_Minh`, **server-side**, client mirror | 🟢 |
| State khởi đầu | coins **750 ×k** (300 base; JSON 2.1.0 giữ ví của S4: người chơi KIẾM bàn 2 ở ca 1, P0) 🟡 · kho: bia 10/15, lac 5/15, nem 5/15 🟡 · cốc 10 · 1 bàn 1 ghế (rules 28) | 🟡 |
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

- Runtime rules12: `target = ceil(curve)`; earnings target = `ceil(curve ×k)`. Các reward Base qua loader `round(Base ×k)` đúng một lần. Claim thưởng không cộng dayEarned/seasonEarned/lifetimeEarned; bonus yêu cầu đủ5 và còn kho tờ rơi. Bảng điều kiện event/đổi ngày/replay tại `docs/features/F17-quest-system.md` §10.
- Uy tín thưởng lẻ (⭐12.5) → **làm tròn lên** trong JSON (`⭐13`) hoặc giữ base ⭐5 không ×k — **chốt: uy tín-thưởng nhiệm vụ ×k rồi làm tròn** (GDD §11 quy ước ⭐ ×k).
- **Điểm danh 7 ngày** (uy tín, không ×k? — chốt **×k**): base 2/4/8/16/32/64/128 → ×k 5/10/20/40/80/160/320 (tổng 635 ⭐); lỡ 1 ngày reset về ngày 1.
- Runtime rules13: chuỗi điểm danh tính ngày **có mở game/active**, tách riêng ngày nhận quà; chơi nhưng chưa nhận vẫn giữ chuỗi, quà cũ hết hạn lúc 00:00 VN. Vắng ngày reset khi `loginMissResets=true`; nếu false chỉ tiến một ngày quan sát được. Hết mảng thưởng quay về ngày 1; không nhận bù ngày offline. Thưởng qua loader `round(Base ×k)` một lần và không cộng các ledger xếp hạng. Bảng trạng thái/claim/replay: F17 §11.
- **Referral:** mốc 1 (1 bạn qualified) ⭐250 base → ⭐625 + **huy hiệu Kết Nối** · mốc 2 (3 bạn) ⭐1.000 → ⭐2.500 · mốc 3 (bạn đạt LP2) ⭐3.000 → ⭐7.500. Người được mời: thưởng chào mừng 2 giai đoạn (server) 🟡.
- **Gửi quà** = transfer nguyên liệu P2P (≤5 mỗi loại + xu 🟡), 4 tầng chống farm (1 tin chưa đọc/người, trần gửi/nhận ngày, unique recipients, kiểm duyệt).
- **Thùng hàng (crate) ánh xạ:** small {bia 4, lac 2, nem 2} · medium {8, 4, 4} · large {15, 8, 8} (+ mồi nóng 0/2/4 khi đã mở bếp) 🟡.
- **Két Bia Bí Ẩn (quà "đại gia" từ Chí Phèo, pity):** 3 category: xu **350–480 base → 875–1.200 ×k** · nguyên liệu 15–40 đơn vị random · uy tín 51–92 base → ⭐128–230 ×k · **hiếm: +1 cốc** (vượt buy-cap, §8.7). Không giới hạn lần/ca; pity tăng mỗi Chí Phèo, reset khi lộ.
- **Mảnh huy hiệu:** 8 mảnh = 1 huy hiệu (F16 §5). **Tem trang trí:** đổi cosmetic (giá §16).

---

## 15. Giải Nhậu, Vụ Bia, Đường Lên Trùm — F12, F13 (ngưỡng ×k)

**Giải Nhậu (8 bậc, `minSeasonEarned`; JSON 2.1.0: cùng một thang với Đường Lên Trùm bên dưới, S5):**

| # | id | Tên | Base | ×k |
|:--:|---|---|--:|--:|
| 1 | `dong` | 🥤 Cốc Nhựa | 0 | 0 |
| 2 | `bac` | 🍺 Cốc Thủy Tinh | 8.000 | 20.000 |
| 3 | `vang` | 🏺 Vại Sành | 20.000 | 50.000 |
| 4 | `titan` | ⚔️ Vại Đồng | 80.000 | 200.000 |
| 5 | `bach_kim` | 💎 Bom Bạc | 280.000 | 700.000 |
| 6 | `hong_ngoc` | 🍻 Bom Vàng | 680.000 | 1.700.000 |
| 7 | `kim_cuong` | 👑 Vua Bia | 1.200.000 | 3.000.000 |
| 8 | `huyen_thoai` | 🏆 Trùm Bia Hơi | 2.000.000 | 5.000.000 |

- 2 Vụ Bia song song: **Phân Hạng 21 ngày** (JSON 2.1.0, trước đó 7; thưởng đậm + top10 huy chương + Bàn Thờ Ông Địa) · **Tranh Bá 21 ngày** (trước đó 14; nhẹ — một cửa sổ chung với Phân Hạng, nên một mùa là một lần đặt lại). Epoch neo `2026-04-11T10:00Z` 🟡, tz VN. Tie-break: `firstReachedCurrentSeasonEarnedAt`.
- Thưởng cuối Vụ = **bó nguyên liệu theo hạng** (không xu) qua hòm thư; top 10 → huy chương + khắc tên. 🟡 bảng lượng theo hạng: Cốc Nhựa {bia 20, lac 10, nem 5} … Trùm {bia 300, lac 150, nem 100, long 20} (server config).
- 2 bảng: **Xếp hạng** theo bậc xuyên mặt bằng · **Dạo Phố** theo `location × bậc`.

**Đường Lên Trùm (LP0–LP7, `lifetimeEarned` base ×k):** — engine đã cài 09/09: lên mốc ngay khi `lifetimeEarned` chạm ngưỡng, thưởng `rewardCoinBase` vào `coins` (ngoài ledger xếp hạng), event `life_path_level_reached`; **Điều kiện phụ (ghế, phone, QR, peak) được kiểm tra từ config; JSON2.0.4 bỏ chó khỏi LP1 khi M6 hoãn.** LP dùng làm gate: giờ vàng heavy (§6), thiết bị Lv4/Lv5 (§8), mặt bằng (§16).

| Mốc | Tên | lifetime base | ×k | Điều kiện phụ | Thưởng base | ×k | Gate mở |
|:--:|---|--:|--:|---|---|---|---|
| LP0 | Bưng Bê | 0 | 0 | — | — | — | start |
| LP1 | Phụ Quán | 8.000 | 20.000 | 4 bàn | 5.000 + thùng nhỏ | 12.500 | Điện thoại, mặt bằng LP1 |
| LP2 | Tay Ngang | 20.000 | 50.000 | Quầy Lv3 + Điện thoại | 10.000 + mảnh HH | 25.000 | QR, Tờ rơi, mặt bằng LP2 |
| LP3 | Chủ Sạp | 80.000 | 200.000 | thiết bị Lv3 + QR | 20.000 + thùng vừa | 50.000 | mặt bằng LP3 |
| LP4 | Chủ Quán | 280.000 | 700.000 | tờ rơi + peak Bom Bạc | 50.000 + mảnh + tem | 125.000 | Phố Cổ |
| LP5 | Ông Chủ | 680.000 | 1.700.000 | biển hiệu + peak Bom Vàng | 100.000 + thùng vừa + tem | 250.000 | Ga Metro |
| LP6 | Đại Gia Bia | 1.200.000 | 3.000.000 | đồ & quầy Lv5 + peak Vua Bia | 250.000 + thùng lớn + 2 mảnh | 625.000 | Khu Phố Tây |
| LP7 | Trùm Bia Hơi | 2.000.000 | 5.000.000 | 10 ghế + peak Trùm | 500.000 + thùng | 1.250.000 | prestige |

---

## 16. Mặt bằng — F14 (chốt bảng F14; item-list §14 đã đồng bộ 08/09)

Rent/ngày = bảng dưới (JSON 2.1.0: **0,3 ×** bảng cũ `round(700 × (e/5) × (1 + e/50)) × k`, tròn 100); kỳ thuê **3 ngày** (`leaseDays`; brief B5 và DESIGN-story §3; JSON 2.1.0, trước đó 7; review vòng 1 đã hạ xuống 2 rồi vòng 2 trả lại) trả trước; **cọc 25%** (hoàn khi hết kỳ bình thường); rời sớm mất cọc + về Hẻm Nhỏ. Multiplier áp lên payment **trước** cap. Server lưu `rentPerDay` lúc ký.

| # | id | Tên | Mult | `e` | Rent/ngày base | ×k | Tiền kỳ 3d ×k | Cọc ×k | Bàn tối đa (`tableSlots`) | Gate |
|:--:|---|---|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | `hem_nho` | Hẻm Nhỏ | 1.0 | — | **0** | 0 | 0 | 0 | 8 | start (miễn phí, về đây khi bỏ thuê) |
| 2 | `ngo_cho` | Ngõ Chợ | 1.012 | ~~10~~ | **1.200** | 3.000 | 9.000 | 2.250 | 8 | LP1 |
| 3 | `ben_xe` | Bến Xe | 1.025 | ~~15~~ | **2.000** | 5.000 | 15.000 | 3.750 | 8 | LP1 |
| 4 | `gan_cong_so` | Gần Công Sở | 1.038 | ~~20~~ | **3.000** | 7.500 | 22.500 | 5.625 | 8 | LP2 |
| 5 | `gan_svd` | Gần Sân Vận Động | 1.05 | ~~25~~ | **4.200** | 10.500 | 31.500 | 7.875 | 8 | LP3 |
| 6 | `ho_bia_dem` | Hồ Bia Đêm | 1.063 | ~~30~~ | **5.400** | 13.500 | 40.500 | 10.125 | 8 | LP3 |
| 7 | `pho_co` | Phố Cổ | 1.075 | ~~35~~ | **7.200** | 18.000 | 54.000 | 13.500 | 8 | LP4 |
| 8 | `ga_metro` | Ga Metro | 1.088 | ~~40~~ | **9.600** | 24.000 | 72.000 | 18.000 | 8 | LP5 |
| 9 | `pho_tay` | Khu Phố Tây | 1.1 | ~~45~~ | **13.200** | 33.000 | 99.000 | 24.750 | 8 | LP6 |

- 🟢 **S5 (JSON 2.1.0, số chốt của review vòng 1):** cột Mult là dốc 1.0 → 1.10 (bước ≈ 0,0125; trước đó bậc đều 0,1 từ 1.1 đến 1.8) và cột `tableSlots` = **8 ở mọi mặt bằng** (trước đó mọi mặt bằng = 4, D13; lần chốt đầu của S5 là 4·4·5·6·6·7·8·8·8): bot của plan (bàn/ghế trước) mua bàn 2…8 trước ghế 2 đầu tiên nên ghế 2 chỉ rơi vào ca 40–56 khi mặt bằng đầu đã chứa 6–8 bàn; kỳ thuê 3 ngày thay 7 nên tiền kỳ = 3 × rent/ngày, cọc 25 % của tiền kỳ. Rent/ngày = 0,3 × bảng cũ: một hợp đồng không được ăn mất một nấc của thang bàn. **`tableSlots` 8 ở mọi mặt bằng là QUYẾT ĐỊNH OWNER thứ hai** (đảo D13 "hẻm đầu = 4 bàn"; bảng so sánh với 4·4·5·6·6·7·8·8·8 và với toàn 4 ở BLOCKERS `04 · tableSlots`): với tám chỗ ở mọi nơi một mặt bằng không mở thêm bàn nào, nó chỉ cho `mult` (tối đa +10 % payment) — câu hỏi cho owner: `mult` có là đòn giá trở lại (và mặt bằng có lại mở thêm chỗ như D13), hay mặt bằng chỉ là nhãn? Số lẻ 3 chữ số là do sweep chọn (một dốc tròn 2 chữ số làm mất hai ô của seed 99 — quỹ đạo nhạy theo một xu); đổi chúng = chạy lại bảng cổng (04-SPEC §5).
- ⚠️ **Mâu thuẫn đã chốt:** F14 (feature spec) đặt lại tên/multiplier thành bậc đều 0.1 và index `e` 5..45; item-list §14 giữ 10 vị trí + rent gốc (770→29.120). **Chốt theo F14** (dev spec, có Gần SVĐ như GDD §12), **Hẻm Nhỏ rent 0** (F14 ghi e=5 là sai — mặt bằng gốc phải miễn phí để "về Hẻm Nhỏ" không phí). Gate LP1 cho 2 vị trí đầu lấy từ GDD/gốc (F14 để "-"). Cần sửa item-list §14 → 9 vị trí + background theo bảng này.
- **Cân lại 09/09 (audit):** rent gốc ×k chỉ bằng ~1/10 gốc tính theo % thu nhập (e-index bị cắt nửa trong khi thu nhập cao gấp đôi ánh xạ). Bảng mới neo **rent/tuần ≈ 15–25 % thu nhập tuần của tier** (sim tiến trình: ~160 k/ngày ngày 1–2 → 300–450 k/ngày từ tuần 2); bỏ công thức e. Hoà rent gross/ngày = `rent/(mult−1)`: Ngõ Chợ 100 k · Bến Xe 85 k · Công Sở 83 k · SVĐ 88 k · Hồ Bia 90 k · Phố Cổ 100 k · Metro 114 k · Phố Tây 138 k ×k — thấp hơn thu nhập tier tương ứng nhưng cao hơn tier dưới. **Engine đã cài 09/09**: `rentLocation(id)` (resting, gate `gateLifePath`, trả trước 7 ngày + cọc 25 %), `leaveLocation` (mất cọc), hết kỳ tự về Hẻm Nhỏ + hoàn cọc (`lease_ended`), mult áp trong `customerValue`. Sim: người chơi thuê Ngõ Chợ ngày 7, Bến Xe ngày 14, Hồ Bia Đêm ngày 29 → chạm trần ngày 500 k lần đầu ngày 30 (đúng vai trò "trần chỉ chặn top").

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
| `GLASS_COUNT` / `POUR_MS` | 10 / 3.000 (prototype lưu trữ; JSON 1.7.1 = **2.000**) | §8.7, §8.1 |
| `WASH_BASE` / `WASH_UPGRADED` | {1, 7.000} / {3, 2.500} | §8.2 |
| `FRESHNESS_MS` / `FRESHNESS_WARN_MS` | 12.000 / 9.000 | §7 |
| `TIP_PATIENCE_THRESHOLD` / `TIP_RATE` / `TIP_VIP_MULT` | 0.6 / 0.17 / 10 | §9 |
| `CUSTOMER_WEIGHTS` | thuong 1.0 · voi 0.3 · vip 0.1 | §4 |
| `TABLE_COUNT` / `SEATS_PER_TABLE` / `QUEUE_SLOTS` | 3 / 2 / 4 | §3 |
| `SHIFT_DURATION_MS` / `DAILY_EARN_CAP` | 720.000 / 1.000.000 | §13 |
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
| 9 | Cây thiết bị ~3 M mua xong ngày 9–21 (audit 09/09) vs nhịp mid-core mong muốn | giá thiết bị ×1,3–1,6 (§8.1–8.6), bếp là sink lớn nhất; rent + gate LP còn chờ | rent/gate LP chờ duyệt |
| 10 | Bếp nấu từng đĩa + Order giao trọn mâm → sập kinh tế (audit 09/09) | prep 4/5/7 s (§2) + bếp theo chảo (§8.5) + **khách chỉ gọi mồi còn hàng** (§2, 03-SPEC v1.3); founder giữ "chỉ giao khi đủ món" (E1 bác) | ✅ engine 09/09 |
| 8 | Free ca/ngày (F26) vs trần 8/6/5 (GDD §10) — **⛔ F26 bỏ 08/09, free = normal cap** | 2 lớp: entitlement free = **config** (`entitlements.freeSessionsPerDay`, mặc định 1, theo segment/campaign, remote config) → Vé Mở Ca lên normal cap (§13) | sửa F26 §2 (đã sửa 08/09) |

---

## 22. Config Registry — key → tier / role / hiệu lực (khớp `trum-bia-hoi-brd-admin.md` §5.2)

Mọi section của `docs/config/economy.tbh.json` đều nằm trong registry. **Tier A** = đổi tiền thật / tổng xu-ngày / thứ hạng / quyền truy cập → Economy Admin đề xuất, **Super Admin duyệt (dual)**; **Tier B** = cân bằng trong ca → Economy Admin tự publish; **Tier C** = content/ops → Game Admin. Hiệu lực: `immediate` / `next_shift` / `next_day` (00:00 VN) / `next_season`. Override: `player > campaign > segment > default` (override player/campaign bắt buộc `expiresAt`). Key mới chưa xếp → mặc định **B**.

| Section JSON | Keys (tóm tắt) | Tier | Role sửa | Hiệu lực | Ghi chú |
|---|---|:--:|---|---|---|
| `k` | `value`, `band`, `anchorValuePerServe` | **A** | Economy Admin → Super Admin | `next_day` | `anchorValuePerServe` 🟢 thiết kế không đổi nhưng vẫn là config (đổi = quyết định founder) |
| `shift` | `durationMs`, `regenRate`, `regenOnlyActive`, `dailyShiftCap`, `dailyEarnCapBase`, `capBucket`, `wellRested`, `closingGrace`, `kickAllAllowed`, `openRequiresFullStamina`, `noCooldownFirstShifts` | **A** | Economy Admin → Super Admin | `next_day` | ca đang chạy giữ `configVersion` cũ. `noCooldownFirstShifts` (S5 `eco21-balance-pass`, JSON 2.1.0, rules 28; D8): số ca đầu của đời save mở không cần thể lực đầy (mở xong thể lực = 100 %); đổi nó đổi nhịp ngày 1 của mọi người chơi nên cùng cấp duyệt kép với `dailyShiftCap`; validator: số nguyên ≥ 0; pin < 2.1.0 không có key (`SEAT_KEYS_ADDED_LATER`, luật cũ: mở ca đòi thể lực đầy) |
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
| `weather` · `rush` | bảng mult từng thời tiết, `rush.{none,peak,light,heavy,lunch_light,football}`, `rush.schedule` (từ JSON 2.1.4 có `replanPendingArrival` true: hẹn lại lượt khách đang chờ lúc đợt bắt đầu/kết thúc, founder 22/10/2026) | **B** | Economy Admin | `next_shift` | lịch rush theo giờ VN |
| `freshness` | `baseMs`, `warnMs`, `coolerLevelMs`, `kegFreshnessMs`, `staleConsequence`, `expiredOrderGlassState` | **B** | Economy Admin | `next_shift` | |
| `upgrades` · `glasses` · `signboard` · `unlocks` · `dog` | level tables (`keg`, `washer`, `cooler`, `stall`, `kitchen`, `table` — từ JSON 2.0.20 không còn `capacity`), `backrest` (bỏ từ JSON 2.0.23: thay bằng `upgrades.table.chairUpgrade`, dòng "Cấp bàn và cấp ghế" bên dưới), `upgrades.table.startingTables`, `glasses.{start,buyCap,storageCap,priceBase}`, `signboard.{installFeeBase,gate,styles}`, `unlocks.{phone,qr,flyer,emergencyPack}`, `dog.{levels,capturedMs,theftReductionByLevel}` | **B** | Economy Admin | `next_shift` | validator: level tăng dần, giá không âm |
| `quests` · `crates` · `chairmanBox` | `daily` target/reward, `loginTrackRepBase`, `loginMissResets`, `referral`, `gift`, `badgeShardsPerBadge`, crate tables, `chairmanBox.*` | **B** | Economy Admin | `next_shift` | pool nhiệm vụ (nội dung) là Tier C |
| `risk` · `locations` | `gangster`/`inspection`/`urbanPatrol`/`drunkFight`/`offlineTheft` (chance, fee, cooldown), `locations.list[]` (rent, mult, gate), `leaseDays`, `depositRate`, `earlyLeaveLosesDeposit` | **B** | Economy Admin | `next_day` | mặt bằng đổi giữa ngày gây lệch cọc → `next_day` |
| Mô hình bàn ghế (rules 28) | `locations.list` (cả danh sách vì `tableSlots` nằm trong từng dòng — registry so mảng theo cả path), `spawn.pPair`, `spawn.singlesUntilPairSeat` (JSON 2.1.4, founder 22/10/2026: khách lẻ tới khi có bàn 2 ghế), `upgrades.table.tablePriceBase` (bàn thứ n = phần tử n−2), `upgrades.table.chairPriceBase` (chỉ số = số ghế 2 đã mua toàn quán), `upgrades.table.chairsAfterTables`, `upgrades.table.orderShape.{solo.pBeer, pair.pMoi}` | **A** | Economy Admin → Super Admin | `next_day` | S1 `eco21-seat-model`, JSON 2.0.21 (nhãn 2.0.20 ở đầu nhánh S1 trước hợp nhất Đợt 1); rent/mult/gate của `locations.list` theo vào Tier A (chặt hơn, đảo được khi registry so từng dòng). `extraSeatPriceBase`, `table.levels[].capacity`, `table.maxTables` đã bỏ — snapshot cũ đọc qua `docs/config/legacy/economy-2.0.4.json`. **S5 (JSON 2.1.0):** `tableSlots` 8 ở mọi mặt bằng thay "mọi mặt bằng = 4", giá bàn/ghế, rent, kỳ thuê và dốc `mult` là số chốt (§8.6, §16) |
| Cầu theo sức chứa (rules 28) | `spawn.capacityDemand.{refTables, maxMult}` | **A** | Economy Admin → Super Admin | `next_day` | S3 `eco21-capacity-demand`, JSON 2.0.22: khoảng cách giữa hai nhóm khách × `min(maxMult, max(1, refTables / số bàn))` — 1 bàn ×4 · 2 ×3 · 3 ×2 · 4 ×1,5; đổi hai số này đổi tổng khách mỗi ca của cả game nên cùng cấp duyệt kép với `spawn.pPair`; `maxMult` = 1 tắt hẳn; validator: `refTables` nguyên ≥ 1, `maxMult` ≥ 1 hữu hạn; pin ≤ 2.0.21 không có key (×1). Hàng đợi `runtime.queueBaseSlots`/`queueSeatsPerSlot` (1 / 8) và `patience.thuongMs` (24 000) vẫn **Tier B** (section `runtime`, `patience`) — chỉ đổi giá trị seed |
| Cấp bàn và cấp ghế (rules 28) | `upgrades.table.tableUpgrade.levels[]` (`level` 2–4, `priceBase`, `stepBase`, `lifePathGate`, `extraRounds`, `pExtraMoi`, `tipMult`), `upgrades.table.chairUpgrade.{priceBase, stepBase, levels[].{level, lifePathGate, patienceMult}}` | **A** | Economy Admin → Super Admin | `next_day` | S4 `eco21-table-chair-upgrades` (JSON 2.0.23), **số chốt JSON 2.1.0 (S5)**: giá nâng bàn theo **cấp đích** = `priceBase + stepBase × n` (n = số bàn đã đạt cấp ≥ cấp đích; Base nhân k): →Lv2 **7 000 + 2 500·n**, →Lv3 **34 000 + 13 500·n**, →Lv4 **59 500 + 20 500·n** (hiển thị ×2,5: 17 500 + 6 250·n · 85 000 + 33 750·n · 148 750 + 51 250·n xu); nâng ghế = `priceBase + stepBase × t` (t = số lần nâng ghế đã mua toàn quán): **12 000 + 6 000·t** (hiển thị 30 000 + 15 000·t xu); lợi ích: Lv2 `extraRounds` 1 · Lv3 `pExtraMoi` 0,35 · Lv4 `tipMult` 1,25 · ghế `patienceMult` 1,15 / 1,30; mỗi dòng bàn ghi **tổng** lợi ích của cấp (cộng dồn; validator: chỉ tăng theo cấp, `extraRounds` nguyên, `pExtraMoi` ∈ [0, 1], `tipMult` ≥ 1, `patienceMult` ≥ 1); gate Đời Quán `lifePathGate` (Lv2 LP1 · Lv3 LP2 · Lv4 LP4; ghế LP1 · LP2; chỉ số mốc LP, phải nằm trong đường). Đổi giá hay lợi ích đổi tốc độ lên đời của cả game nên cùng cấp duyệt kép với giá bàn/ghế. **Thay** key postmvp `upgrades.backrest` (bỏ khỏi seed; snapshot ≤ 2.0.22 vẫn mang nó). `upgrades.table.levels[].priceBase/repBase/requiredBadge` là thang cũ, chỉ đọc khi snapshot không có `tableUpgrade` (pin ≤ 2.0.22: giá cũ, gate Kết Nối, không lợi ích). Thang hạt giống W9 của S4 (→Lv2 8 000 + 3 000·n, →Lv3 20 000 + 8 000·n, →Lv4 35 000 + 12 000·n, ghế 4 000 + 2 000·t) chỉ còn trong snapshot ghim 2.0.23 và changelog 2026-10-20 (S4); S5 đổi giá, giữ gate và lợi ích của S4 |
| `kickTable` — Mời về (rules 28) | `feeRate`, `repPerGuest`, `_rule` | **A** | Economy Admin → Super Admin | `next_day` | Đợt 3 `fun-kick-table` (plan §6, FEEDBACK II.3, D3), JSON **2.1.1** (nhãn mới cho giá owner chốt 22/10/2026; nhãn 2.1.0 giữ 8 nội dung trong lịch sử git — DECISIONS `## 07 · owner calls 2026-10-22`): lệnh `kickTable {tableId, maxCost}` mời về một bàn đang nhâm nhi (§9); xu = Σ `round(gross đơn gần nhất của từng khách × feeRate × customerTypes.leavePenaltyMult)`, uy tín −`repPerGuest` mỗi khách (không ×k). Đổi hai số này đổi thu nhập và uy tín của mọi bàn lai rai nên cùng cấp duyệt kép với `penalty`; validator: `feeRate` hữu hạn ≥ 0 và phí lớn nhất của một cặp (bia + 2 món đắt nhất mỗi khách, `leavePenaltyMult` lớn nhất) là số nguyên an toàn, `repPerGuest` nguyên ≥ 0. Snapshot không có mục này (nội dung S5/S6 của 2.1.0, pin ≤ 2.0.23, pin sức chứa, pin 1.x) không có lệnh (`kickTableUnavailable`); `SEAT_KEYS_ADDED_LATER` dòng `kickTable` `since` 2.1.1 giữ các pin đó nạp được (nhãn trước 2.1.1 được thiếu cả mục; các nội dung 2.1.0 có mục — Đợt 3, stage 07 — là snapshot đầy đủ), từ 2.1.1 phải có đủ mục. Duyệt: mỗi key một đề xuất riêng (Economy author đề xuất, một Super thứ hai duyệt, hiệu lực ngày kế), tới người chơi mới ở lần mở ca kế; **đo k khi publish KHÔNG phản ứng với mục này**: measurer mẫu của `registry.test.ts` chỉ định giá một ly bia, measurer thật `measureKViaForecast` (`apps/server/src/forecast.ts`) chiếu bằng `createManagementPolicy` (`packages/engine/sim/forecast.ts`) với bot không bao giờ mời về — một đề xuất `feeRate` 0 cũng được "admitted". Rào chắn của hai key: validator, duyệt kép và chạy `npm run sim:kick` trước khi publish. Số chốt bằng sim bot mời/không mời (`npm run sim:kick`, changelog 2026-10-22 "JSON 2.1.1"): `feeRate` **0,5** (ứng viên của plan), `repPerGuest` **2** — luật "+10 % thu nhập 30 ngày" đọc trên thu nhập RÒNG sau phí mời về (quyết định owner 1, founder 22/10/2026; cổng của `sim:kick`): ròng +8,85 % \| +9,06 % ĐẠT (seed 42 \| 99), gộp +13,24 % \| +13,40 % in làm thông tin; 4 seed giữ lại (thông tin, ròng): 7 +10,41 % · 123 +8,54 % · 20260611 +8,49 % · 20260908 +8,71 %. Đợt 3 đọc gộp và chốt 1,5 dưới nhãn 2.1.0 (lịch sử: changelog 2026-10-22 Đợt 3; HANDOFF `docs/handoff/2026-10-19-vui3ca/HANDOFF.md` §13) |
| `cosmetics` (trừ donation) | `lantern`, `plant`, `pricesAreDisplayed` | **B** | Economy Admin | `next_shift` | |
| `leaderboard` | `topN`, `neighborsWindow`, `refreshMs`, `minShiftsToRank`, `shrineTop`, `wallSize`, `historySeasonsKept`, `hideFlagged` | **A** | Economy Admin → Super Admin | `next_season` (hiển thị `topN`/`refreshMs`: `next_day`) | F28 — thứ hạng, snapshot bất biến |
| `donation` | `enabled`, `tiersVnd`, `guestAllowed`, `provider`, `manualConfirm`, `giftCatalogRef`, `refundPolicy` | **A** | Super Admin | `immediate` | F20 — monetization duy nhất; tiền thật |
| `network` | `reconnectGraceMs`, `reconnectingUiDelayMs`, `commandBufferMax` | **B** | Economy Admin | `next_shift` | F23 §8, 10-SPEC §10 — mất mạng giữa ca |
| `onboarding` | `enabled`, `firstShift.*` (1 khách 1 bia, tắt risk/rush ca 1; `excludedCustomerTypes` **["ngoily"]** từ JSON 2.1.3, founder 22/10/2026: ca 1 không có "Bàn lai rai", luật engine, gate theo key; `staleDisabled` **true** từ JSON 2.1.4, founder 22/10/2026: ca 1 bia không hết hơi, luật engine, gate theo key), `lostStreakToGuide`, `idleToGuideMs` (45 000 ms không chạm → guide dự phòng), `stepGuide.{onFirstPlay, skippable, maxAutoRepeatsPerDay, steps[]}`, `loginPrompt.*`, `hints.*`, `featureReveal.*` (`upgradeAfterShifts` **0**, `questsAfterShifts` 2, `leagueAfterShifts` 3, `locationsAfterLifePathLevel` 1, `hudAfterShifts` **0**, `upgradeAllAfterShifts` 2, `journeyAfterShifts` 2, `kickAfterShifts` **1** ("Mời về", JSON 2.1.3) — giá trị hiện hành từ JSON 2.1.2 / 2.1.3, founder 22/10/2026; `upgradeAfterShifts` và `hudAfterShifts` từng là 1, xem changelog), `targets.*` | **C** | Game Admin | `immediate` (ca mở sau) | F27 🟢 — luật chủ dự án 08/09; cách trình bày dev tự quyết |
| `nextGoal` | `reachMult` (3 — chip "Mục tiêu kế tiếp" chỉ gợi ý món có giá ≤ `reachMult` × xu trung bình mỗi ca đã đóng; save chưa đóng ca nào thì không lọc) | **C** | Game Admin | `immediate` (áp từ lần mở ca kế tiếp của save dùng bản cấu hình này) | F10/F27 — UI only, không đổi số economy; thứ tự làn Sức chứa → Tốc độ → Khách nằm trong code (registry) |
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

| v1.3.2 | Runtime rules v4 nối phí mời về §9 qua cùng customerValue/ab và spend; không thêm hằng số. Khách đã rời không tính lại, mọi khách còn dùng món tính phí; báo giá không gán món cho queue/seating. Thiếu xu từ chối, lịch sử v1–v3 không đổi. |

| v1.3.3 | Rules v5 sửa vòng đời rush/telegraph theo F08, dùng số JSON hiện hành. Thêm kiểm tra integer cho warning/count/timing; không đổi config version hoặc các hệ số kinh tế. Replay v1–v4 giữ số/event IDs cũ. |

| v1.3.4 | Rules v7: làm rõ shipperMult là tần suất theo GDD §9/F09/original §18, sửa dấu nhân interval ở §4 thành chia. Đơn lấy tổng giá món cuối trong grossBase ×k, đủ toàn bộ nguyên liệu mới giao; net và Tỉnh Táo qua cùng credit/cap. Không đổi JSON hoặc số cân bằng. Ngừng đón khách được phép, ca chỉ finalize sau khi đơn đang chạy được giao/hết hạn; kick-all từ chối trước debit. |

| v1.3.5 | Rules v8 nối seeded ordinary rush planning, fit preflight, heavy enjoyMult và báo cáo cuối slot. Dùng nguyên JSON 1.7.0; không thêm số cân bằng, không đổi k denominator. Lịch v1–v7 và config lịch sử giữ replay được; chỉ mở ca mới từ chối lịch không vừa. |

| v1.3.6 | Rules v9 nối biển kinh doanh theo JSON hiện hành: lắp Gỗ, sở hữu/đổi5 kiểu, customer weight cho khách mới và Neon cho interval shipper mới. Làm rõ golden.repBase là ngưỡng mua, không debit uy tín (GDD §8/original §7); bảng §10 ghi rõ gate. Phí xu qua spend, không đổi JSON/k, không reset timer/khách đang có; donation cosmetic không cấp hiệu ứng này. |


| v1.3.7 (2026-09-09) | Clarified ordinary-vs-active arrival floor order: none.floorMs is the baseline before weather/marketing, active rush floors remain absolute. Fixes hot/humid/flyer modifiers being clamped away by a10500ms ordinary floor. JSON1.7.1 changes formula metadata only; every gameplay number unchanged. Rules10 preserves historical1–9 scheduling during replay; live marketing producer still pending. |

| v1.3.8 (2026-09-09) | Rules12 nối daily5 bằng JSON1.7.1 hiện hành, giữ nguyên mọi số; làm rõ ceil target, scale reward một lần,5/5 bonus và ledger không tính xếp hạng. Contract F17§10 phân biệt ca hoàn tất, full rush/VIP, hidden/midnight và trusted gift. |

| v1.3.9 (2026-09-09) | Rules13 nối điểm danh bằng mảng thưởng hiện hành; làm rõ ngày active khác ngày claim, hết hạn/đổi vòng/reset cấu hình và không backfill offline. Không đổi JSON hay số cân bằng; lịch sử rules1–12 giữ nguyên. |

| v1.3.10 (2026-09-09) | Owner cho nâng cấp asset ngay trong ca. JSON1.7.2 đặt phase1UpgradesOutsideShiftOnly=false; key chỉ còn phục vụ replay lịch sử1–16, không còn là toggle của luật hiện tại17. Mọi giá, thời gian và mức giới hạn giữ nguyên; ca cũ giữ config/giá đã ghim, chỉ bỏ gate ngoài ca cho lệnh mới. |

| v1.3.11 (2026-09-09) | Owner batch reserve: JSON1.7.3 bật refill, Lv1 chứa/rót5, mẻ bằng sức chứa và dùng thời gian rót hiện hành; washer gom mẻ, stock debit lúc bắt đầu, pause/upgrades giữ job, capacity HUD. Bia dự trữ tách pool ly, mặc định freshness từ lúc lên mâm; hai câu hỏi diễn giải vẫn mở. |

### Lịch sử audit từ checkout tài liệu gốc (tham chiếu)

Các số sim/19-test trong các dòng sau thuộc engine tham chiếu của checkout gốc; bằng chứng cho bản game này nằm ở build-progress.

| v1.3.1 | JSON 1.7.1: bom bia `pourMs` 3.000/2.700/2.400/2.100/1.800 → **2.000/1.700/1.700/1.500/1.300** (slots giữ 1/1/2/2/3) — founder 09/09 "không làm khó player, không lạm phát"; §8.1 ghi lý do + số sim (bom không phải nghẽn mất khách, chỉ quyết tip; VIP nhóm 2 cần rót ≤ 4,4 s) + bất biến thang + cờ đỏ lớp refill P2; §1 ghi k đo theo bom; §20 dòng POUR_MS. Lv3–5 🟡 chờ sim nhiều bàn. |
| v1.3.2 | JSON 1.7.2: `pourSlots` 1/1/2/2/3 → **1/2/3/4/6**, `pourMs` → 2.000/1.800/1.600/1.400/1.200 — sim engine mới trên 5 quy mô quán: giá trị bom = số vòi, thang cũ Lv2 yếu + Lv4/Lv5 chết; §8.1 ghi số hoàn vốn, quy tắc vòi ~ chỗ/bàn, 3 lựa chọn cho Lv4/Lv5 (chờ founder). Giá giữ nguyên. |
| v1.4.0 | **Audit economy 09/09 (founder duyệt: mua cốc, bom chứa + refill tự động, cân giá).** JSON 1.8.0: `keg` refillEnabled=true, kegStorage 3/6/10/18/40 · kegBatch 2/3/5/8/14 · refillMs 12/8/6/5/4 s (10→210 cốc/phút), giá 0/5k/20k/80k/300k; `washer` 0/4k/16k/60k/200k; `cooler` 0/3k/12k/45k/150k; `stall` 0/1.5k/8k/30k/120k; `kitchen` 12k/50k/160k/400k + prepMult 1/0.9/0.8/0.7; bàn Lv2–4 1.5k/6k/25k; ghế 11–48 (bàn 6 = 40k); `glasses` buyCap 40 · storageCap 50 · 400 base; prep đậu/tóp/lòng 4/5/7 s. §21 thêm #9 #10. Chờ duyệt: E1 giao mâm thiếu món, E2 bếp chảo, E6 mồi nóng 50/50, E7 heavy từ LP1, rent neo % thu nhập, gate LP thiết bị. Báo cáo: artifact "Audit Economy Trùm Bia Hơi". |
| v1.4.1 | Founder 09/09: **mọi trạm = pipeline tự động, chỉ 2 tham số (thời gian mẻ + số lượng/mẻ)** — §8 nguyên tắc trạm; §8.2 rửa theo mẻ (`slots` = cốc/mẻ); §8.5 bếp theo chảo chốt (`portionsPerPan` 0/2/2/3/3). JSON 1.9.0 thêm `upgrades._pipelineRule`, `washer._rule`, `kitchen.portionsPerPan` + `_rule`. Số giá không đổi. |
| v1.4.2 | Engine `packages/engine` đã cài 3 pipeline (bom chứa/refill · bếp chảo · `buyGlass`) theo §8; §1 ghi k đo 2,58–2,72 với refill; §8.1/§8.7 bỏ ghi chú "engine chưa có". Số không đổi (JSON 1.9.0). |
| v1.5.0 | Founder 09/09 (đợt 3): **giữ "chỉ giao khi đủ món"**, vá nốt theo gameplay/gốc: §2 khách chỉ gọi mồi còn hàng + `pHotGivenMoi` 0.5/0.8; §6 heavy chỉ từ LP1; §8 gate LP thiết bị (Lv4 LP2, Lv5 LP3, bếp Lv3/4 LP3/4); §15 engine tự đánh giá LP; §16 bảng rent mới neo 15–25 % thu nhập (4k→44k base/ngày, bỏ công thức e) + lệnh thuê/rời. JSON **2.0.0**. Engine đã cài toàn bộ (test 19/19). |


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |

| 2026-09-10 server heartbeat | No values or tiers changed. The server derives its heartbeat timeout from pinned `network.reconnectingUiDelayMs` and cadence as half that detection window; lease expiry plus pinned `reconnectGraceMs` controls normal offline closing. Existing leases retain their recorded deadline until renewed. This gives the existing Tier B network row an explicit transport consumer; protocol details in apps/server/README.md. |

| 2026-09-10 advanced-progression k | Owner chọn (a), xem04-SPEC§5: band2.0–3.0 chỉ áp dụng profile chuẩn cold-menu/full-menu; career≥30ngày đạtLP4 với meta multipliers có soft cap k≤3.5 qua gate tự động≥2seed. Hai số3.483282/3.318249 PASS theo quy tắc mới. **Không thay số kinh tế, configVersion, anchor82.5 hoặc clamp thu nhập**. Re-evaluate after Alpha playtest with real player data; theo dõi lạm phát endgame qua báo cáo faucet/sink7ngày, không qua k. |

| 2026-09-10 / JSON2.0.2 | `onboarding.loginPrompt.leaveProgress.{minCompletedShifts,minLifetimeEarned}` (Tier C, Game Admin, next applicable pin) defaults1/1. The departure invitation appears when completed shifts OR canonical lifetime earned coins reach the corresponding threshold. `minLifetimeEarned` uses displayed coins, without Base/k scaling, and does not alter earnings or any economy number. Positive safe integers only. Old snapshot bytes stay unchanged; missing presentation thresholds use the registry seed. |

| 2026-09-11 / JSON2.0.3 | owner 2026-09-11: pre-poured buffer 4/7/12/20/40 (Steer14 fallback; primary5/8/12/20/40 failed standard k at seeds42/99:3.0297/3.1504). After playable-v0: only kegStorage grows; kegBatch2/3/5/8/14, refillMs12/8/6/5/4s, pourSlots and pourMs unchanged. Sustained throughput unchanged; old shift/registry pins remain immutable. Accepted after full verify:406tests,10standard cohorts k2.5644–2.9168,15rush, career42/99 k3.465461/3.393197≤3.5; review CLEAN. |

| 2026-09-16 / JSON2.0.4 / A1 | Bỏ điều kiện chó khỏi LP1 khi M6 hoãn; giữ mốc50.000 Base ×k =125.000 xu và4 ghế. Không đổi kinh tế khác. Save cũ giữ config/rules; browser edition nhận seed mới ở lần mở ca kế tiếp. |
| 2026-09-18 / chờ JSON 2.1.0, rules 28 | Owner 17–18/09 chốt luật, số là ứng viên đã sim (bộ W9) — S5 ghi vào JSON + §22 + tier registry: `locations.list[].tableSlots` 4/4/5/6/6/7/8/8/8 · `leaseDays` 3 · `spawn.pPair` 0,5 · `spawn.capacityDemand{refTables 6, maxMult 4}` · `runtime.queueBaseSlots` 1, `queueSeatsPerSlot` 8 · `patience.thuongMs` 24 000 · `table.orderShape{solo: pBeer 0,7 / pair: pMoi}` · `table.levels[].benefit` (Lv2 extraRounds 1 · Lv3 pExtraMoi 0,35 · Lv4 tipMult 1,25) + `lifePathGate` LP1/LP2/LP4 · `tablePriceBase` 600/1 600/3 200/6 000/10 000/16 000/25 000 · `chairPriceBase` 4 000/6 000/9 000/12 000/16 000/20 000/24 000/28 000 + `chairsAfterTables` 4 · `tableUpgrade.levels` →Lv2 8 000+3 000·n · →Lv3 20 000+8 000·n · →Lv4 35 000+12 000·n · `chairUpgrade` 4 000+2 000·t · `tip.rate` 0,22 · rót tức thì khi bom còn bia (`pourMs` khỏi đường phục vụ) · `lifePath[].lifetimeBase` 8 k/20 k/80 k/280 k/680 k/1,2 tr/2 tr · `league.tiers` = thang LP · `league.seasons.ranking.days` 21 (contest bỏ) · `shift.dailyEarnCapBase` 400 000 · `shift.noCooldownFirstShifts` 3 · thiết bị Lv4–5 và bếp Lv3–4 `priceBase` ×0,5 · `kickTable{feeRate 0,5, repPerGuest 2}` · bỏ `extraSeatPriceBase`, `table.levels[].capacity/priceBase/repBase/requiredBadge`, `backrest`; `startingTables` 1. Cooldown `regenRate` và `dailyShiftCap` giữ. Nguồn: `docs/FEEDBACK-2026-09-17.md` v3.3 · `docs/PLAN-vui-3-ca-2026-09-18.md` v1.6 · `docs/DESIGN-story-3-tuan-2026-09-18.md` v1.1 |

| 2026-10-14 / JSON 2.0.5 / fun-onboarding-visual | UI-only presentation keys, Tier C (Game Admin, `immediate`, next applicable pin): `onboarding.idleToGuideMs` = 45 000 (no tap while a shift runs and nobody was ever served → the step guide steps in as a fallback), `onboarding.featureReveal.hudAfterShifts` = 1 (shift timer, weather/rush row, stock strip, extra equipment, bottom nav appear after this many completed shifts), `upgradeAllAfterShifts` = 2 (Upgrades sheet shows only the first goal until then), `journeyAfterShifts` = 2. Existing `featureReveal` keys unchanged. `onboarding.enabled=false` reveals everything as before. Old pins lack the keys: they keep their raw bytes and the client falls back to the seed. **Không đổi số kinh tế, luật engine, `CURRENT_RULES` hay k.** Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §0 P0, §4 `fun-onboarding-visual`; F27 changelog 2026-10-14. |

| 2026-10-15 / JSON 2.0.6 / fun-next-goal | Section mới `nextGoal`, Tier C (Game Admin, `immediate`, áp từ bản cấu hình kế tiếp): `nextGoal.reachMult` = 3 — chip HUD "Mục tiêu kế tiếp" chỉ gợi ý món rẻ nhất chưa max, đủ gate (LP/huy hiệu/uy tín), có giá ≤ `reachMult` × xu trung bình mỗi ca đã đóng (`lifetimeEarned` ngoài ca đang mở ÷ `completedShifts`; save chưa đóng ca nào thì không lọc, nếu không món nào trong tầm thì lấy món rẻ nhất đủ điều kiện), ưu tiên làn Sức chứa → Tốc độ → Khách. Bản pin cũ không có section: giữ nguyên byte, client đọc seed. **Không đổi số kinh tế, luật engine, `CURRENT_RULES` hay k.** Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §4 `fun-next-goal`. |
| 2026-10-19 / JSON 2.0.20 / rules 28 (S1 `eco21-seat-model`) | Cài luật bàn ghế v3.3 (D2 D12 D13 D14 D17 D18): game mới 1 bàn × 1 ghế (`startingTables` 1); bàn thứ n = `tablePriceBase[n−2]` (600 · 1.600 · 3.200 … base, bộ W9), không gate Đời Quán, trần = `locations.list[].tableSlots` của mặt bằng đang đứng — **đợt này mọi mặt bằng = 4** (D13; 4·4·5·6·6·7·8·8·8 + gấp bàn để `location-slots`/S5); lệnh mới `buyChair` (ghế 2 chỉ khi đã có `chairsAfterTables` = 4 bàn, giá `chairPriceBase[số ghế 2 đã mua toàn quán]` 4.000 · 6.000 · 9.000 · 12.000 … base, tối đa 2 ghế/bàn); mua bàn/ghế không đòi bàn trống, nhóm đang ngồi giữ mâm; cỡ nhóm `spawn.pPair` 0,5, cặp không có bàn 2 ghế → `queue_overflow{reason:noSeat}` không phạt/không trừ uy tín/không tính `lost` (đếm `rejected` + `noSeat`); mâm theo ghế `upgrades.table.orderShape` (1 ghế: bia *hoặc* 1 mồi tức thì, `solo.pBeer` 0,7; 2 ghế: bia + mồi `pair.pMoi` 0,85 — `demandMix.pMoi` chỉ còn cho snapshot cũ); nâng bàn cần 2 ghế, không đổi sức chứa (lợi ích cấp ở S4); LP1 `requires` "4 tables" (LP7 giữ "10 seats" — chưa đạt được khi mọi mặt bằng 4 chỗ). Bỏ `extraSeatPriceBase`, `table.levels[].capacity`, `table.maxTables`. Version 2.0.20 vì save cũ ghim 2.0.4 nội dung cũ (cùng version khác nội dung bị `configVersionConflict`, bản browser chỉ nhận seed mới hơn) và Đợt 1 đã dùng 2.0.5/2.0.6 cho nội dung khác; S5 đặt 2.1.0; snapshot 2.x cũ kiểm theo `docs/config/legacy/economy-2.0.4.json`. Migration D2 chạy ở lần mở ca đầu tiên ghim snapshot bàn ghế (giữ `tableSlots` bàn đầu, mỗi bàn `min(2, ghế)`, giữ cấp, không hoàn xu, event `seat_model_adopted`). Tier A: §22 dòng "Mô hình bàn ghế". k: S1 đứng riêng vỡ gate (career 42 = 3,96 > 3,5) — cân ở S5 theo PLAN §5. |
| 2026-10-19 / JSON 2.0.20 / hợp nhất Đợt 1 × S1 (autopilot stage 00: `main` d1a150a vào `feat/eco21-seat-model`) | Không đổi số nào. Một version 2.0.20 cho hợp của hai bên: S1 (mô hình bàn ghế, `locations.list[].tableSlots`…) + Đợt 1 (Tier C `onboarding.idleToGuideMs`, `onboarding.featureReveal.{hudAfterShifts,upgradeAllAfterShifts,journeyAfterShifts}`, section `nextGoal` và tên `nextGoal` trong `_meta.governance.tiers.C.sections`), ngày 2026-10-19; `nextGoal` vẫn ở Tier C. Snapshot ghim **sau** Đợt 1 nhưng **trước** mô hình bàn ghế (JSON 2.0.5/2.0.6 = file `docs/config/legacy/economy-2.0.4.json` cộng đúng các key trình bày trên) vẫn nạp được, giữ nguyên byte: `shape()` lấy seed làm khuôn cho các key `ADDED_LATER` mà file legacy không có; mọi key lạ khác, `nextGoal` sai và danh sách tier sai vẫn bị từ chối (`packages/engine/test/seat-model.test.ts` → `a pre-seat snapshot from Wave 1 …`). Trên mô hình bàn ghế chip "Mục tiêu kế tiếp" chỉ bàn 2 trước; cấp bàn chưa có lợi ích (S4) nên chip không gợi ý. |
| 2026-10-20 / JSON 2.0.21 / hợp nhất Đợt 1 × S1 (autopilot stage 00, review vòng 1) | Chỉ đổi nhãn version, **không đổi số nào**: bản đã hợp (mô hình bàn ghế của S1 + khóa Tier C của Đợt 1: `onboarding.idleToGuideMs`, `onboarding.featureReveal.{hudAfterShifts,upgradeAllAfterShifts,journeyAfterShifts}`, section `nextGoal` và tên `nextGoal` trong `_meta.governance.tiers.C.sections`) mang nhãn **2.0.21** thay cho 2.0.20. Lý do: đầu nhánh S1 trước hợp nhất (`8f50e5f`, PR #22) cũng mang nhãn 2.0.20 nhưng chưa có các khóa Đợt 1 — hai nội dung khác nhau dưới một nhãn làm DB dev/server đã đăng ký seed đó không mở được (`store:configVersionConflict`) và save trình duyệt ghim nhãn đó không bao giờ nhận seed đã hợp (`newerBundledConfig` chỉ nhận X.Y.Z lớn hơn). Mọi dòng ở trên nhắc "2.0.20" là nhãn của đầu nhánh S1 cũ (cùng nội dung bàn ghế), giữ nguyên làm lịch sử; hiệu chỉnh sau đó bump từ 2.0.21 (S5 chốt 2.1.0). Cùng đợt `shape()` (engine) chặt hơn: key trình bày của Đợt 1 chỉ được thêm vào khuôn `docs/config/legacy/economy-2.0.4.json` (snapshot 1.x hoặc bàn ghế mang các key đó vẫn bị từ chối như trên `main`), và một key đặt tên như thành viên `Object.prototype` (`constructor`, `toString`…) bị từ chối thay vì lọt qua không kiểm. |
| 2026-10-20 / JSON 2.0.21 / chính xác hóa dòng "review vòng 1" ngay trên (autopilot stage 00, review vòng 2) | Không đổi số hay luật nào, mã không đổi — chỉ sửa một câu sai của dòng trên: snapshot **1.x** mang các key trình bày của Đợt 1 hoặc tên `nextGoal` ở Tier C vẫn bị từ chối (`config:…:keys`) như trên `main`; còn trên **dạng bàn ghế** (2.0.20/2.0.21) các key đó là key thường của seed mẫu, mỗi key tùy chọn (`ADDED_LATER`) để một pin cũ thiếu chúng vẫn nạp được, nên snapshot bàn ghế mang đủ chúng nạp được. Chỉ dạng đóng băng `docs/config/legacy/economy-2.0.4.json` (pin tiền-bàn-ghế 2.0.5/2.0.6 của Đợt 1) được mở rộng thêm các key đó. Dòng trên giữ nguyên làm lịch sử (append-only). |
| 2026-10-20 / JSON 2.0.21 / rules 28 (S2 `eco21-instant-pour`) | Không đổi số hay key nào, không bump JSON (không key mới nên không có dòng §22 mới). Luật: rót tức thì — bia gọi khi `beer.ready > 0` và có cốc sạch → `ready` cùng tick; vòi (`pourSlots`/`pourMs`) ra khỏi đường phục vụ của game bàn ghế (ghi chú ở §8.1), key giữ cho snapshot sức chứa và replay rules ≤ 27. Đo bot career 30 ngày (policy v2, seed 42 / 99), cùng mã trừ S2: khách phục vụ 26.949 → 27.775 (+3,1 %) / 27.430 → 27.207 (−0,8 %); thu nhập ghi sổ +2,4 % / −1,6 %; k **3,9625 → 3,9413** / **3,9482 → 3,9107** — vẫn ngoài dải 2,0–3,0 và trần mềm 3,5, gate k hoãn cho S5 theo plan §5 (FEEDBACK II.1 dự đoán +3…+8 % thu nhập khi đứng riêng trên mô hình sức chứa; với 1–4 bàn 1–2 ghế vòi hiếm khi là nút cổ chai, mức đo nhỏ và lẫn nhiễu giữa hai seed). Không chỉnh số nào để chữa k. Việc cho S5: cấp bom Lv2–5 chỉ còn mua sức chứa + mẻ nạp (hai cột vòi đã chết ở rules 28) nhưng giá 5.000/20.000/80.000/300.000 chưa phản ánh điều đó, và chuỗi mô tả `upgrades.keg._rule` còn nói "Vòi rót tối đa pourSlots cốc…" (không sửa ở S2 để khỏi bump version; sửa khi S5 niêm phong 2.1.0). |
| 2026-10-20 / JSON 2.0.22 / rules 28 (S3 `eco21-capacity-demand`) | Key mới **Tier A** `spawn.capacityDemand {refTables 6, maxMult 4}` (D19; §22 có dòng riêng): khoảng cách tới nhóm khách kế × `min(maxMult, max(1, refTables / số bàn))` — 1 bàn ×4 · 2 ×3 · 3 ×2 · 4 ×1,5; nhân sau hệ số cỡ nhóm (`perCustomer`), làm tròn một lần, áp cả trong Giờ Vàng, không đụng khách đầu ca. Đổi **giá trị** (key cũ, vẫn Tier B): `runtime.queueBaseSlots` 2 → **1**, `runtime.queueSeatsPerSlot` 3 → **8** (hàng đợi `1 + ⌊ghế/8⌋`, D25), `patience.thuongMs` 18 000 → **24 000** (D25). Viết lại hai chuỗi mô tả đã lỗi thời: `upgrades.keg._rule` (còn nói vòi, xem dòng S2) và `spawn.queueSlotsFormula`. **Cổng:** capacityDemand theo key (pin không có key = ×1); hàng đợi và kiên nhẫn theo giá trị của snapshot (mô hình bàn ghế chỉ chạy ở rules ≥ 28; pin ≤ 2.0.21, pin sức chứa và 1.x giữ `2 + ⌊ghế/3⌋` và 18 s) — replay rules ≤ 27 và lịch sử rules 28 ghi trên 2.0.21 bằng engine S2 (`packages/engine/test/fixtures/seat-2.0.21-v28.json`) vẫn khớp từng byte; `shape()` nạp pin 2.0.20/2.0.21 bằng khuôn seed trừ key S3 (10-SPEC). **D12:** từ chối tại cửa (`noSeat`/`full`) không phạt xu, không trừ uy tín, không `lost` — đã đúng từ S1 (`penalty.queueOverflow` 0), S3 ghim bằng test cả lý do `full`; chỉ bỏ đi vì chờ quá lâu mới −5 uy tín. Version **2.0.22** (bump đầu tiên sau nhãn 2.0.21; S5 niêm phong 2.1.0). **Đo bot career** 30 ngày (policy v2, seed 42 / 99, cùng mã trừ S3; bản S2 export bằng `git archive 1cfde17` tái hiện đúng 27.775 / 27.207 khách và k 3,9413 / 3,9107): khách phục vụ 27.775 → 23.425 (−15,7 %) / 27.207 → 23.097 (−15,1 %); tổng giá trị 30 ngày −2,8 % / −2,3 %; k **3,9413 → 4,5431** / **3,9107 → 4,5008** — vẫn ngoài dải 2,0–3,0 và trần mềm 3,5, gate k hoãn cho S5 theo plan §5; khách bỏ đi CÓ phạt 31,9 % → 9,4 % / 33,1 % → 10,9 % số khách tới. **Bảng cửa** (`npm run sim:career -- --days=30 --seed=42 --door`, mục tiêu plan §5 S3, số khách bỏ đi có phạt / khách tới · / khách được nhận): ca 1–24 **trượt** (seed 42: 10,1 % · 13,8 %; seed 99: 8,8 % · 11,7 %; mục tiêu ≤ 10 %), ngày 8–14 đạt (9,5 % · 11,2 % và 10,2 % · 12,4 % so với ≤ 20 %), ngày 15–21 đạt (8,0 % · 9,7 % và 11,8 % · 14,5 % so với ≤ 15 %), ca 1: 19 / 17 khách tới (≥ 15) và đúng 5 / 5 cặp bị từ chối (≥ 5, sát ngưỡng) → S3 PARTIAL, `DEFERRED: tuned in S5`. Không chỉnh số nào để chữa. Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S3, D12 D19 D25, `docs/DESIGN-story-3-tuan-2026-09-18.md` §3. |
| 2026-10-20 / JSON 2.0.23 / rules 28 (S4 `eco21-table-chair-upgrades`) | Key mới **Tier A** `upgrades.table.tableUpgrade.levels[]` và `upgrades.table.chairUpgrade` (§22 có dòng riêng; D14 D15 D18 D19) thay key postmvp `upgrades.backrest` (bỏ khỏi seed). **Nâng bàn** Lv1→4, bàn phải có 2 ghế, giá theo CẤP ĐÍCH `priceBase + stepBase × n` với n = số bàn đã đạt cấp ≥ cấp đích (tổng tiền không phụ thuộc thứ tự mua): →Lv2 **8 000 + 3 000·n**, →Lv3 **20 000 + 8 000·n**, →Lv4 **35 000 + 12 000·n** (bộ W9 theo DECISIONS B4; plan §5 S4 ghi bộ V4e 10 000/30 000/40 000 — S5 chốt; base, hiển thị ×2,5: bốn bàn lên Lv2 trả 20 000 · 27 500 · 35 000 · 42 500); gate Đời Quán Lv2 **LP1** · Lv3 **LP2** · Lv4 **LP4** (bỏ gate huy hiệu Kết Nối và uy tín); mỗi dòng ghi TỔNG lợi ích của cấp: Lv2 `extraRounds` 1, Lv3 thêm `pExtraMoi` 0,35, Lv4 thêm `tipMult` 1,25. **Nâng ghế** Lv1→3 `4 000 + 2 000·t` (t = số lần nâng ghế đã mua toàn quán), gate LP1 / LP2, `patienceMult` 1,15 / 1,30 trên kiên nhẫn chờ món của đơn. Validator: cấp theo thứ tự từ 2, giá nguyên và vẫn nguyên sau ×k, `lifePathGate` nằm trong đường, lợi ích chỉ tăng theo cấp (`pExtraMoi` ∈ [0, 1], `tipMult` ≥ 1, `patienceMult` ≥ 1). **Cổng:** theo key — pin ≤ 2.0.22 giữ thang cũ (`levels[].priceBase`, gate Kết Nối, không lợi ích) từng byte (rules vẫn 28; lịch sử rules 28 ghi trên 2.0.22 bởi engine S3 replay đúng từng byte); `loadConfig`: `SEAT_KEYS_ADDED_LATER` thêm dòng 2.0.23 có `restore` (pin cũ lấy lại `upgrades.backrest` từ file đóng băng 2.0.4), `shape()` không đổi. Đo bot career 30 ngày (policy v3, seed 42 / 99; tip S3 xuất bằng `git archive` tái hiện đúng số S3 đã ghi): khách phục vụ 23 425 → **30 573 (+30,5 %)** / 23 097 → **30 873 (+33,7 %)**; tổng giá trị 8 779 810 → **13 975 705 (+59,2 %)** / 8 576 362 → **14 084 557 (+64,2 %)**; giá trị trung bình mỗi khách 374,8 → 457,1; k **4,5431 → 5,5409** / **4,5008 → 5,5298** (xa hơn dải 2,0–3,0 và trần mềm 3,5; k này gồm mồi thứ 2, đợt thêm và tip bàn Lv4 — đúng ba thứ D4(a) loại khỏi k của gate, nên chỉ là số thay thế); khách bỏ đi CÓ phạt 9,4 % → **16,8 %** / 10,9 % → **17,1 %** của lượt tới; bảng cửa (của lượt tới / của khách được nhận): ca 1–24 11,8 % · 15,7 % và 10,7 % · 14,2 % (trượt như S3), ngày 8–14 16,8 % · 22,3 % và 17,7 % · 24,3 % (S3 đạt 9,5 % · 11,2 % và 10,2 % · 12,4 %: nay **trượt**), ngày 15–21 18,9 % · 25,3 % và 16,4 % · 21,6 % (S3 đạt: nay **trượt**), ca 1 giữ 19 / 17 lượt tới và 5 cặp bị từ chối; bot mua ghế cấp 2 đầu ở ca 18 (ngày 3; cả bốn bàn có ghế cấp 2 từ ca 24 và ghế cấp 3 từ ca 40), bàn Lv2 đầu ca 22, Lv3 ca 43–60, bốn bàn Lv4 ở ca 101–103 (ngày 13, khi LP4 mở). Lý do: bàn Lv2+ giữ nhóm thêm một đợt trong khi lượng khách tới giữ nguyên (từ chối tại cửa ngày 8–14: 804 → 1 338). **Không chỉnh số nào** (HANDOFF §9): gate k, các băng cửa và thu nhập 30 ngày (+67 % / +69 % so baseline 8,35 tr, tính thô) thuộc S5, hoãn (DEFERRED). |
| 2026-10-20 / JSON 2.1.0 / rules 28 (S5 `eco21-balance-pass`) — SỐ CHỐT | Niêm phong JSON **2.1.0** (nhãn đã đặt ở commit đầu của S5 cùng key mới; số chốt ở dòng này, thay các ứng viên W9 của dòng "2026-09-18 / chờ JSON 2.1.0", dòng đó giữ làm lịch sử). Key mới **Tier A** `shift.noCooldownFirstShifts` = **3** (§22 hàng `shift`, §13; D8): 3 ca đầu của đời save mở không đòi thể lực đầy, mở xong thể lực = 100 %, từ ca 4 cooldown 30' như cũ, trần ca/ngày 8/6/5 giữ; gate = key đọc từ snapshot mở ca (`SEAT_KEYS_ADDED_LATER` since 2.1.0, không `restore`): pin trước 2.1.0 và mọi lịch sử đã ghi giữ luật cũ từng byte (lịch sử rules 28 ghi trên 2.0.23 bởi engine S4 replay đúng, `fixtures/seat-2.0.23-v28.json`). **Số chốt** (bộ ứng viên C, `packages/engine/sim/plans/candidate-c.json`, tìm bằng bộ đánh giá cổng `packages/engine/sim/balance-gates.ts` — 23 hàng — và coordinate descent `balance-sweep.ts`, 134 lượt chạy lưu đủ): `tip.rate` 0,30 → **0,19** · `shift.dailyEarnCapBase` 200 000 → **400 000** · `shift.startingCoinsBase` 300 → **700** (1 750 xu) · `locations.leaseDays` 7 → **3** · `locations.list[].tableSlots` 4 ×9 → **4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8** · `locations.list[].mult` 1,1 … 1,8 → **1 · 1,019 · 1,038 · 1,056 · 1,075 · 1,094 · 1,112 · 1,131 · 1,15** · `league.seasons.ranking.days` 7 → **21** và `contest.days` 14 → **21** · `lifePath[].lifetimeBase` 50 k/150 k/500 k/1,5 tr/5 tr/15 tr/50 tr → **8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr** · `league.tiers[].minSeasonEarnedBase` 0/20 k/60 k/120 k/180 k/300 k/500 k/1 tr → **cùng thang LP** · `tablePriceBase` 600/1 600/3 200/6 000/10 000/16 000/25 000 → **600 · 2 000 · 4 000 · 7 500 · 12 500 · 20 000 · 31 300** · `chairPriceBase` 4 000 … 28 000 → **10 000 · 15 000 · 22 500 · 30 000 · 40 000 · 50 000 · 60 000 · 70 000** · `priceBase` thiết bị Lv2–5 (bếp Lv1–4): bom 5 000/20 000/80 000/300 000 → **1 750/6 750/13 500/51 000**, rửa 4 000/16 000/60 000/200 000 → **1 250/5 500/10 250/34 000**, hầm 3 000/12 000/45 000/150 000 → **1 000/4 000/7 750/25 500**, quầy 1 500/8 000/30 000/120 000 → **600/2 750/5 000/20 500**, bếp 12 000/50 000/160 000/400 000 → **4 000/17 000/27 250/68 000** (base, hiển thị ×2,5). Giữ nguyên: `spawn.pPair` 0,5 · `spawn.capacityDemand` 6/4 · hàng đợi 1 + ghế/8 · `patience.thuongMs` 24 000 · thang nâng bàn/ghế, gate và lợi ích của S4 · `kegStorage`/`kegBatch` · `stall.stockCap` · `rush.schedule.warningMs`. **Sàn giá:** không bậc thiết bị nào rẻ hơn bàn 2 (quầy Lv2 = 600 base = 1.500 xu): chip "mục tiêu kế tiếp" gợi ý món trong tầm `reachMult` × thu nhập ca trung bình, làn Sức chứa trước, nên một bậc rẻ hơn bàn 2 chen vào trước ở ~13 % ca đầu và hành trình guest/playable không còn nút "Mua bàn" (cổng `shift1.firstGoal`, `sealed-economy.test.ts`; quy tắc chip và `reachMult` không đổi). Viết lại chuỗi `upgrades.keg._rule` (giá Lv2–5 theo dự trữ + mẻ nạp). **Bảng cổng** (hàng · mục tiêu · seed 42 | seed 99): k chuẩn 2,0–3,0 (cold/full/cold-off/full-off) 2,397 · 2,740 · 2,374 · 2,851 | 2,369 · 2,824 · 2,422 · 2,923; k career đơn chuẩn ≤ 3,5: 3,325 | 3,348 (thô 4,49 | 4,51); tổng 30 ngày đơn chuẩn ≤ 9,185 tr: 7,525 | 7,706 tr (thô 15,93 | 16,26); LP7 ở ca 140–170: 144 | 142; thiết bị max ≤ 170: 122 | 119; 8 bàn Lv4 ≤ 170: 144 | 142; bàn 4 ≤ 48: 20 | 20; ghế 2 đầu 40–56: 45 | 45; bàn Lv2 đầu ≤ 56: 46 | 45; bàn Lv4 đầu ≤ 120: 100 | 97; LP1+2 ≤ 48: 20/23 | 20/23; LP3+4 ≤ 96: 45/73 | 45/70; LP5 ≤ 120: 100 | 97; khoảng trống mua dài nhất ≤ 8 ca: 5 | 6; bỏ đi có phạt (của khách được nhận) ca 1–24 ≤ 10 %: 4,3 | 0,0 %, ngày 8–14 ≤ 20 %: 18,2 | 16,3 %, ngày 15–21 ≤ 15 %: 12,6 | 11,7 %; ca 1 ≥ 15 khách tới và ≥ 5 cặp bị từ chối: 19/5 | 20/6; trần ngày chạm đầu tiên ≥ ca 150: 208 | 184; mất khách vì hết bia < 10 %: 0,0 | 0,0 %; ví hết ca 1 ≥ 1.500 mọi lượt: nhỏ nhất 1.734 (60 lượt, hai kiểu phục vụ) | cùng; mục tiêu đầu sau ca 1 = bàn 2: bậc thiết bị rẻ nhất 1.500 | 1.500 → **23/23 hàng đạt trên cả hai seed**. Bảng này tái hiện từng số bằng `npm run sim`/`sim:onboarding` (k 2,3415–2,4721 cold, 2,7399–2,9230 full, 5 seed × bật/tắt onboarding), `sim:rush` (exit 0) và `sim:career:gate` (k 3,3252 | 3,3478; tổng 7 525 092 | 7 706 186). **Gate D4(a)** (04-SPEC §5): k và tổng 30 ngày đo trên **đơn chuẩn** bằng `customerValue` của engine ngay trước lệnh `serve` (bia + mồi đầu, tip bàn ×1, không đếm đợt gọi thêm); tổng thô không thể cùng đạt acceptance của S5 (LP7 cần 5 tr lifetime, thiết bị + 8 bàn Lv4 ≈ 5,5 tr, trần ngày 1 tr ⇒ 15–17 tr thô) nên in cạnh chứ không là cổng. Sim chuẩn (`npm run sim`, `sim:onboarding`, `sim:rush`) chạy trên quán đầu đủ đồ (4 bàn × 2 ghế), cách đo k không đổi. **Rà soát đòn bẩy** (`packages/engine/sim/plans/audit.mjs`: mỗi đòn bẩy một lần quanh bộ chốt, 58 ứng viên, `sweeps/audit/`; không cổng nào không đạt được nên luật cạn kiệt không áp dụng, đây là bằng chứng độ nhạy): **A2 kho bia** — cổng mất khách vì hết bia = 0,0 % ở bộ chốt và ở mọi ứng viên A2 (`stall.stockCap[0]` 25 / 45, kho + mẻ bom ×1,5/1,5 · ×2/1,5 · ×2/2) nên không đổi kho bia (giữ 15); các ứng viên đó chỉ làm xê dịch khoảng trống mua (tới 27 ca), dải cửa và LP7 (143–157), tức nhiễu của hệ hỗn loạn chứ không phải tác dụng của đòn bẩy, và kho quầy 45 còn làm trượt cổng ví ca 1. **Cảnh báo Giờ Vàng** `rush.schedule.warningMs` 30 s / 45 s — sim không thấy tác dụng đọc được (bot không chuẩn bị cho Giờ Vàng; `rush.ts` chỉ dùng nó để giãn lịch): giữ 20 s, câu "đủ để nhập hàng không" thuộc playtest người thật. Cả bảng: 7 / 58 ứng viên cũng đạt mọi cổng (`capacityDemand.maxMult` 3, `queueSeatsPerSlot` 10 và 12, giá nâng bàn ×0,8, trần ngày 500 k và 600 k, `tableSlots` toàn 8 từ Bến Xe) — bộ chốt không phải điểm sạch duy nhất, và nó giữ nguyên mọi số W9 của owner (cầu 6/4, hàng đợi 1 + ghế/8, thang S4) mà một lân cận sạch sẽ phải đổi; 51 trượt ít nhất một cổng, nhiều nhất là khoảng trống mua (45), dải cửa ngày 8–14 (34) và 15–21 (24), LP7 (14); `tip.rate` 0,10 / 0,15 / 0,25 / 0,30 trượt 10 / 3 / 9 / 12 hàng (0,25 và 0,30 vỡ cả hai k), mặt bằng đỉnh ×1,25 / ×1,4 vỡ k career, trần ngày 200 k / 300 k bị chạm trước ca 150, kỳ thuê 5 / 7 ngày làm khoảng trống mua 18 / 40 ca, `pMoi` 0,6 / 1,0 vỡ k chuẩn. **Đo thêm trên bộ chốt (thông tin, không là cổng):** bot cũ seats-first của S1–S4 cho LP7 ở ca 117–118, k 3,53 | 3,54, tổng chuẩn 9,20 | 9,05 tr (vượt 3,5 và 9,185 tr); ngày bắt đầu lệch 3 ngày vào mùa cho LP7 ở ca 189 | 188, lệch 10 ngày cho 159 | 161 (`peak:` đọc cửa sổ mùa hiện tại); seed 7/123/20260611/20260908: LP7 145–149, k 3,32–3,35, tổng 7,0–7,45 tr, 8 bàn Lv4 ở ca 147–172, **khoảng trống mua 15/13/23/10 ca (cổng ≤ 8: chỉ đạt trên hai seed nghiệm thu)**. Không có hàng nào trong bảng được chỉnh bằng tay mà không có lượt chạy lưu; `_meta.version` không bao giờ hạ. Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S5, `docs/handoff/2026-10-19-vui3ca/briefs/B5-eco21-balance-pass.md`, DECISIONS `## 04 ·`. |
| 2026-10-21 / JSON 2.1.0 / rules 28 (S5 `eco21-balance-pass`, review vòng 1) — SỐ CHỐT MỚI, thay dòng 2026-10-20 "SỐ CHỐT" ở trên (dòng đó giữ làm lịch sử) | **Vì sao thay:** review vòng 1 (MAJOR 1) chỉ ra bảng cổng cũ đo bằng bot v4 ("mua rẻ nhất trước", bắt đầu 2026-09-06) trong khi plan §5 hàng S5 và brief B5 ghi bot **"ưu tiên bàn/ghế, thuê thẳng mặt bằng, không mua chó"**; với bot đó bộ C trượt 13 ô seed (k career 3,54 / 3,51, tổng chuẩn 9,29 tr, LP7 ở ca 115 / 118, ghế 2 đầu ở ca 14 / 15, khoảng trống mua 13 / 13, bỏ đi ca 1–24 21,6 / 18,7 %, ví hết ca 1). Số hàng cũng sai: bộ đánh giá in **22 hàng** (21 hàng plan/B5 + `shift1.firstGoal`), không phải 23. **Giao thức nghiệm thu** (mặc định của `career.ts`, của `npm run sim:career:gate` và của `npm run sim:balance`): bot chính sách S1–S4 (bàn và ghế trước, rồi rẻ nhất) + thuê thẳng mặt bằng tốt nhất mà Đường Lên Trùm và ví cho phép, không mua chó; seed 42 và 99 (hai seed **tinh chỉnh**, không phải kiểm định); bắt đầu 2026-09-09 (mặc định S1–S4); 30 ngày, k và tổng 30 ngày đo trên đơn chuẩn (D4a). Bot v4 (`--bot=price`), bắt đầu đầu mùa (`--start=2026-09-06`), lệch 3 ngày và bốn seed ngoài (7, 123, 20260611, 20260908) chỉ là **bảng thông tin**. **Cách tìm số:** bot nghiêm ngặt "dành tiền cho bàn/ghế kế tiếp, không mua gì khác" (điện thoại là món duy nhất chen vào) nên ghế 2 đầu tiên rơi ngay sau cái bàn cuối mà mặt bằng cho phép, và mọi lần mua trước nó phải cách nhau ≤ 8 ca: muốn ghế 2 ở ca 40–56 thì mặt bằng đầu phải chứa 6–8 bàn và mỗi nấc thang bàn phải tốn ~6,5 ca thu nhập. Vì vậy thang bàn được **thiết kế** (`packages/engine/sim/solve-ladder.ts`: mỗi nấc là một phép chia đôi trên career ngắn để bàn k được mua ở ca mục tiêu, trung bình hai seed), ghế gần như miễn phí (để pha ghế rồi quầy Lv3 + điện thoại → LP2 xong trong ~6 ca), rồi một lượt descent đòn bẩy cuối dốc (`literal4.mjs`, hai seed); lưới 1–3, sampling ngẫu nhiên 600 điểm trên career 12 ngày và hai descent trước đó nằm trong `sweeps/literal/`, mọi lượt chạy được lưu; thang bàn luôn đơn điệu (`ladderProblem`: một ứng viên có nấc sau rẻ hơn nấc trước bị loại, vì descent từng tìm ra thang ghế răng cưa 50.000 / 22.500 chuyên lợi dụng bot). **Số chốt** (bộ L, 87 đường dẫn so với 2.0.23, `plans/candidate-l.json`; chỉ `docs/config/economy.tbh.json` mang số): `shift.startingCoinsBase` **300** (750 xu, ví của S4: người chơi KIẾM bàn 2 ở ca 1 — P0; không phải đòn bẩy) · `tip.rate` 0,30 → **0,17** · `shift.dailyEarnCapBase` 200 000 → **350 000** · `locations.leaseDays` 7 → **2** · `tableSlots` 4 ×9 → **8 ×9** · `rentPerDayBase` ×**0,3** (1 200 · 2 000 · 3 000 · 4 200 · 5 400 · 7 200 · 9 600 · 13 200) · `mult` → **1 · 1,012 · 1,025 · 1,038 · 1,05 · 1,063 · 1,075 · 1,088 · 1,1** · `league.seasons` ranking 7 / contest 14 → **21 / 21** · `lifePath[].lifetimeBase` và bậc giải **8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2,24 tr** (một thang) · `tablePriceBase` **600 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000** · `chairPriceBase` **400 · 600 · 900 · 1 200 · 1 600 · 2 000 · 2 400 · 2 800** · nâng bàn →Lv2 **7 000 + 2 500·n**, →Lv3 **34 000 + 13 500·n**, →Lv4 **59 500 + 20 500·n** · nâng ghế **12 000 + 6 000·t** · thiết bị Lv2–5 (bếp Lv1–4): bom **2 000 / 7 750 / 38 750 / 146 750**, rửa **1 500 / 6 250 / 29 500 / 97 750**, hầm **1 250 / 4 500 / 22 500 / 73 250**, quầy **750 / 3 250 / 14 250 / 59 000**, bếp **4 500 / 19 500 / 78 500 / 195 500** (base, hiển thị ×2,5). Giữ nguyên: `spawn.pPair` 0,5 · `capacityDemand` 6/4 · hàng đợi 1 + ghế/8 · kiên nhẫn 24 000 · gate và lợi ích cấp bàn/ghế của S4 · `kegStorage`/`kegBatch` · `stall.stockCap` · `rush.schedule.warningMs` · `shift.noCooldownFirstShifts` 3. Sàn giá (không bậc thiết bị nào rẻ hơn bàn 2): quầy Lv2 = 750 base. **Bảng cổng** (`npm run sim:balance`, 22 hàng, hàng · mục tiêu · seed 42 | seed 99): k chuẩn 2,0–3,0 (cold / full / cold-off / full-off) 2,339 · 2,691 · 2,318 · 2,787 | 2,315 · 2,813 · 2,366 · 2,845; k career đơn chuẩn ≤ 3,5: 3,156 | 3,165 (thô 3,94 | 3,94); tổng 30 ngày đơn chuẩn ≤ 9,185 tr: 8,898 | 9,083 tr; LP7 ca 140–170: 167 | 162; thiết bị max ≤ 170: 167 | 162; 8 bàn Lv4 ≤ 170: 167 | 162; bàn 4 ≤ 48: 14 | 15; ghế 2 đầu 40–56: 41 | 41; bàn Lv2 đầu ≤ 56: 50 | 49; Lv4 đầu ≤ 120: 84 | 80; LP1+2 ≤ 48: 14 / 47 | 15 / 47; LP3+4 ≤ 96: 51 / 55 | 50 / 55; LP5 ≤ 120: 70 | 69; khoảng trống mua dài nhất ≤ 8: 7 | 7; bỏ đi có phạt ca 1–24 ≤ 10 %: 1,9 | 0,4 %, ngày 8–14 ≤ 20 %: 11,4 | 11,2 %, ngày 15–21 ≤ 15 %: 12,4 | 11,6 %; ca 1 ≥ 15 khách và ≥ 5 cặp bị từ chối: 19 / 5 | 17 / 5; trần ngày chạm đầu tiên ≥ ca 150: 184 | 168; mất khách vì hết bia < 10 %: 1,9 | 2,3 %; mục tiêu đầu sau ca 1 = bàn 2 (bậc thiết bị rẻ nhất 1.875 ≥ 1.500): đạt | đạt; **ví ca 1: ví đầu 750 < 1.500 (đạt) nhưng hàng "mọi lượt kết ca ≥ 1.500" KHÔNG đạt: nhỏ nhất 732, trung vị 1.283, 45 / 60 lượt dưới 1.500 ở cả hai kiểu phục vụ (thu ròng nhỏ nhất −18, trung vị 533; plan kỳ vọng 850–1.160)** → **21 / 22 hàng đạt trên cả hai seed**, hàng ví ca 1 đỏ. **Hàng ví ca 1 (P0) — vì sao đỏ:** `balance-p0.ts` chạy một descent chỉ riêng ca 1 trên mọi đòn bẩy plan nêu tên (`tip.rate`, `capacityDemand` maxMult / refTables, hàng đợi, kiên nhẫn, kho bom / mẻ, kho quầy, `warningMs`, giá bàn 2), ví đầu cố định 750: 73 ứng viên, 4 lượt (3 lượt cuối không cải thiện), tốt nhất = `tip` 0,5 + `maxMult` 1 + kiên nhẫn 12 s cho lượt tệ nhất kết ca ở **1.262** thay vì 1.500 (và sẽ phá cả hai cổng k); mọi thiết lập vừa phải để 40–45 / 60 lượt dưới 1.500. Đòn bẩy không được plan nêu (`pPair`, `spawn.baseMs`, `pBeer`) và thử bằng `p0-extended.mjs` chỉ cho thấy cần đổi luật nhóm khách của Đợt 2. Đây là phương án dự phòng của luật cạn kiệt (đòn bẩy nêu tên đã quét hết, ≥ 3 lượt không cải thiện): bộ chốt, PR ghi `[NEEDS OWNER DECISION]`. **Giao thức và độ bền (bảng thông tin, không phải cổng; "21 / 22 hàng trên hai seed tinh chỉnh và một ngày bắt đầu"):** bốn seed ngoài 7 / 123 / 20260611 / 20260908 (bot của plan, 09-09): trượt 2 ô trên 80 — tổng chuẩn 9,281 tr ở seed 7 và ghế 2 đầu ở ca 39 ở seed 20260611 — còn lại đạt, khoảng trống mua 8 ở cả bốn, bỏ đi ngày 8–14 ≤ 11,9 %; ngày bắt đầu đầu mùa 2026-09-06: **0 ô trượt**; lệch 3 ngày (2026-09-12): 1 ô (LP2 ca 49 ở seed 99, giới hạn 48); bot v4 (giá quyết định) trên bộ này: trượt LP7 / thiết bị / 8 bàn Lv4 (173 ở seed 99) và khoảng trống mua (10 / 11) — bộ này được chỉnh cho bot của plan, không cho v4. LP7 trùng ca mua món cuối của thiết bị (162–167), không bị giữ bởi cửa sổ mùa; nhưng `peak:` của LP4–7 đọc cửa sổ mùa 21 ngày hiện tại nên phụ thuộc ngày bắt đầu vẫn là thật, và đòn bẩy JSON của owner cho nó là `league.seasons.epochUtc` căn theo nửa đêm phát hành. **Chi phí thiết kế cần owner biết:** (1) mặt bằng đầu chứa 8 bàn (D13 vẽ 4) và ghế 2 gần như miễn phí (1.000–7.000 xu) — để người chơi thật `chairsAfterTables` = 4 vẫn cho mua ghế từ bàn 4, nên nhịp thật sẽ nhanh hơn nhịp bot; (2) rent ×0,3 và dốc `mult` tới 1,1: một mặt bằng cho tối đa +10 % payment và, với tám chỗ ở mọi nơi, không mở thêm bàn nào (câu "gần như chỉ còn là đòn sức chứa" ở bản vòng 1 sai, sửa ở review vòng 2); (3) `tip.rate` 0,17 làm hàng ví ca 1 xấu hơn 1 lượt (45 thay vì 44 / 60). Cổng k/tổng 30 ngày D4(a) và phương pháp đo k không đổi. Nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §5 S5, `docs/handoff/2026-10-19-vui3ca/briefs/B5-eco21-balance-pass.md`, DECISIONS `## 04 ·` (mục "acceptance bot is the plan's"), bằng chứng `artifacts/verification/feat-eco21-balance-pass/sweeps/literal/` (cục bộ). |
| 2026-10-21 / JSON 2.1.0 / rules 28 (S5 `eco21-balance-pass`, review vòng 2) — SỐ CHỐT (bộ L2), thay dòng "review vòng 1" ở trên (giữ làm lịch sử) | **[Vòng 3: các tỉ lệ n = 60 và các câu "đúng 4/5", "góc hẹp" của dòng này được thay bằng dòng vòng 3 ngay dưới (giữ làm lịch sử); câu về 4/5 của plan đã sửa tại chỗ.]** **Vì sao thay:** review vòng 2 (3 MAJOR, 6 MINOR; vòng 1 được xác nhận đã xử lý, bảng 21 / 22 tái hiện từng ô). (1) Ba số của owner bị sim đẩy đi dù **không cổng nào cần**: `shift.dailyEarnCapBase` 350.000 (D24: 400.000), `locations.leaseDays` 2 (brief B5: 3), LP7 và bậc giải 7 ở 2.240.000 (B5: 2.000.000) — đã trả lại 400.000 / 3 / 2.000.000 và kiểm lại bằng `npm run sim:balance` (mọi ô career vẫn đạt; LP2 ở seed 99 và khoảng trống ở seed 42 nằm đúng giới hạn). (2) `tableSlots` 8 ở mọi mặt bằng đảo D13 ("hẻm đầu = 4 bàn"; brief 4·4·5·6·6·7·8·8·8) nên là **quyết định owner thứ hai** (BLOCKERS `04 · tableSlots`: với 4·4·5·6·6·7·8·8·8 bảng cổng trượt tổng 30 ngày 9,362 | 9,332 tr, ghế 2 đầu ca 14 | 16 và bỏ đi ca 1–24 13,7 %; với toàn 4 trượt thêm LP7, 8 bàn Lv4, khoảng trống và cả ba dải bỏ đi); câu "mặt bằng gần như chỉ còn là đòn sức chứa" ở dòng vòng 1 sai (tám chỗ ở mọi nơi thì một mặt bằng không mở bàn nào) và đã sửa. (3) Hàng ví ca 1 chỉ là cách đọc NGHIÊM của P0 (mọi lượt kết ca ≥ 1.500); thêm hàng **theo lời plan** `shift1.plan` bên cạnh, không thay hàng cũ (bảng cổng giờ có **23 hàng**: 20 hàng cổng + ví ca 1 nghiêm + ví ca 1 theo plan + mục tiêu đầu): ví đầu 750 < 1.500; ≥ 4 lượt trong 5 (kiểu phục vụ tệ hơn trong hai kiểu) có 1.500 xu khi ca 1 đóng (ngưỡng của plan §4, hàng `fun-onboarding-visual`, `docs/PLAN-vui-3-ca-2026-09-18.md:87`: 5 người MỚI, ≥ 4/5 mua bàn 2 kết ca 1 không mở help; phiếu playtest `docs/phase0-alpha-playtest.md:134` nhắc lại là "Ngưỡng PLAN §4"; plan KHÔNG có tiêu chí cho tỉ lệ của các lượt bot: chuyển 4/5 sang tỉ lệ lượt probe và hai dải 8–12, 850–1.160 là cách đọc của worker); thu ròng trung vị 850–1.160 xu (bảng §0 của plan); trung vị cặp bị từ chối 8–12 ("~10 cặp"). (4) Gói P0 của vòng 1 thiếu đòn bẩy rẻ nhất, D19 `capacityDemand.maxMult`: với maxMult 4 (D19) chỉ 19 / 60 lượt mua nổi bàn 2 khi ca 1 đóng, thu trung vị 588, 6 cặp; maxMult 2 → 46 / 45 / 60, 1.057 xu, 11 cặp (đúng lời kể của plan); với maxMult 4 không đòn nào khác (tip tới 0,30, kiên nhẫn, hàng đợi) vượt 26 / 60; `spawn.baseMs` không có tác dụng ở ca 1; giá bàn 2 ≈ 1.100 xu cho 51 / 50 / 60. Ba hàng của plan cùng đạt chỉ ở một góc hẹp (maxMult 2,05 + `queueBaseSlots` 2 + kiên nhẫn 33–39 s + tip 0,19–0,20: 48 / 60 lượt, đúng 4/5) — dịch D19 và D25. **Giao thức không đổi** (bot chính sách S1–S4 + thuê thẳng + không chó, 2026-09-09, seed 42 và 99, 30 ngày, k và tổng trên đơn chuẩn D4a). **Số chốt:** bộ L (dòng vòng 1) với bốn số owner trả lại: `shift.dailyEarnCapBase` **400.000** · `locations.leaseDays` **3** · `lifePath[7].lifetimeBase` và `league.tiers[7].minSeasonEarnedBase` **2.000.000** (thang owner 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr); mọi số khác của dòng vòng 1 giữ (tip 0,17, `tableSlots` 8 ×9, rent ×0,3, `mult` 1 … 1,1, thang bàn / ghế / cấp / thiết bị). **Bảng cổng** (`npm run sim:balance`, 23 hàng, seed 42 | seed 99): k chuẩn 2,0–3,0 (cold / full / cold-off / full-off) 2,339 · 2,691 · 2,318 · 2,787 | 2,315 · 2,813 · 2,366 · 2,845; k career đơn chuẩn ≤ 3,5: 3,173 | 3,136 (thô 3,97 | 3,90); tổng 30 ngày đơn chuẩn ≤ 9,185 tr: 9,073 | 8,997 tr; LP7 ca 140–170: 164 | 165; thiết bị max ≤ 170: 164 | 165; 8 bàn Lv4 ≤ 170: 164 | 165; bàn 4 ≤ 48: 14 | 15; ghế 2 đầu 40–56: 41 | 42; bàn Lv2 đầu ≤ 56: 50 | 50; Lv4 đầu ≤ 120: 82 | 84; LP1+2 ≤ 48: 14 / 47 | 15 / 48; LP3+4 ≤ 96: 51 / 56 | 51 / 56; LP5 ≤ 120: 70 | 71; khoảng trống mua dài nhất ≤ 8: 8 | 7; bỏ đi có phạt ca 1–24 ≤ 10 %: 2,1 | 0,6 %, ngày 8–14 ≤ 20 %: 10,5 | 11,7 %, ngày 15–21 ≤ 15 %: 12,3 | 12,0 %; ca 1 ≥ 15 khách và ≥ 5 cặp bị từ chối: 19 / 5 | 17 / 5; trần ngày chạm đầu tiên ≥ ca 150: chưa chạm | chưa chạm; mất khách vì hết bia < 10 %: 1,6 | 2,7 %; mục tiêu đầu sau ca 1 = bàn 2 (bậc thiết bị rẻ nhất 1.875 ≥ 1.500): đạt | đạt; **ví ca 1 nghiêm:** 750 < 1.500 đạt nhưng nhỏ nhất 732, trung vị 1.283, 45 / 60 lượt dưới 1.500 — **đỏ**; **ví ca 1 theo plan:** 19 / 60 lượt (32 %) mua nổi bàn 2 khi ca đóng, thu trung vị 588, 6 cặp — **đỏ** → **21 / 23 hàng đạt**. `sim:career:gate` PASS: k 3,1731 | 3,1357, tổng 9.072.610 | 8.996.510, `1e7e93f7…` | `158d0f97…`. **Phương án dự phòng của luật cạn kiệt, theo từng hàng:** hàng nghiêm — `balance-p0.ts` 73 ứng viên, 4 lượt (3 lượt cuối không cải thiện), mọi đòn bẩy nêu tên, tốt nhất tệ nhất 1.262; hàng theo plan — tìm chung vòng 2 với maxMult tự do (`plans/joint1.mjs`, `joint3.mjs`, lưới mịn 416 điểm) cho thấy chỉ góc hẹp trên đạt và dịch hai số owner; theo thứ tự (i) 21 hàng khác đạt, (ii) ít số owner bị dịch nhất, (iii) tỉ lệ P0 cao nhất, bộ chốt là **L2** (dịch D13 và D1 theo phép), Set 4 (phương án (d), `plans/candidate-d.json`, 90 đường dẫn so với 2.0.23): D19 `maxMult` 2,05 + D25 `queueBaseSlots` 2 + tip 0,19 + kiên nhẫn 33 s + `mult` mặt bằng phẳng 1,0 + thang thiết bị / ghế định giá lại — hàng theo plan ĐẠT (48 / 60 lượt mua nổi bàn 2, thu trung vị 1.082, 11 cặp), hàng nghiêm đỏ (13 và 14 / 60 dưới 1.500), một ô career lệch một ca (ghế 2 đầu ở ca 39 ở seed 42, cửa sổ 40–56); vì dịch thêm D19, D25 và `mult` nên theo (ii) KHÔNG vào bộ chốt mà là phương án (d) cho owner. Chọn một trong (a)–(d) là việc của owner (BLOCKERS `04 · P0`). **Nhãn:** `2.1.0` nay đứng cho năm nội dung trên nhánh này (62d2ecb, 088ff1b, e6e3ea2, adc4b24, 63aaf2f); chưa gì được deploy; stage 07 và 5 phút kiểm của owner bắt đầu từ bộ nhớ trình duyệt trống và DB server mới (DECISIONS `04 · the label`). Nguồn: DECISIONS `## 04 ·` (vòng 2), BLOCKERS. |
| 2026-10-21 / JSON 2.1.0 / rules 28 (S5 `eco21-balance-pass`, review vòng 3) — chỉ sửa THỐNG KÊ và lời văn của gói P0: **không đổi số kinh tế, không đổi luật**; thay các tỉ lệ "n = 60" của dòng vòng 2 ở trên (giữ làm lịch sử) | **Vì sao:** review vòng 3 (0 BLOCKER, 1 MAJOR, 4 MINOR; vòng 2 được xác nhận đã xử lý, bảng 23 hàng tái hiện từng ô). (1) **Mọi tỉ lệ "mua nổi bàn 2 khi ca 1 đóng" của gói P0 vòng 2 là số của 60 lượt probe đầu** (seed 1–60): khoảng tin cậy 95 % của một tỉ lệ trên 60 lượt rộng khoảng ±10 điểm (48 / 60 nằm trong 68–88 %). Probe ca 1 của bộ đánh giá nay đếm **300 lượt** (mặc định `TARGETS.shift1Seeds`; `--shift1=N` đổi) và in khoảng Wilson 95 % cạnh mỗi tỉ lệ; `packages/engine/sim/p0-share.ts` in một dòng cho mỗi cấu hình, mỗi số dưới đây có một lệnh (BLOCKERS `04 · P0`). Số ở n = 300 (kiểu phục vụ tệ hơn trong hai kiểu; khoảng Wilson 95 % trong ngoặc): **bộ chốt L2 26 % (22–32 %**; 79 / 300 nhanh, 80 / 300 kiểu 4 s; n = 600: 24 %), thu trung vị 542 | 529, 5 cặp, hàng nghiêm 231 / 300 lượt dưới 1.500 (nhỏ nhất 732); D19 `maxMult` 4 / 3 / 2,5 / 2 / 1,75 / 1,5 → 26 / 43 / 57 / 67 / 76 / 83 %; giá bàn 2 (phương án (a)): 1.500 → 26 %, 1.100 → **78 %** (73–82 %), 1.075 → 79 %, **1.073 → 82 %** (78–86 %, lần đầu ≥ 80 %), 1.065 → 84 %, 1.000 → 89 %; phương án (d) = Set 4 → **69 %** (64–74 %; 207 / 300; n = 600: 415 / 600 = 69 %, 65–73 %), thu 954 | 937, 11 cặp. Các câu "48 / 60 = đúng 4/5", "chỉ một góc hẹp", "chỉ đạt ở `maxMult` 2,05 + `queueBaseSlots` 2" của dòng vòng 2 **rút lại**: chênh 46 / 47 / 48 trên 60 lượt là nhiễu (±10 điểm) cộng với việc chọn điểm tốt nhất trong 416. (2) Lưới 40 điểm (`maxMult` 1,5–1,9 × `queueBaseSlots` 1 / 2 × kiên nhẫn 24 / 33 s × tip 0,17 / 0,19; 300 lượt mỗi điểm): tỉ lệ ≥ 80 % ở 16 điểm, tất cả ở `maxMult` 1,5–1,6, nơi trung vị cặp bị từ chối là 14–15 (dải 8–12); trung vị cặp trong dải ở 16 điểm, tất cả ở `maxMult` 1,8–1,9, nơi tỉ lệ chỉ 70–75 %; **không điểm nào đạt cả ba điều kiện** của hàng. Nói thẳng: ba số của plan (thu 850–1.160, ~10 cặp bị từ chối, bàn 2 giá 1.500 xu mua được cuối ca 1) không cùng đứng được với D19 `maxMult` 4 trong engine này và gần như không cùng đứng ở bất kỳ `maxMult` nào; `shift1.plan` đỏ cả với (d) Set 4 ở n trung thực. (3) Giá bàn 2 chỉ đổi điều kiện tỉ lệ: thu 542 | 529 và 5 cặp không đổi ở mọi giá, nên `shift1.plan` đỏ ở mọi giá của (a), và hàng nghiêm không đạt được bằng giá (cần ≤ 730 xu, thấp hơn ví đầu 750). Ở 1.065–1.075 xu 21 hàng khác vẫn xanh (ghế 2 đầu 40 | 40, LP2 45–46, khoảng trống 8 | 7); từ 1.060 xu xuống ghế 2 đầu tụt về ca 38 ở seed 42, ở 1.000 xu tổng 30 ngày 9,196 tr ở seed 42 (giới hạn 9,185). Phương án (b) `pPair` 0,3: 58 % và ghế 2 đầu 32 | 30, cặp bị từ chối ca 1 3 | 4 (< 5) đỏ. (4) Câu sai của dòng vòng 2 "plan không ghi con số 4/5" **đã sửa tại chỗ**: `docs/PLAN-vui-3-ca-2026-09-18.md:87` (§4, hàng `fun-onboarding-visual`) đòi 5 người MỚI, ≥ 4/5 mua bàn 2 kết ca 1 không mở help, và `docs/phase0-alpha-playtest.md:134` nhắc lại là "Ngưỡng PLAN §4"; plan KHÔNG có tiêu chí cho tỉ lệ của các lượt bot: chuyển 4/5 sang tỉ lệ lượt probe, dải 8–12 cho "~10 cặp" và dải 850–1.160 (bảng §0; DESIGN-story ghi 850–1.150) là cách đọc của worker, nên hàng `shift1.plan` (vòng 2 gọi "theo lời plan") nay gọi là hàng **theo lời kể của plan**. (5) **Luật cạn kiệt:** hàng nghiêm ĐẠT điều kiện (73 ứng viên, 4 lượt, 3 lượt cuối không cải thiện); hàng theo lời kể của plan KHÔNG đạt điều kiện (joint1–3 dừng trong lượt đầu, joint4 trong lượt thứ hai; sáu nhiễu một trục của Set 4 không đóng được ô ghế 2 đầu), và luật bộ chốt "(ii) ít số owner bị dịch nhất trước (iii) tỉ lệ P0 cao nhất" chọn L2 **theo cấu trúc**, vì mọi đòn P0 (D19, D25, giá bàn D16, `pPair` D17) đều là số owner trong khi plan §0 xếp P0 đầu tiên: đó là luật phá hòa, không phải kết quả của một cuộc tìm kiếm. **Số chốt không đổi** (bộ L2, 87 đường dẫn, dòng vòng 2). **Bảng cổng** (`npm run sim:balance`, 23 hàng; probe ca 1 ở n = 300): **21 / 23 đạt**; chỉ hai hàng ví ca 1 đổi số — **ví ca 1 nghiêm:** 750 < 1.500, nhỏ nhất 732, trung vị 1.235, 231 / 300 lượt dưới 1.500 — **đỏ**; **ví ca 1 theo lời kể của plan:** 26 % của 300 lượt (22–32 %) mua nổi bàn 2 khi ca đóng, thu trung vị 542 (4 s: 529), 5 cặp — **đỏ**; 21 hàng còn lại là số của dòng vòng 2. `sim:career:gate` PASS không đổi: k 3,1731 | 3,1357, tổng 9.072.610 | 8.996.510. Việc chọn một trong (a)–(d) vẫn là của owner (BLOCKERS `04 · P0`). Nguồn: DECISIONS `## 04 ·` (vòng 3), BLOCKERS. |
| 2026-10-21 / JSON 2.1.0 / rules 28 (S5 `eco21-balance-pass`, vòng quyết định owner) — SỐ CHỐT CUỐI: **bàn 2 = 428 base = 1.070 xu**, thay giá 1.500 xu của các dòng trên (giữ làm lịch sử) | **Vì sao:** hai quyết định owner của S5 đã chốt (founder, 21/10/2026, `OWNER-DECISIONS-S5.md`, user xác nhận trong chat): (1) P0 "kết ca 1 mua nổi bàn 2" = **CÓ**, cơ chế = phương án (a), hạ giá bàn 2 (không phải (b) `pPair`, (d) `maxMult`, (c) chấp nhận); (2) `tableSlots` 8 ở mọi mặt bằng **được duyệt** (đảo D13 có chủ đích). **Số chốt:** bộ L2 (dòng vòng 2) với một số đổi: `upgrades.table.tablePriceBase[0]` **600 → 428** base (×2,5 = 1.500 → **1.070 xu**); mọi số khác giữ nguyên (D19 `maxMult` 4, D24 trần 400.000, hợp đồng 3 ngày, LP7 và bậc giải 7 2.000.000, ví đầu 750 xu = 300 base, `tableSlots` 8, tip 0,17, rent ×0,3 ...). **Giá chọn thế nào:** giá tròn cao nhất mà ≥ 80 % lượt probe (kiểu phục vụ tệ hơn trong hai kiểu) mua nổi bàn 2 khi ca 1 đóng ở n = 300 VÀ n = 600 và mọi hàng cổng còn lại đạt trên seed 42 và 99: 1.070 xu → **83 %** (251 / 300 nhanh, 250 / 300 kiểu 4 s; khoảng 95 % 79–87 %) và **81 %** ở n = 600 (489 / 600, 487 / 600; 78–84 %); 1.073 xu → 82 % | 80,5 %; 1.075 xu → 79 % | 77 % (vách giữa 1.073 và 1.075 xu: 10–11 lượt kết ca với ví nằm giữa hai giá); 1.100 xu → 78 %; từ 1.060 xu xuống ghế 2 đầu tụt về ca 38 ở seed 42. **Cách đọc hàng P0 (quyết định owner 1, ghi ở DECISIONS):** hàng cổng `shift1.plan` = ví đầu không mua nổi bàn 2 VÀ ≥ 4 lượt trong 5 (kiểu phục vụ tệ hơn) mua nổi nó khi ca 1 đóng — tiêu chí của owner (plan §4 đòi 4/5 của 5 người mới; "83–85 %" trong văn bản của owner là chính số này); hàng ví ca 1 nghiêm `shift1.wallet` (mọi lượt) và hai dải của bảng §0 (thu trung vị 850–1.160, ~10 cặp bị từ chối đọc là 8–12 — hai dải là cách đọc của worker) in ra làm **THÔNG TIN** (không phải cổng): giá không thể đạt hàng nghiêm (cần ≤ 730 xu, thấp hơn ví đầu 750) và không đổi được thu 542 | 529 hay 5 cặp. Bảng vẫn **23 hàng: 22 hàng cổng + 1 hàng thông tin**. **Bảng cổng** (`npm run sim:balance`, seed 42 | seed 99, probe ca 1 ở n = 300): k chuẩn 2,0–3,0 (cold / full / cold-off / full-off) 2,339 · 2,691 · 2,318 · 2,787 | 2,315 · 2,813 · 2,366 · 2,845; k career đơn chuẩn ≤ 3,5: 3,151 | 3,153 (thô 3,93 | 3,93); tổng 30 ngày đơn chuẩn ≤ 9,185 tr: 9,040 | 9,050 tr; LP7 ca 140–170: 163 | 165; thiết bị max ≤ 170: 163 | 165; 8 bàn Lv4 ≤ 170: 163 | 165; bàn 4 ≤ 48: 13 | 13; ghế 2 đầu 40–56: 40 | 40; bàn Lv2 đầu ≤ 56: 47 | 48; Lv4 đầu ≤ 120: 81 | 82; LP1+2 ≤ 48: 13 / 45 | 13 / 46; LP3+4 ≤ 96: 48 / 53 | 49 / 54; LP5 ≤ 120: 68 | 69; khoảng trống mua dài nhất ≤ 8: 8 | 7; bỏ đi có phạt ca 1–24 ≤ 10 %: 3,2 | 0,4 %, ngày 8–14 ≤ 20 %: 11,3 | 12,5 %, ngày 15–21 ≤ 15 %: 12,4 | 12,9 %; ca 1 ≥ 15 khách và ≥ 5 cặp bị từ chối: 19 / 5 | 17 / 5; trần ngày chạm đầu tiên ≥ ca 150: chưa chạm | chưa chạm; mất khách vì hết bia < 10 %: 1,2 | 1,5 %; mục tiêu đầu sau ca 1 = bàn 2 (bậc thiết bị rẻ nhất 1.875 ≥ 1.070): đạt | đạt; **cổng `shift1.plan` (tiêu chí của owner):** ví đầu 750 < 1.070 và **83 % của 300 lượt** (79–87 %; 251 / 300 nhanh, 250 / 300 kiểu 4 s) mua nổi bàn 2 khi ca 1 đóng — **đạt**; **thông tin, không phải cổng:** ví ca 1 nghiêm `shift1.wallet` (mọi lượt kết ca ≥ 1.070): 74 / 300 lượt dưới, nhỏ nhất 732, trung vị 1.235 — không đạt và không đạt được bằng giá; thu trung vị 542 | 529 (ngoài dải 850–1.160) và 5 cặp bị từ chối (ngoài dải 8–12) → **22 / 22 hàng cổng đạt**. `sim:career:gate` PASS: k 3,1512 | 3,1527, tổng 9.040.022 | 9.049.861, `4c11cae1…` | `fd3587d4…`. **Chạy thông tin (không phải cổng; `stage04/r4/info-*.txt`):** 4 seed giữ lại 7 · 123 · 20260611 · 20260908: 2 ô đỏ / 76 (LP2 ca 52 và khoảng trống 9 ở seed 20260908); bắt đầu 2026-09-06: 6 ô đỏ (LP7 172 ở seed 42 và theo đó thiết bị / 8 bàn Lv4, LP2 49 ở cả hai seed, khoảng trống 9 ở seed 42); bắt đầu 2026-09-12: 1 ô đỏ (tổng 30 ngày 9,188 tr ở seed 99); bot v4: LP7 / thiết bị / 8 bàn Lv4 174 | 172 và khoảng trống 9 | 9. **Nhãn:** `2.1.0` nay đứng cho **sáu** nội dung trên nhánh này (62d2ecb, 088ff1b, e6e3ea2, adc4b24, 63aaf2f và giá bàn 2 này); chưa gì được deploy; stage 07 và 5 phút kiểm của owner bắt đầu từ bộ nhớ trình duyệt trống và DB server mới (DECISIONS `04 · the label`). Các assert được đổi CÓ CHỦ ĐÍCH theo quyết định này (DECISIONS): `balance-gates.test.ts` (các dải thu / cặp và hàng nghiêm không còn làm trượt cổng), `sealed-economy.test.ts` ("ví đầu trả tối đa nửa giá bàn 2" → "ca 1 còn phải kiếm ≥ 300 xu"; giá 428 base). Nguồn: DECISIONS `## 04 · owner decision 1` và `2`, BLOCKERS `04 · P0` và `04 · tableSlots` (đã đóng). |
| 2026-10-22 / JSON 2.1.0 / rules 28 (Đợt 3 `fun-kick-table`, "Mời về") | Section mới **Tier A** `kickTable {feeRate, repPerGuest, _rule}` (§22 dòng `kickTable`, `_meta.governance.tiers.A.sections` + `kickTable`; FEEDBACK II.3, D3): lệnh `kickTable {tableId, maxCost}` mời về bàn khách **đang nhâm nhi** (`consuming`: nhóm ngồi lại với mâm đã giao; `occupied`: chỉ còn Chí Phèo) — không khi khách chờ món / đang ngồi vào / bàn dọn / bàn trống (`tableNotLingering`); xu = Σ `round(gross đơn gần nhất của khách × feeRate × customerTypes.leavePenaltyMult)` (VIP ×10, Chí Phèo 0), ghi `spent`; uy tín −`repPerGuest` mỗi khách, không ×k, không xuống dưới 0; `maxCost` thấp hơn giá thật → `kickCostChanged`, thiếu xu → `notEnoughCoins`; không `lost`, không −5, không `lostStreak`; event `table_kicked`, rồi bàn dọn và nhận nhóm kế. Thay dòng 🟡 "Tiễn ngồi lỳ" của §9 (`penalty.kickStubbornRepBase` giữ cho pin cũ, không còn dùng). **Số:** `repPerGuest` **2** (ứng viên); `feeRate` ứng viên 0,5 **vượt** luật plan §6 (bot mời — mời bàn nhâm nhi rẻ nhất vừa nhóm đang chờ, khi hàng đợi > 0 và ca còn ≥ 40 s — so với bot không mời: thu nhập 30 ngày ≤ +10 %, seed 42 \| 99, `npm run sim:kick`): 0,5 +13,24 % \| +13,40 % · 0,75 +8,10 \| +13,79 · 1,0 +9,23 \| +13,26 · 1,25 +8,16 \| +11,50 (đều trượt) · **1,5 +8,76 \| +5,64 → chốt `feeRate` 1,5** · 2,0 +6,18 \| +4,94 (thông tin); uy tín cuối của bot mời ở 1,5: 13 313 \| 12 231 (bot không mời 4 266 \| 4 399; điều kiện ≥ 0 không thể trượt vì `changeRep` chặn uy tín ở 0); thu nhập ròng sau phí (thông tin): 0,5 +8,85 \| +9,06 %, 1,5 −4,44 \| −7,72 %; 4 seed giữ lại ở 1,5 (thông tin, không phải cổng): 7 +10,70 %, 123 +9,52 %, 20260611 +9,10 %, 20260908 +10,17 %. Thu nhập = cái sim career gọi là `income` (`lifetimeEarned` tăng mỗi ngày: tiền phục vụ, tip, ship ròng, chặn mỗi ngày ở `shift.dailyEarnCapBase`), đọc gross (trước phí mời về) — không phải số của cổng giá trị 30 ngày (cổng đó đọc giá trị đơn chuẩn đã phục vụ, `m.standard.totalValue`: bot mời ở 1,5 là 10,609 \| 10,255 tr so với 9,040 \| 9,050 tr, +17,4 \| +13,3 %); gross hay ròng là **OWNER CALL** (HANDOFF §13, DECISIONS `## 06 ·`). Bot không mời (giao thức nghiệm thu) không đổi: `npm run sim:balance` giữ đúng 22 cổng ĐẠT + 1 INFO từng ô, `sim:career:gate` cùng command hash của S6. **Nhãn giữ 2.1.0** (plan §2), nội dung thứ tám của nhãn (62d2ecb, 088ff1b, e6e3ea2, adc4b24, 63aaf2f, ea33595 của S5/S6, 2f47715 với `feeRate` 0,5, f4855d2): pin 2.1.0 của S5/S6 (không có mục) vẫn nạp (`SEAT_KEYS_ADDED_LATER` dòng `kickTable`, `optionalAt` 2.1.0) và replay từng byte (`packages/engine/test/fixtures/seat-2.1.0-v28.json`, ghi bằng engine S6); save ghim nội dung S6 giữ pin đó (không có "Mời về"); stage 07 và kiểm 5 phút của owner bắt đầu từ bộ nhớ trình duyệt trống và DB server mới. |
| 2026-10-22 / JSON 2.1.0 / rules 28 (Đợt 3 `fun-kick-table`, review vòng 1) — không đổi số | Chính xác hóa dòng Đợt 3 ngay trên và §22 dòng `kickTable` (sửa tại chỗ; JSON, cổng và giá trị niêm phong không đổi): (1) "thu nhập 30 ngày" của luật +10 % là `income` của sim career (`lifetimeEarned` tăng mỗi ngày, chặn ở `shift.dailyEarnCapBase`), đọc gross. Dòng trên từng ghi đó là "sổ của Đời Quán và cổng tổng giá trị 30 ngày" — sai: cổng giá trị 30 ngày đọc giá trị đơn chuẩn đã phục vụ (`m.standard.totalValue`; bot mời ở 1,5 cao hơn bot không mời +17,4 \| +13,3 %, và trên +10 % ở mọi `feeRate` đã thử); mục S3 `## 02 · k and the door gates` đo "total value", không đo thu nhập. `feeRate` giữ **1,5** theo cách đọc gross (quyết định orchestrator); cách đọc ròng với `feeRate` 0,5 (+8,85 \| +9,06 %) là **OWNER CALL** ở HANDOFF §13. (2) Nội dung hiện tại là nội dung thứ **tám** của nhãn 2.1.0 trong lịch sử git, không phải thứ bảy (2f47715 đã đẩy một nội dung với `feeRate` 0,5). (3) Đo k khi publish không phản ứng với `kickTable` (§22): rào chắn là validator, duyệt kép và chạy `npm run sim:kick` trước khi publish. (4) Dòng "uy tín cuối ≥ 0" không thể trượt vì `changeRep` chặn uy tín ở 0; `npm run sim:kick` nay in uy tín của bot không mời bên cạnh (13 313 \| 12 231 so với 4 266 \| 4 399) cùng hai dòng thông tin: thu nhập ròng và giá trị đơn chuẩn đã phục vụ của bot mời so với bot không mời. |
| 2026-10-22 / JSON 2.1.0 / rules 28 (Đợt 4 đóng gói "Vui 3 ca", stage 07) — không đổi số, JSON giữ từng byte | Bản mới nhất của §22 và §3 (sửa tại chỗ, plan §7 "thay số ứng viên bằng số S5 chốt trong 08-SPEC §22 + JSON"): (1) §22 dòng "Cấp bàn và cấp ghế" nêu thang chốt của 2.1.0 làm số hiện hành (→Lv2 7 000 + 2 500·n, →Lv3 34 000 + 13 500·n, →Lv4 59 500 + 20 500·n, ghế 12 000 + 6 000·t base; ×2,5 khi hiển thị) thay câu "Số là ứng viên W9" — thang W9 chỉ còn trong pin 2.0.23; (2) §22 dòng `kickTable` ghi OWNER CALL còn mở về cách đọc luật +10 % (gross 1,5 / net 0,5); (3) §3: dòng "Cỡ nhóm" nêu luật rules 28 (`spawn.pPair` 0,5, nhóm ≤ 2, D17) và thêm dòng "Cầu theo sức chứa" (`spawn.capacityDemand` 6 / 4). Mọi số của §3, §8.1–§8.6, §9, §13, §15, §16, §22 đã đối chiếu với `docs/config/economy.tbh.json` (2.1.0, nội dung có `kickTable`) và `npm run sim:balance` (22 cổng ĐẠT + 1 INFO trên seed 42 và 99, giống từng ô bảng của S5/S6/Đợt 3); JSON không có câu "ứng viên"/"chờ 2.1.0" nào nên không sửa (mọi chuỗi `_rule` nằm trong `configContent`: sửa một byte là nội dung thứ chín của nhãn 2.1.0 — DECISIONS `## 07 ·`). |
| 2026-10-22 / JSON **2.1.1** / rules 28 (vòng quyết định owner của PR #30, autopilot stage 07b) — số mới: `kickTable.feeRate` **0,5** | **Vì sao:** quyết định owner 1 (founder, 22/10/2026): luật "+10 % thu nhập 30 ngày" của "Mời về" đọc theo thu nhập RÒNG sau phí mời về, với `feeRate` 0,5 — cách đọc của founder, không phải nới cổng; cổng của `npm run sim:kick` đọc mức tăng ròng (gộp in làm thông tin), mọi cổng khác giữ nguyên. **Số đo (`npm run sim:kick`, seed 42 \| 99):** ròng +8,85 % \| +9,06 % ĐẠT; gộp +13,24 % \| +13,40 % (thông tin); uy tín cuối của bot mời 14 878 \| 16 291 (không mời 4 266 \| 4 399); giá trị đơn chuẩn đã phục vụ +19,95 % \| +19,52 % (thông tin); 4 seed giữ lại (thông tin, ròng): 7 +10,41 % · 123 +8,54 % · 20260611 +8,49 % · 20260908 +8,71 %. VIP nay tốn 0,5 × 10 = 5× gross mâm (trước 15×). **Nhãn:** một byte đổi là nội dung thứ chín của 2.1.0, nên `_meta.version` → **2.1.1**, `_meta.date` 2026-10-22; §9 dòng "Mời về" và §22 dòng `kickTable` sửa tại chỗ; `SEAT_KEYS_ADDED_LATER` dòng `kickTable` `since` 2.1.1 (không còn `optionalAt`). Save ghim một nội dung 2.1.0 nhận 2.1.1 ở lần mở ca kế (bản cũ hơn theo số) và có "Mời về" từ đó; DB server đã đăng ký 2.1.0 mở được (không còn `store:configVersionConflict`), ghi thêm 2.1.1 nhưng vẫn phục vụ phiên bản registry đã publish. `npm run sim:balance` giống từng byte (trừ dòng thời gian); `sim:career:gate` cùng k và giá trị, hash lệnh đổi thành `13e0785a…` \| `bc0c256f…` chỉ vì nhãn nằm trong từng lệnh (chạy lại trên bản gắn nhãn 2.1.0 ra đúng `4c11cae1…` \| `fd3587d4…`). DECISIONS `## 07 · owner calls 2026-10-22`. |
| 2026-10-22 / JSON **2.1.2** / rules 28 (founder: hiện đủ HUD và nút Nâng cấp từ ca 1 — Tier C, chỉ trình bày, config-only) — **không đổi số kinh tế, luật engine, `CURRENT_RULES` hay k** | **Vì sao:** founder chơi `trumbiahoi.com` bằng save mới (ca 1) và thấy thiếu thanh dưới (Mở ca · Nhập hàng · Nâng cấp), nút Cài đặt, đồng hồ ca và dải kho — F27 giấu chúng tới hết ca 1 (`apps/web/src/reveal.ts`); founder cần menu ngay từ đầu để nhập hàng và nâng cấp, và CHỌN phương án chỉ-đổi-config. **Đổi (đúng hai giá trị Tier C):** `onboarding.featureReveal.hudAfterShifts` 1 → **0** và `onboarding.featureReveal.upgradeAfterShifts` 1 → **0**. **Giữ nguyên:** `upgradeAllAfterShifts` 2, `journeyAfterShifts` 2, `questsAfterShifts` 2, `leagueAfterShifts` 3, `locationsAfterLifePathLevel` 1, `firstShift.*` (ca 1 vẫn 1 khách 1 bia, tắt risk/rush), `idleToGuideMs`, `lostStreakToGuide` và mọi số kinh tế. Nhãn 2.1.1 → **2.1.2**; không thêm key nên `SEAT_KEYS_ADDED_LATER` không đổi. **Ghi đè có chủ đích** luật owner 18/09 "HUD ca 1 chỉ 3 thứ" (GDD §17, PLAN 18/09 §0 P0, 09-SPEC dòng 2026-09-18) cho đúng hai ngưỡng này; lý do gốc giữ nguyên ở dòng 2026-10-14 / JSON 2.0.5 ở trên. **Hệ quả cùng cổng `hud`:** nút "Mời về" (F07) cũng hiện từ ca 1; save ghim cũ hơn 2.0.5 thiếu `hudAfterShifts` nên đọc seed (0) ở màn nghỉ trước lần "Mở ca" đầu (nhưng nút Nâng cấp vẫn theo `upgradeAfterShifts` đã ghim). **Người chơi cũ:** save ghim 2.1.1 / 2.0.x giữ ngưỡng đã ghim cho tới lần "Mở ca" kế tiếp, khi đó mở bằng bản đóng gói 2.1.2 (`apps/web/src/local.ts` `openingConfig`, nhãn lớn hơn); ai đã xong ≥ 1 ca vốn đã thấy HUD và nút Nâng cấp nên không đổi gì. **Test:** `sealed-economy` (cả khối `featureReveal` + `firstShift`), `spotlight-reveal` (reveal ở 0/1/2/3 ca; save ghim 2.1.1 giữ ngưỡng tới lần mở sau), `first-shift-visual.spec` (ca 1 hiện HUD ×3 viewport + axe). |
| 2026-10-22 / JSON **2.1.3** / rules 28 (founder: sửa ca 1 sau PR #32 — hai key Tier C mới; **không đổi số kinh tế nào**, `CURRENT_RULES` giữ 28) | **Vì sao:** founder xem PR #32 và chơi trumviahe.com cạnh trumbiahoi.com (22/10/2026): "Mời về" không nên có ở ca 1; ca 1 không nên có bàn ngồi lại lâu (trumbiahoi.com 22/10 ~15:36Z có nhóm "BÀN LAI RAI" ở ca 1, v-fb2, JSON 2.1.1); màn đầu phải có đúng một nút "Mở ca". **Key mới:** `onboarding.featureReveal.kickAfterShifts` **1** (UI, `apps/web/src/reveal.ts` `revealed().kick` = HUD AND ngưỡng này; save ghim thiếu key đọc seed như các ngưỡng reveal khác) và `onboarding.firstShift.excludedCustomerTypes` **["ngoily"]** (luật engine: ca onboarding — onboarding bật và chưa xong ca nào, cùng cổng với `firstShift.rushDisabled` — không bốc loại khách trong danh sách; bốc chia lại cho các loại còn lại, đúng như loại đó nặng 0, cùng lượng ngẫu nhiên). Cả hai thuộc section Tier C `onboarding` nên không thêm mục tier; `config.ts` thêm một dòng `SEAT_KEYS_ADDED_LATER` `since: '2.1.3'` cho cả hai (nhãn cũ hơn — kể cả 2.1.1 đang phát hành — nạp không có chúng, giữ từng byte; nhãn 2.1.3 phải có đủ cả hai). **Gate theo key:** save ghim thiếu key chơi và replay như cũ (lịch sử S6 đã ghi `seat-2.1.0-v28.json` có `ngoily` ở ca 1 vẫn replay đúng hash). **Không đổi, chỉ báo cáo:** các loại khác vẫn đến ở ca 1 — `thuong` 1,0 · `voi` 0,3 · `vip` 0,1 · `chipheo` 0,03 (Oi bức ×1,5); loại còn ngồi lại sau mâm ở ca 1 chỉ là Chí Phèo (`occupied`), và với A1 ca 1 không còn cách mời anh ta về: câu hỏi mở cho founder, xem F07 dòng 2.1.3. **Đo (Windows, 23/10/2026 00:1x):** `sim:career:gate` ĐẠT — k chuẩn **3,142 / 3,168** (2.1.2: 3,151 / 3,153), tổng chuẩn 9 011 465 / 9 045 901 (≤ 9 185 000), hash lệnh `7a2f391b…` / `81df44c8…`; `sim:onboarding` ĐẠT; `sim:rush` ĐẠT; `sim:balance`: k chuẩn 2,32–2,85 (trong 2,0–3,0), `shift1.plan` ĐẠT (86 % của 300 lượt đóng ca 1 với ≥ 1.070, trước 83 %), **nhưng hai ô seed 42 ĐỎ**: "LP1 và LP2 trước ca 48" (LP2 ở ca 49; trước 45) và "chuỗi ca không mua dài nhất ≤ 8" (10, ca 34–44; trước 8) → **STOP theo luật founder, chờ founder quyết**, không chỉnh số nào. A/B: cùng lệnh với `excludedCustomerTypes` = [] cho đúng bảng của 2.1.2 (mọi ô xanh), nên nguyên nhân là A2 (ca 1 khác → đường 30 ngày của seed 42 khác). Thông tin, ngoài giao thức (10 seed 1–8, 42, 99): không A2 thì hai hàng này cũng đỏ ở 5 / 4 seed, có A2 ở 3 / 5 seed; trung bình LP2 47,5 (có A2) vs 48,1, chuỗi 8,3 vs 8,4; nhưng có A2 thì độ phân tán 30 ngày rộng hơn (tổng chuẩn 8,71–9,22 tr vs 8,92–9,10 tr; seed 1 vượt 9,185, seed 2 LP7/thiết bị/bàn Lv4 ở ca 171). Log: `autopilot-logs/a-sim-balance*.log`. |
| 2026-10-23 / JSON **2.1.3** / rules 28 (founder quyết STOP của Part A; review A-r1) — **không đổi số, không đổi luật engine** | **Founder 23/10/2026 chọn phương án (c)** (`.autopilot-state/A-FOUNDER-DECISION-2026-10-23.md`): giữ A1/A2/A3 đúng như đã làm (`excludedCustomerTypes` ["ngoily"]), **không chỉnh số**; hai ô seed 42 đỏ của `sim:balance` ở dòng 2.1.3 ngay trên ("LP1 và LP2 trước ca 48" = 49; "chuỗi ca không mua dài nhất ≤ 8" = 10) **được chuyển sang B1, không được miễn**: B1 chạy lại giao thức trên A2 + B1, cộng A/B seed 42 và 99 với `excludedCustomerTypes` = [] và quét 10 seed để tham khảo; nếu vẫn đỏ thì STOP, báo số và phương án, không chỉnh số. **Part A không phát hành riêng.** Linux static trên tip `672dde4` xanh (run 39830190304: 8 cổng exit 0, `npm test` 808/808, `verify:doctor` ✓, hash career = Windows). Review A-r1 (0 BLOCKER, 0 MAJOR, 6 MINOR): nút "Mời tất cả về" của sổ ca cũng theo `show.kick` (cách đọc A1, founder có thể bỏ: một điều kiện); câu hỏi mở về Chí Phèo ở ca 1 (F07, dòng 2.1.3); giới hạn màn ngang `max-height ≤ 500 px` chuyển cho B2.8 (09-SPEC §4.2). |
| 2026-10-23 / JSON **2.1.4** / rules 28 (founder 22/10/2026, IMPROVE-EARLY-GAME Part B1 — nhịp đầu game; ba key luật mới, **không đổi số kinh tế nào**, `CURRENT_RULES` giữ 28) — **STOP: `sim:balance` và `sim:career:gate` đỏ, chờ founder; không chỉnh số** | **Vì sao:** ca 1 trên trumbiahoi.com 22/10: khách ngồi cách nhau 40–110 s, hơn 5 phút không ai ngồi, 5 cặp bị từ chối "Hết chỗ" (`capacityDemand` ×4 ở 1 bàn và `pPair` 0,5 khi bàn đầu chỉ 1 ghế); đợt light đầu của ca 2 (shift-205, lạnh, 1 bàn) không có ai đến; ly bia đầu đời bị hết hơi (12 s trong khi người mới đang đọc hướng dẫn). **Key mới:** `spawn.singlesUntilPairSeat` **true** (**Tier A**, founder duyệt; thêm vào `tiers.A.sections` như `spawn.pPair`): khi chưa bàn nào có 2 ghế, `Game.spawn()` bốc với xác suất cặp 0 (cùng lượt ngẫu nhiên), từ bàn 2 ghế đầu tiên `pPair` áp như cấu hình; `rush.schedule.replanPendingArrival` **true** (Tier B): lúc đợt bắt đầu/kết thúc, `nextSpawnAt = min(còn lại, khoảng cách 1 khách theo nhịp mới)` (giả thuyết B1.2 được unit test xác nhận trên pin 2.1.3); `onboarding.firstShift.staleDisabled` **true** (Tier C): ca onboarding không có bia hết hơi (`freshnessMs()` không giới hạn). Một dòng `SEAT_KEYS_ADDED_LATER` `since: '2.1.4'` (ba path + mục Tier A): nhãn cũ hơn, kể cả 2.1.3, nạp không có chúng, giữ từng byte. **Gate theo key:** pin ≤ 2.1.3 chơi và replay như cũ; tắt cả ba key trên nội dung 2.1.4 = đúng ván 2.1.3 (chỉ khác nhãn); bảng đo với ba key tắt trùng từng byte với tip A. **Đo trước/sau** (`packages/engine/sim/early-pacing.ts`, 200 seed, save mới, 1 bàn, người mới: mâm đầu phục vụ sau 15 s rồi nhìn mỗi 4 s; trung vị): ca 1 nắng — nhóm ngồi 6 → 17, nhóm bị từ chối 5,5 → 0, khoảng cách giữa hai lượt ngồi 63 → 42 s, dài nhất 210 → 42 s (tệ nhất 630 → 126 s), giây không ai ngồi 627 → 489 trên 720, bia hết hơi 1 → 0, xu khi đóng ca 1 1 299 → 2 433; lạnh — 6 → 15 nhóm, 638 → 518 s trống, 1 238 → 2 165 xu; ca 2 — mỗi đợt light đến / phục vụ / mất 5 / 1 / 0 → 6 / 5,5 / 0 (nắng), khách đầu của đợt sau 32,8 → 14,7 s, đợt không ai đến (lạnh) 11–13 / 200 → 0 / 200. Ca 1 ở 1 bàn **vẫn trống khoảng 2/3 thời gian** (báo cáo, không chỉnh). **`sim:balance` (seed 42 / 99) trên A2 + B1:** hai ô mang từ Part A **XANH** — LP2 ca 49 → **27** / 47 → 28, chuỗi không mua 10 → **6** / 7 → 6; `shift1.plan` 100 % (trước 86 %); k chuẩn 2,307–2,881; k career 3,151 / 3,178; trần ngày ĐẠT; **nhưng 4 hàng ĐỎ ở cả hai seed:** tổng chuẩn 30 ngày **10,057 / 9,945 tr** (≤ 9,185), ghế 2 đầu tiên ở ca **21 / 22** (40–56), bỏ đi có phạt ca 1–24 **15,7 % / 13,0 %** (≤ 10 %), ca 1 cặp bị từ chối **0 / 0** (≥ 5 — B1.1 bỏ hẳn việc này theo thiết kế, mục tiêu giao thức mâu thuẫn với quyết định); `sim:career:gate` ĐỎ (seed 42 tổng 10 056 681 > 9 185 000). A/B `excludedCustomerTypes` [] (B1 không A2): cùng 4 hàng đỏ, hai ô Part A vẫn xanh. Từng key (thông tin): B1.3 không đổi gì của bot; chỉ B1.2 (B1.1 tắt) vẫn đỏ tổng 9,280 / 9,280 tr, ghế 2 seed 99 ca 38, bỏ đi ngày 15–21 seed 99 15,7 %; chỉ B1.1 (B1.2 tắt) đỏ như B1. Quét 10 seed (1–8, 42, 99; thông tin): LP2 27–30 và chuỗi 5–6 xanh ở cả 10 seed (có và không A2); tổng 9,76–10,29 tr, ghế 2 ca 21–23 đỏ ở 10/10, bỏ đi ca 1–24 đỏ ở 9/10. → **STOP theo luật founder**, phương án trong PR B1 (`.autopilot-state/reports/B1-PR-BODY.md`). Log `autopilot-logs/b1-*.log`. |
