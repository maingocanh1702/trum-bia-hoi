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
- Sprite changes after each level (checklist A3–A7: the countable stat — taps/basins/burners — must read at 64 px).
- Reference flows (owner, 2026-09-08, not a contract): `docs/reference/trumviahe-sheet-upgrade-equipment.png` / `-business.png` (sheet with tabs, card grid, MAX/lock states, location row with Expired · Renew) and `docs/reference/trumviahe-popover-upgrade-inplace.png` (tap the equipment on the yard → anchored popover: current sprite → next sprite with stat under each, price button, no pause). Either entry point must lead to the same purchase command.

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
