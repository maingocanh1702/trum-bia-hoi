# 🍺 HANDOFF — Trùm Bia Hơi — điểm vào cho Designer & Dev (v1.31)

> **Tương ứng với `00-TONG-HOP-trumviahe.md`** (bản nghiên cứu game gốc) — nhưng đây là bản **của Trùm Bia Hơi**: đọc file này trước mọi file khác. Mục tiêu: một designer (có Blender MCP) và một dev cầm bộ docs này là **tạo asset và code được game**, không cần hỏi lại lịch sử.
> Ngày: 2026-09-10 (v1.31). **Cách đọc bộ docs (chốt founder 09/09):** ràng buộc là **luật chơi** (`02-GDD` + `03-SPEC`), **số** (`08-SPEC` + `docs/config/economy.tbh.json`), **không-hardcode/config admin** (`trum-bia-hoi-brd-admin.md` §5.2), **bất biến đo k** (`04-SPEC` §5), **server-authoritative + engine thuần** (`10-SPEC` §7/§1; thứ tự code: lưu localStorage trước, server sau — §4.2). Mọi thứ còn lại — kiến trúc, module, thư viện, **layout, màn hình, design** — do dev/designer **tự quyết**. `prototype/` là bản thử nghiệm lưu trữ, KHÔNG phải điểm xuất phát.
>
> Trạng thái dự án: prototype Phase 0 đã hoàn thành nhiệm vụ của nó — chứng minh "feel" và **đo được k = 2.24–2.34** (trong band 2.0–3.0), bản Alpha đã host và chủ dự án đã chơi, phản hồi đã đưa vào GDD/03-SPEC (rót & rửa tự động, phục vụ theo Order). Từ 09/09 `prototype/` chuyển sang **lưu trữ**; game viết mới từ đầu. Slice `feat/p0-ui-serve-popover--r2` và gate "Alpha playtest 3–5 người" chỉ còn liên quan tới prototype — merge hay bỏ tuỳ chủ dự án, **không chặn** việc bắt đầu game (xem `SESSION-TRACK-LOG.md`).

**Update owner 09/09 mới nhất:** đã đối chiếu snapshot gốc đang sửa (JSON 2.0.0, 08-SPEC v1.5.0, 03-SPEC v1.3); xem [latest-handoff-adoption](docs/latest-handoff-adoption.md). Game mới dùng config2.0.1/rules23: trạm theo mẻ/vòi/chảo, mua cốc, gọi mồi theo kho, gate LP, thuê/cọc và mùa7/14ngày. Harness `b01f4b1` chạy hai seed30ngày tớiLP4;250test engine/server, config/build, k nền/rush và review qua. Phát lại save tháng khớp hoàn toàn. Adapter IndexedDB đã thay lưu career vào localStorage tại `c9db016`, giữ lịch sử/backup và được review không còn lỗi mã cụ thể. **Verify cuối đã qua91/91browser và archive80MB** tại917f862: ghi/đọc/lưu tiếp/Appboot khớp, khởi động khoảng20,5giây. Google server account/session tại `ebe820c` đã qua review,264engine/server tests/config/build và CLI smoke; nonce/cookie/audit nguyên tử, giữ lịch sử server guest. Chưa có Client ID thật, chưa nối web/nhập save local/duyệt lịch sử. Owner10/09 chốt: giữ tiến độ local, duyệt lịch sử trước khi tính BXH, không cộng trùng. Tiếp tục tài khoản/claim/BXH. Xem [career report](docs/career-simulation.md). k nâng cao vẫn ngoài band và chờ owner chốt phạm vi; không tự sửa số. Full game, toànLP0–LP7 và thưởng mùa chưa hoàn tất. Giữ menu pause, nâng cấp trong ca, mất khách chỉ hiện số theo chỉ đạo trực tiếp.

---

## 1. Game là gì (1 phút)

Idle/tycoon **phục vụ khách theo ca 12 phút** ở **quán bia hơi vỉa hè Hà Nội 2000s**, mobile-first web (Pixi.js + React là gợi ý, dev tự quyết), **lưu localStorage trước → server-authoritative ở M4** (thiết kế server-ready từ đầu, không viết lại). Re-skin từ trumviahe.com (trà đá) — **giữ 5 lớp economy** đã được chứng minh (unit · throughput · demand-mix · risk · meta), thêm **2 cơ chế đặc thù**: **hệ bàn** (khách ngồi theo nhóm, gọi nhiều đợt, phục vụ cả mâm một chạm) và **bia mất hơi** (bia lên mâm12s là hết hơi; bom giữ dự trữ theo mẻ, cần bưng mâm đúng nhịp).

```
Mở ca (thể lực 100%) → khách vào theo bàn → rót bia kịp "độ hơi" + làm mồi → chạm ✅ PHỤC VỤ cả mâm
→ tiền + boa + uy tín · dọn bàn, rửa cốc (nghẽn) → sống qua Giờ Vàng / thời tiết / rủi ro
→ hết thể lực → sổ ca → nâng cấp (bom/rửa/hầm/bàn/bếp) → Giải Nhậu theo Vụ Bia · Đường Lên Trùm · đổi mặt bằng
```

Kinh tế một câu: **bia = workhorse quay vòng cốc (rẻ, volume); mồi cao cấp = lợi nhuận; burn = nâng cấp/rent/phạt, không phải giá vốn; mọi số xu = base × k (k=2.5) để "cảm giác ca" y hệt game gốc.**

