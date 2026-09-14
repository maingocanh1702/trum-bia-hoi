# Flyer, signboard & dog (`docs/features/F18-dog-guard.md` §2-3; `docs/config/economy.tbh.json` `unlocks.flyer`/`signboard`/`dog` blocks)

## Dog: only the purchase/upgrade half of F18 is built

F18-dog-guard.md's scope (§1) is "Buy dog. Upgrade dog. Turn-based combat versus gangster. Offline
theft protection." — four items. Only the first two exist in code. **Grep-confirmed zero hits** for
`gangster`, `capturedUntil`, or `BattleReplayStep` anywhere in `packages/engine/src`, `apps/web/src`,
or `apps/server/src` — F18 §4's combat/capture data model (`DogState.hp/atk/capturedUntil`,
`BattleReplayStep`) has no runtime counterpart. The config JSON still carries the Phase-3 fields
(`dog.levels[].hp`/`.atk`, `dog.capturedMs`, `dog.theftReductionByLevel`, `dog.phase: 3`) — `hp`/`atk`
are even structurally validated (`config.ts:175`, `whole(dog.hp, ...)`) — but no `rules.ts`/`engine.ts`
function ever reads `theftReductionByLevel` or `capturedMs`, and `dogUpgradeQuote` (below) only
consumes `level`/`coinBase`/`materials`. Treat the combat/theft layer as owner-deferred config
scaffolding, not a bug or an oversight to "finish" incidentally while touching purchase/upgrade code.

## Observable contract

- `World.dogLevel: number` (`types.ts:84`, starts at `0` = no dog), `World.flyers?: number`
  (`:85`, stock count), `World.signStyle?: SignStyle` (`:85`), `Shift.flyersUsed?: number` /
  `Shift.flyer?: {start, end, eventStart}` (`types.ts:43`, the active-campaign window).
- `flyerQuote(w, c)` (`packages/engine/src/flyer.ts:6-14`) → `{stock, cost, used, requirement,
  buyReason, useReason, remainingMs}`. `buyReason ∈ {'featureLocked', 'flyerStockInvalid',
  'flyerStockFull', 'reputationRequired', null}`; `useReason ∈ {'flyerOpenShift', 'featureLocked',
  'flyerActive', 'flyerUsed', 'flyerEmpty', 'flyerClock', null}` — two independent reason spaces for
  buy vs. activate, don't conflate them.
