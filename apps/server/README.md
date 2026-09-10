# Server persistence — Trùm Bia Hơi

`@tbh/server` exports `GameStore`, the internal M4 persistence layer, and
`@tbh/server/http` exports a Node HTTP server with durable guest and Google account cookie ownership.
It runs the existing pure engine against SQLite. Normal new web careers use server snapshots and a durable command journal. Explicit
legacy local careers stay separate; full account/import and admin integration remain.
The API is locally runnable; it is not full M4 or a production release.

Tested runtime: Node22.22.1 with native `node:sqlite` (SQLite3.51.2). The server
workspace requires at least22.22.1. SQLite remains marked experimental by Node.
No additional database or ORM package is installed.

```ts
import { GameStore } from '@tbh/server';
import { randomInt, randomUUID } from 'node:crypto';

const store = new GameStore('/path/to/private/game.db');
// Only the trusted authentication service chooses this identity and seed.
const playerId = randomUUID();
store.createPlayer(playerId, randomInt(0x100000000));
const response = store.command(playerId, {
  idempotencyKey: randomUUID(), command: { type: 'startShift' },
});
const page = store.eventsAfter(playerId, response.lastEventSeq);
// If page.hasMore, request the next page using page.lastEventSeq.
store.close();
```

Every operation uses server time, restores the latest durable revision when needed,
and atomically appends new command/domain-event rows plus the derived player
projection/frontier and matching checkpoint. SQLite serializes competing writers; foreign keys and
append-only triggers protect historical rows. Failed transactions evict mutated
cache so retry starts from committed state. Command retries retain the first
result while synchronizing current autonomous events. Returned state is detached.

Pass a validated `Config` as the second constructor argument for the server's
configured opening snapshot. Existing shifts retain their pin; only a successful
new shift adopts the new version. The first snapshot of each version stays exact,
including dictionary order needed by historical seeded sampling; equivalent JSON
key reordering reuses that snapshot. This is not the admin approval/override service.

The process cache is bounded and invalidated by durable revision. A miss verifies
full history integrity and restores a trusted checkpoint without resimulation.
Legacy rows without a checkpoint still replay and compare their projection once;
rows needing additive replay enrichment keep replaying without rewriting history.
Cold-load history parsing and detached response cloning still need release sizing. SQLite/WAL is the current single-host implementation; multi-host database
operations and deployment remain M4/M9 work. Protect the database directory using
the host's filesystem permissions; never expose its files or this internal owner-id
argument directly to unauthenticated clients.

Run `npm run test:server` for file/process restart, two connections, retry isolation,
mid-write rollback, history guards, config pinning, calendar/pause and corruption
checks. `npm test` includes this suite along with all engine regressions.


## Guest HTTP API

The launcher binds loopback only. Set an explicit database path and exact frontend
origin; the database parent directory must already exist. For an isolated local run:

```sh
TBH_DB="$PWD/.qa/game-api.sqlite" TBH_ORIGIN=http://127.0.0.1:5174 npm run dev:server
```

Default API port5175 (`TBH_PORT`). Deployment security settings are
`TBH_SESSION_TTL_MS` (default7days), `TBH_RATE_MAX` (120requests per IP/window),
`TBH_RATE_WINDOW_MS` (60seconds). These are not economic/game tuning. New database
files use process umask077. Production HTTPS must terminate at a trusted same-site
reverse proxy; do not expose this development listener directly. IP throttling uses
socket addresses, never untrusted forwarded headers; a shared proxy/multi-host rollout
must supply edge rate limits. Session credentials are not accepted in URLs or bodies.