---

## 2. Đọc theo thứ tự — theo vai

### 2.1 Designer (asset, Blender MCP)
1. **`11-PROMPT-PACK-designer-blender-dev.md` Phần A** — **bản giao việc**: công cụ (Blender MCP, đã cài trên Codex + Claude Code), đầu vào, **danh sách ~478 asset theo 13 nhóm**, đầu ra mong muốn, 5 bất biến, QA. *Cách làm do bạn tự quyết.*
2. `docs/asset-production-checklist.md` — danh sách chi tiết từng asset (id, mô tả, kích thước, ✓) · `docs/asset-blender-pipeline.md` — **gợi ý** studio/hậu kỳ đã kiểm nghiệm (không bắt buộc theo từng bước).
3. `docs/design-tokens.md` — palette/typo/spacing (nguồn sự thật màu).
4. `docs/asset-list-designer.md` (danh mục + **naming §11**) · `docs/asset-generation-prompts.md` (mô tả từng vật, locks) · `docs/item-list-upgrade-levels.md` (visual progression theo cấp).
5. `09-SPEC-uiux-screens.md` (spec màn hình/component/motion — biết asset dùng ở đâu) · `05-SPEC-design-uiux.md` + F24.
6. Tham khảo game gốc khi cần "cảm giác": `uiux-analysis-trumviahe.md` §37–§48, `design-component-catalog-trumviahe.md`.
- **Anchor style đã có:** `assets/glass-*.png` (7) + `assets/menu-beer.png` — mọi asset mới phải đứng cạnh chúng mà không lệch.
- **Pipeline:** gợi ý là 3D low-poly trong Blender → render ortho → hậu kỳ pixelate/quantize/outline (`scripts/asset_postprocess.py`). **Ràng buộc là output, không phải cách làm:** output cuối phải là pixel-art đúng contract `asset-list-designer.md` §0.1 và đứng cạnh anchor không lệch.

### 2.2 Dev

**Bắt buộc theo (ràng buộc):**

1. **`12-PROMPT-claude-build.md` Phần 1** — **prompt kickoff dán vào Claude Code** (Level 3 bỏ, dev tự quyết; sau mỗi slice tự gọi `codex exec review` với `docs/prompts/codex-review.md`). Nó gói lại `11-PROMPT-PACK` Phần B (ràng buộc/đầu vào/đầu ra/DoD) — đọc Phần B khi cần chi tiết.
2. `02-GDD-trum-bia-hoi.md` — quyết định gameplay (🟢/🟡/🔵) · `03-SPEC-he-ban.md` — state machine bàn/khách/Order, grace.
3. **`08-SPEC-economy-constants.md` + `docs/config/economy.tbh.json`** — MỌI hằng số/công thức. **Không hardcode:** mọi số là config trong Config Registry admin (08-SPEC §0.7/§22, 10-SPEC §7); JSON chỉ là seed. Kiểm bằng **`npm run check:config` chạy từ gốc repo** (`package.json` gốc, 08/09). Lưu ý: 2 script python còn đối chiếu với `prototype/src` (lưu trữ); khi engine mới có `config.get`, trỏ `SRC_DIR`/`constants` của script sang code mới — gate giữ nguyên tên lệnh.
4. **`trum-bia-hoi-brd-admin.md` §5.2** — Config Registry: tier A/B/C, RBAC, override, `effectiveAt`, audit (dựng cùng game, không để sau).
5. `04-SPEC-prototype-phase0.md` **§5** — cách đo k (bất biến; phần còn lại của doc là lưu trữ).
6. `10-SPEC-tech-implementation.md` **§1/§5/§7/§10/§13** — engine thuần (không DOM, RNG seedable, `now` truyền vào), config service + pin `configVersion` theo ca, server-authoritative, DoD.
7. `docs/features/F07–F28` — rules/data/analytics/acceptance từng feature (F28 = bảng xếp hạng/Bàn Thờ, tách từ F12) (`docs/features/README.md` là mục lục). **F27 (onboarding)** và **F23 §8 (mất mạng/reconnect)** là ràng buộc outcome dù layout tự do.

**Tham khảo (tự quyết, không phải hợp đồng):**

8. `10-SPEC` phần còn lại (module map, domain model, state machine mẫu) · `09-SPEC-uiux-screens.md` + `05-SPEC-design-uiux.md` + F24 (một phương án màn hình/microcopy/motion) · `07-SPEC-shop-mua-giai-worldcup.md`.
   **Layout tham khảo (chủ dự án 08/09):** thư mục **`docs/reference/`** (8 ảnh + `README.md` mục lục: HUD, sheet Nâng cấp 2 tab, Nhập hàng, Sổ ca, Bàn Thờ/bảng xếp hạng, dialog Tờ rơi, **popover nâng cấp tại chỗ**). Ảnh chính `trumviahe-hud-layout-2026-09-08.png` — HUD game gốc kiểu **sân quán không gian** (quầy + thiết bị + badge số ở tâm trên, bàn/ghế rải trên nền, khách ngồi thật, bong bóng gọi món + thanh kiên nhẫn ngay tại chỗ, rail kho phải, 4 nút đáy). Wireframe card-list ở `09-SPEC` §3.1 là cách của prototype, **không** phải hướng ưu tiên. Khác gốc: bong bóng/popover đặt theo **bàn** (1 mâm) đúng 03-SPEC §9.5, không theo từng khách.
