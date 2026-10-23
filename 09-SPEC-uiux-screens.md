# 🖥️ SPEC — UI/UX màn hình & tương tác — Trùm Bia Hơi (v1.1)

> ⚠️ **THAM KHẢO, KHÔNG RÀNG BUỘC (chốt founder 09/09).** Dev **tự quyết layout, màn hình, điều hướng, thao tác, motion** của game. Doc này mô tả *một* phương án chạy được — dùng khi muốn tham chiếu, không phải hợp đồng. Ràng buộc thật chỉ còn: luật chơi (`02-GDD` + `03-SPEC`), số (`08-SPEC` + `economy.tbh.json`), không-hardcode (`trum-bia-hoi-brd-admin.md` §5.2), bất biến đo k (`04-SPEC` §5), server-authoritative + engine thuần (`10-SPEC` §7/§1).
>
> **Tương ứng với `uiux-analysis-trumviahe.md`** (phân tích game gốc) nhưng là **spec sản xuất** cho Trùm Bia Hơi: IA, từng màn (wireframe, component, state, dữ liệu, luồng), motion, âm thanh, microcopy, a11y, checklist nghiệm thu. Điền phần 📐/🔧 mà `05-SPEC-design-uiux.md` để trống. Token/màu: `docs/design-tokens.md` (nguồn duy nhất). Asset: `docs/asset-list-designer.md`.
> **Layout tham khảo ưu tiên (chủ dự án 08/09):** `docs/reference/` (README mục lục 8 ảnh; ảnh chính `trumviahe-hud-layout-2026-09-08.png`) — sân quán **không gian** như game gốc (quầy/thiết bị tâm trên, bàn rải trên nền, khách ngồi thật, bong bóng tại chỗ, rail kho phải, 4 nút đáy). Wireframe §3.1 dưới đây là **card-list của prototype** — chỉ để tham chiếu component/state, không phải hướng ưu tiên. Những gì vẫn bắt buộc dù layout nào: `00-HANDOFF` §6 "UI invariants".
> Ngày: 2026-09-08. Nguồn: GDD v1.7 §17, 03-SPEC §9.5–§9.6, 05-SPEC, F24, F07–F26 (§UI), uiux-analysis §14/§18/§21–§23/§25–§27/§36, prototype hiện có (`prototype/src/ui/`). Nhãn: ✅ đã có trong prototype · P1/P2/P3/P4 = **thứ tự code** (không phải cổng scope — 00-HANDOFF §4) · 🟡 chốt khi playtest.

---

## 1. Nguyên tắc UX (từ gốc, áp cho bia hơi)

1. **Đơn vị chính là BÀN, không phải khách lẻ** — mọi cảnh báo, timer, hit area, floating indicator ở mức bàn (03 §9.5). Khách lẻ chỉ đổi nét mặt/badge.
2. **HUD cố định cho thông tin sống còn; bottom-sheet cho vận hành lặp lại; modal cho meta; dialog có hạn cho sự kiện** (uiux §22). Sheet **không pause** — quán vẫn chạy phía sau (quyết định vận hành, F08 §6).
3. **Phục vụ = 1 chạm** vào popover/bàn khi đủ món; **rót/rửa tự động** (GDD §4; chốt 08/09/2026) — người chơi chỉ quyết *khi nào bưng* và *nâng cấp gì*.
4. **Thất bại tường minh, phân biệt mềm/cứng**: trễ (mất tip, viền vàng) ≠ mất cụm (viền đỏ, −xu, popover "KHÁCH BỎ ĐI") — dạy "phục vụ sớm = tiền boa" (03 §9.6).
5. **Telegraph trước áp lực**: Giờ Vàng báo 20s, thời tiết báo trước ca, sự kiện phạt nặng không chồng nhau.
6. **Icon + nhãn chữ song hành**, emoji cho cảm xúc; tiếng Việt có dấu ở mọi chữ người chơi đọc (canvas dùng Be Vietnam Pro).
7. **3 vòng UX**: Operate (ca) · Learn (sổ ca, tip "Bạn có biết", Bia Đấm) · Belong (Xếp hạng, Dạo Phố, Bàn Thờ Ông Địa, trang trí).
8. **Không dark pattern, không paywall**: game free hoàn toàn (08/09); donation là ủng hộ tự nguyện, nói rõ "không bán xu/sức mạnh/quyền chơi".

---

## 2. Information architecture

```
[Cổng ca] → [HUD ca đang chạy] ⇄ sheets: Nhập hàng · Nâng cấp · Sổ ca   (không còn màn Landing/ngôn ngữ từ 15/10)
                                     ↓ hết thể lực / Đóng ca
                              [Đóng cửa + Sổ sách] → [Xả Hơi (nghỉ)] → [Cổng ca]
meta (modal, mọi lúc trừ khi dialog sự kiện): Nhiệm vụ · Xếp hạng/Dạo Phố · Bàn Thờ Ông Địa · Hồ sơ/Huy hiệu · Cài đặt/Tài khoản · Bia Đấm · Shop Vụ Bia (P4) · Vé số (P4) · Mời Bia Hơi (P4)
sự kiện (dialog có hạn): Giờ Vàng telegraph · Côn đồ · Kiểm tra · Đại gia lộ diện · Trộm offline · Kết Vụ · Trận đấu (P4)
```

Tầng thông tin (uiux §23): (1) sống còn trong ca → (2) vận hành → (3) meta → (4) trợ giúp → (5) sự kiện. Khi mở sheet, nền quán vẫn thấy phía sau (không tách khỏi ngữ cảnh).

---

## 3. Màn chính — HUD ca (P0 ✅ → P1 hoàn thiện)

