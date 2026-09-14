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
  through gameplay. Any change that can move the real economy (price, cost, anchor, payout formulas)
  still needs `npm run sim:career:gate` (or an equivalent sim) against the actual candidate config;
  this admission check only blocks an obviously-wrong self-reported number, it is not proof the
  resulting economy is safe. League tier ids, location ids and
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
  (7-day economic forecast, VND-denominated, 660s client timeout against a ~10-minute server worker —
  `config-exempt` comment at `AdminForecast.tsx:11`), `AdminCompetition.tsx` (moderation). All real copy
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

`apps/server/test/registry.test.ts` (24 tests, selected): `'published default config is used by real
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

## Verification procedure

- `node --import tsx --test apps/server/test/admin-auth.test.ts apps/server/test/registry.test.ts apps/server/test/registry-scopes.test.ts`
  for the server tier (or the combined `npm test`).
- `npx playwright test --config playwright.admin.config.ts apps/web/admin-test/admin.spec.ts apps/web/admin-test/moderation.spec.ts`
  for the UI tier (baseURL `4181`, API `4182`, per `references/features/README.md`'s baseline
  preconditions; the fixture's cert server binds `4183`).
- `npm run check:i18n` still runs (it always scans `admin-api.ts`), but does **not** cover
  `Admin*.tsx` itself — see Gotchas and [ui-shell-i18n-a11y](ui-shell-i18n-a11y.md).
- `npm run verify` is the whole-repo gate for any change here; it does not run the admin Playwright
  config (that's a separate, non-default config the way remote/accessibility are).
- **Any proposal touching price/cost/anchor/payout math needs `npm run sim:career:gate` against the
  actual candidate config, not just admission's `k.value` band check** — see the k-invariant Gotcha
  above; admission alone cannot catch an economy that's broken while `k.value` still reads in-band.

## Uncovered paths

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
