# Server persistence — Trùm Bia Hơi

`@tbh/server` currently exports `GameStore`, the internal M4 persistence layer.
It runs the existing pure engine against a SQLite event store. The web app still
uses localStorage; HTTP/auth/Google claim/registry UI/WebSocket cutover are next.
This module is not an unauthenticated public API or a complete production server.

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
const changes = store.eventsAfter(playerId, response.lastEventSeq);
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
