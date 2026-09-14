# Seasons & leaderboard (`docs/features/F12-league-seasons.md`; `F28-leaderboard.md`; `docs/config/economy.tbh.json` `league`/`leaderboard` blocks)

**F12/F28's sketched types and API don't match code — code is ground truth.** F12 §2 sketches
`Season{id,kind,startsAt,endsAt,epochAnchor}` and `PlayerSeasonStats{...}`; neither exists. The real
types are `SeasonPeriod`/`SeasonResult` (`packages/engine/src/types.ts:63-69`): `trackingFromAt`,
`configVersion`, `tiers` (a *snapshot* of `league.tiers` pinned at period start, not a live read),
`countedSources`, `closedShifts`, `firstReachedCurrentSeasonEarnedAt` — none of which F12's sketch
has. F28 §4 suggests `GET /leaderboard/me?seasonId` and `GET /shrine?seasonId`; neither route exists.
The real single route is `GET /leaderboard?kind&tier&page&revision` (`apps/server/src/http.ts:211-214`)
which embeds "my row" and neighbors in one response (`leaderboard.ts:40-56`'s `rankPage`) — there is
no separate "me" endpoint. "Shrine" (Bàn Thờ) data rides inside `GET /seasons/history`
(`http.ts:210`) as part of each `SeasonSnapshot`'s `shrineTop`/`wallSize`/`rows`
(`leaderboard.ts:73`, `store.ts:470`); `SeasonHistory.tsx` splits podium-vs-wall client-side by
`rank <= shrineTop` — there is no dedicated shrine query.

## Observable contract

- `World.seasons?: {ranking, contest, contestEarned, results, legacy}` (`types.ts:88-89`). Each of
  `ranking`/`contest` is a `SeasonPeriod` (`:63-66`); `results: SeasonResult[]` (`:68-69`) archives
  closed periods with `earned`/`tierId`/`tierName`. `World.seasonEarned` is the **ranking** period's
  running total; the **contest** period's is the separate `w.seasons.contestEarned` — two different
  fields for the two season kinds, not one shared counter. `World.peakLeague: string | null`
  (`:84`) — the highest tier id ever reached, monotonic, never decreases on season reset.
- **No domain event marks a rollover.** `syncSeasons()` (`seasons.ts:32`) silently mutates
  `World.seasons` in place; the only way to observe a rollover is to read `World.seasons`
  before/after or inspect `w.seasons.results` (see Gotchas). `credit()`'s call into
  `creditSeasons()` (`seasons.ts:61`) is the money side — see
  [economy-k-ledger](economy-k-ledger.md), not restated here.
- Server (`apps/server/src/leaderboard.ts`): `RankSnapshot` (`:7`, `{at, until, signature, revision,
  config, sources}`), `RankSource` (`:6`, per-player `{playerId, reputation, lifePath, review,
  periods}`), `rankPage()`'s return shape (`:51-56`, `{revision, period, tiers, tier, page, total,
  rows, nextPage, me, neighbors, eligibility:{reason, review}}`), `SeasonSnapshot` (`:73`, the
  archived/frozen shape `seasons/history` returns). **Real `playerId` never reaches a leaderboard
  row** — `publicRankId()` (`:8`) is a one-way `sha256('tbh-public-player:'+id)` hash; `rankRows()`
  (`:60-71`) only ever returns that hash as `id`.
- Config: `league.tiers` — 8 tiers (`dong`→`huyen_thoai`), each `minSeasonEarnedBase` k-scaled at
  load (`config.ts`'s `scale()`, per [economy-k-ledger](economy-k-ledger.md)'s Gotchas). `leaderboard`
  namespace: `topN`(100), `neighborsWindow`(3), `refreshMs`(60000), `minShiftsToRank`(1),
  `shrineTop`(3), `wallSize`(10), `historySeasonsKept`(12), `hideFlagged`(true),
  `displayNameFilter`. `league.seasons`: `epochUtc`, per-kind `days` (`ranking`=7, `contest`=14 per
  F12 §1).
- HTTP routes (`http.ts`, grep-confirmed): `GET /leaderboard` (`:211-214`, public, query
  `kind`/`tier`/`page`/`revision`), `GET /seasons/history` (`:210`, public), `GET /player/competition`
  (`:237-238`, authenticated, `store.competitiveStatus`), admin: `GET`/`POST /admin/competition`
  (`:140-146`, flag/import-review moderation via the `Competition` class), `GET
  /admin/competition/history` (`:135-138`, bounded evidence paging, `HISTORY_PAGE=50`).
- DOM/aria (`apps/web/src/Leaderboard.tsx`, `SeasonHistory.tsx`): mounted **unconditionally in both
  local and remote mode** inside the `'seasons'` sheet (`App.tsx:452`) — a local-mode player still
  makes this one public, unauthenticated read (`credentials: viewer ? 'same-origin' : 'omit'`,
  `Leaderboard.tsx` fetch). Eligibility reason renders as `t(`rank.${reason}`)` (`Leaderboard.tsx:65`,
  e.g. `rank.insufficientShifts`/`rank.googleRequired`/`rank.flagged`), plus a separate
  `rank.review.${review}` line when a local-import review is pending/rejected. `SeasonHistory.tsx`
  aria labels: `shrine.podium`/`shrine.wall`/`shrine.title`. Client-side public-only cache
  `localStorage['tbh.leaderboard.v1']` (`Leaderboard.tsx`'s `CACHE`) — explicitly whitelists
  `{revision,updatedAt,period,tier,tiers,page,total,rows,nextPage}` only, a code comment states it
  "never retain[s] viewer, personal rank, neighbors or review status".

## How to reach it

- **No player Command drives rollover — fully autonomous.** `syncSeasons()` is called from four
  distinct sites in `engine.ts`, all gated on `rulesVersion >= SEASON_RULES` (23): `advancePaused()`
  (`:224`, hidden/offline catch-up), `processDue()` (`:347`, the normal per-tick sweep, same method
  [order-rounds-kitchen](order-rounds-kitchen.md) already cites at `:345`), `applyCommand()` (`:715`,
  before *every* command executes, but only once `world.seasons` already exists or the command isn't
  `startShift` — avoids syncing before the first shift ever creates the seasons object), and inside
  the `startShift` handler (`:793`, right after `pinUnusedSeasons()` at `:790` repriced a just-rolled
  unused window to newly-opened config).
- Server: `store.leaderboard(query, token)` (`store.ts:390`) and `store.seasonHistory()`
  (`store.ts:478`) wrap the pure `leaderboard.ts` functions with SQLite reads. A background timer,
  `seasons()` (`http.ts:340-345`, re-armed every `store.heartbeatIntervalMs` via `setTimeout(...).unref()`),
  calls `store.sweepSeasons()` which drives `captureSeasonBackup()` (`season-snapshot.ts:11`) — a
  **native SQLite backup + isolated worker-thread replay** (`season-snapshot-worker.mjs`,
  `SEASON_CAPTURE_TIMEOUT_MS`, `HEAP_MB=1024`), matching the `forecast.ts`/`local-archive.ts` worker
  pattern used elsewhere in this repo.
- Admin moderation feeding eligibility: `Competition.decide()`/`.state()` (`competition.ts:75,23`) —
  `flag`/`import-review` requests, audited via `registry_audit` rows, gated by actor role
  (`super`/`game` to decide, `+support` to inspect/read-only). `competitivePeriods()`
  (`competitive-score.ts:15`) is the pure read projection turning a player's raw `World.seasons` +
  `Competition.state()` into the `eligible`/`reason` pair `rankRows()` ultimately reads — explicitly
  documented in its own comment as "never a second wallet or engine credit." The UI proof for the
  *moderation* half of this (flag/review actions) lives in `admin-test/moderation.spec.ts`, which is
  `admin-registry`'s territory (not yet written) — cross-link there for the moderation UI itself; this
  file owns what moderation *does* to leaderboard eligibility.

## Existing proof

- `packages/engine/test/seasons.test.ts` — all 13 cases (flat, no `describe`): `'actual service
  creates both seasonal counters and a real peak; refunds, quest rewards and spending cannot inflate
  them'`, `'exact ranking boundary resets only ranking; menu and offline clocks preserve waiting time
  and fine/coarse replay equality'`, `'an order served exactly at rollover belongs wholly to the new
  window and idempotent retries do not add another score'`, `'inactive empty decades skip blank
  results; populated period outcomes are stable under coarse and fine catch-up'`, `'daily cap counts
  actual credited income only; zero credit leaves tie timestamp unchanged and tier thresholds are
  scaled once'`, `'completed shifts are attributed at close time independently of earnings, with no
  fake authenticated rank'`, `'period terms stay pinned through config changes and each next season
  adopts the latest accepted config'`, `'captured rules22 history remains unchanged; explicit adoption
  archives the old aggregate without inventing a season peak'`, `'invalid calendar definitions and
  changes to permanent tier identities fail closed'`, `'real served revenue crosses configured tiers
  and the reached peak survives both season resets'`, `'a new calendar accepted at or after rollover
  replaces the unused window, even if a read already advanced it'`, `'first rules23 opening rejects
  renamed permanent tiers for new games and historical saves'`, `'a later tip, bonus or second
  customer cannot partially credit an overflowing order'`.