- `signboardStyle(w, c)` (`signboard.ts:4-6`) → the currently-equipped style's config definition, or
  `undefined` if `signboard` isn't unlocked. `signboardQuote(w, c, style?)` (`:8-16`) → `{installed,
  target, owned, selected, cost, requiredRep, requiredStall, reason, ok}`; `style === null` means "the
  initial install" (always targets `'wood'`), a non-null `style` means "switch to/buy this style".
  `reason ∈ {'signboardInstalled', 'signboardRequired', 'signboardGate', 'signboardSelected',
  'reputationRequired', 'notEnoughCoins', null}`.
- `dogUpgradeQuote(w, c)` (`rules.ts:58-63`) → `{next, materials, cost, ok}`; `next` is the config row
  for `dogLevel + 1` (`null` at max level), `materials` is `[{dish, quantity, have}]` sourced from
  `w.inventory`, `cost` is `null` at max level (distinct from `0`).
- Events: `flyer_bought` (`engine.ts:968`, `{cost, stock, reputationBefore, reputationAfter}`),
  `flyer_started` (`:977`, `{shiftId, until, stock, used}`), `flyer_ended` (`:322`, `{shiftId, reason,
  startedAt, endedAt, activeMs, ...summarizeRush(...)}` — reuses the rush-campaign summarizer, see
  [rush-weather](rush-weather.md)), `signboard_installed` / `signboard_equipped` / `signboard_bought`
  (`:988`, one of the three depending on `installSignboard` vs. `setSignboard`-owned vs.
  `setSignboard`-unowned), `dog_bought` / `dog_upgraded` (`:999`, split on `fromLevel === 0`,
  `{fromLevel, toLevel, cost, material_<dish>: quantity, ...}` — one flattened key per material, not
  an array).
- `Result.reason` values unique to this file: `'flyerStockInvalid'`, `'flyerStockFull'`,
  `'flyerOpenShift'`, `'flyerActive'`, `'flyerUsed'`, `'flyerEmpty'`, `'flyerClock'`,
  `'signboardInstalled'`, `'signboardRequired'`, `'signboardGate'`, `'signboardSelected'`,
  `'dogLevelChanged'`, `'maxLevel'` (shared with equipment upgrades — see
  [upgrades-equipment-tables](upgrades-equipment-tables.md)), `'dogMaterials'`.
- DOM/aria/i18n (`apps/web/src/i18n/vi.json`): dog uses key prefix `dog.*` (`dog.buy`: "Đón chó ·
  {cost} xu", `dog.upgrade`: "Nâng cấp · {cost} xu"). Flyer uses `flyer.*` (`flyer.buy`: "Mua 1 tờ ·
  −{cost} ⭐", `flyer.use`: "Phát tờ rơi"). **Signboard's i18n prefix is `sign.*`, not
  `signboard.*`** (`sign.install`: "Lắp biển Gỗ · {cost} xu", `sign.buy`: "Mua & treo · {cost} xu",
  `sign.equip`: "Treo biển này") — a real naming drift vs. the source-file/config/event name
  `signboard`; grepping literal "signboard" in the i18n files finds nothing.

## How to reach it

- Commands (`Command` union, `types.ts:97-121`): `{type:'buyFlyer'}`, `{type:'activateFlyer',
  shiftId}`, `{type:'installSignboard'}`, `{type:'setSignboard', style}`, `{type:'upgradeDog',
  level}`. Handlers: `case 'buyFlyer':` (`engine.ts:962-970`), `case 'activateFlyer':` (`:971-979`),
  `case 'installSignboard': case 'setSignboard':` — **one shared handler for both** (`:980-990`,
  branches on `cmd.type`), `case 'upgradeDog':` (`:991-1004`).
- Envelope-shape validation (`validReplayEnvelope`, `engine.ts:1066-1094`, distinct from the
  business-rule `buyReason`/`useReason`/`ok` checks above): `installSignboard`/`buyFlyer` need no
  extra fields (`:1075`); `activateFlyer` requires a non-empty string `shiftId` (`:1081`);
  `setSignboard` requires `c.style` to be in the `SIGN_STYLES` allow-list (`:1089`); `upgradeDog`
  requires a positive safe-integer `level` (`:1090`, and the handler separately re-checks
  `cmd.level === w.dogLevel + 1` at `:992` — a sequential-level guard, not just positivity).
- `upgradeDog`'s `dogLevelChanged` guard (`:992`) means the client must always request
  `w.dogLevel + 1`, never an arbitrary target level or a skip-ahead — this is a stricter,
  replay-style contract than a plain "can I afford this" check.
- `installSignboard` vs `setSignboard`: the FIRST purchase is always `installSignboard` (implicitly
  targets `'wood'`, pays `installFeeBase + styles.wood.priceBase`); every subsequent style
  change/purchase is `setSignboard` (owned styles re-equip for `0` cost, unowned styles pay
  `styles[style].priceBase` plus any `repBase` gate). Both commands share one handler but are
  materially different economic events — don't treat `setSignboard` as always-free.
- UI: dog — `dog.open` nav → dog sheet → `dog.buy`/`dog.upgrade` button → `upgradeDog`. Signboard —
  `sign.open` nav → sign sheet → `sign.install` (first) or a style card's `sign.buy`/`sign.equip` →
  `installSignboard`/`setSignboard`. Flyer — `flyer.open` nav → flyer sheet → `flyer.buy` →
  `buyFlyer`; `flyer.use` → `activateFlyer`. Both local and remote mode route through the same
  `run(cmd)` dispatcher (`App.tsx:165-174`) — no divergent logic for this feature area.

## Existing proof

- `packages/engine/test/flyer.test.ts` (8 tests): `'flyers spend exact reputation once, refuse full
  stock and preserve coin ledgers and acquired ownership'`, `'campaign consumption checks the current
  shift, activity, stock and configurable per-shift usage'`, `'every weather and rush combines flyer
  demand once; pending arrival and seated patience stay intact'` (interaction with
  [rush-weather](rush-weather.md)'s demand multiplier), `'hidden time preserves campaign duration;
  reports end once before boundary events and survive closing'`, `'campaign reports measure actual
  seated service and losses, not capped-away tips or delivery credit'`, `'a campaign ending exactly
  before a ready table is served excludes that service and preserves its pending arrival'`, `'flyer
  intake rejects unsafe values and progression cycles; historical shift ledgers cannot block a resting
  purchase'`, `'genuine rules10 weather and neon histories replay unchanged through current adoption
  and autonomous ticks'` (real legacy-save replay, cross-references the `neon` signboard style's
  effect on a rules10-era save).
