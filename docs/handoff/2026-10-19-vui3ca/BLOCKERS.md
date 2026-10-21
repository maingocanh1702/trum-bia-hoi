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

## 04 · P0 — shift 1 does not earn table 2: the strict row is red for every lever, the plan-literal row is red at the owner's D19 maxMult 4 — 2026-10-21, rewritten in review round 2 — [NEEDS OWNER DECISION 1 of 2]
- Status: **OPEN, owner decision.** Every other row of the plan's gate table (21 of 23 with the first-goal row) is green on seeds 42 and 99 with the plan's own bot; the two red rows are two readings of the same thing: "shift 1 earns table 2". The committed set keeps every number the owner decided (D13 apart, see the second entry), so it keeps D19 `capacityDemand` refTables 6 / maxMult 4 and D25 `queueBaseSlots` 1.
- The rows. STRICT (plan section 0 table, shift 1: "Kết ca: mua bàn 2 (850-1.160 xu + 750 khởi đầu)"; section 7 owner line 3: "kết ca 1 mua được bàn 2 (1.500 xu)"): the start wallet is below table 2's price AND every one of 60 probes, on both service models (the fast one and a 4 s beat), ends shift 1 with 1 500 xu after the beer restock. PLAN-LITERAL (`shift1.plan`, added in round 2 beside the strict row, never instead of it): the start wallet does not pay table 2; at least four probes in five (the worse of the two service models) hold 1 500 xu the moment the shift closes (the playtest sheet `docs/phase0-alpha-playtest.md` carries the plan's threshold: "Ngưỡng PLAN §4: ≥ 4/5 mua món đầu kết ca 1 không mở Help"; the plan itself states no 4/5 figure); the median takings are the 850-1 160 xu of the section 0 table; the median shop sends about ten pairs away ("~10 cặp nhìn quán rồi đi", read as 8-12).
- The committed set (L2, the first table below): STRICT: start 750 < 1 500, end min 732, median 1 283, **45 of 60 probes below 1 500**; PLAN-LITERAL: **19 of 60 (32 %) can buy table 2 when the shift closes**, median takings 588 against 850-1 160, 6 refused pairs against about ten. The plan's own narrative (takings 850-1 160, about ten pairs) is not what D19's maxMult 4 produces: the gap to the next group of a one-table shop is x4.
- What the demand lever does (round 2; the earlier sentence "no lever the plan names reaches it" was wrong for the plan-literal row). Shift 1 over the committed set, 60 probes, tip 0.17, patience 24 s:

| `capacityDemand.maxMult` | 4 (committed, D19) | 3 | 2.5 | 2 | 1.75 | 1.5 |
|---|---|---|---|---|---|---|
| probes that hold 1 500 xu when shift 1 closes (fast / 4 s, of 60) | 19 / 19 | 29 / 28 | 37 / 38 | 46 / 45 | 45 / 45 | 50 / 49 |
| median takings (plan: 850-1 160) | 588 | 734 | 829 | 1 057 | 1 145 | 1 292 |
| median refused pairs (plan: about ten) | 6 | 8 | 9 | 11 | 13 | 16 |
| other rows red (the rest of the committed set unchanged) | none | LP2 (49 on seed 99), gap (9 on seed 99) | LP2, gap | first chair 39 / 38, door days 15-21 16.0 % on seed 42 | first chair | first chair 37 / 36, door days 15-21 15.1 % on seed 99 |

