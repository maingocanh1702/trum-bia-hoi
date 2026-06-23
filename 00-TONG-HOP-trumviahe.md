# 📋 TỔNG HỢP NGHIÊN CỨU — Trùm Trà Đá Vỉa Hè (trumviahe.com)

Tài liệu master, điểm vào duy nhất cho toàn bộ nghiên cứu. Nguồn: đọc trực tiếp client bundle `index-BWec7RjV.js` (447KB) + chơi thật & đọc state runtime (Zustand) + quan sát UI. Ngày: 2026-06.

## 📁 Bộ tài liệu (4 file chi tiết)
1. **`economy-spec-from-bundle.md`** — đặc tả kinh tế đầy đủ (25 mục, mọi công thức/hằng số). ⭐ quan trọng nhất.
2. **`uiux-analysis-trumviahe.md`** — phân tích UI/UX (đã mở rộng nhiều mục: art direction, HUD, state-aware UX, screen-by-screen, heuristic checklist, UI spec MVP, luồng phục vụ/thất bại…).
3. **`design-component-catalog-trumviahe.md`** — catalog asset/component/icon/animation/token.
4. **`brief-gameplay-trumviahe.md`** — brief gameplay ngắn ban đầu.

---

## 1. Game là gì
Idle/tycoon **phục vụ khách theo ca**, web (Pixi.js canvas + React DOM overlay), mobile-first, **server-authoritative** (`api.trumviahe.com` + websocket; serve/giá/reward validate server-side; có CAPTCHA chống bot). Chủ đề quán trà đá vỉa hè VN, "rèn tư duy kinh doanh".

**Vòng lặp:** Mở ca (cần thể lực 100%) → khách đổ vào ~12 phút → chạm phục vụ (đúng món, kịp patience) → thu tiền+tip+uy tín → hết thể lực đóng ca → xem sổ sách → nâng cấp → leo mùa giải. Có anti-idle (pause khi không theo dõi tab).

## 2. Kinh tế đơn vị (unit economy)
| Món | Giá bán | Vốn lẻ | Vốn sỉ (lô 10) | Margin |
|---|--:|--:|--:|--:|
| Trà đá (tea+nước+đá, prep 3s, cần ly) | 50 | 10 | 8 | 80–84% |
| Kẹo lạc (phục vụ liền) | 30 | 15 | 12 | 50–60% |
| Hạt hướng dương | 20 | 8 | 6.5 | 60–67% |

Nguyên liệu (giá lẻ/lô10): Trà 5/40 · Nước 2/15 · Đá 3/25 · Kẹo 15/120 · Hạt 8/65. Margin cao → **burn chính là upgrade/rent/penalty**, không phải giá vốn.

## 3. Phục vụ, patience, queue (throughput economy)
- Spawn base **10.500ms/khách**, điều chỉnh bởi **×weather ×rush ×flyer/biển hiệu/sự kiện** (nâng cấp chủ yếu tăng throughput/capacity, không nhân trực tiếp spawn); warmup đầu ca ×1.6.
- **Patience base ~18.000ms** ×weather (Oi bức 0,75 / mưa 1,15) ×type.
- **Enjoy (giữ ghế sau phục vụ)** 5–10s ×type.
- **Sức chứa = số ghế (tới 10) + hàng đợi `2+⌊ghế/3⌋`** → 9 ghế = 9+5 = **14 đồng thời**; vượt → bỏ ngay (overflow).
- Mỗi khách = entity giữ 1 ghế + **1 ly có id** (`reservedGlassId`) + reserve đá/trà; ly trả về dạng **bẩn** → chu kỳ rửa. Ly = tài nguyên quay vòng định danh = lõi bottleneck.

## 4. Loại khách (weight + chiến thuật)
| Loại | Weight | Đặc điểm |
|---|--:|---|
| Thường | 1.0 | nền tảng, trả+tip bình thường |
| Vội | 0.3 | patience ×0,611 (ngắn) → xử nhanh; đông trong rush |
| **VIP** | 0.1 | **tip ×10, phạt mất ×10**; phục vụ sớm ~345–364 xu, trễ ~60 → **ưu tiên #1** |
| Chí Phèo | 0.03 | **không trả tiền** + chiếm ghế (patience ×5); nhưng **lộ "Chủ tịch" → quà** (xu ~350–390 hoặc nguyên liệu); Oi bức ×1,5 |
| Ngồi lỳ | 0.1 | trả+tip bình thường nhưng **giữ ghế 50–100s** (enjoy ×10) → bẫy throughput |
| Shipper | timer ~220s | đơn bundle, **−25% chiết khấu**, **không tốn ly**, lỡ phạt 50% gross |