9. `game-extended-workflow-cl.md` — quy trình game canvas (replay test, canvas QA, asset manifest, perf budget).
10. `prototype/` — **bản thử nghiệm lưu trữ, không kế thừa code/layout/màn hình.** Chỉ mở khi muốn xem cách đo k đã chạy thật (`prototype/src/sim/`, `prototype/README.md`).

### 2.3 Chủ dự án / PM
`SESSION-TRACK-LOG.md` (block mới nhất) → `06-ROADMAP-trum-bia-hoi.md` (v3.0, mốc M0–M9) → `docs/implementation-tracker.md` → `docs/dashboard.md` → `docs/phase0-alpha-playtest.md` (lưu trữ của prototype; không chặn game mới) → `docs/TRANG-THAI-DOCS.md` (trạng thái bộ docs mới nhất + việc chờ quyết định).

---

## 3. Bản đồ docs & trạng thái

| File | Vai trò | Tương ứng research gốc | Trạng thái |
|---|---|---|---|
| `00-HANDOFF-trum-bia-hoi.md` | điểm vào (file này) | `00-TONG-HOP-trumviahe.md` | ✅ v1.0 |
| `02-GDD-trum-bia-hoi.md` | **nguồn sự thật** thiết kế | `brief-gameplay` + `trum-bia-hoi-game-design-research` | ✅ v1.9 |
| `01-MAP-tra-da-to-bia-hoi.md` | rationale chuyển hoá (why) | — | ✅ tham chiếu |
| `03-SPEC-he-ban.md` | hệ bàn (đơn vị gameplay) | — (cơ chế mới) | ✅ v1.2 |
| `04-SPEC-prototype-phase0.md` | **lưu trữ**; còn ràng buộc §5 (cách đo k) | — | 🗄️ v0.2 |
| `05-SPEC-design-uiux.md` + `docs/features/F24` | design/UI khung | `uiux-analysis` §1–§13 | 🔧 khung |
| `09-SPEC-uiux-screens.md` | IA, từng màn, luồng, component, motion, microcopy, a11y — **tham khảo, không ràng buộc layout** | `uiux-analysis` §14–§36 | 📖 v1.0 |
| **`10-SPEC-tech-implementation.md`** | **gợi ý** kiến trúc/domain/API/test; **ràng buộc**: config service (không hardcode), engine thuần, server-authoritative, DoD | (mới) | ✅ v1.5 |
| **`trum-bia-hoi-brd-admin.md`** | BRD admin/CRM: dashboard, CRM, **Config Registry (§5.2)**, content, payment, support, audit | (mới) | ✅ v0.4 |
| **`docs/asset-blender-pipeline.md`** | pipeline Blender MCP → pixel-art | `design-component-catalog` §1, §4 | ✅ v1.0 |
| `07-SPEC-shop-mua-giai-worldcup.md` | shop Vụ Bia | — | ✅ 🔵 P4 |
| **`08-SPEC-economy-constants.md`** + `docs/config/economy.tbh.json` | mọi hằng số/công thức; §22 key → tier admin | `economy-spec-from-bundle.md` | ✅ v1.2.2 (8 mâu thuẫn đã chốt §21) |
| **`12-PROMPT-claude-build.md`** + `docs/prompts/codex-review.md` | **Kickoff prompt cho Claude Code** (M0→M9, ràng buộc kết quả, vòng lặp slice → Codex review CLEAN) + instruction cho Codex | — | ✅ v1.0 |
| **`11-PROMPT-PACK-designer-blender-dev.md`** | 2 bản giao việc (EN): Phần A asset (+ 75 audio id), Phần B dev — tự do cách làm/kiến trúc/layout | — | ✅ v1.14 |
| `docs/features/F07–F28` | spec feature (F27 = onboarding 🟢, F28 = bảng xếp hạng) | — | ✅ (F01–F06 nằm trong 03/04) |
| `docs/reference/` (8 ảnh + README) | layout tham khảo game gốc: HUD, sheet, popover nâng cấp, Bàn Thờ | — | 🖼️ tham khảo |
| **`docs/content/`** (3 JSON + README) | content bank tier C — đề xuất schema + 5 ví dụ | — | ⏸ pending (chưa chốt) |
| `docs/TRANG-THAI-DOCS.md` | **trạng thái bộ docs (bản mới nhất)** — độ phủ, quyết định đang hiệu lực, việc chờ chủ dự án | — | ✅ 08/09 |
| `docs/design-tokens.md` | palette/typo | `uiux-analysis` §24, §41 | ✅ v1.0 |
| `docs/asset-list-designer.md` · `asset-production-checklist.md` · `asset-generation-prompts.md` · `item-list-upgrade-levels.md` | asset catalog + checklist + mô tả | `design-component-catalog-trumviahe.md` | ✅ (8/~550 asset đã có; checklist v1.4: 75 audio id, 8 gap §P2 đã đóng, 9 mặt bằng, bếp 4 cấp, B1 12 icon) |
| `game-extended-workflow-cl.md` | quy trình game canvas | — | ✅ |
| `06-ROADMAP` v3.0 (mốc M0–M9, 1 phase) · `docs/implementation-tracker.md` · `docs/dashboard.*` | tiến độ | — | ✅ ROADMAP v3.1, tracker v0.7.1 reset 0/28 |
| `docs/autopilot-*.md` · `.autopilot/` | **lưu trữ** kit Level 3 — không còn bắt buộc (08/09) | — | 🗄️ |
| `economy-spec-from-bundle.md` · `uiux-analysis-trumviahe.md` · `design-component-catalog-trumviahe.md` · `research-*` · `brief-gameplay-trumviahe.md` | **research game gốc** (chỉ để truy vết) | | 🔒 không sửa |

