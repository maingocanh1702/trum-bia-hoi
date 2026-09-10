# M4 next slice: competitive provenance and review

Status: **VERIFIED review/flag core and authenticated API** at521e901. Base:51a5ab5.
Own competitive baseline/score read is VERIFIED at7e7f337 (base1fd89d9).
Dedicated admin controls and public rank remain.

Read live F28 sections2/3/6, F25 owner local-history decision, F23 anti-cheat,
BRD4.2/4.3/9, registry/admin-auth/http, store claimLocal/localImport and seasons.
This is the implementation design, not new owner policy.
Source authority: F28 imported-history decision and BRD player-review roles.

Confirmed sources:
- Current trusted balances: engine seasonEarned(world, kind), pinned SeasonPeriod
  and SeasonResult; positive credits set firstReachedCurrentSeasonEarnedAt.
- Existing owner identity: google_accounts.player_id, authenticated session. An
  attached device guest is server-origin progress; local_imports identifies ONLY
  replayed local archives, not every guest-to-Google attachment.
- local_imports is immutable, one archive per account/player, digest and exact
  command/event cutoffs, original_gzip retained. New receipts start pending; the canonical current review is returned after a decision.
- Existing registry_audit is immutable and can record reviewed decisions; do not rewrite the imported archive or
  add compensating engine coins to approve ranking provenance.
- Game/Super admins already authenticate with independent MFA, reason/audit ops;
  Support cannot directly mutate credit. Transport never accepts actor claims.

Behavior to implement in dependency order:
1. Canonical server review/flag state, reason + exact import digest + expected
   prior decision; same request retries once, stale/opposed reviews refuse.
2. Canonical competitive totals use existing season accounting. Pending/rejected
   archive contribution is subtracted per exact season ID; post-import server
   gains still count. Approved history restores eligibility once by reading it,
   never by crediting engine balances again. Preserve completed-season snapshots.
3. Authenticated admin review and flag controls, then server rank read projection.
   Guest sees board without own row. No client rank write or approval flag.

Important boundary cases for regression:
- Same device guest becomes Google: all server-verified progress retained.
- Imported local + server gains in same season: exclude imported portion only.
- Next season: old local totals do not reduce fresh server earnings.
- First reached tie timestamp is that of the counted current balance.
- Flag/unflag immediately filters eligibility; duplicate review cannot add coins.
- Account/session swap, wrong digest, stale expected revision, missing review or
  malformed legacy provenance fail closed without discarding the real game save.
- Snapshot after season close stays immutable even if review/profile changes later.

Avoid a broad new M5 feature slice. Public upload and 80MB performance tuning stay
owner-deferred to M9. No new economy values. Re-read current base before writing;
separate review/provenance from leaderboard/shrine presentation and payouts.

## Baseline recovery boundary

Original archives contain commands/events, not a trusted serialized world total.
New claims already receive a replay-validated world from `validateLocalArchive`;
extract the imported season baseline there. Existing imported histories must use
the same worker to recover the exact cutoff from their retained archive, not the
player's later projection. A missing or unprovable baseline is unresolved data,
never zero imported credit. Reuse the current validation/resource limits; this
is functional provenance recovery, not an80MB performance/tuning project.

## Changelog

| Date | Change |
|---|---|
| 2026-09-10 | Continue owner queue after threshold validation: pin live provenance/role/accounting sources and next bounded M4 review/eligibility work. No rank, approval UI or score implementation claimed. |

## Review/flag slice contract — base51a5ab5

Scope: server review/flag state and its authenticated API, existing import receipt,
shared admin-actor validation, focused regressions. Reuse append-only registry_audit
as the canonical decision history; no schema migration or parallel mutable status.
Game/Super (existing MFA requirement) may decide; Support may inspect; Economy/Viewer
cannot inspect private moderation profiles or mutate them. Authenticated admin audit
already renders the records. Browser review controls and competitive totals follow.

