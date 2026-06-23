# Phân tích UI/UX — Trùm Trà Đá Vỉa Hè

Tổng hợp từ quan sát trực tiếp (~20 màn chơi) + token style trích từ bundle. Dùng làm tham chiếu thiết kế UI/UX cho bản "Trùm Bia Hơi".

---

## 1. Định hướng nghệ thuật (art direction)

- **Pixel-art ấm áp, chất Việt Nam vỉa hè**: quán trà đá xe đẩy, ghế nhựa đỏ/xanh, ấm tích, thùng đá, chó giữ quán, hẻm phố cổ. Gợi hoài niệm, gần gũi.
- **Cảnh nền minh hoạ tay** (không pixel) cho các màn chuyển/nghỉ: hẻm phố, trẻ con chơi nhảy dây/đạp xe, bà bán hàng cười — tạo "không khí" giữa các ca.
- **Sprite khách có biến thể theo thời tiết**: trong 237 asset có `customer-N`, `customer-N-hot`, `customer-N-cold` → cùng một khách đổi trang phục/biểu cảm theo trời nóng/lạnh. Chi tiết nhỏ nhưng tăng "sống động".
- Khách đặc biệt có sprite riêng: VIP (vest/kính), Chí Phèo, Chủ tịch (`chairman-reveal`), côn đồ (gangster, có cả boss), shipper.

## 2. Bảng màu (trích bundle, 55 mã hex)

- **Theme/nền chủ đạo**: `#f3e3bc` (beige ấm), `#fff3cc`, `#e8d5b0` — tông giấy/nắng vỉa hè.
- **Accent vàng-kim (điểm nhấn chính)**: `#ffd700` (vàng xu/sao), `#ffae42`, `#ffd27a`, `#fff8e0` — dùng cho xu, uy tín, tiêu đề, viền nổi.
- **Panel/modal tối**: navy-tím `#1e1e3f`, `#16213e`, `#1a1a2e`, `#2a2a4a`, `#252540` — nền dialog tương phản cao, chữ sáng `#e0e0e0`/`#fff8e0`.
- **CTA**: đỏ `#e94560`/`#f44336` (nút chính: Mở cửa lại, Phát động, Nhận thưởng), xanh dương `#4682B4` (phụ: Đóng/Thu nhỏ), xanh lá `#4caf50`/`#6B8E6B` (xác nhận/OK).
- **Tông gỗ/đường phố**: `#8B7355`, `#8B4513`, `#8B6914`, `#708090`.
- **Bo góc**: 8/12/16px (mềm); modal kiểu bottom-sheet bo `14px 14px 0 0` (chỉ trên).

## 3. Bố cục màn chính (HUD) — mobile-first dọc

```
┌─ TOP BAR ────────────────────────────────┐
│ 💰Xu  ⚡Thể lực•Ca x/5  ⏱Cao điểm tới/NẶNG │
│ 🌤Thời tiết(+hệ số)   🏮Sự kiện Chợ Đêm   │
├───────────────────────────────────┬──────┤
│                                    │ RAIL │
│   KHU CHƠI (sân quán)              │ kho: │
│   - quầy + nhân vật + chó          │ 5 NL │
│   - thiết bị (ấm/thùng đá/rửa ly)  │ 🔔   │
│   - lưới GHẾ (3 cột) + làn ĐỢI     │ 🔇   │
│   - khách ngồi (bubble món, ring   │ 🎯x/5│
│     kiên nhẫn, nhãn VIP/NGỒI LỲ)   │ 🤖AI │
│                                    │ ⛩Đền │
├───────────────────────────────────┴──────┤
│ ⭐uy tín            🏆 (notif chấm đỏ)    │
│ [CA] [NHẬP HÀNG] [NÂNG CẤP] [XẾP HẠNG]    │
└───────────────────────────────────────────┘
```

- **Top bar** = trạng thái thời-gian-thực: xu, thể lực + số ca, đếm ngược cao điểm (đổi nhãn NHẸ/NẶNG), thời tiết kèm icon hệ số (↑↑↑ / ↓↓↓), banner sự kiện.
- **Rail phải** = kho 5 nguyên liệu (số tồn) + chuông thông báo, tắt tiếng, nhiệm vụ (x/5), trợ lý AI, Đền Thiêng.
- **Bottom bar** = 4 hành động lớn, icon + nhãn, touch target rộng: CA (mở/đổi ca), Nhập hàng, Nâng cấp, Xếp hạng.
- **Khu chơi** = sân top-down: quầy ở giữa trên, ghế xếp lưới 3 cột phía dưới, làn shipper/đợi riêng.

## 4. Vòng lặp tương tác cốt lõi (gameplay UX)

- **Phục vụ = chạm vào khách** đang chờ (mỗi khách hiện **bubble món** 🥤 + **vòng/thanh kiên nhẫn** rút dần). Phục vụ sớm (>60% kiên nhẫn) → tip; trễ → tip 0; hết → bỏ đi.
- Nhãn nổi trên khách: **VIP** (vòng hào quang vàng + mặt 🤩), **NGỒI LỲ** (stubborn), **VỘI** (rush, mặt cáu). Dễ nhận diện loại khách tức thì → quyết định ưu tiên ai.
- **Đồng hồ trên đầu khách** (vd 00:15) đếm ngược kiên nhẫn.
- Tài nguyên nhìn thấy trực quan: ghế (đỏ/xanh), ly (rack x/12), đá (thùng), ấm — số đếm hiển thị ngay trên vật thể (vd "11/12", "17/18").

## 5. Phản hồi & "juice" (game feel)

- **Số nổi tiền hàng + tip (hệ `floating-indicator-layer`)**: mỗi lần phục vụ phun pill nổi từ quầy, mỗi pill có **`kind` riêng** (class `floating-indicator--{kind}` + màu + pop animation + nhãn): **tiền hàng** (xanh lá "+38"), **tip** (xanh dương, có nhãn lý do — VIP: "👑 VIP boa đậm! +144"; còn QR / well-rested / hoàn cọc). **Mất VIP → "🚨 VIP phạt nặng!"**. → tách bạch sale vs tip bằng màu/nhãn/anim riêng giúp người chơi "thấy" giá trị phục vụ nhanh & VIP. **well-rested** còn là HUD pill riêng (`hud-pill--well-rested`, nhấp nháy `--expiring` khi sắp hết). Mốc thưởng trong ca hiện toast ("↑ Phục vụ +50", "↑ Thực thu +999").
- **Đổi tông nền khi cao điểm**: nền ngả đỏ/ấm khi rush active → tín hiệu thị giác "tăng tốc".
- **Narration thời tiết** kiểu phụ đề điện ảnh khi vào ca ("Không khí đặc quánh, gió thổi nhẹ nhưng không mát…").
- **Màn combat "Chiến trường"** riêng cho gangster (chó vs côn đồ, thanh máu, THẮNG/THUA + số xu).
- **Modal quà long lanh** (viền vàng, hộp ?, coin xoay) cho chủ tịch giả nghèo / kết mùa.
- Màn **kết ca/kết mùa** dạng "bảng vàng" với cúp 🏆, cảnh minh hoạ, số liệu lớn.

## 6. Hệ thống modal/panel (nhất quán)

- **Bottom-sheet** (trượt từ dưới, bo góc trên): Nhập hàng, Nâng cấp — danh sách dọc, mỗi dòng: icon + tên + thanh tiến độ + nút giá. Có tab (Trang bị / Kinh doanh).
- **Dialog giữa màn**: gangster, kết mùa, chủ tịch, kiểm tra giấy phép, kết ca — nền tối, tiêu đề + icon, CTA màu.
- Mẫu nút nhất quán: **đỏ = hành động chính/không-thể-hoàn-tác** (Mở cửa, Phát động, Nhận), **xanh dương = phụ** (Đóng/Thu nhỏ), **xanh lá = OK/xác nhận**.
- Luôn có **✕ đóng** góc phải; tip "ℹ️ Lịch sử/tin nhắn sẽ xoá khi đóng".

## 7. Thiết kế thông tin (information design)

- **Sổ sách kết ca** (mở rộng "[+] Xem chi tiết"): thời lượng, khách đến, phục vụ %, bỏ đi %, khách boa %, nhiệm vụ, uy tín ± , tổng thu/phạt/thực thu, mốc thưởng. Rất rõ ràng, đậm số.
- **Thông tin nhanh** 2 tab **Xu / Uy tín**: Xu (số dư / thu mùa / thu liên mùa); Uy tín (cách tăng/giảm + công dụng) — minh bạch cơ chế ngay trong UI.
- **Dự báo thời tiết ca tới** với icon hệ số + bullet "ảnh hưởng" — giúp lên chiến thuật trước.
- **Nhiệm vụ** 3 tab (Hôm nay x/5 / Điểm danh / Thử thách), mỗi nhiệm vụ: thanh tiến độ + thưởng (xu + ⭐) + trạng thái (Nhận/Đã nhận).
- **✅ Cách hiển thị tiến độ nhiệm vụ (ảnh live) — tách bạch "hoàn thành" vs "đã nhận":**
  - **Icon 🎯 ở rail phải = "x/5" đếm số nhiệm vụ ĐÃ NHẬN** (claimed), KHÔNG phải số đã hoàn thành. Ví dụ: 4 nhiệm vụ xong (3 chưa bấm Nhận + 1 đã nhận) nhưng đầu modal vẫn ghi **"✓1/5"** vì mới claim 1.
  - **Badge đỏ tròn số (vd "3") đè lên icon 🎯 = số phần thưởng SẴN SÀNG nhận** (completed-unclaimed) → tín hiệu "có việc cần làm", kéo người chơi mở modal & bấm Nhận. (Đỏ ở đây là badge nhẹ, đúng nguyên tắc "đỏ = actionable" mà không tranh với cảnh báo mất khách.)
  - **Tri-state mỗi dòng:** (a) **Chưa đạt** — thanh xám, "❌ Chưa đạt", tiến độ `0/3`; (b) **Nhận** — thanh **đầy gradient xanh→vàng**, nút cam "Nhận" (completed, chờ claim); (c) **Đã nhận** — "✅ Đã nhận" chữ xanh, hết tương tác.
  - **Bonus 5/5 ("Tờ rơi + 🧩")** nằm trên cùng, nút "Nhận thưởng" **disable (xám)** tới khi đủ 5/5 claimed → mỏ neo mục tiêu cuối.
  - → Bài học: **claim thủ công** (không auto) buộc người chơi quay lại app & nhìn thấy các CTA khác; badge đỏ + gradient bar là "carrot" thị giác mạnh.

## 8. Onboarding & retention UX

