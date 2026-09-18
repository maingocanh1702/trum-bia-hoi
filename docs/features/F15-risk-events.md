# F15 — Sự Cố Quán Nhậu (Risk Events)

> Phase 3. Risk layer: bảo kê, kiểm tra, khách xỉn/đại gia, đánh nhau, trộm offline. Phụ thuộc F18 dog/guard and F23 server.

## 1. Scope

- Gangster/bảo kê event.
- Inspection quiz event — ⏸ pending (xem §4).
- Chí Phèo -> đại gia reveal reward.
- Drunk fight simple intervention.
- Offline theft.

## 2. Data model

```ts
type RiskEventType = 'gangster' | 'inspection' | 'chairman_reveal' | 'drunk_fight' | 'offline_theft'

type RiskEvent = {
  id: string
  type: RiskEventType
  shiftId?: string
  spawnedAt: number
  deadlineAt?: number
  state: 'intro' | 'active' | 'resolved' | 'expired'
  payload: Record<string, unknown>
}
```

## 3. Gangster

- Spawn mid-shift or between shifts, server-side.
- `gangsterCount` 1-3 normal; boss post-MVP/server-only.
- Demand fee = `90 * gangsterCount * k`.
- Win reward = `225 * gangsterCount * k`.
- Decision window = 20s: `pay`, `fight`, `ignore`.
- Fight uses F18 turn-based combat. Lose can break tables/chairs and capture dog.

## 4. Inspection (kiểm tra ATTP/trật tự) — ⏸ **PENDING, chưa chốt (chủ dự án 08/09)**

> Tính năng này **và** ngân hàng câu hỏi (`docs/content/inspection-questions.json`) đều đang chờ chủ dự án chốt. Ship với `risk.inspection.enabled = false`; nội dung dưới là spec sẵn để khi chốt thì bật. Không tính vào acceptance của mốc M6.

- Quiz deadline ~15s, 2 attempts.
- Server sends question/options/correct validation token; client never knows correct answer.
- Fail: revoke certificate flag + force close shift, future reopen may require recovery action.
- Modal/minigame does not pause pressure phase unless explicitly intro-only.

## 5. Chairman reveal

- Trigger from `chipheo` pity.
- Reward category: coins, materials, reputation, rare glass.
- Can occur multiple times per shift if pity rolls hit.
- Reward overflow material -> coins at unit price.

## 6. Drunk fight

- Spawn from high-density/late/rain/humid conditions.
- Player choices: calm down, kick out, ignore.
- Ignore -> reputation loss and possible table dirty/broken.
- Keep Phase 3 simple: no physics/minigame.

## 7. Offline theft

- Calculated server-side at login after inactivity.
- If no dog/guard protection: lose bounded coins/materials.
- Must never reduce below starter safety floor.
- Show summary once; allow appeal/support if flagged as suspicious.

## 8. Analytics

- `risk_event_spawned {type}`
- `risk_event_resolved {type, choice, outcome}`
- `inspection_answered {attempt, correct}`
- `offline_theft_applied {coins, materials, protected}`

## 9. Acceptance

- Risk rewards/penalties are server-authoritative.
- Expired risk event resolves exactly once.
- Inspection cannot be answered by client-side correct answer leakage.
- Offline theft has caps and clear summary.

## Changelog (append-only)
| Ngày | Thay đổi |
|---|---|
| 2026-09-18 owner | **M6 quay lại story** ở hồi 3: bảo kê xuất hiện từ LP4 (gate mới, ngoài `chancePerShift`), chó (F18), kiểm tra theo flag; mùa 2 "Bảo kê" = M6 đầy đủ. Đè quyết định hoãn 11/09. Chờ `risk-m6-story` (Đợt 5). Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