- `packages/engine/test/signboard.test.ts` (10 tests): `'a stall earns its wooden sign at the exact
  gate; installation spends once and records LP ownership'`, `'golden reputation is checked at
  purchase, never spent; owned styles switch free even after reputation falls'` (the
  `repBase`-is-a-gate-not-a-cost proof), `'buying signs in a live shift leaves guests and timers
  intact; neon changes the next scheduled shipper interval'` (the neon→shipper-interval cross-effect —
  see [spawn-queue-seating](spawn-queue-seating.md) for the shipper mechanic itself), `'five owned
  styles and free re-equips replay exactly; only coin purchases enter spent'`, `'real v8 delivery and
  rush saves retain all recorded fields before and after their first current command'`, `'actual
  seeded arrivals follow every sign style and preserve the VIP group cap'`, `'sign configuration
  rejects unsafe costs, weights and zero-tick delivery frequency before play'`, `'vintage cannot
  remove the last eligible customer type after a group reaches its VIP cap'`, `'both registry
  signboard gate names must agree, and a synchronized override reaches installation'`, `'a real closed
  shift does not block an affordable sign purchase near the safe-integer limit'`.
- `packages/engine/test/dog-purchase.test.ts` (5 tests): `'an LP0 stall buys and grows the same dog
  with scaled coins and unscaled ingredients, then replays exactly'` (the `coinBase` is `k`-scaled,
  `materials` quantities are not — a real scale-vs-no-scale asymmetry worth citing on any economy
  change here), `'short stock or coins never causes a partial debit and no level can be skipped or
  bought twice'`, `'purchase checks stock after live preparation and uses the existing active-shift
  spend ledger'`, `'dog costs and materials follow validated snapshots, and reject unsupported
  ingredient mappings'`, `'an actual pre-dog save retains its recorded commands and events and starts
  without a dog'`.
- `apps/web/test/game.spec.ts` (×3 viewports each; no dedicated `flyer.spec.ts`/`signboard.spec.ts`/
  `dog.spec.ts` exists under `apps/web/test/` — only fixture generators at
  `apps/web/test/fixtures/{flyer,signboard,dog}.ts`):
  `` `dog purchase has a reachable stock path, three sprites and exact reload at ${viewport.width}×${viewport.height}` ``
  (line 439, viewports `360×740`/`1280×720`/`1280×400` — actually drives a pending-*delivery*-penalty
  toast alongside the dog fixture, i.e. this test doubles as partial
  [spawn-queue-seating](spawn-queue-seating.md) coverage),
  `` `business sign installation, ownership, reputation gate and live yard at ${viewport.width}×${viewport.height}` ``
  (line 619, viewports `360×740`/`390×844`/`1280×400`, asserts exactly 2 `signboard_bought` events and
  the golden-style `requiredRep`/`cost` pair by reading `saved.events` directly),
  `` `flyer purchase, live timer, actual service report and reload at ${viewport.width}×${viewport.height}` ``
  (line 659, same 3 viewports).

## Verification procedure