**Luật mâu thuẫn:** quyết định → GDD thắng; số → `docs/config/economy.tbh.json` thắng (sửa spec cho khớp); hệ bàn → 03-SPEC; asset naming → `asset-list-designer.md` §11.

---

## 4. Scope — **MỘT PHASE, GAME ĐẦY ĐỦ 5 LỚP ECONOMY** (chốt founder 09/09)

> **Không có "phase trước / phase sau" về mặt scope.** Game bàn giao = **game đầy đủ**, có **cả 5 lớp economy** cùng lúc. Các số P0–P4 dưới đây (và trong 10-SPEC §14, 11-PROMPT-PACK Phần B, 06-ROADMAP) chỉ còn là **thứ tự code cho gọn merge**, KHÔNG phải cổng scope: không được trả lời "cái này để phase sau" cho bất cứ hạng mục nào trong bảng này. Nhãn 🔵 trong 08-SPEC/GDD từ nay đọc là *"vẫn trong scope, làm sau cùng"*, không phải *"chưa build"*.

### 4.1 Năm lớp economy — tất cả đều trong scope

| Lớp | Nội dung bắt buộc có | Docs | Số |
|---|---|---|---|
| **1 · Unit economy** | 6 món (bia, lạc, nem, đậu tẩm hành, tóp mỡ, lòng xào dưa) + bếp 4 cấp trả tiền, kho/nhập sỉ–lẻ, giá/vốn/biên | GDD §2, F07, F11 | 08 §2, §8.5 |
| **2 · Throughput** | Hệ bàn (nhóm, nhiều đợt, phục vụ cả mâm 1 chạm), bia mất hơi 12s, cốc + rửa, nâng cấp bom/rửa/hầm/quầy/bàn/ghế, giới hạn tay người chơi | 03-SPEC, GDD §4–§6, F10 | 08 §7–§8, §20 |
| **3 · Demand-mix** | 7 loại khách (thường/vội/sộp/Chí Phèo/ngồi lỳ/ship/cổ vũ), 5 thời tiết, Giờ Vàng đủ mức + lịch, đợt gọi 2+, tip/kiên nhẫn/uy tín | GDD §7–§9, F08, F09 | 08 §3–§6, §9 |
| **4 · Risk** | Côn đồ/bảo kê, kiểm tra (câu hỏi), trật tự đô thị, đánh nhau, trộm offline, chó giữ quán, Thùng Cấp Cứu | GDD §13, F15, F18 | 08 §12, §17 |
| **5 · Meta** | Giải Nhậu + Vụ Bia (mùa, LP, Dạo Phố), **Bảng xếp hạng + Bàn Thờ Ông Địa (F28)**, Đường Lên Trùm, mặt bằng (thuê/cọc/chuyển), nhiệm vụ/điểm danh, referral + huy hiệu, Két Bia Bí Ẩn, cosmetic | GDD §11–§12, F12–F14, F16, F17, **F28** | 08 §13–§16, §19; JSON `leaderboard` |

### 4.2 Nền tảng đi kèm (không tách phase)

| Hạng mục | Ghi chú | Docs |
|---|---|---|
| **Lưu trữ & server** | **Thứ tự code (chốt 08/09): localStorage trước → server event store sau.** Thiết kế **server-ready từ đầu** (engine thuần chung client/server, event log append-only, `idempotencyKey`, pin `configVersion`) để chuyển sang server-authoritative là đổi adapter lưu trữ, không viết lại. Server + anti-cheat + reconnect (F23 §8) là hạng mục trong scope, làm sau lưu local | 10-SPEC §9/§1/§10, F23 |
| **Tài khoản, ngôn ngữ vi/en, guest → login** | | F25 |
| **Monetization** | 🟢 **Chơi FREE hoàn toàn** (chốt 08/09): không Vé Mở Ca, không bán quyền chơi, không paywall — F26 ⛔ bỏ. **Nguồn thu duy nhất = donate cho admin** (Mời Bia Hơi, F20): tự nguyện, quà cảm ơn cosmetic-only, không P2W; cổng nhận tiền = adapter (mặc định QR chuyển khoản, admin xác nhận tay); config `donation` tier A | F20, 08 §13/§22 |
| **Admin + Config Registry** | Mọi tham số sửa được ở admin, không hardcode — dựng cùng game, không để sau | `trum-bia-hoi-brd-admin.md` §5.2, 10-SPEC §7 |
| **UI/UX đủ màn + asset thật + âm thanh** | 7 màn lõi + màn phụ; layout tự quyết (tham khảo ảnh HUD gốc, §2.2 mục 8); asset Blender → pixel-art; **75 SFX/ambient id phủ mọi action** (checklist B7) | 09-SPEC, `asset-blender-pipeline.md`, checklist §B7 |
| **Onboarding** | 🟢 **Chốt 08/09:** guest chơi không đăng ký, khuyến khích đăng nhập Google (lưu tiến độ · thành tích · đua top); đăng nhập giữa ca lưu realtime, không ngắt ca; ca 1 = **1 khách gọi 1 bia**, không kịp → khách đi + thông báo; **3 lần liên tiếp → hướng dẫn step-by-step**; lần đầu chơi cũng có step guide (bỏ qua được). Cách trình bày dev tự quyết; bước guide là content tier C | F27 v1.1, F25 §10 |
| **Trạng thái mạng** | Áp khi có server: mất mạng/reconnect/lệch state giữa ca là ràng buộc, không phải tham khảo | F23 §8 |
| **Nội dung sự kiện** | Cúp Bóng Đá (lịch/tỉ số), Mời Bia Hơi — trong scope, bật/tắt bằng feature flag config | F19–F20, 07-SPEC |
| **Vé số** (xu in-game, không tiền thật) | Trong scope kỹ thuật nhưng **giữ `lottery.legalGate` = off** tới khi có ý kiến pháp lý (đây là gate pháp lý, không phải gate phase) | F21, 08 §18 |

