# 🧪 Prototype Phase 0 — Trùm Bia Hơi

Client-only, theo `../04-SPEC-prototype-phase0.md`. Mục tiêu core vẫn là **đo k_value thật + cảm 5 thứ** (mất hơi, bàn nhóm, nhịp 2 rush, bottleneck cốc, tip/patience).

Bản hiện tại đã có **vertical slice UI/asset bằng code** theo docs mới nhất: token từ `docs/design-tokens.md`, HUD/mobile shell theo `05-SPEC-design-uiux.md`, và asset Pixi tự vẽ theo `docs/asset-list-designer.md` (bàn inox, ghế nhựa đỏ, bom bia, bồn rửa, cốc bia hơi không quai, khách thường/vội/VIP, owner, nền quán 2000s). Engine đo k không đổi.

**Stack (đã chốt 2026-06-11):** Vite + React + Pixi.js v8 — đúng đích GDD. Engine thuần TS (`src/engine/`) không phụ thuộc DOM → chạy được cả UI lẫn headless sim.

## Chạy

```bash
npm install
npm run dev      # chơi tay — nguồn đo k chính thức
npm run sim      # headless bot ≥500 lượt — verify pipeline đo k
npm run build    # tsc + vite build
```

## Cách chơi (1 ca = 120s)

| Thao tác | Tác dụng |
|---|---|
| Mở ca | spawn nhóm 1–2 khách vào bàn trống (warmup ×1.6, sau đó 10.5s/nhóm) |
| Chạm **vòi/bom bia** | rót bia 3s cho đơn gấp nhất (cần cốc sạch) |
| Chạm **BÀN** | phục vụ cả đợt gọi khi mọi món ✅ (serve theo Order — 03 §4) |
| Chạm **bồn rửa** | rửa cốc bẩn (1 slot × 7s; nút nâng = 3 × 2.5s) |
| Cao điểm | spawn ×1.5 — đo nhịp tay rush |
| Auto rót/rửa | default BẬT — tắt để chơi tay full; bật từng cái để cô lập cơ chế khi đo feel |
| Sổ ca | bảng số theo 04 §5 + copy log JSON |

Bia rót xong có **12s hơi** (cờ vàng từ 9s). Giao cốc quá hạn: vẫn thu tiền, **tip ×0**. Order quá patience (18s thường / 11s vội·VIP): **cả nhóm bỏ đi**.

## Trạng thái đo (cập nhật khi chơi)

- Sim bot tối ưu (506 lượt, seed 20260611): **k = 1.63** — DƯỚI band 2.0–3.0.
  - Nguyên nhân khả dĩ: demand-mix 🟡 tự giả định (`P_MOI=0.6`, nem 40%) vì spec chưa có số này — trần giá trị/lượt hiện ~134 xu < 207 xu giả định.
  - Hướng chỉnh (đều 🟡 trong `src/engine/constants.ts`): tăng `P_MOI`/tỉ lệ nem, thêm đợt gọi (`P_SECOND_ROUND`), hoặc đối chiếu lại demand-mix với `economy-spec-from-bundle.md` §3.
  - **KHÔNG** chỉnh phương pháp đo (04 §5 bất biến): `k = mean(payment+tip) / 82.5`.
- k chơi tay: **chưa đo** — cần nhiều ca thật, ghi vào `../RESEARCH-LOG-live-play.md`.

## Gate sang Phase 1 (04 §6)

k ổn định 2.0–3.0 · mất hơi tạo "giãn nhịp rót" không phạt oan · bàn nhóm rõ không rối · cốc/rửa là bottleneck cảm được (nâng rửa thấy đỡ ngay) · peak dồn dập mà xử được.

## Ghi chú scope

Đúng 04 §2 NGOÀI ở tầng engine: không meta/uy tín dài hạn, không phạt xu khi khách bỏ (chỉ đếm), không Chí Phèo/ngồi lỳ, không grace window (03 §9 là Phase 1), không persist. Coins = doanh thu (chưa trừ vốn sỉ — không ảnh hưởng phép đo k).

Một số icon/rail hậu kỳ (Giải Nhậu, Vụ Bia, Nhập hàng) đã được dựng như UI shell/asset signal theo docs hiện tại, nhưng chưa nối logic server/meta để tránh làm lệch Phase 0.
