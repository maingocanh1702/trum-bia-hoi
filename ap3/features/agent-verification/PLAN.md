# agent-verification — plan

Source: `trum-bia-hoi-agent-understanding-verification-implementation-plan.md` (v3, 2026-09-14),
Waves V2 (Sec 6) and V3 (Sec 7), sized per Sec 10's "dispatchable" row for both waves. No
`ap3-intake` gate ran for this feature — the plan doc is already the owner-ratified spec (see its
own changelog: v3 is a gap analysis against `master` @ `0da1529`, not a proposal awaiting sign-off).
This PLAN.md applies `ap3-plan/SKILL.md`'s steps 2-8 (slicing rules, model rule, `plan-emit`) to
that spec directly, skipping only step 0's "refuse first" intake-merge check, which has no
`docs/intake-agent-verification` PR to point at.

Class: `agent-tooling` (the only class in `ap3/routines.json`; its `allowed_scope` is the ceiling
every scope entry below was checked against). Risk: P2 for all 7 slices (read-only verification
tooling; no gameplay/economy/engine-API/UI-copy change, matching the class description and Sec 10's
DoD "No gameplay, economy JSON, engine/server API change").

## Deviations from the literal task brief (verified against the live repo, 2026-09-14)

1. **Model downgrade, m01-web-bridge and m02-doctor.** Originally specified `claude-opus-5`.
   `ap3/routines.json`'s `agent-tooling` class sets no `writer_models_allowed`, so
   `aplib.py lint()`'s model check only accepts the class's single default writer model
   (`claude-sonnet-5`, inherited from the top-level `writer_model`) — `claude-opus-5` fails lint
   outright, and `plan-emit` is all-or-nothing across the whole plan, so keeping it would have
   blocked all 7 slices. Downgraded both to `claude-sonnet-5`. If the owner wants opus on these two
   (cross-package complexity: web+engine+vite config for the bridge; composing 6 injected-runner
   check groups for the doctor), add `"writer_models_allowed": ["claude-sonnet-5", "claude-opus-5"]`
   to the class in `ap3/routines.json` (out of this PR's scope) and re-emit — queue files are never
   hand-edited, so bumping the model means re-running `plan-emit`, not patching the `.md` in place.
2. **m02-port-wire scope: `playwright.dev-identity.config.ts` instead of
   `playwright.accessibility.config.ts`.** The task brief listed
   `playwright.accessibility.config.ts` as one of the 5 configs to wire. Reading it shows it holds
   no literal ports at all — it does `import identity from './playwright.dev-identity.config'` and
   spreads `...identity`, deriving its whole `webServer` array from that import at load time.
   `playwright.dev-identity.config.ts` (added 2026-09-11, i.e. before this plan's own "ground truth"
   measurement — an omission in that doc, not a later addition) is the file that actually owns
   literal ports (4179/4180) and needs wiring; `playwright.accessibility.config.ts` inherits the fix
   for free once that's done. Net file count is unchanged (still 5 configs + 1 test = 6, "one
   concern" per the brief) — the file list corrected the contents, not the file count. Both
   `agent-verification-m02-port-resolver` and `agent-verification-m02-port-wire`'s task bodies carry
   the corrected list of files/ports in full so a headless writer never needs to re-derive it.
3. **Port inventory corrected.** The plan doc's own Sec 0 ground truth ("Five Playwright configs,
   fixed ports 4178 e2e / 5173 dev / 5174/5175 playable web/API") does not match any real file on
   disk: the actual repo has 6 `playwright*.config.ts` files (not 5 — see point 2), real ports are
   4178 (e2e) / 4179+4180 (dev-identity + remote, shared) / 4181+4182 (admin) / 4209-4214 (playable,
   3 viewports x web+api) / 5173+4173 (unrelated `apps/web/vite.config.ts` dev/preview defaults),
   and "5174/5175" does not correspond to anything in the current tree. `agent-verification-m02-port-resolver`
   and `agent-verification-m02-port-wire` carry the corrected figures, sourced by reading every file
   directly rather than the plan doc's prose. Flagging this for the owner to fix in the plan doc
   separately — out of this PR's scope (docs-only PR here is `ap3/features/agent-verification/**` +
   `ap3/queue/agent-verification-*.md` only).
