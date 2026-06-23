# 🍺 BẢNG MAP: Trùm Trà Đá → Trùm Bia Hơi

Tài liệu chuyển hóa (transformation map). Mục tiêu: giữ nguyên **5 lớp economy** và các cơ chế đã được chứng minh trong trumviahe.com, nhưng thay toàn bộ "vỏ" sang chủ đề **quán bia hơi vỉa hè Việt Nam**.

> Nguồn cơ sở: `00-TONG-HOP-trumviahe.md` + `economy-spec-from-bundle.md`. Các con số bia hơi dưới đây là **đề xuất re-tune v0.1** (đánh dấu 🔧), cần playtest để chốt. Các con số trà đá để **đối chiếu** lấy từ research.

> 📌 **VAI TRÒ TÀI LIỆU (đọc trước):** Đây là doc **phân tích & lý do** (rationale/why). **Nguồn sự thật duy nhất** cho *quyết định, trạng thái (Core/Prototype/Post-MVP), roadmap và con số CHỐT* là **`02-GDD-trum-bia-hoi.md`** (hệ bàn: `03-SPEC-he-ban.md`). **Nếu mâu thuẫn → GDD thắng.** MAP vẫn giữ các **bảng phân tích/đề xuất** (để giải thích cách suy ra), nhưng **không giữ** bản sao bảng-quyết-định, bảng rescale-chốt hay roadmap — những thứ đó chỉ ở GDD. Sửa quyết định/số chốt → sửa ở GDD.

---

## 0. Nguyên tắc chuyển hóa
1. **Giữ khung, đổi vỏ**: không phát minh lại core loop. Trà đá phục vụ theo ca → bia hơi cũng phục vụ theo ca.
2. **Tăng "độ nhậu"**: bia hơi có văn hóa *ngồi lâu, gọi thêm, theo bàn/nhóm* → là cơ hội làm sâu lớp throughput & combo.
3. **Bản sắc địa phương đậm hơn**: giờ tan tầm, đá bóng, "dô dô", bàn nhậu, bảo kê, kiểm tra nồng độ cồn.
4. **Bia mất hơi = đồng hồ áp lực mới** (thay cho "đá tan") → tạo bottleneck thời gian rõ rệt.

---

## 1. Chủ đề & bản sắc (theme / art direction)
| Trà đá | → Bia hơi | Ghi chú |
|---|---|---|
| Quán trà đá vỉa hè | Quán **bia hơi vỉa hè** (bàn inox, ghế nhựa đỏ, bom bia) | giữ tinh thần vỉa hè VN |
| "Rèn tư duy kinh doanh" | giữ nguyên tagline | |
| Microcopy: "Em xin", "Trà Đấm", "bào khách" | "Dô đi anh!", "Một, hai, ba… dô!", "Bia Đấm", "chốt mâm" | bản sắc nhậu |
| Palette beige + vàng kim | 🔧 vàng bia (amber) + bọt trắng + đỏ ghế nhựa + navy modal | giữ cấu trúc token, đổi hue |

---

## 2. MÓN (unit economy — lớp 1) — ĐÃ CHỐT MENU

Menu MVP **6 món** (1 đồ uống lõi + 5 mồi). Đồ uống = món lõi quay vòng cốc; mồi chia 3 tầng prep (liền / nhanh-bếp / lâu-bếp).

| # | Món | Vai trò | Cần cốc? | Prep | Tầng mở khóa |
|---|---|---|:--:|---|---|
| 1 | **Bia hơi (cốc)** | đồ uống lõi, quay vòng cốc, có "độ hơi" giảm dần | ✅ | rót ~3s | từ đầu |
| 2 | **Lạc (đậu phộng)** | mồi rẻ nhất, phục vụ liền | ❌ | tức thì | từ đầu |
| 3 | **Nem chua** | mồi nhanh, ăn liền (nem chua tươi) | ❌ | tức thì | từ đầu |
| 4 | **Đậu tẩm hành** (đậu rán tẩm hành) | mồi tầm trung, cần chảo/bếp | ❌ | 🔧 ~8s | nâng cấp bếp 1 |
| 5 | **Tóp mỡ Triều Khúc** | mồi đặc sản, cần bếp | ❌ | 🔧 ~10s | nâng cấp bếp 1 |
| 6 | **Lòng xào dưa** | **mồi cao cấp**, ticket lớn, prep lâu | ❌ | 🔧 ~15s | nâng cấp bếp 2 |

**Ánh xạ cốt lõi (tài nguyên):**
- Ly → **cốc** (tài nguyên quay vòng định danh, rửa → bottleneck chính, giữ y hệt cơ chế `reservedGlassId`).
- Đá (giữ lạnh) → **bom bia + giữ lạnh** (bia ấm = giảm tip/mất khách).
- Trà đá tan/mất chất → **bia mất hơi** — xem phân tích sâu **mục 11**.
- Combo nhậu mới: **bia + mồi** gọi theo bàn, nhiều đợt → xem **mục 12 (hệ bàn)**.

> ⚠️ **Phát hiện quan trọng từ giá thật (đảo tỷ lệ economy):** Trong trà đá, *đồ uống là món đắt nhất* (trà 50 > kẹo 30 > hạt 20). Trong bia hơi thực tế thì **ngược lại** — bia là món **rẻ nhất**, các mồi đắt hơn nhiều (xem mục 10). Tức là economy của Trùm Bia Hơi nên: **bia = tần suất cao / ticket thấp / là cỗ máy quay vòng cốc**; **mồi = ticket cao / là nơi kiếm lời chính & là upsell**. Đây là khác biệt cấu trúc so với bản gốc, cần xử lý khi re-tune (mục 4 đang tạm giữ nguyên số gốc theo yêu cầu).

---

## 3. THROUGHPUT (lớp 2 — bottleneck)
| Trà đá | → Bia hơi | Cơ chế giữ nguyên |
|---|---|---|
| Thùng đá (cap 20→250, tan 30s→∞) | **Tủ lạnh / hầm bia** (giữ bia lạnh, chống mất hơi) | nâng cấp hàm mũ |
| Ấm tích (brew 15s→6s, batch 1→12) | **Bom bia + vòi rót** (rót 1→nhiều vòi, tốc độ rót) | batch + speed |
| Bộ rửa ly (wash 7s→1.5s, slot 1→5) | **Bồn rửa cốc** (giữ nguyên hoàn toàn) | lõi bottleneck |
| Quầy (kho 4 NL) | **Quầy/kho** (bia, mồi, cốc) | stall level |
| Ghế nhựa (4→200 ghế) | **Bàn nhậu** (đơn vị chính, nâng cấp tăng sức chứa/bàn) | xem **mục 12** |
| Ghế tựa (mở "2 món") | **Bàn VIP / bàn dài cao cấp** (mở mồi cao cấp, phục vụ nhóm lớn) | xem **mục 12** |
| Chó giữ quán | **Chó / bảo vệ** (chống trộm + đánh bảo kê) | giữ nguyên |

