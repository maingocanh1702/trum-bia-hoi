# Mô phỏng career từ game mới

`npm run sim:career -- --days=30 --seed=42 --out=.qa/career-30-days-seed42.json`

Harness: `packages/engine/sim/career.ts`. Dùng nguyên config đang được engine nạp
(config2.0.1; rulesVersion thực tế được ghi trong từng report), bắt đầu lúc 00:00 Việt Nam ngày 09/09/2026. `--days` nhận 1–90,
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

`withinKBand` là chẩn đoán **từng ngày so với band chuẩn 2–3** trong config;
giữ nguyên toàn bộ các ngày vượt band, không dùng cột này làm verdict advanced.
Owner 10/09 chọn band chuẩn chỉ cho cold-menu/full-menu. Advanced career ≥30 ngày,
đạt LP4 với meta multipliers dùng **k toàn career ≤3.5 cho từng seed**.

`npm run sim:career:gate -- --out=.qa/advanced-career-k-gate.json` chạy mới hai seed
42/99, 30 ngày/seed, tối thiểu500 lượt và LP4. Gate đã nối vào `npm run verify`;
vượt cap hoặc thiếu bằng chứng sẽ exit khác0. K dùng helper `serveValueStats`,
không lấy trung bình k ngày/seed và không clamp kết quả. Các con số này là protocol
kiểm định (`config-exempt`), không phải tham số gameplay; JSON không đổi.
**Re-evaluate after Alpha playtest with real player data.** Lạm phát endgame được
theo dõi bằng báo cáo faucet/sink7ngày, không bằng k. Kernel báo cáo đã có;
protected server aggregation/admin UI vẫn là phần M4 đang triển khai.

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

Theo quyết định owner10/09, **k toàn career3.483282/3.318249 PASS dưới soft cap3.5**.
Vẫn giữ chẩn đoán theo ngày: seed42 có22/30ngày ngoài band chuẩn (cao nhất4,823585),
seed99 có20/30ngày (cao nhất4,479384). Soft cap áp dụng toàn career, không phải
mỗi ngày. Đây không phải chứng nhận toàn bộ LP0–LP7 hoặc kết quả chơi của người thật. Các thao tác quản lý của bot không
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

| 2026-09-10 owner decision | Advanced profile dùng gate≤3.5,≥2seed30ngày/LP4 và≥500serves/seed; standard sim2–3 không đổi. Historical3.483282/3.318249 PASS; giữ daily diagnostics và công thức. Tái đánh giá sau Alpha bằng dữ liệu người chơi; lạm phát endgame dùng faucet/sink7ngày. |

## Gate hiện tại — 2026-09-10

`13367c1` chạy mới bằng config2.0.1/rules24: seed42 **3.483282134916905**,
seed99 **3.3182494823317215**,30ngày/LP4 mỗi seed; số lượt29.209/28.259.
Khớp chính xác k và số lượt của hai báo cáo trước. `advanced-career-k-gate.json`
ghi hash lệnh mới cùng rulesVersion; không dùng hash rules23 làm chứng cứ cho rules24.
345tests/config không cảnh báo/build/10standard cohorts/15rush PASS; review độc lập
không có lỗi actionable. Receipt `.qa/advanced-k-verification.json`.

| 2026-09-10 gate verified | Fresh two-seed gate13367c1 PASS, preserving prior k/serves with current rules24; full verification and independent review PASS. M3 progressed-k criterion closed, full M3 and LP0–LP7 acceptance remain open. |

## Bảng cửa — 2026-10-20 (S3 `eco21-capacity-demand`, JSON 2.0.22)

`npm run sim:career -- --days=30 --seed=42 --door` (và `--seed=99`) in thêm, sau các dòng `PURCHASE`, bảng "ai bỏ đi CÓ phạt" của acceptance S3 (plan §5): `DOOR shifts 1-24`, `DOOR days 8-14`, `DOOR days 15-21`, `DOOR shift 1` và một dòng `DOOR {json}`. Mỗi băng hiện số khách tới (kể cả cặp bị từ chối tại cửa), số bị từ chối (không phạt), số bỏ đi có phạt (hết kiên nhẫn ở bàn hoặc ở hàng đợi) và hai tỉ lệ: trên **mọi khách tới** và trên **khách được nhận** (có bàn hoặc có chỗ đợi; cách đọc chặt hơn, quyết định `PASS/FAIL`). Mục tiêu (hằng số nghiệm thu trong `packages/engine/sim/door.ts`, không phải số chơi): ca 1–24 ≤ 10 %, ngày 8–14 ≤ 20 %, ngày 15–21 ≤ 15 %; ca 1 ≥ 15 khách tới và ≥ 5 cặp bị từ chối (`floor(noSeat / 2)`). Đây là **báo cáo, không phải gate**: không đổi cách đo k hay `commandHash`. Report JSON (`--out`) có thêm `shiftStats` (từng ca đã đóng: `arrived`, `served`, `lost`, `rejected`, `noSeat`, `penalty`). `simulateCareer({ config })` nhận snapshot khác bản bundle (mặc định là bản bundle) để test cô lập chủ đề khỏi nhịp đầu game. Số đo S3 ở 08-SPEC changelog 2026-10-20.

| 2026-10-20 S3 | Thêm `--door`, `shiftStats` và tuỳ chọn `config` của `simulateCareer`; k và bảng cửa của hai seed ở 08-SPEC changelog (gate k hoãn cho S5). |
