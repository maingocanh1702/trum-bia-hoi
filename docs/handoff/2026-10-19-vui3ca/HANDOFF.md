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
