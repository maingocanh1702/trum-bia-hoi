# Implementation Tracker — Trùm Bia Hơi

> **Version:** v0.16.1
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
| F01 | 🎮 Code | Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k | 🟡 | `codex/game-build-isolated` | 🔒S | Ca 12 phút + closing, hidden/offline pause, cap qua nửa đêm VN; save v2 đọc v1. Tỉnh Táo đã verify/review ở rules v3; segment và server time chưa hoàn tất. |
| F02 | ⚖️ Economy | Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Config 6 món; Mỗi profile 5 seed ≥500 lượt: cold k 2.3249–2.4498, full-menu 2.4766–2.7020; chưa đủ full M3 acceptance. |
| F03 | 🎮 Code | Hệ Bàn — 3 bàn, serve theo Order | 🟡 | `codex/game-build-isolated` | 🔒S | Order cấp bàn, 1 chạm, grace, mua/nâng bàn. Giá ghế vượt mốc 10 và edge cases còn cần hoàn tất. |
| F05 | 🎮 Code | Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Timer cốc riêng, stale giữ payment/mất boa, hầm lạnh và 5 thời tiết. Unit/replay pass; art/feel QA còn thiếu. |
| F06 | 🎮 Code | Tip / Uy tín / Phạt — VIP ×10, grace window | 🟡 | `codex/game-build-isolated` | 🔒S | Per-customer tip, VIP, phạt, cap và ba ledger đã có; Queue patience + không phạt lại bàn đã phục vụ đã có regression; Tỉnh Táo rules v3 qua kiểm thử/review không findings tại c984541; phí đóng ca rules v4 có xác nhận live/shiftId/maxCost, review CLEAN tại 5bce63c; tiễn từng bàn bằng uy tín còn tiếp tục. |
| F08 | 🎮 Code | Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Rules v8: seeded ordinary schedule, full warning/fit, heavy enjoy, báo cáo Sổ ca VI/EN; giữ lịch/replay v7.85 unit/34 E2E/config/build xanh;50 sim rows k2.2622–2.7625 +15 pressure rows. Review đầy đủ6535484..5e46cf1 không có lỗi actionable; lunch/football/priority và full acceptance tiếp tục. |

### Phase 1: Vòng phục vụ lõi + onboarding (M1–M2 — lưu localStorage)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F24 | 🎨 Design | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | 🟡 | `codex/game-build-isolated` | 🔒S | Sân xanh/cảnh phố, HUD gọn, quầy trên, kho dọc, thẻ mâm khi chạm bàn. 12 E2E pass; review CLEAN tại `2d80437`. 14 art draft, 30 sprite placeholders; chưa đủ art/release. |
| F07 | 🎮 Code | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | 5 kiểu khách ngồi; shipper local v7 có timer riêng, giao cả đơn, cap/timeout/closing/replay và UI điện thoại. Review shipper CLEAN tại307a3b0; football và acceptance đầy đủ còn thiếu. |
| F09 | ⚖️ Economy | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | 🟡 | `codex/game-build-isolated` | 🔒S | 5 thời tiết từ config; rules10 sửa thứ tự baseline để hot/humid thực sự tăng nhịp khách, giữ active-rush floor và replay v9. 100 unit/37 E2E +20 k rows đã qua; review độc lập full diff2959544..432626d không có lỗi actionable. Sprite/ambient và full statistical QA tiếp tục. |
| F10 | 🎮 Code | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; phone/QR quote/gate/command/UI + boa qua review không còn findings tại598f66f; Biển rules9 lắp/đổi5 kiểu, gate uy tín, customer mix/Neon +5 sprite draft;95 unit/37 E2E xanh, full-diff review bdbb493..9239007 không còn findings sau3 sửa lỗi biên. Tờ rơi rules11 có mua bằng uy tín, LP2, kho/timer/báo cáo/UI VI-EN;108 unit/40 E2E +30 k rows qua; full-diff review360453e..d5be3e0 không có lỗi actionable, nghi vấn nhân k đã bị bác bằng thực thi. Cốc mua, free flyer daily5/5 và full F10 tiếp tục. |
| F25 | 🎮 Code | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca) | 🟡 | `codex/game-build-isolated` | 🔒S | Guest local + vi/en + backup/replay v1→v2 + import/reset giữ bản cũ đã có; Google/claim/cloud ở M4 chưa có. |
| F27 | 🎮 Code | Onboarding — ca 1 = 1 khách 1 bia, thông báo mất khách, step guide (lần đầu + sau 3 lần mất khách) | 🟡 | `codex/game-build-isolated` | 🔒S | Guide theo events/config, skip/persist + giới hạn chạy lại. Browser/unit pass; Google giữa ca + playtest 5 người chưa có. |

