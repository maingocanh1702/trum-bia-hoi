# Emergency config publication — implementation intake

Base: `e5cba9d`, `codex/game-build-isolated`. Authority: BRD §5.2.5 and
the owner's M4-first queue. Status: owner decision resolved; implementation queued. Runtime is unchanged.

## Established requirements

- Super Admin with server-verified MFA may publish a Tier A/B emergency hotfix.
  Ordinary proposals retain their existing role, approval and activation rules.
- Reuse the immutable config registry, shared schema admission, impact preview,
  protected admin transport and recoverable editor. Emergency status does not
  authorize invalid snapshots, changed catalog identities or paid gameplay.
- Publication creates a durable post-review ticket, due within 24 hours, in the
  same transaction as the new version and audit. Retrying a committed request
  returns its original receipt without another publication or ticket.
- A hotfix affects future config resolutions/openings. Existing shifts, command
  receipts, historical config snapshots and deterministic replay keep their pins.
- The 24-hour requirement is a post-review deadline, not a hotfix expiry or a
  reason to stop the game. No external notification transport is added here.
- This slice changes admin policy/validation only. It does not edit engine rules
  or the values in `docs/config/economy.tbh.json`.

## Historical intake (resolved by owner below)

The owner has been asked what happens to already-published future schedules:

1. An emergency hotfix replaces pending schedules; those versions remain in audit
   and must be explicitly republished if still wanted.
2. Pending schedules remain and replace the emergency version when due.

The intake awaited this choice; owner Steer #6 below resolves it. Its confirmation must show the exact affected schedules and reject
stale previews. Scope precedence and existing support-ticket requirements remain.

The current resolver selects the greatest publication sequence among versions
whose activation time has arrived. Appending an immediate higher sequence would
therefore mask older future versions permanently. Conversely, normal publication
rejects activation before its predecessor. Simply skipping that guard would make
an undocumented scheduling decision. Emergency drafts must also distinguish the
currently active base from a future scheduled snapshot.

## Verification planned

Extend the existing registry, HTTP and admin-browser suites: authenticated Super
only; A/B eligibility; invalid snapshot rejection; normal dual-approval and timing
unchanged; exact retries and lost receipts; concurrent publication/impact changes;
the selected scheduling rule; live-shift pin and restart/replay; one ticket per
publication, deadline and recorded review. Root config/build/tests and independent
review must pass before closing the slice. No economy simulation is needed for
unchanged economy and engine rules.

| Date | Change |
|---|---|
| 2026-09-10 | Recorded bounded M4 emergency intake and the unresolved pending-schedule policy; no implementation or milestone completion claim. |

## Owner decision 2026-09-10 — Steer #6 (21:50)

Option 1: a Super Admin emergency hotfix with server-verified MFA, Tier A/B,
REPLACES pending future schedules for the affected scope. Preserve each old
schedule in immutable audit with `superseded by emergency <version>`; never
activate it automatically. Reuse requires explicit republication through normal
approval. Confirmation lists exact version, effectiveAt, changed keys and
proposer/approver for every superseded schedule; reject a stale preview.

Create the 24h post-review ticket in the same transaction. Exact retries return
original receipts. Existing shifts, command receipts and replay retain config
pins. Admission and catalog-identity checks cannot be bypassed. No economic value
or engine rule changes. Regressions: zero, one, several schedules; scoped isolation;
stale confirmation; exact retry; republish after supersede; rollback by publishing
an old snapshot. Implement through existing registry/audit/protected transport.

| 2026-09-10 Steer #6 | Owner chose replacement of future schedules in the affected scope; emergency implementation unblocked. Historical unanswered question superseded. |
