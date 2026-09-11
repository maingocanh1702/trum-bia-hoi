# Milestone closure report — M0–M5

> Current owner target (Steer17, 2026-09-11): **local release playable-v0.2** for owner testing. Kept criteria: equipment UI, shift/screens, timeout, measured upgrade hint, i18n/axe. Production/internet, OAuth/minute5, referral/gifts, admin/registry polish and large season snapshots are PENDING. WAIVED rows stay waived; M6/M7/M8 remain deferred. Preview stays on v0.1 until the release gates pass; then fast-forward master through a clean temporary worktree, without pushing or touching the main checkout WIP.

2026-09-10 · implementation `628eb72` · config2.0.2/rules24/schema10.
Authority: [ROADMAP §mốc M0–M9](../06-ROADMAP-trum-bia-hoi.md), including the
acceptance sections it references. PASS means the whole stated criterion has
supporting evidence; FAIL includes missing implementation or missing acceptance
proof. A passing engine sub-rule is identified explicitly and does not certify a
missing browser/server flow. Completion here means milestone acceptance in this
isolated worktree, not merge/deployment or completion of every feature spanning it.

Direct owner decisions override older no-pause/text-loss wording: management menus
pause until closed, stock purchase keeps the menu open, in-shift upgrades work,
whole-table service remains live, customer loss uses numeric coin/reputation toast.
IndexedDB replaces career localStorage under the documented storage deviation;
append-only history, legacy migration and backup preservation remain required.
Owner10/09 Steer #5 at15:30 supersedes the earlier fresh-visit interpretation:
guest progress persists on this device across tabs/browser reopen; Google adds
durable player history/achievements/ranking/cross-device restore. E20 verifies this.
Existing local archives and internal server audit remain preserved.

## Evidence reused and verified

- **E1** `.qa/checkpoint-config-final.txt`: check:config PASS, no literal warnings;
  `.qa/checkpoint-verify.txt`: build/typecheck,281engine/server tests,10ordinary
  k cohorts (5seeds × cold/full menus,≥1000serves each),15rush cases PASS.
  k2.4186–2.8738; formula is actual payment+tip per served customer/82.5.
- **E2** `.qa/browser-save-e2e-device-awake.txt`:91/91browser tests PASS at917f862.
  Those legacy checks were rerun successfully after the web cutover (E7);
  E3 remains the separate prior large-archive result. No host-sleep rerun performed.
- **E3** `.qa/browser-save-month.json`, `.qa/browser-save-verification.json`:
  exact80MB write/reopen/continuation and App boot; earlier quota/sleep failures
  retained in historical receipts, resolved by the cited final acceptance.
- **E4** `.qa/career-verification.json`, [career report](career-simulation.md):
  two30day command-driven careers/480shifts reachLP4, full-month replay exact.
  Advanced k3.483282/3.318249 PASS under owner10/09 soft cap3.5 for this profile. Standard cold/full-menu band remains2–3; no numbers retuned. Automated gate: `npm run sim:career:gate`,≥2seeds/30days/LP4 (04§5).
- **E13** `.qa/advanced-k-verification.json`, `.qa/advanced-career-k-gate.json`:
  fresh30-day seeds42/99 reachLP4,29,209/28,259serves, k3.483282/3.318249≤3.5.
  Config2.0.1/rules24;345tests/config zero warnings/build,10standard/15rush PASS.
  `.qa/review-advanced-k.txt`: no actionable introduced defects at13367c1.
  Gate is included in `npm run verify`; no runtime/economy JSON change.
- **E5** `.qa/google-session-verification.json`, `.qa/local-import-verification.json`:
  reviewed server account/session and internal one-time import. Local provenance
  remains pending approval. No real Google Client ID, public upload or cloud UI.
- **E7** web cutover `60f9090`, visible-yard correction `101594c`, local recovery
  correction `936e9d5`: `.qa/m4-web-tests.txt`298engine/server;
  `.qa/m4-web-local-e2e.txt`91legacy browser; `.qa/m4-web-recovery-e2e.txt`10remote
  browser scenarios; `.qa/m4-web-recovery-config.txt` config (zero warnings) and
  `.qa/m4-web-recovery-build.txt` build/typecheck PASS. Current10ordinary kcohorts
  (2.4186–2.8738) and15rush PASS in `.qa/m4-web-sim.txt`/`.qa/m4-web-rush.txt`.
  Full-base review found one P1 local-recovery regression; `936e9d5` reuses existing
  forensic recovery and tests both corrupt structures. Independent correction review: CLEAN in `.qa/review-m4-web-recovery.txt`;
  the prior finding and original verdict remain preserved in `.qa/review-m4-web-final.txt`.
- **E8** default registry foundation `65f9242`, final correction `c1e953c`:
  `.qa/registry-correction-tests-final.txt`310engine/server (12registry cases),
  `.qa/registry-correction-config-final.txt`zero warnings and
  `.qa/registry-correction-build-final.txt`build/typecheck PASS.
  `.qa/registry-remote-e2e.txt`10remote browser PASS at foundation; correction only
  changes internal registry validation/limit attribution, covered by final310tests.
  `.qa/registry-sim.txt`10ordinary cohorts k2.4186–2.8738 and
  `.qa/registry-rush.txt`15rush PASS; engine/config values unchanged by correction.
  `.qa/review-registry.txt` records foundation P2 author-limit bypass, corrected
  with catalog identity protection. `.qa/review-registry-correction.txt`: CLEAN.
  Actual opening/replay/scheduling and authenticated player HTTP checks pass;
  trusted admin actor tests do not prove real SSO/MFA or editor integration.
- **E9** admin authentication/registry API `6f42575`:
  `.qa/admin-auth-tests-final.txt`320engine/server (10admin cases with signed Google
  SDK verification, RFC vectors, independent MFA, roles/expiry/replay/lockout,
  real publication and schema8migration). `.qa/admin-auth-config.txt`zero warnings;
  `.qa/admin-auth-build.txt`build/typecheck PASS. `.qa/admin-auth-remote-e2e.txt`
  10real browser/player API PASS. Engine/config unchanged; E8 k/rush evidence reused.
  `.qa/review-admin-auth.txt`: CLEAN, independent typecheck PASS. Reviewer socket
  checks hit sandbox EPERM; host full320/HTTP checks PASS. Authenticated transport
  now exists; live Google ClientID and browser GIS/MFA/editor acceptance do not.
- **E6** `.qa/checkpoint-month.json`: exact server projection/388986events/original
  archive/retry, cold2.23s. This is integrity evidence, not a release latency pass.

Test paths below are relative to `packages/engine/test`, `apps/web/test` or
`apps/server/test` as labelled. Their quoted names identify runnable assertions.
No new gameplay test or80MB run was added solely to make this report green.

