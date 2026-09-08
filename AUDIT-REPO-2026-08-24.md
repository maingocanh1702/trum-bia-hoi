# 🔍 AUDIT REPO — Trùm Bia Hơi (2026-08-24)

> Audit toàn bộ repo: docs, codebase prototype, tooling, git state. Người audit: Claude (Cowork session).
> Phương pháp: đọc toàn bộ docs chính + source prototype; **chạy lại `npm run sim` độc lập trong sandbox** để xác minh số liệu gate; probe engine bằng test script riêng; kiểm tra git status/branch/worktree.

---

## 1. Kết luận nhanh (TL;DR)

Dự án ở trạng thái **tốt về chất lượng, nhưng đang ĐỨNG YÊN đúng chỗ quan trọng nhất**. Thiết kế/spec hoàn chỉnh và nhất quán ở mức hiếm thấy; code prototype Phase 0 sạch, không TODO rác, deterministic, số liệu gate tự động **tái lập được 100%** khi audit chạy lại hôm nay (k = 2.24–2.34, normal loss 0%, 5/5 seed PASS). Tuy nhiên **blocker duy nhất của Phase 0 — Alpha playtest 3–5 người thật — đã treo từ 15/07 (hơn 5 tuần)**, trong khi commit từ đó đến nay (cuối cùng: 06/08) chỉ toàn tooling autopilot. Roadmap ước Phase 1 bắt đầu từ tháng 7 → hiện trễ ~6 tuần so với estimate. Kèm theo là một số "nợ vệ sinh": 27 file sửa chưa commit ~3 tuần, 1 slice READY chưa merge từ 15/07, dashboard hiển thị 0% sai hoàn toàn, vài docs lệch số liệu cũ.

**Việc số 1 cần làm: chạy Alpha playtest.** Mọi thứ khác là phụ.

---

## 2. Tiến độ hiện tại

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Thiết kế & research | ✅ Xong | GDD v1.5/1.6, MAP v0.9, 3 SPEC triển khai, 20 feature spec (`docs/features/F07–F26`), economy-spec trích từ bundle game gốc, research log live-play |
| Code Phase 0 (prototype) | ✅ Xong phần code | `prototype/src/{engine,sim,ui}` — engine thuần TS + UI Pixi/React + sim headless; typecheck engine+sim PASS (verify lại hôm nay) |
| Automated k/loss gate | ✅ PASS — **đã tái lập độc lập** | Sim 5 seed chạy lại 24/08 cho đúng số đã công bố: k 2.24–2.34, normal loss 0.0%, peak loss 26.1–40.8%, ≥503 lượt/seed |
| **Alpha playtest feel (exit-gate còn lại)** | ❌ **TREO từ 15/07** | `docs/phase0-alpha-playtest.md` = "AWAITING HUMAN EVIDENCE", toàn bộ bảng log trống |
| Phase 1 (MVP + Art v1) | ⚪ Chưa mở (đúng quy trình — chờ gate) | Roadmap v2.6 |
| Tổng tiến độ | ~22% (26 features; Phase 0 ~85–90%) | `06-ROADMAP` v2.6 + `docs/implementation-tracker.md` v0.5.0 — hai nguồn khớp nhau |

Dòng thời gian thực tế: code prototype hoàn thành ~23/06; fix cadence spawn + gate tự động PASS 15/07; từ 15/07 → 06/08 chỉ còn commit đồng bộ autopilot kit (v11→v31); **từ 06/08 đến nay không có commit nào**. Tức là ~6 tuần không có tiến triển gameplay, và điểm nghẽn không phải kỹ thuật mà là tổ chức một buổi playtest.

---

## 3. Phát hiện (issues) — xếp theo mức độ

### 🔴 Cao — chặn tiến độ / sai lệch thông tin đáng kể

**A1. Alpha playtest chưa chạy — blocker duy nhất của Phase 0, treo >5 tuần.**
`docs/phase0-alpha-playtest.md` yêu cầu 3–5 tester × ≥3 ca, trả lời 5 câu hỏi gate. Chưa có dòng evidence nào. Mọi hạng mục khác của Phase 0 đã xong. Đây là điểm nghẽn thực sự của toàn dự án; để càng lâu, context và momentum càng nguội.

