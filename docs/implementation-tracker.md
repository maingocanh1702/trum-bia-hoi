# Implementation Tracker — Trùm Bia Hơi

> **playable-v0 DELIVERED** (`a602af3`): three full-shift viewports and dev identity PASS; local5174/5175 pinned to that tag. Post-tag Steer14 source config2.0.3 uses the verified fallback4/7/12/20/40. Full milestone closure remains separate; M6/M7/M8 deferred.

> **Version:** v0.63.0
> **Ngày tạo:** 2026-06-09 · **Cập nhật:** 2026-09-11 (playable-v0 delivered; Steer14 config2.0.3 fallback verified)
> **Trạng thái:** Active — **M0 COMPLETE theo exit criteria; xem báo cáo closure M0–M5. M1–M3 tiếp tục triển khai; M4 web server/outbox đã qua review và101browser checks; đạt15/18 tiêu chí; chọn ngôn ngữ trước game5871453 đã verify/review; registry c1e953c, admin API6f42575 và editor56a0a44 đã verify/review; scoped core d91b92a đã verify/review; scope editor/impact a84f41f và dự báo xu7ngày a99a567 đã verify/review; Google guest-link transport3c369aa đã verify/review; guest giữ tiến độ trên thiết bị theo Steer #5 lúc15:30; diễn giải theo phiên8c9dc64 đã bị thay thế; đăng nhập lại ddc77a9 đã verify/review; guest trên thiết bịe34fd56 đã verify/review; lời mời/cooldown và validation config03dae56 đã verify/review; core/API duyệt lịch sử local và flag521e901 đã verify/review; baseline và caller-only score7e7f337 đã verify/review; controls85fbdfb đã verify/review:378unit/server +24admin browser, final5ca liên quan/config/build qua; public rank628eb72 đã verify/review:386unit/server,11affected remote/24admin browser,config/build; review cuối CLEAN sau sửa P1 display bounds; asset/release chưa hoàn tất.** `prototype/` đã lưu trữ (kết quả cũ ghi ở ghi chú Phase 0, không tính tiến độ). Đồng bộ `06-ROADMAP` **v3.3** (1 phase, mốc M0–M9).
> **Release scope:** M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. M4 → automated gameplay M1/M2/M3/M5 → assets → gameplay-facing M9 release candidate. Free, no monetization in this build.
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
| M1 | 🟡 OPEN | Core service/reload/pause pass; complete3-viewport shift, axe and recommendation remain; human feel WAIVED by owner10/09. |
| M2 | 🟡 OPEN | Guest/guide pass; five-person study WAIVED; dev-stub Google and admin/locale/prompt criteria remain. |
| M3 | 🟡 OPEN — 6/12 PASS | Standard k and advanced career≤3.5 pass per owner10/09; kitchen/rush/quests/sign pass. 5human-only criteria WAIVED; equipment/customer art remains tracked (16placeholders). |
| M4 | 🟡 OPEN — priority | 15/18 criteria PASS; E27 lifecycleb5d3545 verified:389unit/server,39focused,27admin+3final browser,config/build and review without introduced issues; E25 public rank verified; E26 arbitrary stored-config comparison62e8646 verified:386unit/server,27admin browser,config/build and review CLEAN; E21 invitation/config admission verified; E18 guest claim/restore and E19 Google reauthentication verified. First-run locale5871453 verified. Remote web936e9d5, registryc1e953c, admin API6f42575 and editor56a0a44 verified. Scoped server core d91b92a and scope UI/factual impact a84f41f verified; protected coin forecast a99a567 verified. Observed VND, emergency implementation (policy now resolved), dev identity acceptance and deferred public import remain; real Google consent waived10/09. |
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
| F24 | 🎨 Design | Thiết Kế UI/UX Quán Bia — tokens, wireframe, sprite, animation | 🟡 | `codex/game-build-isolated` | 🔒S | Sân xanh/cảnh phố, HUD gọn, quầy trên, kho dọc, thẻ mâm khi chạm bàn. 12 E2E pass; review CLEAN tại `2d80437`. Bếp/mồi nóng thêm7 sprite native RGBA; Bàn Lv2–Lv4 thêm3 imagegen pixel draft; bom bia Lv2–Lv5 thêm4 imagegen pixel draft; manifest hiện16 sprite placeholders và108 draft files gồm audio +4 Blender studies lưu trữ. Export palette/alpha/anchor checks và4viewport service/art smoke PASS; review11ceb79 đã giải quyết3 findings, export failure test được chạy độc lập PASS. Đã cập nhật brief owner: portrait casual-management, HUD bám mép, panel skeuomorphic bo tròn, pill dày, chữ tròn đậm, bóng mềm và game vỉa hè Việt Nam. Owner menu pause đã triển khai: giữ Nhập hàng mở sau mua, chỉ resume khi đóng; rules16 tách presence khỏi pause;156 engine/67 browser pass và native full-base review tại `7c60c70` không nêu lỗi cần sửa. Chưa đủ art/release. |
| F07 | 🎮 Code | Các Kiểu Khách — 3 loại P1 (thường/vội/VIP) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | 5 kiểu khách ngồi; shipper local v7 có timer riêng, giao cả đơn, cap/timeout/closing/replay và UI điện thoại. Review shipper CLEAN tại307a3b0; football và acceptance đầy đủ còn thiếu. |
| F09 | ⚖️ Economy | Thời Tiết Quán — tối giản (hệ số độ hơi/tip/spawn) | 🟡 | `codex/game-build-isolated` | 🔒S | 5 thời tiết từ config; rules10 sửa thứ tự baseline để hot/humid thực sự tăng nhịp khách, giữ active-rush floor và replay v9. 100 unit/37 E2E +20 k rows đã qua; review độc lập full diff2959544..432626d không có lỗi actionable. Sprite/ambient và full statistical QA tiếp tục. |
| F10 | 🎮 Code | Nâng Cấp Quán — bom/rửa/hầm/bàn cơ bản (×k) | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Rules21 bom dự trữ + vòi timed riêng, mua cốc, gate LP và capacity UI đã qua221 unit/server+75 browser và native review. Cân bằng nâng cao đang chờ quyết định (k tới3.2074); art và full acceptance tiếp tục. Lịch sử: Bom/rửa/hầm/quầy/bếp + mua/nâng bàn có command/UI; phone/QR quote/gate/command/UI + boa qua review không còn findings tại598f66f; Biển rules9 lắp/đổi5 kiểu, gate uy tín, customer mix/Neon +5 sprite draft;95 unit/37 E2E xanh, full-diff review bdbb493..9239007 không còn findings sau3 sửa lỗi biên. Tờ rơi rules11 có mua bằng uy tín, LP2, kho/timer/báo cáo/UI VI-EN;108 unit/40 E2E +30 k rows qua; full-diff review360453e..d5be3e0 không có lỗi actionable, nghi vấn nhân k đã bị bác bằng thực thi. Free flyer daily5/5 đã được producer claimDailyBonus + quests.test xác nhận; cốc mua và full F10 tiếp tục. Owner rules17: nâng cấp asset trong ca, giữ pause đến khi đóng menu; save v16 replay + mobile purchase đã qua config/build/166 unit/69 E2E và native review3ff21df không còn findings. Owner batch/HUD rules18/config1.7.3 đã qua174 unit/72 browser, config/build,20 canonical1000-serve k rows2.5821–2.9601 và15 rush; native reviewfe59758..7897bdd không còn lỗi actionable sau2 sửa HUD. Bia dự trữ tách kho thô, refill khi lấy lên mâm; save cũ nhận config ở ca kế tiếp. F10 đầy đủ/art từng cấp tiếp tục. |
| F25 | 🎮 Code | Ngôn Ngữ / Tài Khoản — chọn vi/en, guest play, Google login (kể cả giữa ca) | 🟡 | `codex/game-build-isolated` | 🔒S | Legacy guest local (đã thay bằng guest theo phiên, owner10/09) + vi/en + backup/replay v1–v3 + import/reset giữ bản cũ đã có; M4 guest-cookie auth backend đã qua kiểm tra/review; chủ dự án chưa có Google Client ID (09/09), hướng dẫn ở docs/google-signin-setup.md. Verifier Google917f862 đã qua review,255engine/server tests/config/build;5ca dùng chữ ký/chứng thư thật. Owner chốt lịch sử local phải duyệt trước khi tính BXH. Schema4 account/nonce/audit và Google HTTP đã có,264tests/config/build/CLI smoke qua; review độc lập ebe820c không tìm thấy lỗi mới, tự chạy6storechecks qua. Core nhập local một lần, gzip giữ bản gốc và provenance chờ duyệt đã có;271tests/config/build +80MB probe qua; native review51a0734 không tìm thấy lỗi mới. HTTP upload/approval/cloud UI và live Google chưa hoàn tất. First-run locale5871453 đã verify/review: chọn/nhận vi/en trước tạo game, giữ lựa chọn cũ và ca đang chạy;350unit +131browser/config/build qua, review không còn lỗi mới. Tiêu chí locale F25 PASS; M4 now12/18 OPEN. Schema6 checkpoint giảm cold read80MB29,36s→2,23s;281tests/config/build,10kcohorts/15rush qua; reviewf86e2b3 không có lỗi mới và tự chạy17tests qua. Theo owner, upload/tuning tiếp theo sang M9; Web936e9d5 đã dùng server; local lỗi vẫn có tải gốc/import/reset với backup nguyên bản. Registry/admin và account/import/eligibility UI là phần M4 tiếp theo. Google transport3c369aa giữ player/ca/outbox, nối sau ACK và đối soát bằng đổi nonce trước đọc phiên;351unit/server +33remote browser/config/build qua. Hai lỗi đối soát đã sửa; review cuối không còn finding. Panel Google e5745af đã verify/review: giữ ca và pause qua xác nhận, callback một lần, đúng3lợi ích;351unit/server,92local/44remote/19admin browser,final local1/1,config/build qua. Review cuối xác nhận sửa callback sau lỗi; Owner bỏ chọn quán/save: code8c9dc64 có hai chế độ, guest chỉ giữ phiên hiện tại; Google mới nối phiên một lần, tài khoản cũ khôi phục tiến độ. E18:353unit baseline; final34server/import +22account browser; remote62+bootstrap3; local87+rerun5 và admin18+rerun1 bao phủ92/19ca. Config/build và final review CLEAN. Tiêu chí nối guest hiện tại một lần PASS; M4 13/18 OPEN. Đăng nhập lại Google ddc77a9 đã verify/review: giữ journal/client stream, xác thực đúng tài khoản rồi phát lại lệnh;354unit/server,final35API/import,72remote/1local browser,config/build và native review PASS. E19 ghi rõ mất phản hồi trước/sau xử lý, cookie hết hạn/bị thu hồi/bị xóa, retry/hủy/lock. Steer #5 guest trên thiết bịe34fd56 đã verify/review:357unit/server,84remote,4local,19admin,config/build và scoped review không có lỗi mới. Lời mời/cooldown đã code nhưng P1 config proposal slice trước còn OPEN (invitation-config-review.md); không đổi economy/engine/config trong correction90d1a50. Live Client ID, public local upload/duyệt và eligibility còn thiếu.  E21:03dae56 chặn xoá nhóm ngưỡng ở đề xuất/publication, giữ config scope cũ;361unit/19admin/33focused/config/build và independent review qua. Lời mời/cooldown PASS; M4 hiện14/18 OPEN.  Core/API duyệt archive và flag đã code: audit bất biến, request/seq/digest và quyền MFA;45focused/config/build qua, full suite/review đang chạy; controls/score projection chưa có.  E23: score/baseline7e7f337 verified (376unit/server,19admin,32focused,config/build/review); P1 worker correction closed. E24 protected history/review controls85fbdfb verified:378unit/server +24admin browser, final5 affected browser/config/build and native full-base review PASS. E25 public live ranking628eb72 now verified, P1 display bounds fixed;386unit/server,11affected remote/24admin browser,config/build and CLEAN review; M4=15/18. Snapshots and full feature acceptance remain. |
| F27 | 🎮 Code | Onboarding — ca 1 = 1 khách 1 bia, thông báo mất khách, step guide (lần đầu + sau 3 lần mất khách) | 🟡 | `codex/game-build-isolated` | 🔒S | Guide theo events/config, skip/persist + giới hạn chạy lại. Browser/unit pass; Google giữa ca + playtest 5 người chưa có. |

