# Trùm Bia Hơi — Progress Dashboard

> **Auto-generated** từ [`implementation-tracker.md`](implementation-tracker.md) bằng `tools/dashboard-engine/build_dashboard.py`.
> KHÔNG edit trực tiếp — sửa tracker rồi rebuild.
> **Cập nhật:** 2026-09-09 09:56 · **Branch hiện tại:** `codex/game-build-isolated`

Để xem dashboard HTML đẹp hơn: mở [`dashboard.html`](dashboard.html) bằng browser.

---

## Tổng quan

- **MVP progress:** **0%** (0/28 PR merged)
- **In flight:** 17 PR · **Blocked:** 0 · **Deferred:** 1
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
| `F17` | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |

### Phase 3 — 0/10 · 0% `░░░░░░░░░░`

| PR | Feature | Status | Computed | Branch |
|----|---------|:------:|:--------:|--------|
| `F23` | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | ⬜ Not started | — | `—` |
| `F12` | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | ⬜ Not started | — | `—` |
| `F13` | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
| `F14` | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | ⬜ Not started | — | `—` |
| `F15` | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | ⬜ Not started | — | `—` |
| `F16` | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ Not started | — | `—` |
| `F28` | Bảng Xếp Hạng & Bàn Thờ Ông Địa — top N, hàng của tôi, snapshot kết Vụ | ⬜ Not started | — | `—` |
| `F18` | Chó Giữ Quán — combat bảo kê, bảo hiểm trộm | 🟡 In progress | IN_PROGRESS ✓ normal | `codex/game-build-isolated` |
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
- **Notes:** Ca 12 phút + closing, hidden/offline pause, cap qua nửa đêm VN; save v2 đọc v1. Tỉnh Táo đã verify/review ở rules v3; segment và server time chưa hoàn tất.

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
- **Notes:** Per-customer tip, VIP, phạt, cap và ba ledger đã có; Queue patience + không phạt lại bàn đã phục vụ đã có regression; Tỉnh Táo rules v3 qua kiểm thử/review không findings tại c984541; phí đóng ca rules v4 có xác nhận live/shiftId/maxCost, review CLEAN tại 5bce63c; tiễn từng bàn bằng uy tín còn tiếp tục.

### F08 — Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒P
- **Phase:** Phase 0
- **Notes:** Rules v8: seeded ordinary schedule, full warning/fit, heavy enjoy, báo cáo Sổ ca VI/EN; giữ lịch/replay v7.85 unit/34 E2E/config/build xanh;50 sim rows k2.2622–2.7625 +15 pressure rows. Review đầy đủ6535484..5e46cf1 không có lỗi actionable; lunch/football/priority và full acceptance tiếp tục.

### F24 — Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎨 Design
- **Gates:** 🔒S
- **Phase:** Phase 1
- **Notes:** Sân xanh/cảnh phố, HUD gọn, quầy trên, kho dọc, thẻ mâm khi chạm bàn. 12 E2E pass; review CLEAN tại `2d80437`. Bếp/mồi nóng thêm7 sprite native RGBA; manifest hiện23 sprite placeholders và97 draft files gồm audio. Chưa đủ art/release.

### F07 — Các Kiểu Khách — 3 loại P1 (thường/vội/VIP)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒B
- **Phase:** Phase 1
- **Notes:** 5 kiểu khách ngồi; shipper local v7 có timer riêng, giao cả đơn, cap/timeout/closing/replay và UI điện thoại. Review shipper CLEAN tại307a3b0; football và acceptance đầy đủ còn thiếu.

### F09 — Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** ⚖️ Economy
- **Gates:** 🔒S
- **Phase:** Phase 1
- **Notes:** 5 thời tiết từ config; rules10 sửa thứ tự baseline để hot/humid thực sự tăng nhịp khách, giữ active-rush floor và replay v9. 100 unit/37 E2E +20 k rows đã qua; review độc lập full diff2959544..432626d không có lỗi actionable. Sprite/ambient và full statistical QA tiếp tục.

### F10 — Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S 🔒B
- **Phase:** Phase 1
- **Notes:** Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; phone/QR quote/gate/command/UI + boa qua review không còn findings tại598f66f; Biển rules9 lắp/đổi5 kiểu, gate uy tín, customer mix/Neon +5 sprite draft;95 unit/37 E2E xanh, full-diff review bdbb493..9239007 không còn findings sau3 sửa lỗi biên. Tờ rơi rules11 có mua bằng uy tín, LP2, kho/timer/báo cáo/UI VI-EN;108 unit/40 E2E +30 k rows qua; full-diff review360453e..d5be3e0 không có lỗi actionable, nghi vấn nhân k đã bị bác bằng thực thi. Cốc mua, free flyer daily5/5 và full F10 tiếp tục.

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
- **Notes:** Live bếp VI/EN đọc Item timestamps, slots0–4, hàng chờ/stock/ready và link phục vụ cả mâm;7 focused unit/7 browser, full133 unit/59 E2E/config/build và10 k rows2.2564–2.65 xanh.7 sprite bếp/mồi nóng mới giữ draft; full-base reviewf9fa82f..af16833 không phát hiện lỗi cần sửa, reviewer tự chạy133 unit/typecheck/assets. Per-dish waste/menu-mix analytics và demand/acceptance đầy đủ còn tiếp tục.

### F17 — Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT)

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 2
- **Notes:** Rules12 daily5: seed VN/tier, actual event progress, rollover, reward/bonus guards/UI VI-EN; đã sửa P1 review về mốc onboarding mở nhiệm vụ.118 unit/46 E2E/config/build,20 k rows2.3171–2.7312 qua; full-base review3f978ec..e551b40 không còn lỗi actionable. Rules13 thêm điểm danh theo ngày active, claim uy tín một lần, đổi vòng/reset/offline/replay và ladder VI-EN;126 unit/52 E2E/config/build và20 k rows2.2564–2.8277 xanh; full-base review483bb03..d232be5 không nêu lỗi cần sửa. Gift transfer/referral/season authority và full F17 còn tiếp tục.

### F13 — Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 3
- **Notes:** V6 projection đủ requirements/rewards, level tăng bền + claim một lần; ladder VI/EN và phone/QR. 67 unit/30 E2E +40 sim rows k2.3249–2.7688; review d2918e9..598f66f không còn findings. Flyer/signboard ownership đã có producer; season/peak/location/server và full acceptance còn tiếp tục.

### F18 — Chó Giữ Quán — combat bảo kê, bảo hiểm trộm

- **Status:** 🟡 In progress · 🌿 đang trên branch này
- **Branch:** `codex/game-build-isolated`
- **Wave:** 🎮 Code
- **Gates:** 🔒S
- **Phase:** Phase 3
- **Notes:** Mua/nâng 3 cấp từ config, debit chung + replay; sheet VI/EN, hình cùng một chó 3 cấp và reduced motion. Review CLEAN tại 0216cb0, config/build/60 unit/28 E2E/asset/sim pass; combat/capture/theft/server chưa có.

## Up next

| PR | Feature | Phase | Status |
|----|---------|-------|--------|
| `F23` | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | Phase 3 | ⬜ Not started |
| `F12` | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | Phase 3 | ⬜ Not started |
| `F14` | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | Phase 3 | ⬜ Not started |
| `F15` | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | Phase 3 | ⬜ Not started |
| `F16` | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | Phase 3 | ⬜ Not started |

---

**Rebuild:** chạy `python3 tools/dashboard-engine/build_dashboard.py` sau mỗi lần đổi status trong [`implementation-tracker.md`](implementation-tracker.md).
