# F26 — Vé Mở Ca & Thanh Toán (Daily Session Pass)

> Phase 3+. Access monetization. Free users can play 1 ca/day; paying users can unlock the normal daily ca allowance for that day or entitlement period. This sells play access, not coins/power.

## 1. Scope

- Free daily ca limit: 1 completed/started ca per VN day.
- Paid Vé Mở Ca unlocks all remaining ca allowed by the normal daily cap.
- Payment checkout for logged-in users.
- Entitlement enforcement server-side.
- Clear prompts from session gate.

## 2. Product rule

Base game has a normal daily cap from GDD (`8/6/5` sessions depending player segment). F26 adds an access layer:

- Free entitlement: `freeSessionsPerDay = 1`.
- Paid entitlement: can play up to normal cap for that day/period.
- Paid users still obey stamina, daily coin cap, anti-cheat, and all economy rules.
- No direct coins, materials, upgrades, Giải Nhậu points, or Đường Lên Trùm progress are sold.

This is **pay-for-access** and will affect competitive volume. Giải Nhậu copy must be honest: top competition assumes players may have paid access.

## 3. Data model

```ts
type EntitlementKind = 'free_daily' | 'daily_session_pass'

type SessionEntitlement = {
  playerId: string
  kind: EntitlementKind
  dayBucket: string
  maxSessions: number
  usedSessions: number
  source: 'free' | 'purchase' | 'promo' | 'admin'
  expiresAt: number
}

type PaymentIntent = {
  id: string
  playerId: string
  productId: string
  provider: 'stripe' | 'iap' | 'manual' | 'mock'
  amount: number
  currency: 'VND' | 'USD'
  status: 'created' | 'paid' | 'failed' | 'expired' | 'refunded'
  entitlementGranted?: boolean
}

type SessionPassProduct = {
  id: string
  labelKey: string
  durationDays: number
  price: { amount: number; currency: 'VND' | 'USD' }
  unlocks: 'normal_daily_cap'
}
```

## 4. Products

Initial catalog:

| Product | Duration | Unlock | Notes |
|---|--:|---|---|
| `day_pass` | 1 VN day | normal daily cap | "Vé Mở Ca Ngày" |
| `week_pass` | 7 VN days | normal daily cap each day | "Vé Mở Ca Tuần" |

Prices are server-driven and can vary by locale/provider. Do not hardcode client prices.

## 5. Session gate flow

1. Player taps `Start shift`.
2. Server checks account/session entitlement.
3. If guest: allow first free session, then show login + pass prompt.
4. If logged-in free and used 1 session today: block start and show pass offer.
5. If paid entitlement active and used sessions < normal cap: allow.
6. On shift start, increment `usedSessions` server-side. If shift fails to initialize, rollback.

## 6. Checkout flow

1. Logged-in player selects pass.
2. Server creates `PaymentIntent`.
3. Client completes provider checkout.
4. Provider webhook/server confirmation marks `paid`.
5. Server grants entitlement atomically.
6. Client refreshes gate and can start remaining sessions.

Guest users must sign in before checkout so purchases attach to an account.

## 7. Refund/edge cases

- Refunded payment revokes future entitlement; do not claw back already-played legitimate sessions unless fraud.
- Payment confirmed twice must not grant twice.
- Day bucket uses VN timezone.
- If user buys after using free session, paid entitlement grants remaining sessions up to normal cap for that day.
- If normal cap changes by segment, entitlement resolves max sessions at day start or purchase time and stores it.

## 8. UI

- Session gate shows: ca used today, free limit, paid unlock.
- Prompt copy: "Đăng nhập để lưu tiến trình, đua top, và mở khóa thêm ca trong ngày."
- Payment screen must state that pass unlocks sessions only, not coins or power.
- End of first free session shows soft prompt, not a dark pattern.

## 9. API

- `GET /entitlements/session-pass`
- `POST /billing/session-pass/create`
- `POST /billing/webhook/{provider}`
- `POST /shift/start` checks entitlement

## 10. Analytics

- `session_gate_seen {usedSessions, maxSessions, entitlementKind}`
- `session_gate_blocked {reason}`
- `session_pass_offer_seen {surface}`
- `payment_intent_created {productId, amount, currency}`
- `payment_succeeded {productId}`
- `session_pass_granted {productId, expiresAt}`
- `session_started {entitlementKind, usedSessions}`

## 11. Acceptance

- Free player cannot start session #2 in the same VN day.
- Paid player can start remaining sessions up to normal cap, but not beyond cap.
- Guest cannot purchase until signed in.
- Payment webhook is idempotent.
- Vé Mở Ca purchase never grants coins/materials/Giải Nhậu points directly.
