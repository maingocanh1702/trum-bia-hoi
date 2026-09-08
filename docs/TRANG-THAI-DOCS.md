# 📌 TRẠNG THÁI BỘ DOCS — Trùm Bia Hơi (cập nhật 08/09/2026)

> Bản **mới nhất**, thay cho mọi bản trước (không giữ lịch sử). Cập nhật lần cuối: 08/09/2026, sau khi áp nốt các việc còn lại. Trả lời: bộ docs đã đủ để giao dev/designer build game chưa, còn gì chờ chủ dự án.
> Kiểm bằng cách mở từng file HANDOFF trỏ tới và đối chiếu với `docs/config/economy.tbh.json` (nguồn số).

## 1. Kết luận

**Đủ để bắt đầu M0** theo brief B trong `11-PROMPT-PACK` v1.10. Ràng buộc rõ, số tập trung ở JSON, layout có ảnh tham khảo, onboarding đã thành luật, gate `npm run check:config` chạy được ở gốc repo và đang xanh (37/37 + coverage). Không còn mục 🔴.

Còn lại chỉ là **3 việc bạn đã chủ động để "chốt sau"** (mục 4) — không mục nào chặn M0–M6.

## 2. Độ phủ theo lĩnh vực

| Lĩnh vực | Trạng thái | Nguồn ràng buộc |
|---|---|---|
| Gameplay lõi (ca, hệ bàn, Order, freshness, rót/rửa tự động) | ✅ | GDD §1–§10, 03-SPEC §1–§9 |
| Gameplay lớp 3–5 (khách, thời tiết, rush, meta, risk) | ✅ | GDD §7–§16, F07–F22 |
| Economy | ✅ | 08-SPEC v1.2.7 + `economy.tbh.json` 1.6.0 (`_meta.governance` tier A/B/C) |
| Asset | ✅ | 11-PROMPT-PACK Phần A v1.11, checklist v1.4 (**~550** = ~475 sprite/icon + 75 audio id; 8 đã có), naming §11, design-tokens |
| Âm thanh | ✅ | Checklist §B7: **75 id** (mỗi id `.ogg` + `.m4a`), thư mục theo nhóm, phát theo event id → manifest |
| UI / component / motion | ✅ | UI invariants HANDOFF §6 + brief B binding 10; 09-SPEC/05-SPEC/F24 = tham khảo |
| Layout | ✅ | `docs/reference/` 8 ảnh + README (HUD sân quán, sheet, popover nâng cấp, Bàn Thờ…) |
| Onboarding | ✅ | **F27 v1.1 🟢** + JSON `onboarding` (tier C) |
| Tech (engine, config, lưu trữ, server) | ✅ | 10-SPEC v1.7 §1/§5/§7/§9/§10/§13, F23 §8 — **localStorage trước, server ở M4** |
| Admin / Config Registry | ✅ | BRD §5.2 + §11; 08-SPEC §22 |
| Bảng xếp hạng | ✅ | **F28 v1.0** + JSON `leaderboard` (tier A) |
| Lộ trình & tracker | ✅ | 06-ROADMAP **v3.1** — 1 phase, mốc M0–M9 (M7 = Donate + pháp lý); `implementation-tracker` **v0.7.1** 0 % (28 feature, F26 ⏸ bỏ), `dashboard.*` rebuild 0/28 |
| Hướng dẫn agent (đọc trước HANDOFF) | ✅ | `CLAUDE.md`/`AGENTS.md` dòng verify → `check:config` ở root + build/test/sim của game mới (prototype chỉ khi đụng `prototype/`); `SESSION-TRACK-LOG` snapshot + "Việc tiếp theo = bắt đầu M0"; 11-PROMPT-PACK §0.2 thứ tự = config → engine + local save → server M4 |
| Content bank | ⏸ pending | `docs/content/` mới là đề xuất schema + 5 ví dụ |
| Tính năng kiểm tra (policy check) | ⏸ pending | F15 §4; ship `risk.inspection.enabled=false` |
| Monetization | ✅ | **Chơi FREE hoàn toàn; nguồn thu duy nhất = donate cho admin** (F20 Mời Bia Hơi, cosmetic thank-you, không P2W, không paywall). F26 ⛔ bỏ. JSON 1.6.0 `entitlements.mode=free` + `donation` (tier A); BRD v0.5 §7 Donation |

