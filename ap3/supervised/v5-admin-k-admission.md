---
slug: v5-admin-k-admission
class: server-guard
risk: P1
scope:
  - apps/server/src/registry.ts
  - apps/server/test/registry.test.ts
  - packages/engine/test/menu.test.ts
  - packages/engine/sim/**
  - packages/engine/test/**
verify: npm run test:one -- apps/server/test/registry.test.ts packages/engine/test/menu.test.ts
budget_usd: 14
max_review_rounds: 3
model: claude-sonnet-5
feature: admin-k-admission
---
## Problem
`apps/server/src/registry.ts:157`'s `validate()` admits a candidate whenever its self-reported
`values.k.value` sits inside the seed's `values.k.band` (`docs/config/economy.tbh.json` `k` block,
lines 129-136: `value:2.5`, `anchorValuePerServe:82.5`, `band:[2.0,3.0]`) -- it never re-derives k from
the candidate's actual pricing math. `.claude/skills/verify-trum-bia-hoi/references/features/
admin-registry.md`'s Observable-contract bullet ("Admission only guards the DECLARED `k.value` scalar
-- it does not measure the economy") already confirmed this by direct experiment: a candidate that
kept `k.value: 2.5` (inside band) while changing an unrelated pricing anchor measured k=209.765 across
1,000 simulated serves, and admission accepted it anyway.

MEASURED 2026-09-16 -- what exists today and what doesn't:
- `serveValueStats(serves, c)` (`packages/engine/src/menu.ts:5-12`, re-exported by `@tbh/engine` via
  `packages/engine/src/index.ts:12`'s `export * from './menu'`) is the ONE canonical measurement:
  `kValue = mean(payment+tip per serve) / c.values.k.anchorValuePerServe`. Today it is called only by
  `packages/engine/sim/headless.ts:58` and `packages/engine/sim/career.ts:6,58,64,82` -- both
  fresh-seeded bot simulations, neither reachable from `registry.ts`.
- `packages/engine/sim/forecast.ts`'s `projectEconomy()` (the sim `apps/server/src/forecast.ts:5`
  imports for `/admin/forecast`) returns `{game, report}`; `game.world.serves` (`ServeRecord[]`,
  `packages/engine/src/types.ts:23-27`, has `payment`/`tip`) DOES carry per-serve data, but
  `compareEconomy()` (`packages/engine/sim/forecast.ts:94-98`, what `apps/server/src/forecast.ts:29`
  calls) discards the returned `game` for both the baseline and candidate runs, keeping only
  `.report`. `ForecastDay`/`Totals` (`forecast.ts:10-12`) carry only day-aggregate `faucet`/`sink`/
  `served`(count) fields -- `grep -n '\.k\b\|kValue\|k\.band\|k\.value' packages/engine/sim/forecast.ts
  apps/server/src/forecast.ts` -> zero hits (matches admin-registry.md's own grep). So: no function
  anywhere in the forecast path returns a per-serve payment/tip series or a kValue.
- `apps/server/test/registry.test.ts:131`'s existing case (`r.k.band=[1,10]; r.k.value=4;`) does NOT
  exercise this gap: it widens the CANDIDATE's own band while ALSO setting `k.value=4`, which the
  EXISTING self-report check already rejects (4 > the SEED's real band[1]=3). It never leaves
  `k.value` inside the seed band while changing a pricing field, so it neither catches nor tests the
  real defect.

Perf constraint that MUST shape the fix (measured, not assumed): `time npx tsx
packages/engine/sim/headless.ts` (5 seeds x 2 profiles, ~1000 serves/run, the same bot-driven
technique `serveValueStats` is normally paired with) took 3m05s wall-clock total on this machine --
roughly 9-18s per single ~500-1000-serve run. `validate()` is reached two ways, BOTH real request
paths, not just an offline sim:
  1. `propose()` (registry.ts:400) -> `validateAdmission()` (registry.ts:165) -> `validate()`, inside
     `this.transaction()` (registry.ts:131-136) which does `BEGIN IMMEDIATE` for a write -- holding
     that lock for 9-18s blocks every other DB writer for the duration.
  2. `compose()` (registry.ts:264) calls `this.validate(config, base)` directly whenever a player has
     an applicable scoped (segment/campaign/player) override (`selected.length` > 0); `compose()` is
     reached from `resolve()` (registry.ts:266), which `apps/server/src/store.ts:602` calls on a REAL
     PLAYER'S OWN `startShift` command when they have no previously pinned config version -- i.e. a
     real player's shift-start request, not an admin action.
A naive "run a fresh >=500-serve bot simulation synchronously inside validate()" would very likely
regress path 2 into a multi-second hang on a real player's `startShift` request, and hold a write lock
open on path 1. This is the central design problem this slice must solve, not a detail to defer.

`packages/engine/src/**` (`menu.ts`, `rules.ts`, `engine.ts`) is OUT of this class's `allowed_scope` --
whatever measurement technique is chosen must be built from `@tbh/engine`'s EXISTING exports
(`Game`, `loadConfig`, `serveValueStats`, ...) plus new code under `packages/engine/sim/**` (allowed)
or directly in `apps/server/src/registry.ts`; it must not require editing engine source.
## Acceptance
Corrected design (the benchmark above invalidates a check inside `validate()` itself -- k moves off
every synchronous request path entirely, not just under a latency budget):
- Measure k ONCE per version, asynchronously, at publish time -- reuse the EXISTING forecast Worker
  (`apps/server/src/forecast.ts`'s `forecastEconomy`, `packages/engine/sim/forecast.ts`'s
  `compareEconomy`/`projectEconomy`), do not write a second simulation path.
- `compareEconomy()` (`packages/engine/sim/forecast.ts:94-98`) stops discarding the `game` each
  `projectEconomy()` call returns; it (or a thin wrapper `apps/server/src/forecast.ts` adds) exposes
  `serveValueStats(game.world.serves, c)` for the candidate run, so a real per-serve-measured `kValue`
  becomes available wherever `compareEconomy`'s result is consumed.
- `registry_publications` gains two nullable columns, `measured_k REAL` and `measured_at INTEGER`, via
  a migration to the `CREATE TABLE registry_publications (...)` DDL in `initializeRegistry()`
  (registry.ts:78-86). MEASURED BLOCKER, resolve explicitly: that same function installs an append-only
  trigger on this exact table (registry.ts:87-90, `BEFORE UPDATE ... RAISE(ABORT,'registry:appendOnly')`)
  that forbids ANY update after insert -- including filling these two columns in once the async
  measurement completes. Either (a) narrow the trigger to permit exactly one legal transition per row
  (`measured_k`/`measured_at` NULL -> non-NULL, every other column unchanged, checked in the trigger's
  own `WHEN` clause), or (b) leave `registry_publications` fully append-only as today and store
  `measured_k`/`measured_at` in a new, freely-updatable companion table keyed by `version`, with
  `active()`/`latest()` (registry.ts:147-152) joining against it. State which was chosen and why in the
  slice report -- weakening a named append-only audit property is itself security-relevant (this
  class's `security_review` is already `always`).
- `validate()` (registry.ts:153) reads the STORED measurement for the `version` it's validating (the
  proposal's own version via `validateAdmission()`, or `compose()`'s deterministic
  `resolved-${sha256(...)}` version, registry.ts:263) and NEVER spawns a Worker or runs a sim itself:
  absent -> throws `registry:kUnmeasured`; present and outside `seed.values.k.band` -> throws
  `registry:bindingRange measured=<k> band=[lo,hi]` (both numbers interpolated into the message, match
  `career.ts`'s existing `k.toFixed(4)` precision convention); present and in-band -> passes. NOTE:
  today's bare `Error('registry:bindingRange')` (registry.ts:157) is matched by EXACT string in
  `apps/server/src/http.ts:315`'s `[...].includes(error.message)` 400-mapping -- appending
  `measured=...band=...` breaks that exact match and would silently 500 instead of 400. `http.ts` (not
  currently in this task's scope list -- add it) needs the same `startsWith(...)` treatment that line
  already gives `'config:'`: check `error.message.startsWith('registry:bindingRange')` alongside the
  existing exact-match array, not just membership in it. Note this scope addition in the slice report.
- The async measurement is kicked off (fire-and-forget) at the two points a version can first need one:
  `publish()` (registry.ts:543, a top-level proposal becoming a publication) and `compose()`'s
  first-occurrence branch (registry.ts:269-273, `if (sources.length > 1 && !exists)`, a scoped-merge
  version nobody has resolved before) -- both already have a natural "this version is new" signal to
  hook. A version's measurement is cached once computed (keyed by `version`, per the migration above)
  -- never recomputed on a later request for the same version.
- A published-but-unmeasured version is not yet live: `active()`/`latest()` (registry.ts:147-152)
  exclude any row whose stored measurement is absent or out-of-band, so nothing is ever served to a
  player before it is measured and in-band. A real player's `startShift` hitting a not-yet-measured
  scoped-merge version (the rare first-occurrence case) gets `registry:kUnmeasured` per the bullet
  above -- fail-closed, matching how every other admission check in this file already behaves. State
  this explicitly in the slice report as the accepted trade-off (a self-healing, retriable edge case),
  not a silently-chosen different fallback.
- Drop the prior draft's "~2s added latency" acceptance line entirely -- with measurement off every
  synchronous request path there is nothing left to bound. The benchmark numbers stay in Context above
  as the reason this redesign exists, not something to re-derive or re-target.
- Tests, all in `apps/server/test/registry.test.ts` unless noted:
  - **A -- refuse-on-measured-out-of-band** (fails on `main` today): the same self-report-inside-band,
    measured-outside-band candidate as the prior draft's first case (leave `k.value`/`k.band` at seed
    values, multiply a real pricing field like `raw.menu.bia.price` enough to move MEASURED k outside
    `[2.0,3.0]` -- confirm the resulting k yourself first, e.g. via a `packages/engine/test/menu.test.ts`
    case calling `serveValueStats` directly, do not guess the multiplier). Once measured, assert the
    OBSERVABLE end state -- it never reaches `active()`/`latest()` (or `validate()` throws
    `bindingRange` reading the stored value, whichever your design surfaces first) -- not just that some
    function once threw.
  - **B -- accept-in-band**: a representative price/anchor change whose measured k stays inside band is
    measured, stored, and DOES become active/latest -- no false-positive regression.
  - **C -- unmeasured-throws**: whichever function actually gates (`validate()`, or `active()`/
    `latest()`) called against a version with no stored measurement throws `registry:kUnmeasured`,
    distinctly from `bindingRange`.
  - **D -- validate()-with-injected-throwing-Worker-factory-still-returns**: inject a Worker-factory (or
    whatever seam kicks off the async measurement) that immediately throws/rejects into `publish()`
    and/or `compose()`'s first-occurrence path; assert the SYNCHRONOUS caller still returns/completes
    normally -- the measurement subsystem's own failure is isolated (logged, `measured_k` left NULL for
    a retry), never an uncaught exception on the request path. This is the test that actually proves
    `validate()` is decoupled from the Worker, not just that reading the diff shows it isn't called.
- `apps/server/test/forecast.test.ts` and `packages/engine/test/forecast.test.ts` stay green; if
  `compareEconomy`'s return shape changes (stops discarding `game`, gains a `kValue`), update their
  assertions to match the WIDENED shape -- don't narrow or delete an existing assertion to force a pass.
- The new/changed test files stay inside `npm test`'s already-globbed `apps/server/test/*.test.ts` /
  `packages/engine/test/*.test.ts` patterns -- state this one-line confirmation in the slice report.
- This same change still appends one bullet to `.claude/skills/verify-trum-bia-hoi/references/features/
  admin-registry.md`'s `## Existing proof` section citing the new case name(s), correcting its
  "Admission only guards the DECLARED k.value scalar" claim and the matching Uncovered-paths entry --
  a companion by-hand edit outside ap3 scope (`.claude/` is unconditionally forbidden to every ap3
  task, `ap3/aplib.py`'s `FORBIDDEN_PREFIXES`), unchanged from the prior draft.
## Context
This is a P1 task file. `ap3/aplib.py`'s `lint()` unconditionally rejects any `risk` other than `P2`
("only P2 tasks are auto-dispatchable (P1 stays supervised, P3 is read-only)") -- there is no
P1-dispatchable path in this kit today (confirmed: no P1/supervised handling exists anywhere in
`ap3/dispatch.sh`/`ap3/retry.sh`, and `ap3/queue/` has no subdirectory for supervised work). This file
therefore CANNOT pass `bash ap3/lint-task.sh ap3/supervised/v5-admin-k-admission.md` and will never be
picked up by the dispatcher -- that is by design for `server-guard`'s declared risk, not a defect in
this file. It exists as a complete, precise spec for a human or a supervised Level-3 session to
implement by hand, per the user's global Level-3 supervised-autonomy workflow contract (a private,
user-level doc outside this repository)'s P1 row ("Supervised, isolated, full verification,
independent review, human merge").

`apps/server/test/registry.test.ts`'s `fixture()` helper (top of file) already gives `draft(edit, who,
key)` and `publish(edit, who)` builders over a real `ConfigRegistry`+`GameStore`+SQLite pair -- use
those, don't build a new harness. `packages/engine/sim/policy.ts` exports `createManagementPolicy`,
`serveNext`, `STEP_MS`, `MANAGEMENT_MS`, `MAX_DAY_STEPS` -- the same bot-policy primitives
`headless.ts`/`career.ts`/`forecast.ts` already share, importable from `packages/engine/sim/**`
(in scope) without touching engine source.

Read `apps/server/src/registry.ts:153-170` (`validate`/`validateAdmission`) and `:245-265`
(`compose`) in full before writing a line -- both call sites matter, per Acceptance.
