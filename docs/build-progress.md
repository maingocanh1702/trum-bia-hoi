# Build progress — Trùm Bia Hơi

Started 2026-09-08 from `30c0285`. Active worktree: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game`, branch `codex/game-build-isolated` based on `bc79af5`. A concurrent Claude docs commit captured the first engine files in the original checkout; original files were preserved, and further work was isolated. Authority: HANDOFF v1.15,
PROMPT PACK part B, GDD decisions, 03-SPEC table rules, JSON numbers. This is the
complete-game goal; milestones below are implementation order, not scope cuts.

| Milestone | Status | Evidence / remaining |
|---|---|---|
| M0 — config, pure engine, deterministic replay, k sim, workspaces | Verification passed; correction review CLEAN | Config/schema + workspaces + pure engine + replay + actual 5-seed k sim; 27 unit checks pass; review evidence below |
| M1 — serve loop, glasses, stock, upgrades, local save, spatial UI, core audio | In progress | Playable loop, local save/replay, stock/equipment/table UI, core SFX wired; final sprites and listening QA pending |
| M2 — guest, vi/en, onboarding | In progress | Local guest + matching vi/en keys + event-driven guide with skip/repeat cap; Google account linking and 5-person evidence pending |
| M3 — full menu, customer mix, weather, rush, business unlocks | In progress | 6 menu entries and hot prep, 5 seated types, 5 weather states, basic scheduled rush. Local phone/QR progression reviewed; shipper local reviewed CLEAN at307a3b0. Football, remaining business upgrades and exhaustive balance/edge QA remain |
| M4 — server authority, accounts, reconnect, config registry/admin | Pending | |
| M5 — seasons, leaderboard/shrine, life path, leases, quests/referrals | Pending | |
| M6 — risks, dog, emergency supplies | Pending | |
| M7 — voluntary donations, cosmetic gifts, age notice | Pending | |
| M8 — football events, season shop, legal-gated lottery | Pending | |
| M9 — complete art/audio, accessibility, replay/security/performance QA, release | Pending | |

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

1. Complete M1/M3 rule gaps: segment/day caps, individual reputation ejection,
   business-unlock prerequisites, larger-table price rows beyond the existing 10-seat curve,
   full rush schedule, shipper/football demand and business unlocks. Version new
   replay semantics; preserve the current mixed-round/patience/midnight regressions.
2. Finish the 14 illustrated drafts, replace 30 remaining sprite placeholders and
   complete the 75-event audio set with listening QA. The current 32 clips are
   original synthesis drafts; final export/performance/family polish remains.
3. Add server SaveStore/authority + Google linking/reconnect and Config Registry with
   real role/approval/schedule/override handling. Keep the existing log/config pinning.
4. Continue all meta, risk, event and release rows above; preserve legal/content holds.

## Known implementation limits

- Local runtime only; settings Config screen is a snapshot viewer, not an admin editor.
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
