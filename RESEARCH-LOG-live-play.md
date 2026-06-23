# 🔬 RESEARCH LOG — Live play trumviahe.com

> Nhật ký dive-deep từ **game chạy thật** trong Chrome (bổ trợ cho `economy-spec-from-bundle.md` vốn trích từ bundle tĩnh). Mỗi lần khai thác ghi 1 block: nguồn, phát hiện, ý nghĩa cho Trùm Bia Hơi.
> Cách lấy dữ liệu: đọc `localStorage` + JS trong page context qua Chrome. State chính (xu/nâng cấp) là **server-authoritative** (không nằm client); client chỉ giữ lớp retention/meta + prefs.

---

## Phiên 2026-06-04 — Lớp retention/meta (localStorage `tea-game-retention-v2`)

**Bối cảnh tài khoản lúc đọc:** 118,197 xu · Ca 3/5 · màn Đóng cửa · ca tới "Nắng nóng" · thực thu ca vừa rồi 22,656 (tổng 22,664 − phạt 8).

### Cấu trúc `tea-game-retention-v2`
6 nhánh: `daily`, `loginTrack`, `reminders`, `badgeShards`, `cosmeticTokens`, `signInMission`.

### 1. Daily missions (hệ nhiệm vụ ngày)
- **3 slot/ngày**, reset theo `dateKey`. Mỗi mission: `id`, `target`, `progress`, `reward {coins, reputation}`, `claimed`.
- Pool id quan sát được: `serve_tea`, `serve_customers`, `earn_coins`, `zero_loss_window`, `perfect_tip`.
- Mission hôm nay (2026-06-04): `serve_tea` target 10 → 120 xu +5 uy tín · `earn_coins` target 1100 → 220 xu +5 uy tín · `zero_loss_window` target 1 → 320 xu +5 uy tín.
- Có `completedAllRewardClaimed` → **thưởng combo khi xong cả 3** (cơ chế hoàn thành full-set).
- `recentMissionHistory` lưu id theo slot/ngày → dùng để **chống lặp** mission (không giao lại mission vừa ra).

**Quan sát reward scaling:** thưởng tăng theo độ khó slot (120 → 220 → 320 xu); uy tín cố định +5/nhiệm vụ. `zero_loss_window` (1 ca không để mất khách/đơn) thưởng cao nhất → game **thưởng cho chơi sạch**, không chỉ cày volume.

### 2. loginTrack (điểm danh)
- `cycleDay`, `lastClaimDateKey`, `lastActiveDateKey`. Cơ chế **chuỗi điểm danh theo chu kỳ** (cycle), tách biệt "active" vs "claim".
- Lưu ý: `lastClaimDateKey` = 2026-04-26 nhưng `lastActive` = 2026-06-04 → người chơi quay lại sau gián đoạn dài, chuỗi đã reset về cycleDay 1.

### 3. reminders (nhắc quay lại)
- Cờ gửi nhắc theo ngày: `dailyReminderSentTMinus180m`, `dailyReminderSentTMinus30m` → hệ **push/notify nhắc trước mốc reset** (T−180m, T−30m).

### 4. Meta currency phụ
- `badgeShards`: 6 (mảnh huy hiệu — gom đổi huy hiệu/cosmetic).
- `cosmeticTokens`: 0 (token cosmetic — tách bạch khỏi xu, **không pay-to-win**).
- `signInMission`: null (nhiệm vụ gắn điểm danh, hiện trống).

### 5. Gợi ý biển hiệu (đọc từ HUD màn Đóng cửa)
Mỗi kiểu **biển hiệu** có hiệu ứng riêng: **Neon** hút shipper · **Vintage** giảm khách vội · **Thư pháp** giảm khách ngồi lỳ · **Hoàng kim** x3 VIP. Đổi ở nút biển hiệu trên HUD → cosmetic **CÓ tác động gameplay** (buff theo loại khách).

### → Ý nghĩa cho Trùm Bia Hơi
- Lớp retention (daily 3-slot + combo + chống lặp + login cycle + reminder T-minus) là **template hoàn chỉnh** để bê sang, đổi vỏ: `serve_tea`→`serve_bia`, `perfect_tip`, `zero_loss_window` (ca không mất bàn).
- Biển hiệu buff-theo-loại-khách là pattern hay cho meta Trùm Bia Hơi (map sang: biển hút shipper/VIP/giảm Chí Phèo...). Ghi vào mục cosmetic Phase 3.
- Tách `badgeShards`/`cosmeticTokens` khỏi xu xác nhận lại nguyên tắc **cosmetic-only, không P2W** đã ghi trong GDD.

**Còn cần đào:** state server-side (công thức xu/nâng cấp live) — không có ở client; cần đọc network/websocket khi chơi. Hệ huy hiệu (badgeShards đổi gì, tỉ lệ). Đầy đủ pool daily mission + target scaling theo level.