- **E10** admin browser editor `3d5513e`, receipt correction `f86fc69`, final buffer
  correction `56a0a44`: `.qa/admin-editor-tests.txt`321engine/server (11admin auth cases);
  `.qa/admin-editor-buffer-browser.txt`11admin browser scenarios;
  `.qa/admin-editor-remote.txt`10remote-game browser scenarios. Final config/build
  `.qa/admin-editor-buffer-config.txt`/`-build.txt`PASS, zero literal warnings.
  Browser uses signed test tokens through the real Google SDK, independent TOTP and
  SQLite; popup rendering is replaced only in tests. Actual edit/diff/proposal/approval/
  publication, old/new player pins, scheduled timestamp, audit and recovery paths pass.
  Original full-base review found no actionable defects; two self-review regressions
  failed before correction. Correction review found P2 identical-JSON buffer drift;
  fixed at snapshot replacement with regression. `.qa/review-admin-editor-buffer.txt`:
  CLEAN, independent typecheck/diff-check PASS; config execution blocked by reviewer
  sandbox tsx IPC EPERM (host config PASS). Engine/config unchanged; E8 k/rush retained.
  Real Google ClientID/directory/consent still absent. This closes the default one-key
  admin exit criterion, not full BRD scopes/forecasts/emergency or all M4 acceptance.

- **E14** protected seven-day forecast `a99a567`, mobile table `9900505`:
  `.qa/forecast-report-verification.json`:350engine/server,19admin browser and final
  mobile report case; config/build PASS. Real worker/HTTP verifies source immutability,
  exact audience/expiry timeline, conservation, cancellation, publication409 and
  logout401. Initial review P2 stale report fixed; final full-diff correction and
  layout reviews have no actionable findings. Engine/config unchanged; E13 retained.
  VI/EN presents explicit continuously active current-population assumptions;
  VND estimates remain unavailable without observed donation data. No full M4 claim.

- **E15** first-run language entry `5871453`:
  `.qa/locale-entry-verification.json`:350engine/server,3final presentation,
  91local/21remote/19admin browser, config/build PASS. Fresh vi/en/fr browser defaults,
  immediate choice persistence, explicit acceptance before any player creation,
  old welcomed preferences, failed writes/retry and unchanged live-shift identity
  are covered. Native dynamic page import removes the redundant Suspense reveal
  timer; paused-clock attendance/recovery tests pass without relaxing game clocks.
  Independent review found no introduced actionable defect and passed3presentation
  tests. Engine/runtime/sim/config unchanged; E13 k/rush evidence retained.

- **E16** same-player Google-link transport `3c369aa`:
  `.qa/google-link-verification.json`:351engine/server and33remote browser tests,
  config/build/typecheck PASS. Twelve browser cases plus held real-SDK verification
  cover outbox/shift retention, response loss, nonce fencing, current menu pause,
  failed/cancelled attempts and conflicting/mismatched accounts. Final independent
  full-base review has no actionable findings after both reconciliation fixes.
  No Google panel/save-choice UI or complete account criterion is claimed. M4 stays
  12/18 OPEN; server auth runtime/engine/economy unchanged and E13 retained.

- **E17** Google account panel `e5745af`:
  `.qa/account-panel-verification.json`:351engine/server,92local/44remote/19admin
  browser, final local1/1,config/build PASS. VI/EN native modal links the same live
  player without reload; exactly three benefits, pause through verification/close,
  SDK/config failures, nonce retries, stale callbacks and conflict preservation pass.
  Duplicate callback after failure reproduced a third POST; permanent per-attempt
  consumption fixes it. Final full-base native review reports no findings.
  Signed HTTP/SDK fixtures and inspected portrait/desktop views are not live Google
  consent. Explicit save choice, invitations/cooldown and public import remain open.
  No engine/economy change; E13 retained. M4 remains12/18 OPEN.

- **E18** two play modes `8c9dc64`:
  `.qa/account-modes-verification.json`:353unit baseline; final34server/import and
  22account browser PASS, remote62 +bootstrap3 PASS; config/build/typecheck PASS.
  Local87+isolated5=92 and admin18+isolated1=19 cover all cases across multiple runs;
  initial timeouts/stale selector and corrections remain recorded, not hidden.
  Both entry languages, no durable guest reopen, copied/opener tabs, lost response
  headers/body, current-visit exact claim and existing-account restore are covered.
  Final independent full-base review CLEAN after five findings were corrected.
  Internal audit prevents historical Google credentials being treated as guests
  after an import. No live Client ID/consent, public local upload or ranking proof.
  Engine/economy untouched; E13 reused. Current-visit guest claim criterion PASS;
  M4 now13/18 OPEN, F25 remains in progress for the explicit gaps below.

- **E19** Google reauthentication `ddc77a9`:
  `.qa/reauth-verification.json`:354engine/server, final35API/import,72remote browser
  (10new recovery cases),1local archive regression, config zero warnings/build PASS.
  Existing native lock/outbox are retained; wrong registered/unregistered signed
  subjects cannot authenticate the retained player. Expired/revoked/missing cookies,
  lost service before/after commit, whole-cookie auth response loss/retry, canonical
  reload and stale callback/cancellation pass. Review P2 redundant consent was reproduced and fixed; final full-base review PASS.
  Signed Google SDK/HTTP fixtures are not live consent. No engine/config changes;
  E13 retained. Recovery gap closes; whole M4 count stays13/18 OPEN.

## Closure decision

| Milestone | Exit verdict | Closure | Remaining acceptance |
|---|---|---|---|
| M0 | PASS (3/3) | COMPLETE | All three explicit exit criteria met; E10 config/build/tests and unchanged E8 sim pass. Foundation/checkpoint reviews also passed. |
| M1 | COMPLETE (11/12 PASS;1 WAIVED) | COMPLETE | All code/automated criteria pass; human first30seconds remains WAIVED by owner2026-09-10, post-release. Local v0.2 packaging still has its own fresh verify/smoke gates. |
| M2 | FAIL (4/9 PASS) | OPEN | Five-person test, real mid-shift Google browser flow and admin-editable onboarding; login-prompt gaps below. |
| M3 | FAIL (6/12 PASS) | OPEN | Advanced k criterion PASS under owner soft cap3.5; feel,32px badge acceptance and remaining equipment/football placeholders still pending. |
| M4 | FAIL (15/18 PASS) | OPEN — next implementation priority | E7 remote authority/reconnect, E8 registry and E9/E10 admin browser workflow verified. E11/E12 scoped core/editor/factual impact verified; E14 forecast, E15 locale and E18 current-visit Google attachment/restore verified; E25 public rank eligibility verified; observed VND/emergency, live consent and deferred public import remain; E19 reauthentication and E21 invitations/validation verified. |
| M5 | FAIL (12/25 PASS) | OPEN | Live public ranking verified in E25; snapshots/shrine, rewards/referral/gifts and full integration remain; local LP acceptance rules pass. |

## E20 — guest device persistence, owner Steer #5 (2026-09-10 15:30)

Correction base `90d1a50`, implementation `e34fd56`, dashboard `056cf7c`.
Owner decision supersedes the 08:18 interpretation and E18 fresh-visit reset.
Guest keeps stall, coins, upgrades and current day/shift across new tabs and real
Chromium profile close/relaunch. Same writer lock and exact-session guard remain;
bootstrap failures and credential mismatches preserve the journal, and pending
upgrades apply once before/after server acknowledgement. Google attach/restore
and reauthentication remain covered. VI/EN copy separates device progress from
account-only history/achievements/ranking/cross-device restore. No lost-progress
upsell on exit; existing archive-write protection remains.

Current tests: **357/357 unit/server, 84/84 remote browser, 4/4 related local,
19/19 admin, config (zero warnings), build/typecheck PASS**. Portrait VI/EN entry
and invitation screenshots inspected. The first five failed browser assertions
captured heartbeat counters before pagehide; corrected tests capture the exact
journal at document entry before bootstrap and assert no subsequent mutation.
Full remote regression then passed without timeout changes.

