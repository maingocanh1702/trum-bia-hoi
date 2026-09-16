# PLAN cải tiến để đạt yêu cầu dự án — Trùm Bia Hơi (v1, 16/09/2026)

> Bản mới nhất, thay mọi bản trước. Căn cứ: chơi trọn 1 ca trên `trumbiahoi.netlify.app` (16/09) + đối chiếu `06-ROADMAP` v3.3 (M0–M9), `docs/milestone-closure-m0-m5.md`, `docs/build-progress.md` (Steer18, local v0.3), GDD §4–§10, 03-SPEC §9, JSON 2.0.3.
> Cách viết: brief giao việc = đầu vào · đầu ra · acceptance. Không hướng dẫn từng bước — dev tự quyết.

## 0. "Đạt yêu cầu" nghĩa là gì

Theo ROADMAP v3.3 + quyết định owner 11/09 (M6/M7/M8 hoãn sau release):

| Điều kiện phát hành | Hiện tại | Khoảng cách |
|---|---|---|
| M1–M3 đóng (trừ hàng owner WAIVED) | M1 11 PASS/1 W · M3 6 PASS/5 W/**1 FAIL** (asset) | FAIL asset dời M9 → coi như xong |
| M4 server + tài khoản + admin | 15/18 PASS **trên local** | 3 hàng mở (Google consent thật, emergency admin, account acceptance) · **bản public chưa có server** |
| M5 meta | 12/25 PASS | F16 referral/huy hiệu (4 FAIL), snapshot/thưởng mùa, cosmetic, Két Bia |
| Gameplay chơi được đúng GDD | Lõi ✅ | **LP1 kẹt (chó)** · kho bia nghẽn sai lớp · VIP chưa thấy · rush chưa kiểm |
| M9 release | ⚪ | perf/PWA/replay/console/asset manifest · playtest 10–15 người (closed) |
| KPI đo được trên bản thật | k, % mất hơi, % bỏ đi chỉ có ở sim | Sổ ca chưa in số 04-SPEC §5 |

→ Đích: **v1.0 public = M1–M5 (không WAIVED) + M9, deploy có server, M6–M8 tắt bằng flag.**

## 1. Thứ tự làm (5 đợt, phụ thuộc cứng theo mũi tên)

```
Đợt A hotfix gameplay ──► Đợt B đo được KPI ──► Đợt C chơi thử 3 ca + cân số
                                                   │
Đợt D đóng M4/M5 + deploy có server ◄──────────────┘ (song song với C)
                                                   │
Đợt E M9 release ◄─────────────────────────────────┘
```

## 2. Đợt A — Hotfix gameplay (chặn phát hành, ~1 slice/mục)

| # | Vấn đề đã thấy | Đầu ra | Acceptance |
|---|---|---|---|
| A1 | **LP1 kẹt**: `lifePath[1].requires` có `dog`, nhưng UI chó ẩn khi `showDeferredRisk=false` (`App.tsx:21`) còn `progression.ts:8` vẫn đòi `dogLevel>0` → không lên Phụ Quán, kéo theo mặt bằng/điện thoại/QR/LP2+ | Chọn 1: (a) JSON 2.0.4 bỏ `dog` khỏi LP1 khi `risk.enabled=false`, hoặc (b) tách "mua chó" khỏi lớp risk, hiện trong Nâng cấp. Ghi changelog 08-SPEC + GDD §11 | Browser test: guest chơi tới 50.000 xu trọn đời + 4 ghế → LP1 đạt trên bản prod build. `npm run verify` xanh, k trong band |
| A2 | **Kho bia 15 cốc là nghẽn thật** (68 cốc gọi/ca, hết sau ~2–3′, 46% khách bỏ đi vì hết hàng, phải mở menu 4–5 lần/ca) — sai lớp so với GDD §4 (nghẽn phải là cốc/rửa) | Đề xuất theo thứ tự ưu tiên, dev chọn sau khi sim: (1) `stall.stockCap[0]` 15→45 hoặc mua bom theo mẻ lớn hơn; (2) cảnh báo hết bia trên HUD + nút "Nhập nhanh" không pause; (3) `emergencyPack` (đã có config, trigger "hết sạch nguyên liệu") kích thật | Sim 5 seed: % bỏ đi (không rush) **<10%** với bot; hand-play ca 1–3: **<20%**; cốc sạch chạm 0 ít nhất 1 lần/ca (nghẽn đúng lớp). k giữ 2.0–3.0 |
| A3 | **Không thấy VIP** trong ~68 khách (weight 0.1 → kỳ vọng ~4) | Xác nhận spawn VIP bằng sim đếm theo loại; nếu gate phase/LP thì ghi rõ vào GDD §7 + hiện hint "Khách sộp mở ở …" | Sim 5 seed: tỉ lệ VIP ≈ 0.1/Σweight ±30%; hand-play ca 2 thấy ≥1 VIP |
| A4 | Thông báo sai ngữ cảnh: bom 0/15 vẫn báo "Vòi rót đang chuẩn bị bia"; gợi ý cuối ca nói 3 mất hơi, bỏ qua 31 bỏ đi | Toast theo nguyên nhân thật (hết bom / hết mồi / đang rót); gợi ý cuối ca ưu tiên nguyên nhân mất khách lớn nhất | Test UI: kho = 0 → toast "Hết bom bia — Nhập hàng"; khách bỏ đi > mất hơi → gợi ý về kho/nhập hàng |
| A5 | UI nhỏ: Vòi rót Lv1 hiện 2 bộ số ("2 s/cốc · rót sẵn 4" và "2 ly/mẻ · 12s"); Sổ ca "Đã phục vụ 37" vs "Mâm 28" không chú thích; 0% thể lực không có ETA; icon Đậu phụ/Biển hiệu/Điện thoại trống lần mở đầu | Sửa copy + preload sprite | Axe + 3 viewport smoke; không icon trống ở lần mở đầu |
| A6 | Không truy được bản Netlify ứng với commit nào (repo không ghi) | `docs/deploy-log.md` + hiện `build sha` trong Cài đặt | Mở Cài đặt thấy sha; deploy-log có dòng cho bản đang chạy |

## 3. Đợt B — Đo được KPI trên bản thật (mở khoá playtest)

04-SPEC §5 (ràng buộc) yêu cầu in cuối ca: số lượt, DT bia/lượt, **k suy ra**, % lượt có mồi, **% cốc hết hơi**, **số khách bỏ đi**. Sổ ca hiện chỉ có 2/6.

| Đầu ra | Acceptance |
|---|---|
| Sổ ca thêm block "Số đo ca" (ẩn sau toggle "Chi tiết") với 6 số trên; ghi vào `eventLog`/`shift_closed` để export | 6 số khớp sim replay cùng seed ±0; Xuất bản lưu dự phòng chứa 6 số/ca |
| `docs/phase0-alpha-playtest.md` → đổi thành phiếu **closed playtest** (10–15 người, theo ROADMAP §Playtest): link, 3 ca, survey fun 1–10 | Phiếu có cột cho 6 số + survey; 0 mục trống về cách thu số |

## 4. Đợt C — Chơi thử 3 ca + cân số (cần A + B)

| Việc | Acceptance |
|---|---|
| Owner + 2–4 người chơi ≥3 ca liên tiếp trên bản có A/B (ca 2+ mới có Giờ Vàng: 2 đợt/ca, chỉ "nhẹ" tới LP1, cảnh báo 20s) | Ghi 6 số/ca vào phiếu; k hand-play 2.0–3.0; % bỏ đi <20%; % mất hơi 5–15%; ≥4/5 phục vụ khách đầu ≤30s; "nhịp 2 rush xử được" (exit gate P0) |
| Cân số qua sim (quy ước 09/09: đổi số phải qua sim tiến trình) — chỉ đổi JSON + changelog 08-SPEC | `npm run verify` xanh, k band, career ≤3.5 |

## 5. Đợt D — Đóng M4/M5 + deploy có server (song song C)

| # | Việc | Acceptance (từ closure report) |
|---|---|---|
| D1 | Deploy `apps/server` (event store SQLite→Postgres hoặc giữ SQLite trên 1 host) + `TBH_GOOGLE_CLIENT_ID` thật + `TBH_ADMIN_ACCOUNT`; bản web public đổi từ "Browser edition" sang remote mode | Đăng nhập Google phút 5 giữ ca, credit 1 lần (hàng FAIL M2); reconnect F23 §8; replay event log = state |
| D2 | M4 còn 3: emergency admin config, account acceptance, live consent | Criterion rows → PASS với bằng chứng thật, không stub |
| D3 | M5 F16 referral + huy hiệu Kết Nối (4 FAIL) — gate bàn VIP free-only | Server test: self-referral không tính, claim idempotent, donate không cấp ket_noi, VIP gate server-side |
| D4 | M5 snapshot kết Vụ + thưởng mùa + Két Bia + cosmetic | F12/F13/F28 acceptance; snapshot bất biến |
| D5 | Flag M6/M7/M8 = OFF, không dấu vết UI (đã có `showDeferredRisk`; kiểm inspection/lottery/donate) | grep UI prod build: 0 chuỗi thuộc F15/F18/F19/F20/F26 hiện ra |

## 6. Đợt E — M9 release

| Việc | Acceptance (ROADMAP M9) |
|---|---|
| Perf + PWA | First playable <5s mobile 4G, ≥30fps ca đầy khách, PWA install |
| Chất lượng | 0 console error 3 viewport; 0 missing asset (`check:assets`, draft được owner chấp nhận 11/09) |
| Replay/security | Replay test seed → state khớp; anti-cheat cơ bản (server từ chối command lệch) |
| Playtest closed 10–15 người (Đợt C mở rộng) | Fun ≥7/10 trung vị; "muốn chơi tiếp" ≥60%; k band trên bản release |
| Release checklist + tag `v1.0` + deploy-log | Tất cả hàng trên ✅ trong `docs/build-progress.md` (chỉ giữ bản mới nhất) |

## 7. Việc owner cần chốt (có default, không chặn)

1. **A1**: bỏ `dog` khỏi LP1 (default) hay tách chó khỏi lớp risk?
2. **A2**: chấp nhận đổi số kho khởi đầu (ảnh hưởng k, phải qua sim) hay chỉ sửa UX nhập hàng?
3. **D1**: host server ở đâu (default: 1 VPS/Fly.io + SQLite volume, domain phụ `api.trumbiahoi…`); Google Client ID.
4. **Đợt C/E**: giữ WAIVED test người thật tới sau release, hay chạy closed playtest 10–15 người trước v1.0 (default: chạy, vì KPI feel chỉ đo được bằng người).

## 8. Kickoff prompt (paste vào Claude Code tại repo, sau khi owner chốt mục 7)

```
Read 00-HANDOFF-trum-bia-hoi.md, docs/PLAN-improve-2026-09-16.md and docs/milestone-closure-m0-m5.md.
Execute Wave A (A1–A6) as separate slices, then Wave B. Binding: rules from 02-GDD + 03-SPEC, numbers
only from docs/config/economy.tbh.json (append 08-SPEC changelog on every number change), engine purity,
no hardcode, k in 2.0–3.0 via headless sim, free-to-play. Owner decisions for A1/A2: <fill from §7>.
For each slice: npm run verify green; follow .claude/skills/verify-trum-bia-hoi 9-step sequence for
anything touching gameplay/save/UI; codex review CLEAN; update docs/implementation-tracker.md +
rebuild dashboard; report per 11-PROMPT-PACK §0.3 with a VERIFICATION block. Do not touch prototype/.
Do not re-enable M6/M7/M8 features. Stop after Wave B and report which Wave C measurements are now
readable from the shift book.
```

## Changelog
| Ngày | Thay đổi |
|---|---|
| 2026-09-16 | v1 — lập từ ca chơi thử Netlify + closure report 10–11/09 |
