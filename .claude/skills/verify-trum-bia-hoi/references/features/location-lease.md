# Location lease (`docs/features/F14-locations.md`; `docs/config/economy.tbh.json` `locations` block)

**Spec sketch vs. code diverge — code is ground truth.** F14 §2 sketches a `Lease` type:
`{locationId, startsAt, endsAt, prepaidRent, deposit, status: 'active'|'ended'|'broken'}`. The real
`World.lease` field (`packages/engine/src/types.ts:86-87`) is `{id, locationId, fallback, startedAt,
expiresAt, rent, deposit, forfeitOnEarlyLeave, expired?}` — every timestamp field is renamed
(`startsAt`→`startedAt`, `endsAt`→`expiresAt`, `prepaidRent`→`rent`), there is no `status` enum (an
optional `expired?: boolean` flag instead — absent/false = active), and `fallback` (the location to
revert to) has no spec counterpart at all. `'broken'` never existed in code.

## Observable contract

- `World.location: string` (`types.ts:90`) — the current location id, always a valid id from the
  active config's `locations.list` (or the config's `locations.fallback`).
- `World.lease?: {id, locationId, fallback, startedAt, expiresAt, rent, deposit,
  forfeitOnEarlyLeave, expired?}` (`types.ts:86-87`) — present only while a paid lease is active or
  awaiting its deferred deposit refund (see Gotchas).
- Events (all in `packages/engine/src/engine.ts`): `lease_started` (`:1026`, on `rentLocation`),
  `lease_left` (`:343`, on `leaveLocation` or an implicit early-leave triggered by renting
  elsewhere — payload carries `depositForfeited`/`refund`/`rent` inline), `lease_expired` (`:330`,
  natural expiry — payload has no refund field), `lease_deposit_refunded` (`:335`, fired
  **only** on the natural-expiry path, once the refund can actually be credited — see Gotchas).
- `Result.reason` values from `leaseQuote()`/`leaveLocationQuote()` (`packages/engine/src/locations.ts`):
  `'leaseChanged'`, `'leaseRefundPending'`, `'locationOutsideShift'`, `'rewardOverflow'`,
  `'locationConfigRequired'`, `'locationUnavailable'`, `'locationSelected'`, `'lifePathRequired'`,
  `'notEnoughCoins'`. **Separately**, `startShift`'s config-pin validation
  (`engine.ts:774-775`) has its own location-relevant fail-closed reason, `'configLocationMissing'`
  — fired when a newly-pinned config either changes the active lease's `fallback` id or drops the
  player's current `location` id from its `list` — don't confuse this with `leaseQuote`'s
  `'locationConfigRequired'` (a different reason, different function, different trigger: that one
  fires for a legacy/non-`economy2` config with no location list at all).
- UI (`Locations.tsx`): rental-quote sheet, early-move/leave button, historical-location display on
  a closed shift.

## How to reach it

