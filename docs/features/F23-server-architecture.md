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
