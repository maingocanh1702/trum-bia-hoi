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

The updated lease contract above is accepted. This isolated game has not yet implemented the lease purchase/expiry/refund lifecycle or rental UI. Original-checkout implementation and career claims below/above are reference evidence only. Follow docs/latest-handoff-adoption.md for integration order.


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |
