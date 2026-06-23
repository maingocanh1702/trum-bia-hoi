# 📊 BRD — Dashboard & CRM Admin — Trùm Bia Hơi (v0.1)

> **Business Requirements Document** cho hệ thống quản trị nội bộ game Trùm Bia Hơi.
> Nguồn sự thật gameplay: `02-GDD-trum-bia-hoi.md` (v1.5). Kiến trúc server: `docs/features/F23-server-architecture.md`. Monetization: GDD §16 + `F26-daily-session-pass-payments.md`.
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
- **Xử lý thanh toán** (Session Pass, donation) — cần đối soát, refund, chống fraud.
- **Hỗ trợ người chơi** — đội ngũ cần CRM để xem state player khi xử lý ticket.

### 1.2 Mục tiêu hệ thống

| # | Mục tiêu | Đo lường |
|---|----------|----------|
| G1 | Biết sức khỏe game **trong 30 giây** | Dashboard load < 3s, KPI cards tự refresh |
| G2 | Xử lý ticket/khiếu nại **dưới 24h** | Trung bình thời gian giải quyết |
| G3 | Phát hiện economy bất thường **tự động** | Alert khi faucet/sink lệch > 20% baseline |
| G4 | Admin **không thể tự ý/trực tiếp tạo xu/power** cho người chơi | Compensation chỉ qua workflow 2 bước + audit + rate limit; tuyệt đối không grant `seasonEarned`/Life Path |
| G5 | Vận hành event không cần dev deploy | Content editor cho quiz/nhiệm vụ/mùa giải |

---

## 2. Người dùng & Vai trò (RBAC)

| Role | Quyền | Ghi chú |
|------|-------|---------|
| **Super Admin** | Full access + quản lý user admin + config hệ thống | 1-2 người (founder/lead) |
| **Game Admin** | Dashboard + player lookup/edit + economy monitoring + event management + ticket xử lý | Đội vận hành |
| **Economy Admin** | Dashboard + economy reports + balance tools (sửa k, cap, giá) | Chuyên trách balance |
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
| Revenue (VND) hôm nay | `PaymentIntent.status = 'paid'` (F26) | 5 phút |
| Conversion rate (guest → login → paid) | Auth funnel | 15 phút |
| k_value thực tế | `ServeEvent` aggregate (GDD §3, `04-SPEC` §5) | theo ca |
| Xu faucet/sink tỉ lệ | Tổng xu vào (serve+tip+quest+lottery) / ra (upgrade+rent+WC shop+cosmetic) | hàng giờ |
| D1 / D7 / D30 retention | Cohort login | hàng ngày |
| Churn rate | Players không login > 3 ngày | hàng ngày |

**Biểu đồ chính:**
- 📈 DAU/MAU trend (30 ngày)
- 📊 Revenue by source (Session Pass / Donation / paid cosmetics nếu có) — stacked area. **Xu-sink trong game không phải revenue VND**.
- 📉 k_value theo thời gian (target 2.0-3.0, GDD §3)
- 🎯 Funnel: Mở app → Chọn ngôn ngữ → Guest play → Login → Shift #1 → Shift #2+ → Session Pass

### 3.2 Economy Health 🟢

| Metric | Cảnh báo khi | GDD ref |
|--------|-------------|---------|
| k_value | Ngoài 2.0–3.0 | §3 |
| Trần ngày hit rate | > 30% players chạm 500k/ngày | §10 |
| Xu trôi nổi (coins tổng) | Tăng > 15%/tuần | Inflation |
| Uy tín trung bình | Giảm > 20%/tuần | §8 |
| Session Pass attach rate | < 5% hoặc > 40% | §16/F26 |
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

### 5.2 Config tuning (Economy Admin)

Các hằng số **tunable** (🟡 PROTOTYPE-ASSUMPTION trong GDD):

| Config | Hiện tại | Cho phép sửa? | Impact |
|--------|---------|:-------------:|--------|
| `k_value` | 2.5 | ✅ (range 2.0-3.0) | Rescale toàn bộ economy |
| `beerFreshnessBaseMs` | 12.000 | ✅ | Độ khó freshness |
| `rushSpawnIntervalLight` | 1.000 | ✅ | Tốc độ spawn rush nhẹ |
| `rushSpawnIntervalHeavy` | 700 | ✅ | Tốc độ spawn rush nặng |
| `freeSessionsPerDay` | 1 | ✅ | F26 access gate |
| `sessionPassPriceVND` | (config) | ✅ | F26 pricing |
| `freshnessPenalty` | tip×0, uy tín −1 | ✅ | §6 hậu quả |
| `dailyCoinCap` | 500.000 (200k×k) | ✅ (auto ×k) | §10 |

