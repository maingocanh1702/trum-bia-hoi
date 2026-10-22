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

Numbers in force: JSON **2.1.1** — the numbers S5 `eco21-balance-pass` sealed by simulation under 2.1.0 (08-SPEC §8.1–§8.6), unchanged; 2.1.1 only moved `kickTable.feeRate` (owner call 1, 2026-10-22). Price base per level, displayed ×k 2.5.

| Kind | Levels price base (Lv1 → Lv5; kitchen Lv0 → Lv4) | Main stats |
|---|---|---|
| `keg` | 0 / 2,000 / 7,750 / 38,750 / 146,750 | ready reserve `kegStorage` 4/7/12/20/40, refill batch `kegBatch` 2/3/5/8/14, `refillMs` 12/8/6/5/4 s. Rules 28 (seat model, `refillEnabled` on): **instant pour** — a ready beer and a clean glass are a ready beer in the tick of the order, so a keg level buys reserve + refill only; the tap columns (`pourSlots` 1/2/3/4/6, `pourMs` 2000→1200) drive only capacity pins, rules ≤ 27 replays and refill-off snapshots |
| `washer` | 0 / 1,500 / 6,250 / 29,500 / 97,750 | glasses per wash batch (`slots`) 1/1/2/3/5, `washMs` 7000/5000/4000/2500/1500 |
| `cooler` | 0 / 1,250 / 4,500 / 22,500 / 73,250 | glass freshness 12 s → 20 s → 35 s → 60 s → infinite |
| `stall` | 0 / 750 / 3,250 / 14,250 / 59,000 | stock cap per ingredient 15/25/45/80/150 (Lv2 at 1,875 xu is the cheapest device level: no device level costs less than table 2, so the goal chip shows table 2 after shift 1) |
| `kitchen` | — / 4,500 / 19,500 / 78,500 / 195,500 | Lv1 opens `dau`/`topmo`, Lv2 `long`; pans 1/2/2/3 × portions 2/2/3/3, prep ×1.00/0.90/0.80/0.70 |
| `table` (seat model, rules 28) | four commands, not one ladder: `buyTable` (table n = `tablePriceBase[n−2]` = 428 · 3,700 · 5,700 · 9,600 · 12,900 · 15,900 · 16,000 base → **1,070** … 40,000 xu; cap `tableSlots` 8 in every location), `buyChair` (second chairs after 4 tables, `chairPriceBase` 400 … 2,800 base by second chairs owned), `upgradeTable` Lv1→4 (target-level price `priceBase + stepBase × n`: 7,000 + 2,500 n · 34,000 + 13,500 n · 59,500 + 20,500 n; gates LP1/LP2/LP4; the table needs two chairs), `upgradeChair` Lv1→3 (12,000 + 6,000 t; gates LP1/LP2) | seats and tray shape (1 chair: a single guest, beer *or* one instant snack; 2 chairs: a pair, beer + one snack); table levels give the NEXT group +1 round (Lv2), a second snack 35 % (Lv3), tip ×1.25 at that table (Lv4); chair levels give order patience ×1.15 / ×1.30 — `03-SPEC-he-ban.md` §6 |

Displayed price = `round(priceBaseXu * k)`. Device gates (`upgrades.lifePathGate`): Lv4 of every device needs LP2, Lv5 LP3; kitchen Lv3/Lv4 LP3/LP4. A pinned snapshot keeps the prices it was pinned with; the capacity-model table ladder (level = seats) survives only on capacity pins.

## 4. Purchase rules

- Server validates `coins`, current level, prerequisites, inventory requirements.
- Upgrade increments one level only; no skip.
- Buying upgrade spends `coins`, not `seasonEarned`.
- Owner update 2026-09-09: equipment, kitchen and table purchases are allowed during a shift. Management stays paused until the menu closes. Empty-table upgrades retain badge/reputation gates; existing guests/orders are not reset.
- Rules 28 (seat model, Waves 2–3): no seat-model purchase needs an empty table — a bought chair, table level or chair level serves the NEXT group (the seated group keeps its tray and perks); every button shows its price and, when dimmed, exactly one reason, the first refusal of the command's own quote (`buyTableQuote` / `buyChairQuote` / `tableUpgradeQuote` / `chairUpgradeQuote` in `rules.ts`). The HUD's quick "Mua ghế bàn n · giá" buys the next chair in one tap without pausing (D10), like the quick beer refill; it shows only while the goal chip points at a second chair, and since owner call 3 (the founder, 2026-10-22) the chip suggests no second chair while a table can still be bought, so the button appears once every place holds a table (the sheet sells chairs from the fourth table on).

## 5. Effects

