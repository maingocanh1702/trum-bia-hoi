# Implementation Tracker — Trùm Bia Hơi

> **Version:** v0.48.0
> **Ngày tạo:** 2026-06-09 · **Cập nhật:** 2026-09-10 (protected forecast a99a567 + mobile9900505 đã verify/review)
> **Trạng thái:** Active — **M0 COMPLETE theo exit criteria; xem báo cáo closure M0–M5. M1–M3 tiếp tục triển khai; M4 web server/outbox đã qua review và101browser checks; đạt11/18 tiêu chí; registry c1e953c, admin API6f42575 và editor56a0a44 đã verify/review; scoped core d91b92a đã verify/review; scope editor/impact a84f41f và dự báo xu7ngày a99a567 đã verify/review; account/import UI còn thiếu; asset/release chưa hoàn tất.** `prototype/` đã lưu trữ (kết quả cũ ghi ở ghi chú Phase 0, không tính tiến độ). Đồng bộ `06-ROADMAP` **v3.3** (1 phase, mốc M0–M9).
> **Owner:** Team
> **Mục đích:** Master status board cho mọi feature F01–F28. Nhãn `Phase N` chỉ là **khoá parser** của dashboard-engine; mốc thật: P0 → M0 (nền) · P1 → M1–M2 · P2 → M3 · P3 → M4–M6 · P4 → M7–M8 · QA/release → M9. Là **input cho dashboard-engine** (`tools/dashboard-engine/build_dashboard.py`). Nguồn quyết định/scope = `02-GDD-trum-bia-hoi.md` + `06-ROADMAP-trum-bia-hoi.md`; tracker chỉ theo dõi **trạng thái build**.
> **Cập nhật:** đổi status mỗi khi 1 feature chuyển trạng thái (bắt đầu code / review / merge).

---

Historical 09/09 intake below (advanced k decision resolved10/09 in milestone table):
Owner latest handoff intake (09/09): new economy2.0 rules/numbers accepted and prioritized;
see `docs/latest-handoff-adoption.md`. Existing config1.7.3 evidence below remains
historical verified behavior, not proof of the new pipelines/demand/gates/lease rules.
Working config2.0.1/rules21 now implements tank/tap/pan pipelines, glass purchases, stock-aware side dishes, heavy/equipment LP gates and capacity UI.221 engine/server +75 browser/config/build checks pass; native review9c2870a found no actionable introduced defect. Ordinary k2.4186–2.8738 and15rush pass; advanced full-menu k3.0416–3.2074 fails band, owner interpretation pending. Rules22 lease lifecycle and mobile rental UI verified throughce7564b:234 engine/server,77 browser,config/build,10 ordinary k cohorts and15rush pass; native correction review resolves both findings. Actual fresh-game8-shift probe reachesLP1; full season/career remain pending. Full M0–M9 is still in progress.

Rules23 season accounting/peak and personal VI/EN panel are verified at `faece69`.
248 engine/server tests, config/build, 10 ordinary k cohorts and 15 rush cases pass;
79 browser tests passed initially and 6 relevant cases passed after corrections.
Independent correction review resolved all three findings. A real 24-shift/three-day
diagnostic reaches LP2 and peak bach_kim (492295 earned), without injected progression.
20 features remain in progress; full career, community ranks and mailbox are unfinished.

Career harness b01f4b1 verified: two30-day seeds reachLP4; full-month save replay
passes.250engine/server tests, config/build, ordinary/rush and native review pass.
Actual30-day save is80MB and an isolated Chromium size probe throws
QuotaExceededError. Next priority: durable career storage before account/ranking
expansion. Advanced k scope and full LP0–LP7 remain open;20inprogress,0complete.

Browser storage `c9db016`: IndexedDB delta/atomic revision, migration và raw recovery
đã qua native code review; config/build qua. Lượt cuối khi máy thức:91/91browser
qua, archive80MB ghi/đọc/lưu tiếp/Appboot khớp hoàn toàn (~20,5giây khởi động).
Google verifier917f862 cũng qua review và255engine/server tests; chưa bật login.
Giữ nguyên config và full M0–M9 với20feature đang làm.

## Milestone closure — 2026-09-10

| Milestone | Status | Acceptance evidence / remaining |
|---|---|---|
| M0 | ✅ COMPLETE | check:config/build/334tests;10kcohorts2.4186–2.8738,5seeds; reviewed foundation/checkpoint/web. |
| M1 | 🟡 OPEN | Core service/reload/pause pass; complete3-viewport shift, axe, recommendation and human feel evidence remain. |
| M2 | 🟡 OPEN | Guest/guide pass; five-person study, integrated Google and admin/locale/prompt criteria remain. |
| M3 | 🟡 OPEN — 6/12 PASS | Standard k and advanced career≤3.5 pass per owner10/09; kitchen/rush/quests/sign pass. Human feel and equipment/customer art acceptance remain. |
| M4 | 🟡 OPEN — priority | 11/18 criteria PASS. Remote web936e9d5, registryc1e953c, admin API6f42575 and editor56a0a44 verified. Scoped server core d91b92a and scope UI/factual impact a84f41f verified; protected coin forecast a99a567 verified. Observed VND, emergency and account/import/eligibility/locale remain. |
| M5 | 🟡 OPEN | Local seasons/LP/lease/quest rules pass; community ranks/snapshot/rewards/referral/gift integration remains. |

