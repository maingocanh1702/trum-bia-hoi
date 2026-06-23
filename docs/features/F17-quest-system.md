# F17 — Nhiệm Vụ Quán Nhậu (Quest System)

> Phase 2-3. Nhiệm vụ ngày/ca/tặng quà/điểm danh/referral/Đường Lên Trùm. Rewards support retention without inflating Giải Nhậu.

## 1. Scope

- Daily 5 missions: 3 randomized core + 2 fixed.
- Shift milestone.
- Gift mission.
- Attendance/sign-in.
- Referral and Đường Lên Trùm hooks.

## 2. Data model

```ts
type QuestType = 'daily' | 'shift' | 'gift' | 'attendance' | 'referral' | 'sign_in' | 'life_path'

type Quest = {
  id: string
  type: QuestType
  bucket?: string
  target: number
  progress: number
  reward: Reward[]
  state: 'active' | 'claimable' | 'claimed' | 'expired'
  seedKey: string
}
```

## 3. Daily generation

- Seed by VN date + player tier.
- 3 core buckets:
  - service: serve N customers / serve N beers / complete N table orders.
  - quality: perfect tip N times / no stale beer N times.
  - risk/flow: zero_loss window / survive Giờ Vàng / no customer left.
- 2 fixed:
  - complete 3 shifts.
  - send gifts to 3 unique recipients.
- Targets scale by tier with `pm()` curve; keep variety by increasing pool size.

## 4. Rewards

- Rewards: small coins, reputation, materials, tờ rơi, Mảnh Huy Hiệu.
- Quest rewards do not count toward `seasonEarned` or Đường Lên Trùm unless explicitly configured.
- Completing all 3 daily core slots gives bonus tờ rơi + Mảnh Huy Hiệu.

## 5. Progress events

Gameplay emits domain events; quest system listens:

- `customer_served`
- `order_served`
- `shift_closed`
- `rush_ended`
- `gift_sent`
- `referral_qualified`
- `life_path_level_reached`

## 6. Gift anti-farm

- Count unique recipients only.
- Limit sends/receives per day.
- Only one unread gift per sender-recipient pair.
- Materials transfer, not minted, unless using explicit gift reward item.

## 7. UI

- Daily mission panel has compact progress and claim.
- End-shift summary highlights max 1-2 recommended missions.
- Attendance ladder shows day streak and next reward.

## 8. Analytics

- `quest_generated {type, bucket, target}`
- `quest_progressed {questId, progress}`
- `quest_claimed {questId, rewardValue}`
- `gift_sent {recipientId, itemType}`

## 9. Acceptance

- Daily set is deterministic for same day/player seed.
- Quest reward never changes `seasonEarned`.
- Gift mission cannot be completed by sending 3 gifts to same person.
- Expired quests cannot be claimed.
