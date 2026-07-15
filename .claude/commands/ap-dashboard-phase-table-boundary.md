---
description: Fix the dashboard Phase 4 table boundary parser, verify 26 features, then STOP_AT_READY
allowed-tools: Bash, Read, Write, Edit
---

Run `docs/autopilot-dashboard-phase-table-boundary.md` exactly, using
`docs/autopilot-manifests/dashboard-phase-table-boundary.json` as the scope-gate source of truth.

This is a P2 `dashboard-engine` slice: use an isolated worktree, run the focused unittest plus an offline
temporary dashboard build, require one FULL-base Codex clean round on a non-empty diff, mark the gate ready,
and STOP. Never edit generated dashboard outputs by hand.