- **Trợ lý AI "Trà Đấm"** (chatbot): tone đời thường, **gợi ý chip câu hỏi** sẵn, tư vấn theo **state realtime** của người chơi → biến tooltip tĩnh thành tư vấn động. Giới hạn ~20 câu/ngày.
- **Tooltip "💡 Bạn có biết…"** xoay vòng ở màn nghỉ/kết ca (dạy mẹo + flavor văn hoá).
- **Chế độ Tĩnh tâm/Zen** lúc nghỉ: màn mờ, nhạc lofi + radio "loa phường", nút 🧘 tắt lời — giữ chân nhẹ nhàng khi chờ hồi thể lực.
- **✅ Chi tiết hệ nghỉ/âm thanh (bundle):** nút **"Thu nhỏ" → Zen Mode** `tip_screensaver_zen` = **tự ẩn toàn bộ UI** + screensaver cảnh pixel theo thời tiết + **lofi chill**. Toggle **🎵/🧘** (`tip_resting_radio_mode`): **🎵 "With vocals" = bài hát chủ đề theo THỜI TIẾT ca SẮP TỚI** (đón trước thời tiết → tạo anticipation) vs **🧘 "Zen" = chỉ ambient (`-ambient.ogg` loop)**; **lựa chọn được ghi nhớ**. Widget "💡 Bạn có biết..." (`tips_widget`) xoay vòng, có category **📖 Culture gắn theo thời tiết** (mưa → bún ốc/bún riêu, tiếng mưa mái tôn, Phố cổ sau mưa; lạnh → "rét ngọt") + tip cơ chế. → **Bài học: downtime 30' không bỏ phí — lofi + micro-content văn hoá + nhạc đón thời tiết khiến người chơi để app mở & háo hức ca sau.**
- **Anti-idle/fairness pause**: tự dừng + overlay "Game tự tạm dừng vì bạn không theo dõi" → công bằng xếp hạng.
- **✅ Hệ `pauseMode` theo overlay (bundle, server-authoritative `sessionPauseMode`):** mỗi overlay gắn `pause` hoặc `no_pause` → quyết định đồng hồ ca có đóng băng khi mở không. **PAUSE (đa số = "inspect/đọc không bị phạt giờ"):** click khách (`customers`), popover thiết bị/quầy/chó, `equipment`/`dog`, `leaderboard`/`owner_profile`/`social_preview`/`shrine`, nhắn tin, `settings`/`support`/`report_bug`, `weather_popup`/`rush_summary`/`stats_quick_view`, `stamina_resting`/`screensaver`, `offline_theft_report`, **`gangster_outcome`/`gangster_battle`**, **`CAPTCHA`**, các `*_cap_reached`. **NO_PAUSE (giờ vẫn chạy):** `buy_chair`/`buy_cup`/`buy_dog`/`repair_chair` (mua-sửa nhanh trong dòng chảy) + **`gangster_demanding`** (cố tình ép quyết nhanh; nhưng outcome/battle thì pause) + **✅ quiz Tổ kiểm tra (quan sát live: 15s trả lời mà quán VẪN bán — dual-attention stress)** + **✅ minigame Đội Trật Tự (match-3 dẹp hàng — quán vẫn bán trong lúc chơi)**. → "Họ" 3 sự kiện no-pause (côn đồ / kiểm tra / trật tự) = dual-attention có chủ đích, không bao giờ chồng nhau (luật scheduling); mọi overlay xem/đọc còn lại đều pause.
- **✅ Map đầy đủ (đọc trọn):** thêm `CAPTCHA_INSPECTION: no_pause` (chốt từ code — quiz kiểm tra không pause); `urban_patrol: pause` = modal INTRO pause nhưng **minigame chạy thì game tiếp tục** (minigame không thuộc hệ overlay); `flyer_campaign`/`flyer_summary`/`rental_screen`/`donate_tea`/`chairman_secret_box`/`pardon`/`chair_upgrade`/`sign_*`: pause. **Modal "Nhập hàng" (restock) KHÔNG có trong map → KHÔNG BAO GIỜ pause** — cùng họ "hành động vận hành in-flow" với buy_chair/cup/dog: thời gian nhập hàng = thời gian không phục vụ (đặc biệt đắt trong 90s tờ rơi → "nhập đủ TRƯỚC khi phát động"). → **Nguyên tắc chuẩn hoá: XEM/ĐỌC = pause · VẬN HÀNH/MUA NHANH = không pause · SỰ KIỆN ÁP LỰC = không pause.**
- **⚠️ Điểm yếu của gốc (kiểm chứng live 3 lần): hình phạt "tịch thu ghế" hiệu lực MỘT NỬA** — cờ `confiscated:true`: (a) khách **VẪN ngồi** ghế bị thu (xếp chỗ không lọc cờ), (b) **CÓ co hàng đợi 5→4 slot** (cờ nuôi công thức `queue=2+⌊ghế_hợp_lệ/3⌋` → sức chứa 14→13 — phần phạt duy nhất có thật), (c) sprite ghế **vẫn vẽ y nguyên**. → Phạt hô to "🚔 Tịch thu!" nhưng thực tế chỉ mất 1 slot đợi, không thấy không cảm — **bug nửa vời của event mới ship**. **Bài học bia hơi (kép): (1) hình phạt phải nối ĐỦ MỌI HỆ (đếm + xếp chỗ + render), (2) và phải NHÌN THẤY được (niêm phong đỏ/mờ/cất khỏi sân + đếm ngược trả).** → **Bài học: mặc định "inspect = pause" rộng rãi (UX nhân văn, xem/đọc/giải CAPTCHA không tốn giây ca); chỉ giữ giờ chạy ở mua-nhanh + quyết-định-áp-lực (bảo kê).**
- **Đền Thiêng** + huy chương: showcase top 10 → động lực social.

## 9. Mobile-first & accessibility

- Viewport khoá (`maximum-scale=1, user-scalable=no, viewport-fit=cover`) → trải nghiệm app-like, không zoom lệch.
- Bố cục **dọc**, touch target lớn (nút bottom bar, dòng danh sách cao), số liệu cỡ lớn dễ đọc.
- Icon + nhãn song hành (không chỉ icon) → dễ hiểu cho người chơi phổ thông.
- Hỗ trợ desktop nhưng tối ưu điện thoại; có toggle âm thanh (🔇) + nhạc nền.

## 10. Microcopy & giọng điệu (điểm rất mạnh)

Văn phong **đời thường, hài, đậm chất vỉa hè** — tạo bản sắc:
- Nút/nhãn: "**Em xin 🙏**" (nhận quà), "**Đành vậy**" (cống nạp), "**Bào khách**", "**Hảo chủ quán, tặng ngươi…**", "**Trà Đấm**" (tên AI — chơi chữ "trà đá"), "Chí Phèo → Chủ tịch giả nghèo".
- Mô tả mặt bằng/sự kiện kiểu kể chuyện ("Khách đêm thoải mái, boa hậu"; "Tây ba lô thích trải nghiệm").
- → Giọng điệu là tài sản thương hiệu; bản bia hơi nên giữ chất tương đương (slang quán nhậu).

## 11. Bài học UI/UX cho "Trùm Bia Hơi"

1. **Giữ HUD 3 vùng** (top trạng thái / center sân chơi / bottom hành động) + rail tài nguyên — đã được kiểm chứng cho mobile dọc.
2. **Hiện trạng thái tài nguyên ngay trên vật thể** (vại bia, cốc, mồi) như game gốc hiện ly/đá.
3. **Phân loại khách bằng nhãn + hào quang** (khách nhậu VIP, khách vội, khách lỳ) để quyết định nhanh.
4. **Phản hồi tức thì**: số nổi, toast mốc, đổi nền lúc cao điểm, narration thời tiết/sự kiện (đá bóng, cuối tuần).
5. **Modal nhất quán** (bottom-sheet cho shop/nâng cấp; dialog cho sự kiện) + quy ước màu nút.
6. **Minh bạch cơ chế trong UI** (tab Xu/Uy tín giải thích cách tăng giảm) — giảm phụ thuộc wiki.
7. **Trợ lý AI tư vấn theo state thật** + tooltip xoay vòng + chế độ chờ "chill" (lofi) → onboarding & retention.
8. **Microcopy có cá tính** (slang quán bia) là yếu tố lan truyền.

## 12. UX architecture: game chia thành 4 trạng thái lớn

UI của Trumviahe mạnh vì nó không cố nhét mọi thứ vào một màn ngang hàng. Toàn bộ trải nghiệm thực chất xoay quanh 4 trạng thái, mỗi trạng thái có bộ ưu tiên thông tin riêng:

| Trạng thái | Cảm xúc chính | UI cần ưu tiên | Hành động chính |
|---|---|---|---|
| **Chuẩn bị mở ca** | Lên kế hoạch, tránh thiếu hàng | kho, thời tiết ca tới, stamina, gợi ý nâng cấp | nhập hàng, nâng cấp, mở ca |
| **Đang chạy ca** | Căng, phản xạ nhanh | khách nào sắp bỏ đi, bottleneck nào đang nghẽn, tiền/tip/toast | chạm phục vụ, nhập khẩn, xử lý sự kiện |
| **Đóng ca / nghỉ** | Tổng kết, hiểu mình sai ở đâu | ledger, lost rate, tip rate, uy tín, đề xuất cải thiện | xem số, nhận thưởng, chuẩn bị ca sau |
| **Meta/progression** | Đặt mục tiêu dài hạn | nâng cấp, league, life path, mặt bằng, social | mua nâng cấp, thuê địa điểm, chọn chiến lược |

Điểm đáng học: cùng là "xu" và "uy tín", nhưng ý nghĩa của chúng đổi theo trạng thái. Trong ca, xu là feedback tức thì; sau ca, xu là nguồn ra quyết định; ở meta, xu là thước đo tiến trình. Vì vậy bản Bia Hơi không nên thiết kế HUD tĩnh một kiểu cho mọi lúc. Nên có state-aware HUD: khi trong ca thì thu gọn meta; khi nghỉ thì bung phân tích và khuyến nghị.

## 13. Attention hierarchy trong màn chơi

Thứ tự thị giác nên là:

1. **Khách sắp mất**: vòng kiên nhẫn / countdown / màu cảnh báo phải nổi hơn tiền, kho, sự kiện.
2. **Loại khách có rủi ro cao**: VIP, vội, ngồi lỳ, Chí Phèo cần nhãn/hào quang rõ để người chơi ưu tiên.
3. **Bottleneck vận hành**: hết ly sạch, hết đá, ấm chưa pha, rửa ly full slot. Đây là thứ quyết định người chơi có phục vụ kịp không.
4. **Cơ hội có thời hạn**: shipper, flyer, cao điểm, gangster, kiểm tra.
5. **Tiến trình/meta**: nhiệm vụ, bảng xếp hạng, hòm thư, Đền Thiêng.

Nếu đảo thứ tự này, game sẽ thành dashboard rối. Ví dụ leaderboard hoặc nhiệm vụ không được tranh màu đỏ với khách sắp bỏ đi. Màu đỏ/cam nhấp nháy nên dành cho quyết định trong vài giây.

Cho Bia Hơi:
- Khách/bàn sắp bực phải nổi nhất.
- Bàn VIP hoặc bàn đông người phải có footprint lớn hơn khách lẻ.
- "Cốc sạch = 0", "bia keg gần hết", "đồ nhậu cháy hàng" phải là cảnh báo trên vật thể, không chỉ trong kho.
- Sự kiện bóng đá/cao điểm nên chiếm một dải top nhỏ, không che bàn.

## 14. Screen-by-screen deep dive

### 14.1. Màn chuẩn bị mở ca

Vai trò UX: giảm thất bại ngu do thiếu chuẩn bị. Trumviahe làm tốt nhờ dự báo thời tiết và kho hiện rõ. Tuy nhiên bản Bia Hơi nên đi xa hơn bằng checklist theo ngữ cảnh:

| Điều kiện | Gợi ý UI |
|---|---|
| Trời nóng / có bóng đá | nhắc tăng bia lạnh, đá, cốc sạch, mồi nhanh |
| Mưa / lạnh | nhắc giảm bia nhanh, tăng món nhậu nóng/đồ ăn |
| Sắp mở flyer/marketing | cảnh báo nếu bàn/cốc/keg chưa đủ throughput |
| Thuê mặt bằng cao | hiện "cần doanh thu ca ~X để hoà tiền thuê" |

CTA chính nên là **Mở ca**. Nhập hàng/nâng cấp là phụ nhưng dễ vào. Không nên bắt người chơi đi qua 3 modal để biết mình đang thiếu gì.

### 14.2. Màn đang chạy ca

Đây là màn phản xạ, nên thông tin phải ít chữ. Trumviahe dùng icon, bubble món, timer và số nổi đúng hướng. Với Bia Hơi, đơn hàng thường phức tạp hơn vì bàn có thể gọi combo và gọi thêm, nên cần gom thông tin theo **bàn** thay vì từng khách:

- Bubble bàn: `Bia x3`, `Lạc x1`, `Nem x1`; chỉ hiển thị 2-3 item chính, phần còn lại gom `+2`.
- Màu viền bàn: xanh = ổn, vàng = chờ lâu, đỏ = sắp bỏ/khó chịu.
- Nhãn bàn: `VIP`, `Vội`, `Say`, `Ngồi lâu`, `Đặt trước`.
- Ưu tiên tap: tap bàn mở action nhanh nhất, long press hoặc icon nhỏ mới mở chi tiết.

Không nên để người chơi phải đọc dialog trong cao điểm. Event quan trọng có thể bật modal, nhưng modal phải có quyết định 1 chạm: trả phí / chống / bỏ qua; đúng kiểu gangster đang làm.

### 14.3. Nhập hàng

UX nhập hàng của Trumviahe hợp với mobile vì dùng bottom-sheet và danh sách dọc. Điểm cần mở rộng cho Bia Hơi:

- Cho mua theo preset: `Đủ 1 ca`, `Ca nóng`, `Ca bóng đá`, `Tiết kiệm`.
- Hiện thiếu hụt dự kiến: "Ca tới có thể thiếu 18 cốc sạch / 2 keg".
- Tách rõ tài nguyên **tiêu hao** và **quay vòng**: bia, đá, mồi là tiêu hao; cốc là quay vòng; bàn là capacity.
- Cảnh báo hàng có spoil/giảm chất lượng nếu có cơ chế bia mất hơi hoặc đồ nhậu ôi.

### 14.4. Nâng cấp

Trumviahe thành công vì mỗi nâng cấp giải một bottleneck thấy được: đá, pha trà, rửa ly, ghế, quầy. UI nâng cấp nên luôn trả lời 3 câu:

1. Nâng cấp này giảm nghẽn gì?
2. Ca trước nghẽn đó xảy ra bao nhiêu lần?
3. Mua xong hiệu ứng định lượng là gì?

