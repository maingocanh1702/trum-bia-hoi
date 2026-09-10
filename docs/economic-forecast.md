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

| 2026-09-10 | Review correction: retain attained location ID, read its current multiplier after each pin, and renew that identity if no higher eligible location exists. Regression first failed (Ngõ Chợ instead of Bến Xe), then passed with full command replay. Ordinary/rush passed at foundation; runtime and those simulators are unchanged by this correction. |

| 2026-09-10 | Follow-up review: current snapshots after natural lease expiry recover attained location from the active contract or latest lease_started event, falling back only when no lease history exists. Regression covers both active and expired contract snapshots and full replay. |

Final kernel `03a6800`:344engine/server, config zero warnings/build/typecheck PASS.
Two-day career still exactly matches its original report/hash. Foundation10ordinary
kcohorts2.4186–2.8738 and15rush PASS; runtime and those simulators unchanged by
corrections. Review identified two lease-progression edges: config retuning and
post-expiry snapshots. Both now use attained identity from the active lease/history;
final full-base review has no actionable finding and independently passed the lease
regression. Receipt `.qa/forecast-verification.json`. M4 remains11/18 OPEN: protected
server snapshots/timelines, aggregation/admin UI and observed VND data still remain.
No public upload,80MB tuning, engine/config changes or merge/push/deploy.

| 2026-09-10 verified | Kernel03a6800 passed host344/config/build/parity and final independent review; full server forecast/UI remains open. |

| 2026-09-10 owner decision | Endgame inflation is monitored through7-day credited faucets/sinks and wallet deltas, not k. Advanced career k≤3.5 is a separate service-value acceptance gate, to re-evaluate after Alpha with real player data. No tuning or new inflation threshold; protected reporting/UI remains M4 work. |

## Protected report transport — contract 2026-09-10

Base `0238bd5`. Reuse registry composition/activation and the forecast kernel.
Capture one consistent SQLite backup in a private temporary directory. A bounded
worker uses the existing store presence/catch-up logic only on that copy, then
projects baseline/candidate for every existing player in the affected audience.
Include previous audience members when a scope shrinks; include all future
publication/expiry boundaries within seven days. Keep current open-shift pins.
Return population totals, daily faucets/sinks, key changes, snapshot time and
version/revision provenance. Count affected players across the entire horizon.
No sampling/extrapolation, partial totals, new-player assumptions, VND fabrication,
extra k factor, player writes, config publication or permanent snapshot files.
HTTP uses existing admin cookie/context checks before and after work; cancellation,
timeout and process failure terminate the worker and remove the temporary copy.
A single in-process job bound protects gameplay handling. UI shows this explicit
scenario alongside the draft, keeps Vietnamese/English labels and clears results
on identity/version change. Existing approval/publication rules are unchanged.
Verify real worker/HTTP authorization, unchanged source DB, cancellation, scope
expiry/removal, conservation and browser report display before closing this slice.
