<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Trum Bia Hoi** (1946 symbols, 2880 relationships, 96 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Trum Bia Hoi/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Trum Bia Hoi/clusters` | All functional areas |
| `gitnexus://repo/Trum Bia Hoi/processes` | All execution flows |
| `gitnexus://repo/Trum Bia Hoi/process/{name}` | Step-by-step execution trace |

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
# Level 3 supervised workflow — future tasks

Every task/session/feature opened after the Level 3 v11 kit is published follows the canonical
`$HOME/Projects/Claude template/autopilot/level3-workflow.md` plus the globally loaded invariants.
No activation watermark or certification ceremony is required. This is forward-only: never migrate,
resume or reclassify an older READY/AWAIT/HALT lifecycle in place.

## Always Do
- Build the compact task contract before implementation: outcome, exact context/base, scope and
  negative scope, risk, autonomy mode, slice graph, permissions, verification, reviews and stops.
- `/ap-init` must report the complete v11 pack on the fetched `origin/master` used as `BASE_SHA`.
  Missing remote/origin publication is a hard preparation blocker.
- One writing slice = one explicit-base branch/worktree + one writer. Create the worktree from the
  pinned `origin/master` SHA, write the task contract/runtime manifest inside it, then register from
  that worktree before implementation.
- Parallelize only file-, invariant-, dependency- and mutable-state-disjoint slices. Serialize shared
  engine/economy/schema/generated state.
- Verify fail-closed: `cd prototype && npm run build`; also run `npm run sim` and re-measure `k` for
  simulation/economy changes.
- P1/P2 READY only comes from the v11 scope/readiness gate, which reruns declared verification and
  the pinned independent Codex review before writing `READY.txt`.

## Never Do
- Never auto-merge by default. P0 is prepare-only; P1 is supervised/manual-merge; P2 is supervised
  unless a narrow routine has earned proactive authority; P3 is report-only.
- Never edit `.autopilot/INFLIGHT.md`, share a writing worktree, use an implicit base, bypass a
  breaker, trust an empty-diff review, or raw-remove a lifecycle.
- Cleanup only through `scripts/ap-finish.sh <FEATURE_ID>` after origin-verified merge or an
  explicitly authorized close. `scripts/ap-housekeep.sh` is inventory-only.

## Resources
| File | Use for |
|------|---------|
| `$HOME/Projects/Claude template/autopilot/level3-workflow.md` | Canonical operational workflow. |
| `SESSION-TRACK-LOG.md` | Project handoff/context index; read before planning a new task. |
| `docs/autopilot-invariant-catalog.md` | Global plus Trum Bia Hoi serialization tokens. |
| `docs/autopilot-parallel-scope-gate.md` | Repository v11 gate contract. |
| `docs/autopilot-manifests/_TEMPLATE.json` | Slice manifest template. |
| `docs/autopilot-manifests/_READINESS_EVIDENCE_TEMPLATE.json` | Readiness evidence template. |
| `docs/autopilot-backlog.md` | Project task/dependency context; status is not runtime proof. |
<!-- autopilot:end -->
