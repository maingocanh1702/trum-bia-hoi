# M4 next slice: competitive provenance and review

Status: **VERIFIED review/flag core and authenticated API** at521e901. Base:51a5ab5.
Competitive baseline/projection and dedicated admin controls remain unimplemented.

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
