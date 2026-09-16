<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **trum-bia-hoi** (8897 symbols, 14707 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `node .gitnexus/run.cjs analyze` in terminal
> first (or `npx gitnexus analyze` if that runner doesn't exist yet — e.g. a fresh clone).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/trum-bia-hoi/context` | Codebase overview, check index freshness |
| `gitnexus://repo/trum-bia-hoi/clusters` | All functional areas |
| `gitnexus://repo/trum-bia-hoi/processes` | All execution flows |
| `gitnexus://repo/trum-bia-hoi/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## How — codebase-understanding skill (Claude Code)

Before editing anything non-trivial, read `.claude/skills/how/SKILL.md` (or run `/how <question>`
in Claude Code). It explores in parallel (explain mode) or explores + spawns independent critics
(critique mode), and requires every non-trivial answer to cite file:line and the exact tests that
already pin the behaviour — see `.claude/skills/how/references/tbh-map.md` for the entry-point map.

<!-- autopilot:start -->
# Build workflow — the building agent decides (owner decision 2026-09-08)

The Level 3 supervised workflow (autopilot kit: worktree-per-slice, task contracts, scope/readiness
gate, pinned Codex review, READY/AWAIT/HALT lifecycles, `/ap-*` commands) is **no longer required**.
The agent building the game decides its own process — branching, slicing, order of work, review,
merge, tooling. `.autopilot/` and `docs/autopilot-*.md` are archived kit material: optional, never a gate.

## What still binds (outcomes, not process)
- Game rules, numbers and constraints: `00-HANDOFF-trum-bia-hoi.md` §4/§6 and `11-PROMPT-PACK` Part B
  "WHAT IS BINDING" (GDD + 03-SPEC rules · numbers only from `docs/config/economy.tbh.json`, no
  hardcode · k invariant · engine purity · localStorage first, server at M4 · free-to-play, donate only).
- Before calling a slice done: `npm run check:config` at the repo root is green; build + tests green;
  headless sim keeps `k` in 2.0–3.0 whenever economy/sim code changes. `cd prototype && npm run build`
  only if you touch the archived `prototype/`.
- Code lives in npm workspaces `packages/engine` · `apps/web` · `apps/server` (00-HANDOFF §4.4).
  Never put new code in `prototype/`.
- Docs: when you deviate from a doc, append a changelog row to that doc (append-only). When a feature
  changes state, update `docs/implementation-tracker.md` and rebuild the dashboard
  (`python3 tools/dashboard-engine/build_dashboard.py --no-network`).
- Keep `main` buildable. End each slice with a short report (template: `11-PROMPT-PACK` §0.3).

## Resources
| File | Use for |
|------|---------|
| `00-HANDOFF-trum-bia-hoi.md` | Entry point: scope, binding constraints, reading order. |
| `docs/TRANG-THAI-DOCS.md` | Latest state of the docs + open decisions (only the newest version is kept). |
| `SESSION-TRACK-LOG.md` | Project snapshot + next step; read before planning. |
| `docs/autopilot-*.md`, `.autopilot/` | Archived Level 3 kit — optional reference, not a process requirement. |
<!-- autopilot:end -->

<!-- ap3-workflow:start -->
# ap3 runs (headless writer) — what applies here
- You may only edit files inside the task's `scope`; the class ceiling is ap3/routines.json.
- Static/engine gate before READY: `npm run verify` must stay green (check:config · check:i18n ·
  build · test · sim:onboarding · sim:rush · sim:career:gate); `npm run verify:all` runs that plus
  `verify:doctor` in one command. Bare `verify:doctor` defaults to engine-only
  (repo/deps/binding/map) — it does NOT check server/bridge/console. `--full` exists but is not
  functional from a plain CLI call today (no browser to query; it always reports the stub
  fail-closed result) — verify those by hand (Stale-Build Rule) or through a real Playwright spec
  until a session injects working runners. `verify:all` is the floor for every slice, not a
  substitute for the UI tier below on a change that touches gameplay, save, or UI.
- Never change docs/config/economy.tbh.json, packages/engine rules, apps/server routes, or any
  i18n string in an ap3 run — those are supervised slices.
- Verification tooling is READ-ONLY: nothing under apps/web/src/verify or scripts/verify may call
  Game.command/advance, persist, replaceSave, or write localStorage/IndexedDB — observe through the
  bridge, never mutate through it.
- Any change touching gameplay, save, or UI follows `.claude/skills/verify-trum-bia-hoi/SKILL.md`'s
  9-step Required Sequence: (1) map the diff to feature files in that skill's
  `references/features/`; (2) `npm run verify`; (3) `npm run verify:doctor` (`--engine-only` for
  engine/server-only slices); (4) engine/server tier — run the exact tests the affected feature
  file(s) cite; (5) UI tier — run the exact specs they cite, matching the config to the spec's real
  `testDir`; (6) new behaviour without a citation → write the test in the tier the feature file
  names and cite it back in the same commit; (7) evidence under `artifacts/verification/<branch>/`;
  (8) `multi-system-journeys.md` when the change crosses engine↔web, local↔remote, or touches
  shift/save/season; (9) `§0.3` report with a `VERIFICATION:` block → codex review.
- Two-tier rule: engine tier — `game.command()`/`advance()` *is* the production path (local mode
  calls it through `dispatch()`; the server calls it per request). UI tier — through the DOM only;
  remote-mode UI proof additionally needs the isolated API (`playwright.remote.config.ts`), never a
  mocked `/api`.
- PASS rule: PASS only when every tier the affected feature file(s) name ran green and any new
  behaviour has a map citation; PARTIAL needs a legitimate `SKIPPED:` block per skip; anything cited
  that came back red, or skipped without a `SKIPPED:` block, is FAIL — never round up to PASS.
- Report per 11-PROMPT-PACK §0.3 in .ap3-run/READY-FOR-REVIEW.
<!-- ap3-workflow:end -->

## Imported Claude Cowork project instructions

Game inspired by trumviahe.com
