---
description: Run autopilot for slice account-locale-login — gate → worktree → build → STOP_AT_READY (never auto-merges)
allowed-tools: Bash, Read, Write, Edit
---

Run the autopilot flow for slice **account-locale-login** (F25 — vi/en locale + guest play + Google
login) following `docs/autopilot-prompt-GENERIC.md` end to end. The manifest at
`docs/autopilot-manifests/account-locale-login.json` is the single source of truth.

> Run this AFTER `ui-art-v1` has merged — it shares the `game-ui` token + `prototype/src/ui/tokens.ts`
> with the art slice, so the two must not be in-flight at the same time (SCOPE_COLLISION otherwise).

Execute in order and HALT on the first breaker (§D), reporting it instead of pushing through:

1. **Pre-flight (§A).** Read the manifest + its backlog row + `docs/features/F25-localization-account.md`
   (and GDD/economy-spec as relevant). `git fetch`; confirm `base_ref` exists. Confirm the working set
   mirrors `scope`.

2. **Gate (§A.3.1) — before any branch/worktree mutation:**
   ```bash
   scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/account-locale-login.json
   ```
   On HALT (SCOPE_COLLISION / DEP_MISSING / INVARIANT_UNKNOWN) stop and report — do not work around it.

3. **Worktree (§A.4)** — only after PASS:
   ```bash
   git worktree add .autopilot/worktrees/account-locale-login feat/account-locale-login 2>/dev/null \
     || git worktree add .autopilot/worktrees/account-locale-login -b feat/account-locale-login master
   export DB_PATH=/tmp/ap-account-locale-login.db
   ```

4. **Build loop (§B).** Plan the smallest change; edit ONLY files in `scope`; if you need a shared-domain
   file outside scope, STOP and widen the manifest + re-gate. Verify fail-closed:
   `cd prototype && npm run build`.

5. **Review (§B.4).** `git diff --name-only master...HEAD` ⊆ scope; run codex `2x_clean` (P1 —
   `build-config`/`game-ui`; stagger the two passes to avoid quota contention).

6. **STOP_AT_READY (§B.5).**
   ```bash
   scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/account-locale-login.json
   ```
   Then STOP. Report branch, files changed, verify + codex verdict, merge policy. **Do NOT merge** — P1 is
   manual_only; the human owns the merge, then runs `/ap-cleanup account-locale-login`.
