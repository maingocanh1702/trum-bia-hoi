# PLAN triển khai feedback 17/09/2026 — Trùm Bia Hơi (v1)

> Nguồn yêu cầu + số ứng viên + kết quả sim: `docs/FEEDBACK-2026-09-17.md` (v2). File này chỉ nói **làm gì, theo thứ tự nào, xong khi nào**. Cách làm dev tự quyết.
> Ràng buộc chung mọi slice: số chỉ nằm ở `docs/config/economy.tbh.json` (+ `_meta.governance.tiers` + 08-SPEC §22 + changelog); engine thuần, server-authoritative; save/replay cũ không đổi hash; `npm run verify` xanh; tracker + dashboard cập nhật; không đụng `prototype/`.

## 0. Đích

Bản deploy mới trên Netlify mà owner chơi lại 3 ca và tick đủ 8 dòng:

| # | Owner thấy gì | Từ feedback |
|---|---|---|
| 1 | Mở link lần đầu → vào thẳng game, tiếng Việt; đổi ngôn ngữ ở Cài đặt | I.1 |
| 2 | Bom báo "rót sẵn n cốc" → khách gọi ≤ n bia là mâm sẵn sàng ngay | II.1 |
| 3 | Game mới: 1 bàn 1 ghế; ca 1–4 gần như không ai bỏ đi | II.2 |
| 4 | Mua thêm ghế (≤ 3/bàn) và mua thêm bàn (≤ 6), nút nào cũng có giá + lý do khi mờ; mua được cả khi bàn đang có khách | II.2, II.4 |
| 5 | Nâng bàn Lv1→4: khách gọi nhiều món hơn, sprite bàn đổi theo cấp | II.2c |
| 6 | Nâng ghế Lv1→3: khách chờ lâu hơn, sprite ghế đổi theo cấp | II.2c |
| 7 | Chạm bàn đang nhâm nhi → "Mời về" hiện giá xu + uy tín → bàn trống | II.3 |
| 8 | Tiền kiếm được vs giá đầu tư hợp lý: bàn 2 sau ca 1–2, bàn 6 trong ngày 14–30 (bot), k trong gate | II.2–II.3 |

## 1. Quyết định owner — default sẽ dùng nếu không trả lời

| # | Câu hỏi | Default |
|---|---|---|
| D1 | Bù k khi đổi mô hình bàn | `tip.rate` 0,30 → 0,22 |
| D2 | Save cũ | giữ cấp bàn đã mua làm cấp "đựng món", quy về ≤ 3 ghế, không hoàn xu |
| D3 | Mời Chí Phèo về | được, 0 xu, −2 uy tín/khách |
| D4 | Nâng bàn vs trần k 3,5 | gate k đo trên **đơn chuẩn** (bia + 1 mồi); mồi thêm nhờ nâng bàn không tính vào k; thêm 1 gate mới "tổng giá trị 30 ngày ≤ +10 % baseline" để chặn lạm phát |
| D5 | Giá bằng uy tín | hoãn; chỉ xu + gate Đời Quán |

D4 đổi định nghĩa gate (04-SPEC §5 là ràng buộc) → **cần owner xác nhận trước Đợt 2**, các câu khác không chặn.

## 2. Thứ tự

```
Đợt 0 chuẩn bị ─► Đợt 1 UI nhanh (2 slice song song) ─► deploy v-fb1
                 └► Đợt 2 economy 2.1 (6 slice nối tiếp, 1 nhánh tích hợp) ─► Đợt 3 mời khách ─► Đợt 4 đóng + deploy v-fb2
```

Đợt 1 deploy riêng được ngay (không đổi số). Đợt 2–3 **chỉ deploy khi cả gói xanh** — mọi thay đổi luật nằm sau **một** rules version mới (17) và JSON **2.1.0**, tránh nhiều nhánh replay.

## 3. Đợt 0 — Chuẩn bị (owner + 1 phiên ngắn)

