# Trùm Bia Hơi — entry-point map

Verified against `origin/main` @ `1c832c1` (2026-09-14) by direct file reads and grep, not by
memory or by trusting the planning docs. Where a fact below corrects an assumption in an earlier
doc, that's called out — re-verify anything here that looks stale before trusting it blindly, the
same way this file itself was built.

## Two tiers, two modes

- **Engine tier** — `packages/engine/src/*`, pure: no DOM, no wall clock, no `Math.random()`
  (grep-confirmed zero hits for `Math.random`/`Date.now` anywhere in `packages/engine/src`,
  including inside `rng.ts` itself). `Game.command()`/`Game.advance()` in `engine.ts` *is* the
  production path.
- **Server tier** — `apps/server/*`. Calls the engine per request; SQLite-backed, authoritative
  once a player claims an account.
- **Web-local** — `apps/web/src/local.ts`. The browser constructs a `Game` itself and calls
  `dispatch()` → `game.command()` directly, in-tab.
- **Web-remote** (default) — `apps/web/src/remote.ts`. The browser never constructs or advances a
  `Game`; it queues commands to an outbox and the server executes them.

`apps/web/src/start.ts` `start()` (start.ts:7) is the single chooser:
- `mode === 'local' || import.meta.env.VITE_TBH_LOCAL === '1'` → local (start.ts:8, calls `boot()`).
- else, no explicit mode **and** no `tbh.remote.v1` journal yet **and** an existing local save is
  found → a save-recovery prompt detour (start.ts:10-14), independent of local/remote.
- else → `RemoteGame.open(...)` (start.ts:21).

## 1. Rules & numbers (config loader)

- `docs/config/economy.tbh.json` — the seed config, 1772 lines, `_meta.version` currently `"2.0.3"`.
  41 top-level keys (`_meta, audio, chairmanBox, cosmetics, crates, customerTypes, demandMix, dog,
  donation, enjoy, entitlements, freshness, glasses, inventory, k, leaderboard, league, ledgers,
  lifePath, locations, lottery, menu, network, onboarding, patience, penalty, prototypePhase0,
  quests, reputation, risk, rounds, runtime, rush, shift, shopSeason, signboard, spawn, tip,
  unlocks, upgrades, weather`).
- `packages/engine/src/config.ts` — the only module that imports the JSON:
  - `shape(value, expected, path)` (config.ts:85) — structural validator, throws `config:<path>[...]`.
  - `validate(c: Economy)` (config.ts:105-352) — business-rule validator (positivity, lifePath
    ordering/cycles, quest-curve shape, season-epoch grammar, etc).
  - `scale(v, k, base)` (config.ts:355) — applies the `k` multiplier to every `...Base`-suffixed field.
  - `freeze(value)` (config.ts:362); `loadConfig(input = seed)` (config.ts:367) — the exported
    loader: `shape` → `structuredClone` → `validate` → `scale` → `freeze` → `{version, raw, values, get}`.
  - `configContent(c)` (config.ts:386) — canonical `JSON.stringify` for content-equality.
- `packages/engine/src/rules.ts` — 23 pure functions, every one `(w, c: Config, ...)`, reading
  numbers exclusively via `c.values.*` (e.g. `wellRestedBonus` rules.ts:23, `customerValue`
  rules.ts:69, `credit` rules.ts:111 — "the only faucet entry point").
- **`configVersion` pin/replay does NOT live in config.ts** (zero grep hits there) — it's owned by
  `engine.ts`: `Game.replay()` throws `replay:configVersion` on a mismatch (engine.ts:697),
  `Game.applyCommand()` rejects `configVersionConflict` on same-version-different-content
  (engine.ts:707) and stamps `configVersion` on the committed log entry (engine.ts:724); shift-open
  stamps `w.shift.configVersion` and emits `config_pinned` on change (engine.ts:806-809).
