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
When onboarding is enabled, both yard/book entries appear only after the configured
`onboarding.featureReveal.questsAfterShifts` number of finalized shifts. Generation
and progress can already run in the engine; this is progressive UI reveal.
Gift availability is stated plainly. Attendance, referral, social transfer, end-shift
recommendations and full F17 acceptance remain in the complete-game scope.
Focused checks: `packages/engine/test/quests.test.ts`, genuine rules11 flyer snapshots,
`apps/web/test/quests.spec.ts`; full config/build/unit/browser/economy verification.

## Changelog

| Date | Change |
|---|---|
| 2026-09-09 | Reconciled all3 bonus/pool descriptions with canonical daily5 JSON; added local rules12 calendar, event, integer rounding and atomic-claim contract. Social/attendance/full F17 remain unfinished. |

| 2026-09-09 (review correction) | Gate both quest entry points with the shared configured onboarding reveal; browser checks enabled onboarding at canonical2 and retuned3 completed shifts. |


## 11. Local attendance rules13 contract (2026-09-09)

Attendance counts observed active dates in Asia/Ho_Chi_Minh, independently of
reward collection. This follows the separate `lastActiveDateKey` and
`lastClaimDateKey` in the researched login track. A visit records day one even
before opening a shift; the existing onboarding threshold still controls access to
the daily sheet. The reward ladder comes from `quests.loginTrackRepBase`, scaled
once by the shared loader, with safe nonnegative integer rewards. Its array length
sets the cycle; no reward or duration has been added to the JSON.

| Observed state / action | Result |
|---|---|
| First active visit | Open cycle day one, no automatic reward. |
| Another visit or reload on the same VN date | Keep the same slot and claim status. |
| Next consecutive active VN date | Advance one slot; an unclaimed previous reward expires. |
| Missed active date(s), `loginMissResets=true` | Reset to day one. |
| Missed dates, `loginMissResets=false` | Advance one observed slot; never backfill missing dates. |
| End of configured reward array | Wrap to day one and clear the previous cycle's claimed cells. |
| Hidden/offline calendar advance | Do not record attendance or pay rewards; resolve the gap on return. |
| Claim exact current date, active, unclaimed, safe balances | Award reputation once through `changeRep`; stamp claim and audit event. |
| Wrong/expired date, inactive, duplicate or overflow | Refuse without granting rewards or stamping a claim. |

Optional `World.attendance` stores cycleDay, lastActiveDateKey, lastClaimDateKey,
expiresAt and bounded claimedDays for the current cycle. Claimed cells distinguish
paid rewards from observed-but-unclaimed days. While active, the next date is
observed at exact VN midnight, using the daily quests' existing calendar helper.
Claims change reputation and the active shift's reputation report only: coins,
dayEarned, seasonEarned and lifetimeEarned remain untouched.

Protocol13 adds `attendance_day_opened` and `attendance_claimed` audit events with
exact date, cycle slot and transition/reward, plus the standard command/config/time
fields. Rules1–12 replay preserves the full historical world. Current active
adoption adds the first attendance stamp; it does not insert attendance into past
commands or hidden dates. Genuine rules12 served/claimed and hidden-rollover saves
exercise the complete old projection, current adoption and another replay.

The VI/EN ladder shows today, claimed, passed and upcoming states with text as well
as colour. Its claim uses the existing reward toast and paired reward sound.
Focused checks: `packages/engine/test/attendance.test.ts` and
`apps/web/test/attendance.spec.ts` (mobile, short desktop, real midnight, offline
return, reload). Social transfers, referral, sign-in linkage and end-shift mission
recommendations remain in full F17 scope.

| Date | Change |
|---|---|
| 2026-09-09 (rules13) | Implemented the observed-active-day attendance ladder and explicit reputation claim; documented missed/unclaimed-day distinction, configured wrap/reset, no offline backfill and historical replay. No JSON numbers changed. |

## Rules20 — refresh absent-day quests on return

Inactive, paused days do not generate missed daily quest sets. The next active visit
refreshes only the current VN date, including a visit with a management menu open.
Active menus still observe exact midnight boundaries. Disconnection timeout cleanup
continues to record actual closing events on their real date. Historical rules19
saves retain their original generated-day history and adopt this rule prospectively.

| Date | Change |
|---|---|
| 2026-09-09 (rules20) | Skip inactive paused calendar backfill; refresh current quests once on return. Regression covers 1000 absent days, chunked/one-jump equality, expired claims, and a genuine rules19 save. |

| Date | Change |
|---|---|
| 2026-09-09 | Rules19 saves adopt rules20 at their saved frontier before live catch-up, through one replayable inactive activity record; historical replay still generates the originally recorded dates. Engine and SQLite restart/rollback regressions cover the first operation after1000days. |