### Phase 2: Đủ demand-mix (M3)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F11 | 🎮 Code | Bếp & Mồi Nóng — bếp 4 cấp, 3 mồi nóng | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Cấu hình 3 mồi nóng + prep/slot bếp đã có. Chưa đủ acceptance test bếp nâng hết và cân bằng menu. |
| F17 | 🎮 Code | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | 🟡 | `codex/game-build-isolated` | 🔒S | Rules12 daily5: seed VN/tier, actual event progress, rollover, reward/bonus guards/UI VI-EN; đã sửa P1 review về mốc onboarding mở nhiệm vụ.118 unit/46 E2E/config/build,20 k rows2.3171–2.7312 qua; full-base review lại pending. Gift transfer/attendance/referral/season authority và full F17 còn tiếp tục. |

### Phase 3: Server + meta + risk (M4–M6 — server-authoritative từ M4)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F23 | 🎮 Code | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | ⬜ | `—` | 🔒S | Spec `docs/features/F23-server-architecture.md`. **localStorage trước (M1) → server ở M4**; §8 mất mạng/reconnect. |
| F12 | 🎮 Code | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F12-league-seasons.md`. Phân Hạng 7d / Tranh Bá 14d. |
| F13 | 🎮 Code | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | 🟡 | `codex/game-build-isolated` | 🔒S | V6 projection đủ requirements/rewards, level tăng bền + claim một lần; ladder VI/EN và phone/QR. 67 unit/30 E2E +40 sim rows k2.3249–2.7688; review d2918e9..598f66f không còn findings. Flyer/signboard ownership đã có producer; season/peak/location/server và full acceptance còn tiếp tục. |
| F14 | 🎮 Code | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F14-locations.md`. |
| F15 | 🎮 Code | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | ⬜ | `—` | 🔒S | Spec `docs/features/F15-risk-events.md`; §4 kiểm tra pending, `risk.inspection.enabled=false`. |
| F16 | 🎮 Code | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ | `—` | 🔒S | Spec `docs/features/F16-referral-badges.md`. |
| F28 | 🎮 Code | Bảng Xếp Hạng & Bàn Thờ Ông Địa — top N, hàng của tôi, snapshot kết Vụ | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F28-leaderboard.md`; config `leaderboard` tier A. Mốc M5. |
| F18 | 🎮 Code | Chó Giữ Quán — combat bảo kê, bảo hiểm trộm | 🟡 | `codex/game-build-isolated` | 🔒S | Mua/nâng 3 cấp từ config, debit chung + replay; sheet VI/EN, hình cùng một chó 3 cấp và reduced motion. Review CLEAN tại 0216cb0, config/build/60 unit/28 E2E/asset/sim pass; combat/capture/theft/server chưa có. |
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
| 3 — Server + meta + risk (M4–M6) | 10 | 0 | 2 | 0 | 1 | 0% |
| 4 — Vé Mở Ca + sự kiện (M7–M8) | 3 | 0 | 0 | 0 | 0 | 0% |
| **MVP total** | **28** | **0** | **16** | **0** | **1** | **0%** |

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

| 2026-09-09 | v0.9.1 | Ghi nhận review rush clock b97ff07..1c18b2d không còn lỗi actionable; 55 unit/25 E2E, k 2.3249–2.7020. F08 và toàn bộ M0–M9 vẫn in progress. |

| 2026-09-09 | v0.9.2 | F18 bắt đầu với prerequisite mua/nâng chó 3 cấp, quote config/replay/UI/art draft; combat/protection/server còn tiếp tục, review pending. |

| 2026-09-09 | v0.9.3 | F18 purchase/upgrade review CLEAN db83b84..0216cb0; 60 unit/28 E2E, asset/config/build + normal/rested sim pass. Full F18 và M0–M9 vẫn in progress. |

| 2026-09-09 | v0.10.0 | F13 in progress: local requirements/claim-once/reward quote + phone/QR UI; 66 unit và40 sim rows xanh. Chưa có full meta producer/server, review pending. |

| 2026-09-09 | v0.10.1 | Đóng hai findings progression (chu trình LP/unlock + tên VI/EN); review đầy đủ d2918e9..598f66f không còn lỗi actionable.67 unit/30 E2E/config/build/asset/sim pass; F13 và full game tiếp tục, shipper kế tiếp. |

| v0.11.0 | Shipper rules v7 và phone sheet theo mẫu owner: stock atomic, capped net/bonus, closing/expiry/legacy replay. 76 unit/33 E2E và30 sim rows k2.3191–2.8154 xanh; review độc lập đang chờ. F07/full game vẫn in progress. |

| v0.11.1 | Shipper full-diff review ef0c053..307a3b0 CLEAN sau một sửa lỗi prerequisite phone.77 unit/33 E2E, config/build/assets và30 sim rows k2.3191–2.8154 pass. F07/full M0–M9 tiếp tục; không merge/push root. |

| v0.12.0 | F08 seeded schedule/report rules v8:85 unit/34 E2E/config/build/assets,50 seated k rows trong2.2622–2.7625 và15 controlled pressure rows pass. Review pending; số feature hoàn tất không đổi, full M0–M9 active. |

| v0.12.1 | F08 ordinary schedule/reports review6535484..5e46cf1 không findings.85 unit/34 E2E/config/build/assets,50 k rows và15 pressure rows pass; tiếp tục biển hiệu và full M0–M9. |

| v0.13.0 | F10 business sign rules9 implemented locally;92 unit/37 E2E/config/build/assets,110 sign k rows2.3072–2.8616 +baseline/pressure pass. Full-diff review pending;16 in progress, zero full features complete. |

| v0.13.1 | F10 business signs reviewed bdbb493..9239007 with no introduced actionable defects after VIP pool, gate-alias and closed-spend fixes.95 unit/37 E2E/config/build/assets +sim evidence pass;16 in progress, zero full features complete. |

| v0.14.0 | F09/F08 ordinary demand rules10 implemented; config1.7.1 formula metadata clarified with all numeric leaves unchanged, real seeded group/replay/unsafe interval tests. 100 unit/37 E2E/config/build +20 k/15 pressure rows passed; independent review pending,16 in progress and zero complete. |

| 2026-09-09 v0.14.1 | Ghi nhận review độc lập rules10 full diff2959544..432626d không có lỗi actionable; giữ16 in progress, zero full features complete. |

| 2026-09-09 v0.15.0 | Flyer producer rules11 implemented, author verification and final review underway; full M0–M9 remains active. |

| 2026-09-09 v0.15.1 | Ghi nhận independent full-diff review360453e..d5be3e0 không còn actionable findings; không đổi code theo nghi vấn scaling đã được chứng minh sai. Full M0–M9 còn active. |

| v0.16.0 | Rules12 daily quests đưaF17 sang đang làm (17 feature đang làm, chưa feature full nào xong);118 unit/44 browser/config/build và20 k rows qua. Daily5/5 guard có, actual gift producer chưa có; review pending. |

| v0.16.1 | Sửa P1 onboarding reveal từ review a22fa90: dùng chung ngưỡng cấu hình cho cả hai lối vào nhiệm vụ;46 browser/config/build qua. Full-base follow-up pending,17 feature vẫn đang làm. |