| Request | Result |
|---|---|
| No import decision | pending; never implicitly approved. |
| Exact archive digest + current review seq + valid role/reason | Append approved/rejected decision only; original archive and gameplay unchanged. |
| Correct decision after earlier review | New request with current seq may reverse it; old decisions/receipts remain immutable. |
| Flag/unflag | Separate per-player seq, mandatory reason; no account ban or gameplay reset. |
| Same actor + request key + same entire request | Return original receipt; no duplicate audit or state change, even after a later decision. |
| Reused key with changed operation/player/digest/value/reason/seq | Conflict, no write. |
| Stale seq, wrong/missing import, changed import owner | Conflict/refusal, no write. |
| New key but value already current | No-change refusal; no redundant audit. |
| Guest cookie, forged actor fields, stale admin context, expired/revoked admin | Refuse before mutation. |

Future ranking reads the current review/flag state at its own boundary. These
controls alone do not certify ranking eligibility, score projection or snapshots.

## Implemented API boundary — verified

`Competition.state` reads the current decisions from immutable registry audit;
`GameStore.localImport` returns its approved/rejected/pending value. No schema or
engine mutation is added. `GET /admin/competition?playerId=...` is a protected,
audited inspection with the current decision/reason. `POST /admin/competition`
accepts only the documented request fields; actor/role/time are server-derived.
Existing context, CSRF, rate and session gates protect both actions. Existing admin
audit UI renders these records; dedicated review controls and score projection are
next. Final45 focused core/import/registry/auth,367 engine/server and19 admin browser
checks, config zero warnings and build/typecheck pass. Independent review found no
actionable defects; core5/typecheck independently pass, host verifies the signed
Google/MFA HTTP boundary. Receipt `.qa/competition-verification.json` records the
interrupted initial run separately from the complete rerun. M4 stays14/18 OPEN.

| Date | Change |
|---|---|
| 2026-09-10 core/API | Implement immutable reviewed-import and flag decisions, exact-retry/current-seq guards, shared actor validation and authenticated inspection/decision routes. Preserve source archive and game balances; dedicated controls and ranking projection remain. |

| 2026-09-10 core/API verified | 521e901 passes367unit/server,19admin browser,45focused,config/build and independent review; receipt records prior interrupted run without counting it. No score projection or complete moderation UI claim; M4 stays14/18. |

## Competitive score slice — base1fd89d9

Reuse `seasonEarned` / `seasonTier` and each period's pinned config. Store one
immutable `LocalImportBaseline` audit record alongside the existing import in the
same transaction; use the same record type for replay recovery of pre-slice imports.
No schema migration, new economy value, engine rule or second mutable score balance.
The record derives solely from validated replay, never uploaded totals. Existing
archives recover through the same bounded worker, verify digest/player/time/cutoffs,
and refuse unverifiable provenance. Recheck current identity and moderation after
worker completion. No public archive upload or history-size tuning.

| State | Competitive result |
|---|---|
| Server-origin guest | Current totals retained, ineligible until Google attachment. |
| Server-origin Google | Current totals, configured closed-shift gate and flag policy. |
| Pending/rejected imported season matching exact current ID | Subtract imported earnings and closed shifts only; server continuation still counts. |
| Approved imported history | Read full current totals once; never grant or rewrite coins. |
| New season / proven legacy unwindowed source | No old-season subtraction; legacy unwindowed income never invents a current-season score. |
| Zero counted earnings | Null tie timestamp; do not inherit the imported positive-score timestamp. |
| Positive server-only earnings | Keep canonical last positive-credit timestamp (the first reach of the current increasing total). |
| Missing/corrupt baseline or regressed counters | Refuse; missing provenance is not zero. |

An authenticated `/player/competition` read returns only the caller's current
eligibility/score, with exact-session revalidation after recovery. It accepts no
player ID, client total or review decision. Public ordering, snapshots and admin
history controls remain the following work; this does not close F28.

| 2026-09-10 score review correction | Independent review found P1 synchronous inflation of old archives before worker admission. Move inflate/digest/replay into the existing guarded worker; a regression stubs main-thread gunzip to fail and proves concurrent recovery is refused. Corrupt gzip/digest remains a refusal, never a zero baseline. Full correction verification follows. |

