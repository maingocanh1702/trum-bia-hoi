---
description: Run autopilot for engine group spawn cadence + fail-closed Phase 0 loss aggregation, then STOP_AT_READY
allowed-tools: Bash, Read, Write, Edit
---

Run `docs/autopilot-engine-group-spawn-cadence.md` exactly, using
`docs/autopilot-manifests/engine-group-spawn-cadence.json` as the scope-gate source of truth.

This is a P1 `engine-core`/`economy-balance` slice: create the required worktree and file-backed counters,
verify build plus five deterministic sim seeds, require two consecutive FULL-base Codex clean rounds on
current HEAD, mark scope-gate `ready`, and STOP. Never merge or push automatically.
