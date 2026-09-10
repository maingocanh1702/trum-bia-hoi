# Config Registry — implementation contract

Authority: BRD §2/§5.2/§9, JSON `_meta.governance`, 08-SPEC §22 and 10-SPEC §7.
Base `732f860`. This slice implements the default registry's immutable proposal,
approval/publication log and actual GameStore opening resolver. It does not close M4.
Schema9 adds authenticated admin transport at6f42575. The `/admin` browser editor now uses that boundary (see admin-editor.md).
Scoped overrides/compensation, impact forecasts and emergency review remain. Public archive upload remains deferred.

| Interaction | Decision |
|---|---|
| Startup/restart | Import the seed once. A new constructor seed never activates itself over an existing registry. Existing exact config snapshots remain append-only for replay. |
| Draft/import | Validate the complete snapshot with the shared loader. Governance/metadata and prototype-only values cannot be edited. League/Life Path/location IDs and the lease fallback retain their persisted meanings; renaming requires an explicit career migration, not balance tuning. Compare actual changed paths; the most restrictive matching JSON tier wins. |
| Tier A | Economy proposes; legal/money/feature flags require Super. Distinct Super approves. No self-approval, including Super proposing. |
| Tier B/C | Economy/Game respectively (or Super), single approval. Support/Viewer cannot mutate. |
| Identity boundary | Core accepts only a trusted server-authenticated actor, never HTTP role/subject fields. Schema9 Google/TOTP sessions protect admin endpoints; Super/Game require independent MFA. Sessions expire; private directory changes invalidate their old authority. |
| Publish | Approved exact snapshot, current published base, atomic config/audit/publication. Exact retries return the original publication. Daily change limit is charged to the proposal author; changing the publisher cannot reset it. Audit records both author and publisher. |
| Schedule | Default A next VN day; league/Life Path/ledgers next common season boundary. B next shift except risk/locations next day; C immediate. Explicit delay may be later, never earlier. |
| Queued versions | Default versions form one optimistic-concurrency chain. Stale base or activation before its predecessor is rejected; rebase the draft explicitly. |
| Active shift/retry | Select registry only at creation/opening. Engine owns per-shift pins; replay and repeated commands retain original results/configs. Publishing never rewrites a running world. |
| Rollback | Propose an earlier snapshot under a new version and the same approval/schedule rules. It must retain threshold groups installed on its base; incompatible deletion is rejected. No update/delete of history. |
| Heartbeat configuration | Existing leases use their pinned config. The scheduler follows the earliest durable lease and re-arms after heartbeat, including after a shorter interval is published. |
| Alerts | `ConfigPublished` is durable and available to a future ops delivery worker; no external message is sent without owner authorization. |

Verification: actual SQLite multi-connection/restart and rollback, real GameStore
old/new opening/replay, tier/metadata bypass attempts, stale proposals, approval and
publish retries, VN midnight/season boundaries and existing full tests/config/build.
No new gameplay numbers, seed changes, engine formulas or performance work in this slice.

| Date | Change |
|---|---|
| 2026-09-10 | Default registry contract and explicit remaining M4 work; implementation started. |
| 2026-09-10 correction | Review found publisher rotation bypassed the author's daily limit; attribution/count now use the author. An independent author probe found schema-valid catalog renames could block old careers; such changes now require a migration. Regression cases added; verification/review pending. |

| 2026-09-10 verified | Productc1e953c:310engine/server (12registry cases),10remote browser, config/build zero warnings,10ordinary kcohorts2.4186–2.8738 and15rush PASS. Independent correction review CLEAN after fixing the author limit and catalog identity protection. Receipt `.qa/registry-verification.json`; internal default service complete, full admin/M4 remains open. |

| 2026-09-10 admin transport | Trusted actors now come from the schema9 Google/TOTP admin session boundary; registry read/approval/publication routes are protected. No request actor claims are accepted. See admin-auth.md. Editor/scopes still open; verification/review in progress. |

| 2026-09-10 authenticated boundary verified |6f42575 protects registry read/propose/approve/publish/audit via server-derived admin actors.320tests,10remote browser, config/build and review PASS; editor/scopes remain open. Historical internal-only rows above describe the prior slice. |

| 2026-09-10 browser editor | `/admin` adds author-bound drafts, JSON diff using shared Base scaling, separate approval/publication, historical rollback draft and audit. Detail permissions derive from the existing canonical role gate; mutations still revalidate. Context-bound requests reject identity switches.321tests/8admin/10remote browser/config/build pass; independent review pending. |

| 2026-09-10 editor verified |56a0a44 browser GIS/TOTP/editor workflow verified:321engine/server,11admin/10remote browser, config/build PASS and final review CLEAN. Context binding prevents stale identity actions; durable drafts/retries and snapshot replacement regressions pass. M4 now11/18 OPEN; scopes/full admin and live setup remain. See admin-editor.md. |

| 2026-09-10 threshold admission | Validation distinguishes old replay snapshots from new admin proposals: reject deletion of installed invitation thresholds. Revalidate at the shared preview/publication boundary to fence already-approved pre-fix drafts; old snapshots and exact publication receipts remain readable. Regression3cases red-before/green-after;48focused/config/build PASS, final review/full suite pending. No engine or economic values changed. |