Full criterion list and named checks: [M0–M5 closure](milestone-closure-m0-m5.md).
Feature rows below span milestones, so M0 completion does not close all Phase0 feature
rows. Follow owner queue M4→M6→M7→M8→M9; defer extra M5 breadth/performance tuning.

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
| F04 | 🎮 Code | Vòng Đời Cốc — bottleneck cốc clean→in_use→dirty→washing→clean | 🟡 | `codex/game-build-isolated` | 🔒S | Rules21: mua ly theo tổng sở hữu40, quote/debit/retry và menu pause đã kiểm tra; giữ replay1.x. Engine mới: cốc định danh, auto-rót/rửa, huỷ đơn trả cốc bẩn; regression + replay pass. Đang tích hợp UI/art. |
| F01 | 🎮 Code | Vòng Lặp Mở Ca — ca 12 phút, thể lực, trần ngày 500k | 🟡 | `codex/game-build-isolated` | 🔒S | Ca 12 phút + closing, hidden/offline và menu pause, cap qua nửa đêm VN; save v2 đọc v1. Tỉnh Táo đã verify/review ở rules v3; segment và server time chưa hoàn tất. |
| F02 | ⚖️ Economy | Menu & Kinh Tế Quán — 3 món P0 (bia+2 mồi), đo k | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Config 6 món; helper value chung cho menu/sim;20 normal/combined rows, mỗi seed ≥500 lượt: k2.3125–2.7562;143 unit/63 browser và full-base review menu không nêu findings. Chưa đủ full M3 acceptance. |
| F03 | 🎮 Code | Hệ Bàn — 3 bàn, serve theo Order | 🟡 | `codex/game-build-isolated` | 🔒S | Rules21 nhận giá ghế11–48 và sửa vị trí bàn4–6 không che nút phục vụ; acceptance đầy đủ tiếp tục. Order cấp bàn, 1 chạm, grace, mua/nâng bàn. Giá ghế vượt mốc 10 và edge cases còn cần hoàn tất. |
| F05 | 🎮 Code | Độ Hơi Bia — mất hơi 12s, cờ vàng, MVP mềm | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Timer cốc riêng, stale giữ payment/mất boa, hầm lạnh và 5 thời tiết. Unit/replay pass; art/feel QA còn thiếu. |
| F06 | 🎮 Code | Tip / Uy tín / Phạt — VIP ×10, grace window | 🟡 | `codex/game-build-isolated` | 🔒S | Per-customer tip, VIP, phạt, cap và ba ledger đã có; Queue patience + không phạt lại bàn đã phục vụ đã có regression; Tỉnh Táo rules v3 qua kiểm thử/review không findings tại c984541; phí đóng ca rules v4 có xác nhận live/shiftId/maxCost, review CLEAN tại 5bce63c; tiễn từng bàn bằng uy tín còn tiếp tục. |
| F08 | 🎮 Code | Giờ Vàng — 2 mức (nhẹ 90s/nặng 150s), spawn floor | 🟡 | `codex/game-build-isolated` | 🔒S 🔒P | Rules21 heavy từ LP1; trước đó chỉ light.15 pressure cases pass. Rules v8: seeded ordinary schedule, full warning/fit, heavy enjoy, báo cáo Sổ ca VI/EN; giữ lịch/replay v7.85 unit/34 E2E/config/build xanh;50 sim rows k2.2622–2.7625 +15 pressure rows. Review đầy đủ6535484..5e46cf1 không có lỗi actionable; lunch/football/priority và full acceptance tiếp tục. |