- Commands (`types.ts:108-109`): `{type:'rentLocation', locationId, leaseId, maxCost}` —
  `case 'rentLocation':` (`engine.ts:1017-1028`); `{type:'leaveLocation', leaseId}` —
  `case 'leaveLocation':` (`engine.ts:1029-1033`). Both require the caller to echo back the
  `leaseId` a freshly recomputed quote returns (the *current* lease's id, or `null` if none) — a
  stale-quote guard identical in shape to `kickAll`'s; a mismatch fails `'leaseChanged'` before
  `q.reason` is even consulted.
- `rentLocation` implicitly leaves any existing lease first (`if (w.lease) this.leaveLease();`,
  `engine.ts:1022`) **before** creating the new one — moving to a different location is one command,
  and the old lease is forfeited/refunded under its own terms as a side effect, not a separate
  player action.
- `leaveLocationQuote(w)` (`locations.ts:5-11`) and `leaseQuote(w, config, locationId)`
  (`locations.ts:13-24`) are pure — the UI calls them to render the sheet before the player commits;
  `leaseQuote` gates on `isEconomy2(c)` (legacy configs have no `locations.list` at all).
- Natural expiry is autonomous: private `settleLease()` (`engine.ts:325-337`), called from **both**
  `advancePaused()` (`:225`, the offline/hidden-time catch-up path) and `processDue()` (`:348`, the
  normal active tick) — so a lease can expire whether the shift is running or the tab was hidden/
  closed the whole time.
- UI: `Locations.tsx` sheet → rent/quote card → confirm; early-leave button on an active lease;
  reload-persistent historical location label on a closed shift. Both local and remote modes send
  the identical `rentLocation`/`leaveLocation` envelope — no server-specific lease logic.

## Existing proof

- `packages/engine/test/locations.test.ts` — all 12 cases: `'rent prepays the configured lease days of scaled daily rents
  plus deposit once; a failed or stale move preserves the old contract'` (S5: `leaseDays` is 3 again (brief B5), so Ngo Cho is 9 000 rent + 2 250 deposit = 11 250 since round 2; it was `'… seven scaled daily rents …'`), `'early switch and
  departure forfeit old deposit and rent; expiry at the exact boundary refunds instead'` (the
  early-leave vs. natural-expiry refund-rule contrast — asserts the `lease_left` event's
  `depositForfeited` field), `'calendar expiry is identical under fine/coarse ticks while a
  customer menu or offline save pauses the shift'`, `'unpaused expiry during service uses the same
  calendar deadline, never the shifted gameplay clock'` (both exercise `settleLease()`'s two call
  sites), `'location LP and funds gates fail closed; in-shift movement is refused while equipment
  upgrades remain available'` (asserts `'lifePathRequired'`, `'notEnoughCoins'`, and
  `'locationOutsideShift'` — the last one twice, contrasted against an equipment upgrade command
  that stays allowed mid-shift — see [upgrades-equipment-tables](upgrades-equipment-tables.md)),
  `'a new config can reprice future leases but cannot change a signed contract or remove its
  fallback'` (matches `leaveLocationQuote`'s own doc comment, "Stored contract terms survive config
  changes"), `'an overflowing refund remains owed after expiry, blocks replacement, then settles
  exactly once when spending makes room'` (the deferred-refund mechanic — see Gotchas; asserts
  exactly one `lease_deposit_refunded` fires once `buyGlass` creates safe-integer headroom),
  `'configurable early refund uses stored terms and never counts returned principal as income'`
  (cross-link [economy-k-ledger](economy-k-ledger.md) — deposit refunds credit via the
  `'depositRefund'` source, excluded from earning ledgers), `'malformed identities, unsafe lease
  arithmetic and unknown command authorities cannot create contracts'` (asserts `'invalidCommand'`
  — the generic command-shape validator, `engine.ts:1076-1077`, not a `locations.ts` reason),
  `'the captured actual rules21 save replays unchanged and adopts leasing only on a current
  command'` (`LEASE_RULES` replay gate, `engine.ts:691`), `'a successful new pin moves an unleased
  player to its free fallback; failed opening never moves them'` (asserts `'restFirst'` too, but
  that's `startShift`'s unrelated stamina gate, only incidentally co-tested here — not a locations
  reason), `'a pin cannot turn the signed fallback into a paid location or accept an overflowing
  service multiplier'` (asserts `'configLocationMissing'` from `engine.ts:774`, plus a
  `config:locations.maximumService` load-time throw for an unsafe `mult`).
- `apps/web/test/locations.spec.ts` — 2 top-level tests, 5 runtime executions:
  `` `rental quote, early move, pause and reload at ${width}px in ${locale}` `` (`vi@360px`/`en@390px`
  — the `vi@360px` iteration clicks the early-leave button, `en@390px` lets the lease expire
  naturally instead; already cited in passing by
  [multi-system-journeys](multi-system-journeys.md)'s Uncovered paths, which marks lease early-exit
  UI "already covered, not a gap" — this file owns the full detail), `` `closed shift location stays
  historical after moving and reloading in ${locale} at ${width}px` `` (`vi@360px`/`en@390px`/
  `vi@1280px` — a past, closed shift keeps recording the location it was actually played at even
  after the player later moves elsewhere).
- `apps/server/test/shift-location.test.ts` (3 cases) — proof of `shiftLocationReport()`
  (`apps/shared/shift-location.ts`), the shared helper behind the historical-location display above:
  `'shift book retains the paid location after moving at rest, expiry and replay without changing
  state'` (a new lease/move never relabels an already-closed shift's location row), `'lease expiry in
  a paused shift shows both actual multipliers, using its pinned config'` (asserts the report is
  computed from the shift's own pinned `configVersion`, and refuses — returns `null` — when asked
  against a different config), `'missing shift provenance does not substitute the current location'`
  (no synthesized fallback when `world.events` carries no shift-open evidence). This is the shared
  (`apps/shared`) counterpart consumed by both server and web; `locations.spec.ts` above is the
  UI-tier proof of the same historical-location contract.

## Verification procedure

- `node --import tsx --test packages/engine/test/locations.test.ts apps/server/test/shift-location.test.ts`
  (or `npm test` for the full suite — bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/locations.spec.ts` (or `npm run test:e2e`).
- `npm run check:config` before touching `locations.leaseDays`/`depositRate`/
  `earlyLeaveLosesDeposit`/`fallback`/`list[].rentPerDayBase`/`gateLifePath` in
  `docs/config/economy.tbh.json` (9 locations today, multipliers 1.0–1.8 per F14 §3).

## Uncovered paths

- **`leaseQuote`'s own `'locationConfigRequired'`, `'locationUnavailable'` and `'locationSelected'`
  reasons are never asserted by exact string** (grep-confirmed: only `'leaseChanged'`,
  `'leaseRefundPending'`, `'locationOutsideShift'`, `'lifePathRequired'`, `'notEnoughCoins'`,
  `'configLocationMissing'`, `'restFirst'`, `'invalidCommand'` appear in
  `locations.test.ts`). Legacy/non-`economy2` mode's `'locationConfigRequired'` in particular has
  no direct test — the suite always runs against a modern config.
- **`'rewardOverflow'` from either quote function is never asserted here** — the file's overflow
  test (`'an overflowing refund...'`) exercises `'leaseRefundPending'` instead (the lock that
  prevents a *new* action while a refund is owed), not the safe-integer guard on the quote's own
  cost/refund arithmetic.
- **No test drives a second overflowing-refund cycle** — i.e. the deposit becomes owed, is
  refunded, then immediately becomes un-creditable again on the very next lease. Only a single
  defer-then-settle cycle is proven.
- **The implicit-leave-on-rent path (`engine.ts:1022`, renting while already leased) is exercised
  for the happy path only** — no test asserts what happens if the *new* rent's `spend(q.cost)`
  would itself overflow while the *old* lease's forfeited/refunded deposit is being settled in the
  same command.
- **`Locations.tsx`'s DOM/aria selectors are not documented here** — the web spec's exact button
  names/aria labels were not enumerated in this pass; open `apps/web/src/Locations.tsx` before
  relying on a specific selector.
- **Two of the 12 cited tests never call the file's `replay()` helper**: the deferred-refund test
  (`'an overflowing refund remains owed after expiry...'`, `locations.test.ts:98`) and `'malformed
  identities, unsafe lease arithmetic and unknown command authorities cannot create contracts'` — the
  former directly mutates and inspects `g.world.coins` in-memory, the latter only asserts rejections.
  Lease persistence for the deferred-refund-then-settle sequence specifically is unverified by replay.

## Variants

- **success** — `rentLocation`/`leaveLocation` both return `{ok:true, amount}` (cost or refund).
- **cancel** — not applicable: no distinct "cancel a pending quote" command: the UI just doesn't
  send the command.
- **reason** — extensive, see Observable contract; `'configLocationMissing'` is the one reason that
  lives outside `locations.ts` entirely (config-pin validation).
- **empty** — `leaveLocationQuote` on no active lease returns `{leaseId:null, refund:0, reason:
  'leaseChanged'}` — the same reason code as a stale-leaseId mismatch (an overload worth knowing
  when debugging a report of this reason).
- **persistence** — **re-corrected claim** (counted by the file's own `replay()` helper —
  `locations.test.ts:21`, `const replay = (g: Game) => assert.deepEqual(decodeSave(encodeSave(g))
  .world, g.world)` — not by a literal grep for `decodeSave`/`encodeSave` text, which misses calls to
  the wrapper): **10 of the 12** cited tests call `replay(...)`, including `'the captured actual
  rules21 save replays unchanged...'` (the dedicated legacy-replay proof). Only 2 do not: the
  deferred-refund test (`locations.test.ts:98`, `'an overflowing refund remains owed after
  expiry...'`, which directly mutates `g.world.coins` and checks values in-memory) and `'malformed
  identities, unsafe lease arithmetic and unknown command authorities cannot create contracts'` (a
  pure rejection/validation test) — see Uncovered paths for those two.
- **capacity** — not applicable (leases aren't stackable; renting replaces, it doesn't add).
- **duplicate/idempotent** — the stale-`leaseId`/stale-`maxCost` guard on `rentLocation` is the
  idempotency-adjacent protection here (a second identical command with an outdated quote fails
  `'leaseChanged'` rather than double-renting).
- **stale** — `'leaseRefundPending'` is exactly a staleness guard: it blocks a new lease/leave
  attempt while an old refund is still owed.
- **time-jump** — `'calendar expiry is identical under fine/coarse ticks...'` — `settleLease()`
  fires identically whether time advances in small ticks or one large jump.
- **offline-reconnect** — `'unpaused expiry during service uses the same calendar deadline...'` and
  the web spec's `en@390px` natural-expiry iteration — expiry uses real calendar time
  (`w.now`/`expiresAt`), never the paused/offline-shifted gameplay clock.

## Gotchas

- **The deposit refund on natural expiry is asymmetric with early leave.** `leaveLease()` (manual
  leave, `engine.ts:338-343`) credits the refund and emits `lease_left` with the refund/forfeit
  amounts **inline**, in the same command — no separate `lease_deposit_refunded` event. `settleLease()`
  (natural expiry) instead emits `lease_expired` **immediately** (location reverts to `fallback`
  right away, losing the benefit), but only credits the deposit and emits
  `lease_deposit_refunded` **once `Number.isSafeInteger(w.coins + lease.deposit)` holds** — if
  crediting would overflow safe-integer coins, the refund is deferred and re-checked on every
  subsequent `settleLease()` call, with `'leaseRefundPending'` blocking any new lease/leave attempt
  in the meantime.
- Two different reason strings look similar but come from different layers: `leaseQuote`'s
  `'locationConfigRequired'` (legacy config, no location list) vs. `startShift`'s
  `'configLocationMissing'` (a config pin invalidates an existing lease's `fallback` or the current
  `location` id) — same idea ("this config can't support where I am"), different code paths,
  different tests.
- Two unrelated "lease" concepts share the word in this codebase — this is the location-**rental**
  lease; `apps/server/test/presence.test.ts`'s lease/checkpoint language (e.g. `'restart and two
  stores retain exact lease frontiers...'`) is the server's session/presence lease, a completely
  different mechanism. [multi-system-journeys](multi-system-journeys.md)'s Gotchas already flags
  this exact trap — don't grep "lease" without disambiguating.
- `rentLocation` silently leaves the old lease as a side effect (`engine.ts:1022`) — a diff that
  only touches "renting" logic can still change early-leave forfeiture behavior for players who
  switch locations directly.

## Related

[economy-k-ledger](economy-k-ledger.md) (`credit(..., 'depositRefund')` — deposit refunds are
excluded from earning ledgers, not income), [upgrades-equipment-tables](upgrades-equipment-tables.md)
(equipment upgrades stay available mid-shift while location movement does not — the direct contrast
`locations.test.ts` draws), [stamina-attendance-lifepath](stamina-attendance-lifepath.md) (life-path
gates `leaseQuote`'s `'lifePathRequired'`; `startShift`'s unrelated `'restFirst'` stamina gate is
incidentally co-tested with the config-pin case above), [multi-system-journeys](multi-system-journeys.md)
(the lease-vs-presence-lease disambiguation; the reload-persistence UI journey).

## Changelog — S5 balance pass
| Date | Change |
|---|---|
| 2026-10-20 | S5 `eco21-balance-pass` (JSON 2.1.0): `locations.leaseDays` 7 → 3 (rent = 3 × the daily rent, deposit 25 % of it: Ngo Cho 37 500 coins, Ben Xe 63 750), `mult` becomes a ramp 1.0 → 1.15 (Ngo Cho ×1.019 … Pho Tay ×1.15; the Locations sheet prints `×1.019`, the shift book `×1,019` in vi and `×1.019` in en), `tableSlots` 4/4/5/6/6/7/8/8/8. Proof updated: `packages/engine/test/locations.test.ts` (`'rent prepays the configured lease days …'`; `'early switch and departure forfeit old deposit and rent; expiry at the exact boundary refunds instead'` now adds `seasonEarned` and the rolled results, because three short leases stay inside the 21-day ranking window), `apps/server/test/store.test.ts` (`'a paid lease survives SQLite restart; offline expiry refunds the stored deposit once without earning credit'`), `apps/server/test/shift-location.test.ts` (`ngo_cho` ×1.019), `apps/web/test/locations.spec.ts` (37 500 / 7 500 / 63 750 and `×1,019` / `×1.019`). |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 1 (JSON 2.1.0, re-sealed): `locations.leaseDays` 3 → **2** (rent = 2 × the daily rent, deposit 25 %: Ngo Cho 7 500 coins, Ben Xe 12 500), the daily rents are 0.3 × the old table (Ngo Cho 3 000 … Pho Tay 33 000 coins), `mult` 1.0 → 1.1 (Ngo Cho ×1.012 … Pho Tay ×1.1; the shift book prints `×1,012` in vi and `×1.012` in en), `tableSlots` **8** in every place. Proof updated: `packages/engine/test/locations.test.ts` (`'rent prepays the configured lease days …'`), `apps/server/test/store.test.ts` (`maxCost` 7 500), `apps/server/test/shift-location.test.ts` (`ngo_cho` ×1.012), `apps/web/test/locations.spec.ts` (7.500 / 1.500 / Ben Xe 12 500, `×1,012`). |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 2 (JSON 2.1.0): `locations.leaseDays` back to **3** (brief B5 and DESIGN-story section 3; no gate needed 2): rent = 3 × the daily rent, deposit 25 %: Ngo Cho 9 000 + 2 250 = 11 250 coins, Ben Xe 15 000 + 3 750 = 18 750 (the daily rents stay 0.3 × the old table, `mult` 1 ... 1.1). Proof updated: `packages/engine/test/locations.test.ts` (`'rent prepays the configured lease days …'`: 9 000 / 2 250 / 11 250), `apps/server/test/store.test.ts` (`maxCost` 11 250), `apps/web/test/locations.spec.ts` (11.250, "Chuyển chỗ bây giờ mất 2.250", Ben Xe 18.750). `tableSlots` 8 in every place is the SECOND owner decision (BLOCKERS `04 · tableSlots`): with eight places a location opens no table, a rented place sells at most +10 % payment for its rent. `locations.rentFormula` (printed by Settings) now says the rents are the 09/09 table × 0.3. |