## 5. TIP & UY TÍN (công thức chốt)
**Tip** (`ub`): nếu `patience/maxPatience < 0,6` → **0**; ngược lại `round(payment × 0,3)`. Rồi ×rush ×weather ×**type(VIP 10)** ×QR(ceil 1,2); cuối ×well-rested 1,1.
→ **Vách đá 60%**: VIP phục vụ sớm vs trễ chênh ~5,5× (×10 khuếch đại). Một VIP đáng ~60 đến ~400+ xu.

**Uy tín ca = Σ(+3 có boa / +1 không boa) − ~5 × (số bỏ đi).** Ca tốt +530; heavy rush mất nhiều khách −2.421. = thước đo chất lượng phục vụ.

**Phạt mất khách** (`ab`): `round(gross × 0,1 × leavePenaltyMult)`; ×rush penalty (light 1,8 / heavy 2,5). VIP ×10 = mất nguyên đơn. Mất khách = 3 tầng: mất đơn + phạt xu + tụt uy tín.

## 6. Thời tiết & giờ cao điểm (lớp hệ số)
**Thời tiết** (phân bố sunny35/hot20/humid10/rain20/cold15): hot (đá tan×1,5, tip×1,15, shipper×1,5); **humid/Oi bức** (đá tan×2, tip×1,2, shipper×2, chi_pheo×1,5, patience×0,75); rain (shipper×3, stubborn×2); cold (không cần đá, trà×2/ly, brew×2,5).
**Cao điểm**: light (90s, pay×1,05, tip×1,1, phạt×1,8, **spawn interval ×0,35** → khách vào nhanh hơn), heavy (150s, pay×1,1, tip×1,18, phạt×2,5, **spawn interval ×0,2** → vào rất nhanh), lunchLight.
→ **Rush nhẹ = điểm ngọt** (vừa sức → 100% phục vụ, tip 47–56%, 0 phạt). **Rush nặng = canh bạc throughput** (mất 27–28%, tip sụp 9–17%). Humid+heavy = tệ nhất (tip 9%).

## 7. Nâng cấp (sink chính, giá hàm mũ)
- **Thùng đá** (riêng cho đá): 0/2k/8k/30k/100k — cap 20→250, tan 30s→∞.
- **Ấm tích**: 0/3k/12k/50k/200k — batch 1→12, brew 15s→6s.
- **Bộ rửa ly**: 0/2.5k/10k/40k/150k — wash 7s→1,5s, slot 1→5.
- **Quầy** (kho 4 NL kia, = "stall level"): 0/1k/5k/20k/80k — cap 15→150.
- **Ghế nhựa**: 4→200…10→10.000. **Ghế tựa** (mở "2 món", phí sửa côn đồ ×3): 100k+t×50k + uy tín [3k…40k], cần huy hiệu Kết Nối.
- **Chó**: 2k+20 đá; nâng +kẹo. **Mua 1 lần**: điện thoại 5k, QR 8k (+20% tip), lắp biển 20k.
- Mỗi nâng cấp **đổi sprite theo cấp** (visual progression).

## 8. Thể lực, ca & trần (gating)
Thể lực **12 phút/ca**; hồi 0,4×realtime (~30 phút, **chỉ đếm khi active**); phải đầy 100% mới mở ca; cooldown tính **từ khi khách về hết** (không phải hết giờ). Trần **8/6/5 ca/ngày**, **hard cap 200k xu/ngày**, well-rested ×1,1 (10 phút sau nghỉ >6h). Đóng ca = "closing" grace (khách đang uống ở lại; stubborn kéo dài; `kick-all` đóng ngay).

