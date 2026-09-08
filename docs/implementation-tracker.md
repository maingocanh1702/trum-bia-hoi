# Implementation Tracker — Trùm Bia Hơi

> **Version:** v0.9.0
> **Ngày tạo:** 2026-06-09 · **Cập nhật:** 2026-09-09 (layout/art theo ảnh owner)
> **Trạng thái:** Active — **M0 qua verify; review sửa lỗi nền và layout/art đã CLEAN. M1–M3 tiếp tục triển khai; asset/release chưa hoàn tất.** `prototype/` đã lưu trữ (kết quả cũ ghi ở ghi chú Phase 0, không tính tiến độ). Đồng bộ `06-ROADMAP` **v3.0** (1 phase, mốc M0–M9).
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
| F01 | 🎮 Code | Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k | 🟡 | `codex/game-build-isolated` | 🔒S | Ca 12 phút + closing, hidden/offline pause, cap qua nửa đêm VN; save v2 đọc v1. Tỉnh Táo/segment và server time chưa hoàn tất. |
| F02 | ⚖️ Economy | Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Config 6 món; Mỗi profile 5 seed ≥500 lượt: cold k 2.3249–2.4498, full-menu 2.4766–2.7020; chưa đủ full M3 acceptance. |
| F03 | 🎮 Code | Hệ Bàn — 3 bàn, serve theo Order | 🟡 | `codex/game-build-isolated` | 🔒S | Order cấp bàn, 1 chạm, grace, mua/nâng bàn. Giá ghế vượt mốc 10 và edge cases còn cần hoàn tất. |
| F05 | 🎮 Code | Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Timer cốc riêng, stale giữ payment/mất boa, hầm lạnh và 5 thời tiết. Unit/replay pass; art/feel QA còn thiếu. |
| F06 | 🎮 Code | Tip / Uy tín / Phạt — VIP ×10, grace window | 🟡 | `codex/game-build-isolated` | 🔒S | Per-customer tip, VIP, phạt, cap và ba ledger đã có; Queue patience + không phạt lại bàn đã phục vụ đã có regression; Tỉnh Táo rules v3 qua kiểm thử/review không findings tại c984541; phí đóng ca rules v4 có xác nhận live/shiftId/maxCost, review CLEAN tại 5bce63c; tiễn từng bàn bằng uy tín còn tiếp tục. |
| F08 | 🎮 Code | Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Lịch light/heavy cơ bản + modifiers; rules v5 sửa clock khi closing/finalize, warning config/HUD active ưu tiên, replay v4 thật. 55 unit/config/build/sim xanh; đang review, full seeded schedule/lunch/football/priority còn tiếp tục. |

### Phase 1: Vòng phục vụ lõi + onboarding (M1–M2 — lưu localStorage)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F24 | 🎨 Design | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | 🟡 | `codex/game-build-isolated` | 🔒S | Sân xanh/cảnh phố, HUD gọn, quầy trên, kho dọc, thẻ mâm khi chạm bàn. 12 E2E pass; review CLEAN tại `2d80437`. 14 art draft, 30 sprite placeholders; chưa đủ art/release. |
| F07 | 🎮 Code | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | 5 kiểu khách ngồi có trong engine. Shipper + football chưa nối đủ; occupied/rounds cần kiểm thử sâu. |
| F09 | ⚖️ Economy | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | 🟡 | `codex/game-build-isolated` | 🔒S | 5 thời tiết từ config; áp freshness/patience/spawn/tip. Còn sprite/ambient và statistical QA. |
| F10 | 🎮 Code | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; business unlocks và cốc mua còn thiếu. |
| F25 | 🎮 Code | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca) | 🟡 | `codex/game-build-isolated` | 🔒S | Guest local + vi/en + backup/replay v1→v2 + import/reset giữ bản cũ đã có; Google/claim/cloud ở M4 chưa có. |
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

| 2026-09-08 owner UI/art | F24 tiếp tục triển khai: tham khảo 7 asset boards owner gửi. F06/F27 loss feedback dùng toast xu/uy tín thực trừ; 16 unit tests, targeted 12-minute browser test, config/build và 5-seed sim xanh. Không thay đổi trạng thái hoàn tất feature. |

