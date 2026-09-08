# ⚙️ SPEC — Triển khai kỹ thuật — Trùm Bia Hơi (v1.7)

> ⚠️ **Phần lớn doc này là GỢI Ý** (chốt founder 09/09): dev tự quyết kiến trúc, module, thư viện, layout. **Ràng buộc thật:** §7 config/không-hardcode · §1 + §5 engine thuần (không DOM, RNG seedable, `now` truyền vào) · server-authoritative + event sourcing + pin `configVersion` theo ca (§7/§10) · bất biến đo k (`04-SPEC` §5) · §13 DoD. Module map §2 mô tả đường đi từ prototype cũ — **chỉ để tham khảo**, không phải bắt buộc.
>
> Tài liệu cho **dev**: kiến trúc, module map, domain model, state machine, vòng tick, command/event, nạp config, hợp đồng API/WS, lưu trữ & thời gian, analytics, chiến lược test, Definition of Done — đủ để code từ prototype hiện có lên game đầy đủ theo phase. Không lặp lại luật chơi (xem GDD/03/04/08) — chỉ nói *code thế nào*.
> Ngày: 2026-09-08. Nguồn: GDD v1.7 §18–§19, 03-SPEC, 04-SPEC §3/§5, 08-SPEC + `docs/config/economy.tbh.json`, F23 (server), F25/F26 (account/pass), F12–F17 (meta), `game-extended-workflow-cl.md` (quy trình game canvas), `prototype/src/**` (code đang chạy). Nhãn: ✅ đã có · P1–P4 phase.

---

## 1. Kiến trúc tổng thể

```
┌─ Client (web, mobile-first) ─────────────────────────────┐   ┌─ Server (P3+) ────────────────────────┐
│ React DOM (HUD/sheet/modal/i18n)  ⇄  Pixi.js v8 (sân)    │   │ Node/TS · REST + WebSocket · Postgres  │
│            │ đọc World / gọi Command                      │   │ ┌ engine (CÙNG package) = nguồn sự thật │
│  engine (thuần TS) ── dự đoán cục bộ (P3) ─┐             │   │ │ event store (append) → projection     │
│  assets/registry (manifest → atlas)        │ JSON/WS     │   │ │ caps/rollover ngày VN · anti-cheat    │
│  config (economy.tbh.json, k)              └─────────────┼───┼→│ seasons/LP/locations/quests/risk     │
│  save: localStorage trước (versioned, event log) → server sau │   │ └ integrations: sports API, XSMB, payment │
└──────────────────────────────────────────────────────────┘   └───────────────────────────────────────┘
```
- **Thứ tự code (chốt 08/09): lưu local trước, server-authoritative sau** — nhưng thiết kế **server-ready từ đầu**: engine **cùng mã** chạy ở server; client chạy bản dự đoán để mượt, server trả delta có thẩm quyền (F23 §2).
- Bất biến kiến trúc: **engine không import DOM/Pixi/React**; **RNG duy nhất `rng.ts`** seedable; **số từ config**, không hardcode; **UI không chứa luật**.

---

## 2. Module map (**gợi ý** — một cách chia đã cân nhắc; dev tự quyết)

```
prototype/
  src/engine/
    config.ts        loadEconomy(json, k?) → EconomyConfig; price(kind, lvl); scaledRep(base)      [P1]
    constants.ts     re-export từ config (giữ tên cũ: SPAWN_BASE_MS…)                              ✅→P1
    types.ts         domain model (§3)                                                              ✅
    engine.ts        class Engine: world, tick(dt), commands (§5), events (§6)                       ✅
    rng.ts           mulberry32, randInt, weightedPick                                              ✅
    metrics.ts       computeStats(log) → k, stale%, loss theo nguyên nhân                            ✅
    systems/         (tách khi engine.ts > 600 dòng; mỗi file = 1 cơ chế, hàm thuần (world, cfg, rng, now))
      spawn.ts · order.ts · glass.ts · pour.ts · kitchen.ts · rush.ts · weather.ts · shift.ts · ledger.ts · quest.ts · risk.ts
    *.probe.ts       probe engine thật (node --import tsx), 1 file / bất biến                       ✅ lostFlash
  src/sim/headless.ts   bot tối ưu 5 seed → gate k                                                  ✅
  src/ui/            App.tsx (HUD/sheet) · GameView.ts (Pixi) · sheets/*.tsx · components.tsx · icons.tsx
                     pixiAssets.ts (fallback vẽ code) · tokens.ts (mirror design-tokens) · i18n/{vi,en}.json
  src/assets/registry.ts  manifest → Pixi Assets bundle theo phase, sprite(id, fallback)            [P1]
  tests/             engine unit (vitest) · replay · canvas (Playwright) · __screenshots__           [P1]
server/ (P3)         src/{api,ws,store,projections,jobs}/ · dùng @tbh/engine (workspace package)
docs/config/economy.tbh.json · assets/manifest.json · scripts/{check_economy_config,check_asset_manifest}.py
```
- **Bố cục chốt 08/09 (00-HANDOFF §4.4):** `packages/engine` (thuần, không phụ thuộc), `apps/web`, `apps/server` (từ M4) — npm workspaces ở root `package.json`, ngay từ M0.

