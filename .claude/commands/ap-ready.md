---
description: Flip an autopilot slice's reservation to ready (keeps the scope reservation; does not merge)
argument-hint: <slug>
allowed-tools: Bash, Read
---

Mark slice `$ARGUMENTS` as **ready** in the shared registry — used when a build+review finished
outside a full `/ap-<slug>` run. This keeps the scope reservation (so no other session grabs the same
files) and does NOT merge. Per `docs/autopilot-prompt-GENERIC.md` §B.5.

1. Confirm `docs/autopilot-manifests/$ARGUMENTS.json` exists and that `prototype` build is green for
   this branch. If the build is red, refuse — a red slice is not `ready`.
2. ```bash
   scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/$ARGUMENTS.json
   ```
3. Report: the slice is `ready`, reservation held, awaiting human merge (§C). Do not merge.
