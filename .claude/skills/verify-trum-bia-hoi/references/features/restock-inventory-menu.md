# Restock, inventory & menu report (03-SPEC-he-ban.md "Owner update — management pause", 2026-09-09; `docs/config/economy.tbh.json` `menu`/`inventory` blocks)

## "Menu pause" is not in `menu.ts`

Despite the name, the "menu pause" mechanic (opening Nhập hàng/management menus auto-freezes
gameplay) is **not implemented in `packages/engine/src/menu.ts`** — grep-confirmed zero
`paused`/`activity` references in that file. It's a generic `World.paused` boolean set by the
`activity` command and checked at four call sites in `engine.ts` (`validateAdvance():161`,
`gameplayPaused():187`, `updateRush():268`, `tickQuests():311` — exact line numbers as of this
commit, re-grep `w.paused` before citing elsewhere since these shift easily) plus the private
`gameplayPaused()` helper (`engine.ts:186-189`) that is the actual freeze gate consumed throughout
`advanceTime()`. `menu.ts` itself owns only `serveValueStats()`/`menuReport()` — pure reporting, no
pause logic at all. Treat "menu.ts" and "menu pause" as two unrelated things that happen to share a
word.

## Observable contract

- `Dish` (`packages/engine/src/config.ts:6`): `keyof Economy['menu']`. `DISHES` (`config.ts:12`):
  `Object.keys(seed.menu)` → `['bia', 'lac', 'nem', 'dau', 'topmo', 'long']` (grep-verified against
  `docs/config/economy.tbh.json`'s `menu` block, not hardcoded here from memory).
  [keg-refill](keg-refill.md) owns `'bia'`; this file owns the other five.
- `World.inventory: Record<Dish, number>`; `World.paused: boolean` (only meaningful alongside
  `World.active`, see Gotchas); `World.shift.menu: {eventStart, serveStart, complete}` (the report's
  observation cursors).
- `menuReport(w, c)` (`packages/engine/src/menu.ts:15-30`) → `{shiftId, complete, rows: [{dish,
  ordered, sold, wasted}], ...serveValueStats(...)}` — walks `w.events` from `shift.menu.eventStart`
  counting `dish_ordered`/`dish_wasted` per dish, and `w.serves` from `shift.menu.serveStart` counting
  sold dishes. `serveValueStats()` (`menu.ts:5-12`) is the money/`k` half — already owned by
  [economy-k-ledger](economy-k-ledger.md), cross-link rather than re-deriving the formula here.
- Events: `restocked` (`engine.ts:912`, `{dish, quantity, cost}`), `dish_ordered` (`:605`, gated
  `MENU_RULES`), `dish_wasted` (`:520`), `menu_tracking_started` (`:527`, private `startMenu()`,
  fires once per shift — explicit `{complete:true}` at shift-open `:810`, or lazily on the first tick
  after if not already set `:716` — sets `shift.menu = {eventStart, serveStart, complete}`, the
  cursor pair `menuReport` reads from), `menu_mix_summary` (`:441`, emitted once at shift-close,
  flattens each report row into `ordered_<dish>`/`sold_<dish>`/`wasted_<dish>` keys alongside the
  `serveValueStats` fields).
- `Result` reasons for `restock`: `'stockOrCoins'` (not enough stock headroom or coins),
  `'dishLocked'` (kitchen level below `menu[dish].unlock.kitchenLevel`) — `engine.ts:910`.
- DOM/aria: button `'Nhập hàng'` opens the restock/management sheet (`pause.spec.ts`); stock rows
  `.stock-row`, buy button pattern `` /^Mua bom \+1 ·/ ``; the sheet shows `.sheet-pause` containing
  `'Tạm dừng'` (paused indicator) whenever `world.paused` is true.
- `emergencyPack` → `emergency_pack_claimed` — F15-deferred, dev-preview only
  (`VITE_TBH_RISK_PREVIEW=1`); no verification procedure until F15 is un-deferred.

## How to reach it

- `{type:'restock', dish, mode:'bulk'|'full'|'one'}` (`types.ts:103`) — `case 'restock':`
  (`engine.ts:908-913`): `restockQuote()` (`rules.ts:33-40`, cost = bulk-batch price +
  per-unit remainder, `ok` requires `dishUnlocked(w,c,dish)` (`rules.ts:32`:
  `equipment.kitchen >= menu[dish].unlock.kitchenLevel`) **and** `quantity <= stockCap(w,c) -
  inventory[dish]` (`stockCap`, `rules.ts:28`, driven by `equipment.stall`) **and** enough coins.
  Success: `spend(cost)`, `inventory[dish] += quantity`, emits `restocked`. The command's own shape
  gate (`engine.ts:1091`) is a **closed allowlist**: `DISHES.includes(cmd.dish) &&
  ['bulk','full','one'].includes(cmd.mode)` — a `dish` outside the six real keys (e.g. an injected
  `'__proto__'`) is rejected before `restockQuote` ever runs, not just quietly priced at zero.
- `{type:'activity', active, paused?}` (`types.ts:120`) — `case 'activity':` (`engine.ts:761-764`):
  sets `w.paused = true` only when `cmd.paused` is truthy **and** the replaying/live rules version is
  `>= MENU_PAUSE_RULES` (`16`, `engine.ts:27`). The command-shape validator
  (`engine.ts:1083`) enforces `!c.paused || c.active` — you cannot request "paused" without also being
  "active"; paused is a refinement of active, not an independent flag. [shift-lifecycle](shift-lifecycle.md)
  owns the `active:false` (hidden/offline) case; this file owns `paused:true`.
- UI: any of "Nhập hàng" (restock), the equipment detail/upgrade sheets, or the management menu opens
  auto-sends `{type:'activity', active:true, paused:true}`; closing via `×`, `Escape`, or clicking
  outside resumes (`03-SPEC-he-ban.md`'s "Owner update — management pause" section, quoted in the
  title ref, is the exact source of this behaviour: patience/queue, prep/wash, glass freshness, shift,
  Giờ Vàng (rush) and delivery timers all freeze together; deliberate in-menu actions and
  attendance/VN-midnight keep using real calendar time).
- Remote mode: `restock` is identical over `POST /player/command`, but **`activity` is NOT** — this is
  a genuinely different mechanism per mode, not the usual "same pattern as every other command"
  cross-link this file makes elsewhere. `App.tsx`'s generic `run(cmd)` dispatcher (`:165-166`) is never
  used for `activity`; a separate `syncActivity()` (`:177-181`) calls `remote.setPresence(active,
  paused)` in remote mode — a pure client-side state update, `remote.ts:228-230` — instead of sending
  a command. `RemoteGame.command()` itself explicitly refuses `activity` outright
  (`remote.ts:256`: `if (command.type === 'activity' || ...) return {ok:false, reason: this.state}`),
  and if one somehow reached the server anyway, `store.ts:631` rejects it with `error:
  'presenceManaged'`. The server instead learns `active`/`paused` from the **heartbeat** payload
  (`POST /player/heartbeat`, `remote.ts:275`: `{clientId, beatSeq, active: this.active, paused:
  this.paused}`), not from a command result. Driving this file's `activity.paused` recipe against a
  remote-mode instance will not work — see [multi-system-journeys](multi-system-journeys.md)/
  `apps/server/test/presence.test.ts` for the actual remote presence mechanism and its own tests.

## Existing proof

- **Founder 2026-10-22, Part B2.7 (two buttons per row).** `apps/web/test/stock-buttons.spec.ts` `` `B2.7 a stock row has two buttons with their price chips; "+10" stays dimmed with its reason when it would overflow, "Đầy kho" fills the rest (${locale}) at ${viewport.width}px` `` (vi/en × 390/360/1280, fixture `stock-buttons.ts room`: two `.stock-buy` buttons named `stock.buy` with `.price-chip`, ≥ 44 px, not the primary red; "+10" dimmed with `stock.roomFor` as its reason and description; "Đầy kho" fills to the cap, then both read `stock.isFull`; kitchen rows name the ingredient and the dish, locked or not; axe 0), `B2.7 a wallet below both prices: each button says why, and one glass at a time stays possible so an empty keg is never a dead end` (the `+1` fallback buys one unit), `B2.7 a full stock: both buttons dimmed with "Kho đã đầy", no extra button`. Specs that clicked the removed `+1` now click `Đầy kho` (`pause.spec.ts`, `game.spec.ts`, `guest-test/guest.spec.ts`, `remote-test/remote.spec.ts`); `production.spec.ts` reads `+10 · …`.

- **Founder 2026-10-22, Part B2.5 (a shorter shift book).** `apps/web/test/shift-book.spec.ts` `` `B2.5 the shift book opens on the net and its one suggestion, then three counts that add up to the reasons, the rest under Chi tiết, collapsed (${locale}) at ${viewport.width}px` `` (vi/en × 390/360/1280 on the `buy-reasons.ts book` save: order net · suggestion · counts, then the actions, then `.book-details`; net = credited − penalty − spent; counts = served, lost − queue leavers, rejected + queue leavers, on the sheet's first screen; details closed, its summary ≥ 44 px, the dish table and the reasons hidden until it opens; the reasons then sum to the two loss counts; no row for a locked dish; the money rows under `.ledger-money`; axe 0 closed and open). Specs that read the details now open them first (`bookDetails`): `game.spec.ts`, `buy-reasons.spec.ts`, `menu.spec.ts`, `locations.spec.ts`, `remote-test/remote.spec.ts`, `guest-test/guest.spec.ts`.

- `apps/web/test/quick-beer-stock.spec.ts` — `A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) uses a real DOM purchase and replay inspection to assert full-quote quantity/cost, stock including in-flight batches, one restock event, unpaused timer/reload, 44px and warning-specific axe. Boundaries: `A2 empty raw beer stock remains a refill warning while a batch is still preparing`, `A2 low beer stock keeps the exact unaffordable quote disabled in ${locale}`, and `A2 full beer stock has no low-stock warning or zero-quantity quick purchase`. `A2 stock at the configured batch boundary has no warning despite a nonzero refill quote` pins `stock === batchSize < cap` separately from the full-stock boundary.
- `apps/web/remote-test/quick-beer-stock.spec.ts` — `A2 quick beer refill uses the real server while the shift remains live and reloads once` consumes stock through DOM serving against the isolated API, purchases through the HUD, and checks the authoritative charge/stock, no pause and reload. Run `TBH_PORT_BASE=4178 npx playwright test --config playwright.remote.config.ts apps/web/remote-test/quick-beer-stock.spec.ts`; 4179/4180 must be free because this fixture binds those test ports. Local proof uses `npx playwright test apps/web/test/quick-beer-stock.spec.ts`.


- `apps/web/test/ui-clarity.spec.ts` — `A5 legacy pinned save shows direct pour without a refill or reserve in ${locale}` (VI/EN) loads the historical v12 archive and pins the direct-pour/no-reserve copy.

- `apps/web/test/ui-clarity.spec.ts` — `A5 zero configured recovery rate shows paused recovery without an invalid ETA` pins the config-allowed zero-rate display without changing engine rules.

- `apps/web/test/ui-clarity.spec.ts` — `A5 clear production stages, customer rounds and first-open art in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) checks the keg's reserve and refill labels (a seat-model game has no tap line since S2 `eco21-instant-pour`; the tap/refill pair of a capacity pin is pinned by `apps/web/test/instant-pour.spec.ts`), customer-round explanation, and manifest-backed tofu/phone/wood-sign preload plus decoded images on the first stock/upgrade visit. `A5 recovery ETA follows active rest, survives reload and disappears when stamina is full` reaches exhausted natural closure through engine commands, checks the configured active-rest countdown and reload/full recovery. Run with `npx playwright test apps/web/test/ui-clarity.spec.ts` (local config).

- `packages/engine/test/menu.test.ts` (10 tests, all grep-confirmed): `'six actual menu dishes keep
  per-item ordered provenance and per-customer sales without mutating the report source'` (the core
  `menuReport` dish-tracking proof), `'a newly opened shift resets report coverage without rewriting
  the previous summary or selling old dishes twice'` (the `eventStart`/`serveStart` cursor-reset
  proof — i.e. the direct proof of `menu_tracking_started`/`startMenu()` above), `'expired food is
  wasted once with a reason, while never-stocked hot orders count as ordered
  but not wasted'` (the `dish_ordered` vs `dish_wasted` counting distinction — [serve-outcomes](serve-outcomes.md)
  already cites this same test for the waste-mechanism angle; here it's cited for the report-counting
  angle instead), `'confirmed dismissal discards pending-order preparation but never reclassifies a
  served mâm; retry and refusal add no waste'`, `'menu events and report are frame-independent, and a
  hidden midnight does not manufacture sales or waste'`, `'genuine rules13 queued, expired and served
  histories remain exact; only the observed current portion is reportable'` (legacy-replay proof).
  `'mâm average stays separate from per-customer k across repeated rounds...'` is already cited by
  [order-rounds-kitchen](order-rounds-kitchen.md) for the round-repeat angle and by
  [economy-k-ledger](economy-k-ledger.md) for the `serveValueStats` formula — cross-link, not
  re-derived here.
- `packages/engine/test/game.test.ts:141` — `'invalid commands cannot write arbitrary inventory
  fields or regress the clock'` — sends `{type:'restock', dish:'__proto__', mode:'full'}` and asserts
  `ok:false`: the direct proof of the `DISHES.includes(cmd.dish)` allowlist gate, distinct from
  [keg-refill](keg-refill.md)'s bulk/full/one-mode proof (`game.test.ts:106`, `dish:'bia'` only).
- `packages/engine/test/menu-pause.test.ts` (all 3): `'a present player can restock, claim the real
  calendar day and activate a flyer while gameplay remains frozen'` (restock **and**
  [flyer-signboard-dog](flyer-signboard-dog.md)'s `activateFlyer` both proved safe mid-pause — cite
  from both files, don't duplicate), `'menu pause rejects malformed or pre-protocol commands and
  repeated pause leaves the original clock intact'` (idempotent re-pause, and the `MENU_PAUSE_RULES`
  replay guard at `engine.ts:696`), `'a menu held across midnight replays the same calendar events
  whether the clock advances once or in small ticks'` (VN-midnight/attendance keep real time while
  gameplay clocks freeze — direct proof of the "management pause" spec quote above).
- `apps/web/test/menu.spec.ts` (2): `` `Sổ ca shows actual dish counts, pauses while open and updates
  after closing and survives reload at ${viewport.width}×${viewport.height}` `` (the UI's own
  "Sổ ca"/shift-book rendering of `menuReport`, plus a same-test pause+reload crossing),
  `'empty current and partial or closed legacy shifts do not present an invented average'` (no
  fabricated `kValue`/`avgTicket` on an empty or legacy report).
- `apps/web/test/pause.spec.ts` (3, confirmed by reading — this is genuinely the `world.paused`
  mechanic, not [shift-lifecycle](shift-lifecycle.md)'s hidden/offline case): `'stock purchases keep
  the menu open and the whole game paused until closing, then the same table can be served'`
  (asserts `snapshot().paused === true` directly, buys stock twice mid-pause, confirms every timer
  field is bit-identical before/after a long `page.clock.runFor`), `'visibility changes cannot resume
  an open settings menu; Escape resumes the original remaining wait and expiry happens once'`,
  `'switching from upgrades to equipment stays paused and reloading preserves the frozen wait before
  resuming the yard'`.

## Verification procedure

- `node --import tsx --test packages/engine/test/menu.test.ts packages/engine/test/menu-pause.test.ts
  packages/engine/test/game.test.ts` (or `npm test` for the full suite — bare `tsx` is not guaranteed
  on `PATH` outside an npm script).
- `npx playwright test apps/web/test/menu.spec.ts apps/web/test/pause.spec.ts` (or `npm run
  test:e2e`).
- `npm run check:config` before touching any `menu.*`/`inventory.*`/`upgrades.stall.stockCap` value in
  `docs/config/economy.tbh.json`.

## Uncovered paths

- **No test drives a non-`'bia'` dish to its `stockCap` boundary.** `restockQuote`'s `quantity <=
  missing` clamp (`rules.ts:34,39`) is exercised for `'bia'` only (via
  [keg-refill](keg-refill.md)'s `game.test.ts:112`); grep of `menu.test.ts`/`economy2.test.ts` finds
  no assertion of `reason`/`ok:false` from a full non-beer dish.
- **`reason:'dishLocked'` is never asserted by exact string for `restock`.** The kitchen-level gate
  (`dishUnlocked`, `rules.ts:32`) is exercised for *ordering* a locked dish (via `kitchenStatus`'s
  `'locked'` job state, already noted as structurally-unreachable-in-normal-play by
  [order-rounds-kitchen](order-rounds-kitchen.md)'s Uncovered paths) but not for *restocking* one —
  no test sets `equipment.kitchen` below a dish's unlock level and asserts the restock command itself
  returns `reason:'dishLocked'`.
- **Corrected claim**: `menu.test.ts:63` (the kitchen-waste test) DOES assert the flattened
  `wasted_<dish>` key directly — `for (const row of report.rows) assert.equal(end[0].data[
  \`wasted_${row.dish}\`], row.wasted)` — a literal grep for `wasted_lac`-style strings missed this
  because the key is computed (template literal), not a string constant. `ordered_<dish>`/`sold_<dish>`
  remain genuinely unasserted (grep-confirmed: no test file contains `` ordered_${ `` or `` sold_${ ``
  at all, not just no literal hits) — narrow this gap to those two key families only.
- **No test restocks all six dishes to a mixed-capacity state and asserts `menuReport`'s per-dish
  `rows` array reflects each independently** — coverage today is per-dish in isolation (the `DISHES`
  loops in `menu.test.ts` restock every dish identically as setup, not as a mixed-state assertion
  target).

## Variants

- **success** — `restocked` event + `inventory[dish] += quantity` (all `menu.test.ts` setup calls);
  `menuReport` dish-provenance test above.
- **cancel** — not applicable to `restock` (no cancel semantics); menu-pause's Escape/×/outside-click
  close is the closest analog, proved by `pause.spec.ts`.
- **reason** — `'stockOrCoins'` (not test-asserted by exact string, see Uncovered), `'dishLocked'`
  (not asserted, see Uncovered). **Corrected claim**: the allowlist rejection (`game.test.ts:141`)
  does carry a `reason` — `'invalidCommand'` (`engine.ts:675`, `!validEnvelope(envelope)`), the shape
  validator's own fixed reason for any structurally-invalid command; the test only asserts
  `.ok === false` and doesn't check `.reason`, which is a gap in the test, not evidence the field is
  absent.
- **empty** — `menuReport` on a shift with zero orders/sales/waste returns `rows` with all-zero
  counters and `serveValueStats([])`'s `mean:null`/`avgTicket:null`/`kValue:null` (already proved by
  [economy-k-ledger](economy-k-ledger.md); `menu.spec.ts`'s "empty current... reports" test is the UI
  side).
- **persistence** — `menu.test.ts`'s legacy-replay test (rules13 histories). **Corrected claim**: all
  6 named `menu.test.ts` citations and all 3 `menu-pause.test.ts` citations round-trip
  `decodeSave(encodeSave(g))`, but `game.test.ts:141` (the malformed-`restock`-rejection test) does
  not — it's a rejected-command/no-mutation check, not a successful restock/pause round-trip, so
  "every cited test" was too strong as written.
- **capacity** — `stockCap` per-dish ceiling proved for `'bia'` only (see Uncovered for the gap on the
  other five dishes).
- **duplicate/idempotent** — `menu-pause.test.ts`'s repeated-pause test (`'repeated pause leaves the
  original clock intact'`).
- **stale** — not directly applicable; menu-pause interacts with staleness only insofar as it freezes
  the same clocks [glass-beer-flat](glass-beer-flat.md) reads for freshness — no dedicated test
  combines the two.
- **time-jump / offline-reconnect** — `menu-pause.test.ts`'s hidden-midnight test (fine vs coarse
  ticks produce identical calendar events while gameplay stays frozen); `pause.spec.ts`'s reload test
  (frozen wait survives a browser reload).

## Gotchas

- `menu.ts` does not implement menu pause — see the callout above. Don't grep `menu.ts` looking for
  the pause mechanic.
- `World.paused` can only be `true` while `World.active` is also `true` (`engine.ts:1083`) — it is a
  refinement, not an independent axis. The actual per-tick freeze gate is the private
  `gameplayPaused()` (`engine.ts:186-189`), which ORs `!active` (shift-lifecycle's hidden/offline
  case) with `!!paused` (this file's case) — a change to the freeze condition touches both features at
  once; re-verify both files' Existing proof if you touch `gameplayPaused()`.
- Old persisted logs recorded before `MENU_PAUSE_RULES` (`16`) never carry a `paused` field; replaying
  one that somehow does throws `replay:rulesVersion` (`engine.ts:696`) rather than silently accepting
  it — a version-gated replay guard, not a soft default.
- `restock`'s dish allowlist (`engine.ts:1091`) is a genuine security-relevant gate, not incidental
  validation — it's what stands between a crafted `dish:'__proto__'` command and `w.inventory` being
  indexed by an attacker-chosen string. Don't weaken it to "any string, cost 0" when adding a new dish.
- `DISHES` order is whatever `Object.keys(seed.menu)` yields — don't assume alphabetical or
  station-grouped order when iterating for UI or reports.

## Related

[keg-refill](keg-refill.md) (`restock(dish:'bia')` and the keg's own capacity/batch mechanic — the
sixth dish, split out because its production path is entirely different from the other five),
[shift-lifecycle](shift-lifecycle.md) (`activity.active` hidden/offline pause, the sibling half of
`gameplayPaused()`), [order-rounds-kitchen](order-rounds-kitchen.md) (`dish_ordered`/`dish_wasted`
emit sites and kitchen-level unlock gating this file only reports on, doesn't own),
[economy-k-ledger](economy-k-ledger.md) (`serveValueStats`'s money/`k` formula, consumed but not
redefined here), [flyer-signboard-dog](flyer-signboard-dog.md) (`activateFlyer` proved safe mid-pause
by the same `menu-pause.test.ts` test this file cites).

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 A5 | Cite UI clarity, first-open asset preload and active-rest ETA regression; no engine/config rule changes. |

| 2026-09-16 A2 | Cite direct HUD full-beer purchase in local and real-server UI; raw empty is distinct from ready/batch reserve. Balance targets remain OPEN in docs/improve-a2-stock.md. |
| 2026-10-23 | Founder 2026-10-22, Part B2.5 (UI only): the shift book's dish table sits under "Chi tiết" (collapsed) and shows no row for a dish that is still locked (`c.menu[dish].unlock.kitchenLevel` above the kitchen level and no count); `menuReport()` itself still returns every dish. Proof under Existing proof. |
| 2026-10-23 | Founder 2026-10-22, Part B2.7 (UI only): the stock sheet's rows have two secondary buttons (`bulk`, `full`) with price chips and one reason each when dimmed; the `one` mode stays in the engine and in the UI only as the fallback shown when neither button is affordable. Proof under Existing proof. |
| 2026-10-23 | Founder 2026-10-23 (B2.8 second pass, UI only): the one-tap beer prompt (`stock.quickBeer…`) moved from under the stall into the message slot above the nav (same region name, status line and button, so `quick-beer-stock.spec.ts` and `remote-test/quick-beer-stock.spec.ts` read it unchanged); the first time the stock hint speaks it takes the prompt's text line. |