| 2026-09-08 runtime refinement | Config startup guards, retail restock UI and cold/full-menu five-seed sim; 17 unit + 6 browser tests pass. Foundation review has open findings recorded in docs/build-progress.md; feature completion remains 0/28. |

| 2026-09-08 | v0.8.1: review fixes local history/pause/recovery/cap/rounds; 26 unit + 9 E2E pass, 10-row sim cold/full menu giữ k; vẫn 14 đang triển khai, 0 hoàn tất. |

| 2026-09-09 | v0.8.2: review sửa lỗi nền CLEAN tại `830787c`; 27 unit và k 2.3249–2.7020. Layout/art theo ảnh owner với 10 PNG draft, thẻ bàn sống/đóng khi expiry, toast loss chỉ số/icon. Build/config, asset manifest và 11 E2E xanh; review UI mới chờ riêng. Không thay đổi số feature hoàn tất. |

| 2026-09-09 interaction QA | Nút kho mở rộng 46×48px sau khi đo thấy 38px; thêm kiểm tra kích thước, đổi bàn bằng bàn phím và focus sau expiry. Build + 11 E2E xanh; không đổi trạng thái feature. |

| 2026-09-09 review UI | Sửa 6 findings: nhãn HUD cho đọc màn hình, focus, timer grace, nhận diện nhóm khách, ghế trùng và provenance ghế. 12 E2E xanh. Thêm 4 khách draft, còn 30 sprite placeholders; VIP còn halo cần art QA cuối. Review snapshot sửa lỗi đang chờ; feature vẫn đang triển khai. |

| v0.8.3 | Review độc lập toàn bộ UI/art `830787c..2d80437` CLEAN; 6 findings đóng. 27 unit + 12 E2E, config/build và 10 sim rows xanh. Goal full game vẫn active, feature hoàn tất chưa đổi; kế tiếp là Tỉnh Táo/luật M3. |

| v0.8.4 | IMG_5002–5006: thêm chuỗi UI phục vụ với bubble món thật, readiness ✓, +xu đúng ledger, biểu cảm từng khách và timer nhâm nhi. 27 unit + 16 E2E xanh; review độc lập slice mới đang chờ. M3 Tỉnh Táo vẫn kế tiếp; không đổi số feature hoàn tất. |

| v0.8.5 | Review độc lập chuỗi UI phục vụ `fa79232..1e30b78` CLEAN; config/build + 27 unit/16 E2E xanh. Ảnh before/panel/after đã kiểm tra; chỉ UI thay đổi, không đổi engine/economy. Tiếp tục M3 Tỉnh Táo, full game chưa hoàn tất. |

| v0.8.6 | Tỉnh Táo rules v3: rest wall-time/open-day, bonus qua credit cap, HUD/sổ ca, replay v1/v2 giữ nguyên. 38 unit + 18 E2E; sim thường và có thưởng đều k 2.3249–2.7020, config/build xanh. Review độc lập đang chờ; full F06/M3 và game vẫn đang triển khai. |

| v0.8.7 | Review Tỉnh Táo `fe5e9dc..c984541` không findings; reviewer chạy lại 38 tests + typecheck. Verify commit cố định: config/build/38 unit/18 E2E và 20 sim rows đạt. Kế tiếp phí đóng ca; F06/M3/full game vẫn chưa hoàn tất. |

| v0.8.8 | Phí mời tất cả về rules v4: quote/confirm live, debit qua spent, currentGuests chung UI/quote, không phạt bỏ đi lại. Fixture v3 thật giữ lịch sử; 22 E2E xanh. Review đang chờ, F06/M3/full game vẫn đang triển khai. |

| v0.8.9 | Manual-close review 858615e..5bce63c CLEAN; reviewer 46 tests/typecheck, local 22 E2E/config/build/sim xanh. F06/M3/full game tiếp tục; chưa merge/push. |

| v0.9.0 | F08 tiếp tục: rush v5 giữ đúng active slot khi closing/finalize, warning theo config và HUD ưu tiên đợt đang chạy; legacy replay giữ nguyên. 55 unit/config/build/sim xanh, đang review. |
