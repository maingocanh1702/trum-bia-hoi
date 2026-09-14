---
slug: agent-verification-m02-port-wire
class: agent-tooling
risk: P2
scope:
  - playwright.config.ts
  - playwright.dev-identity.config.ts
  - playwright.admin.config.ts
  - playwright.playable.config.ts
  - playwright.remote.config.ts
  - scripts/verify/port-wire.test.ts
verify: npx tsx --test scripts/verify/port-wire.test.ts
budget_usd: 8
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m02-port-resolver
---
## Problem
The 5 Playwright config files in this slice's scope still hardcode the literal ports listed in the prerequisite slice's Problem section instead of importing scripts/verify/port.ts's resolver -- two worktrees running any of these suites at once still collide.

Correction versus a naive file list: `playwright.accessibility.config.ts` is deliberately NOT in this slice's scope and needs NO edit -- it has no literal ports of its own; it does `import identity from './playwright.dev-identity.config'` and spreads `...identity`, deriving its entire `webServer` array from `identity.webServer` at import time. Once `playwright.dev-identity.config.ts` is wired to the resolver, `playwright.accessibility.config.ts` inherits the derived ports automatically, with zero changes to its own source.
## Acceptance
scripts/verify/port-wire.test.ts (new) fails today (the 5 configs still hardcode ports) and then proves:
- each of the 5 scoped configs imports and calls the resolver from scripts/verify/port.ts (built by the prerequisite slice) for every `baseURL`/`webServer[].url`/`webServer.command` port it currently hardcodes, replacing the literal numbers identified in that slice's Problem section.
- with `TBH_PORT_BASE=5300` set, every baseURL/webServer url/port in all 5 scoped configs reflects the resolver's derived ports for that base -- AND `playwright.accessibility.config.ts`'s own default export (read directly, not edited) shows the SAME derived values via its inheritance from `playwright.dev-identity.config.ts`, proving the inheritance chain carries the parameterisation through without touching that file.
- with `TBH_PORT_BASE` unset, every one of those same values equals today's literals byte-for-byte -- snapshot the current literal values in this test FIRST, before editing any config, so the RED run captures the true "before" state; GREEN then proves nothing regressed for the main workspace.
- playwright.playable.config.ts's per-viewport arithmetic (the `base+i*2` shape) still produces 3 distinct, non-overlapping web/api port pairs after wiring, in both the default and the `TBH_PORT_BASE=5300` case.
## Context
The resolver is built by the prerequisite slice agent-verification-m02-port-resolver (this slice's `after:` chain runs behind it) -- read its exports from scripts/verify/ once that slice has landed. playwright.config.ts, playwright.dev-identity.config.ts, playwright.admin.config.ts, playwright.playable.config.ts and playwright.remote.config.ts are the 5 files to edit; all already exist. playwright.accessibility.config.ts (also already exists, read-only reference here) imports `identity` from playwright.dev-identity.config.ts (a relative import that omits the .ts suffix, as normal for TypeScript) and spreads it -- read both files together to see exactly how the inheritance works before wiring dev-identity.config.ts.
