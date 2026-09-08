# Trùm Bia Hơi — Progress Dashboard

> **Auto-generated** từ [`implementation-tracker.md`](implementation-tracker.md) bằng `tools/dashboard-engine/build_dashboard.py`.
> KHÔNG edit trực tiếp — sửa tracker rồi rebuild.
> **Cập nhật:** 2026-09-09 01:58 · **Branch hiện tại:** `codex/game-build-isolated`

Để xem dashboard HTML đẹp hơn: mở [`dashboard.html`](dashboard.html) bằng browser.

---

## Tổng quan

- **MVP progress:** **0%** (0/28 PR merged)
- **In flight:** 14 PR · **Blocked:** 0 · **Deferred:** 1
- **Lộ trình (baseline 06-ROADMAP v3.0):** 1 phase, mốc M0–M9 theo exit criteria — chưa gán ngày; Phase N ở đây = khoá parser (P0→M0 · P1→M1–M2 · P2→M3 · P3→M4–M6 · P4→M7–M8)

## Phase progress

| Phase | Merged / Total | % | Progress |
|-------|:--------------:|:-:|:---------|
| Phase 0 | 0 / 7 | 0% | `░░░░░░░░░░` |
| Phase 1 | 0 / 6 | 0% | `░░░░░░░░░░` |
| Phase 2 | 0 / 2 | 0% | `░░░░░░░░░░` |
| Phase 3 | 0 / 10 | 0% | `░░░░░░░░░░` |
| Phase 4 | 0 / 3 | 0% | `░░░░░░░░░░` |

## Phase breakdown — features & tasks

### Phase 0 — 0/7 · 0% `░░░░░░░░░░`

| PR | Feature | Status | Computed | Branch |
|----|---------|:------:|:--------:|--------|
| `F04` | Vòng Đời Cốc — bottleneck cốc clean→in_use→dirty→washing→clean | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F01` | Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F02` | Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F03` | Hệ Bàn — 3 bàn, serve theo Order | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F05` | Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F06` | Tip / Uy tín / Phạt — VIP ×10, grace window | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F08` | Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |

### Phase 1 — 0/6 · 0% `░░░░░░░░░░`

| PR | Feature | Status | Computed | Branch |
|----|---------|:------:|:--------:|--------|
| `F24` | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F07` | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F09` | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F10` | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F25` | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca) | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F27` | Onboarding — ca 1 = 1 khách 1 bia, thông báo mất khách, step guide (lần đầu + sau 3 lần mất khách) | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |

### Phase 2 — 0/2 · 0% `░░░░░░░░░░`

| PR | Feature | Status | Computed | Branch |
|----|---------|:------:|:--------:|--------|
| `F11` | Bếp & Mồi Nóng — bếp 4 cấp, 3 mồi nóng | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F17` | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | ⬜ Not started | — | `—` |

### Phase 3 — 0/10 · 0% `░░░░░░░░░░`

| PR | Feature | Status | Computed | Branch |
|----|---------|:------:|:--------:|--------|
| `F23` | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | ⬜ Not started | — | `—` |
| `F12` | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | ⬜ Not started | — | `—` |
| `F13` | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | ⬜ Not started | — | `—` |
| `F14` | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | ⬜ Not started | — | `—` |
| `F15` | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | ⬜ Not started | — | `—` |
| `F16` | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ Not started | — | `—` |
| `F28` | Bảng Xếp Hạng & Bàn Thờ Ông Địa — top N, hàng của tôi, snapshot kết Vụ | ⬜ Not started | — | `—` |
| `F18` | Chó Giữ Quán — combat bảo kê, bảo hiểm trộm | ⬜ Not started | — | `—` |
| `F22` | Bia Đấm — LLM server-side, quota 20/ngày | ⬜ Not started | — | `—` |
| `F26` | ~~Vé Mở Ca & Thanh Toán~~ — ⛔ **bỏ 08/09: chơi free hết** | ⏸ Deferred | — | `—` |

### Phase 4 — 0/3 · 0% `░░░░░░░░░░`

| PR | Feature | Status | Computed | Branch |
|----|---------|:------:|:--------:|--------|
| `F19` | Cúp Bóng Đá — lịch + tỉ số thật, TV, Giờ Vàng xem bóng | ⬜ Not started | — | `—` |
| `F20` | Mời Bia Hơi — **monetization duy nhất**, donate cho admin, cosmetic-only, KHÔNG P2W (mốc M7) | ⬜ Not started | — | `—` |
| `F21` | Vé Số Lấy Hên — xổ số/Vietlott, **cần legal review** | ⬜ Not started | — | `—` |

