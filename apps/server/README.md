# Server persistence — Trùm Bia Hơi

`@tbh/server` exports `GameStore`, the internal M4 persistence layer, and
`@tbh/server/http` exports a Node HTTP server with durable guest-cookie ownership.
It runs the existing pure engine against SQLite. The web app still uses localStorage;
Google claim, client sequencing/reconnect, registry and web cutover remain in progress.
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

Every operation uses server time, replays the latest durable revision when needed,
and atomically appends new command/domain-event rows plus the derived player
projection/frontier. SQLite serializes competing writers; foreign keys and
append-only triggers protect historical rows. Failed transactions evict mutated
cache so retry starts from committed state. Command retries retain the first
result while synchronizing current autonomous events. Returned state is detached.

Pass a validated `Config` as the second constructor argument for the server's
configured opening snapshot. Existing shifts retain their pin; only a successful
new shift adopts the new version. The first snapshot of each version stays exact,
including dictionary order needed by historical seeded sampling; equivalent JSON
key reordering reuses that snapshot. This is not the admin approval/override service.

The process cache is bounded. A miss replays the full player stream and checks its
projection, so long-history cold-start performance needs measurement before
release. SQLite/WAL is the current single-host implementation; multi-host database
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
| POST | `/player/command` | `{idempotencyKey, command}`; existing engine handler, authoritative projection/result. No client clock, player ID, seed or totals. |

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
Google account linking/one-time local claim, per-client sequence and offline replay,
reconnectGraceMs closure, WebSocket push and the web adapter remain explicit M4 work.

Command properties are allowlisted per action at the HTTP boundary, in addition to
the engine's value validation. Empty/malformed supplied session cookies are refused
without creating another player. Event catch-up queries bounded SQLite rows directly;
it does not hydrate history or advance simulation. Use state/command responses for
current simulation state; page through events using the returned cursor. Repeating a
page is safe; clients deduplicate by sequence. Later appends are picked up by subsequent
polls, including after `hasMore:false`. State/command cold starts still have the full
replay ceiling documented above; pagination does not claim to remove that limit.

| Date | Change |
|---|---|
| 2026-09-09 | Added hashed guest sessions and locally runnable authenticated HTTP transport around GameStore; full M4/client cutover remains pending. |
| 2026-09-09 | Addressed HTTP review: exact command properties, explicit invalid-cookie refusal, and bounded durable event pages with continuation; catch-up no longer advances simulation. |