- `apps/server/test/leaderboard.test.ts` — 12 cases: `'actual imported careers rank by earnings then
  first reached then stable ID, with pages and own neighbors across tiers'`, `'new Google membership
  and external admin flags or review reverse eligibility immediately and invalidate stale pages'`,
  `'normal score snapshots honor refresh config and expire at the exact season boundary without
  rolling or crediting saves'`, `'rank reads recover a missing baseline once, recheck expired sessions
  after recovery and refuse corrupt evidence or invalid queries'`, `'season capture uses boundary
  eligibility and scores, restores pre-end unflags and remains immutable across restart and account
  removal'`, `'after-end import approval or Google attachment cannot rewrite a past season, while both
  calendar kinds capture automatically'`, `'startup closes ended seasons without a player request and
  public history is read-only'`, `'worker capture does not hold the live writer, preserves saves, and
  stores only configured wall rows and visible season count'`, `'a pre-registry imported season keeps
  its retained configuration instead of the seed publication effective at zero'`, `'a later registry
  publication cannot truncate a previously pinned season archive'`, `'staggered HTTP heartbeats cannot
  postpone automatic season capture'`, `'historical invalid live display knobs do not prevent freezing
  valid pinned archive settings'`.
- `apps/server/test/competition.test.ts` — 15 cases (moderation/import-review side, feeds leaderboard
  eligibility rather than proving ranking math itself); representative: `'reviewing the exact imported
  archive updates only provenance, survives restart, and never credits its live shift twice'`,
  `'competing admins must use the current decision and one request key cannot be reused across players
  or actions'`, `'server-origin guest scores survive Google attachment and current flag decisions
  immediately change eligibility'`, `'competitive tiers and qualification reuse each active season
  pin; unwindowed legacy income never becomes a new score'`.
