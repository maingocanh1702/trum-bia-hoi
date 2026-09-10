# Milestone closure report — M0–M5

2026-09-10 · implementation `6f42575` · config2.0.1/rules24/schema9.
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
  Advanced k3.483282/3.318249 remains outside band; owner band scope unresolved.
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

## Closure decision

| Milestone | Exit verdict | Closure | Remaining acceptance |
|---|---|---|---|
| M0 | PASS (3/3) | COMPLETE | All three explicit exit criteria met; E10 config/build/tests and unchanged E8 sim pass. Foundation/checkpoint reviews also passed. |
| M1 | FAIL (6/12 PASS) | OPEN | Full12min proof at all3viewports, complete7-screen coverage, measured upgrade recommendation, axe and new-player feel evidence. |
| M2 | FAIL (4/9 PASS) | OPEN | Five-person test, real mid-shift Google browser flow and admin-editable onboarding; locale/login-prompt gaps below. |
| M3 | FAIL (5/12 PASS) | OPEN | Advanced economy band/feel,32px badge acceptance and remaining equipment/football placeholders. |
| M4 | FAIL (11/18 PASS) | OPEN — next implementation priority | E7 remote authority/reconnect, E8 registry and E9/E10 admin browser workflow verified. Scoped config/forecasts/emergency and integrated account/import/eligibility/locale remain. |
| M5 | FAIL (9/25 PASS) | OPEN | Public seasons/ranking/shrine, rewards/referral/gifts and full integration; local LP acceptance rules pass. |

## M0 — foundation

| Criterion (ROADMAP) | Verdict | Evidence |
|---|---|---|
| check:config green in new workspaces | PASS | E9 current config check;40sections,39governed tiers, runtime seed/schema matched. |
| Five-seed sim k in2.0–3.0 | PASS | E8 current10cohorts/5seeds, range2.4186–2.8738,≥1000serves/cohort. |
| Build and tests green | PASS | E9 current Vite production build/typecheck and320tests, no prototype code used. |

## M1 — serving loop

| Criterion (ROADMAP and09§11 P1) | Verdict | Evidence or exact gap |
|---|---|---|
| Complete12-minute shift on390×844,360×740,1280×720 | FAIL | Web `game.spec.ts` “guest serves, reloads…” covers all3; “a neglected first shift closes…” runs full duration at390 only. No complete-duration proof for other2. |
| Seven screens §3–§4.5 on all3viewports | FAIL | E2 covers yard/stock/settings/close/book and several equipment flows, but no complete7×3 acceptance matrix. |
| Whole-table contextual service per03§9.5 | PASS | Web “tapped order stays live, returns keyboard focus, and closes on customer expiry”; one Phục vụ cả mâm action in “guest serves…”. |
| Four visually distinct serve outcomes | PASS | Web “multi-dish service shows the actual early/late/grace/stale reward and guest reaction”; separate emoji, actual amounts, reduced-motion and reload checks. |
| Management sheets pause (owner override) | PASS | Web `pause.spec.ts` all3tests; stock purchase retains sheet/pause, visibility cannot resume it, equipment switch/reload preserve wait. |
| Upgrade suggestion reflects measured bottleneck | FAIL | Equipment quotes/capacity panels exist; no metric-driven recommendation producer or comparison test in current web flow. |
| i18n keys100%, no hardcoded product copy | FAIL | Engine `presentation.test.ts` locale-key/interpolation parity and E2 VI/EN pass; no exhaustive hardcoded-copy inventory for all P1surfaces. |
| Screenshot baseline | PASS | E3 mobile screenshot plus recorded yard/equipment references in `.qa`; current browser acceptance receipt preserves artifact hashes. No automated visual-diff suite implied. |
| axe pass | FAIL | No axe dependency, invocation or result in current browser harness; keyboard/hit-target assertions are not an axe result. |
| First30seconds playable without reading instructions | FAIL | Scripted first serve at11.1seconds passes E2; no uncoached human playtest evidence. |
| k remains in band | PASS | E1 standard cold/full-menu profiles. Advanced meta multipliers separately FAIL under M3; not silently excluded there. |
| Reload loses no progress | PASS | Engine “local save reload exactly replays…”; web serving/reload, storage corruption/migration/multi-tab/delta and E3 month exactness. |

## M2 — onboarding/guest

