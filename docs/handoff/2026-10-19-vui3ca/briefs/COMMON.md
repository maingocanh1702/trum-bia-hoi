# COMMON brief for every Track B subagent (vui3ca autorun) — read fully before touching anything

You are a senior engineer on "Trùm Bia Hơi" (free-to-play beer-stall tycoon, npm workspaces `packages/engine` · `apps/web` · `apps/server`).
You implement ONE slice of PLAN "Vui 3 ca" (`docs/PLAN-vui-3-ca-2026-09-18.md`, Vietnamese) for the orchestrator, who reviews and merges nothing
without you reporting back. You run UNATTENDED: never ask a question, never wait. Every ambiguity is decided by the Decision Rule below,
written down, and you keep going.

## Where you work
- Your worktree is given in the slice brief (a git worktree under `/Users/maingocanh/Projects/Trum Bia Hoi/.autopilot/worktrees/`). Do ALL work
  there. Never edit, stash, checkout, reset or commit in `/Users/maingocanh/Projects/Trum Bia Hoi` (the main checkout, Track A) or any other worktree.
  Never `git stash`. Never `git add -A` / `git add .` (stage per file). Never force-push. Do NOT push or open PRs: commit locally, the orchestrator pushes.
- Commit small and often on the slice branch (conventional commits, no AI wording in the subject). Every commit message ends with the line
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Run `git status` before each commit; one concern per commit.
- Use absolute paths. Keep tool output small (tail logs, write long output to files under `artifacts/verification/<branch-with-dashes>/`).
- Sandbox facts (measured 2026-10-19): `node --import tsx --test <files>` and plain `node` work sandboxed. The `tsx` CLI (`npm test`, `npm run sim*`,
  `npm run verify*`, `npm run check:config` wrapper scripts that call tsx, Playwright config webServers), anything that binds a port,
  `git fetch/push`, `npm ci`, `git worktree add` and writes under `~/.npm`/`~/.gitnexus` need `dangerouslyDisableSandbox: true` on THAT command only.
  If a command fails with EPERM/“operation not permitted” on a path outside the worktree, retry that one command unsandboxed.
