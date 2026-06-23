# Catalog Design / Component / Asset — Trùm Trà Đá Vỉa Hè

Bản kiểm kê chi tiết toàn bộ **asset (236 file), component (276 class, ~28 nhóm), icon, item, design token** — trích trực tiếp từ bundle + quan sát. Đi kèm `uiux-analysis-trumviahe.md` (phân tích UX) và `economy-spec-from-bundle.md` (kinh tế).

---

## 1. Kiểm kê ASSET (236 file .webp)

### 1.1. Khách hàng — 90 file (30 "khuôn mặt" × 3 biến thể thời tiết)
- `customer-1` … `customer-30`, mỗi loại có **3 phiên bản**: `customer-N` (thường), `customer-N-hot` (trời nóng), `customer-N-cold` (trời lạnh) → cùng một người đổi trang phục/biểu cảm theo thời tiết.
- Khách đặc biệt (cũng có biến thể hot/cold): `customer-vip`, `shipper-waiting`.

### 1.2. Thiết bị — sprite theo TỪNG CẤP (đồng bộ với economy)
| Thiết bị | Asset | Số cấp |
|---|---|---|
| Quầy/xe đẩy | `stall-1..5` | 5 |
| Thùng đá | `ice-box-1..5` | 5 |
| Ấm pha trà | `tea-brewer-1..5` | 5 |
| Bộ rửa ly | `washer-1..5` | 5 |
→ Mỗi lần nâng cấp **đổi hẳn hình** (visual progression), không chỉ đổi số → người chơi "thấy" được sự lớn lên của quán.

### 1.3. Ghế (đa trạng thái)
`chair-empty` (trống), `chair` (thường), `chair-armchair` (ghế tựa/nâng cấp), `chair-upgraded`, `chair-broken` (bị côn đồ phá), `chair-upgraded-broken` → trạng thái hỏng có sprite riêng (báo cần sửa).

### 1.4. Chó (animation states)
`dog-idle-1/2/3` (đứng yên) + `dog-attack-1/2/3` (đánh nhau) → có animation frames cho combat gangster.

### 1.5. Chủ quán
`stall-owner`, `stall-owner-hot`, `stall-owner-cold` → nhân vật chính cũng đổi theo thời tiết.

### 1.6. Nhân vật sự kiện
`gangster-1`, `gangster-2`, `gangster-3`, `gangster-boss` (4 mức côn đồ, boss riêng), `chairman-reveal` (chủ tịch giả nghèo).

### 1.7. Cosmetic / trang trí (mỗi nhóm nhiều style)
- **Biển hiệu (5)**: `sign-wood`, `sign-neon`, `sign-calligraphy`, `sign-vintage`, `sign-golden`.
- **Lồng đèn (4)**: `lantern-japanese`, `lantern-lotus`, `lantern-red`, `lantern-vintage`.
- **Cây cảnh (4)**: `plant-bamboo`, `plant-bonsai`, `plant-orchid`, `plant-succulent`.

### 1.8. Vật phẩm / UI icon
`coin`, `gift-box`, `phone`, `qr-payment`, `flyer-bundle`, + icon medal/star/badge.

### 1.9. Nền minh hoạ
`backgrounds/bg-01..` (cảnh hẻm phố cho màn kết mùa/nghỉ — vẽ tay, khác phong cách pixel gameplay).

> Engine render: **Pixi.js (WebGL canvas)** cho sân chơi; **HUD/modal là DOM overlay** (React) phủ lên canvas.

## 2. Hệ ICON (HUD & nhãn)

