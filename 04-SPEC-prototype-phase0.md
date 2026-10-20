# 🧪 SPEC — Prototype Phase 0 (client-only) — Trùm Bia Hơi

> ⚠️ **LƯU TRỮ (chốt founder 09/09).** Prototype Phase 0 **không còn là điểm xuất phát** của game: `prototype/` giữ lại như bản thử nghiệm đã hoàn thành nhiệm vụ (đo được k = 2.24–2.34), dev **không** kế thừa code/layout/màn hình của nó. Phần **duy nhất còn ràng buộc là §5 — cách đo k** (`k = mean(payment + tip) / 82.5`, throughput không vào k).
>
> Spec tối thiểu để dựng prototype validate **"feel"** và **đo lại `k_value`** trước khi cam kết stack/scope đầy đủ. Nguồn số: `02-GDD-trum-bia-hoi.md` (v1.3) §2/§3/§4/§6/§7/§8 + `economy-spec-from-bundle.md` §3/§4 + `03-SPEC-he-ban.md`. **GDD vẫn là nguồn sự thật**; doc này chỉ cụ thể hóa con số khởi điểm cho prototype.
> Ngày: 2026-06-09. Nhãn: 🟢 CORE = không đổi trong Phase 0 · 🟡 = số khởi điểm, **được phép chỉnh khi đo**.

---

## 1. Mục tiêu — câu hỏi prototype phải trả lời

1. **`k_value` thật là bao nhiêu?** Giả định 2.5; đo `DT_bia_mỗi_lượt` thực rồi tính `k = DT_bia_mỗi_lượt / 82.5`. Chấp nhận 2.0–3.0 cho profile chuẩn cold-menu/full-menu; profile career nâng cao theo §5.
2. **Bia mất hơi có "feel" đúng không?** Base 12s có tạo căng thẳng "rót đúng nhịp, đừng tích cốc" mà không phạt oan?
3. **Bàn nhóm có "feel" đúng không?** Phục vụ theo bàn (nhiều khách/đợt) sướng hay rối?
4. **Nhịp tay ở 2 mức rush** có đủ dồn dập mà không quá tải?
5. **Bottleneck cốc (vòng đời + rửa)** có đúng là điểm nghẽn chính như thiết kế?

> Prototype **không** nhằm vui/đẹp/đầy đủ. Chỉ cần đủ để cảm 5 thứ trên + log số để đo.

---

## 2. Phạm vi

**TRONG (build):** 1 màn quán · **3 bàn** (2 ghế/bàn = 6 chỗ) · menu **3 món**: bia + 2 mồi (lạc, nem chua — đều prep tức thì để khỏi cần hệ Bếp) · **freshness cốc** · **vòng đời cốc + rửa** · **tip/patience** · **2 mức rush** (thường / cao điểm) · log đo.

**NGOÀI (Phase 0 không làm):** meta (uy tín dài hạn, league, Life Path, mặt bằng) · sự kiện (World Cup, xổ số) · risk (bảo kê, kiểm tra ATTP) · Bếp + 3 mồi nóng · shipper · biển hiệu/cosmetic · server (chạy client-only, không persist) · Chí Phèo & quà cốc (giữ buy-cap 10 cố định, bỏ cơ chế tặng).

> ⚠️ **Design/UIUX/icon — KHÔNG làm ở Phase 0 (cố ý).** Prototype chỉ đo *feel* + *k_value*; art đẹp sẽ làm lệch đánh giá "core có vui không". Dùng **placeholder thuần**: hình hộp/vòng tròn màu, emoji (🍺 cốc bia · 🥜 lạc · 🍢 nem · 🔴 cờ vàng mất hơi đổi sang ⚠️), text nhãn, không sprite/animation chỉn chu. Màu chỉ cần phân biệt trạng thái (clean/dirty/in_use, fresh/cảnh báo/hết hơi). Design tokens + asset/icon thật bắt đầu ở Phase 1 — xem `05-SPEC-design-uiux.md`.

---

## 3. State model tối thiểu 🟢