> **Đã chốt:** dùng **đơn vị BÀN từ đầu** (không phải ghế đơn). Một bàn chứa nhiều khách, nâng cấp bàn tăng sức chứa → xem phân tích đầy đủ ở **mục 12**.

---

## 4. LOẠI KHÁCH (lớp 3 — demand mix)
| Trà đá | → Bia hơi | Weight | Chiến thuật (giữ nguyên cơ chế) |
|---|---|--:|---|
| Khách thường | **Dân nhậu thường** | 1.0 | nền tảng |
| Khách vội | **Khách làm ly nhanh** (tan ca tạt qua) | 0.3 | patience ngắn, đông giờ cao điểm |
| VIP (tip ×10) | **Khách sộp / sếp bao mâm** | 0.1 | **ưu tiên #1**, tip ×10, vách đá 60% |
| Chí Phèo (không trả + chiếm ghế) | **Khách quậy / xỉn không trả** → lộ **"đại gia"** ra quà | 0.03 | giữ lootbox cơ chế |
| Ngồi lỳ (giữ ghế 50–100s) | **Bàn nhậu lai rai** (ngồi cả buổi, "dô" hoài) | 0.1 | bẫy throughput — rất hợp bia hơi |
| Shipper (đơn bundle) | **Ship bia/mồi mang về** | timer ~220s | −25% chiết khấu, không tốn cốc |
| — (mới) | **Nhóm cổ vũ bóng đá** (spawn cụm khi có "sự kiện trận đấu") | 🔧 | đợt khách đông đột biến = rush theme |

---

## 5. SỰ KIỆN & RỦI RO (lớp 4 — risk)
| Trà đá | → Bia hơi | Ghi chú |
|---|---|---|
| Giờ cao điểm (rush nhẹ/nặng) | **Giờ tan tầm + giờ đá bóng** (light/heavy) | giữ 2 mức; thêm "trận đấu" làm heavy rush theme |
| Thời tiết (nóng/ẩm/mưa/lạnh) | giữ nguyên — **nóng = bán chạy hơn, tip cao**; mưa = ship nhiều | bia hơi rất nhạy thời tiết → hợp lý |
| Gangster/bảo kê | **Bảo kê vỉa hè** (giữ nguyên: phí, chó đánh, đập đồ) | rất hợp bối cảnh |
| Tổ kiểm tra liên ngành (quiz → đình chỉ) | **Kiểm tra ATTP / trật tự đô thị / nồng độ cồn** | quiz an toàn thực phẩm + giấy phép |
| Chí Phèo → Chủ tịch (lootbox) | **Khách xỉn → hóa đại gia** | quà xu/nguyên liệu |
| Trộm offline (nghỉ không chó) | giữ nguyên | |
| — (mới) | **Say xỉn / đánh nhau tại quán** → cần can/đuổi, mất uy tín nếu để loạn | rủi ro đặc thù bia hơi |

---

## 6. TIP, UY TÍN, PHẠT (công thức — giữ nguyên 100%)
Không đổi công thức, chỉ đổi tên hiển thị:
- **Tip**: vách đá 60% patience → tip 0; ngược lại `round(payment×0.3)` ×rush ×weather ×type(VIP 10) ×QR ×well-rested. (Giữ nguyên.)
- **Uy tín ca** = Σ(+3 có tip / +1 không tip) − ~5×(số bỏ đi). → "**uy tín quán nhậu**".
- **Phạt mất khách**: `round(gross×0.1×mult)` ×rush. VIP ×10.
- QR (+20% tip) → **mã QR chuyển khoản** (rất thực tế ở quán nhậu VN).

---

## 7. META & TIẾN TRÌNH (lớp 5 — chống lạm phát)
| Trà đá | → Bia hơi | Ghi chú |
|---|---|---|
| Thể lực 12 phút/ca, trần 8/6/5 ca/ngày, cap 200k/ngày | giữ nguyên gating | |
| League theo mùa (Đồng→Huyền Thoại) | giữ nguyên thang hạng, có thể đổi tên hạng theo "bậc trùm bia" | |
| 2 mùa song song (Phân Hạng 7d / Tranh Bá 14d) | giữ nguyên | |
| Life Path LP0–LP7 | **"Đường lên Trùm Bia"** LP0–LP7 | gate tính năng/mặt bằng |
| 9 mặt bằng (×1.0→×1.8, rent + cọc 25%) | **9 vị trí vỉa hè** (hẻm nhỏ → phố cổ → gần sân vận động → phố Tây) | "gần SVĐ" = vị trí hot mới |
| Uy tín = meta-currency 2 chiều | giữ nguyên | tiễn bàn lỳ, mở bàn nhậu, tờ rơi |
| Badge shard → 8 huy hiệu | giữ nguyên cấu trúc | |

---

## 8. NHIỆM VỤ & MONETIZATION (giữ khung)
- 7 nhánh nhiệm vụ (Ngày/Shift/Gift/Điểm danh/Referral/Sign-in/Life Path) → giữ nguyên, đổi tên hành động (serve_tea → serve_beer…).
- Monetization **donation "Mời Bia"** (20k/50k VND → quà cảm ơn **chỉ cosmetic**: đèn lồng/cây/biển/cờ), **KHÔNG pay-to-win**. Vật phẩm gate gameplay (vd huy hiệu Kết Nối mở bàn VIP) **chỉ mở bằng free progression/referral/uy tín**, KHÔNG qua donation (xem GDD §16).

---

## 9. ĐIỂM KHÁC BIỆT CHÍNH so với bản trà đá (tận dụng đặc thù bia hơi)
1. **"Mất hơi" thay "tan đá"** — đồng hồ áp lực gắn trực tiếp vào *món lõi* (cốc đã rót), không chỉ nguyên liệu phụ → căng hơn.
2. **Bàn nhóm** thay ghế đơn — phục vụ theo cụm, gọi nhiều đợt, "lai rai" → throughput sâu hơn, ngồi-lỳ là feature chứ không chỉ bẫy.
3. **Combo nhậu (bia + mồi)** — upsell tại bàn, đơn giá trị cao.
4. **Sự kiện "trận đấu/đá bóng"** — heavy rush có chủ đề, gắn cảm xúc.
5. **Kiểm tra nồng độ cồn / ATTP** — rủi ro hợp bối cảnh, dạy "kinh doanh có trách nhiệm".

