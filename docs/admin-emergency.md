# Emergency config publication

Implementation base: `bb2bf0d`, `codex/game-build-isolated`. Authority: BRD §5.2.5 and
the owner's M4-first queue. Status: implemented and independently reviewed; final403 unit/server and28 admin browser checks PASS.

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

## Runtime contract — 2026-09-10

`ConfigRegistry.propose` records an explicit emergency flag in its immutable request
fingerprint. Super+MFA is checked at proposal and publication; every governed key
must be Tier A/B, including keys removed from a replaced scope. Emergency drafts
start from the active default and active named-scope patch, avoiding accidental
application of future scheduled values. Normal drafts still start from latest.

`impact` binds the exact pending schedule list, publication revision, activation
boundary and resolved player configurations. `publish` requires that token even
for default-scope emergencies and repeats validation under BEGIN IMMEDIATE. Zero
pending schedules still requires confirmation. Normal role/approval/timing rules
are unchanged; emergencies skip pre-publication approval explicitly.

The higher publication sequence masks replaced schedules permanently. Each gets
an append-only `ConfigScheduleSuperseded` record and archived lifecycle label,
with exact `superseded by emergency <version>` marker. Original publications remain
untouched. Other scope identities retain their schedules. Expiry cannot resurrect
a superseded version. Normal rollback/republication creates a fresh proposal from
the old snapshot and requires the ordinary approval flow.

The same transaction adds `ConfigEmergencyReviewOpened`, keyed by publication
version and due at publication +24h. `/admin/emergency-review` appends the findings
from a different authenticated Super Admin (neither author nor publisher). This
reuses the distinct-review rule after emergency publication. Exact review retries
return the original record; overdue reviews can still be recorded and never
silently disable gameplay. The admin detail view shows deadline and review receipt;
the existing audit feed makes tickets durable and inspectable without new tables.

VI/EN editor preserves emergency mode in locked local draft recovery. Confirmation
lists version, activation time, keys, proposer and approver for every replacement.
Lost publication responses retry the same version and return its original receipt.
Server tests cover 0/1/3 pending schedules, scope isolation/expiry, stale previews,
atomic audit failure, explicit republish/rollback, role/MFA/schema/catalog checks,
post-review and pinned live saves/replay. Mobile browser covers exact confirmation,
lost acknowledgement and independent post-review. No engine or seed values changed.

| 2026-09-10 implementation | Owner Steer6 implemented through registry/audit/admin transports and UI; final root verification and independent review in progress. |

| 2026-09-10 review correction | Independent P2 found `draft-source?version=<future>&emergency=1` could import future values. Shared source admission now rejects every non-active explicit source in emergency mode; active scoped sources still work, ordinary rollback remains unchanged. Default/scoped/HTTP regressions added. |

| 2026-09-10 scope review correction | Two P1 findings: active keys/audience could be hidden behind a scheduled successor. A shared exact-scope replacement selector now includes active plus all pending versions; emergency admission/publication checks every displaced key and both impact/forecast include all displaced audiences. Exact retries bypass changing live scope policy after authentication/immutable checks. Regressions cover active TierC removal and four successive audiences. |

| 2026-09-11 review correction | Default emergencies also govern the pending schedule keys they cancel, using the same pendingSchedules selector as confirmation. A future mixed A/C default cannot be canceled by an A/B emergency; proposal and publication regression PASS. |

| 2026-09-11 verified | Final403 unit/server,28 admin browser, config/build PASS. Independent full-diff review CLEAN after active-source and displaced-key/audience corrections. Full verify402PASS (10standard,15rush,2career); final registry-only guard passed fresh403unit/server and config/build. Receipt `.qa/emergency-verification.json`. No M4/full-game closure claim; ownerSteer12 next: dev identity and playable happy path. |