- `apps/web/test/seasons.spec.ts` — 1 test (×2 locale/width): `` `offline guest board preserves
  customer pause and calendar rollover without exposing account history at ${width}px in ${locale}` ``
  — already cited by [multi-system-journeys](multi-system-journeys.md) for the reload+rollover
  crossing. **Corrected claim**: this is NOT the own-season `Seasons` component — `App.tsx:452` only
  mounts `<Seasons>` when `remote?.identity.provider === 'google'`, which a local-mode guest never has
  (`remote` is `null` in local mode). The test explicitly asserts `.seasons-panel` and `.rank-personal`
  stay **hidden** (`seasons.spec.ts:23`, `.not.toBeVisible()`) — it proves the public
  `Leaderboard`/`SeasonHistory` render for a guest while personal/own-season panels correctly stay
  gated behind Google identity, not that it verifies the `Seasons` component's own content. Authenticated
  coverage of `<Seasons>` itself is not established by this pass — see Uncovered paths.
- `apps/web/remote-test/leaderboard.spec.ts` — 4 top-level tests (6 runtime executions with locale
  loops): `` `real ranked careers show pages, own tier neighbors and paused menus in ${locale}` `` (×2
  locale), `'moderation invalidates an open page and a guest can view the public board without
  inheriting the prior account row'`, `'offline reopening shows only a dated public preview, recovers
  online and ignores a late response after closing'`, `` `ended season history freezes names and
  scores with public podium/wall in ${locale}` `` (×2 locale) — this file is the direct UI proof for
  the public `Leaderboard`/`SeasonHistory` components documented above.

