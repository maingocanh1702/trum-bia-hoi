# Brief chi tiết: Trùm Trà Đá Vỉa Hè → Trùm Bia Hơi

Phân tích sâu gameplay & kinh tế của [trumviahe.com](https://trumviahe.com) làm tham chiếu cho game bán bia hơi. Dữ liệu lấy từ chơi trực tiếp + hỏi trợ lý AI trong game (kết ca, menu Nâng cấp, kho hàng, cơ chế ca/mùa giải).

---

## 1. Thể loại & vòng lặp cốt lõi

Idle/tycoon **phục vụ khách theo ca** (shift-based serving), chạy trên trình duyệt, tối ưu mobile. Khác với idle thuần: game có **anti-idle** — tự tạm dừng khi người chơi không theo dõi tab ("Game tự tạm dừng vì bạn không theo dõi").

Vòng lặp:

1. **Mở ca** (cần thể lực 100%) → khách đổ vào liên tục trong ~12 phút.
2. Mỗi khách có **nhu cầu riêng**; phục vụ đúng & nhanh → **tiền + tiền boa (tip) + uy tín**.
3. Tiêu hao **nguyên liệu** + **ly** (ly phải rửa để tái dùng) → quản lý kho, nhập hàng giữa ca.
4. **Hết thể lực → đóng cửa** ~30 phút hồi sức, xem **sổ sách kết ca**.
5. Dùng tiền/uy tín **nâng cấp** → ca sau hiệu quả hơn. Leo **mùa giải xếp hạng**.

## 2. Cơ chế Ca làm & Thể lực (điểm khác biệt cốt lõi)

- **Mỗi ca ~12 phút** chơi active (màn kết ca quan sát được ghi "Thời gian hoàn thành 16 phút" — gồm cả thời gian setup).
- **Thể lực** giảm dần trong ca; hết → buộc đóng quán.
- **Nghỉ ~30 phút** để hồi 100% thể lực mới mở ca mới (gating nhịp chơi, chống cày liên tục).
- **3 ca/ngày** hoàn thành → quà **1.000 xu + 100 uy tín**.
- **Sảng khoái buổi sáng**: nghỉ >6 tiếng (ngủ qua đêm) → ca đầu +10% thu nhập trong 10 phút đầu (welcome-back).
- Khi nghỉ, bật **Thu Nhỏ → chế độ Tĩnh tâm/Zen**: màn mờ, nhạc lofi + radio "loa phường" kể chuyện vỉa hè + dự báo thời tiết ca tới. Zen (🧘) tắt lời phát thanh viên.

### Sổ sách kết ca (các chỉ số game theo dõi)
Ví dụ 1 ca thực tế: Tổng thu 23.498 — Phạt 13 = **Thực thu 23.485 xu**; Khách đến **307**, Phục vụ **272 (89%)**, Bỏ đi **35 (11%)**, Khách boa **196 (72%)**, Nhiệm vụ **3/3**, Uy tín **-2.421⭐**. Có mốc thưởng trong ca: "↑ Phục vụ +50", "↑ Khách boa +50", "↑ Thực thu +7.199".

→ Uy tín có thể **âm** trong 1 ca (khách bỏ đi/phục vụ chậm trừ điểm).

## 3. Thời tiết, giờ cao điểm & sự kiện (lớp hệ số nhân)

Doanh thu ≈ giá món × hệ_số_cao_điểm × hệ_số_thời_tiết × hệ_số_mặt_bằng.

- **Giờ cao điểm** ("Cao điểm tới — NẶNG", đếm ngược): đợt khách dồn dập, hệ số tăng (quan sát ×1.10).
- **Thời tiết** mỗi ca khác nhau, có narration riêng. Ví dụ **Oi bức**: khách gọi trà liên tục, **đá tan cực nhanh** (phải nhập thêm đá) nhưng **tiền tip cao nhất game**. → thời tiết tạo trade-off rủi ro/phần thưởng.
- **Sự kiện địa điểm**: "Chợ Đêm ×1.20" có thời hạn (vd 3d 23h).

## 4. Kinh tế (economy)

### Hai loại tiền tệ
| Loại | Ký hiệu | Kiếm từ | Dùng để |
|------|---------|---------|---------|
| Xu (tiền) | 💰 | Bán hàng, tip, shipper | Nhập nguyên liệu, nâng cấp thiết bị, thuê mặt bằng |
| Uy tín | ⭐ | Phục vụ tốt, mốc thưởng | Marketing (tờ rơi), đổi biển hiệu, mở khoá VIP |

### Nguyên liệu (kho, có giới hạn sức chứa) — 5 loại
- **Pha trà đá**: Trà + Nước sạch + Đá (3 nguyên liệu) → món thu chính.
- **Đồ ăn vặt**: Kẹo lạc + Hạt hướng dương → phục vụ liền tay, không cần chế biến, cộng dồn lời tốt.
- **Ly**: tài nguyên quay vòng — bẩn phải **rửa** (Bộ rửa ly) mới tái dùng. Đá đặc biệt tiêu hao nhanh khi trời nóng.
- **Nhập hàng**: mua sỉ theo **lô (vd lô 10)** để không "cháy hàng" giữa ca.

### Món bán & nguồn thu
1. **Trà đá** — nguồn thu chính, đỉnh khi trời nắng.
2. **Kẹo lạc / Hạt hướng dương** — upsell ăn kèm, biên lợi nhuận tốt.
3. **Tiền boa (tip)** — % khách boa; **khách VIP boa đậm**, trời nóng tip cao.
4. **Đơn Shipper** — đơn to, **không tốn ly**, tiền tươi; lỡ đơn bị **phạt**.
5. **Nhiệm vụ ngày** — ~1.000 xu/nhiệm vụ (KHÔNG tính vào xếp hạng).
6. **Điểm danh / quà hòm thư** — thu phụ (KHÔNG tính vào xếp hạng).

### Loại khách
- **Khách thường**, **khách VIP** (boa nhiều), **khách vội** (khách vội — dễ bỏ đi, một số biển hiệu giảm tỷ lệ này), **Shipper** (đơn giao hàng).

## 5. Nâng cấp (sink tiền/uy tín chính)

**Nhánh Trang bị (vận hành):**
- Ghế tựa (tối đa 9 ghế) — số khách phục vụ đồng thời
- Mua ly (tối đa ~12) — số ly quay vòng
- Quầy (Lv) — tốc độ/số món, vd Lv3→20.000 xu
- Thùng đá (Lv) — sức chứa đá, vd Lv3→30.000
- Ấm tích (Lv) — sức/tốc độ pha, vd Lv4→200.000
- Bộ rửa ly (Lv) — rửa ly tái dùng, vd Lv4→150.000

**Nhánh Kinh doanh (tăng trưởng):**
- **Điện thoại** — mở đơn shipper/online
- **Đăng ký QR** — thanh toán nhanh (tăng throughput tiền)
- **Tờ rơi** — marketing kéo khách (giá bằng uy tín, vd 300⭐)
- **Biển hiệu** — kéo khách VIP. Lần lắp đầu ~20.000 xu:
  - **Hoàng kim**: VIP **×3** (cần 5.000 uy tín) — đỉnh
  - Gỗ / Neon / Vintage…: VIP **×2** + hiệu ứng phụ (thêm shipper, bớt khách vội)
- **Nâng cấp chó giữ quán** (Lv, có MAX) — chống mất trộm/rủi ro
- **Thuê mặt bằng** — đổi địa điểm lấy hệ số thu nhập:
  - Hẻm Nhỏ (gốc) → Chung Cư Cũ / Cổng Trường (×1.10–×1.15) → Chợ Đêm (×1.20)…

→ Đường cong chi phí tăng dần theo cấp (20k→30k→150k→200k…), kiểu hàm mũ.

## 6. Mùa giải xếp hạng (competitive/retention)

- **Điểm xếp hạng = tiền bán hàng + đơn shipper** trong mùa.
- **Loại trừ**: thưởng nhiệm vụ, điểm danh, quà hòm thư (đảm bảo công bằng).
- **Trần doanh thu/ngày**: chỉ vài ca đầu mỗi ngày tính **100% điểm**, sau đó **giảm dần** (chống cày quá sức, ai cũng có cửa).
- **Hạng**: …Gold, Ruby… (người chơi quan sát đang Gold, mùa trước Ruby) — hệ tier có lên/xuống hạng theo mùa.
- **Đền Thiêng (⛩️)**: "Bảng vàng" — cuối mùa, top bảng được **đúc tượng/lưu dấu**; người khác vào "chiêm bái". Prestige + social showcase.

## 7. Các lớp giữ chân (retention)

Nhiệm vụ ngày (🎯 x/5), hộp quà (🎁), bảng xếp hạng (🏆) + Đền Thiêng, thông báo (🔔), thể lực/ca + thưởng 3 ca/ngày, welcome-back +10%, trợ lý AI trong game (🤖) trả lời mẹo chơi, chế độ Tĩnh tâm/lofi.

**Trợ lý AI trong game**: chatbot tone "đồng nát vỉa hè" rất có chất, đọc được trạng thái người chơi (số xu, uy tín, hạng, thời tiết ca tới) để tư vấn cá nhân hoá. Giới hạn ~20 tin nhắn/phiên, lịch sử xoá khi đóng.

---

## 8. Gợi ý domain model (TypeScript — bản bia hơi)

```typescript
type Currency = "coin" | "reputation";
type WeatherType = "dep_troi" | "oi_buc" | "mua" | "lanh"; // ánh xạ thời tiết
type CustomerKind = "normal" | "vip" | "hurried" | "shipper";

interface Ingredient { id: string; qty: number; capacity: number; }

interface MenuItem {
  id: string;                 // "bia_hoi", "lac_rang", "nem_chua"
  recipe: Record<string, number>; // tiêu hao nguyên liệu
  needsGlass: boolean;        // bia tốn cốc & phải rửa; mồi thì không
  basePrice: number;
  prepTimeMs: number;
}

interface Customer {
  kind: CustomerKind;
  order: string[];            // danh sách MenuItem.id
  patienceMs: number;         // hết kiên nhẫn -> bỏ đi, trừ uy tín
  tipRate: number;            // VIP cao hơn; tăng theo thời tiết
}

interface Multipliers { peakHour: number; weather: number; venue: number; }

interface Shift {                // 1 ca ~12 phút
  durationMs: number;
  weather: WeatherType;
  staminaDrainPerSec: number;
}

interface Ledger {               // sổ sách kết ca
  gross: number; penalty: number; net: number;
  arrived: number; served: number; left: number; tipped: number;
  reputationDelta: number;       // có thể âm
  missionsDone: number;
}

interface SeasonRank {
  score: number;                 // CHỈ tính doanh thu phục vụ + shipper
  tier: "bronze"|"silver"|"gold"|"platinum"|"ruby"|"diamond";
  dailyScoredShifts: number;      // trần: ca đầu 100%, sau giảm dần
}

interface GameState {
  coin: number; reputation: number;
  stamina: number;               // 0..100, hồi khi nghỉ
  ingredients: Record<string, Ingredient>;
  glasses: { clean: number; dirty: number; capacity: number };
  upgrades: Record<string, { level: number; max: number }>;
  venue: { id: string; multiplier: number; expiresAt?: number };
  signboard?: { type: string; vipMultiplier: number };
  season: SeasonRank;
  lastRestEndedAt: number;        // tính welcome-back +10%
}
```

## 9. Điều chỉnh khi làm bản "bia hơi"

- **Đồ uống có cồn** → cân nhắc cảnh báo/giới hạn độ tuổi nếu phát hành công khai.
- Menu nên có **combo nhậu** (bia + mồi: lạc, nem, dồi, đậu...) thay vì món lẻ → tăng giá trị mỗi bàn; mồi = "ăn vặt phục vụ liền" như kẹo lạc/hạt.
- **Cốc/vại bia** = tài nguyên quay vòng phải rửa (giống ly). Bia hơi giữ lạnh → cơ chế "bia ra hơi/nhạt" tương tự "đá tan".
- Nhịp **bàn nhậu lâu hơn** ly trà đá → thiết kế vòng quay bàn & thời gian phục vụ khác.
- Sự kiện cao điểm đặc trưng quán bia: **cuối tuần, bóng đá, trời nóng** → multiplier mạnh.
- Giữ nguyên các trụ cột hiệu quả: ca/thể lực, mùa giải có trần, biển hiệu kéo VIP, shipper, mặt bằng có hệ số, trợ lý AI in-game, Đền Thiêng vinh danh.

---
*Nguồn: quan sát trực tiếp trumviahe.com (UI gameplay, màn kết ca, menu Nâng cấp & Kinh doanh, kho hàng) + hỏi trực tiếp trợ lý AI trong game.*
