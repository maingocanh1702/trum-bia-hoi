# Analytics events — Trùm Bia Hơi

The shared engine emits deterministic events containing `id`, `at`, `configVersion`,
`type`, and event data. The web app listens to these events for feedback and guidance.
There is no remote analytics collection in the local build. Do not add email, names,
Google tokens, bank details, or other PII to gameplay analytics.

## Implemented engine events

| Domain | Events | Payload / use |
|---|---|---|
| Shift | `shift_opened`, `shift_closing`, `shift_closed`, `weather_rolled`, `rush_started`, `rush_ended` | Shift id, earnings, weather/rush type; funnel and shift book |
| Arrivals | `customer_spawned`, `group_seated`, `queue_overflow` | Group id/size, weather/rush, table id; throughput counters |
| Orders | `order_placed`, `order_ready`, `order_grace`, `order_served`, `order_expired` | Table/order id, item count, outcome, credited amount/penalty; expired includes actual reputation deduction |
| Customers | `customer_served`, `customer_left` | Customer id/type, payment/tip/stale, reason/penalty; k, loss and onboarding |
| Preparation | `beer_pouring`, `beer_poured`, `dish_preparing`, `dish_ready`, `glass_stale` | Item/dish/glass id; station and freshness feedback |
| Cleanup | `glass_washing`, `glass_washed`, `table_cleaning`, `table_cleaned`, `table_occupied` | Glass/table id; bottleneck and lifecycle diagnostics |
| Purchases | `restocked`, `upgrade_bought`, `table_bought`, `table_upgraded`, `emergency_pack_claimed`, `coin_gain` | Quantity/cost/level/amount; inventory feedback and sinks |

Customer-level `ServeRecord` carries the exact payment/tip before the daily credit
cap, dishes, patience ratio and freshness. `credited` is separate. This prevents the
cap, group size or repeat-order throughput from changing the definition of k.

## UI listeners

`ui:tap`, `ui:sheet_open`, `ui:sheet_close`, `ui:toggle`, `ui:denied` map through the
asset manifest to sound files. `ui_sheet_open:upgrade` also advances the config-owned
guide. Onboarding state is currently local; its remote analytics funnel is pending.

## Remaining feature catalog

Canonical payloads remain in each feature's Analytics section until implemented:
F07 chairman and remaining customer behaviors; F08 lunch/football/event arbitration; F10 business unlocks; F11 kitchen details;
F12 season/rank; F13 life path; F14 leases; F15 risks; F16 referral; F17 quests;
F18 dog; F19 football; F20 donation; F21 lottery (legal hold); F22 assistant;
F23 reconnect/security; F25 identity; F27 onboarding funnel; F28 leaderboard/shrine.
F26 was removed and must not create paid-session events.

## Changelog

| Date | Change |
|---|---|
| 2026-09-08 | New-engine event catalog and distinction between implemented local events and pending feature analytics. |

| 2026-09-08 | Expired-order and queue-left events carry actual coin/reputation deductions for numeric-only loss toasts. No new event id is allocated, preserving existing replay entity IDs. |

## Local rush payloads — rules v8

All times are injected engine milliseconds. Fields below supplement the common
event envelope. These are local deterministic events, not uploaded analytics.

| Event | Payload |
|---|---|
| rush_scheduled | shiftId, slot (zero-based), seed (exact location/shift/day tuple), kind, startsAt, duration |
| rush_started | kind, until, weather, location; new v8 schedule adds shiftId/slot |
| rush_ended | kind; new v8 schedule adds shiftId/slot, startedAt, endedAt, activeMs, arrived, rejected, served, lost, payment, tips, revenue, stale, staleRate |

End reports cover [start,end) event outcomes; they are not arrival-cohort retention.
Arrived includes rejection; lost counts order_expired plus queue customer_left,
ignoring duplicate per-customer expiration mirrors. Revenue sums actual order_served
credits, including Tỉnh Táo/cap. Payment/tips sum nominal customer_served amounts.
StaleRate is zero without serves. Delivery/gift/coin_gain events are excluded.
startedAt/endedAt are wall event timestamps; activeMs excludes hidden pauses. Original
rush_scheduled timestamps remain historical after a pause; current Shift owns live
deadlines. Legacy shifts retain their original payloads, with no invented summaries.

| Date | Change |
|---|---|
| 2026-09-09 | Documented actual rules v8 rush lifecycle/report payloads and event-window semantics; lunch/football arbitration remains pending. |

## Local business sign events — rules v9

`signboard_installed`, `signboard_bought`, `signboard_equipped` carry style,
previousStyle (null at installation), cost and requiredRep. These deterministic
events share the command idempotency key. requiredRep is a purchase threshold,
not a debit; re-equipping owned styles costs zero. No season/lifetime faucet or
remote collection is added.

| Date | Change |
|---|---|
| 2026-09-09 | Added actual local business-sign purchase/equip payloads; prices and gate use the canonical snapshot. |
