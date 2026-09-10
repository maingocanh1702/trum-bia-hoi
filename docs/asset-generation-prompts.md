# ASSET GENERATION PROMPT BIBLE — Trùm Bia Hơi

> **Mục tiêu:** bộ prompt production dùng để tạo toàn bộ visual asset theo từng item, state, level/upgrade, nhân vật, UI icon, background, weather và animation của game.
>
> **Style reference:** `assets/glass-half.png`. Khi đưa ảnh này vào model, luôn khai báo **Image 1 là style reference**, không phải edit target và không phải vật thể phải sao chép vào mọi output.
>
> **Nguồn đối chiếu:** `docs/asset-list-designer.md` v0.7, `docs/item-list-upgrade-levels.md` v1.4, `docs/features/F24-design-uiux-production.md`, `design-component-catalog-trumviahe.md` và runtime `prototype/src/ui/GameView.ts`.

---

## 0. Cách dùng file này

Mỗi lần gen chỉ tạo **đúng một asset hoặc một frame**. Không yêu cầu contact sheet, sprite atlas, nhiều level hoặc nhiều state trong cùng ảnh.

Prompt hoàn chỉnh cho một output:

```text
{GLOBAL_STYLE_LOCK}
{GROUP_LOCK phù hợp}
{PROMPT RIÊNG của asset trong các bảng bên dưới}
{TRANSPARENCY_LOCK hoặc BACKGROUND_LOCK}
```

Ví dụ tạo `washer-lv3.png`:

```text
{GLOBAL_STYLE_LOCK}
{WORLD_OBJECT_LOCK}
Asset name: washer-lv3.
Create one two-basin scratched inox street-stall sink with a simple faucet, visible drainboard and two parallel glass-washing positions. It must clearly look larger and more capable than Lv2 but still less enclosed and automated than Lv4. Production crop: 256x192.
{TRANSPARENCY_LOCK}
```

Không ghi chữ tiếng Việt vào sprite/icon. Tên item, giá, level, timer, số lượng, QR data, tỉ số và trạng thái động phải render bằng code.

---

## 1. Global locks

### 1.1 `GLOBAL_STYLE_LOCK`

```text
Use case: stylized-concept.
Asset type: production game asset for a Vietnamese street bia-hoi management game.
Input images: Image 1 is a STYLE REFERENCE ONLY. Learn its pixel density, hard-edged pixel clusters, dark warm outline, mint-and-cream highlights, slightly imperfect hand-drawn silhouette, and warm nostalgic color handling. Do not copy the beer glass into the new asset unless the requested subject is a glass.

Art direction: charming early-to-mid-2000s Vietnamese street-stall pixel art, warm, lived-in, slightly faded, humorous and readable. Crisp chunky pixels, nearest-neighbor appearance, no soft antialiasing, no painterly blur, no smooth vector-flat shapes, no glossy mobile-app 3D, no photorealism.

Outline and light: consistent 2-pixel-equivalent dark warm plum-brown outer outline #3a2730, selective 1-pixel internal accents, cream highlights #fff3d2, compact pixel shadow only when the group lock allows it. Light comes from upper left.

Core palette: beer amber #eaa31a, dark amber #c07a12, foam cream #fff3d2, worn stool red #de4126, scratched inox #c4cecb, aged wood #3a2a1c, sun-faded street yellow #f1d585, success green #3fa564, warning yellow #f4c23f, danger red #d23a2a. Keep saturation controlled, never neon except the explicit old glass-tube neon sign.

Era lock: Vietnam street life in the early-to-mid 2000s. Use aged aluminum and inox, worn plastic, raw wood, hand-painted metal signs, fluorescent tubes, warm incandescent bulbs, old paper ledgers, CRT television, generic keypad feature phone and generic step-through motorbike. No real brand logos. Avoid touchscreen smartphones, flat-screen TVs, modern scooters, electric vehicles, LED strips, RGB lighting, tablets, POS terminals, thin laptops, luxury minimalist furniture and contemporary app-delivery branding.

Composition: exactly one requested asset, centered and fully visible, generous safe padding, clear silhouette at gameplay scale. No collage, no comparison sheet, no contact sheet, no duplicate object, no environment scene unless the asset is explicitly a background or illustration.

Constraints: no watermark, no signature, no emoji glyph, no UI screenshot, no decorative frame, no unintended text, no cropped edges.
```

### 1.2 `WORLD_OBJECT_LOCK`

```text
Asset type: gameplay world-object sprite.
Camera: consistent three-quarter top-down isometric-lite view, approximately 25-30 degrees downward, front and right faces visible. Preserve the same camera, light direction, ground contact and apparent scale across all levels and states in the family.
Composition: native rectangular production crop matching the object's real gameplay footprint; do not force a square canvas. Keep the object separate from chairs, customers, labels, level numbers and UI.
Materials: show age through a few deliberate pixel clusters such as scratches, dents, faded paint and water marks; avoid noisy micro-detail.
```

### 1.3 `ICON_LOCK`

```text
Asset type: small game HUD or inventory icon.
Camera: front-facing emblem or simplified three-quarter object view, whichever makes the meaning clearest.
Composition: one bold centered symbol, 12-16% safe padding, high contrast, readable at 24px, 40px and 72px. Production crop: 128x128 unless another size is specified.
Constraints: no word labels, no numbers, no card background, no emoji-font rendering, no thin lines, no tiny decorative clutter.
```

### 1.4 `CHARACTER_LOCK`

```text
Asset type: full-body gameplay character sprite.
Camera: front three-quarter view with a slight top-down game angle; full body, feet and hands visible.
Anatomy: compact readable pixel proportions, expressive silhouette, slightly oversized head and hands, believable pose. Preserve identity, body proportions, face, hair and signature colors across weather and action variants.
Composition: one person only unless the asset explicitly calls for a group. Native portrait crop, centered baseline, no speech bubble, badge, UI frame, name or text baked into the sprite.
```

### 1.5 `PORTRAIT_LOCK`

```text
Asset type: game UI portrait or avatar.
Composition: one head-and-shoulders portrait, front three-quarter, face occupying about 65% of the crop, clear expression, generous hair and shoulder padding. Production crop: 256x256 master, later downscale to 128x128 or 64x64.
Constraints: preserve the matching gameplay character's identity and clothing colors; no full body, no nameplate, no text, no badge unless explicitly requested.
```

### 1.6 `BACKGROUND_LOCK`

```text
Asset type: gameplay environment background.
Style: the same nostalgic visual world as Image 1, expanded into richer pixel-art environment detail without becoming painterly.
Camera and layout: fixed three-quarter top-down game camera. Logical viewport 600x720; production export 1200x1440. Keep the center and lower-middle as a clean playable area for tables, queue and equipment. Put walls, awnings, wires, plants and ambient clutter mainly around the perimeter.
Constraints: no customers, owner, tables, chairs, active equipment, UI, labels or text baked in. No weather effects baked in; weather is a separate overlay. Preserve identical gameplay anchors across variants.
```

### 1.7 `ILLUSTRATION_LOCK`

```text
Asset type: splash, modal or event illustration.
Style: warm hand-painted pixel illustration derived from Image 1, slightly more detailed than gameplay sprites but still crisp and game-consistent.
Composition: one coherent scene, readable focal point, intentional negative space for code-rendered title and buttons. No baked text, logo, UI controls or watermark.
```

### 1.8 `TRANSPARENCY_LOCK`

```text
Scene/backdrop: perfectly flat solid {KEY_COLOR} chroma-key background for local alpha removal.
The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane or lighting variation. Keep the subject fully separated from the background with crisp edges and generous padding. Do not use {KEY_COLOR} anywhere inside the subject. No cast shadow, contact shadow or reflection outside the subject silhouette.
```

Chọn key:

- Dùng `#00ff00` cho phần lớn asset.
- Dùng `#ff00ff` cho cốc xanh, cây xanh, lá chuối, bảng/áo xanh hoặc asset có màu gần `#00ff00`.
- Sau khi gen, tách alpha bằng chroma-key; không đưa nền key vào game.
- Cốc thủy tinh, bia/bọt, smoke, tóc và lông chó là edge phức tạp. Nếu alpha chroma bị mất highlight hoặc viền bẩn, dừng và xin xác nhận trước khi đổi sang workflow native transparency; không tự đổi model/path âm thầm.

---

## 2. Native production crop

Đây là kích thước crop cuối trong game, không phải giới hạn canvas đầu vào của model.

| Nhóm | Crop gợi ý |
|---|---:|
| HUD, badge, menu, nguyên liệu | 128x128 |
| Particle nhỏ | 16x16 đến 32x32 |
| Ghế, prop đứng nhỏ | 128x160 hoặc 160x160 |
| Nhân vật gameplay | 160x192 master |
| UI portrait/avatar | 256x256 master |
| Thiết bị nhỏ | 192x160 đến 256x224 |
| Thiết bị lớn | 288x224 đến 448x320 |
| Bàn Lv1-Lv2 | 224x176 đến 256x192 |
| Bàn Lv3 | 352x208 |
| Bàn Lv4/VIP | 448x240 |
| Quầy/stall full scene | 960x720 |
| Gameplay background | 1200x1440, logical 600x720 |
| Desktop shell/splash | 2560x1440 |
| UI texture 9-slice | 192x192 |

Luôn crop theo alpha thật, giữ baseline/anchor ổn định và resize bằng nearest-neighbor.

---

## 3. Bàn, ghế và object sân quán

### 3.1 Bàn theo level

Ghép một `TABLE LEVEL PROMPT` với một `TABLE STATE PROMPT`. Mỗi tổ hợp là một call/output riêng.

#### Table level prompts

| Base asset | Crop | Prompt riêng |
|---|---:|---|
| `table-lv1` | 224x176 | `Asset name: table-lv1. Create one low sun-faded red plastic sidewalk table for two people, slightly scuffed and inexpensive, broad enough for two bia-hoi glasses and one snack plate. No chairs. This is the humble starting table and must be visibly smaller and cheaper than every later level.` |
| `table-lv2` | 256x192 | `Asset name: table-lv2. Create one square low inox table for four people, scratched brushed-metal top, tubular folding legs, sturdier and cleaner than Lv1. No chairs. Keep the same camera and anchor as Lv1.` |
| `table-lv3` | 352x208 | `Asset name: table-lv3. Create one long rectangular inox table for six people, reinforced legs, wider serving surface, a few practical under-table braces, clearly larger and more capable than Lv2. No chairs.` |
| `table-lv4` | 448x240 | `Asset name: table-lv4. Create one long VIP street-banquet table for eight to ten people, made by joining sturdy tables, with a tasteful cream cloth runner, small old-fashioned incandescent table lamp and upgraded edge trim. Premium but still believable for a Vietnamese sidewalk bia-hoi stall. No chairs, no food, no guests, no text.` |

#### Table state prompts

