# Economy Spec — trích trực tiếp từ client bundle (phân tích độc lập)

Nguồn: `https://trumviahe.com/assets/index-BWec7RjV.js` (447 KB, đọc trực tiếp trong page context, tự grep). Đây là **hằng số gốc trong code**, không qua trung gian. Mọi số dưới đây là *directly extracted* trừ khi ghi rõ "suy đoán".

Ngày trích: 2026-06-03. Bundle hash khớp với bản research cũ → game chưa cập nhật.

---

## 1. Món bán (`Wa`)

| Món | id | Giá bán | Công thức | Prep | Cần ly |
|---|---|---:|---|---:|:--:|
| Trà đá | tea | **50** | tea×1 + water×1 + ice×1 | 3.000ms | ✅ |
| Kẹo lạc | peanutCandy | **30** | peanutCandy×1 | 0 | ❌ |
| Hạt hướng dương | sunflowerSeeds | **20** | sunflowerSeeds×1 | 0 | ❌ |

→ Chỉ **3 món**. Trà đá là món duy nhất cần chế biến (3s) và cần ly (phải rửa). Ăn vặt phục vụ tức thì.

## 2. Giá nhập nguyên liệu (`mc`) & margin (tự tính)

| Nguyên liệu | Giá lẻ | Lô (×10) | Giá/đv khi mua sỉ |
|---|---:|---:|---:|
| Trà | 5 | 40 | 4.0 |
| Nước pha trà | 2 | 15 | 1.5 |
| Đá | 3 | 25 | 2.5 |
| Kẹo lạc | 15 | 120 | 12.0 |
| Hạt hướng dương | 8 | 65 | 6.5 |

**Margin (tôi tính):**

| Món | Giá vốn lẻ | Margin lẻ | Giá vốn sỉ | Margin sỉ |
|---|---:|---:|---:|---:|
| Trà đá | 10 | **80%** | 8 | **84%** |
| Kẹo lạc | 15 | 50% | 12 | 60% |
| Hạt hướng dương | 8 | 60% | 6.5 | 67.5% |

→ Margin rất cao; **giá vốn không phải burn chính**. Burn nằm ở upgrade/rent/penalty.

## 3. Spawn & phục vụ (`pr`, `Vr`, `El`)

- Spawn base interval: **10.500ms/khách** (`pr.baseInterval`). Lần spawn đầu ca chậm hơn (warmup): `baseInterval × mr` với **`mr`=1.6** → ~16.800ms.
- **Base patience (kiên nhẫn chờ phục vụ) ≈ 18.000ms (18s)** cho khách thường (sunny); ×weather (Oi bức 0,75 → 13,5s; mưa phùn 1,15 → ~20,7s) ×type (rush/vip 0,611; stubborn 10; chi_pheo 5).
- Thời gian khách ngồi uống (enjoyTime, giữ ghế sau khi phục vụ): **5.000–10.000ms** (random, ×enjoyMultiplier theo loại khách & rush; stubborn ×10 → tới ~111s).
- Hệ số mặc định: payment ×1, tip ×1, leavePenalty ×1.
- **Sức chứa (lõi throughput) — `El`:**
  - **Ghế ngồi = số ghế** (tới 10): mỗi ghế chứa 1 khách đang phục vụ/uống.
  - **Hàng đợi (queue "Đợi")**: mở khoá từ **3 ghế**; sức chứa = **`baseMaxSize(2) + ⌊số_ghế / 3⌋ × slotsPerChairTier(1)`** → vd 9 ghế = 2 + 3 = **5 chỗ đợi**.
  - Tổng khách "trong quán" cùng lúc = ghế + queue. Vượt queue → khách bỏ đi ngay (`queueOverflow`).
- State khởi đầu: **300 xu**; kho tea 10/15, water 10/15, ice 10/20, peanutCandy 5/15, sunflowerSeeds 5/15.
- **Data model mỗi khách** (15 field): `id, type, state, chairIndex` (ghế ngồi), `order` (+`secondaryOrder`), `patience/maxPatience`, `enjoyTime/maxEnjoyTime`, `payment, receivedTip, waitingSince, pendingServe`, và bộ **reserve tài nguyên**: `reservedGlassId` (ly có id riêng), `reservedIce`, `reservedBrewedTea`. → Khi phục vụ, game **giữ chỗ 1 ly + đá + ấm trà** cho khách đó; ly mang id, khi khách rời → trả về dạng **bẩn** vào chu kỳ rửa (Bộ rửa ly). Đây là cốt lõi của "throughput economy" (ly là tài nguyên quay vòng có định danh).
- **2 pipeline tự động (refill):**
  - **Pha trà (ấm tích)**: tự brew bù khi `storedTea < max`; brew 1 batch (Lv4: tới 6 ly, brewTime 8s) → `storedTea` tăng dần (vd 17/18); `isBrewing`+`currentBrewTime` cho thanh tiến độ. Phục vụ trà = −1 storedTea.
  - **Rửa ly (bộ rửa)**: vòng đời ly `clean → in_use (reservedGlassId) → dirty → queue → washing → clean`. Lv4: **3 slot song song, 2,5s/ly**. Rack count (vd 11/12) = ly sạch sẵn (mẫu số "12" = TỔNG ly hiện có lúc đó = 10 mua + 2 Chủ tịch tặng, KHÔNG phải cap hệ thống; xem đính chính mục 9). → "refill ly" = rack tăng + thanh washer fill.
  - Cả 2 là pipeline auto + progress bar (render canvas), không keyframe CSS riêng.
- **Giá nhập hàng (config `mc`) — ✅ chốt từ bundle + 2 snapshot, CÓ chiết khấu sỉ ~17–25%:** mỗi nguyên liệu có `unitPrice` (lẻ) và `bulkPrice` (gói `bulkSize`=10). **Nút "+10" = `bulkPrice` cố định** (đã rẻ hơn lẻ). **Nút "Đầy" = `floor(thiếu/10)×bulkPrice + (thiếu%10)×unitPrice`** — tối đa gói 10, phần đuôi lẻ (0–9 đv) tính giá lẻ đắt hơn.

  | NL | unitPrice (lẻ) | bulkPrice (+10) | bulk/đv | CK sỉ |
  |---|---:|---:|---:|---:|
  | trà | 5 | 40 | 4,0 | −20% |
  | nước pha trà | 2 | 15 | 1,5 | −25% |
  | đá | 3 | 25 | 2,5 | −17% |
  | kẹo lạc | 15 | 120 | 12,0 | −20% |
  | hạt hướng dương | 8 | 65 | 6,5 | −19% |

  Khớp tuyệt đối 5 món × 2 snapshot (vd trà thiếu 61 = 6×40+1×5 = 245; kẹo thiếu 38 = 3×120+8×15 = 480; đá thiếu 63 = 6×25+3×3 = 159). → **Chiến thuật: luôn bấm +10 (giá sỉ); "Đầy" chỉ lỗ thêm ở đuôi lẻ.** ⚠️ *Đính chính: ghi chú cũ "không có chiết khấu sỉ / Đầy đắt hơn theo % kho" là SAI — phần "premium" thực chất là đuôi lẻ tính unitPrice.*
- **Món bán (config `Wa`) — biên lời gốc (trước tip/sự kiện/thời tiết):** **Trà đá** sellPrice **50**, cần trà+nước+đá (1 mỗi loại) + **ly** (rửa tái dùng), prepTime 3s → COGS sỉ ~8 → **lời ~42 (84%)**. **Kẹo lạc** sellPrice **30**, 1 kẹo, prep 0s, **không ly** → lời 18 (60%). **Hạt** sellPrice **20**, 1 hạt, prep 0s, **không ly** → lời 13,5 (67%). → Trà đá lời cao nhất nhưng nghẽn ly+pha; đồ nhắm lời thấp hơn nhưng **tức thì, không chiếm ly** → bán kèm lấp công suất thừa.

## 4. Loại khách (`ni`) — spawn weight & modifier

| Loại | Weight | Patience | Khác |
|---|---:|---:|---|
| normal | 1.0 | ×1 | baseline |
| rush (khách vội) | 0.3 | ×0.611 | ép phục vụ nhanh |
| **vip** | 0.1 | ×0.611 | **tip ×10, phạt mất khách ×10**. ⚠️ **NGHI VẤN (live): VIP có premium GIÁ ĐƠN ~×1.5 server-side** (quan sát: cùng 1 trà pre-tip, thường 74 vs VIP 110 = ×1.486; config client KHÔNG có paymentMultiplier cho vip → nếu đúng là hệ số server. Cần bắt 1 VIP pre-serve để chốt.) |
| **chi_pheo (Chí Phèo)** | 0.03 | ×5 | **payment 0, tip 0** — không trả tiền, chiếm chỗ lâu |
| **stubborn (khó tính/ngồi lỳ)** | 0.1 | ×10 | **enjoyTime ×10 → ngồi giữ ghế 50–100s** (random 5-10s ×10); trả tiền + tip **BÌNH THƯỜNG**, uy tín +3/+1 như mọi khách. "Chi phí" = chiếm ghế lâu (giảm vòng quay), KHÔNG phải trả ít |

→ Xác suất VIP gốc (không biển hiệu) = 0.1 / (1+0.3+0.1+0.03+0.1) = **6.5%**. VIP là faucet mạnh nhưng phạt cũng ×10 → chỉ đáng đẩy VIP khi throughput đã tốt.

**Bảng so sánh đầy đủ (bundle + live) — chiến thuật "ai phục vụ trước":**

| Loại | Weight | Trả tiền | Tip | Cơ chế & chiến thuật |
|---|--:|---|---|---|
| Thường | 1.0 | ~87–94/trà | có (+3 rep) | nền tảng, không gấp |
| Vội | 0.3 | bình thường | có nếu kịp | patience ×0,611 ngắn → xử nhanh; đông trong rush |
| **VIP** | 0.1 | **~60–400+** | **×10** | jackpot, patience ×0,611 ngắn → **ưu tiên #1, phục vụ ngay + trong cửa sổ boost**; lỡ = phạt ×10 |
| Chí Phèo | 0.03 | **0** | 0 | không trả + chiếm ghế (patience ×5); nhưng tích đủ **lộ Chủ tịch → quà** (xu 350-390 / nguyên liệu ~15); humid ×1,5 |
| Ngồi lỳ | 0.1 | bình thường | có (+3) | trả+tip bình thường nhưng **giữ ghế 50–100s** (enjoy ×10) → bẫy throughput; đuổi bằng uy tín (cost ∝ giây ngồi) |
| Shipper | timer ~220s | bundle −25% | không tip (+1) | làn riêng, **không tốn ly**, đơn to, lỡ phạt 50% gross; quý khi ly/đá là bottleneck |

→ Mỗi loại ép một quyết định khác: VIP/vội = tốc độ, ngồi lỳ = quản ghế, Chí Phèo = đánh đổi rủi ro lấy quà, shipper = tận dụng năng lực thừa. Đây là lõi tạo chiều sâu của "throughput + ưu tiên".

## 5. Thời tiết (`ei`) + phân bố (`Mp`)

Phân bố spawn thời tiết (weight): **sunny 35, hot 20, humid 10, light_rain 20, cold 15**.

| Thời tiết | spawn | patience | đá tan | snack | tip | shipper | khác |
|---|---:|---:|---:|---:|---:|---:|---|
| sunny | 1 | 1 | 1 | 1 | 1 | 1 | baseline |
| hot (Nóng) | 1.15 | 0.85 | **1.5** | 0.4 | 1.15 | 1.5 | — |
| humid (Oi bức) | 1.05 | 0.75 | **2.0** | 0.25 | **1.2** | 2.0 | chi_pheo ×1.5 |
| light_rain | 0.8 | 1.15 | 0.85 | 1 | 1 | **3.0** | stubborn ×2 |
| cold (Lạnh) | 0.9 | 0.8 | 0.4 | 1.5 | 1.15 | 2.0 | **icePerDrink 0, teaPerDrink 2, brew ×2.5, wash ×2** |

→ Mỗi thời tiết đổi chiến thuật tối ưu: nóng/ẩm = đá tan nhanh + tip cao (đua phục vụ trà); lạnh = không cần đá nhưng tốn gấp đôi trà & pha/rửa chậm; mưa = ít khách nhưng nhiều shipper.

## 6. Giờ cao điểm (`Cp`)

