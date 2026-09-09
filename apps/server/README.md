# Server persistence — Trùm Bia Hơi

`@tbh/server` exports `GameStore`, the internal M4 persistence layer, and
`@tbh/server/http` exports a Node HTTP server with durable guest and Google account cookie ownership.
It runs the existing pure engine against SQLite. The web app uses local IndexedDB career saves and localStorage settings;
Google claim, client buffering/reconnect, registry and web cutover remain in progress.
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
