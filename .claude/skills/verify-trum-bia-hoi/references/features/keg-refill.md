# Keg refill & batch capacity (`docs/config/economy.tbh.json` `upgrades.keg`, `_pipelineRule` §888)

**Scope boundary vs. [glass-beer-flat](glass-beer-flat.md):** that file owns per-glass
freshness/staleness once beer is poured; this file owns the tank itself — how `w.beer.batch` fills
over time, what `restock(dish:'bia')` and the keg `upgrade` actually do, and the legacy/modern split
at the capacity level. The two files necessarily cite some of the same tests from different angles;
each test below is cited for its *refill/capacity* claim, not restated for its freshness claim.

## Observable contract

- `World.beer?: {ready: number, batch: {quantity, startedAt, readyAt} | null}` (`types.ts`) — only
  present once used; absent/`undefined` under the legacy (non-batch) economy.
- `beerStatus(w, c)` (`packages/engine/src/production.ts:5-17`): `capacity`/`batchSize`/`durationMs`
  read `kegStorage`/`kegBatch`/`refillMs` when `keg.refillEnabled`, else fall back to
  `pourSlots`/`pourMs` (legacy direct-pour mode — see Gotchas).
- Config (`docs/config/economy.tbh.json:623-671`, `upgrades.keg`): `priceBase` `[0,5000,20000,
  80000,300000]`, `pourSlots` `[1,2,3,4,6]`, `pourMs` `[2000,1800,1600,1400,1200]`, `kegStorage`
  `[4,7,12,20,40]`, `kegBatch` `[2,3,5,8,14]`, `refillMs` `[12000,8000,6000,5000,4000]`,
  `refillEnabled: true`. `_rule` (`:669`, owner note) documents the exact algorithm in Vietnamese:
  shift-open tops up to `kegStorage` from real stock; a new batch starts as soon as there's room and
  stock, taking `min(kegBatch, room, stock)`, completing after `refillMs`; a later need waits for the
  next batch; `refillEnabled:false` pours directly from stock instead.
- Events: `beer_batch_started` (`engine.ts:658`, `{quantity, readyAt, stock}`), `beer_batch_ready`
  (`:373`, `{quantity, available}`), `beer_initial_fill` (`:818`, shift-open auto-fill, `{quantity,
  available, stock}` — only emitted when `quantity > 0`), `upgrade_bought` (`:919`, `{kind:'keg',
  level, cost}`), `restocked` (`:912`, `{dish:'bia', quantity, cost}`).
- `Result`: `restock`/`upgrade` both return `{ok, amount}` on success; `upgrade` fails with
  `reason: 'maxLevel'` at the top level, or whatever `upgradeQuote` reports otherwise.

- **Rules 28 (S2 `eco21-instant-pour`): no tap on the serving path of a seat-model game while `upgrades.keg.refillEnabled` is on.** `prepare()` turns a pending beer item into a `ready` one in the same tick when `w.beer.ready > 0` and a glass is clean (`beer_pouring` + `beer_poured{fromReserve:true}` + `order_ready` share the tick of `order_placed`); no beer item is ever `preparing`, so the `tap` preparation cause cannot occur. `beerStatus()` adds `instant` (`instantPour(config)` = `refillEnabled` and a seat-model snapshot; a seat-model snapshot only ever runs at rules ≥ 28 because `replay()` refuses older entries for one, while a capacity pin may run at rules 28) and `serveNow` = min(`available`, clean glasses), the n of "Rót sẵn n cốc". `pourSlots` / `pourMs` stay in `upgrades.keg` and keep driving capacity pins, rules ≤ 27 replays and a seat snapshot with `refillEnabled=false` (Tier B: no reserve, so the tap stays); a capacity pin keeps its tap through live rules-28 commands until the opening that adopts the seat model. UI copy: `production.tank`, `production.instantHint`, `goal.fx.keg` (seat model) against `production.taps`, `production.pouring`, `production.reserveHint`, `goal.fx.taps` (pins).

## How to reach it

- `{type:'restock', dish:'bia', mode:'bulk'|'full'|'one'}` (`engine.ts:908-912`, quoted by
  `restockQuote`, `rules.ts:33-39`) tops up **raw stock** `w.inventory.bia` — a different number from
  the tank (`w.beer.ready`/`w.beer.batch`). Restocking never touches the tank directly; it only
  widens what a future batch can pull from.