---

## 3. Domain model (TypeScript) — mở rộng từ `types.ts` hiện tại

```ts
// ── Hiện có (P0) — giữ nguyên tên/field, chỉ THÊM ──
type Dish = 'bia' | 'lac' | 'nem' | 'dau' | 'topmo' | 'long'                       // P2 thêm 3
type GlassState = 'clean' | 'in_use' | 'dirty' | 'washing'
type CustomerType = 'thuong' | 'voi' | 'vip' | 'chipheo' | 'ngoily' | 'shipper' | 'football_fan'
type CustomerState = 'waiting' | 'ordered' | 'served' | 'enjoying' | 'left' | 'leaving_angry'
type OrderItemState = 'pending' | 'pouring' | 'cooking' | 'ready' | 'served' | 'cancelled' | 'wasted'
type OrderState = 'pending' | 'grace_leaving' | 'served' | 'expired'               // 03 §9.2
type TableState = 'empty' | 'seating' | 'awaiting_serve' | 'enjoying' | 'paying' | 'cleaning' | 'occupied' | 'broken'

interface Table { id; level: 1|2|3|4; capacity; seats: (Customer|null)[]; currentOrder: Order|null; state; roundsPlanned; roundsDone; brokenUntil?; confiscatedUntilShift? }
interface Order { id; tableId; round; items: OrderItem[]; placedAt; patienceMs; graceUntil?; state }
interface OrderItem { id; dish; customerId; needsGlass; glassId?; pouredAt?; kitchenJobId?; state }
interface Customer { id; type; tableId; seatIndex; state; maxPatienceMs; enjoyUntil?; archetype?: string /* skin */ }
interface Glass { id; state; pouredAt?; washStartedAt? }

// ── P1 ──
interface Inventory { stock: Record<Dish, number>; cap: number /* theo stall level */ }
interface Upgrades { keg: 1|2|3|4|5; washer; cooler; stall; kitchen: 0|1|2|3|4 }
interface Weather { current: 'sunny'|'hot'|'humid'|'rain'|'cold'; rolledAt }
interface Rush { active: RushType; startedAt?; endsAt?; schedule: { type: RushType; startAtMs: number }[]; seed }
interface Ledger { gross; penalty; net; arrived; served; lost: { expired; queue; overflow }; tipped; tipTotal; stale; reputationDelta; byDish: Record<Dish, number>; kValue }
interface Shift { running; closing; elapsedMs; durationMs; nextSpawnAt; firstSpawnDone; id; openedDayKey; configVersion: string /* pin config của ca — §7 */ }
interface Stamina { ms; regenActive; sessionIndex }
interface DayState { dayKey; earned; shiftsCompleted; wellRestedUsed; wellRestedUntil?; maxSessions; configVersion /* entitlement resolve lúc mở cổng ca — F26 */ }

// ── P2 ──
interface KitchenJob { id; orderItemId; dish; startedAt; endsAt; slot; state: 'queued'|'cooking'|'ready'|'wasted' }
interface Marketing { phone: boolean; qr: boolean; signboard?: SignStyle; flyer: { stock; campaignUntil?; usedThisShift } }
interface Quest { id; type: 'daily'|'shift'|'gift'|'attendance'|'referral'|'sign_in'|'life_path'; bucket?; target; progress; reward; state; seedKey }

// ── P3 (server-owned; client mirror) ──
interface Ledgers { coins; seasonEarned; lifetimeEarned; reputation; badgeShards; cosmeticTokens }
interface Lease { locationId; startsAt; endsAt; prepaidRent; deposit; rentPerDay; status }
interface Dog { owned; level; hp; atk; capturedUntil? }
interface RiskEvent { id; type; spawnedAt; deadlineAt?; state; payload }
interface Entitlement { kind: 'free_daily'; dayBucket; maxSessions /* = dailyShiftCap[segment], chơi free hết 08/09 */; usedSessions }

interface World { now; coins; dayEarned; glasses; tables; queue: QueuedGroup[]; tap: Tap /* → taps: Tap[] theo pourSlots */; washer; rush; weather; inventory; upgrades; shift; stamina; day; ledger; marketing; kitchen: { jobs; slots }; quests; log: ServeEvent[]; lostCustomers; rejectedAtDoor; lastEvents }
```
- **Không đổi**: `ServeEvent {t, customerType, dishes, payment, tip, credited, hadMoi, stale}` — phép đo k (04 §5) đọc từ đây; chỉ **thêm** field (vd `weather`, `rush`, `tableSize`), không sửa nghĩa `payment/tip`.
- Id sinh bởi `uid()` trong engine (deterministic theo thứ tự) — server dùng ULID riêng cho persistence, map 1–1.

