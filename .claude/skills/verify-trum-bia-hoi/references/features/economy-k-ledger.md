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
  3.5`). `npm run sim:rush` does **not** check k — it checks spawn/serve timing under rush pressure
  only.

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
