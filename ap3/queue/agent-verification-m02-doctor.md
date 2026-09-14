---
slug: agent-verification-m02-doctor
class: agent-tooling
risk: P2
scope:
  - scripts/verify/doctor.ts
  - scripts/verify/doctor.test.ts
  - package.json
  - .gitignore
verify: npx tsx --test scripts/verify/doctor.test.ts
budget_usd: 10
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m02-map-coverage
---
## Problem
No single command tells an agent whether this worktree's build/bindings/bridge is actually correct right now -- a stale bundle, a wrong worktree instance, a red config/i18n check, an engine-purity breach and a feature-map coverage gap are each individually discoverable but nothing composes them into one PASS/FAIL report. artifacts/verification/ (the evidence output directory) is not yet gitignored.

Note: this task's model was downgraded from an originally-requested claude-opus-5 to claude-sonnet-5 to stay within ap3/routines.json's agent-tooling class, which declares no writer_models_allowed override (see PLAN.md).
## Acceptance
scripts/verify/doctor.test.ts (new) fails today (module missing) and then proves a doctor script that:
- composes checks matching the plan's `repo/deps/binding/map/server/bridge/console` groups, with every runner (git, fetch, spawn/exec, filesystem) INJECTED as a parameter, so the unit test can drive each branch without a real network/browser:
  - STALE BUILD: injected bridge `version().commit` != injected HEAD sha -> that line fails.
  - WRONG INSTANCE: injected bridge `version().worktree` != the injected current worktree path -> that line fails.
  - a red `check:config` (injected non-zero exit) -> the binding line fails.
  - an engine-purity breach: a temp fixture file importing `react`/touching `window`/`Date.now`/`Math.random` under a FAKE `packages/engine/src` path (never the real one) -> the binding line fails (an `rng.ts`-named file is exempted, matching the real packages/engine/src/rng.ts's existing exemption).
  - a map-coverage failure (injected non-zero exit from the prerequisite slice's script) -> the map line fails.
- overall exit code is non-zero if ANY line above fails, 0 only if every line passes.
- `--engine-only` skips the server/bridge/console groups entirely -- only repo/deps/binding/map run.
- writes its full text report to `artifacts/verification/<branch>/doctor.txt` (branch name injected/read, never hardcoded).
- .gitignore gains an `artifacts/verification/` entry -- check the existing file first; do not add a duplicate if a broader pattern already covers it.
- package.json gains a `"verify:doctor"` script.
## Context
.gitignore's current content is the list to check against before adding a new line (it already ignores dist/, .qa/ and other generated dirs, but not yet artifacts/). package.json's existing "scripts" block is the style to match. The engine-purity rule -- no `react` import, no DOM globals, no `window`, no `Date.now()`, no `Math.random()` anywhere in packages/engine/src -- already holds for every real file in packages/engine/src/ today; packages/engine/src/rng.ts is the one existing exception the plan names. The test's fixture-breach case must only ever flag its own temp fixture, never the real packages/engine/src.
