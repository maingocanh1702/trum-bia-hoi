# B3 — slice S3 `eco21-capacity-demand` (Wave 2, behind rules 28)

Read `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/briefs/COMMON.md` first; it binds you. This file adds what is specific to S3.

## Where / which branch
- Worktree `/Users/maingocanh/Projects/Trum Bia Hoi/.autopilot/worktrees/eco21`. Branch from S2's tip: `git switch -c feat/eco21-capacity-demand feat/eco21-instant-pour` (check `git log -1` first). Evidence: `artifacts/verification/feat-eco21-capacity-demand/`.
- Read the S1 and S2 reports (`artifacts/verification/feat-eco21-seat-model/report.md`, `.../feat-eco21-instant-pour/report.md`) for the seat model, `queue_overflow{reason:'noSeat'}`, the rules-28 helper and config keys you build on.

## The slice (plan §5 row S3; §1 D12 D17 D19 D25; DESIGN-story §3 "Hàng đợi", "Kiên nhẫn", "Cầu theo sức chứa"; FEEDBACK §II.2 v3.3)
- New Tier A key `spawn.capacityDemand { refTables: 6, maxMult: 4 }`: the gap between arriving groups is multiplied by `min(maxMult, max(1, refTables / numberOfTables))` (1 table ×4 · 2 ×3 · 3 ×2 · 4 ×1.5), rules ≥ 28.
- Queue and patience per W9 (08-SPEC changelog row "2026-09-18 / chờ JSON 2.1.0, rules 28"): `runtime.queueBaseSlots` 1 and `runtime.queueSeatsPerSlot` 8 (queue = 1 + seats/8) — these replace the old `2 + seats/3` formula for rules ≥ 28 (keep the old keys readable for old pins/replays); `patience.thuongMs` 24 000 (from 18 000) for rules ≥ 28 only — old replays must not change, so gate the new value by rules version or by a new key, whichever keeps pinned configs/replays byte-identical (decide, record it).
- D12: `queue_overflow` (a group turned away at the door, full queue OR no seat) costs NO reputation and is not `lost`; only leaving because the wait ran out costs −5 reputation.
- The shift book counts "cặp không có chỗ" / groups turned away (`stats.rejected` already counts guests; add whatever per-shift number the book needs, e.g. refused pairs) and the UI shows it; the turned-away group gets a visible toast (reuse the web's "no room" leave-reason toast `apps/web/src/leave-reasons.ts` if it is on your base — if not, add a minimal one) and a number in the shift book.
- "Cặp nhìn quán rồi đi" and the door queue are VISIBLE on the yard, not just a number badge: a pair that is refused is drawn walking up and turning away (a bubble "2 ghế" exists on the Wave 1 chain, not on your base — build the minimum on your base, S6 owns polish); the waiting queue shows as figures outside the door with patience rings if cheap, otherwise a clear count + icon. Keep `prefers-reduced-motion` respected.
- Rush when the shop has < 2 tables: "should have, not required" (F08 changelog) — implement only if it falls out cheaply (skip scheduling a rush below 2 tables); otherwise record the choice.

## Acceptance (plan §5 S3) — report all numbers
- Career bot (policy from S1): % of guests who left WITH penalty: shifts 1–24 ≤ 10 %, days 8–14 ≤ 20 %, days 15–21 ≤ 15 %; shift 1 has ≥ 15 arrivals (refused pairs included) and ≥ 5 refused pairs; a refusal at the door produces a toast and a count in the shift book.
- These bot gates depend on the S5 balance: run them on the W9 candidate numbers you were given and REPORT the measured table; if a gate is missed, the verdict is PARTIAL with `SKIPPED/DEFERRED: tuned in S5 per plan §5` — never tune numbers around it before S5.
- Old saves/replays byte-identical; `npm run verify:all` green; standard k and `sim:career:gate` measured and reported (may be red until S5: PARTIAL block as COMMON.md says).