---

## 10. GIÁ THẬT HN 2026 (tham chiếu re-tune — economy hiện TẠM GIỮ NGUYÊN số gốc)
Mục tiêu: làm "neo thực tế" cho lần re-tune sau. Hiện tại theo yêu cầu vẫn **giữ khung số xu của trà đá**; bảng này để đối chiếu tỷ lệ, chưa áp vào.

| Món | Giá thật HN (VNĐ) | Tỷ lệ vs 1 cốc bia | Ghi chú |
|---|--:|--:|---|
| **Bia hơi (cốc)** | 10–13k (ngoại thành ~10k, trung tâm 11–13k, phố cổ/nhà hàng 18–25k) | **×1.0** (neo) | Habeco; user neo ~15k |
| Lạc (đậu phộng) rang/luộc | 🔧 ~20–25k/đĩa | ×1.5–2 | mồi rẻ nhất |
| Nem chua (tươi) | 🔧 ~7–10k/chiếc, đĩa ~40–50k | ×3–4 (đĩa) | tính theo đĩa |
| Đậu tẩm hành (đậu rán) | 🔧 ~25–35k/đĩa | ×2–2.5 | cần bếp |
| Tóp mỡ Triều Khúc | 🔧 ~40–60k/đĩa | ×3–4 | đặc sản, cần bếp |
| Lòng xào dưa | 🔧 ~70–100k/đĩa | ×5–7 | món cao cấp, prep lâu |

**Hệ quả thiết kế (cần xử lý khi re-tune):**
- Bia = **rẻ, tần suất cao, biên/đơn vị thấp** → vai trò "cỗ máy quay vòng cốc + kéo khách", lời mỏng nhưng volume.
- Mồi (đặc biệt lòng xào dưa, tóp mỡ, nem) = **ticket cao, là nguồn lời chính** → upsell tại bàn là trục kiếm tiền.
- → Khác cấu trúc trà đá (đồ uống đắt nhất). Khi re-tune nên giữ tỷ lệ ×1 / ×1.5 / ×2.5 / ×3.5 / ×5.5 quanh giá bia làm gốc, và để margin mồi cao cấp **gánh lợi nhuận** thay vì đồ uống.

*Nguồn giá: dailybiahoihanoi.vn, 24hmoney.vn, vinwonders.com, ruoutot.net (xem cuối file).*

---

## 11. PHÂN TÍCH SÂU: cơ chế "BIA MẤT HƠI" (thay "đá tan")
Bản gốc trà đá có 2 đồng hồ áp lực: **patience của khách** + **đá tan** (tài nguyên *phụ*). Bia hơi cho phép gắn đồng hồ thứ 2 **trực tiếp vào món lõi** → căng và "đã" hơn.

### 11.1 Mất hơi áp dụng ở đâu — đề xuất 2 tầng
1. **Cốc đã rót, chờ bưng ra (tầng chính):** mỗi cốc bia rót xong có timer "độ hơi" 🔧 ~8–12s. Quá hạn → bia "hết hơi/nhạt". **Hậu quả — MVP (mềm): tip ×0 + uy tín −1, VẪN thu payment**; bản gắt (khách từ chối/mất payment) là **post-MVP**. → buộc người chơi **rót đúng nhịp, không rót sớm tích trữ**. Đây là điểm khác biệt cốt lõi vs đá tan (đá tan chỉ ảnh hưởng kho nguyên liệu, không ảnh hưởng món đã làm).
2. **Bom bia đã mở (tầng phụ, optional):** bom mở nắp có "đồng hồ tươi" dài 🔧 (vài phút). Quá hạn → bia trong bom xuống chất lượng → giảm tip toàn quán cho tới khi thay bom. = ánh xạ trực tiếp "thùng đá có cap + tan". Nâng cấp **giữ lạnh/hầm bia** kéo dài đồng hồ này.

### 11.2 Ảnh hưởng lên 3 lớp
- **Tip:** mất hơi = nhân tố mới cùng họ với vách đá 60% patience → có thể gộp công thức: `tipMult = freshnessOK ? 1 : 0`. Giữ nguyên công thức tip gốc, chỉ thêm cờ `freshness`.
- **Throughput:** chống "exploit rót sẵn cả loạt cốc". Người chơi phải **đồng bộ rót ↔ bưng** → tăng độ khó nhịp tay, đúng tinh thần bottleneck cốc.
- **Patience:** không đổi patience của khách; mất hơi là lớp độc lập trên *món*, nên 2 đồng hồ chạy song song (khách hết kiên nhẫn / bia hết hơi) → quyết định "rót lúc nào" trở nên chiến thuật.

### 11.3 Ánh xạ hằng số gốc (giữ engine, đổi nhãn)
- `iceMeltMs` (đá tan) → `beerFreshnessMs` (độ hơi cốc) / `kegFreshnessMs` (bom).
- Nâng cấp Thùng đá (tan 30s→∞) → **Hầm/tủ giữ lạnh** kéo dài freshness.
- Thời tiết nóng (đá tan ×1.5) → **nóng làm bia mất hơi/ấm nhanh hơn ×1.5** (rất hợp lý vật lý) + bán chạy hơn.

### 11.4 Rủi ro & lưu ý
- Đừng để 2 đồng hồ (patience + freshness) cùng quá ngắn → frustrating. Đề xuất: freshness **rộng hơn** thời gian bưng trung bình, chỉ phạt khi rót-tích-trữ rõ ràng.
- Cần phản hồi hình ảnh rõ: cốc đầy bọt → bọt xẹp → "cờ vàng" cảnh báo trước khi mất hơi (UX an toàn, tránh phạt oan).

---

## 12. PHÂN TÍCH SÂU: hệ "BÀN" (đơn vị từ đầu, có nâng cấp sức chứa)
Bản gốc dùng **ghế đơn** (mỗi khách 1 ghế). Trùm Bia Hơi dùng **bàn** làm đơn vị từ MVP.

### 12.1 Mô hình dữ liệu (domain)
```
Table {
  id
  capacity: number          // số khách tối đa, tăng theo cấp nâng cấp
  seats: Customer[]          // khách đang ngồi
  level: number              // cấp bàn (sprite + capacity theo cấp)
  type: 'thuong' | 'vip'     // bàn thường / bàn VIP cao cấp
  orders: Order[]            // các đợt gọi món (nhiều đợt/buổi)
}
Customer {
  ... (giữ field gốc: patience, reservedGlassId, type, enjoyMs ...)
  tableId
}
```
- Một **bàn** giữ chỗ cho **N khách**; mỗi khách vẫn là entity riêng giữ patience + 1 cốc định danh (giữ cơ chế gốc).
- Sức chứa quán = Σ capacity các bàn + hàng đợi (giữ công thức queue `2+⌊tổngGhế/3⌋`).