### Phase 2: Đủ demand-mix (M3)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F11 | 🎮 Code | Bếp & Mồi Nóng — bếp 4 cấp, 3 mồi nóng | 🟡 | `codex/game-build-isolated` | 🔒S 🔒B | Rules21 chảo nhiều phần cùng món với batch ID riêng và demand theo kho/nhóm đã kiểm tra. Cân bằng nâng cao k3.0416–3.2074 chưa đạt band; quyết định owner đang chờ. Lịch sử: Live bếp và7 sprite đã qua reviewaf16833. Rules14 thêm dish/job/waste events, cursor ca/legacy partial, shared nominal-value helper và Sổ ca VI/EN gọi/bán/bỏ/TB mỗi mâm;143 unit/63 E2E/config/build xanh. Review độc lập full-base80ee489..2f1aa07 không nêu findings, tự chạy143 unit/config/build;20 k rows2.3125–2.7562 và15 pressure rows xanh. Demand theo loại khách, art/server và acceptance đầy đủ tiếp tục. |
| F17 | 🎮 Code | Nhiệm Vụ Quán Nhậu — 7 nhánh (ngày/ca/gift/điểm danh/referral/ĐLT) | 🟡 | `codex/game-build-isolated` | 🔒S | Rules12 daily5: seed VN/tier, actual event progress, rollover, reward/bonus guards/UI VI-EN; đã sửa P1 review về mốc onboarding mở nhiệm vụ.118 unit/46 E2E/config/build,20 k rows2.3171–2.7312 qua; full-base review3f978ec..e551b40 không còn lỗi actionable. Rules13 thêm điểm danh theo ngày active, claim uy tín một lần, đổi vòng/reset/offline/replay và ladder VI-EN;126 unit/52 E2E/config/build và20 k rows2.2564–2.8277 xanh; full-base review483bb03..d232be5 không nêu lỗi cần sửa. Gift transfer/referral/season authority và full F17 còn tiếp tục. |

