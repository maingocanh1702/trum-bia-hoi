---
description: Run autopilot for slice engine-table-order — gate → worktree → build → codex 2x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **engine-table-order** (F03 — bàn/nhóm/serve theo Order, 4 cấp bàn)
following `docs/autopilot-prompt-GENERIC.md` end to end. Manifest
`docs/autopilot-manifests/engine-table-order.json` is the single source of truth. HALT on the first breaker (§D).

1. **Pre-flight (§A).** Read the manifest + backlog row + `03-SPEC-he-ban.md` + `docs/item-list-upgrade-levels.md`
   (bàn 4 cấp) + `prototype/src/engine/engine.ts` / `types.ts`. `git fetch`; confirm `base_ref master`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/engine-table-order.json`
   On HALT stop and report. (Shares `engine-core` — serialize with other engine slices.)
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/engine-table-order -b feat/engine-table-order master` ; `export DB_PATH=/tmp/ap-engine-table-order.db`
4. **Build loop (§B).** `gitnexus_impact` before editing (HALT on HIGH/CRITICAL); edit ONLY files in
   `scope`. Verify fail-closed: `cd prototype && npm run build`.
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; codex **2x_clean** (stagger).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/engine-table-order.json`
   Then STOP. Report branch, files, build, codex verdict. **Do NOT merge** — manual_only; then `/ap-cleanup engine-table-order`.
