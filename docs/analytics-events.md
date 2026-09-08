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
| Orders | `order_placed`, `order_ready`, `order_grace`, `order_served`, `order_expired` | Table/order id, item count, outcome, credited amount/penalty |
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
F07 shipper/chairman; F08 rush scheduling; F10 business unlocks; F11 kitchen details;
F12 season/rank; F13 life path; F14 leases; F15 risks; F16 referral; F17 quests;
F18 dog; F19 football; F20 donation; F21 lottery (legal hold); F22 assistant;
F23 reconnect/security; F25 identity; F27 onboarding funnel; F28 leaderboard/shrine.
F26 was removed and must not create paid-session events.

## Changelog

| Date | Change |
|---|---|
| 2026-09-08 | New-engine event catalog and distinction between implemented local events and pending feature analytics. |
