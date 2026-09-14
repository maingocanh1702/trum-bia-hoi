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

- `packages/engine/test/live-upgrades.test.ts` (both tests are entirely yours):
  `'a real saved v16 paused shift keeps its old refusals but upgrades every device and an empty table
  without closing'` (`:8-36`) — replays a real v16 save carrying four historical
  `outsideShiftOnly` refusals (asserted to replay identically, i.e. legacy behaviour is preserved for
  *already-logged* commands), then drives **live**, in-shift: every one of the five `Equipment` kinds
  via `{type:'upgrade', kind}` (`ok:true`), `{type:'upgradeTable', tableId: empty.id}` (`:24`, asserts
  `empty.level` incremented), `{type:'buyTable'}` (`:25`, asserts `w.tables.length` incremented), and
  a **second** `upgradeTable` against a non-empty table (`:26`, asserts `reason === 'tableBusy'`) — all
  without ever closing the shift. `'live upgrade refusals describe real funds or maximum level and
  cannot debit a customer shift'` (`:38+`) — drives every kind to `'maxLevel'`, and separately asserts
  an unaffordable upgrade is refused (`'notEnoughCoins'`) with no coin debit.
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

## Verification procedure

- `node --import tsx --test packages/engine/test/live-upgrades.test.ts` (or `npm test` for the full
  suite — bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/live-upgrades.spec.ts apps/web/test/production.spec.ts
  apps/web/test/upgrade-hint.spec.ts` (or `npm run test:e2e`).
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
