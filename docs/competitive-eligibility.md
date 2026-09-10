# M4 next slice: competitive provenance and review

Status: **INTAKE COMPLETE; implementation next**. Base: threshold-admission03dae56.

Read live F28 sections2/3/6, F25 owner local-history decision, F23 anti-cheat,
BRD4.2/4.3/9, registry/admin-auth/http, store claimLocal/localImport and seasons.
No implementation yet. This is the implementation design, not new owner policy.
Source authority: F28 imported-history decision and BRD player-review roles.

Confirmed sources:
- Current trusted balances: engine seasonEarned(world, kind), pinned SeasonPeriod
  and SeasonResult; positive credits set firstReachedCurrentSeasonEarnedAt.
- Existing owner identity: google_accounts.player_id, authenticated session. An
  attached device guest is server-origin progress; local_imports identifies ONLY
  replayed local archives, not every guest-to-Google attachment.
- local_imports is immutable, one archive per account/player, digest and exact
  command/event cutoffs, original_gzip retained. Receipt always pending today.
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