### 12.2 Nâng cấp bàn (sink mới, hàm mũ như ghế gốc)
| Cấp bàn | Sức chứa/bàn 🔧 | Ý nghĩa |
|---|--:|---|
| Bàn con (ghế nhựa lẻ) | 2 | khởi đầu |
| Bàn vuông | 4 | phổ thông |
| Bàn dài | 6 | nhóm đông |
| Bàn VIP / kê dài | 8–10 | nhóm lớn, mở mồi cao cấp, cần uy tín (như "ghế tựa" gốc) |

- Mỗi cấp **đổi sprite** (visual progression — giữ nguyên triết lý gốc).
- **Số lượng bàn** cũng nâng được (như tăng số ghế 4→200): nhiều bàn = nhiều khách đồng thời nhưng **căng throughput** (rót/rửa/bếp).

### 12.3 Vì sao bàn làm gameplay sâu hơn ghế đơn
- **Gọi nhiều đợt ("lai rai"):** một bàn gọi bia đợt 1 → mồi → bia đợt 2… Mỗi đợt là một "serve event" → throughput dày hơn, hợp văn hóa nhậu.
- **Khách "ngồi lỳ" thành feature:** bàn lai rai ngồi lâu nhưng **gọi liên tục** → vừa là nguồn thu ổn định vừa là bẫy bàn (chiếm chỗ). Cân bằng: ngồi lâu OK *miễn còn gọi*; ngừng gọi mà chiếm bàn → giống "ngồi lỳ" gốc (tiễn bằng uy tín).
- **Combo theo bàn:** phục vụ cả bàn 1 lượt (bia + mồi) = đơn lớn, thưởng combo → quyết định "phục vụ lẻ hay gom bàn".
- **VIP/khách sộp theo nhóm:** cả bàn VIP = nhiều ×10 cùng lúc → khoảnh khắc giá trị cao đậm hơn 1 VIP lẻ.

### 12.4 Lưu ý cân bằng
- Bàn to = phần thưởng lớn nhưng **nếu phục vụ trễ, mất cả bàn = phạt cụm** (rủi ro tương xứng). Giữ tinh thần "rush nặng = canh bạc".
- Cần UX chọn bàn / xem đợt gọi rõ ràng (mỗi bàn 1 cụm bong bóng order). Phức tạp hơn ghế đơn → ưu tiên làm tốt phần này ở prototype.

---

## 13. ĐÁNH GIÁ PLATFORM trumviahe — đủ cho Trùm Bia Hơi chưa?

### 13.1 Stack hiện tại (quan sát từ research)
**Pixi.js (canvas, render game) + React DOM (overlay UI/HUD/modal) + Zustand (state client) + server-authoritative** (`api.trumviahe.com` + **websocket**; serve/giá/reward/cap/event **validate server-side**; có **CAPTCHA** chống bot). Mobile-first, web.

### 13.2 Đánh giá theo nhu cầu Trùm Bia Hơi
| Yêu cầu mới của Bia Hơi | Stack hiện tại đáp ứng? | Nhận định |
|---|---|---|
| Bàn-nhóm, nhiều entity/bàn, nhiều order đồng thời | ✅ Pixi xử lý hàng trăm sprite tốt; Zustand quản lý state lồng nhau ổn | Đủ; chỉ cần model `Table` tốt |
| "Mất hơi" (thêm 1 timer/món) | ✅ chỉ là thêm field timer + tick | Đủ, nhẹ |
| Nhiều sprite trạng thái (cốc bọt→xẹp, bàn 4 cấp, mồi) | ✅ Pixi sprite-sheet/animation | Đủ |
| Server-authoritative chống gian lận, xếp hạng công bằng | ✅ đã có sẵn kiến trúc | **Điểm mạnh — nên giữ** |
| Realtime league / mùa giải / hòm thư | ✅ websocket + API | Đủ |
| Mobile-first, vào nhanh không cài đặt | ✅ web | Đủ; phù hợp đối tượng VN |

### 13.3 Kết luận
**Platform hiện tại ĐỦ và phù hợp** cho Trùm Bia Hơi — không cần đổi kiến trúc. Lý do giữ:
1. **Pixi + React DOM overlay** là combo chuẩn cho idle/tycoon 2D mobile-web: canvas lo cảnh động hiệu năng cao, DOM lo UI/accessibility/modal. Bàn-nhóm & mất hơi chỉ là *thêm dữ liệu/animation*, không vượt khả năng.
2. **Server-authoritative + websocket** là tài sản quý cho game có **xếp hạng + economy thật** (chống gian lận, hard-cap, event server-only). Tự build lại tốn kém → **kế thừa**.
3. **Web, mobile-first, không cài đặt** = rào cản gia nhập thấp, hợp tệp người chơi VN.

**Điều cần thêm/điều chỉnh (không phải đổi platform):**
- Mô hình `Table` + logic nhiều order/bàn (client + validate server).
- 1 timer freshness/cốc + (tùy chọn) timer bom — cùng họ với ice-melt sẵn có.
- Bộ asset mới (sprite cốc bia/bọt, bàn 4 cấp, 5 mồi, khách nhậu) — đây là **khối lượng art**, không phải rào cản kỹ thuật.
- Cân nhắc cho prototype: có thể dựng **prototype gameplay bằng web nhẹ (Pixi hoặc thậm chí HTML canvas)** để playtest nhịp tay/bàn/mất hơi **trước**, rồi mới đầu tư server + art đầy đủ.

> **Khuyến nghị:** Giữ nguyên lựa chọn platform của trumviahe. Khác biệt nằm ở **content + 2 cơ chế mới (bàn, mất hơi)**, đều nằm trong khả năng stack hiện tại.

---

## 14. RE-TUNE ECONOMY (v0.1) — bám khung trumviahe, đảm bảo vận hành y hệt