Ví dụ copy tốt cho Bia Hơi:
- `Vòi bia Lv2`: rót nhanh hơn 18%, giảm bàn chờ bia.
- `Kệ cốc sạch`: +4 cốc quay vòng, hợp khi mất tip do thiếu cốc.
- `Bếp mồi`: làm lạc/nem nhanh hơn, hợp khi combo tăng.

Tránh nút "+income" chung chung. Người chơi nên thấy nâng cấp là giải pháp cho nỗi đau vừa gặp.

### 14.5. Kết ca / sổ sách

Sổ sách là UI giáo dục người chơi. Nó không chỉ là report; nó là tutorial sau hành động. Các chỉ số quan trọng nhất:

| Chỉ số | Người chơi hiểu được gì |
|---|---|
| phục vụ % | throughput có đủ không |
| bỏ đi % | đang quá tải hoặc thiếu hàng |
| khách boa % | có phục vụ đủ sớm không |
| phạt | rủi ro nào đang ăn lợi nhuận |
| uy tín +/- | chất lượng phục vụ ca này |
| stockout / hết cốc / bàn full | bottleneck cụ thể |

Cho Bia Hơi nên thêm:
- `Vòng quay bàn`: bàn ngồi lâu có làm nghẽn không.
- `Cốc bẩn tồn`: rửa cốc có là bottleneck không.
- `Bia mất hơi / đá tan`: thất thoát chất lượng.
- `Khách say gây hại`: chi phí rủi ro.
- `Combo attach rate`: bao nhiêu bàn gọi mồi kèm bia.

## 15. Onboarding không nên là tutorial tuyến tính

Trumviahe dùng nhiều lớp học ngầm: tooltip, assistant, ledger, mission, cảnh báo runtime. Đây là hướng đúng cho casual game vì người chơi vào để chơi, không phải học manual.

Khuyến nghị onboarding cho Bia Hơi:

| Thời điểm | Dạy gì | Cách dạy |
|---|---|---|
| 0-30s đầu | tap bàn để phục vụ, cốc sạch là bottleneck | highlight 1 bàn + 1 cốc |
| Ca 1 kết thúc | đọc sổ sách, hiểu mất khách/tip | chỉ highlight 2 chỉ số xấu nhất |
| Lần đầu thiếu hàng | nhập hàng nhanh | mở bottom-sheet đúng item thiếu |
| Lần đầu có khách say | rủi ro và bảo vệ/giấy phép | event ngắn, 2 lựa chọn |
| Lần đầu đủ tiền nâng cấp | nâng cấp giải nghẽn | đề xuất 1 nâng cấp, không show 10 thứ |

AI assistant nên là lớp thứ hai, không thay thế UI cơ bản. Nếu UI phải nhờ AI giải thích mới chơi được thì UI đang thiếu affordance.

## 16. Retention UX: lý do quay lại phải thấy ngay

Trumviahe có nhịp rất rõ: ca ngắn, nghỉ, 3 ca/ngày, well-rested, mùa giải, hòm thư, Đền Thiêng. UX retention tốt vì phần thưởng không chỉ là tiền:

- Nghỉ vẫn có Zen/radio: game không chết khi đóng ca.
- Kết mùa thưởng nguyên liệu + prestige: không phá economy nhưng vẫn có giá trị.
- Bảng vàng/Đền Thiêng: tạo mục tiêu xã hội.
- Daily mission nhỏ: giúp người chơi biết hôm nay nên làm gì.

Cho Bia Hơi:
- Mùa giải có thể là `Quán nhậu hot nhất phường`, `Mùa bóng đá`, `Lễ hội bia hơi`.
- Hòm thư thưởng nên ưu tiên vốn nhập hàng, décor, huy hiệu, skin biển hiệu; tránh bơm xu quá nhiều.
- Chế độ nghỉ có thể là "đêm xuống quán dọn bàn", radio phường, tiếng ly cốc, lịch trận sắp tới.
- Welcome-back nên preview cơ hội: "Tối nay có trận lớn, khách đông hơn 20%".

## 17. UX rủi ro cần tránh khi chuyển sang Bia Hơi

1. **Bàn nhậu phức tạp hơn khách trà đá**: nếu mỗi khách trong bàn có bubble riêng, màn sẽ vỡ. Nên gom theo bàn.
2. **Chủ đề bia dễ lệch sang cổ vũ uống rượu bia**: UI nên mô phỏng quản lý quán, không cổ vũ uống quá mức. Dùng copy trung tính, có cảnh báo độ tuổi nếu public.
3. **Quá nhiều event tiêu cực**: khách say, công an, bảo kê, vỡ cốc nếu dồn liên tục sẽ thành game phạt. Cần xen cơ hội vui: trận bóng, khách quen, reviewer, đặt tiệc.
4. **Meta đè gameplay**: bảng xếp hạng, hòm thư, trang trí không được che loop phục vụ.
5. **Nút nhỏ trên mobile**: bàn/cốc/khách phải có hit area rộng hơn sprite. Đặc biệt lúc cao điểm, sai tap gây frustration.
6. **Màu cảnh báo lạm dụng**: đỏ chỉ dành cho nguy cơ mất tiền/khách ngay. Mission và quà dùng badge nhẹ.
7. **Số liệu sau ca quá nhiều**: show summary trước, chi tiết mở rộng sau. Mỗi ca chỉ nên đề xuất 1-2 việc cần cải thiện.

## 18. UI spec đề xuất cho MVP Trùm Bia Hơi

### HUD chính

```
┌──────────────────────────────────────────┐
│ Xu | Uy tín | Thể lực | Thời tiết | Cao điểm │
├────────────────────────────────────┬─────┤
│                                    │ Kho │
│  Quầy bia + keg + rửa cốc          │ bia │
│  Bàn nhựa 2-3 cột                  │ đá  │
│  Mỗi bàn: order bubble + patience  │ mồi │
│  Làn shipper / khách đợi           │ cốc │
│                                    │ AI  │
├────────────────────────────────────┴─────┤
│ [Ca] [Nhập hàng] [Nâng cấp] [Mùa giải]   │
└──────────────────────────────────────────┘
```

### Bottom-sheet Nhập hàng

- Header: `Kho cho ca tới` + weather/rush hint.
- Preset row: `Đủ 1 ca`, `Trời nóng`, `Bóng đá`, `Tiết kiệm`.
- Items: bia keg, đá, lạc, nem, cốc dự phòng/thuê rửa.
- Footer: tổng tiền + CTA `Nhập hàng`.

### Bottom-sheet Nâng cấp

- Tabs: `Vận hành`, `Kinh doanh`, `An toàn`, `Trang trí`.
- Mỗi dòng có: icon, level, bottleneck giải quyết, hiệu ứng định lượng, giá.
- Badge `Gợi ý` chỉ xuất hiện trên 1-2 item dựa theo ca vừa rồi.

### Kết ca

Summary 5 số lớn:
- Thực thu.
- Phục vụ thành công.
- Khách bỏ đi.
- Tip rate.
- Uy tín.

Insight cards:
- `Nghẽn chính`: cốc sạch / bàn / rót bia / mồi.
- `Cơ hội`: VIP bị bỏ lỡ, combo bán tốt, thời tiết hợp bia.
- `Gợi ý ca sau`: nhập thêm gì hoặc nâng cấp gì.

## 19. Heuristic review checklist

Dùng checklist này khi review mockup hoặc build:

- Người chơi có biết **tap vào đâu trong 3 giây đầu** không?
- Khách/bàn sắp mất có nổi nhất màn không?
- Có phân biệt được tài nguyên tiêu hao và tài nguyên quay vòng không?
- Nút chính mỗi trạng thái có duy nhất một CTA rõ không?
- Mọi event có thời hạn có timer và hậu quả rõ không?
- Màn kết ca có nói được "vì sao mình lời/lỗ" không?
- Nâng cấp có nối trực tiếp với bottleneck vừa gặp không?
- Trên mobile, có nút/hit area nào dưới 44px hoặc quá sát nhau không?
- Màu đỏ/cam có bị dùng cho notification không khẩn cấp không?
- Microcopy có chất địa phương nhưng vẫn dễ hiểu với người mới không?
- Game có cho người chơi nghỉ mà vẫn giữ cảm xúc muốn quay lại không?
- UI có tránh cổ vũ hành vi uống quá mức khi đổi sang chủ đề bia không?

## 20. Chrome live-check notes

Kiểm tra thêm bằng Chrome local ngày 2026-06-03:

- Chrome headless mở được landing, nhưng khi click vào gameplay thì Pixi báo `Unable to auto-detect a suitable renderer`. Với game canvas/WebGL, không nên dựa vào headless-only QA; cần Chrome GUI hoặc cấu hình WebGL/SwiftShader riêng.
- Chrome GUI render được canvas gameplay thật ở viewport mobile 390x844. Canvas full-screen, HUD là DOM overlay phía trên.
- Landing có hero illustration full-screen, lớp phủ tối, CTA vàng lớn ở giữa. Điểm thú vị: HUD/game state đã render mờ phía sau landing, làm người chơi thấy trước đây là game thật chứ không phải landing marketing rời rạc.
- First-run gameplay có tutorial bubble `SERVE TEA - First customer! Tap to serve.` trỏ trực tiếp vào khách đầu tiên. Đây là onboarding theo ngữ cảnh, không phải tutorial nhiều bước.
- HUD đầu game:
  - top-left: coin lớn `300`;
  - top-center: stamina/time `11:57 • 0/8`;
  - right rail: profile/setting, kho 5 nguyên liệu, notification, sound, mission, assistant;
  - bottom: 4 nút lớn `Shift`, `Restock`, `Upgrade`, `Rank`;
  - lower-right: reputation pill + nút trang trí/bàn có badge đỏ.
- Restock bottom-sheet chiếm khoảng nửa dưới màn, nền gameplay bị dim. Mỗi dòng có icon, tên, tồn kho `x/y`, progress bar, nút `+10`, nút `Full`, giá hiển thị bằng chip vàng. Đây là pattern tốt cho Bia Hơi nếu đổi thành bia/đá/mồi/cốc.
- Upgrade bottom-sheet dùng card grid 3 cột, tab `Equipment / Business`, mỗi card có sprite, tên, badge level/count, nút giá đỏ-vàng. Pattern này scan nhanh hơn list khi số upgrade ít; khi số upgrade tăng, nên có filter/gợi ý để tránh quá tải.
- Text tiếng Anh đang dùng trên landing và panel (`Restock`, `Upgrade`, `Equipment`, `Business`) dù game có theme Việt. Nếu bản Bia Hơi nhắm người Việt, nên chốt locale nhất quán hoặc dùng toggle rõ ràng.

## 21. Deep-dive: UX luồng "chạm phục vụ → trễ → khách bỏ đi"

Đây là vi-tương-tác **quan trọng và lặp nhiều nhất** trong game, đáng mổ kỹ. Trích từ state machine khách (`customer.state`) + dialog `customer-popover` trong bundle.

**State machine của một khách:**
`waiting` (đang chờ, có order, patience rút) → [phục vụ kịp] `enjoying` (đã phục vụ, đang uống, giữ ghế) → rời đi vui vẻ. Nếu KHÔNG kịp: `waiting` → **`grace_leaving`** (cửa sổ ân hạn cuối) → biến mất (mất khách + phạt).

**Cơ chế "ân hạn" (grace) — thiết kế thất bại 2 tầng, rất hay:**
- Hàm phục vụ chấp nhận cả `waiting` LẪN `grace_leaving`. Tức khi patience đã về 0 và khách **bắt đầu đứng dậy bỏ đi**, bạn **vẫn còn vài giây chạm cứu được**.
- Nhưng nếu cứu trong grace: code đặt `patience = floor(maxPatience × 0,1)` → ~10% → **dưới ngưỡng 60% (`ev`) → tip = 0**. Tức **fail mềm**: vẫn bán được (thu tiền gốc) nhưng **mất sạch tip**.
- Hết grace → khách đi hẳn → **fail cứng**: mất đơn + phạt (10% gross × loại × rush) + tụt uy tín.
→ Hai tầng phạt dạy người chơi "khẩn trương" mà không quá tàn nhẫn với 1 cú chạm trễ.

