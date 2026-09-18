---
slug: v6-sim-career-memory
class: server-guard
risk: P1
scope:
  - packages/engine/sim/career.ts
  - packages/engine/sim/headless.ts
  - packages/engine/sim/policy.ts
  - packages/engine/test/**
verify: npm run test:one -- packages/engine/test/career-memory.test.ts
budget_usd: 16
max_review_rounds: 4
model: claude-sonnet-5
feature: sim-memory
---
## Problem

`npm run sim:career:gate` has been observed at 12-17GB peak RSS and has OOM'd this machine
repeatedly, which is what forces every other lane to wait behind a swap check. It is pre-existing on
`main` — it is NOT caused by the k-admission branch, and `career.ts`/`headless.ts` never import
`sim/forecast.ts`, so the forecast retention work does not touch it.

Three arrays grow without bound inside one `Game` world for the whole simulated career, and nothing
prunes any of them (`grep` for `serves.splice|serves.shift|events.splice` in `packages/engine/src/`
returns nothing):

1. `w.serves` — every serve for `days` days. `career.ts:64` slices the day's window each day
   (`w.serves.slice(serveStart)`, cheap) but `career.ts:82` folds the *entire* array at the end via
   `serveValueStats(w.serves, config)`.
2. `w.events` — every event; `career.ts:82` filters the whole array for milestones.
3. `game.log` — `career.ts`'s `send()` derives its idempotency key from `game.log.length`, so the
   command log is retained for the whole run too. This one is easy to miss because no line reads it
   back except `.length`.

`MAX_DAYS` is 90 and the gate runs more than one seed, so the peak is roughly
(days x serves/day x seeds) retained simultaneously if seeds share a process.

## What must be measured BEFORE any code change

Do not start from the hypothesis above. Produce numbers first and put them in the PR body:

1. Peak RSS and wall time of `sim:career:gate` on `main`, via `/usr/bin/time -l` (macOS: read
   "maximum resident set size"). Run only when `sysctl vm.swapusage` shows under 4GB used.
2. A per-array breakdown at the end of one 30-day seed: `w.serves.length`, `w.events.length`,
   `game.log.length`, and an approximate retained-bytes figure for each
   (`process.memoryUsage().heapUsed` sampled before/after, or a heap snapshot).
3. Whether the gate runs its seeds sequentially in one process or in separate processes. If
   sequential in one process, whether each seed's `Game` is released before the next is built.

If the measurement contradicts the three-array hypothesis, stop and report. Do not fix the thing the
spec guessed at.

## Acceptance

- `sim:career:gate` peak RSS is reduced by at least 70% against the measured `main` baseline, and
  runs to completion with swap under 4GB.
- **Every published number is unchanged.** `serveValueStats` over the full career, the aggregate
  30-day k per seed (today 3.465461 for seed 42, 3.393197 for seed 99), per-day rows, milestones and
  season results must be byte-identical to the `main` baseline for the same seeds. Capture the
  baseline output to a file first and diff against it — this is the acceptance test, not a judgement
  call.
- A regression test (`packages/engine/test/career-memory.test.ts`, wired into the aggregate suite —
  see the V4 lesson about tests that exist but are never run) asserting that a career run does not
  retain per-serve state proportional to `days`. Assert on a bound, e.g. that after N days the
  retained serve/event/log count is O(1) or O(day), not O(days x serves).
- `NODE_OPTIONS=--max-old-space-size=...` is NOT an acceptable fix and must not appear in
  `package.json`. Raising the heap ceiling hides the growth instead of removing it; an earlier
  session added exactly that and it was reverted.

## Design constraint

`serveValueStats` is the canonical k measurer and the k invariant depends on the *whole* career's
serves, so the fix is to fold it incrementally — carry a running sum and count and update them as
each serve completes — not to truncate `w.serves`. Whatever is dropped must be provably not read
later: `w.serves` is also consumed by `headless.ts:97/99/105` (mean, `wellRestedBonus` reduce, stale
count), so any change to the world's retention has to keep those working or leave the world alone and
change only what the sim retains.

Prefer a change confined to `packages/engine/sim/`. If the growth genuinely lives in
`packages/engine/src/` (the world itself), stop and report before touching it — that is gameplay
state, and the blast radius is different.

## Why this is supervised P1

It touches the code that produces the k numbers the whole economy is validated against. A silent
change to those numbers would invalidate every prior balance receipt. Run it by hand, not through
the dispatcher.
