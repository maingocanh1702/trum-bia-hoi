# 📊 BRD — Dashboard & CRM Admin — Trùm Bia Hơi (v0.4)

> **Business Requirements Document** cho hệ thống quản trị nội bộ game Trùm Bia Hơi.
> Nguồn sự thật gameplay: `02-GDD-trum-bia-hoi.md` (v1.8). Số liệu/tham số: `08-SPEC-economy-constants.md` + `docs/config/economy.tbh.json` (seed của Config Registry — §5.2). Kiến trúc server: `docs/features/F23-server-architecture.md` + `10-SPEC-tech-implementation.md` §7. Monetization: GDD §16 + `F26-daily-session-pass-payments.md`.
> **Nguyên tắc xuyên suốt (v0.3):** mọi tham số vận hành (số ca free/ngày, giá, cap, tỉ lệ, thời gian, lịch, flag) là **config trong admin**, KHÔNG hardcode trong client/server — xem §5.2.
> Ngày: 2026-06-11. Nhãn: 🟢 = cần từ đầu · 🟡 = Phase 3+ · 🔵 = Phase 4+.
> **Dashboard & CRM là hệ thống tách biệt với game client** — chạy trên web riêng, truy cập cùng database server-authoritative.

---

## 1. Bối cảnh & Mục tiêu

### 1.1 Vấn đề

Game Trùm Bia Hơi là idle/tycoon **server-authoritative** với economy phức tạp (5 lớp, k-rescale, nhiều loại khách, mùa giải, xổ số, World Cup). Vận hành game cần:

- **Theo dõi KPI** (DAU, retention, revenue, k_value thật, churn) để ra quyết định balance.
- **Quản lý người chơi** (xem/sửa profile, xử phạt/gỡ cờ, giải quyết khiếu nại).
- **Kiểm soát economy** (inflation, xu sink/faucet, reward audit) — sai ở đây ảnh hưởng toàn bộ league.
- **Vận hành event** (World Cup, mùa giải) và content (nhiệm vụ, xổ số, quiz kiểm tra).
- **Xử lý donate** (Mời Bia Hơi — monetization duy nhất, chốt 08/09; **không có Session Pass**, game free hết) — đối soát, xác nhận tay chuyển khoản, refund, chống fraud.
- **Hỗ trợ người chơi** — đội ngũ cần CRM để xem state player khi xử lý ticket.

### 1.2 Mục tiêu hệ thống

| # | Mục tiêu | Đo lường |
|---|----------|----------|
| G1 | Biết sức khỏe game **trong 30 giây** | Dashboard load < 3s, KPI cards tự refresh |
| G2 | Xử lý ticket/khiếu nại **dưới 24h** | Trung bình thời gian giải quyết |
| G3 | Phát hiện economy bất thường **tự động** | Alert khi faucet/sink lệch > 20% baseline |
| G4 | Admin **không thể tự ý/trực tiếp tạo xu/power** cho người chơi | Compensation chỉ qua workflow 2 bước + audit + rate limit; tuyệt đối không grant `seasonEarned`/Life Path |
| G5 | Vận hành event **và tune mọi tham số** không cần dev deploy | Content editor cho quiz/nhiệm vụ/mùa giải + Config Registry (§5.2) phủ 100% key trong `docs/config/economy.tbh.json` |

---

## 2. Người dùng & Vai trò (RBAC)

| Role | Quyền | Ghi chú |
|------|-------|---------|
| **Super Admin** | Full access + quản lý user admin + config hệ thống + **duyệt Tier A** + emergency hotfix config | 1-2 người (founder/lead) |
| **Game Admin** | Dashboard + player lookup/edit + economy monitoring + event management + ticket xử lý + config **Tier C** (content/ops) + tạo campaign/segment override (Tier A cần Super Admin duyệt) | Đội vận hành |
| **Economy Admin** | Dashboard + economy reports + Config Registry: sửa & publish **Tier B** (balance), đề xuất **Tier A** (k, cap, entitlements, giá, reward) | Chuyên trách balance |
| **Support Agent** | Player lookup (read-only profile) + ticket queue + appeal processing | Hỗ trợ người chơi |
| **Viewer** | Dashboard read-only | Stakeholder/investor xem số liệu |

> **Nguyên tắc:** Support Agent **KHÔNG** được sửa xu/inventory/league trực tiếp. Mọi compensation phải qua **workflow có audit** (Super/Game Admin duyệt).

---

## 3. Module Dashboard — Analytics & Monitoring 🟢

### 3.1 Overview (trang chính)

**KPI cards real-time:**