Native scoped review90d1a50...056cf7c: **no introduced defects**; independent
typecheck PASS. Reviewer test rerun hit sandbox tsx socket EPERM; host verification
above passed. Receipt `.qa/guest-device-verification.json` pins the code and results. The earlier full invitation review found a P1 in base config
proposal validation; [separate follow-up](invitation-config-review.md) remains OPEN.
The invitation/cooldown code is implemented, but that prior slice is not certified
by the guest correction. M4 stays **13/18 OPEN**. No engine/server/config file
changed from90d1a50; earlier config2.0.2 work and simulations are separate evidence.

## E21 — invitation threshold admission

Code `03dae56` (base `25cc21c`): reject threshold-group deletion at proposal and
preview/publication admission. Approved pre-fix drafts are fenced; already-published
scopes remain readable and can be corrected without changing live pins. Four new
regressions failed before their respective fixes. Final **361/361 engine/server,
19/19 admin browser,33 focused, config zero warnings and build/typecheck PASS**.
Initial independent review P1 about historical composition was corrected; final
review confirms compatibility and independently passes all5 targeted cases.
Receipt `.qa/threshold-admission-verification.json`. No economy JSON or engine
change, merge/push/deploy, live Google consent or full-game completion claim.

With E20 invitation/browser evidence, the M4 guest-benefits/cooldown criterion is
now PASS. M4 is **14/18 OPEN**; public archive transport remains deferred to M9.

## M0 — foundation

| Criterion (ROADMAP) | Verdict | Evidence |
|---|---|---|
| check:config green in new workspaces | PASS | E9 current config check;40sections,39governed tiers, runtime seed/schema matched. |
| Five-seed sim k in2.0–3.0 | PASS | E8 current10cohorts/5seeds, range2.4186–2.8738,≥1000serves/cohort. |
| Build and tests green | PASS | E9 current Vite production build/typecheck and320tests, no prototype code used. |

## M1 — serving loop

| Criterion (ROADMAP and09§11 P1) | Verdict | Evidence or exact gap |
|---|---|---|
| Complete12-minute shift on390×844,360×740,1280×720 (M1-SHIFT) | PASS | E28: production-config/HTTP/store `playable-test/shift.spec.ts`, three real12-minute shifts; earned upgrade/restock/washing, summary, next-day, reload and new-tab persistence. |
| Seven screens §3–§4.5 on all3viewports (M1-SCREENS) | PASS | `remote.spec.ts` M1-SCREENS: yard, live order, stock, upgrades, shift book, close confirmation, rest;3/3 tests and21screenshots,0console/page errors, all images loaded and panels within viewport. |
| Whole-table contextual service per03§9.5 | PASS | Web “tapped order stays live, returns keyboard focus, and closes on customer expiry”; one Phục vụ cả mâm action in “guest serves…”. |
| Four visually distinct serve outcomes | PASS | Web “multi-dish service shows the actual early/late/grace/stale reward and guest reaction”; separate emoji, actual amounts, reduced-motion and reload checks. |
| Management sheets pause (owner override) | PASS | Web `pause.spec.ts` all3tests; stock purchase retains sheet/pause, visibility cannot resume it, equipment switch/reload preserve wait. |
| Upgrade suggestion reflects measured bottleneck (M1-UPGRADE) | PASS | Shift-book/upgrade recommendation uses current-shift stale serves or queue-overflow customer count;9tests cover VI/EN, exact counts, reload, fresh/next shift, max level and missing legacy provenance. |
| i18n keys100%, no hardcoded product copy (M1-I18N) | PASS | `check:i18n`:12player/native-form sources,804paired keys and matching placeholders; no JSX/native-form copy literals or missing static keys. VI/EN17screen browser coverage has no unresolved tokens or missing-copy warnings. |
| Screenshot baseline | PASS | E3 mobile screenshot plus recorded yard/equipment references in `.qa`; current browser acceptance receipt preserves artifact hashes. No automated visual-diff suite implied. |
| axe pass (M1-AXE) | PASS | `npm run test:a11y`:17screens ×2locales ×3viewports,6/6tests,102scans,0violations for WCAG2A/AA/2.1AA/2.2AA; no rule or selector exclusions. |
| First30seconds playable without reading instructions | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: Scripted first serve at11.1seconds passes E2; no uncoached human playtest evidence. |
| k remains in band | PASS | E1 standard cold/full-menu profiles. Advanced career separately PASS under owner soft cap3.5 at M3 (04§5). |
| Reload/new tab/browser reopen retain device progress (owner10/09 15:30) | PASS | E20 real Chromium profile relaunch, new tab, reload and pending-command receipt checks retain the same guest/coins/upgrades/day/shift. E18 fresh-visit reset is superseded. Credential loss remains fail-closed with journal retained; archive replay evidence remains separate. |

## M2 — onboarding/guest

| Criterion (ROADMAP and F27§6) | Verdict | Evidence or exact gap |
| Five new users:≥4/5 first serve≤30s and≥4/5 complete first shift | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: No five-person uncoached study; browser automation is not human evidence. |
| Guest completes first shift without registration; progress persists on this device (owner10/09 15:30) | PASS | E2 full guest shift; E20 retains progress on real browser restart/new tab, enforces the opener lock and recovers dropped responses once. Account-only durable player history/achievements/ranking/cross-device restore stay separate. |
| Fixed-seed first guest within config deadline, one bia, no rush/risk | PASS | Engine `game.test.ts` “first guest gets one customer and one beer, with auto pour…”; onboarding config and E2 first serve. |
| First timeout produces customer_left+feedback≤1s and shift continues (M1-TIMEOUT) | PASS | Remote browser deadline-to-painted loss toast40/46/71ms at390×844/360×740/1280×720; exact server penalty/reputation, no narrative text, shift continues. |
| Three consecutive losses rerun guide once; serve resets counter | PASS | Engine `presentation.test.ts` “event-driven guide resets…” and “three-customer queue loss…”. |
| First guide runs, skip continues, reload does not rerun | PASS | E2 “muting, guide skipping and reduced-motion preference survive normal play” + persisted settings/guide tests. |
| Google sign-in at minute5 keeps live shift and credits once | FAIL | E5 server transaction and E17 signed-fixture mid-shift browser panel pass; literal minute5 acceptance and live configured Google consent remain unverified. |
| onboarding.enabled=false behaves as returning player, k unchanged | FAIL | E1 controlled rush probe disables onboarding; ordinary sim keeps configured onboarding. No paired on/off k acceptance; formula itself is unchanged. |
| All thresholds/steps editable in admin without deploy; config green; VI/EN; reduced motion | FAIL | JSON governs thresholds, E1 config and E2 VI/EN/motion pass; E10 default editor exists, but onboarding-specific key publication/step acceptance has not been exercised; this combined criterion remains open. |

## M3 — full demand mix