- `node --import tsx --test packages/engine/test/flyer.test.ts packages/engine/test/signboard.test.ts
  packages/engine/test/dog-purchase.test.ts` (or `npm test` for the full suite — bare `tsx` is not
  guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/game.spec.ts` (or `npm run test:e2e`) — runs all three
  viewport-matrix tests above alongside the rest of the file; there is no way to run just these three
  without also running the other ~19 `game.spec.ts` tests.
- `npm run check:config` before touching `dog.levels[]`, `signboard.styles{}`, or
  `unlocks.flyer.{repBase,campaignMs,stockCap,perShift}` in `docs/config/economy.tbh.json`.
- Manual fixture reproduction: `node --import tsx apps/web/test/fixtures/dog.ts` /
  `.../fixtures/signboard.ts` / `.../fixtures/flyer.ts` print the exact fixture JSON the e2e tests
  consume.

## Uncovered paths

- **F18 §4's combat/offline-theft-protection layer has zero implementation and zero tests** — not a
  gap in test coverage, a gap in the feature itself (see the drift section above). Don't write a test
  for `capturedUntil`/gangster combat without first confirming the mechanic has actually been built.
- **`dog.theftReductionByLevel` and `dog.capturedMs` are dead config** — grep-confirmed zero reads in
  `packages/engine/src` outside the raw config object; `dog.hp`/`dog.atk` are validated
  (`config.ts:175`) but likewise never read by any business logic. No test can or does exercise them
  functionally.
- **No test asserts `flyerQuote`'s `buyReason`/`useReason` by exact string for every value** — `'flyerClock'`
  (the `Number.isSafeInteger(w.now + campaignMs)` overflow guard, `flyer.ts:13`) has no dedicated
  test; the intake-rejection test covers unsafe *config* values, not an unsafe *runtime clock* value.
- **`signboardQuote`'s `'signboardGate'` reason (stall level below `signboard.gate.stallLevel`) is
  exercised only via the config-rejection test's boundary framing** — no test drives an actual
  under-leveled stall attempting `installSignboard` and asserts `reason === 'signboardGate'` by
  string.
- **The three viewport-matrix `game.spec.ts` tests are each single-scenario** (one golden path per
  feature) — none exercises a buy-refusal (insufficient coins/reputation/materials) through the UI;
  refusal proof exists only at the engine-test level.

## Variants

- **success** — `dog_bought`/`dog_upgraded`, `flyer_bought`/`flyer_started`, `signboard_installed`/
  `signboard_equipped`/`signboard_bought` — all engine-tested and each has one `game.spec.ts` golden
  path.
- **cancel** — not applicable: no explicit cancel command for any of the three; a flyer campaign only
  ends via `flyer_ended` (natural expiry or shift close), never a player-initiated stop.
- **reason** — extensive, see Observable contract's `Result.reason` list; `'flyerClock'` and
  `'signboardGate'` are defined but not string-asserted (Uncovered paths).
- **empty** — `flyerQuote`'s `'flyerEmpty'` (stock `=== 0` while trying to activate) is
  engine-tested; a `dogLevel === 0` "no dog" starting state is the default and is asserted by the
  pre-dog-save replay test.
- **persistence** — every cited engine test round-trips `decodeSave(encodeSave(g))`; the pre-dog and
  rules10-replay tests are dedicated legacy-save proofs for this feature area specifically.
- **capacity** — `unlocks.flyer.stockCap` (`5`) and `perShift` (`1`) are both engine-tested via the
  intake-rejection and stock-full paths.
- **duplicate/idempotent** — `dog-purchase.test.ts`'s "no level can be skipped or bought twice" test;
  `signboard.test.ts`'s "owned styles switch free" (re-buying an owned style doesn't re-charge).
- **stale** — not applicable to this feature area (no freshness/time-decay concept here).
- **time-jump** — `flyer.test.ts`'s hidden-time and campaign-boundary tests; `signboard.test.ts`'s
  hidden-delivery-time test.
- **offline-reconnect** — covered incidentally by the same hidden-time tests above; no test isolates a
  true network disconnect/reconnect for this feature area specifically (that's
  `disconnection.test.ts`'s scope).

## Gotchas

- Signboard's i18n key prefix is `sign.*`, the source files/config/events all say `signboard` — grep
  "signboard" in `i18n/*.json` and you'll find nothing; grep "sign." instead.
- `installSignboard` and `setSignboard` share one `case` block (`engine.ts:980`) but are not
  economically interchangeable — `installSignboard` always targets `'wood'` and pays the one-time
  install fee; only `setSignboard` can select a priced style or gate on reputation.
- `dog.levels[].materials` quantities are **not** `k`-scaled while `coinBase` **is** — confirmed by
  `dog-purchase.test.ts`'s first test title itself ("scaled coins and unscaled ingredients"); don't
  assume every `dog.*`/economy numeric field scales uniformly with `k`.
- `flyer_ended`'s payload reuses `summarizeRush()` from [rush-weather](rush-weather.md)'s module even
  though a flyer campaign is not a rush — the two features share a summarization helper, not a data
  model; don't infer a flyer campaign has `Shift.rushes`-style scheduling from this.
- `'maxLevel'` as a `Result.reason` is shared vocabulary with equipment upgrades
  (see [upgrades-equipment-tables](upgrades-equipment-tables.md)) — the same string means "no next
  dog level" here and "no next equipment level" there; don't assume a `'maxLevel'` failure in a log
  always means dog.

## Related

[spawn-queue-seating](spawn-queue-seating.md) (neon signboard style changes the shipper delivery
interval; the dog-purchase UI test also drives a shipper-penalty toast), [rush-weather](rush-weather.md)
(flyer demand combines with weather/rush per `flyer.test.ts`'s third test; `flyer_ended` reuses
`summarizeRush()`), [upgrades-equipment-tables](upgrades-equipment-tables.md) (shares the `'maxLevel'`
reason string and the general "purchase a capability upgrade" shape), [economy-k-ledger](economy-k-ledger.md)
(`dog.levels[].coinBase` is `k`-scaled at config load; all three commands' `amount` return values are
plain `spend()`/`changeRep()` debits, not `credit()` — no ledger-inflation risk from this feature).
