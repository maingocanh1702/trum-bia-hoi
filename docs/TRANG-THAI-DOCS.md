# 📌 TRẠNG THÁI BỘ DOCS — Trùm Bia Hơi (cập nhật 18/09/2026)

> Bản **mới nhất**, thay cho mọi bản trước (không giữ lịch sử). Cập nhật lần cuối: 08/09/2026, sau khi áp nốt các việc còn lại. Trả lời: bộ docs đã đủ để giao dev/designer build game chưa, còn gì chờ chủ dự án.
> Kiểm bằng cách mở từng file HANDOFF trỏ tới và đối chiếu với `docs/config/economy.tbh.json` (nguồn số).

## 1. Kết luận

**Đủ để build; M0 đã qua kiểm tra tự động, M1–M3 có bản local đang hoàn thiện.** Tiến độ code và giới hạn hiện tại: `docs/build-progress.md` (14 feature đang triển khai, 0 hoàn tất; review độc lập đang chờ). Prompt dán vào Claude Code: **`12-PROMPT-claude-build.md` Phần 1** (gói `11-PROMPT-PACK` Phần B + vòng lặp Codex review); Codex chạy bằng `codex exec review --base master - < docs/prompts/codex-review.md` (codex-cli 0.152 có sẵn trên máy). Ràng buộc rõ, số tập trung ở JSON, layout có ảnh tham khảo, onboarding đã thành luật, gate `npm run check:config` chạy được ở gốc repo và đang xanh trên `packages/engine` (40 section, 39 section phân loại). Không còn mục 🔴.

Còn lại: **3 việc "chốt sau"** (mục 4, có default) và **2 việc nhỏ trước khi giao** (mục 4b). Quy trình build **do dev tự quyết** — Level 3 không còn bắt buộc.

## 2. Độ phủ theo lĩnh vực

