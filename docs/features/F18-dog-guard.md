# F18 — Chó Giữ Quán (Dog / Guard)

> Phase 3. Chó giữ quán bảo vệ khỏi bảo kê/trộm offline và hỗ trợ combat.

## 1. Scope

- Buy dog.
- Upgrade dog.
- Turn-based combat versus gangster.
- Offline theft protection.

## 2. Data model

```ts
type DogState = {
  owned: boolean
  level: number
  hp: number
  atk: number
  capturedUntil?: number
}

type BattleReplayStep = {
  actor: 'dog' | 'gangster'
  targetIndex?: number
  damage: number
  remainingHp: number
}
```

## 3. Purchase/upgrade

- Buy base: `2.000 * k` coins + mapped material requirement.
- Level stats: hp = level, atk = level for normal gangster combat.
- Upgrade costs coins + materials; server validates.
- Captured dog cannot fight or protect until `capturedUntil`.

## 4. Combat

- Gangsters ordered by index; HP/ATK increase by index: 1, 2, 3.
- Dog attacks first.
- If dog kills all: win, feePenalty=0, brokenTableCount=0, reward paid.
- If dog loses: dog captured, fee/repair penalties apply.
- Replay generated server-side, client animates.

## 5. Protection

- Offline theft reduction:
  - no dog: full bounded theft.
  - dog active: reduce or prevent based on level.
  - captured: no protection.
- Dog can reduce chance/severity of drunk fight escalation in later tuning.

## 6. UI

- Dog panel: level, status, captured timer, upgrade CTA.
- Gangster modal shows chance/estimated outcome in plain language.
- Battle replay is skippable after first view.

## 7. Analytics

- `dog_bought`
- `dog_upgraded {fromLevel, toLevel}`
- `gangster_fight_started {dogLevel, gangsterCount}`
- `gangster_fight_ended {outcome, reward, penalty}`
- `dog_captured {until}`

## 8. Acceptance

- Combat replay matches server outcome exactly.
- Captured dog cannot be used via client manipulation.
- Offline theft protection respects dog state.

## 9. Local purchase implementation — 2026-09-09 (partial)

`World.dogLevel` is the canonical purchase state: zero is unowned; level stats and
requirements are read from the pinned config, avoiding duplicated owned/hp/atk
fields before combat exists. `dogUpgradeQuote` projects the next configured level;
`upgradeDog {level}` accepts only current+1 and rechecks all stock and coins after
advancing to command time. It debits through the shared spend ledger and emits
`dog_bought` / `dog_upgraded {fromLevel,toLevel,cost,material_<dish>}`. Stale target,
insufficient resources and malformed commands leave the purchase unchanged.

There is no LP or shift-phase gate on dog purchase in this spec; LP1 itself needs a
dog. Existing commands/replay outcomes stay unchanged (additive v5 command). The UI
uses a native VI/EN sheet, config coin/material requirements, restock/storage links,
three draft illustrated sprites, and closes after success to avoid an accidental
next-level purchase. No battle, capture timer, offline protection or server outcome
is implemented by this purchase mechanism; sections4/5/8 remain open.

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Added local purchase/upgrade mechanism and derived dog stats; native state projection differs from the illustrative duplicated DogState in section2. Full combat/protection/server acceptance remains pending. |


### 2026-09-16 — A1 / JSON2.0.4 (supersedes LP1 dog prerequisite above)
M6 remains deferred and dog UI hidden. LP1 now needs only four seats and the configured lifetime threshold (50,000 Base ×2.5 =125,000 coins); no dog purchase is required. Historical config pins retain their original prerequisite.

## Changelog (append-only)
| Ngày | Thay đổi |
|---|---|
| 2026-09-18 owner | M6 (kể cả chó) **quay lại story** ở hồi 3 (từ LP4, ca ~90–120) — đè quyết định hoãn 11/09; chó ở làn "An ninh" của sheet Nâng cấp; bot sim không mua chó cho tới khi M6 bật. Chờ `risk-m6-story` (Đợt 5). Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