| Method | Path | Input / result |
|---|---|---|
| POST | `/auth/session` | Empty JSON; new random guest + HttpOnly cookie, or resume current valid cookie. An invalid/expired supplied credential is refused, never silently replaced. |
| POST | `/auth/logout` | Empty JSON; revoke credential and expire cookie. Player history remains. |
| GET | `/player/state` | Owned projection, `configVersion`, `serverNow`, `revision`, `lastEventSeq`. |
| GET | `/player/events?after=N` | Up to100 owned durable events after a validated cursor; `lastEventSeq` is this page's continuation cursor, `hasMore` reports remaining rows at its read frontier. |
| POST | `/player/connect` | `{}` opens a server-issued owned client stream; `{clientId}` resumes it. Returns current projection, `clientId` and `acknowledgedSeq`. |
| POST | `/player/command` | `{clientId, clientSeq, idempotencyKey, command}`; contiguous sequence plus existing engine handler, authoritative projection/result/ack. No client clock, player ID, seed or totals. |

Clients send `credentials: 'include'`. POST requests require the configured Origin
and JSON; CORS allows only that origin. HTTPS uses `__Host-tbh-session` with Secure;
loopback HTTP uses `tbh-session`. Cookies are HttpOnly/SameSite=Lax/Path=/, responses
are no-store, and database sessions retain only SHA-256 hashes of256-bit random
credentials. Session and new player creation share one transaction. Schema2 adds
sessions without altering v1 players, command/event history or projections.

Public projections omit RNG, generation seeds and the full event array; catch-up
redacts seed fields too. No raw/private config snapshot is served yet. The public
config projection/registry is still required before web cutover. The generic command
route deliberately reuses the engine; domain-specific HTTP aliases are not required
by the architecture guide. There is no remote save-upload authority bypass.

Current tests use real HTTP sockets and SQLite, not mocked request handlers. They
cover session isolation/restart/expiry/revocation, CSRF/CORS, secure cookies, invalid
input/body limits, atomic rollback/migration, idempotent service, pause and event
catch-up. Request/header timeouts and bounded per-process abuse limiting protect
this service boundary; full CAPTCHA/flags/appeal and production observability remain.
Google account linking/one-time local claim, client buffering and offline replay,
reconnectGraceMs closure, WebSocket push and the web adapter remain explicit M4 work.

Command properties are allowlisted per action at the HTTP boundary, in addition to
the engine's value validation. Empty/malformed supplied session cookies are refused
without creating another player. Event catch-up queries bounded SQLite rows directly;
it does not hydrate history or advance simulation. Use state/command responses for
current simulation state; page through events using the returned cursor. Repeating a
page is safe; clients deduplicate by sequence. Later appends are picked up by subsequent
polls, including after `hasMore:false`. State/command cold starts still load and
validate full history; pagination does not remove that memory and I/O cost.

Google setup status: owner has no Web Client ID yet (2026-09-09). See the
[setup guide](../../docs/google-signin-setup.md); no Google environment variable is
consumed by the current launcher and no real Google login/cloud claim is enabled.

| Date | Change |
|---|---|
| 2026-09-09 | Added hashed guest sessions and locally runnable authenticated HTTP transport around GameStore; full M4/client cutover remains pending. |
| 2026-09-09 | Addressed HTTP review: exact command properties, explicit invalid-cookie refusal, and bounded durable event pages with continuation; catch-up no longer advances simulation. |

| 2026-09-09 verification | Config/build182 engine/server checks and actual CLI/Chromium smoke pass at62b4445. Independent full-range review090d920..62b4445 reports no remaining introduced defects; reviewer socket reruns were blocked by sandbox listen EPERM. |


## Ordered client input

Schema3 adds owned client streams and append-only receipts referencing canonical
command keys. Each tab/device creates its own stream, persists its ID and outgoing
commands before transmission, then resumes that ID after reload. Send clientSeq1,
then2, etc.; a successful HTTP200 acknowledges processing even if the engine result
is a domain refusal. HTTP409 returns `acknowledgedSeq` with `sequenceGap`,
`sequenceConflict` or `idempotencyConflict`; it never consumes that command sequence.
Process the missing sequence before later ones. Reuse the exact command/key/seq when
a response is lost. Reads may advance autonomous gameplay independently of input.