### Phase 1: Vòng phục vụ lõi + onboarding (M1–M2 — lưu localStorage)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F24 | 🎨 Design | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | 🟡 | `codex/game-build-isolated` | 🔒S | Sân xanh/cảnh phố, HUD gọn, quầy trên, kho dọc, thẻ mâm khi chạm bàn. 12 E2E pass; review CLEAN tại `2d80437`. Bếp/mồi nóng thêm7 sprite native RGBA; Bàn Lv2–Lv4 thêm3 imagegen pixel draft; manifest hiện20 sprite placeholders và104 draft files gồm audio +4 Blender studies lưu trữ. Export palette/alpha/anchor checks và4viewport service/art smoke PASS; review11ceb79 đã giải quyết3 findings, export failure test được chạy độc lập PASS. Đã cập nhật brief owner: portrait casual-management, HUD bám mép, panel skeuomorphic bo tròn, pill dày, chữ tròn đậm, bóng mềm và game vỉa hè Việt Nam. Owner menu pause đã triển khai: giữ Nhập hàng mở sau mua, chỉ resume khi đóng; rules16 tách presence khỏi pause;156 engine/67 browser pass và native full-base review tại `7c60c70` không nêu lỗi cần sửa. Chưa đủ art/release. |
| F07 | 🎮 Code | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | 5 kiểu khách ngồi; shipper local v7 có timer riêng, giao cả đơn, cap/timeout/closing/replay và UI điện thoại. Review shipper CLEAN tại307a3b0; football và acceptance đầy đủ còn thiếu. |
| F09 | ⚖️ Economy | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | 🟡 | `codex/game-build-isolated` | 🔒S | 5 thời tiết từ config; rules10 sửa thứ tự baseline để hot/humid thực sự tăng nhịp khách, giữ active-rush floor và replay v9. 100 unit/37 E2E +20 k rows đã qua; review độc lập full diff2959544..432626d không có lỗi actionable. Sprite/ambient và full statistical QA tiếp tục. |
| F10 | 🎮 Code | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Rules21 bom dự trữ + vòi timed riêng, mua cốc, gate LP và capacity UI đã qua221 unit/server+75 browser và native review. Cân bằng nâng cao đang chờ quyết định (k tới3.2074); art và full acceptance tiếp tục. Lịch sử: Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; phone/QR quote/gate/command/UI + boa qua review không còn findings tại598f66f; Biển rules9 lắp/đổi5 kiểu, gate uy tín, customer mix/Neon +5 sprite draft;95 unit/37 E2E xanh, full-diff review bdbb493..9239007 không còn findings sau3 sửa lỗi biên. Tờ rơi rules11 có mua bằng uy tín, LP2, kho/timer/báo cáo/UI VI-EN;108 unit/40 E2E +30 k rows qua; full-diff review360453e..d5be3e0 không có lỗi actionable, nghi vấn nhân k đã bị bác bằng thực thi. Free flyer daily5/5 đã được producer claimDailyBonus + quests.test xác nhận; cốc mua và full F10 tiếp tục. Owner rules17: nâng cấp asset trong ca, giữ pause đến khi đóng menu; save v16 replay + mobile purchase đã qua config/build/166 unit/69 E2E và native review3ff21df không còn findings. Owner batch/HUD rules18/config1.7.3 đã qua174 unit/72 browser, config/build,20 canonical1000-serve k rows2.5821–2.9601 và15 rush; native reviewfe59758..7897bdd không còn lỗi actionable sau2 sửa HUD. Bia dự trữ tách kho thô, refill khi lấy lên mâm; save cũ nhận config ở ca kế tiếp. F10 đầy đủ/art từng cấp tiếp tục. |
| F25 | 🎮 Code | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca) | 🟡 | `codex/game-build-isolated` | 🔒S | Guest local + vi/en + backup/replay v1–v3 + import/reset giữ bản cũ đã có; M4 guest-cookie auth backend đã qua kiểm tra/review; chủ dự án chưa có Google Client ID (09/09), hướng dẫn ở docs/google-signin-setup.md. Verifier Google917f862 đã qua review,255engine/server tests/config/build;5ca dùng chữ ký/chứng thư thật. Owner chốt lịch sử local phải duyệt trước khi tính BXH. Schema4 account/nonce/audit và Google HTTP đã có,264tests/config/build/CLI smoke qua; review độc lập ebe820c không tìm thấy lỗi mới, tự chạy6storechecks qua. Core nhập local một lần, gzip giữ bản gốc và provenance chờ duyệt đã có;271tests/config/build +80MB probe qua; native review51a0734 không tìm thấy lỗi mới. HTTP upload/approval/cloud UI và live Google chưa hoàn tất. Schema6 checkpoint giảm cold read80MB29,36s→2,23s;281tests/config/build,10kcohorts/15rush qua; reviewf86e2b3 không có lỗi mới và tự chạy17tests qua. Theo owner, upload/tuning tiếp theo sang M9; Web936e9d5 đã dùng server; local lỗi vẫn có tải gốc/import/reset với backup nguyên bản. Registry/admin và account/import/eligibility UI là phần M4 tiếp theo. |
| F27 | 🎮 Code | Onboarding — ca 1 = 1 khách 1 bia, thông báo mất khách, step guide (lần đầu + sau 3 lần mất khách) | 🟡 | `codex/game-build-isolated` | 🔒S | Guide theo events/config, skip/persist + giới hạn chạy lại. Browser/unit pass; Google giữa ca + playtest 5 người chưa có. |

### Phase 2: Đủ demand-mix (M3)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F11 | 🎮 Code | Bếp & Mồi Nóng — bếp 4 cấp, 3 mồi nóng | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Rules21 chảo nhiều phần cùng món với batch ID riêng và demand theo kho/nhóm đã kiểm tra. Cân bằng nâng cao k3.0416–3.2074 chưa đạt band; quyết định owner đang chờ. Lịch sử: Live bếp và7 sprite đã qua reviewaf16833. Rules14 thêm dish/job/waste events, cursor ca/legacy partial, shared nominal-value helper và Sổ ca VI/EN gọi/bán/bỏ/TB mỗi mâm;143 unit/63 E2E/config/build xanh. Review độc lập full-base80ee489..2f1aa07 không nêu findings, tự chạy143 unit/config/build;20 k rows2.3125–2.7562 và15 pressure rows xanh. Demand theo loại khách, art/server và acceptance đầy đủ tiếp tục. |
| F17 | 🎮 Code | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | 🟡 | `codex/game-build-isolated` | 🔒S | Rules12 daily5: seed VN/tier, actual event progress, rollover, reward/bonus guards/UI VI-EN; đã sửa P1 review về mốc onboarding mở nhiệm vụ.118 unit/46 E2E/config/build,20 k rows2.3171–2.7312 qua; full-base review3f978ec..e551b40 không còn lỗi actionable. Rules13 thêm điểm danh theo ngày active, claim uy tín một lần, đổi vòng/reset/offline/replay và ladder VI-EN;126 unit/52 E2E/config/build và20 k rows2.2564–2.8277 xanh; full-base review483bb03..d232be5 không nêu lỗi cần sửa. Gift transfer/referral/season authority và full F17 còn tiếp tục. |