## 9. Hai hệ tiến trình + 2 mùa giải
- **League theo mùa** (điểm = doanh thu phục vụ+shipper, loại trừ thưởng nhiệm vụ): Đồng 0 / Bạc 20k / Vàng 60k / Titan 120k / Bạch Kim 180k / Hồng Ngọc 300k / Kim Cương 500k / Huyền Thoại 1M.
- **2 mùa SONG SONG**: **Phân Hạng (7 ngày)** thưởng đậm + top10 huy chương + Đền Thiêng; **Tranh Bá (14 ngày)** thưởng nhẹ. Neo epoch 2026-04-11, tz VN. Thưởng cuối mùa = **bó nguyên liệu theo hạng** (KHÔNG bơm xu), giao qua hòm thư.
- **Life Path LP0–LP7** (mốc trọn đời 50k→50M): thưởng xu + crate + badge shard + cosmetic token; gate tính năng/mặt bằng.

## 10. Mặt bằng (multiplier + rent + cọc)
9 địa điểm, multiplier ×1.0→×1.8, rent/ngày `Dn(e)=round(700·(e/5)·(1+e/50))`. **Kỳ thuê: live state hiện tại xác nhận 7 ngày** (màn UI ghi "7 ngày"); *changelog web cũ từng ghi 14 ngày → có thể khác version*. Trả trước cả kỳ + **cọc 25% (hoàn lại)**; rời sớm mất cọc + về Hẻm Nhỏ. Gate theo Life Path (Phố Cổ LP4, Ga Metro LP5, Khu Phố Tây LP6).

## 11. Sự kiện & rủi ro
- **Shipper** (live): đơn 4–7 món, gross 180–290, **net = gross×0,75** (discount 25% cố định), patience 45s, phạt 50% gross. Không tốn ly. Spawn ~220s (×weather/Neon).
- **Gangster/bảo kê** (live): **phí = 90×số tên**, **thưởng thắng = 225×số tên**, 20s quyết định; chó (hp/atk=level) đánh — thắng nhận thưởng, thua đập đồ (sửa ghế ×3 = 50×index×3); **bỏ mặc → tự cống nạp** (tệ nhất). Boss gangster = server-only.
- **Chí Phèo → Chủ tịch**: lootbox (xu 350–390 / nguyên liệu ~15).
- **Tổ kiểm tra liên ngành**: quiz ~15s, 2 lần thử; **trượt → thu hồi chứng chỉ + ĐÌNH CHỈ CA** (mất hết thu còn lại).
- **Trộm offline**: mất xu/nguyên liệu khi nghỉ không chó (số = server-only).

## 12. Hệ nhiệm vụ (7 nhánh)
- **Ngày** (3 slot): slot0 (serve_*) 120xu, slot1 (perfect_tip/earn_coins) 220xu, slot2 (zero_loss, cửa sổ 4 phút) 320xu — đều +5 uy tín; **xong cả 3 → 1 tờ rơi + 1 badge shard**.
- **Shift** (3 ca) → 1.000xu+100 uy tín. **Gift** (tặng 3 người) → 300+15. **Điểm danh** 7 ngày (uy tín 2→128). **Referral** (250/1.000/3.000⭐, mốc 3 cần bạn đạt LP2). **Sign-in**, **Life Path**.
→ Thưởng nhiệm vụ chủ yếu **uy tín + xu nhỏ + vật phẩm**, KHÔNG tính vào xếp hạng → retention phụ, không phá cân bằng.

## 13. Tiền tệ & meta
- **Xu** 3 sổ tách biệt: số dư (tiêu được) / thu mùa (điểm hạng) / thu liên mùa (Life Path).
- **Uy tín**: kiếm (phục vụ/nhiệm vụ), mất (bỏ khách); tiêu: tiễn ngồi lỳ (cost ∝ giây ngồi), nâng ghế tựa, tờ rơi, [quầy bánh mì — sắp có]; gate (golden sign 5k⭐).
- **Badge shard → 8 huy hiệu** (4 hạng mùa + 4 referral; Networker gate ghế tựa). **Cosmetic token** (từ Life Path).

## 14. Monetization (donation, KHÔNG pay-to-win)
"Mời Trà Đá": chuyển khoản **20k/50k VND** ủng hộ tác giả → chọn **1 quà cảm ơn** (huy hiệu Kết Nối / đèn lồng×4 / cây cảnh×4 / biển hiệu×4) — có `repGate` (cần uy tín). **KHÔNG bán xu/power/hạng trực tiếp**; có cosmetic + 1 huy hiệu **tiện ích** (Kết Nối gate ghế tựa) NHƯNG vẫn có **đường free** (referral) + repGate → không phá cân bằng đua hạng, nhưng không hoàn toàn "thuần vanity". Đây là con đường chính lấy cosmetic.

