# Scoped configuration controls

Base22320d4. Extend the verified registry service with protected scope/support/source
routes and an admin editor. Existing Google/MFA, role checks, context binding and
idempotent writes remain the authority. No engine/config values or schema change.

- Draft scope, audience, priority, expiry and predecessor are persisted with the exact
  proposal payload; lost acknowledgement freezes all fields across reload.
- Loading/rolling back a scoped version applies only its changed keys onto the latest
  default snapshot. It never silently turns a scoped snapshot into a global rollback.
  A player replacement needs a new persisted ticket. Empty patches withdraw overrides.
- Read-only impact uses the same composition and publication timing as real openings,
  including future expiry validation. Report affected saved players/keys and currently
  persisted open/closing pins; do not claim seven-day faucet/sink or VND forecasts.
- Scope metadata and previous audience/patch are visible before approval and in publish
  confirmation. Scoped approval/publication controls wait for valid impact inspection.
- Support cases use an explicit operator case key; exact retries recover the same ticket.
  Tickets are listed from server storage and their consumed state is visible.
- Player selectors expose only authenticated admin IDs, with pagination. No public actor,
  player membership, ticket, preview total or clock can authorize publication.
- Vietnamese/English native controls,44px targets, keyboard focus, existing mobile layout.

Checks: signed authenticated HTTP role/CSRF/input tests; no writes from impact; masked
keys/audience replacement and pinned counts; scope rollback preserves newer defaults;
real browser publish, lost acknowledgement/reload, metadata inspection, expiry/conflict,
player-ticket workflow and responsive interaction. Existing config/build/tests and
admin/remote browser suites must remain green; independent review before closure.

Remaining: seven-day economic forecasts, automatic segment/cap decision, broader admin/
account acceptance and M6–M9. No ClientID fabrication, public local upload or M9 tuning.

| Date | Change |
|---|---|
| 2026-09-10 | Scope transport/editor and factual impact contract; implementation in progress. |


Review corrections: clear support inputs at the existing protected-identity boundary.
Show predecessor and candidate patches against their own recorded bases, so unrelated
default edits are never presented as scoped changes. The authenticated publish route
requires an impact token for scoped proposals. The shared publication transaction
recomputes its registry revision, activation boundary and before/after resolutions;
stale confirmation is refused and the editor refreshes without automatically publishing.
Exact already-committed retries return the original receipt. Live-pin counts remain
explicitly measured at computedAt; continuously changing shift phases do not freeze
admin publication. Trusted internal calls without UI confirmation retain their API.

| Date | Change |
|---|---|
| 2026-09-10 review correction | Three findings addressed with identity-boundary, overlap/expiry token and replacement-diff regressions; final verification and correction review pending. |


Verified product `a84f41f` (foundation5a4da74):339 engine/server tests,29 focused
admin/scopes,18 admin browser and10 remote-game browser PASS. Config coverage has
zero literal warnings; build/typecheck pass. Full review found the three issues
above; final correction review reports all resolved and no new actionable regression.
No additional engine/sim tuning: unchanged engine/config retain prior10-cohort
k2.4186–2.8738 and15rush evidence. Receipt `.qa/scope-ui-verification.json`.
M4 stays11/18 OPEN. Next full economic previews/admin lifecycle and integrated
account/eligibility/locale acceptance, then M6–M9. No live Google consent claim.

| Date | Change |
|---|---|
| 2026-09-10 verified | a84f41f:339tests,29focused,28browser,config/build PASS; correction review clears all three findings. This scoped-controls slice is complete; full BRD/M4 is still open. |