Player-wide idempotency remains the source of results across streams. Same key with
an identical payload can be acknowledged on another sequence/stream without replaying
its effects. Different payload under the same key is refused. Command/event/projection
and receipt commits are atomic; acknowledgement is the last durable receipt sequence,
not a separate writable counter. Deferred foreign keys prevent an orphan receipt.
Cookie ownership applies to connect/resume/command; knowing a stream ID grants no
access. HTTP no longer accepts unsequenced commands. The internal GameStore.command
entry point remains trusted; the public route uses GameStore.clientCommand.

This completes server ordering, not F23 reconnect acceptance. Connection expiry and
normal timeout closing, the durable browser outbox/reconnecting UI, public registry,
Google guest claim and remote web integration remain mandatory follow-on work.

| Date | Change |
|---|---|
| 2026-09-09 sequence | Added transactional per-client receipts, ordered HTTP commands and owned stream resume; schema0/1/2 migrate to3 preserving accounts/history. Tests cover lost response, multiple tabs, gaps/conflicts, failure acknowledgement, rollback and session isolation. Verification/review in progress. |

| 2026-09-09 sequence verification | e390a1c: config/build187 engine/server,21 server checks, actual CLI/Chromium pass. Native review794d75c..e390a1c found no introduced actionable defects and independently passed12 storage checks. Client buffer/timeout closing and remote cutover remain pending. |


## Google identity verifier (prerequisite only)

`src/google.ts::googleVerifier(clientId)` uses the official Google Auth Library
11.0.2 and returns an asynchronous `(credential, expectedNonce) => {subject}`.
Missing configuration returns undefined; malformed configuration throws. Only the
Google `sub` identifies an account. The wrapper additionally checks nonce, authorized
party, claim types and strict expiry, and removes credentials from SDK error output.
Certificate retrieval uses Google's rotating-key cache with a five-second timeout
and no retries. No custom JWT signature implementation or tokeninfo call is used.

This module is deliberately not an HTTP login endpoint. A following transaction must
bind a server nonce to the durable session and consume it once with provider lookup
and cookie rotation. Verification alone grants no game authority. The launcher still
has no Google configuration and the owner has not provided a Client ID. Guest claim,
conflict resolution, cloud/web integration and full F25 acceptance remain open.

Run `node --import tsx --test apps/server/test/google.test.ts` for actual RSA-signed
JWTs verified by the SDK against a local HTTP certificate server. It covers valid
subjects, invalid claims/signatures/nonces, cache/rotation, unavailable/stalled keys
and sanitized errors. No Google account or live credential is simulated by these tests.

| Date | Change |
|---|---|
| 2026-09-10 | Added server-only Google verifier prerequisite with real SDK/signature/certificate tests; no login/claim endpoint or deployment enabled. |

| 2026-09-10 verified | Verifier917f862 passes config/build/255tests and correction review; explicit Google Sign-In issuer allowlist fixes the SDK broader-default finding. Login/account transaction and web integration remain required. |


## Google account HTTP and schema4

Set optional `TBH_GOOGLE_CLIENT_ID` in the launcher's environment to enable Google
challenge/login routes. The owner has not configured a real ID. With no ID both
Google routes refuse authenticated requests with503googleUnavailable; malformed IDs
fail startup. The launcher does not automatically load.env files. The frontend still
runs local saves and has no GIS/cloud adapter; this API is not a release declaration.

| Method | Path | Input / result |
|---|---|---|
| POST | `/auth/google/challenge` | `{}` + existing session cookie; returns public configured clientId, server nonce and expiry. Latest nonce replaces the previous one for this session. |
| POST | `/auth/google` | `{credential, keepAccount?}` + same cookie. Actual verified token nonce must match. Commit returns playerId/provider/expiresAt and a rotated HttpOnly cookie. |

