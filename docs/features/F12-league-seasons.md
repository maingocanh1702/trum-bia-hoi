# F12 — Giải Nhậu & Vụ Bia (League & Seasons)

> Phase 3. Đua **Giải Nhậu** theo **Vụ Bia** dựa trên doanh thu phục vụ/shipper, không tính thưởng nhiệm vụ/xổ số/Mời Bia Hơi.

## 1. Scope

- 8 bậc Giải Nhậu.
- 2 Vụ Bia song song: `ranking` 7 ngày và `contest` 14 ngày.
- Bảng xếp hạng theo bậc và Dạo Phố theo mặt bằng x Giải Nhậu.
- Thưởng cuối Vụ Bia qua hòm thư.

## 2. Data model

```ts
type SeasonKind = 'ranking' | 'contest'
type LeagueTier = 'dong' | 'bac' | 'vang' | 'titan' | 'bach_kim' | 'hong_ngoc' | 'kim_cuong' | 'huyen_thoai'

type Season = {
  id: string
  kind: SeasonKind
  startsAt: number
  endsAt: number
  epochAnchor: string
}

type PlayerSeasonStats = {
  playerId: string
  seasonId: string
  seasonEarned: number
  seasonReputationScore: number
  currentTier: LeagueTier
  firstReachedCurrentSeasonEarnedAt: number
}
```

## 3. Bậc Giải Nhậu

Base thresholds are multiplied by `k`.

| Bậc hiển thị | Tên gốc kỹ thuật | Base min |
|---|---|--:|
| Cốc Nhựa | Đồng | 0 |
| Cốc Thủy Tinh | Bạc | 20.000 |
| Vại Sành | Vàng | 60.000 |
| Vại Đồng | Titan | 120.000 |
| Bom Bạc | Bạch Kim | 180.000 |
| Bom Vàng | Hồng Ngọc | 300.000 |
| Vua Bia | Kim Cương | 500.000 |
| Trùm Bia Hơi | Huyền Thoại | 1.000.000 |

## 4. Earning rules

- Add to `seasonEarned` (doanh thu Vụ Bia): served payment, served tip, shipper net.
- Do not add: quest rewards, lottery rewards, Mời Bia Hơi, compensation, admin grants.
- Spending coins does not reduce `seasonEarned`.
- Tie-break: higher `seasonEarned`, then earlier `firstReachedCurrentSeasonEarnedAt`.

## 5. Vòng đời Vụ Bia

- Server computes current Vụ Bia from epoch and timezone VN.
- On `endsAt`, freeze leaderboard, issue rewards to mailbox, open next Vụ Bia.
- Rewards are materials/mảnh huy hiệu/Tem Trang Trí, not raw Giải Nhậu-inflating coins unless explicitly balanced.
- Player can claim rewards later; unclaimed rewards do not affect next Vụ Bia rank.

## 6. Views

- `Leaderboard`: grouped by Giải Nhậu tier across locations.
- `Street`: grouped by `locationId x leagueTier`; shows hàng xóm and reputation star.
- Empty high tier displays "Chưa có ai" state to create aspirational goal.

## 7. API

- `GET /seasons/current`
- `GET /leaderboard?seasonId&tier&page`
- `GET /street?locationId&tier`
- `POST /season/rewards/claim`

## 8. Analytics

- `league_tier_reached {tier, seasonEarned}`
- `leaderboard_viewed {tier, page}`
- `street_viewed {locationId, tier}`
- `season_reward_claimed {seasonId, tier}`

## 9. Acceptance

- Quest/lottery/Mời Bia Hơi never change `seasonEarned`.
- Vụ Bia rollover is deterministic around VN midnight/epoch.
- Tie-break remains stable after pagination.
- Rewards can be claimed exactly once.
