# DECISIONS (item · question · choice · why · how to overturn)


## A0 · commit trailer
- Question: global dev-rules say "no AI references in commit messages"; the harness attribution reminder + 31 of the last 30 repo commits carry a Co-Authored-By trailer.
- Choice: keep the repo-convention trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` on every commit; PR bodies end with the Claude Code line.
- Why: the repo's own history (owner's sessions) already does it; consistent.
- Overturn: `git rebase -i`/message rewrite is the owner's call on their own branches; tell the agent to drop the trailer.

## A0 · GitNexus stale at start
- Index was 51 commits behind HEAD; detect_changes mapped hunks to wrong symbols (risk=high is not trustworthy). Choice: committed WIP unchanged per brief (securing it has priority), re-index before any impact analysis in A1.

## A1 · reach basis of the goal chip
- Question: plan §4 says the chip suggests items priced <= reachMult x "xu ca gần nhất" (coins of the latest shift). The WIP uses the AVERAGE takings of closed shifts (lifetimeEarned outside the open shift / completedShifts).
- Choice: keep the average (documented in 08-SPEC §22 `nextGoal` row + changelog, F10 changelog).
- Why: the world keeps only the running/last shift object, so mid-shift there is no "latest closed shift" figure; the average is stable while a shift runs and not whipsawed by one bad shift. A new save (no closed shift) is not filtered, so the shift-1 chip is unaffected.
- Overturn: swap `shiftAverage()` in apps/web/src/goals.ts for the last closed shift's `credited` (needs a stored figure) — Tier C `nextGoal.reachMult` stays.

## A2 · P3 loss-toast reason vs the owner's 2026-09-08 "numeric loss toast only" rule
- Question: F27 changelog 2026-09-08 + F07 ("timeout feedback is numeric/icon loss only") say the lost-guest toast shows numbers only; PLAN P3 + §4 check row (owner 18/09, newer) say "khách đi = toast 1 lý do (hết bia · chờ lâu · hết chỗ)" and tell A2 to patch what is missing.
- Choice: the toast keeps its numbers and adds ONE reason label from shift 1 (apps/web/src/leave-reasons.ts, App.tsx `.loss-reason`); changelog rows in F07/F08/F10/F24/F27/09-SPEC; the old numbers-only test assertions (game.spec.ts ×2, remote.spec.ts M1-TIMEOUT) now assert "numbers + exactly one reason".
- Why: newer owner decision + plan row; the 09-08 override was about not explaining losses with prose in the first shift, a 2-word label is the plan's own wording.
- Overturn: delete the `.loss-reason` span in App.tsx (and the three assertion lines).

## A2 · a fourth reason "Hết mồi" (out of snacks)
- Question: plan names three reasons (beer · waited too long · no seat); engine causes also include foodStock.
- Choice: foodStock → its own label "Hết mồi"; every other expiry cause (queued, tap, pan, glasses, ready, mixed, locked, preparing, unknown) and the door-queue timeout → "Chờ lâu quá".
- Why: folding a snack stock-out into "out of beer" or "waited too long" would tell the player something untrue.
- Overturn: map foodStock to 'wait' in BY_CAUSE (leave-reasons.ts) and drop `leave.food`.

## A2 · a maxed table with guests shows "Đã tối đa", not "Bàn đang có khách" (Codex r1 MAJOR)
- Question: tableUpgradeQuote answers tableBusy before maxLevel (command order); should a top-level table with guests show the busy reason?
- Choice: no — at the top level the button's own label "Đã tối đa" is the one reason (PLAN §4 lists "đã tối đa" as a reason); the quote keeps `gate: 'maxLevel'` so the UI can tell never from not-now; pinned by a unit assertion + `buy-reasons.spec.ts` maxed test.
- Why: nothing is left to buy, waiting for the guests to leave would never help; two statuses under one dimmed button would be two reasons.
- Overturn: render `whyNot(q.reason)` when `q.reason === 'tableBusy'` regardless of gate (one-line change in `tableCard`).

## A2 · "Mua thêm bàn" is dimmed when it cannot be bought
- It was always enabled and answered with an error toast; PLAN §4 says every buy button shows a price and exactly one reason when dimmed. Side effect: `upgrade-hint.spec.ts` (crowded) tabs to "the first enabled control of the tables lane": its fixture got a wallet (money only) and its selector follows the `.buy-card` wrapper.

## B4 · seed numbers for the table/chair upgrade ladders (orchestrator decision, binds S4)
- Question: plan §5 S4 row lists the V4e ladder (→Lv2 10 000+5 000·n …); the 08-SPEC changelog row "2026-09-18 / chờ JSON 2.1.0, rules 28" and DESIGN-story §3 list the W9 ladder (8 000+3 000·n, 20 000+8 000·n, 35 000+12 000·n); plan §10 Prompt 4 says S5 starts from W9.
- Choice: seed the JSON with W9 in S4 (and W9 for every other S1–S4 key, e.g. tablePriceBase/chairPriceBase).
- Why: later, simulated bundle; S5 starts from it anyway, so fewer moving numbers; S4's acceptance is behavioural.
- Overturn: swap the ladder numbers in docs/config/economy.tbh.json (+08-SPEC §22 row); no code change.

## S1 · config version 2.0.4 -> 2.0.5 (bump genuinely required)
- Question: brief says leave `_meta.version` (S5 sets 2.1.0) unless a validator demands a bump.
- Choice: 2.0.5 (smallest X.Y.Z bump).
- Why: browser saves pin 2.0.4 with the OLD content; the engine refuses a same-version/different-content opening (`configVersionConflict`) and apps/web/src/local.ts only adopts a numerically newer bundle, so with 2.0.4 the seat model (and the D2 migration) would never reach an old save. A pre-release name ("2.1.0-s1") is ignored by `newerBundledConfig` and would block adopting 2.1.0 later.
- Overturn: any later slice that changes seed content bumps again; S5 sets 2.1.0.

## S1 · tableSlots = 4 at every location (D13), not the W9 4/4/5/6/6/7/8/8/8
- Question: brief "this wave every location = 4 except as listed in the W9 row"; GDD §12/F14 list 4·4·5·6·6·7·8·8·8 with "tables beyond the slots fold away", owned by Wave 5 `location-slots`.
- Choice: every `locations.list[].tableSlots` = 4; the engine already reads the per-location value.
- Why: plan D13 "Đợt này mọi mặt bằng = 4" outranks the slice brief; values above 4 without the folding rule would leave 5+ tables at Hẻm after a lease expires (undefined behaviour).
- Overturn: JSON-only edit of the nine `tableSlots` (S5 / location-slots, together with folding). Side effect: LP7 "10 seats" (kept per DESIGN-story §3) is unreachable until some alley has >= 5 slots.

## S1 · tablePriceBase index = tables owned - 1
- Question: brief says "index = tables owned"; W9 lists 7 prices for tables 2..8 and plan §0 says "Bàn thứ 2 — 1.500 xu" (= 600 base).
- Choice: the n-th table costs tablePriceBase[n-2] (first table free); validation requires length >= max(tableSlots) - 1.
- Why: the only reading consistent with 1.500 xu for table 2 and seven entries for an 8-slot alley.
- Overturn: one index expression in rules.ts buyTableQuote + validation line.

## S1 · chairsAfterTables is a fixed table count (4), not "the alley's tableSlots"
- Choice: buyChair needs `tables.length >= chairsAfterTables`; validation: chairsAfterTables <= every alley's tableSlots.
- Why: the key name and W9 value (4) are a count; D18 "chỉ sau đủ 4 bàn". Equal to tableSlots this wave.
- Overturn: compare against tableSlots(w, c) in buyChairQuote.

## S1 · seat-model key layout and the pair tray probability
- Choice: `spawn.pPair`; `upgrades.table.{tablePriceBase, chairPriceBase, chairsAfterTables, orderShape{solo.pBeer, pair.pMoi}}`; pair trays read `orderShape.pair.pMoi` (0.85); `demandMix.pMoi` stays only for pinned capacity snapshots. Solo "instant dish" = lac/nem still in stock (no stock -> beer).
- Why: brief names `.pair` with `pMoi`; keeping both shapes in one object; D14 "bia hoặc 1 mồi tức thì" vs pair "kể cả mồi bếp".
- Overturn: point the pair branch back at demandMix.pMoi and drop `orderShape.pair`.

## S1 · the seated group keeps its tray (Group.seats)
- Question: a chair bought mid-visit: does the seated group's next round already get the two-chair tray?
- Choice: no — the group records the chairs it sat down with; a new chair serves the next group (FEEDBACK II.4 "ghế thêm có hiệu lực cho nhóm kế tiếp; nhóm đang ngồi không đổi").
- Overturn: read `t.capacity` instead of `group.seats` in Game.order().

## S1 · noSeat bookkeeping and event names
- Choice: a noSeat pair counts in `stats.rejected` and a new optional `stats.noSeat` (guests, like every Stats counter); `queue_overflow{size, reason:'noSeat'}`; under rules 28 a full queue says `reason:'full'` (docs/analytics-events.md 18/09 note); chair purchases emit `chair_bought{tableId, seats, cost}` (brief) instead of the note's `table_upgraded{what:'chair'}`; tables `table_bought{cost, tableId}`.
- Why: S3 can show "N pairs without a seat" separately; one reason per door rejection (P3).
- Overturn: rename the event in engine.ts buyChair + analytics doc.

## S1 · D2 migration lives in startShift, once
- Choice: the first startShift that pins a seat-model snapshot over a pre-seat one keeps the first tableSlots tables (by purchase order) at min(2, seats), keeps levels, no refund, emits `seat_model_adopted{shiftId, tablesBefore, tablesAfter, seatsBefore, seatsAfter}`; a seat->seat repin never re-derives chairs.
- Why: same place the engine already re-derived table capacity on a config change; the logged startShift replays it deterministically, so no new system command or idempotency key is needed (adoptCalendarRules exists because that adoption has no player command).
- Overturn: move the block into a `system:` command if a server adopts configs outside an opening.

## S1 · table levels under rules 28 (until S4)
- Choice: upgradeTable needs two chairs (`tableNeedsChairs`, D18), any table state, never changes chairs; prices/badge/reputation gates unchanged; the bot does not buy levels on seat snapshots.
- Why: levels carry no benefit until S4; D18 + 03-SPEC v1.4 header (purchases never need an empty table).
- Overturn: S4 replaces the level ladder and gates.

## S1 · locations.list registered as Tier A
- Question: `tableSlots` (Tier A per FEEDBACK) is a per-row field; registryPolicy diffs arrays as one path.
- Choice: `_meta.governance.tiers.A.sections` gets `locations.list` (rent/mult/gate become dual-approval too) plus the dotted seat keys.
- Why: fail-closed (stricter approval) and the only expressible path.
- Overturn: drop `locations.list` from Tier A; give registry.ts row-level diffs (S6 owns the admin registry).

## S1 · old pinned snapshots and replay guard
- Choice: docs/config/legacy/economy-2.0.4.json (byte copy of the 2.0.4 seed) is the shape for every pre-seat 2.x snapshot; replay refuses any seat-model snapshot or buyChair entry below rules 28.
- Overturn: none needed; delete the legacy file only when no save can pin 2.0.x.

## S1 · career bot policy v2
- Choice: seats first (next table, else a second chair; the bot saves for it), then cheapest device/glass/sign; never the dog; no table levels on seat snapshots; forecast shares the policy.
- Why: brief ("tables, chairs and upgrades, not the dog"); W9/S5 bot "ưu tiên bàn/ghế".
- Overturn: sim/policy.ts seatGrowth().

## S1 · old suites: furnish a seat shop or pin the capacity model
- Choice: suites about live mechanics buy tables/chairs through real commands (fixtures/seat-shop.ts) or force singles/pairs with config keys; suites that replay rules <= 27, stage six-guest tables or two-guest first groups run on the frozen 2.0.4 capacity model (fixtures/capacity-model.ts): rush-clock, config-pinning pins, feedback loss causes, round precedence, two-guest well-rested bonus, two kitchen/stock tests, the forecast lease test.
- Why: those histories only ever existed on capacity snapshots; no assertion weakened.
- Overturn: rewrite them on seat shops when the capacity model is retired.

## S1 · quote API matches Track A (feat/fun-buy-buttons-reason, not yet on main)
- Choice: `buyTableQuote(w, c, outsideShiftOnly?) -> {cost, capacity, slots, reason, ok}`, `tableUpgradeQuote(w, c, table, outsideShiftOnly?) -> {next, cost, gate, reason, ok}` (same names/shapes as Track A, seat-model superset; `tableNeedsChairs` is part of `gate`), new `buyChairQuote(w, c, table)`.
- Why: both branches add these functions to rules.ts; identical signatures make the merge a pick-one and keep Track A's App.tsx/goals.ts callers compiling.
- Overturn: n/a — at merge keep this version of the three quotes.

## S1 · k / pressure sims are reported, not tuned
- Choice: sim:career:gate, sim:onboarding (insufficient serves with one chair) and sim:rush (seed 99 ordering) fail on S1 alone and are reported as DEFERRED to S5 (plan §5); no number or measurement protocol changed.
- Overturn: S5.

## S1 · commit attribution line
- Choice: commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the model that wrote them) instead of COMMON's Sonnet 5.5 line.
- Overturn: amend the trailer at squash/merge time if the orchestrator wants one form.

## S1 · correction: config version 2.0.20, not 2.0.5
- Question: Wave 1 branches (Track A, deployed as v-fb1) already ship 2.0.5 (fun-onboarding-visual / locale) and 2.0.6 (fun-next-goal / buy-buttons) with different content.
- Choice: the S1 seed is 2.0.20 (numeric X.Y.Z, above any Track A 2.0.N for a while, below S5's 2.1.0); supersedes the "2.0.5" entry above.
- Why: two contents under one version break saves (`configVersionConflict`) and the browser's newer-bundle adoption; 2.0.20 leaves 2.0.7-2.0.19 to Track A and 2.0.21+ to S2-S4.
- Overturn: at the Wave 2 merge the orchestrator sets one version above main's; S5 sets 2.1.0.

## S1 · a11y / remote / admin Playwright tiers not run from the eco21 worktree
- Question: COMMON wants `npm run test:a11y` for UI work and the brief the remote tier, but `apps/web/remote-test/server.ts:76` listens on 4180 (origin 4179) and `apps/web/admin-test/server.ts:18,49` on 4183/4182 whatever `scripts/verify/port.ts` resolves, and admin/moderation/account-ui specs hard-code 4179/4181; from a worktree those webServers never answer on the resolved port (60 s timeout). The only way to run them is the main checkout's port window, which the brief forbids.
- Choice: not run on 4178-4214 and not re-plumbed inside S1. Closest verified path: `apps/web/test/seat-model.spec.ts` audits the Upgrades sheet (the one screen S1 changed) with the a11y tier's axe tags (wcag2a/2aa/21aa/22aa) in vi+en at 390/360/1280 before and after the purchases: 0 violations; `apps/server/test/http.test.ts` covers the `buyChair` route. Logged in BLOCKERS.md.
- Why: brief "never reuse the main checkout's ports"; the fix spans two test servers, three configs and ~20 spec literals outside S1's mechanism, in files Track A also edits.
- Overturn: orchestrator runs `ROOT=<eco21 worktree> TBH_PORT_BASE=4178 bash .autorun/ui-tiers.sh <ev> a11y remote admin` while Track A is idle, or from main after integration.

## S1 · guest and playable journeys earn table 2, not an equipment level
- Question: `guest-test/guest.spec.ts` and `playable-test/shift.spec.ts` required the first equipment / stall level (3.750 xu) inside shift 1, earned on the old 3 x 2-seat start; a 1 x 1 shop ended shift 1 with 1.260-2.123 xu in the real-time playable run (18:03-18:16 on 0d5a311), so both failed only on that purchase.
- Choice: both journeys buy table 2 ("Mua bàn · 1.500 xu") from the Upgrades sheet, the purchase plan §7 owner line 3 names for the end of shift 1, and assert the bought tables survive reload / new tab; the playable flags assert as one object so a red run names the missing step. No assertion removed.
- Why: brief "adapt specs that assume the old 3-table start; do not weaken"; the target comes from the plan, not from S1's untuned numbers. Earning 1.500 xu in shift 1 is S5's balance target (owner line 3: P2, S5).
- Overturn: restore the stall/equipment purchase if the owner wants a device level in shift 1 (then S5 must price it in).

## S1 · English seat count "Seats: {n}"
- Question: one-chair tables made en "{n} seats" print "1 seats" (upgrade card, idle-table caption).
- Choice: en `table.seats` = "Seats: {n}"; vi "{n} chỗ" unchanged; no plural machinery added to translate().
- Overturn: S6 may replace the caption with chair sprites.

## S1 · seat-model spec clock is fixed, not paused
- Choice: `page.clock.setFixedTime(f.now)` instead of `pauseAt` so axe-core's timers run while the shop clock stays at f.now (paused timers made AxeBuilder.analyze hang); the audit also asserts `passes > 0` so it cannot pass vacuously.
- Overturn: pauseAt + `clock.resume()` before each audit (menu.spec.ts pattern).

## S1 · guest journey stays red until S5 (result of the table-2 adaptation)
- Question: with table 2 as the first purchase, the real-time playable journey passed 3/3 (table 2 bought mid-shift in every viewport, then close / reopen / overnight / next shift), but `guest-test/guest.spec.ts`'s accelerated 150 x 4 s service loop reaches only 541 / 886 / 1.144 xu with one table (16-20 served, 36-38 pair guests turned away), so "Mua bàn · 1.500 xu" stays dimmed.
- Choice: keep the purchase required (red) and defer it to S5 with plan §7 owner line 3; a never-committed diagnostic copy without that one requirement passed 3/3 (close, KPIs, reload, new tab, next day, no API), so nothing else in the journey regressed. No loop bound tuned to S1's untuned numbers.
- Why: lengthening the loop or making the purchase optional would fit the test to numbers S5 replaces; the plan's target is "table 2 by the end of shift 1".
- Overturn: S5 makes it green with numbers; if S5 meets "end of shift 1" but not the 600 s loop, extend the loop to the shift length in the same slice.

## 00 · env — toolchain installed per user, nothing on the global PATH
- Question: the laptop had no Node, no real Python, no gh, no Codex and no git identity; how to run the autopilot with no admin/UAC prompt?
- Choice: portable Node v22.23.3 (SHA-256 checked against nodejs.org SHASUMS256.txt) in `C:\dev\tools\node-v22.23.3-win-x64`; Python 3.12.10 (the last 3.12 with a Windows installer, PSF Authenticode signature checked, per-user, `C:\dev\tools\python312`) + pillow 13.0.0 + numpy 2.5.4; GitHub CLI v2.102.0 (SHA-256 checked) in `C:\dev\tools\gh`; a `python3` bash shim in `~/.tbh-shims`; every Bash call sources `.autopilot-state/env.sh` (PATH, UTF-8, non-interactive git). Playwright: chromium-1243 + headless shell + ffmpeg (the CDN stalls big downloads from Node: `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=300000`, retried).
- Why: `package.json` engines `node >=22.12`, the project is on Node 22 (`netlify.toml` 22.22.1); no admin rights; fully reversible.
- Overturn: delete `C:\dev\tools`, `C:\dev\downloads`, `~/.tbh-shims`; install the tools your usual way.

## 00 · env — clone outside OneDrive, LF, identity
- Question: where to work, and as whom to commit?
- Choice: clone at `C:\dev\trum-bia-hoi` (`core.autocrlf=false`, `core.eol=lf`, `core.longpaths=true`); commit identity `Ngoc-Anh Mai <maingocanh1702@gmail.com>` copied from the repo history (the machine and the original folder had none); `.autopilot-state/`, `autopilot-logs/` and the project `.npmrc` (`script-shell` = Git Bash) are untracked through `.git/info/exclude`; a read-only baseline clone of main lives at `C:\dev\trum-bia-hoi-baseline`.
- Why: OneDrive sync and CRLF would change config hashes and break `*.sh`.
- Overturn: `git config user.name/user.email` in the clone; delete the two clones.

## 00 · env — Windows gaps worked around outside the repo
- Question: which repo scripts assume macOS/Linux?
- Choice: (1) `scripts/check_economy_config.py` spawns `node_modules/.bin/tsx` (a POSIX shell script, WinError 193): a `sitecustomize.py` in the private Python redirects that one path to `tsx.cmd`; (2) Playwright `webServer.command` strings use POSIX `VAR=1 cmd`: Playwright runs through `.autopilot-state/with-comspec.sh` (COMSPEC = Git Bash, per command only); (3) `python3`, `cp`, `$(...)` in `package.json` scripts: npm `script-shell` = Git Bash. No repo file was changed for any of them.
- Why: a Windows port of the repo's tooling is not part of Vui 3 ca; environment shims keep the PRs about the game.
- Overturn: port the scripts (`tsx.cmd`, cross-env, `node:path` everywhere) in a tooling slice, then drop the shims.

## 00 · env — Windows baseline reds on main d1a150a are not regressions
- Question: `npm test` on `main` (no slice work) already fails 47 of 616 cases here; how do slices stay honest?
- Choice: the names are frozen in `.autopilot-state/baseline/main-npm-test-failing.txt` (apps/server admin-auth 15 · http 6 · store 4 · client-sequence 3 · registry 1; scripts/verify port 7 · map-coverage 5 · doctor 1; apps/web tbh-fixture 5; causes: POSIX credential-file mode check in `admin-auth.ts`, symlink/chmod behaviour, path separators). A slice must add no failing test beyond that set (`test-vs-baseline.mjs`); the baseline reds are listed in a `SKIPPED:` block, the verdict is PARTIAL, never PASS, until `verify:all` is re-run on macOS/Linux/CI. UI/doctor/map reds that look environmental are proven by running the same spec in the baseline clone.
- Why: honesty over green — nothing is weakened, nothing is rounded up.
- Overturn: run `npm run verify:all` and the UI tiers on the Mac before merging; if all green there, the verdicts can be raised to PASS.

## 00 · env — independent reviewer is a Claude subagent
- Question: Codex CLI is absent on this laptop (`codex: command not found`).
- Choice: `Reviewer: Claude subagent (Codex unavailable: CLI not installed)` for every stage, per §4.5/§9-H (founder accepted on 2026-10-19: no downgrade); no attempt to install or log in to Codex.
- Why: instructed by the prompt.
- Overturn: re-run `bash scripts/codex-review-pin.sh` on the Mac for the final tip.

## 00 · env — Playwright under COMSPEC=Git Bash never exits: `.autopilot-state/pw-run.sh`
- Question: with `with-comspec.sh` the Playwright runner prints its last test result and then waits forever for the web-server shell (vite keeps listening), so no summary line and no END line ever appear (first seen on the next-goal run: all 23 results in, process alive 15 minutes).
- Choice: `.autopilot-state/pw-run.sh <name> <playwright args>` = run-logged + with-comspec + a watchdog that ends the node listeners on the test ports (kill-test-ports.ps1) once all N results are in and the log has been quiet for 20 s; the runner then prints its own "N passed/failed" line and exits with its own code; every Playwright run of stage 00 went through it.
- Why: no repo file touched, evidence stays complete (the summary and the exit code are the runner's), no result is edited.
- Overturn: port the `webServer.command` strings of the eight configs to cross-env and drop the wrapper (tooling slice).

## 00 · one config version 2.0.20 for Wave 1 and S1 after the merge
- Question: main (Wave 1) pins JSON 2.0.6, S1 2.0.20; which version carries the union?
- Choice: keep 2.0.20 (date 2026-10-19). `docs/config/economy.tbh.json` = Wave 1's Tier C keys (`onboarding.idleToGuideMs`, `onboarding.featureReveal.{hudAfterShifts,upgradeAllAfterShifts,journeyAfterShifts}`, section `nextGoal` + its tier C registry entry) plus every S1 seat key; no number changed on either side.
- Why: a browser save only adopts a numerically newer bundle and two contents under one version raise `configVersionConflict`; 2.0.20 is above main's 2.0.6, below S5's 2.1.0 and meets AUTOPILOT §5 stage 00 ("2.0.20 or higher").
- Overturn: set a higher X.Y.Z in the JSON and its 08-SPEC §22 row (nothing else reads it).

## 00 · Wave 1's spotlight and goal registry learn the seat model (no textual conflict, needed for the two feature sets to meet)
- Question: `spotlight.ts` `firstGoal()` and the `tables` provider of `goals.ts` (Wave 1) assume a table level is seats; under rules 28 it is not.
- Choice: on the seat model the first goal (nav spotlight, one-card sheet) is table 2 (`kind: 'buyTable'`, needs no empty table); a capacity snapshot keeps the first table level-up. A seat-model table level gets no effect copy and is not eligible for the chip (the sheet still lists it, dimmed, with "Bàn cần 2 ghế"); the chip's rule (`pickNextGoal`, `nextGoal.reachMult`) is untouched.
- Why: a level promises no number until S4 (plan §0 P0: one thing, one number); plan §0 P2/P4: the second table is what a one-table shop earns first.
- Overturn: when S4 gives levels a benefit, add its effect copy and eligibility to the `tables` provider and a table-level branch to `firstGoal()`.

## 00 · a pre-seat snapshot pinned after Wave 1 (JSON 2.0.5 / 2.0.6) must still load
- Question: on the merged tree main's own 2.0.6 pin threw `config::keys`: the frozen capacity file (2.0.4) that shapes every pre-seat snapshot lacks `nextGoal` and the presentation keys Wave 1 added.
- Choice: `shape()` (`packages/engine/src/config.ts`) takes the bundled seed as the template for the ADDED_LATER paths the expected shape lacks and tolerates the tier C section name `nextGoal` in that snapshot's tier list; every other extra or missing key and every other tier list still fails closed. Test `seat-model.test.ts` "a pre-seat snapshot from Wave 1 …" (red without the fix); commit 5220b60.
- Why: otherwise every browser save pinned by the deployed Wave 1 build would stop loading once S1 ships (CRITICAL blast radius, see the report's Risks).
- Overturn: freeze a 2.0.6 file next to 2.0.4 and shape against it (a bigger legacy surface).

## 00 · dimmed buy buttons show Wave 1's `reason.*` line; S1's seat-model.spec follows
- Question: S1 printed the `error.*` text of a refusal under a dimmed seat button, Wave 1's `.buy-reason` prints `reason.*` (PLAN P3: price + exactly one short reason).
- Choice: one mechanism, Wave 1's (`whyNot()` over the engine quotes) with new `reason.tableNeedsChairs` / `reason.chairsLocked` / `reason.maxChairs` (vi+en); `seat-model.spec.ts` now asserts the `reason.*` keys (same words without the full stop; English maxTables "All tables are built") and its fixture keeps the whole HUD (`fullHud`, Wave 1's shift-1 HUD hides the nav).
- Why: two parallel reason mechanisms under one button would show two sources of truth.
- Overturn: point `whyNot()` at the `error.*` keys and revert the spec lines.

## 00 · Wave 1's capacity-model tests stay as written, pinned to a capacity snapshot, and gain seat-model counterparts
- Question: Wave 1's engine tests (goal-quotes, next-goal, spotlight-reveal) and specs (next-goal, buy-reasons, first-shift-visual) describe "a table level is seats" and fail on the bundled seat model.
- Choice: assertions unchanged on a capacity snapshot (`docs/config/legacy/economy-2.0.4.json` with a custom version label so the seat model never replaces it; engine `capacityConfig`; fixture modes `closed` / `oldpin` / `rest` / `states` / `rich` / `maxed`), plus new `seat-*` fixture modes and "on the seat model …" cases; the `gated` fixture is rebuilt with real seat commands (alley filled to `tableSlots`, a chair on each table, tables to their badge gate, devices to the life-path gate) and keeps its meaning; the first next-goal case loads a capacity fixture instead of a null save (a null save is a seat-model game).
- Why: S1's own rule for old suites ("S1 · old suites: furnish a seat shop or pin the capacity model"); it keeps coverage of the pin an old browser save keeps until its next opening adopts the seat model; no assertion removed or weakened.
- Overturn: delete the capacity pins once no save can pin 2.0.x.

## 00 · English "Seats +{n}" for what a new table adds
- Question: Wave 1's chip effect `goal.fx.seatsAdded` read "+{n} seats", which prints "+1 seats" now that a new table is one chair.
- Choice: en "Seats +{n}" (vi unchanged "+{n} chỗ"); same remedy as S1's `table.seats` "Seats: {n}", no plural machinery.
- Overturn: any wording that reads right for 1 and 2.

## 00 · first-shift-visual "coins fly … lost reputation falls" waits 150 s of game time, not 40
- Question: a new shop has one table and a random seed (`crypto.getRandomValues`); a pair is turned away at the door without a penalty, so the first guest who really walks out is a single who sat down and waited out 18 s + 2.5 s; 40 s of game time passed only about half of the runs (390 and 1280 failed, 360 passed).
- Choice: same assertion (`/^−\d+$/` from `.fly-rep`, then `.toast-loss` visible), window 150 s in 500 ms steps with `test.setTimeout(90000)`; the wait ends at the first falling number. 12/12 on a repeat.
- Why: the arrival process changed (S1), the promise did not; an engine-made save would hide the random seed the player really gets.
- Overturn: load a fixture save with a seed that expires a single early.

## 00 · config version 2.0.21 after the merge (supersedes "one config version 2.0.20 for Wave 1 and S1 after the merge")
- Question: after review round 1 of stage 00: the merged `docs/config/economy.tbh.json` said 2.0.20, the label S1's own earlier tip (`8f50e5f`, PR #22 before the merge) also used, with a different content (no Wave 1 Tier C keys: `nextGoal`, `onboarding.idleToGuideMs`, `featureReveal.*AfterShifts`, the tier C entry); does one label for two contents matter?
- Choice: yes: `_meta.version` is **2.0.21** (date and every number unchanged). The earlier "2.0.20 for the union" entry and `S1 · correction: config version 2.0.20, not 2.0.5` stay as history; where they say 2.0.20 they now mean S1's earlier tip. Docs got append-only rows (08-SPEC §22 changelog + the §22 provenance cell of the seat-model keys, 03-SPEC, 10-SPEC, F10); `HANDOFF.md`, `MERGE-PACKET.md` and the briefs keep their original 2.0.20 wording.
- Why: two contents under one version make `registerConfig` (`apps/server/src/store.ts`) throw `store:configVersionConflict` for any dev DB or server store that ever registered the earlier seed, and `newerBundledConfig` (`apps/web/src/local.ts`) only adopts a numerically newer X.Y.Z, so a browser save pinned to the earlier seed would never adopt the merged bundle. AUTOPILOT §5 stage 00 allows "2.0.20 or higher"; no code or test names the literal 2.0.20 (`git grep` before the change); 2.0.21 stays below S5's 2.1.0 and S2-S4 bump from it.
- Overturn: if the owner knows nobody ever registered or pinned an S1-only 2.0.20 (no dev DB, no browser save), set 2.0.20 back in the JSON and in the rows listed above; nothing else reads the label.

## 00 · shape(): Wave 1's presentation keys extend the capacity shape alone, and keys are compared as own keys
- Question: review round 1 of stage 00: (a) the stage's own fix for main's 2.0.5/2.0.6 pins let the six ADDED_LATER paths and the tier C name `nextGoal` through under every non-seed shape, so a 1.7.3 snapshot carrying `nextGoal` loaded where main refuses it (`config::keys`); (b) `k in expected` (main's code, kept by the stage) counts an own key named `constructor` / `toString` / … as known and never checks it.
- Choice: `loadConfig` passes `template === capacityModel` to `shape()`, which applies the extras and the tier C exemption only then (a 1.x or seat-model snapshot is exactly as strict as on main); both key comparisons use `Object.hasOwn`. Refines the "takes the bundled seed as the template …" wording of "a pre-seat snapshot pinned after Wave 1 (JSON 2.0.5 / 2.0.6) must still load". Commits 55cab39 (own keys) and 5aaeea2 (capacity shape alone). The 11 historical pins of main (1.6.0, 1.7.0-1.7.3, 2.0.1-2.0.6) load or refuse exactly as on main (probe run on both trees), a real Wave 1 save still decodes, re-encodes byte for byte and adopts the seat model once.
- Why: `shape()` is the CRITICAL config gate (153 impacted symbols, 47 flows) and its contract is that a partial or malformed config never becomes live; admin proposals and the admin preview feed it JSON. The prototype-chain hole is on main too, fixed here because the stage already rewrites that line.
- Overturn: pass `true` for every template (the stage's first, looser version) or put `k in` back; no shipped pin needs either.

## 00 · remote M1-TIMEOUT measures the paint of the "waited too long" toast, not the first loss toast
- Question: `apps/web/remote-test/remote.spec.ts` "M1-TIMEOUT first loss is painted within one second of authoritative expiry" resolved its paint-latency probe on the first `.toast-loss`. A new shop has one table (seat model): a pair that arrives before the first order expires is turned away at the door, which costs nothing and is not a loss, and Wave 1's batch toast shows that refusal as a `.toast-loss` whose only reason is "seat", up to ten seconds before the authoritative `order_expired` event; the probe measured that toast (latency -549 ms to -11 s in 8 of 12 repeated runs, 1 of 98 in the tier).
- Choice: the page probe watches `.toast-loss[data-reason="wait"]` (and re-checks when `data-reason` changes); every assertion stays: 0 <= latency <= 1000 ms, accessible name "Chờ lâu quá. Trừ … xu và … uy tín", one `.loss-reason`, `phase` open and not paused, `lost` > 0, stamina spent. 9/9 on a repeat (latency 44-60 ms), remote tier 98/98. Commit 3fc23b5, `apps/web/remote-test/remote.spec.ts` lines 322-336.
- Why: the promise under test is "the expiry's own toast is painted within a second", the arrival process changed (S1), the promise did not; accepting the refusal toast would measure a different event.
- Overturn: seed the remote store so no pair arrives before the first expiry and go back to any `.toast-loss`.

## 00 · the buy-reasons `book` fixture waits for a beer-caused loss, not the first loss
- Question: `apps/web/test/fixtures/buy-reasons.ts` mode `book` builds a shift in which guests left for different reasons: it stocked no beer, waited for the first loss (`stats.lost >= 1`), restocked, and let the rest time out. On the seat model the first loss can be a pair or a queued group that timed out for another reason, so the restock could land before any beer loss existed and the book listed fewer than the three reasons the spec requires (`order.length >= 3`, beer not first).
- Choice: wait until the shift report counts a beer loss (`menuReport(...).losses.beerStock + .beerRefill >= 1`), then restock and play on; the later wait (`lost >= 24 && rejected >= 5`) and `buy-reasons.spec.ts` (30/30) are unchanged. Commit ca0b4ba, `apps/web/test/fixtures/buy-reasons.ts` lines 93-94.
- Why: the spec asserts the book lists reasons most guests first, with the counts differing per reason; the fixture has to produce that on the seat model as it did on the capacity model, through real commands only.
- Overturn: any trigger that yields at least one beer loss before the restock.

## 00 · `bootFresh(page, prefs, time, seed, tables)` replaces S1's `two-tables.ts` fixture
- Question: S1's `game.spec.ts` "tapped order stays live, returns keyboard focus, and closes on customer expiry" needed a second table (focus moves between two table triggers) and used its own fixture `apps/web/test/fixtures/two-tables.ts` (a custom config version, one `buyTable` through the real command); Wave 1 meanwhile moved that spec and most others to `bootFresh` (full HUD from shift 1, language accepted), so a textual merge kept two ways to boot a fresh game.
- Choice: one mechanism, Wave 1's: `freshGame` / `bootFresh` take a `tables` argument (`apps/web/test/fresh-game.ts`, `apps/web/test/fixtures/fresh-game.ts`); extra tables are bought with the real `buyTable` command and the wallet is raised by exactly their price, so the save starts with the coins of a one-table game. `two-tables.ts` is deleted, the spec calls `bootFresh(page, {}, undefined, undefined, 2)` (`apps/web/test/game.spec.ts` line 112); assertions untouched. Resolved in merge commit 6f94d08.
- Why: one fixture per need (plan "furnish a seat shop or pin the capacity model"); the S1 fixture's custom version label is not needed: a save pinned to the bundled version is never replaced by the bundle (`newerBundledConfig` only adopts a newer X.Y.Z).
- Overturn: restore `two-tables.ts` and the spec's `execFileSync` boot from 8f50e5f.

## 00 · 90 s budget for the rush-warning and flyer-purchase specs; the local UI tier runs with 3 workers on this laptop (review round 2)
- Question: at the default 6 workers on this 12-thread Windows laptop the rush-warning specs of `game.spec.ts` ran 53–60 s and the three flyer-purchase specs 41–50 s against the 45 s default budget and went red (CPU contention, not a code regression: they pass at 1 and at 3 workers, the flyer specs take 17 s alone). How to keep the tier stable for S2–S7 and the final gate?
- Choice: `test.setTimeout(90000)` on those two spec groups (the budget `first-shift-visual.spec.ts` already gives its coin-fly spec; no assertion changed) and the local tier is run with `--workers=3` here (ENV-NOTES, worker preamble). `game.spec.ts` "a neglected first shift closes after remaining guests expire …" is timing-sensitive in a different way (the loss toast can expire in real time between two Playwright round trips while the fake clock keeps running) and still flakes at 6 workers; it is left as written and passes at 3 workers.
- Why: honesty over green — a budget only bounds how long a loaded machine may take, it asserts nothing less; every red seen at 6 workers was re-run and passed at 3.
- Overturn: remove the two `test.setTimeout` lines; or set `workers` in `playwright.config.ts` for every machine; or give the neglected-first-shift spec a ticking-clock-safe toast probe.

## 01 · instant pour is gated by rules >= 28 AND a seat-model snapshot (the S1 convention), not by the rules version alone
- Question: the stage spec says "rules >= 28 only (`rulesVersion >= 28`, old saves/replays byte-identical)". The engine's `rulesVersion` is private and the remote `WorldView` has none, but the UI must tell which pour a game has (the keg shows one set of numbers). A rules-only gate also switches a game pinned to a capacity snapshot (an old save) in the middle of a shift, at its first live rules-28 command, while the UI could not follow.
- Choice: `instantPour(config)` (`packages/engine/src/production.ts`) = `keg.refillEnabled && isSeatModel(config.values)`; `Game.prepare()` takes the beer straight from the reserve into a clean glass when `rulesVersion >= INSTANT_POUR_RULES (28) && instantPour(this.config)` (or on the old rules-18-20 / 1.x batch path, the same boolean as before). A capacity pin keeps its tap queue through live rules-28 commands until the opening that adopts the seat model (one switch together with the D2 migration, exactly how the 10-SPEC S1 row describes the seat model). A seat-model snapshot with the keg refill switched off (`refillEnabled=false`, Tier B) has no reserve to pour from and keeps the tap too. Each half is tested: `instant-pour.test.ts` `a rules-27 save keeps the tap through its live rules-28 commands and pours instantly only at the opening that adopts the seat model` and `a seat-model snapshot with the keg refill switched off keeps the tap: the gate needs refillEnabled as well as the seat shape`.
- Why: a seat-model snapshot only ever runs at rules >= 28 (`replay()` refuses older entries for one) while a capacity pin may run at rules 28 and keeps its tap until the opening that adopts the seat model, so the pinned config is the discriminator the web already uses for every other rules-28 UI (`isSeatModel`); engine and UI agree at every reachable state, old saves keep the tap byte for byte also mid-shift, and every S1 / Wave 1 suite pinned to a capacity snapshot stays valid unchanged. No new config key, no JSON change.
- Overturn: make `instantPour()` return `refillEnabled` alone (a rules-only gate) and expose the rules version to the UI (verification snapshot / WorldView); then re-pin the capacity-pinned suites that wait for the tap.

## 01 · "rót sẵn n cốc" counts min(beer.ready, clean glasses): `beerStatus.serveNow` (and `instant`)
- Question: B2: the label must mean exactly "n beers a guest can get right now (`beer.ready` and clean glasses)"; the HUD badge, the keg sheet line and the pipeline line printed `beer.stored` (ready beers only).
- Choice: `beerStatus` gains `instant` and `serveNow` = `instant ? min(available, clean glasses) : stored`; the three UI lines print `serveNow` (the badge stays "n/capacity" so the player still sees the reserve size); a capacity pin prints what it printed (`serveNow === stored`). A fixture with 4 beers and 3 clean glasses proves 3 on the HUD (`instant-pour.spec.ts`).
- Why: the engine acceptance is "beer.ready >= n and clean glasses >= n -> n beers ready in the same tick", so n = the smaller of the two; with plain `beer.ready` a glass shortage would still read "rót sẵn" while the guest waits (the very lie FEEDBACK II.1 complains about). `beerStatus` is CRITICAL by graph but the edit is additive (two fields).
- Overturn: print `beer.available` again in `App.tsx` (three places) and drop the two fields.

## 01 · the keg shows reserve + refill only on a seat-model game: new copy keys, old keys kept for pins
- Question: "UI bom 1 bộ số": which strings go, which stay?
- Choice: on a seat-model game the keg sheet drops the tap line of the upgrade card (`production.taps`), `production.pouring` ("Đang rót n/m vòi") and the old `production.reserveHint`; the card compares levels by `production.tank` ("Dự trữ rót sẵn: n cốc" / "Poured reserve: n glasses") and the existing `production.refill`; the hint is `production.instantHint`; the goal chip's keg effect is `goal.fx.keg` ("dự trữ n cốc" / "reserve n glasses" = `kegStorage[next]`) instead of `goal.fx.taps`. vi + en, `check:i18n` 912 paired keys. A capacity pin shows every old line (`instant-pour.spec.ts` pin case).
- Why: the tap numbers no longer describe anything the player can feel; one set = the bom's reserve and refill batch (the "trạm = 2 tham số" convention of 09/09 kept). The badge "Rót sẵn n/cap cốc" and the equipment name "Vòi rót" are unchanged.
- Overturn: restore the three strings in `upgradeCard` / the keg sheet and `goal.fx.taps` in `goals.ts` `equipmentEffect`.

## 01 · `orderPreparation` is not edited: the `tap` cause is unreachable by construction
- Question: the brief says the `tap` cause cannot occur under rules >= 28; should `preparation.ts` learn that?
- Choice: no code change in `preparation.ts` (CRITICAL by graph: 64 impacted symbols, 3 direct callers). On a seat-model game with the keg refill on no beer item is ever `preparing`, so `beer.pouring` is 0 and the `tap` branch cannot be taken (with `refillEnabled=false` the tap path is live and the cause can occur, as before); a guard would be an untestable dead branch. Instead `instant-pour.test.ts` `rules 28 never puts a beer in a pour while the keg refill is on: ...` runs a 300 s bot shift with 90 s taps and beer running short and asserts `pouring === 0`, no `tap` cause on any waiting order and no `order_expired.cause === 'tap'` (and that `beerStock` and `beerRefill` were seen, so the sweep is not vacuous).
- Why: the smallest edit on a CRITICAL path; the invariant is still pinned by a test that fails the day somebody reintroduces a pour state.
- Overturn: add `&& !beer.instant` to the `tap` condition of `orderPreparation`.

## 01 · pour events: `beer_pouring` + `beer_poured{fromReserve:true}` + `order_ready` in the tick of `order_placed`
- Question: which events does an instant pour emit?
- Choice: the same pair the pre-economy-2 batch path (rules 18-20, 1.x pins) already emitted, `beer_pouring` then `beer_poured` with `fromReserve: true`, both at the tick of the order, then `order_ready` (the existing sweep at the end of `prepare()`); no new event name (`docs/analytics-events.md` row).
- Why: `audio.ts` plays the pour sound on `beer_pouring` and stops it plus the clink on `beer_poured` (a short clink for an instant pour); analytics keep one event per pour; the payload tells instant from queued pours.
- Overturn: skip the `beer_pouring` emit when `direct`.

## 01 · tests whose subject was the 2 s tap: re-pinned or re-worded, nothing weakened
- Question: on the bundled (seat-model) config three existing tests asserted the tap: `economy2.test.ts` "a new shift fills real reserve, pours through its one tap ...", `game.spec.ts` "tapped order stays live, returns keyboard focus, and closes on customer expiry" (Serve dimmed, then enabled after 2 s), and the keg copy of `economy2.spec.ts` / `ui-clarity.spec.ts` (A5).
- Choice: the engine test now runs on `capacityGame` (the frozen 2.0.4 snapshot, where the tap is still live), assertions untouched; `game.spec.ts` keeps its subject ("the tapped order stays live") and now asserts Serve enabled at once and that the open panel's countdown moves after 2 s, then enabled; `economy2.spec.ts` / `ui-clarity.spec.ts` expect the one-set copy and that no tap line is shown; the dimmed 2 s wait lives on where it still exists, in `instant-pour.spec.ts` (capacity pin: `data-preparation` "preparing", then "ready" after `pourMs`) and `instant-pour.test.ts` (a pin keeps the tap through live rules-28 commands).
- Why: the premise (a 2 s wait after the order) no longer holds on the config the spec boots; the property under test (the open panel is live) is asserted with a number that moves, and the old behaviour is still proven where it applies.
- Overturn: boot those specs from a capacity-pinned save and restore the original lines.

## 01 · k and income are measured, not tuned; what S5 inherits from instant pour
- Question: FEEDBACK II.1 predicts +3..+8 % income for instant pour alone (k 3.51 -> 3.79 on the capacity model); the gates were already red after S1.
- Choice: measured on the career bot (policy v2, 30 days) against the S1 tip exported with `git archive 45aa547` (the A/B reproduces S1's recorded 26 949 / 27 430 served and k 3.9625 / 3.9482 exactly): seed 42 served +3.1 %, ledger income +2.4 %, k 3.9413; seed 99 served -0.8 %, income -1.6 %, k 3.9107. `sim:career:gate`, `sim:onboarding` and `sim:rush` fail exactly as on S1 (same assertions); verdict PARTIAL with `SKIPPED/DEFERRED: k rebalanced in S5 per plan §5`. Nothing tuned. Two facts handed to S5 (08-SPEC changelog row): a keg level Lv2-5 now buys reserve + refill only (the `pourSlots` / `pourMs` columns are dead at rules 28) at prices that were set for the tap, and the config's `upgrades.keg._rule` string still describes the tap (left alone: editing it is a JSON content change and would force a `_meta.version` bump).
- Why: HANDOFF §9 "do not fix the k gate of S1-S4 by changing numbers"; the small, seed-dependent effect (fewer queued beers matter little with 1-4 tables) is a finding for S5, not a bug.
- Overturn: n/a (S5 owns every number).

## 01 · env — the remote Playwright tier runs serially (its config's own `workers: 1`), not at 3 workers
- Question: the worker preamble says to run the big tiers, the remote one included, with `--workers=3` on this laptop. Two stage 01 remote runs at 3 workers went 93/98 and 92/98.
- Choice: the five reds (`account-ui.spec.ts` ×2, `locale.spec.ts`, `login-invitation.spec.ts`, `remote.spec.ts` "M1-SCREENS seven core screens through the server at 390x844") all carry session / account-state signatures: the page shows "Phiên đăng nhập đã hết hạn" or "Account state does not match", the bridge snapshot is undefined, the first order hint never appears, and one `dayShifts` read shows a day key of 2026-10-31 (the machine date is 2026-10-20). The remote fixture server (`apps/web/remote-test/server.ts`) keeps ONE clock offset (`/__test/clock`) for the whole server and `playwright.remote.config.ts` declares `fullyParallel: false, workers: 1`; with 3 workers different files run side by side, which is consistent with one file moving the server clock under another one's session (inferred from those signatures, not proven). The second 3-worker sample failed a different set (6 reds: `leaderboard.spec.ts` en, `login-invitation.spec.ts` ×2, `account-ui.spec.ts` ×2, `remote.spec.ts` "a fresh guest visit keeps the yard accessible before heartbeat recovery"; only `account-ui.spec.ts:243` and the login-invitation family repeat) with the same signatures (session expired message, undefined state snapshot, the guest button never shown), which is what random interference between files looks like. Re-run with the config's own setting: 98/98 in 7.8 min (`01-pw-remote-2.log`); all three runs are kept as evidence. The local tier keeps `--workers=3` (its specs have no shared server).
- Why: honesty over green: the serial run is the configuration the repo ships, and the red 3-worker run is recorded, not hidden. A red at 3 workers is "yours to fix" (preamble); the cause is the tier's shared clock, not S2 (the five specs pass untouched, serially, on the same code).
- Overturn: run the remote tier at 3 workers again and fix the shared clock (one clock per worker, or `fullyParallel` per file with its own server); until then ENV-NOTES / the worker preamble should say "remote: serial".

## 01 · k A/B method: the parent tip is exported with `git archive`, not checked out
- Question: how to measure S2's effect on the career bot without touching the working tree (`git stash` / `git checkout -- <path>` are forbidden)?
- Choice: `git archive 45aa547 | tar -x -C C:\dev\tmp-s1-ab` (S1's tip, outside the repo), `node_modules` joined by a directory junction, the same `packages/engine/sim/career.ts` run on both trees (`autopilot-logs/ab-career-42/99.*`); the S1 numbers it prints equal S1's own report exactly (26 949 / 27 430 served, k 3.9625 / 3.9482), which validates the method. The temp tree is removed at the end (junction first, so nothing in the repo's `node_modules` can be touched).
- Why: a same-code A/B isolates S2 from everything S1 and stage 00 changed.
- Overturn: n/a (a measurement protocol of this stage, nothing in the repo).