---

## 4. State machine (cần code đúng thứ tự)

**Bàn** (03 §2): `EMPTY → SEATING(anim, ~0.4s P1) → ORDERING → AWAITING_SERVE → [served] → ENJOYING → (đợt kế → ORDERING | hết → PAYING → CLEANING(~0.6s) → EMPTY)`; `AWAITING_SERVE → grace_leaving (P1) → expired → cả nhóm chưa phục vụ rời → PAYING (thanh toán đợt đã served) → CLEANING → EMPTY`; Chí Phèo còn ngồi → `OCCUPIED` tới khi tự rời/bị tiễn (P2); `BROKEN` sau côn đồ (P3, không nhận nhóm tới khi sửa). P0 hiện gộp SEATING/PAYING/CLEANING = tức thì — P1 thêm 2 anim ngắn **không** đổi economy (không tính vào patience).

**Khách**: `waiting → ordered → served → enjoying → left`; `ordered →(patience hết)→ leaving_angry → left` (uy tín −5, phạt xu).

**Order**: `pending →(đủ món + chạm)→ served`; `pending →(hết patience)→ grace_leaving →(chạm trong grace)→ served (tip 0) | →(hết grace)→ expired`. Serve chấp nhận `pending | grace_leaving`.

**Cốc**: `clean → in_use(pouring→ready) → dirty → washing → clean`; Order expire: cốc đã rót → `dirty`; cốc đang rót → `dirty` (vòi giải phóng).

**Ca**: `resting → (thể lực 100% & entitlement) open → running → (thể lực 0 | ĐÓNG CA) closing (không spawn) → (khách về hết | kick-all) finalize → resting`. Credit ca + cap tiền: §8.

**Giờ Vàng**: `scheduled (t0) → warning (t0−20s) → active (t0..t0+dur) → ended`; ưu tiên chồng: inspection/gangster > football > heavy > light.

---

## 5. Vòng tick & command (engine)

```ts
tick(dtMs):  now += dt
  shift: elapsed, stamina drain, hết thể lực → closing; spawn khi now ≥ nextSpawnAt (nhịp/khách × weather × rush, floor)
  pour(s): mỗi vòi (pourSlots) đang rót → ready khi đủ pourMs; cần cốc clean + (P2) bom còn bia
  washer: slot xong → clean;   kitchen (P2): job xong → ready
  orders: pending quá patience → grace (P1) → expired: huỷ item, cốc → dirty, nhóm rời, phạt, uy tín
  enjoy: khách xong → served; cả nhóm xong → đợt kế | rời; cốc → dirty
  queue: nhóm quá patience → rời (lost.queue); bàn EMPTY → mời nhóm đầu
  rush/weather timers (P1);  risk timers (P3);  auto-assist: wash(), pour() (luôn bật)
```
**Command (player) — P0 ✅:** `startShift · endShift · serve(tableId) · toggleRush(P0) · toggleWashUpgrade(P0 đo)`. **P1:** `kickAll(shiftId, maxCost) · restock(dish, '+10'|'full') · buyUpgrade(kind) · buyTable · upgradeTable(tableId)`. **P2:** `queueKitchen(orderItemId)` (hoặc auto), `useFlyer · buySignboard(style) · buyUnlock('phone'|'qr') · claimQuest(id)`. **P3:** `payGangster · resistGangster · answerInspection(choice) · kickStubborn(customerId) · rentLocation(id) · leaveLocation · buyDog · feedDog · claimReward(id)`. Mỗi command: **thuần, trả `CommandResult {ok, reason?, deltas}`**, không throw; UI disable nút theo `canX()` cùng luật.

