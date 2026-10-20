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

## 04 · P0 — "end of shift 1 buys table 2" is red for every named lever (fallback of the exhaustion rule) — 2026-10-21 — [NEEDS OWNER DECISION]
- Status: **OPEN, owner decision.** Everything else of the plan's gate table (21 of 22 rows) is green on seeds 42 and 99 with the plan's own bot; this row is not, and no lever the plan names reaches it.
- The row (plan section 0 P0, section 4 row 1: "kết ca 1: mua bàn 2 (850-1.160 xu + 750 khởi đầu)"): the start wallet is below table 2's price (750 < 1 500, true) AND the wallet at the end of shift 1, after the beer restock, reaches 1 500 on EVERY one of 60 probes and on both service models (the fast one and a 4 s beat). Sealed set: min 732, median 1 283, **45 of 60 probes end below 1 500** (15 of 60 afford table 2 in shift 1; shift-1 takings: minimum -18, median 533, the plan expects 850-1 160).
- What was swept (AUTOPILOT section 5 stage 04: "unreachable by JSON only after >= 3 full passes without improvement AND every named lever swept"): `packages/engine/sim/balance-p0.ts` (a shift-1-only coordinate descent, 3 s a candidate, start wallet fixed at 750 xu) over `tip.rate`, `capacityDemand` maxMult and refTables, `runtime.queueBaseSlots` and `queueSeatsPerSlot`, `patience.thuongMs`, keg storage and batch, stall stock, `rush.schedule.warningMs` and table 2's price: 73 candidates, 4 passes, the last 3 without improvement (`sweeps/literal/p0-named/`). Adding the levers the brief does NOT name (`spawn.pPair`, `spawn.baseMs`, the solo beer share; `sweeps/literal/p0-extended/`, 162 candidates) the descent does reach the row (worst probe 2 354) but only on top of `tip.rate` 0.5, `maxMult` 1 (the D19 demand rule off) and `pPair` 0.1 (one group in ten is a pair): a different early game, not a tuning. Best of the named levers: `tip.rate` 0.5 + `maxMult` 1 + patience 12 s: the worst probe ends at 1 262 (takings 512 against the 750 needed), 1 of 60 below. A lower table 2 price alone cannot satisfy "start < price <= worst end" because the worst end of every moderate set (732) is below the start wallet.
- What passing it would cost (set 2 below): the three levers at their best leave the standard k at 3.05 (limit 3.0), the first chair at shift 26 / 23 (window 40-56) and the door at 24 % in days 8-21 (limits 20 % and 15 %): the economy rows break; the early game turns into a rush of guests.
- Options for the owner (none is a number the autopilot may move silently): (a) price table 2 at about 1 000 xu instead of the plan's 1 500 (the chip text, the plan and every spec say "1.500 xu"; it only works with a worse demand rule: with `maxMult` 1 the worst probe of the descent ended near 1 100); (b) change the first-shift guest rules of Wave 2 (D12-D19: pairs are refused for lack of a two-chair table, the arrival pace of a one-table shop is x4 slower): `spawn.pPair`, `spawn.baseMs`; (c) accept that about three new players in four need a second shift for table 2.
- Best sets, full tables (22 rows, seed 42 | seed 99; the plan's protocol: seats first + direct leasing + no dog, start 2026-09-09, 30 days; `node --import tsx packages/engine/sim/balance-gates.ts --patch=<json> --onboarding-pair`):

**Set 1 — candidate L, the sealed set** (`packages/engine/sim/plans/candidate-l.json`, 87 paths over 2.0.23): 21 of 22 rows green, the P0 row red.
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 2.339 · full 2.691 · cold/off 2.318 · full/off 2.787 | cold 2.315 · full 2.813 · cold/off 2.366 · full/off 2.845 | PASS
career k, standard order (D4a) | <= 3.5 | 3.156 (raw 3.94) | 3.165 (raw 3.94) | PASS
30-day total value, standard order | <= 9.185 tr | 8.898 tr (raw 17.73) | 9.083 tr (raw 18.01) | PASS
LP7 reached at shift | 140-170 | 167 | 162 | PASS
all equipment at max by shift | <= 170 | 167 | 162 | PASS
8 tables at Lv4 by shift | <= 170 | 167 | 162 | PASS
table 4 bought at shift | <= 48 | 14 | 15 | PASS
first second chair at shift | 40-56 | 41 | 41 | PASS
first table Lv2 at shift | <= 56 | 50 | 49 | PASS
first table Lv4 at shift | <= 120 | 84 | 80 | PASS
LP1 and LP2 by shift | <= 48 | LP1 14 · LP2 47 | LP1 15 · LP2 47 | PASS
LP3 and LP4 by shift | <= 96 | LP3 51 · LP4 55 | LP3 50 · LP4 55 | PASS
LP5 by shift | <= 120 | 70 | 69 | PASS
longest stretch of shifts without a purchase | <= 8 | 7 (shifts 7-14, 101 purchases) | 7 (shifts 2-9, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 1.9 % (of arrivals 0.6 %) | 0.4 % (of arrivals 0.1 %) | PASS
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 11.4 % (of arrivals 9.6 %) | 11.2 % (of arrivals 9.4 %) | PASS
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 12.4 % (of arrivals 9.3 %) | 11.6 % (of arrivals 9.7 %) | PASS
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 19 / 5 | 17 / 5 | PASS
daily earn cap first reached at shift | >= 150 (or never) | 184 | 168 | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 1.9 % (60 guests; of arrivals 0.2 %) | 2.3 % (72 guests; of arrivals 0.2 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1283 (45/60 and 45/60 below 1500; takings min -18) (x) | start 750 < 1500 · end min 732 (fast 732, 4 s 732) · median 1283 (45/60 and 45/60 below 1500; takings min -18) (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (2 seed-cells, violation 1.500): shift1.wallet
```

**Set 2 — L with the best shift-1 levers** (`tip.rate` 0.5, `spawn.capacityDemand.maxMult` 1, `patience.thuongMs` 12 000 over L; `sweeps/literal/final/p0-best-variant.json`): the P0 row improves to 1 of 60 below and stays red; 6 rows red.
```text
gate | target | seed 42 | seed 99 | PASS/FAIL
standard k (npm run sim, furnished alley) | 2.0-3.0 | cold 3.046 · full 3.055 · cold/off 2.971 · full/off 2.907 (x) | cold 3.046 · full 2.866 · cold/off 2.981 · full/off 2.994 (x) | FAIL
career k, standard order (D4a) | <= 3.5 | 3.280 (raw 4.02) | 3.272 (raw 4.00) | PASS
30-day total value, standard order | <= 9.185 tr | 9.137 tr (raw 17.88) | 9.182 tr (raw 17.96) | PASS
LP7 reached at shift | 140-170 | 161 | 158 | PASS
all equipment at max by shift | <= 170 | 161 | 158 | PASS
8 tables at Lv4 by shift | <= 170 | 161 | 158 | PASS
table 4 bought at shift | <= 48 | 5 | 6 | PASS
first second chair at shift | 40-56 | 26 (x) | 23 (x) | FAIL
first table Lv2 at shift | <= 56 | 33 | 30 | PASS
first table Lv4 at shift | <= 120 | 66 | 64 | PASS
LP1 and LP2 by shift | <= 48 | LP1 5 · LP2 31 | LP1 6 · LP2 27 | PASS
LP3 and LP4 by shift | <= 96 | LP3 33 · LP4 38 | LP3 31 · LP4 36 | PASS
LP5 by shift | <= 120 | 53 | 51 | PASS
longest stretch of shifts without a purchase | <= 8 | 6 (shifts 14-20, 101 purchases) | 6 (shifts 141-147, 101 purchases) | PASS
left with penalty, shifts 1-24 (of admitted) | <= 10.0 % | 3.9 % (of arrivals 1.2 %) | 12.6 % (of arrivals 4.8 %) (x) | FAIL
left with penalty, days 8-14 (of admitted) | <= 20.0 % | 24.6 % (of arrivals 21.6 %) (x) | 24.7 % (of arrivals 22.7 %) (x) | FAIL
left with penalty, days 15-21 (of admitted) | <= 15.0 % | 24.4 % (of arrivals 22.1 %) (x) | 24.6 % (of arrivals 21.8 %) (x) | FAIL
shift 1: arrivals / refused pairs | >= 15 / >= 5 | 76 / 24 | 68 / 22 | PASS
daily earn cap first reached at shift | >= 150 (or never) | 192 | not reached | PASS
guests lost to beer running out (no rush), of leavers | < 10.0 % | 0.5 % (33 guests; of arrivals 0.1 %) | 0.5 % (39 guests; of arrivals 0.1 %) | PASS
shift 1 earns table 2 (start wallet < its price, every run ends with enough) | start < 1500 and every end >= 1500 | start 750 < 1500 · end min 1262 (fast 1383, 4 s 1262) · median 3156 (1/60 and 1/60 below 1500; takings min 512) (x) | start 750 < 1500 · end min 1262 (fast 1383, 4 s 1262) · median 3156 (1/60 and 1/60 below 1500; takings min 512) (x) | FAIL
first goal after shift 1 is table 2 (no device level cheaper) | every device level >= 1500 | cheapest device level 1875 | cheapest device level 1875 | PASS
failing gates (11 seed-cells, violation 2.843): k.standard, chair1, door.shifts1-24, door.days8-14, door.days15-21, shift1.wallet
```

**Set 3 — candidate C, the first seal of S5** (`packages/engine/sim/plans/candidate-c.json`, start wallet 750 xu; green with bot v4 at a season-aligned start, 13 seed-cells red with the plan's bot):
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

- Evidence (local, git-ignored like S1-S4): `artifacts/verification/feat-eco21-balance-pass/sweeps/literal/` (`baselines/`, `p0-named/`, `p0-extended/`, `grid1-3/`, `early1-a`, `early2-a`, `early-fix1`, `solve/`, `cd1-s42`, `cd2-s42`, `cd4-floor075`, `late1-a`, `final/`: every run is a patch plus its metrics and gate table).