4. **m02-tbh-fixture's `VITE_TBH_VERIFY` caveat resolved, not left open.** The brief flagged
   "if that requires editing playwright.config.ts, put it in scope" as a live question. Verified: it
   doesn't. `playwright.config.ts`'s `webServer` already runs `npm run dev` (Vite's dev server),
   where `import.meta.env.DEV` is always `true` — the bridge's own install guard
   (`import.meta.env.DEV || import.meta.env.VITE_TBH_VERIFY === '1'`) is already satisfied without
   the env var. Same holds for `playwright.remote.config.ts`. The task keeps the brief's original
   2-file scope (`apps/web/test/tbh-fixture.ts`, `apps/web/test/bridge.spec.ts`); no Playwright
   config is edited by any of these 7 slices.

## Known gaps (not this plan's scope — flagging for a follow-up slice/decision)

- `dev`/`dev:server` (the plain, non-Playwright npm scripts) and `apps/web/vite.config.ts`'s own
  `server.port`/`preview.port` defaults (5173/4173) are not wired to `TBH_PORT_BASE` by any of these
  7 slices — only the 5 Playwright configs are (m02-port-wire). Sec 7's "and `dev`/`dev:server` read
  `TBH_PORT_BASE`" line is not fully covered. Worth its own small follow-up slice if two worktrees
  need to run bare `npm run dev` concurrently outside Playwright.
- Wave V1's feature-map directory (`.claude/skills/verify-trum-bia-hoi/references/features/`) does
  not exist yet on `origin/main` — it's a separate, supervised docs track (Sec 10). m02-map-coverage
  is written to work correctly either way (absent directory = everything reported uncited), so it
  has no ordering dependency on V1, but real coverage numbers mean nothing until V1 lands.
- Waves V0, V1, V4 (docs-only, supervised per Sec 10) and V5 (per-feature, later) are out of this
  plan entirely, per the task brief — this PLAN.md covers only V2+V3's 7 dispatchable slices.

## M1 — snapshot + bridge (Sec 6 / Wave V2)

Order: `agent-verification-m01-engine-snapshot` -> `agent-verification-m01-web-bridge` (milestone
marker `M1` lands on web-bridge, the last dispatchable slice of this milestone).

### agent-verification-m01-engine-snapshot
Satisfies: Sec 6 first code block (`packages/engine/src/snapshot.ts`) + its unit-test acceptance
line ("serialisable, independent of `world` identity").
Scope: `packages/engine/src/snapshot.ts`, `packages/engine/src/index.ts`,
`packages/engine/test/snapshot.test.ts`. Budget $8, `claude-sonnet-5`.

### agent-verification-m01-web-bridge
Satisfies: Sec 6's `window.__TBH_VERIFY__` code block + its acceptance line (works under both
`playwright.config.ts` and `playwright.remote.config.ts`; absent from prod build via the
`DEV || VITE_TBH_VERIFY` guard). Depends on m01-engine-snapshot for the local-mode `snapshot()` call.
Scope: `apps/web/src/verify/bridge.ts`, `apps/web/src/verify/bridge.test.ts`, `apps/web/src/main.tsx`,
`apps/web/vite.config.ts`. Budget $10, `claude-sonnet-5` (see Deviation 1).

## M2 — ports, doctor, fixture (Sec 7 / Wave V3)

Order: `agent-verification-m02-port-resolver` -> `agent-verification-m02-port-wire` ->
`agent-verification-m02-map-coverage` -> `agent-verification-m02-doctor` ->
`agent-verification-m02-tbh-fixture` (milestone marker `M2` lands on tbh-fixture).

