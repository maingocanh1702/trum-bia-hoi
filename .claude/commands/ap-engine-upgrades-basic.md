---
description: Run autopilot for slice engine-upgrades-basic — gate → worktree → build+sim(k) → codex 2x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **engine-upgrades-basic** (F10 — nâng cấp cơ bản: bom/rửa/hầm/bàn ×k)
following `docs/autopilot-prompt-GENERIC.md` end to end. Manifest
`docs/autopilot-manifests/engine-upgrades-basic.json` is the single source of truth. HALT on the first breaker (§D).

1. **Pre-flight (§A).** Read the manifest + backlog row + `docs/features/F10-upgrades.md` +
   `docs/item-list-upgrade-levels.md` (giá ×k, stats từng cấp) + `prototype/src/engine/engine.ts` /
   `constants.ts` / `types.ts`. `git fetch`; confirm `base_ref master`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/engine-upgrades-basic.json`
   On HALT stop and report. (Shares `engine-core` + `economy-balance` — serialize with other engine/economy slices.)
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/engine-upgrades-basic -b feat/engine-upgrades-basic master` ; `export DB_PATH=/tmp/ap-engine-upgrades-basic.db`
4. **Build loop (§B).** `gitnexus_impact` before editing (HALT on HIGH/CRITICAL); edit ONLY files in
   `scope`. Verify fail-closed: `cd prototype && npm run build` then `npm run sim` — k must stay inside 2.0–3.0.
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; codex **2x_clean** (stagger).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/engine-upgrades-basic.json`
   Then STOP. Report branch, files, build+sim+k, codex verdict. **Do NOT merge** — manual_only; then `/ap-cleanup engine-upgrades-basic`.
