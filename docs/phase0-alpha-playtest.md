# Phase 0 Alpha playtest — evidence sheet

> **Status:** AWAITING HUMAN EVIDENCE
>
> **Build:** `master` at/after `b3ad865`
>
> **Protocol authority:** `06-ROADMAP-trum-bia-hoi.md` Phase 0 exit gate + Playtest & Validation Plan

## Automated baseline (merged, 2026-07-15)

- Build: PASS.
- Five deterministic seeds: k `2.24–2.34`; normal loss `0%`; peak loss `26.1–40.8%`.
- Aggregate loss/rejection is fail-closed and uses customer arrivals, not served rounds.
- This baseline does **not** pass the feel gate.

## Technical smoke (not counted as an Alpha tester)

One partial shift was exercised through the local browser: open/close shift, group spawn, serve table, HUD k update (`2.42`), normal→peak toggle, glass/wash lifecycle, stale/loss log. No browser console errors occurred. A deliberately delayed serve produced one stale delivery and an unattended table lost two customers; these are mechanism checks, not balance evidence.

## Required sample

- 3–5 human testers.
- At least 3 complete shifts per tester.
- Do not coach moment-to-moment after the controls are introduced; confusion is evidence.
- Each tester must experience normal and peak cadence.
- Run from the merged build:

```bash
cd prototype
npm run dev
```

## Per-shift log

| Tester | Shift | Mode | Completed ~12m? | Served | k at close | Stale deliveries | Lost | Rejected | Notes |
|---|---:|---|:---:|---:|---:|---:|---:|---:|---|
| T1 | 1 | normal |  |  |  |  |  |  |  |
| T1 | 2 | peak |  |  |  |  |  |  |  |
| T1 | 3 | mixed/choice |  |  |  |  |  |  |  |
| T2 | 1 | normal |  |  |  |  |  |  |  |
| T2 | 2 | peak |  |  |  |  |  |  |  |
| T2 | 3 | mixed/choice |  |  |  |  |  |  |  |
| T3 | 1 | normal |  |  |  |  |  |  |  |
| T3 | 2 | peak |  |  |  |  |  |  |  |
| T3 | 3 | mixed/choice |  |  |  |  |  |  |  |

Add T4/T5 rows only when those testers actually participate.

## Five exit-gate questions

Record a short answer and one concrete observation per tester.

1. **Freshness:** Did the player learn to delay pouring, with stale penalties feeling rare rather than arbitrary?
2. **Table groups:** Was serving one Order for the whole table clear, without repeatedly choosing the wrong action?
3. **Glass bottleneck:** Did clean/dirty/washing glasses become the obvious constraint, and did the wash upgrade visibly relieve it?
4. **Two cadences:** Did normal feel controllable and peak feel hectic but still recoverable?
5. **Economy:** Did hand-play k remain in `2.0–3.0`, with normal customer loss below `10%`?

## Decision record

| Gate | Evidence | Verdict |
|---|---|---|
| k stable 2.0–3.0 |  | PENDING |
| stale rate 5–15% and penalties feel fair |  | PENDING |
| normal loss <10% |  | PENDING |
| table-group flow clear |  | PENDING |
| glass bottleneck clear; wash upgrade helps |  | PENDING |
| peak hectic but recoverable |  | PENDING |

Final decision is `PASS` only when every row above has human evidence and no repeated critical confusion remains. Otherwise keep Phase 0 open, record the failed mechanism, and create a bounded corrective slice before Phase 1.
