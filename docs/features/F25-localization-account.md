# F25 — Ngôn Ngữ, Tài Khoản & Đăng Nhập (Localization)

> Phase 1+. First-run language choice and account flow. Players can play as guest, but account login is required for durable cloud save and competitive/social surfaces.

> **Current owner decision — 2026-09-10 15:30, Steer #5:** guest keeps stall, coins, upgrades and current day/shift on this device across browser/new-tab visits. Durable player history, achievements, ranking and cross-device restore require a Google account. New Google attaches current progress once; existing Google restores directly. This supersedes the 08:18 fresh-visit interpretation and conflicting historical checkpoints below. See [account modes](../account-modes.md). No guest data-loss warning on leaving.

## 1. Scope

- First-launch language selection: Vietnamese (`vi`) or English (`en`).
- Guest play without login.
- Google sign-in / account creation.
- Prompt guest users to sign in for save, Giải Nhậu, multi-device play, and payments.
- Migrate guest progress into account after sign-in.

## 2. Data model

```ts
type Locale = 'vi' | 'en'

type AuthProvider = 'guest' | 'google'

type PlayerIdentity = {
  playerId: string
  provider: AuthProvider
  email?: string
  displayName?: string
  avatarUrl?: string
  locale: Locale
  createdAt: number
  linkedGuestId?: string
}

type GuestSave = {
  guestId: string
  localCreatedAt: number
  lastSyncedAt?: number
  canMigrate: boolean
}
```

## 3. First-run flow

1. Show language screen before gameplay: `Tiếng Việt` / `English`.
2. Persist selected locale locally immediately.
3. Offer exactly two play modes: play without signing in, or register/sign in with Google.
4. Guest progress lasts for this tab visit only. Reload/reconnect keeps the current visit; a new tab visit starts fresh. Only Google accounts have durable player progress/history/achievements.
5. Show soft sign-in prompt after first session close and when opening Giải Nhậu/cloud/social/payment surfaces.

## 4. Login flow

- `Sign in with Google` creates or links account.
- A new Google account attaches the current guest visit once without interrupting its shift.
- An existing Google account restores its saved progress directly; do not show an extra "Google stall/current stall" choice or merge guest totals.
- Signing in identifies an account, never a different type of stall. Historical local archives retain their separate recovery/export path.

## 5. Access rules

Guest can:

- play local/free session;
- see basic tutorial;
- keep local progress on same device;
- donate (Mời Bia Hơi) as support; cosmetic thank-you gift requires an account. Nothing in the game is sold for money.

Logged-in account can:

- cloud save and restore;
- appear on Giải Nhậu/Dạo Phố;
- send gifts/referrals;
- donate (Mời Bia Hơi) and claim the cosmetic thank-you gift (F20); nothing else is sold.
- use support/appeal flows.

## 6. Localization rules

- All user-facing strings use translation keys.
- Default locale: browser language if `vi` or `en`, otherwise `vi`.
- Locale can be changed in settings any time.
- Numeric/currency formatting follows locale, but game currency remains `xu`.
- Content fallback: missing `en` key falls back to `vi` and logs `i18n_missing_key`.

## 7. UI copy surfaces

- First-run language screen.
- Guest badge in profile/settings.
- Sign-in prompt after closing first shift: save progress, đua top, chơi đa thiết bị.
- Giải Nhậu lock prompt for guests.
- Donation-gift prompt for guests (support is possible without login; gift needs an account).

## 8. API

- `POST /auth/session`
- `POST /auth/google`
- `POST /auth/guest/claim`
- `POST /player/locale`
- `GET /player/state`

## 9. Analytics

- `locale_selected {locale, source}`
- `guest_started`
- `login_prompt_seen {surface}`
- `google_login_started`
- `google_login_succeeded`
- `guest_claimed {guestAgeDays, progressValue}`
- `i18n_missing_key {key, locale}`

## 10. Acceptance

- **Sign-in mid-shift (owner 2026-09-08, corrected 2026-09-10):** a new Google account attaches the current guest visit without reload, lost tick or duplicate credit; account menus pause until closed and pending verification settles. An existing Google account restores its own saved progress directly, without merging the current guest visit. Historical local archives keep the separately tracked one-time import/review path.
- Guest play is unrestricted for core gameplay; sign-in prompts state exactly three benefits (save progress · achievements · compete on the leaderboard) and respect `onboarding.loginPrompt.cooldownShifts`.