### 14.1 Nguyên tắc vàng: "đổi tỷ lệ món, GIỮ nguyên hình dạng economy"
trumviahe cân bằng dựa trên: **margin cao (burn = upgrade/rent/penalty, KHÔNG phải COGS)** + **trần ngày 200k** + **ngưỡng league** + **đường cong sink hàm mũ**. Muốn re-tune mà "chạy y hệt", ta:
1. Giữ **mọi tỷ lệ & hằng số thời gian** (margin %, đường cong giá nâng cấp, patience, spawn, tip 30%/vách 60%, phạt 10%/×rush…).
2. Chỉ đổi **giá trị tuyệt đối của món** cho khớp tỷ lệ thực tế (bia rẻ, mồi đắt).
3. Nếu giá trị đơn trung bình tăng so với trà đá → **rescale đồng loạt** trần ngày + ngưỡng league + giá sink theo **cùng một hệ số k** → số to hơn nhưng "số ca để lên hạng / để mua nâng cấp" **không đổi** = cảm giác chơi giữ nguyên.

### 14.2 Bảng món đề xuất (neo: 1 xu ≈ 300 VND, bia cốc = 50 xu = 15k thật)
| Món | Giá bán (xu) 🔧 | Vốn sỉ (xu) 🔧 | Margin | Lời tuyệt đối | Vai trò economy |
|---|--:|--:|--:|--:|---|
| **Bia hơi (cốc)** | 50 | 10 | **80%** | 40 | workhorse, volume, kéo khách, nghẽn cốc+rót (≈ trà đá gốc) |
| Lạc (đậu phộng) | 75 | 26 | 65% | 49 | mồi rẻ, phục vụ liền, lấp công suất thừa |
| Đậu tẩm hành | 100 | 45 | 55% | 55 | mồi tầm trung, cần bếp |
| Nem chua | 150 | 60 | 60% | 90 | mồi nhanh ticket khá |
| Tóp mỡ Triều Khúc | 165 | 82 | 50% | 83 | mồi đặc sản, cần bếp |
| **Lòng xào dưa** | 280 | 155 | 45% | 125 | **mồi cao cấp = trung tâm lợi nhuận**, prep lâu |

→ Giữ đúng triết lý gốc: **margin vẫn cao** (45–80%), COGS không phải burn chính. Khác biệt có chủ đích: **mồi cao cấp gánh lời** (lòng lời 125 ≈ 3× bia) thay vì đồ uống — đúng thực tế bia hơi & tạo động lực **upsell theo bàn**.

### 14.3 ĐO k — kết quả mô hình (Monte Carlo 300k khách/kịch bản)
Đã dựng mô hình tính **doanh thu trung bình/khách (món + tip)**, weight khách gốc (Thường1.0/Vội0.3/VIP0.1/ChíPhèo0.03/NgồiLỳ0.1), tip 30% (90% phục vụ kịp), VIP tip ×10. *Script: `scripts/measure_k.py`.*

| Kịch bản | DT/khách | k vs trà đá |
|---|--:|--:|
| **Trà đá (gốc)** | 82.5 xu | 1.00 (mốc) |
| Bia hơi — base (≤1 mồi, p=0.7) | 207 xu | **2.51** |
| Bia hơi — rich (≤2 mồi + bàn lai rai gọi nhiều đợt) | 338 xu | 4.10 |

**Kiểm chứng mô hình:** trà đá ra 82.5 xu (pre-multiplier) × Chợ Đêm ×1.2 ≈ **99** — khớp con số **quan sát live ~94** trong research → mô hình đáng tin.

**Sensitivity** (xác suất khách gọi mồi p): p=0.5→k2.0 · 0.6→k2.3 · **0.7→k2.5** · 0.8→k2.8 · 0.9→k3.0. → **k_value ổn định quanh 2.5**.

**Diễn giải đúng (2 hiệu ứng tách bạch):**
- **k_value ≈ 2.5** = mỗi *lượt phục vụ* đáng giá hơn (món đắt + mồi attach). **Robust** (2.0–3.0).
- **k_throughput** = bàn lai rai tạo *nhiều lượt phục vụ hơn/ca* (gọi nhiều đợt) → đẩy k theo-ca lên ~3–4. Cái này **phụ thuộc thời gian giữ bàn/nhịp tay → chỉ đo chính xác được trong prototype**.

### 14.4 PHƯƠNG ÁN TỐI ƯU: rescale **chỉ theo k_value = 2.5**, KHÔNG cộng throughput
**Phân tích vai trò trần ngày.** Trong trumviahe, trần 200k **cố định** bất kể bạn có 4 hay 10 ghế. Nghĩa là: throughput (số ghế/thiết bị) là **đòn bẩy phần thưởng** giúp người chơi giỏi **chạm trần NHANH hơn** — *không* được "đền bù" bằng cách nâng trần. Chỉ có **giá trị/lượt phục vụ** mới cần đền bù (nếu không, chạm trần sau quá ít lượt → ca trở nên nhạt).

→ Vậy **đại lượng bất biến cần giữ = "số lượt phục vụ để chạm trần"**:
- Trà đá: 82.5 xu/lượt, trần 200k → **~2.420 lượt** để cạn trần.
- Bia hơi: 207 xu/lượt; muốn giữ ~2.420 lượt → trần = 207×2.420 ≈ **500k = 200k × 2.5**. ✅ Khớp đúng k_value.

**Kết luận tối ưu:** **k = 2.5 cho prototype hiện tại** (= k_value, đo lại được khi có dữ liệu thật). **KHÔNG** nâng lên 3–3.5 để bù throughput, vì:
1. Bàn lai rai/nâng cấp bàn = **đòn bẩy thưởng** (chạm trần nhanh hơn) — đúng thiết kế gốc, không cần bù.
2. Giữ đúng bất biến "số lượt để chạm trần" → cảm giác mỗi ca **y hệt** trà đá.
3. Một hằng số duy nhất, dễ kiểm soát, không vỡ cân bằng.

**Áp dụng:** nhân **k=2.5** vào: trần ngày, ngưỡng league, mốc Life Path, giá nâng cấp (bàn/bom/rửa cốc/hầm/quầy), rent, phạt, thưởng. **Giữ nguyên:** hằng số thời gian, %margin, tip, weight khách.

> 📊 **Bảng số rescale cụ thể (trần 500k, league ×2.5, …) → xem GDD §3** (nguồn sự thật duy nhất, tránh lặp/lệch).

> 📌 Prototype **được phép điều chỉnh con số k_value** (bắt đầu từ giả định 2.5) dựa trên giá trị/lượt đo thật: nếu món mix lệch → cập nhật `k = DT_bia_mỗi_lượt / 82.5` (ra 2.3 hay 2.8 đều OK). Bất biến **không đổi**: *cách tính* k chỉ từ giá trị/lượt, **throughput không vào k**.

---

