# F19 — Cúp Bóng Đá & Giờ Vàng Xem Bóng

> Phase 4. Event theo lịch thật, tạo Giờ Vàng xem bóng và shop Vụ Bia. Sub-spec shop nằm ở `../../07-SPEC-shop-mua-giai-worldcup.md`.

## 1. Scope

- Fixtures/results server-side.
- Broadcast windows after real matches.
- Giờ Vàng bóng đá and fan groups.
- TV/schedule/theme hooks through Shop Vụ Bia.
- IP-safe naming/art.

## 2. Data model

```ts
type MatchFixture = {
  matchId: string
  seasonId: string
  homeTeam: string
  awayTeam: string
  kickoffReal: number
  endReal?: number
  score?: { home: number; away: number }
  importance: 'group' | 'knockout' | 'semi' | 'final'
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
}

type BroadcastWindow = {
  id: string
  matchId: string
  startsAt: number
  endsAt: number
  rushType: 'light' | 'heavy'
}
```

## 3. Server pipeline

1. Fetch fixtures/results from configured sports data provider.
2. Normalize into IP-safe internal team codes/names.
3. When match finishes, set `broadcast.startsAt = endReal + 20min` by default.
4. Push `worldcup:broadcast` websocket event to eligible clients.
5. Client renders TV score and applies F08 rush if player owns TV for that season.

## 4. Eligibility

- Without TV: show ambient notification only; no football rush.
- With TV: active football rush during broadcast.
- With schedule item: HUD shows upcoming broadcasts and applies `football_fan_spawn x1.15`.
- Team theme is cosmetic only and handled by shop spec.

## 5. Giờ Vàng behavior

- Group matches: `light` default.
- Knockout/final: `heavy`.
- Winning team fans can spawn more if score known.
- `football_fan` groups have longer enjoy and higher chance to order hot dishes.
- Still respects daily cap and normal table capacity.

## 6. IP and copy rules

- Use "Cúp Bóng Đá Thế Giới" or internal event label.
- Do not use FIFA logos, official mascots, federation emblems, or official kit designs.
- Country names and generic color palettes are allowed; prefer parody nicknames.

## 7. UI

- TV surface in quán shows score during broadcast.
- HUD countdown if schedule owned.
- Event shop entry links to TV, schedule, and theme items.
- End-shift summary labels football-driven revenue separately for learning.

## 8. Analytics

- `wc_fixture_synced {matchId, status}`
- `wc_broadcast_started {matchId, rushType}`
- `wc_rush_participated {hasTv, hasSchedule, revenue, fanGroups}`
- `wc_shop_opened`

## 9. Acceptance

- Client never hardcodes match schedule.
- No football rush without active TV ownership.
- Schedule booster cannot apply twice.
- Broadcast handles postponed/cancelled matches without crashing.
