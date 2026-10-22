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
**Command (player) — P0 ✅:** `startShift · endShift · serve(tableId) · toggleRush(P0) · toggleWashUpgrade(P0 đo)`. **P1:** `kickAll(shiftId, maxCost) · restock(dish, '+10'|'full') · buyUpgrade(kind) · buyTable · upgradeTable(tableId) · kickTable(tableId, maxCost)` (Đợt 3, thay `kickStubborn` của P3). **P2:** `queueKitchen(orderItemId)` (hoặc auto), `useFlyer · buySignboard(style) · buyUnlock('phone'|'qr') · claimQuest(id)`. **P3:** `payGangster · resistGangster · answerInspection(choice) · rentLocation(id) · leaveLocation · buyDog · feedDog · claimReward(id)`. Mỗi command: **thuần, trả `CommandResult {ok, reason?, deltas}`**, không throw; UI disable nút theo `canX()` cùng luật.

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

**Adapter local hiện tại (09/09):** localStorage đã hoàn thành bước đầu. Career
30 ngày tạo archive 80 MB, vượt quota localStorage đo được trên Chromium. Dữ liệu
chơi chuyển sang IndexedDB `tbh.career.v1`; settings và bản localStorage cũ được giữ.
Header, phần command/event mới và backup cùng một giao dịch nguyên tử. Autosave
chạy sau lệnh/sự kiện và định kỳ, chỉ báo đã lưu sau commit; revision chặn tab cũ
đè tab mới. Import/reset kiểm tra replay trước khi backup và thay thế nguyên tử.
Lỗi quota/blocked/abort giữ bản đã commit và hiện phục hồi, không tạo game mới âm thầm.
Export vẫn là archive versioned cũ, lịch sử không bị cắt. Boot vẫn replay toàn bộ;
chi phí khởi động dài và bộ nhớ là giới hạn còn lại. Đây là lưu local, chưa phải
đồng bộ tài khoản/server. Quyền kiểm tra/migrate guest phía server vẫn theo F25.

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

| 2026-09-09 rules v5 | `updateRush` đồng bộ trước mọi command hiện hành và tại tick/finalize; nextDue đưa warning/end vào lịch. Active slot giữ private index được tái dựng khi replay cả log cũ; `shift.rushUntil` cấp deadline cho HUD, dời theo hidden time. Slot `warned` chống lặp event; current command cùng timestamp vẫn sửa clock trước khi tính xu. Container v2 nhận rules v5; fixture v4 thật từ b97ff07 giữ serve 210/coins960 và toàn bộ events trước khi nhận command mới. |
| 2026-09-09 rules v6 | Shared progression projection runs before/after current commands, emits each newly reached LP once, and keeps claims separate. Container v2 accepts rules1–6; actual eligible v5 fixture from d2918e9 preserves LP0/money/events until a new command. Reward quote preflights coin/stock/token sums; shared gift quote owns overflow math. Phone/QR use existing spend and exact identities. Peak/season/server producers remain unfinished. |

| 2026-09-09 rules v7 | One DeliveryOrder + nextDeliveryAt use the injected scheduler, seeded finite menu catalog and exact serveDelivery id. All stock preflight/debits are atomic, no table/glass/queue use; creditQuote shares the counted cap with credit(), net/bonus remain separate audit amounts. Pending delivery blocks finalize/kickAll, hidden time moves both deadlines. Save container v2 accepts rules1–7; real v6 phone-owned history from598f66f stays inert until its first current command arms a future timer. Separate delivery stats never enter seated k. Native sheet closes before DOM removal so focus returns to its opener. |

| 2026-09-09 rules v8 | Container v2 nhận rules1–8. New openings dùng planRushes với RNG riêng từ location/shift/day; peek shift id để preflight trước mutation. Optional schedule seed và start event index phân biệt slot mới với lịch v7 thật, không replan/retroactive report. summarizeRush đọc một interval event duy nhất tại end; báo cáo giữ actual credit khác nominal payment/tips, excludes shipper/reward. Heavy enjoy chụp khi arrival. npm run verify thêm sim:rush (pressure experiment), unit vẫn node:test/tsx của runtime hiện hành. |

| 2026-09-09 rules v9 | Savev2 accepts rules1–9. SignStyle is optional for historical worlds; signboard/signboard:style ownership reuses unlocks and LP projection. Two commands use one quote and existing spend; config validates scaled cost/rep and effective weights/cadence. Future spawn weight and deliveryInterval consume selected effects without rewriting current customers/timers. Genuine v8 delivery/rush snapshots assert original events/money/IDs and current continuation. |


| 2026-09-09 rules10 | One arrivalIntervalMs helper owns unrounded current cadence and config intake validation; none baseline precedes weather, active floors remain absolute. Spawn rounds once after group-size factor. Container v2 accepts1–10; genuine v9 hot/humid snapshots retain every recorded world/event value, existing pending deadline and pinned configVersion. A current command selects10; newly scheduled intervals use current semantics. Seed1.7.1 updates formula text only. |


### Rules10 transition boundary

| Incoming recorded/current command | Advance elapsed time | Execute command |
|---|---|---|
| Historical rules1–9 | Select incoming version before advance, preserving original replay semantics | Same incoming version |
| Rules10+ | Advance under the previously active version, including autonomous ticks already played since the last command | Then select incoming version at its timestamp |

The distinction matters for a live legacy instance that advanced between commands:
replay has only the commands/time frontier, so selecting10 before that interval would
rewrite earlier arrivals. Idempotency/conflict/stale checks still happen first. This
is one pre-dispatch transition in applyCommand, not a per-command workaround. Real
v9 hot/humid tests now advance additional legacy ticks before current input; existing
v7 rush-clock and v6 shipper replay tests also exercise the boundary unchanged.

| 2026-09-09 transition correction | Preserve pre-command autonomous history when adopting rules10; retain historical1–9 switch-before-advance behavior. Fixes replay mismatches exposed by full legacy clock/delivery tests. |


| 2026-09-09 rules11 | Savev2 accepts1–11. Optional world.flyers and shift.flyersUsed/flyer keep legacy projections unchanged; commands buyFlyer/activateFlyer use one quote, changeRep and exact current shiftId. Existing arrival helper takes the actual campaign state, expiry uses the injected scheduler, and summarizeRush derives seated results from events. Protocol10 remains the fixed switch-after-advance threshold; true v10 weather/Neon captures from432626d replay identically through first current input. Server/F17 claim producers remain separate unfinished milestones. |


## 2026-09-09 — Per-shift config pinning and local save v3 (M4 prerequisite)

The pure engine now separates the original creation snapshot from the current
shift pin. `Game.command(envelope, openingConfig?)` accepts a loaded/frozen config
only as a trusted adapter argument to `startShift`; player payload fields do not
select a config. A registry must still resolve which snapshot is authorized.

- Idempotency, malformed/stale input and version-content collisions are checked
  before mutation. Retrying an opening returns its original result even if the
  registry has since selected another version.
- Elapsed time and pre-command housekeeping use the previous pin. Candidate
  admission checks use the proposed config, but an active/closing shift, unready
  stamina, exhausted day cap or invalid rush schedule cannot switch the current pin.
- Only a successful opening adopts the candidate. Existing coins, earned ledgers,
  stock, equipment and table identities/levels persist. Stamina keeps its proportion
  of the old duration; owned tables take the new capacity for their existing level.
  Starting-wallet/stock defaults never reset an existing player.
- For a start command, logged `configVersion` identifies the admission candidate,
  including a failed attempt; other commands identify the current pin. Successful
  changed-version openings emit `config_pinned` with both versions and shift ID.
  Refused-candidate housekeeping events may therefore retain the previous version.
- Single-snapshot exports remain savev2. Savev3 stores `config` (original snapshot),
  `configs` (additional used/attempted snapshots), commands, events and time frontier.
  Replay resolves each command by exact version and rejects missing/duplicate/unused
  catalog entries, unsupported pre-rules15 transitions, duplicate replay commands,
  mismatched results or altered event fields. v3 compares both directions; v1/v2
  retain their historical additive event-payload compatibility.
- Rules15 introduces this transition; historical1–14 handlers remain replayable.
  The rules10 elapsed-time boundary stays fixed. No canonical config keys, prices,
  dependency, HTTP endpoint, authentication or network authority were added here.

This is the engine prerequisite only. Config Registry persistence, version approval,
scoped overrides/effectiveAt, RBAC, server event store, guest claim and reconnect
remain M4 work. Local save validation is not an anti-cheat or authenticity proof.

| Date | Change |
|---|---|
| 2026-09-09 | Added rules15 trusted opening snapshot, immutable config catalog and multi-config savev3; preserved old replay protocols and clarified rejected-candidate log/event semantics. M4 server/registry still pending. |


| 2026-09-09 pin review correction | A candidate must retain the current owned location ID; otherwise opening refuses without relocation or adoption. Same-version equality ignores object-key order recursively, but array order and values remain immutable. |

| 2026-09-09 onboarding compatibility | Before changed-config adoption during onboarding, the guaranteed first group must fit at least one retained table using its candidate capacity. InitialTableLevel defaults never replace owned table levels. |


## Management pause protocol — owner 2026-09-09

Rules16 extends the existing activity command with optional `paused: boolean`.
`active` still means the player is present; `active: true, paused: true` means a
visible management menu. Hidden/offline activity clears pause and remains inactive.
Do not conflate gameplay time with presence: explicit menu actions (including
attendance and flyer activation) remain available, and the VN calendar stays real.
The existing paused advance path shifts all gameplay deadlines; no second clock.
It observes the current attendance day while present, without granting played-time
quest progress. Closing the last dialog resumes from its remaining deadlines.
Rules1–15 replay unchanged; older protocols cannot acquire the new pause field.
The saved command log replays pause/resume and keeps exact world/event history.

Web derives pause from management/welcome/equipment modal state, combines it with
document visibility before paint, and dispatches only when activity or pause changes.
A saved session reload clears the closed menu after preserving offline elapsed time.
Recovery errors never dispatch/save over corrupt input. Inline table service is live.
Stock purchases stay in the open menu; explicit closing/wait commands return to the
yard for customer drain, and the actual close event may open the final report.

| Date | Change |
|---|---|
| 2026-09-09 | Rules16 preserves player presence during management pause, reuses deadline shifting and logs menu lifecycle; old replay versions remain fixed. Added engine and real-browser regressions for actions, clock hold, visibility, reload and calendar behavior. |


## M4 event store implementation — 2026-09-09

`apps/server` now contains the trusted internal `GameStore`. Initial storage uses
Node22.22.1 native SQLite/WAL rather than the suggested PostgreSQL. This changes
the implementation choice, not event sourcing, server-owned time/state or config
pinning. It is not yet the web transport or a complete server-authoritative cutover.

Commands, domain events, original config snapshots and the player time frontier/
projection commit together under an immediate transaction. Each player's command
key and event sequence are unique. Replays use the existing engine/save decoder
and reject projection drift. Cache entries are bounded and tied to durable revision;
a different connection or failed write invalidates stale in-memory state. Config
identity reuses the shared semantic helper, while persistence retains the first
exact snapshot's dictionary order for old seeded sampling. A changed server config
only takes effect at the next successful shift opening.

Future authenticated adapters must resolve player ownership themselves and never
forward client state, clocks, seed or opening config. Guest claim, public/private
config projections, scheduled publish/approval, HTTP/WS sequencing, reconnect grace
and production deployment remain unfinished. The web keeps localStorage meanwhile.

| Date | Change |
|---|---|
| 2026-09-09 | Added real SQLite transactional event-store workspace as M4 persistence foundation; PostgreSQL remains an optional deployment evolution. Registered replay, retry/rollback and ownership-boundary expectations; no transport/auth completion claimed. |

## Live upgrade protocol — owner 2026-09-09

Rules17 permits current equipment, kitchen and table purchases during open/closing
shifts, with the same quote/command/ledger and management pause. Historical1–16
retain their outsideShiftOnly gate and result strings. The retired phase1 flag stays
in old snapshots; seed1.7.2 sets it false. Quotes/UI use the current policy even for
a running shift pinned to an older config. No mid-shift price/config adoption occurs.
Existing prep deadlines, people, orders and balances are not reset by an upgrade.
An empty table is required to increase that table's level/capacity. Server uses the
same engine; no special transport-only upgrade rule exists.

| Date | Change |
|---|---|
| 2026-09-09 rules17 | Allowed in-shift upgrades per owner; legacy gate retained only for exact old replay, current UI removes close-shift restriction and reports actual shortage. Added real v16 migration and mobile purchase/pause checks. |

### Stocked production protocol18 — 2026-09-09

`World.beer` owns ready servings and one `{quantity, startedAt, readyAt}` batch.
`beerStatus` is the shared UI/engine capacity calculation. Raw stock is reserved at
batch start; tray allocation consumes ready servings and one physical clean glass.
Tray items are outside tank storage (large groups can assemble across batches).
No second raw-stock debit at service. Existing pour events mark tray allocation;
`beer_batch_started/ready` report actual production. `washerStatus` derives the
clean/dirty/washing pool, with one washer load of up to configured slots.

Rules18 + config refillEnabled gate stocked beer; existing disabled snapshots keep
their production through the current shift. New config1.7.3 pins at successful
startShift. Rules1–17 replay unchanged, including an actual pre-edit v17 save.
Menu/hidden pause shifts batch start/end times; upgrade only affects subsequent
loads. Ready beer and in-flight jobs survive closure/reload/config changes without
inventory deletion; no new load when fully closed. A lower future cap blocks new
production until existing reserve drains; a disabled future refill config retains
reserve for re-enablement and uses legacy pouring in the interim.

| 2026-09-09 protocol18 | Added stocked beer/load timing and shared live capacity read models; old config/replay preserved, no server/client protocol split. |


## M4 guest HTTP transport — 2026-09-09

`apps/server/src/http.ts` exposes cookie-authenticated state/events and one generic
`/player/command` route to the existing engine. This replaces the suggested per-action
HTTP aliases for the current implementation; game rules, idempotency and server time
remain in GameStore/engine. SQLite schema2 adds hashed, expiring/revocable guest
sessions with atomic guest+player creation and preserves v1 replay history. New API
responses include the current pinned configVersion; raw config/private RNG/generation
seeds are withheld. See `apps/server/README.md` for exact routes/deployment options.

This is a dependency toward M4, not the web authority switch. Google link/claim,
clientSeq and reconnect-grace lifecycle, public registry/RBAC/config, WebSocket push
and remote web integration remain in the original full-game scope. The existing
5174 local save stays active until that integration can satisfy F23§8 and F25§10.

| Date | Change |
|---|---|
| 2026-09-09 HTTP/session | Implemented native HTTP guest authentication/state/command/event boundary and schema2 session migration. Real socket/security/persistence checks added; full verification/review in progress. |
| 2026-09-09 HTTP review | Strict action-field allowlists and invalid-cookie refusal precede mutation. Catch-up now reads at most100 durable events directly from SQLite, with lastEventSeq/hasMore continuation; it does not advance simulation. State/command operations remain the simulation clock boundary. |


## M4 ordered ingress — 2026-09-09

POST `/player/connect` creates/resumes an owned client stream. POST `/player/command`
requires clientId/clientSeq/idempotencyKey/command. SQLite schema3 stores stream IDs
and append-only receipts linked to the existing command log in the same transaction;
acknowledgedSeq is derived from those receipts. Gaps or altered retries return409;
processed domain failures return200/result and consume their sequence. Same-key same
payload retries return the original result without another mutation. Distinct tabs
keep separate sequences, sharing player-wide idempotency and serialized game state.

This is the server half of ordered replay; network grace closing and browser durable
buffer/reconnecting UI remain unfinished. No engine-only-client rules or alternate
money reducer are added; the owner's local5174 adapter is not switched yet.

| Date | Change |
|---|---|
| 2026-09-09 ordered ingress | Added mandatory HTTP client sequencing and atomic durable receipts around the shared engine. Server now refuses unsequenced HTTP commands; full reconnect/remote cutover remains in progress. |

| 2026-09-09 browser save | Bước local dùng IndexedDB sau khi career80MB vượt localStorage: append delta, atomic header/history/backup, compare revision, async boot và migration giữ nguồn cũ. Không đổi schema replay/rules/economy hay tuyên bố cloud sync. |

| 2026-09-09 browser recovery | Integrity failures now expose import/reset and the retained legacy download. Before replacement, preserve the complete surviving raw IndexedDB header/chunks in an atomic forensic backup. Fresh UUID revision prevents a stale pre-recovery writer from regaining ownership; prior numeric revisions remain readable. Pending-reload protection has a real blocked-transaction browser test. Playwright-only HMR is disabled so developer websocket reconnect cannot navigate timed tests. |

| 2026-09-10 browser validation | A raw read snapshot is retained until validation/commit, so decode-level metadata/frontier/command/event corruption uses the same forensic backup and legacy-export recovery as structural corruption. Browser clock tests await asynchronous boot; the Playwright-only dev WebSocket is disabled as well as HMR. |

