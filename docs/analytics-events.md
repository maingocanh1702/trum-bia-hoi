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
| Seat model (rules 28) | `queue_overflow{size, reason}`, `chair_bought{tableId, seats, cost}`, `table_bought{cost, tableId}`, `seat_model_adopted{shiftId, tablesBefore, tablesAfter, seatsBefore, seatsAfter}` | `reason` is `noSeat` (a pair met a shop with no two-chair table: no penalty, no reputation, not `lost`) or `full` (queue full); seat-model shifts count those guests in `stats.rejected` and `stats.noSeat`. `seat_model_adopted` fires once, at the first opening that pins a seat-model snapshot over an old capacity save (plan D2). Rules ≤ 27 histories keep `queue_overflow{size}` / `table_bought{cost}` exactly. |

Customer-level `ServeRecord` carries the exact payment/tip before the daily credit
cap, dishes, patience ratio and freshness. `credited` is separate. This prevents the
cap, group size or repeat-order throughput from changing the definition of k.

## UI listeners

`ui:tap`, `ui:sheet_open`, `ui:sheet_close`, `ui:toggle`, `ui:denied` map through the
asset manifest to sound files. `ui_sheet_open:upgrade` also advances the config-owned
guide. Onboarding state is currently local; its remote analytics funnel is pending.

## Remaining feature catalog

Canonical payloads remain in each feature's Analytics section until implemented:
F07 chairman and remaining customer behaviors; F08 lunch/football/event arbitration; F10 remaining business unlocks; F11 customer-specific hot-dish demand;
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

## Local menu provenance — rules v14

The engine keeps local deterministic events; no network collector is introduced.
Common envelope fields include `id`, `at`, `type`, `configVersion` and
`idempotencyKey`. IDs below are generated game identities, not personal data.

| Event | Payload |
|---|---|
| `menu_tracking_started` | shiftId, complete |
| `dish_ordered` | shiftId, tableId, orderId, itemId, dish, customerId, customerType, tableSize |
| `kitchen_job_started` | shiftId, itemId, dish, prepMs, readyAt |
| `kitchen_job_ready` | shiftId, itemId, dish |
| `dish_wasted` | shiftId, tableId, orderId, itemId, dish, reason (`expired` or `cancelled`), previousState (`preparing` or `ready`) |
| `menu_mix_summary` | shiftId, complete, served, orders, totalValue, mean, avgTicket, kValue; ordered_*, sold_* and wasted_* for each of the six dish IDs |

`dish_ordered` records each actual item at order placement. Hot-job events follow
Item transitions and the configured duration, including a duration rounded to
zero: start and ready share that timestamp. Existing preparation aliases remain
for UI/audio consumers. Waiting for stock or a burner does not start a job.
`dish_wasted` is emitted once when prepared food is discarded by expiry or a
confirmed paid dismissal. Never-started items and already-served rounds are not
waste. Neither cleanup, retries nor hidden time duplicate waste or refund stock.

`Shift.menu` holds event/serve cursors, not duplicated counters. A new v14 shift
has complete coverage. An active legacy shift begins partial coverage at its
first current command, without backfilling unrecorded orders or waste; an already
closed legacy shift has no report. The UI labels partial/unavailable data. Sold
counts can exceed observed orders in a partial window when an older order is
served after adoption. New shifts reset both cursors. Closure emits one summary.

`menuReport` derives counts from that window and the canonical `ServeRecord`s.
`serveValueStats` is shared with the headless balance simulation:

- totalValue = seated service payment + tip before credited caps/bonuses.
- mean = totalValue / served-customer records (repeat rounds remain service records).
- kValue = mean / configured `k.anchorValuePerServe`.
- orders = distinct served order IDs; avgTicket = totalValue / orders, per mâm/round.
- Delivery, throughput, rest bonuses and credit caps never enter these values.
- Without serves, mean/avgTicket/kValue are null. An unsafe nominal sum makes all
  value fields null. The UI uses a dash for an unavailable average.

Sổ ca displays six dish rows and the per-mâm average, with explicit units/value
basis. It remains accessible while resting after reload. It does not expose k
as a player score. Protocol v1–13 histories replay unchanged; v14 consumes the
existing event-ID sequence, so future shift IDs/schedules are not claimed to
match earlier protocol runs. The autonomous adoption frontier remains rules10.

| Date | Change |
|---|---|
| 2026-09-09 | Added rules14 local dish/job/waste provenance, cursor coverage, shared nominal service-value definition and Sổ ca report. Recorded partial legacy semantics, zero-duration completion, exactly-once disposal and absence of remote collection. |


## Rules15 — configuration pin provenance (2026-09-09)

`config_pinned {shiftId, previousVersion, configVersion}` is emitted once when a
successful opening adopts a different immutable snapshot. Its event envelope uses
the new configVersion and the opening command idempotencyKey. Refused openings and
retries do not emit it. A refused start command logs its attempted candidate version
while any pre-command housekeeping events still use the previous active pin.
This is local engine provenance; remote collection/registry publication is pending.

| Date | Change |
|---|---|
| 2026-09-09 | Added successful config pin transition event and clarified candidate-versus-active version provenance for refused openings. |

> 2026-09-18 owner (chờ S1/S4/`story-ending`): sự kiện mới `queue_overflow{reason:noSeat|full}` (cặp không có chỗ / hàng đợi đầy — không phạt), `table_upgraded{what: chair|dish|comfort, level}`, `story_ended{lifePath:7, shift}`; sổ ca thêm "cặp không có chỗ" và "từ chối tại cửa". Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2c.

| 2026-10-19 | S1 `eco21-seat-model` (rules 28): `queue_overflow` gains `reason` (`noSeat` / `full`, as the 18/09 note planned); chair purchases are `chair_bought` rather than the note's `table_upgraded{what:chair}` (a purchase, like `table_bought`; `table_upgraded` stays the level event for S4); new `seat_model_adopted`; `table_bought` gains `tableId` on seat-model shifts. |
| 2026-10-20 | S2 `eco21-instant-pour` (rules 28): on a seat-model shift a beer item is `ready` in the tick of `order_placed`: `beer_pouring` is followed in that tick by `beer_poured{itemId, fromReserve:true}` (the payload the pre-economy-2 batch path already used) and `order_ready`; `order_expired.cause` is never `tap` there. Rules ≤ 27 histories and capacity pins keep `beer_poured` `pourMs` after `beer_pouring`. No new event name. |
| 2026-10-20 | S3 `eco21-capacity-demand` (rules 28): no new event name or payload. `queue_overflow{size, reason}` is unchanged (`noSeat` / `full`, never a penalty); only how often it fires changes (door queue `1 + seats/8`, arrivals thinned by `spawn.capacityDemand`). The shift book's "Cặp không có chỗ: n" is `shift.stats.noSeat / 2` (the 18/09 note's "cặp không có chỗ" counter: pairs refused for lack of a two-chair table); singles refused for a full queue are in the book's "Hết chỗ" reason row. |
