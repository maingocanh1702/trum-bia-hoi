# 📌 TRẠNG THÁI BỘ DOCS — Trùm Bia Hơi (cập nhật 22/10/2026)

> Bản **mới nhất**, thay cho mọi bản trước (không giữ lịch sử). Cập nhật lần cuối: 22/10/2026 (Đợt 4 đóng gói "Vui 3 ca": chỉ sửa các câu đã thành sai, xem changelog). Trả lời: bộ docs đã đủ để giao dev/designer build game chưa, còn gì chờ chủ dự án.
> Kiểm bằng cách mở từng file HANDOFF trỏ tới và đối chiếu với `docs/config/economy.tbh.json` (nguồn số).

## 1. Kết luận

**Đủ để build; M0 đã qua kiểm tra tự động, M1–M3 có bản local đang hoàn thiện.** Tiến độ code và giới hạn hiện tại: `docs/build-progress.md`; bảng trạng thái `docs/implementation-tracker.md` + `docs/dashboard.md`: **20 feature đang triển khai, 0/28 hoàn tất**, 6 hoãn (đếm lại 22/10/2026 theo bảng của tracker). Prompt dán vào Claude Code: **`12-PROMPT-claude-build.md` Phần 1** (gói `11-PROMPT-PACK` Phần B + vòng lặp Codex review); Codex chạy bằng `codex exec review --base master - < docs/prompts/codex-review.md` (codex-cli 0.152 có sẵn trên máy). Ràng buộc rõ, số tập trung ở JSON, layout có ảnh tham khảo, onboarding đã thành luật, gate `npm run check:config` chạy được ở gốc repo và đang xanh trên `packages/engine` (42 section, 41 đã xếp tier — `npm run check:config`, 22/10/2026). Không còn mục 🔴.

Còn lại: **3 việc "chốt sau"** (mục 4, có default) và **2 việc nhỏ trước khi giao** (mục 4b). Quy trình build **do dev tự quyết** — Level 3 không còn bắt buộc.

## 2. Độ phủ theo lĩnh vực

| Lĩnh vực | Trạng thái | Nguồn ràng buộc |
|---|---|---|
| Gameplay lõi (ca, hệ bàn, Order, freshness, rót/rửa tự động) | ✅ | GDD §1–§10, 03-SPEC §1–§9 |
| Gameplay lớp 3–5 (khách, thời tiết, rush, meta, risk) | ✅ | GDD §7–§16, F07–F22 |
| Economy | ✅ | 08-SPEC v1.3.11 (changelog tới 22/10/2026) + `economy.tbh.json` **2.1.4** (rules 28, mô hình bàn ghế; số S5 chốt ở 2.1.0 + giá "Mời về" 0,5 của owner 22/10/2026 + HUD và nút Nâng cấp hiện từ ca 1 của founder 22/10/2026 + sửa ca 1 của founder 22/10/2026: "Mời về" từ ca 2, ca 1 không có "Bàn lai rai", một nút "Mở ca" + nhịp đầu game của founder 22/10/2026 (nhánh `feat/early-pacing`; QD-117 chốt 23/10/2026: phương án B do founder sửa; STOP lần 2 chốt 23/10/2026: phương án 1, giao thức nới trần tổng 30 ngày thành +14 % = 9 519 000 và ghế 2 đầu tiên thành ca 35–56): 3 ca đầu chỉ khách lẻ, Giờ Vàng hẹn lại lượt khách đang chờ, ca 1 bia không hết hơi; `_meta.governance` tier A/B/C) |
| Asset | ✅ | 11-PROMPT-PACK Phần A v1.11, checklist v1.4 (**~550** = ~475 sprite/icon + 75 audio id; 8 đã có), naming §11, design-tokens |
| Âm thanh | ✅ | Checklist §B7: **75 id** (mỗi id `.ogg` + `.m4a`), thư mục theo nhóm, phát theo event id → manifest |
| UI / component / motion | ✅ | UI invariants HANDOFF §6 + brief B binding 10; 09-SPEC/05-SPEC/F24 = tham khảo |
| Layout | ✅ | `docs/reference/` 8 ảnh + README (HUD sân quán, sheet, popover nâng cấp, Bàn Thờ…) |
| Onboarding | ✅ | **F27 v1.1 🟢** + JSON `onboarding` (tier C) |
| Tech (engine, config, lưu trữ, server) | ✅ | 10-SPEC v1.7 §1/§5/§7/§9/§10/§13, F23 §8 — **localStorage trước, server ở M4** |
| Admin / Config Registry | ✅ | BRD §5.2 + §11; 08-SPEC §22 |
| Bảng xếp hạng | ✅ | **F28 v1.0** + JSON `leaderboard` (tier A) |
| Lộ trình & tracker | ✅ | 06-ROADMAP **v3.3** — 1 phase, mốc M0–M9 (M7 = Donate + pháp lý); `implementation-tracker` **v0.64.0** (20 đang triển khai, 0/28 hoàn tất; F26 ⏸ bỏ), `dashboard.*` rebuild |
| Hướng dẫn agent (đọc trước HANDOFF) | ✅ | `CLAUDE.md`/`AGENTS.md` dòng verify → `check:config` ở root + build/test/sim của game mới (prototype chỉ khi đụng `prototype/`); `SESSION-TRACK-LOG` block build mới nhất + checkpoint hiện tại; 11-PROMPT-PACK §0.2 thứ tự = config → engine + local save → server M4 |
| Content bank | ⏸ pending | `docs/content/` mới là đề xuất schema + 5 ví dụ |
| Tính năng kiểm tra (policy check) | ⏸ pending | F15 §4; ship `risk.inspection.enabled=false` |
| Monetization | ✅ | **Chơi FREE hoàn toàn; nguồn thu duy nhất = donate cho admin** (F20 Mời Bia Hơi, cosmetic thank-you, không P2W, không paywall). F26 ⛔ bỏ. JSON 1.7.1 `entitlements.mode=free` + `donation` (tier A); BRD v0.5 §7 Donation |

