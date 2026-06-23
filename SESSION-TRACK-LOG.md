# 📋 SESSION TRACK LOG — Trùm Bia Hơi

> Nhật ký phiên làm việc (bản mới, mở lại từ 2026-06-04). Log cũ đã dài → đóng lại, bắt đầu sạch ở đây.
> Mục đích: mỗi session ghi 1 block ngắn — đang ở đâu, làm gì, quyết định gì, việc tiếp theo. Đọc block mới nhất trước khi làm tiếp.

---

## 🧭 Trạng thái dự án (snapshot 2026-06-09)

**Là gì:** Game idle/tycoon **phục vụ khách theo ca** ở quán bia hơi vỉa hè VN, mobile-first web. Mô phỏng & re-skin từ `trumviahe.com` (game gốc trà đá), giữ 5 lớp economy + thêm 2 cơ chế đặc thù (**hệ bàn**, **bia mất hơi**).

**Giai đoạn:** Thiết kế/nghiên cứu **đã xong** (GDD v1.5 ổn). Chưa viết code. Bước kế là **Phase 0 — Prototype**.

**Tài liệu chính (theo thứ tự đọc):**

| File | Vai trò | Trạng thái |
|---|---|---|
| `02-GDD-trum-bia-hoi.md` | **GDD v1.5 — tài liệu nguồn chính** | ✅ ổn định |
| `economy-spec-from-bundle.md` | Hằng số economy trích trực tiếp từ bundle game gốc | ✅ tham chiếu |
| `03-SPEC-he-ban.md` | Spec hệ bàn (đơn vị gameplay chính) | ✅ |
| `04-SPEC-prototype-phase0.md` | Spec prototype Phase 0 (state model + số khởi điểm + cách đo k) | ✅ |
| `05-SPEC-design-uiux.md` | Khung design/UIUX/asset (tokens + wireframe + icon list); sản xuất từ Phase 1 | 🔧 khung |
| `06-ROADMAP-trum-bia-hoi.md` | Roadmap Now/Next/Later (Phase 0–4) + exit gate + phụ thuộc/rủi ro | ✅ |
| `07-SPEC-shop-mua-giai-worldcup.md` | Spec shop mùa giải WC (TV/lịch/theme đội) — Phase 4 | ✅ |
| `01-MAP-tra-da-to-bia-hoi.md` | Mapping trà đá → bia hơi (v0.9) | ✅ tham chiếu |
| `00-TONG-HOP-trumviahe.md` | Tổng hợp nghiên cứu game gốc | ✅ tham chiếu |
| `scripts/measure_k.py` | Đo lại hệ số rescale k (đã verify k≈2.5) | ✅ |
| `uiux-analysis-trumviahe.md`, `design-component-catalog-trumviahe.md`, `research-*` | Phân tích UI/UX + research bổ trợ | ✅ tham chiếu |

**Quyết định nền (🟢 CORE — ổn định):** phục vụ theo ca · 5 lớp economy (unit·throughput·demand-mix·risk·meta) · hệ bàn · bia mất hơi · menu 6 món · server-authoritative (Pixi.js + React).

**Còn là giả định (🟡 PROTOTYPE — đo lại được):** `k=2.5` · số freshness/prep/giá từng cấp · hậu quả mất hơi (MVP dùng bản mềm: tip×0 + uy tín −1) · thời tiết lạnh có lợi cho bia.

**Để sau (🔵 POST-MVP):** league/Life Path/9 mặt bằng đầy đủ · bảo kê/kiểm tra ATTP/trộm · Event World Cup (+API tỉ số) · donation cosmetic-only · xổ số (cần legal review).

---

## ⏭️ Việc tiếp theo (Phase 0 — Prototype, client-only)

Mục tiêu: validate **"feel"** + **đo lại k_value** thực tế. Phạm vi tối thiểu:

- 1 màn quán, **3 bàn**, **bia + 2 mồi tức thì**, **2 mức rush** (thường / cao điểm).
- Cơ chế lõi cần cảm nhận: **freshness cốc** (bia mất hơi), **vòng đời cốc + rửa** (bottleneck), **tip/patience**.
- Đo: k_value thật (xuất phát 2.5), feel mất hơi, feel bàn nhóm, nhịp tay 2 mức rush.