- `prepare()`'s batch-start block (`engine.ts:651-659`, condensed): when `phase==='open'` (or
  `'closing'` with a pending item) and no batch is already running, `quantity =
  min(batchSize, capacity - stored, inventory.bia)`; if `> 0`, starts `w.beer.batch = {quantity,
  startedAt, readyAt: now + durationMs}`, debits `inventory.bia`, emits `beer_batch_started`.
- `processDue()`'s completion check (`engine.ts:370-373`): once `now >= batch.readyAt`, moves
  `quantity` into `w.beer.ready`, sets `batch = null`, emits `beer_batch_ready`.
- Shift-open auto-fill (`engine.ts:812-818`, inside the `startShift` handler, **modern economy
  only**): a **separate, one-time, non-batch** top-up — `quantity = min(inventory.bia, kegStorage -
  ready - (batch?.quantity ?? 0))`, moved straight into `w.beer.ready`, emits `beer_initial_fill`
  only when `quantity > 0`. This bypasses the `refillMs` timer entirely; don't confuse it with a
  batch.
- `{type:'upgrade', kind:'keg'}` (`engine.ts:914-919`, via `upgradeQuote`, `rules.ts:41`) raises
  `w.equipment.keg`, which re-indexes every array above for **future** batches — see Gotchas for why
  an in-flight batch is unaffected.
- UI: tap the "Vòi rót" (keg) equipment sprite → detail sheet, capacity badge text `"Rót sẵn
  {ready}/{capacity} cốc"` + a progress bar while a batch runs; the stock/restock row's "Buy keg"
  control sends `restock`.

## Existing proof

- `apps/web/test/quick-beer-stock.spec.ts` — `A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) uses a real DOM purchase and replay inspection to assert full-quote quantity/cost, stock including in-flight batches, one restock event, unpaused timer/reload, 44px and warning-specific axe. Boundaries: `A2 empty raw beer stock remains a refill warning while a batch is still preparing`, `A2 low beer stock keeps the exact unaffordable quote disabled in ${locale}`, and `A2 full beer stock has no low-stock warning or zero-quantity quick purchase`. `A2 stock at the configured batch boundary has no warning despite a nonzero refill quote` pins `stock === batchSize < cap` separately from the full-stock boundary.
- `apps/web/remote-test/quick-beer-stock.spec.ts` — `A2 quick beer refill uses the real server while the shift remains live and reloads once` consumes stock through DOM serving against the isolated API, purchases through the HUD, and checks the authoritative charge/stock, no pause and reload. Run `TBH_PORT_BASE=4178 npx playwright test --config playwright.remote.config.ts apps/web/remote-test/quick-beer-stock.spec.ts`; 4179/4180 must be free because this fixture binds those test ports. Local proof uses `npx playwright test apps/web/test/quick-beer-stock.spec.ts`.


- `packages/engine/test/production.test.ts`: `'level one fills five servings before any customer and
  refills the vacancy as a glass leaves for service'` (shift-open batch fills to `kegStorage[0]=5`,
  a full batch completes mid-shift, pouring a glass immediately arms the next 1-unit batch),
  `'a table larger than the tank assembles across batches without overflowing storage or
  double-consuming stock'` (a 150-tick loop asserting `inventory.bia + beer.ready +
  (beer.batch?.quantity ?? 0) + onTrays + served + waste === initial` — the batch-conservation
  invariant), `'a partial raw stock starts immediately; restocking and a live upgrade cannot advance
  or resize the paused batch'` (starts a batch on 2 units of stock, pauses via
  `{type:'activity', active:true, paused:true}`, restocks, upgrades the keg mid-pause, resumes — the
  direct proof that a live keg upgrade changes only the *next* batch: the frozen batch resumes with
  its **original** `readyAt`/quantity, a fresh batch afterward uses the **new**
  `refillMs[1]`), `'an upgraded tank holds forty servings independently of the reusable glass pool,
  and reserve freshness waits for the tray'` (`kegStorage[4]=40` at max level).