- With maxMult left at 4 no other lever reaches the row: tip up to 0.30, patience 24 / 36 / 48 s and `queueBaseSlots` 1-3 give at most 26 of 60 (43 %, median takings 672). `spawn.baseMs` does nothing in shift 1 (19 of 60 at 4 000, 6 000, 8 000 and 10 500: the floor of the spawn rule binds). So the move that makes the plan's narrative true is D19 (or the price of table 2), and D19 is the owner's: that is why this is a decision and not a number the autopilot may move.
- The three plan numbers together (4 probes in 5, takings 850-1 160, about ten pairs) hold only in a thin corner of the space. With the tip inside the standard-k band (<= 0.20) the plan-literal row passes at maxMult 2.05 + `queueBaseSlots` 2 + patience 33-39 s (48 of 60 probes, exactly 4 in 5; median takings 1 082-1 094; 11 pairs) and nowhere else on a fine grid of 416 candidates (maxMult 1.95-2.25, tip 0.19 / 0.20, patience 24-45 s, queue 1 / 2): maxMult 2.0 and 2.075 give 46-48 of 60, `queueBaseSlots` 1 gives 47-48 on the 4 s model. With tip 0.21+ it passes more easily (maxMult 2.1, tip 0.21, patience 36 s: 49 / 48) but the economy runs hot (standard k 3.00-3.02 against 3.0, career k 3.61 against 3.5, 30-day value 10.6 tr against 9.185, LP7 at shift 136, first chair at 37).
- Option (a) is the second cheap lever: the price of table 2 (committed demand, maxMult 4): 1 500 xu 19 of 60 · 1 400 xu 25 · 1 300 xu 32 / 31 · 1 200 xu 41 / 39 · **1 100 xu 51 / 50 (83-85 %)** · 1 000 xu 56 / 56 (93 %) · 900 xu 57 / 57; the strict row needs about 800 xu (the worst probe ends at 732-855). The plan, the chip text and every spec say "1.500 xu" and the median takings stay 588.
- Exhaustion-rule status (AUTOPILOT section 5 stage 04: unreachable by JSON only after >= 3 full passes without improvement AND every named lever swept): STRICT row: `balance-p0.ts` swept `tip.rate`, `capacityDemand` maxMult and refTables, `runtime.queueBaseSlots` and `queueSeatsPerSlot`, `patience.thuongMs`, keg storage and batch, stall stock, `rush.schedule.warningMs` and table 2's price: 73 candidates, 4 passes, the last 3 without improvement (`sweeps/literal/p0-named/`); the best worst probe ends at 1 262 (tip 0.5 + maxMult 1 + patience 12 s, which breaks the standard k, the first chair and the door, Set 2 below); the unnamed levers (`spawn.pPair`, the solo beer share; `p0-extended`, 162 candidates) reach it only with tip 0.5, maxMult 1 and one group in ten a pair. PLAN-LITERAL row: the joint search of round 2 with maxMult free (`plans/joint1.mjs`-`joint4.mjs`, `late2.mjs`; `sweeps/r2/`) and the fine grid above: the row is reached only on the thin corner above, which moves D19 and D25.
- Options for the owner (none is a number the autopilot may move silently): (a) price table 2 at about 1 100 xu (83-85 % buy it in shift 1; the chip text and the specs say "1.500 xu"; the ladder keeps its other rungs); (b) change the first-shift guest rules of Wave 2 (D12-D19: pairs are refused for lack of a two-chair table, so a one-table shop turns half of its guests away): `spawn.pPair` (D17) 0.5 gives 19 of 60 probes that buy table 2 in shift 1, 0.3 gives 34, 0.2 gives 43 and 0.1 gives 56 (93 %), but the refused pairs fall to 4, 3 and 1 (the plan wants about ten and the door row at least five: the pairs that look at the shop and leave are the wordless tutorial of P4); (c) accept that about three new players in four need a second shift for table 2 (the committed set); (d) D19 `maxMult` about 2 (Set 4 below: 48 of 60 probes buy table 2 in shift 1, median takings 1082, 11 refused pairs: the narrative of the plan itself, so the plan-literal row PASSES) with D25 `queueBaseSlots` 2, the tip at 0.19 and patience 33 s; the faster early game runs the careers hot, so keeping the 30-day value under 9.185 tr also takes the location multiplier flat at 1.0 (a place then sells no price bonus at all) and re-priced devices and chairs; one career cell stays one shift off (first second chair at shift 39 on seed 42, window 40-56). Moved: D19, D25, the tip (D1 allows it) and the location multiplier; each of the first two is needed by the plan-literal row (without `maxMult` 2.05 it is 19 of 60, without `queueBaseSlots` 2 it is 47 of 60).
- Sets, full tables (23 rows, seed 42 | seed 99; the plan's protocol: seats first + direct leasing + no dog, start 2026-09-09, 30 days; `node --import tsx packages/engine/sim/balance-gates.ts --patch=<json> --onboarding-pair`):

**Set 1 — committed: candidate L2** (the sealed 2.1.0 = `plans/candidate-l2.json`, i.e. `candidate-l.json` with the owner's cap 400 000, 3-day lease and LP7 / league tier 7 2 000 000 back): 21 of 23 rows green; STRICT and PLAN-LITERAL red.
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
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1283 (45/60 and 45/60 below 1500; takings min -18) (x) | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1283 (45/60 and 45/60 below 1500; takings min -18) (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (2 seed-cells, violation 1.500): shift1.wallet
```

**Set 2 — L2 with the levers that maximise the WORST probe** (`tip.rate` 0.5, maxMult 1, patience 12 s): the strict row improves to 1 of 60 below and stays red; economy rows break.
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
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 1262 (fast 1383, 4 s 1262) · median 3156 (1/60 and 1/60 below 1500; takings min 512) (x) | start 750 < 1500 · end min 1262 (fast 1383, 4 s 1262) · median 3156 (1/60 and 1/60 below 1500; takings min 512) (x) | FAIL
shift 1 earns table 2, the plan's own words (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 98 % of runs close with >= 1500 (fast 59/60, 4 s 59/60) · median takings 2466 (4 s 2253) · median refused pairs 23 (x) | start 750 < 1500 · 98 % of runs close with >= 1500 (fast 59/60, 4 s 59/60) · median takings 2466 (4 s 2253) · median refused pairs 23 (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (12 seed-cells, violation 4.852): k.standard, chair1, door.days8-14, door.days15-21, shift1.wallet, shift1.plan
```

**Set 3 — candidate C, the first seal of S5** (start wallet 750 xu; green with bot v4 at a season-aligned start, 13 seed-cells red with the plan's bot; round 1 table, 22 rows):
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

**Set 4 — option (d), the best joint set** (f1aa857528da; `packages/engine/sim/plans/candidate-d.json` over 2.0.23, 90 paths; found by the screening of `plans/late2.mjs` and the descent of `plans/joint4.mjs` around the shift-1 setting of the fine P0 scan): D19 maxMult 2.05, D25 `queueBaseSlots` 2, tip 0.19, patience 33 s, the location multiplier flat at 1.0, device levels 1-4 x1.15-1.3, second chairs x1.5-2 and two table rungs; the plan-literal row PASSES, the strict row is red and one career cell (first second chair at shift 39 on seed 42) is one shift off (the descent was stopped in its second pass: that cell is not shown unreachable).
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
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 722 (fast 722, 4 s 722) · median 1772 (13/60 and 14/60 below 1500; takings min -28) (x) | start 750 < 1500 · end min 722 (fast 722, 4 s 722) · median 1772 (13/60 and 14/60 below 1500; takings min -28) (x) | FAIL
shift 1 earns table 2, the plan's own words (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 80 % of runs close with >= 1500 (fast 48/60, 4 s 48/60) · median takings 1082 (4 s 1082) · median refused pairs 11 | start 750 < 1500 · 80 % of runs close with >= 1500 (fast 48/60, 4 s 48/60) · median takings 1082 (4 s 1082) · median refused pairs 11 | PASS
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 2500 | cheapest device level 2500 | PASS
failing gates (3 seed-cells, violation 0.492): chair1, shift1.wallet
```

- Evidence (local, git-ignored like S1-S4): `artifacts/verification/feat-eco21-balance-pass/sweeps/literal/` (round 1: baselines, p0-named, p0-extended, grids, descents, final) and `sweeps/r2/` (round 2: baselines with the full table of every set above, joint1, joint3-p1, late2b-p1, joint2-q1, joint4-q1; the fine P0 scan and its 416 rows are kept as `sweeps/r2/p0-scan/`).

## 04 · tableSlots — eight places in every location reverses D13 — 2026-10-21, review round 2 — [NEEDS OWNER DECISION 2 of 2]
- Status: **OPEN, owner decision.** The committed JSON has `locations.list[].tableSlots` = 8 in all nine locations. D13 says "hẻm đầu = 4 bàn" and "đợt này mọi mặt bằng = 4"; the brief and DESIGN-story section 3 say 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8. The first alley therefore goes from 4 tables / 8 seats to 8 tables / 16 seats and a location no longer opens a single table: a rented place sells at most +10 % payment (`mult` 1.0-1.1) for its rent. The v3 throughput cap that plan section 9 row 4 relies on is gone in the first alley; LP7's "10 seats" is reached there; Wave 5 `location-slots` and S6's yard ("slots per `locations.list[].tableSlots`") are drawn from this JSON (HANDOFF section 11 tells S6).
- Why it was done (round 1 called it a "design cost"; it is a reversal of an owner decision sealed by the sim, so it goes to the owner): the plan's own bot is a strict seat-saver (S1-S4 policy: it buys the next table, then second chairs, before any device, until the places of the alley are full), the gate wants the first second chair at shift 40-56, a purchase at least every 8 shifts and table 4 by shift 48, and LP2 by shift 48. With four places the first chair comes right after table 4 (shift 14-16) and a longer wait between tables breaks the purchase gap; the descents with 4-5 places in the first alley never found a clean set (`sweeps/literal/grid1-3`, `early*`). Six to eight tables in front of the first chair are what fills the window.
- The numbers (committed set L2; seed 42 | seed 99; only the rows that differ are shown, the other rows of each variant are green):

| variant | red rows (non-P0) |
|---|---|
| **eight in every place (committed)** | none |
| the brief's 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8 | 30-day value 9.362 \| 9.332 tr (limit 9.185); first second chair at shift 14 \| 16 (window 40-56); door shifts 1-24 13.7 % \| 9.9 % (limit 10 %) |
| D13 literal, 4 in every place | LP7 never; 8 tables at Lv4 never (4 tables); first chair 14 \| 16; gap 11 \| 10; door shifts 1-24 13.7 \| 9.9 %, days 8-14 19.9 \| 21.0 %, days 15-21 22.8 \| 22.9 % |

  Full tables: `sweeps/r2/baselines/l2-slots-brief.json` and `l2-slots4.json`. D13 literal contradicts the brief's own rows ("8 tables at Lv4 by shift 170": no location holds eight) and LP7's "10 seats".
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
30-day total value, standard order | <= 9.185 tr | 9.362 tr (raw 18.96) (x) | 9.332 tr (raw 18.87) (x) | FAIL
first second chair at shift | 40-56 | 14 (x) | 16 (x) | FAIL
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 13.7 % (of arrivals 7.9 %) (x) | 9.9 % (of arrivals 5.9 %) | FAIL
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1283 (45/60 and 45/60 below 1500; takings min -18) (x) | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1283 (45/60 and 45/60 below 1500; takings min -18) (x) | FAIL
shift 1 earns table 2, the plan's own words (4 runs in 5, takings 850-1160, ~10 pairs) | >= 80 % of runs close >= 1500 · takings 850-1160 · pairs 8-12 | start 750 < 1500 · 32 % of runs close with >= 1500 (fast 19/60, 4 s 19/60) · median takings 588 (4 s 588) · median refused pairs 6 (x) | start 750 < 1500 · 32 % of runs close with >= 1500 (fast 19/60, 4 s 19/60) · median takings 588 (4 s 588) · median refused pairs 6 (x) | FAIL
failing gates (9 seed-cells, violation 4.362): value.30d, chair1, door.shifts1-24, shift1.wallet, shift1.plan
```
- Options for the owner: (1) keep eight in every place (committed: every row but P0 is green; S6 draws eight slots in the first alley); (2) keep the brief's 4 · 4 · 5 · 6 · 6 · 7 · 8 · 8 · 8 and relax the strict bot (let it buy the first second chair as soon as `chairsAfterTables` tables stand, which is what a human can do) or move the first-chair window (14-16 instead of 40-56: the human rhythm of plan section 7 row 10, "ghế 2 đầu tiên ca ~12-14"); then the ladders are searched again under the new protocol and the value row (9.33-9.36 tr against 9.185) needs its own fix; (3) D13 literal (4 in every place) and drop the brief's "8 tables at Lv4" and LP7 "10 seats" rows.
