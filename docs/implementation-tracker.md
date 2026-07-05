# Implementation Tracker — Trùm Bia Hơi

> **Version:** v0.4.0
> **Ngày tạo:** 2026-06-09 · **Cập nhật:** 2026-07-02
> **Trạng thái:** Active — **Phase 0 prototype đã code** (engine+UI+sim, `tsc` pass). Đồng bộ theo `06-ROADMAP` v2.5 (~22%). Chờ exit-gate: đo k.
> **Owner:** Team
> **Mục đích:** Master status board cho mọi feature F01–F24 (Phase 0 → 4). Là **input cho dashboard-engine** (`tools/dashboard-engine/build_dashboard.py`). Nguồn quyết định/scope = `02-GDD-trum-bia-hoi.md` + `06-ROADMAP-trum-bia-hoi.md`; tracker chỉ theo dõi **trạng thái build**.
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

**PR ID** = mã feature F01–F24 (khớp `06-ROADMAP`). Branch để trống tới khi có git repo.

---

## 1. Status board — Phase 0 → 4

### Phase 0: Prototype (validate feel + đo k)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F04 | 🎮 Code | Vòng Đời Cốc — bottleneck cốc clean→in_use→dirty→washing→clean | ✅ | `prototype/` | 🔒S | Lõi đủ (`engine/engine.ts`). Bottleneck build trước. |
| F01 | 🎮 Code | Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k | 🟡 | `prototype/` | 🔒S | ca 12' + trần ngày 500k xong; thể lực persist deferred → Phase 1 (`stamina-day-budget`). |
| F02 | ⚖️ Economy | Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k | 🟡 | `prototype/` | 🔒S 🔒B | 3/6 món. **Sim đo k=1.63** (2026-07-02, 506 lượt) — DƯỚI dải 2.0–3.0, cần tune. |
| F03 | 🎮 Code | Hệ Bàn — 3 bàn, serve theo Order | 🟡 | `prototype/` | 🔒S | 3 bàn + serve-theo-Order + queue; chưa 4 cấp/mua-nâng cấp. |
| F05 | 🎮 Code | Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm | ✅ | `prototype/` | 🔒S 🔒P | Lõi đủ (tip×0 khi hết hơi, cờ vàng). Chờ playtest feel. |
| F06 | 🎮 Code | Tip / Uy tín / Phạt — VIP ×10, grace window | 🟡 | `prototype/` | 🔒S | Có tip; chưa uy tín/phạt cụm. |
| F08 | 🎮 Code | Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor | 🟡 | `prototype/` | 🔒S 🔒P | P0: toggle normal/peak xong; P1/P2 (lịch/full) chưa. |

### Phase 1: MVP + Art v1

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F24 | 🎨 Design | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | ⬜ | `—` | 🔒S | Spec `05` + `docs/features/F24-design-uiux-production.md`. Thay placeholder bằng art thật. |
| F07 | 🎮 Code | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 | `prototype/` | 🔒S 🔒B | 3/6 loại (thường/vội/VIP) đã code ở mức lõi Phase 0; đủ ở P2. |
| F09 | ⚖️ Economy | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | ⬜ | `—` | 🔒S | Spec `docs/features/F09-weather.md`. Đầy đủ ở P2. |
| F10 | 🎮 Code | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F10-upgrades.md`. Đầy đủ ở P2. |
| F25 | 🎮 Code | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login | ⬜ | `—` | 🔒S | Spec `docs/features/F25-localization-account.md`. |

### Phase 2: Mở rộng core

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F11 | 🎮 Code | Bếp & Mồi Nóng — bếp 2 cấp, 3 mồi nóng | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F11-kitchen-hot-dishes.md`. Đủ 6 món. |
| F17 | 🎮 Code | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | ⬜ | `—` | 🔒S | Spec `docs/features/F17-quest-system.md`. Pool lớn hơn gốc. |