| Card | Nguồn dữ liệu | Refresh |
|------|---------------|---------|
| DAU / MAU | `PlayerIdentity.lastActiveAt` | 5 phút |
| CCU (concurrent) | Websocket connections | realtime |
| Donate (VND) hôm nay | `Donation.status = 'confirmed'` (F20) | 5 phút |
| Conversion rate (guest → login → paid) | Auth funnel | 15 phút |
| k_value thực tế | `ServeEvent` aggregate (GDD §3, `04-SPEC` §5) | theo ca |
| Xu faucet/sink tỉ lệ | Tổng xu vào (serve+tip+quest+lottery) / ra (upgrade+rent+WC shop+cosmetic) | hàng giờ |
| D1 / D7 / D30 retention | Cohort login | hàng ngày |
| Churn rate | Players không login > 3 ngày | hàng ngày |

**Biểu đồ chính:**
- 📈 DAU/MAU trend (30 ngày)
- 📊 Donate theo mức (20k / 50k / khác) — stacked area; **không có nguồn thu nào khác** (chơi free hết). **Xu-sink trong game không phải revenue VND**.
- 📉 k_value theo thời gian (target 2.0-3.0, GDD §3)
- 🎯 Funnel: Mở app → Chọn ngôn ngữ → Guest play → Login → Shift #1 → Shift #2+ → Mở Mời Bia Hơi → Donate

### 3.2 Economy Health 🟢

| Metric | Cảnh báo khi | GDD ref |
|--------|-------------|---------|
| k_value | Ngoài 2.0–3.0 | §3 |
| Trần ngày hit rate | > 30% players chạm 500k/ngày | §10 |
| Xu trôi nổi (coins tổng) | Tăng > 15%/tuần | Inflation |
| Uy tín trung bình | Giảm > 20%/tuần | §8 |
| Donate rate (donor / MAU) | < 0.5% hoặc > 10% | §16/F20 |
| Tỉ lệ freshness fail | > 50% cốc hết hơi | §6 |
| Rush survival rate | < 60% phục vụ kịp trong rush | §9 |

**Alerts:** Gửi qua Telegram/Discord/email khi ngưỡng bị phá. Có mức `warning` và `critical`.

### 3.3 Leaderboard & Season Monitor 🟡

- Xem bảng xếp hạng hiện tại (8 bậc, theo mùa Phân Hạng/Tranh Bá).
- Xem `seasonEarned` distribution — histogram.
- Phát hiện outlier (người chơi earn quá nhanh → có thể cheat).
- Theo dõi mùa giải hiện tại: countdown, số người chơi per bậc, top 10.

### 3.4 Event Monitor 🔵

- World Cup: trạng thái broadcast window, fixtures sync status, TV/lịch/theme sales.
- Xổ số: kết quả quay, tổng vé bán, tổng thưởng phát, EV thực tế (target 0.6-0.8).
- Nhiệm vụ: completion rate per nhánh, bottleneck detection.

---

## 4. Module CRM — Player Management 🟢

### 4.1 Player Lookup & Profile

**Tìm kiếm:** theo `playerId`, email, display name, guest ID.

**Profile view:**

| Section | Fields | Editable? |
|---------|--------|:---------:|
| Identity | id, email, provider (guest/google), locale, createdAt, lastActiveAt | ❌ |
| Economy | coins, seasonEarned, lifePathLevel, currentLeagueTier | ⚠️ (Super Admin + audit) |
| Inventory | cốc (số/cap), nguyên liệu, equipment levels | ⚠️ (Super Admin + audit) |
| Location | current location, lease status, deposit, multiplier | ❌ read-only |
| Session history | Danh sách shifts: start/end, revenue, tip, penalty, k per shift | ❌ |
| Referral | invited count, huy hiệu, mốc đạt | ❌ |
| Entitlement | free sessions used today, paid passes active/expired | ❌ (refund qua Payment module) |
| Flags | anticheat status, flagged/banned, appeal history | ✅ (Game Admin) |
| Cosmetics | owned themes, active theme, decorations | ❌ |

### 4.2 Player Actions (CRM)

| Action | Role tối thiểu | Audit? | Ghi chú |
|--------|:-------------:|:------:|---------|
| View profile | Support Agent | ✅ | Read-only |
| Flag/unflag player | Game Admin | ✅ | Gắn `status: 'flagged'`, lý do bắt buộc |
| Ban/unban | Super Admin | ✅ | Cần 2FA confirm |
| Grant compensation (xu/item) | Super Admin | ✅ | Chỉ qua workflow: Agent đề xuất → Admin duyệt → hệ thống grant |
| Reset shift (stuck state) | Game Admin | ✅ | Cho trường hợp shift bị lỗi server |
| Force season recalc | Economy Admin | ✅ | Tính lại `seasonEarned` từ event log |
| Send in-game notification | Game Admin | ✅ | Push thông báo đến 1 hoặc nhiều player |