### 3.1 Wireframe (mobile dọc 390×844; canvas 600×720 fit width; desktop 1280×720 canvas giữa, HUD hai bên)
```
┌─────────────────────────────────────────────────────────┐
│ TOP  [💰 294.031] [⚡ 11:02 · 0/5] [⏱ NHẸ 03:34] [🌤 Nắng] [🍺 9/10] │  ← pill, 1 hàng, cuộn ngang nếu thiếu chỗ
├─────────────────────────────────────────────────────────┤
│  lane: "Nắng / Nhịp thường"  ▓▓▓ áp lực bàn  ▓▓ cốc      │
│  HÀNG ĐỢI  (●●) (●)                                      │
│  ┌ BÀN 1 ──── đợt 1/2 đang gọi ─── [patience ▓▓▓░] ┐   │
│  │ 👤     ┌ VIP · nhóm 2 · đợt 1/2        8s ┐    👤 │   │
│  │        │ Boa ×10 — nhưng nhanh dỗi…          │       │   │  ← POPOVER Order (03 §9.5)
│  │        │ 🍺 Bia hơi ×2      sẵn sàng ●       │       │   │
│  │        │ 🍢 Nem chua        sẵn sàng ●       │       │   │
│  │        │ [ ✅  PHỤC VỤ ]                     │       │   │
│  └────────┴──────────────────────────────────┴───────┘   │
│  ┌ BÀN 2 ─ trống ── "chờ nhóm mới" ─┐  ┌ Bom bia tự động ┐ │
│  └───────────────────────────────────┘  │ ▓▓▓░ đang rót   │ │
│  ┌ BÀN 3 ─ đang lai rai ─ "DANG NHAP LY"┐ ├ Bồn rửa tự động ┤ │
│  └───────────────────────────────────┘  │ 1 slot × 7s ▓░  │ │
│                                         ├ Giá cốc 9/10   ┤ │
│                                         │ 🍺🍺🍺🍺🍺 … │ │
│                                         └ chủ quán + chó ┘ │
├─────────────────────────────────────────────────────────┤
│ ops: [Bàn 1/3 · đợi 0] [Vòng cốc 1 dùng · 0 bẩn] [Mất khách 0] │
│ log 6 dòng gần nhất (mờ dần)                             │
├─────────────────────────────────────────────────────────┤
│ RAIL/BOT  [🔔] [🔇] [🎯 2/5] | [CA] [NHẬP HÀNG] [NÂNG CẤP] [SỔ CA] │
└─────────────────────────────────────────────────────────┘
```
- P1: tối đa 6 bàn → lưới 2 cột × 3 hàng (card 280×140) hoặc giữ 1 cột cuộn dọc 🟡 (playtest quyết). Cụm thiết bị chuyển xuống dưới lưới bàn khi 2 cột.
- **2026-10-23 — founder 22/10/2026 (Part B2.8) chốt câu "playtest quyết" ở dòng trên: MỘT MÀN, không cuộn.** Sân hiện 8 chỗ đặt bàn thành **4 cột × 2 hàng ở mọi màn**; vùng sân là container theo chiều cao còn lại giữa HUD và thanh dưới, bàn được thu nhỏ vừa chỗ (hình vẽ bàn tính theo `cqw` của chính bàn), không bao giờ dưới 44 px (vùng chạm); dải chừa trên mỗi hàng cho bong bóng gọi món giữ nguyên px (56 px trên hàng 1, 49 px giữa hai hàng, 51 px cho chú thích), nên bong bóng không che chú thích hay hình của bàn khác. Màn thấp (≤ 900 px) gọn hơn: hàng HUD, quầy 168 px (chủ quán thu 0,84, thiết bị xếp lại; quầy có biển hiệu / bếp / điện thoại–QR / chó giữ quán giữ cách xếp 200 px cũ), dải cửa 38 px, thanh dưới 48 px; dòng nghỉ giữa ca ("Ca kế mở ngay…" + Sổ ca) nằm trong dải trên cùng của sân (lúc nghỉ không có hàng chờ hay bong bóng). Đo `document.documentElement.scrollHeight` (trước → sau, save mới): 390×844 1 262 → **844**, 360×740 1 226 → **740**, 1280×720 1 049 → **720** (ca đang chạy, sân đủ 8 bàn lúc nghỉ: cũng bằng đúng chiều cao màn; 8/8 chỗ trên màn); khi nút nhập bia nhanh hiện (sân đông, hết bia) 390×844 844, 360×740 762, 1280×720 751 — trang cuộn vài px nhưng 8 bàn vẫn trọn trên màn; báo cáo thêm 390×664 (Safari có thanh công cụ) 1 226 → 699–710 (hàng 2 lấn dưới thanh dưới) và 420×680 1 226 → 699–710 (8/8 chỗ trên màn). Điện thoại xoay ngang 844×390: thanh dưới dính đáy (gọn, nút 44 px) nên nút "Mở ca" duy nhất tới được không cần cuộn (review A-r1 F1), dải kho thành một hàng trong dòng chảy để không nằm dưới thanh dưới. Số đo: `autopilot-logs/b2-measure/{before,after}/measure.jsonl` của worktree B2.
- Desktop: canvas 600×720 giữa, pill top thành 1 hàng, sheet thành panel phải 360px.

### 3.2 Component & state trên sân
| Component | State | Visual (token) | Hit | Asset |
|---|---|---|---|---|
| **Card bàn** | `empty` · `awaiting_serve` (order pending) · `grace` (P1) · `enjoying` · `paying/cleaning` (anim ngắn, P1) · `occupied` (Chí Phèo, P2) · `broken` (P3) | viền `panelBorder` → patience `success`>60% / `warning`>30% / `danger` ≤30%; pulse khi allReady; `info` khi enjoying | **cả card** (≥ sprite) → serve; đang cờ mất → đóng cờ + serve | `table-lv{n}-{state}` (prop-only; viền do code) |
| **Popover Order** ✅ | pending · allReady · (grace) | box `panelDeep` viền theo patience; badge loại (VIP `coinGold`/ink · vội `stoolRed` · thường `success` · Chí Phèo nâu · ngồi lỳ `reputation` · shipper `info`); countdown 18px màu viền; subtitle 9.5px `creamMuted`; dòng món: icon 0.38 + tên (MENU.label) + trạng thái (chờ rót `panelBorder` / đang rót `info` / sẵn sàng `success` / sắp mất hơi `warning` / HẾT HƠI `glassStale`); nút `stoolRed` 22px "PHỤC VỤ" + tick xanh; chưa đủ: `panelRaised` "đang chuẩn bị món…"; khối **Mời về** (Đợt 3, `.kick-table`, dưới đơn): bàn có khách, từ khi HUD mở (sau ca 1 tới 21/10/2026; **từ ca 1 kể từ 22/10/2026 — founder override, JSON 2.1.2: HUD mở từ ca 1**; **lại từ ca 2 kể từ JSON 2.1.3 — founder 22/10/2026: ngưỡng riêng `featureReveal.kickAfterShifts` 1, AND với HUD**) và chỉ khi ca đang mở — dòng giá "n xu · −m uy tín" + nút phụ "Mời về" (một chạm, ≥ 44 px), mờ với đúng một lý do ("Khách chưa dùng món xong" hoặc "Chưa đủ xu") | trong card | code + `badge-*`, `menu-*`, `kick-table` |
| **Cờ mất nhóm** ✅ | bàn trống → popover đỏ 62px "KHÁCH BỎ ĐI / chờ quá lâu · chạm để đóng"; bàn đã có nhóm mới → banner 22px hàng tiêu đề | `danger` + `stoolRedDeep` | 1 chạm đóng (và vẫn thử serve) | code |
| Ghế + khách | trống / ngồi / cảnh báo (patience <25%: vòng đỏ + ghế đỏ) | `stoolRed`, avatar theo type × thời tiết | — | `chair-plastic*`, `customer-{type}-{wx}`, `face-*` |
| Hàng đợi | token nhóm (số người), `urgent` khi >60% patience | `panel` / `danger` | — | `queue-token` (code) |
| Bom bia | idle / pouring (progress `beerAmber`) | | ✅ không hit (auto) | `keg-lv{n}[-pouring]` |
| Bồn rửa | idle / mỗi slot progress `info` | viền `warning` khi có cốc bẩn | không hit | `washer-lv{n}[-washing]` |
| Giá cốc | 10 cốc: clean/in_use(+thanh freshness)/dirty/washing; freshness `beerFoam`→`glassWarn`→`glassStale` | | — | `glass-*` |
| Hầm lạnh (P1) | cấp + chip "12s" | | — | `cooler-lv{n}` |
| Bếp (P2) | slot × job progress; cảnh báo "xong sau khi khách hết kiên nhẫn" | `warning` | chạm mở panel bếp | `kitchen-lv{n}[-cooking]` |
| Chủ quán + chó | idle bob; chó idle/attack/captured (P3) | | — | `stall-owner-{wx}`, `dog-*` |
| Floating pill | `+n xu` (`coinGold`) · `+boa n` · `−n xu` (`danger`) · `🚨 Mất khách sộp!` | 1 pill/Order, 1.2s bay lên | — | code |
| Overlay thời tiết | tint theo `docs/design-tokens.md` §4 + particle mưa/gió (P2) | | — | code (Pixi filter/particles) |