```ts
type Dish = 'bia' | 'lac' | 'nem'

type Glass = { id: string; state: 'clean' | 'in_use' | 'dirty' | 'washing' }

type OrderItem = {
  dish: Dish
  customerId: string
  needsGlass: boolean          // chỉ 'bia' = true
  glassId?: string             // gán khi rót
  pouredAt?: number            // mốc bắt đầu đếm freshness (chỉ bia)
  state: 'pending' | 'ready' | 'served'
}

type Customer = {
  id: string
  type: 'thuong' | 'voi' | 'vip'   // Phase 0 chỉ 3 loại
  tableId: string
  seatIndex: number
  state: 'waiting' | 'ordered' | 'served' | 'enjoying' | 'left'
  patienceMs: number; maxPatienceMs: number
  payment: number; tip: number
}

type Table = {
  id: string
  seats: (Customer | null)[]       // 2 ghế
  orders: OrderItem[]              // gom item của các khách trong bàn
}

type World = {
  coins: number
  glasses: Glass[]                 // tối đa 10 (buy-cap), Phase 0 cố định
  tables: Table[]                  // 3 bàn
  queue: Customer[]                // hàng đợi
  shift: { elapsedMs: number; rush: 'normal' | 'peak' }
  log: ServeEvent[]                // §5 đo k
}
```

Vòng đời cốc 🟢: `clean → in_use → dirty → washing → clean`.
State machine khách 🟢: `waiting → ordered → (rót/làm mồi) → served → enjoying → left`. Hết patience trước `served` → `left` (mất khách).

---

## 4. Số khởi điểm 🟡 (đều chỉnh được khi đo)

**Menu (xu — giữ nguyên GDD §2):**

| Món | Giá bán | Vốn sỉ | Lời/đv | Cần cốc | Prep |
|---|--:|--:|--:|:--:|---|
| Bia hơi | 50 | 10 | 40 | ✅ | rót 3.000ms |
| Lạc | 75 | 26 | 49 | ❌ | tức thì |
| Nem chua | 150 | 60 | 90 | ❌ | tức thì |

**Spawn & patience (economy-spec §3):**
- Spawn base: **10.500ms/khách**; lượt đầu ca ×1.6 = **16.800ms** (warmup).
- Patience base: **18.000ms** (khách thường). VIP/vội ×0.611 = **~11.000ms**.
- Enjoy time (giữ ghế sau khi served): random **5.000–10.000ms**.

**Throughput (GDD §4):**
- Cốc: **10 cái** clean lúc mở ca (buy-cap, Phase 0 cố định, không tặng).
- Rửa cốc: khởi điểm **1 slot, wash 7.000ms** (cấp thấp nhất → để cốc là bottleneck rõ; có nút "nâng rửa" giả lập 3 slot × 2.500ms để test feel khi gỡ nghẽn).
- Rót bia: 1 vòi, 3.000ms/cốc.

**Freshness — bia mất hơi (GDD §6, MVP mềm):**
- Base **12.000ms** kể từ `pouredAt`.
- Cảnh báo "cờ vàng" ở ~9.000ms (75%).
- Quá hạn khi phục vụ: **tip ×0**, vẫn thu payment (MVP mềm). Phase 0 bỏ giảm uy tín (chưa có meta).

**Tip (GDD §8):**
- Nếu `patience/maxPatience < 0.6` → tip 0; ngược lại `round(payment × 0.3)`.
- ×freshness (0 nếu cốc hết hơi) ×type (VIP ×10).
- Bỏ ×rush/×weather/×QR/×well-rested ở Phase 0 (giữ công thức tối giản).

**Rush:**
- `normal`: spawn ×1.0.
- `peak`: spawn interval ×0.66 (≈ dồn 1.5×), bật bằng nút để cảm nhịp tay; chưa cần lịch tự động.

**Loại khách (weight, GDD §7):** thường 1.0 · vội 0.3 · VIP 0.1. (Bỏ Chí Phèo/ngồi lỳ/shipper.)

---

