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

> Bảng xếp hạng & Bàn Thờ Ông Địa tách thành **F28-leaderboard.md** (08/09): ai lên bảng, tie-break, refresh, đóng băng, snapshot, huy chương. Mục này chỉ giữ tên view.

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

## 10. Implementation checkpoint — 2026-09-09 (rules23)

The pure engine now records two real epoch windows, with the existing
`world.seasonEarned` as the single ranking balance and a separate contest balance.
The canonical credit path applies the daily cap before season attribution. Each
period pins its thresholds and source list until expiry; the ranking period also
owns the day/lifetime ledger source classification. Changing gameplay config at
opening cannot reclassify an active season. Permanent tier IDs/order cannot change
through an ordinary opening config.

`peakLeague` records the highest tier earned in either actual season and survives
rollover. Zero-income adoption does not invent a peak. Prior unwindowed save income
is preserved under `seasons.legacy` with its cutoff, while lifetime earnings and
all original rules1–22 results/events remain unchanged. Rules23 adoption is an
explicit recorded command boundary, including a valid command refused by gameplay
eligibility; malformed/idempotent/stale envelopes do not adopt. Downgrading replay
rules after adoption is refused.

Season time remains real during menus and absence. At the exact deadline, completed
personal results freeze before the next service/shift close. Empty absent periods
are skipped without creating thousands of empty records. If a new config changes
an epoch/duration, the old period finishes first; `trackingFromAt` records where
tracking starts within the next configured epoch window. Both windows count closed
shifts at their close timestamp. Results are retained for later reward processing;
the configured history limit applies only to the own-progress view.

The VI/EN own-progress panel opens from Journey after the configured three closed
shifts. It shows each season's tier, revenue, next threshold, deadline, personal
history and permanent peak. It follows the owner's all-menu pause policy.

**Still pending:** authoritative community ranks/ties across players, season-end
server snapshots, prize mapping and exactly-once mailbox claims. The current JSON
has descriptive reward strings but no by-tier material/shard/token quantities;
this implementation does not invent or grant those rewards. F12/F28 are not complete.

| Date | Change |
|---|---|
| 2026-09-09 | Rules23 season accounting/peak producer and personal progress panel implemented; preserves legacy unwindowed income explicitly. Community ranking and configured mailbox rewards remain pending. |

| 2026-09-09 | Review corrections: a window with no income and no closed shifts can accept an opening config (including a new calendar at rollover); a participated period remains pinned. First adoption compares permanent tier IDs against the prior gameplay config. Whole seated-order credits are preflighted through the canonical credit path before any mutation, including tip/bonus/later guests and daily-cap clipping. |

| 2026-09-09 | Core accounting/peak/personal UI verified at faece69: 248 engine/server, 79 browser plus 6 correction checks, config/build, 10 ordinary k cohorts and 15 rush pass. Native correction review confirms all 3 findings resolved. Full ranking/reward acceptance remains open. |


| Date | Change |
|---|---|
| 2026-09-11 | Steer18 F12 stable tie-break/page criterion PASS on existing E25 code: actual imported histories, timestamp/ID ties, revision-bound pages, refresh/restart and VI/EN real-server UI. Reward grant/claim/mailbox remains PENDING by owner13:33; no new rewards or config. |


| Date | Change |
|---|---|
| 2026-09-11 Steer18 | Local immutable season archive implemented: startup/timer capture, cutoff membership/review/flags, server tie ordering, captured public aliases, configured podium/wall and VI/EN history. Replay runs on a private SQLite backup and only the final append-only snapshot enters the live database. F12-CLAIM/reward grants/mailbox remain PENDING by owner 2026-09-11; no reward configuration changes. Verification receipt will be recorded in the milestone closure report. |

| 2026-09-11 acceptance | Snapshot local slice PASS:418unit/server,6browser,6axe scans, full verify and independent correction review CLEAN. Evidence: milestone-closure-m0-m5.md, M5-F12/F28-SNAPSHOT. |
| 2026-09-18 owner | **Vụ Bia = mùa 21 ngày** (ranking 7 → 21, contest bỏ hoặc = 21); bậc Giải Nhậu `minSeasonEarnedBase` = thang LP nén (0 · 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr) để `peak:` trong LP4–7 khớp mùa 1; mùa 1 = story, mỗi mùa sau thêm một lớp gameplay (M6 → M8 → …); thưởng cuối mùa nguyên liệu + cosmetic. Chờ `season-21d` (Đợt 5) / S5. Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