**Hàm luật dùng chung (không copy):** `tipFor(payment, patienceRatio, type, ctx)`, `penaltyFor(gross, type, rush)`, `reputationFor(...)`, `spawnIntervalMs(cfg, weather, rush, marketing)`, `queueSlots(totalCapacity)` — export từ `systems/` để server, sim, test dùng chung.

---

## 6. Event bus & analytics

`engine.events.on(type, handler)` — domain event phát trong tick/command (F17 §5): `shift_opened · shift_closed(ledger) · customer_spawned · customer_served(ServeEvent) · order_served · customer_left(reason) · glass_stale · rush_scheduled/started/ended · weather_rolled · upgrade_bought · restocked · quest_progressed/claimed · risk_event_spawned/resolved · life_path_level_reached · league_tier_reached`.
- **Quest, analytics, âm thanh, coachmark** đều là listener — engine không biết chúng.
- Analytics: catalog gộp từ F07–F26 §Analytics vào `docs/analytics-events.md` (P1 tạo); event tối thiểu P1: `game_start, shift_opened, customer_served, customer_left, shift_closed, upgrade_bought, restocked, rush_started, weather_rolled, tutorial_step_complete, performance_warning`. Không gửi PII; batch gửi cuối ca.

---

## 7. Config & số — **KHÔNG hardcode** (quyết định founder 08/09; admin: `trum-bia-hoi-brd-admin.md` §5.2)

**Nguyên tắc:** mọi tham số vận hành (số, ngưỡng, giá, tỉ lệ, thời gian, lịch, flag — tức *mọi key* trong `docs/config/economy.tbh.json`, kể cả 🟢 như `K_ANCHOR`, thời gian ca, số ca/ngày, số ca free/ngày) đến từ **Config Registry** của admin. Code chỉ giữ **schema (zod) + default fallback** để boot offline/test. Literal nghiệp vụ trong engine/server/UI = bug (DoD §13). Tier/role/hiệu lực từng key: 08-SPEC §22.

- **P1 (client-only):** `config.ts` load `economy.tbh.json` (Vite JSON import, validate bằng zod `EconomyConfigSchema`) → `EconomyConfig` typed; `*Base × k` resolve lúc load; `k` override `?k=` (dev) — **không** đổi cách đo k. Engine/UI **chỉ** đọc qua `config.get(path)` / object typed, không import `constants.ts` (constants.ts giữ lại cho prototype Phase 0 và chỉ còn là fallback được kiểm bởi `check:economy`).
- **P3 (server-authoritative) — Config Service:**
  - Bảng `config_versions {version, status: draft|approved|scheduled|active|archived, snapshot(jsonb), effectiveAt, expiresAt, changedBy, approvedBy, reason, rollbackOf, publishedAt}` + `config_overrides {key, scope: segment:<n>|campaign:<id>|player:<id>, value, effectiveAt, expiresAt, version}`. Seed lần đầu = import `economy.tbh.json`.
  - **Resolve** `resolve(key, ctx{playerId, segment, now})` = `player > campaign > segment > default`, chỉ lấy override còn hiệu lực; kết quả cache theo `(version, scope)`.
  - **Pin theo ca:** `POST /shift/start` chọn `configVersion` active tại thời điểm mở ca (theo `effectiveAt` của version: `immediate` / `next_shift` / `next_day` 00:00 VN / `next_season`), lưu vào `Shift.configVersion`; mọi validate/replay của ca đó dùng đúng snapshot ấy — publish giữa ca **không** đổi ca đang chạy. Entitlement ngày lưu `maxSessions` + version lúc resolve (F26).
  - Client nhận `configVersion` + snapshot public (bỏ key server-only như `risk.*` chance, anti-cheat ceiling) trong `GET /player/state`; lệch version → reload config khi **không** trong ca; UI chỉ hiển thị.
  - Sự kiện `ConfigPublished{version, keys[], effectiveAt, changedBy, approvedBy}` vào event store + alert ops; rollback = publish lại version cũ (không sửa row).