| Criterion (ROADMAP,04§5–§6,09§11 P2) | Verdict | Evidence or exact gap |
| Correct k calculation and ordinary band | PASS | E1 actual per-customer payment+tip/82.5, no throughput term. |
| Full progressed economy stays in band | PASS | E4/E13:30days/LP4 per seed42/99, k3.483282/3.318249≤3.5 under owner10/09 rule04§5; automated career gate. No numbers retuned; re-evaluate after Alpha with real player data. Endgame inflation uses7-day faucet/sink report, not k. |
| 04§6: player controls pouring rhythm; stale warning rarely feels unfair | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: Engine freshness deadlines/penalties and web stale reaction PASS; no human observation showing controlled pacing or absence of unfair-feeling penalties. |
| 04§6: group/table serving is clear, not confusing | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: Web whole-table action and multi-dish outcomes PASS; no uncoached group-order clarity study. |
| 04§6: glass/washing bottleneck is perceptible and washer upgrade feels better immediately | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: Engine production/batch and web live-capacity/upgrade tests PASS; no player comparison before/after washer upgrade. |
| 04§6: peak rush feels intense but manageable | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: E1 pressure/floor/serve-ceiling checks and per-window loss/stale reports PASS; no human rush-handling observation.04§6 gives no numeric loss threshold to invent. |
| Kitchen panel and separate beer/hot-food bubbles | PASS | E2 `kitchen.spec.ts` “live kitchen shows real timers…” and multi-dish service; actual job deadlines and whole-table links. |
| Special customer badges distinguishable at32px | WAIVED | WAIVED by owner 2026-09-10 — post-release playtest. Automated evidence retained: Urgent identity is tested at normal yard scale; no complete32px recognizability acceptance, football customer still placeholder. |
| Rush-type telegraph | PASS | E2 “rush warning pauses in sheets, resumes on closing, active timer wins…” at3viewports; engine rush-clock/schedule tests. |
| Quest panel | PASS | E2 `quests.spec.ts` and `attendance.spec.ts`: real progress/claim/rollover and pause. Full social quest branches remain M5. |
| Signboard sheet | PASS | E2 “business sign installation, ownership, reputation gate and live yard…” at mobile widths. |
| Equipment/customer/menu asset batch replaces placeholders | FAIL | Current manifest has16placeholders and108drafts (including4archived Blender studies)/8approved after keg Lv2–5 exports. Owner allows listed placeholders where generation fails; remaining family production work is tracked for M9, not represented as finished art. |

## M4 — server/accounts/admin

| Criterion (ROADMAP, F23§8, F25§10) | Verdict | Evidence or exact gap |
| Editing local state cannot earn authoritative coins | PASS | Server HTTP rejects identity/clock/total forgery; default remote web never constructs or advances Game. E7 account rotation/quota/queue tests prove only server receipts change balances; local archives stay separate. |
| Duplicate serve request idempotent | PASS | Server HTTP guest/restart test, `client-sequence.test.ts` “response loss after serving…”; E1 and E6 cold-retry exactness. |
| Leaderboard ignores flagged/ineligible writes | PASS | E25 real imported careers + public HTTP/browser prove Google/shift/review eligibility, immediate admin flag/unflag invalidation, no client total submission and exact-session isolation. |
| Server clock handles VN midnight | PASS | Server “management pause survives a server restart and real VN midnight…” and “season rollover and old service retries…”; E1. |
| Reconnecting within2s with yard visible | PASS | E7 silent hung-transport test exercises the configured2000ms deadline (browser assertion tolerance250ms); returning-player regression keeps the yard accessible while heartbeat is unavailable. |
| Offline commands buffer key+clientSeq within reconnectGraceMs, no loss/duplicate | PASS | E7 real server lost-service ACK/reload test retains exact key+seq and credits once; offline restock/in-shift upgrade replay current menu flags; configured queue cap and quota refusal tested. |
| Reconnect resync from lastSeq; server wins | PASS | E7 real server state/report equality after response loss/reload and paged owner-bound events; stale account cannot replay retained commands into another player. |
| Beyond grace: server normally closes and returns ShiftClosed; no client-only ticking | PASS | Backend9f38166 exact expiry/restart/normal closing plus E7 browser grace-close/ShiftClosed book; offline yard stays frozen and returning inactive projection no longer hides it. |
| Local-first history replays at import; no client-only rules after cutover | FAIL | Shared engine and E5 full import replay PASS; online browser authority now PASS in E7; public local archive migration remains deferred by owner, so full import acceptance stays open. |
| Google mid-shift without reload/lost tick; attach history once | FAIL | E5/E18 new-account live-shift attachment and existing-account restore PASS with signed fixtures; literal minute5 acceptance, historical public local upload and live configured consent remain absent. |
| Unrestricted guest core; exactly3login benefits and cooldown | PASS | E2/E20 guest core and84remote browser checks cover skippable book/season-entry invitations, exactly3benefits and shared configured cooldown across tabs. E21 resolves the separate config admission P1 with361unit/19admin/config/build and independent review. Actual community board/shrine remains separate M5 work. |
| First session without login | PASS | E2 first-run guest scenarios. |
| Locale chosen/accepted before first game screen | PASS | E15 first-run vi/en choice, browser default and stored acceptance before local/remote boot; no player/save mutation before accepting. Legacy choices and live-shift identity are preserved across reload. |
| Locale switch preserves save | PASS | E2 “guest serves, reloads…switches locale” at4viewports. |
| Current guest progress attaches exactly once to a new Google account (owner10/09) | PASS | E18 account-ui links at3viewports with unchanged player/shift/coins/stamina/client stream, rejects duplicate callbacks, and reloads the account. Server accounts test preserves exact world/history/receipts across restart; existing-account restore is separate and never merges. Signed fixtures exercise real verifier/HTTP; live consent remains a separate setup gap. |
| Guest cannot rank-write or claim donation gift | FAIL | E25 rejects client ranking writes and excludes guest own rank; donation gift acceptance awaits the M7 donation path. |
| Admin changes1key, activates at effectiveAt | PASS | E10 browser edits menu.bia.price, reviews diff, proposes/approves/confirms publication; actual new player receives that version and old save remains pinned. Tier A distinct-MFA approval returns next-VN-day timestamp; E8 verifies exact calendar opening/replay. Live Google consent remains a setup gap, not claimed by the signed fixture. |
| Replay event log equals state | PASS | Engine legacy/mixed-pin/replay tests, E4 month replay, E5 imported replay and E6 checkpoint exactness. |

## M5 — meta