| State/output suffix | Prompt riêng |
|---|---|
| `-empty` | `State: empty. Keep the table completely clear except for its permanent built-in details. No customers, dishes, glasses, order markers or glow.` |
| `-seating` | `State: seating. Add only a few subtle movement cues at the chair anchor points and one pulled-out chair position marker; do not add a full customer. The table itself must remain unchanged.` |
| `-awaiting` | `State: awaiting service. Add one small amber order tray marker and an unmistakable ready-to-serve warm yellow rim cue. No text, number or character.` |
| `-grace` | `State: grace period. Add an urgent broken red pixel pulse outline and a small nearly-empty hourglass symbol above the rear edge. Do not change table geometry.` |
| `-consuming` | `State: consuming/enjoying. Add two or three used bia-hoi glasses and a snack plate arranged naturally, with a tiny celebratory clink sparkle. No customers baked into the table.` |
| `-paying` | `State: paying. Add a small old paper bill, pencil and coin dish near the front corner, with a restrained gold attention glint. No QR data, no text.` |
| `-cleaning` | `State: cleaning needed. Add dirty empty glasses, crumbs and one folded wiping rag. Keep the mess readable but not disgusting.` |
| `-occupied` | `State: occupied. Add neutral in-use props: two to four glasses and one plate, with no ready, danger or payment cue. Customers remain separate sprites.` |
| `-broken` | `State: broken. Show a bent leg, cracked or dented tabletop corner and one loose brace, with a reusable red damage cue. The original level and footprint must remain recognizable.` |

Output production là 36 file theo pattern `table-lv{1..4}-{empty,seating,awaiting,grace,consuming,paying,cleaning,occupied,broken}`. Nếu runtime dùng compositing, chỉ cần 4 base level + 9 overlay state; không bake lại toàn bộ tổ hợp.

Legacy mapping khi code còn dùng 5 state cũ:

| Legacy | Production state |
|---|---|
| `has_customer` | `occupied` |
| `needs_serve` | `awaiting` |
| `overdue` | `grace` |
| `enjoying` | `consuming` |

### 3.2 Ghế và object còn thiếu

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `chair-plastic` | 128x160 | `Create one low red molded-plastic Vietnamese sidewalk stool, sun-faded, lightly scratched, stable and intact, three-quarter top-down. No table or person.` |
| `chair-empty` | 128x160 | `Create one neutral empty-chair anchor sprite using the same low red plastic stool as chair-plastic, slightly desaturated so it reads as an available seat, without glow, text or occupant.` |
| `chair-upgraded` | 160x176 | `Create one upgraded low-backed street chair with a worn red plastic seat, simple metal support and small arm rests, more comfortable than the stool but still inexpensive and period-correct.` |
| `chair-broken` | 160x176 | `Create the chair-plastic sprite after damage: one cracked seat, bent leg and scuff marks, still recognizable, no fire, no exaggerated debris.` |
| `chair-upgraded-broken` | 160x176 | `Create the chair-upgraded sprite after damage: bent arm rest, cracked back and one loose metal support. Preserve the upgraded chair identity and camera.` |
| `chair-damage-overlay` | 128x128 | `Create one reusable transparent damage overlay: two chunky cracks, one bent-metal cue and three tiny red warning shards. No chair underneath, no text.` |
| `glass-rack` | 224x176 | `Create one compact open rack for clean and dirty bia-hoi glasses beside the washer: scratched inox frame, two clearly separated shelves, six thick green fluted Hanoi bia-hoi tumblers, no handle, no labels. Readable as glass storage, not a sink.` |
| `queue-ground-marker` | 192x96 | `Create one worn sidewalk queue-position marker made from faded painted footprints and a short dashed line, no text or numbers, designed to tile along the edge of the stall.` |

Số ghế mua thêm và 9 lần nâng ghế tựa là state economy, không phải 16 identity hình khác nhau. Reuse `chair-plastic` cho mọi ghế thường và `chair-upgraded` cho mọi ghế tựa; chỉ đổi layout/count bằng code.

---

## 4. Thiết bị theo level/upgrade

Mỗi row là một asset riêng. Dùng `GLOBAL_STYLE_LOCK + WORLD_OBJECT_LOCK + row + TRANSPARENCY_LOCK`.

### 4.1 Bom bia + vòi rót

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `keg-lv1` | 192x192 | `Create one humble blue-green plastic beer barrel with a small hand-operated brass tap, capacity for one glass at a time, scuffed and improvised. It must look like the cheapest starter pouring station.` |
| `keg-lv2` | 224x208 | `Create one small dented inox beer keg with a single sturdier brass tap, simple drip tray and room for two glasses. Clearly better than the plastic Lv1, still manual.` |
| `keg-lv3` | 256x224 | `Create one large aged inox beer keg with two brass taps, reinforced stand and wider drip tray for three-glass batches. Larger and more professional than Lv2.` |
| `keg-lv4` | 320x240 | `Create one semi-professional pressure beer system with a tall old-fashioned twin-tap tower, visible generic pressure gauge and CO2 cylinder tucked behind, designed for six-glass batches. No modern digital display.` |
| `keg-lv5` | 384x256 | `Create one premium industrial bia-hoi pouring station with several coordinated brass taps, large inox reservoir, broad drip tray and mechanical valves, designed for twelve-glass batches. Clean and impressive but still analog and period-plausible, no screen.` |

Active edit for each level:

```text
Input images: Image 1 is the approved idle sprite for this exact level.
Change only the operating state: show amber beer flowing from the tap into one traditional green fluted handleless bia-hoi glass, with compact cream foam. Preserve every pixel-level proportion, camera, anchor, equipment material and background key color. Output one active sprite only.
```

### 4.2 Bồn rửa cốc

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `washer-lv1` | 192x160 | `Create one small dented aluminum wash basin on a low stool, one hand brush, one glass-washing slot and a simple water dipper. Primitive hand-washing setup, cheapest level.` |
| `washer-lv2` | 224x176 | `Create one paired aluminum-and-inox basin setup with a simple faucet and draining basket, still one active washing position but quicker and tidier than Lv1.` |
| `washer-lv3` | 256x192 | `Create one scratched two-basin inox street-stall sink with faucet, visible drainboard and two parallel glass-washing positions. Larger and more capable than Lv2, still fully open and manual.` |
| `washer-lv4` | 320x224 | `Create one compact semi-automatic glass washer, waist-high inox cabinet, three circular washing slots, mechanical lever and drain tray. No screen, no futuristic controls.` |
| `washer-lv5` | 384x256 | `Create one large industrial glass-washing station with enclosed inox body, five visible rack positions, analog buttons and side drain racks. Cleanest and most automated level while preserving 2000s mechanical design.` |

### 4.3 Hầm/tủ giữ lạnh

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `fridge-lv1` | 192x160 | `Create one cheap white foam cooler packed with rough ice cubes, crooked lid and condensation, clearly temporary and manually cooled.` |
| `fridge-lv2` | 224x176 | `Create one lidded scratched inox ice chest with side handles, visible ice and better insulation than Lv1. No electricity or display.` |
| `fridge-lv3` | 224x256 | `Create one compact old mini cooler cabinet with rounded corners, small glass-front door and analog thermostat knob, slightly yellowed from age.` |
| `fridge-lv4` | 352x224 | `Create one horizontal under-counter refrigerator with two doors, brushed inox body, sturdy worktop and old analog temperature dial. Larger capacity than Lv3.` |
| `fridge-lv5` | 448x288 | `Create one industrial cold-room entrance and cooling unit for the stall, thick insulated door, exposed pipe, analog gauge and stacked beer containers visible inside. It must suggest effectively permanent freshness without looking futuristic.` |

### 4.4 Quầy/kho

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `counter-lv1` | 256x176 | `Create one small raw-wood display table with two mismatched boxes and a few ingredient bundles, storage capacity visibly limited.` |
| `counter-lv2` | 256x224 | `Create one two-tier aluminum shelf with organized ingredient bags, chipped plastic crates and a narrow prep top. More capacity than Lv1.` |
| `counter-lv3` | 304x256 | `Create one three-tier scratched inox storage cabinet with open shelves, labeled only by color-coded blank tags, enough organization to unlock signage. No readable text.` |
| `counter-lv4` | 384x256 | `Create one compact old-style wood-and-inox service counter with rear shelves, ingredient bins, paper ledger space and a small glass display section. No POS or screen.` |
| `counter-lv5` | 480x304 | `Create one premium full street-stall bar counter with polished aged wood, inox worktop, glass-front storage, organized crates and analog cash drawer. Impressive maximum capacity, still warm and non-modern.` |

### 4.5 Bếp

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `kitchen-lv1` | 224x192 | `Create one Vietnamese honeycomb-coal stove with a blackened cast-iron pan, small charcoal tongs and soot marks. One cooking position, humble and smoky.` |
| `kitchen-lv2` | 240x192 | `Create one small tabletop gas stove with old red cylinder partly visible, two visible cooking positions with two woks (main burner and auxiliary burner) and a simple splash guard. Clearly faster than the coal stove. Match the two configured kitchen slots.` |
| `kitchen-lv3` | 304x208 | `Create one sturdy double-burner gas stove with two pans, wider prep edge and shared old gas cylinder. Two simultaneous cooking positions.` |
| `kitchen-lv4` | 400x288 | `Create one large inox commercial stove with several heavy burners, tall backsplash and old metal exhaust hood. Professional but analog, no digital controls.` |
| ~~`kitchen-lv5`~~ (bỏ 08/09 — bếp 4 cấp) | 480x320 | `Create one master street-kitchen line with multiple burners, wok station, stock pot, broad prep surface and powerful old metal hood. Maximum throughput, highly organized, no modern display.` |

---

## 5. Cốc bia, món bán và nguyên liệu

### 5.1 Traditional glass identity lock

Append vào mọi prompt `glass-*` và `menu-beer`:

```text
The vessel must be the same traditional Hanoi bia-hoi tumbler as Image 1: no handle, thick recycled green glass, many close vertical fluted ribs, moderately tall slim body about 1.3 times height-to-width, slightly flared rim and heavy base. Preserve the exact silhouette, camera, padding and outline across the whole lifecycle. Never make a beer mug, stein, thin pint glass or short squat tumbler.
```

### 5.2 Cốc theo lifecycle

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `glass-clean` | 128x128 | `Create the approved traditional glass empty, clean and bright, with a few mint highlights and clear heavy base. No beer, foam, dirt or water.` |
| `glass-full` | 128x128 | `Fill the approved glass almost to the rim with rich amber bia hoi and a compact cream foam head that rises slightly above the rim. Keep silhouette unchanged.` |
| `glass-half` | 128x128 | `Show the approved glass with roughly one-half to two-thirds amber beer remaining and a noticeably thinner foam layer, still fresh. Match Image 1 closely.` |
| `glass-stale` | 128x128 | `Show the approved glass with paler amber beer, almost collapsed foam and one small physical yellow warning flag attached behind the rim. No emoji or text.` |
| `glass-flat` | 128x128 | `Show the approved glass with dull desaturated beer, no foam and very few bubbles, visually flat and unappealing but not dirty.` |
| `glass-dirty` | 128x128 | `Show the approved glass empty with cloudy fingerprints, one dried foam ring and a few brownish smudges. It must read as dirty, not broken.` |
| `glass-washing` | 160x144 | `Show the approved glass partially submerged in a small inox wash basin with chunky soap bubbles and water splashes. Keep the glass recognizable and fully inside the crop.` |
| `glass-rare-chairman` | 128x128 | `Create one rare reward version of the same approved traditional glass: subtly thicker emerald-green glass, restrained gold rim accent and one tiny chairman-style seal shape with no letters. Prestigious but still a real bia-hoi tumbler, not magical fantasy loot.` |

