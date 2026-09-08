# Feature Specs — Trùm Bia Hơi

> Bộ spec triển khai cho từng feature `Fxx` trong `06-ROADMAP-trum-bia-hoi.md`.
> Nguồn sự thật cấp cao vẫn là `02-GDD-trum-bia-hoi.md`; nếu mâu thuẫn thì GDD thắng. Các file ở đây cụ thể hóa để dev có thể code, test, và review.

## Trạng thái

| Feature | Spec |
|---|---|
| F01 Vòng Lặp Mở Ca | `04-SPEC-prototype-phase0.md` |
| F02 Menu & Kinh Tế Quán | `04-SPEC-prototype-phase0.md` + `F11-kitchen-hot-dishes.md` |
| F03 Hệ Bàn | `03-SPEC-he-ban.md` |
| F04 Vòng Đời Cốc | `04-SPEC-prototype-phase0.md` |
| F05 Độ Hơi Bia | `04-SPEC-prototype-phase0.md` |
| F06 Tip / Uy tín / Phạt | `04-SPEC-prototype-phase0.md` + `03-SPEC-he-ban.md` |
| F07 Các Kiểu Khách | `F07-customer-types.md` |
| F08 Giờ Vàng | `F08-rush-system.md` |
| F09 Thời Tiết Quán | `F09-weather.md` |
| F10 Nâng Cấp Quán | `F10-upgrades.md` |
| F11 Bếp & Mồi Nóng | `F11-kitchen-hot-dishes.md` |
| F12 Giải Nhậu & Vụ Bia | `F12-league-seasons.md` |
| F13 Đường Lên Trùm | `F13-life-path.md` |
| F14 Mặt Bằng Quán | `F14-locations.md` |
| F15 Sự Cố Quán Nhậu | `F15-risk-events.md` |
| F16 Rủ Bạn & Huy Hiệu | `F16-referral-badges.md` |
| F17 Nhiệm Vụ Quán Nhậu | `F17-quest-system.md` |
| F18 Chó Giữ Quán | `F18-dog-guard.md` |
| F19 Cúp Bóng Đá & Giờ Vàng Xem Bóng | `F19-world-cup-event.md` + `../../07-SPEC-shop-mua-giai-worldcup.md` |
| F20 Mời Bia Hơi | `F20-donation.md` |
| F21 Vé Số Lấy Hên | `F21-lottery.md` |
| F22 Bia Đấm | `F22-ai-assistant.md` |
| F23 Kiến Trúc Server Quán | `F23-server-architecture.md` |
| F24 Thiết Kế UI/UX Quán Bia | `F24-design-uiux-production.md` + `../../05-SPEC-design-uiux.md` |
| F25 Ngôn Ngữ, Tài Khoản & Đăng Nhập | `F25-localization-account.md` |
| F26 Vé Mở Ca & Thanh Toán | `F26-daily-session-pass-payments.md` |
| F28 Bảng Xếp Hạng & Bàn Thờ Ông Địa | `F28-leaderboard.md` — tách từ F12 §6; config `leaderboard` tier A |
| F27 Onboarding (ca đầu tiên, step guide, guest → login) | `F27-onboarding.md` — 🟢 luật chủ dự án 08/09; config `onboarding` tier C |
| **Mọi hằng số/công thức** | `../../08-SPEC-economy-constants.md` + `../config/economy.tbh.json` (số thắng) |
| **UI/UX màn hình & luồng** | `../../09-SPEC-uiux-screens.md` |
| **Kỹ thuật triển khai (kiến trúc/API/test)** | `../../10-SPEC-tech-implementation.md` |
| **Admin/CRM + Config Registry (mọi tham số config ở admin, không hardcode)** | `../../trum-bia-hoi-brd-admin.md` §5.2 + `../../08-SPEC-economy-constants.md` §22 |
| **Pipeline asset Blender MCP** | `../asset-blender-pipeline.md` |
| **Prompt triển khai theo thứ tự (designer Blender MCP → dev)** | `../../11-PROMPT-PACK-designer-blender-dev.md` (+ Phụ lục T tech, U screen) |
| **Điểm vào** | `../../00-HANDOFF-trum-bia-hoi.md` |

## Cách đọc

- `CORE`: quyết định ổn định, nên code theo.
- `TUNE`: số khởi điểm, được chỉnh bằng playtest/balance.
- `POST-MVP` / `Phase N` trong các F: nhãn cũ = **thứ tự code** (mốc M ở 06-ROADMAP v3.0), vẫn trong scope 1 phase (00-HANDOFF §4).
- Mỗi feature nên có analytics event tối thiểu để phục vụ playtest và dashboard.