## Timeline

> Chưa gán ngày — `06-ROADMAP` v3.1 chạy theo mốc M0–M9 với exit criteria, không theo lịch. Điền `PHASE_DATES` trong `tools/dashboard-engine/build_dashboard.py` khi team chốt ước lượng.

## Đang làm

### F04 — Vòng Đời Cốc — bottleneck cốc clean→in_use→dirty→washing→clean

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 0
- **Notes:** Engine mới: cốc định danh, auto-rót/rửa, huỷ đơn trả cốc bẩn; regression + replay pass. Đang tích hợp UI/art.

### F01 — Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 0
- **Notes:** Ca 12 phút + closing, hidden/offline pause, cap qua nửa đêm VN; save v2 đọc v1. Tỉnh Táo/segment và server time chưa hoàn tất.

### F02 — Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** ⚖️ Economy
- **Gates:** 🔒S 🔒B
- **Phase:** Phase 0
- **Notes:** Config 6 món; Mỗi profile 5 seed ≥500 lượt: cold k 2.3249–2.4498, full-menu 2.4766–2.7020; chưa đủ full M3 acceptance.

### F03 — Hệ Bàn — 3 bàn, serve theo Order

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 0
- **Notes:** Order cấp bàn, 1 chạm, grace, mua/nâng bàn. Giá ghế vượt mốc 10 và edge cases còn cần hoàn tất.

### F05 — Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒P
- **Phase:** Phase 0
- **Notes:** Timer cốc riêng, stale giữ payment/mất boa, hầm lạnh và 5 thời tiết. Unit/replay pass; art/feel QA còn thiếu.

### F06 — Tip / Uy tín / Phạt — VIP ×10, grace window

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 0
- **Notes:** Per-customer tip, VIP, phạt, cap và ba ledger đã có; Queue patience + không phạt lại bàn đã phục vụ đã có regression; Tỉnh Táo rules v3 đã qua kiểm thử, chờ review; tiễn bàn còn tiếp tục.

### F08 — Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒P
- **Phase:** Phase 0
- **Notes:** Lịch light/heavy cơ bản, modifiers chạy engine; chưa full seeded schedule/football/telegraph QA.

### F24 — Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎨 Design
- **Gates:** 🔒S
- **Phase:** Phase 1
- **Notes:** Sân xanh/cảnh phố, HUD gọn, quầy trên, kho dọc, thẻ mâm khi chạm bàn. 12 E2E pass; review CLEAN tại `2d80437`. 14 art draft, 30 sprite placeholders; chưa đủ art/release.

### F07 — Các Kiểu Khách — 3 loại P1 (thường/vội/VIP)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒B
- **Phase:** Phase 1
- **Notes:** 5 kiểu khách ngồi có trong engine. Shipper + football chưa nối đủ; occupied/rounds cần kiểm thử sâu.

### F09 — Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** ⚖️ Economy
- **Gates:** 🔒S
- **Phase:** Phase 1
- **Notes:** 5 thời tiết từ config; áp freshness/patience/spawn/tip. Còn sprite/ambient và statistical QA.

### F10 — Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒B
- **Phase:** Phase 1
- **Notes:** Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; business unlocks và cốc mua còn thiếu.

### F25 — Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 1
- **Notes:** Guest local + vi/en + backup/replay v1→v2 + import/reset giữ bản cũ đã có; Google/claim/cloud ở M4 chưa có.

### F27 — Onboarding — ca 1 = 1 khách 1 bia, thông báo mất khách, step guide (lần đầu + sau 3 lần mất khách)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 1
- **Notes:** Guide theo events/config, skip/persist + giới hạn chạy lại. Browser/unit pass; Google giữa ca + playtest 5 người chưa có.

### F11 — Bếp & Mồi Nóng — bếp 4 cấp, 3 mồi nóng

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒B
- **Phase:** Phase 2
- **Notes:** Cấu hình 3 mồi nóng + prep/slot bếp đã có. Chưa đủ acceptance test bếp nâng hết và cân bằng menu.

## Up next

| PR | Feature | Phase | Status |
|----|---------|-------|--------|
| `F17` | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | Phase 2 | ⬜ Not started |
| `F23` | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | Phase 3 | ⬜ Not started |
| `F12` | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | Phase 3 | ⬜ Not started |
| `F13` | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | Phase 3 | ⬜ Not started |
| `F14` | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | Phase 3 | ⬜ Not started |

---

**Rebuild:** chạy `python3 tools/dashboard-engine/build_dashboard.py` sau mỗi lần đổi status trong [`implementation-tracker.md`](implementation-tracker.md).