Rare-glass lifecycle edit:

```text
Input images: Image 1 is the approved glass-rare-chairman identity sprite; Image 2 is the matching normal lifecycle state reference.
Change only the liquid, foam, dirt or washing state to match Image 2. Preserve the rare glass silhouette, emerald tone, gold rim accent, seal, camera and padding exactly. Output one state only.
```

### 5.3 Món bán

| Asset | Prompt riêng |
|---|---|
| `menu-beer` | `Create one full traditional Hanoi bia-hoi glass with amber beer and abundant cream foam, matching glass-full, presented as a clean menu icon without plate or background.` |
| `menu-peanut` | `Create one small chipped enamel plate of roasted peanuts, warm brown-gold shells and a few loose peanuts, appetizing and plainly prepared.` |
| `menu-nemchua` | `Create one small plate of Vietnamese fermented pork rolls partly unwrapped from banana leaves, several pink slices, green leaf folds and a little chili, no packaging text.` |
| `menu-friedbean` | `Create one enamel plate of golden fried tofu cubes topped with scallion oil and crisp onion, fresh and hot, clearly cooked rather than raw.` |
| `menu-crackle` | `Create one small plate of crunchy golden pork crackling pieces, irregular cubes, slight shine and crisp texture, appetizing not greasy.` |
| `menu-intestine` | `Create one oval plate of stir-fried pork intestine with yellow-green pickled mustard greens, visible steam and wok gloss, appetizing and clearly cooked.` |

### 5.4 Nguyên liệu kho

| Asset | Prompt riêng |
|---|---|
| `mat-beer-barrel` | `Create one wholesale beer-supply container: a sealed dented aluminum keg with blank paper tag and rope handle, clearly stock material rather than a serving glass.` |
| `mat-peanut-raw` | `Create one open burlap sack of raw unshelled peanuts, earthy beige and dusty, clearly uncooked warehouse stock.` |
| `mat-nemchua-pack` | `Create one tied wholesale bundle of banana-leaf-wrapped nem chua rolls, rough string and blank paper tag, not plated food.` |
| `mat-bean-raw` | `Create one shallow crate of uncooked white tofu blocks protected by a damp cloth, clean but clearly raw stock.` |
| `mat-pork-fat` | `Create one small enamel tray of uncooked pale pink-white pork fat blocks on crushed ice, neutral and non-gory.` |
| `mat-intestine-raw` | `Create one lidded enamel pail containing neatly separated raw intestine and pickled greens, non-gory and clearly ingredient stock, not a finished dish.` |
| ~~`mat-onion`~~ **bỏ 08/09** | `Create one old glass jar and small paper bag of fried shallots and dried scallion, blank label, pantry ingredient presentation.` |
| ~~`mat-ice`~~ **bỏ 08/09** | `Create one tied clear plastic bag of chunky ice cubes with cool blue highlights and condensation, no logo or text.` |

---

## 6. Nhân vật gameplay, weather và UI người trong game

### 6.1 Weather modifiers

Ghép một identity prompt với đúng một weather modifier. Gen từng output riêng.

| Variant | Prompt modifier |
|---|---|
| `normal` | `Weather variant: normal mild day. Use the identity's default outfit and a neutral alert expression.` |
| `hot` | `Weather variant: hot day. Preserve identity; roll up sleeves or simplify outer layers, add a small sweat cue and wiping cloth where natural. Do not redesign the character.` |
| `cold` | `Weather variant: cold day. Preserve identity; add a period-correct light jacket, scarf or layered shirt and a slightly hunched cold pose. Do not cover signature face or silhouette.` |

### 6.2 Chủ quán

| Asset | Prompt riêng |
|---|---|
| `owner` | `Create the main stall owner: quick middle-aged Vietnamese proprietor, rolled work trousers, plain short-sleeve shirt, dark brown apron, sandals, practical towel at the waist, energetic ready-to-serve pose.` |
| `owner-hot` | `Create the exact same owner on a very hot day, sleeves rolled higher, towel wiping forehead, visible effort but still energetic.` |
| `owner-cold` | `Create the exact same owner on a cold day, worn olive jacket over the apron, hands ready for work, small breath puff kept separate from the silhouette.` |

### 6.3 Gameplay customer identities

| Prefix | Identity prompt |
|---|---|
| `customer-normal` | `Create one ordinary Vietnamese bia-hoi customer in a faded T-shirt, loose trousers and plastic sandals, friendly neutral expression, average build.` |
| `customer-rush` | `Create one hurried after-work customer in rolled-sleeve office shirt, loosened tie, old leather document bag and keypad phone, leaning forward as if short on time.` |
| `customer-vip` | `Create one generous big-spending host in a clean tucked-in shirt, dark trousers, tinted glasses and restrained gold watch, confident open-handed ordering gesture, no gaudy modern luxury brand.` |
| `customer-chipheo` | `Create one rowdy drunk customer with flushed face, rumpled torn shirt and unstable pointing pose, comic and troublesome without graphic violence.` |
| `customer-laurai` | `Create one relaxed long-stay customer with slightly round belly, worn sleeveless shirt, towel on shoulder and laid-back posture, clearly comfortable staying for many rounds.` |
| `customer-shipper` | `Create one takeaway delivery rider in a generic faded jacket, half helmet, rough insulated bag and keypad phone, no app logo, no modern scooter gear.` |
| `customer-football` | `Create one football supporter in a generic unbranded team-color shirt, small fabric flag and old plastic horn, energetic but no real club or national logo.` |

Output matrix:

- `customer-normal-{normal,hot,cold}`
- `customer-rush-{normal,hot,cold}`
- `customer-vip-{normal,hot,cold}`
- `customer-chipheo-{normal,hot,cold}`
- `customer-laurai-{normal,hot,cold}`
- `customer-shipper-{normal,hot,cold}`
- `customer-football-a`, `customer-football-b`, `customer-football-c` dùng ba phối màu generic khác nhau, weather normal.

### 6.4 Customer visual skins

Mỗi skin dùng cùng skeleton/scale với `customer-normal`. Gen `normal/hot/cold`, trừ hai football skin chỉ cần normal.

| Prefix | Identity prompt |
|---|---|
| `customer-skin-runner` | `Runner just finishing exercise: simple period-neutral sports shirt, shorts, running shoes, sweat towel and analog sports watch, quick refreshment pose, no logo.` |
| `customer-skin-badminton` | `Badminton player: bright generic sports shirt, racket bag, one racket and small shuttlecock cue, relaxed after practice.` |
| `customer-skin-pickleball` | `Pickleball player: generic sports outfit, one paddle and small yellow perforated ball, stylized deliberate anachronism allowed, no brand.` |
| `customer-skin-office-worker` | `Tired office worker after shift: rolled white shirt, loose tie, old leather briefcase, pen pocket and keypad phone.` |
| `customer-skin-construction-worker` | `Construction worker after shift: dusty long-sleeve shirt, faded reflective vest, work trousers and hard hat carried by hand, no company mark.` |
| `customer-skin-student` | `Cheerful budget student: simple T-shirt, canvas backpack, notebooks and inexpensive sandals or sneakers, no school logo.` |
| `customer-skin-aunties` | `One lively Vietnamese middle-aged woman from a friends group, patterned blouse, practical trousers, small handbag and expressive chatting gesture. Generate one person only per asset.` |
| `customer-skin-regular-bia-lover` | `Familiar regular with slight beer belly, old sleeveless shirt, towel over shoulder, plastic sandals and easy confident smile.` |
| `customer-skin-drunk-happy` | `Happy harmless drunk: red cheeks, broad laugh, one raised empty hand ready to toast, rumpled shirt, balanced enough to remain friendly.` |
| `customer-skin-drunk-rowdy` | `Rowdy drunk: red cheeks, shirt untucked, aggressive pointing and unstable stance, no weapon and no gore.` |
| `customer-skin-drunk-sleepy` | `Sleepy drunk: heavy eyelids, slumped shoulders and nodding head, designed to work in standing and seated variants.` |
| `customer-skin-retiree` | `Retired uncle: faded polo shirt, loose trousers, cloth cap or green pith helmet, folded newspaper and small chess piece cue.` |
| `customer-skin-cyclist` | `Cyclist after a ride: simple fitted sports shirt, old bicycle helmet and water bottle, no full bicycle baked into the body sprite.` |
| `customer-skin-tourist` | `Curious traveler: practical shirt, small backpack, compact film-era camera and sunglasses, respectful and excited, no flag or brand.` |
| `customer-skin-foodie` | `Enthusiastic food lover: cloth shoulder bag, chopsticks and compact digital camera or keypad camera phone, delighted expression, no smartphone.` |
| `customer-skin-football-fan` | `Friendly football fan: generic team-color shirt, cloth scarf and small flag, no real logo, one person.` |
| `customer-skin-football-ultra` | `Intense but nonviolent football ultra: generic face paint colors, small drum strap and plastic horn, no real team emblem, one person.` |
| `customer-skin-shipper-bike` | `Old-school delivery rider: generic faded jacket, half helmet, rough insulated bag, keypad phone and a separate hint of a Dream/Wave/Cub-style step-through motorbike, no logo.` |
| `customer-skin-boss-host` | `Big-spending banquet host: tucked-in shirt or worn leather jacket, gold-tone watch, premium keypad phone and sweeping gesture ordering for the whole table.` |
| `customer-skin-solo` | `Quiet solo drinker: plain shirt, thoughtful distant gaze, relaxed shoulders and one hand in pocket, designed for a slow seated-drinking variant.` |

### 6.5 Action modifiers

Gen action riêng từ identity anchor đã duyệt.

```text
Input images: Image 1 is the approved identity anchor for this exact character.
Preserve face, hair, body proportions, outfit, signature colors, camera, pixel density and baseline exactly. Change only the pose to: {ACTION}. Keep props minimal and period-correct. Output one character sprite only.
```