| Criterion (ROADMAP and F27§6) | Verdict | Evidence or exact gap |
| Five new users:≥4/5 first serve≤30s and≥4/5 complete first shift | FAIL | No five-person uncoached study; browser automation is not human evidence. |
| Guest completes first shift without mandatory registration; tab reopen preserves progress | PASS | E2 “a neglected first shift closes…” + “guest serves, reloads…”; local IndexedDB reopen tests/E3. |
| Fixed-seed first guest within config deadline, one bia, no rush/risk | PASS | Engine `game.test.ts` “first guest gets one customer and one beer, with auto pour…”; onboarding config and E2 first serve. |
| First timeout produces customer_left+feedback≤1s and shift continues | FAIL | Engine numeric-loss event and web toast/continued-shift checks PASS; exact deadline-to-visible-toast≤1s is not separately measured. |
| Three consecutive losses rerun guide once; serve resets counter | PASS | Engine `presentation.test.ts` “event-driven guide resets…” and “three-customer queue loss…”. |
| First guide runs, skip continues, reload does not rerun | PASS | E2 “muting, guide skipping and reduced-motion preference survive normal play” + persisted settings/guide tests. |
| Google sign-in at minute5 keeps live shift and credits once | FAIL | E5 server mid-shift/claim transaction passes; GIS browser flow and actual Google Client ID absent. |
| onboarding.enabled=false behaves as returning player, k unchanged | FAIL | E1 controlled rush probe disables onboarding; ordinary sim keeps configured onboarding. No paired on/off k acceptance; formula itself is unchanged. |
| All thresholds/steps editable in admin without deploy; config green; VI/EN; reduced motion | FAIL | JSON governs thresholds, E1 config and E2 VI/EN/motion pass; E10 default editor exists, but onboarding-specific key publication/step acceptance has not been exercised; this combined criterion remains open. |

## M3 — full demand mix

| Criterion (ROADMAP,04§5–§6,09§11 P2) | Verdict | Evidence or exact gap |
| Correct k calculation and ordinary band | PASS | E1 actual per-customer payment+tip/82.5, no throughput term. |
| Full progressed economy stays in band | FAIL | E4 advanced k3.483282/3.318249; owner scope decision pending, no numbers retuned. |
| 04§6: player controls pouring rhythm; stale warning rarely feels unfair | FAIL | Engine freshness deadlines/penalties and web stale reaction PASS; no human observation showing controlled pacing or absence of unfair-feeling penalties. |
| 04§6: group/table serving is clear, not confusing | FAIL | Web whole-table action and multi-dish outcomes PASS; no uncoached group-order clarity study. |
| 04§6: glass/washing bottleneck is perceptible and washer upgrade feels better immediately | FAIL | Engine production/batch and web live-capacity/upgrade tests PASS; no player comparison before/after washer upgrade. |
| 04§6: peak rush feels intense but manageable | FAIL | E1 pressure/floor/serve-ceiling checks and per-window loss/stale reports PASS; no human rush-handling observation.04§6 gives no numeric loss threshold to invent. |
| Kitchen panel and separate beer/hot-food bubbles | PASS | E2 `kitchen.spec.ts` “live kitchen shows real timers…” and multi-dish service; actual job deadlines and whole-table links. |
| Special customer badges distinguishable at32px | FAIL | Urgent identity is tested at normal yard scale; no complete32px recognizability acceptance, football customer still placeholder. |
| Rush-type telegraph | PASS | E2 “rush warning pauses in sheets, resumes on closing, active timer wins…” at3viewports; engine rush-clock/schedule tests. |
| Quest panel | PASS | E2 `quests.spec.ts` and `attendance.spec.ts`: real progress/claim/rollover and pause. Full social quest branches remain M5. |
| Signboard sheet | PASS | E2 “business sign installation, ownership, reputation gate and live yard…” at mobile widths. |
| Equipment/customer/menu asset batch replaces placeholders | FAIL | Live manifest has23placeholders, including keg/washer/cooler/stall upgrades and customer-football-fan;97drafts/8approved. M3 cannot close on missing art. |

## M4 — server/accounts/admin