## 3. Quyết định chủ dự án đang có hiệu lực (08/09)

1. **Onboarding (F27 🟢):** guest chơi không cần đăng ký; khuyến khích đăng nhập Google (lưu tiến độ · thành tích · đua top); **đăng nhập giữa ca lưu realtime, không ngắt ca**; ca 1 = **1 khách gọi 1 cốc bia**; không phục vụ kịp → khách rời đi + toast số xu/uy tín thực trừ; **3 lần liên tiếp → hướng dẫn step-by-step**; lần đầu chơi cũng có step guide (bỏ qua được).
2. **Lưu trữ: localStorage trước, server sau (M4)** — thiết kế server-ready qua `eventLog` append-only; đổi adapter `SaveStore` khi lên server.
3. **`npm run check:config` chạy từ gốc repo** (`package.json` gốc).
4. **Layout tham khảo = `docs/reference/`** (ảnh game gốc, kiểu sân quán không gian) — không phải card-list ở 09-SPEC §3.1.
5. **Content bank + tính năng kiểm tra: pending**, chưa dùng làm ràng buộc, không tính vào acceptance M6.
6. **Mặt bằng: 9** (theo `locations.list` / F14 / 08 §16).
7. **Quy trình build do dev/agent tự quyết** — Level 3/autopilot (worktree, scope gate, `/ap-*`) **không còn bắt buộc**; `.autopilot/` + `docs/autopilot-*.md` là lưu trữ. Review độc lập theo HANDOFF v1.15/12-PROMPT vẫn áp dụng. Ràng buộc kết quả: `check:config` xanh, build/test xanh, k trong band, changelog khi lệch doc, tracker/dashboard cập nhật (CLAUDE.md/AGENTS.md block "Build workflow").
8. **Chơi FREE hoàn toàn — monetization duy nhất = donate cho admin.** Không Vé Mở Ca, không bán quyền chơi/xu/sức mạnh, không paywall; donate tự nguyện (F20), quà cảm ơn cosmetic-only; cổng nhận tiền = adapter, mặc định QR chuyển khoản + admin xác nhận tay.
9. Việc còn lại: làm theo đề xuất, không hỏi lại.

**Cách viết doc giao việc (áp cho mọi bổ sung sau này):** chỉ định nghĩa đầu vào, đầu ra mong muốn, plugin/công cụ (Blender MCP cho asset…), acceptance/QA. Không viết quy trình từng bước — cách build do dev/agent tự quyết.