| Việc | Xong khi |
|---|---|
| Đóng hoặc gác nhánh `supervised/v5-admin-k-admission` (đang HALT round 6, 4 file server sửa dở) | `main` sạch, `npm run verify` xanh trên `main`; nhánh k-admission không bị rebase lên thay đổi của plan này |
| Commit `docs/FEEDBACK-2026-09-17.md` + file này vào `main` | có trên origin |
| Owner trả lời D4 (và D1–D3, D5 nếu muốn khác default) | ghi vào cuối `FEEDBACK-2026-09-17.md` |
| Đưa công cụ sim vào repo: bot biết mua bàn/ghế/nâng cấp + log theo ca (hiện ở `~/keg-matrix/feedback-0917/`, chỉ là bản vá đo) | `packages/engine/sim/` có policy mới sau Đợt 2-S1; không copy bản vá `/tmp` làm code thật |

## 4. Đợt 1 — UI nhanh (không đổi số, 2 slice song song, class nhỏ)

| Slug | Phạm vi | Đầu ra | Acceptance |
|---|---|---|---|
| `fb-locale-default-vi` | `apps/web/src/App.tsx`, `local.ts`, i18n, e2e, F25/F27 changelog | Bỏ màn chọn ngôn ngữ đầu vào; mặc định `vi` bất kể `navigator.language`; người đã lưu `en` giữ `en` | FEEDBACK §I.1 |
| `fb-upgrade-buttons-reason` | `App.tsx` sheet Nâng cấp, i18n, test UI | Thẻ bàn + nút "Mua thêm bàn" luôn hiện giá và đúng 1 lý do khi mờ (kể cả "Bàn đang có khách" — luật engine **chưa đổi** ở đợt này) | UI test 3 trạng thái: đủ xu/bàn trống → bật; thiếu xu → "Chưa đủ xu"; bàn có khách → "Bàn đang có khách"; nút mua bàn có giá |

Deploy `v-fb1` + ghi `docs/deploy-log.md` (mục A6 của PLAN-improve 16/09 nếu chưa có).

## 5. Đợt 2 — Economy 2.1 (nhánh tích hợp `feat/economy-2-1`, slice nối tiếp)

| # | Slug | Đầu ra | Acceptance riêng (ngoài `npm run verify`) |
|---|---|---|---|
| S1 | `eco21-seat-model` | Rules 17: game mới 1 bàn × 1 ghế; `buyTable` theo `tablePriceBase` + gate LP; command mua ghế theo `chairPriceBase` (≤ 3/bàn); mua ghế/nâng cấp **không đòi bàn trống** (ghế mới áp cho nhóm kế tiếp); nhóm tối đa = ghế bàn lớn nhất; migration save cũ (D2); `lifePath.requires` rà lại (LP1 4 chỗ, LP7); bot sim biết mua bàn/ghế | Test: không mua được ghế 4 / bàn 7; gate LP đúng bảng; mua ghế khi bàn `occupied` không đổi nhóm đang ngồi; migration 3 bàn × 6 chỗ Lv3 → 3 bàn × 3 ghế, cấp bàn 3; replay fixture cũ khớp hash |
| S2 | `eco21-instant-pour` | Bia: `beer.ready > 0` + cốc sạch → món `ready` cùng tick; bỏ hàng đợi vòi khỏi đường phục vụ (rules ≥ 17); UI bom 1 bộ số, nhãn đúng nghĩa (gộp A5 của PLAN 16/09) | FEEDBACK §II.1 |
| S3 | `eco21-capacity-demand` | Key mới Tier A cho lượng khách tới theo sức chứa (theo **số bàn** hoặc kết hợp bàn+ghế — sim chọn; bản theo ghế `refSeats 6` đã thấy chưa đủ khi 1 bàn × 3 ghế) | Bot: % bỏ đi ca 1–5 ≤ 30 %; ca 1 ≥ 20 khách (không quá vắng); từ 6 bàn trở lên lượng khách = hiện tại |
| S4 | `eco21-table-chair-upgrades` | Nâng bàn Lv1→4 (`extraMoiChance`, giá `40.000 + 20.000·t`, gate LP1/3/4, bỏ gate Kết Nối) + nâng ghế Lv1→3 (`patienceMult` 1/1,15/1,30 áp cho kiên nhẫn chờ món của bàn đó, giá `10.000 + 5.000·t`, gate LP1/2); mồi thêm tuân "chỉ gọi món còn hàng" + "chỉ giao khi đủ món"; bot sim biết nâng | Test: xác suất mồi thêm theo cấp (seed cố định); kiên nhẫn không cộng dồn qua các lượt gọi; giá theo số lần đã nâng **toàn quán**; event + analytics mới |
| S5 | `eco21-balance-pass` | Chốt số JSON 2.1.0 bằng sim (bắt đầu từ bảng ứng viên FEEDBACK §II.2/II.2c + `tip.rate` D1); cài gate theo D4; 08-SPEC bump + changelog; 03-SPEC, 04-SPEC §5 (nếu D4), F04/F10/F13 | Seed 42 **và** 99, career 30 ngày: k chuẩn 2,0–3,0 · k gate (theo D4) ≤ 3,5 · tổng giá trị 30 ngày trong ±10 % của 8,35 tr · bàn 2 ≤ ca 3, bàn 6 trong ngày 14–30 · nâng ghế đầu tiên tuần 1–2, nâng bàn đầu tiên sau ngày 10 · không chạm trần ngày trước ngày 25 |
| S6 | `eco21-ui-assets` | Sheet Nâng cấp mới: 4 món mua (bàn · ghế · nâng bàn · nâng ghế) mỗi món có giá, hiệu ứng trước→sau, lý do khi mờ; sân quán vẽ 1–3 ghế/bàn theo cấp ghế, bàn theo `table-lv1…4`; **2 asset ghế mới** (ghế tựa nhựa, ghế gỗ đệm) qua pipeline asset hiện có + manifest; admin registry nhận key mới | e2e 3 viewport; axe 0 lỗi; `check:assets` không thêm placeholder; Admin sửa được từng key mới và `check:config` coverage xanh |