| Suffix | `{ACTION}` |
|---|---|
| `-standing` | `neutral standing idle, slight breathing-ready posture` |
| `-walk-01` | `first walking contact pose, left foot forward` |
| `-walk-02` | `passing walking pose, weight centered` |
| `-walk-03` | `second walking contact pose, right foot forward` |
| `-seated` | `seated naturally on a low red plastic stool, hands clear of the table area` |
| `-ordering` | `one hand politely signaling an order, other hand relaxed` |
| `-drinking` | `holding one traditional handleless green bia-hoi glass near the mouth` |
| `-happy` | `satisfied smile and small celebratory gesture` |
| `-angry-leaving` | `frustrated expression, body turning away to leave, no violence` |

### 6.6 UI portrait/avatar derivatives

Tạo portrait cho: `owner`, 7 gameplay customer types, 20 customer skins, `chairman-poor`, `chairman-reveal`, `gangster-1..boss`, `npc-inspector`, `npc-lottery-seller`, `npc-thief`.

```text
Input images: Image 1 is the approved full-body gameplay sprite and identity anchor.
Create one matching head-and-shoulders UI portrait using PORTRAIT_LOCK. Preserve the exact face, hair, age, outfit colors and personality. Expression: {neutral/happy/angry/worried/revealed}. Do not redesign the character, do not include a name, badge or text.
Asset name: portrait-{identity}-{expression}.
```

| Asset | Prompt riêng |
|---|---|
| `avatar-guest-placeholder` | `Create a friendly anonymous guest avatar: simplified silhouette of a Vietnamese stall visitor wearing a plain cloth cap, warm cream face shadow and dark-brown outline, no gender-specific facial identity, no question-mark text.` |
| `avatar-frame-default` | `Create one circular pixel-art avatar frame made from aged brown wood and small inox studs, empty transparent center, no portrait, no text.` |
| `avatar-frame-vip` | `Create one circular premium avatar frame with restrained aged-gold trim and one tiny beer-foam crest shape, empty transparent center, no text.` |
| `avatar-frame-champion` | `Create one circular champion avatar frame with gold laurel, tiny crown silhouette and warm beer-amber accents, empty center, no season number or text.` |

---

## 7. NPC, côn đồ và chó

### 7.1 NPC/event characters

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `chairman-poor` | 160x192 | `Create the disguised chairman before reveal: looks like a scruffy poor drunk customer, faded torn shirt, cheap sandals, unshaven face and humble slouched pose, but hide one tiny visual clue of quality such as a well-kept old watch.` |
| `chairman-reveal` | 160x192 | `Create the same man's revealed identity: wealthy older Vietnamese chairman in a sharp but period-appropriate dark suit, cream shirt, gold-tone watch and calm generous smile. Preserve face and body so the transformation is believable.` |
| `chairman-smoke` | 192x192 | `Create one compact theatrical reveal-smoke sprite made of cream and pale mint pixel clouds with a few amber sparkles, no person and no text.` |
| `gangster-1` | 160x192 | `Create a lean local thug with sleeveless shirt, cheap chain and intimidating stance, low threat level, no graphic weapon focus.` |
| `gangster-2` | 176x208 | `Create a stronger stocky thug with rolled sleeves, faded tattoos and heavier stance, visibly tougher than gangster-1, no gore.` |
| `gangster-3` | 192x224 | `Create a large muscular enforcer with dark vest, scar cue and dominant stance, clearly highest normal threat, no oversized fantasy anatomy.` |
| `gangster-boss` | 192x224 | `Create a composed older gang boss in open-collar dark shirt, gold-tone ring and long coat, calm authority rather than cartoon armor, period-correct.` |
| `npc-inspector` | 160x192 | `Create one Vietnamese neighborhood order-and-food-safety inspector in period-correct khaki civil-defense uniform, clipboard, simple cap and stern professional expression. No readable insignia or text.` |
| `npc-lottery-seller` | 160x192 | `Create one roaming lottery-ticket seller with sun hat, shoulder board of small paper tickets, cloth bag and friendly tired expression. Tickets have colored blocks but no readable numbers or logos.` |
| `npc-thief` | 160x192 | `Create one opportunistic nighttime thief in plain dark early-2000s clothing, cloth cap and furtive crouch, carrying a small ingredient sack, comic rather than violent.` |

### 7.2 Chó theo level/state

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `dog-idle-lv1` | 160x144 | `Create one small mixed-breed puppy sitting guard beside the stall, floppy ears, thin red collar, curious rather than fierce. Smallest level.` |
| `dog-idle-lv2` | 176x160 | `Create the same dog as a healthy adult, larger body, alert ears, stronger chest and sturdy worn collar. Clearly upgraded from Lv1.` |
| `dog-idle-lv3` | 192x176 | `Create the same dog as a powerful guard dog, broad chest, confident stance, thick old leather collar with metal studs, intimidating but believable.` |
| `dog-attack-lv1` | 176x144 | `Create the Lv1 puppy in a brave short forward lunge, paws extended and mouth open, more comic than dangerous.` |
| `dog-attack-lv2` | 192x160 | `Create the Lv2 adult dog in a strong forward leap, body stretched and focused, no contact target or gore.` |
| `dog-attack-lv3` | 224x176 | `Create the Lv3 guard dog in a powerful controlled pounce, broad silhouette and decisive motion, no target or gore.` |
| `dog-captured` | 176x160 | `Create the same dog sitting sadly with a loose chain beside it and lowered ears, clearly temporarily captured, no cage, injury or gore.` |

Dog consumables:

| Asset | Prompt riêng |
|---|---|
| `icon-dog-food` | `One enamel bowl of simple rice-and-meat dog food with a small bone shape, no text.` |
| `icon-dog-candy` | `One old paper pouch of dog training treats with a bone-shaped biscuit visible, no modern pet brand.` |
| `icon-dog-captured` | `One simple dog collar plus loose chain and sad downward ear silhouette, no face emoji.` |

---

## 8. Unlock items, cosmetics và event props

### 8.1 Mở khóa một lần và event props

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `phone` | 128x128 | `Create one generic early-2000s keypad feature phone with small monochrome screen, worn dark-gray body and tiny vibration lines, no logo or readable screen text.` |
| `qr-payment` | 192x160 | `Create one humble payment board: a blank black-and-white QR placeholder square printed on old white paper and taped to brown cardboard, with worn corners. The final scannable QR data will be replaced by code; no bank logo or readable text.` |
| `flyer-bundle` | 128x128 | `Create one tied bundle of cheap offset-printed street flyers in faded red, yellow and blue blocks, no readable words, slightly dog-eared.` |
| `icon-broadcast-license` | 128x128 | `Create a folded paper broadcast permit with a CRT antenna seal and small wax stamp, no text or real sports logo.` |
| `icon-match-schedule` | 128x128 | `Create a paper wall calendar with a small football and old clock symbol, blank date squares, no numbers or text.` |
| `tv-off` | 256x224 | `Create one old bulbous CRT television on a low metal stand, dark convex screen, side knobs and rabbit-ear antenna, powered off.` |
| `tv-on` | 256x224 | `Create the same CRT television powered on with a generic green football pitch glow and two abstract team-color blocks. No score, logo, player face or text baked in.` |
| `secret-box` | 192x192 | `Create one mysterious old wooden beer crate with brass latch, amber light leaking through slats and a tiny chairman seal shape, no lettering.` |
| `emergency-pack` | 192x176 | `Create one rough red-and-cream emergency supply crate containing ice bag, peanut sack and clean bia-hoi glass silhouettes, no label text.` |
| `inspection-badge` | 128x128 | `Create one generic brass-and-enamel food-safety inspection badge with shield and clean-bowl symbols, no government seal or text.` |
| `certificate` | 192x160 | `Create one aged sanitation certificate paper in a simple wooden frame with abstract stamp shapes and blank lines, no readable text.` |
| `prop-celebration` | 256x192 | `Create one compact celebration prop cluster: small flower bouquet, paper ribbon, blank fabric banner strip and old incandescent party bulb, no words, balloons or modern foil decor.` |
| `prop-thief-report` | 256x192 | `Create one tabletop evidence arrangement for offline theft: opened ingredient sack, scattered coins, paw-print-or-footprint clues and old paper report, no text.` |
| `rare-glass-gift-box` | 192x192 | `Create one small chairman reward box opened to reveal the silhouette of a rare green bia-hoi tumbler in warm amber light, no extra loot and no text.` |

### 8.2 Biển hiệu

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `sign-wood` | 320x160 | `One raw wooden stall sign with irregular planks, hand-painted blank cream brush strokes as decoration only, hanging rope and worn edges. Leave the central area blank for code-rendered text.` |
| `sign-neon` | 320x176 | `One old glass-tube neon stall sign in warm amber and faded red, slightly flickering look, dark aged metal backing. No LED matrix, no readable letters; leave a blank central sign area.` |
| `sign-calligraphy` | 320x176 | `One dark wood calligraphy-style sign with cream rice-paper inset, red blank seal block and ornamental brush-stroke shapes, no readable Han-Nom or Vietnamese text.` |
| `sign-vintage` | 320x176 | `One retro hand-painted sheet-metal sign, faded teal, cream and red layers, chipped corners and blank central banner area, no logo or readable text.` |
| `sign-golden` | 352x192 | `One premium aged-gold sign with carved wood backing, restrained beer-foam crest and warm bulbs, prestigious but not palace-like, blank center for runtime text.` |

### 8.3 Lồng đèn và cây cảnh

| Asset | Prompt riêng |
|---|---|
| `lantern-japanese` | `One old red-and-cream paper izakaya-inspired lantern, no characters or text, warm bulb visible, slightly weathered.` |
| `lantern-lotus` | `One handmade lotus-shaped lantern from faded pink and cream paper petals, warm old bulb, simple wire frame.` |
| `lantern-red` | `One traditional red fabric lantern with worn gold trim and tassel, no characters, no glossy modern finish.` |
| `lantern-vintage` | `One old kerosene-style hanging lamp converted to warm electric bulb, aged brass and cloudy glass.` |
| `plant-bamboo` | `One compact potted bamboo cluster in a chipped ceramic pot, clear vertical silhouette.` |
| `plant-bonsai` | `One small carefully shaped bonsai in a shallow old clay pot, asymmetrical readable canopy.` |
| `plant-orchid` | `One potted orchid with a few pale purple blooms, wire support and weathered ceramic pot.` |
| `plant-succulent` | `One small rosette succulent in a chipped enamel cup used as a pot, compact readable silhouette.` |

### 8.4 World Cup tint masks

Các mask phải grayscale, không có màu đội thật.

| Asset | Prompt riêng |
|---|---|
| `theme-flag-mask` | `Create one clean grayscale pixel-art fabric flag mask with three large separated value zones for runtime primary, secondary and accent tint. No emblem, text, stripes tied to a real country or background.` |
| `theme-lantern-mask` | `Create one clean grayscale paper-lantern mask with three separated tonal zones for runtime team tint, no letters or emblem.` |
| `theme-sign-mask` | `Create one clean grayscale hand-painted metal sign mask with three separated tonal zones and blank center for runtime text, no real team motif.` |

---

## 9. HUD, inventory và meta icons

