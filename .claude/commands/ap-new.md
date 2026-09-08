---
description: "Start a new Trum Bia Hoi task with the canonical Level 3 workflow."
---

This project command is a thin adapter. Read and execute the current canonical command at:

`$HOME/Projects/Claude template/autopilot/commands/ap-new.md`

Additional repository constraints:

- the actual default branch is `master`;
- do not start a P1/P2 writer until the complete v11 pack is published on the fetched
  `origin/master` used as the pinned base;
- use `cd prototype && npm run build` as canonical verification, plus `npm run sim` and `k`
  measurement for simulation/economy slices;
- preserve every older READY/AWAIT/HALT lifecycle as forward-only history; never resume or
  reclassify it through this command;
- auto-merge remains off and the human owns landing/deployment.

Do not fall back to `docs/autopilot-prompt-GENERIC.md`; that file describes the pre-v11 legacy
launcher flow and is retained only for older artifacts.
