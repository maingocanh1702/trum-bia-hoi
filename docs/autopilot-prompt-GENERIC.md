# Legacy autopilot flow — retired

This KIT_VERSION 2 prompt is retired and intentionally contains no executable runbook.

For every task/session/feature opened after the Level 3 v11 upgrade, use:

- `$HOME/Projects/Claude template/autopilot/level3-workflow.md`;
- the global `/ap-new <slug> <outcome>` command;
- the complete repository v11 pack on the pinned `origin/master`.

Any old per-feature launcher that points here must stop as:

```text
HALT LEGACY_LAUNCHER
```

Do not use this file to start, resume, promote or reclassify an older READY/AWAIT/HALT lifecycle.
Git history retains the pre-v11 flow for forensic reference.