## 15. SỐ FRESHNESS + CẤP BÀN — PHƯƠNG ÁN TỐI ƯU (đề xuất chốt)

> **Nguyên tắc tối ưu:** freshness base phải **chỉ phạt hành vi tích trữ cốc**, không phạt phục vụ bình thường → đặt base ≈ **3–4× thời gian 1 lượt rót-bưng** (rót 3s + bưng ~2s ≈ 5s ⇒ base ~12s cho phép đệm ~2 cốc, cốc thứ 3+ mới rủi ro). Bàn dùng **lại nguyên đường cong ghế gốc** (đã được trumviahe cân bằng) — chỉ đổi cách "đóng gói" ghế thành bàn.


### 15.1 "Mất hơi" — bám đường cong Thùng đá gốc
Thùng đá gốc (melt interval theo cấp): `0→30s · 2k→50s · 8k→90s · 30k→240s · 100k→∞`.
- **`beerFreshnessMs` (cốc đã rót)** — đề xuất base **12s**, nâng qua **Tủ/Hầm giữ lạnh** theo *cùng đường cong* (đổi nhãn, ×k giá):
  | Cấp Hầm lạnh | Giá (xu) 🔧 | Freshness cốc | Ý nghĩa |
  |---|--:|--:|---|
  | L1 (đầu) | 0 | 12s | dễ mất hơi, ép rót đúng nhịp |
  | L2 | 2k×k | 20s | |
  | L3 | 8k×k | 35s | |
  | L4 | 30k×k | 60s | thoải mái rót trước chút |
  | L5 | 100k×k | ∞ (không mất hơi) | end-game |
  > Base 12s **> thời gian bưng trung bình** (rót 3s + chạm bàn) → chỉ phạt khi rót-tích-trữ rõ ràng (chống exploit), không phạt oan.
- **`kegFreshnessMs` (bom đã mở)** — base **~4 phút**, nâng cùng Hầm lạnh (×1.5/cấp). Quá hạn → giảm tip toàn quán tới khi thay bom. = ánh xạ "cap + tan" của thùng đá ở tầng kho.
- Thời tiết nóng: ×0.67 freshness (mất hơi nhanh hơn ~1.5×) — ánh xạ "đá tan ×1.5".

### 15.2 Cấp bàn — bám đường cong ghế gốc
Ghế gốc (giá theo số ghế): `4→200 · 5→500 · 6→1.000 · 7→1.500 · 8→2.500 · 9→5.000 · 10→10.000`.
- Coi **sức chứa bàn = "số ghế quy đổi"** → tái dùng đúng đường cong giá trên (×k).
- Đề xuất tiers bàn:
  | Bàn | Sức chứa | Chi phí mở/nâng (xu) 🔧 | Gate |
  |---|--:|--:|---|
  | Bàn con (khởi đầu) | 2 | có sẵn | — |
  | Bàn vuông | 4 | ~ (200+500)×k | — |
  | Bàn dài | 6 | ~ (1.000+1.500)×k | — |
  | Bàn VIP / kê dài | 8–10 | ~ (2.500+5.000+10.000)×k + **uy tín 3k–40k** | huy hiệu Kết Nối (như ghế tựa gốc) |
- **Số lượng bàn** cũng nâng được (mua thêm bàn) — tổng "ghế quy đổi" toàn quán dùng lại công thức queue gốc `2+⌊tổngGhế/3⌋`.
- Mỗi cấp đổi sprite (visual progression). Bàn VIP mở **mồi cao cấp** (lòng xào dưa) + phục vụ nhóm lớn.

---

## 16. PROTOTYPE-FIRST (đã chốt: CÓ)
Làm **prototype gameplay nhẹ trước** khi đầu tư server + art đầy đủ. Mục tiêu prototype:
1. **Đo k** (giá trị đơn trung bình) để chốt rescale economy (mục 14.3).
2. Kiểm "feel" 2 cơ chế mới: **mất hơi** (rót↔bưng có vui/căng đúng mức không) + **bàn nhóm** (gọi nhiều đợt, combo, chọn bàn có rối không).
3. Test nhịp tay ở 2 mức rush (nhẹ ổn định / nặng canh bạc) với đơn vị bàn.

**Phạm vi prototype tối thiểu:** xem `04-SPEC-prototype-phase0.md` để triển khai cụ thể. Scope hiện chốt: 1 màn quán, **3 bàn**, bia + 2 mồi tức thì, **2 mức rush** (thường / cao điểm), freshness cốc, vòng đời cốc + rửa, tip/patience, log đo. **Client-only** (chưa cần server-authoritative) — chỉ để validate cảm giác. Stack: Pixi.js hoặc HTML canvas đơn giản. Sau khi "feel" đạt → mới dựng server + full content + art.

---

## 17. SỰ KIỆN WORLD CUP (event thời vụ — gắn vào hệ rush/event gốc)
Tận dụng World Cup sắp diễn ra. Đây là **event theo lịch thật**, chồng lên lớp rush/weather sẵn có — không cần engine mới.

### 17.1 Ba trụ cơ chế
1. **Mua bản quyền phát sóng tại quán** (sink 1 lần, hạn mùa giải):
   - Mua "gói phát sóng" bằng xu (🔧 ví dụ 50k×k) → lắp **TV/màn chiếu** ở quán.
   - Hiệu ứng: trong **khung giờ có trận**, quán có TV → **spawn ×, patience ×, khách ngồi lâu hơn (gọi nhiều đợt)** = rush theme "xem bóng".
   - Không mua → vẫn chơi bình thường, chỉ **bỏ lỡ** đợt khách bóng đá (FOMO nhẹ, không pay-to-win vì mua bằng xu in-game).
2. **Giờ trận đấu = rush có lịch THẬT** (ánh xạ trực tiếp `rush` gốc, light/heavy) — xem cơ chế lịch ở **17.4**:
   - Bám **lịch World Cup thật**; trong game, "suất chiếu" mở **ngay sau khi trận thật kết thúc** → **heavy rush "xem bóng"** (spawn interval ×0.2 như heavy gốc, +nhóm cổ vũ spawn cụm).
   - Trận lớn (chung kết/đội mạnh) = heavy++ ; vòng bảng = light. Tip ×, pay × theo lớp rush gốc.
   - **Bàn lai rai bùng nổ**: khách xem hết trận → ngồi lâu + gọi liên tục = đúng "ngồi lỳ nhưng gọi nhiều" (mục 12) → bàn to + mồi cao cấp ăn đậm.