### 4.3 Thứ tự code gợi ý (chỉ để merge gọn, không phải scope)

`config-loader + server skeleton` → `kho/bàn/nâng cấp` → `6 món + bếp` → `khách/thời tiết/rush đủ` → `meta (giải/mặt bằng/Đường Lên Trùm)` → `risk + chó` → `donate + admin config` → `sự kiện` → `QA/perf/release`.
Giao việc: `11-PROMPT-PACK` Phần A (designer) và Phần B (dev) — cả hai là **brief**, không phải quy trình từng bước. **`prototype/` không nằm trong đường đi:** game code viết mới từ đầu, layout/màn hình/design do dev tự quyết (09-SPEC/05-SPEC/F24 chỉ là tham khảo).

### 4.4 Dev tạo ở slice đầu (chưa tồn tại trong repo)
**Vị trí code game mới (chốt 08/09): trong repo này, npm workspaces** — `packages/engine` (engine thuần, không DOM), `apps/web` (client), `apps/server` (từ M4); root `package.json` giữ `check:config` + `workspaces`. Dev được đổi tên/tách thêm package nhưng **không** đặt code mới vào `prototype/` (lưu trữ) và không tạo repo khác (docs + JSON số + Level 3 đều ở đây). Script `check_*.py`: trỏ `SRC_DIR`/constants sang `packages/engine` ở M0.
`docs/analytics-events.md` (gộp §Analytics của F07–F27) · `src/i18n/vi.json` + `en.json` (khung key; 09-SPEC §8 chỉ có 21 dòng mẫu) · `assets/manifest.json` (schema `game-extended-workflow-cl.md` §14; designer điền dần) · **port `check:config`** khỏi `prototype/` · **sim headless đo k** (04-SPEC §5) viết mới · **placeholder convention** khi asset chưa có: khối màu token + nhãn `id` 8px, cùng footprint với checklist, đọc từ manifest `status:"placeholder"` để đổi sang sprite thật không sửa code.

### 4.5 Quyết định còn mở — **chốt sau** (chủ dự án 08/09); dev dùng default dưới đây, không chờ
| Mục | Default để dev không phải đợi | Tier |
|---|---|---|
| Cổng nhận donate + refund policy (F20) | Adapter; mặc định QR chuyển khoản + admin xác nhận tay; refund = config `donation.refundPolicy`; chọn provider tự động (nếu có) sau | A |
| Nguồn lịch/tỉ số Cúp Bóng Đá (F19) | Admin nhập tay (tier C) là nguồn mặc định; API thật là adapter bật bằng flag | C |
| Age gate / thông điệp "mô phỏng quản lý quán, không cổ vũ uống" (research đã cảnh báo 2 lần) | Màn landing có xác nhận tuổi + 1 dòng disclaimer, bật/tắt bằng config; copy ở `vi.json` | A |
| Câu hỏi kiểm tra, quest pool, lời thoại khách | ⏸ **PENDING** (chủ dự án 08/09) — `docs/content/` mới là **đề xuất** schema + 5 ví dụ, chưa chốt. **Tính năng kiểm tra (policy check) cũng pending**: F15 §4, ship `risk.inspection.enabled=false`, không tính vào acceptance M6 | C |
| Số server-only (boss côn đồ, lượng trộm) | Đã có trong `economy.tbh.json` §risk; thiếu key nào → thêm theo luật 3 nơi | B |

## 5. Glossary (thuật ngữ bia hơi ↔ gốc ↔ code)

| Bia hơi | Gốc (trumviahe) | id/code |
|---|---|---|
| Giải Nhậu · Vụ Bia · Đường Lên Trùm · Bàn Thờ Ông Địa | League · Season · Life Path · Đền Thiêng | `league` · `season` · `lifePath` · `shrine` |
| Giờ Vàng (nhẹ/nặng/trưa/xem bóng) | Rush hour | `rush.light|heavy|lunch_light|football` |
| Tỉnh Táo · Xả Hơi | Well-rested · Tĩnh tâm | `wellRested` · `restMode` |
| Bia Đấm · Mời Bia Hơi · ~~Vé Mở Ca~~ (bỏ 08/09) | Trà Đấm · Mời Trà Đá · — | `assistant` · `donation` · ~~`sessionPass`~~ |
| Két Bia Bí Ẩn · Thùng Cấp Cứu · Thùng Hàng · Mảnh Huy Hiệu · Tem Trang Trí | Secret box · Emergency pack · Crate · Badge shard · Cosmetic token | `chairmanBox` · `emergencyPack` · `crate` · `badgeShard` · `cosmeticToken` |
| Bom bia + vòi · Bồn rửa cốc · Hầm/tủ giữ lạnh · Quầy/kho · Bếp · Bàn | Ấm tích · Bộ rửa ly · Thùng đá · Quầy · — · Ghế | `keg` · `washer` · `cooler` · `stall` · `kitchen` · `table` |
| Dân nhậu · Làm ly nhanh · Khách sộp · Khách quậy · Bàn lai rai · Ship · Nhóm cổ vũ | normal · rush · VIP · Chí Phèo · stubborn · shipper · — | `thuong` · `voi` · `vip` · `chipheo` · `ngoily` · `shipper` · `football_fan` |
| Bia hơi · Lạc · Nem chua · Đậu tẩm hành · Tóp mỡ · Lòng xào dưa | Trà đá · Kẹo lạc · Hạt hướng dương | `bia` · `lac` · `nem` · `dau` · `topmo` · `long` |
| Độ hơi (cốc) · cờ vàng · hết hơi | Đá tan | `freshness` · `warn` · `stale` |

