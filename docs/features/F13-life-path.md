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

Base values multiply by `k` (2.5). Numbers in force: JSON **2.1.0** (S5 `eco21-balance-pass`; the owner's compressed ladder for the 3-week story, D20–D21; the league uses the same ladder). Rewards: 08-SPEC §15.

| Level | Tên hiển thị | Base lifetime earned (×k) | Điều kiện phụ (`requires`) | Gates it opens (rules 28) |
|---|---|--:|---|---|
| LP0 | Bưng Bê | 0 | — | start |
| LP1 | Phụ Quán | 8.000 (20.000) | 4 bàn (`4 tables`, D18) | Điện thoại, mặt bằng LP1, Giờ Vàng nặng; nâng bàn Lv2, nâng ghế Lv2 |
| LP2 | Tay Ngang | 20.000 (50.000) | Quầy Lv3 + Điện thoại | QR, Tờ rơi, mặt bằng LP2; nâng bàn Lv3, nâng ghế Lv3; thiết bị Lv4 |
| LP3 | Chủ Sạp | 80.000 (200.000) | thiết bị Lv3 + QR | mặt bằng LP3; thiết bị Lv5, bếp Lv3 |
| LP4 | Chủ Quán | 280.000 (700.000) | tờ rơi + peak Bom Bạc | Phố Cổ; nâng bàn Lv4; bếp Lv4 |
| LP5 | Ông Chủ | 680.000 (1.700.000) | biển hiệu + peak Bom Vàng | Ga Metro |
| LP6 | Đại Gia Bia | 1.200.000 (3.000.000) | thiết bị & quầy Lv5 + peak Vua Bia | Khu Phố Tây |
| LP7 | Trùm Bia Hơi | 2.000.000 (5.000.000) | 10 chỗ + peak Trùm Bia Hơi | prestige (màn kết "Chuyện quán bạn" là slice `story-ending` của Đợt 5, chưa làm) |

Measured pace of the plan's protocol bot (seats first, direct leasing, no dog, start 2026-09-09, 8 shifts a day; `npm run sim:balance`, seed 42 | 99): LP1 at shift 13 | 13, LP2 45 | 46, LP3 48 | 49, LP4 53 | 54, LP5 68 | 69, LP7 163 | 165 (day 21) — every plan §5 target (LP1+2 ≤ 48, LP3+4 ≤ 96, LP5 ≤ 120, LP7 140–170) holds, LP2 with a thin margin. `peak:` requirements read the current 21-day season window, so LP4–LP7 depend on the day of the window a save starts (information runs: 08-SPEC changelog 2026-10-21).

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

Audit rows imported from the original checkout describe its reference engine and measurements. Current implementation evidence is in docs/build-progress.md; source claims of19tests, automatic LP rewards or pan identity by dish/time do not override the reconciled runtime contract.


| Date | Change |
|---|---|
| 2026-09-09 | Added v6 local progression and separate claim-once rewards, closed requirement grammar, preflighted stock/coin/token rewards, actionable ladder. Numeric claim IDs and derived eligibility replace the illustrative schema; full producer/server integration remains open. |

| 2026-09-09 | Independent review fix: config rejects cycles across sequential LP requirements and phone/QR gates; milestone and peak-tier names now use VI/EN translation keys. Added crossed-gate and English browser regressions. |


| 2026-09-09 | Flyer acquisition now records persistent ownership through buyFlyer in rules11; using the consumable does not revoke LP4's requirement. Canonical LP2 purchase/activation gate is shared through requirementStatus. Peak/season and full downstream progression acceptance remain unfinished. |


## Original-checkout audit history (reference only)

| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | Engine cài đánh giá LP theo `lifetimeEarned` sau mỗi lượt phục vụ (`evaluateLifePath`), thưởng `rewardCoinBase` vào coins ngoài ledger, event `life_path_level_reached`; LP làm gate cho heavy rush (F08), thiết bị Lv4/Lv5 (`upgrades.lifePathGate`), mặt bằng (`gateLifePath`). 🟡 Điều kiện phụ `requires` (ghế, chó, phone, QR, peak) chưa enforce — chờ F16/đồ mở khoá vào engine. |


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |

## Current season integration — 2026-09-09

Rules23 now produces `peakLeague` from actual credited income in either real season,
retains it through rollover, and keeps the existing subsidiary requirements and
claim-once rewards. It does not infer a peak from lifetime or legacy unwindowed
income. Verified product `faece69`; see F12 §10 and build-progress.

Actual commands on unchanged economy2.0.1 completed24shifts across3days and reached
LP2 / peak bach_kim with492295earned. This diagnostic buys gear/dog/phone/QR but not
yet tables/sign/flyer/leases; it does not certify the full LP0–LP7 career.

| Date | Change |
|---|---|
| 2026-09-09 | Real season peak producer integrated and independently reviewed. Three-day diagnostic reaches LP2/Bom Bạc without injected progression; full career verification remains open. |

## Career command harness — 2026-09-09

`npm run sim:career` now runs a fresh game through real purchases, claims, leases
and seasonal peaks. Daily wallet reconciliation and a two-day full save replay
check guard against injected progression. Initial30-day seed42 run reachesLP4;
full verification/review is in progress. See [career-simulation](../career-simulation.md)
for the explicit non-optimal policy, missing LP requirements and pending advanced
k-band scope. No numeric thresholds or subsidiary gates were changed.

| Date | Change |
|---|---|
| 2026-09-09 | Added actual-command multi-day career harness; early30-day diagnosis reachesLP4, not allLP0–LP7 or balance certification. |

## Career verification and storage limit — 2026-09-09

Harness `b01f4b1`: seeds42/99 each completed240shifts across30days, reachingLP3 on
day8/9 andLP4 onday16/17. Every acquisition/claim used real commands; full-month
replay forseed42 matches world/log.250engine/server, config/build, ordinary k/rush
and native review pass. LP5 income requirement remains unmet atday30; subsidiary
requirements are satisfied. See [career report](../career-simulation.md).

The80MB month save exceeds the current localStorage path (isolated Chromium quota
probe confirmed). Durable long-career persistence is the next prerequisite; this
is not allLP0–LP7 or production career readiness. Advanced k remains unapproved.

| Date | Change |
|---|---|
| 2026-09-09 | Closed harness verification; recorded real LP3/LP4 timings and the measured local save capacity defect. Full career and advanced balance remain open. |
| 2026-09-18 owner | **Nén cho story 3 tuần (168 ca):** `lifetimeBase` LP1…7 = 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr (base); LP1 `requires` "4 seats" ≡ 4 bàn 1 ghế (không gate bàn 2–4 bằng LP; nếu parser có "tables" thì đổi thành "4 tables"); LP7 = **màn kết** "Chuyện quán bạn" (huy hiệu Trùm; sau đó mùa + bảng xếp hạng). Sim W9: LP1+2 ngày 5, LP3+4 ngày 10, LP5 ngày 13, LP6+7 ngày 19 (8 ca/ngày). Chờ S5 + `story-ending`. Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
| 2026-10-19 S1 rules 28 | LP1 `requires` "4 seats" → "4 tables" (token mới `N tables` = số bàn sở hữu, D18 — không vòng lặp chết khi ghế 2 chỉ mở sau 4 bàn). LP7 giữ "10 seats" (DESIGN-story §3: 5 bàn × 2 ghế) — chưa đạt được khi mọi mặt bằng 4 chỗ; mở khi S5/`location-slots` đặt `tableSlots` ≥ 5. Snapshot cũ giữ "4 seats". |
| 2026-10-20 S4 rules 28 | Mốc Đời Quán thành gate của cấp bàn và cấp ghế (JSON 2.0.23, thay gate huy hiệu Kết Nối / uy tín của bàn VIP): nâng bàn Lv2 cần **LP1**, Lv3 cần **LP2**, Lv4 cần **LP4**; nâng ghế Lv2 cần **LP1**, Lv3 cần **LP2** (`upgrades.table.tableUpgrade.levels[].lifePathGate`, `chairUpgrade.levels[].lifePathGate`; mốc đạt mở gate ngay, không cần đã nhận thưởng). Nút mua mờ kèm lý do "Cần đạt <tên mốc>" (`reason.lifePathRequired`). Snapshot ≤ 2.0.22 giữ gate cũ. |
| 2026-10-20 S5 rules 28 (JSON 2.1.0) | Thang `lifetimeBase` LP1…7 = 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr (base; hiển thị ×2,5: 20 k · 50 k · 200 k · 700 k · 1,7 tr · 3 tr · 5 tr) đã nằm trong JSON và được sim cân bằng xác nhận cùng giá bàn/ghế/thiết bị và `tableSlots` 4/4/5/6/6/7/8/8/8 (LP7 "10 seats" = 5 bàn × 2 ghế, đạt được ở mặt bằng ≥ 5 chỗ — hết điều kiện "chưa đạt được" của dòng S1). Bot career v4 (mua rẻ nhất trước, thuê thẳng), seed 42 / 99, 8 ca/ngày: LP1 ca 20 / 20, LP2 ca 23 / 23, LP3 ca 45 / 45, LP4 ca 73 / 70, LP5 ca 100 / 97, LP7 ca 144 / 142 (ngày 18–19); mục tiêu plan §5 (LP1+2 ≤ 48, LP3+4 ≤ 96, LP5 ≤ 120, LP7 140–170) đều đạt. Lưu ý đo: `peak:` đọc thu nhập của cửa sổ mùa hiện tại (21 ngày), nên bot bắt đầu ở nửa đêm VN đầu tiên của một mùa; career bắt đầu giữa mùa sẽ đo lịch mùa chứ không đo kinh tế (số đo mốc muộn: 08-SPEC changelog 2026-10-20 / JSON 2.1.0). |
| 2026-10-21 S5 rules 28 (JSON 2.1.0, review vòng 1) | Thay dòng 2026-10-20: thang `lifetimeBase` LP1…6 = 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr, **LP7 = 2,24 tr** base (×2,5: 5,6 tr). Bot của plan (bàn/ghế trước, thuê thẳng, không chó; bắt đầu 2026-09-09; seed 42 / 99, 8 ca/ngày): LP1 ca 14 / 15, LP2 ca 47 / 47, LP3 ca 51 / 50, LP4 ca 55 / 55, LP5 ca 70 / 69, LP7 ca 167 / 162 (ngày 21: LP7 đến cùng lúc món thiết bị cuối cùng); mục tiêu plan §5 (LP1+2 ≤ 48, LP3+4 ≤ 96, LP5 ≤ 120, LP7 140–170) đều đạt. LP2 sát giới hạn (47 / 48): nó chờ quầy Lv3 + điện thoại, mà bot chỉ mua sau khi đủ bàn và ghế của mặt bằng. |
| 2026-10-21 S5 rules 28 (JSON 2.1.0, review vòng 2) | Thay dòng vòng 1: **LP7 = 2 tr** base (×2,5: 5 tr), thang owner 8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr. Bot của plan (bàn/ghế trước, thuê thẳng, không chó; 2026-09-09; seed 42 / 99): LP1 ca 14 / 15, LP2 47 / 48, LP3 51 / 51, LP4 56 / 56, LP5 70 / 71, LP7 164 / 165. |
| 2026-10-22 Wave 4 close-out (stage 07, JSON 2.1.0, rules 28) | Body brought to the chain's final state (plan §7): §3 lists the sealed 2.1.0 ladder (8 k · 20 k · 80 k · 280 k · 680 k · 1,2 tr · 2 tr base, ×2,5 on screen) with its `requires` and the gates each level opens under rules 28 (table levels LP1/LP2/LP4, chair levels LP1/LP2, devices Lv4/Lv5 LP2/LP3, kitchen Lv3/Lv4 LP3/LP4, locations, phone, QR, flyer, heavy rush) instead of the original 50 k … 50 tr table; the measured pace is the final one after owner decision 1 (table 2 = 1 070 xu): LP1 13 \| 13, LP2 45 \| 46, LP3 48 \| 49, LP4 53 \| 54, LP5 68 \| 69, LP7 163 \| 165 (`npm run sim:balance`, seeds 42 \| 99; it supersedes the shift numbers of the round-2 row above, which were measured with table 2 at 1 500 xu). Numbers checked against `docs/config/economy.tbh.json`; no rule or number changed. |