### Phase 3: Server + meta + risk (M4–M6 — server-authoritative từ M4)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F23 | 🎮 Code | Kiến Trúc Server Quán — server-auth, websocket, CAPTCHA | 🟡 | `codex/game-build-isolated` | 🔒S | Web server authority/outbox/reconnect936e9d5 đã kiểm chứng. Schema8 default registry c1e953c: immutable proposal/approval/audit, role/tier decisions, VN day/season activation và pin khi mở ca; seed mới không tự kích hoạt.310engine/server,10remote browser, config/build,10kcohorts2.4186–2.8738/15rush qua. Review P2 giới hạn tác giả đã sửa; catalog rename bị chặn trước khi ảnh hưởng career; correction CLEAN. Schema9 admin Google/TOTP API6f42575 đã qua320tests/config/build và10remote browser; review CLEAN, typecheck độc lập qua. Editor `/admin`56a0a44 đã kiểm chứng:321engine/server,11admin/10remote browser, config/build qua. Review P2 buffer khi import JSON giống hệt đã sửa; review cuối CLEAN. Scoped core d91b92a đã kiểm chứng:334engine/server,13scope cases; timing campaign đã sửa theo review, regression độc lập qua; config/build,21browser,10kcohorts/15rush qua. Protected scope editor + factual impact a84f41f đã kiểm chứng:339engine/server,29focused,18admin/10remote browser,config/build qua; ba lỗi review đã sửa, correction không còn lỗi mới. Xem docs/admin-scopes.md. Forecast kernel03a6800 đã kiểm chứng:344tests/config/build, career parity,10kcohorts/15rush qua; hai lỗi lease/config/history đã sửa, review cuối không còn finding và regression độc lập qua. Xem docs/economic-forecast.md. Protected forecast a99a567 + mobile9900505 đã kiểm chứng:350engine/server,19admin browser và ca mobile cuối,config/build qua; review P2 race xuất bản đã sửa, review cuối không còn lỗi mới. Báo cáo xu7ngày dùng bản sao server, không sửa save thật; VND thiếu dữ liệu donate được ghi rõ. Emergency/account/import/eligibility/locale và segment/cap policy còn thiếu; xem docs/scoped-config-registry.md. M4 đạt12/18 OPEN sau locale5871453; xem docs/admin-editor.md. Xem docs/config-registry.md và .qa/registry-verification.json.  E21:03dae56 chặn xoá nhóm ngưỡng ở đề xuất/publication, giữ config scope cũ;361unit/19admin/33focused/config/build và independent review qua. Lời mời/cooldown PASS; M4 hiện14/18 OPEN.  Core/API duyệt archive và flag đã code: audit bất biến, request/seq/digest và quyền MFA;45focused/config/build qua, full suite/review đang chạy; controls/score projection chưa có.  E23: score/baseline7e7f337 verified (376unit/server,19admin,32focused,config/build/review); P1 worker correction closed. E24 protected history/review controls85fbdfb verified:378unit/server +24admin browser, final5 affected browser/config/build and native full-base review PASS. E25 public live ranking628eb72 now verified, P1 display bounds fixed;386unit/server,11affected remote/24admin browser,config/build and CLEAN review; M4=15/18. Snapshots and full feature acceptance remain. E26 arbitrary config comparison62e8646 verified:386unit/server,27admin browser,config/build/review CLEAN; full M4 remains15/18. E27 lifecycleb5d3545 verified:389unit/server,39focused,27admin+3final browser,config/build and independent review without introduced issues. |
| F12 | 🎮 Code | Giải Nhậu & Vụ Bia — 8 bậc, 2 Vụ Bia song song | 🟡 | `packages/engine/src/seasons.ts` | 🔒S 🔒B | Rules23: hai mùa theo lịch, thu nhập sau daily cap, peak thật, lịch sử cá nhân và panel VI/EN. Đã verify/review tại faece69: 248 engine/server, 79 browser + 6 kiểm tra lại, config/build/k nền/rush qua. E25 public live ranking628eb72 verified/review CLEAN; snapshots và mailbox chưa xong. |
| F13 | 🎮 Code | Đường Lên Trùm — LP0–LP7, gate tính năng & mặt bằng | 🟡 | `codex/game-build-isolated` | 🔒S | Requirements/claim-once và producers đã có. Hai seed30ngày (480ca) tớiLP4; replay tháng khớp,250tests/config/build/k nền/rush/review qua. FullLP0–LP7/balance còn mở; save tháng80MB vượt localStorage; adapter IndexedDB c9db016 đã review và qua91browser/80MB exactreopen/Appboot. |
| F14 | 🎮 Code | Mặt Bằng Quán — 9 mặt bằng, rent/cọc 7 ngày | 🟡 | `codex/game-build-isolated` | 🔒S | Rules22 quote/purchase/early move/expiry/refund, real-calendar pause/offline, config/replay/SQLite và menu VI/EN.234 engine/server,77browser,config/build,10kcohorts+15rush pass; native review fixes verified atce7564b. Break-even/art/neighborhood/shift-report còn tiếp tục. |
| F15 | 🎮 Code | Sự Cố Quán Nhậu — bảo kê, trộm offline, đánh nhau (kiểm tra ATTP ⏸ pending) | ⏸ | `—` | 🔒S | Spec `docs/features/F15-risk-events.md`; §4 kiểm tra pending, `risk.inspection.enabled=false`. M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Preserve existing code/config/art; OFF/hidden for this release. |
| F16 | 🎮 Code | Rủ Bạn & Huy Hiệu — 3 mốc, huy hiệu Kết Nối | ⬜ | `—` | 🔒S | Spec `docs/features/F16-referral-badges.md`. |
| F28 | 🎮 Code | Bảng Xếp Hạng & Bàn Thờ Ông Địa — top N, hàng của tôi, snapshot kết Vụ | 🟡 | `apps/server/src/competitive-score.ts` | 🔒S 🔒B | Spec `docs/features/F28-leaderboard.md`; config `leaderboard` tier A. M4 prerequisite + M5. E23: caller-only score/baseline7e7f337 verified;376unit/server,19admin,32focused,config/build/review PASS. E24 admin history/review controls85fbdfb verified;378unit/server +24admin browser, final5 affected browser/config/build/review PASS. E25 public live query/VI–EN UI628eb72 verified:386unit/server,52focused,11affected remote/24admin browser,config/build and final CLEAN review. P1 display bounds fixed; M4=15/18. Immutable snapshots and profile names remain. Owner10/09: giữ tiến độ local, chỉ cộng lịch sử vào BXH sau khi duyệt, không cộng trùng. |
| F18 | 🎮 Code | Chó Giữ Quán — combat bảo kê, bảo hiểm trộm | ⏸ | `codex/game-build-isolated` | 🔒S | Mua/nâng 3 cấp từ config, debit chung + replay; sheet VI/EN, hình cùng một chó 3 cấp và reduced motion. Review CLEAN tại 0216cb0, config/build/60 unit/28 E2E/asset/sim pass; combat/capture/theft/server chưa có. M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Preserve existing code/config/art; OFF/hidden for this release. |
| F22 | 🎮 Code | Bia Đấm — LLM server-side, quota 20/ngày | ⬜ | `—` | 🔒S | Spec `docs/features/F22-ai-assistant.md`. Tùy feasibility. |
| F26 | 🎮 Code | ~~Vé Mở Ca & Thanh Toán~~ — ⛔ **bỏ 08/09: chơi free hết** | ⏸ | `—` | — | Spec `docs/features/F26-daily-session-pass-payments.md`. Cần payment/provider review. |

