---
name: verify-trum-bia-hoi
description: Verify that a Trùm Bia Hơi change actually works before calling a slice done — map the diff to feature files, run the exact tests/specs/sims each one cites, and judge PASS/FAIL/PARTIAL by real proof, not by "the app opens". Use before finishing any implementation slice that touches gameplay, save, or UI.
---

# Verify Trùm Bia Hơi

Ported from [poteto/verification-skill-example](https://github.com/poteto/verification-skill-example)
(`.cursor/skills/verify-atlas`) for Claude Code, adapted to this repo's two-tier engine/UI shape and
its existing Playwright/`tsx --test` suites instead of a CDP driver. `/how`
(`.claude/skills/how/SKILL.md`) answers "how does X work"; this skill answers "did my change to X
actually work" — read `tbh-map.md` for the former, `references/features/*.md` for the latter.

## Before You Start

- This repo has two tiers and, in the web tier, two runtime modes — same classification as `/how`:
  **engine** (pure, `Game.command()`/`advance()`), **server** (`apps/server`, calls the engine per
  request), **web-local** (`VITE_TBH_LOCAL=1`, browser builds a `Game` itself), **web-remote**
  (default, browser never builds a `Game` — talks to the server over `/api` via `RemoteGame`).
- Read `.claude/skills/how/references/tbh-map.md` first for entry points; it is more accurate than
  any prose summary here where they disagree.
- GitNexus (`gitnexus://repo/trum-bia-hoi/context`) covers `prototype/` only — stale for anything
  under `packages/` or `apps/`. Use Glob/Grep/Read, not graph results, for those paths.

## Philosophy

1. **Understand before editing.** Run `/how` first — owner module, commands, events, world fields,
   and the tests that already pin the behaviour, before you touch code.
2. **Two tiers, two production paths.** Engine tier: `game.command()` + `advance()` *is* the
   production path (local mode calls it through `dispatch()`; the server calls it per request). UI
   tier: through the DOM only. Remote-mode UI proof additionally needs the isolated API config
   (`playwright.remote.config.ts`) — never a mocked `/api`.
3. **Read-only observation, never mutation.** A future wave (V2) adds a `window.__TBH_VERIFY__`
   read-only bridge for both runtime modes. Until it lands, observe through the DOM and through
   fixture saves — don't hand-edit `localStorage`/IndexedDB to "check" state.
4. **Behaviour map, not source map.** Feature files in `references/features/` name what the
   player/sim *observes* and cite the tests that already pin it. They never restate `engine.ts`.
5. **Binding checks are verification.** `npm run verify` and `npm run check:assets` are the static
   tier and always run. A future wave (V3) adds `verify:doctor`, which will refuse PASS when they're
   red; until it exists, treat a red `npm run verify` the same way yourself.

## Required Sequence

Run this whenever you're about to call an implementation slice done, for any change that touches
gameplay, save, or UI:

1. **Map the diff to feature files.** Open `references/features/README.md`, find every feature file
   whose "Related code files"/module list overlaps your diff.
2. **`npm run verify`** — static tier, always. `verify` already runs `check:config` → `check:i18n` →
   `build` → `test` (engine + server) → `sim:onboarding` → `sim:rush` → `sim:career:gate`. Add
   `npm run check:assets` when the diff touches `assets/manifest.json` or asset files.
3. **`npm run verify:doctor`** — *not built yet, added by wave V3.* Until it exists, do its job by
   hand: confirm `npm run build` succeeded after your last source edit (stale-build check), and that
   the dev/preview server or Playwright webServer you're testing against was started/restarted after
   that edit, on the port you think it's on (see Stale-Build Rule below).
4. **Engine/server tier** — run the exact tests each affected feature file cites. Bare `tsx` is not
   guaranteed on `PATH` outside an npm script (verified: it exits 127 run standalone) — use
   `node --import tsx --test packages/engine/test/<file>.test.ts apps/server/test/<file>.test.ts`
   (or the combined `npm test` when several engine/server files are affected).
5. **UI tier** — run the exact specs each affected feature file cites, matching the config to the
   spec's real directory — `playwright.config.ts`'s `testDir` is `apps/web/test`, but
   `playwright.remote.config.ts`'s `testDir` is `apps/web/remote-test`, a different directory (not a
   flag on the same one): local/legacy specs → `npx playwright test apps/web/test/<file>.spec.ts`;
   remote specs → `npx playwright test --config playwright.remote.config.ts
   apps/web/remote-test/<file>.spec.ts` (or whichever config the feature file names — admin/playable
   specs live under their own `apps/web/admin-test/`/`apps/web/playable-test/` directories the same
   way). Passing an `apps/web/test/...` path together with `--config playwright.remote.config.ts`
   matches zero tests.
