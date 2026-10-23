# DESIGN — Story 3 tuần + Mùa 21 ngày — Trùm Bia Hơi (v1.3, 18/09/2026)

> Quyết định owner 18/09 đêm: người chơi **chơi hết game (full story) sau 3 tuần chơi liên tục = 8 ca × 12 phút/ngày = 168 ca**; không chơi hàng ngày thì tự giãn (mọi mốc neo theo **số ca**, không theo ngày lịch). Full story = LP0–7 + 9 mặt bằng + mọi nâng cấp + **lớp rủi ro M6**. Sau màn kết: **mùa 21 ngày** có bảng xếp hạng, mỗi mùa mới thêm gameplay mới.
> Ưu tiên trải nghiệm (owner 18/09): (1) onboarding nhìn-là-hiểu (PLAN §0 P0) → (2) mua sắm lần lượt → (3) economy. §2b = hành trình người chơi theo ca.
> Số ở đây = ứng viên **đã sim** trên engine thật (bộ **W9** = W2 + hàng đợi ngắn + kiên nhẫn 24 s + thuê thẳng mặt bằng; bot 8 ca/ngày, seed 42 + 99, 28 ngày). S5 chốt. Owner 18/09 đêm: **giữ nguyên cooldown 30 phút và trần ca 8/6/5** — không phải ai cũng chơi đủ 8 ca; mốc neo theo ca nên số ngày tự giãn. Chỉ giữ bản mới nhất. Bổ sung cho `FEEDBACK-2026-09-17.md` §II.2 v3.3 (bàn ghế) — không lặp lại phần đó.

## 1. Vì sao phải nén

Economy hiện tại thừa kế từ trumviahe — game idle sống bằng **tháng**: LP7 = 125 tr xu trọn đời, trần 500 k/ngày (→ ≥ 250 ngày), hợp đồng mặt bằng 7 ngày × 8 mặt bằng, thiết bị Lv5 + bếp Lv4 ≈ 2,6 tr + 1,5 tr xu. Sim W1 (số v3.3 + LP nén 12×) vẫn gãy ở 4 chỗ: mỗi hợp đồng 7 ngày → 2 mặt bằng/3 tuần; LP6 đòi toàn bộ thiết bị Lv5 → không kịp; trần 500 k chạm từ ngày 21 → hồi 3 không còn chỗ; bot ưu tiên thiết bị rẻ nên 7 ngày mới đủ 4 bàn. Game 3 tuần hữu hạn = **nén cây 25–50×** và **neo theo ca**.

## 2. Xương sống 3 hồi (8 ca/ngày; người chơi ít ca/ngày hơn thì kéo dài tương ứng)

| Hồi | Ngày (ca) | Cái mới để khám phá | Mốc kết hồi (bot W2, seed 42 / 99) |
|---|---|---|---|
| 1 "Quán cóc" | 1–7 (1–56) | 4 bàn → ghế 2 (cặp vào, mâm đôi) → Lv2 (đợt thêm); bom/rửa/kho Lv2–3, bếp Lv1; Giờ Vàng nhẹ; khách vội, lai rai, Chí Phèo; điện thoại | bàn 4 ngày 5 · ghế đầu ngày 6 · Lv2 đầu ngày 6 · **LP1+LP2 ngày 5** |
| 2 "Chủ quán" | 8–14 (57–112) | mặt bằng 2–3 (Ngõ Chợ, Bến Xe: 4–5 chỗ bàn), Lv3 (mồi 2), bếp Lv2–3, hầm lạnh, QR, tờ rơi, biển hiệu; Giờ Vàng nặng, VIP, shipper, thời tiết | đủ 4 ghế ngày 10–11 · Lv3 đầu ngày 10–11 · Lv4 đầu ngày 13–14 · **LP3+LP4 ngày 10–11 · LP5 ngày 13–14** · Ngõ Chợ ngày 9–10, Bến Xe ngày 12–14 |
| 3 "Trùm" | 15–21 (113–168) | mặt bằng 4–6 (6–7 chỗ bàn), bàn 5–7, thiết bị Lv5, bếp Lv4, nâng ghế; **lớp rủi ro M6** (bảo kê từ LP4, chó, kiểm tra); rush dồn dập, phạt cụm | thiết bị max ngày 20–21 · **LP6 + LP7 ngày 20–21 = màn kết** · Gần Công Sở ngày 16, Gần SVĐ ngày 19, Hồ Bia Đêm ngày 22 |
| Sau kết | 22+ | Phố Cổ / Ga Metro / Phố Tây (8 chỗ bàn), bàn 8, mùa + bảng xếp hạng | post-game |

