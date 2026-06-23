# 🎨 SPEC — Design / UI-UX / Asset — Trùm Bia Hơi

> **Khung (skeleton) — bắt đầu sản xuất ở Phase 1, KHÔNG dùng cho Phase 0** (Phase 0 placeholder, xem `04-SPEC-prototype-phase0.md`). Mục tiêu doc này: chuyển hóa phân tích game gốc (`uiux-analysis-trumviahe.md`, `design-component-catalog-trumviahe.md`) + định hướng đã chốt (`02-GDD-trum-bia-hoi.md` §17) thành **spec sản xuất**: design tokens, wireframe màn bia hơi, và **asset/icon list** đếm được. Bản production supplement để dev bắt đầu implement nằm ở `docs/features/F24-design-uiux-production.md`.
> Ngày: 2026-06-09. Nguồn sự thật vẫn là GDD. Nhãn: ✅ = đã chốt (từ GDD §17) · 🔧 = cần thiết kế/quyết khi tới Phase 1 · 📐 = cần wireframe/mockup.

---

## 0. Trạng thái doc

Đây là **khung định hướng + checklist sản xuất**, chưa phải design final. Mỗi mục dưới ghi rõ phần nào đã có (từ GDD/analysis) và phần nào còn 🔧/📐. Điền dần khi vào Phase 1.

---

## 1. Art direction ✅ (chốt ở GDD §17 — chỉ nhắc lại, không sửa ở đây)

- **Tinh thần:** pixel-art ấm, vỉa hè VN — bàn inox, ghế nhựa đỏ, bom bia, mồi Bắc Bộ, hẻm phố. Kế thừa "ấm áp, hoài niệm" của game gốc, đổi hue trà đá → bia hơi.
- **Biến thể bối cảnh:** khách có sprite ×thời tiết (hot/cold) như gốc (237 asset gốc có `customer-N`, `-hot`, `-cold`).
- **Cảnh nền minh hoạ tay** cho màn chuyển/nghỉ (không pixel) — tạo "không khí" giữa ca.

---

## 2. Design tokens

### 2.1 Màu ✅ — NGUỒN SỰ THẬT: `docs/design-tokens.md` v1.0
> ⚠️ **KHÔNG định nghĩa hex ở đây nữa.** Toàn bộ palette (brand/surface/chức năng/trạng thái gameplay/overlay thời tiết) đã thống nhất 1 nơi: **`docs/design-tokens.md`**. Mục này chỉ tóm tắt định hướng.
- **Vibe chốt:** 2000s bia hơi vỉa hè — **nền nắng gắt** (`streetBg`), **panel nâu ấm hoài niệm** (`panel`, đổi từ navy cũ), tông từng ca đổi theo thời tiết/tan tầm qua overlay (`docs/design-tokens.md` §4).
- **3 màu định danh:** vàng bia `beerAmber` · bọt `beerFoam` · đỏ ghế nhựa `stoolRed` (cũng là CTA). Inox lạnh làm nền.
- Bảng token UI đầy đủ + `tokens.ts` + palette AI-gen: xem `docs/design-tokens.md`. `asset-list-designer.md` §0.1 cũng trỏ về đó.

### 2.2 Typography ✅
- Body: **Be Vietnam Pro**. Nút/số: **Chakra Petch**. 🔧 chốt scale (size/line-height theo cấp heading/body/số HUD).

### 2.3 Spacing / shape ✅
- Bo góc **8 / 12 / 16px**; modal bottom-sheet bo `14px 14px 0 0`.
- Nút min-height **52px** (mobile chạm).
- 🔧 chốt thang spacing (4/8/12/16/24...) + grid.

---

## 3. Layout màn chính (HUD) 📐

Khung từ `uiux-analysis` §3 (mobile-first dọc) + GDD §17 (HUD 3 vùng). Cần vẽ lại bản bia hơi:

```
TOP    : 💰Xu · ⚡Thể lực•Ca x/5 · ⏱Giờ Vàng tới · 🌤Thời tiết(+hệ số) · 🍺Bom bia(độ hơi)
CENTER : sân quán — lưới BÀN (3 cột) + làn ĐỢI; khách ngồi (bubble món, ring patience,
         nhãn VIP/ngồi lỳ); thiết bị (bom+vòi rót · bồn rửa cốc · hầm lạnh); chủ quán + chó
RAIL   : kho NL · 🔔 · 🔇 · 🎯 nhiệm vụ x/5 · 🤖 AI · ⛩ Bàn Thờ Ông Địa
BOTTOM : ⭐uy tín · 🏆 · [CA] [NHẬP HÀNG] [NÂNG CẤP] [XẾP HẠNG]
```

📐 **Cần làm Phase 1:** wireframe từng màn — (1) HUD ca đang chạy · (2) modal Nhập hàng · (3) modal Nâng cấp · (4) màn Đóng cửa/sổ sách · (5) Xếp hạng. Bám layout gốc, đổi nội dung sang bia hơi.

---

## 4. Component & trạng thái 📐

Liệt kê component cần spec (variant + state), đối chiếu `uiux-analysis` (component gốc) + `03-SPEC-he-ban.md` (UI mức bàn):