- User can start first session without login.
- User must choose or accept a locale before first gameplay screen.
- Locale switch updates UI without corrupting save.
- The current guest visit attaches exactly once to a new Google account; existing Google accounts restore their own progress without merging.
- Guest cannot enter Giải Nhậu ranking write path or claim a donation gift.


## Implementation checkpoint — 2026-09-09

The owner confirmed there is no Google Web Client ID yet. Configuration preparation
is documented in [Google setup](../google-signin-setup.md). Guest-cookie ownership is
implemented in the M4 HTTP backend, but the web app still uses local saves. Google
verification, one-time guest claim, conflict handling and cloud UI are unfinished;
no account/login success is simulated. Other server/registry/reconnect work continues.

| Date | Change |
|---|---|
| 2026-09-09 | Recorded missing Google Client ID and setup guide; reviewed guest HTTP foundation exists, full F25 acceptance remains open. |


## Google verification prerequisite — 2026-09-10

`apps/server/src/google.ts` now verifies ID tokens through the official
`google-auth-library`, with a configured Web Client ID, strict expiry/claim shape,
matching request nonce and authorized party. The result contains only Google's
immutable `sub`; email is never an account lookup key. Certificate IO is bounded,
SDK errors are sanitized, and missing configuration returns unavailable.

This module does not create a session or expose a successful login endpoint yet.
The next account transaction must bind/consume a one-use nonce with the durable
cookie, then link the verified provider. Guest claim, conflict handling, local-save
provenance and uninterrupted web cutover remain unfinished. Owner still has no
Client ID; no real Google login has been claimed. Five checks exercise real RSA
signatures and the SDK through a local HTTP certificate service, including rotation,
wrong claims, timeout and safe error output. Full checks/review are in progress.

| Date | Change |
|---|---|
| 2026-09-10 | Added bounded Google token verifier prerequisite and real-signature checks; no session/claim/UI activation or change to F25 acceptance. |

## Owner decision — reviewed local history for ranking (2026-09-10)

Owner selected **“Duyệt lịch sử local rồi mới tính”**. Local progress must be
preserved on account migration. Imported local history is not automatically trusted
for competitive credit just because deterministic replay succeeds: it stays pending
review. Only server-recorded approval may make that history count toward ranking;
a reviewed archive must be credited at most once. Do not silently replace this policy
with counting only income after sign-in, discard the guest's history, or grant ranking
credit from a client-supplied approval flag. The review/approval and migration paths
still need implementation; this records the owner's decision, not delivered behavior.

| Date | Change |
|---|---|
| 2026-09-10 owner | Chose review of imported local history before ranking credit, while preserving all local progress; approval and exactly-once credit remain required implementation. |

| 2026-09-10 verification correction | Native review found SDK11 also accepts googleapis.com as issuer. The wrapper now allows only accounts.google.com / https://accounts.google.com; a signed-token regression fails before the fix and passes after it. Config/build and255engine/server checks pass; final correction review pending. |

| 2026-09-10 verified |917f862 passes config/build/255tests; independent correction review resolves issuer finding with no remaining introduced defect. Google verification prerequisite only; session/account/claim/UI still to implement. |


## Server Google sessions — 2026-09-10 (review in progress)

Schema4 adds unique Google-subject/player mappings, one-use session-bound challenges
and append-only login audit rows. New Google subjects attach an existing authoritative
server guest without renaming its player ID or replaying/copying progress. Linking
revokes all former guest credentials; a successful transaction returns a fresh cookie.
Existing accounts keep their immutable history. A different current player receives
409accountConflict; explicit keepAccount switches to the existing account without
merging or overwriting either history. Signing into a new Google subject while
already in another account requires logout first. Revocation/expiry/nonce replacement
while verification awaits cannot be bypassed at transaction commit.

POST/auth/google/challenge and POST/auth/google are available only with configured
TBH_GOOGLE_CLIENT_ID. POST/auth/session reports canonical provider; explicit logout
also clears invalid/expired cookies. Auth transactions record previous/new hashed
session and action, so links/switches remain auditable. The API does not accept local
worlds, clocks, subjects or approval flags. Local import/review, profile/locale/cloud UI
and uninterrupted web sign-in still need implementation. Owner has no real Client ID.

264engine/server tests, config/build and actual launcher configuration/restart checks
pass. Tests include real RSA/SDK/HTTP authentication, SQLite migration/rollback/two
connections, preserved mid-shift receipts, conflicts, CSRF and in-flight logout/expiry.
Independent code/security review is pending; this is not full F25 completion.

