# F09 — Thời Tiết Quán (Weather)

> Phase 1-2. Thời tiết là lớp hệ số lên spawn, patience, độ hơi bia, tip, shipper và khách đặc biệt.

## 1. Scope

**Phase 1:** weather tối giản: `sunny`, `hot`, `rain`.

**Phase 2:** đủ 5 weather + hệ số đặc thù bia hơi.

## 2. Data model

```ts
type WeatherType = 'sunny' | 'hot' | 'humid' | 'rain' | 'cold'

type WeatherConfig = {
  type: WeatherType
  weight: number
  beerFreshnessMult: number
  patienceMult: number
  tipMult: number
  spawnIntervalMult: number
  shipperSpawnMult: number
  customerWeightMult?: Partial<Record<CustomerType, number>>
  copy: string
}

type WeatherState = {
  current: WeatherType
  rolledAt: number
  shiftId: string
}
```

## 3. Config

| Thời tiết | Weight | Độ hơi | Patience | Tip | Spawn interval | Shipper | Khách đặc biệt |
|---|--:|--:|--:|--:|--:|--:|---|
| sunny | 35 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | - |
| hot | 20 | 0.67 | 1.0 | 1.15 | 0.95 | 1.5 | - |
| humid | 10 | 0.50 | 0.75 | 1.20 | 0.90 | 2.0 | `chipheo x1.5` |
| rain | 20 | 1.05 | 1.15 | 1.0 | 1.10 | 3.0 | `ngoily x2` |
| cold | 15 | 1.20 | 1.0 | 0.95 | 1.20 | 0.8 | ít uống bia hơn |

`beerFreshnessMult` nhân vào thời gian còn hơi: hot/humid làm mất hơi nhanh hơn.

## 4. Roll rules

- Roll 1 lần khi mở ca, server-side từ Phase 3; client seed được phép ở Phase 1.
- Thời tiết không đổi giữa ca, trừ event đặc biệt post-MVP.
- Thời tiết hiển thị trước khi mở ca để người chơi chuẩn bị kho/cốc.

## 5. Apply order

- Spawn: `base * weather.spawnIntervalMult * rush.spawnIntervalMult`.
- Patience: `basePatience * weather.patienceMult * customer.patienceMult`.
- Tip: `baseTip * weather.tipMult * rush.tipMult * customer.tipMult`.
- Freshness: `baseFreshness * weather.beerFreshnessMult * upgrade.freshnessMult`.

## 6. UI

- HUD pill weather có icon + 1 dòng tác động chính.
- Restock/upgrade screen có hint: hot/humid nên ưu tiên hầm lạnh/cốc; rain nên chuẩn bị shipper.
- Không dùng modal dài khi vào ca.

## 7. Analytics

- `weather_rolled {type, shiftId}`
- `weather_shift_summary {type, revenue, staleRate, lostRate, shipperCount}`
- `weather_hint_seen {type}`

## 8. Acceptance

- Distribution trong 10.000 roll lệch <5 điểm phần trăm so weight.
- Humid/hot tăng staleRate nếu người chơi giữ chiến thuật cũ.
- Rain tăng shipper rõ nhưng không phá cap ngày.