> **Safeguard:** mỗi thay đổi config phải: (1) preview impact (hiện bao nhiêu player bị ảnh hưởng), (2) confirm + lý do, (3) ghi audit log, (4) có rollback.

**Config governance bắt buộc:**
- Config có version: `draft → approved → scheduled → active → archived`.
- Mỗi config change có `effectiveAt`, `expiresAt?`, `changedBy`, `approvedBy`, `reason`, `rollbackVersion`.
- Các config high-risk (`k_value`, `dailyCoinCap`, `sessionPassPriceVND`, league thresholds, payout/reward tables) cần **dual approval**: Economy Admin đề xuất → Super Admin hoặc Game Admin duyệt.
- Không sửa trực tiếp production row; publish tạo version mới, rollback là publish lại version cũ.
- Preview impact tối thiểu: số player bị ảnh hưởng, thay đổi giá/cap/reward, dự báo faucet/sink 7 ngày.
- Emergency hotfix được phép nhưng tự tạo ticket hậu kiểm trong 24h.

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

## 7. Module Payment & Donation 🟡

### 7.1 Payment Dashboard

| Metric | Mô tả |
|--------|-------|
| Revenue hôm nay / tuần / tháng | Tổng `PaymentIntent.amount` where `status = 'paid'` |
| Session Pass sales | Số lượng day_pass / week_pass bán |
| Donation "Mời Bia" | Số lượng + tổng VND |
| Conversion funnel | Guest → Login → View offer → Purchase |
| ARPU / ARPPU | Revenue / DAU và Revenue / paying users |

### 7.2 Transaction Management

- Danh sách giao dịch: player, product, amount, provider, status, timestamp.
- Tìm kiếm: theo player, transaction ID, date range, status.
- **Refund workflow:** Support Agent đề xuất → Game Admin duyệt → hệ thống revoke entitlement + ghi audit. **Không clawback sessions đã chơi** trừ fraud (GDD §16, F26 §7).
- Chống duplicate: hiện warning nếu cùng player mua 2 lần trong < 1 phút.

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

## 11. Phân phase triển khai

| Phase | Scope | Khi nào |
|-------|-------|---------|
| **Admin P0** | Player lookup (read-only) + audit log skeleton + k_value monitor + config viewer/proposal (không apply live trừ Super Admin emergency) | Cùng game Phase 1 (khi có server) |
| **Admin P1** | Dashboard KPI cards + economy health alerts + ticket queue + anti-cheat flag management | Game Phase 2-3 |
| **Admin P2** | Payment dashboard + refund workflow + season/event manager + content editor | Game Phase 3 |
| **Admin P3** | Full analytics (cohort, funnel, economy waterfall) + WC event ops + lottery monitoring | Game Phase 4 |

> Admin P0 là **tối thiểu** để vận hành server-authoritative: phải xem được player state + audit mọi thay đổi. Economy config ở P0 ưu tiên read-only/proposal; apply live đầy đủ chờ P1 khi có alert/rollback tốt hơn.

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

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|-----|----------|
| v0.1 | BRD đầu: 10 module (Dashboard analytics, CRM player management, Economy tools, Content management, Payment/Donation, Support/Tickets, Audit/Security). 5 roles RBAC. Phân phase Admin P0-P3 gắn vào game Phase 1-4. Nguyên tắc cốt lõi: không grant seasonEarned, workflow duyệt compensation, audit mọi mutation. Tham chiếu GDD v1.5 + F23 server + F26 payments + F25 account. |
| v0.2 | Vá review: sửa wording admin compensation vs "không tạo xu"; bỏ "in-game xu purchases" khỏi revenue source; thêm config versioning/draft-publish/dual approval; giới hạn season CRUD bằng draft/correction workflow; thêm Privacy & PII; hạ Admin P0 config editor thành viewer/proposal an toàn hơn. |

*Nguồn: `02-GDD-trum-bia-hoi.md` v1.5 (§3/§8/§10/§11/§16/§18), `docs/features/F23-server-architecture.md`, `docs/features/F25-localization-account.md`, `docs/features/F26-daily-session-pass-payments.md`, `06-ROADMAP-trum-bia-hoi.md` v2.4.*
