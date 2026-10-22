# Glass & beer freshness (03-SPEC-he-ban.md §8 "Freshness vs Order", §9.1/§9.4; 02-GDD §6 "Bia mất hơi"; 08-SPEC §7/§8.1)

02-GDD §6 documents two freshness layers: **Tầng 1** (per-glass-on-tray, implemented — this file) and
**Tầng 2** (per-keg-reserve, `kegFreshnessMs`, marked 🔵 optional) — grep-confirmed **not
implemented**: `freshness.kegFreshnessEnabled`/`kegFreshnessMs`/`warnMs`/`staleConsequence` in
`docs/config/economy.tbh.json` are dead config, zero reads anywhere in `packages/engine/src` or
`apps/web/src`. Don't assume flipping them does anything at runtime.

## Observable contract

- `Glass` (`packages/engine/src/types.ts:19-22`): `{id, state: 'clean'|'in_use'|'dirty'|'washing',
  itemId, readyAt, staleEmitted, startedAt?}`. **There is no `'stale'` glass state** — staleness is
  the orthogonal boolean `staleEmitted` on an otherwise `'in_use'` glass, surfaced via the
  `glass_stale` event; the glass's own `state` never changes because of it.
- `World.glasses: Glass[]` (`:80`); `World.beer?: {ready, batch}` (`:81`, the keg-reserve inventory —
  only present when `keg.refillEnabled`, i.e. the modern/batch economy).
- `Result.outcome` includes `'stale'` (`types.ts:126`), set when `anyStale` across the served order's
  customers — see [serve-outcomes](serve-outcomes.md) for the full precedence rule (`'stale'`
  overrides `'grace'`/`'early'`/`'late'`, never stacks with them).
- `ServeRecord.stale: boolean` (`types.ts:25`), persisted per-customer in `World.serves`.
- Events: `glass_stale` (`engine.ts:383`), `glass_washing`/`glass_washed` (`:670/367`),
  `glasses_bought` (`:1040`), `beer_pouring`/`beer_poured` (`:640/377,641`), `beer_batch_started`/
  `beer_batch_ready` (`:658/373`), `beer_initial_fill` (`:817`, shift-start auto-fill from existing
  inventory), `restocked` (`:912`), `upgrade_bought` (`:919`).
- `freshnessMs(w, c)` (`rules.ts:64-67`): `base = c.values.upgrades.cooler.freshnessMs[cooler-1]`
  (`[12000, 20000, 35000, 60000, null]` ms by level — `null` → `Infinity`, i.e. never goes flat at
  max cooler), × `weather[shift.weather ?? 'sunny'].freshnessMult`.
- `customerValue(...)` (`rules.ts:69-84`): `stale = items.some(i => i.glassId !== null && now >=
  glass.readyAt + freshnessMs)`; tip is zeroed when stale, `reputation.staleGlass` (−1) applies once.
- `beerStatus(w,c)` (`production.ts:5-17`) → `{pouring, tapSlots, pourMs, enabled, available,
  reserved, stored, capacity, batchSize, durationMs, busy, remainingMs, progress}`. `stored` means
  different things per economy mode (see Gotchas).
- DOM/aria: equipment buttons `aria-label={t('equipment.keg'|'washer'|'cooler')}`; cooler badge shows
  literal `∞` when `!Number.isFinite(freshnessMs(...))`; order panel shows `<p
  className="order-warning">{t('order.stale')}</p>` = "Flat beer · no tip" — **the Serve button is
  only `disabled={!ready}`, never disabled by staleness** (`App.tsx:487`), a stale-but-ready order can
  still be served deliberately. Glass sprite class `glass-stale` vs `glass-full`
  (`App.tsx:304`). `.customer-reaction` shows `😖` for a stale outcome.