---

## 6. Quy ước

**Owner update 2026-09-08:** khách bỏ đi chỉ hiện toast icon + số xu/uy tín thực trừ; không text giải thích và không nút Đóng. Asset tham khảo bộ `docs/reference/assets-owner-2026-09-08/`; cốc chuẩn = `assets/glass-clean.png`.

- **Tự do thiết kế (founder 09/09):** dev/designer tự quyết kiến trúc, thư viện, layout, màn hình, thao tác, hình ảnh. Doc UI/UX (09-SPEC, 05-SPEC, F24) và kiến trúc (10-SPEC §1–§6, §8–§11) là **tham khảo**; đừng coi là hợp đồng.
- **Quy trình build do dev/agent tự quyết (chủ dự án 08/09):** Level 3/autopilot (worktree, scope gate, Codex review, `/ap-*`) **không còn bắt buộc**; `.autopilot/` + `docs/autopilot-*.md` là lưu trữ. Ràng buộc chỉ còn là **kết quả**: `check:config` xanh, build/test xanh, k trong band, changelog khi lệch doc, tracker/dashboard cập nhật. Nhãn P0–P4/Phase N trong docs game = thứ tự code (mốc M0–M9).
- Nhãn: 🟢 CORE · 🟡 TUNE (đổi số trong JSON, không sửa spec) · 🔵 **vẫn trong scope 1 phase, làm sau cùng** (trước đây ghi "POST-MVP") · 🔧 cần chốt khi vào sản xuất · 📐 cần wireframe. Mọi chữ "P0–P4 / Phase N" còn sót trong docs = **thứ tự code**, không phải cổng scope.
- **UI invariants — vẫn bắt buộc dù layout tự do:** phục vụ **1 chạm cả mâm** theo Order cấp bàn với popover/bong bóng đúng 03-SPEC §9.5 (badge loại khách · món · countdown · nút ✅); 4 kết cục serve (03 §9.3) phân biệt được bằng mắt; hit ≥ 44px; không hover-only; màu không là tín hiệu duy nhất; chạy đủ 390×844 · 360×740 · 1280×720 không cuộn ngang; i18n key 100% (không chuỗi cứng); `prefers-reduced-motion`; menu quản lý/thiết bị tự pause gameplay, Nhập hàng giữ mở và pause sau mua đến khi đóng (owner 09/09); thẻ phục vụ cả mâm vẫn live, toast phạt không pause; mất mạng giữa ca có trạng thái rõ + resync (F23 §8); mọi action có SFX theo checklist B7, gộp trùng 100 ms, có 🔇.
- **Cách viết doc giao việc (chủ dự án 08/09):** chỉ định nghĩa đầu vào, đầu ra mong muốn, plugin/công cụ (Blender MCP cho asset…), acceptance/QA. Không viết quy trình từng bước — cách build do agent tự quyết.
- **Không hardcode (founder 08/09):** mọi tham số vận hành — kể cả 🟢 — là config trong admin (BRD §5.2); code chỉ giữ schema + default fallback; 🟢 = "thiết kế không đổi", không phải "ghi cứng vào code".
- Số xu/uy tín-thưởng = **base × k**; thời gian/hệ số/weight/số lượng không nhân (08-SPEC §0).
- Changelog **append-only** ở cuối mỗi doc; không ghi đè lịch sử.
- Code: engine thuần TS không DOM; RNG seedable; k chỉ đo từ giá trị/lượt; asset phải có manifest; slice "xong" = `check:config` + build + test xanh (+ sim k khi đụng economy). Lưu trữ: localStorage (versioned + migrate) trước, server sau — nhưng mọi mutation đi qua event log ngay từ đầu.
- Giao tiếp: kết thúc mỗi slice bằng báo cáo ngắn theo mẫu `11-PROMPT-PACK` §0.3 (gợi ý).

