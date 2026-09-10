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
| Remaining | Observed donation/VND forecasts, lifecycle labels, emergency/compensation and admin enrollment/recovery remain explicit follow-up work. Coin forecasts, scopes and version comparison are implemented; see dated verification below. No fake forecast values or live Google setup claim. |

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

`npx playwright test --config playwright.admin.config.ts` runs eleven scenarios on
isolated ports4181–4183 and a temporary SQLite database/private test directory. It
covers actual signed-token/TOTP auth, old/new player pins, one-key editing and diff,
publication confirmation/focus, distinct Tier A approval/scheduling, audit, readonly
roles, lost ACK/reload/retry, identity change, stale base, invalid JSON, storage failure,
expiry and corrupt-draft recovery. The test-only signer is never in a production entry.

321 engine/server tests, eleven admin browser scenarios and ten remote-game browser
scenarios pass; config has zero warnings and build/typecheck pass. Mobile/desktop
captures are `.qa/admin-editor-mobile.png` and `.qa/admin-editor-desktop.png`.
No engine/config values changed; prior registry k2.4186–2.8738/15rush evidence applies.
Final independent review at56a0a44 is CLEAN; typecheck and diff-check passed independently. Reviewer config execution was blocked by tsx IPC EPERM; host config passed. Full M4 remains open (11/18).

| 2026-09-10 implementation | Browser `/admin`, session-bound requests, durable author draft/retry, JSON key/import/diff, approval/publication/rollback and audit implemented. Host checks pass; independent review pending. |

| 2026-09-10 self-review correction | Independent review of3d5513e found no actionable defects and typecheck passed (reviewer HTTP sockets blocked by EPERM). Two additional host regressions reproduced a post-receipt read failure resurrecting a draft and stale selected-value buffers after JSON import. Narrowed retry handling to the proposal POST and resynchronized the buffer from draft JSON; final10browser checks/config/build pass; correction review pending. |

| 2026-09-10 correction review | Review found P2 identical-text imports skipped the effect and retained an unapplied field edit. Snapshot replacement now explicitly synchronizes the selected buffer even when text is unchanged. New/rollback draft, JSON textarea/import and restored draft all synchronize; selecting a path reads its current value. Reason/effective edits retain the buffer; discard/session-clear resets it. Added identical-backup regression; verification/re-review pending. |

| 2026-09-10 verified |56a0a44:321engine/server,11admin/10remote browser, final config/build PASS. Correction review CLEAN; typecheck/diff-check passed independently. Known receipt and all snapshot replacements preserve intended draft state. M4 one-key/effectiveAt criterion PASS (11/18 overall); receipt `.qa/admin-editor-verification.json`. |

| 2026-09-10 admin history/review verified | E24 at85fbdfb: protected imported-prefix pages, Support read-only and MFA Game/Super approval/flags, per-operator exact retries and identity cleanup.378unit/server +24admin browser, final5 affected browser/config/build/review PASS. See [E24 evidence](competitive-eligibility.md#admin-historyreview-closure--e24-2026-09-10); public rank/snapshot and full M4/F28 remain open. |

## Arbitrary version comparison intake — 2026-09-10

Base `fdda260`; BRD §5.2.5 requires comparison of any two stored versions.
Reuse the protected `/admin/config` reads and the existing raw/scaled diff viewer.
Both inputs accept exact version IDs, including drafts, published and historical
snapshots. Labels bind the result to the fetched pair; changing either input
clears the old result. Scopes are displayed separately: a stored snapshot diff is
not a player-effective configuration forecast. Read-only roles may compare.
No draft mutation, publication, engine/economy change or new API is required.

The shared diff must include the union of old/new paths so removed keys are not
hidden; each snapshot uses its own recorded k for scaled values. A changed or
expired admin context clears protected comparison data, including changes during
an outstanding read. Tests cover sibling versions, reverse/identical comparisons,
legacy removed groups, read-only access, failed reads and identity changes.
This is independent of the pending emergency schedule-policy decision.

| 2026-09-10 comparison intake | Recorded bounded arbitrary-version comparison and shared diff correction; implementation/verification pending. M4 remains15/18 OPEN. |

| 2026-09-10 comparison implementation | 61e68d5 implements arbitrary snapshot pairs, removed paths and per-version scaling;386unit/config/build pass. Full admin run26/27: new MFA test consumed the existing Tier A actor code. Dedicated test actor fixes isolation; production MFA unchanged. Review found only stale status documentation, corrected here and in tracker. Mobile scope details are collapsed for readable diffs; final verification/review pending. |

## Version comparison closure — E26

`61e68d5` + `62e8646` (base `fdda260`) complete BRD §5.2.5 arbitrary stored
version pairs. Viewer can compare sibling drafts, published or historical snapshots
through the existing protected reads. Union paths include removals; Base values use
each version's own k. Editing either ID clears the old result; failed reads or an
identity change during loading cannot restore it. Existing author drafts survive.
Native scope disclosure keeps both VI/EN portrait comparisons readable.

Verification: **386/386 engine/server,27/27 admin browser, config and build/typecheck
PASS**. The initial full browser26/27 failure was test-only reuse of a protected
single-use OTP; a dedicated new-test actor fixed isolation without changing MFA.
The initial review's documentation finding is resolved; final full-base independent
review is **CLEAN** in `.qa/review-admin-compare-final.txt`. Receipt:
`.qa/admin-compare-verification.json`; both390px language captures inspected.
Engine, server runtime, schemas and economy JSON are unchanged; no new k sim.
M4 remains15/18 OPEN. Emergency scheduling awaits the owner's separate decision.

| 2026-09-10 comparison verified | E26 at62e8646:386unit/server,27admin browser,config/build and final independent review CLEAN. Arbitrary-pair BRD item complete; full M4 remains open. |
