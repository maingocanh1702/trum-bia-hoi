# Implementation Tracker — Trùm Bia Hơi

> **Version:** v0.8.0
> **Ngày tạo:** 2026-06-09 · **Cập nhật:** 2026-09-08 (build engine/web mới)
> **Trạng thái:** Active — **M0 đã có và kiểm chứng; M1–M3 đang triển khai.** `prototype/` đã lưu trữ (kết quả cũ ghi ở ghi chú Phase 0, không tính tiến độ). Đồng bộ `06-ROADMAP` **v3.0** (1 phase, mốc M0–M9).
> **Owner:** Team
> **Mục đích:** Master status board cho mọi feature F01–F28. Nhãn `Phase N` chỉ là **khoá parser** của dashboard-engine; mốc thật: P0 → M0 (nền) · P1 → M1–M2 · P2 → M3 · P3 → M4–M6 · P4 → M7–M8 · QA/release → M9. Là **input cho dashboard-engine** (`tools/dashboard-engine/build_dashboard.py`). Nguồn quyết định/scope = `02-GDD-trum-bia-hoi.md` + `06-ROADMAP-trum-bia-hoi.md`; tracker chỉ theo dõi **trạng thái build**.
> **Cập nhật:** đổi status mỗi khi 1 feature chuyển trạng thái (bắt đầu code / review / merge).

---

## 0. How to use this tracker

**Status legend:**

- `⬜` not started
- `🟡` in progress (đang code)
- `🟠` code done, in review
- `🟢` review pass, ready
- `✅` done / merged
- `❌` blocked (xem Notes)
- `⏸️` deferred post-MVP

**Wave** = track phụ trách: 🎮 Code · 🎨 Design · 🔊 Audio · ⚖️ Economy.

**Gate flags** (mục tiêu trước khi coi là done):

- `🔒S` Spec triển khai có sẵn
- `🔒P` Qua playtest milestone
- `🔒B` Economy/balance pass (k trong 2.0–3.0)

**PR ID** = mã feature F01–F26 (khớp `06-ROADMAP`). Branch để trống tới khi có git repo.

---

## 1. Status board — thứ tự code (Phase N = khoá parser; mốc thật M0–M9 ở `06-ROADMAP` v3.0)

### Phase 0: Nền (M0 — config loader, engine thuần, sim k, port check:config)

> Prototype (lưu trữ) từng đạt: F04/F05 ✅, F01/F02/F03/F06/F08 🟡, 5-seed k = 2.24–2.34. **Không tính vào game mới** — mọi dòng dưới đây là trạng thái của game viết lại.

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F04 | 🎮 Code | Vòng Đời Cốc — bottleneck cốc clean→in_use→dirty→washing→clean | 🟡 | `codex/game-build-isolated` | 🔒S | Engine mới: cốc định danh, auto-rót/rửa, huỷ đơn trả cốc bẩn; regression + replay pass. Đang tích hợp UI/art. |
| F01 | 🎮 Code | Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k | 🟡 | `codex/game-build-isolated` | 🔒S | Ca 12 phút + closing, stamina hồi active, cap ngày; local save. Tỉnh Táo/segment và server time chưa hoàn tất. |
| F02 | ⚖️ Economy | Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Config 6 món; cold-menu bot 5 seed ≥500 lượt: k 2.2702–2.5072. Chưa đủ balance suite cho bếp mở hết. |
| F03 | 🎮 Code | Hệ Bàn — 3 bàn, serve theo Order | 🟡 | `codex/game-build-isolated` | 🔒S | Order cấp bàn, 1 chạm, grace, mua/nâng bàn. Giá ghế vượt mốc 10 và edge cases còn cần hoàn tất. |
| F05 | 🎮 Code | Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Timer cốc riêng, stale giữ payment/mất boa, hầm lạnh và 5 thời tiết. Unit/replay pass; art/feel QA còn thiếu. |
| F06 | 🎮 Code | Tip / Uy tín / Phạt — VIP ×10, grace window | 🟡 | `codex/game-build-isolated` | 🔒S | Per-customer tip, VIP, phạt, cap và ba ledger đã có; Tỉnh Táo/kick-all/queue cần rà tiếp. |
| F08 | 🎮 Code | Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Lịch light/heavy cơ bản, modifiers chạy engine; chưa full seeded schedule/football/telegraph QA. |

