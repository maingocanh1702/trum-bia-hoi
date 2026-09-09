# F23 — Kiến Trúc Server Quán (Server Architecture)

> Phase 1-3. Server-authoritative architecture for fairness, anti-cheat, realtime events, leaderboards, and real-world integrations.

## 1. Scope

**Phase 1 optional minimum:** server persistence/auth if needed.

**Phase 3 full:** all mutating gameplay actions validate server-side; websocket events; anti-cheat; CAPTCHA; appeal flow.

## 2. Client/server boundary

Client owns:

- rendering, local prediction, UI state;
- non-authoritative timers for smoothness;
- queued input events.

Server owns:

- player profile, coins, inventory, upgrades;
- serve validation, payment/tip/penalty;
- shift cap/day rollover;
- Giải Nhậu/Đường Lên Trùm;
- risk events, lottery, World Cup data;
- locale/account/session entitlement/payment state;
- anti-cheat flags and appeals.

## 3. Core endpoints

```txt
POST /auth/session
POST /auth/google
POST /auth/guest/claim
GET  /player/state
POST /player/locale
POST /shift/start
POST /shift/serve-order
POST /shift/close
POST /inventory/restock
POST /upgrade/buy
GET  /entitlements/session-pass
POST /billing/session-pass/create
POST /billing/webhook/{provider}
GET  /seasons/current
GET  /leaderboard
POST /risk/resolve
```

Websocket channels:

- `shift:event`
- `risk:event`
- `season:rollover`
- `worldcup:broadcast`
- `system:captcha_required`

## 4. Serve validation

`POST /shift/serve-order` receives `{shiftId, orderId, clientNow, preparedItemIds, idempotencyKey}`.

Server checks:

- shift active or closing grace;
- order belongs to player;
- items ready and resources reserved;
- freshness timestamps and patience;
- idempotency key not processed;
- cap/day bucket.

Returns authoritative deltas: coins, reputation, glasses, table/order states, analytics payload.

## 5. Time and caps

- Server time is source of truth.
- VN day bucket for daily caps, quests, attendance.
- Earnings bucketed per earn timestamp; shift count credited on finalize.
- Client clock only for display/prediction.

## 6. Anti-cheat

- Validate every mutating action.
- Rate-limit serve/restock/upgrade.
- CAPTCHA on suspicious patterns.
- Flagged status can restrict leaderboard writes.
- Appeal ticket type `anticheat-appeal`; do not silently ban without path.

## 7. Persistence

Use appendable event records for high-value mutations:

- `ShiftStarted`, `OrderServed`, `ShiftClosed`
- `UpgradeBought`, `RiskResolved`
- `SeasonRewardClaimed`, `LotteryTicketBought`

Project current state into profile tables for fast reads.

## 8. Acceptance

- Client cannot gain coins by editing local state.
- Duplicate serve request is idempotent.
- Leaderboard ignores flagged/ineligible writes.
- Server time handles midnight edge cases.
- **Network state (added 2026-09-08, binding):** cutting the connection mid-shift shows a distinct "reconnecting" state within 2 s without hiding the yard; serve/restock/upgrade commands issued while offline are buffered with `idempotencyKey` + `clientSeq` and replayed on reconnect, none duplicated, none lost inside `reconnectGraceMs` (config); after reconnect the client state equals the server projection (resync from `lastSeq`, server wins on conflict); beyond `reconnectGraceMs` the server closes the shift by the normal closing rule and the client receives `ShiftClosed`; a shift never continues on client-only time.
- **Persistence order (owner 2026-09-08): localStorage first, server after.** The local save keeps an append-only `eventLog` in the shared event schema so the server import (guest claim) replays it; after the server lands, no rule exists only on the client (10-SPEC §9). The network-state bullet above applies from that point.


## 9. Implementation checkpoint — 2026-09-09

M4 has started with a pure-engine prerequisite: per-shift config adoption and
multi-config local replay (`Game.command` trusted opening argument; savev3).
The preceding shift and elapsed time retain their pin. Failed opening attempts
retain their candidate snapshot for exact replay without adopting it; successful
openings preserve player assets and emit `config_pinned`.

`packages/engine/test/config-pinning.test.ts` covers actual old/new service prices,
pour duration, caps, stamina, retries, malformed catalogs and genuine historical
replay. The browser test imports a real A→B save through recovery and reloads it.
See `10-SPEC-tech-implementation.md` for the exact log/catalog contract.

There is still no `apps/server` implementation or server authority. Registry
publish/approval, storage, auth/guest claim, WebSocket sequencing, reconnect,
anti-cheat and the acceptance in §8 remain unfinished. A caller must not accept
an opening snapshot directly from an untrusted client when building the server.

| Date | Change |
|---|---|
| 2026-09-09 | Marked M4 in progress for engine config pinning/savev3 prerequisite only; explicitly retained server/registry/auth/network acceptance as unfinished. |


| 2026-09-09 review correction | Refuse a candidate that removes the owned location before adoption. Compare immutable snapshot content independently of JSON object-key ordering; preserve array/value distinctions. Server registry/auth remains unfinished. |

| 2026-09-09 verified checkpoint | Combined full-base review at7c60c70 found no actionable defects after all3 config corrections. Author config/build156engine67browser and20 k/15 rush rows passed; reviewer browser rerun was sandbox-blocked. This verifies config pin/savev3 prerequisite only, not server authority. |


## Event store implementation checkpoint — 2026-09-09

The earlier no-server-implementation checkpoint is superseded for persistence:
`apps/server/src/store.ts` now runs the shared engine behind an atomic SQLite/WAL
event store. It stores immutable config snapshots, command keys and ordered domain
events, plus a replay-derived projection and server-time frontier. Real-file and
separate-process restart, competing connections, forced mid-write rollback,
idempotency, pause/calendar and mixed-config checks exist in `apps/server/test`.

