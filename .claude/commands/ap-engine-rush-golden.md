---
description: Run autopilot for slice engine-rush-golden — gate → worktree → build → codex 2x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **engine-rush-golden** (F08 — Giờ Vàng P1/P2: lịch + full spawn floor)
following `docs/autopilot-prompt-GENERIC.md` end to end. Manifest
`docs/autopilot-manifests/engine-rush-golden.json` is the single source of truth. HALT on the first breaker (§D).

1. **Pre-flight (§A).** Read the manifest + backlog row + `docs/features/F08-rush-system.md` + GDD §
   Giờ Vàng + `prototype/src/engine/engine.ts` / `constants.ts`. `git fetch`; confirm `base_ref master`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/engine-rush-golden.json`
   On HALT stop and report. (Shares `engine-core` — serialize with other engine slices.)
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/engine-rush-golden -b feat/engine-rush-golden master` ; `export DB_PATH=/tmp/ap-engine-rush-golden.db`
4. **Build loop (§B).** `gitnexus_impact` before editing (HALT on HIGH/CRITICAL); edit ONLY files in
   `scope`. Verify fail-closed: `cd prototype && npm run build`.
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; codex **2x_clean** (stagger).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/engine-rush-golden.json`
   Then STOP. Report branch, files, build, codex verdict. **Do NOT merge** — manual_only; then `/ap-cleanup engine-rush-golden`.
