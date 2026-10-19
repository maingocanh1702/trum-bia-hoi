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