| Criterion (ROADMAP and referenced feature acceptance) | Verdict | Evidence or exact gap |
| Automatic season end and immutable global snapshot | FAIL | Local deterministic season outcomes PASS (`seasons.test.ts`); global ranks/shrine snapshot absent. |
| F12: quest/lottery/donate never change seasonEarned | FAIL | Quest/reward/refund exclusions PASS engine season tests; lottery/donate paths disabled/unimplemented, full3-source integration not exercised. |
| F12: deterministic VN midnight/epoch rollover | PASS | Engine “exact ranking boundary resets only ranking…” and server season restart/retry test, E1. |
| F12: stable tie-break across pages | FAIL | Local tie timestamp exists; paginated ranking absent. |
| F12: rewards claimed exactly once | FAIL | Season reward mailbox/grant/claim path absent; concrete prizes not supplied. |
| F13: spending cannot lower Life Path | PASS | Engine `progression.test.ts` subsidiary gates and reward-ledger tests; `locations.test.ts` lease spend keeps lifetime earnings; full careerE4. |
| F13: no duplicate reward claims | PASS | Engine “every configured reward uses the same overflow conversion…cannot be claimed twice” tests LP1–LP7 rewards and retry. |
| F13: location gates update immediately after level-up | PASS | Engine “actual v5 history…current progression unlocks…” + configured gates; lease tests reject locked targets; web life-path/rental gate scenarios. |
| F14: locked location cannot be rented | PASS | Engine “rent prepays seven scaled daily rents…failed or stale move preserves…” plus mobile rental quote test. |
| F14: deposit refunded only normal end/renewal, not early leave | PASS | Engine “early switch and departure forfeit…” and “calendar expiry is identical under fine/coarse ticks…”; server paid-lease restart test. |
| F14: multiplier server-side and shown in shift summary | PENDING | owner decision 2026-09-11 — post v0.2. Shared engine/server multiplier and rental UI already exist; summary presentation deferred. |
| F16: donate cannot grant ket_noi | FAIL | Referral qualification/badge service and donate path absent. |
| F16: self-referral never qualifies | FAIL | No referral service/endpoint or test. |
| F16: claim idempotent | FAIL | No referral claim path. |
| F16: VIP gate checks badge server-side | FAIL | No qualified referral/badge-owned VIP integration. |
| F17: daily set deterministic per day/player seed | PASS | Engine “daily rows use independent date/tier seeds…”; E1. |
| F17: quest reward never changes seasonEarned | PASS | Engine “all service and quality variants advance…earned rewards outside counted ledgers” and seasons refund/quest exclusions. |
| F17: three gifts to one recipient cannot complete mission | FAIL | Engine distinct-recipient guard PASS in “four local quests cannot claim…”; trusted social gift producer/API not implemented, end-to-end acceptance missing. |
| F17: expired quests cannot be claimed | PASS | Engine “VN midnight expires claims exactly…”; web quests expiry/pause/reload tests. |
| F28: guest views board, no own row, login invitation | PASS | E25 public HTTP and real guest invitation/browser tests: public board visible, no personal row; optional invitation shares configured cooldown. |
| F28: equal earnings use firstReached timestamp, stable refresh | PASS | E25 imported-career ordering test, exact tie fallback, revision-bound pages and configured refresh/deadline tests. |
| F28: flagged excluded from live/snapshot; unflagged returns before end | FAIL | E25 live server/browser flag hiding, compacted ranks and unflag restore PASS; immutable end-season snapshots remain absent. |
| F28: end snapshot immutable after rename/account deletion | FAIL | No global snapshot/name-at-capture lifecycle. |
| F28: in-shift board opens without lost wait; cached data then server refresh | PASS | E25 VI/EN in-shift browser keeps stamina paused until close; offline reopen shows only dated public cache, then verified server rank. Owner pause supersedes old no-pause text. |
| F28: admin-configured thresholds; rank/snapshot only server-side | FAIL | E25 server live rank/qualification and validated admin page/refresh controls PASS; immutable end-season snapshot path remains absent. |

F13's three enumerated acceptance rules pass at the shared-engine/local UI layer.
Its full feature remains open because social/cosmetic unlock surfaces and full career
integration are unfinished; this report does not invent new LP5–LP7 gameplay evidence.
M0 is complete independently of F01–F08, which span later milestones. Feature rows
are not milestone rows, so completing M0 does not incorrectly close all Phase0 rows.

## Next queue fixed by owner

1. M4 full economic impact forecasts and emergency/admin account workflow per
   BRD§5.2; default service/pins and authenticated transport verified in E8/E9.
2. Integrated accounts/eligibility/locale remain explicit M4 exit gaps; preserve
   server authority and the owner-deferred public import boundary. No fabricated Google setup.
3. M6 → M7 → M8 → M9; defer additional M5 breadth until hard dependencies are met.
4. M9 history-volume alternatives in [follow-up](m9-history-volume-followup.md),
   including commands+periodic checkpoints and measured redundant activity handling.

| Date | Change |
|---|---|
| 2026-09-10 | Owner-requested criterion-by-criterion M0–M5 closure. Closed M0 from current config/build/tests/sim evidence; retained explicit FAILs and split engine proofs from missing product flows. |

| 2026-09-10 review correction | Split the four04§6 feel criteria into separate FAIL rows with their own evidence gaps; M0–M5 closure verdicts unchanged. |

| 2026-09-10 server-liveness evidence update |9f38166 completes the backend timeout/restart portion of M4/F23; full-range review and298tests pass. The combined exit criterion stays FAIL because remote web/outbox/reconnect handling is not yet implemented. Milestone PASS/FAIL counts unchanged. |

| 2026-09-10 web cutover acceptance |936e9d5 reviewed and verified:298engine/server +91legacy/10remote browser, config/build and k/rush pass. Five M4 criteria move to PASS; M4 is10/18, still OPEN. Corrupt local recovery preserves originals; public upload remains deferred. |

| 2026-09-10 default registry evidence | c1e953c:310engine/server,10remote browser, config/build,10ordinary kcohorts/15rush PASS; correction review CLEAN. Internal default registry/scheduling verified, authenticated editor still missing. Counts unchanged: M0 3/3, M1 6/12, M2 4/9, M3 5/12, M4 10/18, M5 9/25. |

| 2026-09-10 admin API evidence |6f42575:320engine/server,10remote browser, config/build and review CLEAN. Server-side Google/TOTP/RBAC/registry transport verified; browser editor/login absent. Counts unchanged: M0 3/3, M1 6/12, M2 4/9, M3 5/12, M4 10/18, M5 9/25. |

| 2026-09-10 admin browser acceptance |56a0a44 closes the one-key/effectiveAt browser criterion with11admin/10remote browser,321engine/server and config/build PASS; final independent review CLEAN. M4 becomes11/18, still OPEN. Other milestones unchanged: M0 3/3, M1 6/12, M2 4/9, M3 5/12, M5 9/25. No live Google consent claim or M9 work. |


| 2026-09-10 scoped core evidence | d91b92a:334engine/server including13scoped cases,25focused,config/build,11admin/10remote browser,10ordinary kcohorts/15rush PASS. One full-review P2 fixed; final correction no remaining findings, regression independently PASS. Server scope core complete; HTTP/editor scope controls, forecasts and automatic segment/cap policy remain. Counts unchanged: M0 3/3, M1 6/12, M2 4/9, M3 5/12, M4 11/18, M5 9/25. |

## E11 — scoped server configuration (partial M4 implementation)

`d91b92a`, receipt `.qa/scopes-verification.json`: real server per-key resolution,
immutable audiences, expiry/replacement, removal-aware approval, ticketed player
scope and deterministic opening/replay pins. `.qa/scopes-correction-tests.txt`
334/334; `.qa/scopes-correction-focused-final.txt`25/25. Config/build and ordinary/rush
sim pass. Browser foundation remains11admin/10remote; correction edits only policy,
its regression and documentation. `.qa/review-scopes.txt` identified the campaign
entitlement timing P2; `.qa/review-scopes-correction.txt` reports no remaining finding
and independently passed the regression. Reviewer full HTTP run was sandbox-blocked;
host suite passed. This internal core alone closes no additional ROADMAP criterion.


## E12 — scoped admin transport/editor (verified)

Base22320d4: protected scope/support/source endpoints and VI/EN controls are wired
to real registry publication/opening. Preview is factual saved-player/key impact,
including previous audiences and masking; it does not claim seven-day economy
forecasts. M4 acceptance count stays11/18; final evidence is recorded below.

| Date | Change |
|---|---|
| 2026-09-10 scope UI implementation | Added protected scoped editor and factual impact; full verification/review pending. No additional milestone marked complete. |