- `keg`: rules 28 — ready reserve and refill batch/speed (instant pour); capacity pins and old replays — concurrent pours and pour duration.
- `washer`: controls dirty glass queue throughput.
- `cooler`: changes `beerFreshnessMs`.
- `stall`: changes stock caps and overflow conversion.
- `table`: rules 28 — tables (cap `tableSlots`), second chairs (pairs and the double tray), table levels (perks for the next group) and chair levels (order patience), each with its own sprite (table by level, chair by chair level, tray by the dishes the level allows; S6 yard); capacity pins — `capacity`, sprite, table slots.
- `kitchen`: unlocks `dau`, `topmo`, `long`, prep slots.

## 6. UI

- Upgrade cards show current stat -> next stat, price, lock reason.
- Recommendation badge can point to observed bottleneck: no clean glasses, stale beer, stock full.
- Sprite changes after each level (checklist A3–A7: the countable stat — taps/basins/burners — must read at 64 px).
- Reference flows (owner, 2026-09-08, not a contract): `docs/reference/trumviahe-sheet-upgrade-equipment.png` / `-business.png` (sheet with tabs, card grid, MAX/lock states, location row with Expired · Renew) and `docs/reference/trumviahe-popover-upgrade-inplace.png` (tap equipment on the yard → contextual detail panel with price and state; management pauses until closed). Either entry point must lead to the same purchase command.

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

## 9. Local business unlocks — 2026-09-09

Phone/QR purchases use a shared quote over config unlocks.*.gate and priceBase.
The command validates exact identity, ownership, reached LP and current coins, then
uses the existing spend ledger. A repeated purchase cannot debit again. A locked
attempt emits life_path_gate_blocked with feature and configured required level.
The UI lists unmet conditions, shows owned status and uses original draft sprites;
QR feeds the existing customerValue tip path immediately. Reward claims are not an
unlock prerequisite. Shipper now uses the phone prop and its own rules-v7 delivery timer/sheet (F07 §9). Social behavior still needs its own producer wiring.

## Changelog (append-only)

Audit rows imported from the original checkout describe its reference engine and measurements. Current implementation evidence is in docs/build-progress.md; source claims of19tests, automatic LP rewards or pan identity by dish/time do not override the reconciled runtime contract.


| Date | Change |
|---|---|
| 2026-09-09 | Added config-driven phone/QR purchases, active ownership props and the shared progression gate; preserved whole-table service and added real QR tip/replay verification. |

| 2026-09-09 | Phone consumer now opens local shipper orders with whole-stock handoff and a live deadline; purchase gate/price remain shared, social producer unfinished. |

## 10. Local business signboard — rules v9

Install the default Wood sign after reaching signboard.gate.stallLevel, using the
scaled installFeeBase plus Wood priceBase (currently zero). Installation writes the
existing signboard unlock used by LP requirements. Each other style is bought once,
then free to re-equip. Exact style identities come from the finite JSON catalog.
Golden repBase is a scaled purchase threshold, not a reputation debit, consistent
with GDD §8/original §7; owned Golden remains usable after reputation falls.

One signboardQuote owns installation/ownership/selection/coin/rep checks. Both
commands recheck at execution; only successful purchases use existing spend, with
no season/lifetime credit. Style ownership uses existing unlocks with signboard:
prefix; selected signStyle is optional in old worlds. Original v8 active-delivery
and active-rush fixtures preserve their history; savev2 accepts rules1–9.

Business sign changes are available during a shift, like Phone/QR; the phase1
physical-equipment restriction does not apply. They affect future customer weight
rolls and newly scheduled delivery intervals only. VIP per-group cap, existing
people/orders/deadlines and all payment/penalty formulas remain unchanged. Neon
multiplies delivery frequency, not its wait duration. Hidden time keeps existing
deadlines paused through the same scheduler. Donation cosmetics cannot grant these
business effects.

The native VI/EN sheet is reachable from Upgrades and the installed yard sign. It
shows actual prices, attraction/frequency effects, equipped/owned states and Golden
rep requirement. Art: five original native-alpha builtin sprites, prompts in
docs/reference/assets-owner-2026-09-08/signboard-prompts.json; upgrade SFX pair reused.
Author92 unit/37 E2E, config/build/assets and110 sign economy rows passed; k2.3072–
2.8616 with>=500 serves/row. Baseline10 rows and15 pressure windows also passed.
Independent full-diff review pending. Other F10/game work remains in progress.

| Date | Change |
|---|---|
| 2026-09-09 | Implemented local business sign installation, five-style ownership/equip, future-arrival/cadence effects and original sprites; clarified Golden reputation gate. Full independent review pending. |


| 2026-09-09 review receipt | Full immutable diff bdbb493..9239007 independently reviewed with no introduced actionable defects. Corrected VIP-cap exhaustion at config intake, synchronized both sign gate keys, and aligned quote spend validation with active-shift ledger ownership.95 unit/37 E2E/config/build/assets plus normal/pressure sim passed. Full F10/M0-M9 remains in progress. |


## 11. Local flyer campaigns — rules11

