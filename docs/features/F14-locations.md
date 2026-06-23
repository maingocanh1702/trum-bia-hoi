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
  rentBaseE: number
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

| Location | Mult | `e` rent index | Gate |
|---|--:|--:|---|
| Hẻm Nhỏ | 1.0 | 5 | start |
| Ngõ Chợ | 1.1 | 10 | - |
| Bến Xe | 1.2 | 15 | - |
| Gần Công Sở | 1.3 | 20 | LP2 |
| Gần Sân Vận Động | 1.4 | 25 | LP3 |
| Hồ Bia Đêm | 1.5 | 30 | LP3 |
| Phố Cổ | 1.6 | 35 | LP4 |
| Ga Metro | 1.7 | 40 | LP5 |
| Khu Phố Tây | 1.8 | 45 | LP6 |

Rent per day: `round(700 * (e / 5) * (1 + e / 50)) * k`, where `e` is the table index above. Server stores the resolved `rentPerDay` at lease start so later balance changes do not mutate active leases.

## 4. Lease rules

- Lease duration = 7 days.
- Move-in cost = `rentPerDay * 7 + deposit`, deposit = 25% rent period.
- Leaving early loses deposit and returns to Hẻm Nhỏ unless buying a new lease.
- Lease expiry moves player to default or prompts renewal; server decides at next login.
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
