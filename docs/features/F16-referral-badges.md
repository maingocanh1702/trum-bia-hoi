# F16 — Rủ Bạn & Huy Hiệu (Referral & Badges)

> Phase 3. Social progression and badge gates. Gameplay gate `Kết Nối` must be free-only.

## 1. Scope

- Referral qualification.
- 3 referral milestones.
- Badge inventory and display.
- `Kết Nối` gate for VIP table.

## 2. Data model

```ts
type BadgeId = 'ket_noi' | 'ban_be' | 'dong_hanh' | 'season_top_10' | 'season_tier' | string

type ReferralStats = {
  inviterId: string
  qualifiedCount: number
  qualifiedLp2Count: number
  claimedMilestones: number[]
}

type Badge = {
  id: BadgeId
  source: 'referral' | 'season' | 'life_path' | 'event'
  gameplayEffect: 'none' | 'unlock_vip_table'
}
```

## 3. Qualification

A referred user counts only when all are true:

- account created with referral link/code;
- opens shop and completes basic play requirement;
- plays multiple sessions or reaches minimum `lifetimeEarned`;
- passes anti-farm checks: device/IP/rate/identity heuristics.

Server owns qualification.

## 4. Milestones

| Milestone | Requirement | Reward | Badge |
|---|---|---|---|
| 1 | 1 qualified friend | 250 reputation x k | `ket_noi` |
| 2 | 3 qualified friends | 1.000 reputation x k | prestige badge |
| 3 | referred friend reaches LP2 | 3.000 reputation x k | high prestige badge |

Only `ket_noi` has gameplay effect: unlock VIP table gate. It must never be sold in donation.

## 5. Badge shards

- Quests/seasons can grant `badgeShard`.
- 1 complete badge = configured shard count, default 8.
- Shards are source-specific unless marked universal.

## 6. UI

- Referral screen: code/link, progress, claim buttons, anti-farm plain copy.
- Badge inventory: equipped/displayed badges, locked hints.
- VIP table lock explains free path: earn `Kết Nối` or required reputation.

## 7. Analytics

- `referral_link_copied`
- `referral_qualified {milestoneProgress}`
- `referral_reward_claimed {milestone}`
- `badge_equipped {badgeId}`

## 8. Acceptance

- Mời Bia Hơi cannot grant `ket_noi`.
- Self-referrals do not qualify.
- Claim is idempotent.
- VIP table gate checks badge ownership server-side.