**A2. Working tree bẩn kéo dài ~3 tuần: 27 file modified + 2 untracked chưa commit.**
Gồm toàn bộ `.claude/commands/ap-*.md`, skill gitnexus, `docs/autopilot-templates/*`, cùng `.agents/` và `docs/asset-generation-prompts.md` chưa track. Nghịch lý: chính workflow Level 3 trong AGENTS.md yêu cầu base sạch, explicit-base, fail-closed — nhưng tree hiện tại không sạch. Nếu số file này là kết quả sync kit v31 dở dang thì cần commit trọn vẹn hoặc revert dứt điểm, tránh trạng thái lửng.

**A3. Dashboard công bố số SAI: 0% trong khi thực tế ~22%.**
`docs/dashboard.{md,html,json}` sinh từ dữ liệu 11/06 (0/26 PR, "code vẫn 0%"), chưa hề rebuild sau khi tracker lên v0.5.0. Fix parser (slice `dashboard-phase-table-boundary`, xem A4) chưa merge nên rebuild sẽ dính bug "feature thứ 27". Ai mở dashboard sẽ hiểu nhầm hoàn toàn tình trạng dự án. Footer còn trỏ `operations/development-workflow.md` — file không tồn tại (di sản port từ MyMoneyWent).

**A4. Slice `dashboard-phase-table-boundary` READY từ 15/07 nhưng không ai merge/đóng.**
Branch `feat/dashboard-phase-table-boundary` (1 commit `e2ed443`) nằm trong `.autopilot/INFLIGHT.md` với status `ready`, risk P2 (supervised/manual-merge), giờ đã behind master 5 commit và git đánh dấu worktree "prunable". Kèm theo: worktree mồ côi `.autopilot/worktrees/economy-k-tune/` (từ 05/07) — branch tương ứng không còn tồn tại, chưa dọn qua `scripts/ap-finish.sh`.

### 🟡 Trung bình — doc drift / nợ vệ sinh

**B1. `prototype/README.md` lệch thực tế ở 3 chỗ:** (1) tiêu đề "Cách chơi (1 ca = 120s)" trong khi `SHIFT_DURATION_MS = 720_000` (12 phút); (2) mục "Trạng thái đo" vẫn ghi k = 1.63 DƯỚI band + nguyên nhân P_MOI=0.6 — số của 02/07, đã lỗi thời sau fix cadence (k thật 2.24–2.34, `P_MOI` hiện 0.85); (3) chưa nhắc kết quả 5-seed gate. Ai mở prototype lần đầu sẽ đọc sai trạng thái.

**B2. GDD version drift:** tiêu đề file ghi "(v1.5)" nhưng changelog đã có dòng **v1.6** (rebrand 15 thuật ngữ: Giải Nhậu, Vụ Bia, Đường Lên Trùm…). SESSION-TRACK-LOG và ROADMAP đều đang tham chiếu "GDD v1.5". Cần bump tiêu đề + đồng bộ tham chiếu để tránh nhầm bản.

**B3. Tracker header ghi "Master status board cho mọi feature F01–F24"** nhưng thực tế theo dõi 26 feature (F25/F26 đã thêm từ v0.3.0). Nhỏ nhưng dễ gây hiểu nhầm phạm vi.

**B4. GitNexus index stale:** index build 15/07 (trước 5 commit autopilot + toàn bộ thay đổi uncommitted). CLAUDE.md bắt buộc dùng impact/detect_changes trước khi sửa code — chạy trên index cũ sẽ cho blast-radius sai. Cần `node .gitnexus/run.cjs analyze` trước đợt code kế.

**B5. Phụ thuộc đường dẫn ngoài repo:** AGENTS.md/CLAUDE.md neo workflow chuẩn vào `$HOME/Projects/Claude template/autopilot/level3-workflow.md` (ngoài repo). Repo có mirror `docs/autopilot-templates/level3-workflow.md` (đang modified, chưa commit) — nếu máy khác/agent khác clone repo sẽ thiếu bản chuẩn. Nên coi mirror trong repo là bản vận hành và ghi rõ quy tắc sync.