Thu nhập/ngày W9: 11 k (ngày 1) → 95–112 k (6) → 226 k (10) → 474–654 k (14) → 928–987 k (19) → trần 1 tr (20). Trọn đời: 188–212 k (ngày 6) · 868–891 k (10) · 2,4–2,7 tr (14) · 5,1–5,7 tr (18) · 7,6–8 tr (21). LP: 1+2 ngày 5 · 3+4 ngày 10 · 5 ngày 13 · **6+7 ngày 19**. k quan sát 6,5 (8 bàn Lv4 + tip; D4(a) bắt buộc). Xu dư ngày 28: 5,5–6 tr → S5 có thể nâng đuôi thiết bị ×0,5 → ×0,7 hoặc để M6 làm sink.

## 2b. Hành trình người chơi — từ lần mở link đến màn kết (owner hỏi 18/09)

Số ca lấy từ bot W9 (8 ca/ngày); người thật thường nhanh hơn 10–20 % ở giai đoạn 2–4 vì ưu tiên bàn/ghế trước thiết bị. Mỗi giai đoạn có **một thứ mới để học**, **một quyết định mới**, và **một vòng quay lại** (lý do mở app lần sau).

| # | Giai đoạn | Ca (ngày @8) | Người chơi thấy / học | Quyết định mới | Mở ra | Vòng quay lại |
|---|---|---|---|---|---|---|
| 0 | **Bước vào quán** | phút 0–2 của ca 1 | Mở link → vào thẳng sân quán tiếng Việt: 1 bàn 1 ghế, bom bia sáng "rót sẵn". Khách đầu tới ≤ 8 s, bong bóng 🍺, bàn sáng viền, ✅ nhấp nháy → chạm → xu bay lên ví. Không đọc gì. | chạm ✅ | — | — |
| 1 | **Ca đầu — quán cóc** | ca 1 (ngày 1) | Khách lẻ vào ra; **cặp đứng cửa, bong bóng "2 ghế", quay đi** (không phạt); người xếp hàng có vòng kiên nhẫn. Kết ca: sổ ca 3 số + "10 cặp không có chỗ"; chip *Bàn 2 — 1.500 xu*; ~850–1.150 xu + 750 khởi đầu → **mua bàn 2 ngay**. | mua món đầu tiên | bàn 2 | ca 2 mở ngay (không cooldown) |
| 2 | **Mở rộng sân** | ca 2–9 (ngày 1–2) | Bàn 3 (~ca 4–5), bàn 4 (~ca 8–9); bom cạn lần đầu → "Nhập bia" không pause; khách vội (kiên nhẫn ngắn), khách lai rai chiếm bàn; Giờ Vàng nhẹ có báo trước 20 s; ca 4 gặp **cooldown 30 phút** lần đầu (chip hiện ETA). Step guide chỉ bật nếu mất 3 khách liên tiếp. | phục vụ ai trước · nhập bia lúc nào · mời bàn lỳ về (Đợt 3) | bàn 3, 4; nút Mời về | cooldown 30 phút; trần 8 ca/ngày |
| 3 | **Cặp vào quán** | ca ~10–45 (ngày 2–6) | Đủ 4 bàn → làn ghế mở; **ghế 2 đầu tiên = thu nhập ×3**, cặp ngồi, mâm bia + mồi → kho lạc/nem, bếp Lv1 xuất hiện trong làn Tốc độ; bom/cốc/rửa bắt đầu nghẽn thật → nâng bom, mua cốc. LP1 (4 bàn) rồi LP2 (~ca 40): điện thoại, Ngõ Chợ/Bến Xe hiện trong bảng mặt bằng; Lv2 đầu tiên (khách gọi thêm đợt). | ghế hay thiết bị trước · bàn nào lên Lv2 | 4 ghế, bếp Lv1, Lv2, LP1–2 | "còn thiếu … xu" cho món kế; ca/ngày |
| 4 | **Chủ quán** | ca ~45–90 (ngày 6–11) | Thuê Ngõ Chợ/Bến Xe (5 chỗ → bàn 5), hợp đồng 3 ngày; Lv2 hết, Lv3 đầu (mồi 2) → bếp Lv2–3, hầm lạnh (bia mất hơi thành áp lực), QR, tờ rơi, biển hiệu; VIP, shipper, thời tiết, Giờ Vàng nặng; uy tín bắt đầu có nghĩa. LP3 + LP4 (~ca 80). | thuê mặt bằng hay nâng cấp · chuẩn bị gì trước Giờ Vàng nặng | mặt bằng 2–3, Lv3, bếp 3, LP3–4 | hết hạn hợp đồng (3 ngày) |
| 5 | **Lên phố** | ca ~90–120 (ngày 11–15) | LP4 mở **Phố Cổ (8 chỗ)** → bàn 6–8; Lv4 đầu (bàn VIP, tip ×1,25); LP5 (~ca 105). **Lớp rủi ro M6** bước vào: bảo kê gõ cửa từ LP4, mua chó ở làn An ninh, kiểm tra (flag). Mỗi ca có 3–4 bàn cùng gọi → sáng theo hạn phục vụ gần nhất. | trả bảo kê hay chống · bàn nào Lv4 trước | 8 bàn, Lv4, M6, LP5 | rủi ro theo ca |
| 6 | **Trùm** | ca ~120–150 (ngày 15–19) | Thiết bị Lv5, bếp Lv4, mọi bàn Lv4, nâng ghế; thu nhập ~1 tr/ngày chạm trần; LP6 (thiết bị max) rồi **LP7 = màn kết** "Chuyện quán bạn" (3 con số + huy hiệu Trùm) ở ca ~146–151. | tiêu xu dư vào gì (M6, cosmetic) | LP6–7, màn kết | — |
| 7 | **Sau kết — mùa** | ca 150+ (ngày 19+) | Quán giữ nguyên; bảng xếp hạng mùa 21 ngày; mùa 2 "Bảo kê" đầy đủ, mùa 3 "Mùa bóng"…; trần ngày theo bậc. | đua top hay chơi nhàn | mỗi mùa một lớp mới | mùa 21 ngày |