## 5. Cách đo `k_value` 🟢 (bất biến phương pháp)

Mỗi lần một khách **served** (trả tiền), ghi 1 `ServeEvent`:

```ts
type ServeEvent = {
  t: number
  customerType: string
  dishes: Dish[]
  payment: number      // chưa gồm tip
  tip: number
  hadMoi: boolean      // có gọi kèm mồi không
}
```

Sau N lượt (mục tiêu ≥ 500 lượt mô phỏng hoặc gộp nhiều ca):
- `DT_bia_mỗi_lượt = mean(payment + tip)` trên tất cả lượt.
- **`k = DT_bia_mỗi_lượt / 82.5`** (82.5 = giá trị/lượt trà đá gốc — hằng số neo, KHÔNG đổi).
- Đối chiếu giả định 207 xu/lượt → 2.5.

**Bất biến tuyệt đối (GDD §3):** throughput (số bàn, bàn gọi nhiều đợt, tốc độ thiết bị) **không bao giờ** cộng vào k — nó chỉ là đòn bẩy giúp chạm trần nhanh hơn. k chỉ tính từ **giá trị/lượt**, không từ tốc độ.

### Phạm vi band — quyết định owner 2026-09-10

- **Profile chuẩn cold-menu/full-menu:** giữ band **2.0–3.0** và gate `npm run sim` hiện hành.
- **Advanced-progression:** career từ game mới **≥30 ngày**, đạt **LP4 trở lên**, có các hệ số thưởng meta kiếm được qua lệnh thật. k được phép vượt 3.0; **soft cap k ≤3.5** là gate tự động, không phải giới hạn/clamp thu nhập trong gameplay.
- `npm run sim:career:gate` (cũng nằm trong `npm run verify`) chạy **hai seed 42/99, 30 ngày mỗi seed**. Từng seed phải đạt LP4 và có ≥500 lượt phục vụ. Dùng `serveValueStats` trên **toàn bộ lượt của career**, không lấy trung bình k theo ngày, không bỏ các ngày/seed cao và không trộn throughput. Mỗi seed phải ≤3.5; không lấy trung bình giữa hai seed để bù một seed vượt trần.
- Hai phép đo đã xác minh: seed42 **3.483282**, seed99 **3.318249** → PASS theo quy tắc mới. **Không chỉnh bất kỳ số kinh tế nào**; anchor82.5 và band chuẩn trong JSON giữ nguyên.
- **Re-evaluate after Alpha playtest with real player data.** Theo dõi lạm phát endgame bằng **báo cáo faucet/sink 7 ngày** (nguồn xu vào/ra và thay đổi số dư), không dùng k làm chỉ báo lạm phát. Gate này không chứng nhận toàn bộ LP0–LP7 hay cảm nhận của người chơi.

### Gate career từ config 2.1.0 — đơn chuẩn (D4a, S5 `eco21-balance-pass`, 2026-10-20)

Từ config **2.1.0** `npm run sim:career:gate` không đọc k quan sát của cả career mà đọc k của **đơn chuẩn** (bia + mồi đầu tiên); config ≤ 2.0.x giữ định nghĩa cũ ở trên (k quan sát ≤ 3,5). **Phương pháp k không đổi** — `k = mean(payment + tip) / 82,5` trên các lượt phục vụ của toàn career, không trung bình k theo ngày, không bỏ seed, không trộn throughput; chỉ đổi *lượt nào* và *giá trị nào* của lượt đó vào phép đo:

