# Mô phỏng career từ game mới

`npm run sim:career -- --days=30 --seed=42 --out=.qa/career-30-days-seed42.json`

Harness: `packages/engine/sim/career.ts`. Dùng nguyên config đang được engine nạp
(hiện 2.0.1/rules23), bắt đầu lúc 00:00 Việt Nam ngày 09/09/2026. `--days` nhận 1–90,
`--seed` là số nguyên; đầu ra JSON chứa chính sách, dữ liệu từng ngày, timeline
mua/mở khóa, kết quả mùa và SHA-256 của log lệnh. Không thay save người chơi.

## Chính sách v1

- Chạy số ca newbie/ngày từ config; đợi hồi đầy thể lực và khách tự rời khi đóng ca.
  Giữ toàn bộ lịch sử lệnh/sự kiện; lịch thuê và mùa chạy qua đêm thật.
- Kiểm tra phục vụ mỗi 100ms, chọn mâm/đơn giao đã sẵn sàng có deadline gần nhất;
  tuân thủ giới hạn phục vụ của engine. Không phục vụ từng khách riêng lẻ.
- Mỗi giây: nhận thưởng đủ điều kiện, mua nguyên liệu theo lô (mua lẻ khi hết).
  Mua tài sản chỉ khi số dư sau mua còn đủ giá một lô mỗi món đã mở khóa.
  Đây là điều kiện mua vốn, không bảo đảm số dư luôn trên mức dự phòng khi bị phạt.
- Ưu tiên chó cấp 1, điện thoại, QR; tiếp theo mua lựa chọn rẻ nhất hợp lệ trong
  thiết bị, nâng bàn hiện có, cốc, chó, biển gỗ/neon. Bot nhắm hai cốc mỗi ghế,
  tuân thủ trần mua cốc; không chế lại công thức giá bàn mới. Bàn cần huy hiệu
  chưa kiếm được sẽ giữ nguyên, không tự cấp huy hiệu để vượt gate.
- Dùng tối đa một tờ rơi mỗi ca nếu đủ điều kiện. Khi không còn hợp đồng, thử
  mặt bằng kế tiếp theo hệ số thu nhập; hết kỳ mới thuê tiếp/chuyển nơi. Không
  hủy hợp đồng sớm để bỏ qua tiền thuê hoặc cọc.

Các số 100ms/1s, chính sách mua sắm và giới hạn chạy là tham số thí nghiệm, không
phải hằng số kinh tế mới. Mọi giao dịch đi qua `Game.command`, quote chung và
cấu hình hiện tại; không gán trực tiếp tiền, kho, tài sản, LP hoặc peak.

## Kiểm tra và cách đọc

Mỗi ngày đối soát:

`xu cuối = xu đầu + doanh thu được ghi nhận + thưởng ngoài doanh thu + cọc hoàn − mua sắm − phạt`

Harness kiểm tra ca/ngày, trần doanh thu, số dư/kho nguyên không âm và mọi lệnh
được chấp nhận. Test hai ngày phát lại toàn bộ save để chứng minh kết quả đến từ
lệnh thật. `nextRequirements` chỉ ra từng điều kiện LP còn thiếu từ helper chung.
`income` là credit sau cap; `k` vẫn dùng payment+tip trên lượt phục vụ chia anchor,
không trộn doanh thu giao hàng, tiền thưởng hay throughput vào công thức.

Không coi đây là bot tối ưu hoặc phép đo khả năng của người chơi. Chính sách
mua bàn/cốc sớm từng làm đầu game chậm hơn probe ưu tiên thiết bị. `arrived` và
`lost` là thống kê engine, còn `served` đếm lượt phục vụ qua các vòng gọi món;
không lấy served/arrived làm tỷ lệ chuyển đổi khách.

`withinKBand` giữ nguyên so sánh 2–3 từ config. Career có mặt bằng/QR/biển/tờ rơi
báo cáo đầy đủ các ngày ngoài band; không chứng nhận cân bằng. Phạm vi band nâng
cao đang chờ owner quyết định. Assertion của `npm run sim` vẫn giữ nguyên.

## Kết quả ban đầu — đang hoàn tất kiểm tra/review

Seed 42, 30 ngày: 240 ca, 29.209 lượt phục vụ, 9.054.324 doanh thu trọn đời, 1.582.365 xu còn lại,
LP4, peak huyen_thoai. Bom/rửa/lạnh/quầy cấp 5, bếp cấp 4; 3 bàn cấp 3, 36 cốc, chó cấp 3,
điện thoại/QR/biển neon/tờ rơi; đã thuê Ngõ Chợ → Bến Xe → Công Sở → Sân Vận Động.
k toàn lượt đo 3,483282. Đây là chẩn đoán thực tế, chưa phải đạt toàn bộ LP0–LP7.

Seed 99 và review độc lập đang chạy. Chỉ cập nhật kết quả xác minh sau khi chúng
hoàn tất. Dữ liệu đầy đủ ở `.qa/career-30-days-seed42.json`; tái tạo bằng lệnh trên.

## Changelog (append-only)

| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | Thêm harness career dùng lệnh và tài nguyên thật; đối soát ví/ngày, log có hash, kiểm tra replay; giữ nguyên số kinh tế và trạng thái chờ quyết định band nâng cao. |