- **2026-10-23 (founder 22/10/2026, Part B2.3 — nhãn và chỗ trùng, bổ sung bảng trên):** huy hiệu Hầm lạnh ghi "Giữ tươi {n} s" (key `production.freshness`; ca 1 của save mới: "Giữ tươi ∞") thay cho số trần "12 s"; huy hiệu Bồn rửa ghi "Rửa {đang rửa}/{mẻ}" (`production.washShort`) thay cho "0/1"; dòng "Bia: n cốc sẵn · bom n/15 · cốc sạch n/10" (`beer.pipeline`) lặp đúng các số đã có trên sân (huy hiệu Vòi rót, dải kho, đếm cốc) nên chỉ còn cho trình đọc màn hình (`sr-only`, vẫn là mô tả của nút nhập bia nhanh); Popover Order thêm **một dòng tính cách** dưới tên loại khách (`customer.trait.<type>`: Dân nhậu "Kiên nhẫn vừa", Khách vội "Ít kiên nhẫn · về nhanh", Khách sộp "Boa đậm, dễ giận", Bàn lai rai "Ngồi lâu · gọi nhiều đợt", Khách quậy "Không trả tiền · ngồi dai"; chữ theo hệ số `customerTypes` của JSON 2.1.4, đổi hệ số thì xem lại chữ).

### 3.3 Pill top & rail
| Pill | Dữ liệu | State | Chạm |
|---|---|---|---|
| 💰 Xu | `coins` (định dạng 1.234) | +anim khi tăng | mở Thông tin nhanh (Xu/Uy tín) P2 |
| ⚡ Thể lực · ca | `stamina%` mm:ss · `dailyShiftsCompleted/cap` | `warning` <60s; "Hết giới hạn ngày" | mở bảng thể lực |
| ⏱ Giờ Vàng | `nextRushType` + ETA mm:ss; khi active: "NHẸ 01:12" + viền HUD | shake 20s trước, pulse khi active (nặng mạnh hơn) | — |
| 🌤 Thời tiết | label + 1 dòng tác động | shimmer khi humid | popup chi tiết hệ số |
| 🍺 Cốc | `clean/total` | `warning` ≤2 | — |
| ⭐ Uy tín (bottom-left, P1) | `reputation` (+Δ ca) | | Thông tin nhanh |
| Rail kho (P1) | pill mỗi nguyên liệu `stock/cap` | đủ / sắp hết (<20%) `warning` / hết `danger` | mở Nhập hàng |
| 🔔 🔇 🎯 🤖 ⛩ | thông báo · âm · nhiệm vụ x/5 (P2) · Bia Đấm (P3) · Bàn Thờ (P3) | chấm đỏ khi có mới | modal tương ứng |

---

## 4. Luồng tương tác cốt lõi

### 4.1 Phục vụ 1 bàn (happy path + 4 kết cục 03 §9.3)
```
nhóm ngồi → popover hiện (món chờ rót) → vòi tự rót từng cốc (3s/cốc, cần cốc sạch) → mọi món ✅ → nút đỏ PHỤC VỤ + viền pulse
→ chạm (bất kỳ đâu trên card) → engine.serve → floating "+tiền +boa" → khách "DANG NHAP LY" 5–10s → đợt 2 (35%) hoặc rời → cốc bẩn → bồn rửa 7s → cốc sạch
kết cục theo thời điểm chạm:  sớm ≥60%: +tiền +tip │ trễ <60%: +tiền, KHÔNG tip (pill không có "boa") │ trong grace (P1): viền đỏ pulse, nhóm "đẩy ghế", chạm kịp → +tiền không tip │ hết grace: KHÁCH BỎ ĐI, −xu, uy tín −5/khách
```
- Khi cốc trong Order **sắp mất hơi** (cờ vàng) mà chưa đủ món (vd bếp chậm) → dòng món đổi `warning`; hết hơi → `HẾT HƠI` xám; giao vẫn được, tip ×0 + uy tín −1; toast "⚠️ Cốc hết hơi — tip ×0".
- Bàn có VIP: badge vàng + subtitle "Boa ×10 — nhưng nhanh dỗi"; mất → pill "🚨 Mất khách sộp!".
- **2026-10-23 (founder 22/10/2026, Part B2.1 — phản hồi khi bưng):** (a) pill xu của một lần bưng **không phải tốt nhất** có thêm một dòng lý do ngay dưới mặt khách và số xu: bia hết hơi → `outcome.stale` ("Bia hết hơi! +{n} xu · mất boa, giảm uy tín"); trễ (`late`) và đang đứng dậy (`grace`) → `outcome.slow` ("Chậm · không có boa"); bưng có boa không có dòng nào. Nguyên nhân 22/10 chỉ thấy mặt nhăn + "+50" trên nền hồng: từ commit `1e30b78` (09/09/2026) pill chỉ vẽ mặt + số + icon, câu chữ chỉ nằm trong `aria-label` (người đọc màn hình nghe được, mắt không thấy). (b) Mặt khách: có boa 🤩 · bưng kịp trước khi khách hết kiên nhẫn nhưng không boa (`late`, `earlyNoTip`) 🙂 · bưng lúc khách đang đứng dậy (`grace`) 😐 · bia hết hơi 😖 (trước: `late` 😐, `grace` 😥). (c) **Cửa sổ boa nhìn thấy được**: đồng hồ của thẻ Order và thanh kiên nhẫn của bong bóng cùng một trạng thái: xanh, kèm chữ "Còn boa" ở thẻ, khi mọi khách còn ≥ `tip.patienceThreshold` kiên nhẫn **của chính họ** (ghế cấp cao kéo dài hạn Order chứ không kéo dài cửa sổ boa) và bia chưa hết hơi; hết cửa sổ thì cả hai cùng đổi màu (vàng). (d) Lần bưng trễ đầu tiên → một gợi ý một lần: "Bưng khi đồng hồ còn xanh để có boa." (§9).

### 4.2 Mở ca / đóng ca / nghỉ
```
Cổng ca (thể lực 100%? ca hôm nay x/cap? free N/ngày theo config P3?) → [MỞ CA] → thời tiết ca hiện toast 3s → spawn
hết thể lực (12') hoặc [ĐÓNG CA] → closing: không spawn, khách uống nốt; nút [MỜI VỀ (~−n xu)] đóng ngay
→ finalize → màn Đóng cửa + Sổ sách → [XẢ HƠI] → đồng hồ hồi thể lực (chỉ đếm khi tab active) → Cổng ca
```
- Hết ca vẫn **tiêu xu được** (Nâng cấp / Nhập hàng) — chỉ khoá kiếm (GDD §10).
- **2026-10-22 founder (JSON 2.1.3): đúng một nút "Mở ca" trên màn, ở mọi trạng thái.** Nút ở thanh dưới là nút duy nhất. Thẻ mở quán của save mới ("Quán nhỏ đã sẵn sàng.", trong vùng "HẺM NHỎ") giữ chữ, bỏ nút riêng và thêm một dòng chỉ xuống: "Bấm **Mở ca** ở thanh dưới để bắt đầu." / "Tap **Open shift** below to start." (key `rest.startBelow`, tên nút lấy từ `nav.shift`). Ngoại lệ: save ghim bản cũ còn ẩn thanh dưới (HUD chưa mở, vd. save ghim 2.1.1 chưa chơi ca nào) thì thẻ giữ nút của nó. Trong ca, ô đầu của thanh dưới là "Sổ ca", nên không có "Mở ca" nào.
- **2026-10-23 (review A-r1, giới hạn đã biết, chuyển cho B2.8):** ở màn thấp (`max-height ≤ 500 px`, điện thoại xoay ngang) `.bottom-nav` là `position: static` (`apps/web/src/reference-layout.css`), nên trên save mới dòng "Bấm **Mở ca** ở thanh dưới để bắt đầu." chỉ tới nút "Mở ca" duy nhất nằm dưới mép màn (trang khoảng 1 000 px); test A3 chỉ phủ 390×844, 360×740, 1280×720. B2.8 (sân vừa một màn, founder 22/10/2026) phải làm nút "Mở ca" duy nhất tới được mà không cuộn ở chiều cao đó (thêm 844×390 vào test của nó).
- **2026-10-23 (founder 22/10/2026, B2.8 — đã giải quyết dòng trên):** ở `max-height ≤ 500 px` thanh dưới nay là `position: sticky` (gọn: nút 44 px, icon và chữ một hàng), nên nút "Mở ca" duy nhất của save mới luôn trên màn ở đáy; dải kho thành một hàng trong dòng chảy (không còn nằm dưới thanh dưới; nút uy tín giữ 46 px trong hàng). Test A3 của `yard.spec.ts` có thêm 844×390. Vì thanh dưới dính đáy, trang chừa `scroll-padding-bottom` bằng chiều cao của nó (64 px + vùng an toàn): cuộn tới một nút (Tab, `scrollIntoView`) dừng trên thanh dưới, không để thanh che nó (vd. Bếp ở 1280×400, `kitchen.spec.ts`).