## Verification procedure

- `node --import tsx --test packages/engine/test/seasons.test.ts` (or `npm test` for the full suite —
  bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `node --import tsx --test apps/server/test/leaderboard.test.ts apps/server/test/competition.test.ts`
  (or `npm test`).
- `npx playwright test apps/web/test/seasons.spec.ts` (or `npm run test:e2e`) for the local-mode own-
  season view.
- `npx playwright test --config playwright.remote.config.ts apps/web/remote-test/leaderboard.spec.ts`
  — **`testDir` for this config is `apps/web/remote-test`**, a different directory from the default
  config; passing this path against `playwright.config.ts` instead matches zero tests.
- `npm run check:config` before touching `league.tiers`, `league.seasons`, or any `leaderboard.*`
  value.

## Uncovered paths

- **No domain event marks a season rollover** (see Observable contract) — a future consumer wanting
  to react to "season just ended" (e.g. a toast, a push notification) has nothing to subscribe to
  today; it would need to diff `World.seasons` snapshots itself. Not a bug — `syncSeasons()`'s own
  design is silent-mutation-on-read — but worth flagging before building anything reactive on top.
- **No test exercises `nextSeasonEnd()`'s `Infinity`-when-unparticipated branch alongside a
  participated one** (`seasons.ts:29-31`) — i.e. a player who has earned in `ranking` but not
  `contest` (or vice versa) getting the correct single finite deadline, not the min of two real
  values. Grep-confirmed no test name references "nextSeasonEnd" or a mixed-participation scenario.
- **Removed false claim**: `compatibleSeasonTiers()` has exactly **one** call site
  (`engine.ts:772`, inside `case 'startShift':` — grep-confirmed, not two), and it's covered by name
  by two already-cited tests: `'invalid calendar definitions and changes to permanent tier identities
  fail closed'` and `'first rules23 opening rejects renamed permanent tiers for new games and
  historical saves'`, both of which send a renamed-tier config through `startShift` and assert
  `reason === 'configSeasonTiers'`. There is no separate rollover-time tier-identity gate to leave
  uncovered.
- **The authenticated `<Seasons>` component itself (`App.tsx:452`, gated on
  `remote?.identity.provider === 'google'`) has no dedicated UI test in this pass's citation set** —
  `seasons.spec.ts` is local-mode/guest and explicitly can't reach it (see the correction above);
  no `remote-test`/`admin-test` spec was found asserting its own content (own-tier, own-rank display)
  for a signed-in Google player.
- **The `seasons()` HTTP timer's own re-arm/failure path** (`http.ts:340-345`, `console.error` on a
  rejected `sweepSeasons()`, then still re-arms) has no direct test asserting the server keeps
  scheduling captures after one throws — `leaderboard.test.ts`'s "staggered HTTP heartbeats cannot
  postpone automatic season capture" tests timing interference, not capture-failure resilience.
- **Corrected claim**: `remote-test/leaderboard.spec.ts`'s `'offline reopening shows only a dated
  public preview, recovers online and ignores a late response after closing'` DOES exercise the
  cache round-trip and one corruption path — going offline reads the previously-cached board back
  (`.rank-asof` "Bản xem đã lưu" proves a prior write, read back while offline), and its final lines
  inject syntactically-broken JSON (`localStorage.setItem('tbh.leaderboard.v1', '{broken')`) and
  confirm the board still recovers — the `JSON.parse` catch path (`readCache()`, `Leaderboard.tsx`).
  What's still genuinely untested: `readCache()`'s **separate** structural-shape validation (the
  `if (!b || !/^[a-f0-9]{64}$/.test(b.revision) || ...)` chain that runs *after* a successful parse) —
  no test caches syntactically-valid JSON with a wrong shape (e.g. a missing field or bad regex match)
  to confirm that path also falls back to `null` rather than rendering malformed data.

## Variants

- **success** — a real serve/delivery crediting both `seasonEarned` and `peakLeague` (`seasons.test.ts`
  first two cases); a full leaderboard page with own-row + neighbors (`leaderboard.test.ts` first
  case).