Nonce lifetime is at most five minutes and never exceeds its cookie session. Verify
Google outside the transaction; inside BEGIN IMMEDIATE recheck active cookie, nonce,
expiry and provider mapping. A new subject links the current authoritative guest in
place and revokes its former credentials. Returning login rotates the current cookie;
other devices remain signed in. Existing-subject/different-player conflicts return409
accountConflict with no mutation. Only explicit keepAccount:true switches to that
account; neither player's history is merged or overwritten. An unregistered subject
while already Google-authenticated returns409signOutRequired. Explicit logout now
clears even an expired/revoked cookie, enabling a fresh challenge after a lost response.

Schema4 adds google_accounts (unique subject/player), google_challenges and immutable
account_logins (new/prior session hashes, action and time). All mapping, nonce consume,
revocation, new session and audit operations commit atomically; a failed write restores
the prior session/challenge. Player/world IDs, commands/events and receipt keys never
change. Schema0–3 migrates without inventing accounts. Auth errors never include ID
credentials or profiles; HTTP accepts no client subject, clock, totals or approval flag.

`accounts.test.ts` covers real SQLite linking/rollback/conflicts/expiry/collisions and
schema3 history migration. `google.test.ts` adds actual RSA/SDK/HTTP flows and async
revocation races. Existing schema1/2 HTTP/sequence tests exercise migrations too.
264engine/server tests, config/build and real launcher smoke pass; independent review
pending. This does not import the local guest archive, approve it for ranking, provide
profile/locale/GIS UI or establish live Google setup. See F25/F28 and the setup guide.

| Date | Change |
|---|---|
| 2026-09-10 account sessions | Added optional Google configuration and HTTP challenge/login with schema4 identity/audit/session transaction; local import and web integration remain required. |


## Verified Google server account checkpoint — 2026-09-10

`ebe820c` (base `b42c034`) passes config/build/typecheck,264engine/server tests,
14focused auth checks and actual CLI disabled/configured challenge/restart smoke.
Native independent code/security review found no actionable introduced defect and
passed6account/store tests; reviewer HTTP reruns were sandbox-blocked, while author
actual signed-token SDK/HTTP checks pass. Receipt: `.qa/google-session-verification.json`.
No real Google Client ID or live login, local archive import/review, cloud UI or web
cutover is claimed. Preserve completed91browser/80MB verification; those files did
not change. Full game remains20features in progress,0complete.

| Date | Change |
|---|---|
| 2026-09-10 verified Google sessions | Closed code/security review for ebe820c with no introduced findings;264tests/config/build/CLI pass. Local import, owner-required review eligibility and web integration remain required. |


## Local archive claim core — 2026-09-10 (review pending)

Schema5 adds immutable local-import provenance: source/player IDs, prior server
player, digest, full original gzip archive and command/event sequence cutoffs.
`GameStore.claimLocal` is an internal authenticated Google-account operation.
A native worker validates/replays the archive against known server config snapshots;
uploaded config cannot register itself. Original sampling order, live shift, source
IDs and all history are preserved. One import per account/source; exact same archive
returns the durable receipt, while conflicts refuse without overwriting either game.
Successful gameplay in the destination blocks replacement; presence/calendar setup
alone does not. Session and destination are rechecked after worker IO.

Import/history/provenance, account mapping, cookie revocation/rotation and login audit
commit atomically. The previous server player remains stored. Every imported history
is **pending review**; replay does not approve ranking. No arbitrary credit field or
public approval/upload route is added. If a success response is lost, keep the local
source, reauthenticate and inspect the durable receipt rather than repeat a new import.

271engine/server tests, config/build and real80MB import/reopen/continuation pass.
Actual month:16,567commands/388,986events,1,582,365xu,LP4,240shifts and exact compressed
original. Measured import48.38s, cold read29.36s, request-loop pulse gap2.65s during
result/SQLite persistence; this is **not** evidence of responsive public cloud import.
Transport isolation/recovery and cold-read performance must be addressed before web
cutover. Resource bounds:128MiB archive,120s replay timeout,1GiB worker heap, one replay
per process; deployment limits, not economy constants. `.qa/local-import-month.json`.
Native independent review is pending. F25/F23 and the full game remain unfinished.

