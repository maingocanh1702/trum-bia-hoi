# Task authority: pending-vs-scope follow-up to v5-admin-k-admission

This is a supervised, hand-run follow-up session (not an ap3-dispatched task; there is no
`ap3/supervised/*.md` file for it). Its authority is the owner's direct instruction, reproduced
below, plus `docs/prompts/k-admission-handoff.md` (round-6 findings 1-4 and the 23-row function
checklist it documents). `ap3/supervised/v5-admin-k-admission.md`'s `scope:` list governed the
EARLIER, separately-landed measured-k admission slice -- it does not bound this follow-up.

## Scope (files this task may and does touch)

- `docs/prompts/k-admission-pending-vs-scope-followup.md` -- this file itself, the task authority.
- `apps/server/src/registry.ts` -- the fix itself.
- `apps/server/test/registry.test.ts` -- new/renamed regression tests.
- `apps/server/src/forecast.ts` -- `reportFromBackup()` must thread the new `measurementRevision`
  field through to `/admin/forecast`'s report shape (round-6 finding 4 requires this to be
  observable end to end, not just inside `registry.ts`); `measureKViaForecast()` must also validate
  the report's freshness before trusting `measuredK` (see round-1 review finding 2 below).
- `apps/server/src/http.ts` -- the new `registry:measurementPending` error needs an HTTP status
  mapping in the existing `adminErrors` table, exactly like every other `registry:*` error there.
  (The original k-admission slice's own task file made the identical scope note about `http.ts`
  needing this kind of companion change for a newly introduced registry error.)
- `.claude/skills/verify-trum-bia-hoi/references/features/admin-registry.md` -- documentation.
  `.claude/` paths are normally forbidden to ap3-dispatched tasks, but this is explicitly a by-hand,
  supervised edit (matching the precedent already set by the original k-admission slice's own report,
  which updated this same file), and the owner's instructions explicitly required it.

## The owner's instructions (verbatim)

> A publication in measurement state `pending` DOES NOT EXIST for scheduling purposes -- it has no
> effect on conflicts, schedules, emergency replacements or forecast freshness, exactly like a
> publication that was never proposed. AND: propose() REFUSES with `registry:measurementPending`
> when the proposal's scope overlaps any publication currently pending. Two proposals can therefore
> never be pending on overlapping scopes at once. Refused publications do not exist for scheduling
> either.
>
> Apply it: revert the round-6 `includePending` widening in conflict detection to admitted-only; add
> the measurementPending refusal at propose() and at any other entry point that creates a
> publication (emergency replacements, cancellations); walk all 23 rows of the handoff table, make
> every scope/schedule function admitted-only (pendingSchedules() excludes pending AND refused;
> assertForecastCurrent() keys on (publication seq, measurement seq) so a settle invalidates a stale
> report; emergencyScopeReplacements() cannot see a pending replacement as due-now); five tests, each
> failing before the fix and passing after; keep Tests A-D green; wire into `npm run verify`; update
> `admin-registry.md`'s placeholder citing the new tests.

## Round 1 review findings and their fixes (both landed, in scope)

1. **Pending/refused emergencies wrongly superseded valid schedules before their own admission.**
   `publish()`'s emergency branch writes `ConfigScheduleSuperseded` audit records synchronously,
   before the emergency's own async measurement settles. Fixed in `supersededBy()`
   (`registry.ts`): a superseding marker is trusted only once the superseding version itself is
   admitted -- the identical "pending has no scheduling effect" rule applied to the writer of the
   marker, not just the marker's own subject.
2. **`measureKViaForecast()` could admit a candidate on a stale simulation.** The worker's backup-
   based simulation can run for many seconds; if the live registry moves on in the meantime (another
   measurement settles, changing `measurementSeq()`), the "before" state the worker used is stale.
   Fixed by calling `assertForecastCurrent()` inside `measureKViaForecast()` (`forecast.ts`) before
   trusting `measuredK` -- the same freshness check the admin-facing `/admin/forecast` preview path
   already had, now also gating real admission.

Do not re-flag `forecast.ts`/`http.ts`/`admin-registry.md` as out-of-scope: they are explicitly
required by the acceptance criteria above and by the round-1 review findings this same diff already
fixes.
