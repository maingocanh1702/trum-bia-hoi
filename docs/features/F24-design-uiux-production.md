# F24 — Thiết Kế UI/UX Quán Bia (Production Spec)

> Production supplement for `../../05-SPEC-design-uiux.md`. This file fills the pieces marked `TUNE`/wireframe/asset convention enough for implementation to start.

## Owner direction — 2026-09-09 (current designer brief)

> Portrait casual-management game UI with edge-anchored HUD, rounded skeuomorphic panels, chunky pill controls, bold rounded sans-serif typography, soft shadows, compact contextual actions, and Vietnamese street-game visual language.

This supersedes the earlier same-day wording "Portrait mobile casual-game HUD
with edge-anchored resource bars, contextual pop-up panels, chunky rounded buttons,
and bold rounded sans-serif typography." Treat the owner's supplied service
screenshots in `../reference/assets-owner-2026-09-08/` as visual references.

- Compose for portrait mobile: resource pills at the top, stock/status rail at the
  side and primary actions at the bottom; keep the center free for tables/guests.
- Rounded panels suggest painted metal/wood and raised controls through borders,
  soft shadows and a visible pressed state. Use chunky pill-shaped controls and
  compact contextual actions close to the selected table or equipment.
- Use a bold rounded sans-serif for HUD, values and actions, with clear Vietnamese
  diacritics and stable-width digits. Keep supporting text readable at mobile size.
- Preserve Hanoi sidewalk cues: blue/red plastic furniture, recycled green glass,
  inox equipment, warm food and illustrated street context. Keep labels/counters
  live in code; art must not bake game values or foreign branding into the UI.
- Serving stays one tap for the entire table. Departure feedback is only the
  actual numeric/icon coin and reputation loss. Motion respects reduced-motion;
  contextual surfaces and shadows must not obscure actionable objects.

Older typography/shape suggestions below are historical baselines where they
conflict with this brief; gameplay rules, config and 44px minimum targets remain.

## 1. Token baseline

> ⚠️ **NGUỒN SỰ THẬT = `../design-tokens.md` v1.0.** Không định nghĩa hex riêng ở đây. `colors`/`weatherTint`/`type`/`space` lấy nguyên từ `tokens.ts` trong file đó. Vibe chốt: nền nắng gắt + panel **nâu ấm** (đổi từ navy cũ) + overlay thời tiết/tan tầm.
>
> Tóm tắt nhanh (chi tiết + tokens.ts ở `../design-tokens.md`): `streetBg #f1d585` · `panel #3a2a1c` · `beerAmber #eaa31a` · `beerFoam #fff3d2` · `stoolRed #de4126` (CTA) · `coinGold #ffd15a` · `reputation #5bbf74` · `info #3f7fcf` · `warning #f4c23f` · `danger #d23a2a` · `success #3fa564` · `glassClean #c2e6f1` · `glassDirty #8a6b55` · `glassWashing #7ec8e3` · `glassStale #8f8579`.

Typography:

- Body: Be Vietnam Pro, 14/20 default.
- Numeric/HUD: Chakra Petch, 14/18 default.
- Button: Chakra Petch 15/18, min height 52px.
- Section headings in panels: 16/22, not hero-sized.

Spacing:

- Base scale: 4, 8, 12, 16, 24.
- Card radius: 8px.
- Bottom sheet radius: 14px 14px 0 0.
- Icon buttons: 44x44 minimum; gameplay hit areas >= table sprite bounds.

## 2. Core screens

### Active Shift HUD

- Top: coins, stamina/shift, weather, Giờ Vàng countdown, beer/cup status.
- Center: full playable restaurant canvas, 3-column table grid on mobile, queue lane edge.
- Bottom: primary actions `Ca`, `Nhập hàng`, `Nâng cấp`, `Xếp hạng`; during active shift prioritize serve/tables visually over bottom nav.

### Restock Sheet

- Non-pausing operational sheet.
- Rows show item icon, stock/cap, +10, Full.
- Thời tiết/Giờ Vàng warning if player opens near Giờ Vàng with low stock.

### Upgrade Sheet

- Cards show current stat -> next stat and price.
- Lock reason is visible.
- Recommended upgrade badge from bottleneck analytics.

### Closing Ledger

- First page: revenue, tip, lost customers, stale rate, k estimate.
- Detail expandable: menu mix, bottleneck, suggested next action.

### Xếp Hạng

- Tabs: Giải Nhậu, Dạo Phố.
- Empty tier state short and aspirational.

## 3. Component anatomy

- Table sprite states: empty, seating, awaiting, grace, consuming, paying, cleaning, occupied, broken.
- Customer overlay: special badge + small expression; avoid per-customer timer rings on large tables.
- Order bubble: beer count, food icons, readiness checkmarks.
- Glass rail: clean/dirty/washing counts with warning color under threshold.
- Toasts: one-line, stack max 3, auto-dismiss except critical.

## 4. Asset convention

File naming:

```txt
table-{level}-{state}.png
device-{kind}-lv{level}.png
customer-{type}-{weatherVariant}.png
dish-{dish}.png
glass-{state}.png
cosmetic-{kind}-{variant}.png
```

Recommended sprite sizes:

- Table: 160x120 source, scale down on mobile as needed.
- Customer: 64x96.
- Dish/icon: 64x64 source, legible at 24px.
- Device: 128x128.
- Cosmetic: 128x128 or mask-based for themes.

All gameplay icons must pass legibility at 24px, 40px, and 72px.

## 5. Motion

- Pour progress: linear 3s default.
- Wash progress: linear by washer level.
- Freshness: foam full -> lower foam at 75% -> warning at 25% remaining -> stale gray.
- Grace: table border red pulse, 2-3s.
- Floating reward: one grouped pill per Order, not per item/customer.

## 6. Accessibility/mobile

- Hit target >=44px and table hit target >= sprite bounds.
- No required hover.
- Text must fit in Vietnamese; buttons wrap or use shorter copy.
- Color is not sole signal: stale also changes icon/foam shape.

## 7. Acceptance

- Active shift screen works at 390x844 and 1280x720 without overlap.
- No UI card nested inside another card for main surfaces.
- All core actions reachable in one thumb zone on mobile.
- Gameplay warnings beat decorative colors in visual priority.

## Changelog (append-only)

| Date | Change |
|---|---|
| 2026-09-09 | Recorded the owner's two successive HUD descriptions; latest portrait casual-management/rounded skeuomorphic/pill-control direction is the current designer brief. |


## 8. Management menu pause — owner 2026-09-09

Opening stock, management or equipment dialogs freezes the yard and its gameplay
clocks. Successful stock purchases keep the same dialog open and paused until
closing; repeat purchases are supported. Display a compact localized pause pill
below the header. Modal controls and result feedback remain responsive; freeze
yard/stall animation. The close button, Escape and backdrop resume only when no
management dialog remains and the document is visible. Switching dialogs or
returning from a hidden tab must not briefly resume gameplay. Inline whole-table
service panels remain live. Explicit wait/stop-admission actions return to the yard
so customers can finish; the final shift report opens on actual completion.
Calendar check-in and available management actions remain usable during a pause.
Mobile stock actions occupy three equal columns below the item instead of clipping
the full-stock button. Retain the owner's portrait, rounded street-game language.

| 2026-09-09 | Owner-requested management pause with persistent stock menu, localized hint, frozen yard motion and mobile restock button fit. Previous live-menu behavior is superseded. |
| 2026-10-19 fun-buy-buttons-reason | The loss toast keeps its numeric coin/reputation values and adds ONE reason label (F07, PLAN P3); no motion added, reduced-motion unchanged. |