Dùng `GLOBAL_STYLE_LOCK + ICON_LOCK + row + TRANSPARENCY_LOCK`. Mỗi row là một call riêng.

### 9.1 HUD core

| Asset | Prompt riêng |
|---|---|
| `icon-coin` | `One chunky old brass coin with a simple beer-foam crest, strong round silhouette, no currency symbol.` |
| `icon-stamina` | `One compact yellow lightning bolt wrapped around a small old alarm-clock silhouette, no number.` |
| `icon-reputation` | `One green five-point reputation star with a tiny handshake cutout, no text.` |
| `icon-rush-light` | `One amber business-rush icon: small serving tray with one speed streak and restrained glow.` |
| `icon-rush-heavy` | `One danger-red business-rush icon: serving tray with three speed streaks and stronger jagged pulse silhouette.` |
| `icon-weather-sunny` | `One warm sun disk with short chunky rays and slight street-haze ring.` |
| `icon-weather-hot` | `One amber-red thermometer beside two rising heat-wave lines.` |
| `icon-weather-humid` | `One blue-green water droplet wrapped by dense wavy heat lines, visibly muggy.` |
| `icon-weather-rain` | `One dark cloud with three diagonal blue raindrops.` |
| `icon-weather-cold` | `One pale-blue snowflake with a tiny breath-puff curve.` |
| `icon-notification` | `One small aged-brass hand bell with a red unread marker dot.` |
| `icon-sound-on` | `One old radio speaker cone with two clear sound arcs.` |
| `icon-sound-off` | `The same old radio speaker cone crossed by one thick diagonal mute slash.` |
| `icon-quest` | `One paper checklist pinned to a small target board, blank marks only.` |
| `icon-ai-assistant` | `One friendly old neighborhood loudspeaker/radio-cassette mascot with two amber indicator eyes, no robot body, screen or speech text.` |
| `icon-shrine` | `One compact Vietnamese Ông Địa altar silhouette with warm incense glow, no deity text or real religious inscription.` |
| `icon-trophy` | `One aged-brass bia-hoi trophy cup with two tiny traditional glass silhouettes on the handles.` |
| `btn-shift` | `One circular action emblem combining a rolled-up awning and old alarm clock, designed for the open-or-close-shift button; no words.` |
| `btn-restock` | `One action emblem of a wooden supply crate entering a shelf, clear inward arrow, no words.` |
| `btn-upgrade` | `One action emblem of a wrench beside a rising brass step arrow, no level number.` |
| `btn-leaderboard` | `One action emblem of a small podium and aged trophy, no rank numbers.` |
| `icon-coin-inline` | `Simplified tiny version of icon-coin with fewer interior pixels, readable at 16px.` |
| `icon-reputation-star` | `Simplified tiny green reputation star, readable at 16px.` |
| `icon-badge-shard` | `One broken enamel badge fragment with gold edge and warm highlight.` |
| `icon-cosmetic-token` | `One old perforated decoration coupon token shaped like a paper stamp, blank center.` |
| `icon-gift-box` | `One small tied cardboard supply box with cream ribbon and amber glow, no modern wrapping print.` |

### 9.2 System, progression và account icons

| Asset | Prompt riêng |
|---|---|
| `icon-season-shop` | `One old market awning sheltering a football, gift crate and coin, no text.` |
| `icon-season-theme` | `One generic football pennant, lantern and paint palette arranged as a theme icon, no team logo.` |
| `icon-location-pin` | `One map pin whose center is a tiny red plastic stool silhouette.` |
| `icon-rent` | `One old house-key beside a stack of brass coins and paper calendar corner.` |
| `icon-deposit` | `One tied coin pouch locked by a small padlock, clearly refundable deposit.` |
| `icon-lease-expiry` | `One old contract paper beside a nearly empty hourglass, no text.` |
| `icon-league-1` | `One humble translucent plastic drinking cup with simple bronze rim, strongest basic silhouette.` |
| `icon-league-2` | `One traditional thick green fluted Hanoi bia-hoi glass with silver rim accent.` |
| `icon-league-3` | `One rustic brown ceramic drinking jar with cream band and small handle-free silhouette.` |
| `icon-league-4` | `One aged copper drinking jar with crossed small serving paddles behind it, not a weapon emblem.` |
| `icon-league-5` | `One large silver beer keg with faceted cool highlights and small laurel.` |
| `icon-league-6` | `One large gold beer keg with twin glass silhouettes and restrained glow.` |
| `icon-league-7` | `One royal bia-hoi glass wearing a simple aged-gold crown, no face or text.` |
| `icon-league-8` | `One monumental gold-and-emerald bia-hoi trophy combining keg, traditional glass and crown, prestigious final-tier silhouette.` |
| `icon-duong-len-trum` | `One rising path of red stools leading toward a crowned bia-hoi stall roof, no text.` |
| `icon-dlt-lp0` | `One serving tray held by two hands, humble starter milestone.` |
| `icon-dlt-lp1` | `One apron and wiping cloth crossed behind a small stool.` |
| `icon-dlt-lp2` | `One practiced hand balancing two traditional bia-hoi glasses.` |
| `icon-dlt-lp3` | `One small street awning above a wooden counter.` |
| `icon-dlt-lp4` | `One complete bia-hoi stall frontage with sign and three stools.` |
| `icon-dlt-lp5` | `One confident proprietor silhouette holding old ledger and keyring.` |
| `icon-dlt-lp6` | `One premium keg, gold coin stack and upgraded sign grouped as an owner-tycoon emblem.` |
| `icon-dlt-lp7` | `One crowned stall crest with traditional glass, keg and laurel, ultimate milestone.` |
| `badge-ket-noi` | `One enamel badge of two linked bia-hoi glasses and handshake, green-gold palette, no text.` |
| `badge-ban-be` | `One enamel prestige badge with two linked stools and one gold star.` |
| `badge-dong-hanh` | `One ornate prestige badge with linked stall awnings, two gold stars and amber ribbon shape, no text.` |
| `icon-referral-link` | `Two interlocking chain links shaped from small beer-glass outlines, one tiny invite arrow.` |
| `icon-quest-daily` | `One tear-off paper calendar page with checklist and small sun, no number.` |
| `icon-quest-shift` | `One old alarm clock beside a serving tray.` |
| `icon-quest-gift` | `One small gift crate beside a checklist tick.` |
| `icon-quest-attendance` | `One stamp pad marking a blank attendance card, no date or text.` |
| `icon-quest-referral` | `Two linked customer silhouettes beside a small invite arrow.` |
| `icon-reward-claim` | `One open hand receiving a glowing coin-and-crate reward bundle.` |
| `icon-gift-send` | `One tied cardboard gift moving outward with a clear right-facing arrow.` |
| `icon-gift-receive` | `One tied cardboard gift moving inward toward an open hand.` |
| `icon-lottery-ticket` | `One slightly worn paper lottery ticket with colored number-block placeholders, no readable digits.` |
| `icon-lottery-draw` | `One small manual lottery drum with paper ticket emerging, no numbers.` |
| `icon-lottery-prize` | `One ticket beside a celebratory coin burst and tiny gift crate.` |
| `icon-inspection-question` | `One clipboard with clean-bowl symbol and large abstract question-shape mark, no official seal.` |
| `icon-certificate-crossed` | `One framed blank certificate crossed by a thick red revoked slash.` |
| `icon-drunk-fight` | `Two separated angry customer silhouettes with a jagged warning burst between them, no contact or gore.` |
| `icon-offline-theft` | `One ingredient sack slipping through a dark doorway with small footprint trail.` |
| `icon-language` | `Two overlapping speech bubbles containing only abstract horizontal strokes and a globe, no letters.` |
| `icon-guest` | `One anonymous cloth-cap visitor silhouette inside a simple circle.` |
| `icon-cloud-save` | `One soft cloud above an old floppy-disk silhouette and upward arrow, period-meets-system metaphor.` |
| `icon-device-sync` | `One CRT computer and one keypad phone connected by two circular arrows.` |
| `icon-session-pass` | `One perforated paper pass with traditional glass and small clock symbols, blank text area.` |
| `icon-payment-qr` | `One paper QR placeholder taped to cardboard beside a brass coin, no scannable data.` |
| `icon-payment-pending` | `One paper payment slip beside an amber hourglass.` |
| `icon-payment-success` | `One paper payment slip with strong green checkmark and coin glint.` |
| `icon-supporter-heart` | `One warm red heart held by two bia-hoi glasses, cosmetic-support feeling, no money symbol.` |
| `icon-donation-gift` | `One cosmetic gift box with heart-shaped ribbon and tiny lantern charm.` |
| `icon-bottleneck-cups` | `One empty glass rack with a single clean glass and red shortage marker.` |
| `icon-bottleneck-stale` | `One flat beer glass with collapsed foam and yellow warning flag.` |
| `icon-bottleneck-stock` | `One nearly empty ingredient shelf with red downward marker.` |
| `icon-bottleneck-speed` | `One slow brass tap beside an old clock and red delay streak.` |
| `icon-table-vip-lock` | `One premium table silhouette behind a padlock combined with reputation star and linked-glass badge.` |

`icon-google-login` **không gen bằng AI**. Dùng official Google “G” asset theo brand guideline hiện hành.

### 9.3 Customer badges và expressions

| Asset | Prompt riêng |
|---|---|
| `badge-vip` | `Small gold enamel badge with premium glass and tiny crown silhouette.` |
| `badge-rush` | `Small red badge with old clock and two speed streaks.` |
| `badge-chipheo` | `Small brown badge with tilted empty glass and jagged trouble mark.` |
| `badge-laurai` | `Small green badge with relaxed stool and slow clock hand.` |
| `badge-shipper` | `Small blue badge with keypad phone and rough takeaway bag.` |
| `badge-football` | `Small generic football badge with cloth flag, no team mark.` |
| `emoji-happy` | `Original pixel-art happy face medallion with wide sparkling eyes and cream smile, not an emoji-font glyph.` |
| `emoji-angry` | `Original pixel-art angry face medallion with red brows and steam-puff shapes, not an emoji-font glyph.` |
| `emoji-cool` | `Original pixel-art satisfied cool face medallion with old dark sunglasses, not an emoji-font glyph.` |
| `emoji-drunk` | `Original pixel-art tipsy face medallion with red cheeks and uneven eyes, not an emoji-font glyph.` |
| `badge-runner` | `Running shoe with one speed streak.` |
| `badge-badminton` | `Badminton racket crossed with one shuttlecock.` |
| `badge-pickleball` | `Pickleball paddle beside one perforated yellow ball.` |
| `badge-office` | `Old leather briefcase with loose necktie.` |
| `badge-construction` | `Simple yellow hard hat with dust mark.` |
| `badge-student` | `Canvas backpack with two notebooks.` |
| `badge-aunties` | `Small handbag beside two clinking bia-hoi glasses.` |
| `badge-regular` | `Traditional glass beside a folded shoulder towel.` |
| `badge-drunk-happy` | `Tilted glass beside an original red-cheek happy face.` |
| `badge-drunk-rowdy` | `Cracked empty glass silhouette with red warning burst.` |
| `badge-drunk-sleepy` | `Half-closed eye face beside one sleep bubble and glass.` |
| `badge-retiree` | `Cloth cap beside one traditional chess piece.` |
| `badge-cyclist` | `Old bicycle wheel beside a water bottle.` |
| `badge-tourist` | `Compact camera with sunglasses.` |
| `badge-foodie` | `Compact camera beside chopsticks and small plate.` |