Bốn "vòng quay lại" chồng lên nhau theo chu kỳ tăng dần — **30 phút** (cooldown) → **ngày** (trần 8 ca, điểm danh) → **3 ngày** (hợp đồng mặt bằng) → **21 ngày** (mùa) — để lúc nào cũng có một lý do gần để mở app lại. Người chơi 6 ca/ngày đi cùng hành trình nhưng kết ở ~ngày 25; 4 ca/ngày ~ngày 38.

Chỗ dễ rơi (churn) và cách đỡ: (a) cuối ca 1 — nếu không thấy ngay "mua được gì" → chip Bàn 2 vừa đủ tiền; (b) ca 4 — cooldown 30 phút lần đầu → phải có ETA + gợi ý "mở lại sau 30 phút, khách vẫn đông"; (c) ca ~8–12 — 4 bàn 1 ghế, cặp bỏ đi nhiều, tích 10 k cho ghế đầu → chip "còn thiếu" + sổ ca đếm cặp; (d) ngày 8–14 — hàng đợi dài, bỏ đi 15–17 % → toast lý do + Mời về; (e) sau LP7 — không còn story → mùa + bảng xếp hạng phải mở ngay ở màn kết.

## 2c. Map hành trình → docs hiện có (truy vết; ✅ = đã có chủ · ⚠ = doc có nhưng còn luật cũ, đã ghi changelog 18/09 · ✗ = chưa có chủ, ghi nợ)