### Phase 1: Vòng phục vụ lõi + onboarding (M1–M2 — lưu localStorage)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F24 | 🎨 Design | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | 🟡 | `codex/game-build-isolated` | 🔒S | React/CSS sân quán, HUD/sheets/popover native. 3 viewport không tràn ngang; 41 sprite placeholders. Art thật chưa đủ. |
| F07 | 🎮 Code | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | 5 kiểu khách ngồi có trong engine. Shipper + football chưa nối đủ; occupied/rounds cần kiểm thử sâu. |
| F09 | ⚖️ Economy | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | 🟡 | `codex/game-build-isolated` | 🔒S | 5 thời tiết từ config; áp freshness/patience/spawn/tip. Còn sprite/ambient và statistical QA. |
| F10 | 🎮 Code | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; business unlocks và cốc mua còn thiếu. |
| F25 | 🎮 Code | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca) | 🟡 | `codex/game-build-isolated` | 🔒S | Guest local + vi/en + backup/replay đã có; Google/claim/cloud ở M4 chưa có. |
| F27 | 🎮 Code | Onboarding — ca 1 = 1 khách 1 bia, thông báo mất khách, step guide (lần đầu + sau 3 lần mất khách) | 🟡 | `codex/game-build-isolated` | 🔒S | Guide theo events/config, skip/persist + giới hạn chạy lại. Browser/unit pass; Google giữa ca + playtest 5 người chưa có. |

### Phase 2: Đủ demand-mix (M3)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F11 | 🎮 Code | Bếp & Mồi Nóng — bếp 4 cấp, 3 mồi nóng | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Cấu hình 3 mồi nóng + prep/slot bếp đã có. Chưa đủ acceptance test bếp nâng hết và cân bằng menu. |
| F17 | 🎮 Code | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | ⬜ | `—` | 🔒S | Spec `docs/features/F17-quest-system.md`. Pool lớn hơn gốc. |