**Dialog khi chạm khách (`customer-popover`):**
- Khách bình thường: popover hiện **món** (`customer-popover-order`: 1 món, hoặc "2 món" nếu có `secondaryOrder`) + mô tả loại khách → để quyết nhanh có đáng cứu không (VIP sắp đi = nên lao vào cứu; khách vội tip-0 còn lại = có thể bỏ).
- **Cấu trúc popover đầy đủ (quan sát live, theo từng loại):**
  - **Badge loại có màu**: Chí phèo (nâu), Ngồi lỳ (xanh dương), VIP (vàng), thường (không badge).
  - **Subtitle mô tả loại** (dạy người chơi): "Không trả tiền" (Chí phèo) / "Ngồi lâu tốn ghế" (ngồi lỳ) / "Boa nhiều nhưng nhanh dỗi" (VIP) / "vui vẻ dễ tính, nguồn thu ổn định" (thường).
  - **Đơn**: icon 🥤 + tên (TRÀ ĐÁ). **Khách 2 món** (ghế tựa): header "**2 MÓN**" + **checklist ✓Trà đá ✓Hạt** thay cho 1 dòng.
  - **Countdown patience (giây)** góc phải — phản ánh hệ số loại: Chí phèo ~101s (×5), Ngồi lỳ ~205s (×10), **VIP ~11s (×0,611, ngắn → khẩn)**, thường ~18s.
  - Nút đỏ to **✅ Phục vụ**.
  → Bộ 3 **badge + subtitle + countdown** cho phép quyết định ưu tiên tức thì mà không cần đọc nhiều: VIP 11s = lao vào ngay; ngồi lỳ 205s = thư thả; Chí phèo = cân nhắc bỏ/đợi lộ Chủ tịch.
- Khách đang bỏ đi: popover đổi sang trạng thái cảnh báo — nhãn đỏ **"Vội · Khách thiếu kiên nhẫn"**, dòng đỏ **"😤 Khách bỏ đi"** (class `customerLeft`), + nút xanh **"Đóng"**. Đây là **xác nhận thất bại tường minh** ("bạn lỡ người này rồi").

**Tín hiệu thị giác báo "sắp mất" (attention escalation):**
1. Vòng/thanh kiên nhẫn rút dần + đổi màu (xanh → vàng → đỏ).
2. Mặt khách đổi cảm xúc (vội → 😤 cáu).
3. Đồng hồ countdown trên đầu (vd 00:15 → 00:05).
4. Khi grace: khách **đứng dậy / animation rời đi** + popover đỏ.
5. Khi mất: số phạt **−xu nổi lên** + uy tín giảm.

**Điểm UX đáng học cho Bia Hơi:**
- Giữ **grace window** (cứu muộn được nhưng tip 0) → tha thứ cho mis-tap, vẫn thưởng người nhanh.
- **Hit area > sprite**, nhất là lúc cao điểm (sai tap khi khách chen nhau = ức chế lớn nhất).
- Popover thất bại nên **1 chạm để bỏ qua** ("Đóng"), không bắt đọc nhiều.
- Với bàn nhậu: cảnh báo nên ở **mức bàn** (viền bàn đỏ + 1 timer/bàn) thay vì mỗi khách 1 vòng → tránh vỡ màn.
- Phân biệt rõ **fail mềm (tip 0)** vs **fail cứng (mất + phạt)** bằng màu/animation để người chơi học được "phục vụ sớm = tiền tip", không chỉ "phục vụ = xong".

## 22. Full screen inventory: vai trò UX của từng màn

| Màn / panel | Pattern UI | Vai trò UX | Điểm mạnh | Rủi ro / cải thiện |
|---|---|---|---|---|
| **Landing** | hero full-screen + CTA | tạo fantasy, vào game nhanh | background vỉa hè có nhân vật thật, CTA vàng rõ, HUD mờ phía sau | text English hơi lệch theme Việt nếu target chính là VN |
| **Game canvas** | canvas full-screen + DOM HUD | loop phục vụ chính | thứ tự HUD rõ, tutorial trỏ thẳng vào khách | hit area canvas cần đủ rộng; khách nhỏ dễ miss tap nếu cao điểm |
| **Restock** | bottom-sheet list | bổ sung tài nguyên | tồn kho, progress, giá `+10`/`Full` rất rõ | chưa có preset chiến thuật theo thời tiết/ca |
| **Upgrade - Equipment** | bottom-sheet card grid | giải bottleneck vận hành | sprite lớn, badge level/count, giá scan nhanh | thiếu "vì sao nên mua cái này ngay" |
| **Upgrade - Business** | card/list hybrid | mở tính năng kinh doanh | Phone/QR/sign/dog/location gom đúng nhóm | điều kiện lock nên giải thích bằng ngôn ngữ người chơi |
| **Rank** | drawer/meta panel | cạnh tranh mùa | top 3 rõ, projected rank, CTA claim | nhiều chữ với guest; cần summary nổi hơn |
| **Missions** | tab modal | retention hằng ngày | attendance ladder dễ hiểu, reward tăng dần | Today/Attendance cần tránh nhầm `0/4` với claim attendance |
| **Assistant** | lock dialog/chat | onboarding động | lock message ngắn, chỉ rõ cần Phone | người mới lại bị lock help; nên có tips cơ bản free |
| **Settings** | bottom-sheet form | account, âm thanh, pin | guest CTA rất rõ lợi ích, có battery saver | mixed locale; sheet dài cần scroll affordance rõ |
| **Shift** | bottom-sheet ledger | đo hiệu suất ca hiện tại | số liệu tối giản, đúng trong ca | early state toàn 0 hơi khô; nên hint hành động tiếp |
| **Quick Stats** | center dialog tabs | giải thích tiền tệ | tab Coins/Reputation minh bạch cơ chế | text explanatory hơi nhỏ trên mobile |
| **Shrine** | prestige modal | social proof, legacy | top 3 podium + wall of legacy có cảm xúc | close affordance khác chuẩn (`LEAVE SHRINE`), dễ tạo overlay stack |

Game đang phân lớp surface khá tốt:
- **HUD cố định** cho thông tin sống còn.
- **Bottom-sheet** cho thao tác vận hành lặp lại.
- **Modal/drawer** cho meta, account, social, prestige.
- **Event dialog** cho rủi ro/hậu quả có thời hạn.

Đây là pattern nên giữ cho Trùm Bia Hơi, nhưng đơn vị chính phải đổi từ **khách lẻ** sang **bàn nhậu**.

## 23. Information architecture tổng thể

Game có 5 tầng thông tin:

1. **Tầng sống còn trong ca**: stamina, coin, khách, patience, order, kho.
2. **Tầng thao tác vận hành**: Restock, Upgrade, Shift.
3. **Tầng meta-retention**: Missions, Rank, Shrine, Settings/account.
4. **Tầng trợ giúp**: Assistant, Guide, FAQ, tooltip, tutorial bubble.
5. **Tầng sự kiện/rủi ro**: gangster, inspection, end shift, season end, gift.

Điểm tốt: khi mở nhiều bottom-sheet, nền quán vẫn còn thấy phía sau. Người chơi không bị tách khỏi ngữ cảnh "quán đang chạy". Với Bia Hơi, nguyên tắc này càng quan trọng vì Restock/Upgrade có thể được mở giữa ca khi bàn vẫn đang chờ.

## 24. Visual design system

### 24.1. Shape language

Trumviahe dùng shape mềm và dày:
- coin/stamina/reputation là pill lớn;
- right rail là các capsule tròn;
- bottom-sheet bo góc trên;
- card item bo góc vừa;
- nút giá có chip vàng nổi bên trong.

Hiệu ứng UX: casual, dễ chạm, ít căng thẳng dù game có phạt. Bia Hơi nên giữ chất mềm này, thêm texture nhựa/gỗ/kim loại nhẹ thay vì chuyển sang dashboard sắc cạnh.

### 24.2. Color roles

| Role | Màu/visual hiện tại | Ý nghĩa UX |
|---|---|---|
| Nền game | xanh-xám/kem nhạt | sân chơi bình tĩnh, không tranh với sprite |
| Panel | xanh đậm | tập trung, tương phản chữ trắng |
| Vàng | CTA play, coin, reward, shrine | tiền, cơ hội, thành tựu |
| Đỏ/cam | buy, badge, cảnh báo | quyết định mạnh, attention |
| Xanh lá | confirm/secondary safe | an toàn, phụ trợ |
| Vàng kim | rank/shrine/top | prestige |

Rủi ro: đỏ đang vừa là giá/mua, vừa notification. Nếu Bia Hơi thêm khách say/kiểm tra/phạt, đỏ nên dành cho nguy cơ mất tiền/khách ngay; giá mua nên nghiêng cam/đồng.

### 24.3. Typography

Font display rounded/pixel-ish giúp game có bản sắc. Pattern đáng học:
- số tiền/stamina lớn, ít chữ;
- heading modal ngắn: `Restock`, `Upgrade`, `MISSIONS`;
- reward/price dùng chip để số nổi khỏi panel;
- leaderboard row dùng hierarchy rất rõ: tên, title, điểm.

Cho Bia Hơi nên dùng heading Việt ngắn: `Nhập`, `Nâng`, `Ca`, `Mùa`, `Danh tiếng`, `Bảng vàng`.

### 24.4. Icon & sprite

Sprite gameplay không chỉ trang trí mà là affordance: quầy, ấm, đá, rửa ly, ghế, khách. Người chơi nhìn vật là hiểu bottleneck.

Bia Hơi cần sprite-station tương đương:
- keg/vòi bia = rót;
- chậu rửa cốc = tái dùng;
- tủ lạnh/thùng đá = giữ lạnh;
- bếp/mâm mồi = prep đồ nhậu;
- bàn nhựa = capacity;
- bảo vệ/giấy phép = risk defense.

## 25. Component patterns nên chuẩn hóa

### HUD pills

Coin và stamina tách riêng là đúng. Không nên gom thành top bar dài vì game cần đọc nhanh. Bia Hơi nên có:
- `Xu`;
- `Thể lực / ca`;
- `Danh tiếng`;
- event pill nhỏ cho `Bóng đá`, `Trời nóng`, `Kiểm tra`.

### Right rail

Right rail đang gánh profile/settings, kho, notification, sound, mission, assistant, shrine. Pattern này hợp portrait mobile, nhưng dễ quá tải khi thêm feature.

Quy tắc cho Bia Hơi:
- phần trên: tài nguyên sống còn;
- phần giữa: cảnh báo/audio/mission;
- phần dưới: assistant/social/prestige;
- không thêm icon cho mọi feature mới, hãy gom vào panel.

### Bottom nav

4 nút bottom là giới hạn tốt. Đề xuất Bia Hơi:
- `Ca`;
- `Nhập`;
- `Nâng`;
- `Mùa`.

Các mục như decor, staff, map, social nên là tab con, không lên bottom nav.

### Bottom-sheet

Nên chuẩn hóa tất cả sheet:
- drag handle ở giữa;
- X cùng vị trí;
- title trái;
- balance/context phải;
- close consistent;
- background dim nhưng còn thấy quán.

Shrine hiện close bằng `LEAVE SHRINE`, khác pattern. Nếu giữ thì nên làm thành CTA rõ ở cuối **và** vẫn có X.

### List vs grid

- **List** cho tài nguyên có tồn kho/progress/giá.
- **Grid** cho upgrade/unlock ít item, có icon lớn.
- **Leaderboard row** cho rank.
- **Insight card** cho ledger/kết ca.

## 26. Gameplay readability

Màn đầu đọc rất nhanh vì:
- khách có bubble món;
- vòng patience nổi quanh khách;
- tutorial bubble trỏ trực tiếp vào target;
- quầy/station ở vùng trên;
- ghế trống ở vùng dưới;
- kho right rail luôn thấy;
- bottom nav tách khỏi canvas.

Với Bia Hơi, cần chuyển readability từ khách sang bàn:

| Vấn đề | Giải pháp UI |
|---|---|
| Bàn nhiều món | bubble gom `Bia x3`, `Lạc x1`, `+2` |
| Bàn sắp bực | ring quanh cả bàn, không quanh từng khách |
| Bàn VIP | viền vàng + icon nhỏ |
| Bàn say/rủi ro | icon cảnh báo cam/đỏ riêng |
| Thiếu cốc/bia | cảnh báo nổi trên station, không chỉ trong kho |
| Khách đợi ngoài | lane chờ riêng, không trộn với bàn đang phục vụ |

## 27. Interaction design

### Tap priority

Trong ca, tap priority nên là:
1. bàn/khách đang chờ;
2. event có timer;
3. station có bottleneck/action nhanh;
4. HUD.

Nếu hit area giao nhau, gameplay target nên thắng. Với Bia Hơi, hit area phải theo bàn, không theo sprite từng khách.

### Fast decisions

Game đang làm tốt các quyết định một chạm: buy, full restock, claim, close, end shift. Bia Hơi nên giữ:
- mua không đủ tiền: disabled/giá mờ;
- lock: điều kiện rõ;
- mất cọc/rủi ro: confirm;
- event timer: nói rõ auto outcome.

### Progressive disclosure

Trumviahe không show hết mọi thứ ngay. Business tab dần mở Phone/QR/Sign/Dog/Location. Bia Hơi nên mở theo nhịp:
- ca 1: bia, cốc, bàn;
- ca 2-3: mồi;
- sau đó: QR/marketing;
- gặp khách say: bảo vệ/giấy phép;
- đủ reputation: màn hình bóng đá/biển hiệu/decor.