| Date | Change |
|---|---|
| 2026-09-10 local claim core | Added worker-validated one-time archive import with immutable pending provenance and atomic identity/session transition;271tests/config/build and80MB probe pass. No public upload/review approval/web cutover yet; performance limits are measured and remain open. |


| Date | Change |
|---|---|
| 2026-09-10 verified local claim core |51a0734 passes271tests/config/build and80MB exact import/reopen/retry; native independent code/security review found no actionable introduced defect. `.qa/local-import-verification.json`. Imported history remains pending approval; public upload, cold-read performance and web cutover remain unfinished. |


## Trusted engine checkpoints — 2026-09-10 (verification in progress)

Schema6 keeps the canonical world in `players.projection` and stores only versioned
engine bookkeeping alongside it: replay rules, active rush index, exact ordered
config pins and history counts. Chained hashes bind raw immutable command/event
rows; a digest binds them to metadata, player origin, revision, frontier, projection
and exact registered snapshots. Corrupt or unsupported checkpoints fail closed.
These hashes detect server-storage inconsistency; they do not authenticate a save
uploaded by a player or defend against an attacker who controls the database host.

New players, successful commands and validated imports write their checkpoint in
the existing SQLite transaction. SQL failure rolls back history/state/checkpoint
and evicts the cache. Schema5 histories get a checkpoint after one verified replay,
including a read with no new game time. Legacy additive-enrichment histories retain
full replay rather than changing immutable historical rows. All history remains.

Untrusted local imports always go through full worker replay against known configs.
`Game.restoreTrusted` is for integrity-checked, server-owned data only; any uploaded
checkpoint or world fields are ignored and cannot skip replay. Ranking review stays
pending. Tests cover every archived save, rules1–23, rush/closing/batches, mixed pins,
retry, migration, corruption, cross-connection revision and transaction rollback.
Public upload isolation/recovery and approved-history eligibility remain separate.

| Date | Change |
|---|---|
| 2026-09-10 trusted checkpoints | Added schema6 integrity-bound engine checkpoints to avoid cold server resimulation; preserve canonical projection, immutable history and mandatory full replay for local imports. Verification/review in progress. |


Verified at `f86e2b3`:281engine/server tests, config/build/typecheck,10ordinary
kcohorts and15rush PASS; native review found no actionable defect and independently
passed17focused cases. `.qa/server-checkpoint-verification.json` binds evidence.
Actual80MB cold read2.23s vs29.36s, exact world/history/retry; import49.47s and3.53s
loop gap remain open. Owner ends performance work here; see
[M9 history-volume follow-up](../../docs/m9-history-volume-followup.md). Next is
M4 web cutover/reconnect/registry-admin; no public upload was introduced.

| Date | Change |
|---|---|
| 2026-09-10 verified checkpoint | f86e2b3 passes full verify and independent17-test review; performance work timeboxed, M9 follow-up recorded. |

## Durable heartbeat presence — schema7

`POST /player/heartbeat` takes `{clientId, beatSeq, active, paused}` under the same
cookie/origin rules. Every public action requires a live heartbeat from its first command; first heartbeat records that player's managed presence.
Use a fresh increasing `beatSeq`; gaps are allowed. `/player/connect` now returns
`heartbeatSeq` for resuming an owned stream. The heartbeat response carries the
sanitized server snapshot, sequence and `heartbeatUntil`, `heartbeatIntervalMs`,
`heartbeatTimeoutMs`. No client clock, totals or session hash is accepted/exposed.

Timeout equals the pinned config's `network.reconnectingUiDelayMs`; cadence is half
that window. This derives transport detection from the existing configured UI limit,
not a new economic knob. A persisted lease keeps its original deadline until renewed.
An exact duplicate returns the existing ack/deadline without renewing; lower or
conflicting sequence returns409 `heartbeatStale`. Use a fresh seq and current flags
on reconnect, including hidden/menu state. Heartbeats with unchanged presence do
not append engine commands. Requests still advance authoritative server time.

