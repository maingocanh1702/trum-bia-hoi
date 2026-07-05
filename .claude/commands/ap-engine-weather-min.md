---
description: Run autopilot for slice engine-weather-min — gate → worktree → build → codex 1x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **engine-weather-min** (F09 — thời tiết tối giản: hệ số độ hơi/tip/spawn)
following `docs/autopilot-prompt-GENERIC.md` end to end. Manifest
`docs/autopilot-manifests/engine-weather-min.json` is the single source of truth. HALT on the first breaker (§D).

1. **Pre-flight (§A).** Read the manifest + backlog row + `docs/features/F09-weather.md` + GDD §9 +
   `prototype/src/engine/engine.ts` / `constants.ts`. `git fetch`; confirm `base_ref master`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/engine-weather-min.json`
   On HALT stop and report. (Shares `engine-core` — serialize with other engine slices.)
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/engine-weather-min -b feat/engine-weather-min master` ; `export DB_PATH=/tmp/ap-engine-weather-min.db`
4. **Build loop (§B).** `gitnexus_impact` before editing; edit ONLY files in `scope`. Verify fail-closed:
   `cd prototype && npm run build`.
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; codex **1x_clean** (P2).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/engine-weather-min.json`
   Then STOP. Report branch, files, build, codex verdict. **Do NOT merge** — manual_only; then `/ap-cleanup engine-weather-min`.