- **Đồng bộ ngược về repo:** admin export JSON (đúng schema) → commit `docs/config/economy.tbh.json` → `npm run sim`/probe/`check:economy` chạy trên số production. Balance change trước P3 = sửa JSON + sim + probe → Fast Lane (workflow §18); đổi *công thức* = Standard/Foundation (RFC). Sau P3, đổi *số* không còn là code change.
- **CI:** `npm run check:config` = `check:economy` (JSON ↔ constants.ts fallback) + `check:config-coverage` (`scripts/check_config_coverage.py`, **đã có**): (1) mọi section JSON được xếp tier trong `_meta.governance` — thêm key mà quên đăng ký → fail; (2) path trong governance resolve được (chống typo); (3) mọi `config.get('path')` trong `prototype/src` trỏ key có thật; (4) §22 của 08-SPEC có dòng cho mọi section; (5) advisory: literal số trong `src/engine` (trừ `constants.ts`/`types.ts`/`rng.ts`, và dòng có `// config-exempt: <lý do>`) — `--strict` biến thành lỗi khi engine đã chuyển hết sang `config.get`. Sau này thêm ESLint `no-magic-numbers` cho `src/engine` thay cho bước (5).

---

## 8. Thời gian, ngày, cap (khi chưa có server: client tính theo cùng luật; có server: server là nguồn giờ, client mirror)

- **Nguồn giờ = server** khi có server; trước đó client dùng cùng hàm day-key/cap (engine thuần) — chuyển sang server = đổi nguồn `now`, không đổi luật. Engine dùng `now` truyền vào (không `Date.now()` bên trong) → replay được.
- Day-key = `Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh'})` → `YYYY-MM-DD`. Rollover nửa đêm VN.
- Cap tiền: **per-earn** — mỗi `ServeEvent` gán bucket ngày tại thời điểm earn; `credited = min(gross, cap − dayEarned[bucket])`. Số ca: credit lúc **finalize** → ngày đóng ca. Tỉnh Táo keyed theo **open-day**, đúng `tip.wellRestedKeyedBy` trong JSON: chỉ đánh dấu khi mở ca thành công và đủ điều kiện nghỉ. Ba bucket phục vụ ba mục đích khác nhau; không dời tiền thưởng sang ngày mở/đóng ca.
- Thể lực: `ms` giảm theo `elapsed` trong ca; hồi `0.4×` chỉ khi `document.visibilityState==='visible'` (anti-idle: pause ca khi ẩn tab — engine không tick, hiện overlay "Game tự tạm dừng").

---

## 9. Lưu trữ — **localStorage trước, server sau** (thứ tự code, chốt chủ dự án 08/09; server-ready từ đầu)

| Thứ tự | Ở đâu | Gì | Ghi chú |
|---|---|---|---|
| **1 · trước** | `localStorage['tbh.save.v1']` | `{version, guestId, coins, ledgers, inventory, upgrades, tables, day, quests, settings(locale, sound, audio), onboarding, eventLog[]}` | versioned + `migrate(v→v+1)`; ghi sau finalize + sau mua; try/catch; **mọi mutation ghi vào `eventLog` append-only** (cùng schema event của server) — đây là điều kiện để bước 2 không phải viết lại |
| **2 · sau** | Server event store | events: `ShiftStarted, OrderServed, ShiftClosed, UpgradeBought, Restocked, TableBought, RiskResolved, SeasonRewardClaimed, LeaseStarted…` → projection `player_state` | client upload `eventLog` local 1 lần (guest claim, F25 §4) rồi server là nguồn sự thật; `idempotencyKey` mọi mutation; pin `configVersion`; reconnect/resync theo F23 §8 |

**Bất biến qua cả 2 bước:** engine thuần, `now` truyền vào, RNG seedable, event schema chung, không có luật nào chỉ tồn tại ở client. Chuyển bước 1 → 2 = đổi adapter `SaveStore` (local → remote), không đụng rule.

---

## 10. Hợp đồng API / WebSocket (khi có server, M4 — F23/F25/F20/F12/F19/F28; schema zod dùng chung client/server)

> **Mất mạng giữa ca (ràng buộc khi có server, acceptance ở F23 §8):** client buffer command kèm `idempotencyKey` + `clientSeq`, hiện trạng thái "đang kết nối lại" không che sân, engine client vẫn tick để hiển thị; reconnect → gửi lại buffer → server trả event log từ `lastSeq` → client resync (server thắng). Quá `reconnectGraceMs` (config) thì ca kết thúc theo luật closing (GDD §10) trên server, client nhận `ShiftClosed`.