## Score verification closure

Code `7e7f337` (base `1fd89d9`): current competitive scores reuse engine seasonal
income/tier helpers and pinned config. Pending/rejected local earnings AND closed
shifts are excluded only for the exact imported season; later server earnings count.
Approval changes the read result once, never wallet balances or personal results.
New imports atomically record a checksummed baseline in existing immutable audit;
old imports recover the original cutoff through the bounded replay worker.
Authenticated `/player/competition` accepts no player/score override and rechecks
the exact session after recovery. Current Google/flag state gates eligibility.
Final **376/376 engine/server,19/19 admin browser,32 focused,config zero warnings
and build/typecheck PASS**. Review P1 synchronous inflation was fixed with a
red-before/green-after regression; final independent full-base review found no new
defects, confirms P1 closure, and independently passes13 targeted cases.
Receipt `.qa/competitive-score-verification.json`. No schema/engine/economy change.
**M4 remains14/18 OPEN**: public rank ordering/filtering/snapshots and protected
admin history/review controls are not supplied by a caller-only score API.

## Next bounded work: admin source-history review

Read live BRD4.2/4.3/8, Competition.inspect/decide, GameStore.eventsAfter and
existing Admin auth/context/draft/audit patterns. Add bounded, audited read access
to the immutable command/event prefix through the imported cutoff; later server
activity must not be presented as original local evidence. Support is read-only;
Game/Super may review/flag using the existing canonical decision endpoint.
Use VI/EN native controls, current player/digest/seq, mandatory reason, confirmation
and exact pending-request persistence across lost ACK/reload. Clear private buffers
on identity change/expiry; stale decisions require refresh. No new grants, public
upload, full 80MB transport, score formula or engine rules. Re-read the actual base
and current callers before implementation; tests must exercise real server receipts.

| Date | Change |
|---|---|
| 2026-09-10 score verified | E23 at7e7f337:376unit/server,19admin browser,32focused,config/build and independent review PASS; P1 worker correction closed. M4 stays14/18. Next protected history/review controls then public ranking. |

## Admin history and controls contract — basefaee42a

One bounded source-history endpoint uses existing immutable commands/events and
import digest/cutoffs; no replay, whole-archive transport or new score mutation.
Every page is authorized/audited (Support/Game/Super), exact-source bound and
limited to50 records. Missing prefix records or invalid cursors refuse. Display
one page at a time so inspecting a career does not accumulate an entire archive.

The admin panel reuses the existing auth/context/error handling and native dialog,
with Vietnamese/English copy. Pending decisions persist per verified admin subject
in sessionStorage before POST. No send on storage failure. An uncertain response
keeps its exact key/payload; an ACK clears intent before any follow-up read. Stale
revision refuses and requires fresh inspection. Context switch/unmount aborts and
ignores late responses; a new identity never displays another operator's buffers.
Confirmation shows player/action/digest/reason. Existing MFA/RBAC and canonical
Competition.decide remain the only mutation authority. No engine/economy edits.


The page shows the validated/replayed prefix stored at import, not a byte-for-byte
viewer of the retained compressed upload. Additive legacy replay fields may be
present; the original digest still identifies the retained source. Raw archive
transport/reprocessing remains M9. Pending recovery is per tab and operator, with
manual retry only; damaged records can be downloaded before explicit removal.

| 2026-09-10 admin controls implementation | Add audited 50-record imported-prefix pages and VI/EN Game/Super review/flag controls; Support reads only. Native confirmation, per-operator exact-intent recovery, stale-state refresh, ACK-before-read clearing and late-response teardown reuse existing guards. Focused server3/browser5/config/build pass; full verification and independent review pending. |

| 2026-09-10 review/visual correction | Full378unit/server +24admin browser pass. Independent review identifies P3 tracker/dashboard drift only; synchronize current state and regenerate dashboard. Visual QA additionally catches the notice retaining the previous language; regression and locale-at-render correction follow. |

## Admin history/review closure — E24, 2026-09-10