| # | Giai đoạn | Luật (GDD / SPEC / Fxx) | Số (08-SPEC § / JSON) | Mốc ROADMAP | Slice PLAN | Chỗ chưa có chủ |
|---|---|---|---|---|---|---|
| 0 | Bước vào quán | F27 ✅ (ca 1: 1 khách 1 bia, `firstShift`; luật #5 đè 18/09) · F25 ✅ (I.1 mặc định vi) · F01 GDD §10 ✅ · 03-SPEC §9 serve ✅ · F04 cốc/bom ✅ (rót tức thì II.1 ⚠) · GDD §17 + 05/09-SPEC ⚠ (5 luật P0 mới ghi changelog) | §13 ca; JSON `onboarding`, `keg` | M1, M2 | `fun-onboarding-visual`, `fun-locale-default-vi`, S2 | ✗ 09-SPEC chưa có màn sân quán ca 1 tối giản + 3 mũi tên (chỉ changelog) |
| 1 | Ca đầu — quán cóc | F03 = 03-SPEC ⚠ (header v1.4) · F06 tip/uy tín ✅ + D12 ⚠ · F07 khách ⚠ (cặp `pPair`, từ chối tại cửa) · GDD §5 ⚠ | §3 spawn/nhóm/hàng đợi; JSON `spawn`, `runtime.queue*`, `patience` | M1 | S1, S3, `fun-next-goal`, `fun-buy-buttons-reason` | ✗ sổ ca đếm "cặp không có chỗ" (F01/analytics-events) · ✗ chip mục tiêu kế tiếp (F10 UI / 09-SPEC) |
| 2 | Mở rộng sân | F10 ✅ (bàn 2–4) ⚠ thứ tự mở khoá · F08 Giờ Vàng ✅ + telegraph ✅, ⚠ "không rush < 2 bàn" · F07 vội/lai rai ✅ · F04 nhập bia (A2 wave-ab ✅) · 03-SPEC §9 + 08 §9 "tiễn ngồi lỳ" ⚠ (`kickTable` II.3) · GDD §10 cooldown ✅ + D8 ⚠ | §6 rush, §8 bàn, §9, §13; JSON `rush`, `upgrades.table`, `shift` | M1, M3 | S1, S3, `fb-kick-table`, S5 (D8) | ✗ `shift.noCooldownFirstShifts` chỉ ở 08 changelog |
| 3 | Cặp vào quán | F10 ⚠ (ghế 2 = đón cặp + mâm, `chairsAfterTables`) · F02/F11 ⚠ (mâm theo ghế: 1 ghế bia hoặc mồi tức thì; 2 ghế bia + mồi) · F04 ✅ · F13 ⚠ (LP1–2 nén, "4 seats") · F14 ✅ (Ngõ Chợ/Bến Xe gate LP1) | §8, §11 mở khoá, §15 LP; JSON `lifePath`, `unlocks` | M3, M5 | S1, S4, S5 | ✗ F10 chưa có 3 làn + progressive disclosure |
| 4 | Chủ quán | F14 ⚠ (`tableSlots`, `leaseDays` 3, thuê thẳng, gấp bàn) · F10 Lv3 ⚠ (lợi ích = mồi 2) · F11 bếp 2–3 ✅ · F05 độ hơi + hầm lạnh ✅ · F10 unlocks QR/tờ rơi ✅ · 08 §10 biển hiệu ✅ · F07 VIP/shipper ✅ · F09 thời tiết ✅ · F08 nặng ✅ · F13 LP3–4 ⚠ · F06 uy tín ✅ | §5, §7, §8, §10, §11, §16 mặt bằng | M3, M5 | S4, S5, `location-slots` | — |
| 5 | Lên phố | F14 ⚠ Phố Cổ 8 chỗ · F10 ⚠ bàn 5–8, Lv4 `tipMult` (cũng chạm F06 công thức tip) · F13 LP5 ⚠ · **F15 + F18 ⚠** (M6 hoãn 11/09 → vào story hồi 3, bảo kê từ LP4) · 08 §17 rủi ro ✅ | §8, §17; JSON `risk`, `dog` | M5, **M6** | `risk-m6-story`, S5 | ✗ gate "bảo kê từ LP4" chưa có trong F15 (chỉ `chancePerShift`) |
| 6 | Trùm | F10 thiết bị Lv5/bếp Lv4 ⚠ (×0,5) · F13 LP6–7 ⚠ + **màn kết** · F12 peak tiers ⚠ (= thang LP) · GDD §10 trần ngày ⚠ (D24) | §8, §13, §15 | M5 | S5, `story-ending` | ✗ màn kết "Chuyện quán bạn" chưa có spec màn hình (09-SPEC chỉ changelog) · ✗ F13 chưa có khái niệm "kết" |
| 7 | Sau kết — mùa | F12 ⚠ (ranking 7/14 ngày → 21, contest bỏ) · F28 leaderboard ✅ · F17 nhiệm vụ mùa ✅ · F19 World Cup (mùa 3, M8) ✅ · F21 xổ số ✅ · F20 donate ✅ | §15, §18; JSON `league.seasons` | M5, M7, M8 | `season-21d` | ✗ "mỗi mùa một lớp gameplay mới" chưa có doc điều phối (đề xuất: mục §5 doc này là chủ) |

Xuyên suốt: `docs/analytics-events.md` (sự kiện mới: `queue_overflow{noSeat}`, `table_upgraded{what}`, `story_ended`) ✗ · `docs/implementation-tracker.md` (F03/F10/F13/F14/F15 đổi trạng thái khi S1–S6 làm) · `10-SPEC` (rules 28, migration D2) ⚠ · `docs/config/economy.tbh.json` 2.1.0 (S5).

Kết luận map: mọi giai đoạn đều **có doc chủ** ở tầng luật (GDD + F-file), nhưng 10 F-file đang giữ luật cũ ở chỗ journey đổi (⚠ — đã ghi changelog 18/09 trỏ về đây) và có 8 chỗ ✗ chưa có chủ, đều là **UI/analytics/màn kết** — đúng phần P0 và Đợt 5 sẽ viết spec khi làm slice.

## 3. Số nén (base; hiển thị ×2,5) — bộ W2

| Hệ | Hiện tại | W2 (ứng viên) | Ghi chú |
|---|---|---|---|
| Đường Lên Trùm LP1…7 (`lifetimeBase`) | 50 k · 150 k · 500 k · 1,5 tr · 5 tr · 15 tr · 50 tr | **8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr** | ÷6…÷25; `requires` giữ (LP1 "4 seats" = 4 bàn 1 ghế; LP6 thiết bị Lv5; LP7 "10 seats" = 5 bàn × 2 ghế → cần mặt bằng ≥ 5 chỗ) |
| Giải Nhậu (`minSeasonEarnedBase`, 8 bậc) | 0 · 20 k · 60 k · 120 k · 180 k · 300 k · 500 k · 1 tr | **= thang LP** (0 · 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr) | mùa 21 ngày nên bậc mùa ≈ mốc LP trong mùa 1; `peak:` trong LP4–7 tự khớp |
| Mùa (`league.seasons`) | ranking 7 ngày, contest 14 ngày | **ranking 21 ngày**; contest bỏ hoặc = 21 | mùa 1 = story; mùa n = gameplay mới (§5) |
| Trần ngày (`dailyEarnCapBase`) | 200 k (500 k xu) | **400 k (1 tr xu)** | với 8 bàn Lv4 + mặt bằng ×1,5 thu nhập ~100 k/ca; 500 k chạm từ ngày 14 làm hồi 3 phẳng. Post-game có thể trần theo bậc |
| Hợp đồng mặt bằng (`leaseDays`) | 7 | **3** | 8 bước mặt bằng trong 21 ngày; người chơi được thuê thẳng mặt bằng cao hơn nếu đủ LP (bot W2 chưa, nên chỉ tới mặt bằng 6) |
| Chỗ đặt bàn (`tableSlots`) | – | Hẻm 4 · Ngõ Chợ 4 · Bến Xe 5 · Gần Công Sở 6 · Gần SVĐ 6 · Hồ Bia Đêm 7 · Phố Cổ 8 · Ga Metro 8 · Phố Tây 8 | bàn vượt chỗ ở mặt bằng nhỏ hơn (hết hạn về Hẻm) tạm gấp lại, không nhận khách |
| Bàn 5 · 6 · 7 · 8 (kèm ghế) | – | 6 k · 10 k · 16 k · 25 k | ghế 2 của bàn 5–8: 16 k · 20 k · 24 k · 28 k |
| Ghế 2 thứ 1…4 | (v3.3: 6 k · 8 k · 12 k · 16 k) | **4 k · 6 k · 9 k · 12 k** | rẻ hơn v3.3 để ghế đầu vào ngày 6 thay vì 12 |
| Nâng bàn → Lv2 / Lv3 / Lv4 (n = số bàn đã ở cấp đích) | (v3.3: 10 k+5 k·n / 30 k+15 k·n / 40 k+20 k·n) | **8 k+3 k·n / 20 k+8 k·n / 35 k+12 k·n** | 24 bước cho 8 bàn |
| Thiết bị 4 trạm Lv4–Lv5, bếp Lv3–Lv4 | keg 80 k/300 k · washer 60 k/200 k · cooler 45 k/150 k · stall 30 k/120 k · bếp 160 k/400 k | **×0,5** (keg 40 k/150 k … bếp 80 k/200 k) | đuôi 2,6 tr + 1,5 tr xu → 1,3 tr + 0,75 tr; Lv1–3 giữ |
| Cầu theo sức chứa | – | `refTables` 6, `maxMult` 4 | 7 → LP7 hụt (W3); 4 → bỏ đi 44 % |
| Cooldown thể lực (`regenRate`) | 0,4 (30 phút) | **giữ** (owner 18/09) | 8 ca/ngày = ~5,5 giờ đồng hồ; ai chơi ít ca hơn thì story dài hơn tương ứng. 3 ca đầu không cooldown (D8) |
| Trần ca/ngày (`dailyShiftCap`) | 8 / 6 / 5 | **giữ** | story = 168 ca; regular 6 ca/ngày ≈ 4 tuần, veteran 5 ≈ 5 tuần |
| Hàng đợi (`runtime.queueBaseSlots` / `queueSeatsPerSlot`) | 2 + ghế/3 | **1 + ghế/8** | ~99 % khách "bỏ đi" là người xếp hàng hết kiên nhẫn (đo W4); hàng đợi ngắn → cầu thừa bị từ chối tại cửa, không phạt, không trừ uy tín; bỏ đi có phạt 37 % → 22 % |
| Kiên nhẫn khách thường (`patience.thuongMs`) | 18 s | **24 s** | cùng với hàng đợi ngắn: bỏ đi ngày 8–14 **15–17 %**, ngày 15–21 **9–10 %**; thu nhập không giảm |

## 3b. Bao lâu thì có 8 bàn Lv4? (owner hỏi 18/09)

| | Bot W9 (seed 42 / 99) | 8 ca/ngày | 6 ca/ngày | Người thật (ước tính) |
|---|---|---|---|---|
| 4 bàn Lv4 | ca 120–123 | ngày 15 | ngày 20 | tương tự |
| 6 bàn Lv4 | ca 140–147 | ngày 17,5–18,5 | ngày 23–24,5 | ngày 15–17 / 20–23 |
| **8 bàn Lv4** (cần mặt bằng 8 chỗ: Phố Cổ từ LP4) | ca 156–163 | **ngày 19,5–20,5** | **ngày 26–27** | **ngày 16–19 / 22–25** (bot chỉ tới Phố Tây ở LP6 rồi mua cả 4 bàn + Lv4 trong 1 ca; người thật thuê Phố Cổ ngay LP4 ngày 10 và mua dần) |
| LP7 (màn kết) | ca 146–151 | ngày 18–19 | ngày 24–25 | |
| Thiết bị max | ca 146–151 | ngày 19 | ngày 25 | |

Mọi mốc là **số ca**; số ngày = ca ÷ ca/ngày. Người chơi 8 ca/ngày hết story ~3 tuần, 6 ca/ngày ~4 tuần, 4 ca/ngày ~6 tuần.

## 4. Nhịp mua (bằng chứng W2/W9, bot ưu tiên bàn/ghế trước thiết bị)

bàn 2 ca 3–4 · bàn 3 ca ~20 · bàn 4 ca 35–36 · ghế 2 đầu ca 43–44 · Lv2 đầu ca 45–46 · đủ 4 ghế ca 75–83 · Lv3 đầu ca 79–86 · Lv4 đầu ca 102–107 · bàn 6 ca 124–136 · thiết bị max ca 156–165 · LP7 ca ~160. Khoảng 60–70 lần mua trong 168 ca ≈ **1 lần mua mỗi 2,5 ca** — không có đoạn nào > 8 ca không mua được gì (chip "mục tiêu kế tiếp" luôn có việc).

## 5. Mùa 21 ngày (owner 18/09)

| | Luật |
|---|---|
| Độ dài | 21 ngày lịch VN, neo epoch như hiện tại; bảng xếp hạng theo `seasonEarned` (đã có F28), thưởng cuối mùa = nguyên liệu + cosmetic (không bơm xu) |
| Mùa 1 "Lên Trùm" | = story 3 hồi; LP7 = màn kết ("Chuyện quán bạn": 3 con số + huy hiệu Trùm) |
| Mùa 2 "Bảo kê" | M6 đầy đủ nếu chưa vào hồi 3: bảo kê, chó, kiểm tra + nhiệm vụ mùa |
| Mùa 3 "Mùa bóng" | M8: World Cup, nhóm cổ vũ, shop mùa |
| Mùa 4+ | xổ số (gate pháp lý), mặt bằng mới, món mới… mỗi mùa **một lớp mới + 1 bộ nhiệm vụ**; quán giữ nguyên, thang mua giữ nguyên |
| Người chơi tới muộn / nghỉ | mốc theo ca nên vẫn đi hết story ở bất kỳ mùa nào; bảng xếp hạng chỉ so trong mùa |

## 6. Việc mở ra (vào PLAN §7b Đợt 5)

| Việc | Đầu ra | Acceptance |
|---|---|---|
| S5 nhận bộ §3 (W9) | JSON 2.1.0 = v3.3 + §3 | career 28 ngày seed 42 + 99: LP7 ca 140–170; thiết bị max ≤ ca 170; ghế đầu ca 40–56; Lv4 đầu ≤ ca 120; 8 bàn Lv4 ≤ ca 170; không đoạn nào > 8 ca không mua được gì; k gate D4(a) ≤ 3,5; bỏ đi ca 1–24 ≤ 10 %, ngày 8–14 ≤ 20 %, ngày 15–21 ≤ 15 % |
| Bỏ đi thấp hơn (vào S3) | **đã chọn bằng sim**: hàng đợi 1 + ghế/8 + kiên nhẫn 24 s (W9); cầu thừa từ chối tại cửa không phạt, có toast + số trong sổ ca; "Mời về" (Đợt 3) là đòn bẩy của người chơi cho phần còn lại | bỏ đi có phạt ngày 8–14 ≤ 20 %, ngày 15–21 ≤ 15 %; thu nhập 30 ngày không giảm so với hàng đợi cũ |
| `story-ending` | màn kết LP7 + huy hiệu + "Chuyện quán bạn"; sau đó về sân quán, chip mục tiêu chuyển sang mùa | e2e: save đạt LP7 → màn kết đúng 1 lần; replay không đổi |
| `season-21d` | mùa 21 ngày, contest bỏ, leaderboard F28 theo mùa, thưởng cuối mùa | test snapshot mùa; rollover đúng tz |
| `risk-m6-story` | bật M6 trong hồi 3 (bảo kê từ LP4, chó ở làn An ninh, kiểm tra flag) — mở lại quyết định 11/09 | F15 acceptance; sim có bot trả bảo kê; k gate giữ |
| Mặt bằng | `tableSlots`, `leaseDays` 3, thuê thẳng mặt bằng cao hơn khi đủ LP, bàn gấp lại khi thiếu chỗ | test 3 tình huống; bot sim `locJump` |

## 7. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Bot ≠ người: người chơi thật ưu tiên khác, 8 ca/ngày ít ai giữ 21 ngày | mốc theo ca; phiếu playtest ghi "ca thứ mấy đạt LP_k"; Tier A chỉnh ở Admin |
| Trần 1 tr/ngày + LP nén làm leaderboard mùa dễ "max" | post-game: trần theo bậc Giải Nhậu, mùa n thêm sink |
| Bỏ đi 35–43 % tuần 2–3 | slice `fun-lost-legible` trước khi deploy v-fb2 |
| M6 mở lại = thêm scope trước v1.0 | đặt sau S5; nếu trễ, mùa 2 nhận M6 và hồi 3 chỉ có bảo kê nhẹ |

## Changelog
| Ngày | Thay đổi |
|---|---|
| 2026-09-18 | v1.1 — owner giữ cooldown/trần ca; §3b thời gian tới 8 bàn Lv4 theo 8 và 6 ca/ngày; bỏ đi: 99 % là hàng đợi → hàng đợi 1 + ghế/8 + kiên nhẫn 24 s (W9: 15–17 % / 9–10 %) |
| 2026-09-18 | v1 — lập từ quyết định owner (3 tuần / 8 ca / M6 / mùa 21 ngày) + sim W1–W3 (`~/keg-matrix/feedback-0917/runW.sh`, `wsum.py`) |
| 2026-09-18 | v1.2 — §2b hành trình người chơi 8 giai đoạn (ca, thứ học, quyết định, vòng quay lại, điểm churn); ưu tiên trải nghiệm P0 |
| 2026-09-18 | v1.3 — §2c map hành trình → docs (GDD/F-file/08-SPEC/ROADMAP/slice) + 8 chỗ chưa có chủ; changelog trỏ về đây ghi vào F06–F18 |
| 2026-10-21 | S5 (`eco21-balance-pass`, JSON 2.1.0) chốt số bằng sim; lệch khỏi §3 (bộ W2) ở: `tableSlots` **8 ở mọi mặt bằng** (bảng: Hẻm 4 · Ngõ Chợ 4 · Bến Xe 5 · … · 8; quyết định owner chờ chốt, BLOCKERS `04 · tableSlots`); bàn 2…8 = 600 · 3.700 · 5.700 · 9.600 · 12.900 · 15.900 · 16.000, ghế 2 = 400 … 2.800 base (bảng: 6 k … 25 k và 4 k … 28 k), nâng bàn Lv2/3/4 = 7 k+2,5 k·n / 34 k+13,5 k·n / 59,5 k+20,5 k·n (bảng: 8 k+3 k·n / 20 k+8 k·n / 35 k+12 k·n), thiết bị Lv2–3 giảm ~60 % (bảng: "Lv1–3 giữ") và Lv4–5 xấp xỉ ×0,5 như bảng; `leaseDays` 3, trần ngày 400 k, LP7 2 tr và `refTables` 6 / `maxMult` 4 giữ đúng bảng (riêng `maxMult` 4 làm hàng "kết ca 1 mua bàn 2" đỏ: BLOCKERS `04 · P0`); thêm: rent mặt bằng ×0,3 và `mult` 1,0 → 1,1, `tip.rate` 0,17. Chi tiết và bảng cổng: 08-SPEC changelog 2026-10-21, DECISIONS `## 04 ·`. |
| 2026-10-21 | Quyết định owner của S5 (founder, user xác nhận trong chat): bàn 2 = **1.070 xu** (428 base; bảng W2 và §0 ghi 1.500 xu) để kết ca 1 mua nổi bàn 2 ở ≥ 4 lượt trong 5; `tableSlots` 8 ở mọi mặt bằng được duyệt (lệch khỏi bảng §3: Hẻm 4 · Ngõ Chợ 4 · Bến Xe 5 …). Các số W2 khác của dòng trên giữ. Chi tiết: 08-SPEC changelog 2026-10-21 (vòng quyết định owner), DECISIONS `## 04 · owner decision 1`. |
| 2026-10-23 | Lệch khỏi §2b giai đoạn 1 "Ca đầu — quán cóc" ("cặp đứng cửa, bong bóng '2 ghế', quay đi"; sổ ca "10 cặp không có chỗ"). Founder 22–23/10/2026 (IMPROVE-EARLY-GAME Part B1, JSON 2.1.4, nhánh `feat/early-pacing`, chưa phát hành; QD-117 phương án B do founder sửa): **3 ca đầu của save chỉ khách lẻ** (`spawn.singlesFirstShifts` 3), nên ở ca 1–3 không còn cặp đứng cửa / bong bóng "2 ghế" / sổ ca đếm "cặp không có chỗ"; cặp trở lại cửa từ ca 4 (quán chưa có bàn 2 ghế lại từ chối). Hàng `door.shift1` của `sim:balance` (≥ 5 cặp bị từ chối ở ca 1, rút từ câu "~10 cặp nhìn quán rồi đi") được founder nới thành **0 cặp khi ca 1 chỉ khách lẻ** (commit f659664). B1 còn STOP lần 2 chờ founder (tổng 30 ngày và ghế 2 đầu tiên lệch quá dung sai; 08-SPEC changelog 2026-10-23 / JSON 2.1.4). |
| 2026-10-23 | Lệch khỏi §6 dòng "S5 nhận bộ §3 (W9)" ("ghế đầu ca 40–56"): founder 23/10/2026 chốt STOP lần 2 của B1 bằng phương án 1 ("Nới 2 dòng, giữ cả 3 bản sửa"; JSON 2.1.4, nhánh `feat/early-pacing`, chưa phát hành) — cửa sổ ghế 2 đầu tiên **ca 35–56** và trần tổng giá trị 30 ngày **+14 % = 9 519 000 xu** (commit `4b167f6`); không đổi số game. Seed 42 / 99: ghế 2 ở ca 35 / 35, tổng 9,451 / 9,387 tr. |