### Phase 3: Server + meta + risk (M4–M6 — server-authoritative từ M4)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F23 | 🎮 Code | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | 🟡 | `codex/game-build-isolated` | 🔒S | Web server authority/outbox/reconnect936e9d5 đã kiểm chứng. Schema8 default registry c1e953c: immutable proposal/approval/audit, role/tier decisions, VN day/season activation và pin khi mở ca; seed mới không tự kích hoạt.310engine/server,10remote browser, config/build,10kcohorts2.4186–2.8738/15rush qua. Review P2 giới hạn tác giả đã sửa; catalog rename bị chặn trước khi ảnh hưởng career; correction CLEAN. Schema9 admin Google/TOTP API6f42575 đã qua320tests/config/build và10remote browser; review CLEAN, typecheck độc lập qua. Editor `/admin`56a0a44 đã kiểm chứng:321engine/server,11admin/10remote browser, config/build qua. Review P2 buffer khi import JSON giống hệt đã sửa; review cuối CLEAN. Scoped core d91b92a đã kiểm chứng:334engine/server,13scope cases; timing campaign đã sửa theo review, regression độc lập qua; config/build,21browser,10kcohorts/15rush qua. Protected scope editor + factual impact a84f41f đã kiểm chứng:339engine/server,29focused,18admin/10remote browser,config/build qua; ba lỗi review đã sửa, correction không còn lỗi mới. Xem docs/admin-scopes.md. Forecast kernel03a6800 đã kiểm chứng:344tests/config/build, career parity,10kcohorts/15rush qua; hai lỗi lease/config/history đã sửa, review cuối không còn finding và regression độc lập qua. Xem docs/economic-forecast.md. Protected forecast a99a567 + mobile9900505 đã kiểm chứng:350engine/server,19admin browser và ca mobile cuối,config/build qua; review P2 race xuất bản đã sửa, review cuối không còn lỗi mới. Báo cáo xu7ngày dùng bản sao server, không sửa save thật; VND thiếu dữ liệu donate được ghi rõ. Emergency/account/import/eligibility/locale và segment/cap policy còn thiếu; xem docs/scoped-config-registry.md. M4 đạt11/18 OPEN; xem docs/admin-editor.md. Xem docs/config-registry.md và .qa/registry-verification.json. |
| F12 | 🎮 Code | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | 🟡 | `packages/engine/src/seasons.ts` | 🔒S 🔒B | Rules23: hai mùa theo lịch, thu nhập sau daily cap, peak thật, lịch sử cá nhân và panel VI/EN. Đã verify/review tại faece69: 248 engine/server, 79 browser + 6 kiểm tra lại, config/build/k nền/rush qua. Community ranks và mailbox chưa xong. |
| F13 | 🎮 Code | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | 🟡 | `codex/game-build-isolated` | 🔒S | Requirements/claim-once và producers đã có. Hai seed30ngày (480ca) tớiLP4; replay tháng khớp,250tests/config/build/k nền/rush/review qua. FullLP0–LP7/balance còn mở; save tháng80MB vượt localStorage; adapter IndexedDB c9db016 đã review và qua91browser/80MB exactreopen/Appboot. |
| F14 | 🎮 Code | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | 🟡 | `codex/game-build-isolated` | 🔒S | Rules22 quote/purchase/early move/expiry/refund, real-calendar pause/offline, config/replay/SQLite và menu VI/EN.234 engine/server,77browser,config/build,10kcohorts+15rush pass; native review fixes verified atce7564b. Break-even/art/neighborhood/shift-report còn tiếp tục. |
| F15 | 🎮 Code | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | ⬜ | `—` | 🔒S | Spec `docs/features/F15-risk-events.md`; §4 kiểm tra pending, `risk.inspection.enabled=false`. |
| F16 | 🎮 Code | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ | `—` | 🔒S | Spec `docs/features/F16-referral-badges.md`. |
| F28 | 🎮 Code | Bảng Xếp Hạng & Bàn Thờ Ông Địa — top N, hàng của tôi, snapshot kết Vụ | ⬜ | `—` | 🔒S 🔒B | Spec `docs/features/F28-leaderboard.md`; config `leaderboard` tier A. Mốc M5. Owner10/09: giữ tiến độ local, chỉ cộng lịch sử vào BXH sau khi duyệt, không cộng trùng. |
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
| 2 — Demand-mix (M3) | 2 | 0 | 2 | 0 | 0 | 0% |
| 3 — Server + meta + risk (M4–M6) | 10 | 0 | 3 | 0 | 1 | 0% |
| 4 — Vé Mở Ca + sự kiện (M7–M8) | 3 | 0 | 0 | 0 | 0 | 0% |
| **MVP total** | **28** | **0** | **18** | **0** | **1** | **0%** |

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

