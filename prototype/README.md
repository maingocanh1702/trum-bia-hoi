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

## Cách chơi (1 ca = 12 phút)

| Thao tác | Tác dụng |
|---|---|
| Mở ca | spawn nhóm 1–2 khách vào bàn trống (warmup ×1.6; sau đó **10.5s/khách** — nhóm N người tiêu thụ N nhịp, fix 2026-07-15) |
| Chạm **vòi/bom bia** | rót bia 3s cho đơn gấp nhất (cần cốc sạch) |
| Chạm **BÀN** | phục vụ cả đợt gọi khi mọi món ✅ (serve theo Order — 03 §4) |
| Chạm **bồn rửa** | rửa cốc bẩn (1 slot × 7s; nút nâng = 3 × 2.5s) |
| Cao điểm | spawn ×1.5 — đo nhịp tay rush |
| Auto rót/rửa | default BẬT — tắt để chơi tay full; bật từng cái để cô lập cơ chế khi đo feel |
| Sổ ca | bảng số theo 04 §5 + copy log JSON |

Bia rót xong có **12s hơi** (cờ vàng từ 9s). Giao cốc quá hạn: vẫn thu tiền, **tip ×0**. Order quá patience (18s thường / 11s vội·VIP): **cả nhóm bỏ đi**.

## Trạng thái đo (cập nhật 2026-09-08)

**Automated gate: ✅ PASS** — `npm run sim` chạy 5 seed cố định (20260611/1/2/3/42), mỗi seed ≥503 lượt:

| seed | k | normal loss | peak loss | gate |
|---|---|---|---|---|
| 20260611 | 2.27 | 0.0% | 40.8% | PASS |
| 1 | 2.34 | 0.0% | 26.1% | PASS |
| 2 | 2.27 | 0.0% | 39.3% | PASS |
| 3 | 2.28 | 0.0% | 40.0% | PASS |
| 42 | 2.24 | 0.0% | 39.2% | PASS |

- **k = 2.24–2.34**, nằm trong band 2.0–3.0. Kết quả này **tái lập độc lập ngày 2026-08-24** (chạy lại sim từ source, khớp từng chữ số) → số liệu đáng tin.
- Bối cảnh lịch sử: bản 2026-07-02 từng đo **k = 1.63** (dưới band) do demand-mix giả định `P_MOI = 0.6`. Đã chỉnh 🟡 trong `src/engine/constants.ts` (`P_MOI = 0.85`, `P_NEM_GIVEN_MOI = 0.65`, `P_SECOND_ROUND = 0.35`) + fix nhịp spawn theo khách → k về band. **Phương pháp đo KHÔNG đổi** (04 §5 bất biến: `k = mean(payment+tip) / 82.5`).
- ⚠️ **Peak loss 26–41% mới chỉ bị chặn bằng "regression ceiling" 57.6%**, không phải ngưỡng thiết kế. Ngưỡng feel thật do Alpha quyết.
- 🔴 **k chơi tay: CHƯA ĐO.** Bot chơi tối ưu nên `% cốc hết hơi = 0%` — chỉ hand-play mới đo được stale rate. Ghi kết quả vào `../RESEARCH-LOG-live-play.md` + phiếu `../docs/phase0-alpha-playtest.md`.

## ⛔ Gate đang chặn: Alpha playtest

Phase 0 **chỉ còn thiếu Alpha playtest feel** (3–5 người × ≥3 ca/người, cả normal lẫn peak). Phiếu bằng chứng có sẵn ở [`../docs/phase0-alpha-playtest.md`](../docs/phase0-alpha-playtest.md) — hiện còn trống, treo từ 2026-07-15. Trước buổi test nên biết:

- Các nút **Bia Đấm / Nhập hàng / Vụ Bia / chuông** hiện là UI shell (đổi thời tiết / mở ca), chưa nối logic — cân nhắc bỏ qua hoặc nói trước với tester để không nhiễu quan sát.
- Bảng **"Dồn cả phiên"** trong Sổ ca luôn hiện `0` khách bỏ đi (engine không giữ lost/rejected xuyên ca) → **đọc số mất khách theo TỪNG CA**, đừng đọc dòng aggregate.

## Gate sang Phase 1 (04 §6)

k ổn định 2.0–3.0 · mất hơi tạo "giãn nhịp rót" không phạt oan · bàn nhóm rõ không rối · cốc/rửa là bottleneck cảm được (nâng rửa thấy đỡ ngay) · peak dồn dập mà xử được.

## Ghi chú scope

Đúng 04 §2 NGOÀI ở tầng engine: không meta/uy tín dài hạn, không phạt xu khi khách bỏ (chỉ đếm), không Chí Phèo/ngồi lỳ, không grace window (03 §9 là Phase 1), không persist. Coins = doanh thu (chưa trừ vốn sỉ — không ảnh hưởng phép đo k).

Một số icon/rail hậu kỳ (Giải Nhậu, Vụ Bia, Nhập hàng) đã được dựng như UI shell/asset signal theo docs hiện tại, nhưng chưa nối logic server/meta để tránh làm lệch Phase 0.