### Phase 4: Vé Mở Ca + sự kiện (M7–M8)

| PR | Wave | Feature | Status | Branch | Gates | Notes |
|----|------|---------|:------:|--------|:-----:|-------|
| F19 | 🎮 Code | Cúp Bóng Đá — lịch + tỉ số thật, TV, Giờ Vàng xem bóng | ⏸ | `—` | 🔒S | Spec `docs/features/F19-world-cup-event.md` + `07-SPEC-shop-mua-giai-worldcup.md`. Cần nguồn API. M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Preserve existing code/config/art; OFF/hidden for this release. |
| F20 | 🎮 Code | Mời Bia Hơi — **monetization duy nhất**, donate cho admin, cosmetic-only, KHÔNG P2W (mốc M7) | ⏸ | `—` | 🔒S | Spec `docs/features/F20-donation.md`. M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Preserve existing code/config/art; OFF/hidden for this release. |
| F21 | ⚖️ Economy | Vé Số Lấy Hên — xổ số/Vietlott, **cần legal review** | ⏸ | `—` | 🔒S | Spec `docs/features/F21-lottery.md`. EV target 0.6–0.8 (sink); blocked tới legal review. M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Preserve existing code/config/art; OFF/hidden for this release. |

---

## 5. Progress summary

| Phase | Total | Done (✅) | In progress (🟡) | Blocked | Deferred | % |
|-------|:-----:|:--------:|:----------------:|:-------:|:--------:|:-:|
| 0 — Nền (M0) | 7 | 0 | 7 | 0 | 0 | 0% |
| 1 — Lõi + onboarding (M1–M2) | 6 | 0 | 6 | 0 | 0 | 0% |
| 2 — Demand-mix (M3) | 2 | 0 | 2 | 0 | 0 | 0% |
| 3 — Server + meta + risk (M4–M6) | 10 | 0 | 2 | 0 | 3 | 0% |
| 4 — Vé Mở Ca + sự kiện (M7–M8) | 3 | 0 | 0 | 0 | 3 | 0% |
| **MVP total** | **28** | **0** | **17** | **0** | **6** | **0%** |

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