> **Nguyên tắc bất di bất dịch:** Admin **KHÔNG BAO GIỜ** trực tiếp tăng `seasonEarned` hoặc `lifePathProgress` — chỉ `coins` (xu tiêu được) có thể được compensate, và phải qua workflow có audit. Đây là nguyên tắc cốt lõi của GDD §11 (league công bằng).
> **Compensation không phải công cụ vận hành economy:** chỉ dùng cho lỗi/sự cố/support, có ticket/reason bắt buộc, rate limit, và báo cáo riêng để không bị tính nhầm là faucet gameplay.

### 4.3 Anti-cheat Dashboard 🟡

- Danh sách players bị flag, lý do, thời gian.
- Queue appeal tickets (`anticheat-appeal`, `pardon_dispute`).
- Xem replay event log của player nghi ngờ: `ShiftStarted → OrderServed → ...` với timestamps → phát hiện bất thường tốc độ.
- Bulk scan: auto-flag players có serve rate > `rushMinIntervalMs` × 0.8 liên tục.
- Hành động: Confirm ban / Clear flag / Extend investigation.

---

## 5. Module Economy Tools 🟡

### 5.1 Balance Dashboard

- **Faucet/Sink waterfall chart:** xu vào (serve, tip, quest, lottery, compensation) vs xu ra (upgrade, rent, WC shop, cosmetic, xổ số vé, penalty) — theo ngày/tuần.
- **Net flow:** xu tạo ra − xu đốt = inflation/deflation indicator.
- **k_value calculator:** nhập `DT_bia_mỗi_lượt` → tự tính `k = DT / 82.5` (GDD §3).

### 5.2 Config Registry & Tuning (Economy Admin) — nguyên tắc 🟢, UI 🟡

#### 5.2.1 Nguyên tắc "không hardcode" 🟢 (áp dụng từ khi có server — game Phase 1)

- **Mọi tham số vận hành là config**, không hardcode: số ca/ngày (free hết), mức donate, k, cap xu/ngày, số ca/ngày, giá món/thiết bị, tỉ lệ tip/phạt/uy tín, thời gian (freshness, kiên nhẫn, ca), lịch rush/thời tiết, xác suất rủi ro, reward quest/crate/league, giá xổ số/WC shop, ngưỡng Life Path, feature flag. Danh sách đầy đủ = **mọi key trong `docs/config/economy.tbh.json`** (chi tiết key-by-key: `08-SPEC-economy-constants.md` §22).
- Code chỉ chứa **schema + default fallback** (để chạy offline/test/prototype) — giá trị dùng thật đến từ Config Registry của admin. Dev thấy phải "sửa số trong code để đổi hành vi" = bug (vi phạm DoD `10-SPEC` §13).
- `docs/config/economy.tbh.json` là **seed** ban đầu của registry (import 1 lần + khi thêm key mới). Sau đó nguồn sự thật production là registry trong admin; repo chỉ đồng bộ lại bằng export (xem 5.2.5).
- Server resolve giá trị khi **mở ca** (`shift/start`) và khi mở cổng ca, ghi `configVersion` vào ca. Ca đang chạy **giữ nguyên** version của nó; thay đổi config chỉ áp dụng cho ca/ngày/mùa tiếp theo đúng `effectiveAt`. Replay anti-cheat (§4) dùng đúng `configVersion` của ca.
- Client **không tự quyết** giá trị: nhận snapshot config + `configVersion` từ server, chỉ hiển thị và gửi lệnh.

#### 5.2.2 Mô hình một config entry

| Trường | Ý nghĩa |
|--------|---------|
| `key` | Đường dẫn JSON trong `economy.tbh.json` (vd `entitlements.freeSessionsPerDay.default`, `menu.bia.priceBase`, `rush.schedule`) |
| `type` | `number` / `duration_ms` / `percent` / `bool` / `enum` / `table` (mảng object, vd level table) / `schedule` |
| `scaledByK` | `true` nếu key kết thúc bằng `Base` → admin nhập giá trị Base, UI hiển thị luôn giá trị sau ×k hiện hành |
| `range` | `min` / `max` / `step`; ngoài range → từ chối lưu (vd `k.value` 2.0–3.0; `freeSessionsPerDay` 0…`dailyShiftCap[segment]`) |
| `tier` | **A / B / C** (5.2.3) → quyết định role được sửa, số bước duyệt, `effectiveAt` mặc định |
| `scope` | `default` / `segment:<newbie / regular / veteran…>` / `campaign:<id>` / `player:<id>` |
| `effectiveAt` | `immediate` / `next_shift` / `next_day` (00:00 giờ VN) / `next_season`; kèm `expiresAt?` |
| `version` | `draft → approved → scheduled → active → archived` |
| audit | `changedBy`, `approvedBy`, `reason`, `rollbackVersion`, `publishedAt` |

**Override precedence** (server resolve khi đọc): **`player` > `campaign` > `segment` > `default`**. Override `player`/`campaign` **bắt buộc có `expiresAt`**; override `player` chỉ qua workflow compensation/support (§7) và có rate limit — không dùng để grant tiền/`seasonEarned`.