The public API/auth/Google claim, registry approval/override service, WebSocket
transport, client reconnect and anti-cheat remain outstanding. This internal store
accepts only trusted server identity/seed/config/time inputs; a future transport
must enforce authenticated ownership. The current web adapter is still localStorage.
This is progress toward §8, not proof of full F23/M4 completion.

| 2026-09-09 event store | Implemented server persistence using native SQLite and the same pure engine; exact config/event replay, atomic commands and durable revision invalidation. Full verification/native review in progress; HTTP/auth/client cutover remain next. |

| 2026-09-09 reviewed | Native review f2e85f8..3ff21df found no confirmed actionable defects after both retry/cursor corrections. Reviewer independently ran 8 store +2 live-upgrade cases via direct Node (tsx IPC was sandbox-blocked); author canonical config/build/166 engine+server checks passed. This clears the bounded internal-store change, not full M4. |


## Guest session/HTTP implementation — 2026-09-09

The owned HTTP boundary now exists in `apps/server/src/http.ts`: durable expiring
and revocable guest cookies, exact Origin/JSON checks, bounded input/abuse limits,
owned state/event reads and a generic command endpoint using the shared engine.
The server chooses identity/seed/time; arbitrary local totals/owner IDs cannot be
uploaded. SQLite schema2 creates player and hashed session atomically and upgrades
v1 history. Public views remove private RNG and generation seeds. Full API details
and remaining deployment constraints are in `apps/server/README.md`.

Client sequence buffering, reconnectGraceMs closure, WebSocket push, Google claim,
registry/admin, account eligibility/CAPTCHA/appeals and the web authority switch
are still required. Current HTTP tests prove this boundary only; §8 remains open.

| Date | Change |
|---|---|
| 2026-09-09 | Added real guest HTTP transport and SQLite session ownership; verified socket scenarios added, final config/build/tests/native review in progress. |
| 2026-09-09 review corrections | Exact nested command fields, empty/malformed-cookie rejection and100-event durable pages; continuation/retry/restart tests added. Event polling no longer replays or advances the game; state/command operations advance server time. |

| 2026-09-09 verified | Config/build182 engine/server and actual CLI/Chromium pass at62b4445. Full-range independent review090d920..62b4445 has no confirmed actionable introduced defects; reviewer socket reruns blocked by sandbox. Google ID absent per owner; F23§8 still requires sequencing/reconnect/registry/account/web integration. |


## Ordered ingress checkpoint — 2026-09-09

GameStore.clientCommand and POST /player/connect provide owned durable input streams;
HTTP requires clientSeq and returns acknowledgedSeq. SQLite receipts reference the
canonical command log, so result identity/spends cannot diverge between per-tab order
and player-wide retries. v1/v2 data migrate to schema3. Real-file/multi-connection and
HTTP checks cover gaps, response loss, reordering, restart and atomic failure.

F23§8 remains open: client buffering/reconnecting UI, expiry by reconnectGraceMs and
normal closing, WebSocket, registry/Google claim and web cutover are still required.

| Date | Change |
|---|---|
| 2026-09-09 ordered ingress | Implemented atomic server clientSeq acceptance/resume without an unsequenced HTTP bypass; final verification and native review in progress. |

| 2026-09-09 ordered ingress verified | e390a1c passes config/build187 engine/server and CLI/Chromium; independent review794d75c..e390a1c found no introduced defects and passed12 storage checks. F23§8 still requires timeout-close/liveness, browser buffer/reconnecting UI and complete remote integration. |

Timeout-close design requirement from the e390a1c probe: normal endShift alone stalls
when inactive, but an artificial activity:true command can open the next attendance
day. Use a trusted replayable engine transition that completes normal closing while
inactive, with no fake attendance or active-rest reward; preserve ordinary management
pause. Real v18 menu/inactive-closing fixtures were captured before that next change.

| 2026-09-09 next-boundary probe | Recorded inactive-closing and midnight attendance behavior to guide server timeout implementation; no timeout behavior is implemented or claimed by the sequencing checkpoint. |

## Pure engine disconnection prerequisite — rules19

Trusted `Game.disconnect(at, shiftId)` records a connection loss before the engine
passes that authoritative timestamp. It is not a public player command; HTTP also
rejects the reserved `system:` key namespace. The pinned config supplies the grace.
Repeated loss does not extend it. Actual activity before expiry cancels the outage;
activity at/after expiry cannot undo normal closing. During grace, guest/gameplay
deadlines freeze; once expired, normal table/order/delivery closing runs even while
inactive or menu-paused. Finishing clears the outage and freezes inactive resting
stamina. No synthetic activity is used to earn attendance. Ordinary menu/visibility
pause does not itself arm a disconnection deadline.

Rules19 also makes paused calendar events independent of tick size across midnight,
so saving/replaying the timeout gives the same event timeline. Genuine rules18 saves
retain their historical behavior until a current command adopts rules19.

This is an engine primitive, not server liveness or completed §8. The server still
needs owned live connections/heartbeat and durable loss frontiers, restart/scheduler
catch-up, expired-stream handling, and the browser outbox/reconnect integration.
An HTTP request socket closing is not evidence that a player went offline. Do not
call disconnect late through a store action that already advanced past the loss.

| Date | Change |
|---|---|
| 2026-09-09 rules19 implementation | Added trusted replayable disconnection grace and inactive normal closing; preserved local menu pause and historical saves. Verification/review in progress; no remote timeout capability claimed. |
