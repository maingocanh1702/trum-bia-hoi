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

A second smoke pass was run by the builder on 2026-09-08, after the docs/tooling cleanup, to
confirm the build still plays end-to-end. No figures were recorded from it. Like the first pass
it is a mechanism check performed by the person who designed the mechanisms, so it cannot close
the gate: the five questions below ask whether a **new** player learns the timing and where they
get confused, and a designer cannot be confused by their own design. Builder smoke answers "does
it still run"; Alpha answers "does it teach itself".

## Required sample

- 3–5 human testers.
- At least 3 complete shifts per tester.
- Do not coach moment-to-moment after the controls are introduced; confusion is evidence.
- Each tester must experience normal and peak cadence.
- Testers run the **hosted build** on their own device, on their own schedule (see below).

### Hosting the build — this is what unblocks the gate

The original instruction here was `cd prototype && npm run dev`, which chained every tester to
the builder's machine: 3–5 people × 3 shifts × 12 minutes of someone else's time at one desk,
scheduled. That is the reason this gate sat open from 2026-07-15 — the blocker was logistical,
not technical.

It is removable in minutes. `prototype/vite.config.ts` already sets `base: './'`, the prototype
is client-only (no server, no persistence) and its viewport is locked to mobile, so a static
build drops onto any static host with zero configuration:

```bash
cd prototype
npm run build     # → prototype/dist/
```

Publish `prototype/dist/` (drag-and-drop onto any static host) and send the link. The game is
mobile-first by design, so testers play on their own phone whenever they have 12 free minutes.

**Current build URL:** `<fill in after deploying>`

### Collecting evidence remotely

After each shift the tester opens **Sổ ca** and taps **Copy log** — that puts the full
`ServeEvent` JSON on the clipboard — and sends it back. A screenshot of the stats sheet is an
acceptable fallback. The per-shift figures below come from those logs, not from the builder
watching over anyone's shoulder; not watching is required anyway, since coaching destroys the
confusion evidence.

Read per-shift numbers from each shift's own sheet. Do **not** read the "Dồn cả phiên" aggregate
row — the engine does not carry lost/rejected counts across shifts, so that row always shows `0`.

**Tester-facing instructions**, ready to send as-is (fill in the link first):
[`phase0-alpha-tester-brief.md`](phase0-alpha-tester-brief.md).

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
