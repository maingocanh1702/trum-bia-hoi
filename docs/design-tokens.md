# 🎨 DESIGN TOKENS — Trùm Bia Hơi (v1.0) — NGUỒN SỰ THẬT

> **Đây là nguồn sự thật DUY NHẤT cho màu / font / spacing.** Mọi file khác (`05-SPEC-design-uiux.md` §2, `docs/asset-list-designer.md` §0.1, `docs/features/F24-design-uiux-production.md` §1) **trỏ về file này**, KHÔNG định nghĩa hex riêng. Đổi token → đổi ở đây, rồi grep-verify.
> **Vibe chốt (2026-06-11):** quán bia hơi vỉa hè VN **thập niên 2000** ngoài đời thật — **nền mặc định nắng gắt** (sân sáng vàng nắng), panel **nâu ấm hoài niệm** (tường ố / gỗ cũ), tông từng ca **đổi theo thời tiết** (tan tầm, mưa phùn, oi bức…) qua lớp overlay §4.
> **KHÔNG đụng:** `design-component-catalog-trumviahe.md` & `uiux-analysis-trumviahe.md` (ghi màu **game gốc trà đá** — tư liệu, giữ nguyên); `prototype/src/index.css` (placeholder Phase 0, 04 §2).
> Nguồn: GDD v1.5 §17. Ngày: 2026-06-11.

---

## 1. Triết lý màu (2000s bia hơi đời thật)

- **Ấm, hơi ngả nắng, hoài niệm** — không neon bão hoà kiểu app hiện đại. Như ảnh chụp film cũ buổi trưa/chiều.
- **3 màu "định danh" phải luôn nhận ra ngay:** vàng bia rót (amber) · bọt trắng kem · **đỏ ghế nhựa** (vermilion — biểu tượng bia hơi vỉa hè).
- **Thép inox** (bàn, bom, ấm) = mảng lạnh trung tính làm nền cho 3 màu ấm nổi lên.
- **Panel/modal = nâu gỗ/tường ố** (thay navy-tím lạnh ở spec cũ) → ăn nhập không gian quán.
- **Màu không bao giờ là tín hiệu DUY NHẤT** (a11y): trạng thái còn phân biệt bằng hình/biểu tượng (vd cốc hết hơi đổi cả màu lẫn hình bọt).

---

## 2. Core palette (semantic)

### 2.1 Định danh / brand
| Token | Hex | Vai trò |
|---|---|---|
| `beerAmber` | `#eaa31a` | Vàng bia hơi rót — màu lõi |
| `beerAmberDeep` | `#c07a12` | Bóng/đậm của bia (shading) |
| `beerAmberLight` | `#ffc24d` | Highlight bọt/ánh sáng trên bia |
| `beerFoam` | `#fff3d2` | Bọt bia trắng kem |
| `stoolRed` | `#de4126` | Đỏ ghế nhựa — accent biểu tượng **+ CTA primary** |
| `stoolRedDeep` | `#b32f1a` | CTA pressed / bóng ghế |
| `inox` | `#c4cecb` | Thép inox highlight (bàn/bom/ấm) |
| `inoxMid` | `#97a3a0` | Inox trung |
| `inoxDark` | `#69736f` | Inox bóng tối |

### 2.2 Bề mặt (nền nắng + panel nâu ấm)
| Token | Hex | Vai trò |
|---|---|---|
| `streetBg` | `#f1d585` | Nền sân quán — nắng vàng (mặc định) |
| `streetBgShade` | `#e0bd6c` | Vùng bóng trên nền sân |
| `panel` | `#3a2a1c` | Nền panel/modal — nâu gỗ/tường ố |
| `panelDeep` | `#241810` | Đáy panel / nền tối nhất |
| `panelRaised` | `#4c3826` | Card nổi trên panel |
| `panelBorder` | `#5d452f` | Viền panel/card |
| `ink` | `#2a1d12` | Chữ tối trên nền sáng (street) |
| `cream` | `#fbeedc` | Chữ sáng trên panel nâu |
| `creamMuted` | `#cab39b` | Chữ phụ/mờ trên panel |

