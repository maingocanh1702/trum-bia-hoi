---
description: Run autopilot for slice engine-core-loop — gate → worktree → build+sim(k) → codex 2x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **engine-core-loop** (F01 — ca 12', thể lực, trần ngày 500k) following
`docs/autopilot-prompt-GENERIC.md` end to end. Manifest
`docs/autopilot-manifests/engine-core-loop.json` is the single source of truth. HALT on the first breaker (§D).

1. **Pre-flight (§A).** Read the manifest + backlog row + `docs/features/`-relevant spec, GDD (§ ca/thể
   lực/trần ngày), and `prototype/src/engine/engine.ts` / `constants.ts` / `types.ts`. `git fetch`;
   confirm `base_ref master`. Confirm working set mirrors `scope`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/engine-core-loop.json`
   On HALT stop and report. (Shares `engine-core` + `economy-balance` — serialize with other engine/economy slices.)
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/engine-core-loop -b feat/engine-core-loop master` ; `export DB_PATH=/tmp/ap-engine-core-loop.db`
4. **Build loop (§B).** `gitnexus_impact` before editing engine symbols (HALT on HIGH/CRITICAL); edit ONLY
   files in `scope`. Verify fail-closed: `cd prototype && npm run build` then `npm run sim` — k must stay
   inside 2.0–3.0.
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; codex **2x_clean** (stagger).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/engine-core-loop.json`
   Then STOP. Report branch, files, build+sim, codex verdict. **Do NOT merge** — manual_only; then `/ap-cleanup engine-core-loop`.
