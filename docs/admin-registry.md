# Config admission on measured k

Base `9227661`. Configuration publication is gated on a k value the server **measures**, not on the
`k.value` the candidate snapshot declares about itself. Existing Google/MFA, role checks, context
binding, idempotent writes and the append-only publication history remain the authority. No engine
or gameplay change; no schema change to `configs` or `registry_publications`.

## What changed

Before: `validate()` compared `original.values.k.value` — a number the proposal supplies — against
the seed band. A proposal could declare any k inside `[2.0, 3.0]` and be admitted regardless of what
its economy actually produced. The band was a formality, not a gate.

Now: k is measured once, at publish time, and admission reads only the stored measurement.

- `MeasureK` is an injected function type, so `registry.ts` never spawns a Worker or a simulation
  itself. Production wires the forecast Worker (asynchronous, 9–18s); tests wire a cheap synchronous
  stub. Its default — returning the candidate's own declared `k.value` — reproduces the old
  self-report admission exactly for any caller that never overrides it, so wiring is opt-in and no
  existing call path changes behaviour silently.
- `registry_measurements` (new table) holds one row per publication: `version` (primary key,
  referencing `registry_publications`), `state` in `pending | admitted | refused`, `measured_k`,
  `measured_at`. It is deliberately separate from `registry_publications` so that table's
  insert-only trigger never needs an exception. Its own triggers permit exactly one
  `pending → admitted|refused` transition and nothing else: no second update, no delete.
- `finishMeasurement()` compares the measured value against the seed band and writes `admitted` or
  `refused` in one transaction. A refused version raises `registry:bindingRange` carrying both the
  measured value and the band.
- Every publication predating the migration is grandfathered as `admitted` on its own declared
  `k.value`. Those versions were already live and trusted under the self-report regime; the change
  must not retroactively invalidate a running deploy.

## Pending publications do not exist for scheduling

This is the single rule the whole slice rests on, and it is the one that took five review rounds to
state once rather than patch per call site. A publication whose measurement has not settled is not
"a publication with an unknown k" — for every question about what is scheduled, superseded, active
or available as a base, it **is not there at all**.

- `currentBase()` raises `registry:measurementPending` when a new proposal's scope would overlap a
  currently-pending publication, so a candidate can never be composed on top of one.
- `active()`, `latest()`, `currentScopes()`, `scopedPublications()` and the phase/boundary readers
  are admitted-only. Because `currentBase()` already refused the overlapping case, the last admitted
  version is always the correct base to offer.
- `registryRevision` and the impact token derive from the admitted-only maximum sequence, never a
  raw `MAX(seq)` over the table — otherwise a pending row would silently bump the revision every
  reader uses for cache and conflict decisions.
- `supersededBy()` scans **all** `ConfigScheduleSuperseded` markers for a version and returns the
  first whose writer actually admitted. Reading only the oldest marker left a
  refused-then-admitted emergency sequence permanently un-superseded.
- A retry whose measurement row is not `admitted` raises `registry:kUnmeasured` rather than
  proceeding; a row found `refused` raises `registry:bindingRange`. Neither is retried into success.
- A measurement interrupted by a restart is resumed at startup. A transient forecast failure
  (`forecastBusy`, timeout) is logged and left pending rather than being converted into a refusal —
  a refusal is a statement about the economy, not about the Worker's availability.

## Boundaries

Measurement is one sample at publish time, not a continuous guarantee. It says the candidate's
economy produced a k inside the band under the forecast Worker's own conditions; it does not certify
balance, replace a human playtest, or re-validate a version whose inputs later change. The guest
edition has no server and therefore no registry, so none of this reaches that build.

## Checks

`apps/server/test/registry.test.ts` (51 tests) covers admission on a measured value, refusal outside
the band, the append-only triggers rejecting a second transition and a delete, migration
grandfathering, `measurementPending` on scope overlap, admitted-only scope/schedule/phase reads, the
revision token, the multi-marker supersession case, and resume after interruption. Full suite
558/558 with `check:config`, `check:i18n` and `build` green, verified in an isolated worktree.

Five independent review rounds; round 5 returned no major finding. Rounds 1–4 each closed a distinct
call site of the same pending-vs-scope rule — the enumeration that finally made it converge is the
per-function table in `docs/prompts/k-admission-handoff.md`, and the incident write-up is `L5` in
`docs/autopilot-LESSONS.md`.

## Remaining

`sim:career:gate` has not been run against this merge (the machine has been swap-bound); the rest of
`verify:all` is green. A2 balance acceptance is still open and is not claimed by this change.