| Situation | Behavior |
|---|---|
| Any live view is active / any live menu is open | Canonical aggregate active / paused. Both flags are independent. |
| A view expires, others remain | Recompute aggregate at that view's expiry; no player-wide loss if another lease remains. |
| Final view expires | Record trusted loss at exact expiry before catch-up; grace comes from the shift's pinned config. |
| Session expires/revokes | Earlier session deadline bounds its leases, including Google token rotation. |
| Fresh valid heartbeat inside grace | Recover using actual aggregate visibility/menu; keep customer wait paused appropriately. |
| Recovery at/after grace | Normal closing wins; never reopen the shift. |
| Managed player action | Requires that stream's live lease bound to its current valid cookie session. Otherwise409 `heartbeatRequired`; sequence is not consumed. |
| Managed legacy `activity` |409 `presenceManaged`; send presence via heartbeat so an action cannot overwrite another view's menu. |
| Public client before first heartbeat |409 `heartbeatRequired`, including the first startShift. Connect only allocates/resumes a stream. Trusted internal unsequenced adapters retain their pre-activation behavior. |

SQLite stores owned client leases and their last heartbeat sequence. Expiry groups
are normalized in time order inside the same transaction as engine events/projection/
checkpoint updates. `GameStore.sweepPresence()` processes due leases and disconnected
shifts; failures include player ID and do not skip other due players. The native HTTP
server sweeps on listening (including restart) and periodically, stopping its timer
on close/error. HTTP request/socket completion is never interpreted as player loss.
The single-host scan is a known scaling boundary; distributed scheduling remains M9.

Deployment default `TBH_RATE_MAX` is600 per60seconds, overrideable as before, allowing
heartbeat plus event polling and player actions. This is an HTTP abuse/resource limit,
not gameplay tuning. Serving receipts remain exactly-once under their existing keys.

Tests: `apps/server/test/presence.test.ts` exercises actual HTTP restart/scheduler,
SQLite restart/two stores, token rotation/expiry, multi-view pause, reordered packets,
rollback, old-schema migration and full deterministic replay after timeout closing.
The remote web adapter, durable browser action outbox and reconnect UI are still next;
this does not complete F23/M4. No public local-save upload was introduced.

| Date | Change |
|---|---|
| 2026-09-10 heartbeat implementation | Schema7 session-bound presence, pre-catchUp expiry, authenticated heartbeat and restart scheduler; legacy pre-activation adapters retained. Verification/review in progress. |

| 2026-09-10 mandatory public admission | Removed the temporary public pre-heartbeat bypass before web cutover: cookie-authenticated commands now always require their own lease from the first action. HTTP fixtures perform real heartbeats, presence changes and virtual-time keepalive. Native listen failures reject test startup instead of hanging. Final verification/review in progress. |

Verified `9f38166`: final config/build/typecheck and298 engine/server tests pass;
19 final real HTTP/presence checks pass. Full-range independent review found no
actionable defect and independently passed9 SQLite/presence checks. Evidence:
`.qa/m4-heartbeat-verification.json`. F23/M4 remains open for remote web and admin.

| 2026-09-10 heartbeat verified |9f38166 full-range code/security review and final298tests pass. Required heartbeat applies from the first public command. No merge, push or deployment performed. |

## Web projection delivery — 2026-09-10

The web adapter now uses this API by default through a same-origin `/api` proxy.
Authenticated `GET /player/config?version=...` returns a registered strict public economy
schema; deployment credentials are outside it. Snapshots include server-computed `menu`
and bounded `presentation` events for current table reactions/rushes/latest flyer report.
`GET /player/events` now also returns `playerId` for response/account binding. No private
RNG/checkpoint/world event archive is added to snapshots. See `../web/README.md`.

| 2026-09-10 web projection | Added pinned config/presentation/report delivery and event-page owner binding for actual web cutover. Verification/review in progress; no public local upload or admin endpoint added. |

## Default Config Registry

