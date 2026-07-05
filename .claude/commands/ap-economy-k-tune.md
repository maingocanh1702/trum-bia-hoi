---
description: Run autopilot for slice economy-k-tune — gate → worktree → build+sim(k) → codex 2x_clean → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **economy-k-tune** following `docs/autopilot-prompt-GENERIC.md` end to
end. Manifest `docs/autopilot-manifests/economy-k-tune.json` is the single source of truth. Goal: tune
the 🟡 demand-mix/tip constants so measured `k` moves from ~1.63 into **2.0–3.0**. Do NOT change the
k-method in `metrics.ts` (`k = mean(payment+tip)/82.5` is invariant) — only the tunable numbers.

HALT on the first breaker (§D) and report it.

1. **Pre-flight (§A).** Read the manifest + its backlog row + `04-SPEC-prototype-phase0.md` §4–§5,
   `economy-spec-from-bundle.md`, and `prototype/src/engine/constants.ts` / `metrics.ts` / `sim/headless.ts`.
   `git fetch`; confirm `base_ref master` exists. Confirm working set mirrors `scope`.
2. **Gate (§A.3.1) before any mutation:**
   `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/economy-k-tune.json`
   On HALT (SCOPE_COLLISION / DEP_MISSING / INVARIANT_UNKNOWN) stop and report.
   (Shares `economy-balance` with the other economy slices — run one economy slice at a time.)
3. **Worktree (§A.4)** after PASS:
   `git worktree add .autopilot/worktrees/economy-k-tune -b feat/economy-k-tune master` ; `export DB_PATH=/tmp/ap-economy-k-tune.db`
4. **Build loop (§B).** `gitnexus_impact` before editing constants; edit ONLY files in `scope`. Verify
   fail-closed: `cd prototype && npm run build` then `npm run sim` (and `python3 scripts/measure_k.py`) —
   **k must land inside 2.0–3.0** (METRIC_DRIFT otherwise → HALT).
5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; run codex **2x_clean** (stagger passes).
6. **STOP_AT_READY (§B.5).**
   `scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/economy-k-tune.json`
   Then STOP. Report branch, files, k value, build+sim, codex verdict. **Do NOT merge** — manual_only;
   human merges, then `/ap-cleanup economy-k-tune`.