#### 5.2.3 Registry theo tier (phủ toàn bộ `economy.tbh.json`)

| Tier | Nhóm | Keys (JSON path) | Role sửa | Duyệt | `effectiveAt` mặc định |
|:----:|------|------------------|----------|-------|------------------------|
| **A** | k & cap | `k.value`, `k.band`, `shift.dailyEarnCapBase`, `shift.dailyShiftCap`, `shift.durationMs`, `shift.regenRate`, `shift.wellRested` | Economy Admin đề xuất | **Dual** (Super Admin) | `next_day` |
| **A** | Entitlements (free hết, chỉ campaign) + Donation (F20) | `entitlements.freeSessionsPerDay.{default, bySegment.*, campaignOverride, min, max}`, `entitlements.sessionPass.products[]`, giá Session Pass theo locale (catalog), `entitlements.resolveAt` | Economy Admin (default/segment) · Game Admin (campaign) | **Dual** | `next_day`; campaign: `immediate` cho ca mở sau khi publish |
| **A** | League / mùa / Life Path | `league.tiers`, `league.seasons` (độ dài, epoch, tieBreak, rewardType), bảng thưởng mùa, `lifePath.list` (threshold + reward) | Economy Admin | **Dual** | `next_season` |
| **A** | Tiền thật & pháp lý | `lottery.*` (`ticketBase`, `dailyLimit`, `suffixPayouts`, `targetEV`, `legalGate`), giá `shopSeason.*` (`tvBase`, `scheduleBase`, `teamThemeBase`, `bundleRate`), `cosmetics.donationTiersVnd`, hạn mức refund/compensation (§7/§8) | Super Admin | **Dual** | `next_day` |
| **A** | Tip / phạt / uy tín / sổ cái | `tip.*`, `penalty.*`, `reputation.*`, `ledgers.countedSources`, `ledgers.excluded` | Economy Admin | **Dual** | `next_day` |
| **A** | Feature flag rủi ro | `lottery.legalGate`, `weather.phase1Enabled`, `freshness.kegFreshnessEnabled`, `patience.graceEnabledFromPhase`, `upgrades.phase1UpgradesOutsideShiftOnly`, `shift.kickAllAllowed` | Super Admin | **Dual** | `next_day` |
| **B** | Menu & kho | `menu.*` (priceBase, unitCostBase, bulk, prepMs, stock), `inventory.*`, `demandMix.*` | Economy Admin | Single (Economy Admin) | `next_shift` |
| **B** | Nhịp khách | `spawn.*`, `patience.*` (trừ flag), `enjoy.*`, `rounds.*`, `customerTypes.*`, `weather.*` (trừ flag), `rush.*` kể cả `rush.schedule` | Economy Admin | Single | `next_shift` |
| **B** | Freshness & thiết bị | `freshness.*` (trừ flag), `upgrades.*` (level table, priceBase, pourSlots/pourMs, storage, backrest, extraSeatPriceBase), `glasses.*`, `signboard.*`, `unlocks.*`, `dog.*` | Economy Admin | Single | `next_shift` |
| **B** | Reward nhỏ | `quests.daily` (target/reward), `quests.loginTrackRepBase`, `quests.loginMissResets`, `quests.referral`, `quests.gift`, `quests.badgeShardsPerBadge`, `crates.*`, `chairmanBox.*` | Economy Admin | Single | `next_shift` |
| **B** | Rủi ro & mặt bằng | `risk.*` (chance, fee, reduction, cooldown), `locations.list[]` (rent, mult, gate), `locations.leaseDays`, `locations.depositRate`, `locations.earlyLeaveLosesDeposit` | Economy Admin | Single | `next_day` |
| **C** | Content | câu hỏi kiểm tra (§6.2), quest pool composition, announcement/banner, copy i18n, WC fixtures/teams (§6.1), catalog visibility cosmetics | Game Admin | Single (Game Admin) | `immediate` |
| **C** | Ops | maintenance flag, min client version, kill-switch tính năng **không** chạm economy | Game Admin | Single | `immediate` |

> **Quy tắc xếp tier:** **A** = đổi nguồn tiền thật, tổng xu/ngày, thứ hạng, hoặc quyền truy cập (free sessions); **B** = đổi độ khó/cân bằng trong ca; **C** = không đổi số economy. Key mới chưa xếp → mặc định **B** cho tới khi Economy Admin phân loại và ghi vào `08-SPEC` §22. `prototypePhase0.*` chỉ để prototype offline, không có trong registry production.

#### 5.2.4 Ví dụ luồng — đổi cap ca/ngày theo campaign (entitlements, chơi free hết)