`unlocks.flyer` is the sole tuning source: repBase is spent after one Base scaling;
there is no coin price or separate unlock fee. The LP gate applies to purchase and
activation. `world.flyers` is optional for older histories (zero stock), and first
acquisition records persistent `flyer` ownership for LP4 even after stock is consumed.
One flyerQuote supplies UI and engine guards; buyFlyer checks safe stock, capacity,
reputation and the active shift's reputation aggregate before debiting changeRep.
Resting purchases leave historical shift stats untouched. Audit events record before/
after reputation, actual cost and resulting stock. Coin/day/season/lifetime ledgers
receive no acquisition or activation credit.

| Trigger | Result |
|---|---|
| buyFlyer, reached configured gate, sufficient reputation, stock below cap | Debit reputation once; add one flyer and persistent ownership |
| Buy fails gate/stock/rep/safe arithmetic | Refuse before resource mutation |
| activateFlyer with exact live shiftId, visible open shift, stock, unused allowance | Consume one, increment per-shift counter, record event start and deadline |
| Stale shift, hidden/resting/closing, active campaign, no stock or allowance | Refuse; no timers or guests reset |
| New arrival interval while active | Multiply demand in shared arrivalIntervalMs; ordinary baseline first, active Rush hard floor last; round once after group size |
| Activate or expire with pending arrival | Keep that arrival's existing deadline; only newly planned intervals change |
| Hidden/offline | Move campaign gameplay start/end with existing paused shift clock; original start event wall timestamp stays intact |
| Natural expiry | Report `[start,end)` before same-time service/departure events; remove campaign once |
| Closing | Stop new arrivals; campaign/report continues for remaining seated service until deadline or shift finalization |
| Finalize before deadline | Emit one early report, clear campaign; next shift receives a fresh allowance |

No forced hurried-customer retag and no patience multiplier. summarizeRush reads
the campaign event interval for actual seated served/lost/revenue and nominal tips;
it excludes delivery credit and reward faucets, and counts mirrored departures once.
Daily-cap-adjusted revenue is labeled separately from pre-cap tips. Hidden duration
is excluded from activeMs. Reports are events, not another mutable ledger.

The native flyer sheet is reachable from Upgrades, the stock strip and Shift Book.
Activation closes it immediately and the yard shows a live countdown. Buy/use guards
remain visible, translations cover VI/EN, touch targets are at least44px. An original
native-alpha draft sprite and existing paired upgrade SFX serve the actual producer.
The four bottom actions and numeric-only departure toasts remain unchanged.

F17's free flyer for daily5/5 requires its actual quest and unique-gift producer;
there is no unauthenticated/free claim shortcut here. That dependency remains in the
full M0–M9 scope. When implemented, full-stock claims must refuse atomically and be
retryable rather than dropping rewards or inventing a conversion. Server validation
and final art/release QA are still required later milestones.

| Date | Change |
|---|---|
| 2026-09-09 rules11 | Added local flyer purchase/use/stock/clock/event reports and native sheet, with canonical rep debit, LP gate, demand-only effects and exact historical replay. Daily5/5 producer remains dependent F17 work. |


| 2026-09-09 review | Full diff360453e..d5be3e0 reviewed with no introduced actionable defects. Scaling suspicion disproved by existing Config.values producer and real purchase300base→750charged at k2.5; no second multiplier added.108 unit/40 E2E and30 k rows passed; daily5/5/server/full F10 acceptance still open. |

## 12. In-shift asset upgrades — owner update, rules17

Both equipment entry points use upgradeQuote and the same upgrade command. Current
commands may upgrade any equipment or buy another table without finalizing the
shift. Table upgrades require an empty table and retain badge/reputation/cost gates.
New level/sprite/capacity and unlocked menu items appear immediately. Existing prep
and wash jobs retain their deadlines; newly scheduled work uses the upgraded
capacity/speed after the menu closes. Menu purchases do not close or resume it.

Prices still come from the pinned config. A failed purchase reports insufficient
coins or maximum level, not a request to close the shift. Active purchases debit
coins once and contribute to the current shift's existing spent ledger, without
season/lifetime earnings. No customer/order is rebuilt.

The old phase1UpgradesOutsideShiftOnly flag is retired for rules17, with seed1.7.2
setting it false. It remains in historical config snapshots and is honored only by
replay rules1–16. A real v16 paused save with four outsideShiftOnly refusals is a
regression fixture: old results remain exact, new commands work in that same shift.

| Date | Change |
|---|---|
| 2026-09-09 owner update | Allowed asset upgrades during an active shift; retained pause-until-close, prices, prerequisites, in-flight jobs and exact v16 replay. Removed close-shift UI lock and surfaced real insufficient-coin condition. Verification/review in progress. |

## 13. Owner production/capacity update — 2026-09-09

