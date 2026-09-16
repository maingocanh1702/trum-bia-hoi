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
- A new case in `apps/server/test/registry.test.ts` proposes a candidate that leaves `k.value`/
  `k.band` at the seed's own values (inside band) while multiplying a real pricing field (e.g.
  `raw.menu.bia.price`, the same field `registry.test.ts`'s existing cases already edit) by enough to
  move the MEASURED k outside `[2.0,3.0]` -- confirm the resulting k yourself first (a quick
  `serveValueStats` check against a small sample, or a `packages/engine/test/menu.test.ts` case) before
  wiring the server test, do not guess the multiplier -- then asserts `registry.propose(...)`/
  `f.draft(...)` throws `/registry:bindingRange/`. This case fails on `main` today (admission accepts
  it, matching admin-registry.md's confirmed experiment).
- A second case proves a candidate with a representative price/anchor change whose measured k STAYS
  inside band is still ACCEPTED -- no false-positive regression.
- The measured-k check is added inside `validate()` (registry.ts:153) or a private method it calls,
  reached from BOTH `validateAdmission()` (propose's path) and `compose()`'s direct `validate()` call
  (registry.ts:264) -- grep the diff for the new check's call site to confirm it isn't only reachable
  from `forecastPlan`/`previewImpact`/the async `forecastEconomy()` worker.
- The added latency is actually measured (e.g. `console.time`/`process.hrtime` around the new code
  path in a throwaway local run, reported in the slice report, then removed) for BOTH reach paths
  above. Target: under ~2s added latency per call -- a real player's `startShift` (path 2) and an
  admin's `propose()` (path 1, inside a `BEGIN IMMEDIATE` transaction) both need to stay interactive.
  If a full bot-driven simulation measures over that, redesign before shipping: a smaller deterministic
  sample, or an analytic estimate built from `@tbh/engine`'s existing pure pricing functions (e.g.
  `customerValue`) instead of a stateful bot loop. Memoizing the verdict by the resolved config's own
  version/hash (`compose()` already computes `raw._meta.version = resolved-${sha256(...)}` at
  registry.ts:263; `propose()`/`validateAdmission()` see the proposal's own `version`) so a given
  resolved config is measured once, not once per request, is one concrete way to hit this budget --
  not the only one; state which approach was taken and why in the slice report.
- The refusal keeps throwing the existing `registry:bindingRange` string (registry.ts:157) so
  `apps/server/src/http.ts:315`'s existing 400-mapping keeps working unchanged -- no second error
  string for the same failure class.
- `apps/server/test/forecast.test.ts` and `packages/engine/test/forecast.test.ts` stay green,
  unmodified in behavior (`admin-registry.md`'s own citation: 5 existing forecast cases, none assert
  k) -- this slice adds a gate to `validate()`, it does not change `projectEconomy`/`compareEconomy`'s
  return shape.
- The new test file(s) live under `apps/server/test/*.test.ts` / `packages/engine/test/*.test.ts` --
  both already globbed by package.json's `"test"` script -- so `npm test`/`npm run verify` runs them
  with no separate aggregate edit; state this one-line confirmation in the slice report. If a new
  helper file is added under `packages/engine/sim/**`, its own unit-level proof goes in a NEW
  `packages/engine/test/<name>.test.ts` (matching how `packages/engine/test/forecast.test.ts` already
  pairs with `packages/engine/sim/forecast.ts`), not a same-directory `packages/engine/sim/*.test.ts`
  file -- that directory is NOT in the `"test"` script's glob and would silently never run.
- This same change appends one bullet to `.claude/skills/verify-trum-bia-hoi/references/features/
  admin-registry.md`'s `## Existing proof` section citing the new `registry.test.ts` case name(s), so
  the file's own "Admission only guards the DECLARED k.value scalar" claim and its Uncovered-paths
  entry ("No tool combines real candidate simulation with a k-band check") are corrected in the same
  change that closes the gap. This path is NOT listed in this task's `scope:` and cannot be (`.claude/`
  is unconditionally forbidden to every ap3 task, `ap3/aplib.py`'s `FORBIDDEN_PREFIXES`) -- whoever
  implements this (supervised, by hand -- see Context) makes that doc edit as a companion change in
  the same PR/commit, outside the ap3 scope-guard.
## Context
This is a P1 task file. `ap3/aplib.py`'s `lint()` unconditionally rejects any `risk` other than `P2`
("only P2 tasks are auto-dispatchable (P1 stays supervised, P3 is read-only)") -- there is no
P1-dispatchable path in this kit today (confirmed: no P1/supervised handling exists anywhere in
`ap3/dispatch.sh`/`ap3/retry.sh`, and `ap3/queue/` has no subdirectory for supervised work). This file
therefore CANNOT pass `bash ap3/lint-task.sh ap3/queue/v5-admin-k-admission.md` and will never be
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