1. Economy Admin mở key `entitlements.freeSessionsPerDay` → tạo **draft**: `default 1 → 2`; hoặc `bySegment.newbie = 2`; hoặc `campaignOverride = {id: "tet2027", value: 3, startsAt, endsAt}`; hoặc (qua §7) `player:<id> = 2, expiresAt`.
2. **Preview impact** tự động: số player hôm nay có `usedSessions ≥ default`, dự báo số ca tăng thêm × xu/ca × k → faucet 7 ngày, doanh thu Session Pass giảm dự kiến.
3. Tier A → **Super Admin duyệt** → `scheduled` với `effectiveAt = next_day` (00:00 VN). Campaign được phép `immediate` nhưng chỉ áp dụng cho ca mở sau thời điểm publish.
4. Server resolve khi `shift/start`: `player > campaign > segment > default`, ghi `maxSessions` + `configVersion` vào entitlement của ngày (`GET /entitlements` trả `freeSessionsPerDay` đang hiệu lực). Client chỉ hiển thị.
5. **Rollback** = publish lại version trước (không sửa row). Audit ghi `changedBy / approvedBy / reason`. Alert kênh ops kèm diff.

#### 5.2.5 Safeguard & governance (giữ v0.2, bổ sung v0.3)

- Range validation theo schema; giá trị `Base` hiển thị cả sau ×k; `table` có validator riêng (level tăng dần, giá không âm).
- Preview impact tối thiểu: số player bị ảnh hưởng, thay đổi giá/cap/reward, dự báo faucet/sink 7 ngày; Tier A thêm dự báo revenue VND.
- Config có version `draft → approved → scheduled → active → archived`; không sửa trực tiếp production row; publish tạo version mới; rollback là publish lại version cũ.
- Tier A **dual approval** (đề xuất ≠ người duyệt); Tier B/C single approval đúng role; Support Agent/Viewer chỉ đọc.
- Emergency hotfix (Super Admin) được phép cho Tier A/B, tự tạo ticket hậu kiểm trong 24h.
- Diff viewer giữa 2 version bất kỳ; **export/import JSON** đúng schema `docs/config/economy.tbh.json` (export định kỳ về repo để docs/sim khớp production; `scripts/check_economy_config.py` chạy trên bản export).
- Mọi publish phát sự kiện `ConfigPublished{version, keys[], effectiveAt, changedBy, approvedBy}` vào event log (§9) + alert kênh ops.
- Coverage test (CI, 10-SPEC §12) — **đã có script**: `npm run check:config` (= `scripts/check_economy_config.py` + `scripts/check_config_coverage.py`) fail khi: section trong `economy.tbh.json` chưa được xếp tier, path trong governance sai, `config.get('x')` trỏ key không tồn tại, hoặc bảng 08-SPEC §22 thiếu dòng. Nghĩa là **không thể thêm tham số mới mà quên đưa vào registry admin**.

### 5.3 Economy Reports

- **Cohort economy:** xu earned / spent / balance theo cohort đăng ký.
- **Equipment distribution:** % player ở mỗi cấp thiết bị (bom/rửa/hầm/bếp/bàn).
- **Menu mix:** % revenue từ từng món (bia/lạc/nem/đậu/tóp mỡ/lòng) — verify k assumption.
- **Location distribution:** bao nhiêu player ở mỗi mặt bằng × league tier.

---

## 6. Module Content Management 🟡

### 6.1 Season & Event Manager

| Entity | CRUD | Fields |
|--------|:----:|--------|
| Season (league) | ⚠️ Draft/correct only | id, kind (ranking/contest), startsAt, endsAt, epochAnchor, rewards template |
| Season (WC) | ✅ | id, label, startsAt, endsAt, teams[] (code, nickname, palette) |
| Match fixture | ✅ | matchId, teams, kickoff, importance, status, broadcastTime |
| WC shop catalog | ✅ | items (TV/lịch/theme), prices, availability |

### 6.2 Quest & Inspection Content

| Entity | CRUD | Fields |
|--------|:----:|--------|
| Quest template | ✅ | type, target range (min/max by tier), reward, pool bucket |
| Inspection question | ✅ | question text (vi/en), options, correct answer token, difficulty |

**Season governance:**
- Active/closed seasons không được CRUD tùy ý. Admin chỉ tạo/sửa **draft season** và **reward template**.
- Rollover, freeze leaderboard, reward issue vẫn do server job thực hiện theo F12.
- Sửa active/closed season chỉ qua correction workflow: reason bắt buộc, dual approval, audit log, và dry-run diff trước khi apply.
- Reward template publish cần idempotency key để không phát thưởng trùng.
- Fixture/WC content có thể sửa lịch/trạng thái nhưng mọi thay đổi broadcast đã phát phải có correction note.

### 6.3 Announcement & Notification

- Tạo thông báo in-game (banner/toast/mailbox).
- Target: all / segment (league tier, location, paid/free, locale) / individual.
- Schedule: ngay lập tức / lên lịch.
- Localization: vi + en.

---

## 7. Module Donation (monetization duy nhất — chốt 08/09; không có Payment/Session Pass) 🟡

### 7.1 Donation Dashboard

| Metric | Mô tả |
|--------|-------|
| Donate hôm nay / tuần / tháng | Tổng `Donation.amount` where `status = 'confirmed'` |
| Donation "Mời Bia" | Số lượng + tổng VND |
| Funnel | Guest → (Login) → Mở Mời Bia Hơi → Chuyển khoản → Admin xác nhận → Chọn quà |
| Donate / MAU · trung bình / donor | Không tối ưu theo KPI trả tiền — game free; chỉ theo dõi |

### 7.2 Donation Management

- Danh sách donate: player (hoặc guest id), amount, kênh (QR chuyển khoản / provider), status (pending → confirmed → gifted / refunded), timestamp; **xác nhận tay** khi chuyển khoản thủ công.
- Tìm kiếm: theo player, transaction ID, date range, status.
- **Refund workflow:** Support Agent đề xuất → Game Admin duyệt → thu hồi quà cosmetic + ghi audit (`donation.refundPolicy`).
- Chống duplicate: cảnh báo nếu cùng player donate 2 lần trong < 1 phút hoặc cùng mã giao dịch.

### 7.3 Donation Tracking

- Danh sách donation: player, amount, cosmetic chọn, timestamp.
- Tổng hợp: revenue by cosmetic type, top donors (anonymized option).

---

## 8. Module Support & Tickets 🟡

### 8.1 Ticket Queue

| Field | Mô tả |
|-------|-------|
| Ticket ID | Auto-generated |
| Player ID | Link → profile |
| Type | `bug_report` / `anticheat-appeal` / `pardon_dispute` / `payment_issue` / `general` / `feature_request` |
| Priority | Low / Medium / High / Critical |
| Status | Open → In Progress → Waiting Response → Resolved / Escalated |
| Assigned to | Support Agent / Game Admin |
| Created / Updated | Timestamps |

### 8.2 Ticket Workflow

```
Player gửi (qua AI Assistant §17 / in-game form)
  → Ticket tạo trong CRM, auto-classify type
  → Assign Support Agent (round-robin hoặc manual)
  → Agent xem player profile (read-only) + shift history + event log
  → Giải quyết:
      - Trả lời → Close
      - Cần compensation → Đề xuất → Game Admin duyệt → Grant + Close
      - Anti-cheat appeal → Xem evidence → Confirm/Clear flag → Close
      - Payment issue → Link transaction → Refund workflow
  → Escalate nếu cần Super Admin
```

### 8.3 Canned Responses (vi + en)

Bộ template trả lời cho các case thường gặp:
- Shift bị lỗi → reset + compensation
- Anti-cheat false positive → clear flag + xin lỗi
- Payment chưa nhận → kiểm tra transaction → re-grant hoặc refund
- Feature request → ghi nhận → link backlog

---

## 9. Module Audit & Security 🟢

### 9.1 Audit Log

**Mọi mutation admin đều ghi:**

```ts
type AuditEntry = {
  id: string
  adminId: string
  action: string              // 'player.flag' | 'economy.config.update' | 'player.compensate' | ...
  targetType: 'player' | 'config' | 'season' | 'ticket' | 'payment'
  targetId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  reason: string              // BẮT BUỘC
  timestamp: number
  ip: string
}
```

- Xem audit log: filter theo admin, action, target, date range.
- Export CSV/JSON cho compliance.
- **Retention:** giữ tối thiểu 1 năm.

### 9.2 Admin Authentication

- Đăng nhập: Google Workspace / SSO.
- 2FA bắt buộc cho Super Admin + Game Admin.
- Session timeout: 8 giờ.
- IP whitelist (optional).

### 9.3 Privacy & PII

- Email/Google profile mặc định hiển thị dạng mask (`a***@domain.com`) cho Support Agent.
- Reveal PII yêu cầu quyền Game Admin+ hoặc Support Agent có ticket đang mở, kèm reason bắt buộc.
- Audit cả hành động **view profile**, **reveal PII**, **export**, không chỉ mutation.
- Export CSV/JSON phải áp dụng RBAC, masking mặc định, watermark adminId, và expiry link ngắn hạn.
- Không export payment provider raw payload hoặc token nhạy cảm; chỉ lưu/display transaction id, amount, status, provider, timestamps.
- Quyền xóa/anonymize dữ liệu cá nhân cần workflow riêng (Super Admin + compliance reason), không xóa event ledger tài chính/economy mà pseudonymize player identity.

### 9.4 Rate Limits (admin API)

- Compensation grant: max 10/giờ per admin (chống lạm dụng).
- Config change: max 5/ngày (chống sửa liên tục gây bất ổn).
- Bulk operations: cần Super Admin approve.

---

## 10. Technical Requirements

### 10.1 Stack đề xuất