| 2026-09-10 | v0.48.1 | Locale5871453 verified:350unit,3final presentation,91local/21remote/19admin browser,config zero warnings/build PASS. Native review no actionable defects; independent3presentation PASS. First-run locale criterion PASS; M4 rises12/18, F25 remains in progress for Google web/claim/conflict/invitations/eligibility. No engine/economy/auth changes. |

| 2026-09-10 | v0.49.1 | Google guest-link transport3c369aa verified:351unit/server,33remote browser,config zero warnings/build PASS; independent full-base review no actionable defects after both reconciliation races fixed. Current guest player, shift/history/outbox stay intact; nonce renewal fences late verification. No new criterion closed: M4 remains12/18, F25 in progress for panel/conflict/recovery/prompts/eligibility. |

| 2026-09-10 | v0.50.1 | Google account panel e5745af verified:351unit/server,92local/44remote/19admin browser,final local1/1,config zero warnings/build PASS. Final full-base review reports no findings after permanent callback-consumption fix; failing regression proved a third POST before correction. F25 stays in progress; M4 stays12/18 OPEN for choice/recovery, invitations, import/eligibility and full acceptance. No engine/economy change or live Google consent claim. |

| 2026-09-10 | v0.51.1 | Two-mode owner correction8c9dc64 verified; current-visit guest claim PASS, M4 now13/18 OPEN. Guest fresh navigation starts fresh; Google new-account attachment/existing-account restore uses server authority and exact receipts. E18 records353baseline, final34server/import+22account browser, remote62+bootstrap3, local87+isolated5/admin18+isolated1, config/build and final review CLEAN. F25 remains in progress; live consent, reauthentication, invitations/import/eligibility remain. |

| 2026-09-10 | v0.52.1 | Google reauthentication ddc77a9 verified:354unit/server,final35affected API/import,72remote browser (10new),1local archive,config/build and independent full-base review PASS. Preserves original command journal and exact verified Google target; recovery handles expiry/revocation/missing cookie and response loss. M4 stays13/18 OPEN; configured invitations/import/access and live consent remain. |

| 2026-09-10 | v0.53.0 | Owner Steer #5 replaces fresh-visit guest reset with device persistence; transport/copy/tests/docs implemented, verification and independent review running. Optional book/season-entry invitations and shared cooldown implemented; guest departure warning removed. M4 remains13/18 until final evidence; no full F25/release claim. |

| 2026-09-10 | v0.53.1 | E20 guest device persistencee34fd56 verified:357unit/server,84remote,4related local,19admin,config zero warnings/build PASS; native scoped90d1a50...056cf7c review no introduced defects, independent typecheck PASS. Browser close/relaunch, new tab, exact-session refusal and pending receipts covered. Prior invitation/config P1 remains OPEN separately; M4 stays13/18, no full F25/live consent/release claim. |

| 2026-09-10 | v0.54.1 | E21 validation03dae56 verified:361engine/server,19admin browser,33focused,config zero warnings/build PASS. Initial review P1 historical scope composition corrected; final review confirms boundary and independently passes5cases. Invitation/cooldown criterion PASS; M4 now14/18 OPEN. No engine/economy JSON changes; eligibility/review continues. |

| 2026-09-10 | v0.55.0 | M4 review/flag core và API đã code trên base51a5ab5,45focused/config/build qua. Full suite và independent review tiếp tục; số14/18 chưa tăng vì rank projection/controls còn thiếu. Không thay schema/engine/economy. |

| 2026-09-10 | v0.55.1 | Core/API521e901 verified:367unit/server,19admin browser,45focused,config zero warnings/build PASS; native review no actionable correctness/security defects. F23/F25 remain in progress for baseline/score/admin history controls, M4 stays14/18. No schema/engine/economy change. |