| v0.16.2 | Ghi nhận full-base review3f978ec..e551b40 không còn lỗi actionable sau sửa mốc reveal;118 unit/46 E2E/config/build/20 k rows xanh.17 feature đang làm; gift/social, attendance/referral/server và full game chưa xong. |

| v0.17.0 | Rules13 thêm attendance theo ngày active và claim uy tín, giữ lịch sử rules1–12;126 unit/52 browser/config/build xanh, review còn chờ. Sửa tổng status thành17 để khớp17 dòng feature đang làm; full game vẫn chưa xong. |

| v0.17.1 | Attendance rules13 qua full-base review483bb03..d232be5 không findings; reviewer tự chạy126 unit/config/build, author52 E2E/20 k rows xanh. Giữ17 feature đang làm và full M0–M9 active; tiếp theo bếp/mồi nóng. |

| v0.18.0 | Bếp live dùng pipeline có sẵn, mở bàn/nhập hàng/nâng cấp đúng handler;7 unit/7 browser mới, full133 unit/59 E2E/10 k rows xanh.7 sprite mới có provenance, còn23 placeholders. Independent review pending; giữ17 feature đang làm, full M0–M9 active. |

| v0.18.1 | Bếp live/art qua independent full-base reviewf9fa82f..af16833 không có lỗi actionable; reviewer tự chạy133 unit/typecheck/assets, author59 browser/10 k rows xanh. Giữ17 feature đang làm; full M0–M9 và F11 analytics tiếp tục. |

| v0.19.0 | Rules14 menu provenance và Sổ ca:143 unit/63 browser/config/build xanh, legacy partial/unavailable rõ ràng, mở lại sổ lúc nghỉ sau reload. Cập nhật brief designer theo owner. Review độc lập và final balance đang chạy; giữ17 feature đang làm, full M0–M9 active. |

| v0.19.1 | Ghi nhận review độc lập80ee489..2f1aa07 không nêu findings: tự chạy143 unit/config/typecheck/build; author63 browser,20 k rows2.3125–2.7562 và15 rush rows xanh. Đồng bộ F02/F11, sửa ghi chú cũ về free flyer đã có producer; full game vẫn17 feature đang làm. |

| v0.20.0 | Bắt đầu F23/M4 bằng rules15 config pin theo ca và savev3; giữ luật cũ, tài sản, retry và lịch sử nhiều phiên bản.18 feature đang làm; server/registry/auth/network còn thiếu. Verify/review đang hoàn tất, xem build-progress. |

| v0.21.0 | Owner auto-pause trong menu/quản lý thiết bị, giữ menu Nhập hàng sau mua đến khi đóng; rules16 giữ thao tác menu và lịch VN.18 feature vẫn in progress, combined config/pause verification và review chưa hoàn tất. |

| v0.21.1 | Chốt checkpoint config pin + owner menu pause tại7c60c70: config/build156unit67browser,5 mobile checks sau CSS,20 k rows và15 rush rows pass. Native full-base review không nêu actionable defects (reviewer sandbox không bind được browser; author đã chạy67).18 feature/full game vẫn chưa hoàn tất. |

| v0.22.0 | F23/M4 thêm server event store SQLite thật, dùng chung engine, lưu nguyên snapshot và transaction commands/events/projection; tests restart/2 kết nối/retry/rollback/pause đã có, đang verify/review. Web vẫn local;18 feature chưa hoàn tất. |

| v0.23.0 | Owner mở nâng cấp asset ngay trong ca, rules17 giữ giá/config và replay cũ; sửa2 findings server retry/cursor. Full verification/review đang chạy;18 feature và M0–M9 vẫn in progress. |

| v0.23.1 | SQLite store và nâng cấp trong ca qua native review; config/build166unit69browser,20 k rows2.3125–2.7562,15 rush pass. Sửa clock harness bằng pauseAt, giữ exact assertions. Owner batch/HUD là bước tiếp theo; full M0–M9 active. |

| v0.24.0 | F04/F10 rót sẵn theo mẻ, bồn rửa gom mẻ, capacity/stock/progress HUD và so sánh nâng cấp; default top-up/freshness diễn giải ở08§8.1.173 unit/2 focused browser pass, full verify/review pending. |

| v0.24.1 | Verified owner batch/HUD:174 engine/server72browser,config/build,20 canonical1000-serve k cohorts2.5821–2.9601,15rush. Native review through7897bdd has no remaining introduced actionable defects after2HUD fixes; fake-clock setup race removed without changing assertions. Initial500 k excursion retained/disclosed.18 features in progress, zero complete; full M0–M9 active. |

| v0.25.0 | M4 guest HTTP/session implementation: hashed expiring/revocable cookies, owned state/command/events, real socket tests and SQLite schema2 migration. Final verify/review in progress.18 features in progress, zero complete. |

