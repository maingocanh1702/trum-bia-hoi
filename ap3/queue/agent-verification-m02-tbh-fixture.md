---
slug: agent-verification-m02-tbh-fixture
class: agent-tooling
risk: P2
scope:
  - apps/web/test/tbh-fixture.ts
  - apps/web/test/tbh-fixture.test.ts
  - apps/web/test/bridge.spec.ts
  - .gitignore
verify: npm run test:one -- apps/web/test/tbh-fixture.test.ts
verify_host: npx playwright test apps/web/test/bridge.spec.ts --config playwright.config.ts
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

Chromium cannot launch inside the writer sandbox, so this slice is split across TWO gates and you must respect the split:
- `verify` (sandboxed, yours to iterate on): a plain node unit test over the fixture module's importable, browser-free surface.
- `verify_host` (dispatcher-side, unsandboxed, run ONCE after review is CLEAN and strictly before push): the real Playwright run. You never execute it and must never try to — `npx playwright test` in your sandbox will fail with a browser-launch or socket error, which is expected, not a signal to change the spec.

`verify_host` runs in the reviewed worktree and the dispatcher HALTs `VERIFY_HOST_FAIL` if that worktree is left dirty afterwards (`git status --porcelain -uall` must be empty). The spec writes screenshots under `artifacts/verification/` and Playwright writes `test-results/` + `playwright-report/`; the latter two are already gitignored. Confirm `artifacts/` (or `artifacts/verification/`) is gitignored — the prerequisite doctor slice should already have added it; if `.gitignore` does not cover it on your branch, add exactly that one line and nothing else. Any other file the run leaves behind must also be ignored or not written at all.

## Acceptance
apps/web/test/tbh-fixture.test.ts (new, node `--test`, no browser) fails today (module missing) and then proves, by importing apps/web/test/tbh-fixture.ts directly:
- the module exports a Playwright fixture built with `@playwright/test`'s `test.extend`, exposing a `tbh` object with exactly: `snapshot()`, `waitForEvent(type, {since})`, `shot(name)`, `consoleErrors()`, `evidence(dir)`.
- every browser-free helper the fixture is built from is exported separately and unit-tested against fakes, not mocked-out internals:
  - the evidence-path builder: given a branch name and a shot name it returns a path under `artifacts/verification/<branch>/`, and it sanitises a branch containing `/` (e.g. `ap3/agent-verification-m02-tbh-fixture`) into a single safe path segment.
  - the `waitForEvent` matcher: given an array of bridge events and `(type, {since})` it selects the first event whose `type` matches AND whose sequence/timestamp is strictly greater than `since`, and returns undefined when none matches. Drive `waitForEvent` itself through an INJECTED page-like object (an object exposing `evaluate`) so the polling loop is exercised with no real browser.
  - the console-error collector: given a fake page emitting `console` messages of mixed types, `consoleErrors()` returns only the error-level ones, in order.
- `snapshot()` reads `__TBH_VERIFY__.snapshot()` through the page's `evaluate` — assert this against a fake page that records the evaluated function/argument, not by launching anything.
- `apps/web/test/tbh-fixture.test.ts` imports NOTHING that requires a browser binary and passes under `npm run test:one`.

apps/web/test/bridge.spec.ts (new) is the real-browser proof, validated by `verify_host`:
- playwright.config.ts needs NO edit for this and is NOT in this slice's scope: its webServer already runs `npm run dev` (Vite's dev server), so `import.meta.env.DEV` is already true and the bridge installs with no `VITE_TBH_VERIFY` flag needed — the spec simply loads under the existing config and the bridge must already be present; assert this rather than adding an env var nothing requires. Port selection is already handled by the merged worktree-safe port resolver wired into playwright.config.ts — do not touch it.
- the spec boots the existing local suite, performs "Phục vụ cả mâm" (serve-whole-table) once via the UI, and asserts via `tbh.snapshot()` that `economy.coins` increased by exactly one serve's worth — a before/after snapshot diff, not a DOM read.
- a screenshot lands under `artifacts/verification/` via `tbh.shot()`.
- no existing file under apps/web/test/*.spec.ts is modified — only the new fixture, its unit test, and the new spec are added.

## Context
apps/web/test/game.spec.ts is the closest existing example of the guest-serve golden path (aria-name button clicks, page.clock) to follow for the new spec's serve interaction. apps/web/test/fixtures/service-states.ts shows the project's existing fixture-module style. playwright.config.ts's webServer already runs `npm run dev` (`import.meta.env.DEV` true), confirmed to need no edit.

The bridge you are wrapping is `apps/web/src/verify/bridge.ts` + `apps/web/src/verify/install.ts`, installed from `apps/web/src/start.ts` (already merged). Read those three files for the real shape of `__TBH_VERIFY__` — `snapshot()`, `version()`, the event buffer — instead of inferring it from this task's prose.

Because you cannot run the browser yourself, the spec's correctness rests on reading the actual selectors/labels out of the existing specs and the components they drive. Cite the file:line you took each selector from in your §0.3 slice report so the reviewer can check them without a browser either.