- **Rules 28 (S2 `eco21-instant-pour`):** on a seat-model snapshot with the keg refill on the glass of a beer is `in_use` with `readyAt` = the tick the order is placed, so freshness starts on the tray at once; `beer_pouring` and `beer_poured{fromReserve:true}` carry that tick. A beer waits only for `beer.ready` (cause `beerStock` / `beerRefill`) or for a clean glass (cause `glasses`); the `tap` wait is gone. Capacity pins, rules ≤ 27 and a seat snapshot with `refillEnabled=false` keep `readyAt = now + pourMs`.

## How to reach it

- Engine: `prepare()` (`engine.ts:607-662`) pulls a `'clean'` glass for a `needsGlass` item, sets
  `state='in_use'`, `readyAt=now+pourMs`, `staleEmitted=false` (`:619-625`), decrements
  `w.beer.ready` (modern) or `w.inventory.bia` (legacy). `processDue()` flips the item to `'ready'`
  at `readyAt` (`:375-379`), then on later ticks checks `now >= glass.readyAt + freshnessMs(...)` and
  emits `glass_stale` once (`:382-383`). `serve` (`engine.ts:856-893`) **recomputes staleness live**
  via `customerValue` at serve time — not from the cached `staleEmitted` flag, which is bookkeeping
  for event de-duplication only.
- Keg refill: no dedicated command — `{type:'restock', dish:'bia', mode:'bulk'|'full'|'one'}`
  (`engine.ts:908-913`) tops up `w.inventory.bia`; `prepare()` auto-converts inventory into
  `w.beer.batch`→`w.beer.ready` when `keg.refillEnabled` (`:650-661`). `startShift` also auto-fills
  the keg once from existing inventory (`beer_initial_fill`, `:813-818`).
- Glass restock: `{type:'buyGlass', count}` (`:1035-1042`) adds `'clean'` glasses up to
  `min(buyCap, storageCap)`.
- `{type:'upgrade', kind:'cooler'}` raises `w.equipment.cooler`, immediately extending `freshnessMs`
  for glasses already poured — it's read live off current equipment, not snapshotted per-glass.
- UI: tap the cooler/keg/washer sprite → production detail sheet; "Restock" nav → beer stock row →
  `+1`/`+n`/"Fill stock" → sends `restock`. Table order panel's `Phục vụ cả mâm` button sends `serve`
  regardless of whether the `order.stale` warning is showing.
- Remote mode: identical commands through `POST /player/command` — no shape difference.

## Existing proof

- `packages/engine/test/production.test.ts` (8 tests): `'level one fills five servings before any
  customer and refills the vacancy as a glass leaves for service'`, `'a table larger than the tank
  assembles across batches without overflowing storage or double-consuming stock'`, `'a partial raw
  stock starts immediately; restocking and a live upgrade cannot advance or resize the paused
  batch'`, `'a wash batch takes only its level capacity, keeps new dirty glasses queued and preserves
  timing through upgrade and pause'`, `'the actual v17 paused save replays exactly and adopts enabled
  batches only at its next config pin'`, `'batch capacity, units and deadlines reject fractional,
  oversized or invalid config'`, `'an upgraded tank holds forty servings independently of the reusable
  glass pool, and reserve freshness waits for the tray'` (asserts `glass_stale` count is 0 for
  reserve-held beer not yet on a tray), `'a legacy wash without a start timestamp keeps its real
  deadline and reports indeterminate progress'`.
- `packages/engine/test/game.test.ts`: `'first guest gets one customer and one beer, with auto pour,
  a single serve and auto wash'`, `'flat beer keeps payment and has only one reputation penalty even
  when late'` (the core soft-fail pin: `outcome:'stale'`, reputation 10→9, `tip===0`, payment kept),
  `'local save reload exactly replays the running order, finances and glass ownership'`, `'hidden
  time freezes pending orders and freshness while preserving real calendar time and replay'`,
  `'restock uses full bulk packs plus retail remainder and never overfills'`.