- **cancel** — not applicable; there is no player-initiated season action to cancel.
- **reason** — `eligibility.reason`: `'googleRequired'`, `'flagged'`, `'insufficientShifts'`
  (`leaderboard.ts:56`); engine-side `'season:unsafe-clock'` (`seasons.ts:10`),
  `'configSeasonTiers'` (`engine.ts:772`); server `'leaderboard:invalidQuery'`/`'invalidPage'`/
  `'stalePage'`/`'captureCancelled'`/`'captureTimeout'`/`'captureUnavailable'`.
- **empty** — an empty/never-participated tier renders "Chưa có ai" per F12 (UI copy, not asserted by
  this pass); `seasonEarned`/`contestEarned` start at 0; `creditSeasons()` no-ops on `credited === 0`
  (already covered by [economy-k-ledger](economy-k-ledger.md)).
- **persistence** — season periods/results survive save replay (`seasons.test.ts`'s config-pinning-
  adjacent cases); server capture is restart-safe (`leaderboard.test.ts`'s "remains immutable across
  restart and account removal").
- **capacity** — `topN`/`neighborsWindow`/`wallSize`/`shrineTop`/`historySeasonsKept` are all bounded,
  validated integers (`leaderboard.ts:9-24`'s `archiveSettings`/`rankSettings`).
- **duplicate/idempotent** — `'an order served exactly at rollover belongs wholly to the new window
  and idempotent retries do not add another score'` (`seasons.test.ts`); `competition.test.ts`'s
  request-key-reuse-refusal case.
- **stale** — `'stalePage'` HTTP 409 on a mismatched `revision` (`leaderboard.ts:42`,
  `Leaderboard.tsx`'s 409 handler resets `page`/`revision` and clears the cache).
- **time-jump** — every `seasons.test.ts` "coarse vs fine" pairing; `syncSeasons()`'s own
  multi-window catch-up-in-one-call design (`seasons.ts:40-55`) is exactly this variant.
- **offline-reconnect** — `remote-test/leaderboard.spec.ts`'s "offline reopening shows only a dated
  public preview, recovers online and ignores a late response after closing".

## Gotchas

- `World.seasonEarned` (ranking) and `World.seasons.contestEarned` (contest) are two **separate**
  fields for the two season kinds — don't assume one shared "season score."
- Rollover is silent: no `emit(...)` call anywhere in `seasons.ts` — grep-confirmed. Contrast with
  most other autonomous transitions in this repo, which do emit (e.g. `table_occupied`,
  `order_expired`) — season rollover is a deliberate exception, not an oversight to "fix."
- `SeasonPeriod.tiers` is a **snapshot** taken at period start (`newPeriod()`, `seasons.ts:13-17`,
  `structuredClone(c.values.league.tiers)`), not a live re-read of current config — a mid-period
  config change to tier thresholds does not retroactively reprice an in-progress season; this is what
  `compatibleSeasonTiers()`/`pinUnusedSeasons()` exist to police at the two boundaries (shift-open,
  rollover).
- Real `playerId` never appears in a leaderboard row (`publicRankId()`'s one-way hash) — don't
  assume you can reverse a `rows[].id` back to an account without server-side `Competition`/`store`
  access.
- F28's suggested `/shrine` and `/leaderboard/me` routes don't exist (see the drift note at the top)
  — don't cite them as real endpoints in future doc changes without re-verifying against `http.ts`.

## Related

[economy-k-ledger](economy-k-ledger.md) (`credit()`→`creditSeasons()` is the only path that ever
increments `seasonEarned`/`contestEarned`/`peakLeague` — the money mechanics live there, not here),
[multi-system-journeys](multi-system-journeys.md) (`seasons.spec.ts`'s reload+rollover crossing),
`admin-registry` *(not yet written)* — the flag/import-review moderation UI
(`admin-test/moderation.spec.ts`) that feeds this file's eligibility rules, and the general
registry publish/rollback mechanism (`admin-test/admin.spec.ts`'s rollback test — unrelated to season
data despite living in the same spec file family, grep-confirmed no season/leaderboard reference
there).