E12 final evidence: product `a84f41f`, `.qa/scope-ui-verification.json` and
`.qa/scope-ui-correction-{tests,focused,browser,remote-browser,config,build}.txt`:
339/339engine-server,29/29focused,18/18admin browser,10/10remote browser and
config/build PASS. Token regression rejects overlapping publication and time-triggered
expiry, exact retry recovers once; browser refreshes stale confirmation. Support
logout/expiry clears private inputs without reload. Replacement after newer default
shows only recorded scoped patches. `.qa/review-scope-ui-correction.txt` clears all
three prior findings without new actionable regression. Full7day forecast remains
unimplemented; no milestone counter advances from this partial BRD acceptance.

| Date | Change |
|---|---|
| 2026-09-10 scope controls verified | a84f41f passes339tests/29focused/28browser/config/build; three full-review findings corrected and cleared. M0 3/3 COMPLETE; M1 6/12, M2 4/9, M3 5/12, M4 11/18, M5 9/25 remain OPEN. |


## E13 — current-save forecast kernel (verification underway)

The shared policy projects seven calendar days from a fork of a real saved Game,
retains an open shift's config and selects scheduled snapshots at later openings.
Cash reports separate income/spending/penalties/returned principal and enforce
wallet conservation. Existing career output remains byte-identical. Seven focused
checks pass; full suite/config/build/sim and independent review pending. This is
the kernel only: protected server aggregation, admin forecast UI and observed
donation/VND estimates remain. No additional ROADMAP criterion closes.

| Date | Change |
|---|---|
| 2026-09-10 forecast foundation | E13 added for projection kernel; M0 3/3 COMPLETE, M1 6/12, M2 4/9, M3 5/12, M4 11/18, M5 9/25 remain OPEN. |


Final kernel `03a6800`:344engine/server, config zero warnings/build/typecheck PASS.
Two-day career still exactly matches its original report/hash. Foundation10ordinary
kcohorts2.4186–2.8738 and15rush PASS; runtime and those simulators unchanged by
corrections. Review identified two lease-progression edges: config retuning and
post-expiry snapshots. Both now use attained identity from the active lease/history;
final full-base review has no actionable finding and independently passed the lease
regression. Receipt `.qa/forecast-verification.json`. M4 remains11/18 OPEN: protected
server snapshots/timelines, aggregation/admin UI and observed VND data still remain.
No public upload,80MB tuning, engine/config changes or merge/push/deploy.

| 2026-09-10 owner advanced k | M3 progressed-k criterion PASS with measured3.483282/3.318249 under04§5 soft cap3.5; M3 now6/12PASS, stillOPEN for feel/art. New automated two-seed30day/LP4 gate; no economy retuning. Re-evaluate after Alpha playtest with real player data; inflation via7-day faucet/sink reporting. Other milestone counts unchanged. |

| 2026-09-10 advanced gate verified | E13 fresh two-seed30day/LP4 run exactly confirms prior3.483282/3.318249;345tests/config/build/standard/rush and independent review PASS. M3 remains6/12PASS/OPEN; no other criterion changed. |

| 2026-09-10 | E14 protected coin forecast verified at9900505; M4 remains11/18 because the remaining complete exit criteria are unchanged. No economy retuning; advanced k policy remains E13. |

| 2026-09-10 locale verified | E15 at5871453 closes the first-run locale criterion; M4 now12/18 PASS/OPEN. All other milestone verdicts unchanged; Google web/claim/invitations and full-game acceptance remain. |

| 2026-09-10 Google transport verified | E16 at3c369aa adds verified same-player Google/outbox handoff and nonce-fenced reconciliation. No complete UI/account criterion is closed; all milestone counts stay unchanged, including M4 12/18 OPEN. |

| 2026-09-10 Google panel verified | E17 at e5745af verifies settings/GIS same-player integration and permanent callback consumption with signed fixtures. The complete account/import/invitation criteria still have explicit gaps; all milestone counts unchanged, M4 12/18 OPEN. No live consent or new economy acceptance claimed. |

| 2026-09-10 two modes verified | E18 at8c9dc64 applies owner guest-visit/Google-account correction, supersedes durable guest reopen and extra save choice, and closes current-visit exactly-once Google attachment. M4 rises13/18; other counts unchanged. Mixed-run regression evidence is explicit; live consent/recovery, invitations, local import/eligibility remain open. |

| 2026-09-10 reauthentication verified | E19 atddc77a9 closes explicit Google recovery with unchanged old outbox/stream and exact verified-account target. Current complete-criterion counts remain13/18 for M4; no live Google or full F25 claim. |

| 2026-09-10 Steer #5 | E20 records device-persistent guest correctione34fd56 and357unit/84remote/4local/19admin/config/build PASS; scoped review found no introduced defects. E18 fresh-visit reset is superseded. Current M4 stays13/18 because prior invitation-config P1 and other acceptance gaps remain open. |

## E22 — protected import review and flags

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

| Date | Change |
|---|---|
| 2026-09-10 review/flag verified | E22 records server core/API and exact role/retry/audit evidence. No exit criterion newly closes; M4 stays14/18 until competitive consumers and remaining acceptance exist. |

## E23 — competitive baseline and caller-only score

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

| Date | Change |
|---|---|
| 2026-09-10 score verified | E23 closes score/provenance core with current review/flag and exact-session evidence. No new whole criterion closed; M4 stays14/18. |

## Admin history/review closure — E24, 2026-09-10

Code `85fbdfb` (base `faee42a`): `/admin` now provides audited, paged access to
the imported validated history, approval/rejection and flag/clear controls.
Support reads only; Game/Super use current MFA/session/context and existing
immutable decision receipts. Lost ACK keeps the exact request per operator/tab;
stale decisions require inspection; logout/identity change discards late responses.
No new wallet credits, engine rules, schema or economy JSON values.

**Verification:**378/378 engine/server and24/24 admin browser passed at38c1d75.
The final correction only translates notices at render and tightens the matching
browser assertion/docs; engine/server are byte-identical. All5 affected browser
cases, config zero warnings and build/typecheck pass again at85fbdfb. The locale
regression fails before the correction and passes after. Mobile/desktop VI/EN,
44px controls, focus, reduced motion, storage failure and exact retry are covered.
Initial review P3 tracker/dashboard drift is fixed; final independent full-base
review finds no actionable correctness/security defect. Receipt:
`.qa/admin-competition-verification.json` (logs and screenshots hash-bound).

**M4 remains14/18 OPEN.** No full F28 or live Google consent claim. Next: public
rank query/filter/order using the existing canonical competitive score, then the
remaining acceptance. Whole-archive public upload/performance remains M9.

| 2026-09-10 E24 | Protected history/review controls verified. No whole exit criterion newly closes; public ranked query/filter remains absent and M4 stays14/18. |

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

| 2026-09-10 E25 | Live rank criteria closed with actual server/browser evidence; M4=15/18, M5=12/25. Full milestones remain OPEN. |


## E26 — arbitrary admin version comparison, 2026-09-10

