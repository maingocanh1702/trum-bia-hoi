# PLAN "IMPROVE-EARLY-GAME" — Trùm Bia Hơi (v1.1, 23/10/2026)

> **Plan đang chạy** sau gói "Vui 3 ca" (`docs/PLAN-vui-3-ca-2026-09-18.md`: Đợt 1–4 đã vào `main`, `v-fb2` đang chạy ở `https://trumbiahoi.com`) và PR #32 (HUD + Nâng cấp từ ca 1, JSON 2.1.2).
> Nguồn quyết định: file quyết định của founder ngày 22/10/2026 (`IMPROVE-EARLY-GAME.md`), quyết định 23/10/2026 về STOP của Part A (`A-FOUNDER-DECISION-2026-10-23.md`) và QĐ-117 ngày 23/10/2026 về STOP của Part B1 (phiếu `QD-117-B1-STOP.md` + câu trả lời của founder trong run log `improve-early-game-log.md`). Các file đó, cùng bằng chứng đo ngày 22/10 (trumbiahoi.com chơi cạnh trumviahe.com, event log, ảnh: `reports/IMPROVE-REF-trumviahe-vs-trumbiahoi-2026-10-22.md`), nằm ngoài repo, trong thư mục trạng thái `.autopilot-state/` của phiên chạy trên laptop. Doc này viết lại các quyết định đó, không chép nguyên văn; khi doc này và file của founder lệch nhau, file của founder thắng.
> Cách viết: đầu vào · đầu ra · acceptance. Dev tự quyết cách làm.
> Ràng buộc mọi phần: số chỉ ở `docs/config/economy.tbh.json` — mỗi hành vi mới là một key có tier, nạp ở `config.ts` theo cách `kickTable` vào ở 2.1.1; mỗi luật engine mới có cổng để save đã ghim và replay cũ (rules version, nhãn config đã ghim) chạy y như trước; mỗi PR đổi config tăng nhãn đúng một lần, kèm test, dòng changelog spec và docs liệt kê phiên bản; docs ghi ngày, cộng thêm, giữ chữ cũ đọc được, trích "founder 2026-10-22". Không merge, không push `main`, không deploy, không đổi setting GitHub/Netlify/Cloudflare.

## 0. Đích và luật dừng

**Đích:** ca 1 không còn ba chỗ gây rối founder gặp ngày 22/10 ("Mời về" khi chưa cần, bàn lai rai giữ cái bàn duy nhất, hai nút "Mở ca"), đầu game có nhịp đều và Giờ Vàng đầu tiên có khách thật, người chơi thấy vì sao được hay mất tiền. Ba PR riêng, xếp chồng, để một STOP ở phần sau vẫn để phần trước review được.

**Luật dừng — báo cáo (số + ảnh), không tìm đường vòng:**
- một guardrail kinh tế đỏ: `npm run sim:balance` (kể cả hàng `shift1.plan`), dải k, trần ngày, `npm run sim:career:gate`;
- một thay đổi cần tap target dưới 44 px, hoặc bỏ thông tin người chơi đang có mà không đặt nó ở chỗ khác;
- một chỗ sửa cần số kinh tế founder chưa duyệt.

## 1. Quyết định founder đang hiệu lực

