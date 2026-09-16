# Wave A/B — implementation receipt, 2026-09-16

Authority: [owner plan](PLAN-improve-2026-09-16.md), SHA-256 `958504686f8136a6172c3645c6d87a830b630350714eb892c26f20373cc19dda`. Execution stops after Wave B, before human Wave C measurements and server/public deployment. Work is isolated on `codex/improve-wave-ab`, from base `927ef4c`. The owner checkout and existing 5174/5175 services are unchanged. No merge, push or deployment is included.

## Scope and acceptance

| Item | Implementation | Acceptance boundary |
|---|---|---|
| A1 | Config 2.0.4 removes the hidden dog prerequisite from LP1; old guest saves adopt it at the next successful opening. Incoming progression also supplies that opening’s rush schedule. | PASS: production guest migration, export/reload and full gates. LP1 remains 50,000 Base × 2.5 = 125,000 actual earned coins and four seats; no threshold retune. Historical pins/replay retained. Commit `bf90ca0`. |
| A2 | Low/empty raw beer HUD warning and quoted one-click full restock without opening a paused menu. | UX PASS in local/real-server tests. Balance target OPEN: cap 15 = 221/1020 lost; hypothetical cap 45 = 198/1022 lost. 211/221 baseline losses were waiting in the queue. No stock/throughput retune; no emergency feature enabled. Commit `3e71960`. |
| A3 | Existing sim counts unique arrivals by customer type and tests configured VIP distribution across five seeds. | Automated PASS; human shift-2 VIP observation PENDING. Repeated service rounds are not new arrivals; forced onboarding/modified pools are separated. Commit `ef3aef5`. |
| A4 | Contextual preparation feedback and measured loss-cause suggestions, shared across local/server paths. | PASS: 545 tests, replay, 114 local UI, 24 remote, focused accessibility and independent review. Numeric loss toast retained. Commit `8b6dff3`. |
| A5 | Separate tap/refill copy, customer-round vs table-order explanation, active-rest ETA, targeted manifest-based sprite preloads. | PASS: VI/EN, three viewports, production/legacy paths and accessibility. Commit `f52a48d`. |
| A6 | Settings build SHA and historical public deployment receipt. | PASS on built source; public index still matches September 11 source `c772425`. No new deployment. Commit `9dd7103`. |
| B | Six exact shift metrics in the book/export plus closed-playtest sheet. | PASS: automated gates and independent final review (no actionable defects). Playtest-sheet commits `eb47900` / `07430a9`. Human results are not fabricated. |

## Wave B data contract

**Sổ ca → Chi tiết → Số đo ca** shows customer rounds served, mean payments + tips, k, snack-round ratio, flat-served-beer ratio, and customers lost. Numerators plus arrival/rejection counts accompany the six values. The existing canonical `serveValueStats` remains the value/k source. No economy formula changes.

- Display values are localized and rounded to four decimal places; raw values in `shift_closed` and the backup export are exact. Five full-shift seeds compare them with service records and deterministic replay with zero difference.
- One served customer-round is one service record; the current order model has at most one beer per customer-round. Only served beer belongs in the flat-beer denominator.
- Empty denominators remain unavailable, not 0%. A partial legacy shift has no whole-shift KPI block; rules 27 closes it with `metricsComplete=false` and six null values.
- Rules 27 adds snapshots only to new close events. A genuine rules-26 fixture from `8b6dff3` still decodes to the exact prior world hash; old `menu_mix_summary` payloads stay unchanged.
- Native Details works with keyboard and touch inside the already-paused book. VI/EN labels, backup download, reload and real-server reports are covered.

## Verification receipts

Evidence folder in this worktree: `artifacts/verification/improve-wave-ab/`.

| Gate | Result / receipt |
|---|---|
| Final integrated `npm run verify:all` | PASS: 548/548 tests, config/i18n, build, engine purity, feature map and doctor. `b-final-verify.log`. |
| Standard economy | 20 onboarding on/off × cold/full-menu × five-seed samples; k = 2.4989–2.9830, at least 1,000 serves/sample. Same log. |
| Career | 30-day aggregate k: seed 42 = 3.465460767842698; seed 99 = 3.393196640939153, both ≤ 3.5. Individual late-day diagnostics exceed 3.5; this receipt is the existing aggregate career gate, not a claim every day is in band. |
| Rush / VIP | 15 rush windows and four five-seed VIP baseline cohorts PASS. Human feel/VIP sightings remain pending. |
| Wave B engine | `b-engine.log`: 13/13 menu tests, including five-seed metrics, partial data, old replay and export. |
| Wave B menu / accessibility | `b-ui-metrics-axe.log`: 4/4 browser cases, six whole-page axe scans across VI/EN × 360×740, 390×844, 1280×720. |
| Wave B mapped UI | `b-ui-report.md`: 88/88 local and 18/18 real-server cases, including isolated 24-shift/>5 MB save reopen. Six keyboard/scroll probes: all metrics and notes reachable, 44 px summary, no horizontal overflow, missing images, or observed console/page errors. |
| Final production guest migration | `b-production-migration.log`: 1/1 PASS against the fully built integrated source; old guest save adopts config 2.0.4 only at a successful new opening, exports and reloads. |
| Assets | `b-assets.log`: 132 manifest entries, 32 paired SFX; 3 sprite placeholders, 121 drafts. No new asset generation or approval pass. |
| Prior integration | `integrated-ui-report.md`: 101 local + 1 real-server + 6 axe tests/102 scans at `07430a9`. At 360×740 the third-table caption needs 56 px of vertical scroll to clear navigation. |
| Independent review | A1/A2/A3/A4/A5/A6 and playtest sheet CLEAN; Wave B `b-review-01.log` terminal verdict: no actionable defects. Reviewer also ran the 548-test suite and focused checks. |

The initial B menu run failed because the test expected “Download backup” instead of the existing “Download a backup” label. The selector was corrected; the succeeding menu/export/axe run is green. The large-career UI case was run alone with its normal 120-second timeout; no timeout or assertion was weakened. The reviewer’s duplicate remote run used the wrong config path/default ports and stopped during fixture startup; the correctly configured independent remote matrix is the 18/18 receipt above, not that failed invocation.

Further bounded receipts: [A2 diagnosis](improve-a2-stock.md), [VIP denominator](improve-vip-proof.md), [A4 decision table](improve-a4-feedback.md), [deployment receipt](deploy-log.md).

## Next boundary

Use the [closed-playtest sheet](phase0-alpha-playtest.md) to measure three consecutive shifts on an A/B build. The public URL currently still serves the older guest build; do not collect new-build evidence there until that exact version is published and its SHA checked.

Readable now: all six KPIs, snack/flat numerators, served/beer denominators, and arrivals/rejections. Wave C targets (% lost <20%, % flat 5–15%, first serve ≤30 s, two manageable rushes), the 10–15-person fun/continuation survey, and A2’s bot <10% loss target remain OPEN. Scripted tests do not replace human feel evidence.

Wave D hosting, real Google, rewards decisions and Wave E release are outside this batch. M6/M7/M8 remain OFF. No `v1.0` release claim.