3. **Mua lịch World Cup (marketing item) → hút khách**:
   - Vật phẩm marketing (như tờ rơi/biển hiệu gốc): mua **lịch thi đấu** dán quán → tăng spawn/độ nhận diện trong suốt mùa giải (× nhẹ, có hạn dùng).
   - Có thể bán bằng **uy tín** (như tờ rơi) hoặc xu → giữ uy tín là meta-currency marketing.

### 17.2 Đề xuất thêm (tùy chọn)
- **Combo "Xem bóng"**: bia + mồi cao cấp trong giờ trận → thưởng combo × → đẩy upsell đúng lúc đông.
- **Cosmetic mùa giải**: cờ, băng rôn đội — qua donate "Mời Bia" hoặc Life Path (giữ mô hình cosmetic gốc).
- *(Lưu ý: vé số/xổ số ở mục 18 là cơ chế ĐỘC LẬP — xổ số kiến thiết/Vietlott, KHÔNG phải cá độ bóng đá. Event World Cup không gắn cá độ trận.)*

### 17.3 Lưu ý cân bằng & pháp lý
- Event chỉ **× lên throughput/demand**, không bơm xu trực tiếp ngoài doanh thu phục vụ → **không phá trần ngày & league** (vẫn chịu cap 500k = 200k×k).
- "Bản quyền World Cup" trong game là **hư cấu/nhại** (TV phát bóng) — tránh dùng logo/nhãn hiệu FIFA thật; đặt tên kiểu "Cúp Bóng Đá Thế Giới" để an toàn IP.

### 17.4 Cơ chế LỊCH THẬT + mô phỏng TỈ SỐ thật (đã chốt)
Mục tiêu: game bám **lịch World Cup ngoài đời thật**; trong game, trận được "chiếu lại" **sớm ngay sau khi trận thật kết thúc**, hiển thị **đúng tỉ số thật**.

**Luồng dữ liệu (server-side, hợp kiến trúc server-authoritative gốc):**
1. **Server giữ lịch trận thật** (fixtures: thời gian, 2 đội) + **kéo kết quả thật** sau mỗi trận (từ nguồn tỉ số) → lưu `{matchId, kickoffReal, endReal, score, teams}`.
2. **Suất chiếu trong game** mở tại `broadcastTime = endReal + offset` (🔧 vd offset 15–30 phút sau trận thật kết thúc) → push qua **websocket** tới client như một event (giống cách event/inspection gốc do server gửi).
3. Trong suất chiếu: **TV ở quán hiển thị đúng tỉ số thật** + tên đội → kích **heavy rush "xem bóng"**, nhóm cổ vũ đội thắng đông hơn.
4. **Không có TV (chưa mua bản quyền)** → vẫn nhận thông báo "ngoài kia đang sôi động" nhưng không có đợt khách bóng đá (FOMO).

**Vì sao "sớm sau trận thật":**
- Người chơi VN xem/biết tỉ số thật → vào game thấy **đúng trận, đúng tỉ số** → cảm giác "quán mình đang chiếu trận tối qua" rất thật & tạo lý do mở app sau mỗi trận (retention bám sự kiện thật).
- Offset nhỏ tránh spoiler/đụng giờ phát thật, và cho server kịp lấy kết quả chính thức.

**Lưu ý kỹ thuật/thiết kế:**
- Cần **nguồn dữ liệu tỉ số** đáng tin (API thể thao) — server fetch, client chỉ render.
- Lịch là **dữ liệu động theo mùa giải** → cấu hình server, không hardcode client (để cập nhật/sửa giờ trận linh hoạt).
- Múi giờ VN; xử lý trận hoãn/đổi giờ → server cập nhật `broadcastTime` theo.
- Tên đội/giải nên **nhại** để an toàn IP (vd dùng tên quốc gia là tài sản công nhưng tránh logo/nhãn hiệu giải đấu).

---

## 18. TÍNH NĂNG XỔ SỐ / VÉ SỐ (currency sink — đã nghiên cứu)
Mục tiêu: **đốt xu** (chống lạm phát) + tăng bản sắc, **KHÔNG pay-to-win, KHÔNG ảnh hưởng xếp hạng**.

### 18.1 Vì sao hợp bối cảnh
Hình ảnh **người bán vé số dạo** đi qua các quán nhậu là nét văn hóa Việt rất thật. Vé số kiến thiết: tờ 6 chữ số, quay hằng ngày, **cơ cấu giải nhiều bậc** (đặc biệt trùng cả dãy; các giải nhỏ trùng vài số cuối) → map thẳng thành sink nhiều bậc thưởng.

### 18.2 Hai chế độ (đều là xổ số THẬT của VN — KHÔNG phải vé/cá độ bóng đá)

**Chế độ A — Xổ số kiến thiết (vé in sẵn, dò số đuôi):**
- **NPC bán vé số dạo** đi qua bàn (spawn như shipper/Chí Phèo) → chạm mua **vé in sẵn** bằng xu (🔧 vd 200 xu/vé), vé có **dãy 6 số cố định**; giới hạn vé/ngày (chống cày).
- **Quay 1 lần/ngày** (theo `dailyReset` gốc) → dò.
- **Cơ cấu giải nhiều bậc** (trùng N số cuối — đúng cách dò vé kiến thiết):
  | Bậc | Điều kiện | Thưởng (xu) 🔧 | Xác suất |
  |---|---|--:|--:|
  | Giải nhỏ | trùng 2 số cuối | 1.5× giá vé | ~1/100 |
  | Giải khá | trùng 3 số cuối | 8× | ~1/1.000 |
  | Giải lớn | trùng 4 số cuối | 50× | ~1/10.000 |
  | Đặc biệt | trùng cả 6 số | jackpot lớn | rất hiếm |

**Chế độ B — Vietlott (tự chọn số, kiểu Mega 6/45):**
- Người chơi **tự chọn 6 số** trong 1–45 (hoặc 6/55 Power) → server quay bộ số ngày → đối chiếu.
- Thưởng theo **số con trùng** (trùng 3/4/5/6) → jackpot cộng dồn (progressive) nếu muốn làm sâu.
- Hợp người chơi thích "chọn số may mắn" (sinh nhật, lô tủ) → tăng gắn kết.

> 🔵 **Cả 2 chế độ đều POST-MVP** (KHÔNG vào MVP, cần legal review). Nếu làm thì Chế độ A (vé in, đơn giản) trước, Chế độ B sau.
- **EV < 1** cho cả 2 (kỳ vọng hoàn ~0.6–0.8 giá vé) → **net là SINK** (đốt xu) nhưng vẫn có khoảnh khắc "trúng" phấn khích.