| Nhóm | Endpoint | Body/Query → Trả về |
|---|---|---|
| Auth | `POST /auth/session` · `POST /auth/google` · `POST /auth/guest/claim` · `POST /player/locale` | token; `{playerId, provider, locale}` |
| State | `GET /player/state` | World mirror + ledgers + upgrades + entitlement + `configVersion` + `serverNow` |
| Ca | `POST /shift/start` (entitlement, stamina) · `POST /shift/serve-order {shiftId, orderId, clientNow, preparedItemIds, idempotencyKey}` → deltas (coins, rep, glasses, order/table state) · `POST /shift/close` · `POST /shift/kick-all` | server re-chạy engine tới `serverNow`, validate freshness/patience/idempotency/cap |
| Kho/nâng cấp | `POST /inventory/restock {dish, mode}` · `POST /upgrade/buy {kind}` · `POST /table/buy` · `POST /table/upgrade {tableId}` · `POST /unlock/buy {item}` · `POST /signboard {style}` · `POST /flyer/activate` | |
| Meta | `GET /seasons/current` · `GET /leaderboard?seasonId&tier&page` · `GET /street?locationId&tier` · `POST /season/rewards/claim` · `GET /life-path` · `POST /life-path/claim` · `GET /rental/locations` · `POST /rental/move {targetLocation}` · `POST /referral/attribute` · `GET /referral/status` · `GET /quests` · `POST /quests/claim` · `POST /social/send-message` | |
| Rủi ro | `POST /risk/resolve {eventId, choice}` (pay/resist/answer/calm/kick) · `GET /theft/report` | server roll + replay |
| Quyền chơi (free hết) | `GET /entitlements/day` → `{maxSessions, usedSessions, freeSessionsPerDay, normalDailyCap, products[]}` (số free/ngày **từ remote config server**, không hardcode client) · `POST /billing/session-pass/create {productId}` · `POST /billing/webhook/{provider}` | idempotent |
| Admin config (BRD §5.2; web admin riêng, RBAC) | `GET /admin/config/versions` · `GET /admin/config/versions/{v}` (snapshot + diff với active) · `POST /admin/config/drafts {baseVersion, changes[{key, scope, value, effectiveAt, expiresAt?}], reason}` (validate schema/range/tier) · `POST /admin/config/drafts/{id}/preview` → impact (player ảnh hưởng, faucet/sink 7 ngày, revenue) · `POST /admin/config/drafts/{id}/approve` (Tier A: người duyệt ≠ người tạo) · `POST /admin/config/drafts/{id}/publish {effectiveAt}` · `POST /admin/config/rollback {toVersion, reason}` · `GET /admin/config/export` / `POST /admin/config/import` (schema `economy.tbh.json`) | mọi mutation → audit log + `ConfigPublished`; Support/Viewer read-only |
| P4 | `GET /shop/season` · `POST /shop/purchase` · `GET /worldcup/schedule` · `POST /donate/{config,submit}` · `POST /lottery/buy` · `GET /lottery/draw` | |
| WS | `shift:event` (spawn/rush/weather/expire do server) · `risk:event` · `season:rollover` · `worldcup:broadcast` · `system:captcha_required` | client render, không quyết |

Anti-cheat: rate-limit theo endpoint; serve phải khớp state server (không tin `preparedItemIds` — chỉ dùng để đối chiếu); `status:'flagged'` chặn ghi leaderboard; ticket `anticheat-appeal`.

---

## 11. Asset pipeline trong code (P1)

- `assets/manifest.json` (schema workflow §14) → `src/assets/registry.ts` sinh bundle Pixi theo `usage` (`phase:p0p1`, `phase:p2`…); `npm run atlas` đóng gói `public/atlas/<bundle>.{json,png}` (nearest, `roundPixels`).
- `sprite(id, fallbackDraw)` — thiếu asset (status ≠ approved) → vẽ code (pixiAssets.ts) + console.warn 1 lần; `npm run test:assets` fail khi code tham chiếu id không có manifest approved.
- Overlay tint thời tiết: `ColorMatrixFilter`/sprite alpha theo tokens §4; theme đội (P4): tint mask grayscale.
- Font: Be Vietnam Pro (có dấu) cho mọi chữ canvas; Chakra Petch số HUD DOM; preload font trước khi tạo Text (tránh đo sai).

---

## 12. Chiến lược test & CI (workflow §6–§8, §11)

