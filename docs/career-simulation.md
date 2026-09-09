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

## Kết quả đã xác minh — 2026-09-09

Mỗi seed chạy 30 ngày, 240 ca. Config 2.0.1 và production rules23 giữ nguyên.

| Seed | Lượt phục vụ | Doanh thu trọn đời | Xu cuối | LP1 / LP2 / LP3 / LP4 vào ngày | k toàn career |
|---|---:|---:|---:|---|---:|
| 42 | 29,209 | 9,054,324 | 1,582,365 | 2 / 3 / 8 / 16 | 3.483282 |
| 99 | 28,259 | 8,373,534 | 939,091 | 2 / 4 / 9 / 17 | 3.318249 |

Cả hai đạt LP4, peak huyen_thoai; bom/rửa/lạnh/quầy cấp 5, bếp cấp 4, ba bàn cấp 3,
36 cốc, chó cấp 3, điện thoại/QR/neon/tờ rơi. Mỗi seed qua bốn hợp đồng và nhận lại
91.000 xu cọc từ ba hợp đồng đã hết hạn; có sáu kết quả mùa. LP5 còn thiếu doanh
thu đến mốc 12,5 triệu xu; điều kiện biển hiệu và peak đã đủ.

Seed42 tái chạy cho cùng hash lệnh. Phát lại save đầy đủ 30 ngày khớp toàn bộ
World và log: 16.567 lệnh, 388.986 sự kiện, 240 ca, 6 kết quả mùa. Test thường trực hai
ngày cũng kiểm tra replay và giao dịch thật. 250 engine/server tests, config/build,
10 nhóm k nền (2,4186–2,8738) và 15 ca rush đều qua; review độc lập `ca0df8b..b01f4b1`
không chỉ ra lỗi. Thêm lượt chạy test career sau khi bổ sung timeline cũng qua.

k nâng cao chưa đạt band: seed42 có 22/30 ngày ngoài band (cao nhất 4,823585), seed99
có 20/30 ngày (cao nhất 4,479384). Không tự thay số hoặc kết luận band chỉ áp dụng cho
cấu hình nền; quyết định này vẫn chờ owner. Đây cũng không phải chứng nhận toàn
bộ LP0–LP7 hoặc kết quả chơi của người thật. Các thao tác quản lý của bot không
tiêu tốn thời gian; nó không mô phỏng độ trễ thao tác tay.

Dữ liệu tại `.qa/career-30-days-seed42.json` và `career-30-days-seed99.json`;
receipt `.qa/career-verification.json`. Tái tạo bằng lệnh đầu trang, đổi `--seed=99`.

## Vấn đề lưu career phát hiện tại b01f4b1

Codec tại b01f4b1 tạo **80.013.203 byte** cho seed42 sau 30 ngày. Nó chứa cả log lệnh
và toàn bộ sự kiện; `apps/web/src/local.ts::persist` ghi nguyên chuỗi vào
localStorage sau lệnh người chơi. Probe Chromium 153 trên origin thử riêng:
ghi nhỏ thành công, ghi payload cùng kích thước bị `QuotaExceededError`; giá trị
cũ còn nguyên. Không dùng hoặc thay save 5174 của owner để làm phép thử này.

Replay đúng không có nghĩa trình duyệt lưu được career dài. UI hiện báo lỗi lưu
và cho tải backup, nhưng lần ghi lỗi không giữ được tiến trình mới khi đóng tab.
Ưu tiên tiếp theo là sửa cơ chế lưu/growth, giữ migration và lịch sử kiểm chứng,
trước khi mở rộng tài khoản/BXH. Không chữa bằng cách âm thầm bỏ log/sự kiện hay
nới assertion. Chưa tuyên bố bản chơi hiện tại sẵn sàng lưu career dài ngày.

## Changelog (append-only)

| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | Thêm harness career dùng lệnh và tài nguyên thật; đối soát ví/ngày, log có hash, kiểm tra replay; giữ nguyên số kinh tế và trạng thái chờ quyết định band nâng cao. |

| 2026-09-09 | Hoàn tất hai seed 30 ngày, replay trọn tháng, 250 tests/config/build/k nền/rush và review độc lập. Phát hiện bản lưu 80 MB vượt localStorage; chuyển ưu tiên kế tiếp sang lưu career, giữ câu hỏi band nâng cao. |

## Cập nhật lưu trữ — 2026-09-10

Adapter IndexedDB tại `c9db016` ghi lịch sử theo phần mới và bảo vệ backup/migration;
review mã không còn lỗi được xác nhận. Lượt verify cuối tại917f862 (storage/engine
không đổi sau c9db016) đã qua91browser và archive80MB:16567lệnh/388986sự kiện
ghi rồi mở lại khớp hoàn toàn; chỉ thêm1lệnh khi lưu tiếp. Appboot giữ240ca,LP4 và
1.582.365xu, không có pageerror. Replay17,5giây, ghi đầu308ms, ghi tiếp98ms,
khởi động20,5giây. Đã xem ảnh mobile390×844. Lượt86/91timeout do sleep được giữ
làm lịch sử, không coi là pass. Khởi động dài/bộ nhớ và toànLP0–LP7 vẫn cần tiếp tục.

| Ngày | Thay đổi |
|---|---|
| 2026-09-10 | Recorded reviewed IndexedDB implementation and earlier80MB acceptance, separating pending final runtime checks from code-review closure. |

| 2026-09-10 final storage |91/91browser and80MB real HTTP acceptance passed; exact full history/continuation/Appboot, latest20.458s boot. Storage code unchanged from reviewed c9db016. Full-career balance and LP0–LP7 still open. |
