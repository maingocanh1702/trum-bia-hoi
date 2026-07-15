# Autopilot slice — engine-group-spawn-cadence

> Authored against canonical `autopilot-prompt-GENERIC.md` v0.6.0. This repository is intentionally local-only: use `scripts/commit-local.sh` and never invent an `origin` remote.

```text
Task: Preserve the specified per-customer arrival cadence when customers spawn as groups, and make Phase 0 loss aggregates fail closed — bugfix

You are working in /Users/maingocanh/Projects/Trum Bia Hoi on the client-only Phase 0 prototype.
NO prior conversation context. This prompt is self-contained.

Mode: AUTOPILOT — one worktree and branch `feat/engine-group-spawn-cadence`, then STOP_AT_READY. Never auto-merge.

Risk header
  Risk tier: P1
  Change class: engine-core-balance
  Merge policy: manual_only
  Auto-merge requested: no
  Autopilot maturity: pilot
  Codex review: 2x_consecutive_clean, both FULL-base on current HEAD

Context
  Origin: Phase 0 exit-gate audit found normal customer loss at 15.2–26.7% and peak loss at 57.6–64.0% across five deterministic seeds.
  Root cause: `SPAWN_BASE_MS=10.5s` is specified per customer, but `Engine.tick` applies it per randomly sized 1–2 customer group, inflating effective arrivals by about 1.5x. Runtime probes show almost all loss is seated-order expiry, not queue overflow.
  Secondary bug: `headless.ts` prints per-shift loss but calls aggregate stats with hard-coded zero loss/rejection, masking the failed gate.

Scope discipline
  Positive scope: ONLY `Engine.tick`/`Engine.spawnGroup` cadence semantics in `prototype/src/engine/engine.ts`, plus deterministic aggregate and per-mode verification in `prototype/src/sim/headless.ts`.
  Negative scope: Do NOT change `K_ANCHOR`, prices/costs, demand mix, tip formula, patience values, pour/wash/freshness timings, group-size range, queue capacity, UI, account/save, art, or any Phase 1 feature.
  Documented-out: manual feel validation remains the Alpha playtest gate in `06-ROADMAP-trum-bia-hoi.md`; this slice must not claim to automate it.
  Scope sizing: 2 files, <=300 LOC; no new subsystem.

Design contract
  Source-of-truth pin: `SPAWN_BASE_MS` remains the per-customer cadence; grouped spawning adapts to it without changing the constant.
  Decision table:
    spawned group size 1 + normal -> next arrival after `SPAWN_BASE_MS * 1`
    spawned group size 2 + normal -> next arrival after `SPAWN_BASE_MS * 2`
    spawned group size N + peak   -> next arrival after `SPAWN_BASE_MS * N * PEAK_SPAWN_MULT`
    shift stopped                -> no new group; existing closing behavior unchanged
  Aggregate table:
    completed shift -> add served/lost/rejected exactly once to its normal|peak bucket
    all shifts       -> aggregate from those canonical bucket totals, never literals
    explicit SIM_SEED -> run only that seed for forensic reproduction
    no SIM_SEED       -> run the fixed seed set 20260611,1,2,3,42 and fail closed if any automated gate fails
  Invariants:
    - `k = mean(payment+tip)/82.5` remains untouched and must stay 2.0–3.0 per seed;
    - normal loss rate must be <10% per seed;
    - peak loss must be printed separately and materially lower than the pre-fix 57.6–64.0% baseline; do not invent a final feel threshold before playtest;
    - aggregate lost/rejected values must equal the sums of printed shift buckets;
    - RNG remains deterministic for a given seed.

Required reading
  1. `04-SPEC-prototype-phase0.md` §4–§6 — per-customer spawn cadence and exit gate.
  2. `03-SPEC-he-ban.md` §1/§7 — group spawning and queue formula.
  3. `prototype/src/engine/engine.ts` — `tick`, `spawnGroup`, `tickOrders`.
  4. `prototype/src/sim/headless.ts` — target serves, seed handling, aggregate output.

Pre-flight and gate
  - Confirm branch `master`; repo is local-only, so skip remote fetch/push and use current local `master` as authority.
  - Run `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/engine-group-spawn-cadence.json` BEFORE worktree creation.
  - Create `.autopilot/worktrees/engine-group-spawn-cadence` from explicit base `master`; verify both SHAs match.
  - Inside the worktree create `.autopilot/state/engine-group-spawn-cadence/regions.log`, `fix-round-count.txt=0`, and `codex/` before editing.
  - Resolve CODEX only through `${AUTOPILOT_CODEX_BIN:?...}` using an existing repo-agnostic pin. Never fall back to PATH Codex or a sub-agent.

Implementation and verify
  - Make the minimum scoped change and commit per-file; never `git add -A`.
  - Run `cd prototype && npm run build`.
  - Run `cd prototype && npm run sim`; default mode must execute all five fixed seeds and exit non-zero on k/normal-loss regression.
  - Run `SIM_SEED=20260611 npm run sim` to preserve one-seed forensic output.
  - Before each Codex round verify `git diff --stat master...HEAD` is non-empty and scope-only.
  - P1 requires 2 consecutive FULL-base clean Codex rounds on current HEAD, persisted under `.autopilot/state/engine-group-spawn-cadence/codex/round-NN.txt`.
  - Any finding increments the file counter and appends `file:function` to `regions.log`; >5 rounds or the same file in 3 consecutive rounds -> HALT with a sentinel file.

STOP_AT_READY
  - Re-run build + both sim modes on current HEAD.
  - Run `gitnexus_detect_changes` and confirm only the intended engine/sim flow is affected.
  - Run `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/engine-group-spawn-cadence.json`.
  - STOP and report branch, files, five-seed k/loss table, forensic seed result, and both Codex verdicts. Do NOT merge.
```