| Mức | Đếm ngược | Kéo dài | payment | tip | phạt mất khách | rush weight |
|---|---:|---:|---:|---:|---:|---:|
| light | 45s | 90s | ×1.05 | ×1.1 | ×1.8 | ×2 |
| heavy | 60s | 150s | ×1.1 | ×1.18 | ×2.5 | ×3 (+enjoy ×1.15) |
| lunchLight | 60s | 120s | ×1.05 | ×1.1 | ×1.8 | ×2.5 |

(Thêm từ config `Cp`: **spawnInterval ×0.35 (nhẹ) / ×0.2 (nặng)** với **sàn `rushMinIntervalMs` = 1.000ms (nhẹ) / 700ms (nặng)** → trần đầu vào ~1,43 khách/giây ở nặng = nguồn gốc throughput-cap. lunchLight: spawn ×0.35, sàn 1.000ms.)

→ Faucet có rủi ro: throughput tốt = hốt bạc; kém = ăn phạt.
- **Ô HUD "Cao điểm tới: {Nhẹ/Nặng} mm:ss" = đếm ngược tới đợt rush kế** (✅ live). Lịch **pre-roll có seed** (`sessionSchedule.seed` + `slots:[{type,countdownStartOffsetMs}]`) → **2 đợt/ca định sẵn từ đầu** (vd ca này: nhẹ @~2:33, nặng @~6:31; ca khác thứ tự/offset khác). **Telegraph**: lộ **loại (cường độ)** + **ETA** trước 45–60s → người chơi kịp **nhập đá/ly, tiễn ngồi lỳ, dồn sức**; biến surge từ "bất ngờ" thành "có kế hoạch". Seed → công bằng & học được nhịp, không phải RNG bất chợt.

## 7. Biển hiệu (`fc`) — đổi customer mix

Phí lắp lần đầu: **20.000 xu** (`Lh`), yêu cầu quầy lv3 (`fr`=3, observed/UI-backed — khớp cả ảnh UI lẫn bundle).

| Style | Giá | Hiệu ứng |
|---|---:|---|
| wood (Gỗ) | 0 | VIP ×2 |
| neon | 15.000 | VIP ×2, shipper ×1.2 |
| vintage | 20.000 | VIP ×2, rush ×0.5 |
| calligraphy (Thư pháp) | 25.000 | VIP ×2, stubborn ×0.8 |
| **golden (Hoàng kim)** | 30.000 + **gate 5.000 uy tín** | **VIP ×3** |

→ Không phải cosmetic — là modifier risk/reward (đẩy VIP = tăng EV nhưng tăng exposure phạt ×10).

## 8. Mặt bằng (`Rp`) — multiplier + rent

Rent/ngày = `Dn(e) = round(700 · (e/5) · (1 + e/50))`.

| Mặt bằng | Rent/ngày | Multiplier | Mở khoá | Doanh thu hoà rent (tự tính) |
|---|---:|---:|---|---:|
| Hẻm Nhỏ | 0 | ×1.00 | mặc định | — |
| Công Trường | 770 | ×1.05 | LP1 | ~15.400 |
| Chung Cư Cũ | 1.680 | ×1.10 | LP1 | ~16.800 |
| Cổng Trường | 2.730 | ×1.15 | LP2 | ~18.200 |
| Chợ Đêm | 3.920 | ×1.20 | LP2 | ~19.600 |
| Khu Văn Phòng | 6.720 | ×1.30 | LP3 | ~22.400 |
| Phố Cổ | 11.970 | ×1.45 | LP4 | ~26.600 |
| Ga Metro | 18.480 | ×1.60 | LP5 | ~30.800 |
| Khu Phố Tây (expat_quarter) | 29.120 | ×1.80 | LP6 | ~36.400 |

(Rent = `Dn(80)` = round(700·16·(1+1.6)) = 29.120; cột hoà rent = rent/(mult−1).)

**Cơ chế thuê (xác nhận live từ màn Thuê Mặt Bằng):**
- **Kỳ thuê = 7 ngày**, trả trước cả kỳ: **tiền kỳ = rent/ngày × 7** (vd Chợ Đêm 3.920×7 = 27.440; Cổng Trường 19.110; Khu Văn Phòng 47.040; Phố Cổ 83.790; Ga Metro 129.360; Khu Phố Tây 203.840).
- **Cọc = 25% tiền kỳ** (= rent/ngày × 1,75), **hoàn lại** khi hết hạn bình thường; vd Chợ Đêm cọc 6.860, Cổng Trường 4.778, Phố Cổ 20.948 (đều = kỳ × 0,25).
- **Rời đi sớm → MẤT cọc** và **tự quay về Hẻm Nhỏ** (free, ×1.0).
- **Cổng mở khoá = bậc Life Path**: Công Trường/Chung Cư Cũ = LP1; Cổng Trường/Chợ Đêm = LP2; Khu Văn Phòng = LP3; **Phố Cổ = LP4 (Rành Nghề)**; **Ga Metro = LP5 (Sáng Tạo)**; **Khu Phố Tây = LP6 (Bậc Thầy)**.
- **✅ ĐÍNH CHÍNH: chip HUD "Chợ Đêm ×1.20" = `paymentMultiplier` của MẶT BẰNG đang thuê (KHÔNG phải event tạm thời)**; số "Xd Yh" cạnh nó = **đồng hồ hết hạn thuê** (`expiresAt`). Config `mc`/location: `{id, name, dailyRate:Dn(e), paymentMultiplier, requiredLP, indicator}`. Dn(e)=`round(700·(e/5)·(1+e/50))`. State `stallRental:{location, deposit, rentPaid, expiresAt, paidAt, depositRefundedAt, rentalExpired}`. ✅ live: night_market rentPaid 27.440 (3.920×7), deposit 6.860 (25%). **✅ Endpoint (bắt live trọn flow): `POST /api/v1/rental/move {targetLocation}`** — dùng chung cho cả trả (move về `alley`) lẫn thuê mới; thuê office_district trừ **đúng 58.800 = 47.040 (Dn(30)×7) + 11.760 (cọc 25%)**, `expiresAt = paidAt + đúng 604.800.000ms (7 ngày tròn)`; `GET /rental/locations` = danh sách.

→ Sink định kỳ (trả trước 7 ngày + cọc) chống lạm phát mid/late game; thuê sớm hoặc nhảy mặt bằng liên tục là lỗ (mất cọc).

## 9. Nâng cấp thiết bị