6. **New behaviour without a citation** → write the test in the tier the feature file names, and
   update that feature file's "Existing proof" in the same commit. A change isn't done until its
   proof exists *and* is cited — an uncited passing test doesn't count for the next agent who reads
   the map instead of the diff.
7. **Evidence.** *A fixed evidence directory (`artifacts/verification/<branch>/`) is added by wave
   V3* — it isn't gitignored or created yet (today's `.gitignore` only covers `.qa/`,
   `test-results/`, `playwright-report/`). Until V3 lands, put the exact command you ran and its
   result directly in the §0.3 report's `QA:` line — don't invent a path that doesn't exist.
8. **`multi-system-journeys.md`** — read and drive its journeys whenever the change crosses
   engine↔web, local↔remote, or touches shift/save/season together. Skip this step for a change
   scoped to a single tier.
9. **Report.** `11-PROMPT-PACK-designer-blender-dev.md` §0.3 report (`TASK`/`STATUS`/
   `CREATED/CHANGED`/`QA`/`DEVIATIONS`/`HANDOFF` — the template itself is unchanged), with a
   `VERIFICATION:` block appended after it (wave V4, landed — `RESULT: PASS|FAIL|PARTIAL`,
   `EVIDENCE:` paths, any `SKIPPED:` blocks). Then independent review per
   `docs/prompts/codex-review.md`, which checks for this block and refuses PASS on a failed doctor.

## Proof Standard

Every "Existing proof" line in a feature file is a **real test/spec name you opened and read, or a
real sim command** — never a prose claim. "The app opens so it must work" is not proof. If you can't
point at an exact `test('...')`/`test(\`...\`)` string (or an exact `npm run sim*` invocation) that
exercises the behaviour, it isn't proof yet — either the behaviour is in that file's **Uncovered
paths**, or you write the test now and cite it.

## Driving Conventions (UI tier)

- Use the ARIA-based selectors the existing specs already use (`getByRole`, `aria-label`) — don't
  add a parallel class/CSS selector scheme.
- Use `page.clock` for time control, as the existing specs do, instead of real sleeps.
- Use the existing fixture-save generators for deterministic setup — `packages/engine/test/fixtures/*.ts`
  and `apps/web/test/fixtures/*.ts` drive the *real* engine via `execFileSync`, they are not
  hand-written JSON blobs. Prefer extending a generator over hand-crafting a save.
- **Never write to `localStorage`/IndexedDB directly**, except to load a fixture save through the
  documented loader. Mutate game state only through the command/UI path you're actually verifying —
  a direct storage write tests a state the production path can't produce.

## Stale-Build Rule

This repo runs many worktrees in parallel (`git worktree list` — nine at last count) that today
share fixed dev/e2e/API ports (per-worktree ports are wave V3's `verify:port`). A green UI-tier
result against a stale bundle or the wrong worktree's server is a false pass, and nothing catches it
automatically yet. Before trusting a UI-tier result: confirm the server you hit was (re)started after
your last source edit, and confirm which worktree/branch is actually listening on the port you used.
Once wave V3 ships, `npm run verify:doctor` automates both checks and PASS is refused on a red
doctor — this rule doesn't change then, it just stops being manual.

## Skip Format

When a path genuinely can't be driven (missing account tier, native-only, no fixture yet), name it —
don't silently omit it:

```
SKIPPED: <path>
Reason: <why this path wasn't exercised>
Closest verified path: <what you drove instead>
Risk: <what could be silently broken by skipping this>
```

## PASS / FAIL / PARTIAL

- **PASS** — every tier the affected feature file(s) name was run and green, and any new behaviour
  added by the change has a citation in the map.
- **PARTIAL** — some paths are skipped, each with its own legitimate `SKIPPED:` block. A pile of
  skips on a change that's supposed to be done is a signal to go back to PASS, not a rubber stamp.
- **FAIL** — anything a feature file cites came back red, or a path was skipped without a
  `SKIPPED:` block. Report FAIL; don't round a partial or unverified result up to PASS.

## References

- `references/features/README.md` — preconditions, conventions, the full feature index (23 files;
  see that file for how many exist today vs. are still a future slice).
- `references/features/<name>.md` — one file per feature area; open the ones your diff touches
  before *and* after editing.
- `.claude/skills/how/references/tbh-map.md` — entry points and owner modules; start here for "how
  does X work", not here.