See08§8.1 for authoritative numbers and explicit interpretation. New upgrades show
current and next storage, batch units/duration, clean glass pool, kitchen slots,
per-dish warehouse capacity and cooler freshness. Cooler has no storage-cap field:
show its real freshness duration instead of inventing a capacity. On-yard counters
and progress bars use the same engine state as contextual panels. Blank higher
keg/washer/cooler sprites temporarily reuse the nearest available lower-level art;
level labels and stats remain accurate, distinct level art is still unfinished.

A purchased upgrade immediately changes capacity/next-load speed while keeping the
current batch's quantity/deadline. Menus remain paused until closed. Bia inventory
means raw stock, shown separately from ready tank servings and reusable glasses.

| 2026-09-09 batch/HUD | Implemented rules18/config1.7.3 stocked beer, washer loads and live capacity/progress + current/next comparison. Author173 tests/mobile pass; full browser/sim/review pending. |


The washer object displays washing units/batch capacity; the separate rack displays
clean/total glasses. Cooler current/next freshness includes the current weather
multiplier through the shared engine calculation. Inherited wash jobs without a
start timestamp use native indeterminate progress and retain their real countdown.

| Date | Change |
|---|---|
| 2026-09-09 verification | Batch/HUD product reviewed through7897bdd with both initial HUD findings fixed and no remaining introduced actionable defect.174 engine/server +72 browser +config/build pass;20 canonical1000-serve cohorts k2.5821–2.9601 and15 rush pass. Initial500 excursion and larger-sample disclosure in build-progress. F10 as a whole remains in progress. |


## Original-checkout audit history (reference only)

| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | `keg.pourMs` 3000→1800 đổi thành 2000/1700/1700/1500/1300 (slots giữ nguyên) theo 08-SPEC v1.3.1 §8.1 — bom Lv1 1 vòi × 3 s làm VIP nhóm 2 mất tip; số vẫn chỉ đọc từ `economy.tbh.json`. |
| 2026-09-09 | `keg.pourSlots` 1/1/2/2/3 → 1/2/3/4/6, `pourMs` 2000/1800/1600/1400/1200 (JSON 1.7.2, 08-SPEC v1.3.2) — sim 5 quy mô quán: số vòi mới là giá trị của bom; Lv4/Lv5 còn chờ founder chọn nguồn giá trị. |
| 2026-09-09 | Audit economy: bật `keg.refillEnabled` (bom chứa = phanh đầu game, engine cần cài ở M1: đầu ca bom đầy, vòi chỉ rót khi bom > 0, tự châm batch mỗi refillMs từ kho); thêm lệnh `buyGlass` (cốc mua tới `glasses.buyCap` 40, 400 base/cốc); giá washer/cooler/stall/kitchen/bàn cân lại ×1,3–1,6; ghế 11–48 để mua bàn sau khi nâng bàn. Số ở JSON 2.0.1 / 08-SPEC v1.4.0. |
| 2026-09-09 (2) | **Engine đã cài** (`packages/engine`): lớp bom chứa/refill + lệnh `buyGlass` + `keg_refilled/keg_empty/glass_bought`; test 16/16, sim k 2,58–2,72 với refill bật. Career sim engine thật: cây thiết bị (không bếp) xong ~ngày 13, LP4 ngày 13. |


| Date | Reconciled game update |
|---|---|
| 2026-09-09 | Adopted latest handoff numbers as config2.0.1, preserving owner pause/live-upgrade policy and immutable1.x snapshots. Rules21 station/demand/glass/LP-gate implementation is under verification; lease lifecycle and actual career measurements remain pending. Current evidence: docs/build-progress.md. |


## Rules21: current economy2.0 station and purchase contract

The tank holds configured servings independently of the glasses. At successful new-shift opening, fill only its free capacity from actual raw stock, excluding both stored beer and any in-flight batch. Never discard over-cap legacy stock, refill it for free, or accelerate carried work. A tap consumes one serving and one clean glass and finishes after pourMs; freshness begins then. Vacancies trigger bounded sequential refills immediately.