Ghi chú phụ thuộc: S2 và S3 độc lập nhau nhưng đều sau S1; S4 sau S1; **S5 sau S1–S4** (cân một lần cho cả gói — sim đã cho thấy từng thay đổi đứng riêng đều vỡ gate k); S6 song song với S5 được.

## 6. Đợt 3 — Mời bàn về sớm (sau S5, vì phí cân theo mô hình bàn mới)

| Slug | Đầu ra | Acceptance |
|---|---|---|
| `fb-kick-table` | Command `kickTable {tableId, maxCost}` chỉ khi bàn đang nhâm nhi; phí xu = `feeRate` (ứng viên 0,5) × gross đơn gần nhất × `leavePenaltyMult`; uy tín −`repPerGuest` (ứng viên 2, không ×k); không tính `lost`; popover bàn có nút "Mời về" + giá + xác nhận; thay dòng 🟡 "Tiễn ngồi lỳ" ở 08-SPEC §9; bot sim "mời khi có hàng đợi và còn ≥ 40 s" | FEEDBACK §II.3: 4 trạng thái bàn, thiếu xu, `maxCost`, VIP ×10 / Chí Phèo (D3), idempotent; bot-mời so với bot-không-mời: thu nhập 30 ngày ≤ +10 %, uy tín cuối ≥ 0; nếu vượt → tăng `feeRate` rồi sim lại |

## 7. Đợt 4 — Đóng gói

| Việc | Xong khi |
|---|---|
| Merge `feat/economy-2-1` → `main`; `npm run verify:all` | xanh, không finding mở |
| Docs: HANDOFF bump, 02-GDD §4/§7 (bàn ghế, mời về), 03-SPEC vòng đời bàn, 08-SPEC, F04/F10/F13/F25/F27, tracker + dashboard, `TRANG-THAI-DOCS.md`, SESSION-TRACK-LOG; PLAN-improve 16/09 đánh dấu A5 đã gộp | chỉ giữ bản mới nhất |
| Deploy `v-fb2` + deploy-log + build sha | owner mở link thấy sha mới |
| Owner chơi 3 ca, tick bảng mục 0; ghi lệch cảm giác (quá vắng / quá dồn / giá) | phiếu 8 dòng có kết quả; lệch số → quay lại S5 chỉ sửa JSON |

