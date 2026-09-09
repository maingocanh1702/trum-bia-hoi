# Config Registry — implementation contract

Authority: BRD §2/§5.2/§9, JSON `_meta.governance`, 08-SPEC §22 and 10-SPEC §7.
Base `732f860`. This slice implements the default registry's immutable proposal,
approval/publication log and actual GameStore opening resolver. It does not close M4.
The next slices add scoped overrides/compensation, authenticated admin transport and
editor, impact forecasts and emergency review. Public archive upload remains deferred.

| Interaction | Decision |
|---|---|
| Startup/restart | Import the seed once. A new constructor seed never activates itself over an existing registry. Existing exact config snapshots remain append-only for replay. |
| Draft/import | Validate the complete snapshot with the shared loader. Governance/metadata and prototype-only values cannot be edited. Compare actual changed paths; the most restrictive matching JSON tier wins. |
| Tier A | Economy proposes; legal/money/feature flags require Super. Distinct Super approves. No self-approval, including Super proposing. |
| Tier B/C | Economy/Game respectively (or Super), single approval. Support/Viewer cannot mutate. |
| Identity boundary | Core accepts only a trusted server-authenticated actor, never HTTP role/subject fields. Super/Game require MFA; sessions expire. No admin endpoint is exposed by this slice. |
| Publish | Approved exact snapshot, current published base, atomic config/audit/publication. Exact retries return the original publication. Per-admin daily abuse limit persists. |
| Schedule | Default A next VN day; league/Life Path/ledgers next common season boundary. B next shift except risk/locations next day; C immediate. Explicit delay may be later, never earlier. |
| Queued versions | Default versions form one optimistic-concurrency chain. Stale base or activation before its predecessor is rejected; rebase the draft explicitly. |
| Active shift/retry | Select registry only at creation/opening. Engine owns per-shift pins; replay and repeated commands retain original results/configs. Publishing never rewrites a running world. |
| Rollback | Propose an earlier snapshot under a new version and the same approval/schedule rules. No update/delete of history. |
| Heartbeat configuration | Existing leases use their pinned config. The scheduler follows the earliest durable lease and re-arms after heartbeat, including after a shorter interval is published. |
| Alerts | `ConfigPublished` is durable and available to a future ops delivery worker; no external message is sent without owner authorization. |

Verification: actual SQLite multi-connection/restart and rollback, real GameStore
old/new opening/replay, tier/metadata bypass attempts, stale proposals, approval and
publish retries, VN midnight/season boundaries and existing full tests/config/build.
No new gameplay numbers, seed changes, engine formulas or performance work in this slice.

| Date | Change |
|---|---|
| 2026-09-10 | Default registry contract and explicit remaining M4 work; implementation started. |
