# F08 — Giờ Vàng (Rush System)

> Phase 0-2. P0 có toggle `normal/peak`; spec này hoàn thiện Giờ Vàng production: lịch, telegraph, hệ số, stacking với weather/event.

## 1. Scope

**Phase 0:** toggle `normal` / `peak` như `04-SPEC`.

**Phase 1:** 1 mức rush tự động trong ca, có warning trước.

**Phase 2:** light/heavy/lunch/football hooks, lịch seed, spawn floor.

## 2. Data model

```ts
type RushType = 'none' | 'light' | 'heavy' | 'lunch_light' | 'football'

type RushConfig = {
  type: RushType
  durationMs: number
  spawnIntervalMult: number
  minSpawnIntervalMs: number
  paymentMult: number
  tipMult: number
  leavePenaltyMult: number
}

type RushState = {
  active: RushType
  startedAt?: number
  endsAt?: number
  nextRushAt?: number
  nextRushType?: RushType
  seed: string
}
```

## 3. Config

| Type | Duration | Spawn interval | Floor | Pay | Tip | Phạt |
|---|--:|--:|--:|--:|--:|--:|
| `none` | - | 1.0 | 10.500ms | 1.0 | 1.0 | 1.0 |
| `light` | 90s | 0.35 | 1.000ms | 1.05 | 1.10 | 1.8 |
| `heavy` | 150s | 0.20 | 700ms | 1.10 | 1.18 | 2.5 |
| `lunch_light` | 90s | 0.45 | 1.000ms | 1.03 | 1.05 | 1.5 |
| `football` | match slot | 0.20-0.35 | 700ms | 1.10 | 1.18 | 2.5 |

P0 `peak` dùng `spawnIntervalMult=0.66` để test feel nhẹ hơn production heavy.

## 4. Scheduling

- Server hoặc deterministic client seed tạo `RushSchedule` theo `locationId + shiftId + dayBucket`.
- Không spawn rush trong 30s đầu ca; warning trước 20s.
- Không chồng rush thường với `football`; event có priority cao hơn.
- Khi `closing`, rush timer vẫn kết thúc bình thường nhưng không spawn khách mới nếu ca đã ngừng nhận khách.

## 5. Stacking rules

Effective spawn:

```ts
effectiveInterval = max(
  baseSpawnMs * weather.spawnMult * rush.spawnIntervalMult * marketing.spawnMult,
  rush.minSpawnIntervalMs
)
```

- Payment/tip/penalty nhân theo chuỗi: base -> location -> rush -> weather -> customer type.
- Throughput tăng do rush **không** đi vào `k_value`.
- Nếu nhiều nguồn cùng muốn rush, chọn priority: inspection/gangster modal > football > heavy > light > none.

## 6. UI

- HUD hiển thị `Giờ Vàng tới: mm:ss` và loại rush.
- 20s trước rush: banner ngắn, không pause game.
- Trong rush: viền HUD đổi màu, spawn lane rõ, không mở text dài.
- Nếu người chơi mở restock/upgrade trong rush, game không pause; đây là quyết định vận hành.

## 7. Analytics

- `rush_scheduled {type, startsAt, duration}`
- `rush_started {type, weather, location}`
- `rush_ended {served, lost, revenue, tips, staleRate}`
- `rush_warning_seen {secondsBefore}`

## 8. Acceptance

- Không có interval thấp hơn floor.
- Rush heavy làm tăng áp lực rõ: served/lost ratio thay đổi so normal trong simulation.
- Rush warning xuất hiện trước, không che bàn đang cần phục vụ.
- Không double-apply multipliers khi football rush active.
