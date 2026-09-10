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