### 4.3 Nhập hàng (P1) — sheet không pause
Header "Kho cho ca tới" + hint theo thời tiết ca kế ("Nóng → bia bay hơi nhanh: nâng Hầm lạnh; Mưa → nhiều ship"). Hàng: icon · tên · `stock/cap` progress · [+10 = bulkPrice] · [Đầy = công thức 08 §2]. Preset "Đủ 1 ca" (🟡 = ước lượng từ ca trước ×1.2). Footer: tổng xu + [NHẬP HÀNG]. Kho đầy → nút disabled + "Nâng Quầy để chứa thêm".

- **2026-10-23 (founder 22/10/2026, Part B2.7 — Nhập hàng hai nút mỗi dòng, bổ sung):** mỗi dòng có đúng hai nút kiểu phụ (không còn ba nút đỏ): "+10" (`inventory.bulkSize`) và "Đầy kho", giá là một chip vàng ("100 xu"); nút mờ có đúng một lý do ngay dưới: "Kho chỉ còn chỗ cho {n}" khi +10 sẽ tràn kho, "Kho đã đầy", "Chưa đủ xu". Nút "+1" cũ bỏ đi; chỉ khi ví không đủ cho cả hai nút mà vẫn đủ cho một cốc thì dòng hiện thêm nút "+1 · {giá}" (để kho trống không thành ngõ cụt). Tên nguyên liệu khác tên món là cố ý (nguyên liệu sống → món đã nấu): dòng của món bếp luôn ghi cả hai ("Đậu phụ" + "Bếp nấu thành Đậu tẩm hành khi khách gọi"), kể cả khi bếp chưa mở; Sổ ca ghi tên món.

### 4.4 Nâng cấp (P1)
Tabs: **Vận hành** (bom · rửa · hầm · quầy · bếp) · **Bàn** (mua thêm / nâng từng bàn) · **Kinh doanh** (P2: điện thoại · QR · biển hiệu · tờ rơi · chó) · **Trang trí** (P3). Card: sprite cấp hiện → cấp kế · stat → stat' ("rửa 7s → 5s") · giá ×k · lý do khoá (chữ người chơi: "Cần Quầy cấp 3", "Cần huy hiệu Kết Nối — rủ 1 bạn chơi") · badge **Gợi ý** trên ≤2 card từ bottleneck ca trước (hết cốc sạch → rửa/cốc; stale cao → hầm; queue đầy → bàn). P1: chỉ mua **ngoài ca** (nút disabled trong ca kèm lý do).

- **2026-10-23 (founder 22/10/2026, Part B2.4 — chạm ô bàn trống để mua, bổ sung):** ô bàn trống (viền đứt) trên sân là một nút (≥ 44 px, tên `yard.slot`): chạm → sheet "Mua bàn mới" (`goal.buyTable`) với **đúng thẻ mua bàn kế tiếp của sheet Nâng cấp** (một số hiệu ứng "+1 chỗ", giá trên nút, đúng một lý do khi mờ), tạm dừng như mọi sheet quản lý; mua xong sheet đóng và bàn mới hiện ở sân. Chỉ khi nút Nâng cấp đã mở (`featureReveal.upgradeAfterShifts`); save ghim còn ẩn nó (vd. 2.1.1 chưa chơi ca nào) giữ ô là hình. Trước đây chạm ô không có phản hồi.

### 4.5 Đóng cửa + Sổ sách (P1)
5 số lớn: **Thực thu** (= gross − phạt) · **Phục vụ** n/N (%) · **Bỏ đi** n (theo nguyên nhân: hết kiên nhẫn / hàng đợi / từ chối cửa) · **Boa** % lượt · **Uy tín** Δ (có thể âm). Mốc thưởng trong ca ("↑ Phục vụ +50"). Insight 3 card: **Nghẽn chính** (cốc sạch / bàn / rót / mồi — từ metric: thời gian chờ cốc, queue full %, stale %) · **Cơ hội** (VIP lỡ n, combo bán tốt, thời tiết hợp) · **Gợi ý ca sau** (1 nâng cấp + 1 nhập hàng). Preview thời tiết ca kế. So sánh ca trước. Nút [SỔ CA CHI TIẾT] (menu mix, k — alpha/dev) · [XẢ HƠI] · [Copy log] (alpha).

- **2026-10-23 (founder 22/10/2026, Part B2.5 — Sổ ca ngắn hơn, bổ sung đoạn trên):** Sổ ca mở ra là: **Thu ròng** (số lớn) + **một gợi ý** với nút của nó (vd. "Xem Bàn & ghế"); rồi ba số **Lượt khách đã phục vụ · Bỏ đi sau khi ngồi · Không vào được · hết chỗ** (`book.leftSeated` = khách hết kiên nhẫn khi đã ngồi; `book.noEntry` = nhóm bị từ chối ở cửa + khách bỏ hàng đợi, vì họ chưa từng được ngồi), hai số sau cộng lại đúng bằng số khách của "Vì sao khách đi" (trước: "Khách bỏ đi 5" cạnh lý do cộng ra 15); đơn shipper (đã giao / quá hạn) thêm dòng khi > 0; rồi nút của ca (Ngừng đón khách · Mời tất cả về) và lối vào Nhiệm vụ ngày (khi đã mở); **mọi thứ khác ở "Chi tiết", đóng sẵn** (giờ ca + thời tiết, địa điểm, tiền món / boa / phạt / chi trong ca / tiền đơn / Tỉnh Táo, "Vì sao khách đi", bảng món + đoạn giải thích + số đo ca, nút Tờ rơi, bảng Giờ Vàng); bảng món **ẩn món còn khóa** (chưa đủ cấp Bếp, không có số nào). Không bỏ thông tin nào: mọi dòng cũ vẫn còn, chỉ chuyển chỗ.

### 4.6 Giờ Vàng
20s trước: banner "Giờ Vàng NHẸ sau 00:20 — chuẩn bị cốc!" (không pause) + pill ⏱ shake. Active: viền HUD `warning` (nhẹ) / `danger` (nặng) pulse, spawn dồn. Kết thúc: toast tổng kết "Giờ Vàng: 46 khách, 100% phục vụ, boa 52%".

