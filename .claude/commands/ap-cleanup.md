---
description: "Verified Level 3 cleanup after authorized landing or close."
argument-hint: <feature-id>
allowed-tools: Bash, Read
---

For `$ARGUMENTS`, never clear the registry or raw-remove a worktree.

- Normal landing: first prove the READY-bound change exists on `origin/master`, then run
  `scripts/ap-finish.sh "$ARGUMENTS"`.
- Squash landing: use only the explicit squash-verification mode documented by `ap-finish.sh`.
- Abandonment: require explicit owner authority and a durable reason, then use the helper's
  authorized-close mode.
- If review/writing is live, READY evidence is missing/stale, or origin proof fails, HALT.

`scripts/ap-housekeep.sh` is read-only inventory and cannot perform bulk cleanup.
