# Economy k-ledger (08-SPEC-economy-constants.md §22 "Config Registry"; 04-SPEC-prototype-phase0.md §5 "Cách đo k_value" — the k-measurement invariant; `docs/config/economy.tbh.json` `k`/`ledgers` blocks)

## Observable contract

- `World` ledger fields (`packages/engine/src/types.ts:71-91`): `coins`, `dayEarned:
  Record<string,number>`, `seasonEarned`, `lifetimeEarned`, `peakLeague`, `seasons?.contestEarned`.
- `docs/config/economy.tbh.json`: `k.value` (2.5), `k.anchorValuePerServe` (82.5, the k-formula
  denominator — NOT `Base`-suffixed, so it is not itself k-scaled at load), `k.band` (`[2.0, 3.0]`,
  economy.tbh.json:129-136); `ledgers.countedSources: ["servePayment","serveTip","shipperNet"]`,
  `ledgers.excluded: ["quest","attendance","lottery","donation","compensation"]`
  (economy.tbh.json:595-606) — only the three counted sources move `dayEarned`/`lifetimeEarned`/
  season ranking; everything else still adds to `w.coins` but doesn't count toward the daily cap or
  league score.
- Events: `coin_gain` (`engine.ts:891,905`), `customer_served`/`order_served` (`:884,891`),
  `shipper_completed` (`:904`), `well_rested_bonus` (`:885`), `life_path_reward_claimed` (`:927`),
  `quest_claimed`/`daily_bonus_claimed` (`:959`), `lease_deposit_refunded` (`:335,343`),
  `emergency_pack_claimed` (`:1056`).
- k measurement: `serveValueStats(serves, c)` (`packages/engine/src/menu.ts:5-12`) — `k =
  mean(payment+tip per serve) / c.values.k.anchorValuePerServe`, counting only real serves (no
  delivery/bonus/quest credit, no throughput). Returns `kValue: null` when `served === 0`, not
  `NaN`/throw.