| Component | Lựa chọn | Lý do |
|-----------|---------|-------|
| Frontend | React + Vite | Cùng ecosystem game client; team familiar |
| UI framework | Component library (Ant Design / Shadcn) | Dashboard cần nhiều component table/chart/form sẵn |
| Charts | Recharts / Apache ECharts | Time series, funnel, waterfall |
| Backend | Cùng API server game (thêm admin routes) hoặc tách service | Truy cập cùng DB |
| Auth | Google OAuth + RBAC middleware | Đơn giản, bảo mật |
| Realtime | Websocket (piggyback game server) | CCU, alerts |

### 10.2 Data Sources

- **Primary:** Game database (profiles, events, payments, seasons).
- **Analytics:** Aggregate tables / materialized views (pre-computed KPIs, không query raw events mỗi lần load dashboard).
- **External:** Payment provider webhooks (Stripe/IAP status).

### 10.3 Performance Requirements

| Metric | Target |
|--------|--------|
| Dashboard page load | < 3s |
| Player search | < 1s (indexed) |
| Audit log query | < 2s (30-day window) |
| KPI card refresh | 5 phút (auto) |
| Concurrent admin users | ≤ 20 |

---

## 11. Thứ tự dựng admin (**không phải cổng scope**)

> Game giao **1 phase, đủ 5 lớp economy** (`00-HANDOFF` §4, founder 09/09) → admin dựng **song song với game**, không để sau. Bảng dưới là thứ tự dựng cho gọn. **Bắt buộc có khi game live:** Config Registry đọc/sửa được (vì luật không-hardcode chỉ có nghĩa khi admin sửa được), audit log, player lookup, và cổng duyệt Tier A.

| Bước | Scope | Khi nào |
|-------|-------|---------|
| **Admin B1** | Player lookup (read-only) + audit log skeleton + k_value monitor + **Config Registry seed từ `economy.tbh.json`** (server đọc mọi tham số từ registry, không hardcode) + config viewer/proposal (draft; apply live chỉ Super Admin emergency) | Cùng slice `server-skeleton` + `config-service-registry` |
| **Admin B2** | Dashboard KPI cards + economy health alerts + ticket queue + anti-cheat flag management + **config editor Tier B/C** (range validation, scheduling `effectiveAt`, rollback, diff, export/import JSON) | Khi economy đủ 5 lớp chạy được (cần tune bằng playtest) |
| **Admin B3** | Donation dashboard + xác nhận tay + refund workflow + season/event manager + content editor + **config Tier A dual approval** + override `segment` / `campaign` / `player` + preview impact | Trước khi mở thanh toán/Vé Mở Ca cho người thật |
| **Admin B4** | Full analytics (cohort, funnel, economy waterfall) + WC event ops + lottery monitoring | Trước khi bật nội dung sự kiện (WC) — trước ngày live |

> Admin B1 là **tối thiểu** để vận hành server-authoritative: phải xem được player state + audit mọi thay đổi. Economy config ở B1 ưu tiên read-only/proposal; apply live đầy đủ ở B2 khi có alert/rollback tốt hơn. **Nhưng ngay từ B1 server đã phải đọc tham số từ registry** (seed = JSON) — chưa có UI sửa không có nghĩa là được hardcode; đổi số ở B1 = Super Admin import JSON mới qua emergency flow. Tới ngày game live, B1–B3 phải xong.

---

## 12. Rủi ro & Mitigations

| # | Rủi ro | Xác suất | Impact | Mitigation |
|---|--------|:--------:|:------:|------------|
| R1 | Admin grant xu bừa bãi → lạm phát | Trung bình | Cao | Workflow duyệt + rate limit + audit + KHÔNG grant `seasonEarned`; compensation report tách khỏi gameplay faucet |
| R2 | Config economy sai → crash balance | Thấp | Cao | Preview impact + rollback + range validation |
| R3 | Support Agent lộ data player | Thấp | Cao | Read-only + PII masking (email chỉ hiện `a***@`) + audit |
| R4 | Admin bị phishing → compromised | Thấp | Critical | 2FA + IP whitelist + session timeout |
| R5 | Dashboard query nặng → slow game server | Trung bình | Trung bình | Materialized views + read replica + cache |
| R6 | Lộ PII/payment data qua CRM/export | Thấp | Critical | Mask mặc định, reveal/export có reason + audit, link export hết hạn, không lưu token nhạy cảm |
| R7 | Admin sửa season/reward active gây phát thưởng sai/trùng | Thấp | Cao | Draft/publish, dual approval, dry-run diff, idempotency key, correction workflow |
| R8 | Tham số bị hardcode trong client/server → admin sửa không có tác dụng, phải deploy | Trung bình | Cao | DoD "không hardcode" (10-SPEC §13), coverage test registry ↔ code trong CI, `check_economy_config.py` trên bản export, code review chặn literal nghiệp vụ |
| R9 | Config đổi giữa ca → ca đang chạy sai/replay anti-cheat lệch | Thấp | Cao | Pin `configVersion` theo ca; `effectiveAt` tối thiểu `next_shift` cho Tier A/B; server resolve tại `shift/start` |