- `packages/engine/test/economy2.test.ts`: `'a new shift fills real reserve, pours through its one
  tap and starts refilling the vacancy immediately'`, `'glass purchases respect owned capacity, exact
  price, pause and retry identity'`.
- `packages/engine/test/kitchen.test.ts` — `'a partial hot-food order is refused and its whole ready
  mâm can still be served with stale beer'` (shared with order-rounds-kitchen).
- `packages/engine/test/quests.test.ts` — `'stale beer does not satisfy fresh beer or tip quality,
  and blocked claims never mutate balances'`.
- `packages/engine/test/rush-clock.test.ts` — `'closing ends the current rush on time, prices the
  boundary serve normally and never starts a later rush'` (incidental `outcome:'stale'` at a
  rush-boundary serve).
- `packages/engine/test/live-upgrades.test.ts` — `'live upgrade refusals describe real funds or
  maximum level and cannot debit a customer shift'` (keg upgrades to max level during a live/paused
  shift).
- `packages/engine/test/config-pinning.test.ts` — `'a published candidate cannot reprice a running
  shift; the next opening preserves assets and adopts its duration, capacity and real pour/serve
  price'` (`beer_batch_started`→`beer_batch_ready` timing equals `keg.refillMs[level]` across a
  config repin).
- `packages/engine/test/menu-pause.test.ts` — `'a present player can restock, claim the real calendar
  day and activate a flyer while gameplay remains frozen'` (restocks `'bia'` mid-pause; asserts prep
  clocks freeze — does not directly assert a glass's own freshness deadline specifically, see
  Uncovered).
- `apps/web/test/production.spec.ts`: `` `stocked beer capacity and upgrade comparison update live,
  with frozen batch progress in menus at ${width}px` `` (×2 widths — cooler freshness badge, cooler
  comparison card, keg reserve badge/progress, keg upgrade pausing batch progress, restock "Buy keg"
  button), `'legacy washing shows an indeterminate bar in the yard and paused equipment panel'`,
  `'reload immediately after a completed beer batch warns while its save is pending and preserves
  the batch'`, `'washer, cooler and counter upgrade cards show their own per-level draft sprites'`.
- `apps/web/test/game.spec.ts`: `'mixed customers retain their urgent identity and a live grace
  countdown when beer is out'` (fixture zeroes raw stock, not the keg reserve specifically — see
  Uncovered), `` `multi-dish service shows the actual ${mode} reward and guest reaction` `` mode
  `'stale'` — fixture forces staleness via the real `freshnessMs(game.world, game.config)` function,
  asserts the `😖` reaction renders and persists across reload.