### 18.3 Nguồn quay số — DÙNG KẾT QUẢ XỔ SỐ THẬT THEO NGÀY (giống triết lý World Cup)
Thay vì game tự random, **server lấy kết quả xổ số thật của ngày hôm đó** rồi cho người chơi dò → tăng tính thật & chống nghi ngờ "game gian lận RNG".
- **Chế độ A (kiến thiết):** lấy **dãy số/giải đặc biệt** của một đài xổ số thật theo ngày (vd XSMB quay hằng ngày) → người chơi dò số đuôi vé in.
- **Chế độ B (Vietlott):** lấy **bộ 6 số Vietlott (Mega 6/45)** của kỳ quay thật → đối chiếu số người chơi tự chọn.
- **Luồng:** server fetch kết quả chính thức sau giờ quay → push qua websocket → client hiển thị "kết quả hôm nay" + tô trúng. Client chỉ render (server-authoritative như serve/reward gốc).
- Ngày không có kỳ quay (Vietlott không quay mỗi ngày) → fallback Chế độ A (XSMB hằng ngày) hoặc dồn sang kỳ kế.

> ⚠️ **Tái khẳng định:** đây thuần túy là **cơ chế ĐỐT XU (currency sink)**. Dùng kết quả thật chỉ để minh bạch RNG — **KHÔNG liên quan pay-to-win**: mua vé bằng xu in-game, thưởng = xu tiêu được (`coins`), KHÔNG cộng điểm mùa/Life Path, KHÔNG bán vé bằng tiền thật.

### 18.4 Ràng buộc thiết kế (quan trọng)
- **Thưởng = xu TIÊU ĐƯỢC (`coins`/số dư), KHÔNG cộng `seasonEarned` & KHÔNG cộng thu liên mùa** → **không ảnh hưởng league & Life Path** → không pay-to-win, không lệch đua hạng. (Đúng nguyên tắc gốc: chỉ doanh thu phục vụ+shipper mới tính hạng.)
- **Mua vé bằng xu in-game**, không bán vé bằng tiền thật → không phải cờ bạc tiền thật, an toàn.
- Giới hạn vé/ngày + EV<1 → vừa là sink lành mạnh, vừa không thành "máy in xu".
- Có thể buộc **server-authoritative** (quay số + payout server-side) chống gian lận như serve/reward gốc.

### 18.5 Tinh thần & lưu ý
- Là **xổ số kiến thiết / Vietlott** (hợp pháp, đúng văn hóa quán nhậu) — **KHÔNG** phải lô đề/cá độ bóng đá.
- Microcopy vui: "Lấy em tờ lấy hên đi anh!", "Chiều xổ rồi, thử vận may không?".
- **Tránh khuyến khích cờ bạc quá đà**: đóng khung là **mini-game đốt xu vui**, giới hạn vé/ngày, KHÔNG có cơ chế "nạp tiền thật mua nhiều vé". Thông điệp "chơi cho vui".

---

## 19. Quyết định, trạng thái & việc còn mở → **xem GDD**

> Để tránh trùng lặp (và lệch khi sửa), MAP **không** giữ bản sao danh sách quyết định/còn-mở nữa. Nguồn duy nhất:
> - **Bảng trạng thái quyết định (Core/Prototype/Post-MVP):** `02-GDD-trum-bia-hoi.md` **§20**.
> - **Roadmap & phân phase MVP:** GDD **§19**.
> - **Việc còn mở:** GDD **§20** (cuối bảng).
> - **Spec hệ bàn:** `03-SPEC-he-ban.md`.
>
> MAP chỉ giữ phần **phân tích & lý do** (các mục 1–18 ở trên). Nếu có mâu thuẫn giữa MAP và GDD → **GDD thắng**.

---
## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)
| Ver | Thay đổi |
|---|---|
| v0.1 | Bản map chuyển hóa đầu: 5 lớp economy trà đá → bia hơi; menu, tài nguyên, khách, sự kiện, meta (vỏ). |
| v0.2 | Chốt menu 6 món; hệ bàn; mất hơi 2 tầng; giá thật HN; đánh giá platform. |
| v0.3 | Re-tune economy (k); freshness/bàn; prototype-first; event World Cup; xổ số. |
| v0.4 | Đo k bằng mô hình (k_value≈2.5, kiểm chứng live); WC lịch+tỉ số thật; xổ số kiến thiết/Vietlott. |
| v0.5 | k tối ưu = 2.5 (chứng minh bất biến lượt/trần); WC offset 20'; xổ số quay theo kết quả thật. |
| v0.6 | Phân nhãn Core/Prototype/Post-MVP (đồng bộ review 8 điểm & GDD v1.1). |
| v0.7 | Dọn câu cũ sót: donation cosmetic-only, mất hơi MVP mềm, xổ số post-MVP, prototype được chỉnh k; "k=2.5 cho prototype". |
| v0.8 | Gộp trùng lặp: chuyển quyết định/số/còn-mở về GDD làm nguồn duy nhất; MAP chỉ còn rationale (mục 1–18). |
| v0.9 | Đồng bộ scope prototype Phase 0 với `04-SPEC-prototype-phase0.md`: 3 bàn, bia + 2 mồi tức thì, 2 mức rush; MAP vẫn chỉ giữ rationale. |

*Spec chính thức: `02-GDD-trum-bia-hoi.md`; hệ bàn: `03-SPEC-he-ban.md`. Mâu thuẫn → GDD thắng.*

---
### Nguồn tham khảo
- [Bảng giá bia Hà Nội (Habeco) 2025 — dailybiahoihanoi.vn](https://dailybiahoihanoi.vn/gia-bia-ha-noi/)
- [Bia hơi Hà Nội tăng giá mỗi cốc — 24hmoney.vn](https://24hmoney.vn/news/bia-hoi-ha-noi-tang-gia-moi-coc-dat-them-bao-nhieu-c25a2763582.html)
- [Quán bia ngon Hà Nội & món nhậu — ruoutot.net](https://ruoutot.net/quan-bia-ngon-ha-noi)
- [Bia hơi Hà Nội ở Sài Gòn (menu/giá) — vinwonders.com](https://vinwonders.com/vi/wonderpedia/news/bia-hoi-ha-noi-o-sai-gon/)
- [Xổ số kiến thiết — văn hóa & cơ chế — cqhonglong.com](https://cqhonglong.com/xo-so-kien-thiet/)
- [Cơ cấu giải thưởng xổ số truyền thống Miền Bắc — minhngoc.net.vn](https://www.minhngoc.net.vn/thong-tin/co-cau-giai-thuong-mien-bac.html)
