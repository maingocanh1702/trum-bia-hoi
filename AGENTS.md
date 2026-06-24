<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Trum Bia Hoi** (2364 symbols, 3030 relationships, 50 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

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
# Autopilot — parallel slice flow (always-on)

Any feature/slice work in this repo MUST follow `docs/autopilot-prompt-GENERIC.md`. This is the single
flow for every session — do not invent a per-slice process. Manifests in
`docs/autopilot-manifests/<slug>.json` are the source of truth; the catalog and gate are authoritative.

## Always Do
- **Gate BEFORE any branch/worktree mutation** (GENERIC §A.3.1):
  `scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/<slug>.json`.
- **Edit only files in the manifest `scope`.** A changed file ∉ scope is SCOPE_ESCAPE → HALT. Need a
  shared-domain file → add its invariant token + file to the manifest and re-gate.
- **Verify fail-closed before review**: `cd prototype && npm run build` (+ `npm run sim` / re-measure k
  for sim/economy slices). Red build or k outside the spec band = HALT.
- **STOP_AT_READY** (§B.5): `scripts/autopilot-scope-gate ready --manifest <manifest>`, then stop and
  report (branch, files, verify + codex verdict). Run codex per manifest `codex_review` (2x_clean P1 / 1x_clean P2).
- New domain concept → add the **canonical token to `docs/autopilot-invariant-catalog.md` first**, then use it.

## Never Do
- NEVER auto-merge. P1 is `manual_only` / `auto_merge:false` — the human owns the merge (§C). P0
  (legal/payment/auth, e.g. F21/F26) is NOT autopilot at all.
- NEVER hand-edit `.autopilot/INFLIGHT.md` — the gate script owns it.
- NEVER push through a breaker (§D): SCOPE_COLLISION / DEP_MISSING / INVARIANT_UNKNOWN / BUILD_RED /
  SCOPE_ESCAPE / REVIEW_FAIL / METRIC_DRIFT. Stop and report.
- NEVER run two slices that share a `scope` file or an invariant token in parallel — serialize them.

## Resources
| File | Use for |
|------|---------|
| `docs/autopilot-prompt-GENERIC.md` | The master flow (§A–§E). Read before any slice. |
| `docs/autopilot-RUN-PROMPT.md` | Copy-paste run prompts (scaffold / run / cleanup). |
| `docs/autopilot-backlog.md` | Slice list, risk, scope, invariants, depends_on. |
| `docs/autopilot-invariant-catalog.md` | Canonical domain tokens (gate validates against this). |
| `docs/autopilot-parallel-scope-gate.md` | Why the gate exists (script is source of truth). |
| `.claude/commands/ap-new.md` · `ap-ready.md` · `ap-cleanup.md` | `/ap-*` slash commands. |

> Stale lock recovery: if a gate hangs ~30s then HALTs on lock timeout, remove `.autopilot/INFLIGHT.lock`
> (and `.git/index.lock` if git is blocked) — they are leftover, not active state.
<!-- autopilot:end -->
