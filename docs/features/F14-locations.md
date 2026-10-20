# F14 — Mặt Bằng Quán (Locations)

> Phase 3. Mặt bằng là multiplier + rent/cọc sink + social neighborhood.

## 1. Scope

- 9 locations, multiplier 1.0 -> 1.8.
- 7-day lease, upfront rent, 25% deposit.
- LP gates and street grouping.

## 2. Data model

```ts
type LocationConfig = {
  id: string
  name: string
  multiplier: number
  requiredLifePath?: LifePathLevel
  rentPerDayBase: number
  themeTags: string[]
}

type Lease = {
  locationId: string
  startsAt: number
  endsAt: number
  prepaidRent: number
  deposit: number
  status: 'active' | 'ended' | 'broken'
}
```

## 3. Location table

| Location | Mult | Rent/day Base | Gate |
|---|--:|--:|---|
| Hẻm Nhỏ | 1.0 | 0 | LP0 |
| Ngõ Chợ | 1.1 | 4,000 | LP1 |
| Bến Xe | 1.2 | 6,800 | LP1 |
| Gần Công Sở | 1.3 | 10,000 | LP2 |
| Gần Sân Vận Động | 1.4 | 14,000 | LP3 |
| Hồ Bia Đêm | 1.5 | 18,000 | LP3 |
| Phố Cổ | 1.6 | 24,000 | LP4 |
| Ga Metro | 1.7 | 32,000 | LP5 |
| Khu Phố Tây | 1.8 | 44,000 | LP6 |

Rent per day: `rentPerDayBase × k` from the configured location row; the historical `e` index no longer calculates rent. Server stores the resolved `rentPerDay` at lease start so later balance changes do not mutate active leases.

## 4. Lease rules

- Lease duration = 7 days.
- Move-in cost = `rentPerDay * 7 + deposit`, deposit = 25% rent period.
- Leaving early loses deposit and returns to Hẻm Nhỏ unless buying a new lease.
- Lease expiry returns the player to the configured fallback and refunds the stored deposit once; renewing requires a new lease purchase.
- Multiplier applies to served revenue/tip before caps.

## 5. UI

- Rental screen shows multiplier, 7-day total, deposit, break-even estimate.
- Locked locations show LP requirement.
- Current lease shows days/hours left.

## 6. Analytics

- `location_viewed {locationId}`
- `lease_started {locationId, cost, deposit}`
- `lease_ended {locationId, reason}`
- `location_break_even_hint_seen {locationId}`

## 7. Acceptance

- Cannot rent locked location.
- Deposit refunds only on normal end/renewal path, not early leave.
- Multiplier is server-side and visible in shift summary.

## Changelog (append-only)

Audit rows imported from the original checkout describe its reference engine and measurements. Current implementation evidence is in docs/build-progress.md; source claims of19tests, automatic LP rewards or pan identity by dish/time do not override the reconciled runtime contract.


| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | Rent cân lại theo audit economy: `rentPerDayBase` 4 000 / 6 800 / 10 000 / 14 000 / 18 000 / 24 000 / 32 000 / 44 000 (×k = 10 k→110 k/ngày), neo 15–25 % thu nhập tier, bỏ công thức e; thêm `gateLifePath` (1/1/2/3/3/4/5/6). Engine cài `rentLocation` (trả trước 7 ngày + cọc 25 %, gate LP), `leaveLocation` (mất cọc), hết kỳ tự về Hẻm Nhỏ + hoàn cọc. Số ở `economy.tbh.json` 2.0.0, 08-SPEC §16. |


## Current game implementation status — 2026-09-09

Rules22 implements lease quotes, purchase/move/leave, real-calendar expiry and exactly-once deposit refunds in the shared engine, local save and SQLite/HTTP. A signed lease snapshots resolved total rent, deposit, fallback, deadline and early-refund policy; later config pins cannot reprice it or change its fallback. Gameplay/menu pause never shifts the lease deadline. A wallet that cannot safely receive its deposit keeps an expired contract with the liability, loses the location benefit, and settles when spending makes room; replacement is blocked until then.