### 9.4 Leaderboard và social icons

| Asset | Prompt riêng |
|---|---|
| `icon-champion-crown` | `One aged-gold champion crown with traditional glass-shaped points and amber jewel.` |
| `icon-season-placement` | `One seven-segment paper-calendar arc around a small podium, no number.` |
| `icon-season-conquest` | `One crossed pennant pair behind a fourteen-day calendar metaphor, no digits or team logos.` |
| `icon-season-reward-preview` | `One closed supply crate with a small eye-shaped preview window and ingredient silhouettes.` |
| `leaderboard-medal-gold` | `One gold medal with bia-hoi glass crest, red cloth ribbon, no rank number.` |
| `leaderboard-medal-silver` | `One silver medal with bia-hoi glass crest, blue cloth ribbon, no rank number.` |
| `leaderboard-medal-bronze` | `One bronze medal with bia-hoi glass crest, green cloth ribbon, no rank number.` |
| `leaderboard-medal-top10` | `One dark-brass honor medal with tiny Ông Địa altar silhouette, blank name ribbon.` |
| `icon-reputation-season` | `One small green reputation star wrapped by a seasonal laurel.` |
| `icon-profile-views` | `One friendly eye symbol above a tiny bia-hoi stall roof.` |
| `icon-street-visit` | `One walking sandal footprint leading toward a small stall awning.` |
| `icon-block-user` | `One anonymous customer silhouette crossed by a thick stop slash.` |
| `icon-message-compose` | `One old paper note and ballpoint pen with tiny attached gift box.` |

Social emotes — gen 8 file riêng, 32x32 master có thể gen lớn rồi nearest-neighbor downscale:

| Asset | Prompt riêng |
|---|---|
| `emote-wave` | `One friendly waving hand in original chunky pixel style.` |
| `emote-laugh` | `One original laughing face medallion with closed eyes, not emoji font.` |
| `emote-fire` | `One warm amber-red celebratory flame, not realistic.` |
| `emote-strong` | `One flexed arm in original chunky pixel style.` |
| `emote-look` | `One pair of curious eyes in original chunky pixel style.` |
| `emote-toast` | `Two traditional green handleless bia-hoi glasses clinking, cream foam splash.` |
| `emote-heart` | `One warm red intact heart with cream highlight.` |
| `emote-heartbreak` | `One warm red heart split by one clean jagged crack.` |

---

## 10. Background, locations và weather

### 10.1 Location source lock

⚠️ **Đã chốt 08/09: 9 mặt bằng** theo `economy.tbh.json` — bảng dưới là prompt cũ cho bộ 10, dùng làm ý tưởng; tên file/ID chính thức xem `asset-production-checklist.md` §A13 (`bg-location-<id>`). Ghi chú cũ: file này tạm dùng danh sách **10 location** trong `docs/item-list-upgrade-levels.md` v1.4 vì đây là catalog item/upgrade mới nhất. `docs/features/F14-locations.md` vẫn ghi 9 location và dùng tên khác. Cần reconcile tên/ID trước khi chốt production filename; art prompt dưới đây vẫn có thể dùng làm concept.

### 10.2 Gameplay backgrounds

| Asset tạm | Prompt riêng |
|---|---|
| `bg-location-hem-nho` / `bg-quanbia-default` | `A narrow Hanoi-style residential alley with faded plaster walls, corrugated awning, exposed electric wires, old fluorescent tube, water stain, drain edge and modest stall frontage. Humble starting location, intimate and warm.` |
| `bg-location-cong-truong-xay-dung` | `A dusty construction-site edge with unfinished brick wall, corrugated metal fence, stacked sandbags and distant scaffold silhouettes. Keep dust at the perimeter and playable floor clear.` |
| `bg-location-chung-cu-cu` | `Ground floor of an aging apartment block, yellowed walls, barred windows, shared corridor, old bicycle corner and laundry lines around the perimeter.` |
| `bg-location-cong-truong-hoc` | `Street edge outside an early-2000s school gate, faded wall paint, bicycle racks, shade trees and blank notice board. No children, school name or readable sign.` |
| `bg-location-cho-dem` | `Busy night-market edge with canvas awnings, incandescent bulbs, old handcarts and distant stall silhouettes, warm but not neon-heavy. Clear central service area.` |
| `bg-location-khu-van-phong` | `Early-2000s office-district sidewalk with tiled building frontage, old motorbike parking cues, fluorescent lobby light and slightly cleaner pavement, no modern glass skyscraper aesthetic.` |
| `bg-location-san-van-dong` | `Street outside an old stadium wall with generic floodlight towers, cloth pennants and ticket-booth silhouette, no team logo or readable event text.` |
| `bg-location-pho-co` | `Old-quarter Hanoi street frontage with narrow ochre facade, wooden shutters, weathered signboards left blank, tangled wires and warm lantern light.` |
| `bg-location-ga-metro` | `Stylized transit-hub location adapted to the game's world: concrete entrance, old bus-stop furniture and urban rail cues kept generic, no real metro logo, contemporary element restrained by the nostalgic palette.` |
| `bg-location-khu-pho-tay` | `Lively tourist street with mixed old shophouse facades, warm pub bulbs, blank bilingual-shaped sign panels and varied pavement, premium but still grounded, no real brands or readable text.` |
| `bg-quanbia-upgrade` | `Create an upgraded version of the approved default alley background. Preserve every gameplay anchor and camera exactly. Improve only the stall perimeter: repaired awning, cleaner floor, better fluorescent lighting, organized shelves, upgraded blank sign mount and a few tasteful cosmetics. Do not add active equipment, tables, customers or weather.` |

### 10.3 Splash/illustration backgrounds

| Asset | Canvas | Prompt riêng |
|---|---:|---|
| `bg-rest-illustration` | 2560x1440 | `Quiet bia-hoi stall after closing, owner reclining on a red plastic stool, old radio playing, empty clean tables, warm late-night bulb and calm blue street shadows. Leave broad negative space for rest-state UI.` |
| `bg-login` | 2560x1440 | `Welcoming early-evening alley bia-hoi stall before opening, owner lifting the awning, warm beer-colored light and blank sign area. Leave central-lower negative space for language and login controls.` |
| `bg-shift-summary` | 1536x1024 | `Close atmospheric tabletop scene of an old squared-paper ledger, ballpoint pen, brass coins, abacus and one empty traditional glass at the edge. Leave the paper mostly blank for runtime figures.` |
| `bg-loading` | 2560x1440 | `Minimal warm alley silhouette at dawn, closed awning, one hanging bulb and distant kettle steam, large clean center area for code-rendered logo and loading bar.` |
| `bg-desktop-shell` | 2560x1440 | `Wide extension of the game alley around a centered 600x720 gameplay-safe window, faded walls, wires, plants and ambient street depth only in the outer margins. No UI, people or active table props.` |
| `bg-social-street` | 2560x1440 | `Friendly neighborhood street containing several distant bia-hoi storefront silhouettes with different blank signs, lanterns and plants, designed as a social browsing backdrop with card-safe negative space.` |
| `leaderboard-empty-state` | 1024x1024 | `One aspirational empty podium on a quiet bia-hoi street, a traditional glass waiting on the top step and warm sunrise behind, generous empty space for runtime message.` |
| `donation-thank-you-illustration` | 1536x1024 | `The owner warmly raising a traditional bia-hoi glass toward the viewer beside a small cosmetic gift box, sincere supporter thank-you mood, no money shower or pay-to-win symbols.` |
| `ai-assistant-mascot` | 1024x1024 | `Friendly Bia Đấm mascot as an old neighborhood loudspeaker combined with a radio cassette, tiny amber indicator eyes, towel-like cable, helpful expression through shape only, no robot screen or speech text.` |

### 10.4 Weather overlays

Overlays phải giữ alpha nhẹ, không thay đổi geometry background.

| Asset | Prompt riêng |
|---|---|
| `weather-overlay-sunny` | `Full-screen transparent warm sunlight overlay with a few broad upper-left amber rays and subtle short shadow accents, no scene objects.` |
| `weather-overlay-hot` | `Full-screen transparent heat overlay with sparse rising shimmer lines and warm orange tint concentrated near the ground, no flames.` |
| `weather-overlay-humid` | `Full-screen transparent muggy-air overlay with faint blue-green haze and soft condensation specks around edges, center readable.` |
| `weather-overlay-rain` | `Full-screen transparent rain atmosphere overlay with diagonal rain streaks, darker upper tint and a few perimeter puddle highlights, no background geometry.` |
| `weather-overlay-cold` | `Full-screen transparent cool blue haze overlay with thin low fog and sparse breath-like wisps around edges, no snow-covered ground.` |
| `particle-raindrop` | `One diagonal chunky blue rain streak, 4x16 logical pixels, no glow.` |
| `particle-steam` | `One pale cream curved steam wisp, 16x16 logical pixels, soft stepped pixel edge.` |
| `particle-snowflake` | `One simple pale-blue six-arm snowflake, 8x8 logical pixels.` |
| `particle-leaf` | `One small faded yellow-green leaf at three-quarter angle, 12x12 logical pixels.` |

---

## 11. Gameplay overlays và UI raster skins

### 11.1 Overlay/icon assets nên gen

