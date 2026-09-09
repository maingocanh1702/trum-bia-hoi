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
  - service: serve N customers / serve N beers / serve N snack portions / complete N table orders.
  - quality: perfect tip N times / earn coins from service / no stale beer N times.
  - risk/flow: zero_loss window / survive Giờ Vàng / finish a shift with VIP service and no lost VIP.
- 2 fixed:
  - complete 3 shifts.
  - send gifts to 3 unique recipients.
- Targets scale by tier with `pm()` curve; keep variety by increasing pool size.

## 4. Rewards

- Rewards: small coins, reputation, materials, tờ rơi, Mảnh Huy Hiệu.
- Quest rewards do not count toward `seasonEarned` or Đường Lên Trùm unless explicitly configured.
- Completing all 5 daily slots (3 core + 2 fixed) gives bonus tờ rơi + Mảnh Huy Hiệu, as defined by `quests.daily.bonusAll5`. Claiming each individual reward is not a prerequisite.

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


## 10. Local rules12 contract (2026-09-09)

Runtime uses the exact pool in `docs/config/economy.tbh.json`, not the held content
bank. Targets are `ceil(targetCurve)` (the first reachable integer count); the
`earn_coins_base` curve is multiplied by k before that ceiling. Reward Base fields
use the shared loader's `round(Base * k)` once. The curve's existing numeric grammar
is validated and decoded without evaluating code. No balance numbers change.

The daily set begins on the first current-rules shift opening, stays pinned even if
seasonEarned changes tier, and expires at 00:00 Asia/Ho_Chi_Minh. Tier is the highest
current `league.tiers` counted-season threshold, not Life Path or historical peak.
Existing daily sets roll during an open/closing shift. Hidden/offline time expires
old quests without serving or adding progress. Legacy rules1–11 replay retains its
original world/events; an already-running legacy shift starts quests at its next
opening. Future season authority remains part of F12/F23.

| Trigger | Progress rule |
|---|---|
| `customer_served` | Matching appended ServeRecord counts one customer, actual beer/snack units; perfect tip needs actual tip, canonical early threshold and fresh beer; fresh beer counts beer units only. |
| `order_served`, `shipper_completed` | One served table order; only actual service credit feeds earnings. Quest/LP rewards never inflate earnings, day cap, season or lifetime totals. |
| `shift_closed` | Fixed shift mission counts finalization, attributed to the closing day. |
| Zero-loss window | Continuous active open/closing time, at least one actual serve; losses/queue timeout/paid dismissal reset it. Door overflow is rejection. Hidden time pauses it; incomplete windows end when the shift finalizes. Loss at the exact deadline is processed first. |
| `rush_started` → `rush_ended` | Observe the complete same-day slot and serve at least once. Natural end qualifies even with losses; early finalization does not. Midnight resets observation. |
| VIP shift | Observe opening through finalization, serve a VIP, lose/dismiss no VIP. No VIP means no completion. |
| `gift_sent` | Only a trusted transfer producer can count distinct non-self recipients. Local UI has no gift/progress assertion command. Actual social transfer integration is still required. |

Claims bind exact day + quest ID, require completion/unclaimed state and safe integer
balances. Bonus refuses atomically when flyer storage is full or rewards overflow;
it never discards part of a reward and can be retried after capacity is available.
Acquiring the free flyer stamps persistent ownership for the existing LP condition.
Four local rows cannot unlock the five-of-five bonus without actual gift completion.

Native VI/EN daily sheet shows all five rows, progress, claims, rollover and bonus.
Gift availability is stated plainly. Attendance, referral, social transfer, end-shift
recommendations and full F17 acceptance remain in the complete-game scope.
Focused checks: `packages/engine/test/quests.test.ts`, genuine rules11 flyer snapshots,
`apps/web/test/quests.spec.ts`; full config/build/unit/browser/economy verification.

## Changelog

| Date | Change |
|---|---|
| 2026-09-09 | Reconciled all3 bonus/pool descriptions with canonical daily5 JSON; added local rules12 calendar, event, integer rounding and atomic-claim contract. Social/attendance/full F17 remain unfinished. |