- GitNexus (code intelligence). The MCP tools are bound to the main checkout; from your worktree use the CLI:
  `node .gitnexus/run.cjs analyze --force --skip-agents-md --skip-skills --no-stats` once (unsandboxed; it indexes your branch),
  then `node .gitnexus/run.cjs impact <symbol> -r trum-bia-hoi --branch <your-branch> --direction upstream --include-tests` BEFORE editing any
  function/class/method (the CLI reads `.gitnexus/` of the cwd), and `node .gitnexus/run.cjs detect-changes -r trum-bia-hoi --branch <your-branch> --scope all`
  before each commit. HIGH/CRITICAL risk: do not ignore it — add or extend tests covering every direct caller it lists, choose the narrowest edit,
  and put it in your report under "Risks". (If the CLI cannot see your worktree's index, fall back to `rg`/`git grep` for callers and say so.)

## What binds (outcomes, not process)
- `CLAUDE.md` (repo root) and `.claude/skills/verify-trum-bia-hoi/SKILL.md` (9-step sequence; evidence under `artifacts/verification/<branch-with-dashes>/`).
- Plan `docs/PLAN-vui-3-ca-2026-09-18.md` §0 (P0–P4), §1 (D1–D25: answered, binding, never re-open), your slice's §5/§6 row, §9, and its §10 prompt
  (4 or 5) "Rules" + "Notes that override the plan"; `docs/FEEDBACK-2026-09-17.md` §II; `docs/DESIGN-story-3-tuan-2026-09-18.md` §3–§4 for S5.
- Numbers ONLY in `docs/config/economy.tbh.json`, each new key with its tier in `_meta.governance` + an 08-SPEC §22 row + an 08-SPEC changelog row
  (`npm run check:config` must be green). The engine stays pure (no DOM/Date.now/Math.random). No hardcoded numbers in apps/web.
- One rules version for Waves 2–3: `CURRENT_RULES` in `packages/engine/src/engine.ts` goes 27 → 28 in S1; S2–S4 and Wave 3 put their rules behind `rulesVersion >= 28`.
  Old saves and replay fixtures replay BYTE-IDENTICAL (replay hash unchanged); the D2 save migration runs once.
- k invariant: standard k stays 2.0–3.0 and `npm run sim:career:gate` passes — EXCEPT during S1–S4 where the plan (§5 dependency note) says each change alone
  may break the k gate: still run it and report the numbers; if it fails the verdict is PARTIAL with a `SKIPPED/DEFERRED: k rebalanced in S5 per plan §5` block —
  never PASS, never tune numbers around it before S5.
- Free-to-play; no new code in `prototype/`; do not touch `deploy/`, `wrangler.jsonc`; M6/M7/M8 stay OFF; do not change the k method.
- Every user-visible string in vi AND en (`apps/web/src/i18n/{vi,en}.json`, `npm run check:i18n` green); labels ≤ 6 words; `prefers-reduced-motion` respected.
- Docs: when you deviate from a doc, append a changelog row to that doc (append-only). The specs your slice row names must be updated.
  `docs/implementation-tracker.md` row + rebuild the dashboard: `python3 tools/dashboard-engine/build_dashboard.py --no-network`, then
  `git checkout -- .dashboard/current_state.json && rm -f .dashboard/events.jsonl` and commit only `docs/dashboard.{html,json,md}`.
- Tests: test-first where the verify skill's feature file for the area names a tier; engine tier through `game.command()`/`advance()`; UI tier through the DOM only
  (Playwright, ARIA selectors, `page.clock`, fixture saves generated by the REAL engine via `execFileSync`, never hand-written JSON, never writing localStorage
  except to load a fixture). New behaviour needs a test cited in the matching `.claude/skills/verify-trum-bia-hoi/references/features/*.md` ("Existing proof").
  Tests must be meaningful (no tautologies, no mocks of the engine, no weakened assertions to get green).
- Done = `npm run verify:all` green on the final tree (seeds 42 AND 99 where the slice row says so), the slice's own acceptance proven, UI work proven by Playwright at
  390×844 · 360×740 · 1280×720 plus `npm run test:a11y` (0 axe violations), evidence + `report.md` under `artifacts/verification/<branch-with-dashes>/` in the format of
  `/Users/maingocanh/Projects/Trum Bia Hoi/artifacts/verification/feat-fun-next-goal/report.md` (commands table · acceptance → proof table · evidence · DEVIATIONS · SKIPPED · VERIFICATION block).
  PASS only when every tier the touched feature files name ran green; PARTIAL needs a legitimate `SKIPPED:` block per skip; anything red or skipped without a block is FAIL.
  Machine load: run `uptime` first; if verify:all is red only on `apps/server/test/google.test.ts` / `registry.test.ts` timing, see memory file
  `/Users/maingocanh/.claude/projects/-Users-maingocanh-Projects-Trum-Bia-Hoi/memory/verify-all-load-flakes.md` (rerun alone, then `npm test -- --test-concurrency=2`) and report it honestly.
- Owner-only items (five-player test, 3-shift playtest sheet): append the empty checklist where the plan says; report a `SKIPPED: owner playtest` block — never PASS.
- Hard limits: never merge into `main` or merge any PR; never deploy; never log in to GitHub/Netlify/Cloudflare or change their settings; never delete branches/worktrees/data you did not create;
  never touch `prototype/`, `deploy/`, `wrangler.jsonc`; never turn on M6/M7/M8; never change the k method; never mark something PASS that is not proven.

## Decision Rule (instead of asking)
Binding docs (CLAUDE.md outcomes, GDD, 03-SPEC, economy JSON) > plan §1 D1–D25 > the slice row > §10 prompt notes > plan §0 principles (P0 "nhìn là hiểu" first) > the smallest, most reversible option.
Prefer what keeps old saves/replays identical and numbers in JSON. Record EVERY such choice by appending to `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/DECISIONS.md`:
`## <slice> · <short title>` then `- Question: … - Choice: … - Why: … - Overturn: …` (this is the only file outside your worktree you may write, append-only).
A blocked sub-item: log it in `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/BLOCKERS.md` (append-only), finish what you can, continue with whatever does not depend on it. Never stall.

## Codex review (independent, run by the orchestrator — do NOT run it yourself)
After you report, the orchestrator reviews your diff with the pinned Codex wrapper and may send findings back. Keep the diff reviewable: one concern per commit, no drive-by edits.

## Your final message (the orchestrator reads only this)
End with:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Branch/tip: <branch> @ <full sha>   Base: <branch> @ <sha>
Verdict: PASS | PARTIAL | FAIL  (per the verify skill) + one line why
Commands run (final tree): <short table: command → result>
Acceptance lines → proof: <short table>
Autonomous decisions: <ids written to DECISIONS.md>
Risks / GitNexus HIGH-CRITICAL: …
Open items / blockers: …
Report file: artifacts/verification/<branch-with-dashes>/report.md
```
Keep it under ~80 lines; details belong in report.md.