| Tầng | Công cụ | Bắt gì | Lệnh |
|---|---|---|---|
| Engine unit | vitest | tip/penalty/rep/spawn/queue formulas, state machine chuyển đúng, cap/rollover, config load | `npm test` |
| Probe bất biến | tsx | engine thật ≥3.000 tick: Σ cốc, Σ tiền = Σ log, bàn về EMPTY, cờ mất nhóm… | `npm run probe` (chạy `src/engine/*.probe.ts`) |
| Replay | vitest | seed + chuỗi command có timestamp → state cuối bằng nhau (client vs server P3) | `npm run test:replay` |
| Sim/k | tsx | 5 seed ≥500 lượt, k ∈ [2.0, 3.0], loss theo nguyên nhân, stale% | `npm run sim` |
| Config | python | JSON ↔ constants.ts (fallback) | `npm run check:economy` ✅ |
| Config coverage | python | mọi section JSON có tier trong `_meta.governance` · path governance resolve · `config.get(path)` ↔ JSON key · §22 (08-SPEC) đủ dòng · advisory literal số trong `src/engine` (`// config-exempt: <lý do>` để bỏ qua; `--strict` để fail) | `npm run check:config-coverage` ✅ (cả hai: `npm run check:config`) |
| Config service (P3) | vitest | resolve precedence player > campaign > segment > default; `effectiveAt` 4 chế độ; ca giữ `configVersion` khi publish giữa ca; rollback = version cũ; Tier A không self-approve | `npm test -- config` |
| Canvas | Playwright | nonblank, frame delta, screenshot diff baseline (390×844, 1280×720, DPR 1, seed cố định, font preload), input smoke (tap serve) | `npm run test:canvas` |
| Asset | python | manifest ↔ code, orphan, size budget | `npm run test:assets` |
| DOM a11y | axe | HUD/sheet contrast, focus | trong test:canvas |
| Perf | Playwright + benchmark scene | first playable < 5s mobile, fps ≥ 30 sàn, memory qua 3 ca | `npm run perf` |
| E2E | Playwright | mở ca → phục vụ → đóng ca → sổ ca → nâng cấp → mở ca kế | `npm run test:e2e` |

CI: `lint → typecheck → test → probe → sim → check:config (economy + coverage) → build → test:assets → test:canvas → test:e2e`. Screenshot baseline đổi phải có người duyệt (không auto-accept).

---

## 13. Definition of Done (theo feature) & lane
- Spec/tracker cập nhật; tests + build pass; replay pass nếu chạm gameplay; smoke 2 viewport; không asset missing/console error; perf trong budget; playtest note/metric.
- **Không hardcode:** feature không đưa literal nghiệp vụ mới vào code — số/ngưỡng/giá/thời gian/flag mới phải thêm key vào `economy.tbh.json` (+ tier ở `_meta.governance` và bảng 08-SPEC §22) và đọc qua `config.get`; `npm run check:config` pass (số không thuộc economy: chú thích `// config-exempt: <lý do>`).
- Lane (workflow §1, §10): balance constant → Fast; gameplay/UI/screen → Standard (review ≤5); economy formula, save schema, server/anti-cheat, asset pipeline → Foundation (RFC + manual sign-off). Auto-merge không bao giờ mặc định (CLAUDE.md).

---

## 14. Lộ trình code (thứ tự slice — **không phải cổng scope**)

> Scope = 1 phase, game đủ 5 lớp economy (`00-HANDOFF` §4, founder 09/09). Bảng dưới chỉ là **thứ tự merge** cho gọn; P1–P4 không có nghĩa "để sau mới quyết làm".

| Phase | Slice (gợi ý — dev tự quyết; Level 3 không còn bắt buộc) | Feature |
|---|---|---|
| P1 | config-loader · inventory-restock-ledger · tables-buy-upgrade · upgrades-basic · rush-light-weather3-grace · ui-hud-sheets-ledger · asset-registry-atlas · save-local-v1 · i18n-vi | F01–F06, F08(1), F09(3), F10(basic), F24, F25(locale) |
| P2 | kitchen-6-dishes · customer-types-p2 · rush-schedule-full · weather-5 · stall-signboard-unlocks-flyer · quests-local · ui-p2 | F07, F08, F09, F11, F17, F10(full) |
| P3 | server-skeleton-eventstore · **config-service-registry** (seed JSON, versions/overrides, resolve, pin theo ca) · auth-guest-google · donation (F20, không session pass) · serve-authoritative-caps · ledgers-league-leaderboard · life-path-locations-referral · risk-gangster-inspection-chairman-theft · dog · assistant-fallback · session-pass · anti-cheat · **admin-config-api** (BRD §5.2 endpoints, audit) | F12–F16, F18, F22, F23, F25, F26, F15, BRD admin P0–P2 |
| P4 | worldcup-pipeline · shop-season · football-rush · donation · lottery(flag) | F19, F20, F21 |