## 15. UI/UX & Design (xem 2 file chi tiết)
- **Fonts**: Be Vietnam Pro (body) + Chakra Petch (nút/số). **Màu**: beige `#f3e3bc` + vàng-kim `#ffd700` + modal navy + CTA đỏ. Bo góc 8–16px. Nút min-height 52px.
- **HUD 3 vùng** (top trạng thái / center sân / bottom hành động) + rail tài nguyên, hệ "pill".
- **236 asset**: nhiều sprite khách (thường + đặc biệt như VIP/shipper), **mỗi nhóm có biến thể hot/cold theo thời tiết**; thiết bị sprite **5 cấp** (stall/ice-box/tea-brewer/washer); ghế đa trạng thái (trống/thường/tựa/broken); chó idle×3+attack×3; cosmetic 5 biển+4 đèn+4 cây; gangster 1/2/3/boss. **276 class, ~50 animation** (mỗi tín hiệu 1 anim: tip/QR/wellrested/rush/chairman-smoke/secretBox...).
- **Microcopy cá tính** ("Em xin", "Đành vậy", "Trà Đấm", "bào khách"). **Trợ lý AI** tư vấn theo state realtime. **Phục vụ = chạm**, có grace window (cứu muộn → tip 0).
- **3 vòng UX song song**: **Operate** (chơi ca/vận hành) · **Learn** (guide/AI/support/changelog/ledger) · **Belong/show off** (rank/shrine/street/decor/profile) — đây là lớp retention/community ngoài gameplay.

## 16. 🍺 Bài học cốt lõi cho "Trùm Bia Hơi"
1. **Giữ 5 lớp economy**: unit (margin cao early) · throughput (cốc/keg/bàn/rửa = bottleneck) · demand-mix (biển hiệu/khách đổi loại) · risk (say/bảo kê/kiểm tra) · meta (uy tín/league/Life Path/mặt bằng chống lạm phát).
2. **Ánh xạ**: trà đá→bia hơi; ly→cốc/vại (rửa); đá→giữ lạnh; kẹo/hạt→mồi (lạc/nem); trà đá tan→bia mất hơi; combo nhậu (bia+mồi); shipper→ship mồi; rush→giờ tan tầm/đá bóng; Chí Phèo→khách quậy; VIP→khách sộp; gangster→bảo kê; kiểm tra→an toàn thực phẩm.
3. **Server-authoritative** cho serve/reward/cap/event để chống gian lận & giữ xếp hạng công bằng.
4. **VIP + vách đá 60% + ×10** = khoảnh khắc giá trị cao thưởng phản xạ.
5. **2 mức rush** (nhẹ=ổn định, nặng=canh bạc) tạo độ sâu.
6. **Uy tín = meta-currency 2 chiều** (lên khi phục vụ tốt, xuống khi mất khách) + tiền mua thứ "mềm".
7. **Monetization donation không bán xu/power trực tiếp** + repGate + đường free cho badge tiện ích.
8. **Trợ lý AI realtime + microcopy địa phương** = onboarding/retention/bản sắc.

## 17. Trạng thái dữ liệu còn lại

**Đã rõ (không còn là ẩn số):**
- Cách lấy cosmetic = quà donate (mục 14); chu kỳ mùa = Phân Hạng 7 ngày / Tranh Bá 14 ngày (mục 9).

**Còn server-only — cần gặp event live mới có số chính xác:**
- Boss gangster (hp/atk/thưởng) · lượng trộm offline (`stolenAmount`) · câu hỏi + đáp án đúng của inspection (cơ chế & hậu quả đã rõ: trượt → đình chỉ ca) · giá cosmetic tính bằng đơn vị nào nếu mua ngoài donate (nếu có).

---
*Toàn bộ số liệu directly-extracted từ bundle hoặc observed live (đánh dấu trong các file chi tiết). Phương pháp: nạp bundle vào page, regex-grep config; đọc state runtime qua React fiber; quan sát ~25 màn chơi thật.*