- Governance gate — `npm run check:config` = `check:economy` (`scripts/check_economy_config.py`,
  a thin wrapper that shells out to `tsx scripts/check_engine_config.ts` — the real runtime
  assertions live there) **and** `check:config-coverage` (`scripts/check_config_coverage.py`,
  static: every JSON section is tiered in `_meta.governance.tiers`, every `config.get('path')`
  call site resolves, `08-SPEC-economy-constants.md` §22 mentions every section; the bare-numeric-
  literal scan is advisory-only unless `--strict`, which the wired npm script does not pass).
  Escape hatch: trailing `// config-exempt: <reason>`.
- Proof: `packages/engine/test/config-pinning.test.ts` (11 cases, engine-tier pin/replay/conflict
  logic) · `apps/web/test/config-pinning.spec.ts` (1 Playwright case, a mixed-config save surviving
  a real browser reload).

## 2. Clocks & the state machine (engine tier)

- `packages/engine/src/engine.ts` — `class Game` (engine.ts:43, doc comment: "No wall clock, IO or
  renderer: only config, seed, explicit time and commands").
  - `command(envelope, openingConfig?)` (engine.ts:674) — player/HTTP-triggered; always the latest
    ruleset (`CONNECTION_RULES = 24`, engine.ts:31); returns `Result` (`{ok, reason?, outcome?,
    amount?}`, types.ts:126).
  - `advance(now)` (engine.ts:178) — autonomous clock tick; validates monotonic time, resolves
    expired disconnects, drives `advanceTime()` (prepare/wash/rush/season progression). Returns
    `void` — no per-call outcome, only whatever it emits into `world.events`.
  - `World` (types.ts:71-91) — 48 top-level fields: `now, rng, nextId, phase, playerId, coins,
    reputation, seasonEarned, lifetimeEarned, staminaMs, staminaAnchorMs, staminaAnchorAt,
    completedShifts, active, paused, lastServedAt, disconnection, restStartedAt, wellRestedDays,
    dayEarned, dayShifts, inventory, equipment, tables, glasses, queue, shift, serves, beer,
    events, lostStreak, delivery, nextDeliveryAt, dogLevel, claimedLifePaths, badgeShards,
    cosmeticTokens, peakLeague, signStyle, flyers, daily, attendance, lease, seasons, location,
    lifePath, unlocks, badges`.
- **The table ring / "whole table at once" rule** — enforced directly in the `serve` command
  handler: `case 'serve':` (engine.ts:856) requires `o.items.every(i => i.state === 'ready')`
  (engine.ts:862) before crediting anyone; one `serve` call resolves the entire table `Order` and
  returns one `outcome` (`'early'|'late'|'grace'|'expired'|'stale'`) matching 03-SPEC-he-ban.md §9's
  grace-window taxonomy exactly.
- Domain modules — **most are pure read-projectors that feed private `Game` methods, not mutators
  themselves.** Don't assume a module named after a subsystem owns that subsystem's state:
  | Module | Owns | Exports (file:line) | Mutation actually happens in |
  |---|---|---|---|
  | `kitchen.ts` | kitchen pan/burner projection | `kitchenStatus()` (:6) | private `Game#prepare()` (engine.ts:607-661), which calls `kitchenStatus()` to know free burners |
  | `production.ts` | keg + washer projection | `beerStatus()` (:5), `washerStatus()` (:19) | `beerStatus` feeds `Game#prepare()` (engine.ts:653); `washerStatus` is **not** called by `Game#wash()` (engine.ts:663-672, recomputes slots itself) — it's UI/test-only, effectively dead from the engine's own tick |
  | `rush.ts` | `Shift.rushes`/`rushScheduleSeed` (types.ts:40-41) | `planRushes()` (:6, seeds per-shift weather schedule, `null` = fail-closed if it can't fit), `summarizeRush()` (:34, aggregates event log since a campaign start) | called from `engine.ts` at shift-open and on `rush_ended`/`flyer_ended` (engine.ts:279, 322) |
  | `seasons.ts` | `World.seasons`, `seasonEarned`, `peakLeague` | `syncSeasons()` (:32, rollover), `creditSeasons()` (:61, crediting + league tier) | called from `engine.ts` |
  | `progression.ts` | **life-path + unlock gating ONLY** — not stamina, not attendance | `requirementStatus`(:6)/`lifePathStatus`(:15)/`unlockQuote`(:28)/`lifePathRewardQuote`(:34) | `claimLifePath`/`buyUnlock` commands in `engine.ts` |
  | `quests.ts` | daily quests **and** attendance (both live here, despite the file name) | `planDailyQuests`(:14)/`applyQuestEvent`(:30, called on *every* domain event, engine.ts:104)/`questRewardQuote`(:73); `attendanceDay`(:88)/`attendanceRewardQuote`(:96) | `claimQuest`/`claimDailyBonus`/`claimAttendance` commands |
  | `menu.ts` | per-shift sales/waste reporting only | `serveValueStats`(:5), `menuReport`(:15) — invoked once at shift-close (engine.ts:438) to emit `menu_mix_summary` | n/a (read-only); the unrelated "menu pause" mechanic is a generic `activity`/`paused` field gated by `MENU_PAUSE_RULES` and checked at engine.ts:163,192,268,311 — it is **not** in menu.ts |
  | `locations.ts` | lease terms | `leaveLocationQuote`(:5), `leaseQuote`(:13) | `rentLocation`/`leaveLocation` commands |
  | `flyer.ts` | flyer campaigns | `flyerQuote`(:6) | `buyFlyer`/`activateFlyer` commands |
  | `signboard.ts` | sign styles | `signboardStyle`(:4), `signboardQuote`(:8) | `installSignboard`/`setSignboard` commands |
  | `rng.ts` | the *only* randomness source | `random`(:2, Mulberry32), `seededRng`(:21, FNV-1a string seed, e.g. quests.ts seeds on `[day,tier]`, never wall time) | n/a |
  - **Stamina/well-rested is not in progression.ts** — it's `World.staminaMs` et al (types.ts) +
    state transitions in `engine.ts` (~lines 60-63, 211-212, 744-821) + pure helpers
    `wellRestedRemaining`/`wellRestedBonus` in `rules.ts:19,23`.
- Sims — `packages/engine/sim/*.ts`, all built on the same command API as any other client:
  `headless.ts` (k-band probe, `npm run sim` / `sim:onboarding`), `rush-pressure.ts` (`sim:rush`),
  `career.ts` (`sim:career` / `sim:career:gate`, incl. `assertAdvancedCareerK`), `forecast.ts`
  (config-change projection, **no CLI** — used as a library by `apps/server/src/http.ts` and
  `forecast.ts`), `policy.ts` (shared bot primitives, **no CLI** — imported by `career.ts`/`forecast.ts`).
- Proof (representative, not exhaustive — see the future verify-skill feature map for the full
  index): `packages/engine/test/{kitchen,production,rush-clock,rush-schedule,seasons,progression,
  attendance,well-rested,quests,menu,menu-pause,locations,flyer,dog-purchase,signboard,game}.test.ts`.

## 3. Persistence

- `packages/engine/src/save.ts`:
  - `encodeSave(game)` (save.ts:13) — `{...saveMetadata(game), log, events, now}`.
  - `decodeSave(text)` (save.ts:24) — **replays, does not deserialize a snapshot.** Builds a fresh
    `Game` from only `config/seed/createdAt/playerId` (save.ts:28), replays every log entry through
    `game.replay(entry, c)` (save.ts:44), requires the result to match the recorded one
    byte-for-byte or throws `save:replay-mismatch` (save.ts:45), then `game.advance(save.now)`
    (save.ts:48) and requires recomputed `world.events` to match `save.events` or throws
    `save:event-mismatch` (save.ts:49). Other checked invariants: `save:unsupported` (save.ts:26),
    `save:configCatalog` (save.ts:31/35), `save:invalid-log` (save.ts:41/47), `save:invalid-version`
    (save.ts:43). Distinct from `Game.checkpoint()`/`restoreTrusted()` — a direct trusted-snapshot
    restore with **no** replay, used by the server's checkpoint fast path.
- `apps/web/src/browser-save.ts` — `class BrowserSave` (browser-save.ts:23), IndexedDB-backed.
  Writes are **incremental** (only new log/event rows since the last `head.revision`, chunked at
  1000 — browser-save.ts:85-109) with optimistic-concurrency (`storage:conflict`) and
  history-truncation checks, even though every *load* goes through a full `decodeSave` replay
  (`local.ts:32`) — there's no snapshot fast path on this tier. The `backups` store is written
  exactly once, only during migration/corruption-recovery — it is not rolling autosave history.
- `apps/server/src/store.ts` — `class GameStore` (store.ts:42), SQLite (`node:sqlite`), append-only
  `commands`/`events` tables enforced by `RAISE(ABORT,'store:appendOnly')` triggers. `hydrate()`
  (store.ts:501) prefers a hash-chained, digest-checked `engine_checkpoints` row (restored via
  `Game.restoreTrusted`, **no replay** — spied on directly in `apps/server/test/checkpoint.test.ts`)
  and only falls back to full `decodeSave` replay when no valid checkpoint exists.
  `apps/server/src/local-archive.ts` reuses the same `decodeSave` core in a worker thread
  (`replayLocalArchive`/`validateLocalArchive`) to revalidate an uploaded local save before
  `claimLocal` (store.ts:289) admits it — the server never trusts an uploaded `checkpoint`/`world`
  field, only what full replay reproduces.
- **Source-of-truth boundary**: guest/pre-auth play — the browser IndexedDB tier is the sole source
  of truth, nothing hits `/api/*`. After a player signs in and `claimLocal` succeeds, the server
  SQLite tier becomes authoritative for that `playerId`.
- Proof: `packages/engine/test/checkpoint.test.ts` (engine-level checkpoint/restoreTrusted, no I/O)
  · `apps/server/test/checkpoint.test.ts` (SQLite `engine_checkpoints` caching/fault-injection —
  **a different layer than the engine-level file of the same name**) · `apps/server/test/
  local-import.test.ts` · `apps/web/test/browser-save.spec.ts` · `apps/web/test/account-local.spec.ts`.

## 4. Modes in detail: local vs remote

- `apps/web/src/local.ts` `boot()` (local.ts:23-50) — `game = original !== null ? decodeSave(original)
  : new Game(...)` (local.ts:32), then runs an activity-toggle/`advance`/activity-toggle sequence
  (local.ts:35-37). `dispatch(game, command)` (local.ts:57-59) is a thin wrapper: `game.command(...)`
  called synchronously, in-tab.
- `apps/web/src/remote.ts` — `class RemoteGame` (remote.ts:30, doc comment: "Device-persistent
  command journal; one writer and an exact authenticated owner"). **Grep-confirmed: zero
  `.advance(` calls and zero `new Game`/`Game` construction in this file** — it only imports pure
  helpers (`loadConfig`, `validEnvelope`) from the engine, never the engine's mutating surface.
  - Outbox/journal: `JOURNAL_KEY = 'tbh.remote.v1'` (remote.ts:4); `Journal` shape `{playerId,
    clientId, nextSeq, heartbeatSeq, cursor, pending: Action[]}` (remote.ts:8); `persist()`
    (remote.ts:61-64, writes to `localStorage`); drain loop inside `cycle()` (remote.ts:294-303).
  - One-writer lock: `navigator.locks.request(JOURNAL_KEY, {ifAvailable: true}, async lock => {...})`
    (remote.ts:82-85) — **fails fast** with `RemoteError('otherTab')` if another tab already holds
    it; it does not queue, so this is single-writer-per-device, not a serialized multi-tab queue.
  - Heartbeat: `beat()` (remote.ts:271-284), POSTs `/player/heartbeat`; the server dictates the next
    interval (`this.interval = reply.heartbeatIntervalMs`, remote.ts:282).
  - Reconnect: `watchLiveness()` (remote.ts:232-237, client-side timeout → `state = 'reconnecting'`),
    `fail()` (remote.ts:245-254, maps errors to `reconnecting`/`conflict`/`storage`/`invalidSession`),
    retry rescheduled in `cycle()`'s `finally` (remote.ts:312-321).
  - Idempotency: `Action = {clientId, clientSeq, idempotencyKey, command}` (remote.ts:7); sequence
    assigned on enqueue (remote.ts:260, `clientSeq: j.nextSeq++`); ack checked against
    `reply.acknowledgedSeq` (remote.ts:298).
  - `command(cmd)` (remote.ts:255-265) — pushes to `journal.pending`, persists, and returns a
    `Promise<Result>` resolved later when `cycle()` gets the server's reply — **not synchronous**,
    unlike local mode's `dispatch()`.
- **The exact fork point** between the two production paths — `apps/web/src/App.tsx:166`:
  ```ts
  const result = remote ? await remote.command(cmd) : dispatch(game as Game, cmd);
  ```
- `apps/server/src/http.ts` — raw `node:http`, manual method+path dispatch inside `createServer(...)`
  (http.ts:78), 404 fallback (http.ts:298). Player-facing routes include `POST /player/connect`
  (http.ts:262), `POST /player/heartbeat` (http.ts:267), `GET /player/state` (http.ts:283),
  `GET /player/events` (http.ts:284), `POST /player/command` (http.ts:290, dispatches into
  `store.clientCommand(...)` — this is where the server actually calls the engine for a remote
  player's command; `apps/server/src/store.ts` was not read at handler-body depth in this pass).
  Plus `/admin/*` (auth, competition, registry, forecast, config, proposals, publish — 20 routes)
  and `/auth/*`, `/seasons/history`, `/leaderboard`.
- Proof: `apps/web/remote-test/` — **actual path is `apps/web/remote-test/`, not repo root** (the
  original plan's shorthand was wrong) — `{accessibility,account-ui,dev-identity,google-link,
  leaderboard,locale,login-invitation,remote}.spec.ts` + `server.ts` fixture. Plus
  `packages/engine/test/disconnection.test.ts` (28 cases, connection-loss/grace/reconnect state
  machine) · `apps/server/test/client-sequence.test.ts` (4 cases, idempotency/retry) ·
  `apps/server/test/presence.test.ts` (10 cases, heartbeat/lease).

## 5. UI

- Routing is **not** inside `App.tsx` — `apps/web/src/main.tsx` picks the root by
  `location.pathname`: `/admin` → dynamic `import('./Admin')`, else → dynamic `import('./App')`.
  The player app and the admin app are two separate code-split roots chosen once at load; `Admin*`
  screens are never reachable from inside `App.tsx` (grep-confirmed: `App.tsx` never imports `Admin`).
- `apps/web/src/App.tsx` (494 lines) — no router library inside it; a single `Sheet` union-type
  state (App.tsx:22) drives one modal dialog. Screens are mounted as sheets, not routes:
  `Account`/`LoginInvitation` (App.tsx:406-407), `SeasonHistory`/`Seasons`/`Leaderboard`
  (App.tsx:452), `Locations` (App.tsx:453), `Quests` (App.tsx:408), `Kitchen` (App.tsx:472),
  `MenuReport` (App.tsx:457), `UpgradeHint` (App.tsx:454/457/472, inline nudge, not a sheet).
  `run(cmd)` (App.tsx:165-174) is the command dispatcher containing the local/remote fork
  (App.tsx:166, see §4).
- `apps/web/src/i18n.ts` (11 lines) — `translate(locale, key, params={})` (i18n.ts:6-10): looks up
  `locales[locale][key]`, falls back to `locales.vi[key]`, warns+returns the raw key in DEV if
  missing, substitutes `{param}` tokens. `i18n/vi.json` and `i18n/en.json` — 814 keys each,
  identical key sets (verified). `scripts/check_web_copy.mjs` (`npm run check:i18n`) asserts
  vi/en key-set and interpolation-token parity, then AST-scans every non-`Admin*` `.tsx` file (Admin
  is explicitly excluded) for hardcoded natural-language strings in JSX/aria/title/placeholder/alt,
  and validates every `t('key')` call resolves.
- `apps/web/src/assets.tsx` (27 lines) — manifest read from repo-root `assets/manifest.json`
  (**132 entries, verified** — matches the plan doc's figure, not a discrepancy). `Sprite({id})`
  resolves a manifest entry, falls back to the nearest lower equipment-level sprite, then a
  placeholder. `apps/web/src/audio.ts` (37 lines) — `createSound(config, muted)` factory; `event(e)`
  maps domain events to sound keys; manifest-driven asset resolution with codec/usage matching.
- Proof: `apps/web/test/game.spec.ts` (695 lines, 22 top-level `test(...)`, zero `test.describe` —
  some wrap `for` loops over viewport/mode so the runtime count is higher) · accessibility spec is
  at `apps/web/remote-test/accessibility.spec.ts` (not under `apps/web/test/`) · `apps/web/admin-test/
  {admin,moderation}.spec.ts` · `apps/web/playable-test/shift.spec.ts`.

## 6. Proof map — where tests and configs live

| Suite | Path | Config / command |
|---|---|---|
| Engine | `packages/engine/test/*.test.ts` (27 files) | `npm test` (`tsx --test`) |
| Server | `apps/server/test/*.test.ts` (15 files) | `npm test` |
| Web legacy/local | `apps/web/test/*.spec.ts` (15 files) | `playwright.config.ts`, baseURL `4178` |
| Remote | `apps/web/remote-test/*.spec.ts` (8 files) + `server.ts` fixture | `playwright.remote.config.ts`, baseURL `4179`/auth `4180` |
| Dev-identity | (shares `apps/web/remote-test/`) | `playwright.dev-identity.config.ts`, same `4179`/`4180` — near-duplicate of remote config, different `testMatch`/`testIgnore` |
| Accessibility | `apps/web/remote-test/accessibility.spec.ts` | `playwright.accessibility.config.ts`, spreads dev-identity config |
| Admin | `apps/web/admin-test/{admin,moderation}.spec.ts` + `server.ts` | `playwright.admin.config.ts`, baseURL `4181`/API `4182` |
| Playable | `apps/web/playable-test/shift.spec.ts` + `server.ts` | `playwright.playable.config.ts`, 3 viewport projects, baseURL `4209/4211/4213`, auth+API `4210/4212/4214` |

Fixture generators (deterministic setup via seed + replayed command log, poteto's "seed auth"
pattern): `packages/engine/test/fixtures/*.ts` (`legacy-*.json` pairs, engine-generated) and
`apps/web/test/fixtures/*.ts` (drive the real engine via `execFileSync`, not hand-written JSON).

**Correction to an earlier doc pass**: there are **6** `playwright*.config.ts` files at repo root
(`accessibility`, `admin`, `config` (default), `dev-identity`, `playable`, `remote`), not 5. Verify
this count directly (`ls playwright*.config.ts`) before citing "five" elsewhere — `remote` and
`dev-identity` are near-duplicates (same ports) and may be a merge candidate, not confirmed either way.

## GitNexus

`gitnexus://repo/trum-bia-hoi/context` covers `prototype/` only as of this writing — treat it as
stale for anything under `packages/` or `apps/` and use Glob/Grep/Read instead. Check the
resource's own freshness report before trusting it for those paths; a re-run of
`node .gitnexus/run.cjs analyze` could change this without this file being updated to match.