| 2026-09-10 | v0.56.0 | Base1fd89d9: immutable imported-season baseline and authenticated own competitive score read implemented; core/HTTP focused checks pass, full verification/review running. Reuses engine season totals/tiers and pinned config. M4 stays14/18; public rank/snapshots and admin controls remain. |

| 2026-09-10 | v0.56.1 | E23 competitive score7e7f337 verified:376unit/server,19admin browser,32focused,config zero warnings/build PASS. Native full-base review closes P1 main-thread inflation;13 independent targeted cases pass. F28 moves to in progress for its M4 score prerequisite, not complete; M4 stays14/18. No schema/engine/economy change. |

| 2026-09-10 | v0.57.0 | E24 candidate38c1d75: protected imported-prefix pages and VI/EN review/flag controls,378unit/server +24admin browser/config/build PASS. Independent review finds no code/security defect; P3 stale tracker/dashboard corrected here. Visual QA locale-message correction and final review pending; M4 stays14/18. |

| 2026-09-10 | v0.57.1 | E24 at85fbdfb verified:378unit/server +24admin browser, final5 affected browser/config/build PASS. P3 tracker/dashboard drift corrected; locale regression red-before/green-after; final independent full-base review no actionable defects. Protected history/review controls complete, F23/F25/F28 still in progress; M4 stays14/18. Next public rank consumer; no engine/economy change. |

| 2026-09-10 | v0.58.0 | Public leaderboard reuses canonical competitive scores with current flags/review, configured refresh, deterministic ties, pagination and own-tier neighbors. VI/EN web shows public cache only and revalidates exact account before personal rank.16focused,4new remote,2local browser/config/build pass; full verification and independent review running. M4 stays14/18 until closure; no economy/engine changes. |

| 2026-09-10 | v0.58.0 correction | Initial full-base review P1: accepted zero/fractional/overflow leaderboard display settings break the consumer. Shared server admission/consumer validation now rejects them, preserving historical pins and correction flow.386test target; final full verification/review running. |

| 2026-09-10 | v0.58.1 | E25 public leaderboard628eb72 verified:386unit/server,52focused,11affected remote/24admin browser,config zero warnings/build and final full-base review CLEAN after P1 display-bound correction. Foundation88remote/2local pass. M4=15/18; M5=12/25; full F28 remains in progress for snapshots/shrine/filtered profiles. Engine/economy unchanged. |

| v0.59.0 | M4 admin arbitrary config comparison61e68d5 implemented; shared diff includes removed historical keys and per-snapshot scaling.386unit/config/build pass; full admin26/27 identified test-only OTP reuse, isolation correction and final review pending. M4 remains15/18; no engine/economy change. |

| v0.59.1 | E26 arbitrary config comparison62e8646 verified:386unit/server,27admin browser,config/build and final independent review CLEAN. Dedicated test actor preserves real OTP replay protection. Initial docs finding resolved; M4 remains15/18 and emergency schedule policy awaits owner. |

| v0.60.0 | M4 registry lifecycle implemented: server-derived phases, consistent read timestamps and existing scope selection, with VI/EN list/details/comparison labels.39focused/config/build pass; full verification/review running. M4 remains15/18; emergency policy still awaits owner. |

| v0.60.1 | E27 server-derived config lifecycleb5d3545 verified:389unit/server,39focused,27admin+3final browser,config/build pass; independent full-base review found no actionable introduced issues. Scope/shift semantics unchanged; M4 remains15/18. |

| v0.61.0 | Keg Lv2–5 imagegen drafts replace4placeholders via manifest; export/palette/alpha/hash tests and2stock/upgrade browser cases PASS. OwnerSteer6 resolves emergency schedule replacement; Steer7 waives human-only acceptance and realOAuth wait, requires fail-closed dev identity stub. Full verify PASS:389unit/server,10standard cohorts,15rush,2careers; no milestone marked complete by waiver alone. |

| v0.62.0 | Emergency registry/admin hotfix implemented per Steer6, with exact scope-schedule replacement, stale preview rejection, atomic24h post-review and protected VI/EN confirmation/recovery. Final verification and independent review running; no engine/seed changes. M4 remains15/18. |

## Owner Steer #8 — 2026-09-10 23:45

M8 DEFERRED by owner 2026-09-10 — post-release. Current order: M4 remainder → M6 → M7 → M9 → release candidate. Do not implement football/World Cup match cards, season shop or team themes; lottery and inspection remain OFF. Preserve existing M8 config keys, feature flags, manifest entries and 07-SPEC content; keep M8 production/admin features OFF/hidden. Skip M8-only asset generation. M9 still includes every non-M8 art/audio asset, axe, replay/security/performance QA and release packaging. Steer7 dev identity, human-test waivers, verification/review, voluntary-only donation and persistent guest rules remain. Supersedes earlier queue entries that include M8.

| 2026-09-10 Steer8 | M8 DEFERRED by owner 2026-09-10 — post-release — no M8 feature/config/asset/spec changes in this decision record. M4 hotfix review correction continues; dev identity remains next. |

## Owner Steer #9 — 2026-09-11 00:05

M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Supersedes Steer7/8 queues. The release is free, with no monetization. Preserve GDD/SPEC sections, config keys, flags, content stubs and manifest entries; do not build deferred features and keep them OFF/hidden in production/admin. Inspection and lottery remain OFF. Existing dog/emergency controls require a release-visibility audit; do not claim they are hidden until checked.