Schema8 imports one active seed. Later constructor snapshots are registered for exact
historical validation but never activate themselves; registry publications decide new
player/opening configuration. Live shifts and replay keep their immutable original pins.
`registry.ts` contains the internal default proposal/approval/publication service,
using the same database/transactions and shared schema validation. `AdminActor` is a
trusted authenticated server context, never client JSON. Schema9 admin HTTP routes
below now derive it from Google identity, private server roles and independent TOTP/session proof.
Tier A needs a distinct Super approver, B/C use the prescribed role. Default versions
form a linear chain with explicit stale-base rejection. Rollback is a new publication;
ops events are stored only, with no external notification delivery.

The current player API keeps its existing authentication/owned streams. Heartbeat
scheduling follows the nearest durable lease and re-arms when a lease is renewed.
See `docs/config-registry.md` and `apps/server/test/registry.test.ts` for the decision
table, exact scope and real SQLite/opening/replay/scheduler checks.

| Date | Change |
|---|---|
| 2026-09-10 | Schema8 default registry and actual opening resolution; internal service verification/review underway, admin API/editor/scopes remain. |

| 2026-09-10 verified | c1e953c default service passes310engine/server (12registry),10remote browser, config/build and k/rush; correction review CLEAN. Admin auth/editor/scopes remain unexposed. Evidence `.qa/registry-verification.json`. |

## Admin authentication and default registry API — schema9

Set `TBH_ADMIN_ACCOUNTS_FILE` to the private server-owned directory described in
[admin authentication](../../docs/admin-auth.md), alongside `TBH_GOOGLE_CLIENT_ID`.
With either absent, admin sign-in stays unavailable; player auth/play remains usable.
Google and admin cookies are separate. Admin routes do not create/link a player or
pause any shift. No role, subject, MFA or clock field is accepted from the browser.

| Method / route | Action |
|---|---|
| GET `/admin/auth` | Enabled state; current admin session or pending MFA. |
| POST `/admin/auth/challenge` `{}` | Fresh HttpOnly admin challenge cookie; nonce/clientId for GIS. |
| POST `/admin/auth/google` `{credential}` | Verify signed Google token and consume nonce; MFA or rotated authenticated session. |
| POST `/admin/auth/factor` `{code}` | Complete independent TOTP; rotate cookie. |
| POST `/admin/auth/logout` `{}` | Revoke this admin session; keep player cookie intact. |
| GET `/admin/registry?before=<cursor>` | Latest/active version and up to50proposals; optional descending cursor. |
| GET `/admin/config?version=<version>` | Complete snapshot, proposal/base/diff-key policy, approval/publication. |
| GET `/admin/audit?after=<seq>` | Up to50append-only security/config events. |
| POST `/admin/proposals` `{key,baseVersion,snapshot,reason,effective?}` | Existing canonical validation, tier and immutable draft handler. |
| POST `/admin/approve` or `/admin/publish` `{version}` | Existing approval/schedule/retry handlers with server actor. |

Use `/api` prefix through the web proxy. Admin requests share exact-origin/CSRF/rate
limits with the player API. Full snapshot proposal ceiling is512KiB; other bodies
retain16KiB. Cookies use HttpOnly/SameSite=Strict and HTTPS Secure/`__Host-` naming.
TOTP replay/failure counters, challenge/session state and audit are durable in SQLite.
Schema8→9 adds only admin session/factor tables, preserving player/config history.
Browser editor, enrollment/account recovery and scoped registry UI are subsequent slices.

| 2026-09-10 admin transport implementation | Google SSO + independent TOTP/RBAC/session boundary and protected default registry routes implemented;320full tests/config/build pass, final role/HTTP checks and independent review underway. Real Client ID/directory remain unconfigured. |

| 2026-09-10 admin API verified |6f42575:320engine/server (10admin),10remote browser, config zero warnings/build PASS. Native review CLEAN and independent typecheck PASS; reviewer socket checks blocked, host HTTP checks pass. Editor/GIS browser, enrollment/recovery and scopes remain. Receipt `.qa/admin-auth-verification.json`. |