`61e68d5` + `62e8646`, base `fdda260`: protected read-only arbitrary snapshot
pairs, union paths for removals, independent Base scaling and fetched-version labels.
Viewer/sibling/reverse/identical/failed-read and in-flight identity cases pass;
original author drafts survive. VI/EN390px scope disclosure and diff inspected.
`.qa/admin-compare-verification.json`:386engine/server,27admin browser,
config/build/typecheck PASS; full-base `.qa/review-admin-compare-final.txt` CLEAN.
Initial test-only OTP collision and documentation drift were corrected. Engine,
server runtime and economy unchanged. This closes the BRD arbitrary-pair item;
M4 count stays15/18 because the remaining combined acceptance is still open.

| 2026-09-10 E26 | Arbitrary admin version comparison62e8646 verified;386unit/server,27admin browser,config/build/review PASS. M4 remains15/18, M5 remains12/25. |


## E27 — registry lifecycle presentation, 2026-09-10

`b5d3545`, base `2ad3f66`: server-derived registry phases, readonly snapshot/time,
per-row metadata and shared current-scope selection. Default activation, replacement,
expiry/non-resurrection and stored composite snapshots pass; VI/EN list/details/
comparison show actual phases and refresh after another admin's approval.
`.qa/admin-phase-verification.json`:389engine/server,39focused,27admin browser plus
3final affected cases,config/build PASS. Independent full-base review reports no
introduced actionable issues. Images at390px inspected. No engine/economy/schema
or scheduling policy change. M4 remains15/18; this closes the BRD lifecycle item,
not the remaining combined M4 acceptance or the pending emergency policy.

| 2026-09-10 E27 | Registry lifecycleb5d3545 verified;389unit/server,39focused,27admin+3final browser,config/build/review pass. M4 remains15/18. |


## Owner acceptance update — 2026-09-10 22:00 (Steer #7)

Human-only criteria above are **WAIVED by owner 2026-09-10 — post-release playtest**:
five newcomers, uncoached first30seconds, four04§6feel observations and32px badge
recognition. Keep scripted first-serve time, viewport screenshots and accessibility
checks; do not mislabel waivers as observed human PASS. No five-person wait remains.

Real Google ClientID/consent is no longer a build blocker. Implement an explicit
server dev identity provider (`TBH_AUTH_DEV=1`), refused in production. It must use
the same session/link/restore paths and deterministic test accounts; flag off never
simulates login. Verify minute5 shift/once-only credits, restore, reauth, ranking
membership and admin MFA through this stub before marking affected criteria PASS
with: "verified via dev identity stub; real Client ID pending — owner waiver
2026-09-10". Existing signed fixtures remain evidence; this new runtime stub is not
yet implemented or certified by this record.

Queue: M4 emergency hotfix per Steer #6 → dev identity acceptance and other M4
remainder → M6 → M7 → M8 → M9. Any-two-version comparison already passed E26.
Independent full-diff review is required once per milestone closure and for auth,
money/donation or registry changes, rather than every small slice. Keep
`npm run verify` green at commits; do not repeat unaffected checks unnecessarily.
Generation failures may retain explicit manifest placeholders; check:assets stays
green. Inspection/lottery OFF; voluntary donation only; no paywall/dark patterns;
device-persistent guest and exactly two account modes remain binding.

| 2026-09-10 owner Steer #7 | Human-only criteria explicitly WAIVED; real OAuth replaced by required dev-stub acceptance (implementation pending), not fabricated consent. Hotfix policy resolved; E26 arbitrary comparison already complete. |

| 2026-09-10 emergency implementation | Emergency configuration implemented per ownerSteer6; final verify/admin suite/review running. This closes a registry sub-scope only; M4 stays15/18 until remaining criterion evidence is complete. Any-two-version diff E26 already PASS; dev identity acceptance follows. |

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


## playable-v0 acceptance — 2026-09-11

PASS on the stable config2.0.2/rules24 build: full real-time12-minute guest shifts at390×844,360×740,1280×720; service/washing/restock, actual in-shift upgrade purchase, summary, next day, reload and new-tab persistence. First playable1340/1264/627ms, measured60.09/60.34/60.16fps;0console errors/failed image requests. Mobile receipts passed in the combined run; desktop passed independently after removing a stale order-bubble locator from the harness.

Full verify:406/406unit/server,10standard cohorts k2.4186–2.8738,15rush cases, career42/99 k3.48328/3.31825≤3.5. Three legacy risk-preview regressions and check:assets pass; shipped risk controls are hidden. Dev identity acceptance is in a7331b4; beer naming in e4a4bf6. Independent release diff review CLEAN.132manifest entries,108drafts,16accepted placeholders; two failed-alpha imagegen attempts recorded and counter cards have a registered table fallback.

This closes the owner-defined playable-v0 subset, not every M1–M5 milestone. M6/M7/M8 remain deferred; human-only acceptance remains WAIVED. Packaging/run instructions and exact code commit: [playable-v0](playable-v0.md). Next, only after the tag: Steer14 buffer5/8/12/20/40 with full k gates and the owner-specified fallback.


## Steer16 queue — 2026-09-11

Ordered by player impact; each id gets its own evidence/commit. Existing evidence is reconciled before adding code. A criterion that needs an unsettled product decision stops for owner input.

| Id | Scope / likely files |
|---|---|
| M4-DEV-PATTERN | Native dev-account validation and console regression; admin-api.ts, remote-test/dev-identity.spec.ts. |
| M1-EQUIPMENT-UI | Owner11:05 addendum: kitchen unowned state, four compressed sprites, cooler mechanics/HUD units; App.tsx, i18n, assets/manifest and label tests. One commit before the remaining queue. |
| M1-SHIFT | Reconcile already-passing three-viewport full-shift evidence; closure/tracker. |
| M1-SCREENS | Seven-screen three-viewport coverage; existing browser tests. |
| M2-TIMEOUT | Measure numeric loss feedback within1s; remote browser test, App.tsx/remote.ts only if needed. |
| M1-UPGRADE | Measured bottleneck suggestion; App.tsx, presentation/i18n, browser regression. |
| M5-F14-SUMMARY | Authoritative location multiplier in shift book; App.tsx/i18n and lease/book tests. |
| M1-I18N / M1-AXE | Player-facing copy inventory and accessibility checks/fixes; web source and browser tests. |
| M2-ONBOARDING / M2-GOOGLE5 | Disabled-guide path and minute5 dev-account attachment; onboarding/account tests. |
| M5-F12 / M5-F28 | Season snapshot, pagination and eligibility gaps; server ranking and season tests. |
| M5-F16 / M5-F17 | Referral/quest gates only within non-deferred scope; progression source/tests. |
| M2-ADMIN / M4-REGISTRY | Onboarding editor acceptance and remaining relevant registry polish last. |

### M4-DEV-PATTERN

Native HTML pattern uses Unicode-v set syntax: the literal hyphen is now escaped in the shared dev form. Browser regression rejects malformed names, accepts a hyphenated name, links the same live shift and restores the account in a fresh context with zero console/page errors and no Google requests. Red/green receipts: `.qa/steer16-pattern-red.txt` / `.qa/steer16-pattern-green.txt` (1PASS); independent auth review `.qa/steer16-pattern-review-verdict.txt` CLEAN. Server identity admission, flags and production behavior are unchanged. **PASS**: `.qa/steer16-pattern-verify.txt` full verify406/406, build/config,10standard cohorts k2.5644–2.9168,15rush and career42/99 k3.46546/3.39320. Source fixed; pinned playable-v0.1 is unchanged until the next batch release.


### Steer17 trimmed execution — 2026-09-11