| v0.25.1 | Verified guest HTTP at62b4445: config/build182 engine/server, actual CLI/Chromium, full-range native review without remaining introduced defects after3 fixes. Google ID absent per owner; setup guide ready.18 features in progress, zero complete; full M0–M9 active. |

| v0.26.0 | M4 server ordered ingress: owned client streams, mandatory clientSeq and atomic receipt acknowledgements; schema3 migration and retry/order/rollback/HTTP tests implemented. Verification/review in progress;18 features remain active. |

| v0.26.1 | Verified ordered ingress at e390a1c:187 engine/server tests, CLI/Chromium, independent review with12 storage checks passed. Timeout-close/attendance boundary probed and genuine v18 compatibility saves captured;18 features/full goal remain active. |

| v0.27.0 | Engine rules19 trusted disconnection deadline + inactive normal closing, versioned paused calendar replay and real v18 fixtures. Verify/review in progress;18 features remain active; server/browser timeout integration still pending. |

| 2026-09-09 | v0.27.1: accepted latest owner handoff/economy2.0 delta and reprioritized integration; no feature promoted complete from original-checkout engine claims. |

| v0.27.2 | Verified disconnection/recovery through1fa6b14 with211 tests and final correction review; preserved18 active/zero complete features. Owner economy2.0 integration is next, before server liveness. |

| 2026-09-09 | v0.29.0 | F14 bắt đầu triển khai: hợp đồng thuê7ngày/cọc, hết hạn theo lịch thực, menu VI/EN, immutable rules21 replay;232 engine/server pass, review/verification cuối đang chạy. Không coi full F14 hoặc full economy hoàn tất. |

| 2026-09-09 | v0.29.1 | Lease corrections verified:234 engine/server,77browser,config/build,10 ordinary k cohorts2.4186–2.8738 and15rush pass. Native review resolves fallback reuse and unsafe multiplier findings atce7564b. Fresh real8-shift probe reachesLP1;19 features in progress, full game/balance unfinished. |

| 2026-09-09 | v0.30.0 | F12 bắt đầu: core mùa 7/14 ngày, peak từ doanh thu thật, pin luật theo mùa, replay rules22 và panel cá nhân VI/EN. 20 feature đang triển khai; bộ verify/review cuối đang chạy. |

| 2026-09-09 | v0.30.1 | Seasons checkpoint faece69 verified: 248 engine/server, 79 browser + 6 targeted correction checks, config/build, 10 k cohorts and 15 rush. Native review closes all 3 findings. Real 3-day diagnostic reaches LP2/Bom Bạc; 20 features in progress, 0 complete. |

| 2026-09-09 | v0.31.0 | Thêm sim:career thực hiện mua sắm, LP, mặt bằng và mùa qua lệnh thật; seed42 chạy30ngày tớiLP4. Đối soát tiền và replay2ngày qua; kiểm tra nhiều seed/review đang chạy. F13 vẫn đang triển khai. |

| 2026-09-09 | v0.31.1 | Career b01f4b1 verified with two30-day seeds and full-month replay;250tests/config/build/ordinary/rush/review pass. Recorded actual80MB save and Chromium quota failure; prioritize durable storage, not full career readiness. |

| 2026-09-09 | v0.32.0 | Thay local career autosave bằng IndexedDB nguyên tử, ghi delta và chặn stale tab; giữ nguồn legacy/backup. Codec không đổi rules. Kiểm tra hồi quy và native review đang chạy; không đánh dấu full feature hoàn tất. |

| 2026-09-10 | v0.32.1 | Storage code c9db016 reviewed with no actionable introduced defect; current config/build pass. Final91browser86pass/5host-sleep timeouts and final80MB acceptance remain pending. Full game remains20inprogress/0complete. |

| 2026-09-10 | v0.33.0: F25 verifier Google prerequisite implemented with actual-signature tests; full checks/review pending. No Client ID, account session, claim or cloud UI activation.20features remain in progress; browser storage final verification still awaits awake host. |

| 2026-09-10 | v0.33.1: verifier917f862 reviewed after issuer fix,255tests/config/build pass. Storage c9db016 final91browser +80MB exactreopen/continuation/Appboot pass at current HEAD. Owner local-history review policy recorded in F25/F28.20inprogress/0complete; account/claim/cloud/ranking remain. |

| 2026-09-10 | v0.34.0: F25/F23 Google account/session transaction and optional HTTP routes implemented;264tests/config/build/CLI smoke pass, review pending. Preserve immutable player/history; local import/review and web cutover remain.20features in progress,0complete. |

| 2026-09-10 | v0.34.1: Google server account/session ebe820c verified;264tests/config/build/CLI pass, native code/security review found no actionable introduced defect and passed6storechecks. Local archive import/approval/web remain next;20inprogress,0complete. |

| 2026-09-10 | v0.35.0: schema5 local-claim core and bounded replay worker implemented;271tests/config/build and real80MB exact import/reopen/continuation pass. Review pending; public upload/approval/web and measured performance remain.20features in progress,0complete. |