---

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.5 | Hạ phần lớn doc xuống mức gợi ý (founder 09/09): dev tự quyết kiến trúc/module/thư viện/layout; ràng buộc còn lại liệt kê ở đầu doc; §2 module map ghi rõ là gợi ý, bỏ mốc "tách từ engine.ts hiện tại". |
| v1.4 | §14 đổi nhãn: lộ trình = thứ tự slice, không phải cổng scope (giao 1 phase, `00-HANDOFF` §4). |
| v1.3 | `scripts/check_config_coverage.py` **đã hiện thực** + npm `check:economy` / `check:config-coverage` / `check:config` trong `prototype/package.json`; §12/§13/CI trỏ lệnh chạy được; quy ước `// config-exempt`. |
| v1.2 | **Mở rộng không-hardcode ra toàn bộ tham số** (founder 08/09): §7 viết lại — Config Service (versions/overrides, resolve precedence, pin `configVersion` theo ca, `effectiveAt` 4 chế độ, ConfigPublished, export về repo), §10 thêm endpoint admin config, §12 coverage test + lint, §13 DoD không hardcode. Khớp BRD admin v0.3 §5.2 + 08-SPEC §22. |
| v1.1 | Remote config cho số free ca/ngày, dailyShiftCap, k, giá — không hardcode (founder 08/09). |
| v1.0 | Bản đầu 2026-09-08: kiến trúc client-only → server-authoritative, module map, domain model mở rộng từ prototype, state machine, tick/command/event, config, thời gian/cap, lưu trữ, API/WS, asset pipeline trong code, test/CI, DoD, lộ trình slice. |
| v1.6 | Theo audit 08/09: §9 lưu trữ viết lại — server event store là nguồn sự thật **từ đầu**, localStorage chỉ cache/settings (bỏ giai đoạn P1–P2 save local); sơ đồ §1 sửa dòng save; §8 bỏ "server P3 / client P1"; §10 thêm ràng buộc mất mạng/reconnect (buffer + idempotencyKey + resync, `reconnectGraceMs` config). |
| v1.7 | Chủ dự án 08/09: **localStorage trước, server sau** — §9 viết lại thành 2 bước (local save versioned + eventLog append-only → server event store), bất biến server-ready; §1/§8 sửa theo; mất mạng §10 áp khi có server. |

| 2026-09-08 build | New implementation uses packages/engine (explicit-time event scheduler and replayable command log) + React DOM/CSS spatial web UI. Config coverage targets the new engine; seed-schema validation replaces zod for this initial runtime. |

| 2026-09-08 local replay v2 | Save v2 lưu command + event với configVersion/idempotencyKey, rulesVersion giữ replay v1; schema envelope hiện tại là local contract, server adapter ở M4 chưa xây. Hidden/offline dời gameplay deadlines, giữ wall clock VN, trừ pausedMs trong sổ ca. Nhập save có validate; tạo mới cần xác nhận trong UI và giữ bản cũ riêng. |

| 2026-09-09 rules v3 | Tỉnh Táo: wall rest anchor tách stamina anchor, stamp open-day, deadline được dời khi hidden/offline; bonus tách payment/tip nhưng dùng credit() và trần per-earn. Save container v2 chấp nhận rules v3, replay v1/v2 không thêm bonus/events; fixture v2 thật từ `2d80437` giữ amount 68, event IDs và lịch sử. HUD timer dùng cùng helper; sổ ca ghi thưởng thực nhận. |

| 2026-09-09 rules v4 | Local `kickAll` yêu cầu đúng shiftId và mức chi tối đa vừa hiển thị; engine advance rồi báo giá lại, từ chối ca khác/phí tăng/thiếu xu trước khi đổi trạng thái. Phí giảm được trả mức hiện tại. Events `customer_dismissed` ghi customerId/tableId/orderId/fee, `guests_dismissed` ghi shiftId/cost/count; không dùng customer_left. Save container v2 nhận rules v4; fields quote optional chỉ để đọc log v1–v3, fixture v3 thật từ c984541 giữ kết quả/event IDs. |
