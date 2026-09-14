---
slug: agent-verification-m02-map-coverage
class: agent-tooling
risk: P2
scope:
  - scripts/verify/map-coverage.ts
  - scripts/verify/map-coverage.test.ts
  - package.json
verify: node --import tsx --test scripts/verify/map-coverage.test.ts
budget_usd: 10
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m02-port-wire
---
## Problem
No script checks that every engine command/event and every existing test/spec file is cited by the (separately authored, Wave V1) feature map under .claude/skills/verify-trum-bia-hoi/references/features/ -- coverage could silently rot. That directory does not exist yet on this branch (Wave V1 is a separate, supervised docs track, not part of this slice's dependency chain) -- this script must behave correctly whether or not it exists: an absent directory means zero citations found, i.e. every command/event/test is reported uncited.
## Acceptance
scripts/verify/map-coverage.test.ts (new) fails today (module missing) and then proves a script that:
- lists every `Command` `type` string literal from the `Command` union in packages/engine/src/types.ts, and every `emit('...')` call-site string across packages/engine/src/*.ts.
- lists every test/spec file under the six test dirs: packages/engine/test, apps/server/test, apps/web/test, apps/web/admin-test, apps/web/remote-test, apps/web/playable-test.
- reports, for a given feature-map directory (default `.claude/skills/verify-trum-bia-hoi/references/features/`, overridable via a CLI arg/env so the test can point it elsewhere), which of the above are not mentioned anywhere in that directory's `*.md` files.
- exits 1 when anything is uncited, 0 when everything is cited.
- the test drives this against a temp fixture directory it creates itself (not the real skill directory), containing `.md` files that deliberately omit one command name -- proving both the "gap detected" (RED-shaped) case and the "fully covered" (GREEN-shaped) case once the fixture is completed.
- package.json gains a `"verify:map"` script that runs this script against the real (default) feature-map directory.
## Context
packages/engine/src/types.ts has the `Command` union to enumerate. packages/engine/src/engine.ts has the `emit(type: string, ...)` method whose call-sites (`this.emit('...')`) across packages/engine/src/*.ts are what to grep. Test dirs to enumerate all already exist: packages/engine/test, apps/server/test, apps/web/test, apps/web/admin-test, apps/web/remote-test, apps/web/playable-test. package.json's existing "scripts" block is the style to match for the new entry.
