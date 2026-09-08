---
description: "Run the v11 fail-closed readiness gate for an admitted Level 3 slice."
argument-hint: <feature-id>
allowed-tools: Bash, Read
---

For `$ARGUMENTS`, operate only inside its writing worktree.

1. Read the canonical Level 3 workflow and the worktree's task contract/runtime manifest.
2. Require the minimal `readiness.json` from
   `docs/autopilot-manifests/_READINESS_EVIDENCE_TEMPLATE.json`.
3. Call `scripts/autopilot-scope-gate ready --manifest <runtime-manifest>`.
4. Trust READY only if the v11 gate itself reruns the declared verification and pinned Codex
   review, binds base/HEAD/diff/scope, writes `gate-result.json`, and creates `READY.txt`.
5. Stop at READY. Do not merge, deploy, reopen a writer, hand-edit the registry, or accept an
   empty-diff review.

If the slice was never admitted through the Level 3 task contract and v11 gate, do not use this
command to promote it retroactively.