---

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.6 | Theo `docs/TRANG-THAI-DOCS.md`: thêm layout tham khảo (ảnh HUD gốc, §2.2 mục 8) · UI invariants + luật viết doc giao việc (§6) · §4.2 thêm Onboarding (F27), Trạng thái mạng (F23 §8), âm thanh B7 · §4.4 việc dev tạo ở slice đầu (analytics-events, vi.json, manifest, port check:config, sim k, placeholder) · §4.5 quyết định mở + default · §2.2 cảnh báo check:config còn trỏ prototype · §2.3 bỏ "gate đang chặn" · bản đồ docs thêm F27/reference/audit · ngày header sửa 08/09. |
| v1.5 | **Bỏ prototype khỏi đường đi + trả tự do layout/design** (founder 09/09): header nêu rõ 5 nhóm ràng buộc, còn lại tự quyết; 09/05-SPEC + F24 và phần lớn 10-SPEC hạ xuống tham khảo; 04-SPEC thành lưu trữ (giữ §5 đo k); mục 2.2 và §4.3 sửa theo; prompt-pack v1.5 (2 brief tiếng Anh). |
| v1.4 | Phần A của prompt-pack đổi sang **giao việc** (danh sách asset + tool + I/O, model tự quyết cách làm) → mục 2.1 và §4.3 sửa theo. |
| v1.3 | **Chốt founder 09/09: scope 1 phase — game đầy đủ cả 5 lớp economy**, P0–P4 chỉ còn là thứ tự code; §4 viết lại (5 lớp + nền tảng đi kèm + thứ tự code gợi ý); server-authoritative ngay từ đầu; 🔵 đọc là "trong scope, làm sau cùng". Vé số giữ gate **pháp lý** (không phải gate phase). |
| v1.2 | Bổ sung `scripts/check_config_coverage.py` + `npm run check:config` vào thứ tự đọc dev/quy ước. |
| v1.1 | Thêm `trum-bia-hoi-brd-admin.md` v0.3 vào bản đồ docs + thứ tự đọc dev; quy ước "không hardcode" (mọi tham số là config admin). Cập nhật phiên bản 08-SPEC v1.2, 10-SPEC v1.2. |
| v1.0 | Bản đầu 2026-09-08: điểm vào cho designer/dev; bản đồ docs ↔ research gốc; scope theo phase; glossary; quy ước. Cùng đợt: `08-SPEC-economy-constants.md`, `docs/config/economy.tbh.json`, `scripts/check_economy_config.py`, `09-SPEC-uiux-screens.md`, `10-SPEC-tech-implementation.md`, `docs/asset-blender-pipeline.md`, `11-PROMPT-PACK-designer-blender-dev.md`. |
| v1.7 | Chủ dự án 08/09: (1) onboarding **chốt sau** — F27 hạ xuống draft 🟡; (2) **localStorage trước, server sau** — §4.2 hàng "Lưu trữ & server" viết lại (server-ready từ đầu, đổi adapter sau), §6 thêm dòng; (3) `check:config` chạy từ gốc repo qua `package.json` gốc; (4) layout tham khảo = ảnh chủ dự án gửi (đã ở §2.2 mục 8); §4.5 đổi tiêu đề "chốt sau". |
| v1.8 | Chủ dự án 08/09: thêm 7 ảnh tham khảo (sheet Nâng cấp/Nhập hàng/Sổ ca, Bàn Thờ, Tờ rơi, popover nâng cấp tại chỗ) → `docs/reference/README.md`; **F28 bảng xếp hạng + Bàn Thờ** tách từ F12 (§4.1 lớp 5, JSON `leaderboard` tier A). |
| v1.9 | Chủ dự án 08/09: **onboarding chốt** (F27 v1.1 🟢: guest không đăng ký, login Google giữa ca realtime, ca 1 = 1 khách 1 bia, 3 lần mất khách → step guide, lần đầu có step guide); localStorage-trước giữ nguyên; các việc còn nợ làm theo đề xuất audit. |
| v1.10 | "Follow recommend" (chủ dự án 08/09): 06-ROADMAP v3.0 mốc M0–M9; `docs/content/` content bank; 8 gap checklist §P2 đóng (9 mặt bằng theo JSON, badge id, rare glass, glass-washing 128, bỏ table-plastic, bếp 4 cấp); item-list §6/§9/§14 + F14 + GDD §9 đồng bộ 08 §21. |
| v1.11 | Chủ dự án 08/09: content bank + **tính năng kiểm tra (policy check) → PENDING** (F15 §4 banner, `risk.inspection.enabled=false`, JSON 1.5.0); 9 mặt bằng xác nhận chốt; item-list soát lại (§8 mở khoá món, §10 hiệu ứng vintage, §1 sức chứa Lv4, §16 tổng hợp đồng bộ JSON). |
| v1.12 | Chủ dự án 08/09: **chơi free hoàn toàn, monetization = donate cho admin** (F20). F26 ⛔ bỏ; §4.2 hàng Monetization; §4.5 cổng donate; glossary; JSON 1.6.0 `donation` (A) + `entitlements.mode=free`. |
| v1.13 | Audit cuối trước handoff: chốt vị trí code game mới (`packages/engine` · `apps/web` · `apps/server`, npm workspaces, không đụng `prototype/`); §6 phân biệt P0–P3 rủi ro autopilot vs phase game; README features F01–F06 trỏ GDD/08/03 thay 04-SPEC lưu trữ. |
| v1.14 | Chủ dự án 08/09: **bỏ ràng buộc Level 3** — dev tự quyết quy trình build; CLAUDE.md/AGENTS.md block autopilot thay bằng "outcomes still bind"; GitNexus MUST → khuyến nghị; §6 + bản đồ docs cập nhật. |
| v1.15 | Thêm `12-PROMPT-claude-build.md` (kickoff Claude Code + Codex review qua `codex exec review`) — §2.2 mục 1 trỏ sang; 11-PP Phần B giữ làm chi tiết. |