- Rules 28 instant pour (S2): `packages/engine/test/instant-pour.test.ts` `one tap, one pair: both beers are ready the tick the order is placed (beer.ready >= n and clean glasses >= n)` (glass `in_use`, `readyAt` = the order's tick, `itemId` of the item), `beer in the keg but no clean glass: the second beer waits for a glass, and a bought glass pours it that very tick` (cause `glasses`, `buyGlass` pours the waiting beer in the tick of the purchase) and `beer.ready exhausted: the order waits, a restock starts the batch, and the beer is ready the tick the batch lands` (cause `beerStock` → `beerRefill`). Run `node --import tsx --test packages/engine/test/instant-pour.test.ts`.
- **Founder 2026-10-22, Part B1.3 (JSON 2.1.4, `onboarding.firstShift.staleDisabled`): no flat beer in shift 1.** `freshnessMs()` is Infinity while `shift.onboarding` and `completedShifts` 0 (the existing `∞` path of the top cooler), so `nextDue`, `processDue`, `customerValue` and the App badges all agree. `packages/engine/test/early-pacing.test.ts` — `B1.3 no flat beer in shift 1: a beer left 15 s on the tray is served fresh (no glass_stale, no stale serve, no stale reputation); from shift 2 the same wait makes it flat` · `B1.3 a pin without the key (JSON 2.1.3): the first beer of a new save left 15 s goes flat, as before`; UI `apps/web/test/economy2.spec.ts` `JSON 2.1.4 in shift 1 of a new save beer never goes flat: the cooler badge reads ∞, while its sheet still states the level's own seconds`. `game.test.ts` `flat beer keeps payment and has only one reputation penalty even when late` and `economy2.spec.ts` `cooler explains each level and weather-adjusted HUD seconds in …` (fixture `cooler-*`) switch the rule off as an input: their subject is what a flat beer costs and the cooler's own seconds.

## Verification procedure

- `node --import tsx --test packages/engine/test/production.test.ts packages/engine/test/game.test.ts
  packages/engine/test/economy2.test.ts packages/engine/test/kitchen.test.ts
  packages/engine/test/quests.test.ts` (or `npm test`).
- `npx playwright test apps/web/test/production.spec.ts apps/web/test/game.spec.ts` (or `npm run
  test:e2e`).
- `npm run sim:onboarding` / `npm run sim` — `packages/engine/sim/headless.ts:66` reports a `stale:
  w.serves.filter(e=>e.stale).length` column alongside `k` per row; keep an eye on it for any
  freshness-mechanic change (it can move measured k).

## Uncovered paths

- **Keg-empty blocking pouring is not directly tested at the engine level.** `prepare()` gates on
  `w.beer?.ready ?? 0 <= 0` (modern) / `w.inventory[dish] <= 0` (legacy) at `engine.ts:616`, but no
  test sets the reserve to `0` mid-shift with a pending beer item and asserts it stays `'pending'`.
  Only indirect UI coverage exists (`game.spec.ts`'s "beer is out" test zeroes **raw starting
  stock**, not the keg reserve specifically after it's been drawn down). **Covered for the seat model since S2:** `instant-pour.test.ts` `beer.ready exhausted: the order waits, a restock starts the batch, and the beer is ready the tick the batch lands` draws the reserve down through real orders and asserts the pending items, the `beerStock` cause and the pour in the tick `beer_batch_ready` lands.
- **Max-cooler "never goes flat" is asserted only at the formula level, not end-to-end.** No test sets
  `equipment.cooler` to max, holds a poured glass far past any finite threshold, and asserts `serve`
  still returns `outcome !== 'stale'`.
- **The soft-fail consequence triad (tip×0 + reputation−1 + payment-kept) is pinned together in
  exactly one test** (`game.test.ts`'s "flat beer keeps payment..."). No other test re-derives
  payment staying nonzero specifically *because of* staleness, isolated from lateness.
- **Menu-pause freezing a glass's own freshness deadline specifically** isn't directly asserted —
  `menu-pause.test.ts` only checks an item's prep clock (`readyAt`) freezes. Coverage is structural
  (glasses share the same pause-timer shift as everything else, `engine.ts:255-258`), not a named
  assertion for glasses.
- **Legacy (non-batch) direct per-glass pour hitting zero raw stock mid-pour-slot-contention** is not
  directly asserted — only the modern/batch path and the "empty at shift start" paths are tested.
- **Multi-glass mixed-staleness combos** (some glasses in an order stale, others fine, combined with
  the order also being late/grace) aren't exercised beyond the single-glass "even when late" test.

## Variants

- **success** — served before `readyAt + freshnessMs`: `outcome ∈ {early,late,grace}`, tip intact per
  patience.
- **stale** — served after: `outcome:'stale'`, `tip:0`, `reputation -= 1`, payment kept — see Existing
  proof.
- **empty** (stock/keg) — raw `inventory.bia = 0` blocks pouring, order stalls; engine-level direct
  proof of the mid-shift keg-reserve-empty case is missing (see Uncovered).
- **capacity** — glass purchase capped at `min(buyCap, storageCap)` (`reason:'glassCapacity'`); keg
  tank capped at `kegStorage[level]`.
- **duplicate/idempotent** — repeat `buyGlass` with the same key is a no-op; repeat `serve` on an
  already-served order is a no-op.
- **time-jump / offline-reconnect** — hidden/paused time shifts every relevant deadline (glass
  `readyAt`/`startedAt`, beer batch `startedAt`/`readyAt`) forward by the elapsed pause so relative
  remaining time is unchanged (`engine.ts:229-263`, esp. `:255-258` for glasses).
- **persistence** — every cited engine test round-trips `decodeSave(encodeSave(g))` including
  glass/beer state.
- **reason** — `'glassCapacity'`, `'invalidQuantity'`, `'invalidCost'`, `'notEnoughCoins'`,
  `'stockOrCoins'`, `'dishLocked'`, `'maxLevel'`, `'orderNotReady'`.
- **cancel** — not applicable: no explicit "cancel pour" command exists, only whole-order cancel via
  `kickAll`/expiry, which routes through `releaseGlasses`.

## Gotchas

- `Glass.state` has **no `'stale'` value** — model staleness as the `staleEmitted` boolean +
  `glass_stale` event, the glass itself stays `'in_use'`.
- Staleness is recomputed **live at serve time**, independent of whether `glass_stale` already fired
  — `staleEmitted` is event-dedup bookkeeping, not the source of truth `serve` reads.
- The top-level `freshness` config namespace (`baseMs`/`warnMs`/`kegFreshnessMs`/
  `kegFreshnessEnabled`/`staleConsequence`/`expiredOrderGlassState`) is **documentation/registry-only
  — dead at runtime.** The real mechanic reads `upgrades.cooler.freshnessMs` and hardcodes both the
  consequence (the tip ternary in `rules.ts`, `reputation.staleGlass`) and the expired-glass state
  (`engine.ts:489` hardcodes `'dirty'`). Flipping `kegFreshnessEnabled`/`staleConsequence.postmvp`
  does nothing today.
- "Keg" is not one command — it's `restock(dish:'bia')` + automatic `prepare()`-driven batching +
  `upgrade(kind:'keg')`. There is no `refillKeg`/`restockKeg` command name.
- Two economy modes coexist: legacy (`refillEnabled:false`, direct per-glass pour from
  `w.inventory.bia`) and modern/batch (`refillEnabled:true`, tank reserve `w.beer.ready`+`w.beer.batch`).
  Check which base a test/fixture uses before assuming keg behavior.
- `beerStatus().stored` means different things per mode: modern = tank reserve (`available`); legacy
  = items currently reserved/poured-onto-trays (`reserved`) — same field name, different semantics.

## Related

[table-lifecycle](table-lifecycle.md) (`releaseGlasses()`/`clean()`/`lose()` return glasses to
`'dirty'` on table-cycle-end or expiry), [order-rounds-kitchen](order-rounds-kitchen.md) (`prepare()`
is shared machinery for beer pouring and kitchen dishes), [serve-outcomes](serve-outcomes.md)
(`'stale'` is the reified freshness-override tag in `Result.outcome`'s precedence chain — read that
file for the full combine rule), [economy-k-ledger](economy-k-ledger.md) (`credit`/`creditBatchSafe`
still fire on a stale serve; `headless.ts` tracks the `stale` count alongside `k`).

## Changelog — S2 instant pour
| Date | Change |
|---|---|
| 2026-10-20 | S2 rules 28: instant pour (a seat-model game pours a ready beer into a clean glass in the tick of the order, freshness starts then); tests cited under Existing proof. No number changed. |
| 2026-10-23 | Founder 2026-10-22, Part B1.3 (JSON 2.1.4): no glass goes flat in the onboarding shift (`onboarding.firstShift.staleDisabled`); the cooler badge reads ∞ there. Pins <= 2.1.3 unchanged. STOP: `sim:balance` + `sim:career:gate` red on this label, waiting for the founder (08-SPEC changelog 2026-10-23 / JSON 2.1.4). |
