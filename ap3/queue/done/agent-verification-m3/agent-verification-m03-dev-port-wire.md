---
slug: agent-verification-m03-dev-port-wire
class: agent-tooling
risk: P2
scope:
  - scripts/verify/port.ts
  - scripts/verify/port.test.ts
  - scripts/verify/port-wire.test.ts
  - apps/web/vite.config.ts
  - package.json
verify: npm run test:one -- scripts/verify/port.test.ts scripts/verify/port-wire.test.ts
budget_usd: 10
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
---
## Problem
Plan §7 leftover, two distinct gaps in the same file:

1. `npm run dev` (vite, `apps/web/vite.config.ts:13` hardcodes `port: 5173`) and `npm run dev:server`
   (`apps/server/src/main.ts:7`: `Number(process.env.TBH_PORT ?? 5175)`) are the only two dev entry
   points still unwired to `scripts/verify/port.ts`'s resolver -- two worktrees running either at once
   collide on 5173/5175 regardless of worktree. All six Playwright configs are already wired (PR
   #8/#9, `agent-verification-m02-port-wire`/`-resolver`).
2. The resolver itself has a measured gap: `resolveBasePort()` (`scripts/verify/port.ts:73-83`) maps a
   worktree to `WORKTREE_BASE_FLOOR(5200) + sha256(id)%WORKTREE_BASE_SPAN(300)` with NO cross-worktree
   collision detection. `git worktree list` shows 10 live worktrees in this repo right now (measured
   2026-09-16) -- 10 items in a 300-slot space is a real, non-negligible birthday-paradox collision
   chance, and `.claude/skills/verify-trum-bia-hoi/SKILL.md`'s "Stale-Build Rule" section already
   documents this in prose ("reduces collisions, it does not eliminate them ... the resolver has no
   cross-worktree registry to detect or refuse a collision") -- V4 review round 6 could only fix that
   WORDING, not the mechanism. Two bases within `MAX_ROLE_OFFSET` (today `36`, `port.ts:45`) of each
   other collide on role ports even when the raw bases differ (base A + offset 30 can equal base B +
   offset 20 when |A-B| < 36).

Measured, so the new dev-port wiring doesn't blindly reuse the existing scheme and break it:
- `ROLE_OFFSETS` today: `e2e:0, dev-identity-web:1, dev-identity-api:2, admin-web:3, admin-api:4,
  playable-web-0:31 ... playable-api-2:36` (`port.ts:28-40`) -- `DEFAULT_BASE=4178`. Reproducing
  today's exact literals `5173`/`5175` via this SAME `base+offset` scheme needs offsets `995`
  (`5173-4178`) and `997` (`5175-4178`) -- both far outside the tidy `0-36` range every other role
  uses. Adding them to the SAME shared `ROLE_OFFSETS` record would push `MAX_ROLE_OFFSET` from `36` to
  `997`, and since `WORKTREE_BASE_SPAN` is only `300` (< 997), the new "bases within MAX_ROLE_OFFSET
  collide" check in gap 2 would then ALWAYS fire for any two live worktrees -- every base gets pushed
  through the deterministic probe regardless of its hash, which is still correct and collision-free,
  just no longer "hash first, probe rarely" in character for every role. This is a real trade-off, not
  a bug to route around silently -- resolve it explicitly (e.g. keep the dev-port collision radius
  scoped to a dev-only sub-range instead of the global `MAX_ROLE_OFFSET`, or accept the always-probe
  behavior) and state which one you chose and why in the slice report. Byte-identical reproduction of
  `5173`/`5175` in the unset/main-workspace case is NOT a hard requirement the way it was for the 5
  already-wired Playwright configs -- deriving both dev ports from the resolver with a documented,
  tested offset scheme satisfies this slice even if the literal default value changes.
- `apps/server/src/main.ts` is OUT OF SCOPE (not in this slice's scope list above, not in
  `agent-tooling`'s `allowed_scope` in `ap3/routines.json`) -- its `Number(process.env.TBH_PORT ??
  5175)` fallback (main.ts:7) must NOT be edited. Wire `dev:server` by exporting a resolver-derived
  `TBH_PORT` before invoking it (e.g. extend `scripts/verify/port.ts`'s existing CLI (`port.ts:98-107`,
  today prints every role tab-separated) with a way to print one role's port alone, then have
  package.json's `"dev:server"` script capture that into `TBH_PORT` before running `tsx
  apps/server/src/main.ts`) -- exact shape is this slice's own choice, main.ts itself stays untouched.
- Collision-detection test gotcha (measured): `scripts/verify/port.test.ts`'s and `port-wire.test.ts`'s
  existing fixtures (`worktreeDir()`/`mainWorkspaceDir()`) create a FAKE `.git` file/dir under a
  `.qa/port-*-XXXXXX` temp directory -- these are NOT real git repositories. If the new collision logic
  shells out to `git worktree list --porcelain` unconditionally using that fake dir as `cwd`, git will
  walk UP the directory tree (since `.qa/` sits inside this real repo) and report THIS repo's own real
  10 live worktrees instead of failing cleanly -- silently contaminating any test that doesn't account
  for it. Match `scripts/verify/doctor.ts`'s own established convention (`agent-verification-m02-doctor`:
  "every runner (git, fetch, spawn/exec, filesystem) INJECTED as a parameter, so the unit test can
  drive each branch without a real network/browser"): the worktree-enumeration step must be an
  injectable parameter/seam, not a bare `execFileSync('git', ['worktree','list','--porcelain'])` called
  unconditionally inside `resolveBasePort()`.
- `git worktree list --porcelain` (verified real output shape, confirmed 2026-09-16): repeated blocks
  of `worktree <absolute-path>\nHEAD <sha>\nbranch <ref>\n` (or `detached\n` in place of the branch
  line), blank-line separated. For each OTHER worktree's path, its identifier is that path's own
  `.git` file content (read the same way `getWorktreeIdentifier()` already does for the current cwd,
  `port.ts:64-66`) -- skip any entry whose `.git` is a directory (the main worktree; it always uses
  `DEFAULT_BASE`, never the hashed scheme, so it can't collide with a worktree base by construction:
  `DEFAULT_BASE(4178)` is `>1000` below `WORKTREE_BASE_FLOOR(5200)`).
## Acceptance
- `apps/web/vite.config.ts`'s `server.port`/`preview.port` and the `dev`/`dev:server` npm scripts
  derive their ports from `scripts/verify/port.ts`'s resolver, honouring `TBH_PORT_BASE` the same way
  the six Playwright configs already do -- proven by a new case in `scripts/verify/port-wire.test.ts`
  (extend the existing file's `assertWiredToResolver`-style pattern; do not duplicate its 5
  already-covered configs).
- A unit test in `scripts/verify/port.test.ts` (extend) proves the collision probe: construct two fake
  worktree identifiers that hash to the SAME `sha256(id)%300` slot (brute-force a handful of candidate
  fake `gitdir: ...` strings the same way the file's own `worktreeDir()` fixture already builds them,
  computing `sha256(id).readUInt32BE(0) % 300` yourself in the test until two distinct strings collide
  -- birthday-paradox odds mean well under 50 tries) -- feed both into the resolver as two live
  worktrees needing bases at the same time, and assert their FINAL resolved bases differ.
- A second case proves the probe order is stable: given the SAME set of live (fake) worktree
  identifiers/bases across repeated calls -- and across a separate process invocation, the same
  technique `scripts/verify/port.test.ts`'s existing "is deterministic ... across ... separate process
  runs" case already uses -- every worktree resolves to the exact same final base every time, not
  something that depends on iteration/insertion order of the enumerated worktree list.
- A third case proves two bases that hash to DIFFERENT slots but land within `MAX_ROLE_OFFSET` of each
  other (per whatever radius your design from Problem settled on) are also separated by the probe, not
  just exact hash collisions.
- `apps/server/src/main.ts` is not modified (grep the diff).
- The new/extended test files (`scripts/verify/port.test.ts`, `scripts/verify/port-wire.test.ts`) are
  both already inside `npm test`'s globbed `scripts/verify/*.test.ts` pattern (package.json's `"test"`
  script) -- no separate aggregate edit needed; state this one-line confirmation in the slice report.
- `CLAUDE.md`/`AGENTS.md`'s `<!-- ap3-workflow:start -->...<!-- ap3-workflow:end -->` block is NOT
  touched by this slice and is not in its scope -- verified by direct reading, that block (both files,
  today) contains only the 9-step verification sequence and has no port/collision wording to correct
  in the first place. `agent-tooling`'s `allowed_scope` in `ap3/routines.json` also does not list
  `CLAUDE.md`/`AGENTS.md` at all today, so neither file is available to any task under this class
  regardless. The real probabilistic wording this slice's mechanism fix should eventually retire lives
  in `.claude/skills/verify-trum-bia-hoi/SKILL.md`'s "Stale-Build Rule" section and
  `.claude/skills/verify-trum-bia-hoi/references/features/README.md`'s baseline-preconditions bullet
  (both quote the same "reduces
  collisions, does not eliminate them" claim) -- both paths start with `.claude/`, which `ap3/aplib.py`
  FORBIDS to every task in every class, unconditionally. That doc correction is out of reach for any
  ap3-dispatched task; it is a separate, owner-authored or supervised doc-only edit once this
  mechanism lands, not part of this slice's acceptance.
## Context
`scripts/verify/port.test.ts` tests `resolveAllPorts`/`resolveBasePort` directly (hash/base logic) --
the right home for the collision-probe tests above. `scripts/verify/port-wire.test.ts` tests the
already-wired Playwright configs' `assertWiredToResolver` pattern plus the byte-identical-literals
snapshot and the accessibility-config inheritance check -- the right home for the new dev/vite wiring
test, following its existing `expectedRoot`/`expectedDevIdentity`-style per-config builder pattern.

`apps/server/src/main.ts:7` (`Number(process.env.TBH_PORT ?? 5175)`) and `apps/web/vite.config.ts:13`
(`port: 5173`) are the two literals to retire from being load-bearing defaults; `apps/web/vite.config.ts`
already does non-trivial module-load-time work (`execFileSync('git', ['rev-parse','HEAD'])` at :7) so
importing the sibling resolver at config-eval time is consistent with the file's existing style, not a
new category of complexity.
