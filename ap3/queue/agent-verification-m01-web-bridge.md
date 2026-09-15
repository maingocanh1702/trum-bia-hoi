---
slug: agent-verification-m01-web-bridge
class: agent-tooling
risk: P2
scope:
  - apps/web/src/verify/bridge.ts
  - apps/web/src/verify/bridge.test.ts
  - apps/web/src/verify/install.ts
  - apps/web/src/verify/install.test.ts
  - apps/web/src/start.ts
  - apps/web/vite.config.ts
verify: npm run test:one -- apps/web/src/verify/bridge.test.ts apps/web/src/verify/install.test.ts
budget_usd: 16
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m01-engine-snapshot
milestone: true
milestone_id: M1
---
## Problem

A browser-driving test or agent has no way to read game state except scraping the DOM. Local mode
holds a `Game`; remote mode (`RemoteGame`) holds only server snapshots and never constructs a
`Game`. There is no `window.__TBH_VERIFY__` today (`grep -rn "__TBH_VERIFY__" apps packages` finds
nothing outside this task). Plan v3 §6 specifies a read-only bridge exposing version / snapshot /
events / connection / journal / settings for both modes.

A previous attempt at this slice (tag `salvage/m01-web-bridge`, commit 4e1f4b1) delivered a working
`bridge.ts` + `bridge.test.ts` (9/9 green, RED confirmed) and the `vite.config.ts` define block, then
correctly HALTed SCOPE_DRIFT because the task told it to install from `main.tsx`, which has no access
to the live `Session`. Read that commit (`git show salvage/m01-web-bridge`) and reuse whatever you
verify yourself to be correct — you own the result either way. The install point is now fixed (below).

## Acceptance

`npm run test:one -- apps/web/src/verify/bridge.test.ts apps/web/src/verify/install.test.ts` fails
today (both modules missing) and passes after. Both test files run under `node --import tsx --test`
with hand-made fake session objects — no browser, no real `Game` boot required for install.test.ts.

bridge.test.ts (`buildBridge(session)` in apps/web/src/verify/bridge.ts):
- returns an object whose own keys are exactly version, snapshot, events, connection, journal,
  settings — nothing else; `Object.isFrozen(bridge)` is true.
- local session (a `BootSession`): `snapshot()` deep-equals the engine's `snapshot(session.game)`
  from the `packages/engine/src` barrel; `connection()` returns `'local'`; `journal()` returns null.
- remote session (a `RemoteSession`): `snapshot()` derives from the remote's own last world view and
  never calls the engine's `snapshot()`; `connection()` returns the remote's connection state;
  `journal()` returns `{nextSeq, pending, cursor}` read from the remote journal.
- `version()` returns `{schema: 1, commit: __TBH_COMMIT__, worktree: __TBH_WORKTREE__, mode, startedAt,
  configVersion}`.
- read-only proof: spy on the session and assert that calling every one of the six methods never
  invokes `game.command`, `game.advance`, `storage.save`, `remote.command`, or any localStorage /
  IndexedDB write.

install.test.ts (`installVerifyBridge(state)` in apps/web/src/verify/install.ts):
- with the env guard off, it writes nothing to the fake window.
- with the guard on and a `StartState` that has a session, it sets `window.__TBH_VERIFY__` to
  `buildBridge(state.session)`.
- with the guard on and a session-less `StartState` (`{local,legacy}` / `{error}` / `{reauth}`), it
  writes nothing.
- calling it twice with two different sessions leaves the SECOND session's bridge installed (the app
  calls `start()` again on account switch / reauthenticate — the bridge must follow the live session).

vite.config.ts: a `define` block supplying `__TBH_COMMIT__` (`git rev-parse HEAD`, must not throw
outside a git checkout — fall back to `'unknown'`) and `__TBH_WORKTREE__` (the config's own cwd).

## Context

**Install point — this is the whole reason the previous attempt halted; do not deviate.**
`apps/web/src/start.ts` is the single funnel that creates a session: `App.tsx` calls `start()` in
exactly two places (the mount effect at App.tsx:73 and `choose()` at App.tsx:74) and nothing else
constructs a `Session`. So wrap it in start.ts itself, leaving App.tsx untouched and out of scope:

    export async function start(mode?): Promise<StartState> {
      const state = await <the current body, extracted as a local async function>;
      installVerifyBridge(state);   // no-op unless guarded env + a session is present
      return state;
    }

`install.ts` must `import type { StartState } from '../start'` (type-only, so there is no runtime
import cycle) and `import { buildBridge } from './bridge'`. Guard is
`import.meta.env.DEV || import.meta.env.VITE_TBH_VERIFY === '1'`.

NEVER call `start()`, `boot()`, or `RemoteGame.open()` a second time to obtain a session. The
previous attempt proved this regresses the real app under `import.meta.env.DEV` (true for every
Playwright config's `npm run dev` webServer): local mode hits `BrowserSave.commit()`'s
optimistic-concurrency check (browser-save.ts:85-109) → `storage:conflict` → the recovery screen;
remote mode loses `navigator.locks.request(JOURNAL_KEY, {ifAvailable:true})` (remote.ts:78-86) →
`RemoteError('otherTab')`. If the wrap above turns out to be impossible, HALT MISSING_CONTEXT — do
not invent a second boot path or scrape the DOM.

The bridge is READ-ONLY (see the ap3-workflow block in CLAUDE.md): nothing under
`apps/web/src/verify/` may call `Game.command`, `Game.advance`, `persist`, `replaceSave`, or write
localStorage / IndexedDB. Deterministic setup for later slices stays "fixture save", not a mutator.

Read before writing: `apps/web/src/start.ts` (25 lines, 5 return points), `local.ts` (`BootSession`),
`remote.ts` (`RemoteGame`, `Connection`, the journal fields), `packages/engine/src/snapshot.ts`
(merged in PR #4 — reuse it, do not re-implement), `apps/web/src/main.tsx` (Admin vs App split; Admin
has no session, so the bridge simply never installs there — note that in your report, do not "fix" it).

`npm run verify` must stay green; run it before you write READY-FOR-REVIEW.

Commit message: `feat(web): read-only __TBH_VERIFY__ bridge installed from start.ts`