**Thùng đá `Cc`** (sức chứa ĐÁ / chu kỳ tan) — *kho riêng chỉ cho đá*:
0→cap20/30s · 2k→30/50s · 8k→50/90s · 30k→120/240s · 100k→250/**không tan**.
⚠️ **Đá có kho riêng (Thùng đá), tách khỏi Quầy** → đó là lý do đá thường có cap khác (vd L3=50) trong khi trà/nước/kẹo/hạt theo Quầy (vd 80). Vì đá là tài nguyên duy nhất **bị tan theo thời gian** nên cần thùng chuyên dụng quản cả cap lẫn tốc độ tan. Muốn tăng cap đá phải nâng Thùng đá, không phải Quầy.

**Ấm tích `za`** (storage/batch/brewTime):
0→3/1/15s · 3k→5/2/13s · 12k→8/3/11s · 50k→18/6/8s · 200k→40/12/6s.

**Bộ rửa ly `Ir`** (washTime/slots):
0→7s/1 · 2.5k→5s/1 · 10k→4s/2 · 40k→2.5s/3 · 150k→1.5s/5.

**Quầy (counter) = mảng `Al`** — sức chứa kho nguyên liệu (`/upgrade/stall`): 0→cap15 · 1k→25 · 5k→45 · 20k→80 · 80k→150 (UI: "Quầy Lv3→20k, Lv4→80k" khớp Al L4/L5). **Level Quầy = "stall level"**; biển hiệu yêu cầu Quầy Lv3 (`fr`=3). Phân biệt rõ: kho (Al/Quầy) ≠ **số ly** (`glasses[]`, mua qua `/buy/cup`) ≠ **ghế nhựa** (`jl`). ⚠️ **Đính chính (xác nhận từ người chơi + quan sát top1):** ly có **buy-cap = 10** (mua tối đa 10) nhưng **storage-cap = 20** (kho chứa tới 20); phần dôi 10→20 chỉ lấp bằng **quà "Chủ tịch giả nghèo"** (+1 ly/lần). Số "12" quan sát trước = 10 mua + 2 ly Chủ tịch tặng (KHÔNG phải cap hệ thống); top1 = 17 ly (10 + 7 tặng).

**Ghế nhựa `jl`** (mua thêm, giá theo số ghế): 4→200 · 5→500 · 6→1.000 · 7→1.500 · 8→2.500 · 9→5.000 · 10→10.000.

**Ghế tựa (backrest, `/upgrade/chair`)** — nâng từng ghế nhựa lên ghế tựa, **mở cho ghế đó khách gọi 2 món** (`secondaryOrder`), đổi lại **phí sửa khi côn đồ phá ×3**. Tối đa 9 (mỗi ghế 1 lần). Nâng cấp thứ `t` (t=0..8): **coin = 100.000 + t×50.000** (100k→500k); **uy tín = [3.000, 4.500, 6.500, 9.000, 12.000, 16.000, 22.000, 30.000, 40.000]**. Điều kiện: đủ 9 ghế nhựa + **huy hiệu "Kết Nối"**. Tổng nâng cả 9: ~**2,7 triệu xu + ~143.000 uy tín** (sink late-game lớn). ✅ **Endpoint live: `POST /upgrade/chair {chairIndex}`** — body chọn GHẾ vật lý (0–8) để gắn tựa; **giá theo SỐ LẦN nâng `t` (không theo chairIndex)**. Đo live ghế #2: trừ đúng 150.000 xu. → **2-món KHÔNG phải mặc định** mà mở dần qua ghế tựa. ✅ **Đối chiếu live**: ghế 1 (t=0)=100k+3.000⭐, ghế 2 (t=1)=150k+4.500⭐ — khớp công thức (`coinCost=1e5+t·5e4`, `repCost=[3e3,4500,6500,9e3,12e3,16e3,22e3,3e4,4e4][t]`, gate `badges.includes(Kết Nối)`). **Thiết kế: xu tăng TUYẾN TÍNH (+50k đều) nhưng uy tín tăng LỒI (3k→40k, ×13) → uy tín mới là cổng thật cuối game** (faucet uy tín nhỏ giọt: +3/khách boa, nhiệm vụ, điểm danh). Dual-gate (xu + uy tín) ép chơi cân bằng cả volume lẫn chất lượng phục vụ.

**Chó `un`/`iv`**: mua 2.000 xu + 20 đá; nâng cấp lv2 (8.000 xu + 20 kẹo), lv3 (25.000 xu + 40 kẹo). Vai trò: bảo hiểm rủi ro/trộm.

## 10. Thể lực, ca & trần ngày (`De`)

- Thể lực tối đa: **720.000ms = 12 phút** chơi.
- Hồi: tốc độ 1/2.5 = **0.4×thời-gian-thực** → hồi đầy ~**30 phút thực**.
- Cảnh báo khi còn 60s; **phải đầy 100% mới mở ca mới**.
- Trần ca/ngày: newbie **8**, regular **6**, veteran **5** (`dailyShiftsCompleted` vs `dailyProgressionTier`). **Nghịch lý có chủ đích: veteran bị siết ÍT ca nhất → anti-grind + catch-up** (người mới chơi nhiều hơn để đuổi kịp).
- **Trần tiền cứng/ngày: 200.000 xu** (`dailyEarningCapReached`).
- **✅ Rollover ngày (bắt live, vắt qua nửa đêm):** day-key = **ngày lịch giờ VN** (`Asia/Ho_Chi_Minh`), hàm `Fn()`=`Intl.DateTimeFormat('en-CA',tz)`→`"YYYY-MM-DD"`. **Reset/so sánh = SERVER-SIDE** (client chỉ mirror `dailyEarningCapDateKey`/`dailyShiftsCompleted`/`dailyGameplayEarned` — chống chỉnh đồng hồ máy). Reset theo **mốc nửa đêm thực**, KHÔNG theo lúc mở ca. → **Ca vắt qua 00:00 (✅ bắt live ca bridge Jun04→05):** **tiền tính theo TỪNG LƯỢT EARN, gán bucket theo giờ VN tại thời điểm earn** → lượt trước nửa đêm vào cap ngày cũ, lượt sau vào cap ngày mới (chia đúng tại 00:00). **Cap 200k là PER-DAY-BUCKET độc lập** → một ca liên tục vắt nửa đêm có thể góp **cả 2 cap** (tối đa lý thuyết 200k+200k). **Số ca credit lúc FINALIZE → vào ngày đóng ca** → ca đóng sau 00:00 = **ca #1 ngày mới** (bridge "hoàn" 1 suất ca: hết 5 ca ngày cũ vẫn mở ca rồi để đóng sang ngày mới = fresh 5 ca + cap mới). **Nhiệm vụ ngày + điểm danh + login reset tại nửa đêm VN** (target mới); ca bridge có thể hoàn thành luôn vài nhiệm vụ ngày mới. `dailyEarningStats[]` lưu lịch sử từng ngày (`{day, totalEarned, onlineMs, firstEarnAt, hardCapHitAt}`). (Lưu ý: `dailyGameplayEarned` (metric tính-vào-cap) lệch nhẹ so "Tổng thu" hiển thị — định nghĩa khác, không do chia ngày.) **✅ Mirror-case (bắt live lần 2):** ca **finalize TRƯỚC 00:00** rồi mới qua nửa đêm → toàn bộ (tiền + số ca) tính **ngày cũ**; ngày mới mở ra "nguyên vẹn" (0/5 ca, 0 cap, **well-rested chưa dùng** vì keyed theo open-day). → Gộp 2 case: **mọi attribution theo thời điểm earn/finalize**; well-rested theo open-day — quy luật đã khép kín.
- **✅ Hai trần ngày TÁCH BIỆT — xác nhận live ("Hết giới hạn ngày"):** màn đóng cửa báo "Hết giới hạn ngày" khi `dailyShiftsCompleted=5` (veteran) **dù `currentStaminaMs=720000` (100%, đã hồi đủ) VÀ `dailyEarningCapReached=false` (mới 121.472/200k, dư ~78k)**. → **Ràng buộc thực tế với đa số là SỐ CA, không phải tiền hay stamina.** Trần tiền 200k chỉ chặn top-player throughput cao (cần ~40k/ca × 5). **Không có nút mua thêm ca** (chỉ disable) → anti-P2W. Hết ca **vẫn TIÊU xu được** (Nâng cấp/Nhập hàng/Xếp hạng/Nhiệm vụ/Nhận quà mở), chỉ **khoá KIẾM từ ca mới** → tách "earn" khỏi "spend & vận hành". Màn này còn **preview thời tiết ca kế** để lên kế hoạch nhập hàng trước.
- **Well-rested ("Nghỉ ngơi tốt") — ✅ dive sâu (config `De` + ảnh live):** `wellRestedBonusMultiplier:1.1` (**+10% thu nhập**), `wellRestedDurationMs:600.000` (**10 phút**). Áp **×1.1 lên (payment + tip) sau cùng** (cả khách thường lẫn đơn shipper — xem mục 12). **1 lần/ngày** (`wellRestedUsedDateKey`), cấp khi mở ca lúc đã nghỉ đủ (full stamina). **✅ Bất đối xứng mốc ngày (bắt live — ca bridge KHÔNG có ×1.1):** well-rested keyed theo **lúc MỞ ca (open-day)**, còn số-ca/doanh-thu keyed theo **lúc FINALIZE (finalize-day)**. Ca vắt nửa đêm **mở** ở ngày cũ (well-rested ngày cũ đã dùng → từ chối) nhưng **đóng** ở ngày mới (tính là ca #1 ngày mới) → rơi vào kẽ hở: "ca đầu ngày mới" lại chịu sổ well-rested ngày cũ → **không được ×1.1**. (Buff ngày mới chưa mất: `wellRestedUsedDateKey` vẫn là ngày cũ → ca sau mở trong ngày mới + nghỉ đủ vẫn được cấp.) → **Bài học bia hơi: keyed well-rested + shift-count CÙNG một mốc (open hoặc finalize) để tránh bất nhất.** Đếm ngược qua **`wellRestedRemainingMs`** → hiện trên **HUD pill TÍM `×1.10`** (đồng hồ mm:ss; class `well-rested--ending` **nhấp nháy 10s cuối**). Floater lúc nhận: "☀️ Welcome back! +10% for 10 min". Vì buff 10 phút ≈ trùng độ dài 1 ca (12 phút) → gần như phủ trọn **ca đầu tiên trong ngày** → nên dồn VIP/rush vào ca này.
- Hồi thể lực theo phiên (`jv`): phiên 1 hồi nhanh (denom 0.5), phiên 2 (1.0), phiên 3 (1.5) → càng về sau hồi càng chậm.
- **Đóng ca = trạng thái "closing" có grace (quan sát live):** hết thể lực → `stallOperatingMode:"closing"`, `closeReason:"exhausted"`; **ngừng spawn khách mới** nhưng khách đang `enjoying` (đã phục vụ) được uống nốt. **✅ Nuance nhiệm vụ (bắt live):** ca chỉ tính **HOÀN THÀNH khi đóng HẲN** (`closing→closed`, màn tổng kết hiện), KHÔNG phải lúc đồng hồ/thể lực về 0 → nhiệm vụ "Hoàn thành 3 ca" + mở ca kế **chỉ tick sau khi finalize**. Khách **ngồi lỳ** (enjoy ×10, vd 97s) kẹt ở `closing` → **trì hoãn cả credit nhiệm vụ lẫn mở ca kế** → "Mời về" để đóng ngay. **Khách stubborn (enjoyTime ×10, ~135s) kéo dài thời gian đóng** rõ rệt → có thể dùng `/api/v1/customer/kick-all` để đuổi hết & đóng ngay. Không thể đóng khi đang có đơn shipper chạy.
- **Mốc bắt đầu hồi thể lực (quan sát live):** cooldown **KHÔNG tính từ lúc hết giờ ca**, mà từ khi **khách về hết & quán vào `"resting"`**. Bằng chứng: `lastSessionEndedAt` cách 358s nhưng `currentStaminaMs` mới ~2.445ms (≈ 6s thực × 0,4) → đồng hồ vừa mới chạy. Ngoài ra regen **chỉ đếm khi game active** — lúc pause/mất focus (`fairness_paused`) thì **dừng đếm** (chống lách bằng cách mở nền). → Hồi đủ 100% cần ~30 phút *active* sau khi quán đóng thật.

## 11. Hai hệ tiến trình tách biệt

### League theo mùa (`Fr`) — xếp theo doanh thu mùa
**8 bậc theo `minSeasonEarned` (id EN ✅):** bronze/Đồng 0 · silver/Bạc 20k · gold/Vàng 60k · titanium/Titan 120k · platinum/Bạch Kim 180k · ruby/Hồng Ngọc 300k · diamond/Kim Cương 500k · legend/Huyền Thoại 1.000.000.
(Điểm mùa = doanh thu phục vụ + shipper; loại trừ thưởng nhiệm vụ/điểm danh.)
**✅ HAI bảng tách biệt (đính chính):**
- **Bảng "Xếp hạng" chính (`GET /api/v1/leaderboard`)** = gom theo **BẬC LEAGUE, XUYÊN mặt bằng** (sort `seasonEarned` giảm dần). Resp: `{entries:[{rank, username, seasonEarned, currentMilestone, league, seasonReputationScore, location, firstReachedCurrentSeasonEarnedAt, lastSeen, cosmetic...}], league, seasonId:"S005", myLeague, seasonChampionUsername, seasonEndMs}`. Tab ‹ › chuyển bậc; bậc trống hiện "Chưa có ai". **Tie-break = `firstReachedCurrentSeasonEarnedAt`** (đạt mốc trước xếp trên). ⭐ dưới tên = `seasonReputationScore` (chỉ hiển thị, KHÔNG xếp hạng).
- **"Dạo Phố" (`/social/street`, mục 15)** = gom theo **location × league** (hàng xóm) — bản KHÁC.
- `peakLeague` lưu bậc cao nhất từng đạt (gate Life Path/badge). ✅ **Mẫu live (S005):** maingocanh seasonEarned 312.507 → **Ruby/Hồng Ngọc rank #2** (vừa lên từ Platinum khi vượt 300k); #1 tranngocdinh1 429.804; **Diamond/Kim Cương trống** (chưa ai ≥500k).

**HAI mùa giải SONG SONG (`mv`):**
- **Mùa Phân Hạng (Placement)** — chu kỳ **7 ngày** (`dv`=7). Thưởng đậm + huy chương top 10 + khắc **Đền Thiêng** (ảnh: "Mùa Thu Hoạch").
- **Mùa Tranh Bá (Conquest)** — chu kỳ **14 ngày** (`hv`=14). Thưởng nhẹ hơn (ảnh: +10 đá ở Hồng Ngọc).
- Neo thời gian: epoch **2026-04-11 10:00 UTC** (`Np`), tz **Asia/Ho_Chi_Minh** → reset đều đặn 7/14 ngày. → 2 ladder kết thúc gần nhau nên nhận 2 quà cùng lúc.

**Thưởng cuối mùa (✅ bắt được live, msg `season_end_S004`):** mùa **đánh số** (S004). Phần thưởng giao qua **hòm thư** (`/inbox/claim-reward`), nhận từng phần nếu kho đầy (`partialClaimed` → "phần còn lại ở dưới"). Ví dụ hạng **Hồng Ngọc/Ruby #7 (top 10)** mùa Phân Hạng:
- **Thưởng = BÓ NGUYÊN LIỆU**, KHÔNG phải xu/uy tín: `{tea:234, water:237, ice:231, peanutCandy:155, sunflowerSeeds:92}` (lượng nhiều khả năng scale theo hạng).
- **Top 10 → huy chương 🌟 + khắc tên vào ⛩️ Đền Thiêng** (prestige/social).
- → Thiết kế hay: thưởng top bằng **"vốn restock" mùa sau + danh hiệu**, **không bơm xu** → tránh lạm phát & không distort xếp hạng mùa kế.

### Life Path (`Ya`) — milestone tích luỹ cả đời
| Mốc | Tên | Điều kiện | Thưởng |
|---|---|---|---|
| LP0 | Tập Tành | 0 | — |
| LP1 | Vào Nghề | 50k lifetime + 4 ghế + chó | 5k + crate nhỏ |
| LP2 | Quen Tay | 150k + quầy lv3 + điện thoại | 10k + badge shard |
| LP3 | Thạo Việc | 500k + đồ lv3 + QR | 20k + crate vừa |
| LP4 | Rành Nghề | 1.5M + tờ rơi + peak Bạch Kim | 50k + shard + cosmetic |
| LP5 | Sáng Tạo | 5M + biển hiệu + peak Hồng Ngọc | 100k + crate vừa + cosmetic |
| LP6 | Bậc Thầy | 15M + đồ & quầy lv5 + peak Kim Cương | 250k + crate lớn + 2 badge shard |
| LP7 | Huyền Thoại | 50M + 9 ghế + peak Huyền Thoại | 500k + crate |

→ Reward coin nhỏ hơn nhiều so với ngưỡng → milestone chủ yếu để **gate tính năng & status**, chống lạm phát.

## 12. Công thức TIP & UY TÍN (đã xác nhận từ code — hàm `hb`/`ub`/`Gp`)

**Tip — hàm `ub(payment, customer)`:**
```
patienceRatio = clamp(patience / maxPatience, 0..1)
if patienceRatio < 0.6  →  tip = 0           // ev = 0.6
else                    →  tipBase = round(payment × 0.3)   // tv = 0.3
```
→ **Tip gốc = 30% giá trị đơn, NHƯNG chỉ khi phục vụ lúc khách còn ≥60% kiên nhẫn**; trễ quá thì mất sạch tip.

**Chuỗi nhân tip (hàm `hb`), áp lần lượt lên tip gốc:**
```
tip ×= rushHour.tipMultiplier     (1.0 / 1.1 / 1.18)
tip ×= weather.tipMultiplier      (1.0 / 1.15 / 1.2 ...)
tip ×= customerType.tipMultiplier (VIP = 10, chi_pheo = 0)
if hasQR và tip>0:  tip = ceil(tip × 1.2)      // Tv = 1.2  → +20%
payment += tip
if well-rested:     payment = round(payment × 1.1)   // De.wellRestedBonus
```
Lưu ý thứ tự: giá đơn đã được nhân `weather.paymentMultiplier`(=1) và `location.paymentMultiplier` TRƯỚC khi tính tip; well-rested ×1.1 áp cuối cùng lên cả (giá + tip).

**⚠️ "Vách đá 60%" — vì sao tiền VIP biến thiên cực mạnh theo thời điểm:** tip là **nhị phân** (0 hoặc 30%), không scale mượt. Nhưng:
- Phục vụ **≥60% patience** → full tip; **<60%** → **tip = 0**. Với khách thường chênh nhỏ (94 vs 60); **với VIP chênh ~5,5×** do tip ×10: VIP phục vụ sớm ≈ **345–364 xu**, phục vụ trễ ≈ **60–66 xu** (chỉ còn tiền gốc).
- Cộng thêm tầng nhân đổi theo timeline ca (rush 1/1,1/1,18 × wellrested 1,1 × weather) cũng bị VIP ×10 khuếch đại → một VIP đáng **~60 đến ~400+ xu** tùy thời điểm.
- → **Chiến thuật đòn bẩy cao nhất: phục vụ VIP NGAY (giữ >60%) + ưu tiên VIP trong cửa sổ rush/well-rested.** Lỡ/trễ 1 VIP = mất nguyên "jackpot ×10".

**Uy tín mỗi lượt — `Ph = {serveWithTip: 3, serveNoTip: 1}` + phạt khi mất khách (~−5):**
- **+3** nếu khách có boa, **+1** nếu không.
- **~−5 mỗi khách bỏ đi** (suy ra từ sổ ca live: gained 212×3 + 100×1 = 736, net +530, 40 bỏ đi → ~5,1/khách).
- → Uy tín ca = `Σ(+3/+1 phục vụ) − ~5×(số bỏ đi)`. Vì vậy ca phục vụ tốt ra **+530**, còn heavy rush mất nhiều khách ra **−2.421** (phần −5× áp đảo). Uy tín = **thước đo chất lượng phục vụ ca**; cộng vào cả điểm uy tín mùa lẫn stat tổng.

**Trần doanh thu ngày (`Gp` + `Bp` + `Ws`):** mỗi lượt phục vụ trả về `tier: "full" | "capped"`. Hết "full" khi **đạt cap ca ngày (`dailyShiftsCompleted ≥ 8/6/5`)** HOẶC **`dailyGameplayEarned ≥ 200.000 xu`**; sau đó đơn vẫn phục vụ nhưng **không cộng tiền/điểm** nữa (appliedCoin=0). Đây là cơ chế chống cày. (Code dùng so sánh `>=`, không phải `>`.)

## 13. Mở khoá & sink một lần (hằng số rời)

| Mục | Chi phí |
|---|---|
| Điện thoại (`Sv`) | 5.000 xu (mở shipper/đơn) |
| QR Payment (`gr`) | 8.000 xu (+ cần điện thoại, milestone "Quen Tay") |
| Biển hiệu — phí lắp đầu (`Lh`) | 20.000 xu |
| Chó (`un`) | 2.000 xu + 20 đá; nâng lv2 (8.000 + 20 kẹo), lv3 (25.000 + 40 kẹo) |

## 14. Tờ rơi (flyer)

- **Campaign kéo dài 90s** (`Lr` = 90.000ms); hàm `sb()` chỉ kiểm tra active (Date.now() − startedAt < 90.000).
- **Độ mạnh hiệu ứng = server-side** nhưng ✅ **đo được EMPIRICAL khi chơi** (1 chiến dịch 90s, humid, không rush):
  - **Khách đến 58 trong 90s** (vs baseline humid ~16 nếu spawn 5.578ms) → **tăng lượng khách ~3,6×**.
  - spawnInterval tụt **5.578 → ~3.596ms** *và* flyer **bơm khách giữ quán luôn đầy** (demand saturation), không chỉ hạ interval.
  - **Phục vụ 58/58 = 100%**, thu **7.299 + boa 3.891** trong 90s (≈124 xu/giây — gấp nhiều lần nhịp thường).
  - **Điểm mấu chốt: khách tờ rơi KHÔNG phải loại "vội" patience thấp** → phục vụ kịp 100% → **tip vẫn cao (~35–53%)**, khác hẳn rush nặng (mất 28%, tip 15%). → **Tờ rơi = lượng khách của rush nhưng KHÔNG kèm phạt patience**; nếu throughput đủ thì gần như lời thuần.
- Kiếm tờ rơi miễn phí: "**chơi 3 ca + hoàn thành hết nhiệm vụ ngày**". Tồn kho tối đa ~5 (`YC`=5).
- State: `flyerUnlocked`, `flyers` (số lượng), `flyerUsedThisShift`.
- **✅ Endpoint + summary (bắt live):** `POST /api/v1/shop/activate-flyer` (body rỗng). Chiến dịch **90.000ms cố định**. State `flyerCampaign` lưu **baseline lúc bắt đầu** (`baselineServed/Earned/TipsEarned/Lost`); kết thúc tính **hiệu** → `pendingFlyerSummary = {served, earned, tipsEarned, lost, durationMs:90000}` (đo đúng phần tờ rơi tạo, không lẫn ca thường). **Mẫu #2 bắt live (không rush):** served 25, earned 2.232, tip **912 (=41%!)**, **lost 0** → khẳng định lại: tip cao + 0 bỏ đi = lời thuần (khác mẫu humid bão hoà 58 khách/90s). Giá trị tờ rơi **tỉ lệ throughput kịp phục vụ**. **✅ Mẫu #3 (humid, người chơi bận test UI suốt 90s): served 2, earned 206 — tờ rơi GẦN NHƯ LÃNG PHÍ** → chứng minh sống: **tờ rơi = hệ số nhân HOẠT ĐỘNG của người chơi, không phải tiền miễn phí** (demand bơm vào mà không bưng thì không thành tiền). Mẫu #3 cũng **xác nhận 100% cơ chế summary = lifetime stats − baseline** (delta tự tính khớp từng xu với `pendingFlyerSummary`).

## 15. Nhiệm vụ ngày (`rS`) & điểm danh (`cT`)

**Cấu trúc nhiệm vụ ngày — ✅ chốt từ bundle (`wc`/`hm`/`rS`) + ảnh live:** Mỗi ngày **5 nhiệm vụ** (UI "✓ 0/5"):

**(A) 3 nhiệm vụ lõi ngẫu nhiên** — bốc 1 cái từ mỗi **bucket** (`wc`), reward CỐ ĐỊNH theo bucket (`hm`):

| Bucket | Loại có thể bốc | Reward |
|---|---|---|
| 1 | serve_customers / serve_tea / serve_snacks | **120 xu + 5 ⭐** |
| 2 | perfect_tip / earn_coins | **220 xu + 5 ⭐** |
| 3 | zero_loss_window | **320 xu + 5 ⭐** |

**Target co giãn base→max theo tier tiến trình** (`rS`): serve_customers 21→102 · serve_tea 10→53 · serve_snacks 8→51 · perfect_tip 9→41 (phục vụ khi patience>60%) · earn_coins 1.100→9.200 · zero_loss_window 1→1. `zero_loss_window` = **không mất khách trong 4 phút** (`lT`=240.000ms). → Càng lên cao **mục tiêu càng nặng nhưng reward giữ nguyên** (siết theo tiến trình).
- **✅ Cơ chế gán (vì sao nhiệm vụ "trông giống mỗi ngày"):** **loại** bốc bằng seed `oS()` (FNV-1a hash) + PRNG `lS()` theo day-key → re-roll mỗi ngày nhưng **pool nhỏ** (bucket 3 luôn `zero_loss`; bucket 2 chỉ 2 loại; bucket 1 chỉ 3 loại) → hay lặp. **Target tính theo TIER, KHÔNG theo ngày:** `pm(type,tier)= base + (max−base)×((clamp(tier,1,9)−1)/8)^1.5` → veteran (tier cao) ghim target gần **MAX** (serve_tea 53, earn_coins 9.200) → con số không đổi ngày này qua ngày khác chừng nào chưa lên tier. → "giống nhau" là do target-ghim-theo-tier + pool random bé, KHÔNG phải bug.

**(B) 2 nhiệm vụ cố định thêm:** "**Hoàn thành 3 ca**" (`shiftMission`, target 3) → **1.000 xu + 100 ⭐**; "**Gửi quà**" (`giftMission`, `{target:3, uniqueRecipients:[], reward jp}`) → **300 xu + 15 ⭐**. ⚠️ **Gửi quà đếm `uniqueRecipients` = 3 NGƯỜI KHÁC NHAU** (gửi lại cùng người không tính).

**Cơ chế Quà + Nhắn tin (`/api/v1/social/send-message`) — ✅ bắt live qua fetch hook:** quà **đính kèm tin nhắn** (1 action chung), body `{recipientUsername, reward:{inventory:{tea,water,ice,peanutCandy,sunflowerSeeds}} hoặc {coins}}` — slider UI cho **tối đa 5 mỗi nguyên liệu** + xu. **Quà = transfer nguyên liệu P2P** (người gửi mất tài nguyên thật — ✅ đo live: gửi `{tea:1}` → kho trà 80→79; resp 200 trả full state đã trừ). **4 tầng chống farm/spam** (bảng mã lỗi server): `RECIPIENT_HAS_PENDING` ("Recipient has not read your previous message" — mỗi người nhận chỉ 1 tin **chưa đọc** từ bạn, phải đợi đọc mới gửi tiếp) · `DAILY_SEND_LIMIT` (trần gửi/ngày) · `DAILY_RECEIVE_LIMIT` (trần nhận/ngày — chống 1 acc làm thùng farm) · `CONTENT_REJECTED` (kiểm duyệt nội dung). Counters: `socialGiftSentToday/ReceivedToday/MessagesSentToday`. → Ép phát tán thật tới nhiều người, không thành kênh RMT/chuyển tài sản giữa acc.

**(C) Bonus 5/5:** hoàn thành cả 5 → **+1 Tờ rơi + 1 🧩 mảnh huy hiệu** (`badgeShards`) — KHÔNG phải xu, mà là item dùng (marketing) + tiến trình sưu tập.

→ **Tổng/ngày nếu 5/5:** ~**1.960 xu + 130 ⭐ + 1 tờ rơi + 1 mảnh huy hiệu.** Config gắn nhãn experiment `tea-game-retention-v2`.

**Điểm danh / streak (`cT`, thưởng UY TÍN, nhân đôi):** ngày 1→+2, 2→+4, 3→+8, 4→+16, 5→+32, 6→+64, 7→+128. **Tổng 1 chu kỳ = 254 uy tín.** State `loginTrack={cycleDay, lastClaimDateKey, lastActiveDateKey}`. (Uy tín điểm danh KHÔNG tính vào xếp hạng mùa.) **✅ xác nhận live + bundle.** Sắc thái thiết kế: (a) **lỡ 1 ngày → `cycleDay` reset về 1** (retention hook gắt); (b) **Ngày 7 (128) = ½ giá trị cả tuần** → dồn thưởng vào cuối chuỗi, lỡ càng muộn càng tiếc; (c) config keyed 1–7 → **hết Ngày 7 lặp lại Ngày 1**, không phình vô hạn; (d) thưởng = **uy tín, không phải xu** → bơm meta-currency, không lạm phát tiền mặt.

**Thử thách dài hạn — Mời bạn bè (Referral, `Pp()`) — ✅ UI live + bundle:** tab "Thử thách" (KHÔNG reset ngày), hiện chỉ 1 thử thách = referral. **3 mốc** (⭐ = uy tín): Mốc 1 (mời **1** bạn chơi thật) → **⭐250 + 👋**; Mốc 2 (**3** bạn) → **⭐1.000 + 🪃**; Mốc 3 → **⭐3.000 + 🤝**. Phần thưởng cụ thể do **server cấp** (client chỉ lưu `tier1/2/3InjectedAt`).

- **Chống gian lận:** bạn được mời phải **"qualified" = chơi thật** (đăng ký + mở quán + vài phiên); **self-invite không tính**. Hai mức: `totalQualifiedCount` (chơi thật) & `totalLp2ReachedCount` (**đạt Life Path 2** — chống mời acc rồi bỏ). `appliedQualifiedReferees[]`/`appliedLp2Referees[]` tránh double-claim; mỗi tier nhận 1 lần. **Server-authoritative.**
- **Two-sided:** người được mời cũng nhận thưởng chào mừng 2 giai đoạn (`welcomeStage1/2InjectedAt`); `referrerUsername`/`referrerAttributedAt` lưu ai mời mình. Phát tán: "Chép link mời" (deep link) + "Chia sẻ" (native share) + "Mở mục Bạn bè".
- **Lớp xã hội quanh BXH:** emote `XC=[👋 😂 🔥 💪 👀 🍵 ❤️ 💔]` + câu soạn sẵn `Nv=["Mời ly trà 🍵","Đua không bạn hiền 🏁","Oops vượt bạn mất rồi 🤭"...]`; đếm ngày `socialGiftSentToday/ReceivedToday/MessagesSentToday`; `blockedUsers`, `hasPhone`. → có hệ bạn bè + nhắn tin + chặn.
- **✅ Trợ lý AI "Trà Đấm" (chunk `SupportOverlay`) — server-side LLM thật:** 3 endpoint `POST /api/v1/ai-chat` (đa lượt, trả `{conversationId, quotaRemaining, message, followups}`, reply Markdown), `GET /ai-chat/initial-suggestions` (gợi ý mở đầu lấy động từ server → bám changelog), `POST /ai-chat/bridge` (cầu nối → ticket hỗ trợ người thật `/support/tickets`). **Định tuyến 4 intent:** Hỏi cách chơi / Báo lỗi / Góp ý / Yêu cầu của tôi. **Rate-limit:** `errorBurst` (gửi nhanh quá, có `retryAfterMs`) + `errorDaily` (quota **20 tin/ngày**, hiện "1/20", `Pn=20`) + `errorUnavailable` (fallback). Lịch sử **phù du** (xoá khi đóng). **✅ test live:** trả lời **CÁ NHÂN HOÁ theo state thật** — biết league (Platinum), số ghế (9), cấp ấm (Lv4, 6 ly/mẻ), số dư xu (~100k) → khuyên đúng nút thắt ("nâng ấm Lv5"). Sau trả lời gợi ý **follow-up động** (2 chip sinh từ nội dung). Lời khuyên **khớp 100% chiến thuật reverse-engineer** (prep trước rush, ưu tiên VIP+shipper, phá bottleneck ấm) → AI được context-inject game state + grounded mechanics, không generic. → AI help+support agent (RAG bám tài liệu/changelog) có quota + escalate sang người. Khác hệ `/support/tickets` (ticket người thật: create/reply/mark-read/claim-reward).
- **✅ Hệ Hỗ trợ / ticket 2 chiều (chunk `SupportOverlay`):** **8 loại** (`categories`): bug (Báo lỗi), feedback (Góp ý), confusing_mechanic (Khó hiểu), **balance (Cân bằng)**, other, **anticheat-appeal (Khiếu nại)**, **pardon_dispute (Phản đối vi phạm)**, donation (🍵 Mời trà đá). Trạng thái: mở → `waiting_user` ("Admin đã trả lời") → `resolved`. **Đính kèm ảnh** (`/support/attachments/`); lọc **"Has gift"** + `claim-reward` → **admin đính QUÀ (xu/item) vào ticket khi xử lý** (kiêm kênh đền bù/goodwill). **Đáng chú ý: `anticheat-appeal` + `pardon_dispute` → có hệ chống gian lận + xử phạt/ban thật + kênh khiếu nại có quy trình** (khớp `status:"flagged"` ở code ghế + server-authoritative + CAPTCHA). → Game đua hạng nghiêm túc cần enforcement + appeal flow, không chỉ chặn kỹ thuật.
- **✅ "Dạo phố" (`/api/v1/social/street`) — bắt live:** = **BXH theo KHU + HẠNG** (không phải toàn server). Response: `{entries:[...], myUsername, league:"platinum", location:"night_market"}` → người chơi gom nhóm theo **mặt bằng đang thuê (location) × hạng league**. Mỗi quán = thẻ public: `{username, seasonEarned (thước đo rank), rank, stallLevel, shopSign.style, lanternStyle, plantStyle, reputationScore, chairs, currentMilestone, profileViews, topBadge:{emoji,count}}`. **Hệ quả thiết kế quan trọng:** (a) **cosmetic HIỂN THỊ CÔNG KHAI** trên thẻ (golden sign, lantern, plant) → đây mới là lý do cosmetic có giá trị = **flex với hàng xóm** → vòng lặp donate→cosmetic→khoe→`profileViews`→ghé lại; (b) **chọn thuê mặt bằng = chọn "khu phố"** (ý nghĩa xã hội, không chỉ rent/spawn); (c) `profileViews` = chỉ số phù phiếm nuôi tương tác. Vào thẻ → `getSocialPreviewState` (xem quán) → react/gift/message/block. **✅ "Xem lén quán" TẠM DỪNG ca của bạn** (tip xác nhận: "Ca bán của bạn sẽ tạm dừng trong lúc ghé xem") → pause hợp lệ (khác `fairness_pause`), chống vừa xem vừa bán.

## 16. Supply crate (`uT`)

| Crate | tea | water | ice | kẹo lạc | hạt |
|---|--:|--:|--:|--:|--:|
| small | 4 | 4 | 4 | 2 | 2 |
| medium | 8 | 8 | 8 | 4 | 4 |
| large | 15 | 15 | 15 | 8 | 8 |

## 17. Công thức đơn hàng & phạt mất khách (hàm `Dp`/`ab`)

**Mỗi khách đặt 1–2 món** (`order` + tuỳ chọn `secondaryOrder`).

**Doanh thu gốc đơn — `Dp`:**
```
gross = (sellPrice[order] + sellPrice[secondaryOrder]) × customerType.paymentMultiplier
```
(chi_pheo paymentMultiplier=0 → 0 đồng.)

**Phạt mất khách — `ab` (`nv` = 0.1):**
```
penalty = round(gross × 0.1 × customerType.leavePenaltyMultiplier)
```
→ Khách thường: phạt = **10% giá đơn**. **VIP (×10): phạt = 100% giá đơn**. **Khi đang rush, NHÂN THÊM** `lostCustomerPenaltyMultiplier` (light ×1,8 / heavy ×2,5) → mất khách lúc heavy rush đắt nhất.

**3 tầng thiệt hại khi 1 khách bỏ đi (chưa kịp phục vụ):** (1) mất doanh thu đơn đó; (2) phạt xu như trên; (3) **mất uy tín** ("Giảm: khách bỏ đi" → kéo uy tín ca xuống, có thể âm). Số liệu cumulative live: khách thường **82 lượt mất → 1.762 xu phạt** (~21,5/lượt); **VIP 10 lượt → 1.025 xu** (~102/lượt, ~5× vì ×10). Phạt trừ vào doanh thu ca ("Phạt" ở màn kết ca).

Phục vụ trễ (khách đã chuyển `grace_leaving`): patience tụt còn ~10% → gần như mất sạch tip (vì <0.6 ngưỡng `ev`).

## 18. Shipper (giao hàng) — cơ chế phục vụ (hàm `ob`)

- Đơn shipper là **bundle nhiều dòng** `lines{itemId, quantity, remaining}`; phải có **đủ 100% nguyên liệu** mới giao được (thiếu → `INSUFFICIENT_RESOURCE`).
- **Shipper tự mang ly** → không tốn/đợi rửa ly; **đỗ vào làn riêng**, không chiếm ghế.
- Thưởng = `discountedPayment` (đơn có sẵn `grossPayment` + `discountRate` → giá ưu đãi theo lô), ×1.1 nếu well-rested, **không có tip**, **uy tín +1**, vẫn chịu trần tiền ngày.
- Spawn tăng theo thời tiết: **mưa ×3, ẩm/lạnh ×2, nóng ×1.5**; biển **Neon shipper ×1.2**. Cần **điện thoại**.
- **Không thể đóng ca khi đang có đơn shipper** đang chạy.
- ✅ **Số liệu thật quan sát khi chơi (đọc state runtime, 2 mẫu):**

  | Đơn | lines | grossPayment | discountRate | discountedPayment | maxPatience | leavePenalty |
  |---|---|--:|--:|--:|--:|--:|
  | shipper-14594 | tea×3 + peanutCandy×1 | 180 | 0.25 | 135 | 45.000ms | 90 |
  | shipper-14630 | tea×4 | 200 | 0.25 | 150 | 45.000ms | 100 |

  **Quy luật chốt được (2 mẫu đồng nhất):**
  - `discountedPayment = grossPayment × (1 − 0.25)` → shipper trả **75% giá gross** (chiết khấu **25% cố định**); bù lại **không tốn ly, không cần tip**.
  - `grossPayment` = Σ sellPrice các món trong đơn (tea 50 / kẹo 30 / hạt 20).
  - **patience = 45.000ms (45 giây) cố định** để giao xong.
  - **leavePenalty = 50% gross cố định** (90 cho gross 180; 100 cho gross 200) — phạt nặng hơn khách ngồi (vốn 10% gross).
  - **Chỉ nội dung đơn biến thiên** (mix món + số lượng). Quan sát mở rộng (5 mẫu): **4–7 món, gross 180–290** (vd tea×3+kẹo×1=180; tea×4=200; tea×4+kẹo×3=290; tea×5+hạt×2=290) — đơn to dần, có thể theo level/tiến trình; net luôn = gross×0,75. Spawn interval ≈ 220 giây/đơn (mục 21).

## 19. Gangster / bảo kê & trộm (hệ rủi ro)

- **Sự kiện gangster** ngẫu nhiên trong ca; có thể **trả tiền** (`/gangster/pay`) hoặc **kháng cự** (`/gangster/resist`) → **chó đánh nhau** với gangster.
  - Chó **thắng → thưởng lớn**; **thua → đập phá thiết bị**, **sửa ghế tốn gấp 3×** (`tip_chair_upgrade_cost`).
  - Chó có chỉ số `hp`/`atk` theo level (`UC(e)={hp:e,atk:e}`); cho ăn **kẹo** để tăng sức trước khi đánh.
- **Trộm vặt khi nghỉ/offline**: có `offlineTheftReport`; **nuôi chó giúp chặn trộm vặt** lúc đang nghỉ.
- Có cả **boss gangster** (endpoint dev `spawn-boss-gangster`).
- **Chi phí sửa ghế (trích được):** base `repairCost = 50 × chairIndex` (`Vv`=50); **sau khi bị gangster đập → ×3** (hàm `Ip(e,t)= Vv·max(1,⌊e⌋), ×3 nếu broken`).
- **Trộm offline**: report có `stolenType` (coins hoặc nguyên liệu), `stolenAmount`, `dogProtected` (bool) — **lượng trộm do server tính**, gửi trong `offlineTheftReport`.
- **Combat gangster (thắng/thua/thưởng) do server xử** qua `/gangster/pay` & `/gangster/resist`; client render `gangsterCount`, `isBoss`, kết quả. **✅ endpoint xác nhận: `payGangster()`/`resistGangster()` = POST KHÔNG body** (server tự resolve, chống chỉnh client).
- **UX modal "Côn đồ đòi bảo kê" (✅ ảnh live):** số tên hiển thị **ẩn dạng "?" (1~3 tên)** — người chơi **không biết chính xác mấy tên khi quyết định** (bất định rủi ro). Hiện sẵn "Chó giữ quán: Có • Level 3". Nút **"Cống nạp (đếm ngược ~14s)"** vs **"Phản kháng"**. Modal `gangster_demanding` **KHÔNG pause game** (đồng hồ ca vẫn chạy → ép quyết nhanh); chỉ `gangster_outcome`/`gangster_battle` mới pause.
- **Phản kháng → `battleReplay = {id, gangsterCount, turns, phases, phaseIndex, phaseStep, countdown}`** = **trận đánh theo lượt (turn-based)**, client phát lại từng phase/turn (animation chiến trường). Chó tham chiến. (Lưu ý: pay/resist resolve có thể đẩy kết quả qua WebSocket → fetch hook thụ động không phải lúc nào cũng bắt được; lần thử này modal hết giờ tự đóng, coins không đổi do không cống nạp.)
- ✅ **Số liệu thật bắt được khi gặp event** (`gang-...`, state `demanding`):
  - `gangsters: [{hp:1, atk:1, alive:true}]` — số lượng & chỉ số tên côn đồ (boss/nhiều tên sẽ cao hơn).
  - **`protectionFee: 90`** xu (trả bảo kê để chúng đi).
  - **`winReward: 225`** xu (kháng cự + chó thắng → nhận).
  - **`expiresAt` = +20.000ms** → **20 giây** để quyết định.
  - `chairCountAtDemand: 9` → phí/thưởng **scale theo quy mô quán** (số ghế).
  - Chó lv3 (hp3/atk3, `UC(e)={hp:e,atk:e}`) > gangster hp1 → thắng chắc → **kháng cự lời hơn trả phí** (nhận +225 thay vì mất 90). Đây là lý do nuôi/cho chó ăn kẹo để mạnh. Thua → đập đồ + sửa ×3.
  - ✅ **Kết quả thật (đã kháng cự):** màn "Chiến trường" → **THẮNG, +225 xu** (đúng `winReward`); chó **3/3 máu nguyên** (gangster atk1 < chó hp3 → thắng không mất máu).
  - ✅ **Quy luật SCALE theo số tên côn đồ** (mẫu 1 tên vs 2 tên):
    - **`protectionFee` = 90 × số tên** (1→90, 2→180).
    - **`winReward` = 225 × số tên** (1→225, 2→450, **✅ 3→675 bắt live**).
    - **HP côn đồ scale theo thứ tự index: tên #1 hp1, #2 hp2, #3 hp3** (atk cũng tăng dần) → nhiều tên = tên sau càng trâu; boss cao hơn nữa.
  - ✅ **`gangsterBattleReport` ĐẦY ĐỦ (3 tên, resist, chó Lv3) — bắt live qua `/api/v1/gangster/resist` (POST body rỗng):** `{id, gangsterCount:3, won:true, winReward:675, feePenalty:0, brokenChairCount:0, dogCaptured:false, turns:[...]}`. Turn-based: R1 chó→#1 (dmg1, gục), chó→#2 (dmg2, gục), #?→chó (dmg2, chó còn 1/3), R2 chó→#3 (dmg3, gục). **Chó Lv3 atk3 one-shot từng tên** (atk≥hp mỗi tên), chỉ ăn 1 đòn → **thắng sạch: phạt 0, ghế vỡ 0, không mất chó**. → Field **`dogCaptured`** xác nhận: **THUA → chó BỊ BẮT** (khớp `dog.capturedRemainingMs`) + `brokenChairCount`>0 (sửa ×3) + `feePenalty`>0. → Nuôi chó Lv3 = gần **miễn nhiễm côn đồ thường**, resist luôn lời (675 ≫ cống nạp 270 cho 3 tên).
  - ⚠️ **KHÔNG action trong 20s → game TỰ ĐỘNG cống nạp (trả phí, mất tiền, không đánh)** = kết cục tệ nhất (mất 180 thay vì +450 nếu thắng). → ép người chơi chủ động quyết.
  - Vòng lặp: demand (20s) → [pay phí / resist combat hp-atk / để hết giờ = auto-pay] → win nhận winReward / lose bị đập đồ (repair ×3).
  - (Phụ: "mời 1 khách về để đóng cửa" tốn ~5 xu — kick-to-close.)
- State liên quan: `gangsterEvent`, `offlineTheftReport`, `gangsterDeferUsedMs`, `blockedByGangster`.
- **✅ Event MỚI "🚔 Đội Trật Tự" (Urban Patrol — minigame dẹp hàng, bắt live):** cảnh báo flavor *"Ông xe ôm báo đội trật tự đang ở đầu phố!"* → bấm "Thu dọn ngay!" → **minigame match-3** (gom **3 món cùng loại**), có **Score + Clears + thanh mana + hint** (hintBounce/hintPulse). **3 kết cục theo điểm:** ✅ pass "Tẩu tán thành công!" (không sao) · ⚠️ warning "Lần sau sẽ phạt!" (doạ) · 🚔 **fail "Tịch thu!" → thu N ghế (mặc định 1) trong PHẦN CÒN LẠI CA NÀY + CA TIẾP THEO** — state: `chair.confiscated=true, confiscatedUntilShift=X` (✅ live: ghế index 8, until shift 35). **⚠️ Hình phạt hiệu lực MỘT NỬA (✅ kiểm chứng live 3 lần):** cờ `confiscated` (a) **KHÔNG chặn khách ngồi** (khách vẫn seated tại ghế 8 khi cờ true — logic xếp chỗ không lọc), (b) **CÓ co hàng đợi** (✅ quan sát: queue 5→**4** slot, vì `iT()=filter(!broken&&!confiscated)` nuôi công thức `queue=2+⌊ghế_hợp_lệ/3⌋`) → sức chứa 14→**13**, (c) KHÔNG dấu hiệu thị giác trên ghế. → Phạt thật = **mất 1 slot xếp hàng** (dễ overflow lúc rush), không phải mất ghế — cờ được nối vào hàm đếm nhưng quên nối vào xếp chỗ + render (bug nửa vời của event mới). **✅ Vòng đời kiểm chứng trọn:** thu ở ca N → hiệu lực ca N + N+1 → **tự trả ở ca N+2** (`confiscated` về false, queue về 5) — đúng văn bản "ca này và ca tiếp theo". → Đây là nguồn của flag `confiscated` trong code ghế. **✅ Minigame cũng NO-PAUSE (quán vẫn bán trong lúc chơi — quan sát live)** → cùng "họ dual-attention" với quiz kiểm tra + côn đồ đòi tiền (3 sự kiện no-pause, không bao giờ chồng nhau). Theme "dẹp hàng khi trật tự tới" cực hợp vỉa hè — đáng bê nguyên sang bia hơi.
- **Event "Tổ kiểm tra liên ngành" (inspection — quiz ~15s):** đoàn kiểm tra ghé, người chơi **đọc thông báo + chọn đáp án để gia hạn chứng chỉ hành nghề**. **✅ Quan sát live: quiz là overlay KHÔNG-PAUSE — trong 15s trả lời, quán VẪN bán bình thường** (khách vào, patience tụt) → sự kiện "chia đôi sự chú ý" cùng họ `gangster_demanding`: dừng tay trả lời = rủi ro mất khách; vừa bán vừa đọc = rủi ro trượt → đình chỉ ca. (Nhưng 2 sự kiện này không bao giờ trùng giờ — luật scheduling.) Cơ chế (✅ trích từ bundle):
  - **2 lần thử** (`attempt 2` = `isStricterCombo`, khắt khe hơn); variant `pass` / `fail` / `timeout`.
  - **Đáp đúng → gia hạn chứng chỉ, chơi tiếp.**
  - **Trượt (cả 2 lần / hết giờ) → "Chứng chỉ bị thu hồi. Ca làm việc bị ĐÌNH CHỈ"** = **đóng ca ngay lập tức, mất toàn bộ thu nhập còn lại của ca** → penalty rất nặng, buộc người chơi chú ý.
  - Xảy ra **tối đa 1 lần/ca**, không trùng event khác. Câu hỏi + đáp án đúng **do server gửi** (giống chat/captcha). KHÁC với CAPTCHA anti-bot (`/captcha`).
  - ⚠️ Còn server-only: **boss gangster** (hp/atk/thưởng — chỉ có asset+dev endpoint ở client; côn đồ thường đã biết 90×n/225×n) và **lượng trộm offline** (`stolenAmount`, type coins/nguyên liệu, `dogProtected`) — cần gặp event thật mới có số.

## 20. Kiến trúc economy (server-authoritative)

Đây là điểm quan trọng cho việc clone: **gần như toàn bộ economy do server quyết định**, client chỉ là mirror/UI.

- API base: **`https://api.trumviahe.com/api/v1/...`** + **websocket** `/api/v1/ws` (realtime ca/khách).
- Giá & catalog: **`/shop/catalog`** (server giữ giá → các hằng số `Wa/mc/...` trong bundle là bản mirror/fallback).
- Hành động được server xác thực: `/serve/{}`, `/shop/buy`, `/upgrade/{equipment,stall,dog,chair}`, `/buy/{chair,cup,dog}`, `/shop/{buy-phone,buy-qr-payment,unlock-flyer,buy-flyer,activate-flyer}`, `/stall/sign/{unlock,buy-style,set-style,rename}`, `/stamina/reopen`, `/repair/chair/{}`, `/gangster/{pay,resist}`.
- Thu thưởng: `/claim/{daily-mission,daily-all,login-track,gift-mission,shift-mission,sign-in-mission,life-path}`, `/inbox/claim-reward`, `/claim/emergency-pack`.
- Xã hội/đua hạng: `/leaderboard`, `/shrine/summary`, `/social/{street,send-message,quick-react,block,report}`, `/referral/{attribute,status}` (referral thưởng ~`{coins:3000, reputation:250}`).
- **Anti-cheat/anti-bot**: `/captcha/{start,answer}` → game có CAPTCHA, và serve được validate server-side ⇒ không thể cày bằng sửa client.
- Lazy-load chunks: LeaderboardDialog, ChangelogOverlay, AuthOverlay, ReportBugOverlay…

→ **Hệ quả khi clone**: muốn chống gian lận & giữ xếp hạng công bằng thì logic kinh tế (serve, reward, cap, gangster, shipper) nên đặt **server-side**, client chỉ render.

---

## 21. Dữ liệu xác thực từ STATE LIVE (đọc từ store trong bộ nhớ trang)

Đọc trực tiếp object state runtime của game (Zustand) → xác nhận client mirror đúng server và bổ sung số chỉ lộ lúc chạy:

- **Catalog server == hằng số bundle**: `shop.items` (giá nhập) và `shop.upgrades` (cost iceBox 30k, teaBrewer 200k, washer 150k...) khớp 100% với mục 2 & 9 → các hằng số đã trích là chính xác.
- **Shipper spawn interval (live): ≈ 220 giây/đơn** (giá trị thô `219768` ms ≈ 3,66 phút); `activeShipperOrder` chỉ có khi đang chạy (lúc đọc = null). Spawn khách (live, sau nâng cấp): ≈ 3,8 giây (giá trị thô `3776` ms).
- **Rush theo lịch session**: `runtime.rushHour.sessionSchedule.slots` = vài đợt định sẵn mỗi ca, ví dụ `[{heavy, offset 207599ms},{light, offset 537480ms}]`.
- **Bộ đếm phạt trong session**: `queueOverflowCount`, `queueLostCount`, `queueLostPenalty`, `queueVipPenalty`, `queueVipLostCount` → game tách riêng phạt VIP.
- **Stamina live**: `currentStaminaMs` 720.000 (đầy), `dailyGameplayEarned` chạy theo ngày, `dailyEarningCapReached` bool (trần 200k), `dailyEarningStats` lưu lịch sử thu/ngày.
- **Thuê mặt bằng = ĐẶT CỌC + trả trước**: `stallRental` có `deposit` (vd 6.860, **hoàn lại** — `depositRefundedAt`), `rentPaid` (vd 27.440 ≈ 7×rent/ngày), `expiresAt` → thuê theo kỳ ~7 ngày, cọc hoàn khi rời.
- **Nhiệm vụ ngày (instance thật)**: 3 nhiệm vụ/ngày theo slot, reward thật ví dụ serve_tea (target 10 → 120 xu+5 uy tín), perfect_tip (9 → 220+5), zero_loss_window (1 → 320+5) + bonus hoàn thành cả 3. **Shift mission**: 3 ca → **1.000 xu + 100 uy tín**. **loginTrack**: chu kỳ 7 ngày.
- **Meta-currency phụ**: `badgeShards`, `cosmeticTokens` (thưởng từ Life Path). **8 huy hiệu** (`badge-config`): 4 theo hạng mùa (🏆 Quán quân, 🥈 Á quân, 🥉 Hạng 3, 🌟 Top 10) + 4 xã hội/referral (🌱 Khai Phá, 🫱 **Kết Nối/Networker** — gate ghế tựa, 💫 Giao Lưu, 🤝 Đại sứ). Badge shard dồn để mở badge; cosmeticToken mua trang trí (lồng đèn/cây/biển — giá ở chunk cosmetic, chưa chốt).
- **chairmanDisguise** (cơ chế pity gắn Chí Phèo) — ✅ **quan sát live**: một số ông **Chí Phèo** thật ra là **"Chủ tịch giả nghèo"**, sau khi tích pity/ngẫu nhiên sẽ **lộ diện và tặng hộp quà bí ẩn**. Mẫu bắt được (5 lần) → **3 loại quà** (`category`): **coins** (349, 355, 387, 476 xu → ~**350–480**, dải rộng hơn dự kiến) · **ingredient** (15 nước / **37 trà** — item & lượng biến thiên) · **reputation** (**✅ 51–92 uy tín** — 2 mẫu live, khoản uy tín đáng kể). Server roll: cục xu nhỏ hoặc một xấp nguyên liệu; `pityCounter` reset về 0 sau reveal; `totalReveals` tích luỹ (đang 16); `id` dạng `chairman_<timestamp>`. **✅ OVERFLOW kho → đổi xu (luật mới, bắt live lần 3):** server roll `rolledAmount:37 trà`, kho chỉ nhận `amount:14`, **23 thừa tự đổi `overflowCoins:115` = 23×5 (×`unitPrice` trà)** ("Kho đầy, nhận 14 trà + 23 đổi 115 xu"). → **Nguyên liệu thưởng vượt sức chứa TỰ ĐỘNG quy ra xu theo `unitPrice`** — luật chung cho mọi quà NL (chairman, mùa `partialClaimed`, nhiệm vụ, crate); roll có thể lớn (≥37). **✅ Có thể lộ NHIỀU LẦN/ca (KHÔNG phải 1/ca) — bắt live 3 lần trong 1 ca:** tần suất **tỉ lệ với lượng Chí Phèo gặp** (pity đầy từ Chí Phèo) → ca Oi bức/Nắng nóng (chi_pheo ×1.5) → pity đầy nhanh gấp đôi → nhiều chairman hơn. **Ngưỡng pity + xác suất + giá trị = server-side** (chống đoán/farm). → Chí Phèo là **canh bạc**: chịu mất ghế đổi cơ hội nhận quà; thiết kế khéo biến khách "lỗ" thành phần thưởng tích luỹ, người chơi bớt ghét Chí Phèo.
- **Slot trang trí**: ngoài `shopSign` còn `lantern` (lồng đèn) & `plant` (cây cảnh) — cosmetic có unlockedStyles. ✅ **Style xác nhận từ asset:** đèn lồng = {đỏ, vintage, Nhật}; cây cảnh = {trúc phát tài (bamboo), bonsai, hoa lan (orchid), sen đá (succulent)}. State: `stall.lantern.{style,unlockedStyles}` + `stall.plant.{style,unlockedStyles}`. **Cây cảnh hiếm hơn đèn lồng** (tip "Bạn có biết" xác nhận có bậc độ hiếm); lấy qua donation/thưởng (asset `secret-box-closed` gợi ý hộp ngẫu nhiên).
- **✅ Luật scheduling sự kiện (tip "Bạn có biết"):** một sự kiện xảy ra **tối đa 1 lần/ca** và **KHÔNG bao giờ trùng giờ với Tổ kiểm tra liên ngành** → game **cố ý không cho 2 sự kiện phạt nặng chồng nhau** (tránh trừng phạt kép). Màn đóng cửa còn xoay vòng **tip "Bạn có biết..."** (`tips_widget`) — vừa flavor vừa hé lộ cơ chế.
- **Khách LIVE (đọc lúc chơi) — patience & giá trị đơn thật:**
  - **Base patience khách thường ≈ 18.000ms (18s)** [đính chính: số 13.500 đo trước đó là lúc **Oi bức ×0,75** → 13.500 = 18.000×0,75]. Patience hiển thị = base × weather × type. Vd **mưa phùn ×1,15**: normal ~20.700, VIP ~12.650 (×0,611), **stubborn ~207.000** (×10). Khớp các hệ số mục 4/5.
  - **Thời gian "ngồi uống" (enjoyTime) giữ ghế sau khi phục vụ**: base 5–10s; VIP ~6,5s; **stubborn tới ~111s** (enjoyMultiplier ×10) → ngồi lỳ chiếm ghế rất lâu, hiệu quả như mất 1 ghế suốt rush.
  - **Sức chứa**: 9 ghế + hàng đợi 5 (=2+⌊9/3⌋) = **14 khách đồng thời**. Rush nặng đến ~1 khách/giây (141–145/150s) > throughput đỉnh → ~27–29% bỏ đi + tip sụp.
  - **2 loại "bỏ đi" tách biệt:** (a) **queueOverflow** — đến lúc 14 slot đầy → **từ chối ngay tại cửa** (không vào, gần như không phạt; cum đếm rất lớn ~1.787); (b) **queueLost** — đã vào ghế/đợi nhưng **hết kiên nhẫn trước khi phục vụ** → **bị phạt** (cum 83 lượt → 1.775 xu). "Khách bỏ ở hàng đợi vì chờ lâu" = loại (b).
  - **Combo tệ nhất = humid + heavy rush → tip chỉ ~9%** (3 heavy rush quan sát: tip 14% / 15% / **9%**): humid patience ×0,75 (ngắn sẵn) + rush dồn → phục vụ trễ qua ngưỡng 60% → mất sạch tip. Nút thắt thường là **ly sạch + đá** (vd rack 2/12), không phải ghế → heavy+humid cần rửa ly nhanh + nhiều ly + đá đầy.
  - Giá trị đơn thật (đã gồm Chợ Đêm ×1.20 + thời tiết Oi bức + well-rested): khách thường 1 trà ≈ **94**; **VIP 1 trà ≈ 364 (≈ 3,9× khách thường)** — VIP là faucet trội hẳn do tip ×10 chi phối; rush đặt **2 món** (hạt+trà) ≈ 133 → xác nhận cơ chế `order` + `secondaryOrder`.
- **Heavy rush (Cao điểm NẶNG) — quan sát live:**
  - `spawnInterval` tụt còn **~719ms** (so với ~3.776ms thường) → khách vào **~5× nhanh** (khớp `rushMultiplier 0.2`); rush kéo **~150 giây**.
  - Cơ cấu dồn về cao giá trị: rush weight ×3 + thường có **nhiều VIP cùng lúc** (quan sát 2 VIP) → cửa sổ "in tiền".
  - Rủi ro: phạt mất khách **×2.5**; mất VIP = mất nguyên gross → vừa cơ hội vừa dễ "chảy máu" nếu throughput không kịp.
  - `shipperSpawnInterval` rút theo thời tiết (live): base ~220s → **humid ~152s** (shipper×2) → **mưa phùn ~140s** (shipper×3, ngắn nhất = nhiều đơn shipper nhất).
- **Cross-check tip ở cấp tổng:** snapshot tích luỹ `earned 839.459` vs `tipsEarned 258.251` → **tip ≈ 31% doanh thu**, khớp thiết kế tip gốc **30%** (mục 12).
- **Tip% TỈ LỆ NGHỊCH với độ nặng rush (quan sát 3 mức, insight design quan trọng):**

  | Loại tải | Khách đến | Phục vụ | Bỏ đi | Tip% | Phạt |
  |---|--:|--:|--:|--:|--:|
  | Ca thường | 307 | 89% | 11% | 72% | nhỏ |
  | **Rush nhẹ** | 45–46 | **100%** | **0%** | **47–56%** | **0** |
  | Rush nặng | 142–145 | 72–**77%** | 23–28% | **9–19%** | có |

  Cơ chế: rush nặng dồn khách + patience ×0,611 → phục vụ trễ, **qua ngưỡng 60% (`ev`) → tip = 0**.
  - **Rush NHẸ = "điểm ngọt"**: ~0,5 khách/giây nằm trong sức 9 ghế → phục vụ 100%, **96% boa, tip ~47–56% doanh thu**, net ~5.5k/90s (~62 xu/s), **0 phạt** → lợi nhuận sạch & ổn định.
  - **Rush NẶNG = canh bạc throughput**: volume gấp 3 nhưng vượt sức → mất 23–28% + tip sụp 9–19% + phạt (gross 7.3–9.2k, net 6.3–8.9k). Đủ throughput thì hốt đậm, thiếu thì volume cao mà tip sụp.
  - **✅ A/B well-rested trên heavy rush (cùng ~142–143 khách, ~78% phục vụ):** CÓ buff ×1.1 → net **8.920**; HẾT buff → net **7.375** (chênh ~1.545 ≈ **+21%**) → cô lập được giá trị thực well-rested trên 1 rush nặng. Trần phục vụ **~0,74 ly/giây ổn định** qua nhiều rush, không đổi theo thời tiết (143/150s vào 0,95/s − phục vụ 0,74/s = 32 bỏ).
  - **✅ Bài toán throughput (heavy rush #4, well-rested ×1.1):** 142 khách/150s = **0,95/giây vào** vs phục vụ **0,73/giây** (109 ly, ~1 ly/1,37s) → **chênh 0,22/s × 150 = 33 bỏ đi (23%)** — khớp tuyệt đối. → **Trần tay người chơi ~0,73 ly/giây**; mọi thứ vượt mức đó ở heavy rush đều rơi. Hàng đợi (panel "ĐỢI") **đầy 5** suốt peak. Phạt chỉ **−239** cho 33 khách bỏ → xác nhận phần lớn là **queueOverflow (từ chối ở cửa, KHÔNG phạt)**, chỉ số ít **queueLost** bị phạt. Net +2.570 so lần trước nhờ well-rested ×1.1 + xử lý nhanh hơn (serve 77% vs ~72%).
  → Hai mức rush tạo 2 trải nghiệm kinh tế khác hẳn: nhẹ thưởng sự ổn định, nặng thưởng người đã đầu tư ghế/pha/rửa/đá.

### Vẫn nằm hoàn toàn ở server (không lấy được nếu không kích hoạt sự kiện)
- Nội dung đơn shipper (số món/đơn, `discountRate`, hạn giao, mức phạt) — chỉ hiện khi `activeShipperOrder` ≠ null.
- Gangster: xác suất gặp, phần thưởng thắng, thiệt hại khi thua, số tiền "trả bảo kê", lượng trộm offline — chỉ hiện khi có sự kiện.
- Bảng thưởng `chairmanDisguise`.
→ Muốn lấy nốt phải **chơi thật** qua các sự kiện đó để đọc giá trị runtime; không có trong bất kỳ config tĩnh nào.

## 22. Quét chunk lazy-load & các hệ phụ (đã xác minh hết phía client)

Đã fetch & soi các chunk tách rời — **toàn bộ là UI, mọi hằng số economy đều nằm ở main bundle** (đã trích). Chunk: ChangelogOverlay, LeaderboardDialog, ShrineDrawer, ShrinePlayerArchiveDialog, RentalScreen, MissionDialog, DonateTeaOverlay, StreetView, SocialPreviewOverlay, badge-config, sign-text-styles, GameCanvas/pixi (render), Auth/Support/ReportBug…

Phát hiện/làm rõ thêm:

- **"Mời Trà Đá" (DonateTea) = MÔ HÌNH MONETIZATION** (✅ xác nhận): quyên góp tự nguyện cho tác giả qua **chuyển khoản** (`/api/v1/donate/{config,submit,cancel}`), 2 mức **20.000đ / 50.000đ**, ĐỔI **1 "quà cảm ơn" cosmetic**:
  - 🫱 Huy hiệu **Kết Nối** (Networker — badge gate ghế tựa) · 🏮 Đèn lồng (4 style) · 🌿 Cây cảnh (4 style) · 🪧 Biển hiệu (4 style: Neon/Vintage/Thư pháp/Vàng) · hoặc "không cần quà".
  - Một số quà có **`repGate` "Cần ⭐ X"** (vd biển Vàng cần 5.000⭐) → tiền KHÔNG mua tắt được; vẫn cần uy tín. `owned`="Đã có". Có ô lời nhắn cho tác giả (chú thích "không phải nội dung CK").
  - **KHÔNG pay-to-win**: chỉ bán **cosmetic + huy hiệu tiện ích** (Networker cũng kiếm free qua referral), KHÔNG bán xu/power/thứ hạng. → Đây cũng là **con đường chính lấy cosmetic** (không grind/không cosmeticToken như suy đoán trước). Mô hình donation lành mạnh, đáng học cho bản bia hơi.
- **giftMission** (xã hội): tặng trà cho **3 người chơi khác nhau** (`Ep`=3) → thưởng `jp` = **300 xu + 15 uy tín**.
- **emergencyPack** ("Gói cứu trợ"): khi **hết nguyên liệu/kẹt** thì claim gói miễn phí để chơi tiếp — **lưới an toàn chống softlock**, không phải faucet thường.
- **shiftMission**: target 3 ca → reward `gc` = **1.000 xu + 100 uy tín** (xác nhận trùng live state).
- **WC = {3.000 xu, 250 uy tín}**: một reward lớn (nhiều khả năng **referral/mời bạn**; chưa chốt 100% trigger).
- **Không tồn tại trong client**: reputation decay, prestige/rebirth, lãi suất/thuế, thu nhập idle khi offline (ngoài welcome-back + trộm offline). → game **không** có passive income kiểu idle-away.
- Một số hằng số minify còn lại **không phải economy**: `_v`=13.000ms & `kv` (timer nhấp nháy UI), `zC`/`QC`/`XC`/`Nv` (const export cho UI social: emoji, câu chúc, react).
- **Trợ lý AI in-game ("Trà Đấm") — feature đáng học:** chatbot tư vấn **dùng số liệu realtime của người chơi** (kho hiện có, số ghế, cấp thiết bị, thời tiết ca tới, hạng, uy tín) để khuyên cá nhân hoá rất sát — vd "thùng đá mới cấp 3, đang cảnh báo thiếu đá → treo biển Vintage giảm 50% khách vội". Giới hạn ~20 tin/phiên (`x/20`), lịch sử xoá khi đóng. Đây là lớp onboarding/retention thông minh: biến tooltip tĩnh thành tư vấn động theo trạng thái thật.

### Trần cuối cùng (không thể lấy thêm nếu không có quyền server / không kích hoạt sự kiện)
1. Nội dung đơn **shipper** (số món, `discountRate`, hạn giao, phạt) — chỉ có khi `activeShipperOrder`≠null.
2. Số liệu **gangster/bảo kê** (xác suất, thưởng thắng, thiệt hại thua, tiền chuộc, lượng trộm offline) — chỉ có khi `gangsterEvent`≠null.
3. Bảng thưởng **chairmanDisguise** (pity reveal Chí Phèo).
4. ~~Phần thưởng cuối mùa giải / Đền Thiêng / độ dài & reset mùa~~ — ✅ **đã gỡ hết** (mục 11): 2 mùa song song **Phân Hạng 7 ngày** + **Tranh Bá 14 ngày**, neo epoch 2026-04-11 (tz VN); thưởng = bó nguyên liệu theo hạng + huy chương top10 + Đền Thiêng, giao qua hòm thư.
5. Định nghĩa **catalog server** đầy đủ (đã xác nhận phần giá/upgrade khớp client; phần còn lại chỉ server giữ).

→ Cả 5 mục trên đều **server-authoritative**. Cách duy nhất lấy: (a) **chơi thật** qua từng sự kiện rồi đọc state runtime, hoặc (b) có quyền truy cập backend/API. Ngoài hai cách đó, **đã khai thác hết** dữ liệu economy mà client lộ ra.

## 23. HỆ THỐNG NHIỆM VỤ (tổng hợp — bundle + chơi thật)

Game có **7 nhánh nhiệm vụ/tiến trình** tách biệt:

### A. Nhiệm vụ ngày — 3 slot/ngày (`Mc`=3; pool `wc`; reward `hm`; target `rS`)
- Mỗi ngày bốc 3 nhiệm vụ, mỗi slot 1 cái từ pool riêng:
  - **Slot 0** (dễ): `serve_customers` | `serve_tea` | `serve_snacks`
  - **Slot 1** (vừa): `perfect_tip` | `earn_coins`
  - **Slot 2** (khó): `zero_loss_window`
- **Reward theo SLOT** (cố định, không theo loại nhiệm vụ) — `hm`:

  | Slot | Reward |
  |---|---|
  | 0 | 120 xu + 5 uy tín |
  | 1 | 220 xu + 5 uy tín |
  | 2 | 320 xu + 5 uy tín |

- **Target scale theo tiến trình** (`rS`, base→max): serve_customers 21→102 · serve_tea 10→53 · serve_snacks 8→51 · perfect_tip 9→41 · earn_coins 1.100→9.200 · zero_loss_window 1.
  - `perfect_tip` đếm lượt phục vụ khi patience > 60% (ngưỡng `ev`); `zero_loss_window` = không mất khách trong 1 khoảng.
- **Hoàn thành cả 3 → bonus `Tp` = 1 tờ rơi + 1 badge shard.**
- Lịch sử xoay vòng lưu ở `recentMissionHistory` (tránh lặp).

### B. Shift mission
3 ca/ngày → **1.000 xu + 100 uy tín** (`gc`).

### C. Gift mission (xã hội)
Tặng trà cho **3 người chơi khác nhau** (`Ep`=3) → **300 xu + 15 uy tín** (`jp`).

### D. Login track (điểm danh, `cT`)
Chu kỳ 7 ngày, thưởng UY TÍN nhân đôi: ngày 1→+2, 2→+4, 3→+8, 4→+16, 5→+32, 6→+64, 7→+128.

### E. Sign-in mission
Nhiệm vụ gắn tài khoản/đăng nhập (state `signInMission`, hiện null).

### F. Referral (mời bạn)
~**3.000 xu + 250 uy tín** (`WC`), qua `/referral/attribute`.

### G. Life Path (LP1–LP7)
Mốc tích luỹ cả đời (xem mục 11) — thưởng lớn (xu + crate + badge shard + cosmetic token).

**Nguyên tắc cân bằng (đáng học cho bản bia hơi):** thưởng nhiệm vụ chủ yếu là **uy tín + xu nhỏ + vật phẩm** (tờ rơi, badge shard), và **KHÔNG tính vào điểm xếp hạng mùa** → nhiệm vụ là đường tiến trình/retention phụ, không phá cân bằng đua hạng (vốn chỉ tính doanh thu phục vụ + shipper).

## 24. Đối chiếu với bản research cũ (file upload)

**Khớp 100%** ở: giá món, giá vốn/margin, spawn 10.5s, ngồi 5–10s, weight khách (1/0.3/0.1/0.03/0.1), VIP tip×10/phạt×10, toàn bộ bảng thời tiết, rush hour, biển hiệu, cost progression thiết bị, dog 2k+20 đá, stamina 12 phút, daily cap 8/6/5, hard cap 200k, well-rested ×1.1.

**Bản trích của tôi bổ sung/chuẩn hơn:**
- **Phân tách rõ 2 hệ**: League theo mùa (8 bậc, có ngưỡng & tên VN) vs Life Path (LP0–LP7) — bản cũ gộp lẫn league vào LP.
- **Tên + công thức rent** mặt bằng chính xác (`Dn(e)`), thay vì chỉ bảng số.
- **Stats từng cấp thiết bị** đầy đủ (melt interval, batch size, brew/wash time, slots, capacity).
- **Phân bố thời tiết** (35/20/10/20/15) và **hồi thể lực giảm dần theo phiên** (`jv`).
- **State khởi đầu** (300 xu, kho ban đầu) và **bảng reward nhiệm vụ** (`rS`).

**Khác biệt nhỏ:** bản cũ liệt kê "Cổng Trường" trùng dòng và nhãn multiplier hơi lệch ở mục cuối — bản trích trực tiếp ở trên là chuẩn.

*Phương pháp: nạp bundle vào biến page, regex-grep từng config object (Wa, mc, ni, ei, Cp, fc, Rp, Cc/za/Ir/Al, De, Fr, Ya, rS). Không dùng nội dung file research cũ.*

## 25. Mô hình 2 tiền tệ (xu & uy tín) — tổng hợp

**XU có 3 chỉ số tách biệt** (quan trọng — đừng gộp làm một khi implement):
- **Số dư** (`coins`): tiền tiêu được, **trừ khi mua/nâng cấp/thuê**.
- **Thu mùa này** (`seasonEarned`): tổng doanh thu trong mùa → **điểm xếp hạng league**; cộng dồn, **KHÔNG giảm khi tiêu**; reset mỗi mùa.
- **Thu liên mùa / trọn đời** (`lifetimeEarned`): cộng dồn vĩnh viễn → **drive mốc Life Path**.
→ Tiêu tiền không làm tụt hạng; chỉ doanh-thu-kiếm-được mới tính hạng & milestone.

**UY TÍN (`reputation`):**
- **Kiếm**: phục vụ sớm (+3 có boa / +1 không boa, mục 12), hoàn thành nhiệm vụ, điểm danh, thưởng mốc.
- **Mất**: khách bỏ đi, bỏ lỡ nhiệm vụ. (Lưu ý: uy tín **có thể âm trong 1 ca** — xem sổ kết ca.)
- **Tiêu vào 4 việc** (`repUsage*`):
  1. **Tiễn ngồi lỳ giữa ca** — đuổi khách stubborn đang ngồi; **cost = hàm số theo số giây đã ngồi** (`tip_kick_cost`; ngồi càng lâu càng đắt; server tính). ⚠️ Khác hẳn **"Mời về để đóng cửa"** (tốn XU, hàm `ab`, xem mục 12b).
  2. **Nâng cấp ghế tựa** — uy tín `[3.000…40.000]` mỗi cấp (mục 9).
  3. **Phát tờ rơi** — phát động chiến dịch (mục 14).
  4. **Mở quầy bánh mì** — ⚠️ **feature SẮP CÓ, chưa implement** (chỉ là label `repUsageBread` + flavor text; chưa có logic `banhMi/breadCounter`). → Roadmap: dòng sản phẩm thứ 2 mở bằng uy tín.
- Ngoài ra uy tín còn làm **gate** (golden sign 5.000⭐; ghế tựa cần huy hiệu Kết Nối).

→ Uy tín = "meta-currency" tách khỏi xu: vừa là điểm hạng (mục 11), vừa là tiền mua các thứ "mềm" (đuổi khách, marketing, mở rộng) — giảm áp lực lạm phát xu.

## 12b. Phạt bỏ đi (`ab`) & "Mời về để đóng cửa" — ✅ đọc thẳng bundle

Một hàm `ab(c)` dùng chung cho **cả 2 tình huống**: khách tự bỏ đi VÀ chủ động mời về lúc đóng ca.

```js
ab(c)  = max(0, round( Dp(c) × nv × leavePenaltyMultiplier[type] ))   // nv = 0.1
Dp(c)  = round( (basePrice(order) + basePrice(secondaryOrder)) × paymentMultiplier[type] )  // GIÁ GỐC, KHÔNG gồm tip / nhân sự kiện-thời tiết
```

| Loại | paymentMult | **leavePenaltyMult** | Phí mời về / phạt bỏ đi |
|---|---:|---:|---|
| Thường / Vội | 1 | **1** | 10% giá gốc đơn |
| Ngồi lỳ (stubborn) | 1 | **1** | 10% giá gốc đơn (rẻ — dù chiếm ghế lâu nhất) |
| **VIP** | 1 | **10** | **= 100% giá gốc đơn** (đắt nhất) |
| **Chí Phèo** | 0 | **0** | **0 — miễn phí** (vốn không trả tiền) |

**"Mời về để đóng cửa"** (chế độ `stallOperatingMode==="closing"`): chi phí hiển thị `kd = Σ ab(c)` trên mọi khách đang `waiting/ordering/enjoying/grace_leaving` + queue (trừ `angry_leaving/leaving`). Nhãn `~-{kd}` ("~" = **ước lượng client**, server chốt số thật). **✅ đối chiếu live:** 3 khách (VIP+2 ngồi lỳ) = ~-57 (VIP ≈ 50, 2 ngồi lỳ ≈ 7); VIP rời ghế → 2 ngồi lỳ = ~-7. → Chi phí **cố định/khách, KHÔNG co giãn theo giây ngồi**; con số tụt là do VIP rời danh sách.

**Bài học:** (1) tái dùng 1 công thức cho "bỏ đi" + "mời về" — gọn; (2) đuổi ngồi lỳ **rẻ** (van xả ghế hợp lý), đuổi VIP **đắt ngang giá đơn**, đuổi Chí Phèo **free**; (3) khách `enjoying` (đã trả tiền) vẫn bị tính phí mời về — đã thu tiền+tip rồi, mời sớm chỉ mất thêm 10% giá gốc.