Supersedes the unstarted portions of the Steer16 queue above. Ordered ids: M1-EQUIPMENT-UI → M1-SHIFT → M1-SCREENS → M1-TIMEOUT (formerly M2-TIMEOUT) → M1-UPGRADE → M5-F14-SUMMARY → M1-I18N/AXE → local v0.2 verify/smoke/release → master fast-forward and verification. Referral/gift UI is only checked for guest hiding/coming-soon wording. F12/F28 global snapshots/rewards are not a small local fix and remain PENDING. M2-ONBOARDING/GOOGLE5, M5-F16/F17 and M2-ADMIN/M4-REGISTRY are not part of this batch. No WAIVED row is reopened.


### M1-EQUIPMENT-UI — PASS, owner addendum 2026-09-11

Kitchen Lv0 has an explicit empty slot and locked copy; an unavailable level never borrows another level's art in upgrade comparisons. Four retained imagegen kitchen originals have compact v2 exports (7,289,987→59,845 bytes total), true alpha, native sizes and manifest checksums. Cooler cards explain configured baseline freshness, stale tip/reputation outcome and hot/humid multipliers; HUD uses the actual weather-adjusted duration with a seconds unit. VI/EN label8/8, kitchen7/7, production5/5 PASS; typecheck/build/config and406unit/server tests PASS. Two old production assertions were updated for baseline card values and spaced seconds. Engine/config untouched; standard/rush/career gates reuse the full green M4-DEV-PATTERN source result, with an additional full verify still running in `.qa/steer16-equipment-verify-final.txt`. Preview remains v0.1 until batch release.


## E28 — M1-SHIFT closure, 2026-09-11

Reconciled the stale full-shift FAIL row against the accepted playable-v0.1 evidence. Source:7dc5998, tagb3cfb34; no gameplay implementation is needed for this criterion. `playable-test/shift.spec.ts` explicitly asserts actual elapsed active shift≥configured12minutes (only overnight rest accelerates), earned upgrade/restock, washing, summary, next-day, reload and new-tab persistence.

| Viewport | First playable | FPS | Served | Console / missing | Receipt SHA-256 |
|---|---:|---:|---:|---|---|
|390×844|561ms|60.25|68|0 /0|160218826d0d0ee45e1007464a34790517f70df739f7fe5b2926e11f9fecbe21|
|360×740|751ms|60.44|75|0 /0|0b339a435825caaec0c1600921d6eb3380283d9398b67489b6a12f8c0b8d9d13|
|1280×720|1040ms|60.27|83|0 /0|87efb80561e3534c92be176909d592cf80356a4d9056eb14fd4ca502d570cc63|

Receipts: `.qa/playable-{390,360,1280}.json`, `.qa/steer15-playable-smoke-final.txt` plus `.qa/steer15-playable-390-retry.txt`. Each receipt was reopened and checked on disk; hashes above preserve this evidence when v0.2 replaces the local QA outputs. The final v0.2 smoke remains required after the batch.


### M1-SCREENS — PASS, 2026-09-11

`npx playwright test --config playwright.remote.config.ts apps/web/remote-test/remote.spec.ts -g M1-SCREENS` passes3/3 (47.2s). Each viewport390×844,360×740,1280×720 opens all seven core surfaces against real HTTP/store, serves a customer, observes paused management sheets, confirms early close and reaches rest with exactly one completed shift. Every screen checks image completion, horizontal overflow and contextual-panel bounds;0console/page errors.21screenshots `.qa/m1-screens-{width}-{yard,order,stock,upgrades,book,close,rest}.png`; receipt `.qa/steer17-screens.txt`; typecheck PASS. No production source, engine or config changed. Human first-use criterion remains WAIVED.


### Steer17 addendum — 11:40, 2026-09-11

M5-F14-SUMMARY removed from the local v0.2 queue: **PENDING — owner decision 2026-09-11 — post v0.2**. Read-only diagnosis only; no location implementation or WIP. Continue M1-TIMEOUT → M1-UPGRADE → M1-I18N/AXE (guest referral/gift visibility) → verify/three-viewport smoke → tag/serve v0.2 → temporary-worktree master fast-forward, no push. Production remains PENDING.


### M1-TIMEOUT — PASS, 2026-09-11

Remote polling now wakes at the nearest pending order expiry when online, visible and playing, instead of waiting the remainder of the heartbeat interval. Loss remains server-authoritative; paused/background/offline cadence is unchanged.6/6 remote browser checks PASS: three expiry-to-painted-toast receipts40/46/71ms plus lost-acknowledgement, paused restock/upgrade and disconnected grace recovery. Test clock-offset metadata isolates the previous reconnect test's time jump; animation visibility is observed every frame, not only on DOM mutation. Receipts `.qa/steer17-timeout-regression.txt`, screenshots `.qa/m1-timeout-{390,360,1280}.png`. Config/build PASS; no engine/config changes.

Equipment full verification also finished with exit0:406/406 tests,10standard k2.5644–2.9168,15rush,career42/99 k3.465460767842698/3.393196640939153. Source receipt `.qa/steer16-equipment-verify-final.txt`.


### M1-UPGRADE — PASS, 2026-09-11

One contextual suggestion uses the larger observed customer count: stale serves from the current shift's complete serve cursor → Cooler, or rejected customers with a full table/queue → Tables. No observation, maxed capacity, or absent legacy serve provenance produces no fabricated recommendation. The existing quote and purchase sheets own affordability/prerequisites; the hint never buys or promises a simulated gain. VI/EN tests8/8 cover stale/crowded/fresh/next-shift, exact counts, reload and the target panel/scroll; one boundary test checks maxed/legacy states (9total). Config/build/typecheck PASS; engine/server406-test and k evidence unchanged from M1-TIMEOUT/equipment. No engine/config edits.


### M1-I18N / M1-AXE — PASS, 2026-09-11

`check:i18n` uses the existing Vite/Rolldown parser to inventory12player/native-form source files: JSX text, accessible attributes, inline conditional/template copy, native text setters and static translation calls.804VI/EN keys and interpolation tokens match. Dynamic catalog coverage retains the engine presentation tests; live VI/EN screens check missing-key warnings and unresolved tokens. Admin screens remain outside the local-player scope.

`test:a11y` uses axe4.13 (WCAG2A/AA/2.1AA/2.2AA), no disabled rules/excluded selectors: language, guest choice, rest, yard, order, stock, upgrades, kitchen, cooler, book, settings, account, close, quests, journey, ranking, locations.6/6 tests at390×844/360×740/1280×720 ×VI/EN;102scans,0violations/console errors/external requests. The isolated accessibility fixture reveals quest/ranking menus via zero reveal thresholds; actual gameplay/progression/config remains unchanged. Normal reduced-motion support remains; axe waits for the active panel's entrance animation, not paused background sprites. Native red controls, customer tags and muted/pause copy now meet contrast on their backgrounds.

Guest referral/send-gift actions are absent; an existing gift quest explicitly says unavailable and its claim stays disabled. Existing deterministic quest fixture checks this on3viewports, PASS; no F16/F17 implementation. Receipts `.qa/steer17-axe-final2.txt`, `.qa/axe-{vi,en}-{390,360,1280}.json`, `.qa/steer17-quests-visibility.txt`. M1 closes11PASS/1owner-WAIVED; full local release verify/smoke remains in flight. M5-F14-SUMMARY stays PENDING post-v0.2.
