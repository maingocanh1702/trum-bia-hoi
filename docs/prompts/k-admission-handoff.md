# k-admission handoff — pending-vs-scope semantics (follow-up)

Branch: `supervised/v5-admin-k-admission`. Measured-k admission itself (Tests A-D, admitted-only
`active()`/`latest()`/`scopedPublications()`, no Worker on the `validate()` hot path) is solid and
landed. What is NOT solid is every OTHER `registry.ts` function that reasons about scope or
schedule while a measurement can be pending — six review rounds each found a new call site with
its own ad hoc answer to "does a pending publication count here?" instead of one shared rule. That
is a spec gap, not a per-site bug, and per-site patching could not converge against it. This doc is
the follow-up session's starting map. No code changes were made after round 6's verdict; the branch
is pushed as-is.

## 1. What's solid — do not touch without cause

- Tests A–D (`apps/server/test/registry.test.ts`): unmeasured → `kUnmeasured`; measured
  out-of-band → `bindingRange` with both numbers; measured in-band → admitted; `validate()`/
  `resolve()` never spawn a Worker (Test D).
- `active()` / `latest()` / `scopedPublications()` stay admitted-only — this IS the security
  boundary for what a real player's `resolve()` ever sees. Any fix below must preserve it.
- `compareEconomy()` (`packages/engine/sim/forecast.ts`) always measures the CANDIDATE run's own
  events, including the degenerate-fallback branch. Unchallenged across rounds 5 and 6.
- `resumePendingMeasurements()` — recovery only, not constructor-wired (would race the forecast
  worker's own throwaway `GameStore` — round 2 finding).

## 2. Round 6 findings — verbatim, not fixed, do not merge as-is

### Finding 1 — MAJOR — `registry.ts:282` — regression introduced by this branch's own round-6 fix

> **Confirmed player-facing failure:** the pending-aware sweep lets a pending replacement hide an
> admitted schedule. Reproduced with an admitted scope scheduled for day 14, its pending
> cancellation, and a conflicting second scope. The real forecast admitted the second scope at
> k=2.518845; on day 14, `resolve()` threw `registry:scopeConflict` because the cancellation
> remained pending — validate against the admitted state independently of pending replacements,
> including future boundaries, before admitting.

Root cause: `currentScopes()`'s dedup (`latest.set(key, entry)`, last-in-seq-order wins per scope
key) conflates two different questions — "the most recent attempt against this scope key" vs.
"what must I treat as possibly-real for conflict purposes" — and a pending cancellation can shadow
an admitted, still-live entry under the first reading while the second reading is what's actually
needed.

### Finding 2 — MAJOR — `registry.ts:295` — `emergencyScopeReplacements()` still has a live gap

> **Confirmed governance bypass:** already-due pending scopes still disappear from
> `emergencyScopeReplacements()`: they are neither admitted/current nor `effective_at > now`. A
> pending immediate Tier C change followed by a future A/B successor lets an emergency bypass
> `emergencyTier` and omit the original player. Settling the predecessor and emergency then
> removes that player's Tier C setting. The default-publication equivalent also reproduces through
> `pendingSchedules()` at line 373 — include due-but-pending replacements and revalidate emergency
> governance before admission; add regressions for both paths.

Round 6 switched the replacement SET from `scopedPublications()` to `scopedAttempts()`
(pending-aware) but left the FILTER (`p.version===active || p.effective_at>now &&
!supersededBy(...)`) assuming only two states exist: "currently active" or "not yet due." A row
due now (`effective_at<=now`) but still stuck pending fits neither branch.

### Finding 3 — MAJOR — `registry.ts:373` — `pendingSchedules()` never filters on measurement state

> **Narrower administrative failure:** `pendingSchedules()` includes refused publications.
> Reproduced a refused future default proposal containing `audio.enabled` plus a pricing blowup; a
> subsequent legitimate emergency against the unchanged active config incorrectly throws
> `registry:emergencyTier` — exclude refused attempts from replacement/governance queries.

Never touched in any of the six rounds. Reads `registry_publications` directly, filters only on
`supersededBy()` — a REFUSED (dead, never-real) publication is indistinguishable here from
pending or admitted.

### Finding 4 — MAJOR — `registry.ts:608` — `assertForecastCurrent()` doesn't see measurement settlement

> **Narrower forecast correctness gap:** measurement settlement changes resolved configurations
> without changing the publication sequence, so `assertForecastCurrent()` accepts stale reports.
> Reproduced candidate beer pricing changing from 50 to 60 while `registryRevision` remained 2;
> the old report still passed validation — bind forecast freshness to admission state as well as
> publication sequence.

Freshness keys only on `registry_publications.seq`. A measurement resolving pending → admitted
changes what `compose()` returns without touching `seq` — TOCTOU between settlement and
staleness-checking.

### Finding 5 — MINOR — `admin-registry.md:316` — doc drift

Verification map still called emergency replacement admitted-only/audit-only, contradicting this
branch's own commits, and cited a replaced engine test name. Patched to a one-sentence placeholder
by this handoff's own commit (§3 of the owner's instructions) — the follow-up should replace that
placeholder with the real, final description once the rule below is decided and implemented.

## 3. The round-5 gap you'd revert to if you undid finding 1's fix

Round 5's original finding (before this branch's round-6 fix, `registry.ts:701` at the time):

> **[MAJOR] apps/server/src/registry.ts:701** — Publication conflict validation still excludes
> pending competitors — Two overlapping, equal-priority scopes both pass publication. Delayed
> measurers can admit both, making `resolve()` throw `scopeConflict`; serialized retries instead
> leave the second permanently pending — Validate pending scope reservations and recheck
> compatibility atomically before admission.