## Protected economic forecast

`POST /admin/forecast` accepts only `{version}` for an unpublished registry draft,
using the existing admin cookie and `X-TBH-Admin-Context`. No save, seed, time,
player list or economic totals are accepted. The server authenticates before work
and revalidates the session/context before releasing the report. Existing read
roles may inspect scenarios; this does not grant proposal/publication permission.

A single worker per process copies SQLite with its native backup API into a private
temporary directory, reads current presence/catch-up through GameStore on that copy,
and runs every existing member of the affected audience. Timeline resolution reuses
the registry (including removed members, scheduled defaults, scope precedence and
expiry). The snapshot time is the later of request time and latest saved server
clock captured by the backup. The worker never writes to the source database.

The response carries its version, snapshot/activation/window timestamps, registry
revision, player source/simulated revisions and command hashes, affected keys and
aggregate/daily before-after coin flows. Existing pins survive. No sampling or
extrapolation; empty audiences return `status:empty` and `totals:null`. VND is
unavailable without observed donation data. A forecast is a continuously active
scenario, not observed activity or a guarantee that higher prices raise revenue.

The request remains open while the worker runs, leaving the HTTP event loop free.
The admin UI allows eleven minutes (worker limit ten minutes/1GiB heap). Busy=429;
resource/worker failures=503. Cancellation terminates the worker; cleanup removes
the private backup even on failure. Large populations may exceed this explicit
limit; they fail without partial results. Shared queues/report persistence and
population sizing remain release/performance work, not new economy parameters.

Review correction: before delivery, revalidate the live proposal, publication
revision and scheduled activation as well as the admin session/context. A publish
or changed schedule during computation returns409 instead of an obsolete report.
Player activity after the backup remains outside the explicitly captured scenario;
it does not turn a point-in-time forecast into a continuously updated projection.
The concurrency regression uses two independent HTTP connections, receives429 while
one worker is live, then proves publication→409 and logout→401 on that worker's
response. Mobile numeric cells never wrap inside an amount.

Verified at `a99a567` (presentation `9900505`):350engine/server tests,19admin browser
cases and final mobile report check pass; config/build and independent reviews pass.
Receipt: `.qa/forecast-report-verification.json`. Full M4/BRD remains open.

## Competitive review and flags — M4 core/API

Server operations are available at `/admin/competition`, behind the existing Google,
MFA, admin-context, CSRF and rate checks. Game/Super may decide; Support may inspect.
Economy/Viewer cannot access this private moderation view. Inspection is audited.

- `GET /admin/competition?playerId=<id>`: account origin, current flag, imported
  digest/cutoffs and latest review (including reason/actor/time).
- `POST /admin/competition` with `{type:'import-review',key,playerId,digest,
  expectedSeq,reason,value:'approved'|'rejected'}` records a review of that exact
  archive. `expectedSeq` comes from `localImport.review.seq` (initially0).
- The same POST with `{type:'flag',key,playerId,expectedSeq,reason,value:boolean}`
  flags/clears a player; use `flag.seq`. This does not ban/reset the player.

The immutable `registry_audit` is the only decision store. Same actor/key and exact
request returns its original receipt; changed request conflicts. Stale decisions,
wrong archive, missing/moved import owner and no-change intents refuse before writes.
A later correction uses a fresh key/current seq and preserves earlier receipts.
`GameStore.localImport` now reports current pending/approved/rejected status.
Reviews and flags never grant coins, rewrite imports, change pins or advance shifts.

Dedicated admin review/history controls, competitive totals and public board are
separate remaining M4/M5 work. No public archive upload or real Google setup added.

| Date | Change |
|---|---|
| 2026-09-10 | Verified521e901 review/flag core/API:367unit/server,19admin browser,45focused,config/build and independent review pass. Receipt: .qa/competition-verification.json; remaining work in docs/competitive-eligibility.md. |