### 2.3 Chức năng / trạng thái
| Token | Hex | Vai trò |
|---|---|---|
| `success` | `#3fa564` | Xác nhận / thành công (xanh hơi đất) |
| `reputation` | `#5bbf74` | Uy tín ⭐ (kèm hình sao để phân biệt) |
| `coinGold` | `#ffd15a` | Xu 💰 |
| `warning` | `#f4c23f` | Cảnh báo / cờ vàng |
| `danger` | `#d23a2a` | Lỗi / mất khách / phạt (đậm & lạnh hơn `stoolRed`) |
| `info` | `#3f7fcf` | Thông tin / QR chuyển khoản |

> `danger` (#d23a2a) cố tình khác `stoolRed` (#de4126): đỏ-phạt đậm/lạnh hơn đỏ-ghế-CTA, tránh nhầm "nút bấm được" với "cảnh báo".

---

## 3. Trạng thái gameplay — vòng đời cốc & đồng hồ áp lực

| Token | Hex | Trạng thái |
|---|---|---|
| `glassClean` | `#c2e6f1` | Cốc sạch (xanh băng — khác hẳn bia) |
| `glassBeer` | `#eaa31a` | Cốc có bia tươi (= `beerAmber`) |
| `glassWarn` | `#f4c23f` | Cờ vàng — sắp mất hơi (= `warning`) |
| `glassStale` | `#8f8579` | Hết hơi (xám nâu xỉn) |
| `glassDirty` | `#8a6b55` | Cốc bẩn cần rửa (nâu đục) |
| `glassWashing` | `#7ec8e3` | Đang rửa (xanh xà phòng) |

**Thanh patience khách:** nội suy `success #3fa564` → `warning #f4c23f` → `danger #d23a2a` theo % kiên nhẫn còn lại.
**Thanh freshness cốc:** bọt `beerFoam` đầy → vơi ở 75% → `glassWarn` ở 25% còn lại → `glassStale`.

---

## 4. Overlay thời tiết / thời điểm (tông từng ca)

Nền sân **KHÔNG vẽ nhiều bản** — dùng **1 nền `streetBg` + 1 lớp overlay tint** (Pixi `ColorMatrixFilter` hoặc sprite bán trong suốt) phủ lên. Đây là cơ chế tạo "tông khác nhau mỗi ca" theo thời tiết (GDD §9) + thời điểm tan tầm.

| Token | Hex | Alpha | Tông / ca |
|---|---|---|---|
| `wxSunny` | `#fff0c2` | 0.10 | Nắng (mặc định) — ấm nhẹ |
| `wxHot` | `#ff8a2c` | 0.22 | Nóng — vàng cam gắt, hơi bốc |
| `wxHumid` | `#a6bda9` | 0.24 | Oi bức — xanh xám ẩm |
| `wxRain` | `#54678a` | 0.34 | Mưa phùn — tối, lạnh ẩm |
| `wxCold` | `#bcd2e0` | 0.22 | Lạnh — xanh sương |
| `wxEvening` | `#e6712a` | 0.30 | **Tan tầm / chiều tối** — hoàng hôn + đèn sợi đốt vàng |

> `wxEvening` là tông "giờ vàng tan tầm" — phủ lên là cả quán chuyển sắc hoàng hôn ấm, đúng cảm giác bia hơi 6-7h tối.

---

## 5. Typography
- **Body:** Be Vietnam Pro — 14/20 mặc định.
- **Số / HUD:** Chakra Petch — 14/18 mặc định.
- **Nút (button):** Chakra Petch 15/18, **min-height 52px**.
- **Tiêu đề panel:** 16/22 (không to kiểu hero).
- Tiếng Việt phải vừa nút (dấu mũ/dấu nặng) → nút wrap hoặc dùng copy ngắn.

## 6. Spacing / shape
- Thang spacing: **4 / 8 / 12 / 16 / 24**.
- Bo góc card: **8px**. Bottom-sheet: **14px 14px 0 0**.
- Icon button: tối thiểu **44×44**. Hit area gameplay ≥ kích thước sprite (bàn).

---

## 7. tokens.ts (dùng trực tiếp khi code — Pixi/React)

```ts
// NGUỒN SỰ THẬT: docs/design-tokens.md v1.0. KHÔNG hardcode hex nơi khác.
export const colors = {
  // brand
  beerAmber: '#eaa31a', beerAmberDeep: '#c07a12', beerAmberLight: '#ffc24d', beerFoam: '#fff3d2',
  stoolRed: '#de4126', stoolRedDeep: '#b32f1a',
  inox: '#c4cecb', inoxMid: '#97a3a0', inoxDark: '#69736f',
  // surface
  streetBg: '#f1d585', streetBgShade: '#e0bd6c',
  panel: '#3a2a1c', panelDeep: '#241810', panelRaised: '#4c3826', panelBorder: '#5d452f',
  ink: '#2a1d12', cream: '#fbeedc', creamMuted: '#cab39b',
  // functional
  success: '#3fa564', reputation: '#5bbf74', coinGold: '#ffd15a',
  warning: '#f4c23f', danger: '#d23a2a', info: '#3f7fcf',
  // gameplay state
  glassClean: '#c2e6f1', glassBeer: '#eaa31a', glassWarn: '#f4c23f',
  glassStale: '#8f8579', glassDirty: '#8a6b55', glassWashing: '#7ec8e3',
} as const

export const weatherTint = {
  sunny:   { color: '#fff0c2', alpha: 0.10 },
  hot:     { color: '#ff8a2c', alpha: 0.22 },
  humid:   { color: '#a6bda9', alpha: 0.24 },
  rain:    { color: '#54678a', alpha: 0.34 },
  cold:    { color: '#bcd2e0', alpha: 0.22 },
  evening: { color: '#e6712a', alpha: 0.30 },
} as const

export const type = {
  body:   { font: "'Be Vietnam Pro', sans-serif", size: 14, line: 20 },
  hud:    { font: "'Chakra Petch', sans-serif", size: 14, line: 18 },
  button: { font: "'Chakra Petch', sans-serif", size: 15, line: 18, minHeight: 52 },
  panelHeading: { size: 16, line: 22 },
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const
export const radius = { card: 8, sheet: 14 } as const
export const hit = { iconBtn: 44 } as const
```

---

## 8. AI generation — palette cố định (cho `asset-list-designer.md`)

Khi gen asset bằng AI, dùng **đúng hex §2** trong prompt. Ngoài ra:
- **Outline:** viền ngoài 2px nâu tím đậm `#3a2730`; chi tiết trong 1px khi cần.
- **Shadow:** bóng đổ mềm `#2a1824` alpha ~0.2 (`#2a182433`), nằm dưới vật, không vẽ nền/card.
- Câu palette cho prompt: `warm amber beer #eaa31a, cream foam #fff3d2, red plastic stool #de4126, cool inox #c4cecb, sun-warmed sandy ground #f1d585, aged brown wood panel #3a2a1c; 2000s Vietnamese street nostalgia, slightly faded, not neon`.

---

## 9. Mapping cũ → mới (đã reconcile 3 nguồn)

| Nguồn cũ | Hex cũ | → Token mới |
|---|---|---|
| 05 §2.1 amber | `#f6a623` | `beerAmber #eaa31a` |
| F24 §1 beerAmber | `#f2a51a` | `beerAmber #eaa31a` |
| 05 bọt / F24 beerFoam | `#fff4d6` / `#fff5d6` | `beerFoam #fff3d2` |
| 05 CTA đỏ ghế | `#e94545` | `stoolRed #de4126` |
| F24 stoolRed | `#df3f32` | `stoolRed #de4126` |
| 05/catalog panel navy / F24 bgPanel | `#1e1e3f` / `#1e2438` | `panel #3a2a1c` (đổi sang **nâu ấm**) |
| F24 bgStreet | `#f6d98f` | `streetBg #f1d585` |
| F24 reputation | `#7bd88f` | `reputation #5bbf74` |
| F24 coinGold | `#ffd15a` | giữ `coinGold #ffd15a` |

> Cốc (`glass*`), `warning`, `info`, `success` đã bám sát F24 nên gần như giữ, chỉ tinh chỉnh nhẹ cho khớp tông ấm.

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|---|---|
| v1.0 | Bản đầu — nguồn sự thật token. Reconcile 3 nguồn lệch (05 §2.1 · asset-list §0.1 · F24 §1). Chốt vibe 2000s bia hơi: nền nắng gắt + panel nâu ấm (đổi từ navy); thêm bộ overlay thời tiết/tan tầm §4; tokens.ts + palette AI-gen + bảng mapping cũ→mới. |

*Nguồn: GDD v1.5 §17; reconcile từ `05-SPEC-design-uiux.md`, `docs/asset-list-designer.md`, `docs/features/F24-design-uiux-production.md`.*
