# 📋 SESSION TRACK LOG — Trùm Bia Hơi

> Current owner target (Steer12): **playable-v0**, not full milestone closure. Guest full-shift smoke on three viewports + dev identity + persistence/performance; M6/M7/M8 deferred; working draft/placeholder assets accepted.

> Nhật ký phiên làm việc (bản mới, mở lại từ 2026-06-04). Log cũ đã dài → đóng lại, bắt đầu sạch ở đây.
> Mục đích: mỗi session ghi 1 block ngắn — đang ở đâu, làm gì, quyết định gì, việc tiếp theo. Đọc block mới nhất trước khi làm tiếp.

---

## Hosting: Netlify → Cloudflare — 2026-09-30 (Claude Code)

Owner chốt: bản guest chuyển sang **Cloudflare Workers static assets** ở `trumbiahoi.com` (gói Free), **chấp nhận save
bắt đầu lại** do đổi origin. Lý do: gói free Netlify tính credit (15/deploy, 20/GB, hết credit thì dừng site). Thêm
`wrangler.jsonc`, `npm run cf` (wrangler 4.144.0 qua npx), đổi `deploy/netlify/` → `deploy/static/`. `wrangler dev`: header,
redirect, cache khớp Netlify; guest smoke 3/3 PASS; **chưa deploy**. API M4 **không** chạy trên Workers (đo: heartbeat
p50 10,5 ms CPU > giới hạn 10 ms của gói Free; khoảng 2.900 dòng SQLite/ca) → Oracle VM (owner đã có tài khoản) + Cloudflare Tunnel.
Chi tiết: `docs/cloudflare-guest.md`.
**Việc kế:** owner đưa `trumbiahoi.com` vào Cloudflare và nối repo (các bước ở doc) → deploy lần đầu + smoke công khai → ghi
biên nhận; dựng VM Oracle (Ubuntu 24.04 ARM, public subnet) → script setup + Tunnel + sửa rate-limit IP/tiền tố `/api` trước khi mở API.

## Design session owner + Claude — 2026-09-18 (Cowork)