| Vùng | Icon | Ý nghĩa |
|---|---|---|
| Top-left | 💰/coin | xu (số dư) |
| Top | ⚡ | thể lực + số ca (x/5) |
| Top | ⏱ NHẸ/NẶNG | đếm ngược + cường độ cao điểm |
| Top | 🌤/🥵/🌧/❄ + ↑↑↑/↓↓↓ | thời tiết + hướng hệ số |
| Top | 🏮 Chợ Đêm ×1.20 | sự kiện địa điểm |
| Rail | (5 icon NL) | trà/nước/đá/kẹo/hạt — số tồn |
| Rail | 🔔 / 🔇 | thông báo / tắt tiếng |
| Rail | 🎯 x/5 | nhiệm vụ ngày |
| Rail | 🤖 | trợ lý AI "Trà Đấm" |
| Rail | ⛩️ | Đền Thiêng |
| Bottom | ⭐ | uy tín |
| Bottom | 🏆 (chấm đỏ) | xếp hạng (có notif) |
| Khách | 🤩/😤/😎 + nhãn VIP/VỘI/NGỒI LỲ | loại khách & cảm xúc |

Nguyên tắc: **icon + nhãn chữ song hành** (không icon-only) → phổ thông; emoji dùng nhiều cho cảm xúc/loại khách (dễ đọc nhanh).

## 3. Catalog COMPONENT (276 class, ~28 nhóm)

Phân nhóm theo prefix class (số trong ngoặc = số class con → độ phức tạp):

### Overlay / chặn màn
- `inapp-escape` (14) — overlay anti-idle/fairness "Game tự tạm dừng".
- `pause-overlay`, `pause-overlay-backdrop` — nền mờ chặn tương tác.
- `loading-logo` (3) — màn tải.

### Tương tác khách (core)
- `customer-popover` (12) — dialog chạm khách (order, loại, hành động).
- `popover-compare` (6) — so sánh/đối chiếu (có thể là "xem lén" quán khác).
- `kick-popover` (3) — đuổi khách ngồi lỳ.

### Sự kiện
- `gangster-modal` (10) + `gangster-battle` (4) + `gangster-result` (4) — bộ 3 màn bảo kê (đòi → đánh → kết quả).
- `gangster-pay-countdown-badge` — đồng hồ 20s.
- `theft-report` (6) + `session-info` (6) — báo cáo trộm offline.
- `emergency-pack` (4) — gói cứu trợ hết hàng.
- `inspection-team` + `inspection-team-retry` — kiểm tra giấy phép (có retry).

### Trạng thái / chỉ số
- `stats-quick` (6) — Thông tin nhanh (tab Xu/Uy tín).
- `stamina-details` (10) — bảng thể lực/ca.
- `weather-details` (12) + `weather-indicator` (3) + `weather-popup` (3) — hệ thời tiết.
- `rush-banner` (5) — báo cao điểm.
- `location-indicator` (3) — mặt bằng hiện tại.
- `resource-usage` (5) — danh sách công dụng uy tín.

### Shop / nâng cấp
- `drawer-item` (4) — dòng item trong bottom-sheet.
- `drawer-btn` (+`accent`) — nút trong drawer.
- `dog-upgrade` (4), `qr-payment` (4).
- `ui-inline-icon--coin` — icon xu inline trong chữ.

### Onboarding / social / auth
- `onboarding-coachmark` (3) — bong bóng hướng dẫn theo ngữ cảnh.
- `auth-nudge` (5), `settings-guest` (4) — gợi ý đăng nhập (chơi guest được).
- `social-prompt` (5) — mời tương tác xã hội.
- `welcome-footer` (3).
- `hud-side` (4) — rail bên.

→ Hệ component **theo từng tính năng** (mỗi event/panel là 1 cụm class riêng), không dùng 1 component generic → dễ tùy biến từng màn nhưng nhiều CSS.

## 4. Design tokens (xác nhận as-rendered từ DOM live)