- **2026-10-23 (founder 22/10/2026, Part B2.6 — tổng kết sau Giờ Vàng, bổ sung):** khi một đợt Giờ Vàng kết thúc trong lúc ca đang mở, một thẻ ngắn hiện ra và **tạm dừng như sheet**: tiêu đề "{đợt} vừa xong", các dòng Khách đến · Lượt phục vụ · Bỏ đi · không vào được (khách hết kiên nhẫn + nhóm bị từ chối trong đợt) · Tiền boa · Thu ròng (xu nhận trừ tiền phạt của khách bỏ đi trong đợt), và **so với đợt trước** "↑ +n xu" / "↓ −n xu" (đợt đầu không có dòng này); một nút "Tiếp tục". Dựng từ chính các sự kiện của đợt (`rush_ended` đã mang số tổng kết, `rush_started`, sự kiện khách bỏ đi), không lưu gì thêm; không hiện khi đang mở sheet khác hay khi ca đang đóng (sổ ca có bảng Giờ Vàng). Đoạn "Kết thúc: toast tổng kết" ở trên là ý cũ, nay là thẻ này. Chế độ online (máy chủ, M4) chưa có thẻ: ảnh chụp máy chủ gửi về chỉ mang `rush_ended` của ca (không có `rush_started` và tiền phạt trong đợt), nên thẻ không hiện thay vì ghi một thu ròng thiếu tiền phạt; muốn có thì `rush_ended` phải mang tiền phạt của đợt (đổi engine, việc sau).

### 4.7 Sự kiện (P3) — dialog có hạn, **no-pause với sự kiện phạt**
| Sự kiện | Dialog | Hạn | Kết cục |
|---|---|---|---|
| Côn đồ đòi bảo kê | "?" số tên (ẩn), "Chó: Có · Lv3", [Cống nạp (14s)] [Phản kháng] | 20s, quán vẫn chạy | Chiến trường (replay turn-based, pause) → THẮNG +xu / THUA: chó bị bắt + sửa đồ |
| Kiểm tra ATTP | câu hỏi + 4 đáp án, 15s, 2 lượt | no-pause | đúng: gia hạn chứng chỉ · sai: "ĐÌNH CHỈ CA" → đóng ca |
| Đại gia lộ diện | khói + két bí ẩn → mở: xu / nguyên liệu / uy tín / **cốc** | 1 chạm | |
| Trộm offline | báo cáo khi vào: mất gì, chó bảo vệ? | 1 chạm | |
| Kết Vụ Bia | hòm thư: hạng, thưởng bó nguyên liệu, huy chương | claim | |
| Trận đấu (P4) | TV hiện tỉ số thật, "Giờ Vàng xem bóng" | theo suất chiếu | |

---

## 5. Màn phụ (meta)

| Màn | Pattern | Nội dung | Phase |
|---|---|---|---|
| ~~**Landing / ngôn ngữ**~~ | — | **Bỏ 15/10 (owner 17/09, FEEDBACK I.1):** vào thẳng sân quán bằng tiếng Việt bất kể ngôn ngữ trình duyệt; đổi ngôn ngữ ở Cài đặt; người đã lưu `en` giữ `en` | — |
| **Cổng ca** | card giữa | thể lực, ca hôm nay x/cap, thời tiết ca kế, [MỞ CA]; (free hết — không Vé Mở Ca) + nút đăng nhập mềm | P1 → P3 |
| **Nhiệm vụ** | modal tab | Hôm nay (5: 3 lõi + 3 ca + gửi quà; progress + claim; bonus 5/5) · Điểm danh (ladder 7 ngày ⭐) · Thử thách (referral 3 mốc, link/mã mời) | P2 |
| **Thông tin nhanh** | dialog tab | Xu: 3 sổ (số dư / thu Vụ / trọn đời) giải thích · Uy tín: kiếm/mất/tiêu | P2 |
| **Xếp hạng** | drawer tab | Giải Nhậu: tab bậc ‹›, hàng: hạng · tên · thu Vụ · ⭐ · mốc; "Chưa có ai" ở bậc trống; đếm ngược kết Vụ; 2 Vụ (Phân Hạng / Tranh Bá) · **Dạo Phố**: hàng xóm theo mặt bằng × bậc, thẻ quán (biển/đèn/cây, profileViews) → xem quán (pause ca) / react / quà / chặn | P3 |
| **Bàn Thờ Ông Địa** | prestige modal | top 3 podium Vụ trước + tường lưu danh | P3 |
| **Hồ sơ & huy hiệu** | modal | tên, mốc Đường Lên Trùm (progress tới mốc kế), 8 huy hiệu (Kết Nối có tác dụng — nói rõ), tem trang trí | P3 |
| **Mặt bằng** | full screen list | 9 vị trí: mult, rent 7 ngày, cọc, hoà vốn ước tính, gate LP, [THUÊ] / hiện tại: còn Xd Yh | P3 |
| **Cài đặt / tài khoản** | sheet | ngôn ngữ, âm thanh, pin, guest → [Đăng nhập Google] (lợi ích: lưu, đua top, đa thiết bị, quà), hỗ trợ/ticket | P1 (ngôn ngữ+âm) → P3 |
| **Bia Đấm** | chat panel (Learn) | 4 intent chip; quota x/20; tip rule-based trước LLM; không che bàn khi đang ca | P3 |
| **Shop Vụ Bia** | modal | TV / Lịch / Theme đội (grid palette, bundle 6) — theo 07-SPEC | P4 |
| **Mời Bia Hơi** | modal | **monetization duy nhất (08/09)**: 2 mức, QR chuyển khoản (admin xác nhận), chọn quà cosmetic, "game free — không bán xu/sức mạnh" | M7 |
| **Vé số** | NPC + ví vé + kết quả | feature flag, legal gate | P4 |

---

## 6. Component library (DOM React + Pixi)

| Component | Variant | State | Ghi chú |
|---|---|---|---|
| `HudPill` | coin · stamina · rush · weather · glass · reputation · stock | default · warning · danger · pulsing | Chakra Petch số; icon+nhãn |
| `ControlButton` ✅ | primary(`stoolRed`) · neutral · success · warning · danger | default · active · disabled(+lý do) · loading | min-h 52 |
| `IconButton` ✅ | rail | badge chấm đỏ | 44×44 |
| `Sheet` ✅ (bottom-sheet) | restock · upgrade · stats · settings | open/close anim `popover-sheet-in`; kéo xuống đóng | không pause; nền quán thấy sau |
| `Modal` | mission · rank · shrine · profile · shop | tab | `game-modal-in` |
| `EventDialog` | gangster · inspection · chairman · theft · season | countdown ring | no-pause (phạt) / pause (kết quả) |
| `UpgradeCard` | equipment · table · business · cosmetic | affordable · locked(reason) · recommended · maxed | sprite→sprite |
| `RestockRow` | ingredient | ok · low · empty · full | +10 / Đầy |
| `LedgerStat` · `InsightCard` | 5 số + 3 card | | |
| `LeaderboardRow` · `StreetCard` | | me highlight · empty tier | |
| `QuestCard` · `AttendanceLadder` | | active · claimable · claimed · expired | |
| `Toast` | info · success · warning · danger | stack ≤3, auto 2.5s, critical giữ | 1 dòng |
| `CoachMark` | onboarding | | theo ngữ cảnh, không tutorial tuyến tính (uiux §15) |
| Pixi: `TableCard` ✅ · `OrderPopover` ✅ · `LostFlash` ✅ · `QueueLane` · `KegStation` · `Sink` · `GlassRack` · `Cooler` · `KitchenPanel` · `OwnerDog` · `WeatherOverlay` · `FloatingPill` | | | vẽ code + sprite từ registry |

---

## 7. Motion & âm thanh (F24 §5, catalog gốc §4)