## 28. Onboarding & learning design

Các lớp học ngầm của Trumviahe:
1. Landing promise.
2. First customer bubble.
3. Station/kho nhìn thấy ngay.
4. Ledger dạy qua kết quả.
5. Quick Stats giải thích tiền tệ.
6. Missions định hướng hôm nay.
7. Assistant tư vấn khi unlock.

Điểm cần cải thiện: Assistant bị lock sau Phone trong khi người mới cần help nhất. Bia Hơi nên có:
- tips cơ bản miễn phí;
- AI nâng cao sau Phone;
- gợi ý sau ca dựa trên bottleneck: "thiếu cốc sạch", "bàn ngồi lâu", "mồi cháy hàng".

## 29. Meta UX & social design

Rank và Shrine là hai lớp khác nhau:
- **Rank** = cạnh tranh mùa hiện tại.
- **Shrine** = ký ức mùa trước, prestige, bảo tàng thành tích.

Đây là thiết kế tốt vì vừa có mục tiêu ngắn hạn, vừa có danh dự dài hạn. Bia Hơi có thể đổi thành:
- Rank: `Quán bia hot nhất phường`, `Mùa bóng đá S005`.
- Shrine: `Bảng vàng quán nhậu`, `Ba ông trùm mùa trước`.
- Social preview: xem quán người khác với biển hiệu, bàn ghế, decor, không chỉ số điểm.

## 30. Account, trust & guest UX

Settings panel cho guest rất tốt:
- không ép đăng ký trước khi chơi;
- nói rõ rủi ro mất progress;
- nêu lợi ích cụ thể: cloud save, multi-device, leaderboard, friend peek;
- có incentive: free guard dog + 250 reputation.

Bia Hơi nên giữ guest-first. Đăng ký nên xuất hiện sau khi người chơi đã có tài sản hoặc sắp lên rank. Reward đăng ký nên là vật phẩm hữu ích nhưng không phá balance: bảo vệ cấp 1, ít cốc, vốn mồi, danh tiếng nhỏ.

## 31. Localization & microcopy

Live UI đang trộn English/Vietnamese:
- Landing English;
- `Restock`, `Upgrade`, `Rank`;
- `Có gì mới`, `Hướng dẫn`, `FAQ`;
- resource names English.

Nếu target là người Việt, locale phải nhất quán vì đây là game văn hóa địa phương. Đề xuất mapping cho Bia Hơi:

| Current role | Copy đề xuất |
|---|---|
| Restock | Nhập hàng |
| Upgrade | Nâng cấp |
| Rank | Mùa giải |
| Shift | Ca |
| Reputation | Danh tiếng |
| Assistant | Anh Chủ / Tư vấn quán |
| Register QR | Đăng ký QR |
| Install Shop Sign | Lắp biển quán |
| Location | Mặt bằng |
| Shrine | Bảng vàng |

Microcopy nên có chất quán bia nhưng nút phải rõ nghĩa. Không nên dùng slang cho action quan trọng nếu làm người mới đoán sai.

## 32. Accessibility & mobile ergonomics

Điểm tốt:
- bottom buttons lớn;
- icon + label đi cùng;
- panel tối/chữ trắng tương phản tốt;
- có sound toggle;
- có battery saver;
- có quiet hours;
- viewport app-like.

Điểm cần cẩn thận:
- khóa zoom có thể bất lợi cho người mắt kém;
- text giải thích trong Quick Stats/Settings hơi nhỏ;
- icon resource ở rail không có label;
- một số trạng thái phụ thuộc màu;
- canvas cần QA riêng cho touch/hit area.

Bia Hơi nên đảm bảo:
- hit target tối thiểu 44px;
- text quan trọng nằm trong DOM/HUD, không chỉ canvas;
- không phụ thuộc chỉ vào màu đỏ/vàng;
- có giảm chuyển động/hiệu ứng;
- font số đọc được trên 360px.

## 33. Motion, feedback & game feel

Pattern hiện tại:
- landing CTA glow vàng;
- background dim khi mở sheet;
- tutorial bubble có mũi trỏ;
- badge đỏ báo attention;
- progress bars cho tài nguyên;
- price chips tạo cảm giác "bấm được";
- event rủi ro có modal riêng.

Bia Hơi nên thêm feedback:
- serve bàn: `+xu`, `+tip`, `+danh tiếng` nổi từ bàn;
- thiếu cốc: station rửa pulse nhẹ;
- keg gần hết: keg rung/đổi màu;
- cao điểm bóng đá: banner top + âm crowd nhẹ;
- khách say: cảnh báo ngắn, không kéo dài;
- mua upgrade: station đổi sprite ngay.

## 34. Design risks nếu mở rộng quá nhanh

1. **Feature rail quá tải**: mọi feature đều muốn icon.
2. **Panel stacking**: Shrine close khác chuẩn; nên có overlay manager rõ.
3. **Mixed locale**: làm giảm bản sắc.
4. **Upgrade thiếu recommendation**: người mới không biết nghẽn gì cần mua.
5. **Rank guest nhiều chữ**: cần summary CTA mạnh hơn.
6. **Canvas QA khó**: headless mặc định không render Pixi.
7. **Mobile vertical space**: bàn nhậu/combo sẽ chiếm chỗ hơn khách trà đá.
8. **Rủi ro bia hơi dễ thành game phạt**: khách say, kiểm tra, vỡ cốc phải có cơ hội vui cân bằng.

## 35. Full UIUX principles cho Trùm Bia Hơi

1. **Bàn là đơn vị UX**, không phải từng khách.
2. **Station phải nói được bottleneck**: vòi bia, cốc, bếp mồi, bàn, bảo vệ.
3. **Mỗi ca dạy một bài**: kết ca chỉ nêu 1-2 insight quan trọng.
4. **Meta không che core loop**.
5. **Rủi ro phải có cách phòng thủ**.
6. **Reward không chỉ là xu**: decor, danh tiếng, huy chương, vốn nhập hàng, skin biển.
7. **Copy phải là tiếng quán**, nhưng nút phải rõ nghĩa.
8. **Dữ liệu phải biến thành khuyến nghị**.
9. **Không cổ vũ uống quá mức**: fantasy là quản lý quán có trách nhiệm.
10. **QA bằng trải nghiệm thật**: canvas, touch, frame rate, panel stacking, mobile safe area.

## 36. Proposed design spec outline cho bản Bia Hơi

1. **Design pillars**
   - vỉa hè Việt Nam;
   - quản lý quán nhậu vui nhưng có trách nhiệm;
   - phản xạ nhẹ + strategy bottleneck;
   - social prestige theo mùa.

2. **Screen map**
   - Landing;
   - Gameplay;
   - Restock;
   - Upgrade;
   - Shift ledger;
   - Missions;
   - Rank;
   - Shrine/Bảng vàng;
   - Settings/account;
   - Assistant;
   - Event modals.

3. **Component library**
   - HUD pill;
   - resource rail;
   - bottom nav;
   - bottom-sheet;
   - upgrade card;
   - restock row;
   - leaderboard row;
   - reward chip;
   - tutorial bubble;
   - event modal;
   - ledger insight card.

4. **Gameplay UI states**
   - idle/pre-shift;
   - active shift;
   - high traffic;
   - stockout;
   - table angry;
   - VIP;
   - drunk/risk;
   - shipper/order;
   - closing/resting.

5. **Validation checklist**
   - first 30 seconds playable without reading guide;
   - all key buttons visible on 390x844 and 360x740;
   - no text overflow in Vietnamese;
   - hit area passes touch smoke;
   - canvas renders in GUI and configured headless;
   - ledger insight matches actual bottleneck.

## 37. Asset inventory & taxonomy

Contact sheet asset đã lưu tại [trumviahe-assets-contact.png](/Users/maingocanh/Projects/Trum%20Bia%20Hoi/trumviahe-assets-contact.png).

Asset public chia thành các nhóm rõ:

| Nhóm | Asset / biến thể | Vai trò design |
|---|---|---|
| **Customer sprites** | `customer-1..10`, `customer-vip`, `customer-rush`, `customer-stubborn`, `customer-chi-pheo` + `hot/cold` | tạo đời sống, phân loại hành vi bằng ngoại hình |
| **Owner / NPC** | `stall-owner`, `chairman-reveal`, `shipper-waiting`, `thief` | nhân vật hệ thống, event, delivery |
| **Risk actors** | `gangster-1..3`, `gangster-boss`, `dog-idle`, `dog-attack` | hệ rủi ro/defense, combat modal |
| **Core resources** | `tea`, `water`, `ice`, `peanut-candy`, `sunflower-seeds`, `tea-glass`, `glass-clean`, `glass-dirty` | item economy, kho, order bubble |
| **Stations/equipment** | `stall-1..5`, `tea-brewer-1..5`, `ice-box-1..5`, `washer-1..5`, `glass-rack` | visual upgrade, bottleneck nhìn thấy |
| **Capacity furniture** | `chair`, `chair-empty`, `chair-broken`, `chair-upgraded`, `chair-armchair` | ghế, trạng thái hỏng/nâng cấp |
| **Business unlocks** | `phone`, `qr-payment`, `flyer-bundle`, `sign-*` | feature unlock, strategy modifiers |
| **Decor/social** | `lantern-*`, `plant-*`, sign styles, `StreetView` assets | customization, social preview |
| **Rewards** | `coin`, `gift-box`, `secret-box-closed`, badge config | reward moments, missions/season |
| **Navigation** | `nav-customers`, `nav-shop`, `order-bubble` | UI affordance, HUD/nav icons |

Kích thước asset cho thấy hệ thống có grid khá nhất quán:
- resource/item nhỏ: **128x128**;
- equipment/station: **192x192**;
- customer: **192x256**;
- owner: **256x320**;
- shipper: **384x480**;
- gangster: **576x768**;
- stall lớn: **960x720**;
- sign: **480x192**;
- gift/secret/thief: **384x384**.

Điểm đáng học: kích thước không tùy tiện. Mỗi nhóm có canvas size riêng theo vai trò trên màn. Bia Hơi nên định nghĩa size budget tương tự ngay từ đầu để asset AI/gen không lệch scale.

## 38. Visual language của sprite/icon

Trumviahe dùng phong cách "semi-pixel cartoon":

- viền đậm, silhouette rõ;
- ánh sáng mềm, màu bão hòa vừa;
- đồ vật hơi phóng đại, giống đạo cụ sân khấu;
- nhân vật front/three-quarter view, dễ đọc ở kích thước nhỏ;
- item icon tách nền, không cần card vẫn nhận diện được;
- trạng thái nâng cấp thể hiện bằng sprite khác, không chỉ badge UI.

Luật quan trọng: **sprite vừa đẹp vừa phải là thông tin gameplay**. Ví dụ:
- thùng đá level cao nhìn xịn hơn;
- washer level cao nhìn công nghiệp hơn;
- ghế hỏng có sprite riêng;
- khách VIP/Chí Phèo/rush/stubborn nhìn khác nhau ngay cả khi không đọc label;
- hot/cold variants đổi trang phục, làm thời tiết có mặt trong thế giới chứ không chỉ là multiplier.

Cho Bia Hơi:
- khách văn phòng, khách xem bóng đá, khách say, khách VIP, shipper phải có silhouette khác nhau;
- bàn thường/bàn VIP/bàn say phải đọc được qua prop trên bàn;
- keg/vòi/tủ lạnh/rửa cốc phải đổi hình khi nâng cấp;
- đồ nhậu nên có icon 128x128, đặt được trong bubble;
- trạng thái "bia mất hơi", "cốc bẩn", "bàn bừa" cần asset/overlay riêng.

## 39. Item design: item không chỉ là icon

Trong Trumviahe, item có 4 vai trò UI cùng lúc:

1. **Inventory icon** trên rail/right panel.
2. **Order icon** trong bubble khách.
3. **Shop row/card icon** trong Restock/Upgrade.
4. **World object** nếu là station/equipment.

Vì vậy mỗi item phải có nhận diện tốt ở nhiều kích cỡ. Trà/đá/nước/kẹo/hạt đều dùng shape khác nhau:
- trà = túi/lá, xanh;
- nước = giọt xanh;
- đá = cube sáng;
- kẹo = thanh vàng/nâu;
- hạt = hạt đen/trắng.

Nguyên tắc cho Bia Hơi:

| Item | Shape cần khác biệt | Màu chủ đạo | Vai trò |
|---|---|---|---|
| Bia hơi | cốc/vại vàng có bọt | vàng/amber | món chính, order bubble |
| Keg/thùng bia | trụ kim loại/bình | bạc/xám | stock/station |
| Cốc sạch | cốc trắng/xanh sáng | xanh nhạt | tài nguyên quay vòng |
| Cốc bẩn | cốc nâu/đục | nâu | bottleneck rửa |
| Đá/lạnh | cube/tủ lạnh | xanh băng | chất lượng bia |
| Lạc rang | bát/đĩa hạt | vàng/nâu | mồi nhanh |
| Nem chua | bó/đĩa nem | đỏ/hồng | mồi giá trị |
| Bánh đa | miếng tròn/vỡ | vàng đất | snack |
| Giấy phép | giấy có dấu đỏ | trắng/đỏ | risk defense |
| Bảo vệ | nhân vật/áo xanh | xanh đậm | chống rủi ro |

Mỗi item cần test ở 24px, 40px, 72px và trong bubble chồng lên nền canvas.

## 40. Component taxonomy từ CSS/classes

CSS public cho thấy component system khá lớn. Các họ class chính:

| Component family | Class examples | Ý nghĩa |
|---|---|---|
| **Layout/game shell** | `game-fullscreen`, `canvas-host`, `canvas-frame`, `hud-overlay` | root shell, canvas layer, HUD layer |
| **HUD** | `hud-pill`, `hud-side-rail`, `hud-supply-item`, `hud-utility-btn` | status, resource rail, nav buttons |
| **Weather/rush** | `weather-indicator`, `weather-popup`, `rush-banner`, `rush-active` | event/state overlay |
| **Drawer/sheet** | `drawer`, `drawer-backdrop`, `drawer-header`, `drawer-tab-btn`, `drawer-item` | generic bottom-sheet/list framework |
| **Missions** | `missions-drawer`, `missions-item`, `missions-reward-chip`, `missions-tab` | daily/attendance/challenge |
| **Stats** | `stats-quick-view-dialog`, `hud-pill--coins`, `hud-pill--reputation` | currency explanation |
| **Rental/location** | `rental-overlay`, `rental-card`, `rental-hero`, `expiry-banner` | location/rent UX |
| **Shrine** | `shrine-drawer`, `shrine-smoke`, `shrine-season-tab` | prestige/legacy |
| **Social street** | `sv-overlay`, `sv-card`, `sv-stall-img`, `sv-sign-w` | street view/social preview |
| **Assistant/support** | `ai-markdown-content`, `support-overlay`, `ticket-filter-chip` | help, chat, feedback |
| **Events** | `inspection-toast`, `chairman-reveal-overlay`, `secret-box-burst` | transient feedback/event reward |
| **Auth/settings** | `login-overlay`, `login-streak-card`, `pause-panel` | account, login, rest |

Điểm mạnh: component family theo domain, không chỉ theo visual. `rental-*`, `missions-*`, `shrine-*`, `sv-*` cho thấy mỗi meta system có visual grammar riêng nhưng vẫn dùng nền xanh/bo góc chung.

Bia Hơi nên thiết kế component family tương tự:
- `table-*` cho bàn;
- `station-*` cho keg/rửa/bếp;
- `stock-*` cho nhập hàng;
- `risk-*` cho khách say/kiểm tra/bảo kê;
- `season-*` và `shrine-*` cho meta;
- `social-*` cho phố/quán người khác.

## 41. Token system từ CSS

Token root đáng chú ý:

| Token | Value | Role |
|---|---|---|
| `--ink` | `#0e2d21` | text/dark green identity |
| `--ink-soft` | `#275646` | secondary dark |
| `--paper` | `#f4efe3` | warm paper |
| `--panel` | `#fff8eb` | light panel |
| `--line` | `#b7a886` | border line |
| `--accent` | `#ab2f1d` | red action |
| `--accent-2` | `#2e7f43` | green action |
| `--arena` | `#d8e3d8` | gameplay ground |
| `--arena-deep` | `#c7d7c7` | depth/grid |
| `--hud-bg` | `rgba(14,45,33,.7)` | HUD glass dark |
| `--drawer-bg` | `rgba(30,50,40,.92)` | modal/sheet |
| `--hud-element-height` | `40px` | pill/button height |
| `--game-panel-bg` | green-black gradient | primary sheet background |
| `--game-shadow-panel` | multi-shadow | sheet/card depth |
| `--game-btn-depth` | `3px` | tactile button depth |

Điểm đáng học: token không quá nhiều nhưng đủ vai trò. Bia Hơi nên tạo token từ đầu:
- `--beer-amber`;
- `--foam`;
- `--table-red`;
- `--plastic-blue`;
- `--risk-red`;
- `--success-green`;
- `--panel-green`;
- `--street-paper`;
- `--hud-height`.

Không nên đổi toàn bộ sang vàng/nâu bia vì sẽ thành palette một nốt. Giữ nền xanh/đêm/phố, dùng amber làm accent.

## 42. Icon/button grammar

UI có 4 kiểu icon/button:

1. **Pill status button**: coin, stamina, reputation. Cao 40px, nền xanh trong suốt, số lớn.
2. **Round rail button**: settings, bell, sound, mission, assistant, shrine. Icon centered, có badge.
3. **Bottom nav button**: icon lớn + label, rectangular rounded, touch target lớn.
4. **Economic CTA**: nút đỏ/xanh với chip giá vàng bên trong.

Đây là grammar rõ: người chơi biết nút nào là status, nút nào là nav, nút nào là mua.

Cho Bia Hơi:
- đừng dùng cùng style cho `Mua`, `Mở panel`, `Cảnh báo`;
- price chip luôn nằm trong nút mua;
- badge đỏ chỉ cho attention/action cần xử lý;
- icon rail nên có tooltip/label trong first-run;
- bottom nav luôn icon + text, không icon-only.

## 43. Upgrade item design

Equipment cards hiện gồm:
- sprite lớn;
- tên;
- badge count/level;
- price button đỏ;
- coin chip vàng;
- lock/condition khi chưa đủ.

Business items gồm Phone, QR, Shop Sign, Dog, Location. Đây là các unlock không cùng loại nhưng cùng tab vì đều mở chiến lược mới.

Thiếu hiện tại: card chưa nói "tác động vận hành" ngay trên mặt card. Người chơi phải biết từ kinh nghiệm. Bia Hơi nên thêm một dòng ngắn:

| Upgrade | Copy tác động |
|---|---|
| Vòi bia | rót nhanh hơn |
| Kệ cốc | thêm cốc sạch |
| Chậu rửa | rửa nhanh hơn |
| Bếp mồi | làm mồi nhanh hơn |
| Bàn ghế | thêm bàn phục vụ |
| Tủ lạnh | bia giữ lạnh lâu hơn |
| QR | tip/thu tiền nhanh |
| Biển quán | đổi tệp khách |
| Bảo vệ | giảm khách phá |
| Giấy phép | giảm phạt kiểm tra |

## 44. Customer visual taxonomy

Customer system có 10 khách thường + 5 loại đặc biệt, mỗi loại có hot/cold variant. Đây là chi phí asset lớn nhưng tạo depth rất tốt:

- khách thường: đa dạng giới tính/tuổi/trang phục;
- VIP: vest/kính, posture tự tin;
- rush: biểu cảm căng/vội;
- stubborn: ngồi lì, dáng ung dung;
- Chí Phèo: rách/rối, rủi ro;
- shipper: đồng phục giao hàng;
- chairman reveal: transformation/reward;
- gangster: size lớn, nguy hiểm.

Cho Bia Hơi, nên có taxonomy:

| Loại | Visual cue |
|---|---|
| Khách thường | áo phông/sơ mi, ngồi bàn đơn |
| Dân văn phòng | sơ mi/cặp, đi nhóm giờ tan làm |
| Fan bóng đá | áo đội bóng/khăn, đến theo event |
| VIP/reviewer | vest/camera/điện thoại, viền vàng |
| Khách vội | đứng/nửa ngồi, đồng hồ/icon |
| Bàn ngồi lâu | nhiều đồ trên bàn, posture thư giãn |
| Khách say/rủi ro | mặt đỏ, icon cảnh báo, animation lắc |
| Shipper | đồng phục, lane riêng |
| Kiểm tra/phường | đồng phục/clipboard, modal riêng |
| Bảo kê | silhouette lớn, threat cue |

Quan trọng: khách say/rủi ro phải được xử lý hài hước nhưng không cổ vũ uống quá mức.

## 45. Environmental design

Trumviahe có 2 môi trường:

1. **Gameplay arena**: nền grid nhẹ, tối giản, ưu tiên readability.
2. **Illustrative backgrounds**: landing/rest/Zen/social, giàu không khí.

Đây là lựa chọn đúng. Nếu gameplay background quá chi tiết, khách/bubble khó đọc. Bia Hơi nên làm tương tự:
- gameplay: sàn quán/bãi vỉa hè giản lược, grid bàn rõ;
- landing/rest/social: minh họa phố bia hơi giàu không khí;
- rush bóng đá: overlay/event, không biến nền thành quá rối;
- location premium: thay đổi props/biển/khung cảnh, nhưng giữ gameplay readability.

## 46. Social & decor system

Các asset sign/lantern/plant và chunk `StreetView`, `SocialPreviewOverlay`, `sign-text-styles` cho thấy game có hệ decor/social:
- biển hiệu có nhiều style: wood/neon/vintage/calligraphy/golden;
- sign text có màu/shadow riêng;
- lantern/plant là decor slots;
- StreetView render nhiều quán cạnh nhau;
- SocialPreview cho xem quán người khác.

Design value:
- decor không chỉ cosmetic, sign còn đổi customer mix;
- người chơi có động lực show off;
- xã hội hóa progression mà không cần multiplayer realtime.

Bia Hơi nên có:
- biển quán: gỗ/neon/bóng đá/vintage/golden;
- decor: màn hình bóng đá, đèn dây, cây cảnh, bảng menu, banner đội bóng;
- social street: dãy quán bia trong phố;
- preview stats: doanh thu mùa, danh tiếng, số bàn, sign style, huy chương.

## 47. Reward visual system

Reward assets gồm coin, gift-box, secret-box, chairman reveal, shrine medals. Reward không chỉ là số:
- coin = immediate reward;
- gift/secret box = mystery;
- chairman reveal = surprise narrative;
- shrine = prestige reward;
- badge/medal = durable identity.

Bia Hơi nên giữ 4 tầng reward:
1. **Immediate**: +xu/+tip nổi.
2. **Session**: sổ ca, mission claim.
3. **Surprise**: khách quen tặng quà, reviewer, đặt bàn lớn.
4. **Prestige**: bảng vàng, biển hiệu, decor hiếm, danh hiệu mùa.

## 48. Design QA checklist cho asset/component

Asset:
- silhouette đọc được ở 32px không?
- item có phân biệt được khi không có label không?
- hot/cold/event variant có cùng pose/scale không?
- upgrade level có khác đủ rõ không?
- icon có bị lẫn với reward/currency không?
- asset có nền transparent sạch không?
- style có thống nhất viền/ánh sáng không?

Component:
- button hit area >= 44px?
- price chip có đọc được trên 360px?
- panel có X/close consistent?
- badge đỏ có đúng là urgent/attention không?
- bottom-sheet có bị che safe area không?
- text Vietnamese có overflow không?
- canvas và DOM overlay có cùng scale ở DPR cao không?
- headless/GUI WebGL QA có kế hoạch riêng không?

## 49. Direct component mapping sang Trùm Bia Hơi

| Trumviahe component | Bia Hơi component |
|---|---|
| `hud-supply-strip` | rail bia/cốc/mồi/lạnh |
| `customer bubble` | table order bubble |
| `customer patience ring` | table patience ring |
| `tea brewer station` | vòi/keg bia station |
| `washer station` | rửa cốc station |
| `ice box` | tủ lạnh/thùng đá |
| `chair grid` | bàn nhựa grid |
| `Restock drawer` | nhập hàng theo ca/preset |
| `Upgrade grid` | nâng vận hành/kinh doanh/an toàn/decor |
| `Rank dialog` | mùa giải quán bia |
| `Shrine drawer` | bảng vàng trùm bia |
| `StreetView` | phố bia hơi / dãy quán |
| `Assistant` | tư vấn chủ quán |
| `inspection event` | kiểm tra giấy phép/vệ sinh |
| `gangster event` | bảo kê/rủi ro trật tự |

## 50. Live web deep-check: Changelog là design evolution log

Khi truy cập trực tiếp web, link **What's new / Có gì mới** mở một changelog full-page với nút `← Quay lại game`. Đây không chỉ là release note; nó cho thấy UIUX của game tiến hóa theo các vấn đề thật:

| Ngày | Thay đổi design/UIUX | Ý nghĩa sản phẩm |
|---|---|---|
| 2026-05-14 | Đội trật tự match-3, inspection hỗ trợ EN, tối đa 1 lần/ca | event mini-game chen vào ca nhưng có giới hạn để không phá nhịp |
| 2026-05-12 | Upgrade chia tab Trang bị/Kinh doanh, Donate flow 4 bước, support đính kèm ảnh | IA được sửa khi số feature tăng |
| 2026-05-11 | Donate Tea, Street Walk mở rộng duyệt 9 phố | social/decor thành lớp UX riêng |
| 2026-05-10 | Ca còn 12 phút, hồi 30 phút, mission 3 ca | session UX được tối ưu cho mobile ngắn |
| 2026-05-09 | Badge referral, HUD vị trí thuê | meta/progression được đưa ra HUD khi đủ quan trọng |
| 2026-05-08 | Rental/move stall, 9 location, rent/deposit | location trở thành screen strategy riêng |
| 2026-05-07 | Lantern/plant decor, sign effects | cosmetic nối với social và strategy |
| 2026-05-06 | Street Walk, battery saver | game công nhận mobile performance là UX |
| 2026-05-03 | Flyer campaign | marketing trở thành active boost có UI riêng |
| 2026-04-28 | Inspection intro + countdown rõ hơn | event rủi ro cần onboarding trong event |
| 2026-04-27 | Support tickets + AI assistant | help system nâng từ báo lỗi sang service layer |
| 2026-04-21 | Mission mở dần, Stats tách Xu/Uy tín | progressive disclosure và information design |
| 2026-04-20 | Reputation + dismiss customer | meta-currency có hành động trong gameplay |

Bài học lớn: game này không cố thiết kế tất cả từ đầu. Nó liên tục **tách tab**, **thêm hint**, **đưa chỉ báo ra HUD**, **giới hạn tần suất event**, và **nâng support thành conversation** khi hệ thống phình ra. Với Bia Hơi, nên dự kiến ngay lộ trình IA: MVP ít tab, sau đó tách `An toàn`, `Decor`, `Mặt bằng`, `Social` khi số item đủ nhiều.

## 51. Guide/FAQ as product UX

Guide live có cấu trúc:

1. Tổng quan kinh doanh.
2. Phục vụ khách & loại khách.
3. Thời tiết.
4. Đối phó côn đồ.
5. Nâng cấp & mở rộng.
6. Mùa giải & xếp hạng.
7. FAQ placeholder.

Điểm tốt:
- Guide viết theo mental model người chơi, không theo code.
- Bắt đầu từ vòng lặp: `Nhập nguyên liệu → Pha trà → Phục vụ → Thu tiền → Nâng cấp`.
- Mỗi loại khách được mô tả bằng hành vi, không chỉ tên.
- Weather được giải thích bằng trade-off, giúp người chơi lên chiến thuật.
- Shipper được phân biệt rõ: không tốn ly/ghế nhưng phải đủ 100% đơn.

Điểm cần cải thiện:
- FAQ đang là placeholder `Sẽ được cập nhật sau từ hệ thống Hỗ trợ`.
- Guide full-page làm người chơi rời game context; tốt cho đọc sâu, nhưng không thay thế tutorial/hint trong game.
- Nút `← Quay lại game` là affordance chính; automation bị kẹt vì flow này không giống modal X. Với người thật vẫn ổn, nhưng UX nhất quán sẽ tốt hơn nếu có header pattern chung.

Cho Bia Hơi, Guide nên có:
- `Vòng lặp quán bia`;
- `Bàn & combo`;
- `Cốc sạch / cốc bẩn`;
- `Khách say & phục vụ có trách nhiệm`;
- `Bóng đá / cao điểm`;
- `Mặt bằng / giấy phép`;
- `Mùa giải quán bia`.

## 52. Support system design

Lazy chunk `SupportOverlay` và `ReportBugOverlay` cho thấy support không chỉ là form báo lỗi:

- ticket list có filter: open/all/rewards;
- status: open, waiting admin, waiting user, resolved;
- categories: bug, feedback, confusing mechanic, balance, other, anticheat appeal;
- ticket có thể có reward;
- report form hỗ trợ ảnh: upload, paste, drag/drop;
- có rate-limit/error copy rõ;
- AI source badge cho nội dung đến từ assistant;
- support overlay có tab/filter chips và ticket conversation.

UX value:
- Người chơi có chỗ phản hồi cơ chế khó hiểu, không chỉ bug kỹ thuật.
- `confusing_mechanic` và `balance` là category rất đúng cho game economy.
- Reward trong support biến support thành vòng tin cậy hai chiều: admin có thể bồi thường hoặc cảm ơn.

Bia Hơi nếu làm live service nên giữ support taxonomy:
- Lỗi game;
- Góp ý;
- Cơ chế khó hiểu;
- Cân bằng/economy;
- Nội dung nhạy cảm;
- Khiếu nại anti-cheat.

## 53. Donate Tea / patronage UX

Chunk `DonateTeaOverlay` cho thấy `Mời Trà Đá` là tip-jar real money, không phải economy in-game. Flow có 4 bước theo changelog:

1. chọn gói;
2. chọn quà;
3. quét QR;
4. hoàn tất.

Reward cảm ơn gồm badge/decor/sign styles: lantern, plants, neon/vintage/calligraphy/golden. Đây là mô hình monetization mềm:
- không bán power trực tiếp;
- quà chủ yếu là identity/decor;
- dùng VietQR hợp văn hóa địa phương;
- copy "mời trà đá" thân thiện hơn "donate/pay".

Cho Bia Hơi, nếu có ủng hộ tác giả, nên đổi theme nhưng tránh cổ vũ uống bia thật. Có thể dùng:
- `Ủng hộ quán`;
- `Mời chủ quán ly trà`;
- quà: biển hiệu, đèn dây, cây cảnh, huy hiệu, skin bàn ghế.

## 54. Street Walk & social preview design

Chunk `StreetView` lộ một hệ môi trường lớn:
- 9 location row backgrounds: alley, construction, old apartment, school gate, night market, office district, old quarter, metro station, expat quarter;
- mỗi location có sky/sidewalk/curb palette riêng;
- có block props: bicycle, electric box, signs, no-dogs/no-smoking/no-litter;
- street có previous/next navigation;
- social preview render sign text, lantern, plant, stats.

Đây là social layer rất quan trọng: người chơi không chỉ so điểm, họ **xem quán**. Decor và sign có lý do tồn tại vì được trưng trên phố.

Cho Bia Hơi:
- social street nên là dãy quán bia/mặt phố;
- location khác nhau phải đổi background props: chợ đêm, sân bóng, phố cổ, văn phòng, metro;
- preview stats nên gọn: danh tiếng, mùa, số bàn, sign/decor, huy chương;
- decor phải xuất hiện ở leaderboard/social, không chỉ trong inventory.

## 55. Rental/location UX từ chunk

`RentalScreen` có cấu trúc UI khá phức tạp:
- header có back, title, Ask AI;
- period label;
- hero card cho location hiện tại;
- multiplier badge;
- time remaining;
- deposit/rent breakdown;
- expired/renew/leave early states;
- leave confirmation;
- color-coded expiry bars: green/yellow/orange/red;
- card list các location với locked/selected states.

Điểm đáng học:
- Rent không chỉ là "mua location"; nó là hợp đồng có thời hạn, cọc, gia hạn, rời đi sớm.
- UI phải giải thích hậu quả tài chính rõ hơn upgrade thường.
- Có `Ask AI` trong rental: đúng vị trí, vì thuê mặt bằng là quyết định strategy phức tạp.

Cho Bia Hơi:
- `Mặt bằng` nên có AI/hint "doanh thu cần để hòa vốn";
- card location nên show: rent/ngày, cọc, multiplier, loại khách, rủi ro;
- expiry bar nên nằm trong HUD khi sắp hết hạn;
- rời đi sớm phải confirm rõ `mất cọc`.

## 56. Design implication từ web-live check

Các surface ngoài gameplay xác nhận game có 3 vòng UX song song:

1. **Operate**: phục vụ, nhập, nâng, xử lý ca.
2. **Learn**: guide, FAQ, assistant, support, changelog.
3. **Belong/show off**: rank, shrine, street walk, decor, donate badge.

Đây là lý do Trumviahe giữ chân tốt hơn một idle game đơn giản. Người chơi không chỉ tối ưu tiền; họ hiểu hệ thống, gửi phản hồi, xem quán người khác, có vật phẩm trang trí và được ghi danh.

Bia Hơi nên thiết kế ngay từ đầu theo 3 vòng này. Nếu chỉ clone gameplay/economy mà thiếu Learn và Belong, game sẽ khó có cộng đồng và khó scale live ops.

## 57. Framework tổng thể: 3 vòng UX song song

Trumviahe không chạy theo một loop duy nhất. Game có 3 vòng UX chồng lên nhau:

```text
OPERATE: làm ca -> xử lý bottleneck -> kiếm tiền -> nâng cấp -> ca tốt hơn
LEARN: gặp vấn đề -> được giải thích -> thử chiến thuật -> hiểu kết quả
BELONG: thấy mình trong mùa/phố -> so với người khác -> trang trí/khoe -> quay lại
```

Ba vòng này có nhịp khác nhau:

| Vòng | Nhịp | Cảm xúc | Surface chính | Reward |
|---|---|---|---|---|
| **Operate** | từng giây/từng ca | căng nhẹ, phản xạ, tối ưu | canvas, HUD, Restock, Upgrade, Shift | xu, tip, phục vụ kịp, nâng cấp |
| **Learn** | khi vướng/kết ca/tính năng mới | hiểu ra, tự tin hơn | tutorial bubble, Guide, Quick Stats, Assistant, Support, Changelog | hiểu cơ chế, giảm lỗi, chiến thuật tốt hơn |
| **Belong** | ngày/tuần/mùa | tự hào, tò mò, muốn khoe | Rank, Shrine, Street Walk, profile, decor, donate badge | vị trí, huy chương, danh tiếng, social proof |

Điểm mạnh nằm ở chỗ 3 vòng không tách rời:
- Operate tạo dữ liệu cho Learn: sổ ca cho biết nghẽn gì.
- Learn cải thiện Operate: hiểu tip/patience/weather thì chơi tốt hơn.
- Operate tạo tài sản cho Belong: tiền, sign, decor, league score.
- Belong tạo lý do quay lại Operate: muốn lên hạng, muốn quán đẹp hơn.
- Learn giải thích Belong: season score, daily cap, shrine, rental.

Cho Bia Hơi, đây nên là xương sống sản phẩm, không phải phần phụ sau MVP.

## 58. Operate loop deep dive

### 58.1. Promise

Operate loop là cảm giác "mình đang thật sự vận hành một quán nhỏ". Người chơi phải thấy:

- quán có khách thật;
- thiếu hàng thì kẹt thật;
- phục vụ nhanh thì tip thật;
- nâng cấp đúng thì ca sau nhẹ hơn;
- rủi ro có thể ăn vào lợi nhuận.

Nếu loop này không vui trong 30-60 giây đầu, Learn và Belong không cứu được game.

### 58.2. Anatomy của Operate

```text
Pre-shift planning
  -> Active service
  -> Crisis / opportunity windows
  -> Shift ledger
  -> Upgrade / restock decision
  -> Next shift
```

| Phase | UI cần làm | Component |
|---|---|---|
| Pre-shift | cho biết thời tiết, kho, stamina, khả năng thiếu | weather hint, supply rail, Restock sheet |
| Active service | ưu tiên khách/bottleneck quan trọng nhất | table/customer bubble, patience ring, floating rewards |
| Crisis/opportunity | quyết định nhanh, hậu quả rõ | event modal, countdown, warning banner |
| Ledger | biến số liệu thành bài học | Shift sheet, end-shift report, insight card |
| Upgrade decision | nối nỗi đau với giải pháp | suggested upgrade badge, bottleneck stat |

### 58.3. Operate trong Trumviahe

Trumviahe làm tốt:
- HUD không cần đọc dài: coin, stamina, kho, mission, actions.
- Khách có bubble và patience ring.
- Restock có `+10` và `Full`, giúp nhập nhanh.
- Upgrade nhìn như vật thật, có sprite và giá.
- Shift ledger đo arrived/served/left/tipped/gross/net.
- Weather/rush/gangster biến ca thành bài toán khác nhau.

Điểm còn có thể cải thiện:
- Upgrade card nên giải thích effect ngắn ngay trên card.
- Restock nên có preset theo weather.
- Shift đang in-session toàn 0 ở đầu ca; nên có "next action" hint.
- Right rail có thể quá tải khi thêm feature.

### 58.4. Operate cho Bia Hơi

Operate của Bia Hơi phải chuyển từ **khách** sang **bàn**:

| Trumviahe | Bia Hơi |
|---|---|
| chạm khách | chạm bàn |
| khách gọi 1-2 món | bàn gọi combo/nhiều món |
| ly sạch | cốc/vại sạch |
| ấm tích | vòi/keg bia |
| ghế lẻ | bàn nhựa / bàn dài |
| Chí Phèo | khách say/không trả/pha rối |
| stubborn | bàn ngồi lâu |
| rush | khách giờ tan làm/trận bóng |