Current priority: finish emergency hotfix, dev identity acceptance and M4 closure; then remaining automated M1/M2/M3/M5 gameplay (full i18n, three full-shift viewports, measured upgrade suggestion, timeout feedback≤1s, onboarding off/admin thresholds, midshift sign-in, server seasons/snapshots/referral/gifts/ranks); then non-deferred art/audio via imagegen in owner critical-path order; then M9 first-playable<5s,≥30fps, zero console/missing assets, release k/replay/PWA. Human-only playtests remain WAIVED. The ~530 ROADMAP art inventory is the source target before excluding M6/M7/M8-only entries; enumerate exclusions rather than invent assets to meet a count. Placeholders only after repeated generation failures, explicitly recorded. Auth/registry and milestone reviews remain required; no economy values or engine rules change for this steering record.

| 2026-09-11 Steer9 | M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release — updated release queue and dashboard; current emergency verification/review continues. M4 closure must exclude deferred donation acceptance, not falsely mark that implementation PASS. |


## Current delivery target — owner Steer12, 2026-09-11

**playable-v0 supersedes full M1–M5 milestone closure as the delivery goal.** Finish the in-flight emergency hotfix only within about one hour; then explicit non-production dev identity, three-viewport full-shift happy path, blocker fixes, green verify, tag playable-v0 and pinned local5174/5175. Do not chase admin/forecast/ranking polish, extra diff viewers or additional closure evidence.

Acceptance: language→guest→12-minute shift (serve, pour/wash, restock, upgrades, close/summary)→next day; reload and new tab preserve progress; no blocking bugs/console errors; mobile first playable<5s and≥30fps. Midshift dev sign-in preserves the guest shift. Existing dishes/kitchen/customers/weather/rush/unlocks/seasons/quests/account surfaces must not crash; hide unfinished/deferred surfaces. M6/M7/M8 remain deferred, free without monetization, inspection/lottery OFF, no engine/economy changes.

Assets: owner waiver 2026-09-11: draft assets accepted for release. Current placeholders are also accepted by Steer12 when the happy-path fallback is visible; generate only missing/broken gameplay visuals and drop the ~530 target for this build. No polish rerolls. Human-only tests remain waived. Preview-2026-09-11 is an interim snapshot, not a claim of completed playable-v0.

| 2026-09-11 Steer12 | Goal narrowed to playable-v0 and three-viewport end-to-end playability; historical milestone FAIL/PASS entries remain evidence, not additional release blockers. |

| 2026-09-11 emergency complete | Registry hotfix: Super+MFA A/B, exact scheduled supersession/preview, atomic24h ticket and immutable retries.403unit/server,28adminbrowser,config/build PASS; independent full-diff CLEAN. No engine/economy changes. Next preview snapshot then dev identity/playable-v0 per Steer12; no further admin polish. |

## Dev identity acceptance — 2026-09-11

Explicit `TBH_AUTH_DEV=1`, loopback only and refused in production; same guest link/restore/receipts, private admin allowlist and TOTP. 406 unit/server tests, 1 dev-provider browser path, 5 normal Google browser regressions and independent auth review CLEAN. Verified via dev identity stub; real Client ID pending — owner waiver 2026-09-10. Next: Steer13 beer presentation, then playable-v0 three-viewport full-shift smoke. No engine/config/economy changes.

## Beer presentation — owner Steer13, 2026-09-11

Inventory is Bom bia / Beer keg and Mua bom / Buy keg. The tap station is Vòi rót / Beer taps; its buffer is Cốc rót sẵn / Poured glasses. Separate keg HUD item, live pipeline line, current/next capacity and bilingual guidance use existing state/config selectors. 47 affected local browser cases pass (including corrected label expectations and VI/EN), config/build and 406 unit/server tests pass; full verify receipt `.qa/beer-copy-verify.txt`. No engine/config/economy changes.

Queued after playable-v0 only: owner Steer14 approves trying config2.0.3 buffer5/8/12/20/40; all k gates required, fallback4/7/12/20/40, otherwise retain current3/6/10/18/40. Stable current numbers stay pinned for the smoke/tag.


## playable-v0 acceptance — 2026-09-11

PASS on the stable config2.0.2/rules24 build: full real-time12-minute guest shifts at390×844,360×740,1280×720; service/washing/restock, actual in-shift upgrade purchase, summary, next day, reload and new-tab persistence. First playable1340/1264/627ms, measured60.09/60.34/60.16fps;0console errors/failed image requests. Mobile receipts passed in the combined run; desktop passed independently after removing a stale order-bubble locator from the harness.

Full verify:406/406unit/server,10standard cohorts k2.4186–2.8738,15rush cases, career42/99 k3.48328/3.31825≤3.5. Three legacy risk-preview regressions and check:assets pass; shipped risk controls are hidden. Dev identity acceptance is in a7331b4; beer naming in e4a4bf6. Independent release diff review CLEAN.132manifest entries,108drafts,16accepted placeholders; two failed-alpha imagegen attempts recorded and counter cards have a registered table fallback.

This closes the owner-defined playable-v0 subset, not every M1–M5 milestone. M6/M7/M8 remain deferred; human-only acceptance remains WAIVED. Packaging/run instructions and exact code commit: [playable-v0](playable-v0.md). Next, only after the tag: Steer14 buffer5/8/12/20/40 with full k gates and the owner-specified fallback.


## Steer14 complete — config2.0.3 buffer fallback, 2026-09-11

After tag `playable-v0` (`a602af3`, code `d048a9c`), primary buffer5/8/12/20/40 failed standard full-menu k at seeds42/99:3.0297/3.1504. It was not committed or published. Owner-authorized fallback **4/7/12/20/40** passed full `npm run verify`:406/406unit/server,10standard cohorts,15rush cases,30-day LP4 careers42/99 **3.465460767842698 / 3.393196640939153**≤3.5. The earlier host-sleep run timed out two forecast tests; the unchanged full rerun passed all406. Three affected capacity UI cases and independent final fallback review CLEAN.