| Asset | Prompt riêng |
|---|---|
| `weather-popup-bg` | `Create one empty 9-slice-ready weather popup skin, aged brown wood panel with cream paper inset and small weather corner ornaments. No icon, text, number or shadow outside crop.` |
| `rush-banner-light-bg` | `Create one empty amber cloth-and-metal rush banner background with slight speed-fold silhouette, no flames, text or icon.` |
| `rush-banner-heavy-bg` | `Create one empty danger-red cloth-and-metal rush banner background with stronger jagged speed edges, no text or icon.` |
| `rush-countdown-bg` | `Create one compact empty old-clock HUD pill background, dark warm wood center, amber brass rim, no digits or label.` |
| `tinh-tao-pill-bg` | `Create one compact empty muted-purple rest-buff pill background with tiny old alarm-clock corner and restrained cream glow, no multiplier text.` |
| `patience-bar-frame` | `Create one empty tiny patience bar frame from dark warm outline and aged-brass end caps, transparent center for code-rendered fill.` |
| `freshness-bar-frame` | `Create one empty tiny freshness bar frame shaped like a foam-topped glass rail, transparent center for code-rendered fill.` |
| `queue-indicator` | `Create one small queue emblem of three staggered footprint pairs beside a blank hanging count tag, no number.` |
| `shipper-lane` | `Create one narrow ground-lane overlay with faded blue paint, keypad phone vibration symbol and step-through motorbike parking cue, no text or logo.` |
| `combo-marker` | `Create one compact bonus marker combining a traditional bia-hoi glass and snack plate with amber clink sparkle, no multiplier text.` |
| `order-bubble-bg` | `Create one empty cream paper speech-bubble skin with dark warm outline and small tray-shaped tail, no icons or text.` |
| `order-ready-checkmark` | `Create one bold green checkmark inside a small cream enamel plate silhouette.` |
| `table-state-paying` | `Create one transparent overlay with old paper bill, coin dish and restrained gold glint; no table underneath.` |
| `table-state-cleaning` | `Create one transparent overlay with dirty glasses, crumbs and wiping rag; no table underneath.` |
| `table-state-broken` | `Create one transparent overlay of cracks, bent-metal cue and red warning shards; no table underneath.` |
| `prep-timer-ring` | `Create one empty circular timer ring skin made from aged brass and dark wood, transparent fill area, no digits.` |
| `dish-ready-check` | `Create one small hot dish silhouette with green check and cream shine.` |
| `upgrade-stat-arrow` | `Create one bold upward brass arrow with two stepped upgrade notches, no number.` |
| `loading-skeleton-texture` | `Create one seamless subtle cream-on-brown pixel shimmer strip for loading placeholders, no content blocks or text.` |
| `onboarding-spotlight-mask` | `Create one full-screen dark translucent mask with a single clean circular transparent spotlight and soft stepped pixel rim, no arrow or text.` |

### 11.2 UI surface skins

| Asset | Crop | Prompt riêng |
|---|---:|---|
| `ui-panel-wood-9slice` | 192x192 | `Create one seamless 9-slice-ready square UI panel skin: warm aged-brown wood frame, cream paper center, tiny inox corner studs, flat front view, uniform edges, no text or icon.` |
| `ui-panel-ledger-9slice` | 192x192 | `Create one seamless 9-slice-ready old ledger-paper panel skin with faint square grid, worn brown binding edge and blank center, no writing.` |
| `ui-modal-dark-9slice` | 192x192 | `Create one seamless 9-slice-ready dark warm plum-brown modal panel with restrained amber inner line and flat center, no texture noise, text or icon.` |
| `ui-button-primary-9slice` | 192x192 | `Create one seamless 9-slice-ready worn red plastic button surface with cream highlight lip and dark outline, blank center, no text.` |
| `ui-button-confirm-9slice` | 192x192 | `Create one seamless 9-slice-ready green enamel confirm button surface with cream highlight lip and dark outline, blank center.` |
| `ui-button-secondary-9slice` | 192x192 | `Create one seamless 9-slice-ready aged-inox secondary button surface with dark outline and blank center.` |
| `ui-tooltip-9slice` | 192x192 | `Create one seamless 9-slice-ready cream paper tooltip with dark brown rim and tiny folded corner, blank center.` |
| `ui-toast-warning-9slice` | 192x192 | `Create one seamless 9-slice-ready warning toast skin with amber enamel left stripe, dark wood body and blank center.` |

Các alias có thể dùng chung surface thay vì gen ảnh riêng:

- `upgrade-panel-bg`, `restock-panel-bg`, `kitchen-panel`, `closing-ledger-panel`, `risk-modal`, `gangster-modal`, `dog-panel`, `ai-assistant-panel` → compose từ `ui-panel-*`.
- `upgrade-card`, `location-card`, `quest-mission-card`, `season-shop-card`, `payment-status-card`, `profile-summary-card`, `street-card`, `leaderboard-entry-card` → DOM component dùng token + 9-slice, không gen screenshot.
- `rush-banner` → compose `rush-banner-light-bg` hoặc `rush-banner-heavy-bg` + icon + runtime text; `tinh-tao-pill` → `tinh-tao-pill-bg` + runtime multiplier.
- `patience-bar` → `patience-bar-frame` + code fill; `freshness-bar` → `freshness-bar-frame` + code fill; `order-bubble` → `order-bubble-bg` + runtime item icons.
- `onboarding-spotlight` → `onboarding-spotlight-mask` + DOM coachmark; `loading-skeleton` → `loading-skeleton-texture` + CSS layout.
- `donation-thank-you` → `donation-thank-you-illustration` + DOM copy/actions.
- Progress bar, ring fill, stock meter, timer, chart, countdown, toast stack, tabs, rows, cards, dropdown, tooltip text → render bằng HTML/CSS/SVG/Pixi.

### 11.3 Không gen bằng ImageGen

Các item sau là dữ liệu/UI động và phải code-native: `active-hud-topbar`, `bottom-action-bar`, `glass-rail`, `toast-stack`, `kitchen-slot`, `upgrade-lock-reason`, `restock-row`, `restock-stock-meter`, `closing-ledger-row`, `shift-summary-chart`, `rental-screen`, `lease-timer`, `break-even-hint`, `life-path-progress-bar`, `life-path-reward-ladder`, `gate-tooltip`, `inspection-quiz-card`, `referral-screen`, `badge-inventory-card`, `vip-table-lock-panel`, `quest-progress-ring`, `reward-claim-button`, `ai-quota-pill`, `ai-suggestion-card`, `language-select-screen`, `login-prompt`, `guest-progress-claim`, `account-conflict-screen`, `leaderboard-lock-prompt`, `payment-lock-prompt`, `session-gate-panel`, `session-pass-product-card`, `checkout-screen`, `donation-gift-picker`, `lottery-result-screen`, `lottery-disabled-legal-gate`, `wc-match-card`, `wc-broadcast-notification`, `season-shop-card`, `team-theme-card`, `connection-status-pill`, `connection-status`, `server-sync-error`, `captcha-panel`, `leaderboard-season-header`, `leaderboard-season-end-banner`, `leaderboard-my-rank`, `leaderboard-tab-league`, `street-card-bg`, `street-location-filter`, QR thật và TV score.

Nếu cần concept UI, gen mockup chỉ để tham khảo bố cục; không import ảnh mockup đó vào game.

---

## 12. Event cut-ins và UI illustrations có người

Dùng `ILLUSTRATION_LOCK`; mỗi output một scene.

| Asset | Prompt riêng |
|---|---|
| `cutin-chairman-reveal` | `The disguised poor customer stands amid a compact cream smoke burst while his revealed chairman version emerges in the same pose, one transformation moment, warm surprise, blank side space for reward copy.` |
| `cutin-gangster-arrival` | `One local thug steps under the stall awning while owner and customers react from distant silhouettes, tense but nonviolent, blank lower area for choices.` |
| `cutin-inspection` | `The khaki-uniform inspector holds a clipboard at the stall entrance, owner attentive beside clean sink and certificate frame, serious but fair mood, no readable paperwork.` |
| `cutin-lottery-seller` | `Friendly lottery seller walks between sidewalk tables holding the paper ticket board, customers glance over, lively everyday street moment, no readable ticket numbers.` |
| `cutin-offline-theft` | `Quiet dawn after a small theft: open ingredient shelf, missing sack outline, footprints and worried owner with old ledger, no thief shown clearly, no violence.` |
| `cutin-dog-captured` | `Owner kneels beside the sad chained guard dog at the quiet stall edge, determined rescue mood, no injury or captor visible.` |
| `cutin-shift-success` | `Owner and a small diverse customer group raise traditional green bia-hoi glasses under the old awning, warm successful closing mood, no text.` |
| `cutin-shift-failure` | `Owner sits with old ledger beside a few dirty glasses and empty chairs after a difficult shift, reflective rather than hopeless, no text.` |

---

## 13. Animation frame prompts

### 13.1 Sequence lock

```text
Asset type: one frame of a production pixel-art gameplay animation.
Input images: Image 1 is the approved identity/base sprite; Image 2 is the immediately previous approved frame when available.
Preserve camera, crop, anchor, silhouette proportions, palette, outline thickness, light direction and all unchanged pixels. Change only the motion described for this frame. No motion blur, smear gradient, background, text or extra subject. Output exactly one frame, not a strip or contact sheet.
```

### 13.2 Frame list

| Asset | Motion prompt |
|---|---|
| `anim-pour-01` | `Tap closed; empty approved glass moves under the brass tap, no liquid.` |
| `anim-pour-02` | `Tap just opened; thin amber stream begins, glass one-quarter full with first foam.` |
| `anim-pour-03` | `Steady amber stream; glass three-quarters full, foam rising.` |
| `anim-pour-04` | `Tap closed; full glass settles with compact cream foam and one final droplet.` |
| `anim-wash-01` | `Dirty approved glass lowered into the washer, small initial water splash.` |
| `anim-wash-02` | `Glass centered in washing action, brush or jet active, chunky soap bubbles at maximum.` |
| `anim-wash-03` | `Clean glass lifted to drain, bubbles receding and mint highlight restored.` |
| `anim-cook-01` | `Raw ingredients enter the approved pan, low heat and no steam yet.` |
| `anim-cook-02` | `Pan contents tossed once, stronger flame and compact steam arc.` |
| `anim-cook-03` | `Finished hot dish lifted from pan with small cream ready sparkle.` |
| `anim-foam-01` | `Full glass with high fresh foam head.` |
| `anim-foam-02` | `Same glass, foam reduced to a thin layer, liquid unchanged.` |
| `anim-foam-03` | `Same glass, almost no foam, paler liquid and small physical yellow warning flag.` |
| `anim-chairman-01` | `Disguised chairman in humble slouched pose, no smoke.` |
| `anim-chairman-02` | `Cream smoke begins around feet and shoulders, disguise still mostly visible.` |
| `anim-chairman-03` | `Smoke at maximum; suit silhouette and confident posture partly revealed.` |
| `anim-chairman-04` | `Smoke clears; fully revealed chairman in final approved pose with restrained amber sparkle.` |
| `anim-dog-attack-lv1-01` | `Lv1 dog crouches and gathers courage before jumping.` |
| `anim-dog-attack-lv1-02` | `Lv1 dog in small forward leap, front paws extended.` |
| `anim-dog-attack-lv1-03` | `Lv1 dog lands in alert stance, no target.` |
| `anim-dog-attack-lv2-01` | `Lv2 dog lowers body into strong launch pose.` |
| `anim-dog-attack-lv2-02` | `Lv2 dog fully stretched in controlled forward leap.` |
| `anim-dog-attack-lv2-03` | `Lv2 dog lands firmly and turns alert.` |
| `anim-dog-attack-lv3-01` | `Lv3 dog coils into powerful pounce stance.` |
| `anim-dog-attack-lv3-02` | `Lv3 dog at peak pounce with broad decisive silhouette.` |
| `anim-dog-attack-lv3-03` | `Lv3 dog lands in dominant guard stance.` |
| `anim-gangster-arrive-01` | `Approved gangster silhouette just enters crop from rear edge, one foot visible.` |
| `anim-gangster-arrive-02` | `Gangster takes a heavy forward step and turns toward camera.` |
| `anim-gangster-arrive-03` | `Gangster stops in final intimidation idle pose.` |

