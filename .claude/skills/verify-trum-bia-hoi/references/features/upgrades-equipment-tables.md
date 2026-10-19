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
  when `!q.ok`, label `t('upgrade.max')` or `t('upgrade.buy',{cost})`; a `role="status"` line under it
  surfaces `q.reason` (`upgrade.lifePath` text for `'lifePathRequired'`, else `error.${reason}`).
  Table card button dispatches `{type:'upgradeTable', tableId}`; a trailing `"Thêm bàn"`-style button
  (`t('upgrade.addTable')`) dispatches `{type:'buyTable'}`. `UpgradeHint` (`App.tsx:16,287`, mounted
  inside `sheet==='upgrades'` at `:454`) is the inline nudge — a separate component from the purchase
  cards themselves.

- **Rules 28 seat model (S1 `eco21-seat-model`, JSON 2.0.20) — supersedes the capacity bullets above for seat-model snapshots:** `buyTableQuote(w, c, outsideShiftOnly?)` (`rules.ts`) prices the n-th table at `upgrades.table.tablePriceBase[n-2]` with no life-path gate, capped by `tableSlots(w, c)` = the current location's `locations.list[].tableSlots` (every alley 4 this wave); new `{type:'buyChair', tableId}` via `buyChairQuote(w, c, table)`: refuses `'chairsLocked'` below `upgrades.table.chairsAfterTables` tables, `'maxChairs'` at two chairs, else prices `chairPriceBase[second chairs owned shop-wide]`; `tableUpgradeQuote(w, c, table, outsideShiftOnly?)` puts `'tableNeedsChairs'` in `gate` (D18) and never requires an empty table; a level no longer changes chairs. Events `chair_bought{tableId, seats, cost}`, `table_bought{cost, tableId}`; missing table `'tableGone'`. DOM: each table card has "Thêm ghế · giá" while it has one chair plus one `role="status"` reason, the level button reads `tableUpgradeQuote`, "Mua bàn · giá" is dimmed with its reason. Capacity snapshots (old saves before D2) keep the `extraSeatPriceBase` path inside the same quotes.

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

- `apps/web/test/ui-clarity.spec.ts` — `A5 clear production stages, customer rounds and first-open art in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) checks the separate tap/refill labels, customer-round explanation, and manifest-backed tofu/phone/wood-sign preload plus decoded images on the first stock/upgrade visit. `A5 recovery ETA follows active rest, survives reload and disappears when stamina is full` reaches exhausted natural closure through engine commands, checks the configured active-rest countdown and reload/full recovery. Run with `npx playwright test apps/web/test/ui-clarity.spec.ts` (local config).

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
- `apps/web/test/seat-model.spec.ts` — `seat model sells tables 2-4, then a second chair, each with its price and one reason (${locale}) at ${viewport.width}×${viewport.height}` (vi/en × 390×844 / 360×740 / 1280×720): DOM-only purchases, reasons "Mua đủ bàn trước đã." / "Bàn cần 2 ghế." / "Quán đã đủ bàn." / "Chưa đủ xu." (and their en copy), 0 axe violations on the open sheet before and after the purchases (the accessibility tier's `wcag2a/2aa/21aa/22aa` tags), state read back through the engine (`fixtures/seat-model.ts inspect`). Run `npx playwright test apps/web/test/seat-model.spec.ts`.
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
- `config.ts` `shape()` now accepts a shorter `_meta.governance.tiers.{A,B,C}.sections` list in a pinned snapshot (the registry lists grow with
  every new section); without it every save pinned before JSON 2.0.6 stopped loading.

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
  (`reason.tableBusy` "Bàn đang có khách" · `reason.notEnoughCoins` · `reason.badgeRequired` / `reason.reputationRequired {n}` · `reason.maxTables`); at the top level the button says "Đã tối đa" itself and no line is added.
- **Proof:** `apps/web/test/buy-reasons.spec.ts` — `a dimmed table button keeps its price and names exactly one reason: guests, then coins; an affordable one has none, at ${w}px` (×3) and
  `a table at Lv3 says it needs the badge, an affordable table has no reason, and the last table bought turns the buy button into "all tables built" at ${w}px` (×3); fixtures from the real engine: `apps/web/test/fixtures/buy-reasons.ts` modes `states`, `rich`.
  Engine side (unchanged from fun-next-goal): `packages/engine/test/goal-quotes.test.ts` pins that the quotes say what the commands say.
- Engine rule unchanged: while a table is `occupied` the command still answers `tableBusy`; letting a purchase proceed on an occupied table is Wave 2 (S1).

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: seat-model quotes/commands/events and the minimal Upgrades UI cited; capacity-model citations above stay valid for pinned old snapshots. |
