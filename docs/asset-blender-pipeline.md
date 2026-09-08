# 🧊 Pipeline asset bằng Blender MCP → pixel-art — Trùm Bia Hơi (v1.0)

> **Trạng thái (09/09):** đây là **gợi ý kỹ thuật đã kiểm nghiệm**, KHÔNG phải quy trình bắt buộc — giao việc chính thức ở `11-PROMPT-PACK` Phần A (danh sách asset + đầu ra + QA; cách làm do designer tự quyết). Lệch spec này thì ghi lý do vào changelog cuối file.
>
> Spec cho **designer/technical artist** dùng **Blender MCP** (Blender ≥ 4.2 + addon MCP, tool `execute_blender_code`, `get_viewport_screenshot`, `get_scene_info`) để sản xuất ~478 asset trong `docs/asset-production-checklist.md` với **cùng góc/tỉ lệ/ánh sáng**, rồi hậu kỳ thành pixel-art đúng contract `docs/asset-list-designer.md` §0.1. Thay cho pipeline ChatGPT image-gen (vẫn dùng được cho background/cut-in vẽ tay).
> Ngày: 2026-09-08. Nguồn màu: `docs/design-tokens.md`. Naming: `asset-list-designer.md` §11. Kích thước/crop: `asset-generation-prompts.md` §2 (`SIZE_RULES` trong `scripts/asset_postprocess.py`). Manifest: `game-extended-workflow-cl.md` §14.

---

## 1. Nguyên tắc

1. **3D là NGUỒN, output là pixel-art.** Ảnh cuối phải đứng cạnh **anchor** `assets/glass-*.png` + `assets/menu-beer.png` mà không lệch: 128×128, viền 2px `#3a2730`, ≤4 nấc màu/vật, đọc được ở 32×32. Câu "không 3D render" trong asset-list §0.1 áp cho output.
2. **5 thứ khoá theo nhóm** (đổi 1 = render lại cả nhóm): camera (góc + `ortho_scale`), đèn, điểm chạm đất, padding, outline.
3. **Chỉ màu token** (+2 nấc dẫn xuất sáng/tối do ColorRamp) — không texture ảnh, không gradient mềm, không chữ/emoji/logo thật.
4. **Không import model ngoài** (PolyHaven/Sketchfab/Hyper3D) cho asset gameplay — license + lệch style; chỉ xem tham khảo.
5. Mọi file ra phải có **entry manifest** (`assets/manifest.json`) với `source:'blender'`, `blend`, `script`, `status`.

---

## 2. Studio (`assets/_raw/blender/tbh-studio.blend` + `scripts/blender/tbh_sprite_kit.py`)

| Thiết lập | Giá trị | Lý do |
|---|---|---|
| Đơn vị | 1 m = 1 tile 128 px | tỉ lệ nhất quán bàn/thiết bị/nhân vật |
| Render | Eevee, 16 samples, `film_transparent=True`, PNG RGBA 8-bit, **view_transform `Standard`, look `None`** | giữ đúng hex token (Filmic/AgX làm lệch màu) |
| Kích thước render | **512×512** (4× tile) → hậu kỳ nearest về 128 | có chỗ cho outline/pixelate sạch |
| Tắt | bloom, AO, SSR, motion blur, soft shadow | pixel-art phẳng |
| Camera `CAM_WORLD` | ortho, rotation (X 58°, Y 0, Z 45°) | bàn, thiết bị, object sân — "3/4 top-down isometric-lite" |
| Camera `CAM_ICON` | ortho, (X 50°, Y 0, Z 35°) | icon món/nguyên liệu/HUD/unlock — "product shot" |
| Camera `CAM_CHAR` | ortho, (X 72°, Y 0, Z 25°) | nhân vật front 3/4 |
| `ortho_scale` | khối 1×1×1 m chiếm ~60% khung 512 (calibrate ở §4, ghi hằng số vào script) | padding 10–14 px sau khi về 128 |
| Đèn | 1 Sun key rot (50°, 0, −40°) strength 3 + world ambient xám 0.25 | hướng sáng trên-trái cố định (khớp anchor) |
| Bóng | **không** render bóng nền; hậu kỳ thêm ellipse `#2a1824` α 0x33 | bóng pixel đồng nhất |
| Vật liệu `make_material(token)` | Principled (roughness 1, specular 0, base = hex token) → Shader-to-RGB → ColorRamp **Constant** 3 nấc: tối = màu×0.72, gốc, sáng = màu×1.12 | cel-shading băng màu phẳng, quantize sạch |
| `place_on_ground(obj)` | đáy bbox z=0, tâm xy=0 | điểm chạm đất cố định giữa state/cấp |
| `render_sprite(name, cam, out)` / `render_states(name, states)` | ghi `assets/_raw/blender/<batch>/<name>.png` | 1 state = 1 file, cùng camera |

Nhân vật: 1 rig chung (đầu to ~1/3 chiều cao, thân 2 đầu, tay chân khối), đứng, 64×96 trong khung 128 → hậu kỳ `--anchor bottom`. Biến thể = đổi màu áo/mũ/prop; biểu cảm là overlay `face-*` riêng.