- **Font (thật)**: body = **"Be Vietnam Pro"** (font tối ưu tiếng Việt) → "Segoe UI" → sans-serif; nút/số = **"Chakra Petch"** (geometric/tech, hợp con số & nhãn game) → "Trebuchet MS". Hai-font system: thân thiện cho chữ Việt + cá tính cho số/CTA.
- **Màu** (55 hex): beige nền `#f3e3bc`/`#fff3cc`/`#e8d5b0`; accent vàng-kim `#ffd700`/`#ffae42`/`#ffd27a`; modal navy-tím `#1e1e3f`/`#16213e`/`#1a1a2e`/`#2a2a4a`; CTA đỏ `#e94560`/`#f44336`, xanh dương `#4682B4`, xanh lá `#4caf50`; gỗ `#8B7355`/`#8B4513`/`#8B6914`; chữ `#e0e0e0`/`#fff8e0`.
- **Bo góc**: 8/12/16px; bottom-sheet bo `14px 14px 0 0`.
- **Nút (as-rendered)**: Chakra Petch 14,7px, weight 600, radius 8px, **min-height 52px** (touch target chuẩn mobile ≥44px), padding 6px 10px.
- **HUD = hệ "pill"**: `hud-overlay > hud-top > hud-top-left`, các chip bo tròn `hud-pill--coins`, `hud-pill--stamina` (`--button` khi bấm được), `hud-indicators-row`, `hud-side-rail` (rail phải). → component hoá theo "pill" tái dùng.
- **Spacing**: padding card 16–24px, gap 12px.

### Hệ ANIMATION (~50 keyframes — phong phú hơn nhiều so với bundle minify)
- **Thời tiết**: `weather-shimmer`, `weather-shimmer-strong` (badge nhấp nháy khi humid), `weather-rain`, `weather-wind`.
- **Cao điểm**: `rushBannerShake`/`-Active`, `rushPulse`, `rushPulseHeavy` (rung mạnh hơn khi NẶNG).
- **Số nổi (floating indicators)** — mỗi loại 1 animation riêng: `floating-indicator-pop` (xu), `-tip-pop` (tiền boa), `-qr-pop` (QR), `-wellrested-pop` (+10%), `-deposit-refund-pop` (hoàn cọc). → phản hồi thưởng phân loại bằng hiệu ứng khác nhau.
- **Kiên nhẫn**: `pulse-patience`, `pulse-low` (nhịp cảnh báo khi gần hết).
- **Modal/toast**: `game-modal-in`, `modal-pop-in`, `popover-sheet-in`, `toast-in`/`-fade`, `slide-up`/`-down`, `fade-in`.
- **Sự kiện**: `chairman-pop-in` + `chairman-smoke-rise` (chủ tịch lộ diện kèm khói), `secretBoxBurst` (mở hộp quà), `shrine-smoke-rise` (Đền Thiêng), `milestone-in`, `life-path-next-pulse`, `streak-card-pulse`, `upgrade-card-pulse`, `rentalAlertPulse`, `expiry-pulse`, `flyer-badge-pulse`, `well-rested-glow`.
- **Onboarding/AI**: `onboarding-glow`, `coachmark-enter`, `onboarding-toast-enter`, `onboarding-pulse`, `hintBounce`, `hintPulse`, **`ai-chat-typing`** (chấm "đang gõ" của Trà Đấm).
- **Nghỉ/Zen**: `screensaver-drift` (trôi nhẹ khi Tĩnh tâm), `loading-dots`, `progressLoop`, `spin`, `icon-float`, `btn-pulse`, `welcomeCtaPulse`.
→ Triết lý: **mỗi tín hiệu quan trọng có animation riêng** (tip ≠ xu ≠ hoàn cọc; rush nhẹ ≠ nặng), nhưng tất cả đều ngắn/nhẹ (1–2s) → vừa "juicy" vừa mượt trên mobile.

### Render thời tiết: canvas vs DOM
- Hiệu ứng **giọt mưa / gió** (`weather-rain`, `weather-wind`) render trên **Pixi canvas** (particle, không phải DOM CSS).
- Badge thời tiết trên HUD dùng CSS keyframe (`weather-shimmer`/`-strong`).
- → Pattern: hiệu ứng môi trường ở canvas, chỉ báo/UI ở DOM.

