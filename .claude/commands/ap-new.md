---
description: Scaffold a new autopilot slice — manifest + per-slice launcher command (gate runs at launch, not here)
argument-hint: <slug> [risk P1|P2] [invariants comma,sep]
allowed-tools: Bash, Read, Write, Edit
---

You are scaffolding a new parallel-autopilot slice for **Trum Bia Hoi**. Do NOT register the gate, do
NOT create a worktree, and do NOT write feature code here — that all happens at launch in
`/ap-<slug>` per `docs/autopilot-prompt-GENERIC.md` §A.3.1 (gate must run BEFORE any branch/worktree
mutation). This command only produces the manifest and the launcher.

Slug + options from: `$ARGUMENTS` (first token = slug; optional `risk`, `invariants`).

## Steps

1. **Validate the slug.** Must match `^[a-z][a-z0-9-]*$`. If a row for it exists in
   `docs/autopilot-backlog.md`, pull its `risk`, `scope`, `invariants`, `depends_on` as defaults.
   Reject if `docs/autopilot-manifests/<slug>.json` already exists (don't clobber).

2. **Validate invariants against the catalog.** Every token must already appear between the
   `<!-- catalog:start -->` / `<!-- catalog:end -->` markers in
   `docs/autopilot-invariant-catalog.md`. If a needed domain token is missing, STOP and tell the user
   to add the canonical token to the catalog first (never invent a synonym — that triggers
   INVARIANT_UNKNOWN at the gate).

3. **Write the manifest** `docs/autopilot-manifests/<slug>.json` by copying
   `docs/autopilot-manifests/_TEMPLATE.json` and filling:
   - `feature`: `<slug>` · `branch`: `feat/<slug>` · `base_ref`: current default branch (`git symbolic-ref --short HEAD` of main, usually `master` here)
   - `risk`: P1 for `engine-core`/`economy-balance` slices, else P2 (P0 = do NOT scaffold; tell the user it's human-only)
   - `merge_policy`: `manual_only` · `auto_merge`: `false` (always)
   - `codex_review`: `2x_clean` if P1, else `1x_clean`
   - `depends_on`: from backlog `depends_on` (slugs) · `invariants`: catalog tokens · `scope`: the exact files this slice may edit
   - Leave `dep_checks` off unless the slice depends on a specific upstream symbol; if so add `[{ "file": "...", "symbol": "..." }]`.

4. **Stamp the launcher.** Copy `.claude/commands/_ap-launcher-TEMPLATE.md` to
   `.claude/commands/ap-<slug>.md`, replacing every `{{SLUG}}` with the slug. This creates the
   `/ap-<slug>` command the user runs next.

5. **Report**: print the manifest path + contents, the launcher path, and the next step:
   > Review/adjust the manifest, then run `/ap-<slug>` to start the autopilot (it will gate → worktree → build → STOP_AT_READY).

Do not commit — leave the new files staged-or-untracked for the user to review.