| 2026-10-19 rules 28 (S1 `eco21-seat-model`) | Container/save accept rules 1–28; `CURRENT_RULES` 28 (`SEAT_RULES`). Seat-model mechanics run only when rules ≥ 28 AND the pinned snapshot is seat-shaped (`isSeatModel`: `upgrades.table.chairPriceBase` present); a pinned capacity snapshot keeps its old behaviour under rules 28 until the next opening adopts a seat snapshot. `loadConfig` picks the shape by marker: 1.x → `docs/config/legacy/economy-1.7.3.json`, pre-seat 2.x → frozen `docs/config/legacy/economy-2.0.4.json`, else the seed. `replay()` refuses a seat snapshot or `buyChair` entry below rules 28. Migration D2 is part of the logged `startShift` that first pins a seat snapshot (keep the first `tableSlots` tables at `min(2, seats)`, levels kept, no refund, `seat_model_adopted` once) — deterministic on replay, no new system command. New command `buyChair{tableId}` (HTTP allow-list updated); `Group.seats` and `Stats.noSeat` are optional fields written only on seat shifts, so rules ≤ 27 worlds serialize unchanged (fixtures `capacity-lv3x{3,6}-v27.json` hold world hashes recorded by the pre-change engine). |
| 2026-10-19 merge Wave 1 × S1 (stage 00) | `loadConfig`: a pre-seat snapshot from Wave 1 (JSON 2.0.5/2.0.6) carries presentation keys the frozen `docs/config/legacy/economy-2.0.4.json` does not. `shape()` takes the bundled seed as the template for the six `ADDED_LATER` paths the expected shape lacks and accepts the tier C `nextGoal` name in such a snapshot; every other key and tier list is still exact. Save and replay formats are unchanged. Proof: `packages/engine/test/seat-model.test.ts` `a pre-seat snapshot from Wave 1 …`. |
| 2026-10-20 stage 00 review round 1 (config label) | The bundled seed `docs/config/economy.tbh.json` is `_meta.version` **2.0.21** (was 2.0.20 after the merge). Reason: S1's earlier tip (`8f50e5f`) carried a different content, without Wave 1's Tier C keys, under the same label 2.0.20; two contents under one version make `registerConfig` (`apps/server/src/store.ts`) throw `store:configVersionConflict` for a store that registered the earlier seed, and `newerBundledConfig` (`apps/web/src/local.ts`) only adopts a numerically newer X.Y.Z, so a browser save pinned to the earlier seed would never adopt the merged one. Label only: no number, rule, save or replay format changes; no code or test names the literal. Later slices bump from 2.0.21 (S5 seals 2.1.0). |
| 2026-10-20 stage 00 review round 1 (config shape) | `loadConfig` / `shape()` narrowed (CRITICAL path, only ever stricter than the previous stage-00 row): (1) the six `ADDED_LATER` presentation paths and the tier C section name `nextGoal` are tolerated as extra keys ONLY when the expected shape is the frozen `docs/config/legacy/economy-2.0.4.json` (a pre-seat Wave 1 pin, JSON 2.0.5/2.0.6; `loadConfig` passes the flag); a 1.x or seat-model snapshot carrying them is refused with `config:…:keys` exactly as on `main`, which supersedes the broader wording of the "merge Wave 1 × S1" row above. (2) Keys are compared with `Object.hasOwn`: an own key named like an `Object.prototype` member (`constructor`, `toString`, …, an own `__proto__` from `JSON.parse`) is an unknown key at every object node instead of passing unchecked (a hole on `main` too; admin proposals and the admin preview feed `loadConfig` JSON). The 11 historical pins of `main` (1.6.0, 1.7.0–1.7.3, 2.0.1–2.0.6) load or refuse exactly as on `main`. Save and replay formats and every number are unchanged. Proof: `packages/engine/test/seat-model.test.ts` `Wave 1 presentation keys extend the frozen capacity shape alone …`, `a snapshot key named like an Object.prototype member …` and `a Wave 1 save (rules 27, pinned the way the Wave 1 build wrote it) replays byte for byte …`. |
| 2026-10-20 stage 00 review round 2 (correction) | Corrects one sentence of the round-1 `shape()` row above (description only, the code did not change): a **1.x** snapshot carrying the Wave 1 presentation keys or the tier C name `nextGoal` is refused with `config:…:keys` exactly as on `main`; on the **seat shape** (2.0.20/2.0.21) those keys are ordinary template keys of the seed, each optional in an older pin (`ADDED_LATER`), so a seat snapshot carrying them loads. Only the frozen `docs/config/legacy/economy-2.0.4.json` shape (the pre-seat Wave 1 pin, JSON 2.0.5/2.0.6) is extended by them. The row above stays as history (append-only). |
| 2026-10-20 rules 28 (S2 `eco21-instant-pour`) | `Game.prepare()` takes beer straight from the reserve into a clean glass, with no tap queue and no `pourMs`, when `direct` = `batches && (!modern || rulesVersion >= 28 && instantPour(config))`: the old `batches && !modern` branch (rules 18–20 or a 1.x pin) is the same boolean as before, the new one is rules 28 on a seat-model snapshot (`instantPour` = `refillEnabled && isSeatModel`, the same convention as the S1 seat model: a pinned capacity snapshot keeps its tap through live rules-28 commands until the opening that adopts the seat model, and the pinned config alone tells the UI which pour it is). `beer_pouring`, `beer_poured{fromReserve:true}` and `order_ready` share the tick of `order_placed`. `beerStatus()` gains the read-only fields `instant` and `serveNow` (= min(ready beer, clean glasses)); no world, save, replay or config shape changes, no new key, `CURRENT_RULES` stays 28. Proof: `packages/engine/test/instant-pour.test.ts` (the `capacity-lv3x{3,6}-v27.json` world hashes recorded by the pre-S2 engine still match and every beer of those histories took `pourMs`; the existing `legacy-*` fixtures replay unchanged). |
| 2026-10-20 rules 28 (S2 review round 1) | (1) Correction of the unconditional wording of the S2 rows and notes above (03-SPEC §4, 08-SPEC §8.1 and changelog, analytics-events, F10, GDD, the S2 row of this table): the instant pour needs the keg refill on. The gate is `rulesVersion >= 28 && instantPour(config)` with `instantPour` = `keg.refillEnabled && isSeatModel`; a seat-model snapshot with `refillEnabled=false` (Tier B) has no reserve to pour from, keeps the tap and the `tap` cause, and `beerStatus().instant` stays false (`packages/engine/test/instant-pour.test.ts` `a seat-model snapshot with the keg refill switched off keeps the tap: the gate needs refillEnabled as well as the seat shape`). The code comment of `instantPour` no longer claims that rules 28 only runs seat snapshots: a seat-model snapshot only ever runs at rules ≥ 28 (`replay()` refuses older entries for one), a capacity pin may run at rules 28 and keeps its tap until the opening that adopts the seat model. (2) Forward compatibility: rules 28 is one version for S1–S4 and is unreleased (`main` is 27), so rules-28 saves recorded by earlier tips of this chain (S1, later S2…) do not decode under the next slice — `decodeSave` throws `save:event-mismatch` (probe: a 20 s save written by S1's engine, `beer_poured` 2 s after the order through the tap, decoded by S2) and the app shows the corrupt-save recovery screen with the original kept: start from a fresh save. Saves recorded at rules ≤ 27 are unaffected (byte-identical, see the S1 and S2 rows). |
| 2026-10-20 rules 28 (S3 `eco21-capacity-demand`) | Config **2.0.22**: `spawn.capacityDemand {refTables, maxMult}` (Tier A, dotted entry like `spawn.pPair`), `runtime.queueBaseSlots` 1 / `queueSeatsPerSlot` 8, `patience.thuongMs` 24 000, `upgrades.keg._rule` and `spawn.queueSlotsFormula` rewritten. `Game.spawn()` multiplies the gap once, before rounding, by `capacityDemandMult(config, tables)` (x1 without the key); queue slots and patience are read from the snapshot as before, so no rules gate was needed (a seat-model snapshot only runs at rules ≥ 28; capacity pins and pins ≤ 2.0.21 keep their own numbers). `loadConfig`: a seat-model snapshot labelled **before 2.0.22** that lacks `spawn.capacityDemand` is shaped by the seed minus the S3 keys (`seatShape()`: exact, nothing loosened; the Tier A list must lack the entry too), one labelled 2.0.22 or later must carry the whole group; a 1.x or capacity snapshot carrying it is refused as before. `validate()`: whole `refTables ≥ 1`, finite `maxMult ≥ 1`, and a gap that stays a safe integer (`spawn.demandInterval`). Saves: a rules-28 history recorded on JSON 2.0.21 by the S2 engine (`packages/engine/test/fixtures/seat-2.0.21-v28.json`, generator `seat-v28.ts`) still decodes and re-encodes byte for byte, and its next opening repins to the bundled seed (`config_pinned`, no seat re-migration); only histories recorded by S1's tip fail since S2 (instant pour changed their events). Tests: `capacity-demand.test.ts`. Sim: `simulateCareer({ config })` and `report.shiftStats` (the input of `packages/engine/sim/door.ts`). |
| 2026-10-20 rules 28 (S4 `eco21-table-chair-upgrades`) | Config **2.0.23**: `upgrades.table.tableUpgrade` and `upgrades.table.chairUpgrade` (two Tier A dotted entries) replace the postmvp `upgrades.backrest`. **Gate = the keys** (S3's convention): `tableUpgrade(c)` / `chairUpgrade(c)` are null on every snapshot without them (JSON <= 2.0.22, capacity pins, 1.x pins) and every S4 branch reads them, so a rules-28 history recorded by the S3 engine replays byte for byte (`packages/engine/test/table-chair-upgrades.test.ts`, fixture `fixtures/seat-2.0.22-v28.json`) and re-encodes unchanged; rules stay 28 and `replay()` refuses an `upgradeChair` entry below rules 28. `loadConfig`: `SEAT_KEYS_ADDED_LATER` gains a `since: 2.0.23` row with a new `restore` list: for a seat snapshot labelled before 2.0.23 that carries none of the group's paths, `seatShape()` builds the seed minus the two keys and their Tier A entries PLUS `upgrades.backrest` taken from the frozen `legacy/economy-2.0.4.json` (the key the group replaced; only types and array length matter to `shape()`); one labelled 2.0.23 or later needs the whole group and no backrest; a snapshot with only one of the two keys, an unknown subkey, a wrong type or a short ladder is refused; `shape()` itself is untouched. `validate()`: ladder levels 2.. in order, whole prices that stay whole after x k, `lifePathGate` inside the path, benefits (`extraRounds`, `pExtraMoi` in [0, 1], `tipMult` >= 1, chair `patienceMult` >= 1) that only grow with the level. Engine: `seatQueue` records `Group.level` / `Group.chairLevel` (the fields exist only on groups of an S4 snapshot) and adds the Lv2 round to `Group.rounds`; `order()` draws the Lv3 second snack (`pickSnack`: only in-stock dishes, the draw happens only at Lv3+) and stretches `Order.patienceMs` by the chair multiplier once per order; `serve` passes the Lv4 factor to `customerValue(..., tableTipMult = 1)`; `execute` charges `tableUpgradeQuote().cost` (the ladder price) and emits `table_upgraded{..., cost, what}`; the new command `upgradeChair {tableId}` emits `chair_upgraded`; `Table.chairLevel?` is written by the first chair upgrade. `apps/server/src/http.ts` whitelists `upgradeChair: ['tableId']`. A browser save pinned to 2.0.22 opens and adopts the bundle at its next opening (`apps/web/test/config-pinning.spec.ts`). |
| 2026-10-20 rules 28 (S5 `eco21-balance-pass`) | Config **2.1.0**: new Tier A dotted key `shift.noCooldownFirstShifts` (3; `validate()`: whole number >= 0). **Gate = the key, read from the snapshot that opens the shift**: `noCooldownOpening(world, config)` and `restRequired(world, config)` in `rules.ts` are the one answer for `startShift`'s `restFirst`, the energy bar and the rest line; `startShift` at rules >= 28 sets stamina to full when an allowance shift opens; `completedShifts` counts the whole life of the save, whatever the days are, and the per-day cap stays. `SEAT_KEYS_ADDED_LATER` gains `{ since: '2.1.0', paths: ['shift.noCooldownFirstShifts'], tiers: {} }` without `restore`: a seat pin labelled before 2.1.0 simply has no key (no allowance), one labelled 2.1.0 or later needs it; a rules-28 history recorded on 2.0.23 by the S4 engine (`fixtures/seat-2.0.23-v28.json`, generator `fixtures/seat-v28-2023.ts`) replays byte for byte (`no-cooldown.test.ts`). `dayKey` (`rules.ts`) remembers its answer per timezone for the minute (a day can only change at a whole minute): behaviour-neutral, `daykey-formatter.test.ts` compares it with a fresh formatter. Sim side (not part of `npm test`): `sim/normalised.ts` and `career.ts` (the D4(a) gate on the standard order, 04-SPEC section 5), `createManagementPolicy(game, send, { directLease, seatsFirst })` (v3 stays the default, so the server forecast projects what it always did), `sim/scenario.ts furnishFirstAlley`, `sim/balance-gates.ts` + `balance-sweep.ts` + `plans/`. Web: `restRequired` feeds the rest line and the bar (`rest.ready`, 926 paired keys). |
| 2026-10-21 rules 28 (S5 `eco21-balance-pass`, review round 1) | No rule changes. `progression.ts`: `requirementStatus(world, config, token, lifePath = world.lifePath)` takes the level a `level` token is read against (the walk of `lifePathStatus` no longer copies the whole world per token) and the grammar of a token is parsed once per economy (`WeakMap` keyed by `config.values`): the career simulation spent 40 % of its time there; answers are byte-identical (a 12-day career of seeds 42 and 99 compared event by event, `progression-status.test.ts` keeps the original on 4 000 random worlds in two economies). Sim side: the career gate and the balance evaluator run the plan's own bot by default (seats and chairs first, direct leasing, no dog, start 2026-09-09; bot v4 and the season-aligned start are `--bot=price` / `--start=` options), `npm run sim:balance` prints the 22-row gate table on seeds 42 and 99 (`gateTable` is pinned by `balance-gates.test.ts`), `sim/balance-grid.ts` (grid / seeded sample over a plan), `sim/balance-p0.ts` (shift-1-only descent), `sim/solve-ladder.ts` (designs the table ladder rung by rung) and the sweep driver's `--known-red`, `--p0-floor` and monotone-ladder rule. |
| 2026-10-21 / S5 review vòng 2 | Bộ đánh giá cổng (`packages/engine/sim/balance-gates.ts`) in 23 hàng (thêm `shift1.plan` bên cạnh `shift1.wallet`), `balance-gates.test.ts` 32 test (năm đột biến của hàng mới bị bắt); `scripts/verify/commented-assertions.ts` đọc cả `expect.soft(` và thư mục `packages/engine/sim`; JSON 2.1.0 trả lại trần 400.000 / hợp đồng 3 ngày / LP7 2.000.000. |
| 2026-10-22 rules 28 (Wave 3 `fun-kick-table`) | Config **2.1.0** (label kept, plan section 2): new Tier A section `kickTable {feeRate 1.5, repPerGuest 2}`; `SEAT_KEYS_ADDED_LATER` row `{ since: '2.1.0', paths: ['kickTable'], tiers: { A: ['kickTable'] }, optionalAt: ['2.1.0'] }` (a 2.1.0 pin may lack the whole group: the S5/S6 contents; the template cache is keyed by row). New player command `kickTable {tableId, maxCost}` (P1 list): only a lingering table (`consuming` / `occupied`), price from the pinned snapshot (`kickTableQuote`, pure), `spend` + reputation clamped at 0, `table_kicked` then `table_cleaning`; refusals `tableGone` · `kickTableUnavailable` (no section) · `tableNotLingering` · `kickCostChanged` (above `maxCost`) · `notEnoughCoins`; idempotent by key. `validReplayEnvelope` needs a string table and a whole `maxCost` ≥ 0; `replay()` refuses `kickTable` below rules 28 (like `buyChair` / `upgradeChair`). Server: `commandFields.kickTable = ['tableId', 'maxCost']` (`satisfies` over `Command['type']`). A rules-28 history recorded on the S6 content of 2.1.0 replays byte for byte (`packages/engine/test/fixtures/seat-2.1.0-v28.json`). |
| 2026-10-22 rules 28 (Wave 3 `fun-kick-table`, review round 1) | The player command list of the engine section now names `kickTable(tableId, maxCost)` in P1 and drops the P3 `kickStubborn(customerId)`: the 08-SPEC section 9 "Tiễn ngồi lỳ" row it stood for was replaced by Wave 3 (`penalty.kickStubbornRepBase` stays in the JSON for old pins, unused). Same round, web: the popover offers "Mời về" only while the shift is open (`w.phase === 'open'`), while the engine command still accepts a lingering table during closing (a tap sent before the close lands); 09-SPEC changelog. |
| 2026-10-22 rules 28 (owner calls of PR #30, autopilot stage 07b) | Config **2.1.1**: the founder's `kickTable.feeRate` 0.5 is a ninth content of 2.1.0, so the label moved (rules stay 28, no engine change). `SEAT_KEYS_ADDED_LATER` row `kickTable` is `since: '2.1.1'` (no `optionalAt`): a pin labelled before 2.1.1 may lack the section, 2.1.1 and later must carry it. A browser save pinned to any 2.1.0 content adopts 2.1.1 at its next opening (numerically newer); a server database that registered a 2.1.0 content opens without `store:configVersionConflict`, registers 2.1.1 beside it and keeps serving its published registry version. `npm run sim:kick` gates the 30-day income net of the kick fees (gross is information). `sim:career:gate` command hashes change with the label (each logged command carries `configVersion`); k and value are unchanged. The goal chip (`apps/web/src/goals.ts`) suggests no second chair while a table can still be bought. DECISIONS `## 07 · owner calls 2026-10-22`. |