Moves/early departure require a resting shift, a current lease ID and an affordable quote; equipment upgrades remain available in shift. The rental menu shows current location/deadline/days-hours left, upfront rent, deposit, multiplier and LP gates in VI/EN, preserving menu pause after purchases. Runtime events are `lease_started`, `lease_left`, `lease_expired` and `lease_deposit_refunded`, with lease IDs and stored financial terms. The data-model sketch above describes the contract concept; exact persisted fields are in packages/engine/src/types.ts.

Verified throughce7564b:234 engine/server checks,77browser checks,config/build,10 ordinary1000-serve cohorts k2.4186–2.8738 and15rush pass. Actual rules21 replay and SQLite restart are covered; native correction review resolves both introduced config findings. Full F14 is still in progress: break-even guidance, location art/neighborhood integration and location-specific shift reporting remain; full career/balance is not certified. Original-checkout career claims remain reference only.


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |

| 2026-09-09 | Implemented rules22 lease calendar, safe financial lifecycle, replay/HTTP/local UI and VI/EN mobile coverage; full F14 remains in progress as detailed above. |

| 2026-09-09 | Review found fallback identity reuse and unsafe service multipliers. A successful modern pin now relocates unleased players to the new free fallback, active contracts reject fallback changes, and config validates the maximum whole-order value including all service boosts.12 focused regressions pass; final verification/review rerunning. |

| 2026-09-09 | Checkpointce7564b verified:234 engine/server,77browser,config/build,10 k cohorts and15rush; native review resolves both findings. Test-only alignment preserves legacy overflow checks and asserts modern fallback migration. Full F14 follow-ups remain listed above. |


| Date | Change |
|---|---|
| 2026-09-11 Steer18 / M5-F14-SUMMARY | Shift book shows the historical location multiplier from existing shift/lease events and the pinned config, including rented→fallback on calendar expiry. Moving after closing leaves the old book intact; missing legacy provenance is labeled unavailable. Shared readonly server/local presentation; rules and economy unchanged. |
| 2026-09-18 owner | Mỗi mặt bằng có **`tableSlots`** (Hẻm 4 · Ngõ Chợ 4 · Bến Xe 5 · Gần Công Sở 6 · Gần SVĐ 6 · Hồ Bia Đêm 7 · Phố Cổ 8 · Ga Metro 8 · Phố Tây 8); `leaseDays` 7 → 3; được thuê thẳng mặt bằng cao hơn khi đủ LP; bàn vượt chỗ ở mặt bằng nhỏ hơn tạm gấp lại (không nhận khách). Chờ `location-slots` (Đợt 5) / S1. Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
| 2026-10-20 S5 rules 28 (JSON 2.1.0) | Số chốt: `tableSlots` 4/4/5/6/6/7/8/8/8 (thay "mọi mặt bằng = 4" của S1), `leaseDays` 3 (tiền kỳ = 3 × rent/ngày, cọc 25 %: Ngõ Chợ 37 500 xu cả cọc, Bến Xe 63 750), `mult` là dốc 1,0 → 1,15 (1,019 · 1,038 · 1,056 · 1,075 · 1,094 · 1,112 · 1,131 · 1,15; mặt bằng thành đòn sức chứa nhiều hơn đòn giá), rent/ngày giữ nguyên. Bot v4 thuê thẳng mặt bằng tốt nhất mà Đường Lên Trùm cho phép và ví trả nổi (gate plan §5 đạt). Sổ ca in hệ số đủ 3 chữ số (`×1,019` vi / `×1.019` en), thẻ Mặt bằng in `×1.019` nguyên văn. Phần "chờ `location-slots`" của dòng 18/09 xong ở mặt số liệu; luật gấp bàn dư khi chuyển sang mặt bằng nhỏ hơn (Đợt 5) vẫn chưa làm. |