**Quyết định owner 17–18/09/2026 (đang hiệu lực, ghi đè mục tương ứng ở trên khi mâu thuẫn; nguồn: `docs/PLAN-vui-3-ca-2026-09-18.md` §1 D1–D25):**
10. Mục đích v1.0 = **vui khi tự chơi 3 ca**; ca = bận đầu (giữ 1 chạm giao mâm); 3 ca đầu không cooldown; HUD "mục tiêu kế tiếp" + sheet 3 làn; nút nhanh không pause.
11. **Mô hình bàn ghế v3.3**: 1 bàn 1 ghế → bàn 2–4 (kèm ghế) → ghế 2 từng bàn (chỉ sau đủ 4 bàn; ghế 2 = đón cặp + mâm bia và mồi) → cấp bàn (Lv2 đợt thêm · Lv3 mồi 2 · Lv4 tip ×1,25). Cặp độc lập với quán; từ chối tại cửa không phạt; hàng đợi 1 + ghế/8. Số chỗ bàn theo mặt bằng.
12. **k gate D4(a)**: đo trên đơn chuẩn; k quan sát được vượt 3,5.
13. **Full story = 168 ca** (3 tuần × 8 ca), LP nén (LP7 = màn kết: 2 tr base), **M6 mở lại** vào hồi 3, trần ngày 400 k base, hợp đồng mặt bằng 3 ngày, `tableSlots` (JSON 2.1.0 giữ đúng các số owner này; riêng `tableSlots` 8 từ quán đầu là quyết định owner thứ hai của S5, BLOCKERS `04 · tableSlots`). Cooldown 30 phút và trần ca 8/6/5 giữ.
14. **Mùa 21 ngày**, bảng xếp hạng theo mùa; mỗi mùa mới thêm một lớp gameplay.
15. Số kinh tế đi kèm đã **chốt trong JSON 2.1.0 / rules 28** (S5 `eco21-balance-pass`): bộ ứng viên W9 được sim cân bằng lại, đo bằng bot của plan (bàn/ghế trước, thuê thẳng, không chó, bắt đầu 09/09); sau hai quyết định owner 21/10/2026 (bàn 2 = **1.070 xu**; `tableSlots` 8 ở mọi mặt bằng, đảo D13) **22/22 hàng cổng ĐẠT + 1 hàng thông tin** trên seed 42 và 99 (`npm run sim:balance`; biên mỏng: ghế 2 đầu tiên ca 40 \| 40 so với cửa sổ 40–56, khoảng trống mua dài nhất 8 \| 7, cặp bị từ chối ca 1 5 \| 5, 83 % lượt probe mua nổi bàn 2 khi đóng ca 1). Đợt 3 (`fun-kick-table`) thêm section Tier A `kickTable` (`feeRate` 1,5, `repPerGuest` 2) dưới cùng nhãn 2.1.0 — nhãn nay mang 8 nội dung trong lịch sử git, chưa deploy: mọi lần chơi thử bắt đầu từ bộ nhớ trình duyệt trống + DB server mới. Số và bảng cổng: 08-SPEC changelog 2026-10-21/22. Chưa có playtest người thật.
16. **Thứ tự ưu tiên trải nghiệm:** (1) onboarding nhìn-là-hiểu (F27 luật #5 đè: step guide chỉ là dự phòng) → (2) mua sắm lần lượt → (3) economy. Slice `fun-onboarding-visual` đứng đầu Đợt 1.

## 4. Còn chờ chủ dự án (đều đã có default, không chặn dev)

| # | Việc | Default đang dùng | Cần khi |
|---|---|---|---|
| 0 | **D24 trần ngày 400 k base, D25 hàng đợi 1 + ghế/8** — owner chưa bác | dùng default; đã chốt trong JSON 2.1.0 (S5): trần ngày **400 k base** như owner (review vòng 1 từng hạ xuống 350 k mà không cổng nào cần, vòng 2 trả lại), hàng đợi 1 + ghế/8 giữ | playtest người thật |
| 0b | **Hai quyết định owner của S5 — ĐÃ CHỐT 21/10/2026** (founder, `OWNER-DECISIONS-S5.md`, user xác nhận trong chat): (1) P0 — kết ca 1 mua nổi bàn 2: cách (a), bàn 2 giá **1.070 xu** (428 base; trước 1.500 xu): ≥ 4 lượt trong 5 mua nổi khi ca 1 đóng (83 % ở n = 300, 81 % ở n = 600; ví đầu 750 xu); (2) `tableSlots` 8 ở mọi mặt bằng (đảo D13 "hẻm đầu = 4 bàn") được duyệt | đã áp trong JSON 2.1.0 và DECISIONS `## 04 · owner decision 1` / `2`; BLOCKERS `04 · P0` và `04 · tableSlots` đã đóng | xong; còn playtest 3 ca của owner |
| 0c | **Bốn OWNER CALL của PR #30 — ĐÃ CHỐT 22/10/2026** (founder): (1) giá "Mời về" `kickTable.feeRate` **0,5**, luật "+10 % thu nhập 30 ngày" đọc theo thu nhập ròng sau phí (cổng `sim:kick` đọc ròng: +8,85 % \| +9,06 %); JSON nhãn **2.1.1**; (2) "Mời về" nhận mọi bàn đang nhâm nhi (`consuming` + `occupied`): giữ như niêm phong; (3) chip "Mục tiêu kế tiếp" không gợi ý ghế 2 trước bàn 8 (nút nhanh "Mua ghế" chỉ hiện sau bàn 8; bộ lọc tầm với có thể cho thiết bị đi trước bàn 5–8, nên nhịp của người theo chip chưa đo — ghi chú còn lại, không phải OWNER CALL); (4) smoke guest lúc phát hành đỏ CHỈ ở hai dòng soft "mua bàn 2" được đưa lên bước promote nếu `npm run sim:balance` exit 0 với hàng `shift1.plan` ĐẠT trên đúng commit phát hành | đã áp: JSON 2.1.1 + `sim:kick` đọc ròng; `apps/web/src/goals.ts` (provider `chairs`); `docs/cloudflare-guest.md` bước 1b/4/7/8 | xong — `docs/handoff/2026-10-19-vui3ca/HANDOFF.md` §12–§14, DECISIONS `## 07 · owner calls 2026-10-22` |
| 0d | **Merge PR `feat/economy-2-1` → `main`, deploy `v-fb2` lên hai host, owner + 2–4 người chơi 3 ca** (phiếu 10 dòng ở `docs/phase0-alpha-playtest.md` §7, chưa tick) | PR mở, chưa merge, chưa deploy (lệnh phát hành ở `docs/cloudflare-guest.md` "Phát hành lên hai host", owner cho phép từng bước) | owner |
| 0e | **Part A (JSON 2.1.3, nhánh `feat/shift1-founder-fixes`) — STOP `sim:balance` ĐÃ CHỐT 23/10/2026** (founder, phương án (c), `.autopilot-state/A-FOUNDER-DECISION-2026-10-23.md`): A1/A2/A3 giữ nguyên, hai ô seed 42 đỏ chuyển sang B1 (không miễn), Part A không phát hành riêng. **Còn mở:** (1) Chí Phèo ở ca 1 chiếm cái bàn duy nhất tới 120 s và ca 1 không còn cách mời về (F07 dòng 2.1.3: chấp nhận · thêm `chipheo` vào `excludedCustomerTypes` · cho "Mời về" ở ca 1 với bàn ngồi lại); (2) "Mời tất cả về" của sổ ca cũng ẩn ở ca 1 là cách đọc A1 của worker (bỏ được bằng một điều kiện) | chưa chọn: Chí Phèo vẫn đến ở ca 1; nút sổ ca theo `show.kick` | trước khi phát hành A + B1 |
| 0f | **Part B1 (JSON 2.1.4, nhánh `feat/early-pacing`, xếp chồng trên Part A) — QD-117 ĐÃ CHỐT 23/10/2026 (phương án B, founder sửa: "B1.1 = singles ONLY while completedShifts < 3 (the first three shifts)"), rồi STOP lần 2 — ĐÃ CHỐT 23/10/2026 (phương án 1: "Nới 2 dòng, giữ cả 3 bản sửa")** (`.autopilot-state/QD-117-B1-STOP.md`): **founder chốt STOP lần 2 bằng phương án 1** — giữ cả ba bản sửa; giao thức nới trần tổng 30 ngày +10 % → +14 % (9 185 000 → 9 519 000) và cửa sổ ghế 2 đầu tiên ca 40–56 → 35–56 (commit `4b167f6`); `sim:balance` hết hàng đỏ, `sim:career:gate` ĐẠT (tổng 9 451 314 / 9 386 522). STOP lần 2 (giữ làm lịch sử): sau khi làm lại B1.1 và nới `door.shift1` (= 0 cặp khi ca 1 chỉ khách lẻ), còn đỏ ngoài dung sai của founder: tổng 30 ngày 9,451 / 9,387 tr (lệch 2,9 % / 2,2 % > 2 %) và ghế 2 đầu tiên ca 35 / 35 (sớm 5 ca > 2); `sim:career:gate` đỏ (9 451 314); hai ô Part A xanh (LP2 42 / 41, chuỗi 8 / 8). Lần STOP đầu (giữ làm lịch sử): trên A2 + B1, hai ô seed 42 mang từ Part A đã **xanh** (LP2 ca 27, chuỗi không mua 6), nhưng 4 hàng **đỏ ở cả seed 42 và 99**: tổng chuẩn 30 ngày 10,057 / 9,945 tr (≤ 9,185), ghế 2 đầu tiên ca 21 / 22 (40–56), bỏ đi có phạt ca 1–24 15,7 % / 13,0 % (≤ 10 %), cặp bị từ chối ở ca 1 0 / 0 (≥ 5 — mâu thuẫn với B1.1 theo thiết kế); `sim:career:gate` đỏ (tổng 10 056 681). Nguyên nhân: B1.1 và B1.2 làm đầu game nhanh hơn nhiều (bàn 4 ở ca 6–7 thay 13–15). Không chỉnh số | đã chọn 23/10/2026: phương án 1 (PR B1, `.autopilot-state/reports/B1-PR-BODY.md` §2.8); còn review, Linux, mở PR B1 | trước khi phát hành A + B1 |
| 0g | **Part B2 (UI thuần, JSON 2.1.4, nhánh `feat/early-ui-clarity`, xếp chồng trên PR B1 #35) — founder 23/10/2026 trả lời câu STOP của B2.8: "Thêm một lượt cho đầu game", ĐÃ LÀM**: mọi thông báo dùng một ô giữ chỗ trên thanh dưới; mọi trạng thái đầu game đúng một màn ở 390×844 / 360×740 / 1280×720, vi và en (09-SPEC §3.1). **Còn mở cho founder (không chặn; review B2-r2 đo lại trên tip cuối):** (1) quầy có bếp giữ cách xếp cũ, cuộn +50 / +63 px ở 360×740 / 1280×720 (ngoài lượt này); (2) quầy có biển hiệu hay điện thoại–QR: một màn lúc yên và trong ca, +28 / +41 px khi có thông báo (quầy về sau không giữ chỗ ô thông báo); (3) 390×664 (viewport của bằng chứng 22/10) cuộn 49–56 px, 420×680 33–40 px, điện thoại xoay ngang 844×390 vẫn cuộn 337–504 px (nút "Mở ca" duy nhất vẫn trên màn); (4) thẻ tổng kết Giờ Vàng chưa có ở chế độ online (một bộ đệm sự kiện phía client là đủ, không đổi engine); (5) chú thích bàn: tiếng Anh nay có nhãn ngắn, hết "…" với font của app; với font rộng (Linux) ở 360 px vẫn cắt "…" bốn nhãn tiếng Việt ("Khách sộp", "Bàn lai rai", "Đang gọi món", "Đang nhâm nhi"; "Đang nhâm nhi" cả ở 390 px), tiếng Anh không còn nhãn nào, đủ chữ cho trình đọc màn hình; (6) một dòng step guide dài nhất (vi, chưa có đơn: 66 ký tự) cạnh nút nhập bia và "Bỏ qua" ở 360 px với font rộng cần dòng thứ 4 và kết bằng "…" (đủ chữ trong DOM); (7) `tipOpen` nên là một hàm thuần của `rules.ts` ở slice engine sau (giao diện đang tự tính cửa sổ boa) | đã làm như founder chọn; (1)–(7) để mặc định | trước khi phát hành B2 |
| 1 | **Content bank** (câu hỏi kiểm tra · quest pool · lời thoại khách) + **tính năng kiểm tra** | ⏸ pending theo bạn; `docs/content/` là đề xuất; `risk.inspection.enabled=false` | M5–M6 |
| 2 | **Cổng nhận donate tự động (nếu muốn) · mức age gate** | QR chuyển khoản + admin xác nhận tay; age gate là config | M7 |
| 3 | **Nguồn lịch/tỉ số Cúp Bóng Đá** | Admin nhập tay (tier C); API thật = adapter + flag | M8 |

Ba mục item-list (hành phi, đá lạnh, giá cosmetic) đã **chốt theo đề xuất 08/09**: bỏ hành phi + đá lạnh khỏi nguyên liệu (6 món ↔ 6 nguyên liệu, `mat-onion`/`mat-ice` không vẽ, B1 còn 12 icon); giá cosmetic là giá cuối, không ×k (JSON 1.5.1 có `_rule`).

## 4b. Trước khi bấm "giao" (còn 2 việc nhỏ)

| # | Việc | Ai | Vì sao |
|---|---|---|---|
| 1 | `git push origin master` | Chủ dự án | `master` đã có đủ docs (ff-merge `8bca922`), nhưng `origin/master` vẫn ở `e3310cb`; agent chạy từ clone khác sẽ không thấy docs |
| 2 | Xác nhận môi trường agent designer có **Blender MCP + Blender ≥ 4.2 + Python Pillow/numpy** (brief A §0.1 ghi "đã cài sẵn") | Chủ dự án | Nếu chưa có thì designer bắt đầu bằng cài đặt, không phải asset |

Đã chốt: code game mới đặt ở **`packages/engine` · `apps/web` · `apps/server`** (npm workspaces trong repo này); README features F01–F06 trỏ GDD/08/03; P0–P3 trong CLAUDE.md là mức rủi ro autopilot cũ, không phải phase; **Level 3 không còn bắt buộc** — dev tự quyết quy trình.

## 5. Git & việc nội bộ

- **Đã vào `master`:** 4 commit `b4c39eb` → `8bca922` (docs pack 08/09, quyết định, tracker/dashboard, `package.json` gốc, bỏ Level 3) — fast-forward từ nhánh `docs/2026-09-08-docs-pack` (nhánh giữ lại, xoá được). **Lưu ý:** checkout sang nhánh cũ/`origin/master` sẽ làm các file docs biến mất khỏi thư mục (chúng chỉ tồn tại từ `b4c39eb`) — không phải mất dữ liệu, `git checkout master` là quay lại. Chưa push origin. Git chạy trực tiếp trên máy (qua mount không xoá được `index.lock`).
- `PHASE_DATES` trong `tools/dashboard-engine/build_dashboard.py` để trống có chủ đích (ROADMAP v3.3 chưa gán ngày) — dashboard ghi "Chưa gán ngày"; điền lại khi team chốt ước lượng.
- Script vá một lần `scripts/apply_pending_0809.py` đã xoá. Backup `$HOME/*.bak` trên máy có thể xoá.
- **(16/09/2026)** Nhánh công cụ xác minh agent (`agent-verification`, tách biệt với bộ docs build
  game ở trên) đã xong M1/M2: 12 PR (`#1`-`#12`) — skill `/how`, skill `verify-trum-bia-hoi` (23
  feature file), bridge `window.__TBH_VERIFY__` (snapshot + cả 2 mode local/remote),
  `scripts/verify/{port,doctor}.ts`, `map-coverage.ts`, fixture `tbh-fixture.ts` +
  `bridge.spec.ts` (PR #12 là lần đầu `verify_host` chạy Playwright thật, không chỉ unit test
  browser-free). Chi tiết: `trum-bia-hoi-agent-understanding-verification-implementation-plan.md`.

## 6. Bản đồ nhanh — đọc gì trước

`00-HANDOFF` v1.49 (điểm vào, §4 scope + §6 quy ước) → **`12-PROMPT-claude-build.md`** (dev kickoff + Codex review) · `11-PROMPT-PACK` v1.14 Phần A (designer) / Phần B (chi tiết dev) → `02-GDD` v1.13 + `03-SPEC` (luật chơi) → `08-SPEC` v1.3.11 + `economy.tbh.json` 2.1.0 (số) → `06-ROADMAP` v3.3 (mốc M0–M9) + `implementation-tracker` v0.64.0 (20 đang triển khai, 0/28 hoàn tất) → `docs/features/F07–F28` → `docs/reference/` (layout) → `trum-bia-hoi-brd-admin.md` §5.2 (config admin).

## Changelog

| Ngày | Thay đổi |
|---|---|
| 2026-09-08 | Cập nhật snapshot game mới, config 1.7.0, kiểm tra runtime và trạng thái review; giữ riêng evidence prototype. |

| 2026-09-08 owner UI/art | Tham khảo 7 asset boards mới, cốc xanh không quai là anchor; khách bỏ đi chỉ hiện toast số xu/uy tín thực trừ. |

| 2026-09-08 local history/time | Tracker v0.8.1: save v2 đọc v1, pause hidden/offline, recovery import/reset; 26 unit + 9 E2E, 10-row cold/full sim pass. Review corrections đang chờ re-review độc lập, không nâng trạng thái hoàn tất. |

| 2026-09-09 rules10 | Local config seed1.7.1 records ordinary-vs-active spawn-floor semantics; numeric values unchanged. See F08/F09 and build-progress for implementation/review evidence. |
| 2026-09-18 | Thêm quyết định 17–18/09 (mục 3 #10–15) + hàng chờ D24/D25; trỏ tới PLAN-vui-3-ca, FEEDBACK v3.3, DESIGN-story-3-tuan; GDD v1.13, 03-SPEC v1.4, HANDOFF v1.42 |
| 2026-10-20 | S5 `eco21-balance-pass`: mục 3 #15 và hàng chờ D24/D25 đổi từ "ứng viên W9, chưa sửa JSON" thành "đã chốt trong JSON 2.1.0" (số cân bằng lại bằng sim, bảng cổng ở 08-SPEC changelog); chưa có playtest người thật. |
| 2026-10-21 | S5 review vòng 1: bảng cổng đo lại bằng bot của plan (không phải v4), số chốt mới (08-SPEC changelog 2026-10-21); 21/22 hàng đạt, hàng ví ca 1 (P0) đỏ và là quyết định của owner; ví khởi đầu về 750 xu. |
| 2026-10-21 | S5 review vòng 2: trả lại trần ngày 400 k, hợp đồng 3 ngày, LP7 2 tr (không cổng nào cần số khác); hai quyết định owner của S5 được nêu tên — P0 (ca 1 mua bàn 2) và `tableSlots` 8 ở mọi mặt bằng; bảng cổng 23 hàng, 21 đạt. |
| 2026-10-22 | Đợt 4 đóng gói "Vui 3 ca" (stage 07) — chỉ sửa các câu đã thành sai: số feature đang triển khai **14 → 20** (đếm lại theo bảng trạng thái của tracker; 0/28 hoàn tất, 6 hoãn) ở mục 1, mục 2 và mục 6; phiên bản tracker v0.8.0 → v0.64.0, 08-SPEC v1.3.7 → v1.3.11, JSON 1.7.1 → 2.1.0 (rules 28); mục 3 #15 nói trạng thái cuối của S5 (22/22 cổng ĐẠT + 1 INFO sau hai quyết định owner) và section `kickTable` của Đợt 3 dưới nhãn 2.1.0 (8 nội dung); mục 4 thêm hàng 0c (ba OWNER CALL của Đợt 2–3) và 0d (merge, deploy `v-fb2`, playtest 3 ca); tiêu đề và dòng "cập nhật lần cuối". |
| 2026-10-22 | Đợt 4, review vòng 1 của stage 07 — thêm các câu đã thành sai còn sót: mục 1 "42 section, 41 đã xếp tier" (không còn 40/39), mục 2, 5 và 6 `06-ROADMAP` v3.3, mục 6 `00-HANDOFF` v1.43 và `02-GDD` v1.13. |
| 2026-10-22 | Vòng quyết định owner của PR #30 (stage 07b): hàng 0c "Ba OWNER CALL" → **bốn OWNER CALL ĐÃ CHỐT** (giá "Mời về" 0,5 đọc ròng + JSON 2.1.1; "đang nhâm nhi" giữ; chip không gợi ý ghế 2 trước bàn 8; smoke guest có ngoại lệ hai dòng soft với điều kiện `sim:balance`). Mục 3 #15 ("chốt trong JSON 2.1.0") giữ nguyên: số S5 vẫn là số của 2.1.0, nhãn 2.1.1 chỉ đổi `kickTable.feeRate`. Thứ tự đọc: `00-HANDOFF` v1.43 → v1.44; mục 1 dòng Economy: JSON 2.1.0 → 2.1.1. |
| 2026-10-22 | Founder override "HUD và Nâng cấp hiện từ ca 1" (JSON 2.1.2, config-only, Tier C): `featureReveal.hudAfterShifts` và `upgradeAfterShifts` 1 → 0, nhãn 2.1.1 → 2.1.2; mục 1 (Economy) nêu 2.1.2. Hành trình / Nhiệm vụ / giải đấu giữ 2 / 2 / 3 ca; không đổi số kinh tế, luật, code. Ghi đè đúng hai ngưỡng của luật owner 18/09 "HUD ca 1 chỉ 3 thứ" (GDD §17, 09-SPEC, F27 có dòng ghi ngày). Chưa phát hành: Netlify và Cloudflare vẫn phục vụ `v-fb2` (R `5336be7`). |
| 2026-10-22 | Founder sửa ca 1 sau PR #32 (JSON 2.1.3, Tier C, nhánh `feat/shift1-founder-fixes`, chưa phát hành): key mới `onboarding.featureReveal.kickAfterShifts` 1 ("Mời về" từ ca 2, AND với HUD) và `onboarding.firstShift.excludedCustomerTypes` ["ngoily"] (ca 1 không có "Bàn lai rai"; luật engine gate theo key, save ghim cũ replay như trước); thẻ mở quán bỏ nút riêng, chỉ xuống nút "Mở ca" ở thanh dưới. Nhãn 2.1.2 → 2.1.3; mục 1 (Economy) nêu 2.1.3. Không đổi số kinh tế. |
| 2026-10-23 | Mục 4 thêm hàng **0e**: founder chốt STOP `sim:balance` của Part A (phương án (c): giữ A1/A2/A3, hai ô seed 42 chuyển sang B1, không miễn, Part A không phát hành riêng); còn mở hai câu hỏi của Part A (Chí Phèo ở ca 1; "Mời tất cả về" của sổ ca theo `show.kick`). Review A-r1: 0 BLOCKER, 0 MAJOR, 6 MINOR, đã xử lý; Linux static xanh trên `672dde4`. |
| 2026-10-23 | Part B1 (founder 22/10/2026, nhịp đầu game, JSON 2.1.4, nhánh `feat/early-pacing`, chưa phát hành): mục 1 dòng Economy nêu 2.1.4 (ba key luật: `spawn.singlesUntilPairSeat` Tier A, `rush.schedule.replanPendingArrival`, `onboarding.firstShift.staleDisabled`); mục 4 thêm hàng **0f** (STOP `sim:balance` + `sim:career:gate`, chờ founder). Thứ tự đọc: `00-HANDOFF` v1.44 → v1.47 (dòng này chưa được nâng ở v1.45 / v1.46). |
| 2026-10-23 | Founder trả lời QD-117 (phương án B, sửa: 3 ca đầu chỉ khách lẻ, `spawn.singlesFirstShifts` 3): mục 1 dòng Economy và mục 4 hàng **0f** nói lại theo luật mới và STOP lần 2 (tổng 30 ngày và ghế 2 đầu tiên lệch quá dung sai). |
| 2026-10-23 | Review B1-r2: `00-HANDOFF` giữ dòng v1.47 của lượt đầu đúng như đã viết (append-only) và thêm dòng **v1.48** cho câu trả lời QD-117 của founder; thứ tự đọc nêu v1.48. |
| 2026-10-23 | Founder chốt STOP lần 2 của B1 (phương án 1: trần 30 ngày +14 % = 9 519 000, ghế 2 đầu tiên ca 35–56; không đổi số game): mục 1 dòng Economy và mục 4 hàng **0f** nói theo quyết định; thứ tự đọc nêu `00-HANDOFF` v1.49. |
| 2026-10-23 | Mục 4 thêm hàng **0g** (Part B2): founder trả lời câu STOP của B2.8 ("Thêm một lượt cho đầu game", đã làm: một ô thông báo giữ chỗ, mọi trạng thái đầu game một màn ở ba màn mục tiêu) và năm việc còn mở của PR B2 §12. |
| 2026-10-23 | Hàng **0g** (review B2-r2, lượt sửa cuối của Part B2): việc còn mở đo lại trên tip cuối — thêm quầy có biển hiệu / điện thoại–QR khi có thông báo (+28 / +41 px), 420×680 và 844×390, chú thích bàn (tiếng Anh nay nhãn ngắn; font rộng ở 360 px), một dòng step guide dài ở 360 px font rộng; bảy việc, mặc định giữ. |