### Phase 3: Server + meta + risk (M4–M6 — server-authoritative từ M4)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F23 | 🎮 Code | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | ⬜ | `—` | 🔒S | Spec `docs/features/F23-server-architecture.md`. **localStorage trước (M1) → server ở M4**; §8 mất mạng/reconnect. |
| F12 | 🎮 Code | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F12-league-seasons.md`. Phân Hạng 7d / Tranh Bá 14d. |
| F13 | 🎮 Code | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | ⬜ | `—` | 🔒S | Spec `docs/features/F13-life-path.md`. |
| F14 | 🎮 Code | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F14-locations.md`. |
| F15 | 🎮 Code | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | ⬜ | `—` | 🔒S | Spec `docs/features/F15-risk-events.md`; §4 kiểm tra pending, `risk.inspection.enabled=false`. |
| F16 | 🎮 Code | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ | `—` | 🔒S | Spec `docs/features/F16-referral-badges.md`. |
| F28 | 🎮 Code | Bảng Xếp Hạng & Bàn Thờ Ông Địa — top N, hàng của tôi, snapshot kết Vụ | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F28-leaderboard.md`; config `leaderboard` tier A. Mốc M5. |
| F18 | 🎮 Code | Chó Giữ Quán — combat bảo kê, bảo hiểm trộm | ⬜ | `—` | 🔒S | Spec `docs/features/F18-dog-guard.md`. |
| F22 | 🎮 Code | Bia Đấm — LLM server-side, quota 20/ngày | ⬜ | `—` | 🔒S | Spec `docs/features/F22-ai-assistant.md`. Tùy feasibility. |
| F26 | 🎮 Code | ~~Vé Mở Ca & Thanh Toán~~ — ⛔ **bỏ 08/09: chơi free hết** | ⏸ | `—` | — | Spec `docs/features/F26-daily-session-pass-payments.md`. Cần payment/provider review. |

### Phase 4: Vé Mở Ca + sự kiện (M7–M8)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F19 | 🎮 Code | Cúp Bóng Đá — lịch + tỉ số thật, TV, Giờ Vàng xem bóng | ⬜ | `—` | 🔒S | Spec `docs/features/F19-world-cup-event.md` + `07-SPEC-shop-mua-giai-worldcup.md`. Cần nguồn API. |
| F20 | 🎮 Code | Mời Bia Hơi — **monetization duy nhất**, donate cho admin, cosmetic-only, KHÔNG P2W (mốc M7) | ⬜ | `—` | 🔒S | Spec `docs/features/F20-donation.md`. |
| F21 | ⚖️ Economy | Vé Số Lấy Hên — xổ số/Vietlott, **cần legal review** | ⬜ | `—` | 🔒S | Spec `docs/features/F21-lottery.md`. EV target 0.6–0.8 (sink); blocked tới legal review. |

---

## 5. Progress summary

| Phase | Total | Done (✅) | In progress (🟡) | Blocked | Deferred | % |
|-------|:-----:|:--------:|:----------------:|:-------:|:--------:|:-:|
| 0 — Nền (M0) | 7 | 0 | 7 | 0 | 0 | 0% |
| 1 — Lõi + onboarding (M1–M2) | 6 | 0 | 6 | 0 | 0 | 0% |
| 2 — Demand-mix (M3) | 2 | 0 | 1 | 0 | 0 | 0% |
| 3 — Server + meta + risk (M4–M6) | 10 | 0 | 0 | 0 | 1 | 0% |
| 4 — Vé Mở Ca + sự kiện (M7–M8) | 3 | 0 | 0 | 0 | 0 | 0% |
| **MVP total** | **28** | **0** | **14** | **0** | **1** | **0%** |

> **Reset 2026-09-08 theo `06-ROADMAP` v3.0:** game viết lại từ đầu, chưa mở M0 → mọi feature ⬜. Prototype (`prototype/`) là lưu trữ, không tính. Thêm F27 (onboarding, M2) và F28 (bảng xếp hạng, M5) → 28 feature. Cột "Phase" giữ tên để dashboard-engine parse; mốc thật xem ROADMAP.

---

## Changelog (append-only)

| Ver | Thay đổi |
|-----|----------|
| v0.1.0 | Tracker đầu: 24 feature F01–F24 group theo Phase 0–4, toàn bộ ⬜ (pre-code). Input cho dashboard-engine port từ MyMoneyWent. |
| v0.2.0 | Gắn spec triển khai mới cho F07-F24 dưới `docs/features/`; không đổi trạng thái code. |
| v0.3.0 | Thêm F25 Ngôn Ngữ/Tài Khoản và F26 Vé Mở Ca/Thanh Toán; tổng feature 26, không đổi trạng thái code. |
| v0.4.0 | Đồng bộ với `06-ROADMAP` v2.5: prototype Phase 0 đã code → F04/F05 ✅, F01/F02/F03/F06/F07/F08 🟡; tổng ~22%. Ghi kết quả sim đo k=1.63 (506 lượt, 2026-07-02, dưới dải 2.0–3.0). Bỏ nhãn "pre-code 0%". |
| v0.5.0 | Đồng bộ merged cadence + sim fail-closed (2026-07-15): 5 seed k=2.24–2.34, normal loss 0%, peak loss 26.1–40.8%; automated gate pass, Phase 0 vẫn chờ Alpha playtest feel. |
| v0.6.0 | Đồng bộ sau audit repo (2026-09-08). **Không đổi status feature nào** — đúng thực tế: không có tiến triển gameplay từ 15/07. Sửa phạm vi header F01–F24 → **F01–F26** (F25/F26 đã có từ v0.3.0); ghi nhận sim gate được **tái lập độc lập 24/08**; đánh dấu rõ Alpha playtest là gate treo ~8 tuần và là điều kiện DUY NHẤT để các ô 🟡 Phase 0 chuyển ✅; trỏ `06-ROADMAP` v2.7. |
| v0.7.0 | **Reset theo ROADMAP v3.0 (2026-09-08):** game mới 0 %, mọi feature ⬜, branch `—`; prototype thành ghi chú lưu trữ ở Phase 0; heading Phase N ánh xạ mốc M0–M9 (giữ khoá parser); thêm F27 + F28 → 28 feature; ghi chú F11 bếp 4 cấp, F15 kiểm tra pending, F23 localStorage→server M4. |
| v0.7.1 | Chủ dự án 08/09: chơi free hết → F26 ⏸ (bỏ, không build); F20 = monetization duy nhất (M7). |

| v0.8.0 | Build mới: M0 có evidence; 14 feature đang triển khai, chưa gắn ✅ cho full feature/release. Cập nhật ghi chú engine/web thật và giới hạn còn lại; chi tiết `docs/build-progress.md`. |