| # | Quyết định | Ngày | Phần | Trạng thái 23/10/2026 |
|---|---|---|---|---|
| F1 | Ca 1 không có "Mời về" | 22/10 | A1 | build trên `feat/shift1-founder-fixes` (PR #33), chưa vào `main` |
| F2 | Ca 1 không có "Bàn lai rai" (loại khách `ngoily`) | 22/10 | A2 | như F1 |
| F3 | Đúng một nút "Mở ca" trên màn hình ở mọi trạng thái: nút ở thanh dưới; thẻ chào bỏ nút của nó, trừ khi thanh dưới đang ẩn | 22/10 | A3 | như F1 |
| F4 | Làm cả bốn nhóm cải thiện: nhịp đầu ca · phản hồi khi bưng · gợi ý đúng lúc + nhãn · màn hình gọn | 22/10 | B1 (nhịp), B2 (ba nhóm còn lại) | B1 đang làm lại theo F8; B2 đang làm (bắt đầu 23/10) |
| F5 | Nhịp đầu ca, **Tier A, đã duyệt**: chỉ khách lẻ khi quán chưa có bàn ngồi được 2; không đổi số Tier A nào khác | 22/10 | B1.1 | lần build đầu trên `feat/early-pacing` dừng ở cổng kinh tế (§4); phạm vi đổi theo F8 |
| F6 | Ba PR xếp chồng A → B1 → B2 | 22/10 | §2 | A = PR #33; B1 = nhánh, chưa có PR; B2 = worktree riêng xếp chồng trên B1, chưa có PR |
| F7 | STOP của Part A: phương án (c) — giữ A2 như đã build, xét hai ô đỏ seed 42 cùng B1 (chuyển sang, không miễn); không phát hành Part A riêng | 23/10 | A, B1 | đã áp (PR #33 §2); kết quả trên B1 ở §4; hướng ra ở F8 |
| F8 | **QĐ-117 — STOP của Part B1, phương án B có sửa:** B1.1 thành **chỉ khách lẻ trong 3 ca đầu** (`completedShifts` < 3); giữ B1.2 và B1.3; nới dòng "cặp bị từ chối ở ca 1" và các dòng chỉ lệch ≤ 2 % hoặc ≤ 2 ca tới số đo được, lệch hơn thì dừng báo; bắt đầu B2 ngay trong worktree riêng từ đầu nhánh B1, rebase sau. (Phiếu QĐ-117 ghi "chỉ ca 1"; câu trả lời của founder là 3 ca đầu, câu trả lời thắng.) | 23/10 | B1.1, B1-verify, B2 | chờ (B1 làm lại); B2 đang làm |

Trên `main` (JSON 2.1.2) GDD và 03-SPEC vẫn mô tả cặp khách tới độc lập với quán (`spawn.pPair` 0,5), không có ngoại lệ của F5/F8: luật đó chỉ đổi khi B1 vào `main`.

## 2. Thứ tự

```
main d529ade (JSON 2.1.2) ─► A  feat/shift1-founder-fixes  (JSON 2.1.3, PR #33)
                              └► B1 feat/early-pacing       (xếp chồng trên A; lần build đầu JSON 2.1.4)
                                  └► B2 feat/early-ui-clarity (xếp chồng trên B1; worktree riêng, bắt đầu 23/10)
```

Mỗi phần một PR vào `main`; body nêu phần nó xếp chồng lên và dòng "NOT released … release needs a separate instruction". Xong và push phần trước rồi mới bắt đầu phần sau — riêng B2: theo F8 bắt đầu ngay từ đầu nhánh B1 và rebase khi B1 làm lại xong.

## 3. Part A — sửa ca 1 sau PR #32

PR: "Shift 1: no Mời về, no lingering table, one Mở ca (founder 2026-10-22)".
**Trạng thái 23/10/2026:** PR #33 mở, mergeable (`feat/shift1-founder-fixes` @ `ef75549`, JSON 2.1.3). A1–A3 xong, có test; `npm test` bằng baseline Windows; tier Playwright local 358/358, a11y 6/6; Linux static xanh; `shift1.plan` 86 %. `npm run sim:balance` còn **hai ô đỏ ở seed 42** ("LP1 và LP2 trước ca 48" = 49; "chuỗi ca dài nhất không mua được gì ≤ 8" = 10; trên 2.1.2 là 45 và 8): theo F7 hai ô này chuyển sang B1, không tune, Part A không phát hành riêng.

| Việc | Đầu vào | Đầu ra | Acceptance |
|---|---|---|---|
| A1 "Mời về" từ ca 2 | 2.1.2 đặt "Mời về" sau cùng cổng với HUD (`show.hud`), nên nó hiện từ ca 1 | Key Tier C `onboarding.featureReveal.kickAfterShifts` = 1, đọc ở `reveal.ts`, AND với cổng HUD. Save ghim không có key đọc seed như các key reveal khác; PR nói save ghim 2.1.1/2.1.2 thấy gì | `kick-table.spec.ts`: không có ở ca 1, có sau 1 ca đã đóng |
| A2 ca 1 không có "Bàn lai rai" | 22/10 khoảng 15:36Z một nhóm "BÀN LAI RAI" ngồi ở ca 1 trên trumbiahoi.com (`v-fb2`, JSON 2.1.1) | `ngoily` không được bốc khi `completedShifts` = 0 (key kiểu `onboarding.firstShift.excludedCustomerTypes: ["ngoily"]`); bốc thăm chuẩn hoá lại trên các loại còn lại; có cổng engine | Replay cũ không đổi. Báo (không đổi) mọi loại khác vào được ca 1 cùng trọng số, và loại nào ngồi lại sau món |
| A3 một "Mở ca" | Màn đầu có hai nút "Mở ca": thanh dưới và thẻ chào ("Quán nhỏ đã sẵn sàng…", vùng "HẺM NHỎ") | Thẻ chào giữ chữ, bỏ nút, thêm một dòng chỉ xuống thanh dưới (vi + en, vd "Bấm **Mở ca** ở thanh dưới để bắt đầu."). Khi thanh dưới ẩn (pin cũ còn giấu HUD) thẻ giữ nút. Save mới được phép có đúng một spotlight trên nút ở thanh dưới | Test về lại locator chặt (bỏ `.first()` của #32); `yard.spec.ts`: đúng một "Mở ca" thấy được, nằm trọn trên màn, trong vùng ngón cái, ở 390×844, 360×740, 1280×720 |
| A-verify | | | Bộ cổng của #32: `check:config` / `check:i18n` / `check:assets`, build, `npm test` + baseline, các sim kể cả `sim:balance` (`shift1.plan`), tier Playwright local đầy đủ (lọc `'\.spec\.ts$'`), smoke guest một lần trên static server local, một lần Linux static; ảnh màn đầu (save mới) 390×844 và 1280×720 |

Câu hỏi còn mở của Part A (PR #33): Chí Phèo ở ca 1 có thể giữ cái bàn duy nhất tới 120 s mà ca 1 không còn cách mời về; "Mời tất cả về" ở Sổ ca cũng ẩn ở ca 1 là cách đọc A1 của người build.

## 4. Part B1 — nhịp đầu game và độ hơi

PR: "Early game: steady shift 1, a real first rush, no flat beer in shift 1 (founder 2026-10-22)".
**Trạng thái 23/10/2026: ĐANG LÀM LẠI theo QĐ-117 (F8), chưa có PR.** Lần build đầu (`feat/early-pacing` @ `5626751`, JSON 2.1.4, xếp chồng trên A) dừng ở cổng kinh tế — kết quả ở cuối mục này; không tune số nào. Founder chọn ngày 23/10: B1.1 chỉ trong 3 ca đầu, giữ B1.2 + B1.3, nới các dòng lệch nhỏ theo dung sai của F8; dòng lệch hơn thì dừng báo.

**Đo TRƯỚC và SAU** bằng engine (sim hoặc replay; thêm một kịch bản nhỏ nếu chưa có) trên save mới, 1 bàn, trời nắng và lạnh, cho ca 1 và ca 2: số nhóm được ngồi, nhóm bị từ chối (`queue_overflow`), trung vị và lớn nhất của khoảng cách giữa hai lượt ngồi, số giây không ai ngồi, lượt bưng bia hết hơi, khách tới trong mỗi Giờ Vàng, phục vụ / mất trong mỗi Giờ Vàng, xu khi đóng ca 1. Bảng nằm trong PR.

| Việc | Đầu vào | Đầu ra | Acceptance |
|---|---|---|---|
| B1.1 chỉ khách lẻ tới khi quán ngồi được cặp (F5) | Ca 1 ngày 22/10: lượt ngồi cách nhau 40–110 s, hơn 5 phút không ai ngồi, 5 cặp bị từ chối ("Hết chỗ"); `capacityDemand` ×4 ở 1 bàn với `pPair` 0,5 giải thích điều đó | Khi chưa bàn nào ngồi được 2, mọi nhóm tới là 1 người (xác suất cặp 0); từ bàn 2 ghế đầu tiên `spawn.pPair` như cấu hình. Không đổi số Tier A nào khác (không `capacityDemand`, giá, phạt). **Sửa theo F8 (23/10): chỉ áp trong 3 ca đầu (`completedShifts` < 3)** | Số SAU còn thời gian chết dài → báo kèm phương án, không tune thêm |
| B1.2 Giờ Vàng đầu tiên có khách | shift-205 (22/10, lạnh, 1 bàn): rush nhẹ 15:38:33Z–15:41:02Z không có `customer_spawned` hay `queue_overflow` nào. Giả thuyết: lượt khách kế tiếp hẹn ngay trước rush (≈ 100 s) không được hẹn lại khi rush bắt đầu | Test đơn vị tái hiện giả thuyết; nếu đúng, hẹn lại lượt đang chờ ở đầu và cuối rush (vd min(thời gian còn lại, khoảng mới)), có cổng engine | Báo khách tới và phục vụ / mất trong rush ở 1 bàn sau khi sửa (rush ở 1 bàn có thể khó: báo, không cân lại) |
| B1.3 ca 1 không có bia hết hơi | Lượt bưng đầu tiên của một save mới bị hết hơi (ngồi 15:08:12, `glass_stale` 15:08:24, bưng 15:08:27: không boa, −1 uy tín); `freshness.baseMs` 12 s ngắn hơn thời gian người mới đọc hướng dẫn | Key kiểu `onboarding.firstShift.staleDisabled: true`: bia đã rót không hết hơi khi `completedShifts` = 0; có cổng engine | |
| B1-verify | | | Như A-verify, cộng bảng TRƯỚC/SAU. `sim:balance` phải xanh (`shift1.plan`, dải k); khách lẻ làm `shift1.plan` hoặc k ra ngoài dải → STOP. Thêm theo F7: A/B trên seed 42 và 99 (B1 với A2 / B1 với `excludedCustomerTypes: []`) và quét 10 seed làm thông tin; hai ô mang từ A vẫn đỏ → STOP, báo số và phương án, không tune. Thêm theo F8: nới dòng "cặp bị từ chối ở ca 1" và các dòng chỉ lệch ≤ 2 % hoặc ≤ 2 ca tới số đo được; lệch hơn → STOP |

**Kết quả đo của lần build đầu (23/10/2026, trước F8; chi tiết trong body PR của B1):**
- Hai ô seed 42 mang từ Part A nay **xanh** (LP2 ở ca 27 / 28, chuỗi không mua dài nhất 6 / 6, seed 42 / 99); `shift1.plan` 100 %; k chuẩn và k career trong dải.
- **Bốn hàng mới đỏ ở cả seed 42 và 99:** tổng giá trị 30 ngày 10,057 / 9,945 tr (≤ 9,185 tr); ghế 2 đầu tiên ở ca 21 / 22 (cửa sổ 40–56); khách bỏ đi có phạt ca 1–24 15,7 % / 13,0 % (≤ 10 %); cặp bị từ chối ở ca 1 0 / 0 (≥ 5 — hàng này không thể xanh khi B1.1 bật, đúng thiết kế). `sim:career:gate` đỏ ở tổng giá trị 30 ngày. Tắt A2 vẫn đỏ đúng bốn hàng đó.
- Nhịp ca 1 (1 bàn, nắng, người mới, 200 seed, trung vị): nhóm được ngồi 6 → 17, khoảng cách giữa hai lượt ngồi 63 → 42 s, xu khi đóng ca 1 1 299 → 2 433; rush đầu của ca 2: khách tới 5 → 6, phục vụ 1 → 5,5. Ca 1 vẫn có 68–72 % thời gian không ai ngồi.
- Phương án đã đưa founder: (a)–(e) ở §2.6 body PR của B1 (giữ B1, niêm phong lại các mục tiêu đang mang nhịp đầu game cũ · giữ B1 và làm một lượt cân Tier A với số founder duyệt · thu B1.1 về chỉ ca 1 · tắt B1.1, giữ B1.2 + B1.3 · chỉ giữ B1.3) và phiếu QĐ-117 (A nới chỉ tiêu · B khách lẻ chỉ ở đầu game · C cân Tier A có giám sát). **Founder chọn QĐ-117 = B có sửa (F8), 23/10.**

## 5. Part B2 — UI rõ ràng

PR: "Early game UI: clear serve feedback, just-in-time hints, shorter ledger, one-screen yard (founder 2026-10-22)".
**Trạng thái 23/10/2026: đang làm** — bắt đầu 23/10 trong worktree riêng, xếp chồng trên B1 (F8: từ đầu nhánh B1, rebase khi B1 làm lại xong); chưa có PR.

Chung: mọi chữ vi + en qua key i18n (dùng lại key có sẵn khi hợp); tôn trọng reduced motion; mỗi lúc một gợi ý hoặc spotlight, không đè lên sheet, không lặp lại khi đã xong (luật `onboarding.hints`).

| Việc | Đầu vào | Đầu ra | Acceptance |
|---|---|---|---|
| B2.1 phản hồi khi bưng | 22/10: popup của lượt bia hết hơi chỉ có mặt nhăn và "+50" trên nền hồng; thẻ món ghi "Còn 18s" màu vàng khi lượt bưng đã tính là trễ từ giây 13 sau khi ngồi | (a) Popup xu có một dòng lý do khi kết quả không phải tốt nhất: hết hơi → `outcome.stale` có sẵn; trễ → một dòng ngắn "Chậm · không có boa"; tìm vì sao chữ có sẵn không hiện. (b) Mặt: có boa = rất vui, đúng giờ không boa = vui, trễ = bình thường, hết hơi = buồn. (c) Thẻ món và thanh kiên nhẫn của bong bóng cùng hiện một trạng thái "còn boa" (xanh) khi kiên nhẫn ≥ `tip.patienceThreshold`, rồi cùng đổi màu. (d) Một gợi ý một lần sau lượt trễ đầu tiên: "Bưng khi đồng hồ còn xanh để có boa." | |
| B2.2 gợi ý đúng lúc cho HUD hiện từ ca 1 | HUD và thanh dưới hiện từ ca 1 (2.1.2) | Mỗi gợi ý chạy một lần, đúng lần đầu nó có ích: kho sắp hết → dải kho và Nhập hàng (giữ prompt một chạm "Kho bia còn ít → Nhập đầy kho bia"); cốc sạch sắp hết → máy rửa; bia rót sẵn đang chờ → độ hơi ("Bia giữ tươi {s} s, bưng trước khi hết hơi"); cảnh báo rush đầu tiên → nút rush; lần đầu đủ tiền cho mục tiêu kế → spotlight ô bàn trống. Khớp với step guide có sẵn để không trùng | |
| B2.3 nhãn và chỗ trùng | "12 s / 14.4 s" trơn dưới tủ lạnh; "0/1" trơn ở máy rửa; dòng "Bia: 4 cốc sẵn · bom 13/15 · cốc sạch 10/10" lặp số đã có trên sân | "Giữ tươi {n} s" (`production.freshness`); bộ đếm có nhãn ("Rửa 0/1" hoặc icon + aria); dòng lặp bỏ khỏi mắt, giữ cho trình đọc màn hình; thẻ món thêm một dòng tính cách dưới loại khách (vd "Khách vội · ít kiên nhẫn") | |
| B2.4 chạm ô bàn trống để mua | Chạm ô gạch đứt không làm gì | Mở đúng thẻ mua của mục Nâng cấp cho bàn kế (giá, được gì, vì sao mờ), pause như các sheet quản lý khác | |
| B2.5 Sổ ca ngắn hơn | "Khách bỏ đi 5" đứng cạnh các lý do cộng lại 15 | Trên cùng: Thu ròng (chữ lớn) + một gợi ý có nút ("Xem Bàn & ghế"); rồi đã phục vụ / bỏ đi sau khi ngồi / không vào được ("Không vào được · hết chỗ") với số khớp nhau; phần còn lại (bảng món, đoạn giải thích) dưới "Chi tiết", gập sẵn; ẩn dòng món còn khoá | |
| B2.6 tóm tắt Giờ Vàng | | Hết rush: một thẻ một chạm (pause như sheet): tới, phục vụ, bỏ đi, boa, ròng, và so với rush trước (↑/↓). Dựng từ event của rush; không lưu thêm gì nếu không cần | |
| B2.7 Nhập hàng hai nút mỗi dòng | Tên nguyên liệu ("Đậu phụ / Tóp mỡ sống / Lòng + dưa") khác tên món ở Sổ ca ("Đậu tẩm hành / Tóp mỡ Triều Khúc / Lòng xào dưa") | "+10 · {giá}" và "Đầy kho · {giá}", giá là chip, kiểu nút phụ (không phải toàn nút đỏ chính); "+10" mờ kèm lý do khi tràn kho; tên nguyên liệu khớp tên món, hoặc hiện cả hai nếu cố ý khác | |
| B2.8 sân vừa một màn hình điện thoại | `document.documentElement.scrollHeight` 1 080 px ở 390×664 và 420×680 (hàng bàn 3–5 ở hoặc dưới mép màn); trumviahe vừa đúng màn hình | Không cuộn dọc ở 390×844, 360×740, 1280×720 khi có HUD, đủ 8 chỗ bàn, tap ≥ 44 px; báo số ở 390×664 (Safari có thanh công cụ). Chốt 09-SPEC §3.1 ("playtest quyết") theo hướng một màn hình, ghi "founder 2026-10-22". Thêm ca 844×390: ở chiều cao ≤ 500 px thanh dưới không cố định nên nút "Mở ca" duy nhất nằm dưới màn (review của Part A) | Không làm được trong luật trên → STOP kèm ảnh và phương án tốt nhất |
| B2-verify | | | Như A-verify, cộng tier a11y và playable (thay đổi khắp UI), axe 0; ảnh ở 390×844 / 360×740 / 1280×720: màn đầu, một ca đang chạy có thẻ món, popup hết hơi và popup trễ, tóm tắt rush, đầu Sổ ca mới, Nhập hàng |

## 6. Sau plan

1. Founder review theo thứ tự A → B1 → B2 và merge.
2. Phát hành là một lệnh riêng của founder. Theo quyết định founder 23/10/2026 (mặc định do docs sync suy ra): bản phát hành lên `https://trumbiahoi.com`; Netlify giữ v6 cho tới khi founder nói khác (`docs/cloudflare-guest.md` "Phát hành lên hai host", `docs/deploy-log.md` "Host check — 2026-10-23").
3. Rồi phiếu 3 ca của owner (`docs/phase0-alpha-playtest.md` §7, chơi trên `https://trumbiahoi.com`) và Đợt 5 (story + mùa) của `docs/PLAN-vui-3-ca-2026-09-18.md` §7b, bắt đầu sau phiếu như plan đó ghi.

## 7. Đang chờ founder (23/10/2026)

| Việc | Mặc định đang dùng |
|---|---|
| ~~Cách ra khỏi STOP của B1~~ — **đã chốt 23/10: QĐ-117 (F8)** | B1 làm lại; dòng nào lệch quá dung sai của F8 thì dừng báo, không tune; không phát hành gì |
| Part A: Chí Phèo ở ca 1 giữ cái bàn duy nhất tới 120 s (chấp nhận · thêm `chipheo` vào `excludedCustomerTypes` · cho "Mời về" bàn ngồi lại ở ca 1) | Như đang build: anh ta tự về trong 120 s |
| Part A: "Mời tất cả về" ở Sổ ca cũng ẩn ở ca 1 (cách đọc A1 của người build) | Giữ như đang build |

## Changelog

| Ngày | Thay đổi |
|---|---|
| 2026-10-23 | v1.0 — đưa plan của founder vào `main` (docs sync sau PR #32): quyết định founder 22/10/2026 (Part A, B1, B2 xếp chồng; bốn nhóm cải thiện; khách lẻ tới khi có bàn 2 ghế là Tier A đã duyệt) và 23/10/2026 (STOP của Part A: phương án (c)), viết lại theo cách viết của `PLAN-vui-3-ca` (đầu vào · đầu ra · acceptance); trạng thái từng phần ngày 23/10: A = PR #33 mở, B1 = STOP chờ founder, B2 chưa bắt đầu. Không phần nào trên `main`, nên không sửa luật ở GDD hay 03-SPEC. |
| 2026-10-23 | v1.1 — câu trả lời của founder cùng ngày: thêm F8 = QĐ-117 (STOP của Part B1, phương án B có sửa: khách lẻ chỉ trong 3 ca đầu, giữ B1.2 + B1.3, nới các dòng lệch nhỏ theo dung sai, B2 bắt đầu ngay) như quyết định đang hiệu lực, nơi build "chờ (B1 làm lại)"; trạng thái: A = PR #33 mở, mergeable; B1 đang làm lại, chưa có PR; B2 bắt đầu 23/10 trong worktree riêng, xếp chồng trên B1, đang làm; kết quả của lần build đầu giữ nguyên, ghi "trước F8"; mục 7 đóng dòng STOP của B1. Vẫn chưa phần nào trên `main`, chưa phát hành. |
