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

## L2 — Shared checkout: verification attributed to a branch that was not checked out (`v5-admin-k-admission`)

**Symptom.** A supervised session working on `supervised/v5-admin-k-admission` in the primary
directory reported `test:one` 51/51, the full suite 558/558, `check:config`, `check:i18n` and `build`
all green. On the next command it found `git branch --show-current` returning `main`, and its own
feature files absent from the working tree — no `MeasureK`, no `measuredK`, no `serveValueStats`
import.

**Root cause.** The primary directory is shared. Another actor (the owner, or a concurrent Codex
session) checked out `main` there while the supervised session was mid-run. Nothing in the session's
own state changed, so nothing warned it: git switched the files underneath a process that had no
reason to re-check which branch it was on. The commits were safe — they were on the feature branch —
but every test result produced after the switch had been measured against `main`.

**Consequence.** The results were not wrong so much as unattributable: there was no way, after the
fact, to tell which runs preceded the switch and which followed it. All of them had to be discarded
and redone. This is worse than an outright failure, because a green result that silently belongs to
another branch is indistinguishable from a real one in a report.

**Takeaway.**
- One lane, one worktree. A session that will run verification never works in a directory anyone
  else may check out. This repo already had a worktree-per-slice pattern under `.codex/worktrees/`
  and `.autopilot/worktrees/`; the failure was using the primary directory anyway.
- Re-running the suite in an isolated worktree is the *only* remedy. Reasoning about which results
  "probably" predate the switch is not evidence.
- A session that discovers a branch mismatch treats every prior result in that session as void, and
  says so in its report rather than quietly re-running.

## L3 — BUDGET halt with work delivered but unreviewed, twice (`agent-verification-m03-dev-port-wire`)

**Symptom.** The lane halted `terminal: BUDGET`, `terminal_kind: writer-fault`, at $10.135 of a $10
ceiling. `retry.sh --extend-budget` refused it: there was no `READY-FOR-REVIEW` at the recorded head,
so the mode that "resumes review at the same head" had no review to resume. The writer had spent the
whole budget on a fix round and run out before committing. Recovery took hand-editing the record —
`answer_pending=true`, `budget_usd=15`, `owner_extended=true` — to make the dispatcher relaunch the
*writer*. The lane then halted at BUDGET a second time, at $15.007 of $15, this time *after*
delivering `READY-FOR-REVIEW` at `36d0057`.

**Root cause.** Two separate gaps, both in the recovery surface rather than the run itself. First,
`launch_writer` starts a writer against whatever budget headroom remains, including a remainder too
small to finish anything — so a nearly-exhausted run burns its extension re-entering the same wall.
Second, the recovery modes are split by what they resume (review vs. writer) but the owner's actual
situation is described by what the run *has* — committed-and-unreviewed, or uncommitted — and no
single flag covers "the writer ran out mid-fix with nothing committed". That case has no supported
recovery, which is why it was resolved by editing a state file by hand.

**Consequence.** Every hand-edit of a run record is a silent fork of the state machine: the record
now holds a combination the dispatcher never wrote and the tests never cover. The second halt also
showed the first extension was sized by guess, not by the remaining work.

**Takeaway.**
- `launch_writer` needs a minimum-budget floor: refuse to start a writer with less headroom than a
  fix round costs, and halt with a reason that names the shortfall, instead of starting one that
  cannot finish.
- `--extend-budget` on a halt with no `READY-FOR-REVIEW` should relaunch the writer rather than
  refuse — the owner's intent ("give it more money and carry on") is the same in both cases; only
  the phase differs. That, not a hand-edited record, is the supported path.
- `--extend-budget <USD>` *adds* to the existing ceiling ($15 + $22 = $37); it does not set it. The
  resulting record can therefore exceed the class's own `budget_usd_max`, which is only enforced at
  task-lint time. Worth deciding deliberately whether an owner extension is allowed above the class
  cap, and recording the decision — silence here reads as a bug either way.

## L4 — An environment variable outranked the in-session setting (`CLAUDE_CODE_EFFORT_LEVEL`)

**Symptom.** A session failed repeatedly with a 32000-output-token error. The owner set `/effort` to
`xhigh`; the terminal kept reporting `max` and the failures continued.

**Root cause.** `~/.zshrc:101` exported `CLAUDE_CODE_EFFORT_LEVEL=max`. The environment variable
takes precedence over the in-session command, so `/effort` appeared to be accepted while changing
nothing. Every new shell re-applied it.

**Consequence.** Time lost chasing a model or prompt problem that was a shell-profile problem, and a
misleading signal: the tool reported the setting the owner asked for in one place and the overriding
one in another.

**Takeaway.**
- When a setting "does not take" despite being accepted, check for an environment override before
  investigating the tool: `grep -n CLAUDE_CODE ~/.zshrc ~/.zprofile ~/.zshenv`.
- Unsetting it in the current shell is not enough — the profile line has to be commented out, or the
  next shell silently restores it.
- The same shape applies to `CLAUDE_CODE_MAX_OUTPUT_TOKENS`, which is what actually needed raising
  once the effort override was removed.

## L5 — A review loop that finds a new instance of one defect class every round (`v5-admin-k-admission`)

**Symptom.** Five review rounds, each closing real findings, each followed by a round that found
another one: `supersededBy()` trusting an unsettled writer, then a default-vs-scoped `scopeOverlap()`
gap, then `phaseReader()` leaking non-admitted state, then `registryRevision` derived from a raw
unfiltered `MAX(seq)`, then `supersededBy()` again — this time reading only the oldest audit marker,
so a refused-then-admitted emergency left a schedule permanently un-superseded.

**Root cause.** Every one of those was the *same* rule stated in a different place: a pending or
refused publication must not exist for scheduling purposes. The slice was being fixed
instance-by-instance, so each round could only find the next instance, never the class. Round 6 of an
earlier attempt made things net worse, which is the signal that the loop was converging on nothing.

**Consequence.** A review budget spent proportional to the number of call sites rather than to the
number of ideas, and a cap (`max_review_rounds`) that reads as a schedule risk when it is really a
design smell detector.

**Takeaway.**
- When two consecutive rounds find the same *kind* of defect in different functions, stop fixing and
  write the rule down first. This slice converged only after the invariant was stated once and every
  call site was enumerated against it — the 23-row table in
  `docs/prompts/k-admission-handoff.md`.
- Before declaring a round closed, grep the whole file for siblings of the defect just fixed and
  close them in the same commit. A round that closes one instance of a class has not closed the
  round.
- Hitting `max_review_rounds` is worth one more authorized round, not a merge of unreviewed work —
  but only once, and only after the unifying rule exists. Round 5 here was that round, and it
  returned 0 MAJOR.