Merge `codex/deploy-wave-ab-netlify` → `main` (Đợt 0 xong, verify:all xanh, `5eb5f31`); k-admission PR #14 vào main
cùng lúc (phiên khác). Chốt 25 quyết định D1–D25 (PLAN §1): mô hình bàn ghế v3.3, story 168 ca, mùa 21 ngày, M6 mở lại,
k gate D4(a), hàng đợi 1 + ghế/8. Sim trên engine thật (bản vá đo `~/keg-matrix/feedback-0917/mkvar4.sh`, log
`artifacts/verification/feedback-0918-sim/`): bộ **W9** đạt LP7 ca 146–151, 8 bàn Lv4 ca 156–163, bỏ đi có phạt 15–17 % / 9–10 %.
Docs: `docs/PLAN-vui-3-ca-2026-09-18.md` v1.6 (thay 2 plan cũ) · `docs/FEEDBACK-2026-09-17.md` v3.3 ·
`docs/DESIGN-story-3-tuan-2026-09-18.md` v1.1 · GDD v1.13 · 03-SPEC v1.4 · 04/08/ROADMAP changelog · HANDOFF v1.42 · TRANG-THAI 18/09.
Owner xếp ưu tiên trải nghiệm: onboarding nhìn-là-hiểu (P0, slice `fun-onboarding-visual` đầu Đợt 1, F27 luật #5 đè) → mua sắm lần lượt → economy; hành trình người chơi 8 giai đoạn ở DESIGN §2b.
**Việc kế:** owner chơi bản Netlify (wave-ab) rồi feedback; dán prompt Wave 0+1 (PLAN §10) vào Claude Code; JSON 2.1.0 chỉ đổi ở S5.

## Agent-verification M1/M2 hoàn tất — 2026-09-16

12 PR merge (`#1`→`#12`, `docs/how-skill` → `agent-verification-m02-tbh-fixture`): skill `/how`
(V0), skill `verify-trum-bia-hoi` + 23 feature file (V1), `snapshot.ts` + bridge
`window.__TBH_VERIFY__` cho cả local/remote (V2), `scripts/verify/{port,doctor}.ts` +
`map-coverage.ts` + fixture Playwright dùng chung `apps/web/test/tbh-fixture.ts` +
`apps/web/test/bridge.spec.ts` (V3). Lệnh mới: `npm run verify:port` (11 port theo
`TBH_PORT_BASE`, per-worktree), `npm run verify:map` (coverage: mọi command/event/test file dưới
`packages/engine/test`, `apps/server/test`, `apps/web/{test,admin-test,remote-test,playable-test}`
phải được feature map cite — `scripts/verify/*.test.ts` (82 test riêng của chính công cụ verify)
không nằm trong phạm vi quét này, chạy qua `npm test` chứ không qua map coverage), `npm run
verify:doctor` (repo/deps/binding/map luôn chạy; `--full` hiện CHƯA hoạt động thật từ CLI trần —
luôn trả kết quả fail-closed cứng vì không có trình duyệt để hỏi, cần Playwright thật hoặc kiểm
tay). PR #12 là lần đầu tiên
`verify_host` (dispatcher-side, unsandboxed) chạy Playwright thật (`bridge.spec.ts` qua
`playwright.config.ts`) thay vì chỉ unit test browser-free.

Dispatcher `ap3` tạm dừng (`ap3/PAUSED`) sau khi archive 7 task M1/M2 vào
`ap3/queue/done/agent-verification-m1-m2/`; V4 (contract block + đóng nốt các test uncited mà V3
tự sinh thêm) chạy supervised, không qua dispatcher. Chi tiết:
`trum-bia-hoi-agent-understanding-verification-implementation-plan.md` §8, Changelog v3.1.

## Steer14 complete — 2026-09-11

playable-v0 tag a602af3 is live on5174/5175 with preserved SQLite and explicit dev identity; runtime midshift sign-in PASS. After tag, primary5/8/12/20/40 failed standard k; config2.0.3 fallback4/7/12/20/40 passed full verify406tests/10standard/15rush/2careers (42:3.465461,99:3.393197),3capacity UI cases and final review CLEAN. JSON changes only metadata/storage; specs/tests reconciled. Source config2.0.3 is not published into the pinned preview registry. Owner-defined playable target is delivered; M6/M7/M8 remain deferred.

## playable-v0 acceptance — 2026-09-11

PASS on the stable config2.0.2/rules24 build: full real-time12-minute guest shifts at390×844,360×740,1280×720; service/washing/restock, actual in-shift upgrade purchase, summary, next day, reload and new-tab persistence. First playable1340/1264/627ms, measured60.09/60.34/60.16fps;0console errors/failed image requests. Mobile receipts passed in the combined run; desktop passed independently after removing a stale order-bubble locator from the harness.

Full verify:406/406unit/server,10standard cohorts k2.4186–2.8738,15rush cases, career42/99 k3.48328/3.31825≤3.5. Three legacy risk-preview regressions and check:assets pass; shipped risk controls are hidden. Dev identity acceptance is in a7331b4; beer naming in e4a4bf6. Independent release diff review CLEAN.132manifest entries,108drafts,16accepted placeholders; two failed-alpha imagegen attempts recorded and counter cards have a registered table fallback.

This closes the owner-defined playable-v0 subset, not every M1–M5 milestone. M6/M7/M8 remain deferred; human-only acceptance remains WAIVED. Packaging/run instructions and exact code commit: [playable-v0](docs/playable-v0.md). Next, only after the tag: Steer14 buffer5/8/12/20/40 with full k gates and the owner-specified fallback.

## Owner Steer9 — 2026-09-11 00:05

M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release. Queue: current emergency
commit→dev identity→M4 closure→remaining automatedM1/M2/M3/M5→imagegen art/audio
(exclude deferred-only assets)→gameplay-facing M9 release gates. Free/no monetization.
Preserve configs/specs/manifests, keep deferred features OFF/hidden; audit existing
dog/emergency controls as a follow-up. Human playtests WAIVED.

## Owner Steer8 — 2026-09-10 23:45

M8 DEFERRED by owner 2026-09-10 — post-release. New queue M4→M6→M7→M9→release
candidate. Preserve M8 spec/config/manifest, keep featuresOFF/hidden; skip M8-only
art. Current emergency review correction includes all active/pending scope keys
and audiences; dev identity next. Other Steer7 rules remain.

## M4 emergency implementation — 2026-09-10

Basebb2bf0d; explicit Super+MFA A/B hotfix uses active config, replaces exact-scope
pending schedules with immutable audit and24h review ticket. Normal approval,
republication/rollback and live pins preserved. Focused server/mobile checks pass;
final root verify/admin suite/independent full-diff review running. Next: dev identity
provider acceptance per Steer7, then remaining M4→M6→M7→M8→M9.

## Owner queue resolved + keg asset batch — 2026-09-10

Steer #6 selects hotfix supersession of exact-scope future schedules; implementation
unblocked, exact preview/MFA/atomic24h ticket/pins remain required. Steer #7 waives
realOAuth wait and human-only playtests, requires explicit non-production dev
identity provider acceptance. Any-two-version diff E26 is already complete.
Finish current4keg imagegen exports (2export+2browser PASS, full verify PASS:389unit/server,10kcohorts/15rush/2careers),
then M4 emergency → dev identity/remainder → M6 → M7 → M8 → M9.16placeholders remain;
Blender archive preserved. No engine/economy edits or merge/push/deploy.

## M4 registry lifecycle closure — E27, 2026-09-10

`b5d3545`, base `2ad3f66`: admin list/details/comparison expose server-derived
lifecycle phases and per-read timestamps. Read-only transactions keep one metadata
snapshot; shared current-scope selection preserves existing expiry/non-resurrection.
Composed/imported configs remain stored snapshots, not active default publications.
Refresh updates comparison phases after another operator approves a version.
389unit/server,39focused,27admin+3final affected browser,config/build PASS;
independent full-base review reports no actionable introduced issues. Receipt:
`.qa/admin-phase-verification.json`; VI/EN390px images inspected.
No engine/economy/schema/activation changes. M4 remains15/18; emergency schedule
policy still awaits owner. Full M0–M9 remains active; no merge/push/deploy.

## M4 version comparison closure — E26, 2026-09-10

`61e68d5` + `62e8646`, base `fdda260`: arbitrary stored-version comparison uses
existing protected reads, removed-key-aware raw/scaled diff and each snapshot's k.
Viewer access, sibling/reverse/identical pairs, failed reads, draft preservation and
identity switches during reads pass. Scope metadata folds on portrait screens.
386engine/server,27admin browser,config/build and final independent review CLEAN.
Initial browser OTP collision fixed with a dedicated actor; production MFA unchanged.
Initial review doc drift corrected in tracker/dashboard/editor. Evidence:
`.qa/admin-compare-verification.json`; VI/EN390px captures inspected.
M4 remains15/18; engine/server/economy unchanged. Emergency schedule decision still
pending; next finish that mechanism and remaining M4 acceptance before M6–M9.
No merge/push/deploy or full-game completion claim.

## M4 emergency intake — 2026-09-10

Base `e5cba9d`; [bounded intake](docs/admin-emergency.md). Runtime is unchanged.
Current registry/scopes baseline passes36/36 (`.qa/emergency-registry-baseline.txt`).
Owner clarification is pending: does an immediate hotfix supersede published
future schedules, or do they replace it when due? Existing sequence ordering and
predecessor activation guards make this a material policy choice. No answer is
inferred; dependent publication/resolution edits have not started. M4 remains15/18.
Next: implement the chosen rule through the existing registry and admin boundary,
with atomic24-hour post-review tickets, exact retries and pinned live shifts.

## Public leaderboard closure — E25, 2026-09-10

Product628eb72 (basec53b6f0, foundation1803b85): public read-only live ranking
uses canonical server seasonal earnings, current Google membership/flags/review,
exact season IDs and pinned qualification. Configured refresh, stable first-reached
ties, paging and own-tier neighbors are implemented. The VI/EN board pauses the
shift, keeps only a dated public preview in localStorage and refuses a changed
account before showing personal rank. Guest sees the board and optional invitation,
never an own row; anonymous reads expose no private identity/history.

Initial review P1 identified accepted invalid display values. Shared server
admission/consumer validation now rejects zero/fractional/overflow settings, fences
old approved drafts and preserves historical gameplay pins/corrective publication.
Three regression cases failed before correction; final full-base review is CLEAN.
Final386/386 engine/server,52 focused,11 affected remote and24 admin browser,
config zero warnings and build/typecheck PASS. Foundation88/88 remote and2/2 local
browser PASS; the correction changes server validation and one guest assertion.
Receipt `.qa/leaderboard-verification.json`, screenshots `.qa/leaderboard-vi-390.png`
and `.qa/leaderboard-en-390.png`. No engine/economy JSON/schema change or new k sim.

M4 now15/18 OPEN; F28 stays in progress. End-season snapshots/shrine, editable
filtered profiles and season rewards remain outside this live-board slice. No live
Google consent or public archive transport claim; no merge/push/deploy. Next M4:
emergency admin configuration and remaining account/operational acceptance; public
archive upload and history-volume tuning stay M9 by owner decision.

## M4 admin history/review verified — 2026-09-10

`85fbdfb` completes protected paged history, approve/reject and flag/clear controls.
378engine/server +24admin browser pass; final5 affected browser/config/build and
independent full-base review pass after locale/status corrections. Engine/economy
unchanged. [E24 evidence and limits](docs/competitive-eligibility.md#admin-historyreview-closure--e24-2026-09-10).
M4 stays14/18 OPEN. Next: public rank query/filter/order using canonical scores;
public archive transport/performance stays M9. No merge/push/deploy.

## M4 competitive score verified — 2026-09-10

Code `7e7f337` (base `1fd89d9`): current competitive scores reuse engine seasonal
income/tier helpers and pinned config. Pending/rejected local earnings AND closed
shifts are excluded only for the exact imported season; later server earnings count.
Approval changes the read result once, never wallet balances or personal results.
New imports atomically record a checksummed baseline in existing immutable audit;
old imports recover the original cutoff through the bounded replay worker.
Authenticated `/player/competition` accepts no player/score override and rechecks
the exact session after recovery. Current Google/flag state gates eligibility.
Final **376/376 engine/server,19/19 admin browser,32 focused,config zero warnings
and build/typecheck PASS**. Review P1 synchronous inflation was fixed with a
red-before/green-after regression; final independent full-base review found no new
defects, confirms P1 closure, and independently passes13 targeted cases.
Receipt `.qa/competitive-score-verification.json`. No schema/engine/economy change.
**M4 remains14/18 OPEN**: public rank ordering/filtering/snapshots and protected
admin history/review controls are not supplied by a caller-only score API.

Next: protected source-history inspection and admin review/flag controls; reuse
current guards/receipts. Then public rank consumer. No public upload/80MB tuning.

## M4 review/flag core verified — 2026-09-10

Code `521e901` (base `51a5ab5`): immutable local-history approval/rejection and
player flag decisions, current-seq conflicts, exact retry receipts, mandatory reason
and protected audited inspection. Reuses existing Google/MFA/session/context/CSRF
and append-only audit; no schema, engine or economy JSON change. Actual imported
archives require review; server-origin guest attachment does not create an import.
Final **367/367 engine/server,19/19 admin browser,45 focused, config zero warnings
and build/typecheck PASS**. Independent review found no actionable correctness or
security defects and independently passed5 core cases/typecheck; its HTTP checks
hit sandbox loopback EPERM, while host signed-Google/MFA HTTP tests pass. Earlier
full test run exited143 before completion and is not counted as passing.
Receipt `.qa/competition-verification.json`. **M4 remains14/18 OPEN**: dedicated
history/review controls, imported baseline and competitive ranking consumers remain.
No merge/push/deploy or live Google consent claim.

Next: canonical imported-season baseline and competitive totals, then protected
history/review controls and ranking eligibility. Public upload/80MB tuning stayM9.

## Threshold admission verified — owner18:02 follow-up, 2026-09-10

Code `03dae56` (base `25cc21c`): reject threshold-group deletion at proposal and
preview/publication admission. Approved pre-fix drafts are fenced; already-published
scopes remain readable and can be corrected without changing live pins. Four new
regressions failed before their respective fixes. Final **361/361 engine/server,
19/19 admin browser,33 focused, config zero warnings and build/typecheck PASS**.
Initial independent review P1 about historical composition was corrected; final
review confirms compatibility and independently passes all5 targeted cases.
Receipt `.qa/threshold-admission-verification.json`. No economy JSON or engine
change, merge/push/deploy, live Google consent or full-game completion claim.

M4 now14/18 OPEN. Continue server eligibility/review for imported history; guest
device progress remains asE20. Imported local results require recorded approval;
post-import server earnings must still count. No public upload or80MB tuning now.

## Owner Steer #5 — guest device persistence, 2026-09-10 15:30

Correction base `90d1a50`. Guest stall/coins/upgrades/day/shift persist across new
tabs and browser reopen; no navigation-triggered restart or journal deletion.
Keep writer lock/exact-session guard and current Google attach/restore. Missing
credentials preserve the journal and refuse another player. Native lost-progress
upsell removed; VI/EN offers explain account-only history/achievements/ranking/
cross-device restore. Codee34fd56:357unit/server,84remote,4related local,19admin andconfig/build PASS.
Native scoped review90d1a50...056cf7c found no introduced defects; receipt
`.qa/guest-device-verification.json`. Prior invitation config P1 remains OPEN in
`docs/invitation-config-review.md`; M4 stays13/18. No engine/economy/config changes in this correction.
Older ephemeral-guest snapshots below are historical and superseded. Current
invitation work uses validated config fallback; next resolve its recorded proposal
validation defect in a separate slice before remaining M4 acceptance, thenM6–M9.
Steer #5 makes no engine/server/config changes. No merge/push/deploy.

## Google reauthentication verified — 2026-09-10

Code `ddc77a9`: expired/revoked/missing Google cookies now have an explicit sign-in
path at boot and during play. The original journal/client stream stays intact; confirmed retries need no new consent.
The existing verified transaction restricts recovery to that exact Google player;
wrong/new subjects refuse before mutation, and old credentials grant no authority.
Review P2 second-consent retry fixed with a red-before/green-after regression.
Serve requests lost before or after commit credit once after recovery. Whole-cookie
response loss retries in place; cancellation/stale callbacks and tab lock are covered.
354engine/server, final35API/import,72remote browser (10new),1local archive PASS;
config zero warnings/build/typecheck and native full-base review PASS.
Receipt `.qa/reauth-verification.json`; inspected VI/EN recovery screens.
M4 remains13/18 OPEN; F25 in progress. No live Client ID/consent, economy change,
public upload or merge/deploy. Next: configured invitations/cooldown and remaining
M4 acceptance → M6–M9; historical upload/tuning remainsM9.

## Two play modes verified — 2026-09-10

Code `8c9dc64`: guest play lasts this visit; same-tab reload/reconnect keeps actions,
while fresh navigation starts fresh. Google is an account: new accounts attach the
current visit once; existing accounts restore directly, with no extra stall choice.
Five review findings fixed: lost restart headers, copied markers, duplicate bootstrap,
historical Google identity after import, and the busy guest-mode action.
353unit baseline; final34server/import +22account browser PASS; remote62 +bootstrap3 PASS.
Local87+isolated5=92 and admin18+isolated1=19; mixed runs recorded explicitly.
Config zero warnings/build/typecheck and final independent full-base review CLEAN.
Receipt `.qa/account-modes-verification.json`; VI/EN portrait entry inspected.
M4 now13/18 OPEN: current-visit guest claim PASS. F25 remains in progress; live Client ID
absent. Next: Google reauthentication, configured invitations/eligibility and remaining
M4→M6–M9. Historical public local upload remains deferredM9; internal audit retained.

## Google account panel verified — 2026-09-10

Code `e5745af`: Settings now opens the VI/EN Google panel with exactly three
benefits. Same-player linking keeps the live shift/history/outbox; menu pause lasts
through pending verification even if the panel closes. Local archives stay intact.
Callback consumption is permanent per attempt; the regression reproduced a third
POST before the fix and now requires exactly two for failure plus explicit retry.
351engine/server,92local/44remote/19admin browser and final local1/1 PASS;
config zero warnings/build/typecheck PASS. Final native full-base review supports
the correction and reports no findings. Receipt `.qa/account-panel-verification.json`.
Signed fixtures verify HTTP/SDK behavior; no live Client ID/Google consent claimed.
F25 and M4 remain OPEN12/18. Next: explicit other-account save choice/recovery,
configured invitations, remaining M4 → M6–M9; public local upload remains deferredM9.

## Google guest-link transport verified — 2026-09-10

Code `3c369aa`: the web transport queues Google cookie rotation after acknowledged
commands and confirms the same player without replacing the journal, shift or history.
Lost responses reconcile without credential replay; renewal of the existing server
nonce prevents a still-verifying old request from committing after a guest read.
Current menu presence is confirmed before verification; existing-account conflicts
preserve both saves. No new endpoint/schema, engine rule or economy value changed.
351engine/server +33remote browser tests and config/build/typecheck PASS. Native
full-base review has no actionable findings after both reconciliation defects were
fixed. Receipt `.qa/google-link-verification.json`; contract `docs/google-web-link.md`.
F25/M4 remain OPEN (12/18): this is the transport prerequisite, not the Google panel
or save-choice UI. Next: Google panel and explicit conflict/recovery, then configured
three-benefit invitations and remaining M4→M6–M9. Live Client ID still unavailable.

## First-run locale verified — 2026-09-10

Code `5871453`: vi/en selection and acceptance precede game/save/session boot.
Fresh browser defaults, persisted choice, legacy welcomed preferences, storage
refusal/retry, module-load retry and live-shift locale changes are verified.
350engine/server tests PASS; final presentation parity3/3. Full browser regression:
91local +21remote +19admin PASS. Current config zero warnings/build/typecheck PASS.
Native independent review found no actionable defect and passed3presentation tests.
Receipt `.qa/locale-entry-verification.json`; mobile/desktop screenshots inspected.
F25 first-run locale criterion PASS; M4 now12/18 OPEN. Runtime engine, economy and
auth transactions unchanged; existing standard/advanced k and rush evidence retained.
Next: Google web link/claim/conflict and configured three-benefit soft invitations,
then remaining M4 acceptance → M6–M9. Live Google Client ID still not provided.

## First-run language entry implemented — 2026-09-10

Base6df1228. The existing welcome now appears before game/save/session creation,
with native vi/en choices, browser default and explicit stored acceptance. Selecting
language persists immediately; failed writes keep an actionable entry and no player
mutation. Legacy welcomed preferences preserve the original locale/live shift.
Settings changes reuse the same game/session. Config/build pass; full local/remote
browser regression and independent review are pending. No economy/auth mutation.
F25 remains open for Google web/claims, soft invitations and competitive eligibility.

## Protected seven-day forecast verified — 2026-09-10

Code `a99a567`, mobile table correction `9900505`: protected draft forecasts now
compare seven days of actual coin flows from a private server snapshot. Source
saves remain unchanged; scope removal, expiry and existing shift pins are retained.
Publication/revision changes during calculation return409; logout returns401.
350engine/server tests,19admin browser cases, config/build PASS. The final CSS-only
correction also passed config/build and the real mobile forecast browser case.
Independent full-diff correction and layout reviews: no actionable defects remain.
Receipt `.qa/forecast-report-verification.json`; VI/EN screenshot inspected.
Engine/economy JSON unchanged; verified standard/advanced k and rush evidence reused.
M4 remains11/18 OPEN. Next: remaining admin lifecycle and account/eligibility/locale
acceptance → M6–M9. VND forecasting awaits observed donation data; no invented income.

## Protected seven-day forecast implemented — 2026-09-10

Base0238bd5. Admin draft view now requests a protected seven-day before/after report.
Worker backs up SQLite to a private temporary copy and uses existing store presence,
catch-up, registry composition and pure career policy. Source saves stay unchanged;
all affected existing players, removed audience members and future expiries count.
Aggregated credits, spending, penalties, returned deposits and balances reconcile.
Request handling stays live; cancellation, worker limits, cleanup and admin-context
revalidation apply. VI/EN UI shows assumptions, snapshot time and unavailable VND.
Three new server checks and real mobile report browser case PASS. Final full suite,
admin browser regression and independent review are running. No economy numbers,
engine rules or publication approval semantics changed; M4 remains11/18OPEN.

## Advanced career k gate verified — 2026-09-10

Code `13367c1`: `npm run sim:career:gate` now runs as part of `npm run verify`.
Fresh30-day seeds42/99 both reachLP4:29,209/28,259serves, k3.483282/3.318249.
Each whole-career value passes≤3.5 and exactly matches prior measurements;
current reports record config2.0.1/rules24. Standard10cohorts and15rush cases,
345engine/server tests, config zero warnings and build/typecheck PASS.
Independent full-diff review: no actionable introduced defects. No economy JSON,
engine runtime, payment/anchor or standard2–3 band changed. Receipt:
`.qa/advanced-k-verification.json`; gate output `.qa/advanced-career-k-gate.json`.
04§5/08changelog record owner policy. M3 progressed-k criterion PASS; M3 is6/12PASS
and remainsOPEN for feel/art. Re-evaluate after Alpha playtest with real player data;
monitor endgame inflation through7-day faucet/sink reporting, not k.
Next: protected M4 forecast reporting/admin UI and remaining M4 acceptance → M6–M9.

## Table batch verified; advanced k owner decision next — 2026-09-10

Final batch11ceb79 verified:344engine/server tests,4guest viewport cases (including
12s delayed reload),4asset viewport probes, export failure regression, asset/config/
build checks PASS. Independent correction review clears all three findings and
independently passes the no-mutation regression. Receipt .qa/table-art-verification.json.
Imagegen tables Lv2–Lv4 wired; Blender paused and preserved. Art remains draft.
Next owner decision: automate advanced career k≤3.5 with two30-day/LP4 seeds, no
retuning; then protected M4 forecast reporting and remaining M4→M6–M9 acceptance.

## Imagegen table upgrades; Blender paused — 2026-09-10

Owner decision 10:50 supersedes Blender-only generation. Four finished Blender MCP
renders, original script and studio .blend are preserved under assets/_raw/blender;
archive-blender-* manifest IDs do not enter the runtime. Three built-in imagegen calls
replace table-lv2/3/4-empty placeholders through the existing level → manifest → path
mapping. Native-size exports use the existing crop/anchor helper, token shades and
pixel outlines; generated native alpha is preserved. Prompt/source/export hashes and
128/64/32 contact sheet: docs/reference/assets-owner-2026-09-08/table-upgrades-imagegen.json.
Sprites remain draft until final family production QA; F24 stays in progress.
132 manifest entries:20 placeholders,104 drafts (including four archived studies).
Config zero warnings/build/export checks pass. Four guest service/reload/pause/locale
browser cases pass after unfreezing the test clock during lazy screen startup/reload;
separate four-viewport checks confirm all new level sprites resolve and fit targets.
Full engine/server suite passes344/344; independent native review is next.
Forecast kernel03a6800 already verified/reviewed; M4 remains11/18 OPEN. Next protected
forecast aggregation/admin presentation and remaining M4 acceptance, then M6–M9.

## 🧭 Forecast kernel verified; Blender MCP owner priority — 2026-09-10

Final kernel `03a6800`:344engine/server, config zero warnings/build/typecheck PASS.
Two-day career still exactly matches its original report/hash. Foundation10ordinary
kcohorts2.4186–2.8738 and15rush PASS; runtime and those simulators unchanged by
corrections. Review identified two lease-progression edges: config retuning and
post-expiry snapshots. Both now use attained identity from the active lease/history;
final full-base review has no actionable finding and independently passed the lease
regression. Receipt `.qa/forecast-verification.json`. M4 remains11/18 OPEN: protected
server snapshots/timelines, aggregation/admin UI and observed VND data still remain.
No public upload,80MB tuning, engine/config changes or merge/push/deploy.

Owner asks to use Blender MCP for assets/UI. Existing Codex MCP installation verified;
its native Blender connection was absent. Isolated official Blender4.5.13 runtime
now connects successfully (addon1.6/protocol5); initial furniture/UI batch next.
Then resume remaining M4 acceptance and M6–M9. No full-game completion claim.

## 🧭 Current-save forecast kernel implemented — 2026-09-10

Base `f41122b`; shared deterministic career policy and seven-day projection from
a trusted Game fork. Scheduled prices/caps switch at openings; open pins and source
save are preserved. Actual wallet income, sinks, penalties and refunds reconcile.
Career parity and seven focused checks pass; full verification/review underway.
Next: protected server audiences/timelines, aggregate and admin forecast UI, then
remaining M4 accounts/admin acceptance and M6–M9. M4 stays11/18 OPEN; no public
upload,80MB tuning, invented VND forecast or live Google configuration.

## 🧭 Scoped admin controls verified; M4 remains11/18 — 2026-09-10

Producta84f41f (base22320d4, foundation5a4da74), rules24/config2.0.1/schema10.
Protected scope/audience/expiry/priority and ticket controls, exact pending retries,
scoped rollback/withdrawal and factual affected-player preview wired to server.
339engine/server,29focused,18admin/10remote browser,config/build PASS. Three review
findings corrected; final independent review reports no actionable regression.
Receipt `.qa/scope-ui-verification.json`. M0 COMPLETE; M4 still11/18 OPEN.
Next: full7day economic previews/admin lifecycle and account/eligibility/locale,
then M6–M9. Owner automatic segment/cap policy unanswered; Google ClientID absent.
No public local upload,80MB tuning,engine/config changes or merge/push/deploy.
Original20sourcehashes unchanged; worktree source frozen through correction review.

## 🧭 Admin browser editor verified; M4 now11/18 — 2026-09-10

Product56a0a44 (base988fc33, foundation3d5513e, receipt correctionf86fc69).
Dedicated `/admin` GIS/TOTP entry, author-bound durable draft, JSON key/import/raw-scaled
diff, separate approval/publication/rollback and audit. Server context blocks stale
cross-tab identity.321engine/server,11admin/10remote browser, config/build PASS.
Final review CLEAN; independent typecheck/diff-check PASS; config execution blocked by
reviewer tsx IPC EPERM (host passed). Two self-review defects and one review P2 buffer
edge fixed with regressions. Receipt `.qa/admin-editor-verification.json`.
M4 one-key/effectiveAt PASS;11/18 total, still OPEN. Next scoped registry/impact and
admin lifecycle/account gaps, then M6–M9. No real ClientID/Google consent, public upload
or80MB tuning. Original20sourcehashes unchanged; no merge/push/deploy. Goal active.

## 🧭 Admin identity/registry API verified; editor next — 2026-09-10

Product6f42575, base291264c; schema9/config2.0.1/rules24.
Google SDK + independent TOTP, private immutable-sub roles, eight-hour cookie,
durable OTP replay/lockout and atomic audit now protect default registry HTTP routes.
Player cookies and live shifts remain separate.320full tests (10admin cases),10remote
browser, config zero warnings/build PASS. Independent review CLEAN; typecheck PASS,
reviewer HTTP rerun blocked by sandbox EPERM. Receipt `.qa/admin-auth-verification.json`.
Next: /admin Google/Authenticator browser flow and actual editor using these APIs,
then scopes/account/eligibility/locale and M6–M9. M4 remains10/18 OPEN; no live Google
ClientID/directory configured, no enrollment UI, public upload or80MB tuning.
Original20sourcehashes unchanged; no merge/push/deploy. Full-game goal active.

## 🧭 Admin authentication/registry transport implemented — 2026-09-10

Base291264c, schema9/config2.0.1/rules24. Google signed identity + independent TOTP
establish admin authority; private server directory grants roles, eight-hour cookie,
durable replay/failure lockout and atomic audit. Protected read/propose/approve/publish
routes call existing registry handlers; player session/shift remains independent.
320full tests/config/build pass; final TierC/remote checks and native review underway.
Editor is next on this verified boundary, then scopes and remaining M4 accounts/locale,
M6–M9. ClientID absent; no fabricated MFA, public upload,80MB tuning or merge/deploy.

## 🧭 Default registry verified; admin auth/editor next — 2026-09-10

Productc1e953c (base732f860, foundation65f9242), schema8/config2.0.1/rules24.
Default config publication now controls actual opening pins; live/replayed shifts retain
original snapshots. Trusted actor/tier approval, atomic audit, retries and VN scheduling pass.
310engine/server +10remote browser, config/build zero warnings,10ordinary kcohorts
2.4186–2.8738 and15rush PASS. Foundation review P2 author-limit bypass corrected;
catalog identity changes require migration. Independent correction review CLEAN.
Receipt `.qa/registry-verification.json`; closure M0 COMPLETE, M4 still10/18 OPEN.
Next: authenticated admin transport/editor and scoped rules; remaining M4 accounts/
eligibility/locale, then M6→M7→M8→M9. No public upload or history-volume tuning now.
Original checkout/owner5174 untouched; no merge/push/deploy. Full-game goal active.

## 🧭 Default registry implemented; review in progress — 2026-09-10

Base732f860. Schema8 keeps immutable config proposals/approval/publication/audit;
GameStore now selects the active registry for creation/opening, never a replacement
constructor seed. Historical snapshot registration remains for exact old-save import.
Tier decisions require trusted server actors; no new public admin endpoint or role
input. Next slice must authenticate actors before exposing this core (MFA for Super/Game).
307full tests +10final focused/10remote browser pass; final sim and review in progress.
No game numbers/engine rules changed. M4 remains OPEN; scoped overrides, admin editor,
account/eligibility/locale remain. No M5 breadth or public upload/performance work.

## 🧭 Web server authority verified; registry/admin next — 2026-09-10

Product936e9d5 (base8e25c19, foundation60f9090) defaults new online play to server
snapshots, pinned config and reports. Durable ordered retry survives response loss,
offline/reload and current menu presence. Local archives remain separate and preserved;
corrupt archives retain forensic download/import/reset. Returning online yard stays visible.
298engine/server +91legacy/10remote browser, config/build (zero warnings),10ordinary
kcohorts2.4186–2.8738 and15rush PASS. Full-base review P1 recovery finding fixed;
independent correction review CLEAN. Evidence: `.qa/m4-web-verification.json`.
Closure: M0 COMPLETE; M4 now10/18 criteria PASS, still OPEN; M1–M3/M5 remain OPEN.
Next: protected registry/admin BRD§5.2, then remaining account/eligibility/locale gaps,
M6→M7→M8→M9. ClientID absent; local credit needs approval; no public upload/M9 tuning.
Original checkout/owner5174 untouched. No merge/push/deploy. Full-game goal stays active.

## 🧭 Web server cutover implemented; independent review next — 2026-09-10

Base8e25c19. Web defaults to server authority with a native-lock single-writer journal,
current visibility/menu heartbeat, exact retry after lost ACK/reload, bounded queue,
account mismatch/storage failure stop, and reconnect status with frozen yard. Exact
pinned public config and server menu/presentation reports are delivered. Existing local
archive remains intact with explicit legacy/new-server choice; no public upload or M9
performance work.298engine/server tests,91legacy browser and7remote scenarios pass;
final hidden/menu addition, sim and independent review in progress. Config2.0.1/rules24
unchanged; engine edits narrow read-helper types only. M4 remains OPEN for registry/admin
and account/import/eligibility UI. Next registry/admin, then M6→M7→M8→M9. No merge/push/deploy.

## 🧭 Server liveness verified; remote web next — 2026-09-10

Base `3f1d2bc`, final product `9f38166` (foundation `85cbb5d`). Schema7 persists
session-bound heartbeat leases and applies exact expiry before server catch-up.
Every public action now requires a live heartbeat from its first command. Actual
hidden/menu presence, token rotation, multi-view expiry, normal closing after restart,
transaction rollback and same-key action retry are verified. Final config/build and
298full tests +19 final real HTTP/presence checks pass; full-range native review
found no actionable defect and independently passed9 SQLite/presence checks.
`.qa/m4-heartbeat-verification.json`; original20sourcehashes unchanged. No engine/
config values changed; prior0bcbcde ordinary k/rush evidence retained, no80MB tuning.

M4 remains OPEN: web still uses local Game/IndexedDB. Next implement remote web
controller, durable action outbox, reconnect UI, pinned public config/report delivery;
then registry/admin, M6→M7→M8→M9. Keep exact local backups and owner's deferred public
upload boundary; ClientID absent, local history review-before-credit policy settled.
No merge/push/deploy. See `.qa/m4-web-next-contract-notes.md` for current entry points.

## 🧭 Mandatory public heartbeat admission — 2026-09-10

Product `85cbb5d` received independent review with no actionable defect. Tightened
public admission before web cutover: every cookie-authenticated action requires a
live heartbeat even for a new player; no public compatibility opt-out. HTTP tests
now handshake, keep alive and update menu state through real heartbeat requests.
19 targeted HTTP/presence tests pass; final full checks and full-range review pending.
Native review of85cbb5d independently passed30checks; socket test startup and two
following checks were cancelled in reviewer environment, host42tests passed.
Next is web remote controller/outbox/config delivery, then registry/admin.

## 🧭 M4 durable heartbeat — 2026-09-10

Base `3f1d2bc`. Implemented schema7 owned/session-bound heartbeat leases, monotonic
presence sequence, aggregate menu/visibility, exact expiry before catch-up and native
HTTP startup/timer sweep. Normal closing and resting loss are both durable. Tests
cover real HTTP restart, two stores, replay/checkpoint, session rotation/revocation,
rollback and action retry. Config/build298 tests + strengthened10presence pass;
native review pending. No engine/config value changes, no public upload or80MB work.
Next: web uses server snapshots/outbox/reconnect, then config registry/admin, M6–M9.

## 🧭 M4 connection recovery prerequisite — 2026-09-10

Base `9e88643`, product `0bcbcde`. Trusted rules24 recovery preserves hidden/menu
state and freezes resting loss; historical replay remains unchanged.288 full tests,
42 final focused real-HTTP/engine tests, config/build,10kcohorts2.4186–2.8738 and
15rush pass. Native review found no actionable defect (33 independent engine checks;
reviewer HTTP socket permissions blocked). `.qa/m4-presence-verification.json`.
Original20sourcehashes unchanged. No server liveness or web cutover claim yet. Next: durable heartbeat deadline before GameStore.catchUp,
then web server authority/outbox and config registry/admin. No further80MB work.

## 🧭 Checkpoint closed; M0 complete; M4 integration next — 2026-09-10

Product `f86e2b3`, base `89c7263`: schema6 trusted checkpoints preserve exact
history/projection/config/private engine state without cold resimulation.281tests,
config/build/typecheck,10kcohorts2.4186–2.8738 and15rush pass. Native independent
review found no actionable correctness/security defect and passed17focused checks.
`.qa/server-checkpoint-verification.json`. Original20sourcehashes unchanged.
Actual80MB cold2.23s vs29.36s, exact world/events/original/retry; import49.47s and
3.53s loop gap remain. Owner explicitly timeboxes performance: stop here; no public
upload/further80MB tuning/host-sleep reruns. `docs/m9-history-volume-followup.md`.

Milestone closure: M0 COMPLETE from all3explicit exit criteria. M1–M5 remain OPEN
with criterion-by-criterion PASS/FAIL and named evidence in
`docs/milestone-closure-m0-m5.md`; feature totals no longer substitute milestone state.
F13's local acceptance rules pass, but social/cosmetic/full-career integration does
not become complete by assertion. No fake human playtest, Google setup or art QA.

Next fixed queue: M4 web uses server SaveStore as sole authority, reconnect F23§8,
config registry+admin BRD§5.2 → M6 → M7 → M8 → M9. Do not add more M5 breadth now.
Owner approval policy: keep local progress, review history before competitive credit,
credit once. ClientID absent, advancedk/prizes unresolved. Keep menu pause/in-shift
upgrades/batch capacity/numeric loss decisions. Original checkout/owner5174 untouched;
keep unrelated.dashboard/events.jsonl. No merge/push/deploy; full game goal stays active.

## 🧭 Local claim core verified; server cold-state loading next — 2026-09-10

Product `51a0734`, base `c9bd6e8`: schema5 internal `GameStore.claimLocal` validates
archives in a bounded worker against known server configs. Full original gzip,
source IDs, active shift, command/event history and pending provenance are preserved.
Account/destination revalidation, collisions, exactly-once import and auth rotation
are atomic; previous server player stays stored. Approval eligibility is still pending.
No public upload/review endpoint, real Google Client ID or web cutover is claimed.

271engine/server tests (including7local-import cases), config/build/typecheck pass.
Native independent review found no actionable introduced defect; no independent
reviewer test rerun is claimed. `.qa/local-import-verification.json` binds artifacts.
Actual80MB archive imports/reopens/retries exactly:16,567commands/388,986events,
1,582,365xu/LP4/240shifts. Measured48.38s import,29.36s cold read,2.65s main-loop pulse
gap during result/persistence. This proves integrity, not public cloud responsiveness.
The temporary database was removed by the probe; original month fixture is retained.

Next concrete work: server cold-state loading, then isolated upload/recovery and
review eligibility before remote web integration. Read `.qa/server-cold-state-boundary.md`.
Do not repeat the30day simulation or reviewed import core. Fix the measured replay
cost without trusting uploaded projections or dropping history. Owner local-history
review policy is settled; advanced k scope/prize amounts remain unanswered, no tuning.

Original20sourcehashes unchanged; original checkout/owner5174 profile untouched.
Keep unrelated.dashboard/events.jsonl. No tests/review processes running after receipt.
No merge/push/deploy. Full M0–M9 goal remains active:20features in progress,0complete.

## 🧭 Google server accounts verified; local import/review next — 2026-09-10

Product `ebe820c`, base `b42c034`: schema4 canonical Google subject/player mapping,
session-bound one-use nonce, transactional cookie rotation and append-only auth audit.
Server guest history/live shift/receipts keep their exact immutable player ID. Existing
account conflicts refuse by default; explicit keep-account switches without merging.
Auth revalidates session/nonce after SDK IO; stale-cookie logout supports recovery.

264 engine/server tests, config/build/typecheck and real CLI configuration/restart
checks pass. Native independent review found no actionable introduced defect and
independently passed all6 account/store tests; reviewer socket tests hit sandbox EPERM,
author actual signed-token SDK/HTTP tests pass. `.qa/google-session-verification.json`.
Missing owner Client ID keeps Google disabled; no live Google login was tested.
Web remains local; no claim/import/review approval or cloud cutover is implied.

Next: protected one-time local import preserving the full archive and live shift,
then server-recorded review eligibility before ranking. Read
`.qa/local-import-next-boundary.md` before choosing the writing scope. Source IDs,
known config snapshots, player conflicts, replay cost and import retry ownership are
part of the boundary. Approval must derive credit from recorded history, never accept
an arbitrary amount. User chose “Duyệt lịch sử local rồi mới tính”; no question remains
on that policy. Advanced k scope and concrete season rewards remain unresolved.

Prior91browser/80MB acceptance remains valid: no web/storage/engine changes this slice.
Do not rerun completed checks without new changes/failures. Original20sourcehashes
still match; original checkout/owner5174 profile untouched. Keep unrelated
`.dashboard/events.jsonl`. No tests/review processes remain, no merge/push/deploy.
Full M0–M9 goal remains active:20features in progress,0complete.

## 🧭 Storage verified; Google verifier reviewed; local-history policy answered — 2026-09-10

Product917f862; server Google prerequisite baseb5101f0. Official SDK verifier,
strict Google Sign-In issuer/audience/signature/nonce/azp/expiry/subject, safe errors.
Native correction review resolves the SDK extra-issuer P1, no remaining introduced
defect.255engine/server +config/build/typecheck pass. No real Google Client ID,
no login/account/claim endpoint or web cutover yet. `.qa/google-verifier-verification.json`.

Storage/engine unchanged from reviewedc9db016. All91browser tests passed in2.6min
once host was actually awake; physical lid state alone was not sufficient evidence
of current sleep (display/user activity established wake). Actual80MB HTTP fixture
acceptance passed:16567commands/388986events exactreopen and one-command delta,
Appboot20.458s,1.582.365xu/LP4/240shifts,no pageerrors;390×844 image inspected.
`.qa/browser-save-verification.json`. Do not rerun completed career or storage checks
without new code/failure evidence. Long startup/memory remains a measured limit.

OWNER ANSWER: “Duyệt lịch sử local rồi mới tính”. Preserve all local progress;
imported history requires server-recorded review before ranking and credits once.
F25/F28 updated. That policy question is resolved; advanced k-band question remains.
Next bounded slice: read `.qa/google-account-boundary.md`, implement durable
one-use nonce/account mapping/cookie transaction while preserving immutable player
IDs/history; then protected claim/review and HTTP/web integration. Schema3 currently
has no accounts. Revalidate cookie/nonce at consume after asynchronous verification,
refuse progressed-account conflict, preserve old history. No fake login/prizes.

Original checkout/owner5174 profile untouched by tests; source20hashes unchanged.
No tests/reviews running after final receipt. Keep unrelated.dashboard/events.jsonl.
No merge/push. Full goal stays active,20features in progress,0complete.

## 🧭 Storage code reviewed; browser verification awaits awake host — 2026-09-10

Code `c9db016`, base310c94e. Native final correction review found no introduced
code regression; both remaining findings resolved. Do not repeat the code review
or30-day career simulation. Current config/build/typecheck pass;250engine/server,
10ordinary k cohorts and15rush passed before web-only corrections (codec unchanged).

Final91browser run:86passed,5timeouts during confirmed ClamshellSleep; NOT a full
pass. Owner was asked to open the lid; no reply yet. Next run the full browser suite
and existing80MB HTTP acceptance sequentially while awake, as listed in
`.qa/resume-browser-save-verification.md`. The fixture already exists; no regeneration.
Earlier80MB exactwrite/read/delta/Appboot passed at542784d (~19.5sstartup); that is
not proof of the finalcorrection. `.qa/browser-save-verification.json` records both.

No tests/review processes remain after this receipt. Product code is committed;
original checkout/owner5174profile remain untouched by test tools,20sourcehashes
still match. Keep unrelated `.dashboard/events.jsonl`. No merge/push. Full goal
remains active,20features inprogress,0complete. After storage verification: account
provider foundation before community ranking; see `.qa/career-next-boundary.md`.
Advanced k scope unanswered; Google ClientID “chưa có”; no invented season prizes.

## 🧭 Browser career storage implemented; checks running — 2026-09-09

Base310c94e. Native IndexedDB writer + async App/local wiring, delta chunks,
atomic header/backups and stale revision refusal are implemented. Legacy source
is retained, export/decoder keep full history. New real3-day storage regression
passes. Full browser82/84 exposed batch-completion reload before periodic save;
event-triggered save correction now being checked. `.qa/browser-save-contract.md`.
Finish browser/80MB acceptance, native review, docs/receipt/commit. Do not repeat
career simulation policy/review or touch owner5174. Full goal remains active;
advanced k question, Google Client ID and season prize quantities remain pending.

## 🧭 Career verified; durable save growth next — 2026-09-09

Harness `b01f4b1` verified/reviewed: two30-day seeds,240shifts each, LP3 day8/9,
LP4 day16/17.250engine/server tests, config/build,10ordinary k cohorts and15rush
pass. Full30-day seed42 save replay matches16567commands/388986events/6season
results. `.qa/career-verification.json` and docs/career-simulation.md hold evidence.
Do not rerun the career checkpoint or retune numbers.

NEW priority: the actual month save is80013203bytes. local.ts::persist writes the
whole encodeSave string to localStorage on commands. Fresh isolated Chromium153
size probe throws QuotaExceededError; prior small value is preserved, latest
progress would be unsaved. Fix persistence growth/migration before auth/BXH.
Inspect codec+local adapter+App callers; no silent log deletion or trust bypass.
Read `.qa/career-next-boundary.md` for diagnosis and the later auth dependencies.
Original checkout/owner5174save remain untouched by tools; source20hashes unchanged.

Actual advanced career k3.483282/3.318249,22/20days outsideband; owner band-scope
question still unanswered. Missing Google Client ID already answered “chưa có”; do
not ask again or simulate successful login. No concrete season prize quantities;
no invented rewards. Full M0–M9 remains active;20features in progress,0complete.

## 🧭 Seasons verified; real career next — 2026-09-09

Rules23 product `faece69` is verified and independently reviewed: all three initial
findings resolved. 248 engine/server tests, config/build, 10 ordinary k cohorts
(2.4186–2.8738) and 15 rush cases pass. Browser: 79 passed on initial implementation,
6 relevant season/menu checks passed again after corrections. Receipt:
`.qa/seasons-verification.json`. Do not repeat the seasons review/checkpoint.

A real three-day diagnostic completed24shifts,2042serves,492295earned,LP2 and peak
bach_kim (Bom Bạc). Assets keg3/washer3/cooler3/stall4/kitchen1, phone+QR; no free
coins/LP/peak/gear. `.qa/career-seasons-three-days.json` is diagnostic only: the
policy has not yet purchased tables/sign/flyer/leases. Next implement the bounded
career harness and run a fuller multi-day policy; read `.qa/career-next-policy.md`
and F13. Do not force original-checkout reference timings or weaken subsidiary gates.

F12 personal season accounting/view is implemented; community ranks, server season
snapshots and reward mailbox are not. Config lacks concrete season prize quantities;
no rewards were invented. Owner advanced k-band question remains pending, config2.0.1
unchanged. No Google Client ID. Original checkout and5174save not manipulated by tools.
Full M0–M9 remains active;20features in progress,0complete.

## 🧭 Seasons rules23 implemented; verification in progress — 2026-09-09

Core dual-season accounting and a real peakLeague producer now exist, plus the
VI/EN personal season panel after3closed shifts. See F12 §10 and
`.qa/seasons-contract.md`. Focused browser tests pass; full checks/native review
are still pending. Do not call full F12/F28 complete: global ranks/mailbox remain.
Next after this checkpoint: actual career using the real season producer.

## 🧭 Lease verified; season producer next — 2026-09-09

Rules22 lease productce7564b reviewed with both config findings resolved.234 engine/
server,77browser,config/build/typecheck,10ordinary k cohorts2.4186–2.8738 and15rush pass.
Test-only alignment preserves legacy overflow regression. Receipt `.qa/lease-verification.json`.
Do not repeat the lease review/checkpoint. Next: real seasons/peakLeague producer, then
career simulation. Read `.qa/league-next-boundary.md` and F12/F13/F28.

Fresh actual8-shift diagnostic:678serves,160495earned,LP1 during shift7,phone bought;
no direct LP/coins/gear assignment, not fullcareer proof. Source20files still match.
Owner advanced-band scope question remains unanswered; keep2.0.1 numbers and failed
combined evidence. No Google ClientID (owner said chưa có). Original checkout/5174
save preserved. Full M0–M9 remains active;19features in progress.

## 🧭 Lease calendar/UI — 2026-09-09

Rules22 lease purchase/early move/departure/calendar expiry/refund and VI/EN menu
implemented after0fc8c4f.232 engine/server checks pass; full browser/sim/review running.
Contract expiry stays real during menu/offline customer pause. Current `.qa/lease-*`
evidence; full F14 and career still pending. Advanced-economy band interpretation
question remains unanswered; preserve2.0.1 prices/formula and failure evidence.

## 🧭 Economy2.0.1 checkpoint — 2026-09-09

Implemented/reviewed at9c2870a: versioned schema, tank/tap/pan pipelines, stock-aware
demand, owned glass buying, LP gates and capacity UI. Config/build221 engine/server
+75 browser pass; native review has no actionable introduced defects. Ordinary
1000-serve k2.4186–2.8738 and15rush pass. Combined full-menu k3.0416–3.2074 fails the
band; owner question pending, preserve numbers and formula. Receipt in
`.qa/economy2-verification.json`; do not redo this checkpoint or label full balance
complete. NEXT independent implementation is leases/rental UI, then actual career;
`.qa/lease-next-boundary.md` records bounded calendar/financial edge decisions.

## 🧭 Owner handoff update — 2026-09-09

Read the actual updated original handoff, 03/08/10-SPEC, F08/F10/F11/F13/F14,
config2.0.0 and corresponding reference code. Accepted delta/precedence and source
hashes are recorded in `docs/latest-handoff-adoption.md`. After closing the disconnection
review, prioritize the new economy pipelines, glass purchases and capacity UI,
in-stock demand, LP gates and lease lifecycle before the server liveness adapter.
The original19-test/career results do not describe this branch. Working source has now adopted2.0.1/rules21 station/demand/glass/LP-gate mechanics and HUD;217 engine/server checks pass. Browser, simulations and independent review are in progress. Historical1.7.3 results do not certify the new economy.

## 🧭 Rules19–20 checkpoint verified — 2026-09-09

Pure disconnection grace/closing and inactive calendar migration are verified at
1fa6b14 on base cc1aee5. Config/build and211 engine/server checks pass. Final correction
review3ed1e19..1fa6b14 resolves the last full-review findings and independently passes34
checks.72 browser checks and20 canonical1000-serve k cohorts2.5821–2.9601 plus15rush
checks passed at3ed1e19; the final correction only affects old19 recovery. Receipt:
`.qa/disconnection-verification.json`. Saved history remains pinned; live catch-up
writes a neutral20 boundary and does not backfill absent quests or invent attendance.
Server liveness/outbox/web remote cutover remain unfinished. NEXT: accepted economy2.0
pipelines, glass purchases, demand/LP gates and capacity UI, then leases/career sim.

## 🧭 Current build checkpoint — 2026-09-09

The current source is the isolated worktree `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game`
on `codex/game-build-isolated`; original checkout remains atbc79af5. The historical
zero-percent snapshot below is not current implementation truth.

Config pinning plus owner menu pause were verified at7c60c70 (receipt f2e85f8):
156 engine/67 browser checks,20 k rows2.3125–2.7562,15 rush rows and native review
without actionable defects. Stock purchases keep the menu open/paused until closing.

Implemented the M4 SQLite event store in `apps/server`; it persists the same engine
atomically and survives retries/restarts. Config/build,166 engine/server and69 browser
checks passed;20 economy/15 rush rows passed. Native review found retry-order and invalid-cursor issues; both fixed; native reviewf2e85f8..3ff21df found no actionable defects.
Owner live-upgrade update is verified in rules17; menus remain paused until closed.
Owner beer/washer batches and capacity HUD are now verified at7897bdd: rules18/config1.7.3,
174 engine/server and72 browser checks,20 canonical1000-serve k rows2.5821–2.9601,
15 rush rows. Native review has no remaining introduced defects after cooler/legacy
progress fixes. A500-serve combined excursion remains disclosed in build-progress.
Menus still pause until close; old pinned shifts adopt batches at their next start.
Guest HTTP/session ownership is verified through62b4445: config/build182 engine/server
checks and actual CLI/Chromium smoke pass. Full-range native review090d920..62b4445
has no remaining introduced defects after command-field/cookie/pagination fixes;
reviewer socket reruns were sandbox-blocked. Test API5175 is stopped, web5174 stays local.
Owner has no Google Client ID yet; setup guide: `docs/google-signin-setup.md`.
Server client sequencing is verified ate390a1c: config/build187 engine/server,
actual CLI/Chromium; independent review794d75c..e390a1c found no introduced defects
and independently passed12 storage tests. Schema3 receipts preserve exact-once
results and per-tab ordering. `.qa/sequence-verification.json` contains the receipt.
Next: trusted engine timeout-close + server liveness, browser buffer/reconnecting UI,
registry/account claim and remote web integration. A real probe shows normal endShift
stalls when inactive and activity:true invents an attendance day across midnight;
see `.qa/connection-expiry-design-probe.md`. Genuine e390a1c v18 fixtures captured.
Full game/art/server/release are unfinished; lack of Google ID does not block other work.
Current evidence and requirements: `docs/build-progress.md`, tracker and roadmap.

| Date | Change |
|---|---|
| 2026-09-09 | Verified schema3 server input ordering at e390a1c; captured compatibility saves and timeout-close design probe. Full M0–M9 remains active. |
| 2026-09-09 | Verified guest HTTP/server boundary at62b4445, added Google setup guide after owner confirmed missing Client ID; continue M4 without switching the local save. |
| 2026-09-09 | Verified batch beer/washer production and realtime capacity HUD; refreshed current evidence and remaining M4 work. |
| 2026-09-09 | Updated verified SQLite/live-upgrade receipt and owner batch priority. |
| 2026-09-09 | Added current isolated-worktree checkpoint and durable-store work; preserved the historical snapshot below as history. |

---

## 🧭 Trạng thái dự án (snapshot 2026-09-08, cuối ngày)

**Là gì:** Game idle/tycoon **phục vụ khách theo ca 12 phút** ở quán bia hơi vỉa hè Hà Nội 2000s, mobile-first web; re-skin từ trumviahe.com (trà đá), giữ 5 lớp economy, thêm hệ bàn + bia mất hơi.

**Giai đoạn:** **Bộ docs đã chốt và đủ để giao dev/designer.** Game **viết mới từ đầu, 0 %, chưa mở M0**. `prototype/` là lưu trữ (đã đo k = 2.24–2.34), không kế thừa code/layout. Không còn blocker.

**Đọc theo thứ tự:** `00-HANDOFF` v1.11 → `11-PROMPT-PACK` v1.11 (Phần A designer / Phần B dev) → `02-GDD` v1.11 + `03-SPEC` → `08-SPEC` v1.2.6 + `docs/config/economy.tbh.json` 1.5.1 → `06-ROADMAP` v3.0 (mốc M0–M9) + `docs/implementation-tracker.md` v0.7.0 (0/28) → `docs/features/F07–F28` → `docs/reference/` (layout) → `trum-bia-hoi-brd-admin.md` §5.2. **Trạng thái chi tiết + việc chờ:** `docs/TRANG-THAI-DOCS.md` (chỉ giữ bản mới nhất).

**Quyết định đang hiệu lực (chủ dự án 08/09):** 1 phase, đủ 5 lớp economy, P/Phase = thứ tự code · **localStorage trước, server ở M4** (server-ready qua `eventLog`) · onboarding F27 🟢 (guest không đăng ký, login Google giữa ca, ca 1 = 1 khách 1 bia, 3 lần mất khách → step guide) · layout tham khảo = ảnh game gốc `docs/reference/` · 9 mặt bằng · bếp 4 cấp · audio 75 id theo thư mục nhóm · content bank + tính năng kiểm tra ⏸ pending · **chơi FREE hoàn toàn, monetization duy nhất = donate cho admin (F20), F26 bỏ** · `npm run check:config` chạy ở gốc repo · **doc giao việc chỉ ghi input/output/plugin/acceptance, không cầm tay** · **Level 3/autopilot không còn bắt buộc — dev tự quyết quy trình build** (`.autopilot/`, `docs/autopilot-*` = lưu trữ).

**Chốt sau (đã có default, không chặn):** content bank + kiểm tra (M5–M6) · cổng nhận donate (provider tự động nếu có; mặc định QR + admin xác nhận) / age gate (M7) · nguồn API bóng đá (M8).

---

## ⏭️ Việc tiếp theo — BẮT ĐẦU M0

1. **Dev:** dán **`12-PROMPT-claude-build.md` Phần 1** vào Claude Code ở gốc repo (Codex review tự chạy qua `codex exec review --base master - < docs/prompts/codex-review.md`); chi tiết ràng buộc ở `11-PROMPT-PACK` Phần B; quy trình (branch/slice/review/merge) tự quyết, không cần Level 3. Slice đầu = **M0**: repo game mới, config loader từ JSON + schema, engine thuần + shift loop, sim headless đo k, trỏ 2 script `check_*.py` sang code mới, skeleton `docs/analytics-events.md` + `vi.json/en.json` + `assets/manifest.json`, placeholder convention (HANDOFF §4.4). Exit: `check:config` xanh trên code mới · sim 5 seed k ∈ 2.0–3.0 · build + test xanh.
2. **Designer (song song):** dán Phần A. Critical path: ghế + bàn Lv1 → HUD icon lõi → chủ quán + 7 khách → thiết bị Lv1–3 → `bg-quanbia-default`; audio nhóm ui/serve/beer/shift cho M1. Đầu ra theo `docs/asset-production-checklist.md` v1.4 + `assets/manifest.json`.
3. **Chủ dự án:** commit git bộ docs 08/09; xoá `scripts/apply_pending_0809.py` (script vá đã chạy); slice prototype `p0-ui-serve-popover--r2` merge hay bỏ tuỳ ý — không chặn.
4. Mỗi slice kết thúc bằng báo cáo mẫu `11-PROMPT-PACK` §0.3; đổi trạng thái feature ở tracker rồi `python3 tools/dashboard-engine/build_dashboard.py --no-network`.

---

## 🗒️ Nhật ký phiên

### Session 2026-09-08 — Game mới: M0 verified, playable M1/M2, initial M3
- Worktree hiện hành: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game`, branch `codex/game-build-isolated` từ `bc79af5`; tách sau khi phiên Claude commit chung root. Root được giữ nguyên.
- Engine thuần + config loader, replay/local save, sim k, React sân quán + nhập/nâng/sổ ca/vi-en/guide; 15 test và build/config pass. 5-seed k=2.2702–2.5072 (≥500 lượt/seed).
- 3 viewport đã thử serve/reload/sheet/locale; đóng ca 12 phút tự động. 8 sprite anchor giữ nguyên, 41 placeholder, 32 SFX mới (Ogg+AAC) còn nghe/QA.
- **Chưa xong full game.** Tiếp theo hoàn tất core edge cases/art, M4 server/admin/accounts, rồi đủ meta/risk/events. Tiến độ/commands/giới hạn: `docs/build-progress.md` (nguồn mới hơn snapshot đầu file).


### Session 2026-09-08 (22) — Audit HANDOFF → chốt quyết định → đồng bộ toàn bộ docs, reset tracker
- **Audit `00-HANDOFF` v1.5** đối chiếu từng file: 4 lỗ hổng (onboarding không ràng buộc; nhãn POST-MVP/phase sót; `check:config` trỏ prototype; layout card-list ≠ ý chủ dự án). Cả 4 đã xử lý cùng ngày.
- **Chủ dự án chốt:** localStorage trước → server M4 · onboarding 5 luật (F27 🟢) · layout = ảnh game gốc (`docs/reference/` 8 ảnh) · 9 mặt bằng · content bank + kiểm tra pending · doc giao việc không cầm tay · "follow recommend" cho phần còn lại.
- **Docs mới:** F27 onboarding, F28 leaderboard + Bàn Thờ, `docs/reference/` + README, `docs/content/` (schema, pending), `docs/TRANG-THAI-DOCS.md` (thay audit; chỉ giữ bản mới nhất), `package.json` gốc (`check:config`).
- **Docs sửa:** HANDOFF v1.11 · GDD v1.11 · 06-ROADMAP **v3.0** (1 phase, M0–M9) · 08-SPEC v1.2.6 + JSON 1.5.1 (+`network`, `onboarding`, `audio`, `leaderboard`, `risk.inspection` pending, `cosmetics._rule`) · 09-SPEC v1.1 · 10-SPEC v1.7 · 11-PROMPT-PACK v1.11 · F10/F12/F14/F15/F16/F23/F25 · checklist v1.4 (B7 audio 75 id theo thư mục nhóm, 8 gap §P2 đóng, bếp 4 cấp, B1 12 icon, ~550 asset) · item-list v1.7 · tracker **v0.7.0 reset 0/28** + dashboard rebuild + test guard 26→28 · CLAUDE.md/AGENTS.md dòng verify.
- **Chốt thêm cuối ngày:** **chơi free hết — monetization = donate cho admin.** F26 ⛔ bỏ (giữ file lưu trữ), F20 = nguồn thu duy nhất (M7); JSON 1.6.0 `entitlements.mode=free` + section `donation` (A); sửa HANDOFF v1.12, GDD v1.12, 08 v1.2.7, 09/10-SPEC, 11-PP v1.12, ROADMAP v3.1, tracker v0.7.1 (F26 ⏸), BRD v0.5 §7 Donation, asset-list/checklist bỏ `icon-session-pass`.
- **Chưa commit git.** Backup `$HOME/*.bak`. Việc kế: **bắt đầu M0** (xem trên).

### Session 2026-09-08 (21) — Audit toàn repo + đồng bộ docs theo tiến độ thật
- **Audit toàn bộ repo** (docs + codebase + tooling + git state) → `AUDIT-REPO-2026-08-24.md`. Xác minh độc lập: chạy lại `npm run sim` từ source, **tái lập đúng từng con số** của gate 15/07 (k 2.27/2.34/2.27/2.28/2.24; normal loss 0%; peak 26.1–40.8%); typecheck strict engine+sim sạch; probe riêng (chạy 2.000s không thao tác, trần ngày, glass invariant) không lộ bug. → **số liệu trong tracker/roadmap là đo được, không phải tự khai.**
- **Phát hiện chính:** blocker của dự án **không phải kỹ thuật** mà là **Alpha playtest chưa chạy, treo ~8 tuần**. Từ 15/07 không có commit gameplay nào; baseline timeline cũ (P1 chạy T7–T9) đã vô hiệu.
- **Đồng bộ docs theo thực tế:** ROADMAP → **v2.7** (re-baseline timeline dời ~2,5 tháng: P0→30/09, P1→15/12, P2→31/01/2027, P3→31/03, P4→15/05; thêm bảng đối chiếu baseline cũ/mới + cảnh báo nhịp độ; NOW 🟡→🔴 + thêm dòng Alpha là hạng mục chặn duy nhất). Tracker → **v0.6.0** (không đổi status feature nào — đúng thực tế; sửa phạm vi F01–F24→**F01–F26**; ghi nhận tái lập độc lập). GDD title **v1.5→v1.6** (changelog đã có v1.6 từ trước → file tự mâu thuẫn). `prototype/README.md`: sửa **"1 ca = 120s"→12 phút**, thay số **k=1.63 lỗi thời** bằng bảng 5 seed hiện hành, làm rõ nhịp spawn 10.5s/**khách**, thêm mục gate + 2 cảnh báo khi đo (nút UI shell, dòng aggregate luôn 0). Backlog: đánh dấu 8 slice Phase 0 **đã merged** (bảng cũ đọc như còn nguyên việc).
- **Dọn tồn:** merge slice `dashboard-phase-table-boundary` (READY từ 15/07, P2) → dashboard hết parse header Phase 4 thành feature thứ 27 (27→26); rebuild `docs/dashboard.*` vốn còn kẹt số **0%** từ 11/06.
- **Còn tồn, chưa đụng (cố ý):** 27 file modified của đợt sync autopilot kit v31 — chờ chủ dự án tự quyết commit/revert; worktree mồ côi `.autopilot/worktrees/economy-k-tune/`; GitNexus index stale từ 15/07 (chạy `node .gitnexus/run.cjs analyze` trước đợt code kế).
- **Việc kế:** **CHẠY ALPHA PLAYTEST** (xem §Việc tiếp theo ở trên). Mọi thứ khác là phụ.

### Session 2026-07-15 (20) — Phase 0 automated gate pass, chờ Alpha feel
- **Merged cadence fix:** `SPAWN_BASE_MS` tiếp tục là nhịp mỗi khách; nhóm N người tiêu thụ N nhịp. Sim đếm arrival theo người và aggregate lost/rejected từ bucket thật, không hard-code 0.
- **Verify trên merged `master`:** build pass; 5 seed (mỗi seed ≥503 lượt) cho k=2.24–2.34, normal loss 0%, peak loss 26.1–40.8%; forensic seed 20260611 tái lập đúng.
- **Gate còn lại:** Alpha 3–5 người × ≥3 ca/người để chốt freshness, bàn nhóm, bottleneck cốc và peak feel. Không mở Phase 1 chỉ từ bot metrics.
- **Việc kế:** chạy Alpha protocol; nếu pass, chốt Phase 0 và mở `ui-art-v1` song song một engine slice Phase 1.

### Session 2026-06-23 (19) — Đồng bộ docs ↔ code: prototype Phase 0 đã chạy
- **Check tiến độ thực tế:** docs (roadmap/log đề 06-09) vẫn ghi *"Spec xong, chưa code / Code 0%"* nhưng `prototype/` đã có code thật (~2.100 dòng TS: `engine/{engine,types,constants,rng,metrics}` + `sim/headless.ts` + `ui/{App,GameView,components,pixiAssets,tokens,icons}`). `tsc --noEmit` **pass** (sim headless lỗi chạy trên sandbox Linux do esbuild build cho macOS — không phải lỗi code).
- **Map code→feature:** F04 vòng đời cốc + F05 freshness (tip×0 khi hết hơi, cờ vàng) **đủ**; F08 toggle normal/peak (P0 scope) đủ; F01 loop ca/spawn/serve (chưa thể lực/trần ngày), F02 menu 3/6 món, F03 3 bàn + serve-theo-Order + queue (chưa 4 cấp/mua-nâng cấp), F06 tip (chưa uy tín/phạt cụm), F07 3/6 loại khách (thường/vội/VIP) — đều ở **mức lõi Phase 0**.
- **Cập nhật `06-ROADMAP` → v2.5:** tổng tiến độ 15%→**22%**; cột Code F01–F08 ⬜→✅/🟡; bảng NOW + Phase 0 Summary chuyển Done/In-progress; thêm chú thích cột "Code" + changelog. Cập nhật snapshot log.
- **Việc kế (exit-gate Phase 0):** **chạy sim đo `k_value` thật ≥500 lượt** (cần `npm rebuild`/cài lại esbuild trên máy đích hoặc chạy trong môi trường khớp) → đối chiếu 2.0–3.0; rồi playtest feel. Sau đó mới mở Phase 1. (Lưu ý: bộ "autopilot" parallel-dev mới commit là tooling, entry `t-ok/t-bad` chỉ là fixture test.)

### Session 2026-06-11 (18) — Thêm lớp "nhóm/dịp" (biên chế) + khách một mình
- **User:** thêm hội bạn thân/chiến hữu, đồng nghiệp, đám cưới, khách 1 mình…
- **Mô hình hoá (domain-first):** phần lớn là **group composition** (N khách ghép theo skin sẵn), không phải face mới → thêm **`asset-list-designer.md §2.2.2 Nhóm/dịp`**: GA1 hội bạn/chiến hữu · GA2 đồng nghiệp tan ca · GA3 **liên hoan/tiệc mừng** (mô hình hoá "đám cưới" cho thực tế — bàn dài/VIP, nhiều đợt, đơn lớn) · GA4 khách một mình · GA5 cặp đôi · GA6 gia đình (tuỳ chọn). Mỗi nhóm ghi biên chế + hành vi (size/đợt/patience/tip) gắn `03-SPEC-he-ban.md` + demand-mix §7.
- **Asset mới THẬT SỰ cần (chỉ 2):** `customer-skin-solo` (C20, khách một mình, P2) → subtotal skin 19→**20 (~60 sprites)**; `prop-celebration` (#153, hoa/băng rôn generic, P3) → §7 9→**10 sprites**. Còn lại tái dùng skin.
- **Việc kế:** Phase 1 — wireframe HUD; gen skin/prop theo scope. (Biên chế nhóm thực thi ở hệ bàn, không phải việc asset.)

### Session 2026-06-11 (17) — Chốt roster khách: GIỮ tất cả + thêm sếp bao mâm
- **User chốt:** giữ **toàn bộ** nhóm khách (trụ cột + theo dịp/quan hệ + đặc thù), **gồm cả `pickleball` (C03) và `aunties` (C07)** — đảo lại đề xuất bỏ pickleball ở Session (16).
- **Sửa `asset-list-designer.md §2.2.1`:** (a) thêm **C19 `customer-skin-boss-host`** = sếp bao mâm/đại gia tiếp khách → `customer-vip` (P1) — skin VIP iconic nhất, trước đây thiếu; (b) cập nhật subtotal 18→**19 skin (~57 sprites)**, P1 6→7 skin; (c) thêm box **"Ngoại lệ chủ ý"**: pickleball + nữ giới uống bia được GIỮ (stylized hoài niệm, không strict-realism), không bị §0.3.C ràng "đồ vật 2000s".
- **Roster khách đầy đủ (gameplay type → skin):** thường(normal/công nhân) · vội(office/runner/cyclist) · VIP(**sếp bao mâm** ⭐/tourist/foodie) · Chí Phèo(3 kiểu say) · lai rai(bợm quen/hưu trí/chị em) · shipper · cổ vũ bóng đá(fan/ultra) + thể thao(runner/cầu lông/**pickleball**).
- **Việc kế:** Phase 1 — wireframe HUD theo token + era; gen skin theo scope P1/P2/P4.

### Session 2026-06-11 (16) — Áp "chuẩn thời đại 2000s" cho toàn bộ asset
- **Yêu cầu (user):** icon/asset/item của MỌI feature cũng phải mang vibe 2000s (không chỉ màu).
- **Cách làm (1 lớp dùng chung, không drift):** thêm **`asset-list-designer.md §0.3 Chuẩn thời đại 2000s`** — (A) cảm giác chung, (B) **bảng tra hình thái 2000s** (cốc vại thuỷ tinh dày · bom nhôm/vòi đồng · bàn inox tròn + ghế nhựa đỏ thấp · **TV bầu CRT** · **ĐT cục gạch phím bấm** · **xe Dream/Wave** · biển tôn sơn tay/neon ống · sổ giấy + bàn tính · vé số giấy · quạt cây/đèn tuýp/phích Rạng Đông/mẹt tre · trang phục sơ mi-ba lỗ-dép tổ ong · AI = loa phường), (C) **blocklist** đồ hiện đại (smartphone, màn phẳng, xe ga, LED dây, logo thật, POS, QR-thẻ bóng), (D) **`{era_modifier}` append vào mọi prompt**. Thêm dòng nhắc 🕰️ ở đầu §1.
- **Ngoại lệ:** icon meta thuần (payment/session/AI/leaderboard) ưu tiên rõ chức năng + palette/pixel của bộ; chỉ khoác vỏ hoài niệm khi được (QR = giấy dán).
- **⚠️ Phát hiện anachronism:** skin `customer-skin-pickleball` (C03) — pickleball phổ biến ở VN ~2020s, KHÔNG hợp 2000s. Đề xuất đổi sang đá cầu / bóng bàn / tennis bình dân. Chưa sửa, chờ user quyết.
- **Việc kế:** user quyết vụ pickleball; Phase 1 vẫn là wireframe HUD theo token + era này.

### Session 2026-06-11 (15) — Thống nhất design tokens (vibe bia hơi 2000s)
- **Vấn đề:** 3 nguồn token lệch nhau (05 §2.1 `#f6a623` · asset-list §0.1 `#f6a623` · F24 §1 `#f2a51a`; bọt/ghế/panel cũng khác) → vẽ asset & code sẽ không khớp.
- **Quyết định (user):** vibe **2000s bia hơi đời thật** — **nền mặc định nắng gắt**, tông từng ca đổi theo thời tiết (tan tầm/mưa phùn…) qua overlay; **panel nâu ấm hoài niệm** (đổi từ navy-tím lạnh).
- **Làm:** tạo **`docs/design-tokens.md` v1.0 = nguồn sự thật DUY NHẤT** — palette semantic (brand/surface/chức năng/trạng thái cốc), bộ overlay thời tiết §4 (sunny/hot/humid/rain/cold/**evening tan tầm**), typography, spacing, `tokens.ts`, palette AI-gen, bảng mapping cũ→mới. Hex chốt: `beerAmber #eaa31a`, `beerFoam #fff3d2`, `stoolRed #de4126`, `inox #c4cecb`, `streetBg #f1d585`, `panel #3a2a1c`, `danger #d23a2a`…
- **Trỏ về 1 nguồn:** sửa 05 §2.1, asset-list §0.1 (+ global prompt prefix), F24 §1 — bỏ định nghĩa hex cục bộ, trỏ `design-tokens.md`. **KHÔNG đụng** `design-component-catalog`/`uiux-analysis` (tư liệu màu game gốc trà đá) và `prototype/src/index.css` (placeholder P0, 04 §2).
- **Verify:** grep rộng — không còn hex cũ (`#f6a623/#f2a51a/#1e1e3f/#e94545/#df3f32/#fff4d6/#fff5d6/#7bd88f/#f6d98f`…) trong 3 file spec; cả 3 đều link `design-tokens.md`.
- **Việc kế:** Phase 1 — vẽ wireframe màn HUD chính theo token mới; chốt type scale chi tiết; (song song) tiếp tục đo k/feel ở prototype.

### Session 2026-06-11 (14) — Fix bug "tap bị nuốt" (phải bấm nút phục vụ vài lần)
- **Triệu chứng (user báo):** bấm nút PHỤC VỤ không ăn ngay, phải bấm vài lần mới được (áp cả nút VÒI/BỒN).
- **Nguyên nhân:** mỗi 100ms `render()` `removeChildren()+destroy()` rồi tạo lại MỌI container Pixi. Pixi tính `pointertap` = pointerdown+pointerup trên CÙNG object; nếu một frame dựng lại chen vào giữa down/up, object nhận down bị huỷ → tap không kích hoạt → cú bấm bị nuốt (ăn may mới trúng).
- **Sửa (`GameView.ts`):** chuyển từ handler gắn per-object sang **một handler cố định trên `stage`** (stage không bị huỷ giữa các frame) + hit-test theo toạ độ. Thêm `HitRegion[] hitRegions` (reset mỗi frame trong `render()`), helper `registerHit(x,y,w,h,onTap)`; 3 chỗ bàn/vòi/bồn đăng ký vùng thay cho `c.on('pointertap')`. Topmost = vùng đăng ký sau thắng.
- **Verify:** `tsc --noEmit` pass (exit 0). Không đụng engine/đo k.
- **Việc kế:** như cũ — chơi tay đo k thật + 4 feel (04 §6); tune demand-mix 🟡.

### Session 2026-06-11 (13) — Fix bug treo game khi chơi tay
- **Triệu chứng (user báo):** đang chơi `npm run dev` thì game đứng hình (đồng hồ, spawn, mọi thứ dừng), xảy ra sau khi phục vụ thu tiền.
- **Nguyên nhân:** floating text "+xu" giữ object Pixi `Text` qua nhiều frame. `GameView.render()` đầu mỗi frame `removeChildren()+destroy()` cả stage → huỷ luôn chữ bay frame trước; ngay sau đó `tickFloaters()` chạm vào object đã destroy (`f.text.y`/`.alpha`) → Pixi v8 ném lỗi → văng khỏi `loop()` trước khi gọi lại `requestAnimationFrame` → cả vòng game chết. Trigger ngay khi có +xu (lúc đó mới sinh chữ bay).
- **Sửa:** (a) `GameView.ts` — `FloatingText` đổi thành **data thuần** (`msg/color/x/baseY/startAt/duration`); thay `tickFloaters` bằng `drawFloaters` vẽ Text MỚI mỗi frame, không giữ object qua frame → hết use-after-destroy. (b) `App.tsx` — bọc `engine.tick`+`view.render` trong `try/catch` để lỗi lẻ chỉ log Console, không treo game.
- **Verify:** `tsc --noEmit` pass (exit 0). Phương pháp đo k (04 §5) không đụng tới; chỉ sửa lớp render + an toàn loop.
- **Việc kế:** không đổi — chơi tay nhiều ca đo k thật + 4 feel còn lại (04 §6); tune demand-mix 🟡 cho khớp economy-spec.

### Session 2026-06-11 (12) — Chốt stack + scaffold prototype Phase 0 ✅ (bắt đầu code)
- **Chốt stack (user quyết):** Vite + React + Pixi.js v8 — đúng đích GDD, không viết lại khi sang Phase 1. Code ở **`prototype/`**.
- Scaffold đủ theo `04-SPEC` §3/§4/§5: engine thuần TS (không phụ thuộc DOM — chạy cả UI lẫn headless), 3 bàn × 2 ghế, bia + lạc + nem, freshness 12s/cờ vàng 9s, 10 cốc + rửa 1×7s (nút nâng 3×2.5s), tip/patience, 2 rush, serve theo Order cấp bàn (03 §4/§10), log ServeEvent + bảng đo k in-game. Art placeholder thuần (04 §2). User bổ sung: design tokens `index.css`, auto rót/rửa toggle (default BẬT).
- **Verify:** `tsc` + `vite build` pass · headless sim `npm run sim` 506 lượt (seed 20260611) chạy đúng pipeline đo k · test riêng nhánh stale (giao >12s → payment giữ, tip ×0) pass.
- **Số đầu tiên (bot tối ưu, demand-mix 🟡 tự giả định P_MOI=0.6):** k = **1.63** — DƯỚI band 2.0–3.0 → demand-mix hiện tại chưa đủ giàu (134 xu/lượt vs giả định 207). Việc chỉnh: đối chiếu demand-mix với `economy-spec-from-bundle.md` §3, tăng P_MOI/nem/đợt gọi — chỉnh số 🟡 trong `prototype/src/engine/constants.ts`, KHÔNG chỉnh phương pháp đo.
- **Việc kế:** chơi tay nhiều ca (`npm run dev`) đo k thật + 4 feel còn lại (04 §6), ghi vào `RESEARCH-LOG-live-play.md`; tune demand-mix cho khớp economy-spec.

### Session 2026-06-11 (11) — Vá feature docs + thêm onboarding/payment
- User yêu cầu vá các điểm audit và thêm 3 feature: chọn ngôn ngữ `en/vi`, tài khoản/Google login để lưu tiến trình, và thanh toán để chơi hết session trong ngày (free 1 session/ngày).
- Vá docs hiện có: `F23` thêm `idempotencyKey` vào `serve-order` contract + endpoints auth/payment; `F14` thêm cột `e rent index` để tính rent; tracker F24 trỏ thêm production supplement; roadmap F21/F22 đổi thành có spec nhưng vẫn gated bởi legal/feasibility.
- Tạo **`docs/features/F25-localization-account.md`**: first-run locale `vi/en`, guest play, Google login, guest migration, leaderboard/payment prompts, i18n fallback.
- Tạo **`docs/features/F26-daily-session-pass-payments.md`**: free 1 session/ngày, paid Session Pass unlock normal daily cap, server-side entitlement/payment webhook, không bán xu/power/hạng trực tiếp.
- Cập nhật **GDD v1.5**, **roadmap v2.4**, tracker **v0.3.0**, `docs/features/README.md`; tổng feature hiện là **26**.
- Rebuild dashboard OK: **26 PRs, 5 phases**, code vẫn 0%.
- **Việc kế:** chốt stack + scaffold Phase 0; với production launch cần sớm chốt provider/thanh toán/giá Session Pass.

### Session 2026-06-11 (10) — Viết bộ feature specs còn thiếu
- User hỏi feature docs đã đủ chưa, rồi yêu cầu viết hết phần còn thiếu.
- Tạo folder **`docs/features/`** với index `README.md` và bộ spec triển khai cho các feature chưa có doc riêng: **F07-F24** (Customer Types, Rush full, Weather, Upgrades, Kitchen, League/Seasons, Life Path, Locations, Risk Events, Referral/Badges, Quest, Dog/Guard, World Cup Event, Donation, Lottery, AI Assistant, Server Architecture, Design/UI production supplement). Riêng F19 trỏ thêm `07-SPEC-shop-mua-giai-worldcup.md` đã có.
- Cập nhật `05-SPEC-design-uiux.md` để trỏ sang supplement `docs/features/F24-design-uiux-production.md`.
- Cập nhật `06-ROADMAP` v2.3 và `docs/implementation-tracker` v0.2.0: gắn đường dẫn spec mới, giữ toàn bộ status code là ⬜.
- **Việc kế:** chốt stack + scaffold Phase 0; specs sau Phase 0 đã sẵn, nhưng vẫn chờ playtest/phase gate trước khi code.

### Session 2026-06-11 (9) — Thêm item shop mùa World Cup (GDD §14)
- User yêu cầu thêm 2 item: **mua lịch thi đấu** + **mua theme đội tuyển** WC năm nay, pricing hợp lý.
- Chốt với user: thanh toán bằng **xu in-game**, theme **trang trí nhẹ** (cờ/đèn/biển re-hue) → currency-sink thuần, **không pay-to-win**.
- Xác minh WC2026: 11/6–19/7/2026, **48 đội** (Mỹ/Mexico/Canada đăng cai) → danh sách theme để **động/server-driven**, không hardcode.
- Sửa **GDD v1.4 §14**: "3 trụ"→"4 trụ"; lịch = booster bằng xu **~15k×k** (hiện lịch HUD + cổ vũ spawn ×1.15/mùa); **theme đội** = cosmetic mua xu **~8k×k/đội** sở hữu vĩnh viễn, combo 6 đội **~36k×k −25%**. Thêm bảng **§14.0 Shop mùa giải** (neo theo trần 500k/ngày: TV ¼ ngày, lịch 7,5%, theme 4%). Note IP: bảng màu+biệt danh nhại, tránh huy hiệu/logo. §16 thêm ghi chú cosmetic đến từ cả xu lẫn donation.
- Đồng bộ **06-ROADMAP v2.2**: F19 thêm shop mùa giải; Monetization thêm nguyên tắc cosmetic-mua-bằng-xu = sink.
- Tạo **`07-SPEC-shop-mua-giai-worldcup.md` v0.1** (sub-spec triển khai Phase 4): domain model item/ownership (TS), state machine item hạn-mùa + theme vĩnh viễn, flow mua server-authoritative + validate, bundle 6 đội −25%, theme re-hue layer (ranh giới cosmetic cứng), danh sách đội động.
- Grep-verify: ✅ không còn "3 trụ"; bảng §14.0 + 4 trụ nhất quán; changelog GDD/roadmap append đúng.
- **Việc kế:** không đổi — chốt stack + scaffold Phase 0 (item WC thuộc Phase 4, chỉ là spec).

### Session 2026-06-09 (8) — Port dashboard-engine từ MyMoneyWent
- Port **nguyên pipeline** `build_dashboard.py` + `scripts/dashboard/*` + `work_state/*` sang `tools/dashboard-engine/`.
- Tạo `docs/implementation-tracker.md` (24 feature F01–F24 theo schema PR-row của MMW, group Phase 0–4, toàn ⬜ pre-code) làm input.
- Adapt: path (ROADMAP→`06`, TRACKED_DOCS→GDD+SPEC, PHASE_DATES Phase 0–4), branding MMW→Trùm Bia Hơi, shim `datetime.UTC`→`timezone.utc` (sandbox py3.10).
- **Build OK:** sinh `docs/dashboard.{html,md,json}` (24 PRs, 5 phases, MVP 0% — đúng vì chưa code). HTML self-contained + auto-refresh 60s.
- **Tầng realtime (git-reconcile/CI/serve/SHA-poll) no-op** tới khi có git repo → việc Phase 1. Features tab trống (roadmap heading khác format) — gap ghi trong `tools/dashboard-engine/README.md`.
- **Việc kế:** không đổi — chốt stack + scaffold Phase 0.

### Session 2026-06-09 (7) — Audit roadmap v2.0
- Review `06-ROADMAP-trum-bia-hoi.md`: cấu trúc tổng thể ổn (Now/Next/Later, 24 feature module, KPI, dependency map, playtest plan, rủi ro).
- Sửa nhỏ thành **v2.1**: MAP v0.8→v0.9; làm rõ Phase 0 chỉ code + design khung/placeholder; F08 rush chia đúng P0/P1/P2; F23/R3 server chia "server tối thiểu" vs "server-authoritative đầy đủ"; bỏ link `file://` trong spec ref.
- **Việc kế:** chốt stack Phase 0 → scaffold prototype.

### Session 2026-06-09 (6) — Review roadmap v2.0 (user tự update)
- User viết lại roadmap thành **v2.0** (feature table 24 mục, KPI/phase, timeline, mermaid, playtest plan, monetization). Mình audit số liệu: **khớp GDD** hết (rush 90s/150s, 2 mùa, LP0–LP7, 7 nhánh quest, 9 mặt bằng, trần 500k...).
- **Quyết định nền:** dự án **có team** (xác nhận) → bỏ giả định solo; 4 track song song hợp lệ. Đã cập nhật memory.
- Thêm 2 ghi chú vào `06`: (1) cột "Spec ✅" = đã thiết kế trong GDD ≠ sẵn sàng code (chỉ F01–F06/F08/F03/F24 có spec triển khai); (2) KPI là benchmark provisional, chưa neo GDD.
- **Việc kế:** không đổi — chốt stack + scaffold Phase 0 (NOW).

### Session 2026-06-09 (5) — Tạo roadmap
- Tạo `06-ROADMAP-trum-bia-hoi.md` v0.1 — dùng template chuẩn **Now/Next/Later** (skill PM roadmap; không có folder pj khác để lấy template trực tiếp), ánh xạ Phase 0–4 từ GDD §19.
- Thêm cho mỗi phase: outcome, exit gate, phụ thuộc; design track gắn vào Phase 1; bảng rủi ro xuyên suốt; lưu ý solo dev → phase tuần tự.
- **Việc kế:** vẫn là chốt stack + scaffold Phase 0 (NOW).

### Session 2026-06-09 (4) — Mảng design/UIUX
- (a) Thêm note vào `04-SPEC` v0.2: Phase 0 dùng **placeholder art**, không design/icon thật (tránh làm lệch đo feel).
- (b) Tạo `05-SPEC-design-uiux.md` v0.1 — **khung** design: tokens (màu/font/spacing từ GDD §17), layout HUD + component/state (từ `uiux-analysis`), **asset/icon list đếm được** (sprite bàn/thiết bị/khách/cốc + icon HUD + món + cosmetic). Phân nhãn ✅ đã chốt / 🔧 cần làm / 📐 cần wireframe. **Sản xuất bắt đầu ở Phase 1**, không phải bây giờ.
- **Việc kế:** vẫn ưu tiên chốt stack + scaffold Phase 0 (design chờ Phase 1).

### Session 2026-06-09 (3) — Audit docs sau spec Phase 0
- Rà lại toàn bộ docs sau khi có `04-SPEC-prototype-phase0.md`; phát hiện các bản tóm tắt Phase 0 cũ vẫn ghi **2–3 bàn / 1 mức rush** trong khi spec mới chốt **3 bàn / 2 mức rush**.
- Đồng bộ `SESSION-TRACK-LOG`, `02-GDD-trum-bia-hoi.md`, `01-MAP-tra-da-to-bia-hoi.md`, `03-SPEC-he-ban.md`; cập nhật export `economy-spec-from-bundle.html` từ markdown nguồn để chứa đính chính buy-cap/storage-cap.
- **Việc kế:** duyệt spec Phase 0 → chốt stack thực thi (Pixi+React vs canvas thuần) → scaffold loop + log.

### Session 2026-06-09 (2) — Viết spec Phase 0
- Chốt hướng: **viết spec prototype trước khi code**. Tạo `04-SPEC-prototype-phase0.md` v0.1.
- Nội dung: mục tiêu (5 câu hỏi), phạm vi in/out (3 bàn, bia+2 mồi tức thì, 2 rush, client-only), state model tối thiểu, số khởi điểm bám GDD v1.3 + economy-spec, **phương pháp đo k bất biến** (`k = DT_bia_mỗi_lượt / 82.5`), tiêu chí pass/fail gate sang Phase 1.
- **Việc kế:** duyệt spec → chốt stack thực thi (Pixi+React vs canvas thuần) → scaffold loop + log.

### Session 2026-06-09 (1) — Đồng bộ docs theo GDD v1.3
- **Audit toàn bộ docs**: phát hiện 2 chỗ lệch sau đợt nâng GDD v1.3 + refresh `economy-spec`/`uiux` (08-06).
- Sửa `SESSION-TRACK-LOG`: snapshot 06-04→06-09; GDD v1.2→**v1.3**; MAP v0.7→**v0.8** (cả phần Trạng thái + bảng tài liệu chính).
- Sửa `design-component-catalog` dòng "ly (cup, max 12)" → **mua tối đa 10 + kho 20** (đính chính theo GDD v1.3 §4; số "12" cũ = 10 mua + 2 cốc Chủ tịch tặng).
- Đã grep-verify: không còn ref "v1.2"/"v0.7"/"max 12" sai sót ngoài 2 dòng changelog lịch sử (giữ nguyên, append-only).
- **Việc kế:** vẫn là khởi động prototype Phase 0 (chốt stack + scaffold 1 màn 2–3 bàn).

### Session 2026-06-04 — Reset track log
- Đóng log cũ (đã quá dài), mở log mới này.
- Re-orient: rà toàn bộ tài liệu, xác nhận GDD v1.2 là nguồn chính, dự án đang ở ngưỡng Phase 0.
- **Việc kế:** khởi động prototype Phase 0 (chốt stack cụ thể + scaffold 1 màn 2–3 bàn).

<!-- THÊM SESSION MỚI Ở TRÊN block này, đầu danh sách. Format:
### Session YYYY-MM-DD — <tiêu đề ngắn>
- Làm gì / quyết định gì
- Việc kế
-->


## Current delivery target — owner Steer12, 2026-09-11

**playable-v0 supersedes full M1–M5 milestone closure as the delivery goal.** Finish the in-flight emergency hotfix only within about one hour; then explicit non-production dev identity, three-viewport full-shift happy path, blocker fixes, green verify, tag playable-v0 and pinned local5174/5175. Do not chase admin/forecast/ranking polish, extra diff viewers or additional closure evidence.

Acceptance: language→guest→12-minute shift (serve, pour/wash, restock, upgrades, close/summary)→next day; reload and new tab preserve progress; no blocking bugs/console errors; mobile first playable<5s and≥30fps. Midshift dev sign-in preserves the guest shift. Existing dishes/kitchen/customers/weather/rush/unlocks/seasons/quests/account surfaces must not crash; hide unfinished/deferred surfaces. M6/M7/M8 remain deferred, free without monetization, inspection/lottery OFF, no engine/economy changes.

Assets: owner waiver 2026-09-11: draft assets accepted for release. Current placeholders are also accepted by Steer12 when the happy-path fallback is visible; generate only missing/broken gameplay visuals and drop the ~530 target for this build. No polish rerolls. Human-only tests remain waived. Preview-2026-09-11 is an interim snapshot, not a claim of completed playable-v0.

| 2026-09-11 Steer12 | Goal narrowed to playable-v0 and three-viewport end-to-end playability; historical milestone FAIL/PASS entries remain evidence, not additional release blockers. |

| 2026-09-11 emergency complete | Registry hotfix: Super+MFA A/B, exact scheduled supersession/preview, atomic24h ticket and immutable retries.403unit/server,28adminbrowser,config/build PASS; independent full-diff CLEAN. No engine/economy changes. Next preview snapshot then dev identity/playable-v0 per Steer12; no further admin polish. |
