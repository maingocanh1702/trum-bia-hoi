<!-- gitnexus:start -->
# GitNexus — Code Intelligence (recommended tooling, not a gate — index currently covers `prototype/` only)

This project is indexed by GitNexus as **trum-bia-hoi** (2190 symbols, 3232 relationships, 102 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **Recommended: run impact analysis before editing an indexed symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **Recommended: run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **Warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- Prefer running `impact` before editing an indexed function, class, or method.
- Do not ignore HIGH or CRITICAL risk warnings from impact analysis.
- Prefer `rename` (call-graph aware) over find-and-replace for indexed symbols.
- Prefer running `detect_changes()` before committing. New code under `packages/`/`apps/` is not indexed until `node .gitnexus/run.cjs analyze` is re-run — the tool is optional there.

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
- Static gate before READY: `npm run verify` must stay green (check:config · check:i18n · build ·
  test · sim:onboarding · sim:rush · sim:career:gate). Run the task's own `verify` for RED→GREEN.
- Never change docs/config/economy.tbh.json, packages/engine rules, apps/server routes, or any
  i18n string in an ap3 run — those are supervised slices.
- Verification tooling is READ-ONLY: nothing under apps/web/src/verify or scripts/verify may call
  Game.command/advance, persist, replaceSave, or write localStorage/IndexedDB.
- Report per 11-PROMPT-PACK §0.3 in .ap3-run/READY-FOR-REVIEW.
<!-- ap3-workflow:end -->