| Date | Change |
|---|---|
| 2026-09-10 server account | Implemented optional Google HTTP sessions and schema4 transactional identity/challenge/audit; local history approval and web cutover remain separate required work. |


## Verified Google server account checkpoint — 2026-09-10

`ebe820c` (base `b42c034`) passes config/build/typecheck,264engine/server tests,
14focused auth checks and actual CLI disabled/configured challenge/restart smoke.
Native independent code/security review found no actionable introduced defect and
passed6account/store tests; reviewer HTTP reruns were sandbox-blocked, while author
actual signed-token SDK/HTTP checks pass. Receipt: `.qa/google-session-verification.json`.
No real Google Client ID or live login, local archive import/review, cloud UI or web
cutover is claimed. Preserve completed91browser/80MB verification; those files did
not change. Full game remains20features in progress,0complete.

| Date | Change |
|---|---|
| 2026-09-10 verified Google sessions | Closed code/security review for ebe820c with no introduced findings;264tests/config/build/CLI pass. Local import, owner-required review eligibility and web integration remain required. |


## Local archive claim core — 2026-09-10 (review pending)

Schema5 internal `GameStore.claimLocal` preserves source IDs, the live shift and
full original archive. Known-config worker replay, one import/account, conflict refusal
and atomic cookie/account transition are implemented. Exact retries return a receipt;
logout/expiry/new gameplay during validation refuse. History remains pending review.
No HTTP upload, approval or cloud UI is active. Details: [server guide](../../apps/server/README.md).
271tests/config/build and80MB exact import/reopen/continuation pass; native review pending.

| Date | Change |
|---|---|
| 2026-09-10 local claim core | Added worker-validated one-time archive import with immutable pending provenance and atomic identity/session transition;271tests/config/build and80MB probe pass. No public upload/review approval/web cutover yet; performance limits are measured and remain open. |


| Date | Change |
|---|---|
| 2026-09-10 verified local claim core |51a0734 passes271tests/config/build and80MB exact import/reopen/retry; native independent code/security review found no actionable introduced defect. `.qa/local-import-verification.json`. Imported history remains pending approval; public upload, cold-read performance and web cutover remain unfinished. |

## First-run language implementation — 2026-09-10

The existing welcome now gates local/remote boot until a vi/en choice is accepted.
Browser language suggests vi/en (otherwise vi); selecting persists immediately.
Legacy welcomed settings retain their previous valid locale, with omitted locale
meaning the old Vietnamese default. Preference storage failure keeps a retryable
entry without creating a player. No account/claim/competitive behavior is implied.
See [first-run contract](../first-run-locale.md); verification/review are in progress.

| Date | Change |
|---|---|
| 2026-09-10 language entry | Moved welcome before boot and added explicit locale acceptance; full F25 and M4 acceptance remain open pending checks and remaining account flows. |

| 2026-09-10 locale verified | 5871453 passes350engine/server,3final presentation,91local/21remote/19admin browser,config/build and native independent review. First-run locale acceptance PASS, including no pre-accept player creation and preserved legacy/live-shift identity; F25 still in progress for Google web, configured login prompts, claim/conflict and eligibility. Evidence: .qa/locale-entry-verification.json. |

## Google guest-link transport checkpoint — 2026-09-10

`RemoteGame` now retains the server identity and exposes challenge/link handoff.
Queued commands finish before cookie rotation; a same-player session is reconciled
without resetting the journal or live shift. Reconciliation renews the existing
nonce before trusting guest status, preventing a still-verifying old request from
committing afterward. Stored Google accounts with another save return conflict;
this layer does not switch, merge or overwrite. See [transport contract](../google-web-link.md).

| Date | Change |
|---|---|
| 2026-09-10 Google transport verified | 3c369aa passes351engine/server,33remote browser (12link cases),config/build/typecheck. Independent full-base review has no actionable findings after two reconciliation fixes. Evidence .qa/google-link-verification.json. Google panel, explicit save choice/recovery, invitations and eligibility remain; F25 in progress and M4 unchanged12/18 OPEN. No new server auth runtime/endpoint, local upload or live Google configuration. |

## Google panel checkpoint — 2026-09-10

Settings now exposes a VI/EN account sheet and the configured Google button.
A same-player link preserves the current shift/outbox/history; authentication and
reconciliation keep menu pause through completion. Exactly three benefits are
shown. A callback is consumed once even after failure; explicit retry starts a
fresh challenge. Existing-account conflicts preserve both stalls. Local saves
remain local with backup export available. See [panel contract](../google-account-panel.md).

