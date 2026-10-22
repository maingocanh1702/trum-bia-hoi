# Admin & config registry (`apps/server/src/registry.ts`; `apps/server/src/admin-auth.ts`; `docs/features/F28-leaderboard.md` §"admin history/review")

## Observable contract

- **Five roles, not three.** Canonical source: `admin-auth.ts:10` and `registry.ts:9,25` —
  `'super'|'economy'|'game'|'support'|'viewer'`. **Correction worth pinning:** F28's changelog prose
  ("Support read-only and MFA Game/Super approval/flags") reads like three roles; the real directory
  has five. `economy` and `viewer` cannot even open the competition/moderation panel (`Admin.tsx:137`
  gates `AdminCompetition` on `['super','game','support'].includes(role)`); `support` can open it but
  is view-only there (`AdminCompetition.tsx:29` `writable = ['super','game'].includes(role)`).
- **MFA is role-gated at two independent layers.** `adminDirectory()` refuses to load any `super`/`game`
  row without a `totpSecret` (`admin-auth.ts:38`); `assertAdminActor()` separately re-throws
  `registry:invalidActor` if a `super`/`game` actor object reaches the registry without `mfa===true`
  (`registry.ts:28`) — defense in depth, not one check duplicated.
- **Admin sessions are a wholly separate cookie/session system from player sessions**
  ([remote-session-outbox](remote-session-outbox.md)'s `remote.ts`/`http.ts` player cookies). Evidence:
  admin's own `admin_sessions` SQLite table (`admin-auth.ts:48-50`) with phase
  `google→mfa→authenticated`, an 8-hour TTL (`ADMIN_SESSION_MS=28800000`, `registry.ts:23`, "BRD9.2
  eight-hour admin authentication limit") versus the fixture server's player `sessionTtlMs:86400000`
  (24h, `apps/web/admin-test/server.ts:20`); **the session token rotates only once, at the transition
  into `authenticated`** (`finish()`, `admin-auth.ts:112-118`) — reached directly from `google()` for a
  non-MFA account, or from `factor()` after a correct OTP — while the `google→mfa` transition itself
  keeps the same token/row and only flips `phase` to `'mfa'` (`admin-auth.ts:129-131`); the client
  never sees the raw token as an opaque id — `context` IS `token_hash` itself (`admin-auth.ts:83`),
  round-tripped via the `X-TBH-Admin-Context` header (`admin-api.ts:21`).
- **Real RFC 6238 TOTP**, not a stub: SHA1-HMAC, hand-rolled Base32 decode, RFC4226 dynamic truncation
  (`admin-auth.ts:14-19`). Verification allows **one time-step of clock skew**
  (`[current, current-1, current+1]`, `admin-auth.ts:147`), constant-time compare
  (`timingSafeEqual`), replay-blocked via a persisted `last_step` floor, and a 5-failure/15-minute
  lockout (`MAX_FAILURES=5`, `LOCK_MS=900000`, `admin-auth.ts:9,149-155`).
- **Governance tiers (A/B/C) are data, not code.** `registryPolicy()` reads
  `config.raw._meta.governance.tiers.{A,B,C}` from the config snapshot itself (`registry.ts:46-50`); a
  changed key matching no tier throws `registry:ungovernedKey` — fail-closed against ungoverned drift.
  `superOnly` paths: `lottery`, `shopSeason`, `donation`, `cosmetics.donationTiersVnd`, plus every tier-A
  `featureFlags` entry (`registry.ts:52`).
- **A proposal's activation timing is the slowest mode any of its changed keys require**
  (`registry.ts:53-57`): campaign-scoped `entitlements`→`immediate`; `league`/`lifePath`/`ledgers` or
  `leaderboard` (except the three *display* keys `topN`/`refreshMs`/`displayNameFilter`, which match
  F28 §3's own "hiển thị" vs. ranking-data split)→`next_season`; tier A, `risk`, or `locations`→
  `next_day`; tier B→`next_shift`; else `immediate`. `next_day` = next VN midnight, fixed UTC+07:00, no
  DST (`registry.ts:61`); `next_season` = the next common LCM boundary of `league.seasons.ranking.days`
  and `.contest.days` after `epochUtc` (`registry.ts:62-68`, real GCD/LCM arithmetic). A mixed proposal
  needing both floors takes the later one, or throws `registry:earlyActivation`
  (`scheduledAt`, `registry.ts:70-76`).
- **Four-eyes rules, precisely:** a tier-A proposal's approver cannot be its author
  (`registry:distinctApprover`, `registry.ts:435`); an emergency's post-hoc reviewer cannot be the
  publisher **or** the original proposer (`registry:distinctApprover`, `registry.ts:323`); emergency
  publication requires `role==='super' && actor.mfa===true` and explicitly forbids touching any tier-C
  key (`registry:emergencyTier`, `registry.ts:301-304`).
- **Admission only guards the DECLARED `k.value` scalar — it does not measure the economy.**
  `validate()` (`registry.ts:157`) throws `registry:bindingRange` if a proposal's *self-reported*
  `k.value` field falls outside the *seed* config's `k.band` — this runs on every `propose()`/
  `publish()`, independent of `npm run sim:career:gate`, but it's a range check on one config field,
  not a simulation. **Confirmed by direct experiment:** a candidate that keeps `k.value: 2.5` (inside
  `band: [2,3]`) while changing an unrelated pricing anchor produced a *measured* k of 209.765 across
  1,000 simulated serves — admission accepted it anyway, because it never runs the candidate config
  through gameplay. **`/admin/forecast` (`AdminForecast.tsx`) DOES run a real candidate-vs-baseline
  simulation** — `reportFromBackup()` (`forecast.ts:19`) forks each existing player's actual save
  (`store.fork(player.id)`) and calls `compareEconomy(game, player.before, player.after)`, replaying
  real players under both the current and proposed config — but its `Totals` shape
  (`faucet`/`sink`/`penalties`/`depositRefunds`/`openingCoins`/`closingCoins`) has no `k` field at
  all (`grep -n "\.k\b|kValue|k\.band|k\.value" packages/engine/sim/forecast.ts apps/server/src/forecast.ts`
  → zero hits) — it reports coin economics, never the k-invariant. **`sim:career:gate`
  (`packages/engine/sim/career.ts:18`) is the opposite gap**: it does check k-band, but
  `simulateCareer()` always plays the module-level `config` singleton (`loadConfig()`'s static import
  of `docs/config/economy.tbh.json`, `config.ts:1,367`) — its CLI (`:110-113`) accepts only
  `--days`/`--seed`/`--out`/`--check-advanced`, no candidate-config input. So today: real
  candidate-vs-baseline simulation exists but doesn't check k; k-band checking exists but can't run
  against a candidate. Neither combination — and admission's `k.value` check is not one either — is
  proof that a price/cost/anchor/payout proposal's resulting k stays in band; see Uncovered paths.
  **Correction (v5-admin-k-admission, 2026-09-17): this gap is closed.** `publish()` (`registry.ts`)
  now requires a real *measured* k, not the self-reported scalar, before a version is admissible.
  `compareEconomy()` (`packages/engine/sim/forecast.ts`) no longer discards `.game`: it now returns a
  `k: {baseline, candidate}` pair via `serveValueStats()` over the serves each side actually generated,
  and `reportFromBackup()` (`apps/server/src/forecast.ts`) pools every real player's candidate stats
  (sum `totalValue`/`served`, then divide once, not a mean of means) into one `measuredK`. `publish()`
  calls an injected `measureK(config, version, actor)` OUTSIDE its own DB transaction — a sync stub in
  tests, the real forecast Worker (`measureKViaForecast`, reusing `forecastEconomy`, not a second
  mechanism) in production — and records the result in a new append-only-except-once
  `registry_measurements` table (`version`, `state: pending|admitted|refused`, `measured_k`,
  `measured_at`). `active()`/`latest()` only ever return a publication whose measurement state is
  `admitted`, so a pending or refused candidate is invisible to every real player's `resolve()`/
  `compose()` — there is no window where an unmeasured or out-of-band config is live. Re-publishing a
  still-pending version throws `registry:kUnmeasured`; a refused one throws `registry:bindingRange`
  (bare message, so the existing HTTP 400 mapping keeps matching) with `measured`/`band` as *Error*
  properties, never live-simulated on the hot path. See Existing proof and Uncovered paths below.
  League tier ids, location ids and
  the location fallback are treated as persisted-identity sets that cannot be renamed or removed
  ("These identifiers are persisted in careers. Tuning numbers cannot migrate their meaning.",
  `registry.ts:160`); `_meta` other than `version`/`date` is immutable (`registry:metadataImmutable`).
  A narrower guard: a proposal cannot delete the `onboarding.loginPrompt.leaveProgress` key group once
  a base config has it (`config:onboarding.loginPrompt:keys`, `registry.ts:169`) — the exact threshold
  keys from [onboarding-guide](onboarding-guide.md)'s `F27` `loginPrompt.leaveProgress`.
- **Scoped configs (segment/campaign/player) compose in rank order** (segment < campaign < player,
  then priority, then sequence — `registry.ts:247-249`) and **detect non-commutative overlaps**: two
  same-kind, same-priority patches are applied forward and backward and compared; a mismatch throws
  `registry:scopeConflict` (`registry.ts:252-260`) instead of silently picking last-write-wins.
- **Impact/forecast tokens close a preview→publish TOCTOU gap.** `previewImpact()` hashes the registry
  revision, activation time, every affected player's before/after resolution, and any superseded
  schedules into one `token` (`registry.ts:539`); `publish()` re-derives the same token and rejects a
  stale one (`registry:staleImpact`, `registry.ts:554`). `assertForecastCurrent()` does the analogous
  check for the async forecast worker (`registry.ts:516-522`).
- **Idempotency is per-actor, not global.** `UNIQUE(changed_by, request_key)` on `registry_proposals`
  (`registry.ts:81`) and the analogous constraint on `registry_support`: resubmitting the same
  `(actor, key)` with an identical fingerprint silently returns the existing row; a different payload
  under the same key throws `registry:keyConflict`.
- **Two independent rate limits share one UI error message.** Registry: 5 publications/calendar-day
  per author (`PUBLISH_PER_DAY=5`, `registry.ts:30,558`, `registry:rateLimited`). Auth: 5 failed OTP
  attempts/15-minute lockout (`admin-auth.ts:154`, `admin:rateLimited`). `Admin.tsx:26`'s `fail()`
  maps **both** to the same `t('error.limit')` string — a real UI-level conflation (see Gotchas).
- **Support tickets are single-use and player-exact.** A ticket authorizes exactly one player-scoped
  publication (`registry_support_uses` is `UNIQUE` on `version`, `registry.ts:100`);
  `supportAvailable()` rejects a mismatched player or an already-used ticket
  (`registry:invalidTicket`, `registry.ts:209-212`).
- **All registry/scope/support/resolution tables are append-only**: every one gets `UPDATE`/`DELETE`
  triggers raising `registry:appendOnly` (`registry.ts:78-90,95-106`), and admin-auth shares the same
  `registry_audit` stream for its own login/MFA events (`admin-auth.ts:68`).
- **Client draft persistence** (`Admin.tsx`): `sessionStorage['tbh.admin.draft.v1']`
  (`DRAFT_KEY`, `admin-api.ts:14`), 512 KB cap (`ADMIN_BYTES=524288`), strict exact-key-set validation
  on read — any extra/missing/mistyped field throws `AdminError('draftCorrupt')`
  (`admin-api.ts:31-39`), recoverable only via a raw-JSON download button. A `focus`/`visibilitychange`
  re-check of `/auth` while a draft is open detects an account swap in another tab and force-clears the
  editor (`admin:accountChanged`, `Admin.tsx:43`) rather than silently adopting the new identity's
  context into an open edit.
- **`AdminCompetition.tsx` is the local-history moderation surface**: `'flag'` requests (boolean,
  keyed by `expectedSeq`) and `'import-review'` requests (`'approved'|'rejected'`, requiring the
  imported archive's 64-hex-char sha256 `digest` **and** `expectedSeq`) — this is the admin side of
  [save-replay-local](save-replay-local.md)'s `store.claimLocal`/`local_imports` pending-review
  boundary. Approve/reject buttons are disabled unless the currently loaded history page's `digest`
  matches the profile's live digest (`AdminCompetition.tsx:98`), so an admin cannot approve against a
  stale view.

## How to reach it

- **Mount point**: a plain path check, not a separate build entry — `apps/web/src/main.tsx:9-10`:
  `location.pathname.replace(/\/$/, '') === '/admin' ? import('./Admin').then(m => m.default) :
  import('./App').then(m => m.App)`. Exercised by every `admin.spec.ts` test through its `login()`
  helper's default `navigate=true` (`page.goto('/admin')`, `admin.spec.ts:22`).
- **UI**: `Admin.tsx` (registry editor: draft/diff/compare/proposals/approve/publish/emergency/support/
  audit), `AdminScope.tsx` (segment/campaign/player scope editor + impact viewer), `AdminForecast.tsx`
  (7-day economic forecast, **denominated in in-game coins, not VND** — `forecast.ts:90` marks
  `vndRevenue.status: 'unavailable'` unconditionally, "No observed donation data; free gameplay sales
  are not a revenue model."; the UI states this explicitly too, `admin.forecast.vnd`: "VND revenue
  unavailable: no observed donation data. In-game coins are not real-money revenue." — 660s client
  timeout against a ~10-minute server worker — `config-exempt` comment at `AdminForecast.tsx:11`),
  `AdminCompetition.tsx` (moderation). All real copy
  routes through `translate(locale, 'admin.'+key)` (`Admin.tsx:12`) — **except** the dev-Google-sign-in
  stub in `admin-api.ts`'s `googleScript(dev=true)` branch, which calls `translate()` directly with the
  **player**-side keys `account.devName`/`account.devSignIn`/`account.devOnly`
  (`admin-api.ts:65,67,69`) — the admin panel's dev-identity form literally reuses player i18n strings,
  not `admin.*` ones.
- **Server**: `AdminAuth` (`admin-auth.ts`) is the authentication state machine; `ConfigRegistry`
  (`registry.ts`) is the config/scope/support/impact/forecast service. Both are explicitly documented
  as internal: *"Shared internal service. No HTTP endpoint accepts `AdminActor`; the admin-auth adapter
  is a separate boundary."* (`registry.ts:122`). Route strings confirmed directly against
  `apps/server/src/http.ts` (all gated behind `pathIsAdmin()`'s `/admin/` prefix check, `:16,97`):
  `GET/POST /admin/auth` (`:105`), `POST /admin/auth/challenge` (`:109`), `POST /admin/auth/google`
  (`:113`), `POST /admin/auth/factor` (`:122`), `POST /admin/auth/logout` (`:102`), `GET /admin/registry`
  (`:148`), `GET /admin/config` (`:183`), `GET /admin/draft-source` (`:163`), `GET /admin/scope`
  (`:159`), `POST /admin/impact` (`:178`), `POST /admin/proposals` (`:188`, 512 KiB body cap, `:99`),
  `POST /admin/approve` / `POST /admin/publish` (`:200-204`), `POST /admin/emergency-review` (`:195`),
  `GET /admin/players` (`:150`), `GET/POST /admin/support` (`:154-155`), `GET /admin/audit` (`:149`),
  `GET/POST /admin/competition` (`:140,144`), `GET /admin/competition/history` (`:135`), `POST
  /admin/forecast` (`:168`). (An earlier pass at this file inferred these paths from client call sites
  only and had them right in substance but missing the `/admin/` prefix on most; corrected here after
  reading `http.ts` directly.)
- **Test-only seams** (`apps/web/admin-test/server.ts`, header comment: *"no production entry point
  imports this file"*): `/__test/sign` mints a **real self-signed RSA-signed** Google-ID-token-shaped
  JWT against a locally generated keypair and a fake JWKS endpoint (`OAuth2Client` pointed at
  `http://127.0.0.1:4183`) — the Google-verification code path is exercised for real, not mocked;
  `/__test/otp` computes a **real** TOTP code by calling the production `totp()` function directly
  (`server.ts:11,29`) — tests never hardcode a 6-digit code; `/__test/moderation` seeds a full
  local-import-pending-review scenario by playing a real `Game` (`startShift`→advance→`serve`→60
  activity heartbeats) and calling the real `store.claimLocal()` (`server.ts:30-45`); `/__test/advance`
  is an offset-based virtual clock, same pattern as the remote-test/admin-test fixtures documented
  elsewhere. Nine seeded accounts cover all five roles, with distinct 32-char TOTP secrets per
  MFA-required account (`server.ts:14`).

## Existing proof

`apps/server/test/admin-auth.test.ts` (16 tests):
`'RFC6238 published SHA1 vectors match six-digit authenticator codes, including beyond2038'` ·
`'admin directory rejects exposed files, symlinks, duplicate identities/factors and missing required MFA'` ·
`'Google plus independent factor rotates an eight-hour admin cookie without creating or modifying any player'` ·
`'bad or replayed Google tokens, cross-origin requests, ambiguous cookies and unlisted subjects cannot authorize registry'` ·
`'OTP replay and persistent subject lockout survive other challenges, connections and restart'` ·
`'role removal or factor rotation invalidates sessions and partial authentication immediately; logout stays independent'` ·
`'failed audit rolls back login and OTP consumption; bad factor counters commit before returning failure'` ·
`'all five HTTP roles use canonical tier gates, dual approval, exact retry, complete JSON and actual new-shift publication'` ·
`'disabled Google stays closed while guest play works and schema8 migration preserves registry and career'` ·
`'replaced or expired Google challenge cannot consume a verified identity and MFA expires independently of active sessions'` ·
`'authenticated scoped publication exposes exact metadata and read-only composed impact; rollback preserves newer defaults'` ·
`'support HTTP tickets require an admin role, recover exact retries and are visibly consumed by a Super player override'` ·
`'forecast HTTP accepts only authenticated version references and rechecks the admin session before delivery'` ·
`'moderation HTTP uses Google plus MFA, exact admin context and archive identity, with immutable retries and no game credit'` ·
`'authenticated emergency transport requires Super MFA and fresh confirmation, preserves retries and records independent post-review'` ·
`'dev identities still require a private admin allowlist and server-verified TOTP before registry access'`.

`apps/server/test/registry.test.ts` (51 tests total as of the pending-vs-scope follow-up below --
`node --import tsx --test apps/server/test/registry.test.ts` reports the live count, since 3 of the
`test(...)` call sites are `for` loops each expanding to 2-3 cases; a plain `grep -c '^test('` will
undercount. Selected -- 9 added by v5-admin-k-admission, 2026-09-17, across its full supervised
review loop): `'a real pricing blowup that self-reports an
in-band k is refused once actually measured (fails on main today)'` · `'a modest pricing change with
a genuinely in-band measured k is admitted'` · `'a pending async measurement never becomes active
until it settles, and re-checking it throws kUnmeasured'` · `'resolve()/compose() never invoke the
measurer on the real-player hot path -- only publish() does'` (proves no Worker/sim ever runs on
`compose()`'s real-player path, only inside `publish()`, and only outside its own DB transaction) ·
`'the real forecast worker measures a genuine price blowup and refuses it, not just the
self-reported k.value'` and `'a scoped candidate refused by the real worker never composes into that
player's resolve()'` (exercise `measureKViaForecast`/`forecastEconomy`/`forecast-worker.mjs` end to
end, not an injected stub) · `'a scoped campaign that expires within the forecast horizon is
measured on its own serves, not the reverted baseline'` · `'a scoped proposal against a still-pending
sibling for the same scope is refused as measurementPending, not silently accepted'` (renamed by the
pending-vs-scope follow-up below, same case) ·
`'scopeSource() stays admitted-only while a newer sibling for the same scope is still pending'`
(renamed, same case).
`packages/engine/test/forecast.test.ts` gained one case: `'a candidate whose after-timeline never
introduces a version outside the before-timeline measures as baseline, not unmeasurable'`. Also
updated: the schema7/8/9 migration tests in `registry.test.ts` and in
`admin-auth.test.ts`/`registry-scopes.test.ts`/`local-import.test.ts`/`client-sequence.test.ts`/
`http.test.ts`/`checkpoint.test.ts`/`presence.test.ts`/`accounts.test.ts` now additionally drop
`registry_measurements` before simulating an old schema, and assert `user_version=11`;
`SCHEMA_VERSION` moved 10→11 for this migration.

`apps/server/test/registry.test.ts` (pending-vs-scope follow-up, 2026-09-17, across its own
supervised review loop; see the file itself for the exact count and names -- listed here selectively,
not exhaustively): the cases written for the original acceptance criteria --
`'a scoped conflict against a still-admitted original is caught immediately, even
while its own cancellation is pending (round-6 finding 1)'` · `'overlapping-audience scoped proposals
are refused as measurementPending while the first is still pending'` (a rewrite of a pre-existing
case, not a new one) · `'an emergency cannot race a
due-now-but-pending Tier C entry at the same scope slot to bypass emergencyTier'` ·
`'pendingSchedules() excludes a refused future schedule from emergency displacement and preview'` ·
`'a forecast report computed while an unrelated version was pending is stale after that version
admits'`; then the cases added while fixing the review loop's own findings: `'a pending emergency does
not archive the schedule it names until it admits, and never does if refused'` ·
`'measureKViaForecast refuses a measurement whose registry state went stale while the worker ran'` ·
`'a pending default proposal blocks any scoped proposal from being created, and vice versa'` ·
`'a forecast report stays current through an unrelated pending publication, and only goes stale once
it admits'`.

`apps/server/test/registry.test.ts` (see the 51-tests-total note above; selected pre-existing/24 of them): `'published default config is used by real
openings, never rewrites a live shift, and replays exactly after restart'` · `'Tier A requires a
distinct Super approval and becomes active exactly at VN midnight across connections'` · `'tier
classifier covers every section, flags beat broad balance groups, and mixed changes require all
roles'` · `'shared validation rejects unsafe config, held features, metadata privilege changes and
early schedules atomically'` · `'proposal retries, stale bases and same-key conflicts cannot publish
another snapshot; rollback creates a fresh version'` · `'season publication waits for common
boundaries, including a mixed cap change after today's season ending'` · `'changing publishers cannot
bypass the daily limit for one proposal author'` · `'emergency gate rejects non-Super, missing MFA,
Tier C, malformed flags, schema and catalog bypasses'` · `'hotfix publication, supersession markers and
24-hour ticket roll back together on audit failure'` · `'archive and eligibility tuning waits for the
common season boundary while topN and refresh stay next-day'` (remaining 14 named tests cover
migration/rollback/scheduling edge cases — open the file for the full list).

`apps/server/test/registry-scopes.test.ts` (22 tests, selected): `'per-key precedence retains default
and segment values under campaign and ticketed player overrides'` · `'equal-priority contradictory
overrides are rejected atomically; explicit higher priority wins'` · `'support ticket is tied to the
exact player, consumed once atomically, and retries never grant extra value'` · `'impact refuses
contradictory candidates and future expiry failures using real publication validation'` · `'preview
token rejects overlapping publications and expiry drift, while exact committed retries recover once'` ·
`'emergency replaces only the exact scoped schedule chain; expiry never resurrects it and other scopes
keep schedules'` · `'emergency cannot silently remove active Tier C keys hidden behind an A/B scheduled
successor'` (remaining 15 named tests cover composition/expiry/migration edge cases — open the file).

`apps/web/admin-test/admin.spec.ts` (23 tests, selected): `'real registry edit, diff, publish
confirmation, audit and pinned player saves; responsive keyboard UI'` · `'viewer is read-only and
setup-disabled sign-in never loads GIS or creates a player'` · `'Tier A requires another Super Admin
with independent MFA and keeps scheduled activation'` · `'account switch clears protected UI without
applying the old tab draft as the new admin'` · `'stale base preserves text and refuses mutation after
another admin publishes'` · `'support operator records one ticket, then Super applies it to exactly one
player and the consumed receipt remains visible'` · `'stale publication impact closes confirmation and
requires inspection of the newly masked audience'` · `'seven-day forecast renders real protected worker
totals in Vietnamese and English without playing the source save'` · `'emergency mobile confirmation
names replaced schedules, recovers a lost publish receipt and records post-review in VI/EN'` ·
`'M2-ONBOARDING local editor publishes thresholds and guide steps; disabled mode hides a retained guide
in VI/EN'` (remaining 13 named tests cover comparison/import/recovery edge cases — open the file).

`apps/web/admin-test/moderation.spec.ts` (5 tests): `'Game admin inspects bounded source pages and
reviews or flags without altering the game; VI/EN mobile controls'` · `'lost decision acknowledgement
keeps one exact request across reload and never reapplies an old decision'` · `'a stale decision forces
inspection, while storage failure prevents any write and confirmed ACK clears before failed refresh'` ·
`'Support is read-only and changing the admin identity clears protected evidence and hides another
operator pending intent'` · `'a delayed history response cannot restore protected contents after
logout; damaged recovery is downloadable'`.

`packages/engine/test/forecast.test.ts` (7 cases: the five below, the after-timeline case of the admin k admission and, since S5 review round 1, the D8 case at the end of this paragraph) — direct engine-tier proof of `projectEconomy`/
`compareEconomy` (`packages/engine/sim/forecast.ts`), the sim `reportFromBackup()` above wraps for
`/admin/forecast`: `'seven-day projection conserves the wallet, preserves a real paused input and
deterministically replays every modeled command'`, `'scheduled and expired prices switch only at real
openings while the existing shift retains its immutable pin'`, `'a daily cap exhausted before a midday
activation is retried at that activation instead of skipped until tomorrow'`, `'forecast rejects
unsupported horizons and ambiguous timelines before projecting'`, `'an existing signed lease separates
returned principal and renews by location identity after multiplier tuning'` (the deepest case: renews
a lease across a projected multiplier retune, checking deposit-refund/penalty math and per-location
renewal identity). None of these five asserts a `k` value directly (unchanged by v5-admin-k-admission,
which added `k` to `compareEconomy()`'s return but did not add assertions to these five) — the
k-measurement proof instead lives in `registry.test.ts`'s new cases above, which exercise the field through `publish()`'s admission gate rather than through `compareEconomy()` in isolation. S5 review round 1 added `'the forecast opens the first shifts of a save at once and waits the cooldown from the fourth, like the engine; with the allowance off it waits from the second (D8)'`: the forecast bot asks the engine's own `restRequired` (rules.ts, read from the snapshot that opens the shift) instead of testing the stamina itself, so a 2.1.0 save's first three shifts open at once in the projection too; red with the old stamina condition.

`apps/server/test/forecast.test.ts` (4 cases) — server-tier proof of the forecast Worker path that
`measureKViaForecast()` rides on: `'seven-day registry plan includes removed audience and expiry
boundaries even when activation is masked'`, `'real worker forecasts all existing saves, preserves
source rows and keeps the request event loop responsive'`, `'forecast cancellation releases its worker
slot and empty audiences do not fabricate revenue'`, `'a later scoped publication invalidates the
report even while its default proposal base remains current'`. Run
`node --import tsx --test apps/server/test/forecast.test.ts`. (Citation restored 2026-09-18: the
v5-admin-k-admission squash rewrote this section and dropped it; `verify:map` caught the gap.)

## Verification procedure

- `node --import tsx --test apps/server/test/admin-auth.test.ts apps/server/test/registry.test.ts apps/server/test/registry-scopes.test.ts packages/engine/test/forecast.test.ts`
  for the server + engine-sim tier (or the combined `npm test`).
- `npx playwright test --config playwright.admin.config.ts apps/web/admin-test/admin.spec.ts apps/web/admin-test/moderation.spec.ts`
  for the UI tier (baseURL `4181`, API `4182`, per `references/features/README.md`'s baseline
  preconditions; the fixture's cert server binds `4183`).
- `npm run check:i18n` still runs (it always scans `admin-api.ts`), but does **not** cover
  `Admin*.tsx` itself — see Gotchas and [ui-shell-i18n-a11y](ui-shell-i18n-a11y.md).
- `npm run verify` is the whole-repo gate for any change here; it does not run the admin Playwright
  config (that's a separate, non-default config the way remote/accessibility are).
- **Admission's `k.value` band check is not economy-safety proof for a price/cost/anchor/payout
  change** (see the k-invariant Gotcha above). Run `/admin/forecast` for a real candidate-vs-baseline
  coin-economics comparison against actual existing players — but it does not compute or check `k`;
  no tool combines a real candidate simulation with a k-band check (`sim:career:gate` checks k-band
  but only ever plays the pinned seed config) — see Uncovered paths. Treat a k-band regression in
  such a proposal as unverified by any command in this file.

## Uncovered paths

- Measured-k admission: core gate landed on `supervised/v5-admin-k-admission`. **Pending-vs-scope
  semantics are also closed (2026-09-17), by one unifying rule instead of the six rounds of per-site
  patching `docs/prompts/k-admission-handoff.md` records:** a publication in measurement state
  `pending` does not exist for scheduling purposes -- no effect on conflicts, schedules, emergency
  replacements or forecast freshness, exactly like a publication that was never proposed; a refused
  publication gets the identical treatment. `currentBase()` (`registry.ts`) is the single choke point
  for this -- called from `propose()`, `approve()` and `publicationAt()` (which `publish()`,
  `impact()` and `forecastPlan()` all route through) -- and refuses `registry:measurementPending`
  whenever a proposal's scope overlaps ANY currently-pending publication (same (kind,id) slot
  unconditionally, or any playerIds intersection), so two publications can never be pending on
  overlapping scopes at once; every scope/schedule function in the file (`predecessor()`,
  `currentScopes()`, `compose()`, `emergencyScopeReplacements()`, `pendingSchedules()`,
  `validatePublications()`, `draftSource()`/`scopeSource()`) went back to reading admitted-only state,
  since a competing pending sibling can no longer exist for them to reason about. Forecast freshness
  additionally binds to a `measurementSeq()` generation counter (count of settled, non-pending
  `registry_measurements` rows -- monotonic since each row transitions exactly once), not just
  `registry_publications.seq`, so a measurement settling elsewhere invalidates an in-flight report even
  though publishing a new version wasn't what changed. Proof: the 5 new/renamed cases cited above in
  Existing proof, each written to fail on the pre-fix code and pass after (round-6 findings 1-4
  verbatim in the handoff map 1:1 to these).
- Route **paths** are now confirmed against `http.ts` directly (see "How to reach it"), but this pass
  did not read every route handler's full body — request/response field shapes beyond what's cited
  above (e.g. `/admin/players`' pagination shape, `/admin/config`'s exact response envelope) are not
  individually verified.
- `apps/server/src/competition.ts`, `competitive-score.ts`, `forecast.ts`, and `leaderboard.ts`'s
  deeper economics (ranking math, eligibility scoring, forecast worker internals) are out of scope
  here — they belong to the not-yet-written `seasons-leaderboard` feature file. This file only
  documents what `AdminCompetition.tsx`/`AdminForecast.tsx` expose of them.
  `apps/server/src/leaderboard.ts`'s `rankSettings()` is called from `registry.ts:167`'s
  `validateAdmission()` but its own validation rules are not detailed here.
  `apps/server/src/forecast-worker.mjs`/`season-snapshot-worker.mjs` (the actual out-of-process worker
  entry points) are unopened by this pass — their wiring is inferred from `AdminForecast.tsx`'s 660s
  client-side timeout comment ("exceeds the ten-minute worker bound"), not line-confirmed.
- No test in the lists above was individually re-opened to confirm its assertions beyond the ~10 read
  in full during authoring (`propose`/`approve`/`publish`/scope-conflict/emergency paths in
  `registry.ts`, the Google/TOTP flow in `admin-auth.ts`); the remaining ~50 harvested test names are
  cited by exact string only, not by body.
- The `admin.*` i18n namespace (214 keys, confirmed vi/en-paired by direct count) has no static guard
  against a `t('admin.typo')` call inside `Admin*.tsx` referencing a nonexistent key — see Gotchas.
- **`Admin.tsx:99`'s hardcoded `TRÙM BIA HƠI`/`Tiếng Việt`/`English` is a live, uncaught i18n-key
  violation** — the `brand`/`language.vi`/`language.en` keys it should use already exist (see
  Gotchas) — fixing it is a one-line change to that JSX, not documented here further since this file
  tracks verification, not a fix backlog.

## Variants

- **success** — `admin.spec.ts`'s main edit/diff/publish/audit test; `registry.test.ts`'s default-config
  and Tier-A approval tests.
- **cancel/reason** — extensive: `AdminError` codes are asserted throughout `admin-auth.test.ts`/
  `registry.test.ts`/`registry-scopes.test.ts`; every reject path in `AdminCompetition.tsx` requires a
  non-empty `reason` before enabling its action buttons.
- **empty** — `registry-scopes.test.ts:222` `'removing old scoped Tier A keys retains Super approval
  and the day floor, including an empty replacement'` proves an empty-keys proposal is **accepted**
  when it clears a non-empty scope predecessor (`d.keys` is `[]`, then approved/published normally).
  The actual rejection path — `registry.ts:203`'s `if (!governed.length) throw
  Error('registry:invalidKeys')`, which fires only when current **and** any prior/displaced scope
  keys are all empty — has no test asserting the throw itself (`grep -rn "invalidKeys"
  apps/server/test/` → zero hits); that refusal path is untested. (An earlier pass cited
  `registry.ts:77` for this, which is wrong — that line is schema `CREATE TABLE` setup, unrelated to
  empty-proposal handling.)
- **persistence** — draft/intent `sessionStorage` recovery across reload in both `Admin.tsx` and
  `AdminCompetition.tsx`; append-only ledger tables survive restart (`registry.test.ts`'s "preserves
  ... after restart" tests).
- **capacity** — `ADMIN_BYTES` (512 KB) draft/body cap; `MAX_PENDING=4096` pending-session cap;
  `FILE_BYTES=65536`/64-row admin-directory cap; `PUBLISH_PER_DAY=5`.
- **duplicate/idempotent** — per-actor `request_key` on proposals and support tickets; ticket
  single-use (`registry_support_uses` unique on version).
- **stale** — `registry:staleBase`, `registry:staleImpact`, `registry:staleForecast`, "account switch
  clears protected UI" (`admin.spec.ts:109`).
- **time-jump** — `next_day`/`next_season` scheduling boundary tests in `registry.test.ts`/
  `registry-scopes.test.ts`; `/__test/advance` virtual clock in the Playwright fixture.
- **offline/reconnect** — "lost proposal acknowledgement freezes the exact payload across reload and
  retries once" (`admin.spec.ts:94`); "lost decision acknowledgement keeps one exact request across
  reload" (`moderation.spec.ts:55`).

## Gotchas

- **The i18n-check exemption is narrower than "admin isn't localized."** `scripts/check_web_copy.mjs`
  line 7 excludes any file starting with `Admin` from its per-file hardcoded-literal/JSX-attribute/
  missing-`t()`-key AST walk (while still scanning `admin-api.ts`). But the VI/EN key-**set** parity
  and interpolation-placeholder check (`check_web_copy.mjs:4-6`) runs unconditionally over the whole
  `vi.json`/`en.json`, independent of which `.tsx` files use which keys — confirmed the 214 `admin.*`
  keys are fully vi/en-paired today (0 vi-only, 0 en-only). The real, narrower gap: a `t('admin.typo')`
  call *inside* `Admin*.tsx` referencing a key that exists in **neither** dictionary would render the
  raw key string at runtime (`i18n.ts`'s fallback behavior) and **no static check would ever catch
  it** — the same typo inside a scanned file (e.g. `App.tsx`) would fail `npm run check:i18n`
  immediately. See [ui-shell-i18n-a11y](ui-shell-i18n-a11y.md) for the check's full mechanics.
- **The admin panel's brand/language-picker text is a real i18n-key violation, not a design
  exemption.** `Admin.tsx:99` renders `TRÙM BIA HƠI`, `Tiếng Việt`, and `English` as literal JSX text
  — but `brand`, `language.vi`, and `language.en` **already exist** as keys in both `vi.json`/`en.json`
  with these exact values (`i18n/vi.json:2,539-540`, `i18n/en.json:2,539-540`); the player shell's own
  nav already calls `t('brand')` (see [ui-shell-i18n-a11y](ui-shell-i18n-a11y.md)). `Admin*.tsx`'s
  exclusion from `check_web_copy.mjs` (see the i18n-checking-gap gotcha above) means no automated check
  catches this, but it's a real, fixable violation of the owner's 100%-i18n-key rule — not "the same
  pattern any language picker uses."
- **Two unrelated rate limits (publish-per-day, OTP lockout) surface through the identical UI message**
  (`t('error.limit')`, `Admin.tsx:26`) — an admin seeing "limit" has no way to tell from the UI alone
  which one tripped; only the audit log (`AdminFactorRejected` vs. the publish path's silent 429)
  disambiguates.
- **`economy` is the role for ordinary tier A/B tuning; `game` is tier C; `super` bypasses tier checks
  entirely** (`registry.ts:294` `permit()`) — a detail absent from both F28's prose and from a first
  read of `Admin.tsx`'s UI, which only distinguishes `canWrite`/`viewer-or-support` and a separate
  `role==='super'` gate for emergency/scope-player features. The finer economy-vs-game-vs-super split
  is enforced **only** server-side.
- **`config-exempt` comments are pervasive across both files** (session/protocol/pagination bounds,
  RFC-mandated constants, the fixed VN UTC+07:00 offset) — they mark values intentionally outside
  `check_economy_config.py`/`check_config_coverage.py`'s gameplay-tuning governance, not oversights.
- **The dev-Google-sign-in stub is shared plumbing, not admin-specific**: `admin-api.ts`'s
  `googleScript(dev=true)` branch is structurally the admin analogue of the player-side dev-identity
  flow ([remote-session-outbox](remote-session-outbox.md)), and literally borrows the player's
  `account.dev*` copy keys rather than defining its own `admin.*` equivalents.

## Related

[ui-shell-i18n-a11y](ui-shell-i18n-a11y.md) — the `check:i18n` mechanics this file's Gotchas rely on,
and the general 44px/reduced-motion rules `admin.css` follows independently (`admin.css:6-10,19`).
[remote-session-outbox](remote-session-outbox.md) — the player-session cookie/journal system that
admin sessions are deliberately separate from; that file documents `http.ts`'s player-route error
mapping (`:299-329`) in depth, which this file's `/admin/*` routes do not share.
[save-replay-local](save-replay-local.md) — `store.claimLocal`/`local_imports` is the data
`AdminCompetition.tsx`'s import-review actions approve or reject; that file's owner-deferred
no-HTTP-upload-route gap is exercised here only through the `/__test/moderation` seam, never through a
real upload.

## Changelog — S4 table and chair levels
| Date | Change |
|---|---|
| 2026-10-20 | S4 (JSON 2.0.23): two Tier A dotted entries `upgrades.table.tableUpgrade` and `upgrades.table.chairUpgrade` (prices, gates, benefits: dual approval, `next_day`) join `_meta.governance.tiers.A.sections`; `registry.test.ts` `tier classifier covers every section, flags beat broad balance groups, and mixed changes require all roles` walks them and `npm run check:config` (coverage) resolves them. The admin editor tier on Windows stays the baseline's `SKIPPED:`; editing each key one by one and the k-admission check is S6's. |
| 2026-10-21 | S5 `eco21-balance-pass`, review round 1: (a) `apps/web/admin-test/admin.spec.ts` `login()` moves the isolated clock one TOTP step (`/api/__test/advance?ms=30000`) before it asks `/api/__test/otp` for the code of every `super*` subject: `admin-auth.ts` `factor()` refuses a step not newer than the subject's last one (replay protection, untouched) and the test server answers the step of its own clock, so a second `super-one` login inside one 30 s step failed `M2-ONBOARDING` with "Mã không hợp lệ, hết hạn hoặc đã dùng" on the real Linux runs of both chain tips; `moderation.spec.ts` already did the same. Test-only, nothing weakened; the admin Playwright tier does not run on Windows (SKIPPED block of the S5 PR), the validation is the orchestrator's targeted Linux admin run. (b) `packages/engine/test/forecast.test.ts` gained the D8 case cited above (7 cases). |
| 2026-10-21 | S6 `eco21-ui-assets`: every key S1–S5 added is editable one by one and admitted. Server tier: `apps/server/test/registry.test.ts` `S6: every seat-model key S1-S5 added is governed by its tier, editable one by one through the registry by the roles of that tier, admitted by the measured k, and reaches a new player` — 17 keys (`spawn.pPair`, `upgrades.table.tablePriceBase` / `chairPriceBase` / `chairsAfterTables` / `orderShape.solo.pBeer` / `orderShape.pair.pMoi`, `locations.list` (tableSlots), `spawn.capacityDemand.refTables` / `maxMult`, `runtime.queueBaseSlots` / `queueSeatsPerSlot`, `patience.thuongMs`, `upgrades.table.tableUpgrade.levels`, `chairUpgrade.priceBase` / `stepBase` / `levels`, `shift.noCooldownFirstShifts`), each its own publication under its own author: the tier of `registryPolicy` (A or B), the diff of the proposal is exactly that key, a Tier A key refuses publication without a distinct Super and refuses the author's own approval, the measurement row is `admitted` with k in band (`sampleMeasurer`, which prices one beer from `menu.bia.price` only: it does NOT react to a seat key — the reaction is pinned by `S6: the k check reacts to a seat key once a measurer reads it: the Lv4 tip factor far out of range is measured and refused, a small one is admitted`, a measurer that scales the sample k by the candidate's top-level `tipMult`: 1.3 admitted, 40 refused with `registry:bindingRange` and a `refused` measurement row), Tier A is scheduled for the next day and Tier B at once, the active config carries the edited value, a new player's first shift pins the version. UI tier: `apps/web/admin-test/admin.spec.ts` `S6 seat-model keys S1-S5 are editable one by one: each proposes with exactly its own diff row, a Tier A key publishes through a second Super and a Tier B key at once, both reach a new player` (15 drafts by the Economy Admin, every path in the key box, one diff row each with the JSON value, the dual-approval line on Tier A; then `spawn.capacityDemand.refTables` through super-one — scheduled, measured k admitted — and `runtime.queueBaseSlots` published by the Economy Admin at once, a playing guest keeps its pin and the next new player opens on both). The admin tier cannot run on Windows (the fixed-port web server hangs here, identical on main): the S6 e2e is validated by the orchestrator's Linux admin run. `npm run check:config` (coverage) green: no governance entry changed in S6. |
| 2026-10-21 | S6 review round 1: the admin e2e `S6 seat-model keys S1-S5 are editable one by one ...` as it really runs (Linux 30/30 ×3 on 715b609; re-run after round 1): the 15 drafts, then the Tier B key published FIRST at once (a playing guest keeps its pin, the next new guest opens on it), then the Tier A key through the second Super (scheduled for the next VN midnight: `publicationAt` refuses an earlier activation, `registry:scheduleConflict`), then `/__test/advance` past its activation and a fresh guest on a version carrying both keys. The admin test server has no `measureK` (default self-report measurer): the e2e proves the admission path, not a seat-key reaction — that is the server case named above. `registry.test.ts` is LF again. |
| 2026-10-22 | Wave 3 `fun-kick-table`: the new section `kickTable` (`feeRate`, `repPerGuest`) is Tier A (`_meta.governance.tiers.A.sections`; `registryPolicy` → tier A, next_day, dual approval) with an 08-SPEC §22 row (`npm run check:config` coverage green). Server tier: `apps/server/test/registry.test.ts` `Wave 3: the two kickTable keys are Tier A, editable one by one through the registry by an Economy author and a second Super, and reach a new player (the k admission does not react to them)` (each key its own one-key proposal, the Economy author cannot approve it, a second Super does, the publication is scheduled for the next day and its k measurement admits it, a new player opens a shift on it; title as renamed in review round 1, row below). `apps/server/src/registry.ts` needed no change (the governance lives in the JSON). No admin e2e change (the S6 e2e proves the editor path for any key; the admin tier cannot run on Windows). |
| 2026-10-22 | Wave 3 `fun-kick-table`, review round 1: the k admission does NOT react to the two `kickTable` keys, and the server case no longer says it does: `sampleMeasurer` prices one beer (`menu.bia.price`) and the production `measureKViaForecast` (`apps/server/src/forecast.ts`) projects with `createManagementPolicy` (`packages/engine/sim/forecast.ts`), whose bot never kicks, so a proposal of `feeRate` 0 would be admitted too. The guards of `kickTable.feeRate` / `kickTable.repPerGuest` are the validator (`validate` in `packages/engine/src/config.ts`), the dual approval (an Economy author and a second Super, next day) and running `npm run sim:kick` before publishing (08-SPEC §22 `kickTable` row). The case is renamed `Wave 3: the two kickTable keys are Tier A, editable one by one through the registry by an Economy author and a second Super, and reach a new player (the k admission does not react to them)`; its assertions are unchanged. No new measurer (orchestrator decision). |
| 2026-10-22 | Stage 07, review round 1 (E3): the forecast report's `policy` label (`FORECAST_POLICY`, `packages/engine/sim/forecast.ts`) is "v2" and describes the projection as it is (seat model: tables and second chairs first; no dog; never sends a table home; stepwise leasing; the first shifts open without rest, D8); text only, no test pinned it. Open item recorded in BLOCKERS `07 · k admission of the live registry refuses established audiences (pre-existing)` (review E1). |
| 2026-10-22 | Owner calls of PR #30 (stage 07b): the seed is labelled 2.1.1 (`kickTable.feeRate` 0.5). A fresh database publishes it as its first version; a database that registered a 2.1.0 content opens without `store:configVersionConflict` (a new label), registers 2.1.1 beside it and keeps serving the version its registry published — `apps/server/test/kick-table.test.ts` `a database that registered a 2.1.0 content opens on the bundled 2.1.1 without store:configVersionConflict and keeps serving what its registry published` (the S6 content and the stage-07 content; a second 2.1.0 content still throws). The k admission still does not react to `kickTable` (row above). |