Only JSON metadata and `upgrades.keg.kegStorage` changed; kegBatch2/3/5/8/14, refillMs12/8/6/5/4s, pourSlots/pourMs/refillEnabled remain identical. GDD keg row and08§8.1 now match JSON; default shift prefill and VI/EN capacity labels read config automatically. Legacy fixtures unchanged.

| Seed | Cold-menu k | Full-menu k |
|---|---:|---:|
|20260611|2.5762|2.9005|
|42|2.6124|2.8953|
|20260908|2.5739|2.9168|
|7|2.5644|2.8068|
|99|2.6088|2.8521|

Receipts: `.qa/buffer-5-verify.txt` (rejected primary), `.qa/buffer-4-final-verify.txt`, `.qa/buffer-cohorts.json`, `.qa/buffer-4-career-result.json`, `.qa/buffer-4-web-final.txt`, `.qa/review-buffer-final-verdict.txt`. The standard simulator does not print Lv1 served-per-shift, so no such delta is inferred from its1000-serve cohorts. Re-evaluate after Alpha playtest with real player data; the7-day faucet/sink report remains the endgame-inflation lens.

Local5174/5175 are verified at the pinned `playable-v0` checkout, config2.0.2, with existing database/backup and explicit dev identity; real runtime midshift sign-in smoke PASS. Config2.0.3 is the new source seed, not a silent publication into that existing registry or a rewrite of open-shift pins. M6/M7/M8 remain deferred; no monetization.


## Steer15 (1a–d) — upgrade and ingredient labels, 2026-09-11

Kitchen cards now display config-derived new hot dishes, parallel pans, portions and prep-time improvement, plus the raw-stock/cook-to-order explanation. Level0 hides the live0/0 row. Phone explains shipper takeaway orders and retains the configured LP gate; QR lists phone ownership first and retains the configured tip multiplier. Stock rows/HUD use ingredient names, hot ingredients show the finished-dish hint only when unlocked, and restock controls retain compact amounts with ingredient accessible descriptions. Beer keeps Buy keg/Mua bom; emergency crate contents use ingredient labels behind the existing hidden-risk flag. VI/EN match. No engine or config values changed.

Label/browser checks:18 passes in the focused kitchen/economy2/production/pause run; the only failure was the old beer-button label in pause.spec.ts, updated and passed with both business-card regressions (3/3). Full verification receipt: `.qa/steer15-copy-verify.txt`. Assets and preview publication are the next two owner-authorized steps.

Steer15 (1) final verification: full verify PASS406/406, standard10cohorts k2.5644–2.9168,15rush cases, career42/99 k3.46546/3.39320. Final VI/EN label2/2 and guest flow4/4 PASS; final build refreshed after matching the finished dish name Tóp mỡ Triều Khúc to its config label. Engine/config diff is empty.


## Steer15 (2) — equipment drafts, 2026-09-11

All13 requested per-level sprites generated via built-in imagegen and exported through the existing keyed-alpha/native-crop/token-palette pipeline: washer2–5, cooler2–5, stall1–5. Manifest paths resolve with source, draft status and SHA-256; no fallback needed for this batch.132entries/121drafts/3remaining placeholders; check:assets PASS. Prompt/export provenance and128/64/32px contact sheet are in the asset checklist. Full verify PASS406/406, standard10cohorts k2.5644–2.9168,15rush cases, career42/99 k3.46546/3.39320. Per-level upgrade-image browser regression PASS; independent source/art review CLEAN. The playable smoke passed360×740 and1280×720;390×844 is retrying after a test-only popup/receipt synchronization correction. Tag and preview cutover remain gated on that result. No engine/config or kitchen art changes.


### Steer15 playable-v0.1 acceptance — 2026-09-11

All three real12-minute viewport paths PASS:390×844561ms/60.25fps/68served;360×740751ms/60.44fps/75served;1280×7201040ms/60.27fps/83served. Every path includes earned-coin upgrade, restock, washing, summary, next day, reload/new-tab persistence,0console/failed requests. The390 retry fixed only test popup/receipt synchronization. Full verify406/406 +10standard/15rush/2career gates and check:assets green; source/art and local-operation reviews CLEAN. Code/art7dc5998, copyaf9d287. Tag/run instructions: docs/playable-v0.md. Remaining owner step: backed-up preview cutover then normal next_shift publication of source2.0.3 to the existing registry, preserving historical pins and receipts.


### Steer15 complete — pinned preview and config publication, 2026-09-11

Steps1/2:af9d287/7dc5998. Local preview now serves tagplayable-v0.1 b3cfb34. Normal next_shift publicationregistry-183f67c7-2c6e-489a-94d5-0862e29bb0f7 (source2.0.3,7418c7b; base2.0.1), ordinary audit seq5/6/7, identical retry receipt. Backups retained;4old profiles,7054commands,4842events,30receipts and3old shift pins preserved. New Lv1 buffer4/4 verified. Temporary dev Super/TOTP operator logged out and removed; original disabled admin state restored. Full verify406/406 +all economic gates and3guest viewport shifts PASS,121drafts/3remaining placeholders; runtime core console0. Broader dev-account console smoke found the pre-existing HTML pattern error in admin-api.ts:68; sign-in still preserves the same shift/coins. This out-of-scope defect is recorded in docs/playable-v0.md, not silently waived or fixed. No other feature work started.