- Mỗi lệnh `serve` được đo **ngay trước khi gửi**, trong đúng trạng thái engine sẽ trả tiền (thời tiết, rush, QR, hệ số mặt bằng, độ tươi của cốc lúc đó): mỗi khách của bàn được tính lại bằng chính `customerValue` của engine trên một bản sao của đơn chỉ giữ **hai món đầu của khách đó** (bia + mồi đầu; khách bàn 1 ghế chỉ có 1 món, giữ nguyên) và **hệ số tip bàn = 1** (không ×1,25 của Lv4). Không code lại giá hay tỉ lệ nào (`packages/engine/sim/normalised.ts`).
- Lượt thuộc **đợt gọi thêm** của bàn Lv2+ (`extraRounds`; số đợt cơ bản của nhóm = `group.rounds − extraRounds`) **không được tính**.
- Ba đòn bẩy thưởng — mồi thứ hai (Lv3 `pExtraMoi`), đợt thêm (Lv2), tip bàn VIP (Lv4) — cùng loại "lai rai" (GDD §3): vẫn vào thu nhập thật và vào k quan sát in trong báo cáo (`value`), chỉ không vào gate.
- **Gate thứ hai:** tổng giá trị 30 ngày của các đơn chuẩn ≤ **+10 % của 8,35 tr** (baseline 2.0.x) = 9 185 000 xu, mỗi seed. Giá trị thô (kèm đòn bẩy thưởng) được in cạnh. Đo trên đơn chuẩn vì ở dạng thô gate không thể đồng thời đạt với acceptance của chính S5: LP7 đòi lifetime 5 tr (2 tr base × k), thiết bị max + 8 bàn Lv4 ≈ 5,5 tr tiền mua và trần ngày 1 tr/ngày — một career 21 ngày kiếm >15 tr thô là bắt buộc, không phải lạm phát của đòn bẩy thưởng.
- Mỗi seed (42, 99) tự đạt: ≥ 30 ngày, LP4 trở lên, ≥ 500 lượt chuẩn, k chuẩn ≤ 3,5 và tổng ≤ 9 185 000; không lấy trung bình hai seed.
- Hồ sơ chuẩn `npm run sim` / `sim:onboarding` / `sim:rush` chạy trên **quán đầu đã đủ đồ** (4 bàn × 2 ghế, ví khởi đầu): quán mới 1 bàn 1 ghế (S1) và nhịp khách ×4 (S3) không đủ 1000 lượt trong ngân sách mẫu. Đổi kịch bản, không đổi cách đo.
- Bot career v4 (chính sách đo, không phải luật chơi): **mua rẻ nhất trước** (PLAN §9), thuê thẳng mặt bằng tốt nhất mà Đường Lên Trùm cho phép và ví trả nổi, ca 2–3 không chờ thể lực (D8), bắt đầu ở nửa đêm VN đầu tiên của một mùa 21 ngày (yêu cầu `peak:` đọc thu nhập của cửa sổ mùa hiện tại nên career bắt đầu giữa mùa sẽ đo lịch chứ không đo economy).

In ra cuối mỗi ca: số lượt, DT_bia_mỗi_lượt, k suy ra, % lượt có mồi, % cốc hết hơi, số khách bỏ đi.

---

## 6. Tiêu chí pass / fail (gate sang Phase 1)

| Hạng mục | PASS khi | Tín hiệu cần chỉnh |
|---|---|---|
| k_value | profile chuẩn cold-menu/full-menu ổn định trong **2.0–3.0**; advanced career theo soft cap §5 | lệch xa → cập nhật k (chỉnh số, không chỉnh phương pháp) |
| Mất hơi | người chơi **chủ động giãn nhịp rót**, hiếm phạt oan nhờ cờ vàng | luôn dính phạt dù chơi tốt → tăng base 12s; không bao giờ dính → giảm |
| Bàn nhóm | phục vụ theo bàn **rõ ràng, không rối** thao tác | rối → xem lại gom Order/UI mức bàn (`03-SPEC-he-ban.md`) |
| Bottleneck cốc | cốc/rửa **là** điểm nghẽn cảm nhận được; nâng rửa thấy đỡ ngay | không thấy nghẽn → giảm cốc hoặc tăng wash time |
| Nhịp 2 rush | `peak` dồn dập mà vẫn xử được | quá tải/quá nhạt → chỉnh hệ số spawn |

---

## 7. Việc kế (sau khi spec này được duyệt)