## 3. Quyết định chủ dự án đang có hiệu lực (08/09)

1. **Onboarding (F27 🟢):** guest chơi không cần đăng ký; khuyến khích đăng nhập Google (lưu tiến độ · thành tích · đua top); **đăng nhập giữa ca lưu realtime, không ngắt ca**; ca 1 = **1 khách gọi 1 cốc bia**; không phục vụ kịp → khách rời đi + thông báo; **3 lần liên tiếp → hướng dẫn step-by-step**; lần đầu chơi cũng có step guide (bỏ qua được).
2. **Lưu trữ: localStorage trước, server sau (M4)** — thiết kế server-ready qua `eventLog` append-only; đổi adapter `SaveStore` khi lên server.
3. **`npm run check:config` chạy từ gốc repo** (`package.json` gốc).
4. **Layout tham khảo = `docs/reference/`** (ảnh game gốc, kiểu sân quán không gian) — không phải card-list ở 09-SPEC §3.1.
5. **Content bank + tính năng kiểm tra: pending**, chưa dùng làm ràng buộc, không tính vào acceptance M6.
6. **Mặt bằng: 9** (theo `locations.list` / F14 / 08 §16).
7. **Chơi FREE hoàn toàn — monetization duy nhất = donate cho admin.** Không Vé Mở Ca, không bán quyền chơi/xu/sức mạnh, không paywall; donate tự nguyện (F20), quà cảm ơn cosmetic-only; cổng nhận tiền = adapter, mặc định QR chuyển khoản + admin xác nhận tay.
8. Việc còn lại: làm theo đề xuất, không hỏi lại.

**Cách viết doc giao việc (áp cho mọi bổ sung sau này):** chỉ định nghĩa đầu vào, đầu ra mong muốn, plugin/công cụ (Blender MCP cho asset…), acceptance/QA. Không viết quy trình từng bước — cách build do dev/agent tự quyết.

## 4. Còn chờ chủ dự án (đều đã có default, không chặn dev)

| # | Việc | Default đang dùng | Cần khi |
|---|---|---|---|
| 1 | **Content bank** (câu hỏi kiểm tra · quest pool · lời thoại khách) + **tính năng kiểm tra** | ⏸ pending theo bạn; `docs/content/` là đề xuất; `risk.inspection.enabled=false` | M5–M6 |
| 2 | **Cổng nhận donate tự động (nếu muốn) · mức age gate** | QR chuyển khoản + admin xác nhận tay; age gate là config | M7 |
| 3 | **Nguồn lịch/tỉ số Cúp Bóng Đá** | Admin nhập tay (tier C); API thật = adapter + flag | M8 |

Ba mục item-list (hành phi, đá lạnh, giá cosmetic) đã **chốt theo đề xuất 08/09**: bỏ hành phi + đá lạnh khỏi nguyên liệu (6 món ↔ 6 nguyên liệu, `mat-onion`/`mat-ice` không vẽ, B1 còn 12 icon); giá cosmetic là giá cuối, không ×k (JSON 1.5.1 có `_rule`).

## 5. Việc nội bộ còn nợ

- Bộ docs **chưa commit git** (chủ dự án tự commit). Backup từng file trước sửa ở `$HOME/*.bak`.
- `tools/dashboard-engine/build_dashboard.py`: `PHASE_DATES` vẫn là mốc ngày cũ (chỉ ảnh hưởng biểu đồ timeline; ROADMAP v3.0 chưa gán ngày). Sửa khi team chốt ước lượng.
- `scripts/apply_pending_0809.py` là script vá một lần, đã chạy — xoá được.

## 6. Bản đồ nhanh — đọc gì trước

`00-HANDOFF` v1.12 (điểm vào, §4 scope + §6 quy ước) → `11-PROMPT-PACK` v1.12 Phần A (designer) / Phần B (dev) → `02-GDD` v1.12 + `03-SPEC` (luật chơi) → `08-SPEC` v1.2.7 + `economy.tbh.json` 1.6.0 (số) → `06-ROADMAP` v3.1 (mốc M0–M9) + `implementation-tracker` v0.7.1 (0/28) → `docs/features/F07–F28` → `docs/reference/` (layout) → `trum-bia-hoi-brd-admin.md` §5.2 (config admin).
