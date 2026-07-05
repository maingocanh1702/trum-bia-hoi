---
description: Run autopilot for slice economy-tip-penalty — gate → worktree → build+sim(k) → codex 2x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **economy-tip-penalty** (F06 — tip / uy tín / phạt cụm) following
`docs/autopilot-prompt-GENERIC.md` end to end. Manifest
`docs/autopilot-manifests/economy-tip-penalty.json` is the single source of truth. Do NOT change the
k-method in `metrics.ts` (formula is invariant) — only tip/reputation/penalty numbers + logic.
HALT on the first breaker (§D).

1. **Pre-flight (§A).** Read the manifest + backlog row + GDD §8 (tip/uy tín/phạt) + `economy-spec` +
   `prototype/src/engine/metrics.ts` / `constants.ts`. `git fetch`; confirm `base_ref master`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/economy-tip-penalty.json`
   On HALT stop and report. (Shares `economy-balance` — run one economy slice at a time.)
   If penalty logic needs `engine.ts` (out of scope) → STOP, add `engine-core` token + file to the
   manifest, re-gate (§B.2) — do not silently edit out of scope.
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/economy-tip-penalty -b feat/economy-tip-penalty master` ; `export DB_PATH=/tmp/ap-economy-tip-penalty.db`
4. **Build loop (§B).** `gitnexus_impact` before editing; edit ONLY files in `scope`. Verify fail-closed:
   `cd prototype && npm run build` then `npm run sim` — k must stay inside 2.0–3.0.
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; codex **2x_clean** (stagger).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/economy-tip-penalty.json`
   Then STOP. Report branch, files, build+sim+k, codex verdict. **Do NOT merge** — manual_only; then `/ap-cleanup economy-tip-penalty`.
