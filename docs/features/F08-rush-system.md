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
effectiveInterval = rush.type === 'none'
  ? max(baseSpawnMs, rush.minSpawnIntervalMs)
      * weather.spawnMult * rush.spawnIntervalMult * marketing.spawnMult
  : max(baseSpawnMs * weather.spawnMult * rush.spawnIntervalMult * marketing.spawnMult,
      rush.minSpawnIntervalMs)
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

- Không có interval Giờ Vàng thấp hơn hard floor; nhịp thường dùng baseline floor trước hệ số demand.
- Rush heavy làm tăng áp lực rõ: served/lost ratio thay đổi so normal trong simulation.
- Rush warning xuất hiện trước, không che bàn đang cần phục vụ.
- Không double-apply multipliers khi football rush active.

## Changelog (append-only)

Audit rows imported from the original checkout describe its reference engine and measurements. Current implementation evidence is in docs/build-progress.md; source claims of19tests, automatic LP rewards or pan identity by dish/time do not override the reconciled runtime contract.


| Date | Change |
|---|---|
| 2026-09-09 | Rules v5 nối warning theo config, ưu tiên active timer, đóng đúng slot khi closing/finalize; hidden dời deadline, mỗi slot warning một lần. Replay v1–v4 giữ lịch sử, private slot tracking tái dựng qua replay. Lịch hiện vẫn light/heavy chia đều; seeded slot planning, lunch/football/priority và analytics tổng hợp vẫn đang triển khai. |

| 2026-09-09 review fix | Đồng bộ cảnh báo screen reader với HUD khi slot chồng nhau: chỉ announce upcoming khi không có đợt active. Thêm browser regression với lịch cấu hình chồng giờ. |

## Local implementation — rules v8 (2026-09-09)

- New shift openings plan the configured number of ordinary light/heavy slots from
  the exact locationId/shiftId/Vietnam day tuple. A separate seeded RNG balances
  and shuffles the kinds, then distributes available gaps; customer RNG is untouched.
  Every slot keeps its full configured duration and warning window. An impossible
  layout refuses opening before consuming the shift id, weather roll or money.
- Actual v1–v7 saves retain their original slots, including historically accepted
  overlapping layouts. A current command never replans an active legacy shift or
  fabricates historical reports. Save container stays v2.
- Heavy arrivals now retain the configured heavy enjoy multiplier in their sampled
  enjoyMs. Guests already present keep their sampled duration and subsequent rounds.
- Each new slot emits rush_scheduled, rush_started and one rush_ended report. Hidden
  time shifts deadlines; startedAt/endedAt are actual event wall timestamps, activeMs
  excludes pauses. Closing/finalization retains the existing rules v5 clock contract.
- Reports count events during the half-open active interval [start,end), not a cohort
  of guests who arrived during that interval: arrived includes queue rejection; served
  counts customer_served; lost counts expired orders and queue departures once.
  Payment/tips are nominal customer amounts, revenue is actual order credit including
  Tỉnh Táo and daily-cap truncation. StaleRate is stale/served, or zero without serves.
  Shipper, gifts and other coin_gain events do not enter the seated report or k.
- Sổ ca renders completed slot served/lost/revenue directly from these end events,
  in VI/EN. Departure feedback remains numeric/icon-only.

Verification:85 unit/34 browser tests;500 deterministic layout cases and genuine
v7 replay fixtures;50 seated economy rows (>=500 serves each), k2.2622–2.7625.
The separate sim:rush experiment measures five sunny seeds at initial devices: loss
0% normal,5.3–37.0% light,50.0–70.2% heavy. These are per-window event outcomes with
a restocking/service bot, not final balance or hosted playtest evidence. All spawn
floors/service ceilings hold. Canonical config values are unchanged. Independent
review pending; lunch/football/event priority and full F08 acceptance remain in scope.

| Date | Change |
|---|---|
| 2026-09-09 rules v8 | Implemented seeded ordinary slots, full warning/fit preflight, heavy enjoy and canonical end reports; preserved actual v7 schedules/replay, added pressure sim and VI/EN book rows. No config-number changes; review pending. |

| 2026-09-09 review receipt | Independent full-diff6535484..5e46cf1 found no actionable introduced defects. Author85 unit/34 E2E, config/build/assets and50 k+15 pressure rows pass. Ordinary schedule/reports verified locally; remaining F08/full game still in progress. |


## Ordinary demand correction — rules10

The none floor is a baseline cadence before demand modifiers; active-rush floors
remain absolute. This makes configured hot/humid speedups effective outside Rush
and allows the upcoming flyer producer to affect ordinary demand. No numeric tuning
changed. Keep first-group warmup and already scheduled nextSpawnAt; after an actual
group arrives, round the interval times its perCustomer size factor exactly once.
Existing guests and rush deadlines are unchanged. Historical rules1–9 use their
original max-of-everything formula; old snapshots retain their configVersion.
Seed1.7.1 records the clarified formula; marketing currently has its identity value
because its producer is the next slice. Config intake rejects zero rounded ticks
and unrepresentable single/group intervals across all weather/rush modes.

| Date | Change |
|---|---|
| 2026-09-09 rules10 | Reconciled baseline floor with GDD9 demand behavior while retaining active-rush hard floors, warmup, perCustomer rounding and true v9 replay. Numeric seed unchanged; independent review pending. |


| 2026-09-09 transition correction | Current rules10 commands advance elapsed time under the previous active version before switching, so previously played legacy arrivals are not recomputed. Historical1–9 commands retain original switching order. Pending arrivals keep their existing deadline. |


## Original-checkout audit history (reference only)

| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | Founder: đợt **heavy chỉ từ LP1** (`rush.schedule.heavyFromLifePath = 1`); trước đó cả 2 đợt/ca là light. Lý do (audit): quán khởi đầu 6 chỗ mất 40–50 % khách khi heavy đến ngay ca 1. Engine đã cài. |


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |
| 2026-09-18 owner | Nên có: không xếp lịch Giờ Vàng khi quán < 2 bàn (sim V4/W9: mất 4–7 khách/ca, không bắt buộc). Cầu theo sức chứa `spawn.capacityDemand{refTables 6, maxMult 4}` áp cả trong rush. Chờ S3. Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
| 2026-10-19 fun-buy-buttons-reason | "Departure feedback remains numeric/icon-only" nay kèm đúng 1 lý do trên toast mất khách (xem F07 cùng ngày); số liệu rush không đổi. |
| 2026-10-20 S3 rules 28 | `spawn.capacityDemand` áp cả trong Giờ Vàng (khoảng cách = max(nhịp, sàn rush) × cỡ nhóm × hệ số sức chứa: ở 1 bàn Giờ Vàng nhẹ có một khách mỗi ≈ 14,7 s và nặng ≈ 8,4 s, trước S3 là 3,7 s và 2,1 s; tỉ lệ rush/ngoài rush không đổi). "Không xếp Giờ Vàng khi quán < 2 bàn" **không cài** (nên có, không bắt buộc): cần thêm key số (`rush.schedule.minTables`, Tier B, §22, admin) và sửa `startShift`; cầu theo sức chứa + hàng đợi 1 chỗ đã giữ phần còn lại ở cửa không phạt. Ghi quyết định ở DECISIONS `02 · rush below two tables`. |