| Date | Change |
|---|---|
| 2026-09-10 Google panel verified | e5745af:351engine/server,92local/44remote/19admin browser, final local1/1,config/build PASS. Native full-base correction review reports no findings. Signed HTTP/SDK fixtures cover mid-shift link and stale/duplicate callbacks; live Client ID/consent still absent. Explicit save choice/recovery, configured invitations/cooldown and competitive eligibility remain. F25 in progress; M4 unchanged12/18 OPEN. Receipt .qa/account-panel-verification.json. |

## Owner correction — two play modes, 2026-09-10

The owner explicitly replaces the extra save-choice model. See [account modes](../account-modes.md) for current decisions and operational-audit versus player-history boundaries. Guest core gameplay is unchanged; durable guest resume and the earlier conflict-screen requirement above are superseded. Existing Google progress is restored on sign-in; new accounts attach the current visit. No local archive is deleted and no live Google consent is claimed.

| Date | Change |
|---|---|
| 2026-09-10 two modes | Replace sections 3/4 with the owner correction: play without signing in (no durable history/achievements) or register/sign in with a Google account; remove the extra stall choice. Preserve same-visit reconnect, menu pause and server authority. |

## Two-mode acceptance checkpoint — 2026-09-10

`8c9dc64` implements the owner's two-mode correction in both languages. The current
server guest attaches exactly once to a new Google account: live shift, history,
coins and command receipts persist through linking/reload/server restart; duplicate
callbacks and retries cannot grant again. This individual F25 criterion is PASS.
Existing Google progress restores directly; new guest visits cannot resume an old
career. Known former guest credentials recover only fresh anonymous state; historical
Google credentials remain protected even after local import moves their mapping.
Receipt `.qa/account-modes-verification.json`:353unit baseline, final34server/import
and22account browser, remote62 +bootstrap3; local92/admin19 covered with recorded
isolated reruns; config/build and final independent full-base review CLEAN.
Live Google Client ID/consent, expired Google reauthentication, configured invitations,
eligibility and historical local upload/approval remain separate gaps. F25 stays open;
M4 now13/18. Internal audit/archive retention is not durable guest player history.

| Date | Change |
|---|---|
| 2026-09-10 two modes verified | 8c9dc64 verifies owner correction and exactly-once current-guest attachment; updates §10 to distinguish new-account attachment from existing-account restore. E18 records complete evidence and all review corrections; F25 OPEN, M4 13/18. No live consent or economy change claimed. |

## Reauthentication checkpoint — 2026-09-10

`ddc77a9` closes the expired/revoked/missing-cookie recovery gap. The sign-in button
is available on failed boot and live invalid-session status; recovery reuses Account,
nonce-bound Google verification and the original command journal. The verified
subject must own its existing retained player ID; a client-supplied ID only narrows
that transaction. Temporary guest cookies never authorize retained-world commands.
Lost service receipts recover once, including commands not yet processed. A matching
canonical session after response loss resumes without another Google consent. Lost auth
headers retry without leaving the panel; reload, cancellation and native lock pass.
See [contract](../google-reauthentication.md) and `.qa/reauth-verification.json`:
354unit/server, final35API/import,72remote/1local browser, config/build and native
review PASS. F25 and M4 (13/18) remain OPEN for configured invitations/cooldown,
live Google/minute5 acceptance, historical import and competitive access checks.

| Date | Change |
|---|---|
| 2026-09-10 reauthentication verified | ddc77a9 adds reviewed exact-account recovery without discarding queued commands; E19 records evidence. No expired credential revival, engine/economy change or whole F25 completion claimed. |

| 2026-09-10 invitations | Optional first-shift/season-entry invitations now share a player-keyed `loginPrompt.cooldownShifts` preference and exactly three benefits; explicit account access remains available. Native departure warning opens the invitation only if the guest stays; generic text/reload/mobile limitations are recorded in [login-invitations](../login-invitations.md). Current owner decision supersedes durable guest reopen and merging into an existing Google account: new Google claims this visit once, existing Google restores its own saved progress. Verification remains pending until the slice receipt. |

| 2026-09-10 15:30 Steer #5 | Owner restores guest device persistence across new tabs/browser reopen; keep writer lock/exact-session guard and Google attach/restore. Account-only durable history, achievements, ranking and cross-device restore remain. Supersedes 08:18 and prior ephemeral-guest interpretation; guest departure upsell removed. See account-modes.md and current receipt for verification. |