**B6. Backlog Phase 0 table vs thực tế:** bảng đầu `docs/autopilot-backlog.md` vẫn liệt kê các slice Phase 0 (`engine-glass-lifecycle`, `engine-core-loop`…) như thể "code được NGAY" dù phần lõi đã merge — chỉ 2 task block phía dưới có status. Người mới đọc dễ tưởng còn nguyên việc Phase 0.

### 🟢 Thấp — quan sát code (không chặn, ghi nhận để cân nhắc)

**C1. Peak loss 26–41% mới chỉ được chặn bằng "regression ceiling" (57.6%), không phải ngưỡng thiết kế.** Sim xác nhận peak loss giảm so trước fix nhưng 4/10 khách bỏ đi lúc cao điểm là con số lớn — đúng như docs ghi chú, phán quyết cuối thuộc Alpha feel. Khi playtest, nên hỏi thẳng tester câu "peak hectic but recoverable?" với số này trong đầu.

**C2. Ngữ nghĩa "lost customers" gộp cả nhóm đã trả tiền đợt 1 rồi bỏ đi ở đợt 2.** `tickOrders` đếm mọi khách chưa served của order quá hạn là lost — gồm khách đã thanh toán đợt 1. Chấp nhận được (họ vẫn bỏ đi bực bội) nhưng nên ghi chú khi đọc loss-rate, vì nó không đồng nghĩa "khách chưa phục vụ lần nào".

**C3. HUD "Dồn cả phiên" mất số lost/rejected:** `App.tsx` gọi `computeStats(engine.allEvents, 0, 0)` — engine không giữ lost/rejected xuyên ca (reset mỗi `startShift`). Bảng aggregate trong Sổ ca luôn hiện 0 khách bỏ đi. Với Alpha cần đọc loss per-ca (đúng) chứ đừng tin dòng aggregate.

**C4. Nút decoy trong UI:** chuông = mở ca, "Bia Đấm"/"Nhập hàng"/"Vụ Bia" = đổi thời tiết (cosmetic). README có ghi chú shell-only, nhưng khi đưa tester lạ vào Alpha thì các nút này có thể gây nhiễu "confusion is evidence" — cân nhắc disable/tooltip trước buổi test.

**C5. Điểm cộng đáng ghi nhận:** engine không lộ bug nào qua probe độc lập hôm nay — chạy 2.000s không thao tác: không crash, không leak cốc (giữ đúng 10), trần ngày enforce đúng (`dayEarned` chặn ở 500k, log giữ GROSS cho phép đo k — đúng thiết kế 04 §5), RNG deterministic tái lập từng số một, phương pháp đo k được cô lập đúng như spec "bất biến phương pháp". Fix lịch sử (tap-nuốt, use-after-destroy Pixi) đều có ghi chép nguyên nhân gốc trong SESSION-TRACK-LOG — chất lượng nhật ký rất tốt.

---

## 4. Xác minh độc lập đã thực hiện trong audit này

Sim headless chạy lại từ source hiện tại (sandbox Linux, tsx, không sửa gì): 5/5 seed PASS, khớp từng chữ số với công bố 15/07 — k: 20260611→2.27, 1→2.34, 2→2.27, 3→2.28, 42→2.24; normal loss 0.0% cả 5 seed; peak loss 40.8/26.1/39.3/40.0/39.2%. Typecheck strict engine+sim: 0 lỗi. (Full `npm run build` gồm UI không chạy được trong sandbox vì registry npm bị chặn tarball — build UI đã được xác nhận pass trên máy dev theo log 15/07.) Probe bổ sung: stress không-thao-tác, trần ngày, glass invariant — sạch (chi tiết C5).

Điều này nghĩa là: **số liệu trong tracker/roadmap/evidence-sheet đáng tin**, không phải "số tự khai".

---

## 5. Recommend next steps (theo thứ tự ưu tiên)