1. **Chốt stack thực thi** cho prototype (Pixi+React đúng đích GDD, hay canvas thuần để lặp nhanh — quyết định riêng).
2. Scaffold theo §3 state model: vòng đời cốc + spawn + serve loop + log §5.
3. Chạy nhiều ca, thu log, điền số thật vào §6, cập nhật `k` trong GDD §3 nếu lệch.
4. Ghi kết quả vào `RESEARCH-LOG-live-play.md` / `SESSION-TRACK-LOG.md`.

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|---|---|
| v0.1 | Bản đầu: mục tiêu, phạm vi in/out, state model tối thiểu, số khởi điểm (bám GDD v1.3 §2/§3/§4/§6/§7/§8 + economy-spec §3), phương pháp đo k (bất biến), tiêu chí pass/fail. |
| v0.2 | Thêm note rõ Phase 0 dùng **placeholder art** (không design/UIUX/icon thật); trỏ design sản xuất sang `05-SPEC-design-uiux.md` (Phase 1). |

*Nguồn: `02-GDD-trum-bia-hoi.md` (v1.3), `economy-spec-from-bundle.md`, `03-SPEC-he-ban.md`, `scripts/measure_k.py`.*

| 2026-09-09 measurement update | Current workspace headless sim uses at least1000 serves per seed/profile (the invariant still requires >=500). Owner batch production had one500-serve combined cohort at k3.0494; preserve that diagnostic and double ALL cohorts, with unchanged seed list, band, price/credit formulas and raw data. Do not treat a finite early-window excursion as hidden or delete its seed. |

| 2026-09-10 advanced k | Owner chọn (a): band2.0–3.0 chỉ cho cold/full-menu chuẩn; advanced career≥30ngày/LP4 có meta reward được k≤3.5, gate≥2seed trên toàn career. Kết quả3.483282/3.318249 PASS; không retune JSON, anchor hay gameplay. Re-evaluate after Alpha playtest with real player data; lạm phát endgame theo faucet/sink7ngày. |
| 2026-09-18 k gate D4(a) | Owner chốt: gate k career đo trên **đơn chuẩn** (bia + mồi đầu tiên; bỏ mồi thêm từ nâng bàn, đợt gọi thêm, tip bàn VIP) / 82,5; k quan sát được phép vượt 3,5 (sim W9: 6,5 với 8 bàn Lv4). Thêm gate tổng giá trị 30 ngày và mốc theo ca (PLAN §5 S5). Định nghĩa cũ (k quan sát ≤ 3,5) chỉ còn áp cho config ≤ 2.0.x. Nguồn: `docs/FEEDBACK-2026-09-17.md` v3.3 · `docs/PLAN-vui-3-ca-2026-09-18.md` v1.6 · `docs/DESIGN-story-3-tuan-2026-09-18.md` v1.1 |
| 2026-10-20 / JSON 2.1.0 k gate D4(a) — số đo S5 | `npm run sim:career:gate` trên đơn chuẩn (policy v4, 30 ngày, hai seed): seed 42 k chuẩn **3,4103** (thô 4,6035), tổng giá trị chuẩn **7 822 537** xu (thô 16 664 491), 27 804 lượt, LP7; seed 99 k chuẩn **3,3504** (thô 4,5218), tổng chuẩn **7 417 646** (thô 15 634 392), 26 836 lượt, LP7 → PASS cả hai (≤ 3,5 và ≤ 9 185 000), commandHash `c0f26142…` / `cf6a68e7…`. Hồ sơ chuẩn `npm run sim` / `sim:onboarding` trên quán đầu đủ đồ, 5 seed × cold/full × onboarding bật/tắt: k 2,3638–2,4971 (cold) và 2,7658–2,9539 (full) — trong 2,0–3,0, lớn nhất 2,9539 (seed 20260908, full, onboarding tắt). Phương pháp k và anchor 82,5 không đổi. So với trước S5 (S4, bot v3, đơn thô): k 5,5409 / 5,5298, tổng 13,98 tr / 14,08 tr. Bảng cổng đầy đủ (22 hàng × 2 seed) ở 08-SPEC changelog 2026-10-20 / JSON 2.1.0. |
