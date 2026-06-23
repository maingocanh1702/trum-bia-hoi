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
