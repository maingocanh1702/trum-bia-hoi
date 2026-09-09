# F13 — Đường Lên Trùm (Life Path)

> Phase 3. Tiến trình dài hạn qua nhiều Vụ Bia. Dùng doanh thu trọn đời, không dùng số xu hiện có.

## 1. Scope

- LP0-LP7 milestones.
- Rewards: xu, Thùng Hàng/nguyên liệu, Mảnh Huy Hiệu, Tem Trang Trí.
- Gates: mặt bằng, hệ thống, social/cosmetic surfaces.

## 2. Data model

```ts
type LifePathLevel = 'LP0' | 'LP1' | 'LP2' | 'LP3' | 'LP4' | 'LP5' | 'LP6' | 'LP7'

type LifePathMilestone = {
  level: LifePathLevel
  lifetimeEarnedBase: number
  rewards: Reward[]
  unlocks: string[]
}

type PlayerLifePath = {
  lifetimeEarned: number
  currentLevel: LifePathLevel
  claimedLevels: LifePathLevel[]
}
```

## 3. Mốc Đường Lên Trùm

Base values multiply by `k`.

| Level | Tên hiển thị | Base lifetime earned | Unlock intent |
|---|---|--:|---|
| LP0 | Bưng Bê | 0 | start |
| LP1 | Phụ Quán | 50.000 | basic social/profile |
| LP2 | Tay Ngang | 150.000 | qualified referral milestone target |
| LP3 | Chủ Sạp | 500.000 | advanced upgrades/Tem Trang Trí |
| LP4 | Chủ Quán | 1.500.000 | Phố Cổ |
| LP5 | Ông Chủ | 5.000.000 | Ga Metro |
| LP6 | Đại Gia Bia | 15.000.000 | Khu Phố Tây |
| LP7 | Trùm Bia Hơi | 50.000.000 | prestige cap |

## 4. Earning rules

- Add to `lifetimeEarned`: same sources as `seasonEarned` unless GDD says otherwise.
- Do not subtract when spending.
- Vé Số Lấy Hên rewards do not count.
- Admin compensation does not count unless marked `countsForProgression`.

## 5. Claim rules

- Server detects newly eligible levels.
- Rewards are claim-once.
- If player jumps multiple levels, all eligible unclaimed levels become claimable.
- Feature gates check `currentLevel`, not whether reward was claimed.

## 6. UI

- Progress bar to next mốc Đường Lên Trùm.
- Reward ladder with claimed/claimable/locked.
- Gate tooltip on locked locations/features.

## 7. Analytics

- `life_path_level_reached {level, lifetimeEarned}`
- `life_path_reward_claimed {level}`
- `life_path_gate_blocked {feature, requiredLevel}`

## 8. Acceptance

- Spending coins cannot lower Đường Lên Trùm.
- Claiming reward twice is impossible.
- Location gates reflect LP immediately after level-up.

## 9. Local implementation — rules v6, 2026-09-09 (in progress)

The shared progression module evaluates every configured subsidiary requirement;
lifetime alone never grants a milestone. The closed grammar covers seats, core
gear/stall levels, dog and feature ownership, configured peak tiers and LP gates.
Core equipment means keg/washer/cooler/stall (the four-device group in item-list
section16); kitchen has a separate four-paid-level ladder. LP3 already has stall3
through LP2, and LP6 explicitly includes stall5. Unknown config tokens fail load.

Current level advances monotonically at one pre/post-command transition point,
emitting each newly reached milestone once. Rewards are separately claimable in
any order after reaching the level, keyed by numeric level in claimedLifePaths.
The full reward is quoted and checked before mutation: config coins, crate stock,
unitCost overflow, repeated badge shards and decor tokens. Shared credit/addStock
apply the reward; none counts as service/day/season/lifetime earnings. The native
VI/EN ladder shows requirements, progress, claimable/claimed and reward counters.

Real rules-v5 fixture captured on d2918e9 stays at its historical LP0/events/money;
the first rules-v6 command recognizes its already eligible LP1. Replay1–5 remain
inert for progression, and v6 saves replay level and claim events exactly. Phone
and QR gates use reached level, independently of reward claims.

`peakLeague` is an input for the real season subsystem; it is not inferred from
lifetime or the current pre-season aggregate. Full league/peak production,
flyer/signboard ownership production, server claims and downstream location gates
still need integration. The later requirement/reward table is covered at the pure
state boundary; this is not evidence that all LP0–LP7 are reachable in current play.

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Added v6 local progression and separate claim-once rewards, closed requirement grammar, preflighted stock/coin/token rewards, actionable ladder. Numeric claim IDs and derived eligibility replace the illustrative schema; full producer/server integration remains open. |

| 2026-09-09 | Independent review fix: config rejects cycles across sequential LP requirements and phone/QR gates; milestone and peak-tier names now use VI/EN translation keys. Added crossed-gate and English browser regressions. |


| 2026-09-09 | Flyer acquisition now records persistent ownership through buyFlyer in rules11; using the consumable does not revoke LP4's requirement. Canonical LP2 purchase/activation gate is shared through requirementStatus. Peak/season and full downstream progression acceptance remain unfinished. |
