# BLOCKERS (item · what blocks · what was finished · options)


## S1 · a11y / remote / admin Playwright tiers cannot run from a worktree
- What blocks: hard-coded test ports. `apps/web/remote-test/server.ts:76` listens on 4180 with origin `http://127.0.0.1:4179` (used by the remote tier and, via playwright.dev-identity.config.ts, by `npm run test:a11y`); `apps/web/admin-test/server.ts:18,49` on 4183/4182 with origin 4181; `admin.spec.ts`, `moderation.spec.ts`, `account-ui.spec.ts` hard-code 4179/4181. `scripts/verify/port.ts` moves only the Playwright configs, so from `.autopilot/worktrees/eco21` (window base 29360) every webServer wait times out after 60 s (measured 18:01-18:03 on 0d5a311). The brief forbids the main checkout's ports. (Those two timed-out attempts did hold 4180 for up to 60 s each; the admin attempt was stopped before it started.)
- What was finished: all S1 work; the S1 screen (Upgrades sheet) audited by axe in the local tier, vi+en x 3 viewports, 0 violations; local 167/167 + seat-model 6/6; guest/improve/playable run from the worktree's own ports.
- Options: (a) orchestrator runs `ROOT=<eco21 worktree> TBH_PORT_BASE=4178 bash .autorun/ui-tiers.sh <ev> a11y remote admin` while Track A is idle; (b) run them from main after integration; (c) a small tooling slice: both test servers read TBH_PORT/TBH_ORIGIN like playable-test/server.ts and the specs use baseURL-relative origins.

## Env · GitHub CLI is not logged in and the repository is private — RESOLVED 2026-10-19 23:05 (GMT+7)
- Status: **RESOLVED.** The founder ran `gh auth login`; `gh auth status` now reports "Logged in to github.com account maingocanh1702 (keyring)", token scopes `gist`, `read:org`, `repo`, `workflow`. From now on the run uses `gh` as AUTOPILOT §4.4 says (PRs created and edited with `gh`); `.autopilot-state/pending-prs.md` stays only as the fallback if `gh auth status` fails again at the start of a stage.
- What blocked (history): `C:\dev\tools\gh\bin\gh.exe` v2.102.0 was installed but not authenticated, and the repo `maingocanh1702/trum-bia-hoi` is private, so the unauthenticated REST API answered 404. Per AUTOPILOT §9-C no token was taken from git's credential helper, other apps or files.
- What was finished meanwhile: git push access verified with `git push --dry-run origin main:main`; PR bodies were to be saved as `PR-BODY.md`.
- Resolution: authentication by the founder (no token was lifted); `gh pr view 22` and `gh pr list` verified on 2026-10-19 23:0x.

## Env · S1's report (PR #22 body) is not readable from this clone — RESOLVED 2026-10-19 23:05 (GMT+7)
- Status: **RESOLVED.** `gh pr view 22` works. The body is saved as `.autopilot-state/reports/S1-pr22-body.md` (94 lines) and was cross-checked against `MERGE-PACKET.md`: same numbers (601/601 tests, local e2e 170/170, a11y 6/6, remote 98/98, admin 29/29, k 3.963 / 3.948), same tip `8f50e5f` (code `9b31c47`), same 17 conflicting files, same decisions. The PR body is a superset: it adds the GitNexus CRITICAL list with direct-caller counts, doctor map 187/187 (red on `9b31c47`, fixed by `8f50e5f`), improve 1/1, decisions 4 / 8 / 10 and the `config.ts` `shape()` merge nuance (keep S1's seat-model validation + legacy shape AND Wave 1's governance-tier tolerance). Both documents are stale on `main`'s tip (`2f5e727`; it is `d1a150a` after the docs-only PR #23) and the PR banner ("owner cancelled S2–S6 … only Wave 2 PR") is no longer true.
- Not recoverable here: S1's own evidence (`artifacts/verification/feat-eco21-seat-model/`, git-ignored, Mac-local). Stage 00 re-measures on this laptop instead.