| Criterion (ROADMAP, F23§8, F25§10) | Verdict | Evidence or exact gap |
| Editing local state cannot earn authoritative coins | PASS | Server HTTP rejects identity/clock/total forgery; default remote web never constructs or advances Game. E7 account rotation/quota/queue tests prove only server receipts change balances; local archives stay separate. |
| Duplicate serve request idempotent | PASS | Server HTTP guest/restart test, `client-sequence.test.ts` “response loss after serving…”; E1 and E6 cold-retry exactness. |
| Leaderboard ignores flagged/ineligible writes | FAIL | No ranking write/query path or protected approval eligibility yet; pending import provenance alone is not eligibility. |
| Server clock handles VN midnight | PASS | Server “management pause survives a server restart and real VN midnight…” and “season rollover and old service retries…”; E1. |
| Reconnecting within2s with yard visible | PASS | E7 silent hung-transport test exercises the configured2000ms deadline (browser assertion tolerance250ms); returning-player regression keeps the yard accessible while heartbeat is unavailable. |
| Offline commands buffer key+clientSeq within reconnectGraceMs, no loss/duplicate | PASS | E7 real server lost-service ACK/reload test retains exact key+seq and credits once; offline restock/in-shift upgrade replay current menu flags; configured queue cap and quota refusal tested. |
| Reconnect resync from lastSeq; server wins | PASS | E7 real server state/report equality after response loss/reload and paged owner-bound events; stale account cannot replay retained commands into another player. |
| Beyond grace: server normally closes and returns ShiftClosed; no client-only ticking | PASS | Backend9f38166 exact expiry/restart/normal closing plus E7 browser grace-close/ShiftClosed book; offline yard stays frozen and returning inactive projection no longer hides it. |
| Local-first history replays at import; no client-only rules after cutover | FAIL | Shared engine and E5 full import replay PASS; online browser authority now PASS in E7; public local archive migration remains deferred by owner, so full import acceptance stays open. |
| Google mid-shift without reload/lost tick; attach history once | FAIL | E5 transaction core PASS; public upload/GIS integration and live credential absent. |
| Unrestricted guest core; exactly3login benefits and cooldown | FAIL | Guest core PASS E2; login-benefit prompt/cooldown UI not implemented. |
| First session without login | PASS | E2 first-run guest scenarios. |
| Locale chosen/accepted before first game screen | FAIL | Current welcome accepts entry, with locale only in Settings; no explicit first-run locale choice/acceptance. |
| Locale switch preserves save | PASS | E2 “guest serves, reloads…switches locale” at4viewports. |
| Guest progress migrates exactly once to Google | FAIL | Server account/import tests pass E5; end-to-end web claim remains absent. |
| Guest cannot rank-write or claim donation gift | FAIL | These product paths are absent, not an exercised access-control acceptance. |
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
| F14: multiplier server-side and shown in shift summary | FAIL | Shared engine/server multiplier is authoritative for server commands; rental UI shows multiplier, but explicit shift-summary multiplier presentation is missing. |
| F16: donate cannot grant ket_noi | FAIL | Referral qualification/badge service and donate path absent. |
| F16: self-referral never qualifies | FAIL | No referral service/endpoint or test. |
| F16: claim idempotent | FAIL | No referral claim path. |
| F16: VIP gate checks badge server-side | FAIL | No qualified referral/badge-owned VIP integration. |
| F17: daily set deterministic per day/player seed | PASS | Engine “daily rows use independent date/tier seeds…”; E1. |
| F17: quest reward never changes seasonEarned | PASS | Engine “all service and quality variants advance…earned rewards outside counted ledgers” and seasons refund/quest exclusions. |
| F17: three gifts to one recipient cannot complete mission | FAIL | Engine distinct-recipient guard PASS in “four local quests cannot claim…”; trusted social gift producer/API not implemented, end-to-end acceptance missing. |
| F17: expired quests cannot be claimed | PASS | Engine “VN midnight expires claims exactly…”; web quests expiry/pause/reload tests. |
| F28: guest views board, no own row, login invitation | FAIL | Community board/API absent; local seasons panel explicitly says unavailable. |
| F28: equal earnings use firstReached timestamp, stable refresh | FAIL | Timestamp rule exists in engine; public ranking/order/refresh absent. |
| F28: flagged excluded from live/snapshot; unflagged returns before end | FAIL | No flag/approval eligibility filter or leaderboard implementation. |
| F28: end snapshot immutable after rename/account deletion | FAIL | No global snapshot/name-at-capture lifecycle. |
| F28: in-shift board opens without lost wait; cached data then server refresh | FAIL | Personal panel honors owner pause; community cached/server board absent. Owner pause supersedes old no-pause text. |
| F28: admin-configured thresholds; rank/snapshot only server-side | FAIL | JSON schema coverage PASS; E10 protected default editor exists; authoritative ranking/snapshot is still absent. |

F13's three enumerated acceptance rules pass at the shared-engine/local UI layer.
Its full feature remains open because social/cosmetic unlock surfaces and full career
integration are unfinished; this report does not invent new LP5–LP7 gameplay evidence.
M0 is complete independently of F01–F08, which span later milestones. Feature rows
are not milestone rows, so completing M0 does not incorrectly close all Phase0 rows.

## Next queue fixed by owner

1. M4 scoped Config Registry, impact forecasts and emergency/admin account workflow per
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