---

## 13. Acceptance Criteria (tổng)

- [ ] Admin đăng nhập được qua Google SSO + 2FA
- [ ] 5 roles RBAC hoạt động đúng (mỗi role chỉ thấy/làm được đúng quyền)
- [ ] Player search < 1s, trả đúng profile
- [ ] Mọi mutation admin tạo audit log entry (không ngoại lệ)
- [ ] Compensation xu phải qua workflow 2 bước (đề xuất → duyệt)
- [ ] Admin KHÔNG thể sửa `seasonEarned` / `lifePathProgress` trực tiếp
- [ ] Config high-risk dùng draft/publish + dual approval + rollback version
- [ ] Active/closed season không CRUD trực tiếp; correction có dry-run diff + audit
- [ ] PII mask mặc định; reveal/export yêu cầu quyền + reason + audit
- [ ] Dashboard KPI load < 3s, auto-refresh 5 phút
- [ ] Economy alert trigger khi k ngoài 2.0-3.0
- [ ] Ticket workflow: tạo → assign → resolve đúng flow
- [ ] Config change có preview + audit + rollback
- [ ] **Không hardcode:** 100% key trong `docs/config/economy.tbh.json` xem/sửa được trong Config Registry; test end-to-end: đổi `entitlements.freeSessionsPerDay.default` 1 → 2 qua admin → hôm sau player mở được ca thứ 2 **không deploy**
- [ ] Override precedence `player > campaign > segment > default` đúng; override `player`/`campaign` bắt buộc `expiresAt`
- [ ] Ca đang chạy giữ `configVersion` cũ; ca mới dùng version đúng `effectiveAt` (`immediate` / `next_shift` / `next_day` / `next_season`)
- [ ] Tier A dual approval (người đề xuất ≠ người duyệt); Tier B/C single approval đúng role; Support Agent/Viewer read-only
- [ ] Export/import JSON registry khớp schema `economy.tbh.json`; coverage test registry ↔ code chạy trong CI

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|-----|----------|
| v0.1 | BRD đầu: 10 module (Dashboard analytics, CRM player management, Economy tools, Content management, Payment/Donation, Support/Tickets, Audit/Security). 5 roles RBAC. Phân phase Admin P0-P3 gắn vào game Phase 1-4. Nguyên tắc cốt lõi: không grant seasonEarned, workflow duyệt compensation, audit mọi mutation. Tham chiếu GDD v1.5 + F23 server + F26 payments + F25 account. |
| v0.2 | Vá review: sửa wording admin compensation vs "không tạo xu"; bỏ "in-game xu purchases" khỏi revenue source; thêm config versioning/draft-publish/dual approval; giới hạn season CRUD bằng draft/correction workflow; thêm Privacy & PII; hạ Admin P0 config editor thành viewer/proposal an toàn hơn. |
| v0.4 | Scope 1 phase (founder 09/09): §11 đổi "phân phase" → **thứ tự dựng**, admin song song với game (P0–P3 → B1–B4); nêu rõ phần bắt buộc có khi game live. |
| v0.3.1 | Hiện thực `scripts/check_config_coverage.py` + `npm run check:config` (gác luật không-hardcode trong CI); §5.2.5 trỏ lệnh chạy được. |
| v0.3 | Quyết định founder: **mọi tham số vận hành phải config được ở admin, không hardcode** (số ca free/ngày và tương tự). §5.2 viết lại thành Config Registry: nguyên tắc không hardcode, mô hình entry (key = JSON path của `economy.tbh.json`, tier A/B/C, scope, effectiveAt, version), override precedence player > campaign > segment > default, bảng registry phủ toàn bộ section JSON, ví dụ luồng đổi free sessions (F26), safeguard bổ sung (export/import JSON, coverage test, ConfigPublished event). Cập nhật G5, RBAC (Tier theo role), Admin P0–P2, rủi ro R8/R9, acceptance. Header tham chiếu GDD v1.7 + 08-SPEC + `docs/config/economy.tbh.json` + 10-SPEC §7. |
| v0.5 | Chủ dự án 08/09: **chơi free hết, monetization = donate cho admin** — §1 mục tiêu, §3 KPI/funnel, §5.2 tier A, §7 Payment → Donation (bỏ Session Pass). |

*Nguồn: `02-GDD-trum-bia-hoi.md` v1.8 (§0/§3/§8/§10/§11/§16/§18), `08-SPEC-economy-constants.md` v1.2 (§0/§13/§22), `docs/config/economy.tbh.json`, `10-SPEC-tech-implementation.md` §7/§10, `docs/features/F23-server-architecture.md`, `docs/features/F25-localization-account.md`, `docs/features/F26-daily-session-pass-payments.md`, `06-ROADMAP-trum-bia-hoi.md` v2.4.*