| Tín hiệu | Anim | Thời lượng |
|---|---|---|
| Rót | progress tuyến tính theo `pourMs` + bọt dâng | 3s |
| Freshness cốc | bọt đầy → vơi (75%) → cờ vàng (25% còn) → xám | theo cấp hầm |
| Đủ món | viền bàn pulse + nút đỏ glow | loop 0.9s |
| Trễ / grace | viền vàng → đỏ pulse, nhóm "đẩy ghế đứng dậy" | 2–3s |
| Served | pill `+n` bay lên fade, cụng ly "dô" (anim-cheers) | 1.2s |
| Mất nhóm | popover/banner đỏ + rung nhẹ card, pill `−n` | 1.8s tự tắt |
| Giờ Vàng | pill shake 20s trước; viền HUD pulse (nặng mạnh hơn) | |
| Thời tiết | overlay tint crossfade 1s; mưa/gió particle canvas | |
| Đại gia | khói + két mở (secretBoxBurst) | 1.5s |
| Tỉnh Táo | pill tím ×1.10 đếm ngược, nhấp nháy 10s cuối | |
| Onboarding | coachmark glow/pulse | |
Tất cả ≤ 2s, easing out, tôn trọng `prefers-reduced-motion` (tắt shake/pulse, giữ đổi màu).

Âm: 1 track `ambient-quanbia` loop + `radio-loa-phuong` khi Xả Hơi; SFX: pour · glass-clink · glass-wash · coin · tip · lost-customer · rush-start · warning-stale · ui-tap; toggle 🔇; không SFX dồn dập (gộp trong 100ms).

---

## 8. Microcopy (vi — key i18n `vi.json`; en dịch sau, thiếu key fallback vi + log)

| Key | vi |
|---|---|
| `btn.openShift` / `btn.closeShift` / `btn.serve` / `btn.restock` / `btn.upgrade` / `btn.ledger` / `btn.confirm` | MỞ CA / ĐÓNG CA / PHỤC VỤ / NHẬP HÀNG / NÂNG CẤP / SỔ CA / CHỐT |
| `btn.kickAll` | Mời về (~−{n} xu) |
| `table.empty` / `table.ordering` / `table.enjoying` / `table.lost` | chờ nhóm mới / đợt {r}/{R} đang gọi / đang lai rai / KHÁCH BỎ ĐI — chờ quá lâu |
| `item.pending` / `item.pouring` / `item.ready` / `item.warn` / `item.stale` | chờ rót / đang rót / sẵn sàng / sắp mất hơi / HẾT HƠI |
| `popover.preparing` | đang chuẩn bị món… |
| `hint.vip` / `hint.voi` / `hint.thuong` / `hint.ngoily` / `hint.chipheo` | Boa ×10 — nhưng nhanh dỗi, bưng ngay / Khách vội — chờ ngắn, ưu tiên bàn này / Rót xong bưng ngay — bia 12s là mất hơi / Ngồi dai nhưng gọi đều — cứ chiều / Không trả tiền… nhưng biết đâu là đại gia |
| `toast.earn` / `toast.tip` / `toast.lost` / `toast.lostVip` / `toast.stale` / `toast.cap` | +{n} xu / Boa +{n} / 😤 Bàn bỏ đi! Mất {n} khách / 🚨 Mất khách sộp! / ⚠️ Cốc hết hơi — tip ×0 / 🧱 Chạm trần ngày {cap} xu |
| `rush.warn` / `rush.active` / `rush.end` | Giờ Vàng {type} sau {mm:ss} — chuẩn bị cốc! / GIỜ VÀNG {type} / Giờ Vàng: {n} khách · {served}% phục vụ · boa {tip}% |
| `weather.*` | Nắng · Nóng · Oi bức · Mưa phùn · Lạnh (+1 dòng tác động, 08-SPEC §5) |
| `shift.open` / `shift.exhausted` / `shift.closing` / `shift.dayLimit` | 🔔 Mở ca! Thể lực 100%. / 😮‍💨 Hết thể lực — đóng ca. Khách đang ngồi vẫn phục vụ nốt. / Đang đóng cửa — khách uống nốt / Hết giới hạn ngày — mai gặp lại |
| `event.gangster.title` / `.pay` / `.resist` / `.win` / `.lose` | Côn đồ đòi bảo kê / Cống nạp / Phản kháng / Thắng! +{n} xu / Thua — chó bị bắt, đồ bị đập |
| `event.inspection.*` | Tổ kiểm tra ATTP ghé quán / Chứng chỉ gia hạn / Chứng chỉ bị thu hồi — ĐÌNH CHỈ CA |
| `event.patrol` | Ông xe ôm báo đội trật tự đang ở đầu phố! |
| `event.chairman` | Hoá ra là đại gia! Két Bia Bí Ẩn |
| `flavor.cheers` / `flavor.ai` / `flavor.lottery` | Một hai ba… dô! / Bia Đấm / Lấy em tờ vé lấy hên! |
| `gate.login` | Đăng nhập để lưu tiến trình, đua top, và mở khoá thêm ca trong ngày. |
| `gate.free` | Chơi free hết. Muốn ủng hộ quán? Mời Bia Hơi — không bán xu, không bán sức mạnh. |
| `donate.note` | Mời Bia Hơi là ủng hộ tác giả — quà cảm ơn chỉ là trang trí. |
| `tip.didYouKnow.*` | Bạn có biết… (xoay vòng: mất hơi 12s, VIP ×10, tờ rơi ×3.6, mời về bàn nhâm nhi tốn xu + uy tín, …) |

Giọng: thân, vỉa hè, ngắn; không hù doạ; số luôn kèm đơn vị (xu/⭐/s).

---

## 9. Onboarding (không tutorial tuyến tính — uiux §15, §28)
Ca 1: coachmark theo ngữ cảnh: (1) nhóm đầu ngồi → "Chờ đủ món rồi chạm ✅ PHỤC VỤ" trỏ popover; (2) lần đầu cốc cờ vàng → "Bia rót xong 12s là mất hơi — bưng sớm!"; (3) lần đầu mất nhóm → "Chờ lâu quá khách bỏ đi — mất xu & uy tín"; (4) hết ca → sổ sách + "Nâng cấp gì trước?" trỏ card Gợi ý. Tối đa 1 coachmark/lúc, 1 chạm bỏ qua, không lặp.
- **2026-10-23 (founder 22/10/2026, Part B2 — gợi ý đúng lúc, bổ sung, đoạn trên giữ nguyên):** gợi ý là một băng chữ ở đúng chỗ của step guide (dấu "!" + câu ≤ 12 từ + nút "Đã hiểu"), theo luật `onboarding.hints`: tối đa `maxConcurrent` (1) gợi ý một lúc, `dismissOnTap` (chạm "Đã hiểu" là tắt), `neverRepeatAfterDone` (đã hiện một lần thì không hiện lại; danh sách lưu ở cài đặt máy `hintsDone`, F27 §4). Không hiện khi đang mở sheet, panel thiết bị, thẻ Order hay khi step guide đang hiện (dùng chung một chỗ, không chồng); gợi ý chỉ chiếu sáng mục tiêu của nó khi không có spotlight nào khác (luôn tối đa một phần tử `data-spotlight`). Chỉ khi `onboarding.enabled`. Gợi ý đầu (B2.1d): sau lần bưng trễ đầu tiên trong ca đang mở → "Bưng khi đồng hồ còn xanh để có boa." (`hint.tipWindow`), hết khi bưng lần kế hoặc chạm "Đã hiểu".
- **2026-10-23 (founder 22/10/2026, Part B2.2 — gợi ý cho HUD hiện từ ca 1, bổ sung):** năm gợi ý nữa, mỗi cái một lần, lúc nó có nghĩa lần đầu; ngưỡng là ngưỡng HUD đã dùng (không thêm số): (1) **kho bia sắp hết** (đúng lúc hiện nút nhanh "Kho bia còn ít → Nhập đầy kho bia", nút này giữ nguyên) → chiếu sáng ô bia của dải kho, "Đây là kho bia của quán. Chạm vào để Nhập hàng."; (2) **cốc sạch ít hơn số bia vòi rót giữ sẵn** (cốc là chỗ nghẽn) → chiếu sáng Bồn rửa; (3) **bia rót xong đang chờ trên mâm** (chỉ khi bia có thể hết hơi: không ở ca 1 của save mới, không ở hầm lạnh cấp cao nhất) → "Bia giữ tươi {s} s, bưng trước khi hết hơi." (không chiếu thêm: bong bóng mâm đã sáng); (4) **cảnh báo Giờ Vàng đầu tiên** (`rush.schedule.warningMs`) → chiếu sáng pill rush; (5) **lần đầu mục tiêu kế tiếp là bàn mới và đủ xu** → chiếu sáng ô bàn trống đầu tiên (B2.4: chạm để mua). Nhiều lúc cùng đến: gấp nhất trước (trễ boa · Giờ Vàng · hết hơi · cốc · kho · bàn), cái sau hiện khi cái trước tắt. Gợi ý có mục tiêu chờ khi đang có spotlight khác (ví dụ mâm đã đủ, hay nút Nâng cấp lúc nghỉ), nên không bao giờ có hai chỗ cùng sáng; khi step guide hiện thì gợi ý chờ (cùng một chỗ, không chồng).