| 2026-09-10 | v0.35.1: local claim core51a0734 independently reviewed with no introduced findings;271tests/config/build and80MB integrity pass. Imported history remains pending approval. Measured cold-read/upload latency is next;20features in progress,0complete. |

| 2026-09-10 | v0.36.0: schema6 trusted checkpoint implemented;281tests/config/build and exact80MB restore pass, review and final k/rush running. Owner timeboxes performance here and requests criterion-level M0–M5 closure, then M4 cutover/reconnect/admin before M6–M9. |

| 2026-09-10 | v0.36.1: f86e2b3 independently verified;281tests/config/build,10kcohorts,15rush,17reviewer checks pass. M0 marked COMPLETE from explicit exit criteria; M1–M5 criterion-level gaps published. Owner prioritizes M4 cutover/reconnect/admin then M6–M9; no additional performance work now. |

| 2026-09-10 | v0.37.0 | M4 rules24 engine prerequisite: trusted hidden/menu recovery and resting loss, preserving old replay. Focused tests pass; full verification/review in progress. F23/M4 remain open; durable liveness, web cutover and registry/admin next. |

| 2026-09-10 | v0.37.1 | Rules24 prerequisite 0bcbcde verified:288 engine/server tests,42 final focused including real HTTP, config/build,10 kcohorts2.4186–2.8738 and15rush pass. Native review found no actionable defect;33 engine checks passed independently (reviewer HTTP socket permission blocked). F23/M4 still open; server leases/web authority/registry-admin next. |

| 2026-09-10 | v0.38.0 | M4 schema7 heartbeat leases + authenticated HTTP + autonomous restart/closing; config/build298 tests and strengthened10-case presence suite pass. Native review pending. F23/M4 remain open for remote web/outbox/registry-admin. Engine/config values unchanged. |

| 2026-09-10 | v0.38.1 | Full-range heartbeat review85cbb5d found no actionable defects; tightened public admission to require heartbeat from first action before web cutover.19 HTTP/presence checks pass; final full verify/review in progress. F23/M4 remains open. |

| 2026-09-10 | v0.38.2 | Heartbeat9f38166 verified: config/build298 full tests +19 final HTTP/presence checks pass; full-range native review no actionable defects and9 independent SQLite/presence checks pass. Schema7 persistent liveness and mandatory public admission complete; remote web/outbox/registry-admin remain. M4 OPEN. |

| 2026-09-10 | v0.39.0 | Web defaults to server snapshots/pinned public rules and authoritative reports. Durable bounded journal, current-presence heartbeat, reconnect status and exact command retry; explicit local preservation boundary.298tests,91legacy browser and7remote scenarios pass; final hidden-presence check/sim/review in progress. M4 remains open for registry/admin/account integration. |

| 2026-09-10 | v0.39.1 | Web cutover936e9d5 verified:298engine/server +91legacy/10remote browser, config/build,10ordinary kcohorts2.4186–2.8738 and15rush PASS. Full review P1 local recovery fixed; independent correction CLEAN. M4 now10/18 PASS, remains OPEN. Next registry/admin then account gaps and M6–M9; no public upload/performance expansion. |

| 2026-09-10 | v0.40.0 | Schema8 default registry implemented: seed registration separate from activation, immutable drafts/approval/publication/audit, tier decisions and actual server opening resolver.307 full tests +10 final focused and10 remote browser pass; final sim/review pending. M4 remains10/18 OPEN; scoped overrides, authenticated admin API/editor and account gaps next. |

| 2026-09-10 | v0.40.1 | Default registry c1e953c verified:310engine/server,10remote browser, config/build zero warnings,10ordinary kcohorts2.4186–2.8738 and15rush PASS. Foundation P2 author-limit bypass fixed; catalog identity regression also prevented. Independent correction review CLEAN. M0 COMPLETE; M4 still10/18 OPEN pending protected admin transport/editor/scopes and account gaps. |

| 2026-09-10 | v0.41.0 | Admin authentication and protected registry transport implemented: schema9, independent Google/TOTP factors, private immutable-sub role directory, eight-hour cookie, durable lock/replay and audit; no player cookie takeover.320tests/config/build pass; final role/remote checks and review in progress. Editor/scopes/live setup remain; M4 stays10/18 OPEN. |

| 2026-09-10 | v0.41.1 | Admin auth/registry API6f42575 verified:320engine/server tests (10admin cases),10remote browser, config zero warnings/build PASS. Independent review CLEAN/typecheck PASS; reviewer HTTP rerun blocked by sandbox EPERM, host tests passed. Editor/GIS/MFA browser integration, enrollment/recovery and scopes remain. M4 stays10/18 OPEN. |

| 2026-09-10 | v0.42.0 | Admin browser editor implemented: dedicated GIS/MFA entry, session-context binding, author-bound draft/retry, shared scale diff, approval/publication/rollback/audit.321engine/server,8admin/10remote browser, config/build pass; independent review pending. M4 remains open; no new engine/config values or M9 work. |