| v1.16 | Owner 2026-09-08: cập nhật phản hồi khách bỏ đi thành toast số xu/uy tín; bổ sung bộ ảnh tham khảo art do owner gửi. |

| v1.17 | Owner layout/style 2026-09-09: ảnh `docs/reference/assets-owner-2026-09-08/layout-owner.png` dẫn hướng sân xanh dạng ô lục giác, cảnh phố hai bên, quầy phía trên, kho dọc và thẻ mâm mở khi chạm bàn. Asset minh hoạ mới ở trạng thái draft, giữ cốc gốc; chưa ép export pixel 128px. Placeholder không in ID kỹ thuật trong gameplay; trạng thái/ID vẫn có trong manifest. Luật bàn/mâm và số kinh tế không thay đổi. |

| v1.18 | Owner 2026-09-09 gửi IMG_5002–5006: tham khảo chuỗi UI phục vụ (bubble món, panel xanh/nút đỏ, cảm xúc và +xu, đồng hồ nhâm nhi). Ảnh và diễn giải motion ở `docs/reference/assets-owner-2026-09-08/README.md`. Không đổi luật món/bàn/ledger; phản hồi khách bỏ đi vẫn chỉ số/icon. |

| v1.19 | Owner 2026-09-09: menu Nhập hàng/quản lý/nâng thiết bị tạm dừng gameplay; mua xong giữ menu mở và pause đến khi đóng. §4 UI invariants cập nhật thay no-pause sheet; thẻ mâm và toast phạt giữ live. Rules16 tách presence khỏi pause để điểm danh/thao tác menu vẫn hoạt động. |

| v1.20 (2026-09-09 owner update) | Cho nâng cấp asset ngay trong ca, không phải đóng ca; menu vẫn pause đến khi đóng. Rules17 giữ replay1–16, giá/config của ca cũ và đơn khách đang chờ. Seed1.7.2 tắt flag Phase1 cũ (chỉ giữ để replay). F10§12 là contract cập nhật. |

| v1.21 (2026-09-09) | Owner yêu cầu rót sẵn/rửa theo mẻ và capacity HUD; cơ chế cập nhật tại08§8.1 +03§8. JSON1.7.3/rules18 giữ replay/pause/upgrade; bia dự trữ và ly uống là hai kho riêng. |

| v1.22 (2026-09-09) | Đối chiếu handoff mới ở checkout gốc, nhận mục tiêu economy2.0 và ghi rõ nguồn/precedence/việc tích hợp tại docs/latest-handoff-adoption.md. Header hai checkout phát triển riêng; dùng nội dung thực tế, không suy recency từ số phiên bản. Không ghi nhận kết quả engine gốc thành kết quả branch game hiện hành. |

| v1.23 (2026-09-09) | Ghi nhận checkpoint9c2870a economy2.0.1/rules21 và kết quả kiểm tra; công khai band nâng cao chưa qua, giữ số/formula chờ owner, tiếp tục lease/career. |

| v1.24 (2026-09-09) | Rules22 triển khai hợp đồng mặt bằng/cọc/hết hạn lịch thực và menu mobile;232 engine/server pass, verification/review cuối đang chạy. Giữ nguyên band nâng cao chờ owner; F14/career/full game chưa hoàn tất. |

| v1.25 (2026-09-09) | Chốt lease rules22 qua234 engine/server,77browser,config/build,10 k cohorts và15rush; native review đóng2lỗi tạice7564b. Probe8ca thật đạtLP1; tiếp tụcmùa/peak/career, không tuyên bố full game/balance xong. |

| v1.26 (2026-09-09) | Bắt đầu F12 rules23: hai mùa theo lịch thực, doanh thu sau cap, peak từ phục vụ thật và panel cá nhân VI/EN. Verify/review đang chạy; không tự tạo phần thưởng từ chuỗi mô tả trong config. |

| v1.27 (2026-09-09) | Chốt core mùa/peak và panel cá nhân rules23 tại faece69: 248 engine/server, config/build, k nền/rush và review sửa lỗi qua; browser 79 + 6 kiểm tra lại. Probe 3 ngày đạt LP2/Bom Bạc; career dài ngày, BXH và mailbox chưa hoàn tất. |

| v1.28 (2026-09-09) | Chốt harness career b01f4b1: hai seed30ngày tớiLP4,250tests/config/build/k nền/rush/review và replay tháng qua. Phát hiện save80MB gây QuotaExceededError ở probe riêng; ưu tiên lưu career, giữ band nâng cao chờ owner. |

| v1.29 (2026-09-10) | IndexedDB career storage và recovery đã qua native code review tại c9db016; config/build qua. Ghi rõ browser91ca có86pass/5timeout khi Clamshell Sleep, chưa có full verification cuối. Giữ goal full game và các quyết định còn chờ. |

| v1.30 (2026-09-10) | Đóng verify storage:91browser +80MB exactwrite/reopen/continuation/Appboot qua; Google verifier917f862 qua review và255tests/config/build. Ghi quyết định owner: local history phải duyệt trước khi tính BXH. Full game/account/claim/cloud vẫn tiếp tục; chưa có Client ID thật. |

| v1.31 (2026-09-10) | Google server accounts ebe820c qua264tests/config/build/CLI và independent review không có lỗi mới; reviewer tự chạy6storechecks. Local import/duyệt trước BXH/web vẫn tiếp tục. Giữ91browser/80MB đã verify; chưa có Client ID thật, không tuyên bố full game hoàn tất. |
