# HANDOFF — PLAN "Vui 3 ca" cho senior dev (19/10/2026)

> Người bàn giao: founder + Claude Code (phiên autorun 19/10/2026). Đọc file này trước, rồi `docs/PLAN-vui-3-ca-2026-09-18.md` (§0, §1 D1–D25, §5, §6, §9).
> Mọi thứ ở đây là **bản chụp lúc 19/10/2026 20:30 (GMT+7)** — kiểm lại bằng `git` trước khi làm.

## 1. Tóm tắt một đoạn

Đợt 1 (4 slice UI) đã **merge vào `main`**. Đợt 2 (economy 2.1, S1–S6) mới xong **S1** (PR #22, chưa merge, nhắm vào nhánh tích hợp `feat/economy-2-1` đang **cũ hơn `main`**). **S2–S6 và Đợt 3 (`fun-kick-table`) chưa bắt đầu** — founder dừng autorun để bàn giao cho bạn. Bản deploy `v-fb1` chưa làm, phụ thuộc việc chuẩn bị Cloudflare của founder.

## 2. Trạng thái

### Đã trên `main` (`2f5e727`, config JSON 2.0.6, `CURRENT_RULES` 27)
| PR | Slice | Verdict | Ghi chú |
|---|---|---|---|
| #18 | `fun-onboarding-visual` (F27 P0) | PARTIAL | chỉ thiếu test 5 người mới (của founder) · Codex 4 vòng, vòng 4 CLEAN |
| #19 | `fun-locale-default-vi` (F25) | PASS | mặc định tiếng Việt, save `en` giữ nguyên |
| #20 | `fun-next-goal` (F10/F27) | PASS | chip "Mục tiêu kế tiếp" + sheet 3 làn · Tier C `nextGoal.reachMult` = 3 |
| #21 | `fun-buy-buttons-reason` (F10/F07) | PASS | nút mua luôn giá + 1 lý do; toast mất khách có 1 lý do |
| #17 | Chuẩn bị Cloudflare | — | `wrangler.jsonc`, `npm run cf`, `deploy/static/`; bản guest phát hành **song song** Netlify + Cloudflare |

### Đang mở
- **PR #22 — S1 `eco21-seat-model`** (`feat/eco21-seat-model` @ `8f50e5f` → base `feat/economy-2-1`). Rules **28**, config **2.0.20**. **PARTIAL**, Codex vòng 1 CLEAN (85 file, +2824 −245). Người chơi thấy: quán mới 1 bàn × 1 ghế; cặp khách không có bàn 2 ghế bỏ đi tại cửa (không phạt); mua bàn 2→4 (1.500 / 4.000 / 8.000 xu), rồi ghế thứ 2 từng bàn (10.000 → 30.000 xu, chỉ sau đủ 4 bàn); mâm theo số ghế; save cũ migrate 1 lần khi mở ca; bot sim in mốc mua theo ca. Chi tiết, checklist chơi thử 6 bước: body PR #22 và `MERGE-PACKET.md`.
  Số đo trên `8f50e5f`: `npm test` 601/601 · local e2e 170/170 · a11y 6/6 · remote 98/98 · admin 29/29 · doctor PASS.

### Chưa làm
S2 `eco21-instant-pour` → S3 `eco21-capacity-demand` → S4 `eco21-table-chair-upgrades` → **S5 `eco21-balance-pass`** → S6 `eco21-ui-assets` → Đợt 3 `fun-kick-table` → Đợt 4 (đóng gói + `v-fb2`) → Đợt 5 (story + mùa). Không có nhánh nào cho các mục này. Brief chi tiết đã viết sẵn: thư mục `briefs/` (xem §6).

## 3. Việc đầu tiên: nối `feat/economy-2-1` với `main`

`origin/feat/economy-2-1` vẫn ở `a775fc0`, còn `main` đã tới `2f5e727`. PR #22 nhắm vào nhánh cũ. Làm:
1. `git checkout feat/economy-2-1 && git merge origin/main` (nhánh tích hợp **không** được merge ngược vào `main` cho tới Đợt 4 — chỉ kéo `main` vào nó).
2. Rebase/merge S1 lên kết quả đó. `git merge-tree` lúc 19/10 cho thấy S1 xung đột **17 file**: 3 feature-map của verify skill, `08-SPEC-economy-constants.md`, `guest.spec.ts`, `shift.spec.ts`, `App.tsx`, `fixtures/upgrade-hint.ts`, `game.spec.ts`, `docs/config/economy.tbh.json`, `docs/dashboard.{html,json,md}`, F07, F10, `docs/implementation-tracker.md`, `packages/engine/src/config.ts`.
3. Hướng giải (chi tiết trong body PR #22): giữ **cả hai bên** ở docs và `config.ts`; JSON lấy nội dung Wave 1 (`onboarding.*`, `nextGoal.*`, 2.0.5/2.0.6) **cộng** các key seat-model của S1; giữ version **2.0.20** hoặc bump lên cao hơn (đừng hạ — save trình duyệt chỉ nhận bundle có version lớn hơn); dashboard thì build lại (`python3 tools/dashboard-engine/build_dashboard.py --no-network`) thay vì gộp tay.
4. Sau khi giải: `npm run verify:all`, rồi các tầng UI (§5). API quote `buyTableQuote / tableUpgradeQuote / buyChairQuote` của S1 **trùng tên/shape** với phần Wave 1 thêm vào `rules.ts` — kiểm không có định nghĩa kép.

## 4. Những điều S1 chưa ship được một mình (đã biết, có chủ ý)

- k = **3.963** (seed 42) / **3.948** (seed 99), ngoài dải 2.0–3.0 và trần mềm 3.5. `sim:onboarding` ("insufficient serves"), `sim:rush` (thứ tự áp lực seed 99) và `guest.spec.ts` (bước "Mua bàn · 1.500 xu" còn mờ ở 360 và 1280) đang đỏ. **Hoãn cho S5** theo plan §5 ("cân một lần cho cả gói — sim cho thấy từng thay đổi đứng riêng đều vỡ gate k"). Không nới assertion, không đổi số để chữa cháy trước S5.
- Playable lần đầu 2/3 (biến thể 1280 bị đói CPU: phục vụ 14 khách thay vì 30, tải máy 8–16); chạy lại riêng biến thể đó PASS.
- Hệ quả: S1–S4 chỉ được đánh **PARTIAL** (khối `SKIPPED/DEFERRED: k rebalanced in S5`); chỉ S5 mới đưa mọi thứ về xanh. Vì vậy `feat/economy-2-1` **không bao giờ merge vào `main` trước Đợt 4**.

## 5. Chạy kiểm chứng

- Chuẩn: `npm run verify:all` (check:config · check:i18n · build · test · sim:onboarding · sim:rush · sim:career:gate · verify:doctor). Với đổi engine/economy: `npm run sim:career:gate` + k chuẩn 2.0–3.0 trên **seed 42 và 99**.
- UI: skill `.claude/skills/verify-trum-bia-hoi/SKILL.md` (9 bước) — Playwright 390×844 · 360×740 · 1280×720, `npm run test:a11y` 0 lỗi axe, bằng chứng ở `artifacts/verification/<nhánh-gạch-ngang>/`, `report.md` theo mẫu `artifacts/verification/feat-fun-next-goal/report.md`.
- Review độc lập: `docs/prompts/codex-review.md` + `scripts/codex-review-pin.sh` (model `gpt-5.6-terra`, ~12–14 phút/vòng, tối đa 4 vòng). Nếu Codex không dùng được: reviewer Claude độc lập với đúng prompt đó, ghi `Reviewer: Claude subagent (Codex unavailable: <lý do>)`.
- **Cổng cố định (BLOCKER còn mở)**: server test của remote/admin/a11y hard-code cổng 4179–4183 (`apps/web/remote-test/server.ts:76`, `apps/web/admin-test/server.ts:18,49`, `admin.spec.ts`, `moderation.spec.ts`, `account-ui.spec.ts`), nên chỉ chạy từ worktree khi đặt `TBH_PORT_BASE=4178` lúc không có phiên nào khác dùng các cổng đó. Đề xuất slice tooling nhỏ: cho server test đọc `TBH_PORT/TBH_ORIGIN` như `playable-test/server.ts`, specs dùng origin tương đối theo baseURL. Chi tiết: `BLOCKERS.md`.
- Lỗi vặt cũ, không do Wave này: test admin `M2-ONBOARDING local editor…` (đăng nhập super-admin, TOTP) hỏng ~3/4 lần khi chạy cả bộ vì bảo vệ chống dùng lại mã trong cùng 30 s, chạy riêng thì qua. Khi máy tải cao, `apps/server/test/google.test.ts` / `registry.test.ts` hết thời gian — chạy lại riêng, rồi `npm test -- --test-concurrency=2`, và báo trung thực.

## 6. Thứ tự và phụ thuộc Đợt 2–3

`S1 → (S2, S3, S4 độc lập nhau, mỗi cái sau S1) → S5 (sau S1–S4) → S6 (song song S5; cần `fun-next-goal` — đã có trên `main`) → fun-kick-table (sau S5)`.
Mỗi slice một PR vào nhánh cha; chuỗi nhánh đề xuất: `feat/economy-2-1` ← S1 ← S2 ← S3 ← S4 ← S5 ← S6 ← kick-table (cách autorun định làm; bạn có thể tách khác nếu thích).

Brief từng slice nằm trong `briefs/` — viết cho agent chạy không người giám sát nên có vài chi tiết đặc thù autorun (đường dẫn `.autorun/`, "orchestrator", `.autopilot/worktrees/`); bỏ qua phần đó, giữ phần **yêu cầu, số liệu, tiêu chí nghiệm thu**:
- `COMMON.md` — luật chung (cái gì ràng buộc, định dạng báo cáo, Decision Rule, giới hạn cứng).
- `B1-eco21-seat-model.md` (đã làm, để tham chiếu) · `B2-eco21-instant-pour.md` · `B3-eco21-capacity-demand.md` · `B4-eco21-table-chair-upgrades.md` · `B5-eco21-balance-pass.md` · `B6-eco21-ui-assets.md` · `B7-fun-kick-table.md`.
- Prompt gốc (tiếng Anh) cho từng đợt: `docs/PLAN-vui-3-ca-2026-09-18.md` §10 (Prompt 4 cho S1–S6, Prompt 5 cho Đợt 3, Prompt 6 cho Đợt 4).

### Điểm cần chú ý theo slice
- **S4**: autorun đã chọn **W9** làm số hạt giống (→Lv2 `8.000 + 3.000·n`, →Lv3 `20.000 + 8.000·n`, →Lv4 `35.000 + 12.000·n`) thay vì bộ V4e trong dòng S4 của plan, vì S5 vốn bắt đầu từ W9 (`DECISIONS.md`, mục B4). Đổi lại chỉ là sửa JSON + hàng 08-SPEC §22.
- **S5**: bắt đầu từ bộ **W9** (không phải W2 như plan §5 ghi), gộp A2 kho bia, đặt `_meta.version` = **2.1.0**, phải đạt **mọi** gate hàng S5 trên seed 42 **và** 99 (bảng gate · mục tiêu · seed 42 · seed 99 · PASS/FAIL đưa vào PR). Chỉ chỉnh JSON. Nếu rà kỹ vẫn không đạt chỉ bằng JSON thì cần quyết định của founder (luật plan chưa mô tả).
- **S6**: key admin mới đi **qua** k-admission (PR #14) chứ không đi vòng; 2 sprite ghế mới qua pipeline asset + manifest, `npm run check:assets` không thêm placeholder; nhánh cần merge `main` vào trước.
- **Đợt 3**: key phí là Tier A mới với số **chưa sim** (`feeRate` 0,5; `repPerGuest` 2). Cần bot "mời bàn lai rai về khi hàng đợi không rỗng và còn ≥ 40 s ca", chạy kick vs không-kick trên seed 42/99: thu nhập 30 ngày ≤ +10 %, uy tín cuối ≥ 0; nếu vượt thì tăng `feeRate`.

## 7. Quyết định tự động đã đưa ra (có thể lật; đầy đủ trong `DECISIONS.md`)

- **S1**: config **2.0.20** (Wave 1 đã dùng 2.0.5/2.0.6 với nội dung khác; save trình duyệt chỉ nhận version lớn hơn); `tableSlots` = 4 ở mọi mặt bằng (D13) → LP7 "10 chỗ" **chưa với tới được** cho tới khi có hẻm ≥ 5 chỗ; giá bàn thứ n = `tablePriceBase[n-2]` (bàn đầu miễn phí); migration D2 nằm trong `startShift`, chạy một lần; `locations.list` đăng ký **Tier A** (stricter duyệt); nhóm đang ngồi giữ mâm cũ khi mua ghế giữa lượt; bot không mua cấp bàn trên snapshot seat.
- **Wave 1**: chip mục tiêu lọc theo **trung bình** xu các ca đã đóng (plan ghi "ca gần nhất" nhưng world không giữ số đó giữa ca); toast mất khách thêm **đúng 1 lý do** (thay luật "chỉ số" ngày 08/09 bằng plan P3 mới hơn), thêm lý do thứ tư **"Hết mồi"**; bàn đã tối đa hiện "Đã tối đa" thay "Bàn đang có khách"; nút "Mua thêm bàn" mờ khi không mua được.
- Quy ước commit của repo: mọi commit kết thúc bằng dòng `Co-Authored-By: Claude …`. Bỏ nếu bạn không muốn.

## 8. Việc chỉ founder làm được

- **Cloudflare** (trước khi deploy `v-fb1`, plan §10): đưa `trumbiahoi.com` vào Cloudflare + đổi nameserver (14/10 vẫn ở `dns-parking.com`), `npm run cf -- login`, không nối repo bằng `wrangler deploy` (đẩy thẳng production). Điều kiện kỹ thuật cho Prompt 3 ("deploy v-fb1": Wave 1 + Cloudflare trên `main`) đã thỏa, nhưng **chưa ai chạy `verify:all` trên `main` sau khi merge và chưa deploy gì**.
- **Test 5 người mới** của `fun-onboarding-visual` (checklist trống ở `docs/phase0-alpha-playtest.md` §6) và phiếu chơi 3 ca (Đợt 4): luôn báo `SKIPPED: owner playtest`, không PASS.
- Quyết định khi S5 không đạt gate chỉ bằng JSON.

## 9. Bẫy đã gặp (đỡ mất thời gian)

- **GitNexus**: MCP server giữ registry cũ (chỉ `main`); chỉ mục có thể lạc hậu hàng chục commit → chạy CLI: `node .gitnexus/run.cjs analyze --force --skip-agents-md --skip-skills --no-stats`, rồi `node .gitnexus/run.cjs impact <symbol> -r trum-bia-hoi --branch <nhánh> --direction upstream --include-tests`. Bản bump rules 28 cho ra rất nhiều CRITICAL — bình thường; thêm test cho từng caller trực tiếp thay vì bỏ qua.
- **Sandbox/agent**: nếu chạy bằng agent có sandbox, `tsx` CLI (`npm test`, `npm run sim*`), mọi thứ bind cổng, `git fetch/push`, `npm ci` cần chạy ngoài sandbox.
- **Dashboard**: sau `build_dashboard.py` phải `git checkout -- .dashboard/current_state.json && rm -f .dashboard/events.jsonl`, chỉ commit `docs/dashboard.{html,json,md}`.
- **Tải máy**: chạy `uptime` trước `verify:all`; Codex review + Playwright song song dễ làm test timing đỏ giả.
- **Gate k cho S1–S4**: đừng "chữa" bằng cách đổi số — đó là việc của S5.

## 10. Còn lại ở máy founder, không có trong git

Thư mục `.autorun/vui3ca/` (STATE, log phiên) và worktree `.autopilot/worktrees/eco21` (đang ở `feat/eco21-seat-model`, `npm ci` xong). Mọi thứ cần thiết cho việc tiếp tục đã được sao vào thư mục này (`briefs/`, `DECISIONS.md`, `BLOCKERS.md`, `MERGE-PACKET.md`).

## 11. Ghi chú S5 (21/10/2026, review vòng 2) — hai điều S6 và owner cần biết

- JSON 2.1.0 vẽ **tám chỗ đặt bàn ở mọi mặt bằng** (`locations.list[].tableSlots` = 8, kể cả hẻm đầu; D13 vẽ 4 bàn ở hẻm đầu, brief 4·4·5·6·6·7·8·8·8). Sân của S6 ("số chỗ theo `locations.list[].tableSlots`") phải vẽ **tám chỗ ở hẻm đầu**, 16 ghế khi đủ ghế 2. Đây là quyết định owner thứ hai của S5 (BLOCKERS `04 · tableSlots`: bảng so với 4·4·5·6·6·7·8·8·8 và toàn 4, các lựa chọn); nếu owner đổi, số chỗ đổi trong JSON mà không đổi code, nhưng bảng cổng phải chạy lại (`npm run sim:balance`).
- Hàng P0 "kết ca 1 mua bàn 2" đỏ (quyết định owner thứ nhất, BLOCKERS `04 · P0`): ca 1 chỉ mua nổi bàn 2 (1.500 xu) ở khoảng một lượt chơi trong bốn (26 % của 300 lượt probe, khoảng tin cậy 22–32 %; "một trong ba" của vòng 2 là số của 60 lượt đầu); chip mục tiêu vẫn là bàn 2 và nút khoá có lý do "thiếu N xu"; spec guest và playable giữ khẳng định "mua được bàn 2 sau ca 1" ở dạng soft (đỏ trên cơ may cho tới khi owner chốt, phần còn lại của hành trình vẫn chạy).
- **Review vòng 3 (21/10/2026) — nền để so cho S6, `fun-kick-table` và stage 07**: "không phá cổng S5" nghĩa là bảng 23 hàng của bộ L2 (`npm run sim:balance`) với **đúng hai hàng đỏ `shift1.wallet` và `shift1.plan`** (21 hàng xanh), và các hàng xanh không còn biên: LP2 seed 99 = 48, khoảng trống mua dài nhất seed 42 = 8, cặp bị từ chối ca 1 5 | 5 so với ≥ 5, tổng 30 ngày 9,073 tr so với 9,185 tr. Một hàng thứ ba chuyển đỏ là hỏng; hai hàng đỏ kia là quyết định owner thứ nhất, không phải lỗi.
- Bước "mua bàn 2" của guest (4 / 15 lượt viewport) và playable (0 / 3) là **ĐỎ ĐÃ BIẾT theo thiết kế** cho tới khi owner chốt P0 (assertion soft: phần còn lại của hành trình vẫn chạy); trước đó câu "mọi tầng UI xanh" không thể đúng.
- Sân của S6 phải xếp được **tám bàn hai ghế ở độ rộng 360 px** (hẻm đầu 8 chỗ, 16 ghế).
- **Vòng quyết định owner (21/10/2026) — hai quyết định owner của S5 ĐÃ CHỐT** (founder, `OWNER-DECISIONS-S5.md`, user xác nhận trong chat): (1) P0: bàn 2 giá **1.070 xu** (428 base; trước 1.500 xu): ≥ 4 lượt trong 5 mua nổi bàn 2 khi ca 1 đóng (83 % ở n = 300, 81 % ở n = 600), nên các câu "một lượt chơi trong bốn" và "đỏ cho tới khi owner chốt P0" ở trên là của giá 1.500 xu; chip mục tiêu và nút "Mua bàn" đọc giá từ config nên S6 không phải làm gì thêm. (2) `tableSlots` 8 ở mọi mặt bằng được duyệt (đảo D13): ghi chú đầu mục này giữ nguyên, sân của S6 vẽ tám chỗ ở hẻm đầu.
- **Nền để so mới cho S6, `fun-kick-table` và stage 07** (thay nền của dòng "Review vòng 3" ở trên): bảng 23 hàng của `npm run sim:balance` có **22 hàng cổng ĐẠT** (kể cả `shift1.plan`, tiêu chí ≥ 4/5 của owner) và 1 hàng thông tin (`shift1.wallet`, in INFO, không phải cổng); biên mỏng: ghế 2 đầu 40 | 40 (cửa sổ 40–56), khoảng trống mua dài nhất 8 | 7 (≤ 8), cặp bị từ chối ca 1 5 | 5 (≥ 5), LP2 45 | 46 (≤ 48), tổng 30 ngày 9,040 | 9,050 tr (≤ 9,185); `shift1.plan` 83 % (n = 300) và 81 % (n = 600) so với 80 %, vách ở 1.073–1.075 xu (không nâng giá bàn 2 lên 1.075 xu). Một hàng cổng đỏ là hỏng. Bước "mua bàn 2" của guest và playable: guest 14 / 18 lượt viewport (78 %; 13 / 18 ở lượt chạy trước) và playable 3 / 3 (2 / 3 ở lượt chạy trước) mua nổi bàn 2; các lượt đỏ chỉ đỏ ở dòng soft "mua bàn 2", phần còn lại của hành trình xanh; hai assertion vẫn SOFT vì theo tiêu chí 4/5 của owner cứ 5 ván thì 1 ván trượt; bằng chứng 4/5 là cổng `shift1.plan` của bộ đánh giá (83 % ở n = 300, 81 % ở n = 600).

## 12. Ghi chú S6 (21/10/2026) — cho `fun-kick-table` và stage 07

- S6 `eco21-ui-assets` (nhánh `feat/eco21-ui-assets`, trên S5) **không đổi số, luật hay chuỗi i18n của S1–S5**: JSON vẫn 2.1.0 cùng nội dung, rules 28. Thêm: bốn provider bàn ghế trong registry (`chair:<bàn>`, `chairLevel:<bàn>` mới; chip giữ luật nên nay có thể trỏ vào ghế 2 sau đủ 4 bàn và vào cấp ghế ở LP1), nút nhanh "Mua ghế" không pause, sân lưới 8 chỗ (ô trống, bàn theo cấp, ghế theo cấp ghế, mâm theo cấp), hai sprite ghế vẽ thủ tục (`scripts/chair_sprites.py`, draft), test admin cho 17 key S1–S5 (server + e2e; e2e chỉ chạy được trên Linux), `trayDishes` trong engine (helper đọc hình dạng mâm, không đổi `order()`).
- Kick-table (Đợt 3) chạm `App.tsx` `renderTable` (popover bàn): bàn trên sân giờ có `.tray` và `data-chair-level`; `.table-space` là ô lưới `position: relative` (không còn `.table-N { left/top }`), `.yard` có `data-slots`.
- **Sân sau review vòng 1 và 2 của S6 (22/10/2026):** `.yard` là cột flex: dải `div.yard-door` (hàng khách chờ ở cửa; `.door` là hàng ngang, luôn trên nếp gấp dù vẽ đủ 8 chỗ) rồi `div.yard-grid` (lưới 2 cột điện thoại / 3 cột từ 640 px container, `padding-top: 56px` chừa dải cho bong bóng gọi món của hàng 1, để bong bóng không che `#beer-supply-status` hay dải cửa). Popover "Mời về" của kick-table đặt trong `renderTable` trên một bàn hàng 1 sẽ nhô lên dải 56 px và dải cửa — phải tính (neo xuống dưới bàn hoặc chừa chỗ, và giữ `toBeInViewport` của các case cửa trong `first-shift-visual.spec.ts`). Cửa chỉ vẽ nhóm bị từ chối MỚI NHẤT (`DoorQueue.tsx` `turnedAway.slice(-1)`, `data-refusal` = id sự kiện): hai lần từ chối trong 2,2 s (rush nặng với hàng chờ đầy, flyer trong rush nhẹ, lô sự kiện remote) từng chồng bong bóng thứ nhất dưới khách thứ hai.
- **OWNER CALL trước playtest (review vòng 2 của S6, MINOR 3 — chưa đổi gì trong code):** registry S6 liệt kê ghế 2 nên chip "Mục tiêu kế tiếp" (luật rẻ-nhất-đủ-điều-kiện, không đổi) và nút nhanh "Mua ghế" dẫn người chơi mua bốn ghế 2 ngay sau bàn 4 (1.000 + 1.500 + 2.250 + 3.000 xu = 7.750 xu; `chairPriceBase` × k 2,5) trước bàn 5 (24.000 xu). 22 cổng `sim:balance` được niêm phong bằng bot S5 mua đủ 8 bàn rồi mới mua ghế (`packages/engine/sim/policy.ts` `seatGrowth`): ghế 2 đầu tiên ca 40 | 40 (cửa sổ cổng 40–56), bàn 4 ca 13 | 13. Người chơi theo chip mua ghế 2 đầu ngay sau bàn 4, tức sớm hơn cửa sổ cổng khoảng 27 ca — khớp plan §0 / owner dòng 10 ("ghế 2 đầu tiên ca ~12–14") nhưng không khớp cổng S5 (lượt thông tin v4 của S5, bot mua theo giá, đỏ ở LP7 174 | 172 và khoảng trống dài nhất 9 | 9). Owner chọn một trong hai: (a) giữ chip như nay và sửa cửa sổ cổng theo plan §0; (b) muốn thứ tự của cổng: đặt `eligible: false` cho provider `chairs` trong `apps/web/src/goals.ts` chừng nào `buyTableQuote` còn bán được bàn (một cờ; luật chip không đổi, sheet vẫn liệt kê ghế). Chi tiết: DECISIONS `## 05 · review round 2: the chip's chair-first order ...`.
- `npm run sim:balance` sau S6 phải giữ 22 cổng ĐẠT + 1 INFO (S6 không chạm engine kinh tế; `trayDishes` chỉ đọc config).

## 13. Ghi chú Đợt 3 `fun-kick-table` (22/10/2026) — cho stage 07 và owner

- Nhánh `feat/fun-kick-table` (trên S6). "Mời về": lệnh `kickTable {tableId, maxCost}` (rules 28) mời về bàn khách **đang nhâm nhi** — `consuming` (nhóm ngồi với mâm đã giao, kể cả bàn lai rai giữa các đợt) hoặc `occupied` (chỉ còn Chí Phèo); khách đang chờ món / đang ngồi vào / bàn dọn / bàn trống thì không (`tableNotLingering`). Plan, brief và FEEDBACK ghi "`occupied`" nhưng giải nghĩa "đang nhâm nhi — khách đã được phục vụ, không chờ món": DECISIONS `## 06 · which tables can be sent home` (lật được bằng một dòng `LINGERING_TABLE_STATES`).
- Section JSON mới **Tier A** `kickTable {feeRate 1.5, repPerGuest 2}`: ứng viên `feeRate` 0,5 vượt luật "+10 % thu nhập 30 ngày" (bot mời +13,24 % \| +13,40 %), nâng 0,25 một bậc tới khi đạt: **1,5** (+8,76 % \| +5,64 %). Thu nhập đo là tiền phục vụ ghi có (như S3 đo "thu nhập 30 ngày"); nếu owner đọc luật theo thu nhập RÒNG (trừ phí mời về) thì 0,5 đã đạt (+8,85 % \| +9,06 %) — một số trong JSON. Bốn seed giữ lại ở 1,5 (thông tin): +10,70 / +9,52 / +9,10 / +10,17 %.
- **Nhãn JSON vẫn 2.1.0** (plan §2) — nay là nội dung thứ BẢY của nhãn: pin 2.1.0 của S5/S6 không có `kickTable` vẫn nạp và replay từng byte (`SEAT_KEYS_ADDED_LATER` dòng `kickTable` với `optionalAt: ['2.1.0']`; fixture `packages/engine/test/fixtures/seat-2.1.0-v28.json` ghi bằng engine S6), nhưng save ghim nội dung S6 giữ pin đó mãi (trình duyệt chỉ nhận bundle có version LỚN HƠN; engine từ chối mở ca bằng nội dung khác cùng nhãn: `configVersionConflict`) nên không có "Mời về"; DB server dev đã đăng ký nội dung S6 sẽ báo `store:configVersionConflict`. Stage 07 và kiểm 5 phút của owner: bắt đầu từ bộ nhớ trình duyệt trống và DB server mới (như S5). Muốn tách: bump 2.1.1 trước khi deploy.
- Bot giao thức (nghiệm thu S5) **không bao giờ mời về**: `npm run sim:balance` giữ 22 cổng ĐẠT + 1 INFO đúng từng ô, `sim:career:gate` cùng command hash của S6. Bot mời là tùy chọn (`npm run sim:kick`, `balance-gates.ts --bot=kick` để xem bảng 23 dòng dưới bot mời — thông tin).
- UI: "Mời về" nằm trong popover bàn (`#active-table-order`, vị trí cố định như popover phục vụ — không neo vào bàn nên không nhô lên dải bong bóng/dải cửa của S6); ở 390×844 mép dưới-trái của popover (khi mở) che một phần khách đầu hàng ở cửa — như popover phục vụ từ trước; đóng sau khi mời. Hiện từ khi HUD mở (sau ca 1). Nhãn "Bàn lai rai" sẫm lại cho đủ tương phản AA (axe).
