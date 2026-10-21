# Equipment & table upgrades (`docs/features/F10-upgrades.md`; `docs/config/economy.tbh.json` `upgrades.*`)

**Scope boundary:** this file owns the *uniform purchase mechanism* — one `upgrade` command shared by
all five equipment kinds, its cost curve, its live-mid-shift application — plus `upgradeTable`/
`buyTable`'s own pricing. It does **not** own what an upgrade level *does* at runtime: keg batch/
refill behaviour is [keg-refill](keg-refill.md), washer/kitchen pan capacity is
[order-rounds-kitchen](order-rounds-kitchen.md) (including its washerStatus/`wash()` duplicate-logic
finding — cross-linked, not restated), cooler's freshness formula is
[glass-beer-flat](glass-beer-flat.md), and the table state machine + `tableBusy` gate is
[table-lifecycle](table-lifecycle.md) (`engine.ts:1005-1053`/`:1008`, cited there in full).

## Observable contract

- `Equipment` (`packages/engine/src/config.ts:7`): `'keg' | 'washer' | 'cooler' | 'stall' |
  'kitchen'` — five kinds, all purchased through the **same** `{type:'upgrade', kind}` command.
  Tables are a **separate axis**, not a member of `Equipment` — they go through
  `upgradeTable`/`buyTable` instead, with their own cost shape (see below).
- `World.equipment: Record<Equipment, number>` — current level per kind, read live by every
  domain module (`w.equipment.kitchen`, `w.equipment.cooler`, …).
- `upgradeQuote(w, c, kind, outsideShiftOnly, lifePathGate)` (`rules.ts:41-49`): `prices =
  c.values.upgrades[kind].priceBase`; `index = kind==='kitchen' ? next : next-1` — kitchen's price
  array has a `null` at index 0 (locked until bought), every other kind starts at index 0 = level 1
  (confirmed by `docs/features/F10-upgrades.md` §"Rules21": *"kitchen arrays include level0, other
  devices start at level1"*). `reason` ∈ `'maxLevel'` (price is `null`) → `'lifePathRequired'`
  (`c.values.upgrades.lifePathGate[kind][index]`) → `'notEnoughCoins'` → `'outsideShiftOnly'` (legacy
  only, see Gotchas) → `null`.
- Table upgrade levels (`docs/config/economy.tbh.json` `upgrades.table.levels`, 4 entries): `{level,
  capacity, priceBase}` plus level 4 alone carries `repBase:[3000,40000]` and
  `requiredBadge:'ket_noi'`. `buyTable` prices differently: `extraSeatPriceBase` is a **flat map keyed
  by total-seats-after-purchase** (`'4':200 … '48':351500`), summed once per new seat the bought
  table adds — a genuinely different cost shape from `upgradeTable`'s flat per-level `priceBase`.
  `maxTables: 6`, `startingTables: 3`.
- Events: `upgrade_bought` (`engine.ts:919`, `{kind, level, cost}`), `table_upgraded` (`:1015`,
  `{tableId, level}`), `table_bought` (`:1052`, `{cost}`).
- `Result` reasons beyond `upgradeQuote`'s own: `upgrade` → `'upgradeUnavailable'` (legacy path only,
  quote returned `cost:null` under old rules); `upgradeTable` → `'tableBusy'` (non-`'empty'` table,
  owned by table-lifecycle.md), `'maxLevel'`, `'badgeRequired'`, `'reputationRequired'`,
  `'notEnoughCoins'`; `buyTable` → `'maxTables'`, `'seatPriceUnconfigured'` (a seat count with no
  configured price — fail-closed, not a silent `0`), `'notEnoughCoins'`.
