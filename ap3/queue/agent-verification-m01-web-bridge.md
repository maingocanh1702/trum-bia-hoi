---
slug: agent-verification-m01-web-bridge
class: agent-tooling
risk: P2
scope:
  - apps/web/src/verify/bridge.ts
  - apps/web/src/verify/bridge.test.ts
  - apps/web/src/main.tsx
  - apps/web/vite.config.ts
verify: node --import tsx --test apps/web/src/verify/bridge.test.ts
budget_usd: 16
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
after: agent-verification-m01-engine-snapshot
milestone: true
milestone_id: M1
---
## Problem
No read-only runtime bridge exists for either app mode -- apps/web/src/verify/ does not exist. A browser-driving test/agent has no way to read WorldView/events/connection state except scraping the DOM. Build `window.__TBH_VERIFY__` per the plan's shape: `version(), snapshot(), events(since?), connection(), journal(), settings()`.

`RemoteGame.journal` (apps/web/src/remote.ts) is a PRIVATE field with only a `pending`-count getter exposed publicly -- read it from bridge.ts via a narrow local type-cast (e.g. cast the session's `remote` to a minimal `{journal: {nextSeq:number; pending: unknown[]; cursor:number} | null}` shape); do not modify remote.ts to add a public accessor, it is out of this slice's scope.

Note: this task's model was downgraded from an originally-requested claude-opus-5 to claude-sonnet-5 to stay within ap3/routines.json's agent-tooling class, which declares no writer_models_allowed override (see PLAN.md).
## Acceptance
apps/web/src/verify/bridge.test.ts (new; node:test with fake window/session objects, no real browser needed) fails today (module missing) and then proves:
- exported `buildBridge(session)` returns an object with exactly the keys `version, snapshot, events, connection, journal, settings` -- no more, no fewer.
- for a fake session shaped like local mode's `BootSession` (`{game, storage, original, error}`, apps/web/src/local.ts), `bridge.snapshot()` equals the engine's own `snapshot(session.game)` (the function built by the prerequisite slice agent-verification-m01-engine-snapshot, imported from the engine package's barrel export -- this slice's `after:` chain runs behind it).
- for a fake session shaped like remote mode's `RemoteSession`/`RemoteGame` (apps/web/src/start.ts defines `RemoteSession`; apps/web/src/remote.ts defines `RemoteGame`), `bridge.snapshot()` derives from `session.remote.world` (the last applied WorldView) -- it must NOT call the engine's `snapshot()` function, since remote mode has no local `Game`.
- `bridge.connection()` returns the literal `'local'` for a local session, and `session.remote.state` (the `Connection` union exported by remote.ts) for a remote one.
- `bridge.journal()` returns `null` for a local session, and `{nextSeq, pending, cursor}` read off the remote session's private `journal` field via the type-cast described in Problem, for a remote one.
- `Object.isFrozen(bridge)` is true.
- none of the six bridge methods ever calls `command`, `advance`, `persist`, or `replaceSave` -- spy on the fake session's `game.command`/`game.advance`/`storage.save`/`remote.command` and assert zero calls after exercising every bridge method.
- apps/web/src/main.tsx installs `window.__TBH_VERIFY__ = buildBridge(session)` only when `import.meta.env.DEV || import.meta.env.VITE_TBH_VERIFY === '1'`. Both `playwright.config.ts` and `playwright.remote.config.ts` already run their web server via `npm run dev` (Vite's dev server, where `import.meta.env.DEV` is always true) -- neither needs an env-var change for this to work; no Playwright config is in this slice's scope, and none needs to be.
- apps/web/vite.config.ts gains a `define` block providing `__TBH_COMMIT__` (from `git rev-parse HEAD`, resolved once at config-load time) and `__TBH_WORKTREE__` (the config's own cwd) for `version()` to read.
## Context
apps/web/src/local.ts exports `BootSession` (`{game: Game, storage, original, error}`) and `boot()`. apps/web/src/remote.ts exports `class RemoteGame` (public `world`, `config`, `state: Connection`, `command()`; private `journal`) and `type Connection`. apps/web/src/start.ts exports `Session = BootSession | RemoteSession` and defines `RemoteSession`. Read all three; do not modify them -- they are not in this slice's scope. apps/web/src/main.tsx is the entry point that needs the install call added. apps/web/vite.config.ts already has `server`/`preview`/`build` blocks to extend with a `define` block.
