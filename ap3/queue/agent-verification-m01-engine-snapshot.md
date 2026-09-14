---
slug: agent-verification-m01-engine-snapshot
class: agent-tooling
risk: P2
scope:
  - packages/engine/src/snapshot.ts
  - packages/engine/src/index.ts
  - packages/engine/test/snapshot.test.ts
verify: npx tsx --test packages/engine/test/snapshot.test.ts
budget_usd: 8
max_review_rounds: 3
model: claude-sonnet-5
feature: agent-verification
---
## Problem
No pure, versioned, JSON-safe snapshot of `World` exists for read-only tooling. Every existing consumer (web UI, tests) reads `Game.world` directly or replays the command log; there is no single function returning a stable, serialisable projection. `packages/engine/src/snapshot.ts` does not exist yet.

Field list and exact shape: trum-bia-hoi-agent-understanding-verification-implementation-plan.md Sec 6 (Wave V2, the `packages/engine/src/snapshot.ts` paragraph): `schema: 1, configVersion, now, phase, seed?, logLength, shift{elapsed,duration,weather,rush,stats}, tables[{id,state,level,capacity,groupId,orderId,orderState,itemsReady,itemsTotal}], queue[], glasses{by state}, keg, inventory, equipment, economy{coins,reputation,seasonEarned,lifetimeEarned,serves}, location, lease, staminaMs, completedShifts, quests/attendance counters, signboard/flyer/dog levels`.

Cross-check names against the real shape in packages/engine/src/types.ts before trusting the plan doc's prose literally -- e.g. the plan's `keg` key corresponds to World's `beer` field (there is no `keg` field on World); use the plan's name for the snapshot's own output key, but read the real field it comes from.
## Acceptance
packages/engine/test/snapshot.test.ts (new; node:test + node:assert/strict, importing from '../src', same convention as every sibling file in that directory) fails today because snapshot.ts does not exist, then passes once:
- `snapshot(game)` returns an object carrying `schema: 1` plus every field group listed in Problem, sourced from the real `World`/`WorldView` fields in packages/engine/src/types.ts.
- `JSON.parse(JSON.stringify(snapshot(game)))` deep-equals `snapshot(game)` -- no function, no cyclic reference, no value that round-trips differently through JSON.
- Build the fixture the same way apps/web/test/fixtures/service-states.ts does -- construct `new Game(...)`, `game.command({type:'startShift'})`, advance to spawn+ready, `game.command({type:'serve',...})` -- but call `Game`/`command()`/`advance()` directly in-process (this test lives inside the engine package itself; no `execFileSync` wrapper is needed the way the web fixture uses one).
- Calling `snapshot(game)` does not mutate `game.world`: `structuredClone(game.world)` taken immediately before and after a `snapshot(game)` call must deep-equal each other.
- `packages/engine/src/index.ts` re-exports the new module (`export * from './snapshot';`, matching every other line already in that barrel file).
## Context
Pure module: import only from `./types`, `./config`, `./engine` inside packages/engine/src -- no DOM, no `Date.now`, no `Math.random` (matches the existing engine-purity property of every file in that directory already). packages/engine/src/types.ts has the real `World`/`WorldView` interfaces to read field names from. packages/engine/src/engine.ts exports `class Game` with `readonly world: World` and the `command()`/`advance()` methods used to build the fixture. packages/engine/test/flyer.test.ts is a representative sibling test to match style/imports against. Full field-group spec: trum-bia-hoi-agent-understanding-verification-implementation-plan.md.