**Bước 1 — Chạy Alpha playtest trong tuần này (blocker duy nhất).**
Mọi thứ đã sẵn: build chạy được, evidence sheet có format sẵn, protocol rõ (3–5 người × ≥3 ca, không coach, cả normal lẫn peak). Việc cần làm thuần túy là hẹn 3–5 người, ngồi chơi, điền bảng. Trước buổi test nên: (a) sửa README 120s→12′ để người hướng dẫn không nói sai; (b) cân nhắc disable nút decoy (C4); (c) nhớ đọc loss theo từng ca, không đọc dòng aggregate (C3). Nếu gate PASS → đóng Phase 0, mở Phase 1 theo đúng kế hoạch backlog (`ui-art-v1` song song 1 engine slice). Nếu FAIL mục nào → tạo corrective slice bounded đúng như evidence sheet quy định.

**Bước 2 — Dọn git state (1 buổi là xong).**
Quyết định dứt điểm 27 file modified + 2 untracked: commit trọn gói "sync kit v31" hoặc revert. Merge hoặc đóng slice `dashboard-phase-table-boundary` (rebase lên master, chạy verify theo manifest, manual merge vì P2) rồi `scripts/ap-finish.sh` để dọn worktree; xóa worktree mồ côi `economy-k-tune` qua đúng quy trình cleanup. Sau merge, rebuild dashboard để `docs/dashboard.*` hết hiển thị 0% sai (A3).

**Bước 3 — Vá doc drift 30 phút.**
GDD title v1.5→v1.6 + đồng bộ tham chiếu ở SESSION-TRACK-LOG/ROADMAP (B2); prototype README cập nhật 3 điểm (B1); tracker header F01–F24→F01–F26 (B3); backlog đánh dấu các slice Phase 0 đã merge (B6); bỏ link `operations/development-workflow.md` chết trong dashboard template (A3).

**Bước 4 — Trước khi code Phase 1: refresh hạ tầng dev.**
Chạy lại GitNexus index (B4). Chốt bản canonical của level3-workflow nằm trong repo (B5). Đầu Phase 1 cũng là deadline tự đặt cho quyết định art pipeline (rủi ro R4 trong roadmap: tự vẽ / thuê / asset pack) — quyết sớm vì track Design bắt đầu sản xuất thật ở Phase 1.

**Bước 5 — Ghi chú cho Phase 1 (từ quan sát code).**
Khi làm `stamina-day-budget` và `engine-upgrades-basic`: engine hiện gọn và invariant tốt — giữ nguyên kỷ luật "đổi số 🟡 ở constants, không đổi phương pháp đo"; thêm lost/rejected tích lũy xuyên ca vào Engine để HUD aggregate hết sai (C3); định nghĩa lại/ghi chú ngữ nghĩa lost cho nhóm đợt 2 trước khi loss-rate trở thành KPI chính thức (C2); và đưa peak loss thành ngưỡng thiết kế có chủ đích thay vì regression ceiling (C1).

---

## 6. Phạm vi & giới hạn của audit

Đã đọc kỹ: toàn bộ source `prototype/src` (engine, sim, UI), `04-SPEC`, `03-SPEC` (mục tiêu chính), GDD §2–§10 + §20 + changelog, ROADMAP v2.6, tracker v0.5.0, backlog, invariant catalog, scope gate, AGENTS/CLAUDE.md, evidence sheet, dashboard output, RESEARCH-LOG, prototype README; git log/status/branch/worktree. Đọc lướt/tham chiếu: economy-spec-from-bundle, uiux-analysis, asset-list, 20 feature spec F07–F26 (điểm danh tồn tại, chưa thẩm định nội dung từng file), `tools/dashboard-engine/build_dashboard.py` (66KB — chỉ kiểm tra hành vi qua output, không review từng dòng). Không audit: nội dung `.claude/commands` chi tiết, assets nhị phân, `scripts/dashboard/*.py`.

*File này do audit sinh ra, không phải doc vận hành — cập nhật/tự xóa tùy chủ dự án.*
