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
- Khi `closing`, đợt đang chạy giữ đúng slot hiện tại và kết thúc đúng deadline; không bắt đầu đợt đã lên lịch sau đó, kể cả cùng loại/chồng thời gian. Không spawn khách mới. Finalize sớm thì kết thúc luôn đợt đang chạy.

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

- HUD ưu tiên **đợt đang chạy + thời gian còn lại**; khi chưa có đợt chạy mới hiển thị **loại đợt kế + ETA**. Đang closing/resting không quảng bá đợt kế.
- `rush.schedule.warningMs` trước rush (seed 20s): nhãn HUD viền vàng + loại/ETA và một thông báo screen reader; không pause game, không che bàn/serve/sheet. Native timer không tự đọc lại mỗi giây. Nếu đã có đợt đang chạy, cả hình ảnh và thông báo screen reader đều ưu tiên đợt đó; không chen thông báo của slot bị chồng.
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

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Rules v5 nối warning theo config, ưu tiên active timer, đóng đúng slot khi closing/finalize; hidden dời deadline, mỗi slot warning một lần. Replay v1–v4 giữ lịch sử, private slot tracking tái dựng qua replay. Lịch hiện vẫn light/heavy chia đều; seeded slot planning, lunch/football/priority và analytics tổng hợp vẫn đang triển khai. |

| 2026-09-09 review fix | Đồng bộ cảnh báo screen reader với HUD khi slot chồng nhau: chỉ announce upcoming khi không có đợt active. Thêm browser regression với lịch cấu hình chồng giờ. |