### agent-verification-m02-port-resolver
Satisfies: Sec 7's `scripts/verify/port.ts` bullet (main workspace keeps today's ports; a worktree
derives `base = 5200 + hash(worktree) % 300`).
Scope: `scripts/verify/port.ts`, `scripts/verify/port.test.ts`, `package.json`. Budget $6,
`claude-sonnet-5`.

### agent-verification-m02-port-wire
Satisfies: Sec 7's "all five Playwright configs ... read `TBH_PORT_BASE` when set" clause, and the
acceptance line "two worktrees run `test:e2e` simultaneously without port collision" (the Playwright
side of it). Scope corrected per Deviation 2 above: `playwright.config.ts`,
`playwright.dev-identity.config.ts`, `playwright.admin.config.ts`, `playwright.playable.config.ts`,
`playwright.remote.config.ts`, `scripts/verify/port-wire.test.ts` — **6 files, one concern** (wiring
the same resolver into every config that owns literal ports); sibling scope is not disjoint from
m02-port-resolver by design (this slice imports what that one exports), so these two run serially,
not in parallel — already enforced by the `after:` chain `plan-emit` stamped.

### agent-verification-m02-map-coverage
Satisfies: Sec 7's "map: feature-map coverage: every command/event cited; every test/spec file
cited" doctor bullet, as its own standalone, independently-testable script.
Scope: `scripts/verify/map-coverage.ts`, `scripts/verify/map-coverage.test.ts`, `package.json`.
Budget $6, `claude-sonnet-5`.

### agent-verification-m02-doctor
Satisfies: Sec 7's `scripts/verify/doctor.ts` code block (repo/deps/binding/map/server/bridge/console
groups, `--engine-only` flag, `artifacts/verification/<branch>/doctor.txt` output) and the acceptance
line "doctor detects a stale bundle and a wrong worktree; PASS is refused on a red doctor."
Scope: `scripts/verify/doctor.ts`, `scripts/verify/doctor.test.ts`, `package.json`, `.gitignore`.
Budget $10, `claude-sonnet-5` (see Deviation 1). Depends on m02-map-coverage (composes its exit code).

### agent-verification-m02-tbh-fixture
Satisfies: Sec 7's `apps/web/test/tbh-fixture.ts` bullet (`tbh.snapshot/waitForEvent/shot/
consoleErrors/evidence`), "existing specs are not rewritten; new specs use it."
Scope: `apps/web/test/tbh-fixture.ts`, `apps/web/test/bridge.spec.ts` (unchanged from the brief —
see Deviation 4). Budget $8, `claude-sonnet-5`. Depends on m01-web-bridge (the bridge this fixture
reads) — chained last in M2 by list order, per `ap3-plan/SKILL.md` step 6 ("list slices in the exact
execution order across the whole plan"), even though its real dependency is m01-web-bridge, not
m02-doctor; `plan-emit` only chains `after:` to the immediately preceding dispatchable slice, so this
is a real, intentional serialization choice (last in list = last to run), not a mis-set dependency.
**Sandbox caveat**: if Chromium cannot launch in the writer's sandbox, HALT `VERIFY_FAIL` is the
expected first outcome for this slice specifically (per `ap3-slice/SKILL.md` step 2) — not a defect
in this task's scoping. If that happens, this slice's `verify` should move to a `verify_host:` entry
on the class (owner edit to `ap3/routines.json`, out of this PR's scope) so the dispatcher's
unsandboxed host runs it post-review instead.

## plan-emit / lint-task verification

```
$ python3 ap3/aplib.py plan-emit plan.json
WROTE agent-verification-m01-engine-snapshot
WROTE agent-verification-m01-web-bridge
WROTE agent-verification-m02-port-resolver
WROTE agent-verification-m02-port-wire
WROTE agent-verification-m02-map-coverage
WROTE agent-verification-m02-doctor
WROTE agent-verification-m02-tbh-fixture
$ for f in ap3/queue/agent-verification-*.md; do bash ap3/lint-task.sh "$f"; done
OK  (x7)
```
`plan.json` itself is a scratch file (per `ap3-plan/SKILL.md` step 6) — not committed.
