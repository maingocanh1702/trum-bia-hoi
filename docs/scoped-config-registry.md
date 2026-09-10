# Scoped Config Registry

Base `8a4f2c6`. Extends the existing immutable proposal/approval/publication pipeline
and actual GameStore opening resolver; engine rules and JSON economy values stay fixed.
Authority: BRD5.2,9.4 and JSON governance. This is the server core; protected HTTP/editor
scope controls and full impact forecasts follow it. Default editor remains usable and lists only default-chain proposals until scope controls are added.

| Interaction | Decision |
|---|---|
| Scope | Default remains the existing chain. Segment/campaign names identify explicit, immutable audiences of existing server player IDs in this slice. No invented newbie/regular/veteran thresholds: automatic classification remains an owner decision. |
| Per-key composition | Apply only paths changed from each proposal's base, never its entire snapshot. Precedence player > campaign > segment > default. Within segment/campaign, explicit integer priority controls overlap; contradictory values at equal priority are refused. |
| Replacement | Latest effective publication per named scope replaces that scope's earlier entry, including its audience. Removed keys retain their original approval/scheduling policy; an empty replacement withdraws the patch. Expiry falls through to less-specific scopes, never resurrects an older entry of the same scope. |
| Audience change | Audience/priority/expiry are immutable proposal data and participate in the idempotency fingerprint and approval. No mutable player-side membership claim or unaudited reassignment. |
| Publication | Same roles, key policy and author daily limit. Only campaign `entitlements.*` has the documented immediate/new-opening exception; mixed keys keep the strictest floor. Game Admin may propose campaign entries, but cannot approve economy keys. Bulk audiences require Super approval; no new publication before its same-scope predecessor. |
| Expiry | Campaign/player require a finite expiresAt after activation. Segment expiry optional. Scope replacement/base drift revalidated at approval/publication; no stale patch can silently replace a newer one. |
| Support | Player scope requires a persisted support ticket for that exact player and Super Admin proposal/approval. Ticket is consumed atomically once at publication; all retries reuse the original receipt. Existing Tier A distinct-author approval remains mandatory. No direct player balance or lifetime/ranking grant occurs. |
| Validation | Shared schema, identity, legal/free-play and heartbeat guards apply to snapshots and merged values. Conflicting/invalid composition refuses a new opening without changing the player's save; no silent default fallback. Publication checks all affected existing audiences at activation/expiry boundaries against already scheduled versions. |
| Snapshot/pin | Stable hash of default and selected override versions names an immutable resolved snapshot with provenance/audit. New opening receives it; an open shift, historical replay and retries retain their prior versions. |
| Persistence | Schema10 adds append-only scope rows, support requests/uses and resolved-snapshot provenance. Default/old registered snapshots keep their meaning. |

Checks: precedence on overlapping/disjoint keys, equal-priority conflicts, audience
replacement, expiry without resurrection, scheduling, stale retries, approval roles,
support-ticket replay, composition rollback, generated-version identity, real old/new
opening, public pinned snapshot, restart/replay and schema9 migration. Existing admin/
game browser checks must remain green. Run config/build/tests and ordinary/rush sim.

## Remaining dependencies

- HTTP and editor controls for scope/audience/priority/expiry/support requests.
- Automatic segment assignment and corresponding daily-cap semantics (owner asked;
  existing engine still uses the newbie cap, so full segment entitlement is not complete).
- Complete impact forecasts, compensation grants, admin lifecycle/account work, M6–M9.
- Google ClientID still absent; no public archive upload or M9 history-volume tuning.

| Date | Change |
|---|---|
| 2026-09-10 | Scoped registry/opening contract before implementation. |

## Implementation checkpoint

Schema10 server core is implemented in `apps/server/src/registry.ts` and the shared
GameStore opening path. Twelve focused cases exercise real persisted scopes, exact
retry after expiry, replacement/removal policy, server openings, public pinned config,
restart/replay and migration. Full build/tests/browser/sim and native review are in
progress. No M4 criterion is promoted by this internal core alone.

## Review correction

Foundation f0246ad received one independent P2: the default next-day floor incorrectly
applied to campaign entitlement keys. The shared policy now considers scope/key;
regression proves short campaigns can publish immediately, mixed day/season and other
scopes cannot bypass their floors, and removing a campaign preserves live-shift pins.
`.qa/scopes-campaign-red.txt` reproduces the failure before correction. Automatic
segment classification/cap semantics remain separate and unimplemented.

| Date | Change |
|---|---|
| 2026-09-10 | Implemented core/removal guards, then corrected campaign entitlement timing against JSON governance and SPEC22; final review pending. |