---

## 3. Hậu kỳ (`scripts/asset_postprocess.py` — mở rộng, giữ cờ cũ)

```
python3 scripts/asset_postprocess.py --input assets/_raw/blender/A3/keg-lv2.png --name keg-lv2 \
        --pixelate 128 --palette tokens --outline 2 --shadow --anchor bottom
```
| Bước | Cờ | Quy tắc |
|---|---|---|
| Crop alpha | (sẵn) | bỏ halo/nền |
| Pixelate | `--pixelate 128` | nearest-neighbor 512→128 (hoặc tile 2×1/2×2 theo `SIZE_RULES`) |
| Quantize | `--palette tokens` | về hex `docs/design-tokens.md` §2–§3 + 2 nấc dẫn xuất; **không dither** |
| Outline | `--outline 2` | 2 px `#3a2730` bao ngoài alpha; chi tiết trong 1 px do ColorRamp |
| Bóng | `--shadow` | ellipse dưới đáy, rộng 70% bbox, cao 12%, `#2a1824` α 0x33 |
| Pad/anchor | `--anchor bottom|center` | theo `SIZE_RULES` (icon center, world/char bottom) |
| Rename + QA | (sẵn) | naming §11; report `assets/_qa/` |
Test: `scripts/test_asset_postprocess.py` thêm case quantize/outline/kích thước.

---

## 4. Calibrate (làm 1 lần, trước batch đầu)
1. Model cốc bia hơi không quai (thân thuôn, `glassClean #c2e6f1` gân dọc, bia `beerAmber`, bọt `beerFoam`) → `CAM_ICON` → hậu kỳ → ghép cạnh `assets/glass-full.png` ở 128/64/32 → `assets/_qa/calibrate-glass.png`.
2. Chỉnh **chỉ** `ortho_scale`, strength đèn, hệ số ColorRamp tới khi: cùng cỡ ±5%, cùng độ dày viền, dải màu ≤4 nấc, silhouette đọc ở 32. Ghi giá trị cuối vào `tbh_sprite_kit.py` (hằng số, không chỉnh tay).
3. Chưa pass → không bắt đầu batch.

---

## 5. Batch & thứ tự sản xuất (đường tới hạn Phase 1 — checklist §1)
A1 bàn Lv1 + ghế + object sân (khoá style world) → A2 icon HUD 26 + món 6 + nguyên liệu 6 + badge → A3 thiết bị 5 loại × Lv1–3 → A4 nhân vật (chủ quán ×3, 7 loại khách ×3 thời tiết, archetype, chó, côn đồ, đại gia) → A5 Lv4–5 + bàn Lv2–4 + biển/cosmetic/unlock + mask theme → A6 background 9 mặt bằng + cut-in (vẽ tay/painterly được phép, không pixelate) → A7 animation strip → A8 audio (ngoài Blender) → A9 manifest + contact sheet + handoff.
- Batch 6–10 vật cùng loại; sau mỗi batch chọn winner làm reference; **không trộn** icon HUD với sprite gameplay.
- Mỗi batch: contact sheet `assets/_qa/contact-<batch>.png` (3 cỡ 128/64/32, có anchor bên cạnh) + cập nhật cột ✓ checklist.

---

## 6. QA (fail 1 = làm lại)
| Check | Pass |
|---|---|
| Readability | nhận ra vật ở 32×32; món ≠ nguyên liệu; loại khách phân biệt không cần badge |
| Style | viền 2 px, ≤4 nấc màu, không blur/gradient, không 3D-look (specular, bóng mềm) |
| Consistency | cùng camera/scale/đèn/padding/điểm chạm đất với anchor & batch trước |
| Progression | Lv1 tạm bợ → Lv5 công nghiệp, silhouette gốc giữ, to hơn ≤25%/cấp, số vòi/ngăn/lò đếm được ở 64 |
| State | `dirty/stale/overdue/broken` khác rõ không cần chữ |
| Export | đúng tên §11, 128×128 (hoặc tile) PNG RGBA, không nền/card/halo/chữ/emoji |
| IP | không logo/nhãn hiệu thật (biển, áo đấu, TV) |
| Manifest | entry đủ trường, `status` đúng, không orphan |

---

## 7. Cái gì KHÔNG vẽ (code làm — `asset-list-designer.md` §8.1–§8.2, `09-SPEC-uiux-screens.md` §3.2)
Viền bàn theo patience, thanh patience/freshness, popover Order, floating pill, overlay tint thời tiết, particle mưa/gió, tint theme đội (dùng mask), progress rót/rửa/bếp, chữ/số HUD. Designer chỉ cung cấp **mask/strip** khi được yêu cầu.

---

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.0 | Bản đầu 2026-09-08: studio 3 camera + đèn + vật liệu cel; hậu kỳ pixelate/quantize/outline/shadow; calibrate theo anchor; thứ tự batch A1–A9; QA; ranh giới asset ↔ code. |
