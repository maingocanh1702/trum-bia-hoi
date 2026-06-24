# Autopilot backlog — Trum Bia Hoi

> Lập kế hoạch parallel autopilot. Mỗi slice = một `/ap-new <slug>`. Token `invariants` lấy từ
> `docs/autopilot-invariant-catalog.md` — **slice share token → chạy TUẦN TỰ; disjoint token → song song.**
> Nguồn feature: `06-ROADMAP-trum-bia-hoi.md` (Phase 0–4). Chỉ slice Phase 0–1 là code được NGAY.
> Verify mặc định cho prototype: `cd prototype && npm run build`; slice đụng sim thêm `npm run sim`.

## Quy ước cột
- **slug** → dùng cho `/ap-new <slug>`, branch `feat/<slug>`, manifest, launcher.
- **risk** → P0 (không autopilot) / P1 (core, 2× clean, manual_only) / P2.
- **invariants** → token catalog; trùng nhau = không chạy song song.

---

## 🎯 Phase 0 — Prototype (NOW, code được ngay)

> Hầu hết đụng `engine-core` → **phần lớn TUẦN TỰ**. Track chạy SONG SONG được: engine ∥ ui ∥ economy-measure ∥ docs.

| slug | Feature | risk | scope (file chính) | invariants | depends_on |
|---|---|---|---|---|---|
| `engine-glass-lifecycle` | F04 vòng đời cốc clean→…→washing | P1 | prototype/src/engine/engine.ts·types.ts | `engine-core` | — |
| `engine-core-loop` | F01 ca 12', thể lực, trần ngày | P1 | engine/engine.ts·constants.ts | `engine-core`,`economy-balance` | glass-lifecycle |
| `engine-table-order` | F03 bàn/nhóm/serve theo Order | P1 | engine/engine.ts·types.ts | `engine-core` | core-loop |
| `engine-beer-freshness` | F05 mất hơi 12s, cờ vàng | P1 | engine/engine.ts·constants.ts | `engine-core` | glass-lifecycle |
| `economy-tip-penalty` | F06 tip/uy tín/phạt cụm | P1 | engine/metrics.ts·constants.ts | `economy-balance` | table-order |
| `economy-k-measure` | đo k ≥500 lượt, pipeline log | P2 | prototype/src/sim/headless.ts, scripts/measure_k.py | `sim-harness`,`economy-balance` | core-loop |
| `ui-game-view` | render GameView Pixi + HUD | P2 | prototype/src/ui/GameView.ts·components.tsx | `game-ui`,`assets-binding` | — (API engine ổn) |

**Chạy song song an toàn ngay (disjoint token):** `ui-game-view` (game-ui/assets) ∥ một slice engine (engine-core) ∥ `economy-k-measure` chỉ khi KHÔNG cùng lúc với slice đang sửa `engine-core` (vì k-measure share `economy-balance` với tip-penalty/core-loop → serialize nhóm economy).

---

## 🟢 Phase 1 — MVP (NEXT, sau khi P0 chốt k & feel)

| slug | Feature | risk | invariants | ghi chú |
|---|---|---|---|---|
| `engine-upgrades-basic` | F10 nâng cấp cơ bản (bom/rửa/hầm/bàn) | P1 | `engine-core`,`economy-balance` | sau core-loop |
| `engine-weather-min` | F09 thời tiết tối giản | P2 | `engine-core` | |
| `engine-customer-types-3` | F07 3 loại khách đầu | P1 | `engine-core` | sau table-order |
| `ui-art-v1` | F24 tokens→wireframe→sprite thật | P2 | `game-ui`,`assets-binding` | song song track engine |
| `account-locale-login` | F25 vi/en + guest + Google login | P1 | `build-config`,`game-ui` | cần design save-migration |

---

## 🔵 Phase 2–4 — DEFERRED (chờ exit-gate phase trước, chưa tạo slice)

F11 Kitchen · F08 rush đầy đủ · F09 weather đầy đủ · F07 full khách · F17 Quest · F12 League ·
F13 Life Path · F14 Locations · F15 Risk events · F18 Dog · F23 Server-auth · F26 Session Pass ·
F19 World Cup · F20 Donation · **F21 Lottery (cần legal review)**.

> Khi tới phase: thêm token mới vào catalog TRƯỚC (vd `server-auth`, `payment-entitlement`, `save-state`),
> rồi mới `/ap-new`. F21/F26 không autopilot trước khi qua legal/payment review (P0).

---

## Cách chạy một slice
```
/ap-new engine-glass-lifecycle      # scaffold worktree + manifest + launcher
# điền manifest: risk P1, scope, invariants=["engine-core"], base_ref master
/ap-engine-glass-lifecycle          # chạy autopilot → STOP_AT_READY
```
Nhắc: engine slice là **P1** (core game logic) → manual_only, 2× FULL clean, NEVER auto-merge.
`economy-balance` đụng = đụng số cân bằng game → fail-closed, đừng để 2 slice cùng sửa.
