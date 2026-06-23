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
