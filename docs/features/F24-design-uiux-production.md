# F24 — Thiết Kế UI/UX Quán Bia (Production Spec)

> Production supplement for `../../05-SPEC-design-uiux.md`. This file fills the pieces marked `TUNE`/wireframe/asset convention enough for implementation to start.

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
