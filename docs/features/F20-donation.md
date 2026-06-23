# F20 — Mời Bia Hơi (Donation)

> Phase 4. Monetization as supporter donation with cosmetic-only thank-you gifts. No coins, no power, no ranking advantage.

## 1. Scope

- Mời Bia Hơi intent creation.
- Manual/automatic payment confirmation depending provider.
- Cosmetic gift selection.
- Receipt/support state.

## 2. Non-negotiable rules

- Do not sell coins.
- Do not sell gameplay unlocks, `Kết Nối`, VIP table, Giải Nhậu points, Đường Lên Trùm progress, or boosts.
- Mời Bia Hơi gifts are cosmetic-only: lồng đèn, cây cảnh, biển hiệu, cờ/theme Vụ Bia.
- Payment does not affect `seasonEarned`, `lifetimeEarned`, matchmaking, spawn, tip, or cap.

## 3. Data model

```ts
type DonationTier = 'coffee_20k' | 'round_50k'

type DonationIntent = {
  id: string
  playerId: string
  tier: DonationTier
  amountVnd: number
  status: 'pending' | 'paid' | 'expired' | 'refunded'
  createdAt: number
  paidAt?: number
  selectedGiftId?: string
}

type CosmeticGift = {
  id: string
  kind: 'lantern' | 'plant' | 'sign' | 'flag' | 'theme'
  quantity: number
  cosmeticOnly: true
}
```

## 4. Flow

1. Player opens "Mời Bia Hơi".
2. Select tier.
3. Server creates intent and payment instructions/QR.
4. Payment confirmed.
5. Player chooses one gift from tier catalog.
6. Server grants cosmetic inventory item.

If payment provider is manual bank transfer, status can be admin-confirmed. Client must handle pending gracefully.

## 5. Gift catalog

- 20k: choose one small cosmetic bundle.
- 50k: choose larger cosmetic bundle or Vụ Bia cosmetic pack.
- Catalog is server-driven so campaigns can rotate.

## 6. UI

- Copy frames Mời Bia Hơi as support, not advantage.
- Show "không bán xu / không bán sức mạnh" plainly.
- Gift preview shows only visual placement.
- Pending payment state includes support contact.

## 7. Analytics

- `donation_opened`
- `donation_intent_created {tier}`
- `donation_paid {tier}`
- `donation_gift_claimed {giftId}`

## 8. Acceptance

- Mời Bia Hơi grant changes cosmetic inventory only.
- No gameplay system reads donation state except cosmetic rendering.
- Pending/failed payment never grants gift.
- Gift claim is idempotent.
