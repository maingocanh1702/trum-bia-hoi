---
slug: agent-verification-m02-port-resolver
class: agent-tooling
risk: P2
scope:
  - scripts/verify/port.ts
  - scripts/verify/port.test.ts
  - package.json
verify: npm run test:one -- scripts/verify/port.test.ts
budget_usd: 10
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m01-web-bridge
---
## Problem
No shared port resolver exists -- scripts/verify/ does not exist yet (scripts/ itself already exists at repo root, with unrelated Python/shell tooling). Every Playwright config and the plain `dev` script hardcodes literal ports, so two worktrees running `test:e2e`/`dev` at once collide.

Today's real literal ports, verified 2026-09-14 by reading every playwright*.config.ts and apps/web/vite.config.ts directly -- these differ from trum-bia-hoi-agent-understanding-verification-implementation-plan.md Sec 0/Sec 7's own example numbers (that doc's port inventory is stale/incorrect; trust this task's figures, not that doc's, for the exact values):
- playwright.config.ts (main e2e/UI suite): 4178.
- playwright.admin.config.ts: web 4181, api 4182.
- playwright.dev-identity.config.ts and playwright.remote.config.ts (mutually-exclusive test files in the same testDir): web 4179, api 4180 -- both configs use the SAME numbers today, by design, since they never run at once.
- playwright.playable.config.ts: 3 viewports, web `4209+i*2`, api `4210+i*2` for viewport index i (0,1,2) -- i.e. web 4209/4211/4213, api 4210/4212/4214.
- playwright.accessibility.config.ts: holds no literal ports of its own at all -- it does `import identity from './playwright.dev-identity.config'` and spreads it, so it inherits whatever playwright.dev-identity.config.ts resolves to. Out of scope for this slice either way (it has nothing to wire).
- apps/web/vite.config.ts: dev-server default 5173, preview default 4173 -- unwired to any Playwright config; out of scope for this slice and this wave.
## Acceptance
scripts/verify/port.test.ts (new; node:test) fails today (module missing) and then proves a resolver (exact function/type names are this slice's own choice) that:
- returns exactly today's literal ports listed in Problem, for every named role (e2e; admin-web/admin-api; dev-identity-or-remote-web/api; playable-web[0..2]/playable-api[0..2]), when run from the main workspace (cwd's `.git` is a directory, i.e. not a worktree) and `TBH_PORT_BASE` is unset.
- returns `base = 5200 + hash(worktree) % 300` plus a small fixed, collision-free offset per named role when `.git` is a file (a worktree) -- simulate this in the test with a fake worktree path/fake `.git` file content rather than requiring a real second worktree.
- honours an explicit `TBH_PORT_BASE` env override in both the main-workspace and worktree cases (same per-role offsets, different base).
- is deterministic: the same worktree identifier resolves to the same base and the same per-role ports across repeated calls in the same and different process runs.
- package.json gains a `"verify:port"` script (one more line in the existing `"scripts"` block, matching the style of the neighbouring `"check:*"` entries) that runs the resolver directly and prints the resolved ports.
## Context
scripts/ already exists at repo root; scripts/verify/ is a new subdirectory under it (allowed by ap3/routines.json's agent-tooling class scope). playwright.config.ts, playwright.admin.config.ts, playwright.dev-identity.config.ts, playwright.remote.config.ts, playwright.playable.config.ts and playwright.accessibility.config.ts hold today's literal ports/inheritance to preserve exactly -- read-only in this slice (the next slice, agent-verification-m02-port-wire, is the one that imports and wires this resolver into them). apps/web/vite.config.ts has the unrelated 5173/4173 defaults, out of scope here. package.json's existing "scripts" block is the style to match for the new entry.