## 00 · Playwright tiers a11y / remote / admin ran from this clone's own port window (S1 blocker, option b)
- Status: **WORKED AROUND, root cause still open.** This clone is the only checkout on the laptop, so the hard-coded ports 4179–4183 were free and `playwright.accessibility.config.ts`, `playwright.remote.config.ts` and `playwright.admin.config.ts` ran from it (stage 00 report: a11y 6/6, remote and admin results in the PR #22 body). The fixed ports still block running them from a second worktree or while another session uses the window.
- What is still needed: the small tooling slice of option (c) — test servers read `TBH_PORT` / `TBH_ORIGIN` like `playable-test/server.ts`, specs use baseURL-relative origins (`apps/web/remote-test/server.ts:76`, `apps/web/admin-test/server.ts:18,49`, `admin.spec.ts`, `moderation.spec.ts`, `account-ui.spec.ts`).

## 01 · carry-forward: `upgrades.keg._rule` still describes the tap (rewrite at the first version bump)
- What blocks: nothing now. `docs/config/economy.tbh.json` `upgrades.keg._rule` still says "Vòi rót tối đa pourSlots cốc trong pourMs, mỗi cốc trừ 1 khỏi bom" for keys that no longer matter to service on a seat-model game with the keg refill on (S2, rules 28). Nothing surfaces it: `check:config` / `check:economy` ignore `_rule`, the admin registry keeps `pourSlots` / `pourMs` as live Tier B tunables, and Settings → config prints the raw JSON to the player. Editing the string changes the content of 2.0.21 and would force a `_meta.version` bump, which S2 may not do (no number or key change).
- What was finished: S2 left the JSON untouched; the stale string is named in the 08-SPEC S2 changelog row and in DECISIONS `## 01 · k and income are measured, not tuned …`.
- Options: **S3** (the first slice that bumps `_meta.version` from 2.0.21, for `spawn.capacityDemand` and the queue keys) rewrites the `upgrades.keg._rule` string together with that bump, where the content change costs nothing extra; **S5** re-prices keg Lv2–5 for reserve + refill (the `pourSlots` / `pourMs` columns are dead at rules 28) and may drop or repurpose the two keys. This supersedes the "S5 seals 2.1.0" timing in the 08-SPEC S2 row: the first bump is the earlier opportunity.

## 02 · carry-forward `upgrades.keg._rule` — RESOLVED by S3 (JSON 2.0.22)
- Status: **RESOLVED.** S3 is the first slice that bumped `_meta.version` (2.0.21 -> 2.0.22), and the string now describes rules 28 (instant pour on a seat snapshot with the refill on; the tap, `pourSlots` / `pourMs`, only for capacity pins, rules <= 27 replays and `refillEnabled=false`). `spawn.queueSlotsFormula` was rewritten with it. Still open for S5: re-price keg Lv2-5 (they buy reserve and refill only at rules 28) and decide whether the two tap columns stay.

## CI-LINUX · GitHub Actions did not start (account billing) — 2026-10-20 — RESOLVED 2026-10-20 14:10
- Status: **RESOLVED 2026-10-20 14:10 (GMT+7).** The founder fixed the account billing; the first Linux runs happened that afternoon (main d1a150a: run 39382629533, S4 tip ace32a4: run 39382635029; report `.autopilot-state/reports/ci-linux-S4-ace32a4.md`): on Linux `npm test` is 616/616 on main and 693/693 on the S4 tip, `verify:doctor` exits 0 on both and the admin tier is 29/29 on main, so the Windows baseline reds were environmental. The text below is the original entry, kept verbatim.
- Run: https://github.com/maingocanh1702/trum-bia-hoi/actions/runs/39375957149 (branch `ci/linux-main-d1a150a` = main d1a150a + the workflow commit, workflow `verify-linux`, 2026-10-20 05:38 UTC). All three jobs ended in 2 s with no step.
- Exact annotation on every job: "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings"
- Consequence: there is no Linux result. The 47 baseline `npm test` reds, `verify:doctor` and the admin Playwright tier stay unverified on a POSIX platform; the final PR keeps the "needs a macOS/Linux/CI run" caveat.
- What the autopilot did (CI-LINUX.md §6): wrote this entry, deleted its own `ci/linux-main-d1a150a` branch, changed no setting, took no token. Retries: at most two more, at the next stage boundaries.
- Owner action (not done by the run): in GitHub → Settings → Billing & plans, fix the payment method or raise the Actions spending limit for the private repo; then push any `ci/linux-*` branch (workflow copy `.autopilot-state/verify-linux.yml`, helper `.autopilot-state/make-ci-branch.sh <base-ref> ci/linux-<name>`) or ask the orchestrator to re-run.
- Retry 1 of 2 at the stage 03 → 04 boundary (2026-10-20 13:3x SEAST): branch `ci/linux-s4-ace32a4` (S4 tip ace32a4 + workflow commit) → run https://github.com/maingocanh1702/trum-bia-hoi/actions/runs/39380600524, same result (all three jobs ended in about 1 s with no step; same billing annotation). Branch deleted again. One retry left (stage 07).

## 04 · P0 — shift 1 does not earn table 2: the strict row is red for every lever, the plan-narrative row is red at D19's maxMult 4 and for every set found — 2026-10-21, rewritten in review rounds 2 and 3 (every share over 300 probes) — [NEEDS OWNER DECISION 1 of 2]
- Status: **OPEN, owner decision.** Every other row of the plan's gate table (21 of 23 with the first-goal row) is green on seeds 42 and 99 with the plan's own bot; the two red rows are two readings of the same sentence, "shift 1 earns table 2". The committed set keeps every number the owner decided (D13 apart, see the second entry), so it keeps D19 `capacityDemand` refTables 6 / maxMult 4 and D25 `queueBaseSlots` 1.
- **Review round 3 (read this first).** Every share of the round-2 packet was a first-60-probe-seeds number. A share over 60 probes has a 95 % interval of about +-10 points (48 of 60 reads 68-88 %), and several round-2 claims rested on that noise plus the selection of the best of 416 grid points. Every share below is over **300 probes** (seeds 1..300; the first 60 are the earlier runs) with its 95 % Wilson interval beside it; `balance-gates.ts` counts 300 probes by default now (`--shift1=N` changes it) and prints the interval in the `shift1.plan` cell. What changed against round 2: the committed set is **26 %** (22-32 %), not 19 of 60 = 32 %; Set 4 (option d) is **69 %** (64-74 %), not "exactly 4 in 5" (48 of 60), so the plan-narrative row is red for (d) too; D19 maxMult 2 is 67 % (61-72 %), not 46 / 45 of 60; table 2 at 1 100 xu is **78 %** (73-82 %), not "83-85 %"; with maxMult 4 the other levers reach at most 35 % (30-40 %), not "26 of 60". The sentences "the three plan numbers hold only in a thin corner", "the row passes only at maxMult 2.05 + queueBaseSlots 2" and "exactly 4 in 5" are **withdrawn**: the 46 / 47 / 48 of 60 differences between neighbouring grid points were noise. Round-2 tables at n = 60 stay in `sweeps/r2/` as history. One command per figure is listed at the end of this entry.
- The rows, and whose numbers they are. STRICT (`shift1.wallet`; plan section 0 table, shift 1: "Kết ca: mua bàn 2 (850-1.160 xu + 750 khởi đầu)"; section 7 owner line 3: "kết ca 1 mua được bàn 2 (1.500 xu)"): the start wallet is below table 2's price AND every one of 300 probes, on both service models (the fast one and a 4 s beat), ends shift 1 with 1 500 xu after the beer restock. PLAN-NARRATIVE (`shift1.plan`, added in round 2 beside the strict row and never instead of it; round 2 called it "plan-literal", which overstates it): three conditions, of which only the numbers are the plan's words. (1) At least 4 probes in 5 (the worse of the two service models) hold 1 500 xu the moment the shift closes. **Plan section 4, row `fun-onboarding-visual` (`docs/PLAN-vui-3-ca-2026-09-18.md:87`), asks FIVE new human players: at least 4 of 5 buy table 2 at the end of shift 1 without opening help, and `docs/phase0-alpha-playtest.md:134` repeats it as "Ngưỡng PLAN §4".** The plan has no criterion on a share of bot probes: transposing the 4/5 to the share of the probes (served at once or on a 4 s beat; a first-time human is slower) is my reading, not plan acceptance. (2) The median takings are 850-1 160 xu (section 0 narrative; the DESIGN-story says 850-1 150) and (3) the median shop sends 8-12 pairs away ("~10 cặp nhìn quán rồi đi"): the narrative read as two bands, also my reading.
- The committed set (L2; every number over 300 probes): STRICT: start 750 < 1 500, worst end 732, median 1 235, **231 of 300 probes below 1 500** (both service models). PLAN-NARRATIVE: **26 % (95 % CI 22-32 %; fast 79/300, 4 s 80/300) can buy table 2 when the shift closes**, median takings 542 (4 s 529) against 850-1 160, median refused pairs 5 against 8-12 (over 600 probes: 24 %, 20-27 %). So about three new players in four need a second shift for table 2, and the plan's narrative is not what D19's maxMult 4 produces: the gap to the next group of a one-table shop is x4.
- What the demand lever does (D19 `capacityDemand.maxMult`; the committed set otherwise; 300 probes per column; last row: the full evaluator on seeds 42 | 99):

| `capacityDemand.maxMult` | 4 (committed, D19) | 3 | 2.5 | 2 | 1.75 | 1.5 |
|---|---|---|---|---|---|---|
| probes that hold 1 500 xu when shift 1 closes, fast / 4 s (of 300) | 79 / 80 | 129 / 128 | 171 / 171 | 208 / 201 | 229 / 229 | 254 / 249 |
| share of the worse model (95 % interval, n = 300) | 26 % (22-32) | 43 % (37-48) | 57 % (51-62) | 67 % (61-72) | 76 % (71-81) | 83 % (78-87) |
| median takings, fast / 4 s (plan: 850-1 160) | 542 / 529 | 702 / 677 | 796 / 793 | 937 / 929 | 1 051 / 1 028 | 1 193 / 1 197 |
| median refused pairs (plan: about ten, read as 8-12) | 5 | 7 | 9 | 11 | 13 | 15 |
| other rows red (full evaluator, the rest of the committed set unchanged) | none | LP2 49 and gap 9 on seed 99 | LP2 50 and gap 10 on seed 42 | first chair 39 \| 38, door days 15-21 16.0 % on seed 42 | first chair 39 \| 39 | first chair 37 \| 36, door days 15-21 15.1 % on seed 99 |

- **The three plan numbers do not hold together.** A 40-point grid over D19 maxMult 1.5 / 1.6 / 1.7 / 1.8 / 1.9 x `queueBaseSlots` 1 / 2 x patience 24 / 33 s x tip 0.17 / 0.19 (300 probes per point; the shift-1 probe only, the other rows are not evaluated at those points): **no point meets the three conditions of the plan-narrative row together.** The share reaches 80 % at 16 points, all at maxMult 1.5-1.6 (83-85 %), where the median refused pairs are 14-15 (band 8-12) and the median takings are above 1 160 at 14 of the 16 (1 146-1 147 at the other two: maxMult 1.6, patience 33 s, tip 0.17; 14 pairs). The pairs are inside 8-12 at 16 points, all at maxMult 1.8-1.9, where the share is 70-75 %. The takings are inside 850-1 160 at 26 points. The closest points: maxMult 1.7 (77-79 %, takings in band, 13 pairs) and maxMult 1.8 with queue 2, patience 24 s, tip 0.19 (75 %, 12 pairs, takings 1 057 / 1 050). Plainly: takings 850-1 160 xu, about ten refused pairs and table 2 at 1 500 xu bought by the end of shift 1 by 4 probes in 5 are mutually inconsistent with D19's maxMult 4 in this engine (26 %), and nearly so at any maxMult: more demand per table trades the share against the pairs (a share of 80 % needs maxMult 1.6 or less and 14-15 pairs; 8-12 pairs need maxMult 1.8 or more and 70-75 %).
- With maxMult left at 4 no other lever reaches 80 %: tip 0.20 gives 28 % (23-33), tip 0.30 gives 35 % (30-40), patience 36 s or 48 s give 25 % (21-31), `queueBaseSlots` 2 or 3 and `spawn.baseMs` 4 000 / 6 000 / 8 000 give exactly the committed 26 % (neither acts in shift 1 at maxMult 4), and tip 0.30 + patience 48 s + `queueBaseSlots` 3 together give 33 % (28-39). The levers that move the share at all are D19, the price of table 2 and D17's `pPair`: owner numbers, which is why this is a decision and not a number the autopilot may move.
- Options for the owner (none is a number the autopilot may move silently; every figure over 300 probes, the other rows from the full evaluator, one command each at the end):
- **(a) Price table 2 lower** (committed demand, maxMult 4). The price moves only condition (1), the share: takings 542 / 529 and 5 refused pairs are the same at every price, so the plan-narrative row stays red as a row under (a) at every price (the evaluator's failing list at 1 070 xu is still `shift1.wallet, shift1.plan`). The strict row cannot be met by a price: it needs table 2 at 730 xu or less, below the 750 xu start wallet (the worst of 300 probes ends shift 1 at 732; at 733 xu one probe is below). The chip text and every spec say "1.500 xu".

| table 2 price (xu) | share of the worse model (95 % interval, n = 300) | the other 21 rows (full evaluator, seed 42 \| 99) |
|---|---|---|
| 1 500 (committed) | 26 % (22-32) | green |
| 1 400 / 1 300 / 1 200 | 34 % (29-40) / 47 % (41-52) / 63 % (57-68) | not run |
| 1 100 | **78 %** (73-82) | green: first chair 40 \| 40, LP2 46 \| 46, gap 8 \| 7 |
| 1 075 | 79 % (74-83) | green |
| **1 073** | **82 %** (78-86): the first price with the share at 80 % or more | green: first chair 40 \| 40, LP2 45 \| 46, gap 8 \| 7 |
| 1 070 | 83 % (79-87) | green |
| 1 065 | 84 % (79-87) | green: first chair 40 \| 40, LP2 45 \| 45, gap 8 \| 7 |
| 1 060 | 84 % (79-87) | **first chair at shift 38 on seed 42** (window 40-56) |
| 1 055 / 1 053 | 84 % (79-88) | first chair 38 on seed 42 |
| 1 050 | 84 % (80-88) | first chair 38 on seed 42 |
| 1 000 | 89 % (85-92) | **30-day value 9.196 tr on seed 42** (limit 9.185) |
| 900 | 96 % (94-98) | not run |

- (a), read: the window in which (a) holds 80 % and keeps the other 21 rows is **1 065-1 073 xu**; the share steps from 79 % at 1 075 xu to 82 % at 1 073 xu (10-11 probes end shift 1 between the two prices), so the 80 % is a point estimate on a cliff with the lower end of its interval at 78-79 %. "The ladder keeps its other rungs" holds from 1 065 xu up, and not at 1 060 xu and below.
- **(b) First-shift guest rules** (D12-D19: pairs are refused for lack of a two-chair table): `spawn.pPair` (D17). It moves the share but takes the refused pairs (the plan wants about ten, the door row at least five) and the first chair with it:

| `spawn.pPair` | 0.5 (committed, D17) | 0.4 | 0.3 | 0.2 | 0.1 |
|---|---|---|---|---|---|
| share of the worse model (95 % interval, n = 300) | 26 % (22-32) | 41 % (36-47) | 58 % (52-63) | 73 % (68-78) | 89 % (85-92) |
| median takings, fast / 4 s | 542 / 529 | 669 / 669 | 821 / 822 | 969 / 969 | 1 169 / 1 162 |
| median refused pairs (probes) | 5 | 5 | 4 | 3 | 1 |
| other rows red (full evaluator, seed 42 \| 99) | none | 30-day value 9.304 tr on seed 99, first chair 36 \| 34, door shift 1: 4 pairs on seed 42 | first chair 32 \| 30 (window 40-56), door shift 1: 3 \| 4 pairs (>= 5) | first chair 27 \| 26, door 2 \| 1 | first chair 26 \| 25, door 2 \| 0 |

- (b), read: the pairs that look at the shop and leave are the wordless tutorial of P4, so (b) costs the door row, the first chair and part of the narrative.
- **(c) Accept** that about three new players in four need a second shift for table 2 (the committed set, 26 %, 22-32 %).
- **(d) D19 `maxMult` about 2** (Set 4 below): D19 maxMult 2.05, D25 `queueBaseSlots` 2, the tip at 0.19, patience 33 s, the location multiplier flat at 1.0, re-priced devices and chairs. Over 300 probes **69 % (64-74 %; 207 of 300 on both service models; over 600 probes 415 of 600 = 69 %, 65-73 %)**, median takings 954 / 937 and 11 refused pairs are inside the narrative's bands, but the share is short, so **`shift1.plan` is red for (d) too**; one career cell is also one shift off (first second chair at shift 39 on seed 42, window 40-56); the evaluator's failing list is `chair1, shift1.wallet, shift1.plan` (5 seed-cells). The round-2 "48 of 60, exactly 4 in 5" was the first 60 of those 300 probes (48 of 60 = 80 %, interval 68-88 %) picked as the best of 416 grid points. (d) moves D19, D25, the tip and the multiplier and does not buy the share.
- Exhaustion-rule status (AUTOPILOT section 5 stage 04: unreachable by JSON only after >= 3 full passes without improvement AND every named lever swept). STRICT row: **met** — `balance-p0.ts` swept `tip.rate`, `capacityDemand` maxMult and refTables, `runtime.queueBaseSlots` and `queueSeatsPerSlot`, `patience.thuongMs`, keg storage and batch, stall stock, `rush.schedule.warningMs` and table 2's price: 73 candidates, 4 passes, the last 3 without improvement (`sweeps/literal/p0-named/`); the best worst probe ends at 1 262 (tip 0.5 + maxMult 1 + patience 12 s, which breaks the standard k, the first chair and the door, Set 2 below). PLAN-NARRATIVE row: **NOT met** — joint1, joint2 and joint3 stopped inside their first pass and joint4 inside its second (one full pass in all, joint4's first, which improved), and six one-axis perturbations of Set 4 (first-chair price x1.25 / x1.5 / x2, patience 36 s, tip 0.18, table 8 +3 %, full evaluator, `sweeps/r3/eval/set4-*.table.txt`) did not close its first-chair cell (39 on seed 42 in five of them, 38 with patience 36 s; two of them also push the 30-day value over 9.185 tr, x1.25 and patience 36 s, and two break LP2, patience 36 s and tip 0.18); no clean set is in sight, but the rule is not satisfied for that row, and Set 4's share is 69 % anyway. The committed-set rule "(ii) fewest owner numbers moved before (iii) best P0 rate" decides L2 **by construction**: every lever that moves P0 (D19, D25, D16's table price, D17's pPair) is an owner number, while plan section 0 ranks P0 first; it is a tie-break, not a search outcome.
- Sets, full tables (23 rows, seed 42 | seed 99; the plan's protocol: seats first + direct leasing + no dog, start 2026-09-09, 30 days; shift-1 rows over 300 probes; `node --import tsx packages/engine/sim/balance-gates.ts --patch=<json> --onboarding-pair`):

**Set 1 — committed: candidate L2** (the sealed 2.1.0 = `plans/candidate-l2.json`, i.e. `candidate-l.json` with the owner's cap 400 000, 3-day lease and LP7 / league tier 7 2 000 000 back): 21 of 23 rows green; STRICT and PLAN-NARRATIVE red (`npm run sim:balance`).
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 2.339 · full 2.691 · cold/off 2.318 · full/off 2.787 | cold 2.315 · full 2.813 · cold/off 2.366 · full/off 2.845 | PASS
career k, standard order (D4a) | <= 3.5 | 3.173 (raw 3.97) | 3.136 (raw 3.90) | PASS
30-day total value, standard order | <= 9.185 tr | 9.073 tr (raw 18.07) | 8.997 tr (raw 17.73) | PASS
LP7 reached at shift | 140-170 | 164 | 165 | PASS
all equipment at max by shift | <= 170 | 164 | 165 | PASS
8 tables at Lv4 by shift | <= 170 | 164 | 165 | PASS
table 4 bought at shift | <= 48 | 14 | 15 | PASS
first second chair at shift | 40-56 | 41 | 42 | PASS
first table Lv2 at shift | <= 56 | 50 | 50 | PASS
first table Lv4 at shift | <= 120 | 82 | 84 | PASS
LP1 and LP2 by shift | <= 48 | LP1 14 · LP2 47 | LP1 15 · LP2 48 | PASS
LP3 and LP4 by shift | <= 96 | LP3 51 · LP4 56 | LP3 51 · LP4 56 | PASS
LP5 by shift | <= 120 | 70 | 71 | PASS
longest stretch of shifts without a purchase | <= 8 | 8 (shifts 14-22, 101 purchases) | 7 (shifts 2-9, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 2.1 % (of arrivals 0.7 %) | 0.6 % (of arrivals 0.2 %) | PASS
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 10.5 % (of arrivals 8.8 %) | 11.7 % (of arrivals 9.6 %) | PASS
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 12.3 % (of arrivals 10.3 %) | 12.0 % (of arrivals 9.8 %) | PASS
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 19 / 5 | 17 / 5 | PASS
daily earn cap first reached at shift | >= 150 (or never) | not reached | not reached | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 1.6 % (49 guests; of arrivals 0.1 %) | 2.7 % (86 guests; of arrivals 0.2 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1235 (231/300 and 231/300 below 1500; takings min -18) (x) | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1235 (231/300 and 231/300 below 1500; takings min -18) (x) | FAIL
shift 1 earns table 2, the plan's narrative (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 26 % of 300 runs close with >= 1500 (95 % CI 22-32 %; fast 79/300, 4 s 80/300) · median takings 542 (4 s 529) · median refused pairs 5 (x) | start 750 < 1500 · 26 % of 300 runs close with >= 1500 (95 % CI 22-32 %; fast 79/300, 4 s 80/300) · median takings 542 (4 s 529) · median refused pairs 5 (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (4 seed-cells, violation 2.882): shift1.wallet, shift1.plan
```

**Set 2 — L2 with the levers that maximise the WORST probe** (`tip.rate` 0.5, maxMult 1, patience 12 s; `exp/set2-l2.json`): the strict row improves to 3 and 4 of 300 below and stays red; economy rows break.
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 3.046 · full 3.055 · cold/off 2.971 · full/off 2.907 (x) | cold 3.046 · full 2.866 · cold/off 2.981 · full/off 2.994 (x) | FAIL
career k, standard order (D4a) | <= 3.5 | 3.259 (raw 3.99) | 3.254 (raw 3.98) | PASS
30-day total value, standard order | <= 9.185 tr | 9.057 tr (raw 17.75) | 8.952 tr (raw 17.52) | PASS
LP7 reached at shift | 140-170 | 158 | 160 | PASS
all equipment at max by shift | <= 170 | 158 | 160 | PASS
8 tables at Lv4 by shift | <= 170 | 158 | 160 | PASS
table 4 bought at shift | <= 48 | 5 | 6 | PASS
first second chair at shift | 40-56 | 24 (x) | 23 (x) | FAIL
first table Lv2 at shift | <= 56 | 31 | 30 | PASS
first table Lv4 at shift | <= 120 | 66 | 65 | PASS
LP1 and LP2 by shift | <= 48 | LP1 5 · LP2 29 | LP1 6 · LP2 28 | PASS
LP3 and LP4 by shift | <= 96 | LP3 31 · LP4 37 | LP3 31 · LP4 37 | PASS
LP5 by shift | <= 120 | 52 | 52 | PASS
longest stretch of shifts without a purchase | <= 8 | 6 (shifts 131-137, 101 purchases) | 8 (shifts 152-160, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 4.3 % (of arrivals 1.4 %) | 9.2 % (of arrivals 3.3 %) | PASS
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 23.6 % (of arrivals 20.8 %) (x) | 24.1 % (of arrivals 21.8 %) (x) | FAIL
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 23.8 % (of arrivals 21.8 %) (x) | 26.0 % (of arrivals 23.3 %) (x) | FAIL
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 76 / 24 | 68 / 22 | PASS
daily earn cap first reached at shift | >= 150 (or never) | not reached | not reached | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 0.3 % (20 guests; of arrivals 0.1 %) | 0.4 % (30 guests; of arrivals 0.1 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 1091 (fast 1091, 4 s 1253) · median 2820 (3/300 and 4/300 below 1500; takings min 341) (x) | start 750 < 1500 · end min 1091 (fast 1091, 4 s 1253) · median 2820 (3/300 and 4/300 below 1500; takings min 341) (x) | FAIL
shift 1 earns table 2, the plan's narrative (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 99 % of 300 runs close with >= 1500 (95 % CI 97-99 %; fast 297/300, 4 s 296/300) · median takings 2161 (4 s 2034) · median refused pairs 22 (x) | start 750 < 1500 · 99 % of 300 runs close with >= 1500 (95 % CI 97-99 %; fast 297/300, 4 s 296/300) · median takings 2161 (4 s 2034) · median refused pairs 22 (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (12 seed-cells, violation 4.320): k.standard, chair1, door.days8-14, door.days15-21, shift1.wallet, shift1.plan
```

**Set 3 — candidate C, the first seal of S5** (start wallet 750 xu; green with bot v4 at a season-aligned start, 13 seed-cells red with the plan's bot; round 1 table, 22 rows, shift-1 row over 60 probes: history):
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 2.397 · full 2.963 · cold/off 2.374 · full/off 2.851 | cold 2.369 · full 2.875 · cold/off 2.422 · full/off 2.836 | PASS
career k, standard order (D4a) | <= 3.5 | 3.536 (raw 4.66) (x) | 3.508 (raw 4.65) (x) | FAIL
30-day total value, standard order | <= 9.185 tr | 9.289 tr (raw 19.52) (x) | 9.012 tr (raw 18.87) | FAIL
LP7 reached at shift | 140-170 | 115 (x) | 118 (x) | FAIL
all equipment at max by shift | <= 170 | 85 | 94 | PASS
8 tables at Lv4 by shift | <= 170 | 115 | 118 | PASS
table 4 bought at shift | <= 48 | 9 | 10 | PASS
first second chair at shift | 40-56 | 14 (x) | 15 (x) | FAIL
first table Lv2 at shift | <= 56 | 40 | 40 | PASS
first table Lv4 at shift | <= 120 | 70 | 74 | PASS
LP1 and LP2 by shift | <= 48 | LP1 10 · LP2 34 | LP1 12 · LP2 35 | PASS
LP3 and LP4 by shift | <= 96 | LP3 40 · LP4 46 | LP3 40 · LP4 47 | PASS
LP5 by shift | <= 120 | 70 | 74 | PASS
longest stretch of shifts without a purchase | <= 8 | 13 (shifts 89-102, 101 purchases) (x) | 13 (shifts 94-107, 101 purchases) (x) | FAIL
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 21.6 % (of arrivals 13.2 %) (x) | 18.7 % (of arrivals 10.3 %) (x) | FAIL
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 15.2 % (of arrivals 11.6 %) | 16.1 % (of arrivals 11.7 %) | PASS
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 10.8 % (of arrivals 9.1 %) | 14.3 % (of arrivals 10.9 %) | PASS
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 19 / 5 | 17 / 5 | PASS
daily earn cap first reached at shift | >= 150 (or never) | 168 | 160 | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 0.5 % (15 guests; of arrivals 0.0 %) | 0.6 % (22 guests; of arrivals 0.1 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 734 (fast 734, 4 s 734) · median 1305 (44/60 and 44/60 below 1500; takings min -16) (x) | start 750 < 1500 · end min 734 (fast 734, 4 s 734) · median 1305 (44/60 and 44/60 below 1500; takings min -16) (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1500 | cheapest device level 1500 | PASS
failing gates (13 seed-cells, violation 5.938): k.gate, value.30d, lp7, chair1, gap, door.shifts1-24, shift1.wallet
```

**Set 4 — option (d), the best joint set** (f1aa857528da; `packages/engine/sim/plans/candidate-d.json` over 2.0.23, 90 paths; found by the screening of `plans/late2.mjs` and the descent of `plans/joint4.mjs` around the shift-1 setting of the fine P0 scan, which picked its best of 416 grid points over 60 probes): D19 maxMult 2.05, D25 `queueBaseSlots` 2, tip 0.19, patience 33 s, the location multiplier flat at 1.0, device levels 1-4 x1.15-1.3, second chairs x1.5-2 and two table rungs. Over 300 probes the plan-narrative row is red (69 %), the strict row is red and one career cell (first second chair at shift 39 on seed 42) is one shift off; the descent was stopped in its second pass, so that cell is not shown unreachable.
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 2.376 · full 2.945 · cold/off 2.426 · full/off 2.893 | cold 2.366 · full 2.917 · cold/off 2.394 · full/off 2.880 | PASS
career k, standard order (D4a) | <= 3.5 | 3.156 (raw 3.99) | 3.155 (raw 3.97) | PASS
30-day total value, standard order | <= 9.185 tr | 9.063 tr (raw 18.20) | 9.030 tr (raw 17.94) | PASS
LP7 reached at shift | 140-170 | 166 | 165 | PASS
all equipment at max by shift | <= 170 | 166 | 165 | PASS
8 tables at Lv4 by shift | <= 170 | 166 | 165 | PASS
table 4 bought at shift | <= 48 | 12 | 13 | PASS
first second chair at shift | 40-56 | 39 (x) | 40 | FAIL
first table Lv2 at shift | <= 56 | 49 | 49 | PASS
first table Lv4 at shift | <= 120 | 77 | 76 | PASS
LP1 and LP2 by shift | <= 48 | LP1 12 · LP2 47 | LP1 13 · LP2 47 | PASS
LP3 and LP4 by shift | <= 96 | LP3 52 · LP4 54 | LP3 51 · LP4 54 | PASS
LP5 by shift | <= 120 | 68 | 67 | PASS
longest stretch of shifts without a purchase | <= 8 | 8 (shifts 31-39, 101 purchases) | 7 (shifts 6-13, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 1.3 % (of arrivals 0.4 %) | 1.9 % (of arrivals 0.6 %) | PASS
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 10.6 % (of arrivals 8.9 %) | 11.5 % (of arrivals 9.6 %) | PASS
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 12.1 % (of arrivals 10.2 %) | 12.7 % (of arrivals 10.5 %) | PASS
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 37 / 10 | 35 / 11 | PASS
daily earn cap first reached at shift | >= 150 (or never) | not reached | not reached | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 2.6 % (80 guests; of arrivals 0.2 %) | 1.8 % (61 guests; of arrivals 0.2 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 722 (fast 722, 4 s 722) · median 1664 (104/300 and 103/300 below 1500; takings min -28) (x) | start 750 < 1500 · end min 722 (fast 722, 4 s 722) · median 1664 (104/300 and 103/300 below 1500; takings min -28) (x) | FAIL
shift 1 earns table 2, the plan's narrative (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 69 % of 300 runs close with >= 1500 (95 % CI 64-74 %; fast 207/300, 4 s 207/300) · median takings 954 (4 s 937) · median refused pairs 11 (x) | start 750 < 1500 · 69 % of 300 runs close with >= 1500 (95 % CI 64-74 %; fast 207/300, 4 s 207/300) · median takings 954 (4 s 937) · median refused pairs 11 (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 2500 | cheapest device level 2500 | PASS
failing gates (5 seed-cells, violation 0.993): chair1, shift1.wallet, shift1.plan
```

**Set 5 — option (a) at its best price: committed L2 with table 2 at 1 070 xu** (`--set=upgrades.table.tablePriceBase.0=428`; 1 073 xu = base 429 gives the same rows): the share is 83 % (79-87) but takings (542 / 529) and pairs (5) do not move, so `shift1.plan` stays red as a row; every other row is green.
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 2.339 · full 2.691 · cold/off 2.318 · full/off 2.787 | cold 2.315 · full 2.813 · cold/off 2.366 · full/off 2.845 | PASS
career k, standard order (D4a) | <= 3.5 | 3.151 (raw 3.93) | 3.153 (raw 3.93) | PASS
30-day total value, standard order | <= 9.185 tr | 9.040 tr (raw 17.91) | 9.050 tr (raw 17.89) | PASS
LP7 reached at shift | 140-170 | 163 | 165 | PASS
all equipment at max by shift | <= 170 | 163 | 165 | PASS
8 tables at Lv4 by shift | <= 170 | 163 | 165 | PASS
table 4 bought at shift | <= 48 | 13 | 13 | PASS
first second chair at shift | 40-56 | 40 | 40 | PASS
first table Lv2 at shift | <= 56 | 47 | 48 | PASS
first table Lv4 at shift | <= 120 | 81 | 82 | PASS
LP1 and LP2 by shift | <= 48 | LP1 13 · LP2 45 | LP1 13 · LP2 46 | PASS
LP3 and LP4 by shift | <= 96 | LP3 48 · LP4 53 | LP3 49 · LP4 54 | PASS
LP5 by shift | <= 120 | 68 | 69 | PASS
longest stretch of shifts without a purchase | <= 8 | 8 (shifts 13-21, 101 purchases) | 7 (shifts 13-20, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 3.2 % (of arrivals 1.1 %) | 0.4 % (of arrivals 0.1 %) | PASS
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 11.3 % (of arrivals 9.3 %) | 12.5 % (of arrivals 10.2 %) | PASS
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 12.4 % (of arrivals 10.2 %) | 12.9 % (of arrivals 10.2 %) | PASS
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 19 / 5 | 17 / 5 | PASS
daily earn cap first reached at shift | >= 150 (or never) | not reached | not reached | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 1.2 % (38 guests; of arrivals 0.1 %) | 1.5 % (49 guests; of arrivals 0.1 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1070 and every end >= 1070 | start 750 < 1070 · end min 732 (fast 732, 4 s 732) · median 1235 (74/300 and 74/300 below 1070; takings min -18) (x) | start 750 < 1070 · end min 732 (fast 732, 4 s 732) · median 1235 (74/300 and 74/300 below 1070; takings min -18) (x) | FAIL
shift 1 earns table 2, the plan's narrative (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1070 · takings 850-1160 · pairs 8-12 | start 750 < 1070 · 83 % of 300 runs close with >= 1070 (95 % CI 79-87 %; fast 251/300, 4 s 250/300) · median takings 542 (4 s 529) · median refused pairs 5 (x) | start 750 < 1070 · 83 % of 300 runs close with >= 1070 (95 % CI 79-87 %; fast 251/300, 4 s 250/300) · median takings 542 (4 s 529) · median refused pairs 5 (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1070 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (4 seed-cells, violation 1.243): shift1.wallet, shift1.plan
```

**Set 6 — option (b): committed L2 with `spawn.pPair` 0.3** (`--set=spawn.pPair=0.3`): 58 % (52-63); the first chair (32 | 30) and the door of shift 1 (3 | 4 pairs) turn red.
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 2.380 · full 2.772 · cold/off 2.393 · full/off 2.825 | cold 2.418 · full 2.889 · cold/off 2.377 · full/off 2.789 | PASS
career k, standard order (D4a) | <= 3.5 | 3.156 (raw 3.94) | 3.141 (raw 3.92) | PASS
30-day total value, standard order | <= 9.185 tr | 8.926 tr (raw 17.80) | 9.183 tr (raw 18.28) | PASS
LP7 reached at shift | 140-170 | 163 | 158 | PASS
all equipment at max by shift | <= 170 | 163 | 158 | PASS
8 tables at Lv4 by shift | <= 170 | 163 | 158 | PASS
table 4 bought at shift | <= 48 | 11 | 10 | PASS
first second chair at shift | 40-56 | 32 (x) | 30 (x) | FAIL
first table Lv2 at shift | <= 56 | 40 | 38 | PASS
first table Lv4 at shift | <= 120 | 74 | 71 | PASS
LP1 and LP2 by shift | <= 48 | LP1 11 · LP2 37 | LP1 10 · LP2 36 | PASS
LP3 and LP4 by shift | <= 96 | LP3 41 · LP4 46 | LP3 39 · LP4 44 | PASS
LP5 by shift | <= 120 | 61 | 59 | PASS
longest stretch of shifts without a purchase | <= 8 | 7 (shifts 156-163, 101 purchases) | 6 (shifts 10-16, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 1.4 % (of arrivals 0.7 %) | 1.8 % (of arrivals 0.9 %) | PASS
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 10.6 % (of arrivals 8.2 %) | 11.0 % (of arrivals 8.8 %) | PASS
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 10.8 % (of arrivals 7.4 %) | 9.6 % (of arrivals 7.5 %) | PASS
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 19 / 3 (x) | 17 / 4 (x) | FAIL
daily earn cap first reached at shift | >= 150 (or never) | not reached | not reached | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 1.6 % (45 guests; of arrivals 0.1 %) | 1.2 % (34 guests; of arrivals 0.1 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 850 (fast 850, 4 s 850) · median 1538 (139/300 and 138/300 below 1500; takings min 100) (x) | start 750 < 1500 · end min 850 (fast 850, 4 s 850) · median 1538 (139/300 and 138/300 below 1500; takings min 100) (x) | FAIL
shift 1 earns table 2, the plan's narrative (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 58 % of 300 runs close with >= 1500 (95 % CI 52-63 %; fast 173/300, 4 s 174/300) · median takings 821 (4 s 822) · median refused pairs 4 (x) | start 750 < 1500 · 58 % of 300 runs close with >= 1500 (95 % CI 52-63 %; fast 173/300, 4 s 174/300) · median takings 821 (4 s 822) · median refused pairs 4 (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (8 seed-cells, violation 2.977): chair1, door.shift1, shift1.wallet, shift1.plan
```

- Evidence (local, git-ignored like S1-S4): `artifacts/verification/feat-eco21-balance-pass/sweeps/literal/` (round 1: baselines, p0-named, p0-extended, grids, descents, final), `sweeps/r2/` (round 2, shift-1 cells over 60 probes: baselines with the full table of every set above, joint1, joint3-p1, late2b-p1, joint2-q1, joint4-q1; the fine P0 scan and its 416 rows as `p0-scan/`) and `sweeps/r3/` (round 3, over 300 probes: `p0-share/<label>.txt` one line per economy, `eval/<label>.table.txt` the 23-row table of each option; the 40-point grid is `p0-share/grid-*.txt`).
- One command per figure of this entry (each `p0-share.ts` run takes about 25 s, each evaluator run about 90 s; `p0-share.ts` prints its header line first, `--header=no` drops it):
  - committed set: `node --import tsx packages/engine/sim/p0-share.ts` (600 probes: add `--n=600`)
  - option (d), Set 4: `node --import tsx packages/engine/sim/p0-share.ts packages/engine/sim/plans/candidate-d.json`
  - the maxMult row: `for m in 4 3 2.5 2 1.75 1.5; do node --import tsx packages/engine/sim/p0-share.ts --set=spawn.capacityDemand.maxMult=$m --label=maxMult$m; done`
  - the 40-point grid: `for m in 1.5 1.6 1.7 1.8 1.9; do for q in 1 2; do for p in 24000 33000; do for t in 0.17 0.19; do node --import tsx packages/engine/sim/p0-share.ts --header=no --label=m$m-q$q-p$p-t$t --set=spawn.capacityDemand.maxMult=$m --set=runtime.queueBaseSlots=$q --set=patience.thuongMs=$p --set=tip.rate=$t; done; done; done; done` (40 lines; on that output `grep -c 'share ok'` gives 16, `grep -c 'takings ok'` 26, `grep -c 'pairs ok'` 16 and `grep -c 'share ok · takings ok · pairs ok'` 0)
  - option (a), a price (xu = base x 2.5; 440 = 1 100 xu, 429 = 1 073 xu, 428 = 1 070 xu, 426 = 1 065 xu, 424 = 1 060 xu, 400 = 1 000 xu): `node --import tsx packages/engine/sim/p0-share.ts --set=upgrades.table.tablePriceBase.0=429`
  - option (b): `node --import tsx packages/engine/sim/p0-share.ts --set=spawn.pPair=0.3`
  - the other levers at maxMult 4: `... p0-share.ts --set=tip.rate=0.30`, `--set=patience.thuongMs=48000`, `--set=runtime.queueBaseSlots=3`, `--set=spawn.baseMs=4000`, or all three levers together in one command
  - the full 23-row table of any of them (the "other rows" cells): `node --import tsx packages/engine/sim/balance-gates.ts --onboarding-pair [--patch=packages/engine/sim/plans/candidate-d.json] [--set=path=json ...]`; the Set 4 perturbations: the same with `--patch=packages/engine/sim/plans/candidate-d.json --set=upgrades.table.chairPriceBase.0=900` (also 750, 1200), `--set=patience.thuongMs=36000`, `--set=tip.rate=0.18`, `--set=upgrades.table.tablePriceBase.6=16480`

## 04 · tableSlots — eight places in every location reverses D13 — 2026-10-21, review round 2 (shift-1 cells re-run over 300 probes in round 3) — [NEEDS OWNER DECISION 2 of 2]
- Status: **OPEN, owner decision.** The committed JSON has `locations.list[].tableSlots` = 8 in all nine locations. D13 says "hẻm đầu = 4 bàn" and "đợt này mọi mặt bằng = 4"; the brief and DESIGN-story section 3 say 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8. The first alley therefore goes from 4 tables / 8 seats to 8 tables / 16 seats and a location no longer opens a single table: a rented place sells at most +10 % payment (`mult` 1.0-1.1) for its rent. The v3 throughput cap that plan section 9 row 4 relies on is gone in the first alley; LP7's "10 seats" is reached there; Wave 5 `location-slots` and S6's yard ("slots per `locations.list[].tableSlots`") are drawn from this JSON (HANDOFF section 11 tells S6).
- Why it was done (round 1 called it a "design cost"; it is a reversal of an owner decision sealed by the sim, so it goes to the owner): the plan's own bot is a strict seat-saver (S1-S4 policy: it buys the next table, then second chairs, before any device, until the places of the alley are full), the gate wants the first second chair at shift 40-56, a purchase at least every 8 shifts and table 4 by shift 48, and LP2 by shift 48. With four places the first chair comes right after table 4 (shift 14-16) and a longer wait between tables breaks the purchase gap; the descents with 4-5 places in the first alley never found a clean set (`sweeps/literal/grid1-3`, `early*`). Six to eight tables in front of the first chair are what fills the window.
- The numbers (committed set L2; seed 42 | seed 99; only the rows that differ are shown, the other rows of each variant are green):

| variant | red rows (non-P0) |
|---|---|
| **eight in every place (committed)** | none |
| the brief's 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8 | 30-day value 9.362 \| 9.332 tr (limit 9.185); first second chair at shift 14 \| 16 (window 40-56); door shifts 1-24 13.7 % \| 9.9 % (limit 10 %) |
| D13 literal, 4 in every place | LP7 never; 8 tables at Lv4 never (4 tables); first chair 14 \| 16; gap 11 \| 10; door shifts 1-24 13.7 \| 9.9 %, days 8-14 19.9 \| 21.0 %, days 15-21 22.8 \| 22.9 % |

  Full tables: `sweeps/r2/baselines/l2-slots-brief.json` and `l2-slots4.json` (shift-1 cells over 60 probes: history); over 300 probes (the table below, round 3): `sweeps/r3/eval/slots-brief.table.txt` and `slots4.table.txt` (`node --import tsx packages/engine/sim/balance-gates.ts --onboarding-pair --patch=<exp json>`; the all-4 variant is 16 seed-cells red, 12 of them non-P0). D13 literal contradicts the brief's own rows ("8 tables at Lv4 by shift 170": no location holds eight) and LP7's "10 seats".
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
30-day total value, standard order | <= 9.185 tr | 9.362 tr (raw 18.96) (x) | 9.332 tr (raw 18.87) (x) | FAIL
first second chair at shift | 40-56 | 14 (x) | 16 (x) | FAIL
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 13.7 % (of arrivals 7.9 %) (x) | 9.9 % (of arrivals 5.9 %) | FAIL
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1235 (231/300 and 231/300 below 1500; takings min -18) (x) | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1235 (231/300 and 231/300 below 1500; takings min -18) (x) | FAIL
shift 1 earns table 2, the plan's narrative (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 26 % of 300 runs close with >= 1500 (95 % CI 22-32 %; fast 79/300, 4 s 80/300) · median takings 542 (4 s 529) · median refused pairs 5 (x) | start 750 < 1500 · 26 % of 300 runs close with >= 1500 (95 % CI 22-32 %; fast 79/300, 4 s 80/300) · median takings 542 (4 s 529) · median refused pairs 5 (x) | FAIL
failing gates (9 seed-cells, violation 4.535): value.30d, chair1, door.shifts1-24, shift1.wallet, shift1.plan
```
- Options for the owner: (1) keep eight in every place (committed: every row but P0 is green; S6 draws eight slots in the first alley); (2) keep the brief's 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8 and relax the strict bot (let it buy the first second chair as soon as `chairsAfterTables` tables stand, which is what a human can do) or move the first-chair window (14-16 instead of 40-56: the human rhythm of plan section 7 row 10, "ghế 2 đầu tiên ca ~12-14"); then the ladders are searched again under the new protocol and the value row (9.33-9.36 tr against 9.185) needs its own fix; (3) D13 literal (4 in every place) and drop the brief's "8 tables at Lv4" and LP7 "10 seats" rows.