- `packages/engine/test/game.test.ts:106` — `'restock uses full bulk packs plus retail remainder and
  never overfills'` — the `restock(dish:'bia')` proof: `mode:'full'` fills exactly to
  `missing`(`restockQuote(...,'bia','full')` deepEquals `{quantity:15, cost:160, ok:true}` on the
  fixture's numbers), a further `mode:'bulk'` restock is then refused (`.ok === false`, `quantity >
  missing`). Same file, `:143`, also rejects a malformed `dish:'__proto__'` restock (prototype-
  pollution-shaped input) closed, before any mutation.
- `packages/engine/test/economy2.test.ts` (lines ~15-20) — `'a new shift fills real reserve, pours
  through its one tap and starts refilling the vacancy immediately'` — shared with
  glass-beer-flat.md; cited here specifically for the initial-fill-then-refill-cadence claim
  (`beerStatus(...).stored === kegStorage[0]`, `beer.batch === null` right after the auto-fill, a
  fresh batch arms on the first pour).
- `packages/engine/test/live-upgrades.test.ts:38` — `'live upgrade refusals describe real funds or
  maximum level and cannot debit a customer shift'` — drives `{type:'upgrade', kind:'keg'}`
  repeatedly (`upgradeQuote(...).cost !== null`) to the max level, then asserts the next attempt
  returns `reason:'maxLevel'` with no further debit.
- `packages/engine/test/config-pinning.test.ts` (~lines 16-26) — `'a published candidate cannot
  reprice a running shift; the next opening preserves assets and adopts its duration, capacity and
  real pour/serve price'` — the **only** test asserting `beer_batch_started`/`beer_batch_ready` **by
  event name** (`world.events.find(e => e.type === 'beer_batch_started' ...)`), and the direct
  `refillMs`-survives-a-config-repin timing proof (`ready.at - pour.at ===
  values.upgrades.keg.refillMs[level]`).
- `apps/web/test/production.spec.ts`: `` `stocked beer capacity and upgrade comparison update live,
  with frozen batch progress in menus at ${width}px` `` (×360/390px — capacity-badge text `"Rót sẵn
  N/M cốc"`, keg-vs-upgrade comparison card, paused-batch progress freezing across the menu sheet,
  "Buy keg" restock button), `'reload immediately after a completed beer batch warns while its save
  is pending and preserves the batch'` (also cited by glass-beer-flat.md; here for the batch-
  completion-plus-reload claim specifically, not the freshness angle).

- `packages/engine/test/instant-pour.test.ts` (engine tier, the bundled seat-model seed, every state change a real command or advance): `one tap, one pair: both beers are ready the tick the order is placed (beer.ready >= n and clean glasses >= n)` (two beers on `pourSlots[0]` = 1: `order_ready`, `beer_pouring` and `beer_poured{fromReserve:true}` share the tick of `order_placed`, glasses `in_use` with `readyAt` = that tick, the two vacancies start a batch in it, serve pays a fresh order), `a solo guest on the first order is served the tick the guest sits down (onboarding order, one chair)`, `beer.ready exhausted: the order waits, a restock starts the batch, and the beer is ready the tick the batch lands`, `beer in the keg but no clean glass: the second beer waits for a glass, and a bought glass pours it that very tick`, `beerStatus says how many beers a guest can get right now: the smaller of ready beer and clean glasses (seat model); capacity pins keep their reserve count`, `pourMs and pourSlots are never read on the serving path of a seat-model game while the keg refill is on, and still drive a capacity pin` (a 90 s one-tap config and a 1 ms six-tap config give the same world, event for event; the same two configs on the frozen 2.0.4 capacity snapshot give different worlds), `a seat-model snapshot with the keg refill switched off keeps the tap: the gate needs refillEnabled as well as the seat shape` (Tier B `refillEnabled=false`: `beerStatus().instant` is false and `serveNow` = `stored`, no reserve exists, the first beer is `preparing` until `placedAt + pourMs`, its `beer_poured` has no `fromReserve`; red against three simplified gates), `rules 28 never puts a beer in a pour while the keg refill is on: no beer item is ever preparing and no tap cause is ever reported, with beer running short`. Old histories: `a recorded rules-27 shift on ${3|6} capacity tables replays byte for byte and shows the tap it was recorded with` (the `capacity-lv3x{3,6}-v27.json` world hash recorded by the pre-S2 engine; every beer of the history took exactly `pourMs`) and `a rules-27 save keeps the tap through its live rules-28 commands and pours instantly only at the opening that adopts the seat model`. Run `node --import tsx --test packages/engine/test/instant-pour.test.ts`.
- `packages/engine/test/economy2.test.ts` `'a new shift fills real reserve, pours through its one tap and starts refilling the vacancy immediately'` (cited above) now runs on the frozen capacity snapshot (`capacityGame`): the tap queue is what rules ≤ 27 and every capacity pin run on. Its assertions did not change.
- `apps/web/test/instant-pour.spec.ts` (local tier, saves made by `apps/web/test/fixtures/instant-pour.ts` through the real engine): `instant pour: the keg shows one set of numbers and "rót sẵn" counts the beers a guest can get right now (${locale}) at ${w}×${h}` (vi/en × 390 · 360 · 1280: four beers but three clean glasses read `Rót sẵn 3/4 cốc` on the HUD badge and in the pipeline line, the keg sheet shows the reserve + refill of the current and the next level and neither the tap line nor `Đang rót n/m vòi`, axe 0), `instant pour: a guest's beer is in the tray the moment the order is placed, and the badge drops by one (vi) at ${w}×${h}` (the first frame that shows the order shows `.table-order-hint.is-ready`, `data-preparation="ready"`, an enabled Serve) and `instant pour: a capacity pin keeps its tap numbers and waits for the pour (vi) at ${w}×${h}` (an old pin keeps the tap line, `Đang rót 0/1 vòi` and `data-preparation="preparing"` for `pourMs`). Run `npx playwright test apps/web/test/instant-pour.spec.ts`.
- `packages/engine/test/next-goal.test.ts` `the keg goal promises its reserve on the seat model (the taps are off the serving path from rules 28) and its taps on a capacity pin` (the chip's one-number effect `goal.fx.keg` = `kegStorage[next]` against `goal.fx.taps`).

## Verification procedure

- `node --import tsx --test packages/engine/test/production.test.ts packages/engine/test/game.test.ts
  packages/engine/test/economy2.test.ts packages/engine/test/live-upgrades.test.ts
  packages/engine/test/config-pinning.test.ts` (or `npm test` for the full suite — bare `tsx` is not
  guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/production.spec.ts` (or `npm run test:e2e`).
- `npm run check:config` before touching any `upgrades.keg.*` array — all five must stay
  level-aligned (index 0 = level 1) or `config.ts`'s `validate()` fails closed.
- `npm run sim:onboarding` / `sim:rush` incidentally cycle many keg batches during long randomized
  runs but assert nothing about batch/capacity by name — economy/k proof, not keg proof (same caveat
  [order-rounds-kitchen](order-rounds-kitchen.md) makes about its own pipeline).

- Instant pour (S2): `node --import tsx --test packages/engine/test/instant-pour.test.ts packages/engine/test/economy2.test.ts packages/engine/test/next-goal.test.ts` and `npx playwright test apps/web/test/instant-pour.spec.ts apps/web/test/economy2.spec.ts apps/web/test/ui-clarity.spec.ts` (local config, `--workers=3` on a laptop).

## Uncovered paths

- **The insufficient-coins command-result reason is not directly asserted.** A2's
  `A2 low beer stock keeps the exact unaffordable quote disabled in ${locale}` now proves
  `restockQuote.ok === false`, the exact price and disabled UI without a mutation. It does not
  send the forbidden command or assert `reason:'stockOrCoins'`.
- **Corrected claim**: level 2 IS exercised — `production.test.ts`'s partial-raw-stock test
  (`:49-64`) upgrades keg to level 2 mid-shift, then resumes a paused batch and drives it to
  completion, directly asserting `refillMs[1]`-timed completion and the resulting `beer.ready`
  count. **No engine test drives a full batch cycle at level 3 or 4 specifically** — the other direct
  batch-cycle tests use level 1 (`production.test.ts`'s first three cases, fresh `game()`) or level 5
  (`live-upgrades.test.ts`, `production.test.ts`'s forty-serving test); `config-pinning.test.ts`'s
  timing assertion reads `equipment.keg - 1` generically without pinning which level the fixture save
  is actually at.
- **Every batch-cycle proof above runs under the modern/batch economy only** — no test in this file's
  citation set exercises `refillEnabled:false` (legacy direct-pour) through an actual restock/upgrade
  cycle; the mode split itself is documented (not tested) in glass-beer-flat.md's Gotchas.
- **Covered by A2:** `A2 empty raw beer stock remains a refill warning while a batch is still
  preparing` buys through the DOM while unpaused and checks raw stock, the preserved active batch,
  exact charge and pause state. `production.test.ts` also covers paused restock during a batch.
- **No test pairs fine vs. coarse time-stepping of a single running (unpaused) keg batch** — grep-
  confirmed the two candidate tests (the 150-tick loop, the paused-batch jump) use different scenarios,
  not a fine/coarse comparison of the same one (see Variants' time-jump entry for the correction).
  `kitchen.test.ts` has this exact comparison for kitchen jobs; no equivalent exists here.

## Variants

- **success** — every batch start/complete in `production.test.ts` above; `game.test.ts:106`'s
  `restock` full-mode fill.
- **reason** — `'maxLevel'` (`live-upgrades.test.ts`). **Corrected claim**: `restockQuote()` itself
  (the pure quote helper, `rules.ts`) returns only `{quantity, cost, ok}`, never a `reason` field,
  unlike most other quote helpers — but the `restock` **command result** does carry one: `case
  'restock':` (`engine.ts:910`) derives `fail(dishUnlocked(...) ? 'stockOrCoins' : 'dishLocked')` when
  `!q.ok`. `game.test.ts:112`'s missing-exceeded refusal only asserts `.ok === false`, not `.reason` —
  the test not checking it is not the same as the result not having one; don't conflate the quote
  helper's return shape with the command's actual result shape.
- **empty** — starting stock below one full batch (`production.test.ts`'s partial-stock test: 2 units
  vs. its own fixture's level-1 `kegBatch`). **Corrected claim**: `production.test.ts`'s `game()`
  helper builds from `docs/config/legacy/economy-1.7.3.json` (`import legacy from
  '../../../docs/config/legacy/economy-1.7.3.json'`, `game.ts:7-11`), whose `kegBatch[0]` is `5`, not
  the current config's `2` (grep-verified against the raw legacy JSON) — the test's 2-unit starting
  stock is genuinely **stock-limited** (`2 < 5`), not a capacity-vs-stock coincidence. Don't reuse this
  file's current-config `kegBatch`/`kegStorage`/`refillMs` arrays (Observable contract above) to reason
  about `production.test.ts`'s own fixture numbers — they're two different config generations.
- **persistence** — **re-corrected claim**: `economy2.test.ts` wraps `decodeSave(encodeSave(g))` in a
  file-level `replay()` helper (`economy2.test.ts:12`) — a literal grep for `decodeSave`/`encodeSave`
  text misses calls to it, which is why the earlier pass wrongly excluded it. 7 of the 8 cited engine
  tests round-trip: all 4 `production.test.ts` citations, `live-upgrades.test.ts`,
  `config-pinning.test.ts` (the direct cross-config persistence proof for batch timing), and
  `economy2.test.ts`'s new-shift-fill test (`'a new shift fills real reserve...'` calls `replay(g)`).
  `game.test.ts`'s full-mode test itself does not round-trip. A2's
  `A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${viewport.width}px`
  now checks restock-command/event persistence through decoded saves and a browser reload;
  the real-server A2 scenario also checks the authoritative charge after reload.
- **capacity** — the `kegStorage`/`kegBatch` per-level arrays; the multi-batch assembly test's running
  conservation invariant; the forty-serving max-level test.
- **duplicate/idempotent** — not exercised specifically for `restock`/`upgrade(kind:'keg')` in this
  file's citation set; `'level one fills...'`'s repeated-`serve`-idempotency-key check is incidental,
  not a keg-command idempotency proof.
- **stale** — not this file's concern; see [glass-beer-flat](glass-beer-flat.md).
- **time-jump** — **corrected claim**: these two tests are not a fine-vs-coarse pair of the *same*
  scenario — they use different initial config, commands and durations, so they can't be read as
  proving stepping-granularity equivalence. Cite each for its own actual property instead:
  `production.test.ts`'s 150-tick loop (fine, 1000ms steps) holds the
  `inventory+ready+batch+onTray+served+waste` conservation invariant across every step of a real
  multi-batch assembly; the paused-batch test's single coarse `g.advance(w.now + 40000)` jump proves a
  *paused* batch's `remainingMs`/`progress` stay frozen across a large jump. No test in this file's
  citation set directly pairs fine-vs-coarse stepping of an *unpaused*, running keg batch the way
  `kitchen.test.ts`'s deadline test does for kitchen jobs (see Uncovered paths).
- **offline/reconnect** — the paused-batch test's `{active:true, paused:true}` → resume cycle is the
  closest analog here (menu-pause, not true offline/disconnect) — see `restock-inventory-menu` for
  the pause mechanic itself.

## Gotchas

- **Two different "fills" exist — don't conflate them.** The shift-open auto-fill
  (`engine.ts:812-818`) moves stock straight into `w.beer.ready` once, bypassing `w.beer.batch`
  entirely, and only emits `beer_initial_fill` when it actually moves something. The recurring batch
  cycle (`prepare()` start + `processDue()` completion) is a distinct code path with its own two
  events.
- **A live keg upgrade never resizes or reschedules an in-flight batch** — only the *next* batch reads
  the new `kegBatch`/`refillMs`/`kegStorage` values. `production.test.ts`'s paused-batch test is the
  direct proof: the frozen batch resumes with its original quantity/deadline; a batch started after
  the upgrade uses the new numbers.
- `restock(dish:'bia')` and the keg tank are two different stores — restocking only ever feeds what
  `prepare()` can later pull into a batch; it can never bypass the batch timer.
- `beerStatus().capacity`/`batchSize`/`durationMs` silently swap their source arrays when
  `refillEnabled` is false (read `pourSlots`/`pourMs` instead of `kegStorage`/`kegBatch`/`refillMs`)
  — see [glass-beer-flat](glass-beer-flat.md)'s Gotchas for the full legacy/modern split; this file's
  own proof set is modern-mode only (see Uncovered paths).

## Related

[glass-beer-flat](glass-beer-flat.md) (freshness/staleness of what's already poured — the boundary
this file exists to not duplicate), [order-rounds-kitchen](order-rounds-kitchen.md) (shares the same
`_pipelineRule` autonomous-batch design with kitchen pans and the washer, and `washerStatus`'s
independent-implementation risk is the same shape of finding as this file's upgrade-vs-batch
timing), [economy-k-ledger](economy-k-ledger.md) (`restock`/`upgrade` spending is debited via
`spend()`, outside `credit()`'s faucet scope), `restock-inventory-menu` (owns non-`'bia'` restock and
the `activity`/`paused` menu-pause mechanic exercised by this file's paused-batch test).


## Changelog

| Date | Change |
|---|---|

| 2026-09-16 A2 | Cite direct HUD full-beer purchase in local and real-server UI; raw empty is distinct from ready/batch reserve. Balance targets remain OPEN in docs/improve-a2-stock.md. |
| 2026-09-16 A2 review | Add partial-stock batch-boundary regression and reconcile covered quote, unpaused batch-restock and persistence paths; command-result reason remains unverified. |
| 2026-10-20 S2 | `eco21-instant-pour` (rules 28): a ready beer and a clean glass are a ready beer this tick, the tap queue is off the serving path of a seat-model game (`pourMs`/`pourSlots` kept for pins and rules ≤ 27 replays); `beerStatus` gains `instant` / `serveNow`; the keg shows one set of numbers. Engine and UI tests cited above; the economy2 tap test now runs on the capacity pin. No number changed. |
| 2026-10-20 S5 | `eco21-balance-pass` (JSON 2.1.0): the keg's Lv2–5 `priceBase` are re-set by what a level buys now — the reserve of poured glasses and the refill batch (`kegStorage` 4/7/12/20/40, `kegBatch` 2/3/5/8/14, `refillMs`), not the pour speed that left the serving path in rules 28 — to 1 750 · 6 750 · 13 500 · 51 000 base (4 375 · 16 875 · 33 750 · 127 500 on screen); `upgrades.keg._rule` says so. A2 keg stock (the sim decides, gate "beer ran out" < 10 % of leavers): see the audit row of the S5 changelog in 08-SPEC and DECISIONS `## 04 · A2 keg stock and rush warning`; the sealed set loses 0.0 % of its guests to an empty keg on both seeds. `packages/engine/test/game.test.ts` pins the Lv2 price (`4375`). |
| 2026-10-21 S5 | `eco21-balance-pass`, review round 1 (JSON 2.1.0, numbers re-sealed for the plan's bot): the keg's Lv2–5 `priceBase` are 2 000 · 7 750 · 38 750 · 146 750 base (5 000 · 19 375 · 96 875 · 366 875 on screen); the kinds of purchase (reserve of poured glasses and refill batch) and `upgrades.keg._rule` are unchanged; the sealed set loses 1.9 % / 2.3 % of its leavers to an empty keg (gate < 10 %). `packages/engine/test/game.test.ts` pins the Lv2 price (`5000`). |