| Component | Variant / State cần định nghĩa |
|---|---|
| Bàn (Table) | 4 cấp sprite · trạng thái: trống / có khách / chờ phục vụ / quá hạn (phạt cụm) / đang nhậu (`enjoying`) |
| Khách | 7 gameplay type × hot/cold · customer visual skins (runner/cầu lông/pickleball/hội chị em/bợm nhậu/say xỉn...) · ring patience · bubble món |
| Cốc bia | clean / in_use / dirty / washing · độ hơi: đầy bọt → xẹp → cờ vàng |
| Thiết bị | bom+vòi · bồn rửa · hầm lạnh · quầy · bếp — mỗi cái 5 cấp + progress bar |
| Nút CTA | primary (đỏ) / secondary / confirm · default/pressed/disabled/loading |
| Modal / bottom-sheet | header + body + footer · nút ✕ đóng · tip "lịch sử xoá khi đóng" |
| Pill tài nguyên (rail) | đủ / sắp hết (cảnh báo) / hết |
| Toast / cảnh báo | mất hơi · mất khách · phạt · thưởng |

🔧 Mỗi component: thêm anatomy + token áp dụng khi vào sản xuất.

---

## 5. Asset / Icon list 🔧 (checklist đếm được — trục chính của doc này)

Gom từ GDD §17 (sprite progression) + `design-component-catalog` §5. Đây là danh sách **cần vẽ**, chưa có asset:

**Sprite gameplay:**
- Bàn × 4 cấp.
- Thiết bị × 5 cấp: bom+vòi rót · bồn rửa cốc · hầm/tủ lạnh · quầy/kho · bếp.
- Cốc bia × trạng thái (đầy bọt / xẹp / cờ vàng / clean / dirty).
- Khách: 7 gameplay type × weather + customer visual skins ở `docs/asset-list-designer.md` §2.2.1 (runner, cầu lông, pickleball, văn phòng, công nhân, sinh viên, hội chị em, bợm nhậu, 3 kiểu say xỉn, nghỉ hưu, cyclist, tourist, foodie, football fan, shipper xe máy).
- Chủ quán; chó (idle / attack).
- Gangster 1/2/3/boss (Phase 3); TV World Cup (Phase 4).

**Icon HUD/hệ thống:** xu · thể lực · uy tín ⭐ · thời tiết (☀🔥🌧❄) · Giờ Vàng · nhiệm vụ 🎯 · AI 🤖 · Bàn Thờ Ông Địa ⛩ · chuông 🔔 · loa 🔇 · cúp 🏆 · nút CA/Nhập hàng/Nâng cấp/Xếp hạng.

**Món (icon menu):** bia · lạc · nem chua · đậu tẩm hành · tóp mỡ · lòng xào dưa.

**Nguyên liệu (icon kho):** bia thùng · lạc sống · nem chua gói · đậu sống · mỡ lợn · lòng+dưa chua · hành phi · đá lạnh (asset name/prompt focus ở `docs/item-list-upgrade-levels.md` §8).

**Cosmetic (Phase 3):** biển hiệu ×5 · lồng đèn ×4 · cây cảnh ×4.

**Nền/cảnh:** sân quán (theo cấp mặt bằng) · cảnh chuyển minh hoạ tay.

**Feature screens/components:** active HUD, order bubble, kitchen panel, rental/location screens, Đường Lên Trùm ladder, risk/inspection/gangster/dog panels, referral/badge/VIP lock, quest cards, AI assistant, login/session/payment/donation/lottery/World Cup/server-state components — checklist đầy đủ ở `docs/asset-list-designer.md` §8.3.

> ✅ Generation spec đã chốt tại `docs/asset-list-designer.md` v0.7: icon/item `128×128 PNG transparent`, sprite gameplay `128×128 base tile`, source từng PNG; spritesheet/.webp là bước pack sau.

---

## 6. Animation / motion 🔧

Từ GDD §17 + analysis: cốc bọt (đầy→xẹp→cờ vàng) · phục vụ = chạm + grace window · progress bar pipeline (rót/rửa, render canvas) · feedback thưởng/phạt. 🔧 chốt timing + easing khi có wireframe.

---

## 7. Microcopy ✅ (giọng đã chốt GDD §17)
"Dô đi anh!" · "Một hai ba… dô!" · "Bia Đấm" · "chốt mâm" · "Lấy em tờ vé lấy hên!". 🔧 viết full UX copy (nút, empty state, lỗi, onboarding) khi dựng màn.

---

## 8. Việc kế (khi mở Phase 1)
1. Chốt bảng token màu (re-hue 55 hex gốc → bia hơi) + type scale + spacing.
2. Vẽ 5 wireframe màn chính (§3).
3. Spec anatomy từng component (§4).
4. Dùng naming + size/export đã chốt trong `docs/asset-list-designer.md` v0.7, rồi sản xuất theo asset list (§5).

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|---|---|
| v0.1 | Khung đầu: art direction + tokens (từ GDD §17), layout HUD + component (từ `uiux-analysis`), **asset/icon list** đếm được (từ §17 + `design-component-catalog`), phân nhãn ✅/🔧/📐. Sản xuất bắt đầu Phase 1. |

*Nguồn: `02-GDD-trum-bia-hoi.md` §17, `uiux-analysis-trumviahe.md`, `design-component-catalog-trumviahe.md`.*