Floating `+xu`, `+tip`, QR tip và refund là code animation với text runtime; chỉ dùng `icon-coin-inline`, `icon-supporter-heart` hoặc `icon-payment-qr`, không gen số thành bitmap.

---

## 14. Audio generation prompts

Audio không dùng ImageGen. Gen/export từng file riêng, ưu tiên `.ogg`, peak an toàn và loop sạch khi yêu cầu.

| Asset | Prompt audio |
|---|---|
| `ambient-bia-hoi.ogg` | `Create a seamless 90-second lo-fi ambient loop for a relaxed early-2000s Vietnamese bia-hoi street stall: soft nylon guitar, muted electric piano, light brushed percussion, distant street room tone, 78 BPM, warm and unobtrusive, no vocals, no recognizable melody, no sudden transients.` |
| `sfx-pour-beer.ogg` | `Create a clean 2.5-second close-up sound of bia hoi pouring from a brass tap into a thick glass, liquid stream, bubbles and foam settling, no voice or background music.` |
| `sfx-glass-clink.ogg` | `Create a bright but gentle 0.8-second clink of two thick traditional glass tumblers, one main impact and short natural decay, no voice.` |
| `sfx-wash.ogg` | `Create a 2-second sound of a thick glass being rinsed in a small inox basin: water splash, brush movement and short drain tail, no breaking glass.` |
| `sfx-coin.ogg` | `Create a compact 0.6-second reward sound: two old brass coins landing in a small enamel dish, warm and satisfying, not casino-like.` |
| `sfx-serve.ogg` | `Create a 0.7-second serving sound of an enamel snack plate placed on an inox table with a soft ceramic-metal tap, no voice.` |
| `sfx-rush-start.ogg` | `Create a 1.2-second old hand-bell and small street-stall gong cue announcing busy hour, energetic but not alarming, no modern siren.` |
| `sfx-customer-leave.ogg` | `Create a subtle 1.5-second unhappy departure cue: plastic stool scrape, two sandal footsteps and a quiet nonverbal sigh, no intelligible speech.` |
| `sfx-upgrade.ogg` | `Create a 1-second mechanical-success cue: wrench click, small brass ding and short amber sparkle tone, grounded and non-futuristic.` |
| `sfx-rain.ogg` | `Create a seamless 45-second light-to-medium rain loop on corrugated metal awning and pavement, distant street ambience, no thunder, voices or music.` |
| `ambient-gossip.ogg` | `Create a seamless 60-second old neighborhood radio/loudspeaker ambience: warm speaker hiss, distant indistinct conversational murmur and soft mono instrumental fragments, no intelligible words, announcements, copyrighted song or sudden volume change.` |

---

## 15. Production order

Gen theo thứ tự để khóa style sớm:

1. `glass-clean`, `glass-full`, `glass-half`, `chair-plastic`, `table-lv1-empty`.
2. Chọn các asset đạt chuẩn làm identity/style anchors.
3. Hoàn thiện toàn bộ glass lifecycle + menu P0 + HUD core.
4. Bàn Lv1-Lv4 và state overlays.
5. Thiết bị Lv1-Lv5 theo từng family, luôn đưa level trước làm reference.
6. Owner + customer gameplay identities + weather/action variants.
7. Customer skins, NPC, dog và UI portraits.
8. Unlock items, cosmetics, event props, system icons.
9. Background default → locations → weather overlays.
10. Event cut-ins, animation frames và audio.

Không gen 6-10 asset khác nhau trong một ảnh. “Batch” chỉ là hàng đợi nhiều call độc lập.

---

## 16. QA checklist

### 16.1 Mọi asset

- [ ] Đúng một subject/output, không contact sheet.
- [ ] Đúng filename kebab-case.
- [ ] Alpha sạch, corner transparent, không halo/key-color fringe.
- [ ] Không text, watermark, logo thật, emoji-font hoặc UI screenshot.
- [ ] Đọc được ở kích thước sử dụng nhỏ nhất.
- [ ] Outline, light direction, palette và pixel density khớp `glass-half.png`.
- [ ] Không có smartphone, flat TV, POS/tablet hoặc vật thể hiện đại ngoài ngoại lệ đã chốt.

### 16.2 Level/upgrade

- [ ] Cùng camera, anchor và family identity.
- [ ] Lv1 thô sơ; Lv3 bán chuyên; Lv5 lớn, hiệu quả và cao cấp.
- [ ] Level cao hơn thay đổi hình và năng lực nhìn thấy được, không chỉ thêm sao/glow.
- [ ] Footprint tăng hợp lý; không ép asset lớn vào 128x128.

### 16.3 State/animation

- [ ] Chỉ state hoặc pose thay đổi; geometry gốc không drift.
- [ ] Mỗi state nhận ra bằng silhouette/prop, không dựa duy nhất vào màu.
- [ ] Frame nối tiếp giữ baseline và không nhảy scale.
- [ ] Không motion blur mềm.

### 16.4 Background/UI

- [ ] Gameplay safe area trống và anchor nhất quán.
- [ ] Background không bake weather, table, customer hoặc HUD.
- [ ] UI data động vẫn là code-native.
- [ ] Raster panel dùng 9-slice, không bake chữ/nút/card hoàn chỉnh.

---

## 17. Spec gaps cần chốt trước production final

1. ✅ **Đã chốt 08/09: 9 location** (checklist §A13). Ghi chú cũ: `item-list-upgrade-levels.md` có 10 location, `F14-locations.md` có 9 location và tên khác. File này tạm dùng bộ 10.
2. **Table state:** production UI có 9 state, asset catalog cũ có 5. File này dùng 9 state và giữ bảng alias legacy.
3. **Size:** kích thước 128x128 trong catalog cũ chỉ còn áp cho icon/item nhỏ; world object dùng native footprint như §2.
4. **Referral badge IDs:** cần chốt mapping giữa `Kết Nối/Bạn Bè/Đồng Hành` và `badge-ket-noi/badge-ban-be/badge-dong-hanh` trước khi hiện label runtime.
5. **Rare glass:** reward đã xuất hiện trong feature risk/event nhưng lifecycle/naming chưa được catalog chính thức; file này đề xuất `glass-rare-chairman` làm identity anchor.

## Local sign sprite receipt — 2026-09-09

Five original sprites generated separately with built-in image_gen, one per style.
Exact prompts: docs/reference/assets-owner-2026-09-08/signboard-prompts.json. Final
project paths assets/sign-{wood,neon,vintage,calligraphy,golden}.png. Native1536×1024
RGBA retained without pixel edits; alpha ranges0–254. Owner asset boards informed
shape/style, no screenshots were cut into production art. Actual yard/shop previews
checked at360/390/1280 widths. Manifest marks these draft pending final release QA.

| Date | Change |
|---|---|
| 2026-09-09 | Added builtin business-sign prompt/output provenance and native-alpha QA evidence. |

## Local kitchen and hot dishes — 2026-09-09

Seven standalone images generated with built-in `image_gen`, one call per asset.
Exact prompts, workspace paths, output dimensions and source SHA-256:
`docs/reference/assets-owner-2026-09-08/kitchen-art.json`. Four kitchen silhouettes
show 1/2/2/3 cooking positions, following the JSON and item-list v1.5+; corrected
the stale single-burner Lv2 prompt above. Three hot plates show fried tofu with
scallions, pork cracklings and stir-fried offal with mustard greens. Original
1254×1254 RGBA bytes copied unchanged; alpha0–255, no screenshot extraction or
pixel editing. Manifest status remains draft pending final art release QA.

| Date | Change |
|---|---|
| 2026-09-09 | Added four kitchen and three hot-dish prompt/output receipts; corrected Lv2 art to two cooking positions, with no gameplay/config changes. |

## Table upgrades — 2026-09-10

Owner update 2026-09-10 10:50: PAUSE Blender asset generation. Built-in image generation is allowed for UI/game assets, following the existing style, naming, palette, camera, manifest and QA contract. Preserve completed Blender sources; no runtime/economy change.

Three standalone built-in calls produced Lv2 square inox, Lv3 long inox and Lv4 joined VIP tables. Exact prompts, unmodified source hashes, final paths/palettes and export hashes are in `reference/assets-owner-2026-09-08/table-upgrades-imagegen.json`. Although prompts requested chroma-key, the tool returned native alpha; the existing postprocessor detects and preserves it. No tool/model switch was made. `scripts/export_table_art.py` reuses the existing crop/anchor/nearest helper, then reduces texture, fixes token shades and enforces a two-native-pixel silhouette outline. Dynamic text, capacity, state and interaction remain code-rendered.

| Date | Change |
|---|---|
| 2026-09-10 | Owner authorizes imagegen for all game assets; preserved native alpha returned by the built-in tool; added three table prompts and reproducible exports. Runtime IDs unchanged; production family approval remains pending. |

| 2026-09-10 reproduction review | Table export now stages the whole batch, checks dimensions/alpha/palette and the recorded expected hashes before replacing selected sprites. It never rewrites provenance to accept drift; intentional changes need a new versioned asset/receipt. Failure regression preserves all earlier sprites, contact sheet and receipt byte-for-byte with unchanged mtimes. |


## Keg upgrades — 2026-09-10

Four standalone built-in imagegen calls supply the accepted Lv2–Lv5 idle sprites.
Exact prompts (including rejected attempts), source files/hashes and native export
hashes are in `reference/assets-owner-2026-09-08/keg-upgrades-imagegen.json`.
Lv2: small single-tap inox barrel; Lv3: wider two-tap barrel; Lv4: twin-tap pressure
tower/CO2; Lv5: four-tap industrial station. Capacity is dynamic UI, not tap count.
Lv2/4/5 retain native alpha; two Lv3 RGB checkerboard attempts were rejected, then
a flat-key regeneration used the existing Python pipeline explicitly authorized
by 11-PROMPT-PACK Part A. Only Lv3 opts into clearing enclosed key-colour holes;
there is no green material in that source. No model/tool substitution occurred.
Shared export applies the same token shade/outline/crop logic as the table batch;
old table exports must reproduce byte-for-byte. All files remain draft.

| 2026-09-10 keg imagegen | Added four level-specific sprites with exact prompts and production-size exports. Requested native transparency when possible; used documented flat-key pipeline for rejected Lv3 transparency. Runtime manifest IDs and Blender archives unchanged. |

| 2026-09-10 keg verified | Full verify PASS (389unit/server,10standard cohorts,15rush,2x30day careers);2export regressions/table reproducibility and2stock/upgrade browser checks PASS.16placeholders/108drafts. Self-reviewed asset diff; milestone independent review per ownerSteer7, no runtime registry/auth/money change. Receipt `.qa/keg-asset-verification.json`. |