---

## 10. A11y & mobile (F24 §6, uiux §32)
Hit ≥ 44px; bàn ≥ sprite; không hover; màu không là tín hiệu duy nhất (stale đổi hình bọt + chữ); text vừa nút tiếng Việt; vùng ngón cái cho CA/NHẬP HÀNG/NÂNG CẤP/PHỤC VỤ; 390×844 & 360×740 & 1280×720 không overflow/không cuộn ngang; DOM HUD/sheet qua axe (contrast ≥ 4.5:1 chữ trên `panel`); `prefers-reduced-motion`; font canvas Be Vietnam Pro (có dấu) — Chakra Petch chỉ cho số.

---

## 11. Checklist nghiệm thu UI (theo thứ tự code P1→P4 — tất cả đều trong scope 1 phase)
- **P1:** 7 màn §3–§4.5 chạy 3 viewport; popover đúng 03 §9.5; 4 kết cục phục vụ phân biệt thị giác; sheet không pause; Gợi ý nâng cấp khớp bottleneck thật (so metric); i18n key 100% (không chuỗi cứng); screenshot baseline; axe pass; 30 giây đầu chơi được không đọc hướng dẫn (playtest).
- **P2:** bếp panel + bubble tách bia/mồi nóng; badge khách đặc biệt phân biệt ở 32px; telegraph loại rush; quest panel; biển hiệu sheet.
- **P3:** dialog sự kiện no-pause đúng luật; Xếp hạng/Dạo Phố/Bàn Thờ; cổng ca + đăng nhập + Mời Bia Hơi không dark pattern.
- **P4:** TV tỉ số; shop Vụ Bia; donation; vé số (flag).