Bếp uses stable `Item.kitchenBatchId` (the first portion's existing item ID), with at most portionsPerPan same-dish items. Same-order items precede other orders; a started pan never absorbs arrivals. Identical completion timestamps do not merge pans. Washer retains sequential bounded batches.

`buyGlass {count}` quotes total owned glasses against min(buyCap,storageCap), spends exact price once, and allocates distinct glass IDs. Existing menu pause remains active after buying. Equipment quotes include the next-level LP gate; kitchen arrays include level0, other devices start at level1. Reached LP suffices without claiming its reward. UI reads the same quote and counts.

Old1.x active shifts retain their complete raw config. New2.0.1 config is pinned only at a successful next opening; a refused opening never reprices assets or registers its candidate.

| 2026-09-11 | M1-UPGRADE: local Shift book/Upgrades show one measured suggestion from current-shift stale serves or full-queue rejection counts. Existing sheets/quotes own purchases. Missing legacy history/maxed devices do not create suggestions;9focused checks PASS. No economy or engine change. |
| 2026-09-18 owner | **Mô hình bàn ghế v3.3 thay hẳn cấp bàn = sức chứa:** thứ tự mở khoá bàn 2 → 3 → 4 (kèm ghế) → ghế 2 từng bàn (`chairsAfterTables` 4; ghế 2 = đón cặp + mâm bia và mồi) → nâng bàn (cần 2 ghế; Lv2 `extraRounds` +1 · Lv3 `pExtraMoi` 0,35 · Lv4 `tipMult` 1,25); số bàn tối đa theo `locations.list[].tableSlots`; mua bàn/ghế không đòi bàn trống; sheet Nâng cấp 3 làn (Sức chứa · Tốc độ · Khách) + progressive disclosure + chip "mục tiêu kế tiếp"; đuôi thiết bị Lv4–5 và bếp Lv3–4 `priceBase` ×0,5; giá ứng viên W9 ở 08-SPEC changelog 18/09. Bỏ `extraSeatPriceBase`, `backrest`, gate Kết Nối. Chờ S1/S4/S5/S6, rules 28. Nguồn: `docs/DESIGN-story-3-tuan-2026-09-18.md` §2b/§2c, `docs/PLAN-vui-3-ca-2026-09-18.md` §1, `docs/FEEDBACK-2026-09-17.md` §II.2 v3.3 |
| 2026-10-15 fun-next-goal | UI only, on the unchanged engine: (1) HUD chip "Mục tiêu kế tiếp" from shift 1 (name · one-number effect · price · what is still missing; a tap opens the Upgrades sheet at that item; Settings → "Gợi ý mục tiêu" switches it off); (2) the full Upgrades sheet is three lanes — Sức chứa (tables, buy table) · Tốc độ (devices, kitchen) · Khách (sign, flyer, phone, QR) — drawn from the data-driven goal registry `apps/web/src/goals.ts`, so Wave 2 chairs/dishes are one more provider. Pick rule (Tier C `nextGoal.reachMult` = 3, JSON 2.0.6): cheapest eligible coin-priced item of the first lane that has one (capacity → speed → guests), within `reachMult` × the average takings of a closed shift; a new save is not filtered; nothing in reach → the cheapest eligible item; items behind a life-path/badge/reputation/stall gate are never suggested. Engine: two read-only quotes `tableUpgradeQuote` / `buyTableQuote` in `rules.ts` that say exactly what `upgradeTable` / `buyTable` will (price and first refusal; parity tests); the commands themselves are untouched. No economy value or rule changes. |
| 2026-10-19 fun-buy-buttons-reason | UI only: every table-upgrade button and "Mua thêm bàn" shows its price and, when dimmed, exactly one reason — the first refusal the command itself would give, read from the engine quotes `tableUpgradeQuote` / `buyTableQuote` (guests at the table · not enough coins · badge/reputation needed · all tables built; at the top level the button itself says "Đã tối đa"). The "numeric-only departure toasts remain unchanged" line above is superseded by F07 (2026-10-19): the toast carries one reason. The shift book lists why guests left, most guests first (`leaveRows`). No engine rule or number change. |
| 2026-10-19 S1 rules 28 | Đã cài phần bàn/ghế (JSON 2.0.20): `buyTable` giá `tablePriceBase[n−2]`, không gate LP, trần `tableSlots` (mọi mặt bằng 4 đợt này); lệnh `buyChair {tableId}` — ghế 2 chỉ sau `chairsAfterTables` (4) bàn, giá `chairPriceBase` theo số ghế 2 đã mua toàn quán, tối đa 2 ghế/bàn; mua không đòi bàn trống (nhóm đang ngồi giữ mâm). `upgradeTable` cần bàn 2 ghế, không đổi số ghế; giá/gate cấp bàn giữ tới S4. Bỏ `extraSeatPriceBase`, `table.levels[].capacity`, `maxTables`. Sheet Nâng cấp: thẻ bàn có nút "Thêm ghế · giá" + 1 lý do, nút "Mua bàn · giá" mờ kèm lý do (UI tối thiểu; S6 làm làn Sức chứa). Bot career mua bàn → ghế trước thiết bị, không mua chó. |
| 2026-10-19 merge Wave 1 × S1 (stage 00) | Wave 1's UI on the seat model (rules 28): the chip's first goal is table 2 (capacity lane, `goal.buyTable`, effect "+1 chỗ", price from the `tablePriceBase` ladder); a table level carries no seat and no benefit until S4, so the chip never points at it (the sheet still lists it, dimmed with its one reason "Bàn cần 2 ghế"); a one-chair table card sells its second chair ("Thêm ghế · N xu") with the quote's one reason ("Mua đủ bàn trước" until four tables, then "Chưa đủ xu"); "Mua bàn · N xu" replaces "Mua thêm bàn · N xu" (no price once the alley is full). A capacity snapshot pinned before rules 28 keeps Wave 1's behaviour (a level is seats, a busy table blocks the upgrade). One definition each of `buyTableQuote` / `tableUpgradeQuote` / `buyChairQuote` in `rules.ts` (the seat-model superset), parity-tested against the real commands in `packages/engine/test/goal-quotes.test.ts`. |
| 2026-10-20 stage 00 | English chip effect for a new table reads "Seats +{n}" (was "+{n} seats", which printed "+1 seats" now that a new table is one chair); vi unchanged ("+{n} chỗ"). The chip, the three lanes, the buy-button reasons and the one-card sheet are proven on a capacity snapshot (frozen 2.0.4 file) and on the seat model (verify map `upgrades-equipment-tables.md`, `onboarding-guide.md`). No number and no rule changed. |
| 2026-10-20 stage 00 review round 1 | Label only: the bundled config that carries the seat model and Wave 1's Tier C keys is JSON 2.0.21 (S1's earlier tip also said 2.0.20 but had no Wave 1 keys, so the merged content needed a new label); the "JSON 2.0.20" of the S1 row above names that earlier tip. No rule, price or UI change. The chip's table-gate test (`packages/engine/test/next-goal.test.ts` `a goal behind a life-path, badge, reputation or stall gate is never suggested (seat model)`) now walks `tableUpgradeQuote(...).gate` (two chairs, then the badge, then the reputation, then open) instead of an assertion that could not fail. |
| 2026-10-20 S2 rules 28 | Bom (`keg`) trên game bàn ghế: vòi (`pourSlots`/`pourMs`) ra khỏi đường phục vụ (rót tức thì: `beer.ready > 0` + cốc sạch → món bia `ready` cùng tick), nên một cấp bom = sức chứa rót sẵn + mẻ nạp (`kegStorage`/`kegBatch`/`refillMs`); thẻ so sánh cấp chỉ hiện hai dòng này ("Dự trữ rót sẵn: n cốc", "Nạp từ bom vào dự trữ: …"), chip mục tiêu hiện "dự trữ n cốc". Giá cấp bom không đổi (S5 định giá lại theo sức chứa + mẻ). Save ghim snapshot sức chứa giữ vòi và thẻ cũ tới lần mở ca nhận snapshot bàn ghế. |
| 2026-10-20 S4 rules 28 | Đã cài (JSON 2.0.23): **nâng bàn Lv1→4** (`upgradeTable`, bàn phải có 2 ghế, mua bất kể bàn đang có khách) giá theo **cấp đích** `priceBase + stepBase × n` (n = số bàn đã đạt cấp đó, ≥ cấp đích; ứng viên W9: →Lv2 8 000 + 3 000·n, →Lv3 20 000 + 8 000·n, →Lv4 35 000 + 12 000·n, base ×2,5), gate Đời Quán Lv2 **LP1** · Lv3 **LP2** · Lv4 **LP4** (bỏ gate huy hiệu Kết Nối và uy tín); lợi ích cộng dồn, chốt cho nhóm lúc ngồi: Lv2 **+1 đợt gọi**, Lv3 mỗi khách có `pExtraMoi` 0,35 gọi **mồi thứ 2** (chỉ món còn hàng; mâm vẫn chỉ giao khi đủ món), Lv4 **tip ×1,25** chỉ ở bàn đó. **Nâng ghế Lv1→3** (`upgradeChair {tableId}`, không đòi 2 ghế): `4 000 + 2 000·t` (t = số lần nâng ghế đã mua toàn quán), gate Lv2 LP1 · Lv3 LP2, `patienceMult` 1 / 1,15 / 1,30 nhân kiên nhẫn chờ món của đơn (một lần mỗi đơn, không cộng dồn qua đợt). Thay key postmvp `upgrades.backrest`. UI: thẻ bàn có dòng "Cấp n · lợi ích", "Ghế cấp n · kiên nhẫn ×m", nút "Nâng · giá" và "Nâng ghế · giá", mỗi nút mờ kèm đúng 1 lý do ("Cần đạt Phụ Quán" gọi tên mốc trước, rồi "Chưa đủ xu"); chip "Mục tiêu kế tiếp" nhận cấp bàn làm mục tiêu khi bàn đủ 2 ghế và mốc đã mở (hiệu ứng: "+1 đợt gọi" / "mồi thứ 2 35%" / "tip ×1.25"); quy tắc chip không đổi. Pin ≤ 2.0.22 giữ thang cũ (giá `levels[].priceBase`, gate Kết Nối, không lợi ích). Số là ứng viên, S5 chốt. 03-SPEC §6 ghi chú, 08-SPEC §22. |
| 2026-10-20 S4 review round 1 | UI và test, không đổi luật hay số: thẻ bàn ghi "Cấp n" rồi mỗi lợi ích một chip ngắn ("Thêm 1 đợt gọi" / "Mồi thứ 2: 35%" / "Tip ×1,25", mỗi chip ≤ 6 từ; trước đây Lv4 là một dòng 12 từ), hai nút tối đa có tên riêng ("Bàn đã tối đa" / "Ghế đã tối đa", en: Table at max level / Chairs at max level), chip "Mục tiêu kế tiếp" viết "tip ×1,25" bằng dấu thập phân của ngôn ngữ như thẻ bàn; thanh kiên nhẫn của bàn đổi sang "thấp" đúng lúc mất tip (40% kiên nhẫn của chính khách, `guestPatienceLeft`) dù ghế cấp 2-3 kéo dài hạn chót của đơn; `effectiveTableLevel` là một chỗ duy nhất nói "cấp bàn chỉ có tác dụng khi đủ 2 ghế" (engine ghi vào nhóm, thẻ bàn đọc để liệt kê lợi ích); `error.chairUpgradeUnavailable` có câu vi và en. Test mới: ví ghế, thanh toán Lv4 = công thức Lv1, cửa sổ tip theo cấp ghế, chip, thẻ tối đa kép. DECISIONS `03 · review round 1`. |
| 2026-10-20 S5 rules 28 (JSON 2.1.0) | Giá chốt cho cả game từ sim cân bằng (bảng cổng: 08-SPEC changelog 2026-10-20 / JSON 2.1.0): bàn thứ 2…8 = 600 · 2 000 · 4 000 · 7 500 · 12 500 · 20 000 · 31 300 base, ghế 2 = 10 000 · 15 000 · 22 500 · 30 000 · 40 000 · 50 000 · 60 000 · 70 000 base (×2,5 hiển thị); thang nâng bàn/ghế của S4 giữ nguyên; thiết bị Lv2–5 (base): bom 1 750 · 6 750 · 13 500 · 51 000, rửa 1 250 · 5 500 · 10 250 · 34 000, hầm 1 000 · 4 000 · 7 750 · 25 500, quầy 600 · 2 750 · 5 000 · 20 500, bếp Lv1–4 4 000 · 17 000 · 27 250 · 68 000 (thay đuôi ×0,5 của W9; cấp, thời gian và sức chứa không đổi); **sàn giá: không bậc thiết bị nào rẻ hơn bàn 2** (quầy Lv2 = 600 base = 1 500 xu), vì chip "mục tiêu kế tiếp" gợi ý món trong tầm `reachMult` × thu nhập ca trung bình, làn Sức chứa trước — một bậc rẻ hơn bàn 2 chen vào trước ở ~13 % ca đầu và sheet Nâng cấp chỉ còn thẻ thiết bị. Bom Lv2–5 giờ chỉ mua dự trữ rót sẵn + mẻ nạp nên giá theo thứ đó; chuỗi `upgrades.keg._rule` viết lại cho khớp. Ví khởi đầu 1 750 xu (700 base): hết ca 1 luôn mua nổi bàn 2 (nhỏ nhất 1 734 xu qua 60 lượt). Quy tắc chọn của chip giữ nguyên; sau ca 1 chip luôn trỏ vào bàn 2 (200/200 seed, hai kiểu phục vụ), sau đó vào bậc rẻ nhất trong tầm (quầy Lv2, 1 500 xu) trước thang bàn 3 (5 000 xu) và thang nâng bàn (27 500 xu). |
| 2026-10-21 S5 rules 28 (JSON 2.1.0, review vòng 1) | **Số chốt mới thay dòng 2026-10-20** (bảng cổng: 08-SPEC changelog 2026-10-21): bàn thứ 2…8 = 600 · 3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000 base, ghế 2 = 400 · 600 · 900 · 1 200 · 1 600 · 2 000 · 2 400 · 2 800 base (×2,5 hiển thị); nâng bàn →Lv2 7 000 + 2 500·n, →Lv3 34 000 + 13 500·n, →Lv4 59 500 + 20 500·n, nâng ghế 12 000 + 6 000·t (gate và lợi ích của S4 giữ nguyên); thiết bị Lv2–5 (base): bom 2 000 · 7 750 · 38 750 · 146 750, rửa 1 500 · 6 250 · 29 500 · 97 750, hầm 1 250 · 4 500 · 22 500 · 73 250, quầy 750 · 3 250 · 14 250 · 59 000, bếp Lv1–4 4 500 · 19 500 · 78 500 · 195 500; sàn giá giữ (quầy Lv2 = 750 base = 1 875 xu ≥ bàn 2 = 1 500 xu). Ví khởi đầu về **750 xu** (300 base): kết ca 1 mua nổi bàn 2 ở 15 / 60 lượt, trung vị thu ròng 533 xu (hàng P0 đỏ, quyết định của owner). |
| 2026-10-21 S5 rules 28 (JSON 2.1.0, quyết định owner) | **Giá bàn 2 = 428 base = 1.070 xu** (trước 600 base = 1.500 xu), thay con số 1 500 xu của dòng trên; bàn 3…8 (3 700 · 5 700 · 9 600 · 12 900 · 15 900 · 16 000 base), ghế, thang nâng và thiết bị giữ nguyên; sàn giá giữ (quầy Lv2 = 750 base = 1 875 xu ≥ bàn 2 = 1 070 xu). Ví khởi đầu vẫn **750 xu**: kết ca 1 mua nổi bàn 2 ở **83 % của 300 lượt** (79–87 %; 81 % ở n = 600) — tiêu chí 4/5 của owner (quyết định owner 1, 21/10/2026; 08-SPEC changelog 2026-10-21, DECISIONS `## 04 · owner decision 1`). Chip mục tiêu và nút "Mua bàn" đọc giá từ config ("Mua bàn · 1.070 xu"). |
| 2026-10-21 S6 rules 28 (UI, JSON 2.1.0 giữ nguyên) | Registry mục tiêu (`apps/web/src/goals.ts`) đủ **bốn món bàn ghế** của làn Sức chứa: `table:` (nâng bàn), `buyTable`, **`chair:<bàn>` (ghế 2: +1 chỗ, giá `buyChairQuote`, khoá tới đủ `chairsAfterTables` bàn)** và **`chairLevel:<bàn>` (nâng ghế: kiên nhẫn ×1,15 / ×1,3, giá `chairUpgradeQuote`)**, mỗi món giá + hiệu ứng một con số + đúng một lý do; hai `Card` mới + hai case `renderCard`, luật chip không đổi — nên từ S6 chip có thể trỏ vào ghế 2 (sau đủ 4 bàn, rẻ hơn mọi bàn sau) và vào cấp ghế khi LP1 mở (test `next-goal.test.ts` đổi assertion có chủ ý: "levels and chairs are not its goals yet" → đi hết thang bàn, rồi ghế, rồi cấp ghế). HUD: **nút nhanh "Mua ghế bàn n · giá" không pause** (D10; cùng mẫu "Nhập bia nhanh"), chỉ hiện khi ghế 2 là mục tiêu kế tiếp và ví trả nổi. Thẻ bàn giữ nút ghế / nâng ghế nhưng mỗi nút là một khối `data-goal` của món đó (chip mở sheet đúng khối). Bằng chứng: `quick-chair.spec.ts` (vi/en × 3 viewport: một chạm mua một ghế, đồng hồ ca chạy tiếp, reload; không hiện khi thiếu xu), `next-goal.test.ts` (3 case S6), `goal-quotes.test.ts` giữ nguyên (một định nghĩa duy nhất cho mỗi quote trong `rules.ts`). |
| 2026-10-22 Wave 4 close-out (stage 07, JSON 2.1.0, rules 28) | Body brought to the chain's final state (plan §7 "F04/F10/F13/F25/F27, chỉ giữ bản mới nhất"): §3 lists the sealed 2.1.0 device ladders (keg 2,000 · 7,750 · 38,750 · 146,750, washer 1,500 · 6,250 · 29,500 · 97,750, cooler 1,250 · 4,500 · 22,500 · 73,250, stall 750 · 3,250 · 14,250 · 59,000, kitchen 4,500 · 19,500 · 78,500 · 195,500 base) instead of the 2.0.1 prices, states that a keg level buys reserve + refill under instant pour, and gives the table its four seat-model commands with the 2.1.0 prices (table 2 = 1,070 xu); §4 adds the rules-28 purchase rules (no empty table needed, the next group gets the change, one reason from the command's quote, the quick chair button); §5 the effects of keg and table under rules 28. Numbers checked against `docs/config/economy.tbh.json` and 08-SPEC §8; no rule or number changed. Open owner call that touches this feature: the goal chip steers to the four second chairs right after table 4 while the sealed gates were measured with a tables-first bot (HANDOFF vui3ca §12). |
| 2026-10-22 owner calls of PR #30 (stage 07b, JSON 2.1.1, rules 28) | Owner call 3 (the founder): the goal chip buys every table first — the `chairs` provider of `apps/web/src/goals.ts` is not eligible while `buyTableQuote` can still sell a table, so a chip follower buys the first second chair near shift 40 like the S5 protocol bot (inside the gate window 40-56; about 27 shifts later than plan §0's "ca ~12–14") and the HUD quick "Mua ghế" shows only once every place holds a table; the sheet still sells chairs from the fourth table on (price, effect, reason unchanged); a chair level at LP1 (30 000 xu) can still come before table 6 (32 250 xu). Body lines updated in place: the quick chair; "Numbers in force" names the bundled label 2.1.1 (the S5 numbers of 2.1.0, unchanged). `next-goal.test.ts`, `quick-chair.spec.ts`. |
