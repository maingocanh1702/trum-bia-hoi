---
description: Release an autopilot slice after merge — clear the registry reservation + remove the worktree
argument-hint: <slug>
allowed-tools: Bash, Read
---

Release slice `$ARGUMENTS` after it has been merged into `base_ref` (or abandoned). Per
`docs/autopilot-prompt-GENERIC.md` §C2. Run only when the branch is merged or you intend to drop it —
this frees the scope/invariant tokens for the next gate.

1. Clear the reservation. Use `--manifest` if it still exists, else `--feature`:
   ```bash
   scripts/autopilot-scope-gate cleanup --manifest docs/autopilot-manifests/$ARGUMENTS.json 2>/dev/null \
     || scripts/autopilot-scope-gate cleanup --feature $ARGUMENTS
   ```
2. Remove the worktree if present:
   ```bash
   git worktree remove .autopilot/worktrees/$ARGUMENTS 2>/dev/null || true
   git worktree prune
   ```
3. Report what was released and confirm the slice no longer appears in `.autopilot/INFLIGHT.md`.
   (Leave the launcher `.claude/commands/ap-$ARGUMENTS.md` and the manifest in git history — the user
   decides whether to delete them.)
