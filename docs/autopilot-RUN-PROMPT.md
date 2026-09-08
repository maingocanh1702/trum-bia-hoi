# Legacy ready-to-paste prompts — retired

The pre-v11 scaffold/run/raw-cleanup blocks were removed to prevent future bypass of the Level 3
task contract, explicit-origin worktree and verified cleanup rules.

Start a new future task with:

```text
/ap-new <slug> <outcome>
```

The command must load
`$HOME/Projects/Claude template/autopilot/level3-workflow.md` and must not launch a P1/P2 writer
until `/ap-init` proves the complete v11 pack exists on the fetched pinned `origin/master`.

Old READY/AWAIT/HALT lifecycles remain forward-only history. Never reopen them through a pasted
legacy prompt.
