---
slug: agent-verification-m02-tbh-fixture
class: agent-tooling
risk: P2
scope:
  - apps/web/test/tbh-fixture.ts
  - apps/web/test/bridge.spec.ts
verify: npx playwright test apps/web/test/bridge.spec.ts --config playwright.config.ts
budget_usd: 12
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m02-doctor
milestone: true
milestone_id: M2
---
## Problem
Every existing Playwright spec re-implements its own console/screenshot/wait-for-state boilerplate; there is no shared fixture wrapping `window.__TBH_VERIFY__` (built by the prerequisite slice agent-verification-m01-web-bridge). apps/web/test/tbh-fixture.ts does not exist.
## Acceptance
apps/web/test/bridge.spec.ts (new) fails today (fixture/module missing) and then proves:
- apps/web/test/tbh-fixture.ts exports a Playwright fixture extending @playwright/test's `test` with a `tbh` object exposing: `snapshot()` (reads `__TBH_VERIFY__.snapshot()` via `page.evaluate`), `waitForEvent(type, {since})`, `shot(name)` (screenshot to `artifacts/verification/<branch>/`), `consoleErrors()` (collected via the page's console listener), `evidence(dir)`.
- playwright.config.ts needs NO edit for this and is NOT in this slice's scope: its webServer already runs `npm run dev` (Vite's dev server), so `import.meta.env.DEV` is already true and the bridge installs with no `VITE_TBH_VERIFY` flag needed -- the spec simply loads under the existing config and the bridge must already be present; assert this rather than adding an env var nothing requires.
- the new spec boots the existing local suite, performs "Phuc vu ca mam" (serve-whole-table) once via the UI, and asserts via `tbh.snapshot()` that `economy.coins` increased by exactly one serve's worth -- a before/after snapshot diff, not a DOM read.
- a screenshot lands under artifacts/verification/ via `tbh.shot()`.
- no existing file under apps/web/test/*.spec.ts is modified -- only the new fixture and spec are added.
- IF Chromium cannot launch inside this sandbox: HALT `VERIFY_FAIL` per ap3-slice/SKILL.md step 2 rather than faking a pass. This is an accepted, expected possible outcome for this specific slice, not a slice-design defect -- see PLAN.md.
## Context
apps/web/test/game.spec.ts is the closest existing example of the guest-serve golden path (aria-name button clicks, page.clock) to follow for the new spec's serve interaction. apps/web/test/fixtures/service-states.ts shows the project's existing fixture-module style. playwright.config.ts's webServer already runs `npm run dev` (`import.meta.env.DEV` true), confirmed to need no edit.
