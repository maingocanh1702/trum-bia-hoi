# A4 — current order feedback and observed loss evidence

Implemented from integrated base `07430a95ec6f8f2799650344511dbda2f8a19f12`.
The pure `orderPreparation` helper supplies the order dialog, wait-ready guide, and expiry
observer. It describes the state at the observation timestamp, not the cause of all earlier delay.
Existing serve, production, money, reputation, config and numeric loss-toast behavior is unchanged.

| Observation, in order | Result |
|---|---|
| No active order or no items | unknown |
| Every item ready | ready |
| Unfinished item already preparing | preparing |
| Pending item locked | locked |
| Pending beer with missing enabled reserve state | unknown |
| Pending item without available food | foodStock |
| Pending beer without ready reserve, but a reserved batch or raw stock exists | beerRefill |
| Pending beer without reserve, batch or raw stock | beerStock |
| Available beer, occupied tap (where tap capacity applies) | tap |
| Available beer and no clean glass | glasses |
| Available hot food and all pans occupied | pan |
| Available pending item with no observed blocker | queued |
| Several different unfinished-item results | mixed; unknown takes precedence |

Ready items are excluded when describing remaining work. Raw stock zero during a reserved refill
is never labeled empty supply. Completion at a deadline is processed before observation; **all**
expiring orders are observed before any table cleanup releases a shared resource.

Rules26 adds `shiftId`/`cause` to `order_expired` and `shiftId` to queue `customer_left`.
`menuReport.losses` counts customers once: queue separately, seated customers by observed cause,
and any unclassified historical portion as unknown. It is derived from the existing event cursor
and reconciled with `stats.lost`, not a second mutable stats ledger. All earlier event shapes stay
unchanged. In particular, `menu_mix_summary` explicitly excludes `losses`, even for new rules;
Wave B metrics are outside this slice.

The shift hint chooses the largest observed category (queue plus rejected arrivals → tables; empty stock →
restock; refill/tap → keg; glass → washer; pan → kitchen; stale serves → cooler). Unknown history wins a tie for largest and produces generic advice. Fully maxed tables keep capacity feedback without an unavailable action. Ready, preparing,
queued, locked and mixed losses receive truthful status advice without an invented equipment cause.
Remote mode consumes the server's `menuReport`; its world projection intentionally lacks the event
history needed to recompute loss attribution. The user-facing loss toast still shows only numbers.

## Proof

- `packages/engine/test/feedback.test.ts`: production commands/clock cover stock → reserved refill
  with raw0 → preparing → ready; clean-glass and busy-tap limits; mixed resources; simultaneous pan
  deadlines before cleanup; queue versus seated customer totals; replay and exact expiry timing.
- `legacy-feedback-v25.json` was generated with the engine/config at the explicit base above, with
  real start/end/start commands and advances. Its SHA256 covers the entire original world, including
  a closed shift's historical menu summary; decode must match before rules26 adoption. Later events
  preserve that prefix and leave prior losses unknown.
- `apps/web/test/feedback.spec.ts`: both locales ×360/390/1280px; actual empty/refill guide and order
  message, restock action, ready state, observed loss/queue/unknown hints and reload. Real stock
  losses outrank a previously served stale beer; unequal and tied legacy counts preserve the largest
  observed category, and maxed tables omit an unavailable action.
- `apps/web/remote-test/feedback.spec.ts`: actual isolated API and DOM commands, ready-at-expiry
  report without full event history, reload and advice.

Execution receipts and the independent reviewer verdict live under
`artifacts/verification/codex-improve-order-feedback/`. Source verification is not a production
release or a completed human playtest.

## Changelog (append-only)
| Date | Change |
|---|---|
| 2026-09-16 | A4 current-state decision table, rules26 loss provenance and local/remote proof added; config and numeric loss toast unchanged. |
