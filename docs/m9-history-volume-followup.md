# M9 follow-up: career history volume

Owner steering 2026-09-10: stop after reviewed schema6 checkpoints. No additional
80MB tuning, public upload transport or host-sleep reruns in the current slice.
This is deferred M9 investigation, not permission to drop authoritative history now.

Observed archive:80,013,203bytes,16,567commands,388,986events in30days/240shifts.
Schema6 cold read is2.23s versus29.36s replay baseline; import49.47s still includes
full untrusted replay and a3.53s main-loop gap. `.qa/checkpoint-month.json`.
Data volume and full-history materialization are the remaining cost drivers.

Command counts from that exact archive:serve8,351;restock6,444;serveDelivery1,271;
startShift240;all other commands261. **activity=0** in this headless trace, so it does
not explain this measured80MB save. Actual browser visibility patterns need their
own measurement; do not extrapolate the bot trace to human sessions.
Top events:dish_ordered56,223;beer_pouring30,225;glass_washing30,225;
glass_washed30,225;beer_poured30,162;customer_served29,209;dish_preparing25,772.

## Evaluate in M9

1. Server stores commands plus periodic verified checkpoints and deterministically
   re-derives events; retain original event evidence wherever import review/validation
   requires it. Before any format change, prove exact IDs/order/config pins, recovery,
   idempotency, ranking provenance/audit and bounded paginated resync. Preserve current
   immutable histories and migrate explicitly; no silent deletion or partial replay.
2. Avoid persisting redundant visibility-flip activity commands if real user traces
   show dominance. Preserve pause/active-time, calendar and disconnect semantics;
   prove fine/coarse replay and cross-tab/reconnect equivalence before coalescing.
3. Size fullLP0–LP7 histories, peak memory, isolated upload/persistence/recovery and
   state-response cost. Reuse existing fixtures; do not regenerate30days solely for
   another benchmark. Public transport remains absent until separately implemented.

M4 web source-of-truth/reconnect/registry-admin takes priority. No economy retuning,
ranking approval from replay alone, or release-performance claim follows this note.

| Date | Change |
|---|---|
| 2026-09-10 | Recorded owner timebox and M9 command/checkpoint/event and activity-log alternatives, with actual archive counts and integrity constraints. |
