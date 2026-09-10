# Admin browser editor

Base `988fc33`. Separate `/admin` route uses the existing Google/TOTP and registry API.
No player boot, cookie creation, world tick or game-storage write occurs on this route.
Uses the existing VI/EN copy system, palette, native forms/dialogs and 44px controls.

| Interaction | Decision |
|---|---|
| Login | Explicit GIS button with server nonce/clientId; callback credential goes directly to server, never to storage. Independent Authenticator input follows when required. Missing setup remains unavailable. |
| Session changes | Requests bind to the opaque admin context returned by authentication. Registry writes require a matching context after body IO, so a cookie/account switch in another tab cannot change the acting admin silently. Server still derives every permission. |
| Draft | Full JSON snapshot, baseVersion, reason and idempotency key are saved in this tab's sessionStorage with their author's subject. Storage failure blocks submission, retaining text for export. Logout discards this tab's draft; other identities cannot adopt it. |
| Editing | Search existing JSON paths, edit primitive/table values or import complete JSON. Metadata/prototype fields stay outside the key editor. Shared loadConfig validates and provides actual scaled values; server validation remains authoritative. |
| Review | Actual old/new raw and scaled values; select historical versions or draft versions. Immutable draft creation, approval and publication are distinct actions. Publish confirms the exact displayed version. |
| Conflict/retry | Preserve request key through a lost response. Stale base is surfaced; importing edits against a refreshed base is deliberate, never automatic overwrite. |
| Authentication failure | Clear protected views; keep only the original author's pending draft for reauthentication. Credential expiry/factor errors have distinct messages. |
| Remaining | Full forecasts, scoped overrides, emergency workflow and admin enrollment/recovery remain explicit follow-up work. No fake forecast values or live Google setup claim. |

Browser acceptance uses an isolated signer/certificate service and actual server
Google SDK, TOTP and SQLite. GIS popup rendering may be replaced in the test browser;
this is not evidence of live Google consent with a real Client ID.

| Date | Change |
|---|---|
| 2026-09-10 | Editor/auth/browser contract and context-switch decision before implementation. |

## Use and verification

Run the existing server with `TBH_GOOGLE_CLIENT_ID` and `TBH_ADMIN_ACCOUNTS_FILE`
as described in [admin authentication](admin-auth.md), then open `/admin` on the
same web origin. The route loads its own chunk and never mounts the player App.
Google uses the official [GIS JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference):
server nonce, popup credential callback, and server verification before the independent
Authenticator step. No Client Secret or browser-owned role is used.

Registry POST requests now require `X-TBH-Admin-Context` from `GET /admin/auth`.
This opaque cookie digest binds confirmation to a session; it cannot authenticate
without the separate HttpOnly cookie. A mismatched supplied context also rejects reads.

`npx playwright test --config playwright.admin.config.ts` runs eight scenarios on
isolated ports4181–4183 and a temporary SQLite database/private test directory. It
covers actual signed-token/TOTP auth, old/new player pins, one-key editing and diff,
publication confirmation/focus, distinct Tier A approval/scheduling, audit, readonly
roles, lost ACK/reload/retry, identity change, stale base, invalid JSON, storage failure,
expiry and corrupt-draft recovery. The test-only signer is never in a production entry.

321 engine/server tests, eight admin browser scenarios and ten remote-game browser
scenarios pass; config has zero warnings and build/typecheck pass. Mobile/desktop
captures are `.qa/admin-editor-mobile.png` and `.qa/admin-editor-desktop.png`.
No engine/config values changed; prior registry k2.4186–2.8738/15rush evidence applies.
Independent code review is pending. Full M4 remains open.

| 2026-09-10 implementation | Browser `/admin`, session-bound requests, durable author draft/retry, JSON key/import/diff, approval/publication/rollback and audit implemented. Host checks pass; independent review pending. |
