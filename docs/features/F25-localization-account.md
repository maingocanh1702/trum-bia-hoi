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
- buy nothing with real money.

Logged-in account can:

- cloud save and restore;
- appear on Giải Nhậu/Dạo Phố;
- send gifts/referrals;
- buy session pass/payment items;
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
- Payment lock prompt for guests.

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

- User can start first session without login.
- User must choose or accept a locale before first gameplay screen.
- Locale switch updates UI without corrupting save.
- Guest progress migrates once into Google account.
- Guest cannot enter Giải Nhậu ranking write path or payment checkout.
