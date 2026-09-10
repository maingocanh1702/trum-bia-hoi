# F25 — Ngôn Ngữ, Tài Khoản & Đăng Nhập (Localization)

> Phase 1+. First-run language choice and account flow. Players can play as guest, but account login is required for durable cloud save and competitive/social surfaces.

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
3. Create guest profile by default.
4. Let user start playing without account.
5. Show soft sign-in prompt after first session close and when opening Giải Nhậu/cloud/social/payment surfaces.

## 4. Login flow

- `Sign in with Google` creates or links account.
- If current user is guest with progress, server offers `Claim guest progress`.
- Migration is one-way: guest save merges into account, guest id becomes linked/retired.
- If Google account already has progress, show conflict screen:
  - keep account progress;
  - overwrite only if account has no meaningful progress;
  - support path for edge cases.

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

- **Sign-in mid-shift (owner 2026-09-08, F27 §1.2):** signing in with Google while a shift is running never interrupts the shift (no reload, no lost tick); the running shift and all progress before it attach to the account at once; the local `eventLog` since shift start is uploaded so no serve is counted twice (`idempotencyKey`); before the server exists the local save simply gains `accountId`.
- Guest play is unrestricted for core gameplay; sign-in prompts state exactly three benefits (save progress · achievements · compete on the leaderboard) and respect `onboarding.loginPrompt.cooldownShifts`.

- User can start first session without login.
- User must choose or accept a locale before first gameplay screen.
- Locale switch updates UI without corrupting save.
- Guest progress migrates once into Google account.
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