Operate HUD Bia Hơi nên ưu tiên:
1. bàn sắp bực;
2. cốc sạch;
3. bia/keg/lạnh;
4. mồi đang thiếu;
5. sự kiện bóng đá/kiểm tra;
6. tiền/danh tiếng.

### 58.5. Operate metrics

Nên đo:
- first serve success rate;
- average time to serve;
- table lost rate;
- tip rate;
- stockout count;
- dirty cup backlog;
- keg empty incidents;
- table occupancy;
- combo attach rate;
- event fail rate;
- time spent in Restock/Upgrade during shift;
- shift-to-shift improvement after suggested upgrade.

### 58.6. Operate failure modes

| Failure | Triệu chứng | Cách sửa UX |
|---|---|---|
| Too chaotic | người chơi không biết tap đâu | attention hierarchy, highlight target, reduce simultaneous events |
| Too idle | ít việc, chờ lâu | early rush nhẹ, mission, prep tasks |
| Bottleneck invisible | thua mà không hiểu vì sao | station warnings, ledger insights |
| Upgrade confusion | mua sai, thấy phí tiền | recommendation + effect copy |
| Input frustration | tap sai khách/bàn | hit area lớn, table-level target |
| Negative events feel unfair | bị phạt không có counterplay | warning, prevention upgrade, cooldown/event cap |

## 59. Learn loop deep dive

### 59.1. Promise

Learn loop là cảm giác "mình hiểu game hơn sau mỗi ca". Đây là thứ biến game từ clicker thành simulation/tycoon có chiều sâu.

Learn không chỉ là tutorial. Nó gồm:
- contextual hint;
- guide;
- quick stats;
- assistant;
- support;
- changelog;
- ledger;
- mission wording.

### 59.2. Anatomy của Learn

```text
Confusion / failure / new unlock
  -> Explanation at the right depth
  -> Suggested action
  -> Player tries it
  -> Result confirms lesson
```

| Trigger | UI response tốt |
|---|---|
| lần đầu có khách | tutorial bubble chỉ tap target |
| mất khách | toast/ledger nói lost + penalty |
| tip thấp | explain patience >60% |
| thiếu hàng | open Restock item hoặc warning station |
| đủ tiền nâng cấp | recommend bottleneck upgrade |
| unlock feature mới | one-card explanation, không wall text |
| hỏi chiến thuật | Assistant đọc state thật |
| vẫn không hiểu | Guide/FAQ/Support |

### 59.3. Learn trong Trumviahe

Các lớp Learn hiện có:

- **Tutorial bubble**: `SERVE TEA - First customer! Tap to serve`.
- **Quick Stats**: tách Coins/Reputation, giải thích gain/loss/usage.
- **Guide**: mô tả loop, khách, weather, gangster, upgrade, season.
- **Assistant**: lock sau Phone nhưng định hướng là state-aware advice.
- **Changelog**: cho người chơi hiểu feature mới và thay đổi balance.
- **Support**: có category `confusing_mechanic`, `balance`, feedback.
- **Missions**: biến mục tiêu học thành task.
- **Shift ledger**: số liệu sau hành động.

Điểm rất đáng học: Support có category "cơ chế khó hiểu". Đây là tín hiệu product maturity: game công nhận confusion là lỗi UX, không chỉ lỗi người chơi.

### 59.4. Learn depth ladder

Nên thiết kế Learn theo 5 tầng:

| Tầng | Khi nào dùng | Ví dụ |
|---|---|---|
| **Inline cue** | trong 1-3 giây | ring đỏ, bubble món, badge thiếu cốc |
| **Microcopy** | trong panel | "Rót nhanh hơn", "Tip cao nếu phục vụ sớm" |
| **Insight** | sau ca | "Nghẽn chính: cốc sạch" |
| **Guide/Assistant** | khi người chơi chủ động hỏi | "Trời nóng nên nhập thêm đá" |
| **Support/FAQ** | khi vẫn không hiểu/lỗi | ticket, FAQ, bug report |

Không nên dùng Guide để bù cho inline cue yếu. Người chơi casual sẽ không đọc guide trước khi chơi.

### 59.5. Learn cho Bia Hơi

Bia Hơi có thêm độ nhạy chủ đề nên Learn phải giải thích cả gameplay lẫn trách nhiệm:

- game là quản lý quán, không khuyến khích uống quá mức;
- khách say là risk/cost, không phải reward;
- bảo vệ/giấy phép là prevention;
- bàn ngồi lâu vừa có doanh thu vừa chiếm capacity;
- combo tăng AOV nhưng tăng prep pressure;
- bóng đá tạo demand spike nhưng cũng tăng rủi ro ồn ào/say.

Gợi ý Learn components:

| Component | Nội dung |
|---|---|
| First shift coach | tap bàn, rót bia, rửa cốc |
| Bottleneck insight | cốc sạch/keg/mồi/bàn |
| Weather/event card | trời nóng, trận bóng, mưa |
| Responsible service hint | khách say làm giảm danh tiếng nếu xử lý kém |
| Upgrade advisor | gợi ý dựa trên ledger |
| Owner assistant | hỏi "ca sau nên nhập gì?" |

### 59.6. Learn metrics

Nên đo:
- tutorial completion;
- first shift lost rate;
- repeat stockout after warning;
- upgrade recommendation acceptance;
- improvement after recommendation;
- guide opens by topic;
- assistant questions by category;
- support tickets tagged confusing_mechanic;
- churn after first failure event;
- churn after first negative reputation shift.

### 59.7. Learn failure modes

| Failure | Triệu chứng | Cách sửa UX |
|---|---|---|
| Too much text | người chơi skip, vẫn sai | progressive disclosure |
| Advice too generic | assistant không hữu ích | feed state: kho, weather, ledger |
| Invisible rules | tip/penalty thấy random | show threshold/hint in ledger |
| Feature unlock confusion | mở Phone/QR/sign nhưng không biết dùng | unlock explainer card |
| Support as last resort only | người chơi rời đi trước khi hỏi | FAQ/hint trong panel |

## 60. Belong loop deep dive

### 60.1. Promise

Belong loop là cảm giác "quán của mình có chỗ trong một con phố/mùa giải/cộng đồng". Đây là thứ khiến người chơi quay lại sau khi core loop đã quen.

Belong gồm:
- leaderboard;
- season;
- shrine;
- street walk;
- social preview;
- profile;
- badge/medal;
- decor/sign;
- donate/patron identity;
- support relationship với dev/admin.

### 60.2. Anatomy của Belong

```text
Earn visible progress
  -> Compare / discover others
  -> Customize identity
  -> Receive recognition
  -> Return for next season / showcase
```

| Surface | Belong job |
|---|---|
| Rank | vị trí hiện tại, mục tiêu gần |
| Shrine | danh dự dài hạn, ký ức mùa |
| Street Walk | thế giới có người khác |
| Social preview | quán là identity, không chỉ điểm |
| Sign/decor | biểu đạt chiến lược + gu |
| Badges | thành tích gắn với người chơi |
| Donate rewards | patron identity không phá balance |
| Profile | lịch sử, life path, peak |

### 60.3. Belong trong Trumviahe

Trumviahe làm rất tốt ở 2 điểm:

1. **Shrine khác leaderboard**: leaderboard là hiện tại; shrine là ký ức/huyền thoại. Điều này làm mùa cũ không biến mất.
2. **Decor xuất hiện ngoài inventory**: sign/lantern/plant hiện ở ranking, street view, social preview. Cosmetic có sân khấu để được nhìn thấy.

Street Walk là mảnh ghép lớn: nó biến danh sách người chơi thành một con phố. Người chơi không chỉ hỏi "mình đứng thứ mấy?", mà còn "quán họ trông thế nào?".

### 60.4. Belong cho Bia Hơi

Belong của Bia Hơi nên xây quanh "phường/phố/quán":

| Trumviahe | Bia Hơi |
|---|---|
| Bảng xếp hạng | Quán bia hot nhất phường |
| Đền Thiêng | Bảng vàng Trùm Bia |
| Street Walk | Phố bia hơi / dãy quán |
| Sign style | Biển quán / màn bóng đá / đèn dây |
| Lantern/plant | decor quán nhậu |
| Badge referral | huy hiệu chủ quán |
| Donate Tea | ủng hộ quán/tác giả bằng quà decor |

Quan trọng: Belong không nên cổ vũ "uống nhiều". Nên vinh danh:
- phục vụ hiệu quả;
- danh tiếng cao;
- quán đẹp;
- xử lý rủi ro tốt;
- mùa giải doanh thu;
- cộng đồng/góp ý.

### 60.5. Belong metrics

Nên đo:
- leaderboard opens per active user;
- shrine opens after season end;
- street walk opens;
- social preview views;
- decor equip rate;
- sign style distribution;
- return rate after season end;
- profile/share clicks;
- donate/decor conversion if applicable;
- rank goal proximity: người chơi cách mốc tiếp theo bao nhiêu.

### 60.6. Belong failure modes

| Failure | Triệu chứng | Cách sửa UX |
|---|---|---|
| Leaderboard feels impossible | người mới thấy top quá xa | tiered ranks, projected rank, local bracket |
| Cosmetic invisible | không ai mua/equip decor | show in street/profile/rank |
| Season reset feels punishing | churn sau reset | shrine/archive + restock rewards |
| Social is just numbers | ít cảm xúc | visual street, quán preview |
| Pay identity feels unfair | bị xem pay-to-win | patron rewards cosmetic/status only |

## 61. Cross-loop handoffs

Ba vòng UX mạnh khi có handoff rõ:

| From | To | Handoff tốt |
|---|---|---|
| Operate | Learn | ledger chỉ ra bottleneck |
| Learn | Operate | assistant gợi ý nhập/nâng ca sau |
| Operate | Belong | doanh thu mùa, sign/decor unlock |
| Belong | Operate | mục tiêu rank/mùa khiến mở ca tiếp |
| Learn | Belong | guide/changelog giải thích season/shrine |
| Belong | Learn | xem quán người khác học chiến thuật |

Trong Bia Hơi, nên thiết kế các handoff cụ thể:

- Sau ca: `Bạn mất 6 bàn vì thiếu cốc sạch -> Nâng chậu rửa?`
- Sau mở sign: `Biển bóng đá tăng khách trận đấu nhưng bàn ngồi lâu hơn.`
- Khi gần lên hạng: `Cần thêm 12.000 xu mùa này để lên Bạc.`
- Khi xem quán top: `Quán này dùng biển Neon + nhiều bàn, hợp rush tối.`
- Khi hết mùa: `Bạn nhận vốn nhập hàng + huy chương, tên lưu ở Bảng vàng.`

## 62. 3-loop roadmap cho MVP Bia Hơi

MVP không cần làm đủ mọi thứ, nhưng mỗi vòng nên có bản tối thiểu.

### Operate MVP

- 1 màn gameplay bàn nhậu.
- 3 item: bia, cốc sạch, mồi.
- 3 station: vòi/keg, rửa cốc, bàn.
- 1 event: cao điểm bóng đá.
- 1 ledger cuối ca.

### Learn MVP

- tutorial bubble ca đầu;
- Quick Stats cho xu/danh tiếng;
- ledger insight "nghẽn chính";
- guide 1 trang;
- assistant có thể chưa cần AI thật, dùng rule-based tips.

### Belong MVP

- rank tier cá nhân;
- bảng top đơn giản;
- 2-3 sign style;
- profile/quán preview basic;
- season archive có thể defer, nhưng nên có placeholder "Bảng vàng mùa sau".

Nếu bỏ hẳn Belong ở MVP, vẫn nên giữ data model cho sign/decor/profile để không phải refactor sau.

## 63. Bia Hơi UX north-star

North-star nên là:

> "Mỗi ca cho người chơi một khoảnh khắc vận hành căng-vui, một điều học được, và một lý do muốn khoe/quay lại."

Checklist cuối:
- Sau 1 phút, người chơi đã phục vụ được bàn đầu chưa?
- Sau ca đầu, họ hiểu vì sao lời/lỗ chưa?
- Sau 3 ca, họ có mục tiêu nâng cấp rõ chưa?
- Sau 1 ngày, họ có lý do quay lại ngoài kiếm xu chưa?
- Sau 1 mùa, họ có dấu vết để tự hào không?

---
*Nguồn: truy cập trực tiếp trumviahe.com bằng Chrome GUI (Landing, Changelog, Guide, HUD, Restock, Upgrade, Rank, Missions, Assistant, Settings, Shift, Quick Stats, Shrine) + trích CSS variables/classes, asset inventory, lazy chunks Support/Donate/StreetView/Rental/Profile, token style & state machine từ bundle public (sprite khách biến thể hot/cold, `customer-popover`, `grace_leaving`).*