- DOM/aria (`apps/web/src/App.tsx`): every equipment/table card shares one class, `.upgrade-card`
  (`:356` for equipment, `:454` for tables) — heading text `t('equipment.${kind}')` for equipment,
  `t('table', {n})` for tables. Equipment card button dispatches `{type:'upgrade', kind}`, disabled
  when `!q.ok`, label `t('upgrade.tableMax')` ("Bàn đã tối đa"; the chair button's is `upgrade.chairMax`) or `t('upgrade.buy',{cost})`; a `role="status"` line under it
  surfaces `q.reason` (`upgrade.lifePath` text for `'lifePathRequired'`, else `error.${reason}`).
  Table card button dispatches `{type:'upgradeTable', tableId}`; a trailing `"Thêm bàn"`-style button
  (`t('upgrade.addTable')`) dispatches `{type:'buyTable'}`. `UpgradeHint` (`App.tsx:16,287`, mounted
  inside `sheet==='upgrades'` at `:454`) is the inline nudge — a separate component from the purchase
  cards themselves.

- **Rules 28 seat model (S1 `eco21-seat-model`, JSON 2.0.21; S1's earlier tip was labelled 2.0.20) — supersedes the capacity bullets above for seat-model snapshots:** `buyTableQuote(w, c, outsideShiftOnly?)` (`rules.ts`) prices the n-th table at `upgrades.table.tablePriceBase[n-2]` with no life-path gate, capped by `tableSlots(w, c)` = the current location's `locations.list[].tableSlots` (every alley 4 this wave; every alley 8 since S5, JSON 2.1.0); new `{type:'buyChair', tableId}` via `buyChairQuote(w, c, table)`: refuses `'chairsLocked'` below `upgrades.table.chairsAfterTables` tables, `'maxChairs'` at two chairs, else prices `chairPriceBase[second chairs owned shop-wide]`; `tableUpgradeQuote(w, c, table, outsideShiftOnly?)` puts `'tableNeedsChairs'` in `gate` (D18) and never requires an empty table; a level no longer changes chairs. Events `chair_bought{tableId, seats, cost}`, `table_bought{cost, tableId}`; missing table `'tableGone'`. DOM: each table card has "Thêm ghế · giá" while it has one chair plus one `role="status"` reason, the level button reads `tableUpgradeQuote`, "Mua bàn · giá" is dimmed with its reason. Capacity snapshots (old saves before D2) keep the `extraSeatPriceBase` path inside the same quotes.

## How to reach it

- `{type:'upgrade', kind: Equipment}` (`engine.ts:914-919`) is the **one** command for all five
  equipment kinds. `LIVE_UPGRADE_RULES = 17` (`engine.ts:28`, `// config-exempt: fixed replay protocol
  revision for owner live-upgrade policy`) is the gate: on `rulesVersion >= 17` — today's default,
  since the live seed config pins `upgrades.phase1UpgradesOutsideShiftOnly: false` — an upgrade
  applies **immediately, mid-shift**, no phase restriction beyond `upgradeQuote`'s own funds/level/
  life-path checks. Below rules17 (legacy replay only) the command additionally required
  `w.phase === 'resting'`, failing `'outsideShiftOnly'` otherwise.
- `{type:'upgradeTable', tableId}` (`:1005-1016`) — reads the table's *current* `level` to look up the
  *next* entry in `c.upgrades.table.levels`; gates in order: `tableBusy` (state check, delegated to
  table-lifecycle.md) → `maxLevel` (no next entry) → `badgeRequired` → `reputationRequired` →
  `notEnoughCoins`. On success: `t.level`/`t.capacity` update and `table_upgraded` fires — the table's
  `state`/`group`/`order` are untouched (an *empty* table stays empty, just bigger).
- `{type:'buyTable'}` (`:1043-1053`) — refuses at `maxTables`; otherwise sums `seats+1..seats+capacity`
  through `extraSeatPriceBase`, refusing closed (`'seatPriceUnconfigured'`) if any seat number has no
  configured price, then pushes a fresh table at `c.runtime.initialTableLevel`'s capacity.
- UI: `Nâng cấp` nav → `upgrades` sheet → `UpgradeHint` (if a bottleneck is observed) → equipment grid
  (`EQUIPMENT.map(upgradeCard)`) and, further down, one card per existing table plus an "add table"
  button. Same sheet, both axes — a player upgrading a table and a player upgrading the keg use
  visually identical cards with different command payloads.
- Remote mode: identical command shapes through `POST /player/command`; no upgrade-specific server
  logic (`apps/server/src/http.ts` has no `/upgrade*` route — it all rides the generic command route).

## Existing proof

- `apps/web/test/feedback.spec.ts` — `A4 ${locale} ${mode} advice uses observed losses and survives reload` (loss/loss-vs-stale/legacy/legacy-tie/legacy-known/queue/maxed/ready in VI/EN): stock losses route to restock; queue evidence routes to tables; unknown history suppresses a specific equipment diagnosis only when largest or tied for largest. Run `npx playwright test apps/web/test/feedback.spec.ts`.

- `apps/web/test/ui-clarity.spec.ts` — `A5 legacy pinned save shows direct pour without a refill or reserve in ${locale}` (VI/EN) loads the historical v12 archive and pins the direct-pour/no-reserve copy.

- `apps/web/test/ui-clarity.spec.ts` — `A5 zero configured recovery rate shows paused recovery without an invalid ETA` pins the config-allowed zero-rate display without changing engine rules.

- `apps/web/test/ui-clarity.spec.ts` — `A5 clear production stages, customer rounds and first-open art in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) checks the keg's reserve and refill labels (a seat-model game has no tap line since S2 `eco21-instant-pour`; the tap/refill pair of a capacity pin is pinned by `apps/web/test/instant-pour.spec.ts`), customer-round explanation, and manifest-backed tofu/phone/wood-sign preload plus decoded images on the first stock/upgrade visit. `A5 recovery ETA follows active rest, survives reload and disappears when stamina is full` reaches exhausted natural closure through engine commands, checks the configured active-rest countdown and reload/full recovery. Run with `npx playwright test apps/web/test/ui-clarity.spec.ts` (local config).

- `packages/engine/test/live-upgrades.test.ts` (both tests are entirely yours):
  `'a real saved v16 paused shift keeps its old refusals but upgrades every device and an empty table
  without closing'` (`:8-36`) — replays a real v16 save carrying four historical
  `outsideShiftOnly` refusals (asserted to replay identically, i.e. legacy behaviour is preserved for
  *already-logged* commands), then drives **live**, in-shift: every one of the five `Equipment` kinds
  via `{type:'upgrade', kind}` (`ok:true`), `{type:'upgradeTable', tableId: empty.id}` (`:24`, asserts
  `empty.level` incremented), `{type:'buyTable'}` (`:25`, asserts `w.tables.length` incremented), and
  a **second** `upgradeTable` against a non-empty table (`:26`, asserts `reason === 'tableBusy'`) — all
  without ever closing the shift. `'live upgrade refusals describe real funds or maximum level and
  cannot debit a customer shift'` (`:38+`) — **corrected claim**: this test drives only `'keg'` to
  `'maxLevel'` (a `while` loop upgrading keg until `upgradeQuote(...).cost === null`), not every kind;
  the `'notEnoughCoins'` refusal is checked only for `'kitchen'`. Washer/cooler/stall's own max-level
  and insufficient-funds refusals are not separately asserted by this test (they share the exact same
  `upgradeQuote`/`case 'upgrade':` code path per the "one command, five kinds" Gotcha above, so the
  risk is structural, not per-kind, but no test names washer/cooler/stall specifically for either
  refusal).
- `apps/web/test/live-upgrades.spec.ts` — 1 templated test, 2 runtime executions: `` `kitchen can be
  bought in the current shift while its menu stays paused, sufficient funds=${!poor}` `` — the
  **kitchen** card's own UI purchase proof (menu stays paused across the purchase either way; the
  `poor` variant asserts the disabled/insufficient-funds state specifically).
- `apps/web/test/production.spec.ts:106` — `'washer, cooler and counter upgrade cards show their own
  per-level draft sprites'` — drives a **real purchase click** (not just a display check) for
  **washer, cooler and stall** (`'Quầy hàng'` = counter/stall) in one loop, asserting the card's
  sprite swaps from the lv2 to the lv3 draft art on success. Between this test and the two above,
  **all five equipment kinds have a dedicated UI purchase test**, just split across three spec files
  by kind — don't assume one file covers the whole grid.
- `apps/web/test/upgrade-hint.spec.ts` — `` `M1-UPGRADE ${locale} uses this shift's observed ${mode}
  bottleneck` `` (templated × locale × mode) and `'M1-UPGRADE never recommends maxed equipment or
  invents legacy shift history'` — the `UpgradeHint` component's own proof; a distinct concern from
  the purchase cards themselves (it only *recommends*, never purchases).
- `packages/engine/test/career.test.ts:13` — incidentally asserts an `upgradeTable` command appears in
  `game.log` during a multi-day replay; not a dedicated upgrade-mechanism test, just confirms the
  command participates in the wider career loop.
- `kind:'stall'` is exercised as **incidental setup scaffolding** (raising the inventory cap so an
  unrelated test can proceed) in `dog-purchase.test.ts:11`, `progression.test.ts:11`,
  `menu.test.ts:106`, `signboard.test.ts:11`, and `shipper.test.ts:12` — none of these assert anything
  about the *upgrade mechanism itself* for `'stall'`; see Uncovered paths.
- `apps/web/test/economy2.spec.ts` (4 top-level tests) — this file's UI-tier proof for the **keg**/
  **glass**/**cooler** equipment cards specifically, distinct from `production.spec.ts`'s washer/
  cooler/stall sprite-swap proof above: `` `new economy capacities, LP gate and glass purchases stay
  paused at ${width}px` `` (×360/390px — the keg ("Vòi rót") info dialog's capacity text and its
  disabled/`'Cần đạt'`-gated state before purchase, then the washer ("Bồn rửa") glass-purchase card:
  buys 1 glass, asserts the exact coin debit, glass count and that the shift stays paused throughout),
  `` `cooler explains each level and weather-adjusted HUD seconds in ${lang}/${weather}` `` (×2
  langs ×3 weathers — the cooler card's per-level freshness-seconds text, weather-adjusted, plus a
  real purchase click through the non-max levels), `` `upgrade and stock labels distinguish
  ingredients from cooked dishes in ${lang}` `` (×2 langs — i18n labels on the kitchen/upgrade cards
  *and* the stock screen in the same test). The fourth test, `'the local start action adopts the new
  bundle from an old resting save, without repricing it on reload'`, is **not** an upgrade-purchase
  test — it's a config-bundle-adoption-on-start regression that happens to share this spec file; see
  [economy-k-ledger](economy-k-ledger.md)'s `config-pinning.spec.ts` citation for the closest sibling
  proof of that mechanic.

- `packages/engine/test/seat-model.test.ts` — `a new game opens one table with one chair; the home alley caps tables at its tableSlots with no life-path gate`, `a second chair opens only after chairsAfterTables tables, a table never holds a third, and price indexes chairs across the shop` (also `tableNeedsChairs` and level without chairs), `seat-model snapshots fail closed on unreachable chairs, short price ladders, unseatable onboarding or bad probabilities`. Run `node --import tsx --test packages/engine/test/seat-model.test.ts`.
- `apps/web/test/seat-model.spec.ts` — `seat model sells tables 2-8, a second chair once four tables stand, each with its price and one reason (${locale}) at ${viewport.width}×${viewport.height}` (vi/en × 390×844 / 360×740 / 1280×720): DOM-only purchases; every dimmed button keeps its price and shows one `reason.*` line (the `whyNot()` text of the engine quote, not the `error.*` copy with a full stop): `reason.chairsLocked` "Mở sau khi đủ 4 bàn" (S6: `{n}` = `chairsAfterTables`; it said "Mua đủ bàn trước" until S6, false on the eight-place alley) · `reason.tableNeedsChairs` "Bàn cần 2 ghế" · `reason.maxTables` "Quán đã đủ bàn" · `reason.notEnoughCoins` "Chưa đủ xu" (en "Opens at 4 tables" · "Table needs two chairs" · "All tables are built" · "Not enough coins"; the spec reads both languages from `apps/web/src/i18n/{vi,en}.json`). The fifth seat reason, `reason.maxChairs` "Bàn đã đủ ghế", never reaches a card (a two-chair table shows no chair button): the engine quote pins it (`packages/engine/test/goal-quotes.test.ts` `buyChairQuote matches buyChair: locked until the shop owns chairsAfterTables tables, then the wallet, then a pair is the most`), 0 axe violations on the open sheet before and after the purchases (the accessibility tier's `wcag2a/2aa/21aa/22aa` tags), state read back through the engine (`fixtures/seat-model.ts inspect`). Run `npx playwright test apps/web/test/seat-model.spec.ts`.
- `packages/engine/test/config-pinning.test.ts` — `a seat-model repin keeps every bought table and chair; only the next purchase reads the new prices`.

## Verification procedure

- `node --import tsx --test packages/engine/test/live-upgrades.test.ts` (or `npm test` for the full
  suite — bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/live-upgrades.spec.ts apps/web/test/production.spec.ts
  apps/web/test/upgrade-hint.spec.ts apps/web/test/economy2.spec.ts` (or `npm run test:e2e`).
- `npm run check:config` before touching any `upgrades.<kind>.priceBase`/`upgrades.lifePathGate`/
  `upgrades.table.levels`/`extraSeatPriceBase` array — all must stay level/seat-index-aligned or
  `config.ts`'s `validate()` fails closed (same warning [keg-refill](keg-refill.md) makes for its own
  arrays).

## Uncovered paths

- **`kind:'stall'` has no dedicated upgrade-mechanism assertion anywhere** — grep-confirmed: every
  reference to `{type:'upgrade', kind:'stall'}` outside `live-upgrades.test.ts` (which tests all five
  kinds generically, not stall specifically) is incidental setup in an unrelated feature's test. No
  test asserts stall's own `priceBase`/inventory-cap effect end to end.
- **`buyTable`'s `extraSeatPriceBase` summation is never asserted against its actual computed cost** —
  `live-upgrades.test.ts:25` only checks `.ok` and the new table count, not the exact `cost`/`amount`
  charged. No test drives `buyTable` from a seat count high enough to approach the top of the
  48-entry map, or exercises `'seatPriceUnconfigured'` by string.
- **`upgradeTable`'s `'badgeRequired'`/`'reputationRequired'` reasons (level-4 gate) are never asserted
  by exact string** — `live-upgrades.test.ts`'s only `upgradeTable` refusal case is `'tableBusy'`;
  no test drives a level-3→4 table upgrade attempt without the badge or reputation.
- **F10 §7's analytics events (`upgrade_viewed`, `upgrade_blocked`, `bottleneck_detected`) are
  grep-confirmed absent from `packages/engine/src`, `apps/web/src` and `apps/server/src`** — zero
  occurrences anywhere. Treat them as aspirational/unimplemented, not a citation gap in this file.
- **The legacy (`rulesVersion < 17`) `outsideShiftOnly` refusal path is only proven via replay of a
  historical save**, never via a *live* command sent under an old `rulesVersion` — the guarantee that
  a brand-new game could still hit this path (if `phase1UpgradesOutsideShiftOnly` were ever flipped
  back to `true`) is untested.

## Variants

- **success** — every kind purchased live mid-shift (`live-upgrades.test.ts:8-36`); kitchen/washer/
  cooler/stall purchased via UI (`live-upgrades.spec.ts`, `production.spec.ts`).
- **reason** — `'maxLevel'`, `'notEnoughCoins'` (engine, proved); `'tableBusy'` (proved, cross-link
  table-lifecycle.md); `'lifePathRequired'`, `'badgeRequired'`, `'reputationRequired'`,
  `'seatPriceUnconfigured'` all defined but not string-asserted (see Uncovered paths).
- **empty** — an unowned/level-0 kitchen renders `equipment.unowned`/`kitchen.locked` in place of a
  sprite (`App.tsx:356`); not a dedicated engine test, UI-only per the JSX ternary.
- **persistence** — `live-upgrades.test.ts` replays a real v16 save first; every cited engine test
  round-trips via the shared `send()`/`decodeSave` harness convention used throughout this suite.
- **capacity** — `maxTables:6` (untested refusal, see Uncovered paths would need a 7th `buyTable`);
  table capacity per level (`2/4/6/8` seats, implicitly proven by the level-up assertion).
- **duplicate/idempotent** — **corrected claim**: `live-upgrades.test.ts:18` (inside the
  all-five-kinds loop) resends the identical `envelope` (same `idempotencyKey`) for `upgrade`
  immediately after the first successful send, and asserts both the result stays `ok:true` and the
  whole world (`deepEqual(w, after)`) is byte-unchanged by the retry — a direct idempotent-retry
  proof, missed in an earlier pass. Not separately exercised for `upgradeTable`/`buyTable` in this
  file's citation set.
- **stale** — not applicable to this feature.
- **time-jump** — not applicable; upgrades are instantaneous commands, not clocked processes (contrast
  [keg-refill](keg-refill.md), where the upgraded kind's *effect* is clocked).
- **offline/reconnect** — not exercised here; see [keg-refill](keg-refill.md)'s paused-batch test for
  the adjacent "upgrade during a frozen process" case, which belongs to that file's pipeline, not this
  one's purchase mechanism.

## Gotchas

- **One command, five kinds** — don't write a per-kind engine test file; `live-upgrades.test.ts`
  deliberately drives all five through the same loop because they share one code path
  (`upgradeQuote` + `case 'upgrade':`). A kind-specific *effect* test belongs in that kind's own
  feature file (keg-refill, order-rounds-kitchen, glass-beer-flat), not here.
- **`upgradeTable` and `buyTable` price completely differently** — flat per-level `priceBase` vs. a
  summed per-seat marginal-cost map. Don't assume one pricing model applies to both when reasoning
  about a table-economy change.
- **Kitchen's price array is offset by one relative to every other kind** (`index = next` vs.
  `next - 1`) because `kitchen` alone has a real "level 0 = locked" price slot. Copy-pasting another
  kind's index math for kitchen is a one-off bug waiting to happen.
- **`phase1UpgradesOutsideShiftOnly` is `false` in the live seed config** — the "must close the shift
  to upgrade" restriction is legacy-replay-only today, not a currently reachable player restriction.
  Don't describe live mid-shift upgrades as an edge case; it's the default.
- Equipment upgrade UI proof is **split across three spec files by kind** (kitchen →
  `live-upgrades.spec.ts`; washer/cooler/stall → `production.spec.ts`; keg → the citation already
  claimed by [keg-refill](keg-refill.md)/[glass-beer-flat](glass-beer-flat.md)) — check all three
  before concluding a kind has no UI coverage.

## Related

[keg-refill](keg-refill.md) (keg's own upgrade *effect* on batch/refill math — this file only covers
the purchase itself), [order-rounds-kitchen](order-rounds-kitchen.md) (kitchen/washer capacity effects
+ the washerStatus duplicate-logic finding), [glass-beer-flat](glass-beer-flat.md) (cooler's
freshness-formula effect), [table-lifecycle](table-lifecycle.md) (the table state machine and the
`tableBusy` gate `upgradeTable` delegates to), [economy-k-ledger](economy-k-ledger.md) (`upgrade`/
`upgradeTable`/`buyTable` all spend via `spend()`, outside `credit()`'s faucet scope, same as
`restock`).

## fun-next-goal — 2026-10-15

- **Goal registry** `apps/web/src/goals.ts`: every purchasable item of the Upgrades sheet as data (`Goal`: lane · card · name · one-number
  effect · cost · `eligible` · `busy`), built from the engine's own quotes — `upgradeQuote` (devices), `unlockQuote` (phone/QR),
  `signboardQuote`, `flyerQuote` (paid in reputation, never the coin chip) and the two quotes added to `rules.ts`:
  `tableUpgradeQuote(w, c, table)` and `buyTableQuote(w, c)`, which answer exactly what `upgradeTable` / `buyTable` will (same price, same
  first refusal, in the command's order). Wave 2 adds chairs/dishes as one more provider; neither the chip nor its rule changes.
- **Chip** `GoalChip.tsx` under the wallet, from shift 1 on a new save: `pickNextGoal()` = cheapest eligible coin-priced item of the first
  lane with one (Sức chứa → Tốc độ → Khách), among items ≤ `nextGoal.reachMult` (Tier C, 3) × the average takings of a closed shift
  (`shiftAverage()`: `lifetimeEarned` outside the open shift ÷ `completedShifts`; a new save is not filtered; nothing in reach → the
  cheapest eligible item stands in). Gates (life path, badge, reputation, stall level, owned/max) make an item ineligible; a busy table
  only loses ties to an empty one. A tap opens the sheet at that item (`data-goal` / `data-targeted`); in the one-card mode the card IS the
  chip's goal. Settings → "Gợi ý mục tiêu" switches the chip off (`Settings.goalChip`, saved).
- **Three lanes** (after `featureReveal.upgradeAllAfterShifts`): `section.goal-lane` Sức chứa (tables, buy table) · Tốc độ (devices, kitchen
  entry) · Khách (sign, flyer, phone, QR); the `#upgrade-tables` anchor of the upgrade hint lives in the first lane.
- Proof: `packages/engine/test/goal-quotes.test.ts` (quote parity with the real commands), `packages/engine/test/next-goal.test.ts`
  (pick rules on real worlds: lane order, price, reach, gates, busy tables, old pins without `nextGoal`, shorter tier lists),
  `apps/web/test/next-goal.spec.ts` (3 viewports: chip from shift 1, tap → sheet at the item, chip moves on after each purchase and says what is
  missing, three lanes in order, LP-gated keg skipped, Settings switch + reload, old pin, English copy; axe 0 violations).
  Run `npx playwright test apps/web/test/next-goal.spec.ts` and `node --import tsx --test packages/engine/test/goal-quotes.test.ts packages/engine/test/next-goal.test.ts`.
- **Merged with the seat model (stage 00, 2026-10-20).** Under rules 28 a table level adds no seat (chairs do) and carries no benefit until S4, so `goals.ts` gives a level
  no effect and it is never eligible for the chip (the sheet still lists it, dimmed, "Bàn cần 2 ghế"); a new shop's first goal is table 2 (`goal.buyTable`, "+1 chỗ"; English "Seats +1").
  The Wave 1 cases above run on a capacity snapshot (fixture modes `closed`, `oldpin` of `apps/web/test/fixtures/next-goal.ts`: the frozen `docs/config/legacy/economy-2.0.4.json`
  with a custom version, so the bundled seat model never replaces it; the brand-new case loads `closed 0 300`). The bundled seat model has its own cases in the same spec:
  `on the seat model a brand-new save's first goal is the second table, and a tap opens the sheet at that one card at ${w}px` (×3: chip "Mua bàn mới · +1 chỗ", "1.070 xu · thiếu 320",
  one `[data-goal="buyTable"]` card, dimmed with "Chưa đủ xu", axe 0), `on the seat model the chip moves on after every table bought and says what is still missing at ${w}px` (×3: 1.070 → 9.250 → 14.250 xu, 55 short at the end; the wallet is 9 828 base so the arithmetic of the three purchases is unchanged),
  `on the seat model the full Upgrades sheet keeps its three lanes and a table level is listed but never the chip at ${w}px` (×3), `on the seat model the chip is English in English, with the units of the English copy`;
  `a goal behind the life-path gate is never the chip: it skips the keg and points at the sign` now builds its save with real seat commands (fixture mode `gated`: the alley filled to `tableSlots`,
  a chair on each table, every table to the level its badge gate allows, every device to the life-path gate). Engine side: `packages/engine/test/next-goal.test.ts`
  `a new seat-model save points at table 2: capacity lane, the first rung of the table ladder, nothing filtered before a shift has closed` · `the chip walks the table ladder and moves on to the speed lane once the alley is full: levels and chairs are not its goals yet` · `a game on a pre-seat snapshot with the Wave 1 keys still gets a chip, and its first goal is the table upgrade it can afford` · `a goal behind a life-path, badge, reputation or stall gate is never suggested (seat model)` (its table half walks `tableUpgradeQuote(...).gate`: `tableNeedsChairs`, `badgeRequired`, `reputationRequired`, then open; the `(capacity snapshot)` variant keeps Wave 1's eligibility assertion);
  `packages/engine/test/goal-quotes.test.ts` `buyTableQuote (seat model) prices the n-th table from the ladder like the command: wallet, then the alley ceiling` · `buyChairQuote matches buyChair: locked until the shop owns chairsAfterTables tables, then the wallet, then a pair is the most` · `tableUpgradeQuote (seat model, a pin from before the S4 ladders) matches upgradeTable: two chairs first, then badge, reputation, wallet and top level; guests never block it`
  (the Wave 1 quote tests carry the suffix `(capacity snapshot)`); `packages/engine/test/seat-model.test.ts` `a pre-seat snapshot from Wave 1 (JSON 2.0.5/2.0.6: the capacity model plus presentation keys) still loads, bytes kept; a bad key or tier list still fails closed`.
- `config.ts` `shape()` now accepts a shorter `_meta.governance.tiers.{A,B,C}.sections` list in a pinned snapshot (the registry lists grow with
  every new section); without it every save pinned before JSON 2.0.6 stopped loading. Stage 00 round 1: Wave 1's presentation keys and the tier C
  `nextGoal` name extend only the frozen capacity shape: a 1.x snapshot carrying them is refused as on main, and on the seat shape they are ordinary
  template keys of the seed, each optional in an older pin (`packages/engine/test/seat-model.test.ts` `Wave 1 presentation keys extend the frozen capacity shape alone: the same keys on a 1.x snapshot are refused as on main, each one stays optional on a pre-seat 2.0 pin`)
  and keys compare as own keys (`a snapshot key named like an Object.prototype member is an unknown key at every object node, never a known one`).

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 A5 | Cite UI clarity, first-open asset preload and active-rest ETA regression; no engine/config rule changes. |

## Changelog — A4
| Date | Change |
|---|---|
| 2026-09-16 | Add current order feedback and rules26 loss evidence regression citations; historical replay remains unchanged. |
| 2026-10-14 fun-onboarding-visual | UI only: until `onboarding.featureReveal.upgradeAllAfterShifts` completed shifts the Upgrades sheet shows exactly one card, the first table that can still level up, an empty one when any is (`spotlight.ts` `firstGoal()`, 3 750 xu on config 2.0.5), and the Upgrades nav button / that card's buy button take the single spotlight while it is affordable and unbought; the full list (equipment, tables, business, flyer, sign, locations) opens afterwards. The table upgrade command, its price and its `tableBusy` rule are unchanged. Proof: `apps/web/test/first-shift-visual.spec.ts` `P0 after shift 1 the HUD opens up and the Upgrades sheet holds exactly one card at ${w}px` (×3) and `P0 after shift 2 the full Upgrades list and the Journey button open and nothing blinks`. |

## fun-buy-buttons-reason — 2026-10-19

- **Priced buttons, one reason.** `App.tsx` `tableCard` / `buyTableButton` read the engine quotes `tableUpgradeQuote` / `buyTableQuote` (`rules.ts`): the button always carries its price
  (`upgrade.buy` / `upgrade.addTablePrice`) and, when dimmed, a `.buy-reason` line wired with `aria-describedby` that holds the FIRST refusal the command itself would give
  (`reason.tableBusy` "Bàn đang có khách" · `reason.notEnoughCoins` · `reason.badgeRequired` / `reason.reputationRequired {n}` · `reason.maxTables`); at the top level the button says "Bàn đã tối đa" itself and no line is added.
- **Proof:** `apps/web/test/buy-reasons.spec.ts` — `a dimmed table button keeps its price and names exactly one reason: guests, then coins; an affordable one has none, at ${w}px` (×3) and
  `a table at Lv3 says it needs the badge, an affordable table has no reason, and the last table bought turns the buy button into "all tables built" at ${w}px` (×3); fixtures from the real engine: `apps/web/test/fixtures/buy-reasons.ts` modes `states`, `rich`.
  Engine side (unchanged from fun-next-goal): `packages/engine/test/goal-quotes.test.ts` pins that the quotes say what the commands say.
- Engine rule unchanged: while a table is `occupied` the command still answers `tableBusy`; letting a purchase proceed on an occupied table is Wave 2 (S1).
- **Merged with the seat model (stage 00, 2026-10-20).** The three table-button cases above run on a capacity snapshot (fixture modes `states`, `rich`, `maxed`: frozen 2.0.4 file, custom version);
  on the bundled seat model (rules 28: `buyTableQuote` / `buyChairQuote` / `tableUpgradeQuote`, a purchase never needs an empty table) the same promises are pinned by
  `a dimmed seat button keeps its price and names exactly one reason: coins, then four tables, then two chairs, at ${w}px` (×3: "Mua bàn · N xu" dimmed with "Chưa đủ xu", "Thêm ghế · N xu" with "Mở sau khi đủ 4 bàn" (S6; "Mua đủ bàn trước" before), "Nâng · N xu" with "Bàn cần 2 ghế", 44 px, axe 0),
  `with four tables a chair is for sale and lets its table level up, the next chair costs more, and the full alley says "all tables built" at ${w}px` (×3: "Quán đã đủ bàn", chair price follows the chairs owned shop-wide, a pair has no chair button) and
  `a pair at its top level says "Bàn đã tối đa" and nothing else, with guests or without, at ${w}px` (×3) and (review round 1) `a pair maxed on both ladders names which ladder each "max" button is and keeps every label within six words, at ${w}px` (×3: "Bàn đã tối đa" and "Ghế đã tối đa", three perk chips "Thêm 1 đợt gọi" / "Mồi thứ 2: 35%" / "Tip ×1,25", no line over six words); fixtures `apps/web/test/fixtures/buy-reasons.ts` modes `seat-states`, `seat-rich`, `seat-maxed`, `seat-maxed-both`.

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: seat-model quotes/commands/events and the minimal Upgrades UI cited; capacity-model citations above stay valid for pinned old snapshots. |
| 2026-10-20 stage 00 | Wave 1 × S1 merge (autopilot stage 00): the chip, the three lanes, the buy-button reasons and the one-card sheet are proven on both models — capacity snapshot (frozen 2.0.4 file, fixture modes `closed` / `oldpin` / `states` / `rich` / `maxed` / `rest`) and the bundled seat model (`seat-*` fixture modes and the `on the seat model …` / `seat …` cases cited above). A table level has no effect and is not a chip goal under rules 28 until S4. English chip effect "Seats +{n}" (was "+{n} seats", which printed "+1 seats"). |
| 2026-10-20 S2 | `eco21-instant-pour` (rules 28): a keg level is its reserve and refill batch on a seat-model game (`pourSlots`/`pourMs` no longer matter to service), so the goal chip's keg effect is `goal.fx.keg` ("dự trữ n cốc" / "reserve n glasses", `kegStorage[next]`) and the keg card compares reserve + refill; a capacity pin keeps `goal.fx.taps` and the tap line. Proof: `packages/engine/test/next-goal.test.ts` `the keg goal promises its reserve on the seat model (the taps are off the serving path from rules 28) and its taps on a capacity pin`, `apps/web/test/instant-pour.spec.ts` (card copy, vi/en × 3 viewports), `apps/web/test/economy2.spec.ts` (`new economy capacities, LP gate and glass purchases stay paused at ${width}px`: level-3 keg card). No price changed: S5 re-prices a keg level by its reserve and refill. |

## S4 table and chair levels (rules 28, JSON 2.0.23) — 2026-10-20

- **Contract.** On a snapshot with `upgrades.table.tableUpgrade` / `chairUpgrade` (the keys are the gate; rules stay 28) `tableUpgradeQuote(w, c, table)` (`rules.ts`) prices the TARGET level `priceBase + stepBase × n` (n = tables already at or above it: the total is the same in any order), refuses in the command's order `tableNeedsChairs` → `maxLevel` → `lifePathRequired` (Lv2 LP1 · Lv3 LP2 · Lv4 LP4; the Ket Noi badge and the reputation of the S1 ladder are gone) → `notEnoughCoins`, and returns `requiredLifePath`; the new command `{type:'upgradeChair', tableId}` goes through `chairUpgradeQuote` (`4 000 + 2 000 × t`, t = chair upgrades bought shop-wide; Lv2 LP1, Lv3 LP2; refusals `maxLevel`, `lifePathRequired`, `notEnoughCoins`, `tableGone`, and `chairUpgradeUnavailable` on a snapshot without the ladder). Events `table_upgraded{tableId, level, cost, what}` (`what` = `extraRounds` / `pExtraMoi` / `tipMult`) and `chair_upgraded{tableId, level, cost, patienceMult}`; a snapshot without the ladders keeps the S1 quote, the `{tableId, level}` payload and refuses `upgradeChair`. What a level gives is recorded on the group when it sits down (`Group.level`, `Group.chairLevel`), so a purchase serves the NEXT group: see [table-lifecycle](table-lifecycle.md), [order-rounds-kitchen](order-rounds-kitchen.md), [serve-outcomes](serve-outcomes.md).
- **UI.** Each table card (`App.tsx` `tableCard`) shows the level and one short chip per perk it gives (`.table-perk`: "Cấp n", then "Thêm 1 đợt gọi" / "Mồi thứ 2: 35%" / "Tip ×1,25", each at most six words; the level comes from `effectiveTableLevel`, the same rule the engine records on the group), "Ghế cấp n · kiên nhẫn ×m" (`.chair-perk`), the level button ("Nâng · N xu") and the chair button ("Nâng ghế · N xu", `data-action="chairUpgrade"`), every dimmed one with exactly one `.buy-reason` (`reason.lifePathRequired` names the mốc to reach, then `reason.notEnoughCoins`); the goal registry (`goals.ts`) gives a level its effect (`goal.fx.rounds` / `goal.fx.snack` / `goal.fx.tip`) and lets the chip point at it only when two chairs and its gate are open.
- **Proof (engine):** `packages/engine/test/table-chair-upgrades.test.ts` (21 tests; 19 mutations of `engine.ts` / `rules.ts` / `config.ts` / `policy.ts`, one at a time, each turn at least one of them red: `artifacts/verification/feat-eco21-table-chair-upgrades/stage03/03-mutation-engine.log` for M1-M16 and `03r1-mutation-engine.log` for the review-round-1 run of all 19, M17 = `upgradeChair` not paid from the wallet, M18 = a Lv4 table multiplying the payment, M19 = the tip ratio read from the chair-stretched order patience) — `a rules-28 history recorded on JSON 2.0.22 replays byte for byte and re-encodes unchanged: the old level prices, the old gate, no level benefit`, `the bundled numbers are the plan's W9 set: ...`, `tableBenefit and chairPatienceMult read the ladder: level 1 and a snapshot without the keys give nothing`, `a table level is priced by its TARGET level and by how many tables have already reached it: the same total whatever the order of the purchases`, `tableUpgradeQuote answers what upgradeTable will: two chairs, the top level, the life-path gate (Lv2 LP1, Lv3 LP2, Lv4 LP4; no badge, no reputation), then the wallet`, `chairUpgradeQuote answers what upgradeChair will: ...`, `upgrades emit one event each with what they cost and what they bring: ...`, `a snapshot from before the keys keeps its own ladder: ...`, `upgradeChair is a rules-28 command: ...`, `a pinned 2.0.22 save adopts the new bundle at its next opening: ...`, `snapshots from before the keys load, bytes kept, and refuse every half-way shape; the new keys never loosen an older shape`, `the ladders fail closed: ...`, `the tip window follows the guest's OWN patience, not the chair-stretched deadline of the order: guestPatienceLeft is the ratio the tip is judged on, at every chair level` (`guestPatienceLeft` in `rules.ts`: what `customerValue` judges the tip on and what the patience bar reads), `Lv4: the tip is x1.25 at that table only, ...` (also: the payment of every guest is the Lv1 formula), `the career bot learns the upgrades: with a wallet and the life path it buys table and chair levels, cheapest first, after the seats`; the S1 chains now run on the 2.0.22 pin: `packages/engine/test/goal-quotes.test.ts` `tableUpgradeQuote (seat model, a pin from before the S4 ladders) matches upgradeTable: two chairs first, then badge, reputation, wallet and top level; guests never block it`; `packages/engine/test/next-goal.test.ts` the three `a goal behind a life-path, badge, reputation or stall gate is never suggested (...)` variants and `S4: with two chairs and its life-path gate open a table level is a chip goal: capacity lane, cheapest first, the price follows the ladder, the effect is its benefit`.
- **Proof (web):** `apps/web/test/table-upgrades.spec.ts` — `table and chair levels: price by target level, what each gives and one reason per dimmed button (${locale}) at ${viewport.width}×${viewport.height}` ×6 (vi/en × 390×844 · 360×740 · 1280×720: ladder prices, perk lines, one reason per dimmed button read from its accessible description, 44 px, axe 0, state read back through the engine, reload, no label over six words; 5 mutations of `App.tsx` / `goals.ts` (U1-U5): `artifacts/verification/feat-eco21-table-chair-upgrades/stage03/03-mutation-ui.log`); `the patience bar of a table with level-3 chairs turns low when the tip window closes, not when the stretched order deadline would (${moment}) at 390×844` ×2 (early / late, fixture `table-upgrades.ts bar`: the bar's width follows the chair-stretched deadline, its low state the guest's own patience); `apps/web/test/goal-chip.test.ts` ×4 (`a goal effect writes a fraction with the ${locale} decimal separator and a whole number with its thousands separator`, `the goal chip shows the Lv4 tip effect with the ${locale} decimal separator`: the chip writes "tip ×1,25" like the card; review round 1 UI mutations U6-U9 in `artifacts/verification/feat-eco21-table-chair-upgrades/stage03/03r1-mutation-ui.log`: the bar on the stretched deadline, the two shared max labels, the one-line perks and the chip without the decimal formatter are all red); `apps/web/test/seat-model.spec.ts` and `apps/web/test/buy-reasons.spec.ts` (seat cases) gained the third button of a card and its reason; `apps/web/test/config-pinning.spec.ts` `a browser save pinned to JSON 2.0.22 keeps its old table cards, then adopts the bundled seed once when its next shift opens and its levels give their perks`. Run `npx playwright test apps/web/test/table-upgrades.spec.ts` and `node --import tsx --test packages/engine/test/table-chair-upgrades.test.ts`.
- **Uncovered:** the k effect of the levels is measured by the career bot (see [economy-k-ledger](economy-k-ledger.md)), not pinned by a test (S5 tunes); the admin editor for the two new Tier A keys is S6's ([admin-registry](admin-registry.md)); there is no sprite for a chair level yet (S6, the yard).

| Date | Change |
|---|---|
| 2026-10-20 | S4 `eco21-table-chair-upgrades`: ladder prices (n = tables that reached the level), life-path gates instead of the Ket Noi badge, `upgradeChair`, the two events, the table-card UI and the tests above cited. |

## S5 balance pass (JSON 2.1.0) — 2026-10-20
| Date | Change |
|---|---|
| 2026-10-20 | S5 `eco21-balance-pass`: the sealed prices of the whole package — table 2…8 `tablePriceBase` 600 · 2 000 · 4 000 · 7 500 · 12 500 · 20 000 · 31 300, chair 2 `chairPriceBase` 10 000 … 70 000, devices Lv2–5 (keg 1 750 · 6 750 · 13 500 · 51 000, washer 1 250 · 5 500 · 10 250 · 34 000, cooler 1 000 · 4 000 · 7 750 · 25 500, stall 600 · 2 750 · 5 000 · 20 500, kitchen Lv1–4 4 000 · 17 000 · 27 250 · 68 000; base, ×2.5 on screen; no device level is cheaper than table 2, so the goal chip points at table 2 after shift 1: `sealed-economy.test.ts` last case, evaluator gate `shift1.firstGoal`), the S4 ladders unchanged. Pinned by `packages/engine/test/sealed-economy.test.ts` (engine tier; `npm run sim:career:gate` / `node --import tsx packages/engine/sim/balance-gates.ts` are the proof that the set works). UI tier: `apps/web/test/next-goal.spec.ts` (table 3 is `Mua bàn · 5.000 xu`, table 4 `10.000`), `apps/web/test/first-shift-visual.spec.ts`, `apps/web/test/buy-reasons.spec.ts` (wallet 1 750), `apps/web/test/table-upgrades.spec.ts` (its fixture sets `nextGoal.reachMult` so the chip follows the lane order: the stall's second level, 1 500 coins, is within an average shift of that fixture's shop while a table level, 27 500, is not). |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 1: the sealed prices are re-set for the plan's own bot — table 2…8 `tablePriceBase` 600 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000, chair 2 `chairPriceBase` 400 … 2 800, table levels →Lv2 7 000 + 2 500·n, →Lv3 34 000 + 13 500·n, →Lv4 59 500 + 20 500·n, chair levels 12 000 + 6 000·t, devices Lv2–5 (keg 2 000 · 7 750 · 38 750 · 146 750, washer 1 500 · 6 250 · 29 500 · 97 750, cooler 1 250 · 4 500 · 22 500 · 73 250, stall 750 · 3 250 · 14 250 · 59 000, kitchen Lv1–4 4 500 · 19 500 · 78 500 · 195 500; base, ×2.5 on screen; the first goal after shift 1 is still table 2: no device level is cheaper, `sealed-economy.test.ts` / gate `shift1.firstGoal`). Pinned by `sealed-economy.test.ts`, `table-chair-upgrades.test.ts` (quotes and events at the new prices), `apps/web/test/table-upgrades.spec.ts` (a chair level now costs more than table 2's level: the wallet check of that level moves from step 3 to step 4) and `apps/web/test/next-goal.spec.ts`. |
| 2026-10-21 | S5 `eco21-balance-pass`, owner decision round: table 2 = `tablePriceBase[0]` **428 base = 1 070 xu** (it was 600 base = 1 500 xu), every other ladder unchanged (owner decision 1: at least 4 runs in 5 can buy it when shift 1 closes); pinned by `packages/engine/test/sealed-economy.test.ts` (`tablePriceBase` 428 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000, table 2 = 1 070 xu above the 750 xu wallet) and by `apps/web/test/next-goal.spec.ts` ("1.070 xu · thiếu 320", "Mua bàn · 1.070 xu") and `apps/web/test/first-shift-visual.spec.ts` ("Mua bàn · 1.070 xu", `coins − 1070`). |

## eco21-ui-assets (S6) — 2026-10-21 (four capacity providers, quick chair, yard)
- **Registry (goals.ts):** the capacity lane's four seat-model items are four providers — `tables` (`table:<id>`, the level), `newTable` (`buyTable`), **`chairs` (`chair:<id>`: the second chair of a one-chair table, effect `goal.fx.seatsAdded` +1, cost from `buyChairQuote`, eligible unless `chairsLocked`; a pair lists cost null, never eligible)** and **`chairLevels` (`chairLevel:<id>`: the chair level, effect `goal.fx.patience` = the next rung's `patienceMult`, cost from `chairUpgradeQuote`, eligible when its gate is open)**. Two new `Card` kinds (`buyChair`, `chairUpgrade`) and two `renderCard` cases (a standalone chair card for the one-card sheet); in the full lane the table card draws the same two blocks (`.chair-goal[data-goal="chair:<id>"]`, `[data-goal="chairLevel:<id>"]`) around its chair buttons, so the chip's tap lands on the block. The chip's rule (`pickNextGoal`) is untouched: with four tables a second chair (1 000 xu class) is cheaper than every later table, so the chip walks tables 2–4, then chairs, then tables 5–8 with their chairs, then (LP1) the cheaper of a table level and a chair level.
- **Quick HUD "Mua ghế bàn n · giá"** (`section.quick-chair`, `upgrade.quickChairTitle` / `upgrade.quickChair`; en "Add chair · table {n} · {cost} coins"): rendered only while `pickNextGoal` (independent of the chip's Settings switch) is a `buyChair` goal AND the wallet pays it AND the Upgrades nav is revealed; one tap dispatches `{type:'buyChair', tableId}` through `run()` like the quick beer refill — no sheet, no pause, no toast; nothing is shown otherwise (the chip already says what is missing).
- **One definition each** of `buyTableQuote` / `tableUpgradeQuote` / `buyChairQuote` / `chairUpgradeQuote` in `rules.ts` (`git grep -n "export function .*Quote"`), parity-tested against the real commands in `goal-quotes.test.ts` and `table-chair-upgrades.test.ts` (unchanged by S6).
- **Proof (engine):** `packages/engine/test/next-goal.test.ts` — `the chip walks the table ladder, then the second chairs once the alley is full (S6), and moves on to the speed lane: the levels wait for Duong Len Trum`, `S6: the four seat-model items of the capacity lane say what their commands say, one price and one gate each (buy table, buy chair, upgrade table, upgrade chair)`, `S6: no chair goal on a capacity snapshot, and no chair-level goal on a seat pin from before the chair ladder`; the S4 case `S4: with two chairs and its life-path gate open a table level is a chip goal ...` now also walks the chair levels at LP1 (assertions changed on purpose, DECISIONS `## 05 ·`). Run `node --import tsx --test packages/engine/test/next-goal.test.ts`.
- **Proof (web):** `apps/web/test/quick-chair.spec.ts` — `S6 quick chair purchase buys one chair with one tap, keeps the shift clock running and survives reload in ${locale} at ${viewport.width}px` ×6 (fixture `fixtures/quick-chair.ts`: an open shift of four one-chair tables; the button ≥ 44 px, axe 0 on the section, the chip and the button agree, one `chair_bought`, coins debited once, `paused` false, `remaining` unchanged, no `dialog[open]`, the yard shows the new chair, the button moves to table 2 at the next rung, +1 s of fixed time = −1 s of shift, reload) and `S6 the quick chair button is not shown while the wallet cannot pay the chair: the chip alone says what is missing` (mode `poor`). Run `npx playwright test apps/web/test/quick-chair.spec.ts`. The table-card specs of S1/S4 (`seat-model.spec.ts`, `table-upgrades.spec.ts`, `buy-reasons.spec.ts`, `next-goal.spec.ts`) run unchanged on the blocks.
- **Review round 1 (2026-10-21):** the registry effects of the chair items are before → after in one copy — `chair:<id>` `goal.fx.seatsTo` {from: capacity, to: 2}, `chairLevel:<id>` `goal.fx.patienceTo` {from: `chairPatienceMult(level)`, to: the next rung} — and `App.tsx` prints `goal.effect` (`.goal-effect`) on every capacity block: the second chair, the chair level, the table level (its gained benefit) and the next table ("+1 chỗ"). The locked chair's one reason names the tables it waits for (`reason.chairsLocked` "Mở sau khi đủ {n} bàn", `whyNot(reason, chairsAfterTables)`). Proof: `packages/engine/test/next-goal.test.ts` (the from/to pairs in the three S6 cases and the S4 case; the chip's buy-table cost is read from the goal again), `apps/web/test/seat-model.spec.ts`, `buy-reasons.spec.ts`, `table-upgrades.spec.ts` (×3 viewports each). `yard.spec.ts` gained the live-shift cases (see table-lifecycle).
- **Review 07 r1 (2026-10-22, stage 07):** two cited titles brought to the names the tests carry since S6 review round 2 / S4 (`seat model sells tables 2-8, a second chair once four tables stand, …`; `tableUpgradeQuote (seat model, a pin from before the S4 ladders) matches upgradeTable: …`). The QR business card writes its tip multiplier with the locale's decimal sign like the goal chip ("Boa ×1,2" / "Eligible tips ×1.2"): `apps/web/test/economy2.spec.ts` `upgrade and stock labels distinguish ingredients from cooked dishes in ${lang}` now asserts that text in both languages. The eight-place yard keeps a 56 px bubble band above every row: `apps/web/test/yard.spec.ts` `S6 a busy alley: the order bubbles of every row cover no other table's caption or drawing, at ${viewport.width}px` (360 · 390 · 1280).