| 2026-09-10 | v0.42.1 | Editor56a0a44 verified:321engine/server,11admin/10remote browser, config zero warnings/build PASS. Final independent review CLEAN/typecheck+diff-check PASS; reviewer config blocked by tsx IPC EPERM, host passed. M4 one-key/effectiveAt PASS, now11/18; other milestone counts unchanged. Scopes/forecasts/emergency/account gaps and M6–M9 remain; no live Google setup claim. |


| 2026-09-10 | v0.43.0 | Schema10 scoped registry core: immutable explicit audiences, per-key precedence/priority, finite campaign/player expiry, ticketed overrides, removal-aware approval policy, deterministic resolved snapshots and actual opening pin.12focused cases pass; full verify/review in progress. M4 remains11/18 OPEN; protected scope controls, forecasts, automatic segment policy and account gaps remain. |


| 2026-09-10 | v0.43.1 | Scoped core d91b92a verified:334engine/server (13scope cases),25focused,config zero warnings/build PASS;11admin/10remote browser,10ordinary kcohorts2.4186–2.8738 and15rush PASS. Full review P2 campaign timing corrected; final review no remaining findings and new regression independently PASS (full rerun blocked by local-listen EPERM). M4 remains11/18 OPEN; scope transport/editor, forecasts, automatic segment/cap policy and account gaps remain. |

| 2026-09-10 | v0.44.0: protected scope/support/source HTTP and VI/EN editor, persisted exact retries, replacement/withdrawal and factual affected-player preview implemented. Existing Google/MFA and publication rules retained; verification/review underway. M4 stays11/18; seven-day forecasts and remaining account acceptance still open. |

| 2026-09-10 | v0.44.1: a84f41f verified:339engine/server,29focused,18admin/10remote browser,config zero warnings/build PASS. Native correction review clears support identity context, stale impact and misleading predecessor diff. Scoped controls/factual impact complete; M4 remains11/18, full forecasts/admin lifecycle/accounts and M6–M9 pending. |

| 2026-09-10 | v0.45.0 | Current-save seven-day forecast kernel and shared career policy implemented; paused input, scheduled price/cap, expiry, wallet/deposit conservation and deterministic replay covered. Seven focused checks pass; full verify/review pending. Protected forecast aggregation/UI and VND observations remain; M4 still11/18 OPEN. |

| 2026-09-10 | v0.45.1 | Forecast kernel03a6800 verified:344tests/config/build/parity; final full-base review no actionable finding and lease regression independently passed. M4 still11/18; protected forecast aggregation/UI, donation data and remaining acceptance pending. Owner now requests Blender MCP asset production; existing MCP installed but native runtime required. |

| 2026-09-10 | v0.45.2 | Owner pauses Blender generation and allows imagegen. Forecast kernel already verified at03a6800. Three table upgrade placeholders replaced via existing manifest IDs; four Blender renders and studio archived without runtime use. Export/asset/config/build and four viewport service/art smoke PASS; 344engine/server tests PASS; native review next. F24 remains in progress; M4 still11/18 OPEN. |

| 2026-09-10 | v0.45.3 | Table batch11ceb79 verified:344tests,4guest/4art viewport checks,export safety/config/assets/build PASS; independent correction review clears all3findings. F24 in progress; next owner advanced-career gate k≤3.5, no economy retuning, before remaining M4 forecast reporting. |

| 2026-09-10 | v0.46.0 | Owner advanced-k decision recorded04§5/08changelog; new two-seed30day/LP4 gate≤3.5 in verify, standard band unchanged. M3 progressed criterion PASS from verified3.483282/3.318249;6/12PASS/OPEN. New gate full verification and review in progress; no economy retuning. |

| 2026-09-10 | v0.46.1 | Advanced gate13367c1 verified: fresh30-day seed42/99 reachLP4 and exactly reproduce k3.483282/3.318249≤3.5;345tests/config zero warnings/build/10standard cohorts/15rush PASS. Independent review no actionable findings. No economy retuning; M3 criterionPASS,6/12/OPEN. Next protected M4 forecast reporting/UI. |

| 2026-09-10 | v0.47.0 | Protected7day forecast worker/HTTP/admin VI/EN report implemented from an isolated SQLite backup;3server cases and one real browser report PASS. Full verification/review running. M4 stays11/18OPEN; observed VND, emergency and remaining account/eligibility/locale acceptance remain. |

| 2026-09-10 | v0.47.0 correction | Review P2: live publication/registry/schedule revalidated before forecast delivery. Real overlapping HTTP tests now deterministically prove busy429, publication409 and logout401. Mobile amounts keep digits on one line. Final full verify/review running; M4 remains11/18. |

| 2026-09-10 | v0.47.1 | Protected forecast a99a567 and mobile9900505 verified:350engine/server,19admin browser plus final mobile report case,config/build PASS. Initial P2 stale report fixed; independent full-diff correction/layout reviews clean. Runtime engine/economy unchanged; k/rush evidence retained. M4 stays11/18 OPEN; observed VND, remaining admin lifecycle/account/eligibility/locale acceptance precede M6–M9. |

| 2026-09-10 | v0.48.0 | First-run vi/en entry now precedes local/remote boot, remembers explicit acceptance and preserves legacy locale. Config/build pass; full browser/unit/review pending. No engine/economy/auth mutation; M4 criterion unchanged until verified. |