### Phase 3: Meta & social

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F23 | 🎮 Code | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | ⬜ | `—` | 🔒S | Spec `docs/features/F23-server-architecture.md`. Chuyển client-only → server. |
| F12 | 🎮 Code | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F12-league-seasons.md`. Phân Hạng 7d / Tranh Bá 14d. |
| F13 | 🎮 Code | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | ⬜ | `—` | 🔒S | Spec `docs/features/F13-life-path.md`. |
| F14 | 🎮 Code | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F14-locations.md`. |
| F15 | 🎮 Code | Sự Cố Quán Nhậu — bảo kê, kiểm tra ATTP, trộm offline | ⬜ | `—` | 🔒S | Spec `docs/features/F15-risk-events.md`. |
| F16 | 🎮 Code | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ | `—` | 🔒S | Spec `docs/features/F16-referral-badges.md`. |
| F18 | 🎮 Code | Chó Giữ Quán — combat bảo kê, bảo hiểm trộm | ⬜ | `—` | 🔒S | Spec `docs/features/F18-dog-guard.md`. |
| F22 | 🎮 Code | Bia Đấm — LLM server-side, quota 20/ngày | ⬜ | `—` | 🔒S | Spec `docs/features/F22-ai-assistant.md`. Tùy feasibility. |
| F26 | 🎮 Code | Vé Mở Ca & Thanh Toán — free 1 ca/ngày, paid unlock daily cap | ⬜ | `—` | 🔒S | Spec `docs/features/F26-daily-session-pass-payments.md`. Cần payment/provider review. |

### Phase 4: Event & sink (cần review)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F19 | 🎮 Code | Cúp Bóng Đá — lịch + tỉ số thật, TV, Giờ Vàng xem bóng | ⬜ | `—` | 🔒S | Spec `docs/features/F19-world-cup-event.md` + `07-SPEC-shop-mua-giai-worldcup.md`. Cần nguồn API. |
| F20 | 🎮 Code | Mời Bia Hơi — cosmetic-only, KHÔNG P2W | ⬜ | `—` | 🔒S | Spec `docs/features/F20-donation.md`. |
| F21 | ⚖️ Economy | Vé Số Lấy Hên — xổ số/Vietlott, **cần legal review** | ⬜ | `—` | 🔒S | Spec `docs/features/F21-lottery.md`. EV target 0.6–0.8 (sink); blocked tới legal review. |

---

## 5. Progress summary

| Phase | Total | Done (✅) | In progress (🟡) | Blocked | Deferred | % |
|-------|:-----:|:--------:|:----------------:|:-------:|:--------:|:-:|
| 0 — Prototype | 7 | 2 | 5 | 0 | 0 | ~30% |
| 1 — MVP + Art v1 | 5 | 0 | 1 | 0 | 0 | ~5% |
| 2 — Mở rộng core | 2 | 0 | 0 | 0 | 0 | 0% |
| 3 — Meta & social | 9 | 0 | 0 | 0 | 0 | 0% |
| 4 — Event & sink | 3 | 0 | 0 | 0 | 0 | 0% |
| **MVP total** | **26** | **2** | **6** | **0** | **0** | **~22%** |

> Tổng ~22% khớp `06-ROADMAP` v2.5. Lõi Phase 0 đã chạy: F04+F05 ✅ đủ phạm vi phase; F01/F02/F03/F06/F08 (+F07 ở P1) 🟡 mới phần lõi Phase 0. **Exit-gate còn lại: đo `k_value`.** Sim headless (506 lượt, 2026-07-02) cho **k=1.63 — DƯỚI dải 2.0–3.0** → cần tune economy hoặc xác nhận bằng chơi tay (`npm run dev`) trước khi mở Phase 1. (Bot k ≠ hand-play k theo lưu ý trong sim.)

---

## Changelog (append-only)

| Ver | Thay đổi |
|-----|----------|
| v0.1.0 | Tracker đầu: 24 feature F01–F24 group theo Phase 0–4, toàn bộ ⬜ (pre-code). Input cho dashboard-engine port từ MyMoneyWent. |
| v0.2.0 | Gắn spec triển khai mới cho F07-F24 dưới `docs/features/`; không đổi trạng thái code. |
| v0.3.0 | Thêm F25 Ngôn Ngữ/Tài Khoản và F26 Vé Mở Ca/Thanh Toán; tổng feature 26, không đổi trạng thái code. |
| v0.4.0 | Đồng bộ với `06-ROADMAP` v2.5: prototype Phase 0 đã code → F04/F05 ✅, F01/F02/F03/F06/F07/F08 🟡; tổng ~22%. Ghi kết quả sim đo k=1.63 (506 lượt, 2026-07-02, dưới dải 2.0–3.0). Bỏ nhãn "pre-code 0%". |