> Chưa nhồi meta/event. Core feel (bàn + mất hơi + economy) phải đúng TRƯỚC.

---

## 🗒️ Nhật ký phiên

### Session 2026-06-11 (18) — Thêm lớp "nhóm/dịp" (biên chế) + khách một mình
- **User:** thêm hội bạn thân/chiến hữu, đồng nghiệp, đám cưới, khách 1 mình…
- **Mô hình hoá (domain-first):** phần lớn là **group composition** (N khách ghép theo skin sẵn), không phải face mới → thêm **`asset-list-designer.md §2.2.2 Nhóm/dịp`**: GA1 hội bạn/chiến hữu · GA2 đồng nghiệp tan ca · GA3 **liên hoan/tiệc mừng** (mô hình hoá "đám cưới" cho thực tế — bàn dài/VIP, nhiều đợt, đơn lớn) · GA4 khách một mình · GA5 cặp đôi · GA6 gia đình (tuỳ chọn). Mỗi nhóm ghi biên chế + hành vi (size/đợt/patience/tip) gắn `03-SPEC-he-ban.md` + demand-mix §7.
- **Asset mới THẬT SỰ cần (chỉ 2):** `customer-skin-solo` (C20, khách một mình, P2) → subtotal skin 19→**20 (~60 sprites)**; `prop-celebration` (#153, hoa/băng rôn generic, P3) → §7 9→**10 sprites**. Còn lại tái dùng skin.
- **Việc kế:** Phase 1 — wireframe HUD; gen skin/prop theo scope. (Biên chế nhóm thực thi ở hệ bàn, không phải việc asset.)

### Session 2026-06-11 (17) — Chốt roster khách: GIỮ tất cả + thêm sếp bao mâm
- **User chốt:** giữ **toàn bộ** nhóm khách (trụ cột + theo dịp/quan hệ + đặc thù), **gồm cả `pickleball` (C03) và `aunties` (C07)** — đảo lại đề xuất bỏ pickleball ở Session (16).
- **Sửa `asset-list-designer.md §2.2.1`:** (a) thêm **C19 `customer-skin-boss-host`** = sếp bao mâm/đại gia tiếp khách → `customer-vip` (P1) — skin VIP iconic nhất, trước đây thiếu; (b) cập nhật subtotal 18→**19 skin (~57 sprites)**, P1 6→7 skin; (c) thêm box **"Ngoại lệ chủ ý"**: pickleball + nữ giới uống bia được GIỮ (stylized hoài niệm, không strict-realism), không bị §0.3.C ràng "đồ vật 2000s".
- **Roster khách đầy đủ (gameplay type → skin):** thường(normal/công nhân) · vội(office/runner/cyclist) · VIP(**sếp bao mâm** ⭐/tourist/foodie) · Chí Phèo(3 kiểu say) · lai rai(bợm quen/hưu trí/chị em) · shipper · cổ vũ bóng đá(fan/ultra) + thể thao(runner/cầu lông/**pickleball**).
- **Việc kế:** Phase 1 — wireframe HUD theo token + era; gen skin theo scope P1/P2/P4.

### Session 2026-06-11 (16) — Áp "chuẩn thời đại 2000s" cho toàn bộ asset
- **Yêu cầu (user):** icon/asset/item của MỌI feature cũng phải mang vibe 2000s (không chỉ màu).
- **Cách làm (1 lớp dùng chung, không drift):** thêm **`asset-list-designer.md §0.3 Chuẩn thời đại 2000s`** — (A) cảm giác chung, (B) **bảng tra hình thái 2000s** (cốc vại thuỷ tinh dày · bom nhôm/vòi đồng · bàn inox tròn + ghế nhựa đỏ thấp · **TV bầu CRT** · **ĐT cục gạch phím bấm** · **xe Dream/Wave** · biển tôn sơn tay/neon ống · sổ giấy + bàn tính · vé số giấy · quạt cây/đèn tuýp/phích Rạng Đông/mẹt tre · trang phục sơ mi-ba lỗ-dép tổ ong · AI = loa phường), (C) **blocklist** đồ hiện đại (smartphone, màn phẳng, xe ga, LED dây, logo thật, POS, QR-thẻ bóng), (D) **`{era_modifier}` append vào mọi prompt**. Thêm dòng nhắc 🕰️ ở đầu §1.
- **Ngoại lệ:** icon meta thuần (payment/session/AI/leaderboard) ưu tiên rõ chức năng + palette/pixel của bộ; chỉ khoác vỏ hoài niệm khi được (QR = giấy dán).
- **⚠️ Phát hiện anachronism:** skin `customer-skin-pickleball` (C03) — pickleball phổ biến ở VN ~2020s, KHÔNG hợp 2000s. Đề xuất đổi sang đá cầu / bóng bàn / tennis bình dân. Chưa sửa, chờ user quyết.
- **Việc kế:** user quyết vụ pickleball; Phase 1 vẫn là wireframe HUD theo token + era này.

### Session 2026-06-11 (15) — Thống nhất design tokens (vibe bia hơi 2000s)
- **Vấn đề:** 3 nguồn token lệch nhau (05 §2.1 `#f6a623` · asset-list §0.1 `#f6a623` · F24 §1 `#f2a51a`; bọt/ghế/panel cũng khác) → vẽ asset & code sẽ không khớp.
- **Quyết định (user):** vibe **2000s bia hơi đời thật** — **nền mặc định nắng gắt**, tông từng ca đổi theo thời tiết (tan tầm/mưa phùn…) qua overlay; **panel nâu ấm hoài niệm** (đổi từ navy-tím lạnh).
- **Làm:** tạo **`docs/design-tokens.md` v1.0 = nguồn sự thật DUY NHẤT** — palette semantic (brand/surface/chức năng/trạng thái cốc), bộ overlay thời tiết §4 (sunny/hot/humid/rain/cold/**evening tan tầm**), typography, spacing, `tokens.ts`, palette AI-gen, bảng mapping cũ→mới. Hex chốt: `beerAmber #eaa31a`, `beerFoam #fff3d2`, `stoolRed #de4126`, `inox #c4cecb`, `streetBg #f1d585`, `panel #3a2a1c`, `danger #d23a2a`…
- **Trỏ về 1 nguồn:** sửa 05 §2.1, asset-list §0.1 (+ global prompt prefix), F24 §1 — bỏ định nghĩa hex cục bộ, trỏ `design-tokens.md`. **KHÔNG đụng** `design-component-catalog`/`uiux-analysis` (tư liệu màu game gốc trà đá) và `prototype/src/index.css` (placeholder P0, 04 §2).
- **Verify:** grep rộng — không còn hex cũ (`#f6a623/#f2a51a/#1e1e3f/#e94545/#df3f32/#fff4d6/#fff5d6/#7bd88f/#f6d98f`…) trong 3 file spec; cả 3 đều link `design-tokens.md`.
- **Việc kế:** Phase 1 — vẽ wireframe màn HUD chính theo token mới; chốt type scale chi tiết; (song song) tiếp tục đo k/feel ở prototype.

### Session 2026-06-11 (14) — Fix bug "tap bị nuốt" (phải bấm nút phục vụ vài lần)
- **Triệu chứng (user báo):** bấm nút PHỤC VỤ không ăn ngay, phải bấm vài lần mới được (áp cả nút VÒI/BỒN).
- **Nguyên nhân:** mỗi 100ms `render()` `removeChildren()+destroy()` rồi tạo lại MỌI container Pixi. Pixi tính `pointertap` = pointerdown+pointerup trên CÙNG object; nếu một frame dựng lại chen vào giữa down/up, object nhận down bị huỷ → tap không kích hoạt → cú bấm bị nuốt (ăn may mới trúng).
- **Sửa (`GameView.ts`):** chuyển từ handler gắn per-object sang **một handler cố định trên `stage`** (stage không bị huỷ giữa các frame) + hit-test theo toạ độ. Thêm `HitRegion[] hitRegions` (reset mỗi frame trong `render()`), helper `registerHit(x,y,w,h,onTap)`; 3 chỗ bàn/vòi/bồn đăng ký vùng thay cho `c.on('pointertap')`. Topmost = vùng đăng ký sau thắng.
- **Verify:** `tsc --noEmit` pass (exit 0). Không đụng engine/đo k.
- **Việc kế:** như cũ — chơi tay đo k thật + 4 feel (04 §6); tune demand-mix 🟡.

### Session 2026-06-11 (13) — Fix bug treo game khi chơi tay
- **Triệu chứng (user báo):** đang chơi `npm run dev` thì game đứng hình (đồng hồ, spawn, mọi thứ dừng), xảy ra sau khi phục vụ thu tiền.
- **Nguyên nhân:** floating text "+xu" giữ object Pixi `Text` qua nhiều frame. `GameView.render()` đầu mỗi frame `removeChildren()+destroy()` cả stage → huỷ luôn chữ bay frame trước; ngay sau đó `tickFloaters()` chạm vào object đã destroy (`f.text.y`/`.alpha`) → Pixi v8 ném lỗi → văng khỏi `loop()` trước khi gọi lại `requestAnimationFrame` → cả vòng game chết. Trigger ngay khi có +xu (lúc đó mới sinh chữ bay).
- **Sửa:** (a) `GameView.ts` — `FloatingText` đổi thành **data thuần** (`msg/color/x/baseY/startAt/duration`); thay `tickFloaters` bằng `drawFloaters` vẽ Text MỚI mỗi frame, không giữ object qua frame → hết use-after-destroy. (b) `App.tsx` — bọc `engine.tick`+`view.render` trong `try/catch` để lỗi lẻ chỉ log Console, không treo game.
- **Verify:** `tsc --noEmit` pass (exit 0). Phương pháp đo k (04 §5) không đụng tới; chỉ sửa lớp render + an toàn loop.
- **Việc kế:** không đổi — chơi tay nhiều ca đo k thật + 4 feel còn lại (04 §6); tune demand-mix 🟡 cho khớp economy-spec.

### Session 2026-06-11 (12) — Chốt stack + scaffold prototype Phase 0 ✅ (bắt đầu code)
- **Chốt stack (user quyết):** Vite + React + Pixi.js v8 — đúng đích GDD, không viết lại khi sang Phase 1. Code ở **`prototype/`**.
- Scaffold đủ theo `04-SPEC` §3/§4/§5: engine thuần TS (không phụ thuộc DOM — chạy cả UI lẫn headless), 3 bàn × 2 ghế, bia + lạc + nem, freshness 12s/cờ vàng 9s, 10 cốc + rửa 1×7s (nút nâng 3×2.5s), tip/patience, 2 rush, serve theo Order cấp bàn (03 §4/§10), log ServeEvent + bảng đo k in-game. Art placeholder thuần (04 §2). User bổ sung: design tokens `index.css`, auto rót/rửa toggle (default BẬT).
- **Verify:** `tsc` + `vite build` pass · headless sim `npm run sim` 506 lượt (seed 20260611) chạy đúng pipeline đo k · test riêng nhánh stale (giao >12s → payment giữ, tip ×0) pass.
- **Số đầu tiên (bot tối ưu, demand-mix 🟡 tự giả định P_MOI=0.6):** k = **1.63** — DƯỚI band 2.0–3.0 → demand-mix hiện tại chưa đủ giàu (134 xu/lượt vs giả định 207). Việc chỉnh: đối chiếu demand-mix với `economy-spec-from-bundle.md` §3, tăng P_MOI/nem/đợt gọi — chỉnh số 🟡 trong `prototype/src/engine/constants.ts`, KHÔNG chỉnh phương pháp đo.
- **Việc kế:** chơi tay nhiều ca (`npm run dev`) đo k thật + 4 feel còn lại (04 §6), ghi vào `RESEARCH-LOG-live-play.md`; tune demand-mix cho khớp economy-spec.

### Session 2026-06-11 (11) — Vá feature docs + thêm onboarding/payment
- User yêu cầu vá các điểm audit và thêm 3 feature: chọn ngôn ngữ `en/vi`, tài khoản/Google login để lưu tiến trình, và thanh toán để chơi hết session trong ngày (free 1 session/ngày).
- Vá docs hiện có: `F23` thêm `idempotencyKey` vào `serve-order` contract + endpoints auth/payment; `F14` thêm cột `e rent index` để tính rent; tracker F24 trỏ thêm production supplement; roadmap F21/F22 đổi thành có spec nhưng vẫn gated bởi legal/feasibility.
- Tạo **`docs/features/F25-localization-account.md`**: first-run locale `vi/en`, guest play, Google login, guest migration, leaderboard/payment prompts, i18n fallback.
- Tạo **`docs/features/F26-daily-session-pass-payments.md`**: free 1 session/ngày, paid Session Pass unlock normal daily cap, server-side entitlement/payment webhook, không bán xu/power/hạng trực tiếp.
- Cập nhật **GDD v1.5**, **roadmap v2.4**, tracker **v0.3.0**, `docs/features/README.md`; tổng feature hiện là **26**.
- Rebuild dashboard OK: **26 PRs, 5 phases**, code vẫn 0%.
- **Việc kế:** chốt stack + scaffold Phase 0; với production launch cần sớm chốt provider/thanh toán/giá Session Pass.

### Session 2026-06-11 (10) — Viết bộ feature specs còn thiếu
- User hỏi feature docs đã đủ chưa, rồi yêu cầu viết hết phần còn thiếu.
- Tạo folder **`docs/features/`** với index `README.md` và bộ spec triển khai cho các feature chưa có doc riêng: **F07-F24** (Customer Types, Rush full, Weather, Upgrades, Kitchen, League/Seasons, Life Path, Locations, Risk Events, Referral/Badges, Quest, Dog/Guard, World Cup Event, Donation, Lottery, AI Assistant, Server Architecture, Design/UI production supplement). Riêng F19 trỏ thêm `07-SPEC-shop-mua-giai-worldcup.md` đã có.
- Cập nhật `05-SPEC-design-uiux.md` để trỏ sang supplement `docs/features/F24-design-uiux-production.md`.
- Cập nhật `06-ROADMAP` v2.3 và `docs/implementation-tracker` v0.2.0: gắn đường dẫn spec mới, giữ toàn bộ status code là ⬜.
- **Việc kế:** chốt stack + scaffold Phase 0; specs sau Phase 0 đã sẵn, nhưng vẫn chờ playtest/phase gate trước khi code.

### Session 2026-06-11 (9) — Thêm item shop mùa World Cup (GDD §14)
- User yêu cầu thêm 2 item: **mua lịch thi đấu** + **mua theme đội tuyển** WC năm nay, pricing hợp lý.
- Chốt với user: thanh toán bằng **xu in-game**, theme **trang trí nhẹ** (cờ/đèn/biển re-hue) → currency-sink thuần, **không pay-to-win**.
- Xác minh WC2026: 11/6–19/7/2026, **48 đội** (Mỹ/Mexico/Canada đăng cai) → danh sách theme để **động/server-driven**, không hardcode.
- Sửa **GDD v1.4 §14**: "3 trụ"→"4 trụ"; lịch = booster bằng xu **~15k×k** (hiện lịch HUD + cổ vũ spawn ×1.15/mùa); **theme đội** = cosmetic mua xu **~8k×k/đội** sở hữu vĩnh viễn, combo 6 đội **~36k×k −25%**. Thêm bảng **§14.0 Shop mùa giải** (neo theo trần 500k/ngày: TV ¼ ngày, lịch 7,5%, theme 4%). Note IP: bảng màu+biệt danh nhại, tránh huy hiệu/logo. §16 thêm ghi chú cosmetic đến từ cả xu lẫn donation.
- Đồng bộ **06-ROADMAP v2.2**: F19 thêm shop mùa giải; Monetization thêm nguyên tắc cosmetic-mua-bằng-xu = sink.
- Tạo **`07-SPEC-shop-mua-giai-worldcup.md` v0.1** (sub-spec triển khai Phase 4): domain model item/ownership (TS), state machine item hạn-mùa + theme vĩnh viễn, flow mua server-authoritative + validate, bundle 6 đội −25%, theme re-hue layer (ranh giới cosmetic cứng), danh sách đội động.
- Grep-verify: ✅ không còn "3 trụ"; bảng §14.0 + 4 trụ nhất quán; changelog GDD/roadmap append đúng.
- **Việc kế:** không đổi — chốt stack + scaffold Phase 0 (item WC thuộc Phase 4, chỉ là spec).

### Session 2026-06-09 (8) — Port dashboard-engine từ MyMoneyWent
- Port **nguyên pipeline** `build_dashboard.py` + `scripts/dashboard/*` + `work_state/*` sang `tools/dashboard-engine/`.
- Tạo `docs/implementation-tracker.md` (24 feature F01–F24 theo schema PR-row của MMW, group Phase 0–4, toàn ⬜ pre-code) làm input.
- Adapt: path (ROADMAP→`06`, TRACKED_DOCS→GDD+SPEC, PHASE_DATES Phase 0–4), branding MMW→Trùm Bia Hơi, shim `datetime.UTC`→`timezone.utc` (sandbox py3.10).
- **Build OK:** sinh `docs/dashboard.{html,md,json}` (24 PRs, 5 phases, MVP 0% — đúng vì chưa code). HTML self-contained + auto-refresh 60s.
- **Tầng realtime (git-reconcile/CI/serve/SHA-poll) no-op** tới khi có git repo → việc Phase 1. Features tab trống (roadmap heading khác format) — gap ghi trong `tools/dashboard-engine/README.md`.
- **Việc kế:** không đổi — chốt stack + scaffold Phase 0.

### Session 2026-06-09 (7) — Audit roadmap v2.0
- Review `06-ROADMAP-trum-bia-hoi.md`: cấu trúc tổng thể ổn (Now/Next/Later, 24 feature module, KPI, dependency map, playtest plan, rủi ro).
- Sửa nhỏ thành **v2.1**: MAP v0.8→v0.9; làm rõ Phase 0 chỉ code + design khung/placeholder; F08 rush chia đúng P0/P1/P2; F23/R3 server chia "server tối thiểu" vs "server-authoritative đầy đủ"; bỏ link `file://` trong spec ref.
- **Việc kế:** chốt stack Phase 0 → scaffold prototype.

### Session 2026-06-09 (6) — Review roadmap v2.0 (user tự update)
- User viết lại roadmap thành **v2.0** (feature table 24 mục, KPI/phase, timeline, mermaid, playtest plan, monetization). Mình audit số liệu: **khớp GDD** hết (rush 90s/150s, 2 mùa, LP0–LP7, 7 nhánh quest, 9 mặt bằng, trần 500k...).
- **Quyết định nền:** dự án **có team** (xác nhận) → bỏ giả định solo; 4 track song song hợp lệ. Đã cập nhật memory.
- Thêm 2 ghi chú vào `06`: (1) cột "Spec ✅" = đã thiết kế trong GDD ≠ sẵn sàng code (chỉ F01–F06/F08/F03/F24 có spec triển khai); (2) KPI là benchmark provisional, chưa neo GDD.
- **Việc kế:** không đổi — chốt stack + scaffold Phase 0 (NOW).

### Session 2026-06-09 (5) — Tạo roadmap
- Tạo `06-ROADMAP-trum-bia-hoi.md` v0.1 — dùng template chuẩn **Now/Next/Later** (skill PM roadmap; không có folder pj khác để lấy template trực tiếp), ánh xạ Phase 0–4 từ GDD §19.
- Thêm cho mỗi phase: outcome, exit gate, phụ thuộc; design track gắn vào Phase 1; bảng rủi ro xuyên suốt; lưu ý solo dev → phase tuần tự.
- **Việc kế:** vẫn là chốt stack + scaffold Phase 0 (NOW).

### Session 2026-06-09 (4) — Mảng design/UIUX
- (a) Thêm note vào `04-SPEC` v0.2: Phase 0 dùng **placeholder art**, không design/icon thật (tránh làm lệch đo feel).
- (b) Tạo `05-SPEC-design-uiux.md` v0.1 — **khung** design: tokens (màu/font/spacing từ GDD §17), layout HUD + component/state (từ `uiux-analysis`), **asset/icon list đếm được** (sprite bàn/thiết bị/khách/cốc + icon HUD + món + cosmetic). Phân nhãn ✅ đã chốt / 🔧 cần làm / 📐 cần wireframe. **Sản xuất bắt đầu ở Phase 1**, không phải bây giờ.
- **Việc kế:** vẫn ưu tiên chốt stack + scaffold Phase 0 (design chờ Phase 1).

### Session 2026-06-09 (3) — Audit docs sau spec Phase 0
- Rà lại toàn bộ docs sau khi có `04-SPEC-prototype-phase0.md`; phát hiện các bản tóm tắt Phase 0 cũ vẫn ghi **2–3 bàn / 1 mức rush** trong khi spec mới chốt **3 bàn / 2 mức rush**.
- Đồng bộ `SESSION-TRACK-LOG`, `02-GDD-trum-bia-hoi.md`, `01-MAP-tra-da-to-bia-hoi.md`, `03-SPEC-he-ban.md`; cập nhật export `economy-spec-from-bundle.html` từ markdown nguồn để chứa đính chính buy-cap/storage-cap.
- **Việc kế:** duyệt spec Phase 0 → chốt stack thực thi (Pixi+React vs canvas thuần) → scaffold loop + log.

### Session 2026-06-09 (2) — Viết spec Phase 0
- Chốt hướng: **viết spec prototype trước khi code**. Tạo `04-SPEC-prototype-phase0.md` v0.1.
- Nội dung: mục tiêu (5 câu hỏi), phạm vi in/out (3 bàn, bia+2 mồi tức thì, 2 rush, client-only), state model tối thiểu, số khởi điểm bám GDD v1.3 + economy-spec, **phương pháp đo k bất biến** (`k = DT_bia_mỗi_lượt / 82.5`), tiêu chí pass/fail gate sang Phase 1.
- **Việc kế:** duyệt spec → chốt stack thực thi (Pixi+React vs canvas thuần) → scaffold loop + log.

### Session 2026-06-09 (1) — Đồng bộ docs theo GDD v1.3
- **Audit toàn bộ docs**: phát hiện 2 chỗ lệch sau đợt nâng GDD v1.3 + refresh `economy-spec`/`uiux` (08-06).
- Sửa `SESSION-TRACK-LOG`: snapshot 06-04→06-09; GDD v1.2→**v1.3**; MAP v0.7→**v0.8** (cả phần Trạng thái + bảng tài liệu chính).
- Sửa `design-component-catalog` dòng "ly (cup, max 12)" → **mua tối đa 10 + kho 20** (đính chính theo GDD v1.3 §4; số "12" cũ = 10 mua + 2 cốc Chủ tịch tặng).
- Đã grep-verify: không còn ref "v1.2"/"v0.7"/"max 12" sai sót ngoài 2 dòng changelog lịch sử (giữ nguyên, append-only).
- **Việc kế:** vẫn là khởi động prototype Phase 0 (chốt stack + scaffold 1 màn 2–3 bàn).

### Session 2026-06-04 — Reset track log
- Đóng log cũ (đã quá dài), mở log mới này.
- Re-orient: rà toàn bộ tài liệu, xác nhận GDD v1.2 là nguồn chính, dự án đang ở ngưỡng Phase 0.
- **Việc kế:** khởi động prototype Phase 0 (chốt stack cụ thể + scaffold 1 màn 2–3 bàn).

<!-- THÊM SESSION MỚI Ở TRÊN block này, đầu danh sách. Format:
### Session YYYY-MM-DD — <tiêu đề ngắn>
- Làm gì / quyết định gì
- Việc kế
-->