Narrower than finding 1: needs an admin to create two genuinely conflicting, equal-priority scoped
proposals against the same base while BOTH are simultaneously pending (neither settles first) —
and fails LOUD, immediately, as a `scopeConflict` on whichever `publish()` runs second, not as a
delayed crash on an unrelated future day. A real tradeoff to weigh, not a free revert.

## 4. Every `registry.ts` function that reasons about scope or schedule

"Admitted-only" = pending/refused invisible to it. "Pending-aware" = only refused is invisible.
"Mixed" = different branches inside it disagree. File order.

| # | Function (line) | Treatment | Feeds | Note |
|---|---|---|---|---|
| 1 | `latest()` L174 | admitted-only | `index()` admin listing | — |
| 2 | `latestAttempt()` L180 | pending-aware (NOT_REFUSED) | `currentBase()`, `draftSource()` base, `publicationAt()` schedule-conflict | — |
| 3 | `active()` L183 | admitted-only | `compose()` base, `phaseReader()`, `draftSource()`/`scopeSource()` emergency base | "what's really live now" |
| 4 | `scopedPublications()` L210 | admitted-only | `currentScopes()` default branch, `forecastPlan()` scope-expiry boundaries (L593) | L593 use is NOT pending-aware, unflagged so far |
| 5 | `scopedAttempts()` L223 | pending-aware | `predecessor()`, `emergencyScopeReplacements()` replacement set, `scopeSource()` `last`, `validatePublications()` entries, `currentScopes()` includePending branch | — |
| 6 | `predecessor()` L227 | pending-aware (via 5) | `currentBase()` scoped check, `publicationAt()` scoped `latest`, `draftSource()`/`scopeSource()` previousVersion | — |
| 7 | `currentBase()` L253 | mixed (2 or 3, by emergency flag; + 6) | `propose()`/`approve()` staleBase | — |
| 8 | `currentScopes()` L280 | dual-mode via `includePending` | everywhere below that composes scopes | **includePending=true branch is FINDING 1's root cause** — dedup keeps only last-in-seq per scope key, admitted or not |
| 9 | `emergencyScopeReplacements()` L292 | mixed: `active` via 8(false); replacement set via 5 filtered `version===active \|\| effective_at>now` | `policy()` displaced keys, `affectedPlayers()` audience | **FINDING 2** — due-now-but-pending fits neither filter branch |
| 10 | `affectedPlayers()` L297 | inherits 9 | `previewImpact()`, `forecastPlan()` | only when draft is emergency |
| 11 | `compose()` L304 | dual-mode via `includePending`, threads to 8 | `resolve()` (false), `validatePublications()` (true) | inherits finding 1 when true |
| 12 | `resolve()` L325 | ALWAYS `includePending=false` | real player admission | correct, untouched every round — do not add a pending path here |
| 13 | `validatePublications()` L337 | pending-aware entries (5) + `compose(...,true)` | `previewPublication()`, `publish()` | the call site that surfaces finding 1 |
| 14 | `phaseReader()` L401 | admitted-only (3 + 8(false)) | `index()`/`details()` phase display | admin display only, not a gate |
| 15 | `pendingSchedules()` L372 | **not filtered by measurement state at all** | `policy()` displaced keys (default branch), `previewImpact()`/`publish()` supersession audit | **FINDING 3** |
| 16 | `policy()` L243 | consumes 9 or 15 | governance tier calc | inherits findings 2 and 3 |
| 17 | `draftSource()` L543 | mixed, deliberate: 2/6 pending-aware for base; 3/8(false) admitted-only for emergency-source check | admin draft UI | not flagged; follow-up should confirm the split is intentional |
| 18 | `scopeSource()` L555 | mixed, deliberate: 5 pending-aware for `last`; 8(false) admitted-only for emergency `active` | admin scope UI | same caveat as 17 |
| 19 | `previewPublication()` L571 | branches directly on `measurementRow().state` for existing rows | `forecastPlan()`, `previewImpact()`, `publish()` | new-version path inherits finding 1 via 13 |
| 20 | `forecastPlan()` L587 | informational only; inherits finding 2 via 10; scope-expiry boundaries via 4 (admitted-only) while rest is pending-plus-one-candidate | admin forecast UI | inconsistency, unflagged since nothing is gated on it |
| 21 | `assertForecastCurrent()` L608 | keys freshness on publication `seq` only, no measurement-state check | admin publish confirmation | **FINDING 4** |
| 22 | `previewImpact()` L610 | informational only; inherits findings 2 and 3 via 10/15 | admin impact preview | — |
| 23 | `publish()` L687 | existing-version branch is solid (direct `measurementRow().state` check); new-version branch inherits finding 3 via 15 and finding 1 via 13 | the real admission gate | — |

## 5. What a unifying rule needs to answer

Every gap above is one question asked ad hoc, function by function, instead of once: **for THIS
purpose, does a pending publication count as "the current state of scope X," "a reservation
against future conflicts," "something already displaced," some combination, or none?** Six rounds
of per-site patching produced five different partial answers (admitted-only, NOT_REFUSED,
NOT_REFUSED-plus-active-lookup, unfiltered-by-state, sequence-only) because nothing forced them to
agree. Name the finite set of purposes this gets asked for — player resolution (row 12, settled,
do not change), conflict detection (rows 8/11/13), governance/displacement (rows 9/15/16),
staleness/scheduling (rows 2/6/7), forecast freshness (row 21) — and pin one deterministic rule per
purpose before touching any more individual call sites.