## 8. Rủi ro đã biết

| Rủi ro | Giảm thiểu |
|---|---|
| Bot sim không giống người (mua rẻ nhất trước, 8 ca hoàn hảo/ngày) → nhịp thật chậm hơn 2–4 lần | Acceptance nhịp đặt theo bot; bước owner chơi 3 ca ở Đợt 4 là chốt cuối; mọi số là Tier A/B sửa được ở Admin |
| Uy tín gần như luôn ≈ 0 trong sim (kể cả bản hiện tại) → mọi gate uy tín có sẵn (bàn VIP cũ, biển hiệu vàng) thực chất không đạt được | Ngoài phạm vi; ghi thành mục backlog "dòng uy tín" sau khi S3 giảm tỉ lệ bỏ đi, đo lại rồi mới dùng uy tín làm giá (D5) |
| Kho bia 15 cốc (A2 của PLAN 16/09) nghẽn mạnh hơn khi rót tức thì | S5 đo "% khách bỏ đi vì hết bia"; nếu > 10 % thì xử lý A2 trong cùng lần cân số |
| Nhánh k-admission đang sửa `apps/server/src/registry.ts` — S6 cũng chạm registry | Đợt 0 chốt nhánh đó trước; S6 rebase sau |

## 9. Kickoff prompt (dán vào Claude Code tại gốc repo)

Theo luồng ap3 (mỗi đợt một lần intake → plan → queue):

```
/ap3-intake Owner feedback 2026-09-17, Wave 1 (UI only). Source of truth: docs/PLAN-feedback-2026-09-17.md section 4 and docs/FEEDBACK-2026-09-17.md sections "I.1" and "II.4". Two independent small slices: fb-locale-default-vi and fb-upgrade-buttons-reason. No engine rule or economy number changes in this wave.
```

```
/ap3-intake Owner feedback 2026-09-17, Wave 2 "economy 2.1". Source of truth: docs/PLAN-feedback-2026-09-17.md sections 1, 5 and 8, and docs/FEEDBACK-2026-09-17.md sections "II.1" to "II.2d". Six sequential slices S1-S6 on one integration branch, all rule changes behind ONE new rules version (17) and config 2.1.0. Candidate numbers in the brief came from a patched scratch engine and are starting points only; slice S5 owns the final numbers and must meet every sim gate listed in the plan on seeds 42 and 99. Owner decision D4 (k gate measured on the standard order) changes a binding definition in 04-SPEC section 5: list it as a gap and stop if the owner has not confirmed it in the brief.
```

```
/ap3-intake Owner feedback 2026-09-17, Wave 3: per-table "ask guests to leave". Source of truth: docs/PLAN-feedback-2026-09-17.md section 6 and docs/FEEDBACK-2026-09-17.md section "II.3". Depends on Wave 2 slice S5 being merged. Fee numbers are unsimulated candidates; the slice must add a kicking bot policy to the career sim and meet the acceptance lines.
```

Nếu không chạy ap3 mà làm một phiên liền:

```
Read 00-HANDOFF-trum-bia-hoi.md, docs/FEEDBACK-2026-09-17.md and docs/PLAN-feedback-2026-09-17.md. Execute Wave 1, then Wave 2 slices S1-S6 in order on branch feat/economy-2-1, then Wave 3. One slice per commit series, each ending with npm run verify green and its acceptance lines proven by tests or sim output quoted in the commit body. Numbers only in docs/config/economy.tbh.json with an 08-SPEC changelog entry; all new rules behind rules version 17; old saves and replay fixtures must stay byte-identical. Use the defaults in plan section 1 for D1, D2, D3, D5; stop and ask before S5 if D4 is not confirmed in the brief. Do not deploy; report per slice: what changed, proof, open questions.
```

## Changelog
| Ngày | Thay đổi |
|---|---|
| 2026-09-18 | **Thay bởi `docs/PLAN-vui-3-ca-2026-09-18.md`** (gộp với plan 16/09; nền = wave-ab rules 27, không phải k-admission rules 24). D1–D5 chốt theo default, D4 = (a). Không cập nhật file này nữa. |