- **Career bot v2 (S1):** `packages/engine/sim/policy.ts` saves for the next table, then a second chair, before anything else; never buys the dog; no table levels on seat snapshots. `simulateCareer` logs every coin purchase (restock excluded) with the shift it serves (`report.purchases`, day rows' `purchases`), and `npm run sim:career` prints `PURCHASE shift N (day D): table 2 - 1500 coins` lines for tables, second chairs and device/table levels. S1 alone breaks the advanced k gate (career seed 42 k 3.96 > 3.5) as plan §5 expects — rebalanced in S5.

## Single-mutator invariant

`credit()` (`packages/engine/src/rules.ts:110-122`, doc comment: *"The only faucet entry point.
Spending/rewards cannot accidentally inflate league scores."*) is the **only** function that ever
adds to `w.coins`/`w.dayEarned`/`w.seasonEarned`/`w.lifetimeEarned`, and it delegates season-specific
writes to `creditSeasons()` (`packages/engine/src/seasons.ts:61-71`), which mutates
`w.seasonEarned`/`w.seasons.contestEarned`/`w.peakLeague`. The other ~20 exported `rules.ts`
functions (`wellRestedBonus` `:23`, `customerValue` `:69`, `restockQuote` `:33`, `upgradeQuote` `:41`,
`creditQuote` `:103`, `deliveryQuote` `:141`, `stockGiftQuote` `:155`, …) take the read-only
`WorldView` type and mutate nothing — verified by reading every body in the file.

Two more `rules.ts` exports are typed to take the mutable `World`, and need to be read precisely, not
assumed from their signature:
- **`addStock`** (`rules.ts:167-171`) mutates `w.inventory` directly, then calls `credit(w, c,
  q.overflow, 'giftOverflow')` on the **same real `w`** — its own coin-side effect is entirely
  delegated through `credit()`, never a second mutation path.
- **`creditBatchSafe`** (`rules.ts:123-136`) is typed `(w: World, ...)`, which looks like a mutator,
  but every internal `credit(...)` call passes a disposable `trial` clone
  (`const trial: World = {...w, dayEarned: {...}, seasons: {...}}`) that reconstructs only the two
  sub-objects `credit`/`creditSeasons` actually touch (`dayEarned`, `seasons`) — so nothing it does
  reaches the caller's real `w`. It dry-runs a batch of credits and returns a `boolean`; callers only
  ever consume that boolean (`engine.ts:871`), never the mutated trial.

Direct `w.coins` mutation *does* exist outside `credit()` — `this.spend()` (`engine.ts:475`) and
`this.penalize()` (`engine.ts:478-484`) both do `w.coins -=` directly. This is by design, not a
violation: `credit()`'s own doc comment scopes itself to the **faucet** (inbound) side; debits are a
separate, simpler path that never touches `dayEarned`/`seasonEarned`/`lifetimeEarned`/`seasons`.
State this distinction explicitly in review — "nothing *adds to* coins except `credit()`" is the
correct claim, "nothing touches coins except `credit()`" is not.

## How to reach it

Engine (all in `packages/engine/src/engine.ts`, verified by grep of every call site):
- `credit(` — `:334,341` (`settleLease`/`leaveLease`, source `depositRefund`), `:875-876` (`serve`,
  `servePayment`/`serveTip` + well-rested bonus), `:901` (`serveDelivery`, `shipperNet`), `:925`
  (`claimLifePath`, `quest`), `:954` (`claimQuest`/`claimDailyBonus`, `quest`).
- `creditBatchSafe(` — `:871`, inside `case 'serve'` (gated on `rulesVersion >= SEASON_RULES`): dry
  runs every customer's payment/tip/bonus credit; a `false` result fails the command closed with
  `fail('rewardOverflow')` (`:873`) before any real `credit()` runs.
- `addStock(` — `:925` (`claimLifePath`), `:1056` (`emergencyPack`).
- Sims drive this purely through the public command surface (`game.command()` + `game.advance()`,
  `packages/engine/sim/headless.ts:29-56`) — no direct ledger writes from a sim itself.

## Existing proof

- `packages/engine/test/feedback.test.ts` — `expiry records the ready or pending cause before waste and counts whole customers once, separate from queue losses`; `genuine rules25 losses and summaries replay unchanged, then mixed old and new evidence remains explicitly unknown`. `menuReport.losses` reconciles one customer count per queue/seated loss with `stats.lost`; it does not alter money or historical `menu_mix_summary` payloads. Run `node --import tsx --test packages/engine/test/feedback.test.ts`.

- `packages/engine/test/economy2.test.ts` — 10 cases (flat, no `describe`), e.g. `'a new shift fills
  real reserve, pours through its one tap and starts refilling the vacancy immediately'`, `'glass
  purchases respect owned capacity, exact price, pause and retry identity'`, `'both complete config
  generations load, while partial new snapshots, cyclic gates and invalid units fail closed'`.
- `packages/engine/test/config-pinning.test.ts` — 11 cases (flat), e.g. `'a published candidate
  cannot reprice a running shift; the next opening preserves assets and adopts its duration, capacity
  and real pour/serve price'`, `'a same-day lower cap preserves already-earned value and a prior
  rested grant across config changes'`, `'an unsafe new clock is refused before onboarding can
  install an unrepresentable shift deadline'`, `'registry reserialization may reorder object keys but
  cannot change same-version values or array order'`.
- `apps/web/test/config-pinning.spec.ts` — 1 Playwright case: `'a mixed-config save imports through
  recovery, preserves its backup and continues the pinned shift after browser reload'`.
- `packages/engine/test/seasons.test.ts:47` — `'an order served exactly at rollover belongs wholly to
  the new window and idempotent retries do not add another score'` — the most direct idempotent-credit
  regression test in the repo, though it lives in the seasons file, not the two above.

- `packages/engine/test/career.test.ts` — `six real career days conserve the wallet and replay purchases, claims, clocks and earned LP from a fresh save` (S5: it was `two real career days …`; with the plan's bot and the JSON 2.1.0 prices the first second chair falls at shift 32 and the first extra glass at 36 in that harness, LP4 on day 6) also pins the purchase log (one entry per coin purchase, shift order, tables 2–8 before the first second chair, never the dog).
- S5 (D4(a), JSON 2.1.0) — the career gate on the **standard order**: `packages/engine/test/career-gate.test.ts` (5 tests, mutations 10/10 killed): `'the standard order is beer plus the first snack: a second snack and the Lv4 tip are taken out, an extra round is not counted, a Lv1 table is untouched'`, `'normalisedStats counts the standard serves only and keeps k as mean value per serve over the anchor'`, `'a career report carries the standard-order twin of the k measurement: every serve is counted or is an extra round, and the value never exceeds the raw one'`, `'the total-value gate: 30 days of standard orders stay within +10 % of the 8.35 tr baseline, on every seed'`, `'the gate reads the standard order from config 2.1.0 on and the raw k of the older definition before it (04-SPEC section 5)'`. The career runs the plan's own bot by default (seats first, direct leasing, no dog, start 2026-09-09; bot v4 and the season-aligned start are options): `packages/engine/test/career-policy.test.ts` (3 tests, `'a free shop leases the best location its life path allows and its wallet pays for; the stepwise v3 bot takes the next one up'`, `'the price decides: with a table that costs more than a device the bot buys the device first, and the seats-first bot saves for the table'`, `'the career runs the protocol of plan S5 by default (seats first, direct leasing, the day every S1-S4 career started); the price-decides bot and the first midnight of a season are options'`). Standard sims on the furnished first alley: `packages/engine/test/standard-sim.test.ts` (3 tests: `'the standard scenario is the complete first alley built with real commands, and the wallet is the one a new shop has'`, `'a capacity pin and a 1.x pin start furnished and are left alone'`, `'the standard measurement runs on the furnished alley: 1000 serves of both profiles, k is mean value per serve over the anchor, onboarding on and off'`). Sealed numbers: `packages/engine/test/sealed-economy.test.ts` (7 tests, among them `'the starting wallet does not afford table 2: a new save EARNS its first table in shift 1 (plan section 0, P0; the owner's price)'` (table 2 = 428 base = 1 070 xu, the wallet 750 xu, at least 300 xu left to earn)); the yardstick itself: `packages/engine/test/balance-gates.test.ts` (33 tests: a career inside every target passes the 22 gate rows and prints the information row, one doctored number per rule family fails exactly its row on its own seed, the gate row `shift1.plan` (the owner's 4 runs in 5: 240 of 300 passes, 239 fails, 79 % fails, 81 % passes, the worse service model decides, a start wallet that pays table 2 fails it) and the information flags that never fail it (the strict reading `shift1.wallet` printed INFO, the takings 850 / 1 160 xu and refused pairs 8 / 12 bands in the cell), the probe's wiring and the default of 300 probes with the 95 % Wilson interval of every share (`'the shift-1 probe counts 300 runs by default and every share prints its 95 % Wilson interval (review round 3: 48 of 60 reads 68-88 %)'`) are pinned, eight rule mutations red and nine more for the shift-1 semantics: loosened share, better service model, start wallet allowed, either band or the strict reading turned into a gate, INFO printed as PASS / FAIL, the verdict dropped, the 4 s model ignored) and `npm run sim:balance` (both seeds, the plan's protocol, the table printed); the full gate table of the balance pass comes from `node --import tsx packages/engine/sim/balance-gates.ts --patch=<json> --label=<n> --out=<dir> --onboarding-pair` (the shift-1 probe counts 300 runs by default; `node --import tsx packages/engine/sim/p0-share.ts [patch.json] [--set=path=json]` prints one statistic line per economy: share with its interval, median takings and refused pairs), the search from `packages/engine/sim/balance-sweep.ts`, `balance-grid.ts`, `balance-p0.ts` and `solve-ladder.ts` with the plans under `packages/engine/sim/plans/`.

## Verification procedure

- Engine/server: `node --import tsx --test packages/engine/test/economy2.test.ts
  packages/engine/test/config-pinning.test.ts packages/engine/test/seasons.test.ts` (or `npm test`
  for the full suite).
- UI: `npx playwright test apps/web/test/config-pinning.spec.ts` — **not** part of `npm run verify`'s
  chain (verify runs `check:config && check:i18n && build && test && sim:onboarding && sim:rush &&
  sim:career:gate`, no `test:e2e`), so this spec needs a separate `npm run test:e2e` invocation.
- k band: `npm run sim:onboarding` (5 seeds × 2 kitchen-level profiles × onboarding modes, ≥1000
  serves/seed, asserts every row's k inside `k.band`); `npm run sim:career:gate`
  (`assertAdvancedCareerK`, 2 seeds × 30 days, requires `days>=30, lifePath>=4, served>=500, k <=
  3.5`; from config 2.1.0 on the gate reads the k of the standard order and a 30-day total value ≤
  9 185 000, see 04-SPEC section 5). `npm run sim:rush` does **not** check k — it checks spawn/serve
  timing under rush pressure only.

## Uncovered paths

- The debit paths (`spend()`, `penalize()`) bypass `credit()` by design (see above) but have no test
  coverage verified in this pass under the economy2/config-pinning umbrella — likely exercised
  incidentally by `manual-close.test.ts`/`attendance.test.ts`/`shipper.test.ts`, not confirmed here.
- `connectionLost`/`connectionRestored` (`engine.ts:742-766`) never call `credit`/`creditBatchSafe`/
  `addStock` directly — no direct ledger interaction found; any effect on ledger timing is indirect
  (via quest/attendance refresh), not verified.
- No test isolates `creditBatchSafe`'s non-mutation-of-real-world property by name — its coverage is
  implicit through `case 'serve'`'s `rewardOverflow` fail path.

## Variants

- **success** — `serve`/`serveDelivery`/`claimLifePath`/`claimQuest`/`claimDailyBonus` return
  `{ok:true, amount}` after a real `credit()` (`engine.ts:856-893, 894-907, 921-929, 951-961`).
- **reason** — fail-closed guards block credit before mutation: `fail('rewardOverflow')`
  (`engine.ts:873`, serve via `creditBatchSafe`), `:899` (serveDelivery, `deliveryQuote.safe`), `:924`
  (claimLifePath, `q.safe`).
- **empty** — `addStock` calls `credit(..., 'giftOverflow')` even when overflow is `0`; `creditQuote`
  and `creditSeasons` both no-op cleanly on a zero amount (`seasons.ts:62`); `serveValueStats` returns
  `kValue: null` (not throw) at `served === 0`.
- **persistence** — the whole subject of both `config-pinning` files; the web spec literally reloads
  the browser mid-shift and checks the pinned shift + ledger continue correctly.
- **capacity** — `c.values.shift.dailyEarnCapBase` day-cap enforced in `creditQuote`
  (`rules.ts:103-109`); config-pinning case 7 above is a direct same-day-cap-change regression.
- **duplicate/idempotent** — `applyCommand` (`engine.ts:702-703`) returns the cached prior `Result`
  for a repeated `idempotencyKey` and never re-executes, so `credit()` cannot double-fire on replay;
  `seasons.test.ts:47` is the direct ledger-specific proof.
- **stale** — `customerValue` zeroes tip when the glass is stale (`rules.ts:78-79`); `headless.ts:66`
  tracks a `stale` count as a k-measurement diagnostic column.
- **time-jump** — `syncSeasons` (`seasons.ts:32-56`) closes possibly-multiple elapsed season windows
  in one catch-up with stable result ordering; `seasonWindow` throws `season:unsafe-clock` on an
  unrepresentable clock; config-pinning case 8 above is the direct regression test.
- **offline/reconnect** — not exercised at the ledger level; see Uncovered paths.

## Gotchas

- `c.values.shift.dailyEarnCapBase` is **k-scaled at config load**: `scale(v, k, base)`
  (`config.ts:355-360`) rounds any `...Base`-suffixed leaf by `k.value`. Raw JSON is `200000`
  (economy.tbh.json:1054); at `k.value = 2.5` the effective runtime cap is `500000`. `k.anchorValuePerServe`
  is a fixed anchor, not `Base`-suffixed, so it is *not* rescaled the same way.
- `credit()`'s legacy `if (!w.seasons) w.seasonEarned += credited` branch only fires on a world with
  no `seasons` object; once `w.seasons` exists (the normal case), `w.seasonEarned` is mutated
  exclusively inside `creditSeasons` — two different code paths update the same field depending on
  world shape.
- `apps/web/src/App.tsx:148`'s `loss.coins += Number(e.data.penalty)` is a **local UI toast
  aggregator** built from already-emitted event data — unrelated to `World.coins`, don't confuse it
  with a ledger mutation site when grepping `.coins`.

## Related

[serve-outcomes](serve-outcomes.md) (shares the `customerValue`/`credit` call sites inside `case
'serve':`), [save-replay-local](save-replay-local.md) (both config-pinning files are effectively the
save/replay persistence tests for this same ledger — heavy overlap, not a separate concern).


### A1 — 2026-09-16 proof
- `apps/web/test/local-config.test.ts`: newer bundled config adoption only at next successful opening; running/historical pins, custom/newer versions and replay retained.
- `packages/engine/test/progression.test.ts`: LP1 scaled threshold/four seats without dog; old pinned dog requirement still enforced.
- `apps/web/test/improve-lp1.spec.ts`: production browser guest with real previously earned income migrates LP1, opens next shift, reloads unchanged with no visible dog. Run `npx playwright test --config playwright.improve.config.ts improve-lp1.spec.ts`.

## Changelog — A4
| Date | Change |
|---|---|
| 2026-09-16 | Add current order feedback and rules26 loss evidence regression citations; historical replay remains unchanged. |


### Wave B — 2026-09-16 proof
- `packages/engine/test/menu.test.ts` — 'five production seeds export exact six shift KPIs matching service records and deterministic replay'; 'flat beer and snack numerators use served rounds, while empty and partial shifts never invent ratios'. Same canonical serveValueStats basis, no credit/throughput term.

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1: career purchase log and policy v2 cited; S1 k numbers reported, gate deferred to S5. |
| 2026-10-20 | S2 `eco21-instant-pour`: the career bot (`npm run sim:career -- --seed=42` / `--seed=99`, 30 days, same tree except S2) serves 26 949 → 27 775 (+3.1 %) / 27 430 → 27 207 (−0.8 %) guests, books +2.4 % / −1.6 % income and ends at k 3.9625 → 3.9413 / 3.9482 → 3.9107; `sim:career:gate`, `sim:onboarding` and `sim:rush` stay red exactly as on S1 (k above the 3.5 soft cap, "insufficient serves" on seed 20260611, "heavy pressure exceeds light and normal"): DEFERRED to S5 (plan §5), nothing was tuned. |
| 2026-10-20 | S3 `eco21-capacity-demand`: career bot (policy v2, 30 days, same tree except S3, the S2 tip exported with `git archive` reproduces S2's recorded 27 775 / 27 207 served and k 3.9413 / 3.9107 exactly): seed 42 served 27 775 → 23 425 (−15.7 %), total value −2.8 %, k 3.9413 → **4.5431**; seed 99 27 207 → 23 097 (−15.1 %), −2.3 %, k 3.9107 → **4.5008**; guests who left WITH a penalty 31.9 % → 9.4 % / 33.1 % → 10.9 % of arrivals. `sim:career:gate`, `sim:onboarding`, `sim:rush` and the standard `npm run sim` stay red as on S2 (k above the 3.5 soft cap; DEFERRED to S5, nothing tuned). `simulateCareer` takes an optional `config` (default: the bundled seed) and its report gains `shiftStats`; `npm run sim:career -- --door` prints the S3 door table (`packages/engine/sim/door.ts`, `packages/engine/test/door-table.test.ts`). |
| 2026-10-20 | S4 `eco21-table-chair-upgrades`: career bot (policy v3, 30 days, same tree except S4; the S3 tip exported with `git archive` reproduces S3's recorded 23 425 / 23 097 served and k 4.5431 / 4.5008 exactly): seed 42 served 23 425 → 30 573 (+30.5 %), total value 8 779 810 → 13 975 705 (+59.2 %), k 4.5431 → **5.5409**; seed 99 23 097 → 30 873 (+33.7 %), 8 576 362 → 14 084 557 (+64.2 %), k 4.5008 → **5.5298**; guests who left with a penalty 9.4 % → 16.8 % / 10.9 % → 17.1 % of arrivals. The levels are k levers: a Lv2 table adds a round (more serve records per group), a Lv3 table a second snack and a Lv4 table the tip ×1.25 (together the average value of an order rose 560.4 → 679.4 on seed 42 and 556.0 → 677.0 on seed 99; a tip is paid through `credit()` like every other tip, so the faucet bookkeeping is unchanged). The raw career k includes exactly what D4(a) excludes from the gate k (second snack, extra round, table tip), so it is the stand-in until S5 normalises it; the k gate, `sim:career:gate`, `sim:onboarding`, `sim:rush` and `npm run sim` stay DEFERRED to S5 (nothing tuned); S3's door lines for days 8–14 and 15–21 now miss (DECISIONS `03 · k, the door bands and the 30-day income ...`). |
| 2026-10-20 | S5 `eco21-balance-pass` (JSON 2.1.0, careers policy v4, 30 days, seeds 42 / 99): standard-order k **3.3252 / 3.3478** (raw 4.4916 / 4.5079) and standard-order total value **7 525 092 / 7 706 186** (raw 15 927 712 / 16 264 980) pass the D4(a) gate (≤ 3.5, ≤ 9 185 000); standard sims on the furnished alley k 2.3415–2.4721 (cold) and 2.7399–2.9230 (full), onboarding on and off, 5 seeds. Before S5 (S4 tip, bot v3, raw): k 5.5409 / 5.5298. The k measurement method (mean(payment + tip) / 82.5) is unchanged. Gate table: 08-SPEC changelog 2026-10-20 / JSON 2.1.0. |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 1 (JSON 2.1.0, the PLAN'S bot: seats first, direct leasing, no dog, start 2026-09-09, 30 days, seeds 42 / 99; this row supersedes the one above, measured with bot v4): standard-order k **3.1558 / 3.1652** (raw 3.9357 / 3.9361) and standard-order total value **8 898 467 / 9 082 799** (raw 17 725 350 / 18 011 893) pass the D4(a) gate (≤ 3.5, ≤ 9 185 000), commandHash `b661ae9a…` / `1a3ba37c…`; standard sims on the furnished alley k 2.2878–2.4138 (cold) and 2.6905–2.8445 (full), onboarding on and off, 5 seeds. The k measurement method is unchanged. The 22-row gate table: `npm run sim:balance`, pinned by `balance-gates.test.ts`; 08-SPEC changelog 2026-10-21 / JSON 2.1.0. |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 2 (JSON 2.1.0, the plan's bot; this row supersedes the one above): the owner's cap (D24, `dailyEarnCapBase` 400 000), lease (3 days) and LP7 / league tier 7 (2 000 000) are back, so the numbers move: standard-order k **3.1731** / **3.1357** and total value **9 072 610** / **8 996 510** (both under 3.5 and 9 185 000), `sim:career:gate` PASS, commandHash `1e7e93f7…` / `158d0f97…`; standard sims unchanged (k 2.2878-2.4138 cold, 2.6905-2.8445 full). The gate table has 23 rows now (a plan-literal shift-1 row beside the strict one: `balance-gates.test.ts`, 32 tests); the strict and the plan-literal shift-1 rows are the two red ones (BLOCKERS `04 · P0`); 08-SPEC changelog 2026-10-21 (round 2). |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 3 (numbers unchanged: JSON 2.1.0 is still candidate L2; this row only adds to the one above): standard-order k **3.1731** / **3.1357**, total value **9 072 610** / **8 996 510** and the hashes `1e7e93f7…` / `158d0f97…` stay (`sim:career:gate` PASS); the shift-1 probe of the gate table counts 300 runs (was 60) and prints the 95 % Wilson interval, `balance-gates.test.ts` has 33 tests, `p0-share.ts` prints one statistic line per economy; 08-SPEC changelog 2026-10-21 (round 3). |
| 2026-10-21 | S5 `eco21-balance-pass`, owner decision round (JSON 2.1.0 = candidate L2 with table 2 at 428 base = 1 070 xu; this row supersedes the numbers of the rows above): standard-order k **3.1512** / **3.1527** and total value **9 040 022** / **9 049 861** (both under 3.5 and 9 185 000), `sim:career:gate` PASS, commandHash `4c11cae1…` / `fd3587d4…`; standard sims unchanged (k 2.2878-2.4138 cold, 2.6905-2.8445 full). The gate table is 23 rows: 22 gates (all PASS, the shift-1 gate row `shift1.plan` = at least 4 runs in 5 can buy table 2 when shift 1 closes, 83 % over 300 probes, 81 % over 600) and one information row (`shift1.wallet`, the strict reading, printed INFO); `balance-gates.test.ts` 33 tests (owner decision 1 semantics, nine mutations killed: `stage04/r4/mutate-gates-owner.out`); 08-SPEC changelog 2026-10-21 (owner decision round). |