### 🔊 Sound design (tối giản — xác nhận live)
- **Nhạc nền = 1 track `ambient.ogg`** loop, phát qua **Web Audio API** (không có `<audio>` tag; `ambientBuffer/Source/Gain`, fade-in/out, `musicBus`, `MusicMultiplier`, toggle `musicEnabled`, fallback `ambientLoadFailed`).
- **`ambientGossip`**: giọng radio "loa phường" trong chế độ Tĩnh tâm/nghỉ (kể chuyện văn hoá).
- **SFX**: có toggle (🔇 `sfxEnabled`/`sfxBus`) nhưng **không có file sfx rời** trong bundle → SFX tối giản/procedural hoặc gần như không có.
- → Triết lý âm thanh: **nhẹ, chill (lofi + ambient), không ồn ào sfx** — hợp game casual chơi lâu, ít gây mệt tai. Bản bia hơi có thể thêm sfx "leng keng cốc", "rót bia" nhưng nên giữ tổng thể nhẹ + có nhạc nền + radio.

## 5. ITEM / đối tượng game (tổng hợp)

| Nhóm | Item | Vai trò |
|---|---|---|
| Bán | trà đá, kẹo lạc, hạt hướng dương | doanh thu |
| Nguyên liệu | trà, nước, đá, kẹo lạc, hạt | tiêu hao (kho) |
| Thiết bị | quầy, thùng đá, ấm tích, bộ rửa ly | throughput (5 cấp) |
| Chỗ ngồi | ghế nhựa, ghế tựa, hàng đợi | sức chứa |
| Tài nguyên quay vòng | ly (cup; mua tối đa 10, kho tối đa 20 — dôi 10→20 chỉ lấp bằng quà Chủ tịch +1/lần) | phục vụ trà |
| Kinh doanh | điện thoại, QR, tờ rơi, biển hiệu | mở khoá/marketing |
| Phòng vệ | chó (idle/attack) | chống gangster/trộm |
| Cosmetic | biển hiệu(5), lồng đèn(4), cây cảnh(4) | trang trí/prestige |
| Tiền tệ | xu, uy tín, badge shard, cosmetic token | economy/meta |
| Tiêu thụ | tờ rơi, supply crate, emergency pack | tiện ích |

## 6. Bài học design/component cho "Trùm Bia Hơi"

1. **Visual progression bằng sprite theo cấp** (như stall-1..5): mỗi nâng cấp đổi hình quầy bia/vòi/tủ lạnh → cảm giác "lớn lên" rõ.
2. **Biến thể theo bối cảnh** (hot/cold): khách & chủ quán đổi diện mạo theo thời tiết/sự kiện (mùa bóng đá mặc áo đội bóng…) — chi tiết rẻ nhưng tăng sống động.
3. **Trạng thái hỏng có sprite riêng** (chair-broken): hư hại phải "thấy được" để thôi thúc sửa.
4. **Cosmetic nhiều style/nhóm** (biển/lồng đèn/cây) → trục tùy biến + sink uy tín/token, không ảnh hưởng cân bằng.
5. **Component theo tính năng** (mỗi event 1 cụm): dễ làm event mới mà không đụng core; nhưng nên có **design system token chung** (màu/nút/spacing) để khỏi loạn.
6. **Icon + nhãn song hành**, emoji cho cảm xúc/loại khách → đọc nhanh trên mobile.
7. **Engine**: canvas (Pixi/WebGL) cho sân + DOM/React overlay cho HUD/modal là kiến trúc hợp lý để clone (canvas nhẹ cho sprite động, DOM dễ làm UI/responsive).
8. Giữ **animation tối giản** (bounce/pulse/fade) → mượt trên máy yếu.

---
*Nguồn: trích bundle `index-BWec7RjV.js` (236 asset .webp, 276 class component ~28 nhóm, 55 màu, keyframes hintBounce/hintPulse) + quan sát trực tiếp HUD/modal. Engine: Pixi.js canvas + React DOM overlay.*
