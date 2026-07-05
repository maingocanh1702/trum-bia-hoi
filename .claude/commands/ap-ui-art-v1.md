---
description: Run autopilot for slice ui-art-v1 — gate → worktree → build → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **ui-art-v1** following `docs/autopilot-prompt-GENERIC.md` end to end.
The manifest at `docs/autopilot-manifests/ui-art-v1.json` is the single source of truth. This slice is
the PNG pixel-art asset production (F24); see Prompt A in
`docs/autopilot-RUN-PROMPT-fable5-2026-07-05.md` for the full generation-package + image-gen procedure.

Execute in order and HALT on the first breaker (§D), reporting it instead of pushing through:

1. **Pre-flight (§A).** Read the manifest + `docs/asset-list-designer.md` (asset bible: §0.1 generation
   contract, §0.2 modifiers, §0.3.D era modifier, §10 totals, §11 naming), `docs/item-list-upgrade-levels.md`,
   `docs/design-tokens.md` (palette), and `prototype/src/ui/pixiAssets.ts`/`icons.tsx`/`tokens.ts`.
   `git fetch`; confirm `base_ref` exists. Confirm the working set mirrors `scope`.

2. **Gate (§A.3.1) — before any branch/worktree mutation:**
   ```bash
   scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/ui-art-v1.json
   ```
   On HALT (SCOPE_COLLISION / DEP_MISSING / INVARIANT_UNKNOWN) stop and report — do not work around it.
   (Note: shares `game-ui` + `tokens.ts` with `account-locale-login` — do not run those two concurrently.)

3. **Worktree (§A.4)** — only after PASS:
   ```bash
   git worktree add .autopilot/worktrees/ui-art-v1 feat/ui-art-v1 2>/dev/null \
     || git worktree add .autopilot/worktrees/ui-art-v1 -b feat/ui-art-v1 master
   export DB_PATH=/tmp/ap-ui-art-v1.db
   ```

4. **Build loop (§B).** ALWAYS produce `assets/generation-plan.md` + `assets/asset-index.json` (every
   asset → filename per §11, target path, full text-to-image prompt = global prefix + per-asset template +
   group modifier + era modifier, variant/state, QA). IF an image-gen tool exists in this session:
   generate → crop to alpha → resize nearest-neighbor 128×128 → export to `prototype/public/assets/...`,
   batch 6–10 with a style winner per §0.1, run the §0.1 QA checklist. IF NO image tool: stop after the
   plan and report the missing capability — do NOT fabricate PNGs. Wire a PNG loader into pixiAssets.ts
   with fallback to the existing code-drawn placeholders (never crash on a missing PNG). Edit ONLY files
   in `scope`. Verify fail-closed: `cd prototype && npm run build`.

5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; run codex `1x_clean`.

6. **STOP_AT_READY (§B.5).**
   ```bash
   scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/ui-art-v1.json
   ```
   Then STOP. Report branch, #assets planned vs #PNGs produced (by group), build + codex verdict, and —
   if an image tool was missing — say so plainly. **Do NOT merge** — manual_only; run `/ap-cleanup ui-art-v1` after merge.