---

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.0 | Bản đầu 2026-09-08: IA, HUD wireframe + component/state, 4 luồng lõi, màn phụ theo phase, component library, motion/âm, microcopy i18n, onboarding, a11y, checklist. Phản ánh popover Order + cờ mất nhóm đã build (slice p0-ui-serve-popover--r2). |
| v1.1 | Theo audit 08/09: header thêm layout tham khảo ưu tiên (ảnh HUD gốc, sân quán không gian) và nói rõ §3.1 là card-list prototype; nhãn P1–P4 = thứ tự code; §11 đổi tên. Không đổi nội dung màn/component. |
| 2026-09-18 owner P0 | Màn sân quán ca 1 tối giản (ví · bom · chip mục tiêu), sheet Nâng cấp mở dần theo mở khoá, bong bóng "2 ghế" cho cặp bị từ chối, vòng kiên nhẫn hàng đợi, màn kết LP7 "Chuyện quán bạn" — PLAN 18/09 §0/§4, DESIGN-story-3-tuan §2b. |
| 2026-10-15 fun-locale-default-vi | Bỏ màn Landing/ngôn ngữ (owner 17/09, FEEDBACK I.1): màn đầu tiên là sân quán, mặc định `vi`, ngôn ngữ chỉ đổi ở Cài đặt; remote vẫn có màn chọn cách chơi (guest / Google). Gạch bỏ dòng màn trong §IA; không đổi component khác. |
| 2026-10-15 fun-next-goal | HUD chip "Mục tiêu kế tiếp" (tên · hiệu ứng 1 con số · giá · còn thiếu; chạm → mở sheet Nâng cấp đúng món; tắt ở Cài đặt) dưới ví từ ca 1; sheet Nâng cấp đầy đủ chia 3 làn Sức chứa · Tốc độ · Khách (registry `goals.ts`). Không đổi component khác. |
| 2026-10-19 fun-buy-buttons-reason | Toast mất khách = số xu/uy tín + đúng 1 lý do (Hết bia · Hết mồi · Chờ lâu quá · Hết chỗ); thẻ bàn và nút "Mua thêm bàn" luôn hiện giá + đúng 1 lý do khi mờ; Sổ ca có mục "Vì sao khách đi" xếp theo số khách. Không đổi component khác. |
| 2026-10-22 fun-kick-table | Popover Order (§ component) thêm khối **"Mời về"** (Đợt 3, `kickTable`, `.kick-table` dưới đơn): bàn có khách, từ khi HUD mở (sau ca 1) và chỉ khi ca đang mở (khi đóng ca, nút "Mời tất cả về" của sổ ca rẻ hơn); dòng giá "n xu · −m uy tín" + nút phụ "Mời về" một chạm (≥ 44 px; mô tả trợ năng = giá rồi lý do), mờ với đúng một lý do: "Khách chưa dùng món xong" (khách đang ngồi vào hoặc chờ món, không hiện giá) hoặc "Chưa đủ xu" (giá vẫn hiện); chạm → bàn dọn, uy tín bị trừ rơi từ bàn (`.fly-rep`), popover đóng. Microcopy `tip.didYouKnow`: "kick ngồi lỳ bằng uy tín" → "mời về bàn nhâm nhi tốn xu + uy tín". Nhãn "Bàn lai rai" sẫm lại (#2f6e99, 5,2:1). |
| 2026-10-22 founder override (JSON 2.1.2) | **2026-10-22 founder override: HUD and Nâng cấp visible from shift 1 (thresholds 0); journey/quests/league unchanged.** Hai ngưỡng Tier C `onboarding.featureReveal.hudAfterShifts` và `upgradeAfterShifts` về 0: ngay ca 1 sân có đồng hồ ca, nút Cài đặt, hàng thời tiết/rush, dải kho, cooler/washer, đếm cốc và thanh dưới (Mở ca · Nhập hàng · Nâng cấp); Hành trình (`journeyAfterShifts` 2), Nhiệm vụ (`questsAfterShifts` 2), giải đấu (`leagueAfterShifts` 3) và danh sách Nâng cấp đầy đủ (`upgradeAllAfterShifts` 2) giữ nguyên. Ghi đè đúng hai ngưỡng này của dòng 2026-09-18 owner P0 ở trên ("Màn sân quán ca 1 tối giản (ví · bom · chip mục tiêu)" — giữ nguyên làm lịch sử); ca 1 vẫn 1 khách 1 bia, không risk/rush, spotlight một chỗ. Không đổi code, CSS, số kinh tế. |
| 2026-10-22 founder (JSON 2.1.3) | Ba sửa của founder cho ca 1 sau PR #32, dòng 2.1.2 ngay trên giữ nguyên: (1) **"Mời về" không có ở ca 1**: Popover Order chỉ hiện khối "Mời về" từ ca 2 (ngưỡng riêng `onboarding.featureReveal.kickAfterShifts` 1, AND với HUD; save ghim thiếu key đọc seed như các ngưỡng reveal khác). (2) **Ca 1 không có khách "Bàn lai rai"** (`onboarding.firstShift.excludedCustomerTypes` ["ngoily"], luật engine, xem 08-SPEC). (3) **Đúng một nút "Mở ca"** (§4.2): thẻ "Quán nhỏ đã sẵn sàng." bỏ nút, thêm dòng `rest.startBelow` chỉ xuống nút ở thanh dưới; thẻ giữ nút khi thanh dưới còn ẩn (save ghim cũ). Test: `yard.spec.ts` `A3 at rest exactly one Mở ca is on screen …` (vi/en × 390/360/1280), `first-shift-visual.spec.ts` `A3 a save pinned to 2.1.1 …`, `kick-table.spec.ts` (không có ở ca 1, có sau 1 ca). |
| 2026-10-23 founder 22/10 (JSON 2.1.4, Part B1) | Không đổi màn nào; hai hệ quả nhìn thấy của luật mới: (1) ca 1 của save mới huy hiệu tủ lạnh hiện **∞** (bia không hết hơi ở ca 1; sheet tủ lạnh vẫn ghi số giây của cấp); (2) quán chưa có bàn 2 ghế không còn bong bóng "2 ghế" ở cửa và dòng "Cặp không có chỗ" của sổ ca (chỉ còn với pin ≤ 2.1.3). B2.3 (nhãn "Giữ tươi {n} s") cần tính tới ∞ của ca 1. STOP: `sim:balance` + `sim:career:gate` đỏ, chờ founder (08-SPEC changelog 2026-10-23 / JSON 2.1.4). |
| 2026-10-23 founder trả lời QD-117 (JSON 2.1.4) | Thẻ tủ lạnh ở ca 1 thêm một dòng (`cooler.firstShift`): "Ca đầu tiên: bia rót sẵn không hết hơi. Từ ca 2, thời gian giữ tươi dưới đây áp dụng." / "First shift: poured beer never goes flat. From shift 2 the freshness times below apply." — huy hiệu ∞ và thẻ không còn nói ngược nhau (review B1-r1). Đầu vào cho B2: nhãn B2.3 "Giữ tươi {n} s" phải tính tới ∞ ở ca 1; gợi ý giữ tươi của B2.2 không được hiện ở ca 1. Ba ca đầu không có bong bóng "2 ghế" ở cửa và dòng "Cặp không có chỗ" của sổ ca (chỉ khách lẻ). STOP lần 2: tổng 30 ngày 9,451 / 9,387 tr (lệch 2,9 % / 2,2 % so với trần 9,185, dung sai 2 %) và ghế 2 đầu tiên ở ca 35 / 35 (sớm 5 ca so với 40, dung sai 2 ca), chờ founder (08-SPEC changelog 2026-10-23 / JSON 2.1.4, dòng QD-117). |
| 2026-10-23 founder 22/10 (Part B2.1 phản hồi khi bưng) | §4.1 + §9 (ghi chú dated): pill xu có dòng lý do khi lần bưng không phải tốt nhất (`outcome.stale`; `outcome.slow` "Chậm · không có boa" cho trễ và đang đứng dậy), mặt khách theo thang founder (trễ nhưng kịp 🙂, đang đứng dậy 😐), đồng hồ thẻ Order và thanh kiên nhẫn cùng trạng thái cửa sổ boa (xanh + "Còn boa"), gợi ý một lần sau lần bưng trễ đầu. Nguyên nhân chữ "Bia hết hơi!" không hiện ngày 22/10: commit `1e30b78` đưa câu chữ vào `aria-label` của pill. UI thuần, không đổi luật hay số (cửa sổ boa = `tip.patienceThreshold`). |
| 2026-10-23 founder 22/10 (Part B2.3 nhãn và chỗ trùng) | §3.2 (ghi chú dated): huy hiệu Hầm lạnh "Giữ tươi {n} s" (∞ ở ca 1 giữ nguyên), Bồn rửa "Rửa {n}/{mẻ}", dòng `beer.pipeline` chỉ còn cho trình đọc màn hình (số của nó đã có trên sân), Popover Order thêm một dòng tính cách dưới loại khách. UI thuần, không đổi luật hay số. |
| 2026-10-23 founder 22/10 (Part B2.4 chạm ô bàn trống) | §4.4 (ghi chú dated): ô bàn trống là nút mở thẻ mua bàn kế tiếp (giống thẻ của sheet Nâng cấp: hiệu ứng, giá, một lý do khi mờ), tạm dừng như sheet, đóng khi mua xong; ẩn như trước khi nút Nâng cấp chưa mở. UI thuần, không đổi luật hay số. |
| 2026-10-23 founder 22/10 (Part B2.2 gợi ý đúng lúc) | §9 (ghi chú dated): năm gợi ý một lần cho HUD hiện từ ca 1 (kho bia sắp hết → dải kho; cốc sạch ít → Bồn rửa; bia đang chờ trên mâm → "Bia giữ tươi {s} s…", không ở ca 1; cảnh báo Giờ Vàng đầu → pill rush; lần đầu đủ xu mua bàn → ô bàn trống), gấp nhất trước, một cái một lúc, không chồng spotlight hay step guide. Ngưỡng lấy từ những gì HUD đã dùng; không đổi luật hay số. |
| 2026-10-23 founder 22/10 (Part B2.5 Sổ ca ngắn hơn) | §4.5 (ghi chú dated): trên cùng Thu ròng + một gợi ý có nút, rồi Đã phục vụ · Bỏ đi sau khi ngồi · Không vào được · hết chỗ (cộng đúng bằng "Vì sao khách đi"), nút của ca; phần còn lại (kể cả bảng món, đoạn giải thích, số đo, địa điểm, tiền chi tiết, Giờ Vàng) trong "Chi tiết" đóng sẵn; bảng món ẩn món còn khóa. UI thuần, không đổi luật hay số. |
| 2026-10-23 founder 22/10 (Part B2.6 tổng kết sau Giờ Vàng) | §4.6 (ghi chú dated): thẻ một chạm khi đợt Giờ Vàng kết thúc trong ca đang mở (đến · phục vụ · bỏ đi · boa · thu ròng · so với đợt trước ↑/↓), tạm dừng như sheet, dựng từ sự kiện của đợt, không lưu thêm. UI thuần, không đổi luật hay số. |
| 2026-10-23 founder 22/10 (Part B2.7 Nhập hàng) | §4.3 (ghi chú dated): hai nút phụ mỗi dòng "+10 · giá" và "Đầy kho · giá" với chip giá, nút mờ có một lý do (tràn kho / kho đầy / chưa đủ xu); "+1" chỉ còn khi ví không đủ cho cả hai; dòng món bếp ghi cả tên nguyên liệu lẫn tên món. UI thuần, không đổi luật hay số. |
| 2026-10-23 founder 22/10 (Part B2.8 sân vừa một màn) | §3.1 chốt "playtest quyết" = MỘT MÀN (founder 22/10/2026): 4 cột × 2 hàng ở mọi màn, bàn thu nhỏ theo chỗ còn lại nhưng không dưới 44 px, dải cho bong bóng giữ px; màn ≤ 900 px gọn HUD/quầy/thanh dưới; dòng nghỉ vào dải trên của sân; §4.2 màn ngang ≤ 500 px thanh dưới dính đáy, dải kho thành hàng. Đo scrollHeight 1 262/1 226/1 049 → 844/740/720 (bằng màn). UI thuần, không đổi luật hay số. |
