# Build progress — Trùm Bia Hơi

> **playable-v0 DELIVERED** (`a602af3`): three full-shift viewports and dev identity PASS; local5174/5175 pinned to that tag. Post-tag Steer14 source config2.0.3 uses the verified fallback4/7/12/20/40. Full milestone closure remains separate; M6/M7/M8 deferred.

Started 2026-09-08 from `30c0285`. Active worktree: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game`, branch `codex/game-build-isolated` based on `bc79af5`. A concurrent Claude docs commit captured the first engine files in the original checkout; original files were preserved, and further work was isolated. Authority: current `00-HANDOFF-trum-bia-hoi.md` and [owner update adoption](latest-handoff-adoption.md),
PROMPT PACK part B, GDD decisions, 03-SPEC table rules, JSON numbers. This is the
complete-game goal; milestones below are implementation order, not scope cuts.

| Milestone | Status | Evidence / remaining |
|---|---|---|
| M0 — config, pure engine, deterministic replay, k sim, workspaces | COMPLETE — exit criteria PASS | All3exit criteria PASS: current config/build/321tests,5seeds×2profiles k2.4186–2.8738; reviewed foundation/checkpoint/web. |
| M1 — serve loop, glasses, stock, upgrades, local save, spatial UI, core audio | In progress | Playable loop, local save/replay, stock/equipment/table UI, core SFX wired; final sprites and listening QA pending |
| M2 — guest, vi/en, onboarding | In progress | Device-persistent guest, vi/en, guide and Google attach/restore verified; dev identity acceptance remains; live consent/five-person study waived by owner10/09 |
| M3 — full menu, customer mix, weather, rush, business unlocks | In progress — 6/12 PASS | Standard k and advanced career≤3.5 pass under owner10/09 rule; 5human-only criteria WAIVED by owner10/09; equipment/customer art remains tracked. |
| M4 — server authority, accounts, reconnect, config registry/admin | In progress | 15/18 exit criteria PASS; E25 live public ranking628eb72 verified with386unit/server,11affected remote/24admin browser, config/build and CLEAN review. Emergency/admin remainder, owner-deferred archive transport and dev-stub account/donation acceptance remain; see criterion report. |
| M5 — seasons, leaderboard/shrine, life path, leases, quests/referrals | In progress | Local seasons/peak, LP/quests/attendance and lease calendar/UI implemented; public live ranks verified in E25; snapshots, rewards/referrals/social and full acceptance remain |
| M6 — risks, dog, emergency supplies | M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release | Retain spec/config/manifest; features OFF/hidden. No implementation for this release. |
| M7 — voluntary donations, cosmetic gifts, age notice | M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release | Retain spec/config/manifest; features OFF/hidden. No implementation for this release. |
| M8 — football events, season shop, legal-gated lottery | M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release | Retain spec/config/manifest; features OFF/hidden. No implementation for this release. |
| M9 — complete art/audio, accessibility, replay/security/performance QA, release | Pending | |

Current milestone closure (2026-09-10): **M0 COMPLETE; M1–M5 OPEN**. Every ROADMAP
exit criterion is evaluated in [M0–M5 closure report](milestone-closure-m0-m5.md).
Verified engine sub-rules, missing implementation and missing human/UI evidence are
separate. Feature rows span milestones; their count is not milestone completion.
Owner queue (Steer9): M4 emergency → dev identity → M4 closure → remaining automated gameplay M1/M2/M3/M5 → assets → gameplay-facing M9 release candidate.
No additional M5 breadth or history-volume tuning before those dependencies.

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
unchanged. [E24 evidence and limits](competitive-eligibility.md#admin-historyreview-closure--e24-2026-09-10).
M4 stays14/18 OPEN. Next: public rank query/filter/order using canonical scores;
public archive transport/performance stays M9. No merge/push/deploy.

## Latest M4 competitive score closure — 2026-09-10

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

## Latest M4 review/flag closure — 2026-09-10

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

## Latest validation closure — 2026-09-10

Code `03dae56` (base `25cc21c`): reject threshold-group deletion at proposal and
preview/publication admission. Approved pre-fix drafts are fenced; already-published
scopes remain readable and can be corrected without changing live pins. Four new
regressions failed before their respective fixes. Final **361/361 engine/server,
19/19 admin browser,33 focused, config zero warnings and build/typecheck PASS**.
Initial independent review P1 about historical composition was corrected; final
review confirms compatibility and independently passes all5 targeted cases.
Receipt `.qa/threshold-admission-verification.json`. No economy JSON or engine
change, merge/push/deploy, live Google consent or full-game completion claim.

M4 is14/18 OPEN. Next: server-owned review/eligibility for imported local history,
then remaining M4 acceptance and M6–M9. Keep public upload/performance work deferred.

## Latest owner correction — guest on this device (2026-09-10 15:30)

Code `e34fd56` removes new-tab guest reset and journal deletion; same browser
profile keeps stall/coins/upgrades/current day and shift. Single writer/exact
session and Google attach/restore remain. Missing credentials keep the old journal
and refuse mismatched state. VI/EN offers distinguish account-only history,
achievements, ranking and cross-device restore; native guest exit upsell removed.
357unit/server +84remote +4related local +19admin checks, config/build PASS; scoped
review found no introduced defects. At that checkpoint the earlier invitation/config P1 remained open; the separate
validation closure above now resolves it. Full F25 remains unfinished. No engine/server/config modifications
in the correction from90d1a50. Older fresh-visit interpretations below are superseded.

## Decisions and boundaries

- Build fresh; do not modify or inherit archived prototype code/UI.
- React DOM + CSS for the first spatial yard: accessible native controls, stable
  keyed objects, no canvas dependency before a measured need.
- Shared pure TypeScript rules, seeded RNG, explicit time, JSON config snapshots,
  append-only commands/events with idempotency keys. Local persistence before server.
- Held content is never fabricated: inspection remains disabled. Lottery must be
  disabled until legal approval; the seed flag has been reconciled to `false`.
- Manual donation confirmation and admin-entered football fixtures are the defaults.
- Asset placeholders are labelled through the manifest until replacement art passes QA.
- Keep real external setup and human playtest evidence distinct from local checks.

## Verification

Current checkpoint (2026-09-08):

- `npm run check:config`: passes against the new runtime loader (40 root sections).
- `npm run build`: strict typecheck + Vite production bundle passes.
- `npm test`: 15 tests pass (serve/grace/stale/expiry, replay/idempotency, cap,
  restock, frame-independent rest, locale parity, guide repeat cap).
- `npm run sim`: 5 seeds, 500–501 customer serves each, k = 2.2702 / 2.3728 /
  2.4326 / 2.3873 / 2.5072. Real gameplay bot, stock costs included, no throughput term.
- Browser acceptance: 390×844, 360×740, 1280×720; first serve, persistence,
  live sheets, language switch, full 12-minute closure, corrupt-save recovery,
  mute/guide persistence. No horizontal overflow or page exceptions observed.
- `npm run check:assets`: 113 entries; 8 existing sprites, 41 declared placeholders,
  32 new SFX × two codecs. Release check intentionally rejects draft art/audio.
- Local preview in this worktree: `npm run dev -- --port 5174`.

No complete-game or release-ready claim. Further implementation stays in this worktree.

## Immediate next work

1. M4 protected Config Registry/admin per BRD§5.2, effectiveAt and exact version pinning.
2. Complete account/eligibility/locale acceptance without fabricating Google setup or
   approving local competitive credit automatically; public upload stays owner-deferred.
3. M6 → M7 → M8 → M9. Preserve verified service/batch/pause/upgrade behavior and current
   server/outbox authority; no extra M5 breadth or80MB tuning before dependencies.

## Known implementation limits

- Normal new-career web uses server authority; explicit legacy local play remains separate.
  Settings Config screen is a snapshot viewer, not an admin editor.
- No Google credentials, live rankings, bank receiving details, remote deployment or
  human playtest evidence have been configured or fabricated.
- Earning is credited at service time (08-SPEC §9 per-earn); later table cleanup does
  not credit it again. Previously served rounds remain earned if a later round fails.
- Procedural sound IDs use `audio:<clip-id>:<format>` in the manifest to avoid collisions
  with sprite ids such as `glass-stale`; the checklist clip id remains `audioId`.


## Changelog

| Date | Change |
|---|---|
| 2026-09-08 | Started complete-game build and recorded authority, order and boundaries. |
| 2026-09-08 | M0 verified; playable M1/M2 and initial M3 code in isolated worktree. Added explicit remaining work and evidence instead of treating the local slice as the full game. |

## Owner steering — 2026-09-08

- Reference art boards archived in `docs/reference/assets-owner-2026-09-08/`; use with the existing no-handle green glass anchor. One supplied PNG was an error JSON; seven valid boards retained.
- Lost customers now show only a short numeric/icon coin + reputation toast, using actual clamped deductions and no explanatory/dismissal popover. Relevant docs are updated.
- Foundation review at `041cdc5` predates this steering; re-review the final diff before a clean/completed claim.

## Foundation review and next corrections

The independent CLI review of `30c0285..041cdc5` completed 2026-09-08 with findings, not CLEAN. Evidence: `.qa/review-foundation.txt` (local diagnostic); it predates owner steering at `5940ef2` and does not certify later commits. CLI 0.152 rejected the current model; CLI 0.153.4 with the repo wrapper's gpt-5.6-sol model completed. Native `exec review` rejects `--base` plus custom prompt, so the immutable range was specified in its custom prompt. Its returned format differs from the requested rubric; no clean gate claim is made.

| Finding | Disposition |
|---|---|
| Save drops domain events / command configVersion | Accept. Add a versioned shared history and actual v1 migration before changing rule semantics. |
| Tip should use minimum order patience | Reject with authority: 03-SPEC section 4 explicitly computes tip/payment per customer; the order timeout is the minimum. Add a mixed-table regression to preserve this distinction. |
| New shifts after earnings cap | Resolve against GDD section 10: existing service must credit zero at cap. Add explicit coverage of exhausted earnings vs remaining shift allowance. |
| Rounds must read all relevant config ranges | Accept; pin mixed-group precedence and preserve old replay semantics. |
| Hidden local game must pause | Accept local behavior described in 10-SPEC section 8 and GDD anti-idle. Keep real VN-day timestamps; do not implement pause by drifting the calendar. Server reconnect policy remains a separate M4 responsibility. |
| Queue gets order grace | Accept; grace belongs to placed orders. Version the timing change for old saved logs. |
| Early zero-tip customer classified late | Accept; classify by timing, and localize truthful no-tip feedback. |
| Corrupt-save recovery is a dead end | Accept; add validated import and a deliberate restart with preserved backup. |
| Grouped queue loss counts only one guest | Accept; use emitted customer count, with existing successful-serve reset. |
| No midnight cap regression | Accept; test earnings on each VN day and shift attribution on finalize. |

Additional checks completed: startup config rejects invalid levels, fractional stock/costs, zero-weight populations and invalid audio gain; UI exposes existing retail `one` restock; canonical sim now covers five seeds each for cold/full menu. Current verification: 17 unit tests + 6 browser tests; cold k 2.2702–2.5072, full-menu k 2.4662–2.6965. These corrections are not a completed-M3 claim.


## Review corrections — local history and time

Implemented after `681538a`, awaiting independent re-review:

- Save v2 persists emitted events and command-level config/rules versions. A fixture produced by the original `041cdc5` engine proves that v1 replay retains coins, reputation, IDs, glass ownership and a running second shift. Historical v1 commands retain their original rules; new commands use rules v2. Event replay permits additive diagnostic fields but rejects changed recorded values.
- Hidden/offline local play shifts gameplay deadlines while preserving wall-clock VN day keys. It does not spend stamina, expire orders, stale beer, or recover resting stamina. Visible sheets keep time running. The shift book excludes paused time and stops elapsed time at actual close.
- Queue patience no longer gets seated-order grace. Round selection reads configured bounds with mixed-group precedence: ngồi-lỳ, then vội, then VIP, then thường. Ngồi-lỳ samples the range; other non-hurried groups choose lower/upper via `pSecondRound`; vội samples its configured range when nonconstant.
- An available shift can open after the daily earnings cap; actual gameplay credit remains zero. Earnings straddling VN midnight use separate day buckets, while the shift count uses its closing day.
- Service timing and tip amount are independent: early zero-tip guests get early feedback without claiming a tip. Per-customer patience for tips is retained per 03-SPEC section 4. Clearing an already-served/expired table cannot fine it again.
- Recovery now validates imports before replacing saves and offers a deliberate fresh start; either path stores the original under a separate backup key before replacement. A failed validation/storage write leaves the current save intact. Three queued guests leaving count as three for onboarding.

Verification: `npm run verify` passes (26 unit tests). `npm run test:e2e` passes all 9 browser tests, including hidden/offline resume, invalid/valid import, confirmed fresh start, and numeric-only customer-loss toasts. Sim values after timing/round fixes: cold **2.3401 / 2.3249 / 2.3746 / 2.3481 / 2.4498**, full menu **2.7020 / 2.5748 / 2.4766 / 2.6760 / 2.6970**; at least 500 customer serve records per seed/profile. No M3 or release completion claim.

| Date | Change |
|---|---|
| 2026-09-08 | Addressed accepted foundation findings with versioned historical replay, local pause/recovery and targeted rule regressions; recorded false-positive tip disposition against 03-SPEC. Re-review pending. |

### Independent correction review follow-up — 2026-09-09

Codex reviewed `681538a..12afb011cb7c4f68b3bfa7ea866578b24f852985` and returned two findings: missing mixed-group/nonconstant-hurried round regressions, and an accidentally rewritten tracker v0.8.0 history label. The history label is restored; deterministic seed 8/9 mixed groups now prove ngồi-lỳ > vội > VIP > thường and both outcomes of a nonconstant hurried range. Unit suite: 27 pass. Focused re-review pending. The newer owner-directed layout/art work is a separate ongoing change, outside that immutable review.

Focused follow-up completed: **VERDICT: CLEAN** for `12afb011cb7c4f68b3bfa7ea866578b24f852985..830787c9633e149867053d1b915fb12d0b692bf7`. Both findings resolved. Evidence: `.qa/review-rounds-followup.txt`. This closes the recorded correction findings; it does not certify later uncommitted UI/art or unfinished milestones.

## Owner layout and illustrated art — 2026-09-09

- Applied the latest screenshot as a composition reference: tall blue hex-tiled playfield, illustrated Hanoi sides, compact HUD, owner/counter/equipment above the tables, right inventory rail and bottom actions.
- Orders open on table tap; their clocks keep running. Escape returns focus, switching to a sheet closes the panel, and order expiry closes it automatically. Customer departure still produces only the actual numeric/icon deductions. Whole-table service rules are unchanged.
- Ten original imagegen PNGs now cover the street, owner, ordinary customer, low blue table, red stool, three starter equipment objects, peanuts and nem chua. Full prompts/provenance live under `docs/reference/assets-owner-2026-09-08/`. Source alpha is retained; final image size/export optimization is pending. The original green glass set is unchanged. Neutral placeholders remain for the other 34 sprite entries, with IDs retained in the manifest.
- `npm run verify` passes: config, build, 27 unit tests, all ten sim rows within **k 2.3249–2.7020**. Final UI build and **11 E2E** pass, including 360×740, 390×844, 1280×720 and 1280×400; table hitboxes do not overlap. Popup keyboard/liveness/expiry, hidden/offline save recovery and numeric losses are covered.
- Visual screenshots at 390×844 and 1280×900 load all displayed images without horizontal overflow. `check:assets`: **116 entries, 34 sprite placeholders, 74 draft files**. Art remains draft; no release claim. Independent review of this UI/art diff follows its commit.

| Date | Change |
|---|---|
| 2026-09-09 | Closed the two correction-review findings at `830787c`. Applied owner layout/art steering, preserved gameplay economics and numeric loss feedback, added order-panel/short-window checks. Full game remains in progress. |

### Interaction verification follow-up

Browser measurement found the new stock rail buttons were only 38px wide. They
are now 46×48px, with an assertion at all four tested viewport sizes. Table-panel
focus records the actual opener and a stable table-button fallback: keyboard
switching between tables returns to the latest opener, while expiry returns to
the surviving table button after its order hint disappears. Build and all 11
E2E tests pass. These refinements follow `999dc57` and require review with it.

### Independent layout review and corrections

Review of `830787c..999dc57` returned six findings (`.qa/review-reference-layout.txt`):
hidden HUD labels, focus restoration, omitted grace time in the hint, hidden
special-customer identity in mixed groups, duplicate stools, and a missing chair
prompt. All are accepted and corrected: visually hidden accessible labels;
captured opener + stable fallback; one shared countdown formatter; VIP then
non-ordinary label priority; one sprite per actual seat; restored original prompt.

The browser suite now has **12 passing tests**. A production-engine-generated
save reproduces `[thuong, voi]` with no beer during grace, checking the urgent
label, matching live timers and disabled serving. Accessibility snapshots retain
coin/glass labels; actual seat counts and focus behavior are covered. The fixture
uses the same tsx loader as the unit/sim suite for Node JSON-import compatibility.

Four more customer drafts now replace the vội/VIP/ngồi-lỳ/Chí Phèo placeholders.
Opaque checkerboard edits were rejected before import. Accepted files retain
actual alpha; the VIP draft's soft halo still needs final art cleanup. Current
manifest: **116 entries, 14 generated sprite drafts, 30 sprite placeholders and
78 draft files including audio**. Prompts and provenance are in
`generated-customer-types.md`. Full-size image optimization/family review and all
remaining M9 work are still pending. This corrected UI/art snapshot awaits its
independent follow-up review; no complete-game or release claim.

### Layout/art review closed — 2026-09-09

The independent follow-up reviewed the entire immutable range
`830787c9633e149867053d1b915fb12d0b692bf7..2d80437b493ee1628f851e9e57aeed6d68369706`
and returned **VERDICT: CLEAN**, confirming all six prior findings are corrected
and finding no remaining introduced correctness, accessibility, responsiveness
or security defects. Evidence: `.qa/review-layout-followup.txt` and its log.

Final verification remains green: config/build, **27 engine tests, 12 browser
tests**, ten sim rows at **k 2.3249–2.7020**, and asset-manifest validation. Latest
390×844 and 1280×900 screenshots load every displayed image, with six seat
sprites for six configured seats and no horizontal overflow. The subsequent
documentation receipt only records this verdict and removes an extra EOF blank
line from provenance; it changes no gameplay/rendering code.

Next: implement the well-rested credit lifecycle with historical replay preserved.
Read-only diagnosis and a real pre-bonus v2 save/expected result from `2d80437`
are prepared under `.qa/next-m3-well-rested.md` and
`.qa/well-rested-legacy-v2-{save,expected}.json`. Full M0–M9 goal remains active.

### Mobile serving sequence — 2026-09-09, review pending

Owner IMG_5002–5006 now guide the service interaction. Bubbles show actual ordered
dishes/quantities with one patience bar; tapping opens the live dark-green panel,
ready dishes have checks, and the red button still serves the whole table. A
successful order shows one numeric/icon gain near the HUD, using the engine's
actual credited amount. Each customer gets the appropriate early/tipped, early
without tip, late, grace or stale reaction. Consumption time and special customer
identity stay visible; departed customers are removed from the scene during
cleaning. Loss feedback remains only actual numeric/icon deductions.

Short CSS entrances/pop motions are inferred from the static references and turn
off under reduced motion. No new dependencies, generated art, engine, economy or
save changes. The Tỉnh Táo mechanism remains next in M3; its pre-change legacy-v2
fixture and decision table are preserved in `.qa/next-m3-well-rested.md`.

Config/build and 27 unit tests pass; all 16 browser tests pass, including real
engine saves for multi-dish early/late/grace/stale results, actual balance/gain,
reload without replaying gain, reduced motion, existing four viewports and numeric
losses. Visual before/panel/after captures cover 390×844, 1280×720 and 1280×400.
A final visual refinement keeps the two dish icons on one bubble row; the final
build/check and independent review follow. Full M0–M9 goal is still active.

### Mobile service review closed — 2026-09-09

Independent Codex review of the immutable range
`fa792326b2d8563795c8c5c00492fc62cb8647a7..1e30b7816563b014e6a994433768de43ac03fc7b`
returned **VERDICT: CLEAN** with no introduced correctness, accessibility,
responsiveness or security findings. Evidence: `.qa/review-service.txt` and
`.qa/review-service.log`. The final two-icon row refinement and disappearing
customer regression are included in that reviewed commit.

Final config/build, **27 unit + 16 E2E** checks pass; no engine/economy/sim source
changed. Stable screenshots at the three recorded viewports confirm the before,
order-panel and after-service sequence. Existing art remains draft and the full
M0–M9 game remains in progress. Next mechanism: Tỉnh Táo credit/lifecycle with
legacy replay preservation; owner service UI is now verified and reviewed.

| Date | Change |
|---|---|
| 2026-09-09 | Closed owner mobile-service UI review at `1e30b78`; final 27 unit/16 E2E/config/build green, numeric departure feedback preserved. No merge/deploy/full-game completion claim. |

### Tỉnh Táo lifecycle and service credit — 2026-09-09, review pending

Rules v3 now grant the configured well-rested benefit after **strictly more than
6 hours** resting, once per successful **opening VN day**. The wall rest anchor
starts at account creation and resets only at finalization. Offline time counts
as rest but does not regenerate stamina; failed/full-stamina-blocked starts and
retries never consume a grant. Hidden gameplay moves the bonus deadline with the
shift; the exact deadline ends the benefit and hiding cannot revive it.

The bonus is `round((payment + tip) × mult) − (payment + tip)` per customer, routed
through existing counted `servePayment` after base payment/tip. The existing
credit helper applies the per-earn daily cap and all earning ledgers. Nominal and
actual bonus are audited separately; payment/tip remain the canonical k inputs.
Shift stats/Sổ ca show actual bonus. All customer bonus values are validated
before serving any member of the table. `shift.wellRested` owns numbers; duplicated
tip aliases must match. JSON remains 1.7.0, with no new config/source schema.

Save container v2 now accepts rules v3 while replaying original v1/v2 rules.
The **actual pre-change v2 fixture from `2d80437`** still restores amount 68,
coins 818, its old event IDs and unboosted shift; new play can earn a later grant.
The HUD purple timer shares the engine's remaining-time helper and supports both
locales. Existing departure and service feedback remain intact.

Verification: config/build, **38 unit tests**, **18 browser tests**. Both normal
and `npm run sim -- --well-rested` profiles pass five seeds × cold/full menus,
>=500 customer serves each. The boosted profile actually credits 822–1446 bonus
coins per run. Across both profiles k stays **2.3249–2.7020**; throughput is never
in the formula. Stable mobile screenshots: `.qa/rested-after-360-740.png` and
390×844 before/panel/after. A pre-existing browser assertion was corrected to
track the departed customer's ID, since random weather may let a new group take
the same table before the check; it still asserts the old sprite disappears.

GDD/08/10 now reconcile the outdated tip-only multiplier and finalize-day language
with authoritative JSON/08 formula, with append-only changelog rows. Independent
review follows the pinned commit. M3 still needs ejection accounting, segment
caps, shipper/football, full rush logic; M4–M9 remain part of the full goal.

### Tỉnh Táo review closed — 2026-09-09

Independent review of immutable range
`fe5e9dcb0a64bf747a115c615c3688d8d74afe90..c984541872a0879f2aba6682191824b23a2cbc55`
reported **no introduced correctness, replay/data-integrity, UI/accessibility or
security defects**, and independently ran all 38 unit tests and TypeScript
checking. Exact response is retained in `.qa/review-rested.txt` and its process
log. This was a no-findings review, with no follow-up product correction required.

Pinned-commit verification also passed `npm run verify`,
`npm run sim -- --well-rested`, and all **18 E2E** tests. The 20 normal/rested sim
rows stay within k **2.3249–2.7020**. Bonus HUD and book screenshots at 360/390px
have no horizontal overflow. Tỉnh Táo lifecycle/credit is now verified and
reviewed; F06/M3 and the full M0–M9 game remain in progress.

Next diagnosis is recorded in `.qa/next-m3-kick-close.md`: voluntary close fees
must include still-seated served guests without replaying automatic expiry
penalties. A real pre-change rules-v3 save at `c984541` proves the current free
close behavior (815→815, rep3, served1/lost0); its fixture will preserve historical
replay when the new close-fee rules are implemented. Single-table reputation
kicks, shipper and other remaining M3 mechanics are separate remaining work.

| Date | Change |
|---|---|
| 2026-09-09 | Closed independent Tỉnh Táo review at `c984541`; 38 unit/18 browser tests and normal/boosted simulations green. Continue manual close accounting and remaining full-game scope. |

## 2026-09-09 — Manual close fee and confirmation

Rules v4 quotes voluntary close via existing `customerValue().penalty`, including
served guests still consuming. `currentGuests()` excludes departed members of
occupied mixed tables, shared with the renderer. Unassigned seating/queue guests
cost zero without creating orders or consuming stock. Manual close records
`spent` and dismissal events, preserves reputation/lost/ranking, cancels pending
orders and releases glasses once. Insufficient coins, old shift IDs and costs
above the displayed maximum refuse before mutation. The live confirmation keeps
the shift running and returns to the book on natural finalization.

The real rules-v3 fixture from `c984541` preserves its prior free close result,
ledger and event IDs. New v4 saves replay exactly. Config/build and full browser
checks pass (22 E2E); unit/sim checks and visual captures are in `.qa/kick-*` and
`.qa/close-{360-740,390-844,1280-400}.png`. Final pinned verification and independent
review follow; the full M0–M9 goal and single-table reputation ejection remain open.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented v4 manual-close quote/confirmation and real v3 replay compatibility; full feature remains in progress pending independent review and remaining M3 mechanics. |

## 2026-09-09 — Manual-close independent review receipt

Product commit: `5bce63c5d4e9028ba05d4177a851d8f3122b7dec`; review base:
`858615e`. Independent Codex review `.qa/review-close.txt` returned **VERDICT:
CLEAN**, confirming scoped fees, ledger/replay/lifecycle and UI behavior. Reviewer
ran all **46 engine tests** and TypeScript checking. Its browser launch was blocked
by the review sandbox's server-port restriction; author-side full **22 E2E** passed
in the local runtime, including live/cancelled confirmation, insufficient funds,
natural expiry and remaining mixed-table guests.

`npm run verify` at the final product tree passed config/build/46 unit/normal sim;
boosted sim also passed. All 20 rows remain k **2.3249–2.7020**, with at least 500
serves each. Visual captures at 360×740,390×844 and1280×400 verified the confirmation;
its text/price use existing cream/gold tokens on the green sheet.

The tracked worktree is clean after this receipt (ignored QA and untracked dashboard
telemetry remain local). No merge or push to the original master checkout. The
manual-close mechanism is verified; F06, M3 and full M0–M9 remain in progress.
Read-only dependency diagnosis for the next mechanisms is `.qa/next-m3-mechanics.md`:
reputation ejection is separate; phone/shipper need LP conditions/dog progression;
closing-rush expiry and telegraph are a bounded clock correction still required.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent CLEAN for 858615e..5bce63c and final 46-unit/22-browser verification. Full-game goal remains active. |

## 2026-09-09 — Rush deadline and warning (review pending)

Rules v5 ends an existing rush at its deadline while closing, never starts a later
slot after admissions stop, and clears it on finalization. This also removes stale
rush multipliers before same-timestamp current commands calculate money. The
active slot is retained privately, including during legacy replay, so even later
same-kind overlapping slots cannot continue it during closing. HUD uses the shared
rushStatus projection and the active deadline; inactive time shifts that deadline.

Each slot emits a warning once at config.warningMs. The compact HUD announces the
warning once to screen readers; its native timer stays quiet between seconds,
prioritizes current rush over the next slot, and keeps serving/sheets live. Actual
v4 fixture from b97ff07 proves preserved historical result210/coins960/event IDs.
Config/build/55 unit tests and normal/boosted sims pass. Browser and pinned review
follow; full seeded scheduling/lunch/football/priority and the full game remain open.

| Date | Change |
|---|---|
| 2026-09-09 | Added v5 rush lifecycle and config-driven telegraph. Validation covers custom overlapping slots, hidden time, equal-timestamp migration and legacy replay; independent review pending. |

## 2026-09-09 — Rush clock independent review receipt

Reviewed full immutable range `b97ff076df10f8109b92da46d5997a216b8d94a2`
to `1c18b2d2422d7d94dc9c355ec8282d62b735ff11`. First review found one
accessibility issue: the next-slot live announcement could compete with an active
rush under custom overlapping schedules. The same active-first predicate now gates
both visible HUD and announcement; a production-shaped overlap browser regression
passes. Final independent output `.qa/review-rush-round2.txt` says:

> No actionable introduced defects found in the full immutable diff.

The reviewer did not emit the requested literal CLEAN marker; this receipt records
the actual no-findings conclusion, not a manufactured gate verdict. It independently
passed config, build, all 55 engine tests and normal sim. Its npm wrapper hit tsx IPC
sandbox restrictions and it did not rerun browser tests. Author checks on the final
tree passed config/build/55 unit/25 E2E; normal and well-rested simulations retain
k 2.3249–2.7020 across 20 rows, each with at least 500 serves.

Preview remains local on port 5174. No merge/push to the original checkout. Current
rush deadline/warning mechanism is verified; full F08 scheduling and the full
M0–M9 goal remain open. Next bounded prerequisite: dog purchase/upgrade for LP1.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded final rush review without actionable findings, accessibility regression and final 55-unit/25-browser checks. |

## 2026-09-09 — Dog purchase prerequisite (review pending)

The current local game can buy and advance the same guard dog through all three
config levels. One level field owns purchase state; the shared quote and spend
ledger enforce exact target/resources and emit audit events. Purchase does not
change rep, lifetime, season or daily earnings. Old actual saved histories still
replay. No circular LP1 gate is introduced; the starter needs a storage upgrade to
hold the first material requirement, and the UI routes to that existing panel.

Three native-alpha draft illustrations are saved in assets and selected by manifest.
A dog appears beside the owner after purchase. A VI/EN native sheet shows the next
level, coin/ingredient costs, available stock and direct restock/storage routes.
It closes on successful purchase; reduced motion disables the idle movement. Full
F18 combat/protection/capture/server and full M0–M9 remain open. Final config/build,
unit/sim/browser checks and pinned independent review follow.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented dog purchase/level progression and illustrated UI, advancing the LP1 prerequisite; full F18 remains partial and review is pending. |

Dog verification before review: `npm run verify` passed config/build/all60 unit
checks and normal sim; `npm run sim -- --well-rested` passed the boosted profile.
All20 sim rows keep k2.3249–2.7020 with at least500 serves each. Full28 browser tests
passed, including complete adoption/three levels, reload, all sprite alpha, VI/EN,
reduced motion and separate hitboxes at360×740,1280×720 and1280×400. Visual captures
`.qa/dog-yard-*.png` and `.qa/dog-panel-*.png` confirm the dog beside the counter and
scrollable native sheet. A 360px hitbox overlap discovered during testing was fixed
by narrowing/repositioning the new dog target. Asset validation:119 entries,32 paired
SFX,30 sprite placeholders,81 drafts; production art remains incomplete.

## 2026-09-09 — Dog purchase independent review receipt

Product commit `0216cb07122d135e5cc544c120300bdea6598178`; immutable base
`db83b84e69c71a37daca2919ce948dabb9dcdc1d`. Independent Codex output
`.qa/review-dog.txt` returned **VERDICT: CLEAN**. It independently passed build,
all60 unit tests, assets and normal sim. Its browser rerun was blocked by server-port
EPERM in the review sandbox; author-side full28 browser tests passed in the local
runtime, covering all three dog levels at360×740/1280×720/1280×400.

Final author verification: config/build/60 unit/28 E2E,119 asset entries,32 paired
SFX, normal+rested sims (20 rows, k2.3249–2.7020, >=500 serves each). No root-checkout
merge or push. Tracked worktree is clean after this receipt; ignored QA files and
untracked dashboard telemetry remain local.

The original full M0–M9 goal stays active. Full F18 combat/capture/protection/server
acceptance remains open; these effects are not claimed by the local dog purchase.
Read-only next-step authority/decision notes are `.qa/next-life-path-phone.md`:
LP1 needs lifetime+seats+dog; phone requires LP1; LP2 also needs upgraded stall+phone.
Reward claims, full meta conditions, shipper and remaining mechanics are unfinished.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent CLEAN for dog purchase/three-level UI and final 60-unit/28-browser verification; kept full-game goal and F18 remainder open. |

## 2026-09-09 — Life Path and phone/QR (review pending)

Rules v6 adds the full configured requirement/reward projection, monotone reached
levels and separately claimable rewards. Phone/QR purchases now use that gate with
exact IDs and the shared spend ledger; QR's existing whole-table tip multiplier is
reachable by purchase. Rewards preflight total coin/stock/token effects, reuse the
stock overflow helper and never increase day/season/lifetime service earnings.
Actual v5 fixture from d2918e9 preserves LP0/coins242048/lifetime68/events through
replay; the first v6 command recognizes eligible LP1. New v6 histories replay exactly.

The native VI/EN ladder displays real missing requirements and claimed/claimable
states. Two original imagegen draft sprites (keypad phone, paper QR) appear in the
business panel and on the yard after purchase; exact prompts are under owner
reference docs. No new dependency, screenshot-derived economy number or real-money
payment path was added.

Author config/build/66 unit tests pass; browser paths buy phone before claiming,
upgrade to LP2, buy QR, receive both rewards once in either order, reload and switch
locale. Full30 browser tests passed, including360×740 and1280×400; inspected captures
at360/390/1280px confirm scrollable sheets, readable states and separate yard targets.
Asset validation passes121 entries/32 paired SFX, with30 placeholders and83 drafts
still preventing production-art approval. Independent review follows. Four simulation
profiles (normal, rested, QR, QR+rested), two menus and five seeds each keep all40 rows
in k2.3249–2.7688, >=500 serves each. QR profile starts with QR owned to measure its
service effect; actual acquisition is covered separately by unit/browser flows.

F13 remains in progress: real season/peak, flyer/signboard producers, downstream
location gates and server claims still need integration. The later LP condition
and reward rows are tested at their pure-state boundary, not claimed reachable in
current play. Full M0–M9 goal remains active; shipper is the next phone consumer.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented v6 progression/claims and phone/QR producer with full config semantics and legacy replay proof; independent review pending. |

## 2026-09-09 — Progression review fixes (re-review pending)

Independent review of d2918e9..0e6d222 found two actionable issues: phone/QR gates
could depend on the milestone that requires that unlock, and English headings/peak
labels still showed IDs or Vietnamese names. Config now checks the dependency graph
including implicit previous-level edges and exact unlock references; earlier valid
gates remain accepted. All milestone/tier labels use VI/EN entries keyed by IDs.
Regression covers phone->LP2/LP7, QR->LP3, phone->QR cycles and English named labels.

| Date | Change |
|---|---|
| 2026-09-09 | Fixed both independent progression findings; full base-to-head re-review follows. |

Fix verification: config/build/all67 unit tests and normal10-row sim passed;
full30 browser tests passed after correcting a pre-existing nondeterministic test
assumption. The old first-shift test assumed all customers finish29s after closing;
a randomly arriving Chi Pheo can legitimately wait longer. It now drains the maximum
configured guest patience/grace/seating interval before asserting natural closure,
retaining every numeric-only loss assertion. No gameplay closing behavior changed.
Final typecheck and diff check pass. Previous rested/QR/QR+rested results remain
applicable: these fixes change invalid-config rejection and labels, not accepted
configuration economics.

## 2026-09-09 — Progression independent review receipt

Product tip `598f66fe64d84ea2d623241794cb042776055cbd`; immutable base
`d2918e98def7c2b6f0b5d5f90798b8b870536c10`. Independent review output
`.qa/review-progression-round2.txt` confirms both prior findings are addressed and
reports **no remaining actionable introduced defects** over the full pinned diff.
It independently passed67 engine tests and typecheck. The output did not use the
literal CLEAN marker; this receipt records the actual no-findings conclusion.

Final author evidence: config/build/67 unit/30 browser tests green; normal sim
re-run after fixes, plus unchanged rested/QR/QR+rested profiles give40 rows with
k2.3249–2.7688 and at least500 serves each. Assets pass121 entries/32 paired SFX;
30 sprite placeholders and83 draft files remain. Captures at360/390/1280px and the
English360px ladder confirm scrollable sheets and translated milestone/peak names.
First browser rerun exposed an old random closing-test assumption, corrected using
configured guest deadlines; all30 pass afterward. Original progression replay,
claim idempotency, crossed-gate validation and separate progress ledgers stay covered.

The full M0–M9 goal remains active. This is local progression/phone/QR readiness,
not full F13/server/season completion. No root-checkout merge or push. Next bounded
phone consumer is shipper; authority/probes are `.qa/next-shipper.md`, genuine
pre-change v6 phone-owned history is `.qa/legacy-shipper-v6*.json`, and an original
shipper draft/provenance is `.qa/shipper-art-draft.md` (not yet a product asset).

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent no-findings review d2918e9..598f66f, both review fixes and final67-unit/30-browser evidence; full-game goal continues with shipper. |


## 2026-09-09 — Shipper delivery rules v7

Base `ef0c0532bd0af0e9b5c8ca9775e9d41e5a2ab0c4`, same isolated branch. One phone-gated
DeliveryOrder runs outside tables, glasses and queue. Seeded finite bundles obey
configured unit/gross bounds and shown final menu prices. Exact-id whole-stock handoff
uses the shared serve ceiling and credit projection; actual capped net/rested bonus
are audited separately. Timeout charges available coins only, numeric loss feedback;
closing waits for the active delivery, kick-all refuses before debit. Hidden time
moves deadlines. True v6 fixture from598f66f keeps historical money/events unchanged.

The shared native SheetDialog now closes during layout cleanup, before removal, so
successful service restores phone focus. Mobile/low-height browser checks cover the
live deadline, missing stock refill, one handoff, reload, VI/EN, expiry and close gate.
Original courier draft is supplied as native alpha with exact prompt provenance;
manifest122 assets/32 paired SFX,30 sprite placeholders/84 drafts remain.

Evidence: `.qa/shipper-verify.txt`, `.qa/shipper-e2e.txt`, `.qa/shipper-sim*.txt`;
76 unit/33 E2E plus30 normal/shipper/shipper+rested+QR sim rows, each >=500 seated
serves. k2.3191–2.8154; every shipper row also records17–39 completed deliveries.
The first verify invocation aborted in its npm sim child (Abort trap6); both explicit
shipper invocations and the full canonical verify rerun succeeded. No code change or
test relaxation was needed for that transient process failure. Added separate tests
for shared service cooldown/no backlog and natural exhaustion; full checks rerun below.

Actual captures `.qa/shipper-{yard,panel,urgent,gain}-{360,390,1280}.png` inspected:
readable courier/clock/ingredients,44px non-overlapping phone target, scrollable sheets
at400px height. Progress track widened after visual inspection. Independent review is
pending; full M0–M9 remains active and no root merge/push occurred.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented local shipper v7 and original courier art, documented weather-frequency clarification and delivery closing contract; independent review pending. |


## 2026-09-09 — Shipper review correction

Independent full-diff review `ef0c053..32a23df` found one P2: an accepted config could
retarget shipper.requires to QR and then remove phone from QR's configurable gates.
That bypassed the binding phone prerequisite. Config validation now requires exactly
`phone`; a regression starts with an otherwise valid retargeted QR gate, proves it
loads, then proves changing only shipper.requires to QR is rejected. Canonical JSON,
accepted delivery arithmetic, UI and old fixtures remain unchanged. The reviewer
independently passed76 tests/typecheck; author final config/build/77 tests/normal sim
pass in `.qa/shipper-verify-round2.txt`. The prior33 browser tests and20 shipper sim
rows remain applicable because this correction only rejects the invalid prerequisite.
Full original-base review of the corrected product is pending.

| Date | Change |
|---|---|
| 2026-09-09 | Closed the review's phone-prerequisite bypass at config validation, added a valid-QR-gate regression; full-diff re-review pending. |


## 2026-09-09 — Shipper independent review receipt

Product tip `307a3b0cc13ce21d13beda32f461ba973597c620`; original immutable base
`ef0c0532bd0af0e9b5c8ca9775e9d41e5a2ab0c4`. Independent full-diff round2 output at
`.qa/review-shipper-round2.txt` says **Rubric CLEAN: the full immutable diff introduces
no actionable defect**. It independently passed the build and77 engine tests, using
node --import tsx after the sandbox CLI IPC restriction. The sole first-round finding
(phone prerequisite substitution) is fixed at config intake and regression-covered.

Author checks: config/build/77 unit/33 browser tests green;30 normal/shipper/boosted
shipper sim rows with k2.3191–2.8154 and>=500 seated serves each. Every shipper variant
also completed17–39 deliveries. The final fix rejects only an invalid configuration;
previous33-browser and20-shipper-sim results remain valid. Asset manifest122 entries,
32 paired SFX,30 sprite placeholders and84 draft files; complete release art/audio
approval remains unfinished. Actual360/390/1280 captures and native focus checked.

The full M0–M9 goal stays active. Local shipper is verified, not all of F07/M3 or the
server/metagame. Root checkout was preserved; no merge or push. Read-only next-M3
intake is `.qa/next-m3.md`; genuine active v7 delivery save/expected fields captured
from this product at `.qa/legacy-delivery-v7*.json` for future replay regressions.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded full-diff shipper CLEAN review ef0c053..307a3b0 and final verification; continuing full-game roadmap. |

## 2026-09-09 — Seeded ordinary rush schedule and reports v8

Immutable base653548438d67decde8ee9fbbcc471591cd0eb7f7. New openings balance/shuffle
ordinary light/heavy slots with a separate location/shift/VN-day seeded RNG, reserve
full durations/warnings, and refuse impossible layouts before opening mutations.
Heavy arrivals apply existing enjoyMult. End reports derive once from actual event
intervals; Sổ ca renders served/lost/actual credited coins, with nominal pay/tips
kept separate. Genuine pre-edit v7 captures preserve old overlapping slots/history.
No canonical JSON values changed and no contextual lunch/football window invented.

Author verification: npm run verify green (config/build/85 unit/normal k + pressure),
34 browser tests green. Test evidence: .qa/rush-schedule-verify.txt and
.qa/rush-schedule-e2e.txt. Normal/QR/rested/shipper/combined headless runs total50 rows,
each>=500 seated serves; k2.2622–2.7625. Separate sim:rush has15 controlled sunny
windows at initial devices: normal0% loss, light5.3–37.0%, heavy50.0–70.2%, with spawn
floor/service ceiling/report parity assertions. Those window outcomes are not full
arrival cohorts or final playtest acceptance. Hosted Alpha evidence remains separate.

Actual warning/active/book/EN screenshots inspected at360/390/1280 widths, including
1280×400 short window; completed report rows fit the native scrolling sheet. Assets
check passes122 entries/32 paired SFX,30 sprite placeholders/84 drafts unchanged.
Independent full-diff review pending. Tracker v0.12.0 keeps16 features in progress,
zero complete; full M0–M9 goal remains active, root preserved, no merge/push.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented seeded ordinary rush planning/report UI, legacy replay, pressure experiment and verification; independent review pending. |

## 2026-09-09 — Rush schedule/report independent review receipt

Immutable reviewed diff 653548438d67decde8ee9fbbcc471591cd0eb7f7..5e46cf16383afaa966d671b096e75d02945ceebf.
Independent Codex review completed at .qa/review-rush-schedule.txt: "No actionable
introduced defects were found." It reviewed source, tests and author verification
logs; this receipt does not claim that the reviewer independently reran the suite.

Author config/build/85 unit/34 browser tests and asset check passed.50 economy rows
remain within k2.2622–2.7625 (>=500 seated serves each);15 separate controlled pressure
windows pass demand/loss ordering, spawn floors, service ceiling and report parity.
Actual VI/EN report sheet captures include360/390px mobile and1280×400 low window.
No product changes were made during review. The original rules8 active-delivery
fixture was additionally captured in .qa/legacy-delivery-v8*.json from the reviewed
product for the next save regression. Tracker v0.12.1/dashboard stay16 in progress,
zero full features complete. Full M0–M9 continues; no root merge/push.

Next bounded intake: .qa/next-signboard-intake.md. It corrects an earlier provisional
reading of golden reputation: GDD/original call it a gate, not a debit. The next
implementation must preserve this authority and separate business effects from
donation cosmetics. Lunch/football, other M3 and M4–M9 remain in the full scope.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent no-finding full-diff review6535484..5e46cf1 and all rush verification; continuing the full-game goal. |

## 2026-09-09 — Business signboard rules v9

Base bdbb493525e5ce336eb7146b2cf4e092cb420172. Implemented installation after configured
Counter gate, five owned/equipped business styles, Golden reputation purchase
threshold (not debit), canonical quote/spend and future-arrival/delivery-cadence
effects. Same-time changes preserve guests/orders/deadlines; owned re-equip is free.
Exact genuine v8 delivery/rush histories remain unchanged before current commands.
No canonical JSON changed, no donation power or paid unlock introduced.

Author npm run verify passed: config/build/92 unit/normal10-row sim/15 pressure
windows. New tests include6000 actual seeded first groups across no-sign/five styles,
VIP cap, retuned config validation, exact cost/gate/idempotency, live timers, old/new
replay.37 browser tests passed (.qa/signboard-e2e.txt), including installation,
rep-gated Golden after a real serve, free switching, focus/reload/VI–EN at360/390/
1280×400. Actual screenshot sets .qa/signboard-{install,gate,yard,en}-{360,390,1280}.png
inspected. Five original native-alpha1536×1024 sprites and paired upgrade SFX mapping
bring manifest to127 entries/32 SFX pairs,30 placeholders/89 drafts. Release QA remains.

Separate110 sign sim rows (five styles alone and with QR+shipper+rested; one Golden
QR+shipper profile) all>=500 seated serves, k2.3072–2.8616. Logs .qa/signboard-*-sim.txt.
These prove the local measurement band, not hosted Alpha/final full-game balance.
Independent full-diff review pending. Trackerv0.13.0 keeps full F10/M0–M9 in progress;
root preserved, no merge/push. Next M3 work includes flyers and remaining upgrade
flows, followed by the full server/meta/risk/events scope.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented and verified business signs, native sprites/VI–EN UI and replay/economy evidence; full independent review pending. |


### Signboard independent-review correction

First independent review at6e390be found one P2: a registry with only VIP/voi weights
and Vintage voiWeightMult0 passed intake, then exhausted eligible weights after the
VIP group cap (seed5). Config now checks the remaining non-VIP pool whenever a table
can hold more than that cap. A cap covering every possible group remains valid.
Regression exercises the actual baseline group, rejects the sign-zeroed pool at caps
1 and0, and accepts the unreachable-cap case. No spawn fallback or VIP-cap bypass,
no canonical economy number changed. Full original-base re-review pending.


Correction verification: npm run verify passed config/build/93 unit/10 normal sim
rows and15 rush-pressure windows (.qa/signboard-corrected-verify.txt). The existing
VIP-only round-range fixture now declares a cap covering all table levels, so the
fixture remains safe after upgrades while preserving its single-guest round check.
Previously passed37 E2E and110 style sim rows remain applicable: the correction only
rejects unsafe imported configurations; accepted canonical gameplay/UI is unchanged.


### Signboard second-review corrections

Full-base round2 atf861417 found two further P2 boundaries. Registry intake now
requires upgrades.stall.signboardGateLevel to equal canonical signboard.gate.stallLevel;
a synchronized override is tested through actual install. signboardQuote now checks
spent+cost only in open/closing shifts, exactly matching the existing spend handler.
A real command sequence with large valid prices buys Neon during a shift, serves to
reach LP1, claims its configured reward, refuses active-spend overflow, closes the
shift, then buys Vintage without changing historical stats; the full log replays.
These are import/purchase-boundary repairs, not canonical economy-number changes.
Original-base independent re-review remains required before closing this slice.


Round3 author verification passed: config/build/95 unit/10 normal k rows/15 pressure
windows (.qa/signboard-r3-verify.txt) and all37 E2E again in31.7s
(.qa/signboard-r3-e2e.txt). The earlier110 sign sim rows still cover unchanged
canonical formulas/styles. No product mutation during prior independent reviews.


## 2026-09-09 — Business signboard review receipt

Immutable base bdbb493525e5ce336eb7146b2cf4e092cb420172 → final product
923900741e32def42ad0c37ddefafaa676d8c6ef. The independent third full-base Codex review
(.qa/review-signboard-r3.txt/log) returned: "The full immutable diff is free of
introduced actionable defects." The reviewer independently passed typecheck,
95 unit tests, config validation via node --import tsx (no IPC), config coverage
and asset validation. Its native prose verdict is retained without inventing a
rubric marker. The two earlier reviews/fixes remain documented above.

Author final config/build/95 unit/37 E2E and normal10-row k +15 controlled pressure
windows passed.110 style economy rows remain applicable to unchanged canonical
formulas, all>=500 served each and k2.3072–2.8616. No tuning number changed. Runtime
manifest remains127 entries,32 paired SFX,30 placeholders/89 drafts: full art/release
is unfinished. No product changes during any independent review. Tracker v0.13.1
and dashboard keep16 features in progress and zero full features complete; full
M0–M9 goal remains active. Preview is http://127.0.0.1:5174/, no root merge/push.

Next intake: .qa/arrival-interval-contract.md, then .qa/next-flyer-intake.md. A read-only
probe found ordinary rush.none.floorMs clamps the configured hot/humid and future
flyer demand modifiers; the next slice must reconcile/document that formula before
wiring marketing. Genuine rules9 hot/humid histories were captured fromf861417 for
replay evidence; original Neon history from6e390be is preserved. Neither is a
fabricated fixture from a future implementation. An original builtin flyer draft
is staged at .qa/assets/flyer-bundle.png (1254×1254 RGBA alpha0–255), prompt at
.qa/flyer-prompt.json; it is not a runtime asset yet. Integrate/provenance/manifest
with the flyer producer after the arrival correction, not this frozen signboard diff.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded full-base independent no-finding review bdbb493..9239007, final95 unit/37 browser verification and preserved the full-game backlog. |


## 2026-09-09 — Ordinary arrival cadence rules10

Base2959544. Reconciled GDD9 weather demand with the generic floor formula: ordinary
cadence now applies weather to max(baseMs, none.floorMs), while active Rush still
clamps after its multipliers. Per-customer group size is applied once before one
rounding step; first-group warmup and pending nextSpawnAt stay intact. One pure
arrivalIntervalMs helper is used by scheduling and config intake. Import validation
rejects rounded-zero and unrepresentable single/group intervals for every mode.
Config1.7.1 changes only version/date/formula text; all645 numeric leaves match the
base (.qa/arrival-numeric-parity.txt). No new gameplay tuning values or state fields.

Full suite exposed four mixed-version replay mismatches: prior code switched to
new rules before replaying elapsed time already played under the old version.
Incoming rules10+ now advances with the previous version first, then switches at
its command timestamp. Historical1–9 retain their original ordering. Real v9
hot/humid captures fromf861417, augmented with actual legacy ticks before the new
command, preserve every world/event field and next deadline through exact replay.
Existing old rush/shipper tests pass unchanged except latest protocol assertions.
An additional real v9 installed-Neon capture from6e390be also passes projection,
free re-equip/pending shipper+arrival continuity and replay (.qa/arrival-legacy-sign-check.txt).

Author verification: npm run verify passed config/build/100 unit tests, normal
10-row sim and15 controlled pressure windows (.qa/arrival-verify.txt);37 E2E passed
in33.8s (.qa/arrival-e2e.txt). Five focused tests exercise75 actual ordinary groups
across five weather/five seeds,12 controlled rush/perCustomer cases, retuned baseline
knobs, invalid interval imports and historical/current replay.20 total economy rows
(normal plus Golden/QR/shipper/rested combined), all>=500 served each, k2.2417–2.8097
(.qa/arrival-combined-sim.txt). Controlled sunny pressure retains its demand/loss
ordering, floors and service ceiling. These are local checks, not final hosted
release evidence. Full independent review pending; tracker v0.14.0/dashboard stay
16 in progress, zero full features complete. Full M0–M9 remains active. Next is
actual flyer stock/purchase/use/timer/report; its original draft is already staged
outside runtime. Root untouched, no merge/push.

| Date | Change |
|---|---|
| 2026-09-09 rules10 | Corrected ordinary floor order and mixed-version elapsed-time adoption, verified100 unit/37 E2E +20 k/15 pressure rows; independent review pending. |


## 2026-09-09 — Arrival rules10 independent review receipt

Product432626dc11b4ce9ba8311b02a2541fcc48cd735c; immutable base
29595446c9e9b64b1e3dbb2ec4ff01dafd113cb8. Codex exec review exited0 with
no introduced actionable correctness or binding defects in the full diff
(.qa/review-arrival.txt, .qa/review-arrival.log). It independently passed
100 unit tests, config validation and typecheck. Native prose verdict retained;
no manufactured review marker. No product changes during review. Author build/
37 E2E/20 economy rows k2.2417–2.8097 and15 pressure windows remain applicable.

Tracker v0.14.1/dashboard retain16 in progress and zero full features complete.
Full M0–M9 goal remains active. Next: flyer producer using the now-reviewed
arrival helper, real reputation spending and event-derived campaign reports.
Root untouched; preview5174 remains local, no merge/push or hosted-release claim.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent no-finding arrival review2959544..432626d and continued full-game backlog. |


## 2026-09-09 — Flyer campaign rules11

Base360453e. Implemented buyFlyer and exact-shift activateFlyer with one shared
quote: configured LP2 gate, scaled reputation cost, cap, per-shift allowance and
safe preflights. First acquisition records persistent LP ownership, stock is consumed
once. No coin faucet, forced customer type or patience change. Shared arrival helper
stacks campaign demand before active Rush floors; first/pending arrival schedules
remain intact. Campaign lives in its owning shift, pauses while hidden, continues
through closing for seated service and ends once at expiry or early finalization.
Reports reuse the existing event-window summarizer, exclude shipper/rewards and
separate actual credited revenue from nominal tips. Rules10's adoption boundary is
unchanged; protocol11 adds no fields to original historical worlds until produced.
True v10 hot/humid and Neon fixtures captured from432626d preserve stored projections.

Native VI/EN sheet from Upgrades/stock strip/book, immediate close on activation,
live yard timer, report and44px targets. Original1254-square RGBA flyer sprite copied
without pixel changes; prompt/provenance tracked, paired existing upgrade SFX wired.
Manifest128 entries/32 paired SFX/30 placeholders/90 drafts; release art is unfinished.

Author verify currently passes config/build/108 unit +normal10 k/15 rush-pressure
rows.30 combined economy rows (normal, flyer, flyer+Golden+QR+shipper+well-rested),
all>=500 served, k2.2417–2.8783; profile setup isolates canonical effects while actual
buy/use/serve commands execute.20 controlled90s windows show higher demand and zero
earnings without serving (.qa/flyer-pressure.mjs/.txt). Focused browser3 layouts
passed purchase/rep debit/actual service/report/locale/reload; final full40 E2E passed
in43.5s (.qa/flyer-e2e.txt), final build passed (.qa/flyer-final-build.txt).
Independent full-base review pending. Browser fixture reaches LP2 via real table/dog/stall/
service/phone commands; its thresholds/cost are retuned for bounded QA, not production.

F17 daily5/5 free-flyer claim awaits its real quest/gift producer, no fake claim
endpoint; server/social and full M4–M9 remain active scope. Tracker v0.15.0 retains
16 in progress, zero full features complete. Root untouched, no merge/push.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented local flyer producer, original sprite/UI and config/replay/campaign checks; final review pending. |


## 2026-09-09 — Flyer rules11 independent review receipt

Immutable base360453e through productd5be3e06c7e6b6a8c1d9b5ccfd94603fa598cc90.
First review exited0 and reported only a P1 claiming raw repBase300 was being charged
instead of750. Direct runtime evidence disproved it: config.ts260–277 already scales
all Base fields once into c.values; flyer.ts7 reads that scaled value. Actual quotes
and commands at k2/2.5/3 charge600/750/900 and reduce exactly that much reputation
(.qa/flyer-scaling-proof.txt). Multiplying again would overcharge. No product patch
was made in response to this false positive.

Second independent full-base review exited0 (.qa/review-flyer2.txt/.log):
"No introduced actionable defects found." It explicitly withdrew the scaling claim
after executing raw300→values750→quote750→rep750-to-zero, and independently passed
13 focused flyer/arrival tests. Native verdicts from both rounds are preserved;
no synthetic gate marker or fabricated clean round. Product remained immutable during
both reviews. Final config/build/108 unit/40 browser tests and30 k rows remain green:
all>=500 served, k2.2417–2.8783.20 controlled90s campaign windows verify higher demand
and zero automatic earnings;15 existing rush-pressure windows remain green.

Original sprite SHA matches native generation; canonical economy seed is identical
to360453e. Real active/ended rules11 save captures fromd5be3e0, including hidden time,
are prepared for the next protocol revision at.qa/legacy-flyer-{active,ended}-v11*.json
with full expected worlds (.qa/capture-flyer-v11.mjs). Next F17 diagnosis is indexed
in.qa/f17-next-intake.md; no F17 writer started before this review closed. The real
daily5/5/social reward path and all M4–M9 work remain required. Do not raise the glass
buyCap merely to make purchasing available: canonical start equals buyCap10 and
extra storage is for chairman gifts.

Tracker v0.15.1/dashboard retain16 in progress, zero complete full features. Preview
http://127.0.0.1:5174/ responds200. Root unchanged; no merge/push or hosted-release
claim. Full-game goal remains active.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded full-diff no-finding follow-up review, runtime dismissal of false scaling report,108 unit/40 E2E/30 k-row evidence and preserved next F17 scope. |


## 2026-09-09 — Daily quests rules12, review pending

Base3f978ec. Pure daily generation from canonical five-row definition (3 seeded
core +2 fixed), pinned VN day/current season tier and independent RNG. Curve targets
round up to reachable integer counts, reward Base values use the existing shared
loader once; JSON1.7.1 and balance numbers unchanged. F17 section10 is the durable
progress/claim decision table; stale all3 bonus text in GDD/F17 now follows bonusAll5.

One engine event observer accounts actual customer/table/delivery service, finalized
shifts, same-day full rush/VIP observation and active zero-loss windows. Midnight
expires claims even across a ca; hidden time freezes gameplay while the calendar
advances. Exact day/id, idempotency and safe integer checks protect claims. Rewards
use existing quest credit/changeRep and do not alter season/lifetime/day counted
ledgers. Bonus checks all5 and available flyer/shard capacity before any mutation;
free flyer stamps persistent ownership. No public gift/progress assertion command.
The trusted gift observer is a contract awaiting real social transfer; four local
quests cannot earn five-of-five. Attendance/referral/server/full F17 remain required.

Optional daily state and protocol12 preserve earlier saves; genuine active/ended
flyer rules11 fixtures captured fromd5be3e0 validate exact historical world/events,
then current adoption and next-shift quest generation. Test fixtures retune thresholds
for bounded service checks; they do not change production numbers. Existing hidden
regression now expects only new calendar-generation events, with no hidden progress.

Native notebook action and VI/EN sheet, five progress rows, claim/claimed/locked states
and free-flyer bonus. Existing paired upgrade SFX; no new dependency or image asset.
Visual checks at360×740,390×844 and1280×400 confirmed readable scrolling sheets; progress
bar max-width locally overrides the old170px stock bar limit. Departure numeric
coin/reputation toast and whole-table serve behavior remain covered by the full suite.

Author verification: config/build/118 unit tests passed (.qa/quests-verify.txt);
44 E2E passed in48.4s (.qa/quests-browser-full.txt).20 economy rows (normal plus
flyer/Golden/QR/shipper/well-rested), all>=500 actual serves, k2.3171–2.7312;
15 controlled rush-pressure rows pass.128 assets/32 paired SFX;30 placeholders and90
drafts still keep art release open. Independent full-base review is next; no claim
that the complete feature or full-game goal is finished. Tracker v0.16.0 has17 in
progress. Root untouched, no merge/push/hosted release.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented local daily generation/progress/claims/UI and preserved rules11 replay, with118 unit/44 browser/20 k rows; final independent review pending. |


### Daily review correction — onboarding reveal

Independent first review of3f978ec..a22fa90 exited0, with one actionable P1:
quest yard/book buttons appeared before `onboarding.featureReveal.questsAfterShifts`.
Confirmed against F27 section2. Fixed both entries and panel rendering with one
shared presentation predicate reading the loaded threshold, bypassed only when
onboarding is disabled. Engine generation/progress/claims remain unchanged.
Two new browser regressions use actual opened/finalized shifts with onboarding on:
canonical threshold2 and retuned3, both entry points and reload. Both passed; focused
build/config passed. Full46 browser rerun passed in47.6s (.qa/quests-browser-full2.txt); independent
full-base follow-up pending. Existing118 unit/20 k-row evidence is unchanged because
this correction only affects UI reveal and browser tests.
Original reviewer output retained at.qa/review-quests.txt/.log; no synthetic verdict.

| Date | Change |
|---|---|
| 2026-09-09 | Fixed confirmed quest-reveal P1 from independent review; enabled-onboarding regressions cover configured2/3 shift thresholds. |


## 2026-09-09 — Daily rules12 independent review receipt

Immutable full-base review3f978eccefeab6208f5ba39262119952aaee11a6 through
producte551b409bb6348dcf557ef5e16ad85621a7c1ef9. First round found one real P1:
progressive onboarding reveal was missing. Corrected yard/book/panel with one
configured predicate and actual2/3-finalized-shift browser checks. Follow-up review
exited0 and reported: "no introduced actionable defect was found." It independently
ran all118 engine tests, focused quests, typecheck and production build. Native
outputs preserved in.qa/review-quests.txt and.qa/review-quests2.txt with full logs;
no fabricated clean-tail marker. Product was immutable during each review.

Final author evidence: config/build green,118 unit tests,46 E2E in47.6s;
20>=500-serve economy rows k2.3171–2.7312 (normal and combined flyer/Golden/QR/
shipper/well-rested),15 rush-pressure rows. Follow-up correction was UI-only;
engine and canonical JSON are byte-identical toa22fa90. Complete scrolling bonus
area was also visibly checked at390×844 and1280×400 with44px button reachability
(.qa/quests-bonus-scroll.txt/.png); normal quest sheets at360/390/low1280 are readable.

Canonical current-rules captures froma22fa90 (unchanged engine) are ready for the
next protocol: actual6 table-order service claim and hidden midnight rollover, with
full expected worlds and source SHA (.qa/capture-daily-v12.mjs/.txt and
legacy-daily-{claimed,hidden-rollover}-v12*.json). Attendance diagnosis in
.qa/attendance-next-intake.md separates observed attendance from claiming; no
attendance implementation/reward is claimed yet. M4 authority orientation also
exists in.qa/server-next-intake.md; no server product was written in this slice.

Tracker v0.16.2/dashboard retain17 in progress, zero complete full features. Daily
quests are playable after configured onboarding reveal; real social gift producer,
attendance/referral, server seasons and all remaining M0–M9 scope continue. Root
read-only refresh still showsbc79af5 and pre-existing WIP preserved. Local5174
responds200; no root merge/push, hosted release or complete-game claim.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded clean full-base daily review after onboarding correction,118 unit/46 E2E/20 k rows, genuine v12 saves and next attendance intake. Full-game goal remains active. |


## 2026-09-09 — Attendance rules13 local implementation

Base483bb03a75b0f767a2554a8a9e0caf75b6d2da68; isolated game worktree only.
Attendance now observes active VN dates, independently of reward collection. The
existing configured reputation array drives the ladder, wrap and reward amounts;
loginMissResets controls gaps. Missed collection expires without breaking an
observed-day streak. Hidden time records no visits/rewards; return resolves today's
slot. Explicit current-date claim uses the shared reputation preflight/changeRep,
with exact-once claim audit. No coins or earning ledgers are credited.

Local boot records an active visit before a shift. Existing daily sheet hosts the
VI/EN ladder with claimed/passed/current/future text, one claim action and reward
sound/toast. It retains the configured onboarding reveal. Rules1–12 full history
remains replayable; genuine a22fa90 daily-claim/hidden-rollover fixtures compare the
entire old world and the single additive current attendance stamp. Fixed arrival
adoption boundary remains10. No canonical JSON or balance number changed.

Author verification: npm run verify green (config, production build,126 unit,
10 ordinary >=500-serve k rows and15 controlled rush-pressure rows). Combined
flyer/Golden/QR/shipper/well-rested adds10>=500-serve rows, actual deliveries,
campaigns and bonus credits. Combined20-row k range2.2564–2.8277, within2–3.
All52 browser tests pass after correcting an old eager image-load assertion:
52-test first run had51 pass/one sign-image decode race; all four existing image
checks now poll the same complete/naturalWidth condition, no relaxed assertion.
Final typecheck green. Dedicated attendance8 unit/6 browser checks cover claim
retries, real-midnight wrap, missed/skip-claim days, configurable no-reset, inactive
return, safe overflow, genuine legacy replay, new visit without shift, VI/EN and
360×740/390×844/1280×400 scrolling and44px actions.

Native logs: .qa/attendance-verify.txt,attendance-combined-sim.txt,
attendance-e2e.txt/attendance-e2e2.txt,attendance-assets.txt. All128 assets and32
paired SFX pass manifest checks;30 placeholders/90drafts remain release work.
Attendance screenshots at.qa/attendance-{360,390,1280}.png visibly checked.
Tracker v0.17.0/dashboard retain17 in progress; corrected the stale summary count
to match actual rows. Independent full-base review is next. Social/referral,
authoritative server and every remaining M0–M9 deliverable remain in scope.
Read-only root stillbc79af5 with original WIP; no merge/push/hosted release.

| Date | Change |
|---|---|
| 2026-09-09 | Added rules13 attendance, explicit reputation claim, old-save adoption and VI/EN ladder;126 unit/52 browser/20 k rows pass. Independent review pending; full-game goal remains active. |


## 2026-09-09 — Attendance rules13 independent review receipt

Productd232be53f220a3e59041b2299d72f8c95c330bc7, full immutable base
483bb03a75b0f767a2554a8a9e0caf75b6d2da68. Independent Codex review exited0
without introduced actionable findings. Native final text states that the nonempty
diff implements configured attendance without violating binding rules, and that
focused attendance, all126 engine tests, config validation and production build
pass. Outputs retained at.qa/review-attendance.txt/.log, exact prompt alongside;
no synthetic clean marker was added. Product remained immutable during review.

Reviewer could not bind browser test port4178 in its read-only sandbox (EPERM).
It inspected the author's actual52-pass browser and20-row simulation logs; these
remain author-run evidence, not an independent browser execution. Full author
checks: config/build/typecheck,126 unit,52 browser,20>=500-serve k rows2.2564–2.8277
and15 rush-pressure rows. Asset check128 entries/32pairedSFX;30placeholder/90draft
release work remains. Preview5174 responded200. No root merge, push or hosted test.

Genuine current-protocol captures from immutable d232be5 preserve a claimed day6
with unclaimed days2/4 and a hidden three-day gap, full expected worlds and source
SHA (.qa/capture-attendance-v13.mjs/.txt,legacy-attendance-{claimed,hidden-gap}-v13
files). These support the next replay revision; no future protocol is claimed.
Read-only next-intake notes cover kitchen M3 gaps and the actual ten-glass buy cap.
The six-table/tenth-priced-seat gap must not be filled with invented prices.

Tracker v0.17.1/dashboard retain17 active full features and zero full-feature
completion claims. Local attendance branch is reviewed; remaining F17 social,
referral/sign-in integration and all server/risk/events/art/release M0–M9 scope
continue. Next implementation priority is the existing kitchen prep pipeline's
missing live presentation and focused intermediate-level/deadline checks; use
.qa/kitchen-next-intake.md as orientation, re-read live source before admission.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent attendance review without findings,126 unit/52 E2E/20 k rows and true v13 compatibility captures; full-game goal remains active. |


## 2026-09-09 — Live kitchen and hot-dish assets

Base f9fa82f3b667e54873d35ff7110945daba8576d1. The read-only kitchenStatus
projection exposes existing Item states/readyAt without a second queue, scheduler,
command, RNG draw or replay revision. Owned stove on the yard, accessible kitchen
entry through upgrades (including level0), VI/EN live occupancy/countdowns and
stock/queued/ready states now route to the existing whole-table order popover,
restock sheet and upgrade command. Preparing completion at/after normal patience
warns; pending jobs have no promised ETA. Served/expired orders cannot retain dish
links. Numeric/icon-only departure feedback remains unchanged.

Seven original built-in image_gen calls replaced kitchen levels1–4 and three hot
plates, all native1254x1254 RGBA with alpha0–255. Original image bytes copied
unchanged. Exact prompts/output paths/SHA-256 in reference/assets-owner-2026-09-08/
kitchen-art.json. Burner art1/2/2/3 matches canonical config. Corrected the stale
single-burner level2 generation prompt; no economy numbers changed. All128 manifest
entries/32paired SFX pass;23 sprite placeholders and97draft files remain. Draft
status is intentional; no final pixel-art release approval is claimed.

Author verification: npm run verify passed config/production build/133 engine
tests,10 ordinary >=500-serve k rows2.2564–2.65 and15 rush-pressure rows. Final full59
browser tests passed, including seven focused kitchen cases after widening the
live-kitchen content area. Production build passed again. New seven engine
checks use real command-created/replayed saves for all levels, actual restock,
exact completion/expiry boundaries, coarse/fine time, hidden pause, pending stock,
prepared waste, partial-mâm refusal and stale whole-mâm service. One isolated
cloned-world probe checks the warning equality predicate; it is never a fake save.

Visual QA at360x740,390x844,1280x400 confirms native sprites load,44px hit targets,
unobscured yard appliance, readable timers and scrollable sheets; max-level view
shows3 occupied burners. Fixed short landscape nav covering the new stove center
by allowing nav to scroll with the yard below500px viewport height. First focused
run also exposed an invalid test assumption: existing queued arrivals can still
seat while closing, so expiry now checks each original job disappears instead of
forbidding legitimate later orders. Reduced-motion and language switch pass.

Logs: .qa/kitchen-verify.txt,kitchen-final-e2e.txt,kitchen-final-build.txt,
kitchen-assets.txt. The final59-pass log supersedes earlier diagnostic runs. A
fixture-switch experiment was correctly overwritten by pagehide save; stock and
max-level checks now use separate fresh browser tests, without bypassing pagehide. Screenshot evidence kitchen-yard/live-{360,390,1280}.png
and kitchen-max.png; kitchen-art-ui-footprints.png checks all seven sprites at
the actual43px dish/58x45px equipment sizes. Full F11 still includes per-dish waste/menu-mix telemetry and
future customer-specific demand; documented current dish_preparing/dish_ready
mapping, automatic Item-based prep and GDD/03 stale soft service. Independent
full-base review pending. Tracker v0.18.0/dashboard retain17 in-progress features.
Root bc79af5/WIP preserved; no merge/push/hosted test. Full M0–M9 continues.

| Date | Change |
|---|---|
| 2026-09-09 | Added live kitchen UI and seven original sprites;133 unit/59 browser/10 k rows plus15 rush rows pass. Independent review pending; analytics/server/full-game work remains active. |


## 2026-09-09 — Live kitchen independent review receipt

Product af168338a9d85dfd276d34bb00ad9e288e281ce2, full immutable base
f9fa82f3b667e54873d35ff7110945daba8576d1. Independent native Codex review
exited0 and found no actionable defect. Its exact final output reports a pure
config-backed projection, localized UI routing, regressions and documented draft
art without changes to canonical state transitions or persistence. It independently
ran typecheck, all133 engine tests and asset validation. No synthetic verdict or
clean marker was added. Native output/prompt/log: .qa/review-kitchen.*.

Browser execution was sandbox-blocked; reviewer inspected actual author final59
browser evidence and focused code. The59-pass suite remains author-run, not an
independent browser execution. Author config/build,133 unit,10 ordinary500+-serve
k rows2.2564–2.65 and15 rush-pressure rows all passed. Runtime engine/rules/config/
save sources and canonical economy JSON are byte-identical to the reviewed base;
new kitchen.ts is read-only. All seven sprite hashes match committed provenance.
Manifest128 entries/32paired SFX,23 placeholders/97draft files: release art still
unfinished. Local5174 responded200; no root edit, merge, push or hosted test.

Real rules13 captures from immutable af16833 cover queued/preparing dishes,
closed expired orders and an actually served table. Entire decoded worlds compare
with their played source: .qa/capture-kitchen-v13.mjs/.txt and
legacy-kitchen-{queued,expired,served}-v13{,-expected}.json. These support the next
analytics/replay slice; they are not a future-protocol claim. Read-only next intake
.qa/kitchen-analytics-next-intake.md identifies both waste mutation sites and the
existing ServeRecord value basis; no demand coefficients were fabricated.

Tracker v0.18.1/dashboard retain17 in-progress features. This kitchen presentation
slice is reviewed; full F11 per-dish analytics/demand and all M0–M9 server/meta/
risk/events/art/release work remain active. Next bounded work is to preserve
ordered/wasted dish provenance and expose a shared menu summary in Sổ ca.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded independent kitchen review without actionable findings,133 unit/59 E2E/10 k rows and true v13 prep/expiry/service captures; full-game goal remains active. |


## 2026-09-09 — Rules14 menu provenance and Sổ ca (review intake)

Immutable base80ee489475443af7be0cfd617b42d6ebec650720. One writer remains in
codex/game-build-isolated; no root edit, merge, push or hosted release. This is
progress toward the complete M0–M9 goal, not completion of the game or full F11.

The pure engine records each actual ordered dish, hot-job start/completion and
prepared-food disposal. Expiry and confirmed dismissal share the same discard
handler; never-started items and served rounds are excluded. Instant configured
hot jobs have an immediate completion event. The shared menu/value helper reads
shift cursors and ServeRecords; average per mâm is distinct from per-customer k.
Cap, rested bonus, delivery and throughput do not alter nominal service value.
Empty or unrepresentable values remain unavailable, including non-finite k.

Current shifts have complete coverage. Active legacy shifts start partial
coverage at current adoption; closed legacy shifts remain unavailable. Genuine
v13 queued/expired/served fixtures came from af16833, with exact captured worlds.
Existing v1–12 replay tests retain historical assertions and explicitly expect
current v14 adoption events. The v12→v13 attendance-specific test stays pinned
at v13; menu adoption has its own current-version coverage. Protocol event IDs
advance normally; no promise is made about unchanged future shift-ID schedules.

The VI/EN Sổ ca reports six rows, served mâm count and nominal average. Browser
QA found the prior last-shift book became unreachable after reload while resting;
a compact button now reuses the existing book handler beside rest status. Live
expiry updates, reload, empty/partial/unavailable coverage, focus return, loaded
sprites and 360/390 portrait plus1280×400 landscape checks pass. Screenshots:
.qa/menu-live-{360,390,1280}.png and menu-en-{360,390,1280}.png.

Owner designer direction is recorded verbatim in F24 and aligned in design tokens
and the reference archive: portrait casual-management, edge-anchored HUD, rounded
skeuomorphic panels, chunky pill controls, bold rounded sans-serif, soft shadows,
compact contextual actions and Vietnamese street-game visual language. New metric
surfaces and rest-book control follow it; this is not a claim of finished art.
Whole-table service and numeric/icon-only departure feedback remain intact.

Author config/build/typecheck and143 engine tests pass; full63 browser tests pass.
Asset check remains128 entries/32paired SFX,23 placeholders/97draft files. Earlier
20 normal/combined500+-serve k rows passed2.3125–2.7562 and15 rush rows passed;
final rerun after the zero-duration/non-finite edge checks is in progress.
Logs: .qa/menu-config-final.txt, menu-build-final.txt, menu-units-complete.txt,
menu-e2e-final.txt, menu-assets.txt, menu-sim*-final.txt, menu-rush-final.txt.
Independent full-base review pending. Tracker v0.19.0/dashboard retain17 features
in progress; customer-specific demand, server/meta/risk/events/art/release remain.

| Date | Change |
|---|---|
| 2026-09-09 | Added rules14 local menu provenance/value report, legacy adoption coverage and persistent access to the last shift;143 unit/63 E2E/config/build pass. Updated owner designer brief; final balance rerun and independent review pending. |


## 2026-09-09 — Menu provenance independent review receipt

Product 2f1aa07c8a9143f5f91ab69c8ef9e8f101695ba7, immutable full base
80ee489475443af7be0cfd617b42d6ebec650720. Independent native Codex review
exited0, reported its completed review and listed no actionable findings. Its
final output is prose, not a literal CLEAN marker; no marker was manufactured.
It independently passed config validation, typecheck, production build and all
143 engine tests, inspected genuine fixture hashes and the final simulation logs.
Native prompt/log/final text: .qa/review-menu-prompt.txt, review-menu.log and
review-menu.txt. Browser binding was sandbox-blocked by EPERM on127.0.0.1:4178;
63 passing browser tests remain author-run evidence, not independent execution.

Final author checks completed successfully: config/build/typecheck,143 unit,
63 browser, assets128 entries/32paired SFX with23 placeholders/97draft files,
20 ordinary+combined500+-serve k rows2.3125–2.7562 and15 rush-pressure rows.
Final sim logs are menu-sim-final.txt, menu-sim-combined-final.txt and
menu-rush-final.txt in .qa. Canonical economy JSON is byte-identical to the base.
Both new-shift reset and legacy adoption are covered, alongside actual expiry,
zero-duration completion, repeated rounds, cap/bonus/delivery and reload cases.

Browser diagnosis is preserved: initial menu tests exposed inaccessible last-shift
book after reload; the final63-pass run includes its rest-screen entry fix. Earlier
legacy tests expecting one v13 adoption event were updated to explicitly assert
v14 menu cursors/event and preserve every prior world field. The original
attendance-adoption test pins v13 by design; actual v13-to-current coverage is
in menu.test. Final output does not claim old/new future schedules are identical.

Owner designer brief is current in F24, tokens and reference README. F02/F11
tracker notes now reflect the menu implementation; F10's obsolete "free flyer
missing" note was reconciled against claimDailyBonus and its existing tests.
Tracker v0.19.1/dashboard retain17 features in progress. These documentation
receipts do not alter reviewed product code. Full M0–M9 remains active: art,
customer demand, configured upgrades, server/meta/risk/events and release remain.
Read-only next intake .qa/menu-next-intake.md identifies configured glass-purchase
work without fabricating a purchase above the existing buy cap.

Root stays bc79af5 with original WIP, untouched. No merge, push or hosted release.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded native menu review with no reported findings and independent143 unit/config/build; author63 browser/20 k rows/15 rush rows passed. Updated tracker/dashboard truthfully and preserved full-game continuation. |


## 2026-09-09 — M4 prerequisite: per-shift config pinning

Pinned base d732240bf32e53fa48e0be55df1d4e4713241f2b. Rules15 separates
creation/current snapshots and permits a trusted next-opening config without
rewriting an active shift. Only an accepted opening switches. Player assets,
ledger/day history and owned identities survive; stamina is proportional to
new duration and owned table capacity follows the new level definition.

Savev3 includes additional used/attempted configs and exact event validation.
Single-snapshot exports remainv2; genuine v13 history is preserved before current
adoption and the next config. Eight focused tests cover actual A/B service and
pour timing, candidate refusal, retry underC, old elapsed time, caps/rest grants,
malformed catalogs, immutable snapshots and safe clock boundaries. Browser
acceptance imports an actual mixed save through the existing recovery flow.

Author config/build,151 unit and64 browser tests passed. Ordinary10 k rows
passed2.3125–2.6606; combined/rush simulations and native independent review
are in progress. Logs use `.qa/config-pinning-*.txt`;
contract is `.qa/config-pinning-contract.md`. No canonical config or dependency
changed. F23 is now in progress; tracker v0.20.0/dashboard show18 active features.
This does not claim server authority, registry approval/publish, auth/guest claim,
reconnect or full M4. Full M0–M9 remains active; root checkout is untouched.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented rules15 per-shift config adoption and savev3 prerequisite, updated F23/tracker to in progress; final verification and independent review pending. |


## 2026-09-09 — Config pin review corrections

Independent native review ofd732240..82b6490 found two actionable faults: a valid
snapshot could rename the owned location and orphan service, and JSON object-key
reordering could falsely conflict with the same immutable version. Preserve the
first round at .qa/review-config-pinning-round1.{txt,log} and its prompt.

The opening guard now refuses a candidate missing the owned location before
adoption, including onboarding that skips rush planning. It never relocates the
player or changes assets. Snapshot collision comparison canonicalizes object keys
recursively while preserving array order and all values. Two regression cases
exercise first/returning shifts, rejected-candidate save/replay, later compatible
service, nested reordered keys and real array/value conflicts.

Initial full checks passed151 unit/64 browser and20 k rows2.3125–2.7562 plus15
rush-pressure rows. Final153 unit/browser/config/build/sim verification and a new
independent full-base review are running. A separate probe from actual parent
rules14 code also preserved the complete world/history through a new rules15 pin.
No complete-M4 or release claim; the owner's new management-menu auto-pause request
is queued next and takes precedence over earlier no-pause UI guidance.

| Date | Change |
|---|---|
| 2026-09-09 | Fixed both native review findings: reject orphaned location on config adoption; compare same-version snapshots independently of object-key order. Added two actual regression cases; final re-verification/review pending. |


## 2026-09-09 — Retained onboarding capacity correction and owner pause steering

Second full-base native review at667b5fa confirmed the previous two fixes but
found a further preserved-state compatibility case: a candidate authored with
larger initial tables could strand the first onboarding group at an older stall.
The opening now checks candidate capacities at the actual retained table levels
before adopting. It refuses without replacing assets; compatible capacity changes
and returning non-onboarding players remain accepted. Eleven focused config pin
cases pass, including actual service/replay after a compatible change. Round2
forensics are .qa/review-config-pinning-round2.{txt,log}.

The owner additionally requested auto-pause in stock/management/upgrade menus and
explicitly chose to keep the stock menu open and paused after purchases until
closing it. That UI change is the next writing scope in the same worktree; no
reviewer remains live. Final full-base review will include the onboarding fix and
owner-requested pause after their complete author verification. No review pass or
full-game completion is claimed at this checkpoint.

| Date | Change |
|---|---|
| 2026-09-09 | Reject incompatible first-group capacity using retained table levels;11 focused tests pass. Preserved second review finding and queued the explicit owner menu-pause behavior for final combined review. |


## 2026-09-09 — Owner management pause implementation

The owner explicitly chose to keep Nhập hàng open and paused after purchases until
closing. Implemented for management/equipment/welcome dialogs with a VI/EN hint and
paused yard/stall animations; inline table service stays live. Stock controls now
fit the mobile dialog. Closing/wait actions return to the yard for normal drain.

The full browser run exposed a real distinction in the existing activity model:
using inactive for a visible menu disabled attendance and flyer activation. Rules16
adds an optional pause flag to the same activity command, preserving player presence
and real calendar attendance while reusing deadline shifting for gameplay. Hidden
activity still refuses those presence-dependent actions. No canonical numbers or
new dependencies changed. Existing tests that advanced gameplay while a sheet was
open now explicitly verify the hold and close before measuring gameplay progress.

Final full verification and combined independent review against d732240 remain in
progress. Earlier config reviews have findings corrected, not a clean final verdict.
Root remains untouched; full M0–M9/art/server/release work is still incomplete.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented the owner's pause-until-close rule; distinguished presence from paused gameplay after real E2E failures, kept management actions usable, and updated prior no-pause expectations. |


## 2026-09-09 — Verified config pinning and management pause checkpoint

Product commit **7c60c7099d71c37727d28a0db33b1acf72564207**, complete review base
**d732240bf32e53fa48e0be55df1d4e4713241f2b**. Three earlier config findings were
corrected: owned location retention, immutable snapshot key-order comparison and
onboarding capacity using retained table levels. Rules15 remains the pinning
boundary; rules16 adds logged management pause while retaining player presence.

Owner behavior is verified: stock purchases keep the dialog open and paused until
closing. Gameplay/preparation/freshness/shift/rush clocks remain frozen, all menu
actions retain their normal eligibility, attendance follows the real VN calendar,
hidden→visible cannot resume behind a menu, reload preserves remaining wait, and
the same table can be served after returning to the yard. Close/wait flows and the
mobile stock action row remain usable. Source checkout stays at bc79af5; code is
only in the isolated worktree and local preview5174. No merge or remote deployment.

- `npm run check:config` and `npm run build` passed.
- `npm test`:156/156 passed. `npm run test:e2e`:67/67 passed.
- Final CSS-only alignment: build and5 existing mobile/stock browser cases passed.
- `npm run sim` plus combined well-rested/QR/shipper/neon/flyer:20 rows, at least500
  served orders each, k2.3125–2.7562. `npm run sim:rush`:15 rows passed.
- An actual rules15 service/offline history generated from parent0adee31 replays
  identically, then adopts rules16 menu pause and round-trips without prefix changes.
- Native Codex independently reviewed the full base through7c60c70 and reported
  no actionable defects. It reran config/build156engine tests and required sims.
  Its sandbox could not bind the browser test server; browser evidence above is
  from the author run, not an independent browser rerun. The native result was
  prose, not an exact `VERDICT: CLEAN` marker; the retired Level3 gate is not claimed.

Raw evidence: `.qa/menu-pause-*-final.txt`, `.qa/menu-pause-mobile-final.txt`,
`.qa/menu-pause-v15-probe.{ts,txt}`, `.qa/menu-pause-verification.json`, and
`.qa/review-config-menu-pause.{txt,log}` with its pinned prompt. Live in-app preview
was also opened and the stock pause pill confirmed; menu left open for owner review.

This closes this bounded update only.18 features remain in progress. Complete
M0–M9, server/registry/auth/network, art/audio exports and hosted acceptance remain
unfinished. The original full-game goal is still active; local checks are not Alpha
or release evidence. The accompanying docs-only receipt updates the older handoff
no-pause rule and regenerates the dashboard; it does not change reviewed product.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded author verification and completed native independent review for config pinning and owner pause-until-close; preserved native browser limitation and full-game incompleteness. |


## 2026-09-09 — M4 durable server event store in progress

Starting from f2e85f8 in the existing isolated worktree. `apps/server` is now an npm
workspace with native Node SQLite persistence. The core engine and config numbers
are reused; semantic config-content comparison moved into the shared config module
for both consumers. Snapshot serialization preserves original dictionary order to
retain historical seeded outcomes. New server configs do not alter ongoing shifts.

Commands/events/frontier/projection commit atomically with append-only constraints,
server clock and per-player idempotency. Cache is bounded and revalidated against
durable revision; real DB failure rolls back and evicts a mutated cache. Eight
focused tests initially passed, covering two connections, real files, retries,
rollback, corrupted state, mixed config, pause and calendar. Added a separate-process
restart check to the integrated suite. Full config/build/engine+server/browser/sim
verification and independent native review are still in progress.

Web stays localStorage. HTTP/session ownership/Google migration, admin registry,
WebSocket/reconnect and live release are not implemented by this persistence slice.
No original-checkout edits, merge or external deployment. Full M0–M9 remains active.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented real M4 SQLite event store and regression suite; shared config identity, kept original snapshots for deterministic replay, and documented pending transport/auth cutover. |

### Author verification — server persistence

Config validation, build/typecheck, all164 engine/server tests and67 browser tests
passed. The eight server cases include a separate Node process reopening the real
SQLite file. Normal plus combined headless profiles passed20 rows with at least500
serves per row and k2.3125–2.7562;15 controlled rush rows passed. Evidence is under
`.qa/server-store-{config,build,tests,e2e,sim,combined,rush}.txt`.
Independent native review is next; this is not full M4 or release acceptance.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded completed author checks for the server persistence slice; independent review remains pending. |

## 2026-09-09 — Server review corrections and owner live upgrades

Server first native review found equivalent JSON member order could cause retry
conflict. e96322f uses native structural comparison and the indexed durable command
to route equivalent retries through the original engine payload. Second review
found invalid event cursors could advance/commit elapsed gameplay before refusal.
6a6977d validates integer/range against durable append-only history before read.
Eight real server tests passed after each correction. Full-base final review remains
pending; neither findings round is counted clean.

Owner then requested asset upgrades immediately during a shift. Rules17 removes the
retired phase1 gate from current commands; seed1.7.2 changes only this flag. Old
snapshots/prices and rules1–16 remain replayable. Actual e96322f v16 saved failures
are captured in live-upgrade-v16.json; new commands can buy all device families,
buy a table and upgrade an empty table in the same paused shift. Existing order,
prep/glass state and customer wait are preserved, retry charges once and costs use
the shift's pinned config. Two focused engine cases and typecheck passed. Full
config/build/unit/browser/sim and independent combined review are running.

Both UI entries remove closing-shift copy. The same quote controls availability
and shows insufficient coins; menus stay open and paused through purchase. No price
reduction or wallet grant is part of this owner request.

| Date | Change |
|---|---|
| 2026-09-09 | Fixed both server review findings, then implemented owner in-shift asset upgrades with replay17 and real v16/browser regression coverage; final verification/review pending. |

### Combined review receipt — store and live upgrades

Native review f2e85f8..3ff21df completed with no confirmed actionable defects.
Reviewer reran eight SQLite and two live-upgrade tests via direct Node because its
sandbox blocked TSX IPC; author canonical config/build/typecheck and166 tests passed.
20 economy rows remain2.3125–2.7562;15 rush rows pass. Browser follow-up exposed a
real-time race in the hidden/offline test harness: clock.install kept ticking
during navigation. Explicit pauseAt fixes its clock while retaining all exact
order/time/money assertions; both repeat checks pass. Full browser rerun passed all69 cases. Evidence: .qa/live-upgrades-e2e-verified.txt and .qa/review-store-live-upgrades.txt.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded native review completion and deterministic browser clock fix; owner batch-pouring request is the next bounded change, full game remains active. |

## 2026-09-09 — Stocked beer and wash batches (rules18)

Owner asked for proactive5-serving Lv1 production, immediate refill, realtime stock
and capacities on devices. Uses existing config storage/batch/duration keys with
JSON1.7.3. Defaults communicated while optional questions remain open: top up vacant
space and start freshness on the tray. Tank servings are separate from reusable
physical glasses. A tray withdraws reserve and frees refill space immediately;
otherwise a group larger than tank capacity would deadlock. This interpretation
keeps whole-table service and prepares the next beer without waiting for a new guest.

One current load per machine; raw stock reserved once at start, partial loads when
short on ingredients/dirty glasses. Existing jobs keep their deadlines through
upgrade and pause/reload. Legacy disabled config stays through current shift and
adopts batches on next config pin; actual pre-edit v17 fixture proves replay.
HUD shows tank ready/capacity, clean/total glasses, raw-stock/per-dish cap, cooking
slots and cooler freshness. Contextual panels compare real current/next stats.
Temporarily reuse available lower-level equipment sprites instead of blank blocks.

Config/build and173 engine/server tests passed; two mobile batch/upgrade/pause
cases pass. Full browser, economy/rush simulations and review still pending.
The existing hidden/offline harness now freezes its fake clock before navigation.

| Date | Change |
|---|---|
| 2026-09-09 | Added proactive beer/washer production and capacity UI; full game remains active, batch verification in progress. |

### Batch verification progress

All173 engine/server and71 browser checks passed, plus15 controlled rush rows.
The two prior browser failures were obsolete preparation/expiry timing assumptions:
first-tray beer is already ready at arrival; close/expiry now uses the actual Order
remaining time. No production rule was weakened to satisfy those assertions.

The initial500-serve normal cohorts passed; one combined rested/QR/shipper cohort
(seed20260611,cold menu) had k3.0494. Keep .qa/batch-combined.txt as failed evidence.
Measurement now uses1000 for every seed/profile (spec minimum remains500), retaining
identical band2–3, seeds, nominal-price formula and all economy values. The ten normal
1000-serve probes pass2.5821–2.7918; combined1000 and final canonical verification
are in progress. This is a sampling change, not proof that every short window is
within band. No seed was removed and no prices or anchor were adjusted.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded full173unit71browser15rush pass and disclosed the500-serve k excursion; extended all measurement cohorts to1000 before final acceptance. |


### Batch final verification — 2026-09-09

Product range `fe59758..7897bdd` implements the owner beer/washer batch request.
Config1.7.3, build/typecheck and174 engine/server tests pass. All72 browser checks
pass, including360/390px capacity/upgrade/pause/reload and actual legacy washing.
Native review first found two HUD defects: unadjusted cooler freshness and a0%
bar for legacy jobs without a start timestamp. Both are fixed at7897bdd; full-range
followup confirmed no remaining introduced actionable defect. Its independent
browser rerun was blocked by sandbox port EPERM; author browser verification ran
successfully on the local runtime.

The72-test run initially failed before navigation in a pre-existing clock setup.
Playwright's native pauseAt installs timers itself; removing the redundant running
install at the identical target time removes the race across the affected fixtures.
Fixture timestamps, gameplay deadlines and all reward/penalty assertions are unchanged.
The final72-test run passes without retries; config/build/engine results remain green.

Canonical1000-serve normal and combined rested/QR/shipper runs now pass all20
seed/profile rows, k2.5821–2.9601; all15 controlled rush rows pass. The initial500
combined excursion k3.0494 remains failed evidence, not retroactively called green.
All cohorts use the same larger sample; no seeds, prices, k band, anchors or nominal
formula were changed. This does not guarantee every short window stays in band.

HUD shows washer busy/batch capacity separately from the clean/total glass rack,
weather-adjusted cooler freshness for current/next levels, and indeterminate native
progress for inherited washing jobs whose historical start time is unavailable.
Current jobs retain their real deadlines. Ready beer and raw inventory stay separate.

Evidence: .qa/batch-review-fix-{config,build,tests}.txt,
.qa/batch-e2e-clock-fixed.txt, .qa/batch-{sim,combined}-canonical.txt,
.qa/batch-rush.txt, .qa/review-batch-final.txt and .qa/batch-verification.json.
The5174 dev server serves the update; no owner save/menu was reset or forcibly closed.
Older pinned shifts adopt enabled production on the next successful shift start.
The full M0–M9 goal remains active; unique level art and M4 HTTP/auth/registry cutover
are still unfinished. Optional top-up/freshness interpretations remain adjustable
when the owner answers; current defaults are specified in08§8.1.

| Date | Change |
|---|---|
| 2026-09-09 | Verified batch production/HUD at7897bdd:174 engine/server,72 browser,20 canonical k cohorts and15 rush rows. Fixed both native-review HUD findings and removed redundant fake-clock installs; full game remains active. |


## M4 guest sessions and native HTTP — 2026-09-09

Base090d920, same isolated worktree. Added guest credentials hashed in SQLite schema2,
atomic guest/player creation, durable expiry/revoke and authenticated HTTP projection,
command and catch-up endpoints. A single generic command route reuses the existing
engine; inputs cannot select another player or supply authoritative time/config/totals.
Public state strips replay RNG/seeds and private config; security limits are deployment
settings. Real socket tests cover ownership, idempotency, stock/pause, restart, v1
migration, forced insert rollback, input/Origin/body limits and secure cookies.

No engine/config/economy rule changed. Existing canonical20 k rows2.5821–2.9601 and15
rush evidence therefore remains applicable. Config/build/full tests are running;
native independent review follows. The web/UI is unchanged and remains on its verified
local adapter until Google claim, sequencing/reconnect and registry cutover are ready.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented M4 guest sessions and HTTP service dependency with real integration checks; full M0–M9 goal remains active. |


## M4 guest HTTP verification receipt — 2026-09-09

Product commits3f1805a +62b4445 (base090d920), isolated game worktree only. Author
`npm run check:config`, `npm run build` (including typecheck) and all182 engine/server
tests pass. Eight HTTP tests use real sockets/SQLite; eight persistence tests remain
passing. Actual CLI + isolated Chromium on5174/5175 passes credentialed guest creation,
owned state/start, private cookies/RNG, injected-command refusal, bounded event history,
logout/reuse denial and private0600 database permissions. The test API was stopped;
no owner browser profile/save was touched or switched to server authority.

Initial native review identified3 P2 issues: unknown nested fields retained in command
history, empty-cookie guest allocation, and unbounded event catch-up.62b4445 fixes
all3. Exhaustive HTTP action tests reject injected/unknown fields before logging;
invalid cookies create no new player. Catch-up reads100-row SQL pages with cursor and
hasMore, survives restart/retry without duplicates, and no longer replays or advances
the simulation. State/command operations still advance trusted server time. This does
not remove the pre-existing full-history replay ceiling on state/command cache misses.

Independent `codex exec review` of the full090d920..62b4445 range reports no confirmed
actionable introduced defects. It independently passed store tests; its socket tests
were blocked by sandbox listen EPERM, so runtime HTTP proof is the author run above.
Evidence: `.qa/http-{config,build,tests}.txt`, `.qa/http-cli-browser-smoke.json`,
`.qa/review-http.txt`, `.qa/review-http-followup.txt`, `.qa/http-verification.json`.

No engine/config/web gameplay changed in this slice. The previous72 full browser,
20 canonical1000-serve k rows2.5821–2.9601 and15 rush checks remain the evidence for
those unchanged files; they were not rerun as part of this HTTP-only change.

The owner answered “chưa có” to the Google Client ID request. Prepared
`docs/google-signin-setup.md` with official setup sources and exact local test origins;
no runtime Google config, fake sign-in or cloud claim is enabled. Full M0–M9 stays
active: next M4 work is client sequencing/reconnect and registry/Google claim/remote
web integration; distinct level art and later roadmap features remain unfinished.
Tracker v0.25.1/dashboard keep18 features in progress and zero complete.

| Date | Change |
|---|---|
| 2026-09-09 | Verified guest HTTP through62b4445, resolved all3 native-review findings, added Google setup guide after owner confirmed no Client ID. No full-game or release completion. |


## M4 ordered command ingress — 2026-09-09

Base794d75c, same isolated worktree. Server-issued client streams and append-only
receipts add contiguous clientSeq acceptance to the existing command transaction.
The HTTP boundary now requires sequence/stream ownership; gaps/changed retries cannot
consume a sequence, while domain refusals are acknowledged as processed. Receipts
reference the canonical player command log; response loss or another tab never
reapplies the original spend/serve. Schema0–2 migration preserves history/sessions.

Tests exercise exact whole-table payment retries, reordered JSON, stream isolation,
acknowledgements after restart, errors at each write boundary and actual HTTP input.
No engine/economy/web behavior changes. Config/build/full tests and review in progress.
Client durable outbox/reconnecting UI, reconnectGraceMs closing, registry/Google claim
and remote cutover remain required; owner5174 stays on the verified local adapter.

| Date | Change |
|---|---|
| 2026-09-09 | Added M4 server ordering prerequisite and focused persistence/HTTP regression checks; full M0–M9 goal remains active. |


## Ordered ingress verification receipt — 2026-09-09

Producte390a1c on base794d75c. Config/build/typecheck and all187 engine/server tests
pass, including21 server checks. Actual CLI + isolated Chromium also passes owned
stream create/resume, mandatory sequencing, gap acknowledgement, same-operation
retry, invalid-field refusal, bounded history, HttpOnly cookies and revoked-session
refusal. Test API5175 stopped; owner browser/save and original checkout untouched.

Independent native review794d75c..e390a1c found no introduced actionable defects.
It independently ran12 storage/sequence checks successfully; real HTTP/browser proof
is the author run. Receipts: `.qa/sequence-{config,build,tests,server}.txt`,
`.qa/sequence-cli-browser-smoke.json`, `.qa/review-sequence.txt`,
`.qa/sequence-verification.json`. No engine/config/web/sim source changed; preceding
72 full browser,20 canonical k rows2.5821–2.9601 and15 rush evidence remains applicable,
not rerun or newly claimed by this server-only receipt.

Next-boundary probe found why timeout cannot simply call endShift + activity:true:
normal closing remains frozen while inactive, and forcing active across VN midnight
opens an attendance day without a real reconnect. Reproduced at e390a1c in
`.qa/probe-offline-closing.{ts,json}`. Implement a trusted replayable engine timeout
close that finishes normal guest cleanup while inactive without attendance/active-rest
rewards, then server liveness/expiry and client buffer integration. Full detail:
`.qa/connection-expiry-design-probe.md`.

Genuine v18 compatibility fixtures were captured before any next engine edit from
exacte390a1c: menu stock fill and inactive closing across midnight, each round-trips
identically. Files `.qa/legacy-v18-e390a1c-{menu,inactive-closing}.json` plus matching
`-expected.json`; producer `.qa/capture-sequence-v18.ts` refuses another HEAD.

Full M0–M9 remains active. Server sequencing is now verified; disconnect expiry,
normal timeout closing, durable browser outbox/reconnecting UI, registry/Google
claim/remote cutover and later roadmap/art/release work remain. Tracker v0.26.1 keeps
18 features in progress, zero complete. Google Client ID is still absent per owner.

| Date | Change |
|---|---|
| 2026-09-09 | Verified ordered ingress at e390a1c with187 tests, CLI/Chromium and independent review. Captured real v18 saves and proved the inactive-closing/attendance boundary before the next timeout implementation. |

## Engine disconnection clock — rules19 (2026-09-09)

Base cc1aee5, isolated game worktree. Added the trusted replayable connection-loss
primitive and pinned grace deadline. It pauses guests during grace, starts normal
closing exactly at expiry, finishes while inactive, and never fabricates attendance
or resting stamina. Public commands cannot forge the system action/key namespace.
A real reconnect before expiry cancels the pending outage; repeated loss retains
its first deadline. Calendar events during pause now land at deterministic midnight
boundaries under rules19; original rules18 fixtures still reproduce exact worlds.

Regression checks cover before/at/after expiry, duplicate/restart/late loss, wrong
shift, empty and already-closing shifts, menu pause, absent midnight attendance,
resting after closure, stepwise versus large advances, configured/unsafe grace,
public forgery, and genuine e390a1c save compatibility. Config/build/tests/sims/browser
and independent native review are being finalized. No Google setup/auth or remote
adapter has been enabled. Next: server-owned liveness, durable expiry and browser
outbox/resync; engine API alone does not complete F23§8 or the full M0–M9 goal.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented pure rules19 timeout-close prerequisite and replay/calendar regression checks; complete game remains in progress. |

## Disconnection verification and latest-handoff priority — 2026-09-09

Product1fa6b14 on basecc1aee5: trusted outage identities/grace/normal inactive closing,
complete pause-clock preflight, lazy absent calendars, and a neutral live rules20
adoption at the saved frontier. Original18/19 histories remain replayable; first
live recovery of19 cannot backfill1000 missed dates. Menu-disconnection and key-bound
cases are covered, including a real SQLite migration write failure/restart.

- Config/build/typecheck and211 engine/server tests pass at1fa6b14.
- Final native correction review3ed1e19..1fa6b14 confirms both last full-review
  findings resolved and independently passes34 focused tests. This is a correction
  verdict following the full-review history, not a claim that a full-range clean
  verdict was issued for1fa6b14. Logs: `.qa/review-disconnect-*.txt`.
-72 browser tests,20 canonical1000-serve cold/full/combined economy cohorts
  (k2.5821–2.9601), and15rush checks passed at3ed1e19. The subsequent correction changes
  only old19 recovery; normal current gameplay and all numbers are unchanged.
  Evidence: `.qa/disconnect-frontier-{browser,sim,combined,rush}.txt`.
- Receipt: `.qa/disconnection-verification.json`. Prior500-serve combined excursion
  remains disclosed above; it is not replaced by these longer cohorts.

Next implementation follows the accepted owner handoff2.0, recorded in
`docs/latest-handoff-adoption.md`. A reconciled2.0.1 candidate and complete old/new
schema probe are prepared, not activated. New station/tap/pan mechanics, glass buying,
in-stock demand, LP gates/capacity UI, leases and actual career simulations take
priority over the server liveness adapter. Google ClientID remains absent per owner.
The complete M0–M9 goal and F23 remain unfinished; web is still local.

| Date | Change |
|---|---|
| 2026-09-09 | Verified disconnection/recovery prerequisite through1fa6b14, recorded correction-review scope and exact evidence, and prioritized accepted economy2.0 integration. |

## Latest handoff integration: economy2.0.1 / rules21 — 2026-09-09

Implemented the accepted station/demand/glass/LP-gate boundary on base f8ed8b1.
The complete1.7.3 schema is retained under docs/config/legacy; new saves accept
complete1.x or2.x snapshots without adding new fields to historical raw config.
Only a successful new opening adopts the trusted current bundle. Existing shifts,
prices and recorded histories remain pinned. Server command validation includes
buyGlass while the web remains local.

- Tank storage and timed taps are separate. Opening fills actual raw-stock deficit,
  excluding in-flight reserved capacity; new vacancies start sequential bounded
  refills. Legacy over-cap carry is preserved, not discarded or topped up.
- Pans group configured same-dish portions with stable item-based batch identity.
  New arrivals cannot enter a running pan. Two identical-time pans remain distinct.
- Side dishes use available unlocked stock minus active pending reservations;
  expired orders no longer reserve stock. Hot-category probability and fallback
  use the new config, including whole-group VIP/ngoily preference.
- Glass purchases debit one shared safe quote, respect total owned capacity,
  preserve pause, allocate unique IDs and return original retry outcomes.
- Equipment and heavy-rush LP gates are active; kitchen gate indexing includes
  level0. VI/EN sheets display current/next capacities, taps, portions and gates.
- A browser regression exposed an existing CSS specificity rule setting every
  fourth-and-later-table layout to top:auto. Removing that override restores the
  existing explicit table positions and prevents order bubbles blocking taps.

Historical kitchen and reserve tests retain explicit1.7.3 fixture numbers; new
rules21 checks cover new behavior, stock conservation, partial service refusal,
pause, concurrent pans, purchase/retry, complete config validation and migration.
Current verification/review is running. The first10 ordinary1000-serve cohorts
pass on2.0.1; final evidence will pin the final implementation. Lease lifecycle,
rental UI and actual career measurement remain the next boundary, not completed.
Full M0–M9, server liveness/remote cutover and release remain unfinished.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented latest-handoff economy pipelines/demand/gates, versioned config compatibility and capacity/glass UI; full validation and independent review in progress. |


### Economy2.0.1 checkpoint evidence at9c2870a

Config/build pass;221 engine/server tests and75 browser checks pass. Native full-diff
reviewf8ed8b1..9c2870a reports no actionable introduced defects. Its socket-based HTTP
rerun was sandbox-blocked; primary full suite exercised engine and HTTP/server tests.
10 ordinary cold/full1000-serve cohorts k2.4186–2.8738 and15 rush pressure cases pass.

**Balance is not complete:** the10-row combined QR/neon/flyer/rested/shipper run
fails its existing band assertion. Full-menu seeds are3.1327,3.0416,3.1320,3.0907,
3.2074; cold-menu seeds2.5834–2.7939. The payment+tip/82.5 formula, approved numbers
and failing evidence are retained. Asked owner whether the band is the baseline
calibration target with separate advanced reporting or whether advanced numbers
must also be retuned into band. No response yet; do not silently weaken the check,
change the anchor, or describe the new economy as fully verified/ready.

Receipt: `.qa/economy2-verification.json`. Source20-file handoff hashes rechecked and
unchanged. Original checkout and owner's5174 save were not modified. Next independent
work: lease calendar/quote/forfeiture/refund and UI, then actual career progression.
Full M0–M9 remains unfinished.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded functional verification/native review at9c2870a and the concrete advanced-economy band failure; retained numbers and requested owner clarification. |


## Latest-handoff lease implementation — 2026-09-09

Rules22 adds seven-calendar-day rental quotes, prepaid rent/deposit, early departure
and atomic move, exact expiry/fallback/refund. Contract financial terms are snapshots;
new config cannot remove its fallback. Pending overflow refunds remain owed without
retaining the location multiplier. Refunds use the canonical credit helper and do
not raise daily/season/lifetime earnings. Current lease ID and cost ceiling reject
stale destructive actions. Moves require rest, while owner in-shift equipment upgrades
and persistent menu pause remain intact.

The same engine serves local saves and exact HTTP actions. Real rules21 history is
captured in test fixtures and replays unchanged.232 engine/server checks pass,
including active/paused/offline fine/coarse clock, early loss, malformed/gated/funded
quotes, immutable terms across config pin and a real file-backed SQLite restart/retry.
VI/EN rental panels show gates, current period, deposit and total cost; focused360/390px
checks pass. Full77 browser checks pass, including expiry while the rental sheet is open. Sim and native review are running. Full F14 retains
break-even/art/neighborhood/report work; league peak producer precedes actual career.
Approved2.0.1 numbers and the existing advanced-band failure stay unchanged pending owner.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented lease mechanism and UI;232 engine/server checks pass. Full verification/review in progress; full game unfinished. |


### Lease correction after review of4600410

Native review found two configuration edges: reusing the free-location ID for a
paid row left an unleased player with its multiplier, and a huge finite multiplier
could overflow a service. Corrected successful-pin migration to the new free
fallback (before planning rushes), rejected changes to a signed fallback, and
validated the maximum configured whole-order calculation including customer/rush/
weather/QR/rest boosts. Failed openings preserve location/config.12 focused tests
and build pass; full engine/server/browser/config/sim are rerunning. Native final
review follows the fixed commit. Prior4600410 was not review-clean.


### Lease final checkpoint throughce7564b

234 engine/server and77browser checks pass, with config/build/typecheck green.
Ten ordinary cold/full1000-serve cohorts remain k2.4186–2.8738,15rush cases pass.
Native review0fc8c4f..4600410 found two config issues; correction review4600410..ce7564b
resolves both and reports no remaining actionable introduced defects. Subsequent
changes are tests/docs only: align free fallback migration with rules22 and preserve
the mixed-order overflow guard under immutable legacy1.7.3 while modern schema
rejects that config earlier. No product code changed after the reviewed correction.

Receipt: `.qa/lease-verification.json`. Native review receipts `.qa/review-lease.txt`
and `.qa/review-lease-fix.txt`; gameplay/browser artifacts use `.qa/lease-*`. Source20
hashes remain unchanged, original checkout and owner5174 save untouched. Build keeps
the existing large-chunk warning; config checker retains advisory literal warnings.
The advanced boosted k failure remains a separate unresolved owner question; do not
retune approved numbers or weaken the band before a reply.

A diagnostic fresh-game seed42 ran8 actual shifts through commands:678serves,
160495lifetimeearned,LP1 reached during shift7,phone purchased. No free money,
assigned LP/peak or free equipment. Artifact `.qa/career-first-day-probe.json` is
first-day diagnosis, not full career evidence. Next implementation is real season
counters/peak producer (F12), required before proving higher LP/career. Full F14
break-even/art/neighborhood/shift-report, server liveness/remote cutover and M0–M9
remain ongoing. Do not rerun the closed lease review without new code or findings.

| Date | Change |
|---|---|
| 2026-09-09 | Closed lease correction verification throughce7564b; preserved advanced-band question and recorded actual first-day progression probe. |

## Season accounting and real peak producer — 2026-09-09

Rules23 adds ranking/contest epoch windows, post-cap source attribution, immutable
participated outcomes, permanent earned peak and the own-progress VI/EN panel.
Current period thresholds/source lists stay pinned across opening config changes.
Old unwindowed revenue is archived explicitly; original replay events stay intact.
Menus pause customer deadlines while seasons continue on the real calendar.

The focused mobile tests pass at360/390px. Full verification and native review are
in progress. No new economy values or reward quantities were invented. Community
ranking/mailbox and actual long career remain unfinished. See F12 §10 for decisions.

## Season verification closed — 2026-09-09

Implementation base `8d31b35`; first code `800dbe7`; corrections `faece69`.
Native review found calendar-at-rollover, first-adoption tier identity and partial
multi-component credit defects. The correction review confirms all three resolved
with no concrete introduced regression. Unused periods can accept opening config;
participated periods keep pinned terms. Complete service credits use the same ledger
mutation on an isolated preflight projection. Historical rules19 test setup now uses
an actual rules19 opening on immutable economy1.7.3; the rules23 downgrade guard stays.

- Config, build/typecheck and all248engine/server tests pass.
- All79browser tests passed;6season/menu tests passed again after correction. Mobile
  VI360/EN390 screens were inspected for readable layout and overflow.
- Ten1000-serve cohorts: k2.4186–2.8738;15controlled rush cases pass.
- Real first day:8shifts,678serves,160495earned,LP1,peak vang.
- Real three days:24shifts,2042serves,492295earned,LP2,peak bach_kim; no injected state.
  This is a diagnosis with cheapest-gear policy, not a full career certification.

Receipt `.qa/seasons-verification.json` binds artifacts/SHAs. Full career, global
leaderboards and configured prize/mailbox processing remain open. The advanced
combined k failure remains preserved pending owner interpretation; no number,
formula or assertion was weakened. Source20files remain unchanged.

## Actual career harness — 2026-09-09

Base `ca0df8b`. `packages/engine/sim/career.ts` buys with actual earned coins and
checks daily wallet conservation, shift/earn caps and command acceptance. A two-day
save replay proves the complete state is reproduced without injected money,
assets or LP. Initial30-day seed42 reachesLP4 and9054324lifetime earned.
See [career-simulation](career-simulation.md) for policy and reproducible commands.
250engine/server tests plus config/build pass; second seed, ordinary/rush checks
and independent review are in progress. Production engine/UI/config are unchanged.
Advanced k scope remains pending; no balance values/assertions were altered.

## Career harness verification closed; storage next — 2026-09-09

Reviewed `ca0df8b..b01f4b1`; native review found no actionable introduced defect.
Two30-day seeds,240shifts each: LP3 day8/9, LP4 day16/17. Seed42 earned9054324,
seed99 earned8373534; both have full core gear, kitchen4,18seats and actual four
leases. Each received91000deposit refunds from three expired contracts. Seed42
repeat command hash is identical; its full30-day save replays all16567commands,
388986events and6period outcomes to exactly the same world/log.

250engine/server tests pass, plus focused rerun after timeline correction;
config/build,10ordinary k cohorts2.4186–2.8738 and15rush pass. No runtime/renderer
code changed, so existing browser UI coverage was not rerun. Isolated Chromium153
storage probe is additional evidence, not the owner's game profile.

That probe exposes a real limitation: month save80013203bytes exceeds the current
localStorage path with QuotaExceededError. UI catches the write and offers export,
but new progress is not durable. Resolve storage growth/migration next; keep all
required history and recoverability. Account eligibility precedes community ranking
after that. See career-simulation.md and `.qa/career-next-boundary.md`.

Actual advanced k is3.483282/3.318249 overall, with22/20days outside band. Numbers,
formula and ordinary assertion are unchanged; owner scope decision remains pending.
Full game and LP0–LP7 certification remain unfinished. Receipt:
`.qa/career-verification.json`.

## Durable local career storage — 2026-09-09

Base310c94e. Native IndexedDB replaces whole-career localStorage writes after the
verified80MB failure. Header and new ordered history chunks commit atomically;
coalesced saves keep the newest frontier and revision checks refuse stale writers.
Valid legacy saves migrate with an atomic backup, retaining the original key.
Recovery import/reset validates first and preserves the old archive if writing fails.
The archive/export format and replay validation remain unchanged. No dependencies,
economy numbers, server authority or cloud eligibility changed.

An initial full browser run passed82/84: immediate reload after autonomous batch
completion exposed a gap between the event and periodic autosave. The UI now saves
on engine events as well as commands and the periodic timer; targeted regression,
80MB acceptance and final independent review are running. Boot still replays all
history on the main thread; startup/memory ceilings remain explicit follow-up work.

| Date | Change |
|---|---|
| 2026-09-09 | Added atomic IndexedDB local archive and browser recovery/race/delta coverage; final verification pending. |

### Browser storage review corrections

Native review of310c94e..542784d requested corruption recovery and an immediate
pending-write reload check. Both are implemented: preserve raw surviving chunks,
expose legacy download/import/reset, and use fresh revision tokens across recovery.
An actual blocked IDB transaction exercises the browser beforeunload warning;
cancelling reload keeps the completed beer batch, then successful save/reload retains it.
Test-only HMR is disabled after traces proved dev websocket disconnect/reconnect
navigated controlled-clock tests. Machine-sleep timeouts are retained as failed runs;
no timeout or gameplay assertion was relaxed. Final checks/review are in progress.

### Decode-corruption correction and host limitation — 2026-09-10

Second native review accepted structural recovery/pending reload and found two
remaining issues: decode-level failures omitted raw snapshot/legacy export, and
reload-clock tests could advance before async boot. Both are corrected through
one retained raw read snapshot and loaded-game waits. Metadata, frontier, command
and event corruption join structural cases in the same recovery test. The normal
read snapshot is released after commit/close; autosave still writes deltas only.
Playwright dev WebSocket is disabled in addition to HMR; normal dev is unchanged.

Current full91-case run passed86 and hit5timeouts during confirmed Clamshell Sleep.
This is not a passing full-suite receipt. Owner was asked to open the lid for the
remaining browser verification. Do not relax test timeouts or claim the final build
fully verified before the rerun. Native correction review remains to be completed.

### Storage code review closed; runtime receipt pending — 2026-09-10

Native final correction review ofe44bf5a..c9db016 reports both prior defects resolved
and no identified code regression. This closes code review only. Current config/
build/typecheck pass. Engine codec has not changed since the250test/ordinary/rush
verification. Final browser91cases:86pass,5timeouts; confirmed hostClamshellSleep.
The owner has been asked to open the lid for a sequential fullbrowser/80MB rerun.
No READY/full-game-complete claim. Receipt `.qa/browser-save-verification.json`;
resume `.qa/resume-browser-save-verification.md`. Current original20hashes unchanged.

| Date | Change |
|---|---|
| 2026-09-10 | Closed independent storage code review atc9db016; retained explicit pending browser verification due host sleep. |


## Google token verification prerequisite — 2026-09-10

Base b5101f0: server-only official Google SDK wrapper plus five actual-signature
checks using a local certificate HTTP service. Correct subject/audience/issuer,
strict expiry, nonce and authorized party; rotating certificate cache, bounded IO,
sanitized errors and disabled missing configuration. No engine/economy/UI edits.
Full config/build/tests and independent review in progress. No login endpoint or
account session/guest claim yet; no real Google Client ID. Continue with the durable
nonce/account transaction, then provenance/conflict-safe claim and web cutover.
Storage final91-case/80MB browser verification separately awaits an awake host.


## Verified storage and Google prerequisite — 2026-09-10

Current917f862: config/build/typecheck and255engine/server tests pass. Native
Google correction review found no remaining introduced actionable defect after
explicitly excluding SDK11's extra googleapis.com issuer; independent typecheck
passed, reviewer sockets were sandbox-blocked. Actual signed-token regression
was red before the fix. Receipt: `.qa/google-verifier-verification.json`.

Storage/engine code is unchanged from reviewedc9db016. With the host demonstrably
awake, all91browser checks passed in2.6minutes. Actual80MB acceptance passed:
16567commands/388986events reopen exactly, one-command delta saves exactly,
full Appboot20.458s with1.582.365xu/LP4/240shifts and no pageerrors. Mobile390×844
screenshot inspected. Receipt: `.qa/browser-save-verification.json`; earlier
sleep-related failures retained. No need to repeat this acceptance without changes.

Next: durable session-bound one-use Google nonce/account transaction, then claim
and web integration. Owner chose review of local history before ranking credit;
retain progression, require server-recorded approval, credit once. Missing Client ID
still means no real Google login. Advanced k policy remains pending; no economy
retuning, invented prizes, completed full-game claim, merge or deploy.


## Google account/session transaction — 2026-09-10

Base b42c034: schema4 subject/player mappings, cookie-bound nonce, immutable login
audit and credential rotation in one transaction. Existing authoritative guest ID,
world, live shift, receipts and history remain unchanged. Default account conflicts
refuse; explicit keep-account switches with no merge/overwrite. Async token verification
revalidates cookie/nonce at consume. Optional TBH_GOOGLE_CLIENT_ID enables Google
HTTP routes; owner has none. Logout clears stale cookies for explicit recovery.

264engine/server tests and config/build pass; real CLI disabled/configured challenge
and guest restart pass, with no live Google request. Focused tests use real SQLite and
actual signed tokens/SDK/HTTP. Independent review pending. No engine/economy/browser
changes, so completed91browser/80MB acceptance is retained. Local archive import and
owner-required review before ranking, GIS/profile/locale and cloud cutover remain next.


## Verified Google server account checkpoint — 2026-09-10

`ebe820c` (base `b42c034`) passes config/build/typecheck,264engine/server tests,
14focused auth checks and actual CLI disabled/configured challenge/restart smoke.
Native independent code/security review found no actionable introduced defect and
passed6account/store tests; reviewer HTTP reruns were sandbox-blocked, while author
actual signed-token SDK/HTTP checks pass. Receipt: `.qa/google-session-verification.json`.
No real Google Client ID or live login, local archive import/review, cloud UI or web
cutover is claimed. Preserve completed91browser/80MB verification; those files did
not change. Full game remains20features in progress,0complete.

| Date | Change |
|---|---|
| 2026-09-10 verified Google sessions | Closed code/security review for ebe820c with no introduced findings;264tests/config/build/CLI pass. Local import, owner-required review eligibility and web integration remain required. |


## Local archive claim core — 2026-09-10 (review pending)

Schema5 internal claim and worker validation preserve exact local history, source
IDs and unfinished shift, with immutable pending provenance and atomic cookie rotation.
271tests/config/build and80MB import/reopen/retry pass (16,567commands/388,986events).
Measured48.38s import/29.36s cold read/2.65s loop gap remain open for public transport.
Native review pending. HTTP upload/approval/web remain required;20features in progress.
See [server guide](../apps/server/README.md) and `.qa/local-import-month.json`.

| Date | Change |
|---|---|
| 2026-09-10 local claim core | Added worker-validated one-time archive import with immutable pending provenance and atomic identity/session transition;271tests/config/build and80MB probe pass. No public upload/review approval/web cutover yet; performance limits are measured and remain open. |


## Verified local claim core — 2026-09-10

`51a0734` passed independent review with no actionable introduced defects.271tests,
config/build and actual80MB integrity pass; imported history remains pending approval.
The measured48s import/29s cold read/2.65s main-loop gap remain explicit performance
work before public upload/cloud UI. Next: server cold-state loading while preserving
replay validation at the untrusted import boundary. No browser/economy change or
completed full-game claim. Receipt: `.qa/local-import-verification.json`.


## Trusted server checkpoint — 2026-09-10 (review pending)

Base89c7263: schema6 restores verified server state without resimulating history;
legacy migrations replay once, integrity failures refuse, imported saves still fully
replay in the worker.281engine/server tests,17focused checks, config/build pass.
All7 advisory numeric matches now explicitly document grammar/protocol/technical
bounds; gameplay numbers unchanged. Ordinary k/rush final run is in progress.
Existing80MB probe: cold read29.36s →2.23s with exact projection/events and retry;
import49.47s/main-loop gap3.53s remain M9 follow-up, not public responsiveness.

Owner steering: finish review/commit, stop this performance slice. No public upload,
new80MB tuning or host-sleep reruns now. Next deliver M0–M5 criterion closure report,
then M4 web server authority/reconnect/registry+admin before M6→M7→M8→M9.

| Date | Change |
|---|---|
| 2026-09-10 server checkpoints | Added trusted schema6 restore and corruption/rollback/legacy tests; performance measured once, further work moved to M9. Review pending; next is milestone closure rather than more M5 breadth. |


## Verified checkpoint and milestone closure — 2026-09-10

Slice: schema6 trusted server checkpoints; product `f86e2b3`, base `89c7263`.
Files: engine metadata/restore, SQLite store/import, regression tests and server guide.
Verification: config/build/typecheck,281tests,17focused,10kcohorts2.4186–2.8738,15rush PASS.
Review: no actionable correctness/security defects; reviewer independently passed17tests.
80MB integrity: exact world/events/original/retry; cold2.23s versus29.36s. No further tuning.
Numeric warnings:7technical/protocol/grammar literals annotated; no business numbers changed.
Receipt: `.qa/server-checkpoint-verification.json`; M9 follow-up records history volume.
Closure: M0 COMPLETE; M1–M5 explicit PASS/FAIL in linked report, no fabricated acceptance.
Next: M4 server-authoritative web, reconnect F23§8 and registry/admin BRD§5.2.
No merge/push/deploy. Owner gameplay decisions remain; no public upload added.

| Date | Change |
|---|---|
| 2026-09-10 verified checkpoint/closure | Closed reviewed f86e2b3 and M0 acceptance; published exact M0–M5 closure gaps and fixed owner dependency queue. |

## 2026-09-10 — M4 engine presence prerequisite (verification in progress)

Rules24 adds trusted hidden/menu-preserving connection recovery and resting loss.
It reuses presence bookkeeping, preserves rules1–23 history and does not reopen a
shift after grace. Source: `Game.reconnect`, `Game.disconnect`, disconnection and
checkpoint regression tests, including a genuine `9e88643` rules23 fixture.
This does not complete F23/M4: durable server leases, web authority/outbox and
registry/admin remain next. Owner performance timebox and M4→M6→M7→M8→M9 stand.

Verified `0bcbcde`:288 full tests +42 final focused checks (real HTTP included),
config/build/typecheck,10 ordinary k cohorts2.4186–2.8738 and15rush all pass.
Native review found no actionable correctness/security defect; independent engine
checks33/33 pass, HTTP rerun limited by reviewer socket permissions. Receipt:
`.qa/m4-presence-verification.json`. F23/M4 remain OPEN; this is engine readiness only.

## 2026-09-10 — M4 durable server heartbeat (review pending)

Schema7 now persists session-bound client leases and heartbeat sequences. Native
HTTP heartbeat and restart scheduler normalize exact loss before clock catch-up;
multiple views preserve aggregate menu/visibility state. Expiry/revocation, normal
closing, rollback, action idempotency and legacy migrations have executable tests.
Full config/build and298 engine/server tests pass; the strengthened final presence
suite10/10 passes. Native review is next. Engine/config values unchanged; prior
0bcbcde ordinary k/rush evidence remains applicable. Remote web/outbox/registry-admin
remain open, as does M4. Owner's no-public-upload/no80MB-tuning timebox is preserved.

Follow-up in the same boundary: public command admission now requires heartbeat
from the very first action; trusted internal fixture/import adapters are separate.
19 real HTTP/presence checks pass after strengthening the gate; final full checks
and full-range review are in progress. Web implementation remains next.

Final `9f38166` verified: config/build/typecheck and298 full tests pass;19 final
real HTTP/presence checks pass. Full-range native review found no actionable defect,
with9 independent SQLite/presence checks passing. Receipt
`.qa/m4-heartbeat-verification.json`. No engine/config changes or M9 tuning.
Server liveness portion is complete; remote web/outbox and registry/admin remain.

## Web server authority/outbox — 2026-09-10

Base8e25c19: default online web renders server snapshots and pinned rules, with authoritative
reports. Bounded durable commands retry exactly after response loss/reload. Current menu/
visibility heartbeat precedes replay, hung requests show reconnecting without client ticks,
and unsafe account/storage transitions preserve pending actions. Explicit local archive
choice protects existing progress while public upload is deferred.298unit/server,91legacy
browser and7remote scenarios pass; final hidden/menu check, sim and review in progress.
M4 remains open for registry/admin and integrated account/import/eligibility. Next work is
registry/admin, followed by M6–M9. Full game goal remains unchanged.

Final web cutover936e9d5:298engine/server +91legacy/10remote browser, config/build with
zero literal warnings,10ordinary kcohorts2.4186–2.8738 and15rush PASS. Full review
found a local corrupt-save recovery regression; corrected and independently reviewed
CLEAN. M4 now10/18criteria PASS but remains OPEN. Receipt `.qa/m4-web-verification.json`;
next protected registry/admin, then remaining M4 acceptance and M6–M9.

## Default Config Registry — 2026-09-10

Base732f860: immutable proposal, approval and publication/audit; JSON tier decisions,
server-only actor contract, publish retry/rate limit, VN day/common season scheduling,
rollback as a new version and actual GameStore opening resolution. Seed snapshots
remain registered for historical import but cannot activate themselves after restart.
Shorter heartbeat configurations re-arm the scheduler at actual durable lease deadlines.
307full tests +10final focused/10remote browser pass; final sim and independent review
in progress. No public admin API/editor yet; scoped overrides and MFA/SSO wiring next.
See [registry contract](config-registry.md). M4 stays OPEN and no acceptance count is inflated.

Final default registry c1e953c:310engine/server tests,10remote browser, config/build
with zero literal warnings,10ordinary kcohorts2.4186–2.8738 and15rush PASS.
Foundation P2 publisher-rotation bypass fixed by charging the author; persisted catalog
identity changes now require explicit migration. Independent correction review CLEAN.
Receipt `.qa/registry-verification.json`. M4 remains10/18 OPEN; next authenticated
admin transport/editor, scoped rules and remaining account acceptance, then M6–M9.

## Admin identity and registry HTTP — 2026-09-10

Base291264c: schema9 Google challenge + independent TOTP, private sub/role directory,
eight-hour admin cookie, atomic security audit, durable OTP replay/lockout and actual
registry read/propose/approve/publish endpoints. No browser-supplied actor fields and
no player session mutation.320tests/config/build pass; final positive TierC check,
remote browser regression and independent review underway. Editor/enrollment and
scoped config are next; no live Client ID, public archive upload or M9 tuning.

Final admin auth/registry API6f42575:320engine/server (10admin cases),10remote
browser, config with zero literal warnings/build/typecheck PASS. Independent code/
security review CLEAN with independent typecheck; reviewer socket tests blocked by
sandbox EPERM, all host HTTP tests passed. Prior registry10kcohorts2.4186–2.8738 and
15rush evidence retained; no engine/config changes. Receipt `.qa/admin-auth-verification.json`.
Next browser editor/GIS/MFA on this API, then remaining M4 and M6–M9. M4 still10/18 OPEN.

## Admin browser editor — 2026-09-10

Base988fc33: `/admin` has its own lazy entry, Google/Authenticator flow, author-bound
session draft, key/JSON import editor, shared raw/scaled diff, exact proposal retry,
separate approval/publication confirmation, historical rollback draft and audit.
Server context binding rejects another tab's changed admin cookie. Host checks:
321engine/server,8admin browser,10remote-game browser, config zero warnings/build PASS.
Mobile confirmation focus and before/after columns verified. Native independent review
pending. No live Google consent claim (owner has no ClientID); scopes, forecasts,
emergency/admin account enrollment and remaining M4 accounts/eligibility/locale remain.
Engine/config values unchanged; preserve prior registry k/rush evidence. No M9 expansion.

Final editor56a0a44:321engine/server tests,11admin browser and10remote-game browser
PASS; final config zero warnings/build PASS. Source remains frozen from final review:
CLEAN, independent typecheck/diff-check PASS; reviewer config execution hit tsx IPC
EPERM while host config passed. Known-success read failure, changed/identical JSON
import buffers all have regressions. Receipt `.qa/admin-editor-verification.json`.
M4 one-key/effectiveAt criterion now PASS (11/18); full M4 remains OPEN. Current
remaining admin scope includes overrides, forecasts, arbitrary version-pair comparison,
complete lifecycle labels, emergency/compensation and admin account enrollment/recovery.
Owner ClientID still absent; public upload/performance deferred; no merge/push/deploy.


## Scoped registry server core — 2026-09-10

Base8a4f2c6: schema10 scoped proposals use the existing authenticated-actor service,
approval/publication/audit and actual server opening path. Apply only changed keys;
priority is player > campaign > segment > default. Audience, priority, expiry and
same-scope predecessor are immutable. Player overrides consume a persisted support
ticket once; removal of old keys keeps their approval and schedule restrictions.
Resolved snapshots are stable and persisted for historical replay.12focused cases
pass; full tests/browser/sim and independent review underway. Scope transport/editor,
impact forecasts and automatic segment classification remain; M4 stays11/18 OPEN.
No new game values, public archive upload, performance tuning or live Google setup.
Contract: [Scoped Config Registry](scoped-config-registry.md).


Final scoped core `d91b92a`:334engine/server (13scoped cases),25focused registry
checks, config zero warnings/build/typecheck PASS;11admin/10remote browser at the
foundation, unchanged UI/HTTP in correction.10ordinary cohorts k2.4186–2.8738 and
15rush PASS. Full review P2 campaign timing fixed; correction has no remaining
findings and independently passed its new regression. Reviewer full rerun hit
local-listen EPERM; host full suite passed. Receipt `.qa/scopes-verification.json`.
M4 remains11/18 OPEN. Next protected scope/audience/expiry/ticket controls and impact
preview; automatic segment/cap policy awaits owner choice. No public upload/M9 work.


## Scoped admin controls and factual impact — 2026-09-10

Base22320d4: protected HTTP/editor for segment/campaign/player scopes, explicit
server IDs, VN expiry, priority, predecessor and support-ticket receipts. Loading
old scopes preserves newer defaults; empty replacement withdraws only that scope.
Exact pending scope payload survives lost acknowledgement/reload. Impact reuses
publication composition, counts only affected players/keys and persisted live pins,
and rejects masked future-expiry failures. It is not a seven-day economic forecast.
Host verification and native independent review underway. M4 remains11/18 OPEN;
full forecasts, admin account lifecycle and integrated account/eligibility/locale
remain. No engine/config/schema change, new public upload or performance tuning.


Final scoped controls `a84f41f`:339engine/server,29focused,18admin/10remote browser,
config zero warnings/build/typecheck PASS. Native full review identified three issues;
identity buffer clearing, transaction-bound impact confirmation and separately based
patch diffs resolve them. Correction review reports no new actionable regression.
Recorded live-pin counts are an observation at computedAt; confirmation instead binds
publication revision and time-dependent before/after resolutions. No schema, engine
or game-config changes; previous10ordinary kcohorts2.4186–2.8738/15rush retained.
Receipt `.qa/scope-ui-verification.json`; M4 remains11/18 OPEN. Next full forecasts,
admin lifecycle and integrated accounts/eligibility/locale; then M6–M9.


## Current-save economic projection kernel — 2026-09-10

Base `f41122b`: shared career policy now drives both the existing diagnostic and
a seven-day forecast from an integrity-checked Game. Config timelines apply at
actual openings; existing shifts preserve their pin. Forked state, commands and
calendar buckets replay exactly, with separate credited income, spending, customer
penalties and returned deposits. Two-day career output/hash is byte-identical.
Seven focused checks pass; full verify and native review underway. Protected server
audience/timeline aggregation and admin presentation still follow; this is not the
complete BRD forecast. Donation/VND data remains unavailable. M4 stays11/18 OPEN.
Contract: [Economic forecast](economic-forecast.md). No public upload/M9 tuning.


Final kernel `03a6800`:344engine/server, config zero warnings/build/typecheck PASS.
Two-day career still exactly matches its original report/hash. Foundation10ordinary
kcohorts2.4186–2.8738 and15rush PASS; runtime and those simulators unchanged by
corrections. Review identified two lease-progression edges: config retuning and
post-expiry snapshots. Both now use attained identity from the active lease/history;
final full-base review has no actionable finding and independently passed the lease
regression. Receipt `.qa/forecast-verification.json`. M4 remains11/18 OPEN: protected
server snapshots/timelines, aggregation/admin UI and observed VND data still remain.
No public upload,80MB tuning, engine/config changes or merge/push/deploy.


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

Review corrections: reproduction stages all outputs and refuses changed expected
hashes before publishing; the receipt is read-only. A regression fails the last
asset and proves every selected file/contact/receipt stays unchanged. Browser reload
keeps Date.now fixed while allowing React timers to run; all four cases pass,
including an intentional12second module delay. Asset/config/build still pass.
Final correction review follows; engine/config/runtime art bytes remain unchanged.

Final batch11ceb79 verified:344engine/server tests,4guest viewport cases (including
12s delayed reload),4asset viewport probes, export failure regression, asset/config/
build checks PASS. Independent correction review clears all three findings and
independently passes the no-mutation regression. Receipt .qa/table-art-verification.json.
Imagegen tables Lv2–Lv4 wired; Blender paused and preserved. Art remains draft.
Next owner decision: automate advanced career k≤3.5 with two30-day/LP4 seeds, no
retuning; then protected M4 forecast reporting and remaining M4→M6–M9 acceptance.

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

## First-run language entry implemented — 2026-09-10

Base6df1228. The existing welcome now appears before game/save/session creation,
with native vi/en choices, browser default and explicit stored acceptance. Selecting
language persists immediately; failed writes keep an actionable entry and no player
mutation. Legacy welcomed preferences preserve the original locale/live shift.
Settings changes reuse the same game/session. Config/build pass; full local/remote
browser regression and independent review are pending. No economy/auth mutation.
F25 remains open for Google web/claims, soft invitations and competitive eligibility.

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

| 2026-09-10 Steer #5 | Guest device persistencee34fd56 verified by357unit/84remote/4local/19admin/config/build and scoped review with no introduced defects. Correct prior ephemeral-guest interpretation; preserve current owner auth/transport boundaries. Invitation-config P1 remains a separate open follow-up; no extra milestone closed. |

| 2026-09-10 | E21 server admission03dae56 verified; M4 guest-benefits/cooldown PASS,14/18 OPEN. No economy/engine changes. |

| 2026-09-10 | E22 review/flag core/API521e901 verified:367unit/server,19admin browser,45focused,config/build and independent review PASS. M4 stays14/18; baseline/score/history controls follow. |

| 2026-09-10 | E23 score/baseline7e7f337 verified:376unit/server,19admin,32focused,config/build/review PASS; P1 worker correction closed. F28 in progress, M4 remains14/18. |

| 2026-09-10 | E24 admin controls85fbdfb verified;378unit/server +24admin browser, final5 affected browser/config/build and native full-base review PASS. M4 stays14/18; next public rank consumer. |


## 2026-09-10 — M4 arbitrary stored-config comparison verified

E26 at `62e8646` (base `fdda260`, first implementation `61e68d5`) closes the
BRD5.2.5 arbitrary version-pair viewer using existing admin reads and diff UI.
Removed historical keys, per-snapshot Base scaling, exact fetched labels, scoped
metadata, read-only roles and identity changes during reads are covered. Comparing
never changes a draft or publishes. Native scope disclosure improves portrait use.
386engine/server,27admin browser,config/build/typecheck PASS; final independent
full-base review CLEAN after documentation status correction. Initial full browser
26/27 exposed test-only OTP reuse; dedicated test actor fixed it, MFA unchanged.
Receipt `.qa/admin-compare-verification.json`; VI/EN390px captures inspected.
No engine/server runtime/economy JSON/schema change or new sim. M4 remains15/18;
hotfix schedule policy awaits owner, full M0–M9 objective remains active.

| 2026-09-10 | E26 arbitrary comparison62e8646 verified:386unit/server,27admin browser,config/build/review PASS. Full M4 and game remain open. |


## 2026-09-10 — M4 registry lifecycle verified

E27 `b5d3545` (base `2ad3f66`) closes the admin lifecycle display using immutable
records, one injected server timestamp per read transaction and per-row timestamps
for pagination. Shared scope selection preserves actual resolver semantics. Default
activation, archived replacements, scope expiry/non-resurrection, stored composite
snapshots and comparison refresh are verified. Engine/economy/schema unchanged.
389unit/server,39focused,27admin+3final affected browser,config/build PASS;
independent full-base review reports no actionable introduced issues. Receipt
`.qa/admin-phase-verification.json`; VI/EN390px views inspected.
M4 remains15/18; the hotfix scheduling decision and other remaining acceptance
are still open. Full M0–M9 objective remains active.

| 2026-09-10 | E27 lifecycleb5d3545 verified:389unit/server,39focused,27admin+3final browser,config/build and review pass; M4 remains15/18. |


## Owner queue / asset handoff — 2026-09-10 Steer #6/#7

Emergency policy resolved: hotfix replaces exact-scope pending schedules, immutable
supersession audit and stale-preview rejection required (admin-emergency.md).
Next implement that registry path, then explicit dev identity stub and M4 closure;
E26 any-two-version diff is already done. Real ClientID and all human-only playtest
criteria waived for this build; affected account PASS still requires stub evidence.
No economy/engine changes. Keg Lv2–Lv5 imagegen exports replace4placeholders with
source/prompt/hash receipt and 128/64/32 sheet.16placeholders/108drafts remain;
2export regressions +2stock/upgrade browser cases PASS; full verify PASS: config/build,389unit/server,10standard cohorts,15rush and2x30-day careers. Receipt: `.qa/keg-asset-verification.json`.

| 2026-09-10 emergency implementation | M4 emergency hotfix implementation now covers ownerSteer6 end to end.64focused server tests and1mobile browser test pass before final added boundary regression; full verify/admin suite and independent registry review running. M4 stays15/18 pending remaining account/donation/import acceptance. |

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


### Steer15 (1a–d) — UI copy, 2026-09-11

Kitchen upgrade value and raw ingredient labels are implemented in VI/EN. Slots, portions, unlocks, speed, phone gate and QR multiplier derive from existing config. No engine/config changes. Focused label/browser results and full verify receipt are recorded in implementation-tracker; remaining scope is13 equipment sprites then normal config2.0.3 publication to the pinned preview.


## Steer15 (2) — equipment drafts, 2026-09-11

All13 requested per-level sprites generated via built-in imagegen and exported through the existing keyed-alpha/native-crop/token-palette pipeline: washer2–5, cooler2–5, stall1–5. Manifest paths resolve with source, draft status and SHA-256; no fallback needed for this batch.132entries/121drafts/3remaining placeholders; check:assets PASS. Prompt/export provenance and128/64/32px contact sheet are in the asset checklist. Full verify PASS406/406, standard10cohorts k2.5644–2.9168,15rush cases, career42/99 k3.46546/3.39320. Per-level upgrade-image browser regression PASS; independent source/art review CLEAN. The playable smoke passed360×740 and1280×720;390×844 is retrying after a test-only popup/receipt synchronization correction. Tag and preview cutover remain gated on that result. No engine/config or kitchen art changes.


### Steer15 playable-v0.1 acceptance — 2026-09-11

All three real12-minute viewport paths PASS:390×844561ms/60.25fps/68served;360×740751ms/60.44fps/75served;1280×7201040ms/60.27fps/83served. Every path includes earned-coin upgrade, restock, washing, summary, next day, reload/new-tab persistence,0console/failed requests. The390 retry fixed only test popup/receipt synchronization. Full verify406/406 +10standard/15rush/2career gates and check:assets green; source/art and local-operation reviews CLEAN. Code/art7dc5998, copyaf9d287. Tag/run instructions: docs/playable-v0.md. Remaining owner step: backed-up preview cutover then normal next_shift publication of source2.0.3 to the existing registry, preserving historical pins and receipts.


### Steer15 complete — pinned preview and config publication, 2026-09-11

Steps1/2:af9d287/7dc5998. Local preview now serves tagplayable-v0.1 b3cfb34. Normal next_shift publicationregistry-183f67c7-2c6e-489a-94d5-0862e29bb0f7 (source2.0.3,7418c7b; base2.0.1), ordinary audit seq5/6/7, identical retry receipt. Backups retained;4old profiles,7054commands,4842events,30receipts and3old shift pins preserved. New Lv1 buffer4/4 verified. Temporary dev Super/TOTP operator logged out and removed; original disabled admin state restored. Full verify406/406 +all economic gates and3guest viewport shifts PASS,121drafts/3remaining placeholders; runtime core console0. Broader dev-account console smoke found the pre-existing HTML pattern error in admin-api.ts:68; sign-in still preserves the same shift/coins. This out-of-scope defect is recorded in docs/playable-v0.md, not silently waived or fixed. No other feature work started.


### Steer16 · M4-DEV-PATTERN — PASS, 2026-09-11

Escaped the HTML Unicode-v literal hyphen in the shared dev-account form. Native invalid-name rejection, same-shift link and fresh-context restore pass with0console/page errors (1browser regression); independent auth review CLEAN. Full verify406/406,10standard k2.5644–2.9168,15rush,2career k3.46546/3.39320 PASS. No server/engine/config change; preview stays playable-v0.1. Ordered remaining queue and the11:05 equipment UI addendum are in milestone-closure-m0-m5.md.


### M1-EQUIPMENT-UI — PASS, owner addendum 2026-09-11

Kitchen Lv0 has an explicit empty slot and locked copy; an unavailable level never borrows another level's art in upgrade comparisons. Four retained imagegen kitchen originals have compact v2 exports (7,289,987→59,845 bytes total), true alpha, native sizes and manifest checksums. Cooler cards explain configured baseline freshness, stale tip/reputation outcome and hot/humid multipliers; HUD uses the actual weather-adjusted duration with a seconds unit. VI/EN label8/8, kitchen7/7, production5/5 PASS; typecheck/build/config and406unit/server tests PASS. Two old production assertions were updated for baseline card values and spaced seconds. Engine/config untouched; standard/rush/career gates reuse the full green M4-DEV-PATTERN source result, with an additional full verify still running in `.qa/steer16-equipment-verify-final.txt`. Preview remains v0.1 until batch release.


### M1-SHIFT — PASS, 2026-09-11

Reconciled the stale closure row using the accepted v0.1 three real12-minute viewport receipts, reopened and hashed (E28). Serving/restock/earned upgrade/washing, summary, next day, reload/new tab all pass;0console/missing assets. Docs-only change; no redundant gameplay implementation. New v0.2 smoke remains a release gate.


### M1-SCREENS — PASS, 2026-09-11

Seven core screens ×3viewports verified through real server transport:3/3 browser tests,21screenshots,0console/page errors, no missing images or viewport overflow; typecheck PASS. Source/engine/config unchanged. M1 now8PASS/1WAIVED/3open criteria; see closure for exact evidence.
