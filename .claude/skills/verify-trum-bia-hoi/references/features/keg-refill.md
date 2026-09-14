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

## Uncovered paths

- **`restock(dish:'bia')` failing on insufficient coins is never asserted** — `restockQuote`'s
  `w.coins >= cost` branch (`rules.ts:39`) has no dedicated test; only the missing-quantity-exceeded
  refusal is proven (`game.test.ts:112`, a same-file follow-up call, not a coins-short case).
- **No engine test drives a full batch cycle at an intermediate keg level (2, 3 or 4).** The direct
  batch-cycle tests use level 1 (`production.test.ts`'s first three cases, all on a fresh `game()`)
  or level 5 (`live-upgrades.test.ts`, `production.test.ts`'s forty-serving test); only
  `config-pinning.test.ts`'s timing assertion reads `equipment.keg - 1` generically without pinning
  which level the fixture save is actually at.
- **Every batch-cycle proof above runs under the modern/batch economy only** — no test in this file's
  citation set exercises `refillEnabled:false` (legacy direct-pour) through an actual restock/upgrade
  cycle; the mode split itself is documented (not tested) in glass-beer-flat.md's Gotchas.
- **No test restocks `'bia'` while a batch is already mid-flight and *not* paused** — the only
  restock-during-batch case (`production.test.ts`'s partial-stock test) pauses activity first
  (`{active:true, paused:true}`); an un-paused concurrent restock+batch interleaving is untested.
- **No test pairs fine vs. coarse time-stepping of a single running (unpaused) keg batch** — grep-
  confirmed the two candidate tests (the 150-tick loop, the paused-batch jump) use different scenarios,
  not a fine/coarse comparison of the same one (see Variants' time-jump entry for the correction).
  `kitchen.test.ts` has this exact comparison for kitchen jobs; no equivalent exists here.

## Variants

- **success** — every batch start/complete in `production.test.ts` above; `game.test.ts:106`'s
  `restock` full-mode fill.
- **reason** — `'maxLevel'` (`live-upgrades.test.ts`); the missing-exceeded restock refusal
  (`.ok===false`, `game.test.ts:112`) carries **no** `reason` string at all — `restockQuote` returns
  only `{quantity, cost, ok}`, never a `reason` field, unlike most other quote helpers.
- **empty** — starting stock below one full batch (`production.test.ts`'s partial-stock test: 2 units
  vs. its own fixture's level-1 `kegBatch`). **Corrected claim**: `production.test.ts`'s `game()`
  helper builds from `docs/config/legacy/economy-1.7.3.json` (`import legacy from
  '../../../docs/config/legacy/economy-1.7.3.json'`, `game.ts:7-11`), whose `kegBatch[0]` is `5`, not
  the current config's `2` (grep-verified against the raw legacy JSON) — the test's 2-unit starting
  stock is genuinely **stock-limited** (`2 < 5`), not a capacity-vs-stock coincidence. Don't reuse this
  file's current-config `kegBatch`/`kegStorage`/`refillMs` arrays (Observable contract above) to reason
  about `production.test.ts`'s own fixture numbers — they're two different config generations.
- **persistence** — every cited engine test round-trips `decodeSave(encodeSave(g))`;
  `config-pinning.test.ts`'s save/reopen case is the direct cross-config persistence proof for batch
  timing.
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
