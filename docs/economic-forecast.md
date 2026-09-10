# Seven-day economic forecast — simulator foundation

Base `f41122b`. BRD §5.2 requires projected faucets/sinks, affected players and changed
price/cap/reward keys; Tier A also needs VND revenue estimates. This slice supplies
the shared deterministic simulation kernel needed by the protected admin report.
No live economy values, engine rules or real player state are changed.

- Reuse the existing career management/service policy; preserve its two-day command
  hash and outcomes. Quotes and engine commands remain the only rule authority.
- Fork an integrity-checked Game with its complete checkpoint/history. Untrusted
  uploads do not enter this API. Preserve old open-shift pins; a supplied registry
  timeline chooses snapshots only on actual new openings.
- Project exactly seven days from the input snapshot time, with explicit VN calendar
  buckets and assumptions. Identical input/timeline must return identical results.
- Report actual credited wallet faucets, command spending, penalties and returned
  deposits; enforce cash conservation each bucket and for the full forecast. Never
  multiply already-scaled values by k again. Zero history is not zero revenue proof.
- Model a continuously active policy player, not a measured real-user forecast or
  optimal-play guarantee. A blocked command, unsafe value or simulation bound stops
  the report; it must not return plausible partial totals.
- Protected server audience/timeline transport, aggregation and admin presentation
  follow this kernel. Donation observations/VND estimation remain unavailable until
  an actual donation data source exists. No public upload or 80 MB tuning in this slice.

Verification: baseline career parity; deterministic seven-day current-save projection;
wallet conservation; changed prices/caps and scheduled/expired config at openings;
source immutability and replay equality; bound/input failures. Config/build/tests,
ordinary k/rush and independent review before marking this kernel complete.

| Date | Change |
|---|---|
| 2026-09-10 | Simulator foundation contract; full forecast UI/M4 remains open. |
