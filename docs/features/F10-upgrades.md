# F10 — Nâng Cấp Quán (Upgrades)

> Phase 1-2. Nâng cấp là sink chính và là cách mở throughput. Dùng `k` cho giá xu, không dùng để thay đổi thời gian core nếu GDD giữ nguyên.

## 1. Scope

**Phase 1:** bom/vòi, bồn rửa, hầm lạnh, bàn cơ bản.

**Phase 2:** quầy/kho, bếp, full 5 cấp, visual progression.

## 2. Data model

```ts
type UpgradeKind = 'keg' | 'washer' | 'cooler' | 'stall' | 'table' | 'kitchen'

type UpgradeLevel = {
  level: number
  priceBaseXu: number
  repCost?: number
  requiredBadge?: string
  stats: Record<string, number | boolean>
}

type PlayerUpgrades = Record<UpgradeKind, number>
```

## 3. Upgrade tables

| Kind | Levels price base | Main stats |
|---|---|---|
| `keg` | 0 / 3k / 12k / 50k / 200k | pour slots 1->3, pourMs 3000->1800 |
| `washer` | 0 / 2.5k / 10k / 40k / 150k | wash slots 1->5, washMs 7000->1500 |
| `cooler` | 0 / 2k / 8k / 30k / 100k | freshness 12s->20s->35s->60s->infinite |
| `stall` | 0 / 1k / 5k / 20k / 80k | inventory cap 15->150 |
| `table` | see `03-SPEC-he-ban.md` | capacity/sprite |
| `kitchen` | 0 / 8k / 35k / 120k / 300k | unlock hot dishes, prep slots/speed |

Displayed price = `round(priceBaseXu * k)`.

## 4. Purchase rules

- Server validates `coins`, current level, prerequisites, inventory requirements.
- Upgrade increments one level only; no skip.
- Buying upgrade spends `coins`, not `seasonEarned`.
- If upgrade changes capacity, rerun layout safely after current shift or apply only when shop is closed. Phase 1: upgrades only outside active shift.

## 5. Effects

- `keg`: controls concurrent pours and pour duration.
- `washer`: controls dirty glass queue throughput.
- `cooler`: changes `beerFreshnessMs`.
- `stall`: changes stock caps and overflow conversion.
- `table`: changes `capacity`, sprite, table slots.
- `kitchen`: unlocks `dau`, `topmo`, `long`, prep slots.

## 6. UI

- Upgrade cards show current stat -> next stat, price, lock reason.
- Recommendation badge can point to observed bottleneck: no clean glasses, stale beer, stock full.
- Sprite changes after each level in Phase 2.

## 7. Analytics

- `upgrade_viewed {kind, level}`
- `upgrade_bought {kind, fromLevel, toLevel, price}`
- `upgrade_blocked {kind, reason}`
- `bottleneck_detected {kind, shiftId}`

## 8. Acceptance

- Upgrade stats update derived systems without reload.
- No purchase can create negative coins.
- Buying washer/cooler produces measurable improvement in wash wait/stale rate.
- Prices scale with server `k`.
