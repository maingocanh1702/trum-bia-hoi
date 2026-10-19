# Closed playtest — phiếu thu bằng chứng C/E

> **CHƯA THU BẰNG CHỨNG NGƯỜI CHƠI.** Phiếu chuẩn bị theo `PLAN-improve-2026-09-16.md`
> đợt B/C/E. **Sổ ca → Chi tiết → Số đo ca** đã được triển khai và kiểm thử trên nhánh A/B;
> chỉ thu số sau khi đối chiếu đúng bản thử. Bản public cũ **chưa có đầy đủ A/B**; URL mở được
> không chứng minh bản mới đã triển khai. Xem [receipt A/B](improve-wave-ab.md).

Nguồn: [04-SPEC §5](../04-SPEC-prototype-phase0.md#5-cách-đo-k_value--bất-biến-phương-pháp)
(cách đo k), [ROADMAP — Playtest & Validation Plan](../06-ROADMAP-trum-bia-hoi.md#-playtest--validation-plan)
(cỡ mẫu/survey), PLAN đợt C/E (mục tiêu bên dưới). Các hàng human-test **WAIVED** trong
[milestone closure](milestone-closure-m0-m5.md) giữ nguyên; phiếu prospective này không thu hồi
waiver, mở lại gate prototype hay tự thay verdict M1/M2/M3.

## 1. Đúng bản, đúng mẫu

- Closed playtest: **10–15 người**, ưu tiên bạn bè/gamers VN ngoài nhóm xây game; mỗi người chơi
  **ít nhất 3 ca hoàn tất trên cùng build**. Đợt C dùng owner + 2–4 người trước, rồi mở rộng ở E.
- URL public: [trumbiahoi.netlify.app](https://trumbiahoi.netlify.app/). Chỉ phát link đợt thử sau
  khi người điều phối đối chiếu **build SHA trong Cài đặt** với bản A/B đã kiểm chứng. Nếu SHA
  thiếu/không khớp hoặc chưa thấy Số đo ca, ghi `CHƯA ĐỦ ĐIỀU KIỆN`; chưa thu KPI đợt mới trên bản
  đó. Không yêu cầu tester xóa hay sửa save để vượt bước này.
- Lưu ảnh SHA, URL, ngày/giờ; ghi local/browser hay remote, guest hay Google, save mới hay chơi
  tiếp, configVersion đang pin. Nếu đổi build, tạo bộ ghi nhận mới; không gộp các build thành một
  lượt chơi 3 ca. Save cũ chưa nhận config mới phải được ghi đúng, không tự nhận là default mới.
- Người mới bắt đầu bằng guest theo luồng bình thường. Không chỉ lúc bấm phục vụ, nhập hàng hay
  nâng cấp; ghi sự bối rối và feedback tự phát. Ca 1 onboarding không dùng để kết luận về hai
  đợt Giờ Vàng; ghi số/loại rush thực thấy ở ca 2/3, không dùng toggle peak của prototype.

Mỗi tester sao chép các bảng ở §1/§3/§4, dùng mã T01–T15. Ô quan sát để trống tới khi có số thật.

| Tester | Ngày/giờ + múi giờ | Thiết bị / trình duyệt / viewport | URL đã thử | Build SHA | Ảnh đối chiếu SHA | Local/remote · guest/Google | Save mới/tiếp tục · configVersion |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## 2. Thu số ngay sau từng ca

1. Chơi đến khi ca đóng. Nếu thoát/đóng sớm, ghi lý do và `chưa hoàn tất`, không coi là một trong
   3 ca hoàn tất. Sim và builder smoke không thay bằng chứng người chơi.
2. **Trước khi mở ca tiếp theo**, mở **Sổ ca → Chi tiết → Số đo ca**. Chụp đủ số đo, nhãn ca và
   cảnh báo độ phủ; chép nguyên giá trị UI, không dùng HUD đang chạy hay cộng dồn toàn phiên.
   Trường chưa có trong build ghi `CHƯA CÓ`, không tự điền theo số trong spec.
3. Ghi configVersion/mã ca và tên file ảnh. Xuất **bản lưu dự phòng** bằng chức năng đang có nếu
   build/mode hỗ trợ, giữ file nguyên trạng để đối chiếu/replay; không dựa vào nút `Copy log` của
   prototype. Không có export thì ghi rõ, dùng ảnh và bảng; phần chưa đối chiếu được chưa là PASS.
4. Gửi mã tester, bảng, ảnh và export qua kênh đã thống nhất với người điều phối. Có thể chép cùng
   các trường vào Google Form; không cần một form/link chưa tồn tại để chuẩn bị phiếu. Sau mỗi
   ca ghi cảm nhận; sau ca 3 trả lời survey §4. Giữ cả mẫu bỏ dở/thiếu số và nguyên nhân.

| Sáu KPI | Cách đọc và mẫu số để đối chiếu |
|---|---|
| **Lượt phục vụ** | Một khách được phục vụ ở một đợt gọi = một lượt; cùng khách gọi đợt 2 tính thêm lượt. Không dùng số mâm/bàn, khách duy nhất hay số lần bấm. |
| **Giá trị/lượt (xu)** | `mean(payment + tip)` trên lượt đã phục vụ, **gồm cả tiền bia và mồi**. Tên lịch sử `DT_bia_mỗi_lượt` không có nghĩa chỉ lọc bia. Không dùng tiền ví, shipper, quà, thưởng hay bonus well-rested. |
| **k** | Giá trị/lượt chia `k.anchorValuePerServe` = **82.5**, theo 04-SPEC §5; không cộng throughput, số bàn, số đợt gọi hay xu/giây. |
| **% lượt có mồi** | Lượt đã phục vụ có ít nhất một món khác bia / toàn bộ lượt đã phục vụ ×100; không đếm số phần mồi làm tử số. |
| **% bia phục vụ mất hơi** | Cốc bia đã phục vụ bị stale / **tổng cốc bia đã phục vụ** ×100. Không chia cho số mâm, tổng món hay cốc sở hữu; bia chưa phục vụ hoặc bị hủy không vào tỷ lệ này. |
| **Khách bỏ đi** | Ghi số khách bỏ hàng chờ/bàn do hết hạn, **khách đến**, và `bỏ đi / khách đến ×100`. Không chia cho lượt phục vụ vì có đợt gọi lặp. Khách bị từ chối do hàng chờ đầy (`rejected`) ghi riêng ở ghi chú, không cộng âm thầm vào số bỏ đi. |

Không có lượt phục vụ: giá trị/lượt, k, % có mồi là `N/A`; không có bia đã phục vụ: % mất hơi là
`N/A`; không có khách đến: % bỏ đi là `N/A`. Không biến mẫu số 0 hoặc số không có thành 0%.
Chép tỷ lệ UI; chỉ đối chiếu bằng tử số/mẫu số **cùng ca** khi export có đủ dữ liệu. Gộp nhiều ca
phải gộp tổng và mẫu số gốc, không lấy trung bình tỷ lệ/k đã làm tròn; ghi tổng lượt thực tế khi
so với mục tiêu ≥500 lượt gộp của 04-SPEC §5.

**Độ phủ:** ghi `đủ ca`, `partial/legacy`, `không có số`, hoặc `chưa xác minh` theo bằng chứng.
Ca legacy chỉ có một đoạn thì giữ partial, không suy đoạn thiếu từ stats tổng và không chứng
nhận KPI cả ca. Archive có nhiều config ghi thêm `mixed-config`; điều đó không tự làm ca hiện
tại partial nếu ca có pin và độ phủ đầy đủ. Không gộp config/profile khác nhau để che ca vượt band.

## 3. Bảng mỗi ca — sao chép cho từng tester

Ô trống là chưa có quan sát, không phải 0/PASS. Nếu UI không hiển thị mã ca, dùng số ca trong lượt
chơi và gắn ảnh; không tự đặt engine ID.

| Tester | Ca | Hoàn tất? | Config / mã ca | Độ phủ · mixed-config? | Lượt phục vụ | Giá trị/lượt (xu) | k | % lượt có mồi | % bia phục vụ mất hơi | Khách bỏ đi / khách đến (%) | Ảnh / export · rejected / ghi chú |
|---|---:|---|---|---|---:|---:|---:|---:|---:|---|---|
|  | 1 |  |  |  |  |  |  |  |  |  |  |
|  | 2 |  |  |  |  |  |  |  |  |  |  |
|  | 3 |  |  |  |  |  |  |  |  |  |  |

## 4. Onboarding, rush và survey

- **Phục vụ đầu:** với người mới, dùng đồng hồ/video ghi từ bấm **Mở ca** tới giao món thành công
  đầu tiên; ghi giây thực tế, giữ cả thời gian người chơi mở menu. Chưa phục vụ được thì ghi đúng
  và mô tả việc xảy ra. Đánh dấu nhóm 5 người mới không được coach để đối chiếu ≥4/5 đạt ≤30s;
  chưa đủ 5 mẫu thì ghi thiếu mẫu, không quy đổi tỷ lệ để đủ gate.
- **Hai đợt Giờ Vàng:** ca 2/3 ghi số đợt, loại rush, có thấy cảnh báo, xử lý và phục hồi được
  không. Chỉ thấy 0/1 đợt thì ghi đúng; lưu mốc/ảnh và lời người chơi về điều gây rối.
- **Sau 3 ca:** hỏi “Mức độ vui từ 1 đến 10?”, “Bạn có muốn chơi tiếp không? Có/Không”,
  “Khó hoặc khó hiểu nhất ở đâu?”. Ghi câu trả lời tự do, không gợi ý đáp án.

| Tester | Người mới / nhóm 5? | Giây phục vụ đầu / chưa phục vụ | Ca 2: số/loại rush · xử lý được? | Ca 3: số/loại rush · xử lý được? | Fun 1–10 | Muốn chơi tiếp Có/Không | Khó ở đâu · cốc/rửa rõ? · quan sát/ảnh |
|---|---|---|---|---|---:|---|---|
|  |  |  |  |  |  |  |  |

## 5. Tổng hợp cho quyết định C/E

| Mục tiêu prospective từ PLAN | Cách tổng hợp | Bằng chứng / kết luận |
|---|---|---|
| 10–15 người × ≥3 ca hoàn tất | Đếm người/ca hợp lệ; báo riêng người bỏ dở, ca partial và thiếu số |  |
| C: k chuẩn 2.0–3.0; bỏ đi <20%; mất hơi 5–15% | Xem từng ca đủ độ phủ cùng build/config/profile; giữ ca ngoài mục tiêu để điều tra |  |
| C: ≥4/5 phục vụ đầu ≤30s | Ghi đủ 5 mã tester và giây; thiếu mẫu không thành PASS |  |
| C: nhịp 2 rush xử được, cốc/rửa là nghẽn dễ hiểu | Quan sát ca 2/3 và lời người chơi; bot không thay cảm nhận |  |
| E: fun trung vị ≥7/10; muốn chơi tiếp ≥60% | Mỗi người một survey sau 3 ca; trung vị fun, số Có / số người trả lời, báo cả số chưa trả lời |  |

Đây là mục tiêu thu bằng chứng mới, **không sửa waiver lịch sử**. Band2.0–3.0 dành profile chuẩn;
ngoại lệ advanced career của 04-SPEC §5 (≥30 ngày, LP4+, soft cap3.5) không phải lý do bỏ qua kết
quả guest 3 ca. Người điều phối báo cả mẫu số, thiếu dữ liệu và lỗi lặp lại; owner ghi quyết định
vào SESSION-TRACK-LOG theo ROADMAP. Phiếu trống, build xanh hay hosted smoke không tự đóng C/E.

## 6. fun-onboarding-visual — 5 người mới, tắt mọi hướng dẫn (owner chạy, CHƯA CHẠY)

> **Việc của owner, không phải của agent.** Agent chỉ dựng build; mọi ô dưới đây để trống tới khi có
> người thật. Báo cáo slice ghi các dòng này là `SKIPPED: owner playtest`, không bao giờ là PASS.
> Nguồn: `PLAN-vui-3-ca-2026-09-18.md` §4 `fun-onboarding-visual`, F27 changelog 2026-10-14.

Cách chạy: guest mới, save mới, không giải thích, không mở Cài đặt › Xem lại hướng dẫn. Điều phối viên chỉ quan sát. Ghi build SHA trong Cài đặt.

**Lưu ý đúng với build Đợt 1:** engine vẫn mở quán với 3 bàn × 2 chỗ, nên món duy nhất trong sheet
Nâng cấp sau ca 1 là **nâng một bàn đang trống (3.750 xu)**, không phải "Bàn 2" của mô hình ghế Đợt 2. Bong bóng
"2 ghế" chỉ hiện khi hàng chờ đầy và một nhóm bị từ chối ở cửa — hiếm ở Đợt 1; nếu không ai thấy,
ghi `KHÔNG QUAN SÁT ĐƯỢC` thay vì chấm đạt/không đạt.

| Tester | Phục vụ khách đầu (giây từ **Mở ca**) | Mua món đầu sau ca 1 **không** mở Help? Có/Không | Nói đúng vì sao cặp bỏ đi? Có/Không/Không thấy | Số câu "cái này để làm gì" trong 3 ca | Ghi chú · ảnh |
|---|---:|---|---|---:|---|
| T01 |  |  |  |  |  |
| T02 |  |  |  |  |  |
| T03 |  |  |  |  |  |
| T04 |  |  |  |  |  |
| T05 |  |  |  |  |  |

| Ngưỡng PLAN §4 | Cách tính | Kết quả |
|---|---|---|
| ≥ 4/5 phục vụ khách đầu ≤ 20 s | Đếm T01–T05 có giây ≤ 20; thiếu mẫu không thành PASS |  |
| ≥ 4/5 mua món đầu kết ca 1 không mở Help | Đếm "Có" cột 3 |  |
| ≥ 4/5 nói đúng vì sao cặp bỏ đi | Đếm "Có" cột 4; "Không thấy" không tính vào mẫu số, ghi riêng |  |
| ≤ 1 câu "cái này để làm gì" trong 3 ca | Mỗi tester ≤ 1 ở cột 5 |  |

## Lưu trữ prototype — không phải hướng dẫn cho bản thử hiện tại

Nội dung cũ giữ nguyên bên dưới để truy vết. Theo HANDOFF09/09, prototype đã lưu trữ; các human-only
criteria giữ WAIVED theo owner10–11/09 trong closure report cho tới quyết định owner khác. Ngưỡng
Alpha lịch sử normal loss<10% không bị đổi ngầm thành hand-play<20% của PLAN C: hai phạm vi khác
nhau. Các lệnh deploy prototype, toggle peak, Copy log và verdict PENDING cũ không áp dụng ở C/E.

<details>
<summary>Phiếu Alpha prototype lịch sử (trước kế hoạch 16/09)</summary>

## Phase 0 Alpha playtest — evidence sheet (archived)

> **Status:** AWAITING HUMAN EVIDENCE
>
> **Build:** `master` at/after `b3ad865`
>
> **Protocol authority:** `06-ROADMAP-trum-bia-hoi.md` Phase 0 exit gate + Playtest & Validation Plan

## Automated baseline (merged, 2026-07-15)

- Build: PASS.
- Five deterministic seeds: k `2.24–2.34`; normal loss `0%`; peak loss `26.1–40.8%`.
- Aggregate loss/rejection is fail-closed and uses customer arrivals, not served rounds.
- This baseline does **not** pass the feel gate.

## Technical smoke (not counted as an Alpha tester)

One partial shift was exercised through the local browser: open/close shift, group spawn, serve table, HUD k update (`2.42`), normal→peak toggle, glass/wash lifecycle, stale/loss log. No browser console errors occurred. A deliberately delayed serve produced one stale delivery and an unattended table lost two customers; these are mechanism checks, not balance evidence.

A second smoke pass was run by the builder on 2026-09-08, after the docs/tooling cleanup, to
confirm the build still plays end-to-end. No figures were recorded from it. Like the first pass
it is a mechanism check performed by the person who designed the mechanisms, so it cannot close
the gate: the five questions below ask whether a **new** player learns the timing and where they
get confused, and a designer cannot be confused by their own design. Builder smoke answers "does
it still run"; Alpha answers "does it teach itself".

## Required sample

- 3–5 human testers.
- At least 3 complete shifts per tester.
- Do not coach moment-to-moment after the controls are introduced; confusion is evidence.
- Each tester must experience normal and peak cadence.
- Testers run the **hosted build** on their own device, on their own schedule (see below).

### Hosting the build — this is what unblocks the gate

The original instruction here was `cd prototype && npm run dev`, which chained every tester to
the builder's machine: 3–5 people × 3 shifts × 12 minutes of someone else's time at one desk,
scheduled. That is the reason this gate sat open from 2026-07-15 — the blocker was logistical,
not technical.

It is removable in minutes. `prototype/vite.config.ts` already sets `base: './'`, the prototype
is client-only (no server, no persistence) and its viewport is locked to mobile, so a static
build drops onto any static host with zero configuration:

```bash
cd prototype
npm run build     # → prototype/dist/
```

Publish `prototype/dist/` (drag-and-drop onto any static host) and send the link. The game is
mobile-first by design, so testers play on their own phone whenever they have 12 free minutes.

**Current build URL:** `<fill in after deploying>`

### Collecting evidence remotely

After each shift the tester opens **Sổ ca** and taps **Copy log** — that puts the full
`ServeEvent` JSON on the clipboard — and sends it back. A screenshot of the stats sheet is an
acceptable fallback. The per-shift figures below come from those logs, not from the builder
watching over anyone's shoulder; not watching is required anyway, since coaching destroys the
confusion evidence.

Read per-shift numbers from each shift's own sheet. Do **not** read the "Dồn cả phiên" aggregate
row — the engine does not carry lost/rejected counts across shifts, so that row always shows `0`.

**Tester-facing instructions**, ready to send as-is (fill in the link first):
[`phase0-alpha-tester-brief.md`](phase0-alpha-tester-brief.md).

## Per-shift log

| Tester | Shift | Mode | Completed ~12m? | Served | k at close | Stale deliveries | Lost | Rejected | Notes |
|---|---:|---|:---:|---:|---:|---:|---:|---:|---|
| T1 | 1 | normal |  |  |  |  |  |  |  |
| T1 | 2 | peak |  |  |  |  |  |  |  |
| T1 | 3 | mixed/choice |  |  |  |  |  |  |  |
| T2 | 1 | normal |  |  |  |  |  |  |  |
| T2 | 2 | peak |  |  |  |  |  |  |  |
| T2 | 3 | mixed/choice |  |  |  |  |  |  |  |
| T3 | 1 | normal |  |  |  |  |  |  |  |
| T3 | 2 | peak |  |  |  |  |  |  |  |
| T3 | 3 | mixed/choice |  |  |  |  |  |  |  |

Add T4/T5 rows only when those testers actually participate.

## Five exit-gate questions

Record a short answer and one concrete observation per tester.

1. **Freshness:** Did the player learn to delay pouring, with stale penalties feeling rare rather than arbitrary?
2. **Table groups:** Was serving one Order for the whole table clear, without repeatedly choosing the wrong action?
3. **Glass bottleneck:** Did clean/dirty/washing glasses become the obvious constraint, and did the wash upgrade visibly relieve it?
4. **Two cadences:** Did normal feel controllable and peak feel hectic but still recoverable?
5. **Economy:** Did hand-play k remain in `2.0–3.0`, with normal customer loss below `10%`?

## Decision record

| Gate | Evidence | Verdict |
|---|---|---|
| k stable 2.0–3.0 |  | PENDING |
| stale rate 5–15% and penalties feel fair |  | PENDING |
| normal loss <10% |  | PENDING |
| table-group flow clear |  | PENDING |
| glass bottleneck clear; wash upgrade helps |  | PENDING |
| peak hectic but recoverable |  | PENDING |

Final decision is `PASS` only when every row above has human evidence and no repeated critical confusion remains. Otherwise keep Phase 0 open, record the failed mechanism, and create a bounded corrective slice before Phase 1.

</details>

## Changelog

| Ngày | Thay đổi |
|---|---|
| 2026-09-16 | Chuẩn bị phiếu closed playtest C/E 10–15 người ×3 ca, sáu KPI/mẫu số, partial/mixed-config, SHA/build và survey. Số đo ca chờ tích hợp; giữ nguyên phiếu prototype trong phần lưu trữ và waiver, không ghi kết quả người chơi hay triển khai chưa xảy ra. |

| 2026-09-16 / Wave B | Số đo ca đã qua kiểm thử UI, server và export trên nhánh A/B; cập nhật trạng thái hướng dẫn, giữ trống toàn bộ kết quả người chơi và không tuyên bố đã deploy. |

| 2026-10-14 / fun-onboarding-visual | Thêm §6: phiếu trống cho bài test 5 người mới (tắt mọi hướng dẫn) của PLAN 18/09 §4. Owner chạy; không có kết quả người chơi nào được ghi, không đổi waiver lịch sử. |