| Lĩnh vực | Trạng thái | Nguồn ràng buộc |
|---|---|---|
| Gameplay lõi (ca, hệ bàn, Order, freshness, rót/rửa tự động) | ✅ | GDD §1–§10, 03-SPEC §1–§9 |
| Gameplay lớp 3–5 (khách, thời tiết, rush, meta, risk) | ✅ | GDD §7–§16, F07–F22 |
| Economy | ✅ | 08-SPEC v1.3.7 + `economy.tbh.json` 1.7.1 (`_meta.governance` tier A/B/C) |
| Asset | ✅ | 11-PROMPT-PACK Phần A v1.11, checklist v1.4 (**~550** = ~475 sprite/icon + 75 audio id; 8 đã có), naming §11, design-tokens |
| Âm thanh | ✅ | Checklist §B7: **75 id** (mỗi id `.ogg` + `.m4a`), thư mục theo nhóm, phát theo event id → manifest |
| UI / component / motion | ✅ | UI invariants HANDOFF §6 + brief B binding 10; 09-SPEC/05-SPEC/F24 = tham khảo |
| Layout | ✅ | `docs/reference/` 8 ảnh + README (HUD sân quán, sheet, popover nâng cấp, Bàn Thờ…) |
| Onboarding | ✅ | **F27 v1.1 🟢** + JSON `onboarding` (tier C) |
| Tech (engine, config, lưu trữ, server) | ✅ | 10-SPEC v1.7 §1/§5/§7/§9/§10/§13, F23 §8 — **localStorage trước, server ở M4** |
| Admin / Config Registry | ✅ | BRD §5.2 + §11; 08-SPEC §22 |
| Bảng xếp hạng | ✅ | **F28 v1.0** + JSON `leaderboard` (tier A) |
| Lộ trình & tracker | ✅ | 06-ROADMAP **v3.1** — 1 phase, mốc M0–M9 (M7 = Donate + pháp lý); `implementation-tracker` **v0.8.0** (14 đang triển khai, 0/28 hoàn tất; F26 ⏸ bỏ), `dashboard.*` rebuild |
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
15. Số kinh tế đi kèm đã **chốt trong JSON 2.1.0 / rules 28** (S5 `eco21-balance-pass`, 20/10/2026): bộ ứng viên W9 được sim cân bằng lại — đo bằng bot của plan (bàn/ghế trước, thuê thẳng, không chó, bắt đầu 09/09), 21/23 hàng cổng đạt trên seed 42 và 99; hai hàng "kết ca 1 mua nổi bàn 2" (nghiêm: mọi lượt; theo plan: ≥ 4/5 lượt, thu 850–1.160, ~10 cặp) đỏ ở D19 `maxMult` 4 và `tableSlots` 8 ở mọi mặt bằng đảo D13, nên PR ghi `[NEEDS OWNER DECISION]` hai lần; số và bảng cổng ở 08-SPEC changelog 2026-10-21 (vòng 2) / JSON 2.1.0. Chưa có playtest người thật.
16. **Thứ tự ưu tiên trải nghiệm:** (1) onboarding nhìn-là-hiểu (F27 luật #5 đè: step guide chỉ là dự phòng) → (2) mua sắm lần lượt → (3) economy. Slice `fun-onboarding-visual` đứng đầu Đợt 1.

## 4. Còn chờ chủ dự án (đều đã có default, không chặn dev)

| # | Việc | Default đang dùng | Cần khi |
|---|---|---|---|
| 0 | **D24 trần ngày 400 k base, D25 hàng đợi 1 + ghế/8** — owner chưa bác | dùng default; đã chốt trong JSON 2.1.0 (S5): trần ngày **400 k base** như owner (review vòng 1 từng hạ xuống 350 k mà không cổng nào cần, vòng 2 trả lại), hàng đợi 1 + ghế/8 giữ | playtest người thật |
| 0b | **Hai quyết định owner của S5:** (1) P0 — kết ca 1 mua nổi bàn 2 (hai hàng ví ca 1 đỏ; trên 300 lượt bộ đã commit chỉ 26 % mua nổi bàn 2 khi ca 1 đóng; giá bàn 2 chỉ chạm 80 % từ 1.073 xu (1.100 xu: 78 %) và không đổi được thu 850–1.160 hay ~10 cặp; D19 `maxMult` 2: 67 %; không điểm nào của lưới 40 điểm đạt cả ba số của plan, BLOCKERS `04 · P0`), (2) `tableSlots` 8 ở mọi mặt bằng (đảo D13 "hẻm đầu = 4 bàn") | dùng bộ đã commit (hàng P0 đỏ, 8 chỗ); mọi lựa chọn và bảng ở BLOCKERS `04 · P0` và `04 · tableSlots` | trước khi S6 vẽ sân (số chỗ) và trước playtest 3 ca |
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
- `PHASE_DATES` trong `tools/dashboard-engine/build_dashboard.py` để trống có chủ đích (ROADMAP v3.1 chưa gán ngày) — dashboard ghi "Chưa gán ngày"; điền lại khi team chốt ước lượng.
- Script vá một lần `scripts/apply_pending_0809.py` đã xoá. Backup `$HOME/*.bak` trên máy có thể xoá.
- **(16/09/2026)** Nhánh công cụ xác minh agent (`agent-verification`, tách biệt với bộ docs build
  game ở trên) đã xong M1/M2: 12 PR (`#1`-`#12`) — skill `/how`, skill `verify-trum-bia-hoi` (23
  feature file), bridge `window.__TBH_VERIFY__` (snapshot + cả 2 mode local/remote),
  `scripts/verify/{port,doctor}.ts`, `map-coverage.ts`, fixture `tbh-fixture.ts` +
  `bridge.spec.ts` (PR #12 là lần đầu `verify_host` chạy Playwright thật, không chỉ unit test
  browser-free). Chi tiết: `trum-bia-hoi-agent-understanding-verification-implementation-plan.md`.

## 6. Bản đồ nhanh — đọc gì trước

`00-HANDOFF` v1.15 (điểm vào, §4 scope + §6 quy ước) → **`12-PROMPT-claude-build.md`** (dev kickoff + Codex review) · `11-PROMPT-PACK` v1.14 Phần A (designer) / Phần B (chi tiết dev) → `02-GDD` v1.12 + `03-SPEC` (luật chơi) → `08-SPEC` v1.3.7 + `economy.tbh.json` 1.7.1 (số) → `06-ROADMAP` v3.1 (mốc M0–M9) + `implementation-tracker` v0.8.0 (14 đang triển khai, 0/28 hoàn tất) → `docs/features/F07–F28` → `docs/reference/` (layout) → `trum-bia-hoi-brd-admin.md` §5.2 (config admin).

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