Code `85fbdfb` (base `faee42a`): `/admin` now provides audited, paged access to
the imported validated history, approval/rejection and flag/clear controls.
Support reads only; Game/Super use current MFA/session/context and existing
immutable decision receipts. Lost ACK keeps the exact request per operator/tab;
stale decisions require inspection; logout/identity change discards late responses.
No new wallet credits, engine rules, schema or economy JSON values.

**Verification:**378/378 engine/server and24/24 admin browser passed at38c1d75.
The final correction only translates notices at render and tightens the matching
browser assertion/docs; engine/server are byte-identical. All5 affected browser
cases, config zero warnings and build/typecheck pass again at85fbdfb. The locale
regression fails before the correction and passes after. Mobile/desktop VI/EN,
44px controls, focus, reduced motion, storage failure and exact retry are covered.
Initial review P3 tracker/dashboard drift is fixed; final independent full-base
review finds no actionable correctness/security defect. Receipt:
`.qa/admin-competition-verification.json` (logs and screenshots hash-bound).

**M4 remains14/18 OPEN.** No full F28 or live Google consent claim. Next: public
rank query/filter/order using the existing canonical competitive score, then the
remaining acceptance. Whole-archive public upload/performance remains M9.

| 2026-09-10 E24 verified |85fbdfb:378unit/server +24admin browser, final5 affected browser/config/build and independent full-base review PASS. P3 status drift and visual locale defect corrected. Protected history/review controls complete; public rank and M4 acceptance remain. |

## Public leaderboard contract — basec53b6f0

One server-owned live board reuses `competitivePeriods`, the imported baseline,
current Google membership/moderation and pinned season qualification. No client
rank/total submission. Guest/anonymous reads have no personal rank. Only public
pseudonymous IDs, rank, earned amount, reputation and life-path are returned in public rows. An authenticated response separately identifies its own viewer so the browser can reject a changed cookie owner; this context is never cached. Google subjects, other internal IDs, archive digests, reasons and command history remain private.
Public aliases are derived from player IDs; editable profile names/content filtering
remain the profile feature and are not invented from Google identity claims.

The board reads the existing committed projections, not whole event archives.
Normal score snapshots follow `leaderboard.refreshMs`; a Google membership,
review/flag or active registry change invalidates immediately. Old imported baselines
reuse the bounded recovery worker before any board publication. An incomplete or
corrupt source fails the whole rebuild; it never silently becomes zero. Source
periods are matched by exact ID and current deadline, with default empty windows
from `seasonWindow`. Ties use descending earnings, ascending first-reached time,
then internal player ID as a deterministic final tie-break only. Top/page size and
own-neighbor count use current display config; qualification and tiers stay pinned.

A page binds the returned snapshot revision, so an expired/rebuilt board refuses a
stale next-page request. Personal row and neighbors use the authenticated owner's
actual tier even when another tier is selected. Revalidate that exact session after
recovery. Browser display remains read-only, caches only public rows/as-of time,
uses VI/EN and the owner's all-menu pause rule, and replaces stale cached data with
server results. Immutable season-end snapshots/rewards stay the next dependency;
this live board does not certify full F28. Engine/economy values remain unchanged.

| 2026-09-10 public board WIP | Public server ranking and web consumer implemented;16focused,4new remote and2local browser/config/build pass. Full suite and independent review running. No economic values or engine rules changed. |


## Public board review correction

Review of1803b85 found a P1: historically accepted zero/fractional page counts or
zero/overflow refresh timers could break the new board. `rankSettings` now validates
whole positive topN/refreshMs, native timer ceiling and whole nonnegative neighbor
count at new proposal/publication admission and at the public consumer. Existing
config reads/replay/composition keep their historical semantics; an invalid old
public setting refuses ranking reads until a corrective version activates, without
blocking the game or rewriting its live pin. Three regressions fail before the fix.
No economy JSON or engine changes. Full correction verification/review pending.

| 2026-09-10 public board review | P1 administrator display bounds fixed at shared server admission/consumer, with legacy draft rejection and readable/correctable published pins. |
