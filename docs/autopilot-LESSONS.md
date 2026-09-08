# Autopilot — lessons learned (Trum Bia Hoi)

> **Numbering convention.** Lesson numbers in this file (`L1`, `L2`, ...) are **repo-local** — they
> start at `L1` here and only resolve within this file. An `L<n>` citation found inside a file that is
> synced verbatim from the canonical kit (`scripts/ap-finish.sh`, `scripts/autopilot-scope-gate`, ...)
> is **not** a line number and does **not** point here — it points to the kit's own lesson corpus,
> physically kept at `Bestminton Club Payment check bot/docs/autopilot-LESSONS.md` (that repo numbers
> each entry `### L<n>`, currently through `L76`). Concretely: the `"L67"` in `ap-finish.sh:242` is
> lesson `L67` in that repo — the single-HALT-file durable-artifact case — not a line in this file, and
> not this file's own `L1` below (different repo, different lesson, coincidentally the same number).
> Don't "fix" that comment here: `ap-finish.sh` is synced verbatim from the canonical kit; a repo-local
> edit forks it and gets silently overwritten on the next `autopilot-sync`.

> Incident write-ups for this repo's autopilot kit, referenced by scripts (e.g. `scripts/ap-finish.sh`)
> so a failure mode is fixed once instead of rediscovered per slice. One entry per incident; append,
> don't rewrite past entries.

## L1 — Ghost review: clean verdict with no receipt (`dashboard-phase-table-boundary`)

**Symptom.** `INFLIGHT.md` carried `status: ready` for slice `dashboard-phase-table-boundary`, but the
worktree's state directory had none of `READY.txt`, `gate-result.json` or `gate-attempt-count.txt`.
Running `scripts/ap-finish.sh dashboard-phase-table-boundary` today (2026-09-08) HALTed in
ancestor-mode: it requires those proof files and found none.

**Root cause.** The archived state
(`.autopilot/state-archive/dashboard-phase-table-boundary-20260908T043905Z/state/`) shows the review
did run: `regions.log` and `fix-round-count.txt` (`1`) were written 2026-07-15 10:58 local, then
`codex/round-01.txt` (62790 bytes) captured a full, clean verdict at 2026-07-15T03:59:17Z (10:59
local) — *"The parser change correctly excludes the progress-summary table from the final phase and
filters rows to canonical Fxx feature IDs. The added regression tests pass, and the dashboard build
reports the expected 26 PRs."* Nothing was written after that. The gate's terminal receipt is not one
atomic write: attempt counter → verification → review-round artifact → `gate-result.json`, and only
then, as a later and separate step, `READY.txt`. A run interrupted anywhere after the review artifact
lands and before the receipt step reproduces exactly this state — a real, clean review with no proof
it happened — and nothing at the time flags the gap.

**Consequence — not fixable after the fact.** By the time the missing receipt surfaced, the slice's
commits were already merged into `master` (same-day dashboard rebuild, 2026-09-08). Once a branch tip
is an ancestor of its base ref, the gate can never be rerun to backfill the receipt: the diff window
between branch and base is empty, and this workflow never treats a clean review of an empty diff as
evidence. Ancestor-mode landing deadlocks permanently at that point. The only way out was
`--authorized-close` — a label that doesn't quite fit (the work is merged, not abandoned) but is the
mechanism that preserves the branch and archived state without demanding a proof the tooling can no
longer produce.

**Takeaway.**
- A slice found missing its terminal receipt must be closed (or re-gated) **before** it merges to the
  base branch. After merge, the window to regenerate proof is gone for good — check for
  `READY.txt`/`gate-result.json` as part of the merge step itself, not only when someone later runs
  `ap-finish.sh`.
- Structural fix for the gate: write the terminal receipt (`READY.txt` + `gate-result.json`) atomically
  (write to a temp path, then rename) in the same step that persists a clean review verdict, so there
  is no dead window between "review completed" and "receipt exists" for an interruption to land in.
  This is a kit-tier gap, not local to this repo — pushed to the canonical corpus as
  `(arch: readiness-receipt-non-atomic)`.
