# Quy trình mở rộng cho Game Canvas / Real-Time

> **Loại:** Extension - đắp thêm lên [`current-workflow.md`](current-workflow.md) và [`web-app-extended-workflow.md`](web-app-extended-workflow.md). KHÔNG thay thế hai doc gốc.
> **Ngày:** 2026-06-03 - **Template v1.1** (fold: colorblind palette §13, review-cap/token note §1, visual-regression≠smoke §8/§19/§22)
> **Dùng khi:** sản phẩm là game render bằng canvas/WebGL real-time (PixiJS, Phaser, Three.js...), có gameplay loop, level/content, economy/progression, hoặc pipeline asset bằng AI.

Doc này là bản merge giữa workflow game canvas/realtime và workflow game design/assets. Nó giữ xương sống của workflow hiện tại: spec-first, cross-model review, risk-tier, CI gate, design loop, product loop; đồng thời thêm phần game-specific: game feel, deterministic replay, canvas visual QA, performance runtime, playtest, asset manifest, AI asset batch, level/content, balance.

---

## 0. Vì sao cần bản này

`web-app-extended-workflow.md` đóng đúng 5 mảng mà SaaS-base thiếu: design loop, FE test, product loop, rollout, perf budget. Nhưng nó vẫn giả định UI là DOM. Game canvas/WebGL khác ở các điểm quan trọng:

| Giả định của web/app extension | Thực tế của game canvas |
|--------------------------------|--------------------------|
| Test render component DOM bằng Testing Library/axe | Canvas mờ đục với DOM tooling; cần state hook, screenshot, pixel check |
| Perf = web-vitals như LCP/INP/CLS | Perf = FPS, frame-time, memory qua session dài, asset-load |
| a11y WCAG cho mọi surface | Gameplay canvas gần như N/A; menu/HUD DOM vẫn phải kiểm |
| Product loop chủ yếu định lượng | "Có vui không" cần playtest định tính, analytics chưa đủ |
| Logic deterministic ngầm định | Game có RNG + time loop; determinism phải thiết kế và test |
| Asset là phụ trợ | Với game, asset/content là production pipeline chính |

Nguyên tắc chính: **prototype-first cho feel, spec-first cho logic/contract, asset-direction-first cho visual/audio.**

---

## 1. Tổng Quan Flow Game

```text
Game Pillars -> Grey-box Prototype -> Playtest -> Game Spec
             -> Asset Direction -> Asset Batch -> Integration
             -> Verify (tests + replay + canvas smoke + perf)
             -> Cross-model Review -> Balance Pass -> Release/Observe -> Retrospective
```

Áp dụng theo lane để không dùng cùng nghi lễ cho mọi thay đổi:

| Lane | Dùng cho | Review cap | Bắt buộc |
|------|----------|------------|----------|
| **Prototype Lane** | Tìm core feel, quick level, throwaway experiment | 1-2 round | Playable build, playtest note, keep/kill decision |
| **Fast Game Lane** | Cosmetic asset, particle, SFX, balance constants nhỏ | Tối đa 2 | Screenshot/canvas smoke, asset manifest nếu có asset |
| **Standard Game Lane** | Gameplay feature, UI/HUD screen, level/content pack | Tối đa 5 | Spec, tests, smoke play, replay nếu chạm gameplay |
| **Foundation Game Lane** | Save format, economy, monetization, anti-cheat, realtime/network, asset pipeline | Tối đa 8 | RFC, risk review, migration/backward compatibility, manual sign-off |

Prototype cần học nhanh. Foundation cần chậm và chắc. Nếu review loop kéo dài mà vẫn xoay quanh cùng một vùng, dừng lại để split, revert-to-lean, hoặc đổi thiết kế.

> **Nối với flow review hiện tại (token-cost):** dùng review-cap theo lane để **cắt bớt số vòng review thừa** (vd ~5 vòng gemini/artifact của flow gốc) cho thay đổi rủi ro thấp. Dồn ngân sách token đó sang **playtest + canvas visual QA** — nơi rủi ro thật của game nằm, không phải ở vòng review code thứ 5. Vòng review thứ 4-5 thường chỉ ra nits; hãy log "vòng nào còn bắt được bug nghiêm trọng" để biết cap đúng cho từng lane.

---

## 2. Game Design Source Of Truth

Mỗi game nên có file song song với spec kỹ thuật:

```text
docs/game-design.md
```

Nó là source-of-truth cho trải nghiệm, không phải implementation. Tối thiểu gồm:

| Mục | Nội dung |
|-----|----------|
| **Fantasy / promise** | Người chơi đang sống cảm giác gì? |
| **Player goal** | Mục tiêu mỗi session, mỗi run, mỗi level là gì? |
| **Core loop** | Action -> feedback -> reward -> upgrade/unlock -> quay lại action |
| **Controls** | Input, latency expectation, keyboard/touch/mouse |
| **Win/lose/fail states** | Điều kiện thắng, thua, retry, quit |
| **Progression** | Level, unlock, economy, reward cadence |
| **Difficulty curve** | Easy ramp, skill check, spike, recovery |
| **Session shape** | Session dài bao lâu, 15s đầu làm gì, lý do chơi lại |
| **Content taxonomy** | Level, enemy, item, skin, sound, dialogue, map |
| **Non-goals** | Điều không build bây giờ, để tránh AI mở rộng scope |

**Rule:** Nếu feature gameplay mâu thuẫn `docs/game-design.md`, dừng lại và sửa game design trước. Không để AI tự cân bằng gameplay theo cảm tính.

---

## 3. Game-Feel Loop

Giữ nguyên "design-first cho surface, spec-first cho logic" từ web/app workflow, nhưng với game, design gồm cả game feel. Feel không lock được bằng Figma tĩnh.

```text
Idea -> Discovery (player JTBD: họ chơi để thấy gì?)
     -> Paper/grey-box prototype
     -> Playable prototype với đồ họa tạm
     -> Feel review
     -> Lock core loop
     -> Asset spec + game spec
```

Nguyên tắc:

- **Prototype phải chơi được, không chỉ xem được.** Timing, juice, feedback, độ khó chỉ kiểm chứng bằng input thật.
- **Tách feel khỏi skin.** Grey-box để chốt cơ chế; asset đẹp đắp sau. Tránh bẫy asset AI đẹp che mất core loop nhạt.
- **Brainstorm thêm game-designer-skeptic.** Hỏi: core loop 10 giây đầu là gì, reward đến lúc nào, vì sao người chơi quay lại phiên sau.
- **Playable before perfect.** Nếu 60s đầu chưa vui, dừng gold-plate architecture.

---

## 4. RFC Cho Gameplay Phức Tạp

Dùng RFC trước spec khi thay đổi ảnh hưởng đến:

- core loop;
- RNG/determinism;
- save/load;
- economy/reward;
- monetization;
- multiplayer/realtime;
- level generation;
- AI behavior;
- content pipeline;
- asset direction toàn game.

Template RFC:

```md
# RFC: <tên>

## Problem
Người chơi / production đang gặp vấn đề gì?

## Constraints
Engine, platform, performance, content, asset, timeline, scope.

## Options
1. Option A - tradeoff
2. Option B - tradeoff
3. Option C - tradeoff

## Recommendation
Chọn gì, vì sao, không chọn gì.

## Risks
Balance, UX, tech debt, asset load, save compatibility.

## Validation
Playtest nào, replay test nào, metric nào, gate nào.
```

RFC = **Request for Comments**. Sau khi chốt mới chuyển thành feature spec.

---

## 5. Vòng Đời 1 Feature Game

| Bước | Nội dung |
|------|----------|
| **0** | Brainstorm nếu chưa rõ: CTO-skeptic + UX-skeptic + game-designer-skeptic. Output là game/design spec, không code. |
| **0.5** | Nếu là mechanic mới: dựng prototype nhỏ trước. Mục tiêu là cảm giác chơi, không phải code đẹp. |
| **1** | Đọc `game-design.md`, feature spec, tech spec, asset direction. Gap -> dừng, update spec. |
| **2** | Test/play plan: unit, replay, integration, E2E, canvas smoke, perf, asset manifest. |
| **3** | Plan ngắn: files, state changes, tests, assets, save/migration risk. |
| **4** | Code + test cùng session. Logic gameplay nên tách khỏi rendering để unit/replay test được. |
| **5** | Generate/tích hợp assets theo manifest, không copy asset rồi quên provenance. |
| **6** | Verify: lint/type/build/test, replay, smoke play, canvas render, asset missing check. |
| **7** | Cross-model review: correctness, gameplay edge cases, perf, asset consistency, save compatibility. |
| **8** | Fix -> mini-review trên diff -> test/smoke lại. Dừng theo review cap của lane. |
| **9** | Balance pass: playtest nhanh, note cảm giác, sửa constants/data nếu cần. |
| **10** | Update changelog/spec/asset manifest/tracking plan. |
| **11** | Merge/release/observe. Feature lớn bật bằng flag hoặc internal build trước. |

Definition of Done cho gameplay feature:

- spec và game design được update;
- tests và build pass;
- replay test pass nếu chạm gameplay logic;
- play smoke pass trên ít nhất 2 viewport/thiết bị chính;
- không asset missing, không console error;
- performance không vượt budget;
- có playtest note hoặc metric để quyết định giữ/sửa.

---

## 6. Game Testing

`web-app-extended-workflow.md §3` giả định DOM. Với canvas, swap như sau:

| Tầng web/app | Swap cho game | Bắt gì |
|--------------|---------------|--------|
| Component test DOM | **Game logic/state unit test** | Luật chơi, scoring, state machine, collision, economy |
| E2E DOM selector | **E2E qua game-state hook** + Playwright drive input | Vào game -> chơi -> thắng/thua -> lưu điểm |
| Visual regression DOM | **Canvas screenshot diff** với seed cố định | Sprite lệch, effect vỡ, HUD sai |
| a11y axe DOM | **Chỉ áp cho menu/HUD DOM** | Contrast, keyboard, focus cho UI bao quanh |
| Cross-browser/device | Giữ nguyên + kiểm WebGL/WebGPU context | Safari iOS, DPR scale, touch input, context lost |
| Không có tương đương | **Determinism/replay test** | Cùng seed + input -> cùng state cuối |
| Không có tương đương | **Asset manifest check** | Missing/orphan asset, status, size budget, prompt provenance |

Khuyến nghị cho web/PixiJS:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:assets
```

---

## 7. Determinism / Replay Test

Game có RNG + vòng lặp thời gian nên bug "thỉnh thoảng mới ra" rất khó bắt bằng review code.

Quy tắc:

- **RNG phải seedable.** Không dùng `Math.random()` trực tiếp trong gameplay logic.
- **Replay test mandatory cho feature chạm gameplay logic.** Ghi lại seed + chuỗi input theo frame/tick -> chạy lại trong CI -> assert state cuối khớp.
- **Tách logic khỏi render.** Gameplay tick nên thuần, không phụ thuộc PixiJS/Phaser/Three để test headless nhanh.
- **Render layer mỏng.** Kiểm bằng screenshot diff/canvas smoke thay vì nhồi hết logic vào scene object.

Đây là gate tương đương "tenant isolation test" của game. Không có replay test cho core gameplay thì không merge.

---

## 8. Canvas / WebGL QA

Canvas visual QA cần kiểm bằng runtime thật:

| Gate | Bắt gì |
|------|--------|
| **Canvas nonblank** | Scene có pixel khác background sau khi load |
| **Frame delta smoke** | Sau vài frame/tick, state/render thay đổi đúng kỳ vọng |
| **Screenshot diff** | Seed cố định, DPR cố định, environment khóa |
| **WebGL context check** | Không fail khi mất/khôi phục context |
| **Resize/DPR check** | Canvas scale đúng desktop/mobile/retina |
| **Input smoke** | Keyboard/mouse/touch đổi state gameplay |
| **Audio smoke** | Sound/music load được, mute/pause/resume không lỗi |

**Lưu ý: screenshot diff (visual regression) ≠ canvas smoke.** Canvas nonblank + frame delta chỉ chứng minh *có render gì đó và state đổi* — chúng **vẫn pass khi render SAI so với baseline** (sprite lệch 3px, HUD đổi layout, effect vỡ). Chỉ screenshot diff so với **baseline đã duyệt** mới bắt được regression hình ảnh ngoài ý muốn; diff cần người duyệt (giống Codex finding cần resolve), không auto-accept baseline mới.

Lưu ý flaky: canvas diff nhạy với GPU/font. Nếu chạy trong CI, khóa Chromium/Playwright version, DPR=1, seed cố định, tránh phụ thuộc time thực. Nếu vẫn flaky, đặt ngưỡng pixel-diff tolerance nhỏ thay vì so tuyệt đối.

---

## 9. Performance Budget Cho Game

Web-vitals như LCP/INP/CLS chỉ giữ cho landing/menu DOM. Màn chơi cần budget riêng:

| Chỉ số | Mục tiêu tham khảo | Vì sao |
|--------|--------------------|--------|
| **First playable** | < 2s desktop, < 5s mobile | Load chậm làm rơi người chơi trước khi game bắt đầu |
| **FPS** | >= 60 ổn định, >= 30 là sàn tuyệt đối | Giật là mất feel ngay |
| **Frame-time p95** | < 16.7ms ở 60fps | Spike khung hình lộ rõ hơn FPS trung bình |
| **Memory qua session dài** | Không tăng tuyến tính qua session dài | Game chơi lâu; leak làm crash tab mobile |
| **Initial bundle/asset load** | Đặt ngưỡng KB cụ thể theo project | Asset AI-gen dễ phình |
| **Draw calls / texture memory** | Đặt trần theo target device | Mobile GPU yếu là điểm gãy |
| **Input latency** | Control phản hồi gần như tức thì | Delay nhỏ phá cảm giác điều khiển |

Quy tắc:

- Có benchmark scene cố định để đo FPS/frame-time/memory.
- Asset budget là một phần perf budget: size, format, atlas, lazy-load.
- Nếu vượt budget, PR phải ghi rõ vì sao chấp nhận, thiết bị/viewport đã test, tối ưu nào defer, rollback/kill-switch nếu live.

---

## 10. Risk-Tier Cho Game

Kế thừa P0-P2 của `current-workflow.md` + UI blast radius của `web-app-extended-workflow.md`. Thêm chiều gameplay blast radius:

| Thay đổi | Tier gợi ý | Gate chính |
|----------|------------|------------|
| Cosmetic asset, particle, âm thanh | Fast/P2 | Asset manifest, canvas/screenshot diff |
| Balance constant nhỏ, không đổi save/API | Fast/P2 | Playtest note, replay/smoke pass |
| Gameplay mechanic, RNG, state machine | P1+ | Spec, replay test, playtest, cross-model review |
| Economy/reward/progression | P1+ | RFC nếu phức tạp, metrics, playtest, migration review |
| Save-game schema/migration | P0-like | Manual, backup/migration path, backward compatibility |
| Multiplayer/realtime/anti-cheat | P1/Foundation | Threat/race review, deterministic tests, manual sign-off |
| Asset pipeline/tooling dùng cho hàng loạt | Foundation | RFC, manifest validation, rollback path |

Auto-merge chỉ nên opt-in cho P2 mature đã chứng minh. Save-game migration và economy destructive không auto-merge.

---

## 11. Quality Gates Mở Rộng

Thêm/sửa so với web/app extension:

```text
[giữ] lint · format · type-check · backend test
MOD component test DOM      -> game-logic/state unit test
MOD E2E DOM flow            -> E2E qua game-state hook
MOD visual regression DOM   -> canvas screenshot diff
MOD a11y gate               -> chỉ áp cho menu/HUD DOM
MOD perf budget web-vitals  -> FPS / frame-time / memory / asset budget
ADD determinism/replay test -> mandatory cho feature gameplay
ADD asset-manifest check    -> seed/prompt/version/status/size đầy đủ
ADD content validator       -> level/content data hợp lệ
```

Minimum local verify cho feature gameplay:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:assets
```

Nếu repo chưa có đủ scripts, spec/plan phải ghi script nào sẽ được thêm hoặc lý do tạm defer.

---

## 12. Game Telemetry + Playtest Loop

Giữ nguyên "instrument trước khi code, success metric trong spec", nhưng đổi metric sang dạng game và thêm nhánh định tính.

Metric định lượng:

- retention D1 / D7 / D30;
- session length;
- số session/ngày;
- level start/complete/fail/drop-off;
- retry/quit point;
- resource earn/spend;
- monetization nếu có: conversion, ARPDAU, friction trước mua;
- guardrail: không hi sinh retention để tăng monetization ngắn hạn.

Tracking plan tối thiểu:

| Event | Khi nào fire |
|-------|--------------|
| `game_start` | Bắt đầu session/run |
| `tutorial_step_complete` | Qua mỗi step tutorial |
| `level_start` / `level_complete` / `level_fail` | Level flow |
| `item_earned` / `item_spent` | Economy |
| `retry` / `quit` | Friction/drop-off |
| `performance_warning` | FPS/load vượt threshold local |

Playtest loop:

```text
Build -> Playtest có cấu trúc (3-5 người, quan sát im lặng)
      -> Ghi nhận: chỗ bối rối / chỗ chán / chỗ "à há"
      -> Phân biệt khó tốt vs khó chịu
      -> Feed vào spec/balance/content backlog
```

Analytics nói người chơi rớt ở đâu. Playtest nói vì sao không vui. Cần cả hai.

---

## 13. Asset Direction

Tạo source-of-truth:

```text
docs/assets/art-direction.md
docs/assets/audio-direction.md
docs/assets/asset-manifest.json
```

### `art-direction.md`

Tối thiểu gồm:

- visual pillars: 3-5 tính từ/luật, ví dụ "vui, rõ silhouette, ít chi tiết, màu ấm";
- camera/perspective: top-down, isometric, side-view, UI icon;
- line/shape language;
- palette và contrast rules;
- **colorblind-safe palette:** không phân biệt enemy/item/team/danger chỉ bằng cặp đỏ-xanh; luôn kèm shape/icon/pattern hoặc khác biệt độ sáng. Đây là a11y *game-specific* — bắt ngay từ art direction, không sửa sau khi đã đổ asset;
- lighting/shadow;
- độ phân giải gốc và export size;
- background transparency rule;
- forbidden styles: những thứ AI hay sinh sai;
- reference assets đã approve.

### `audio-direction.md`

Tối thiểu gồm:

- mood và genre;
- tempo/BPM range;
- loop length;
- SFX categories;
- loudness target;
- format/export;
- mute/pause/resume rules;
- forbidden sounds hoặc tần số gây mỏi.

Asset prompt phải bám direction doc. Nếu cần đổi style, update direction trước rồi regenerate có chủ đích.

---

## 14. Asset Manifest

Mỗi asset sinh bởi AI hoặc lấy từ ngoài cần có manifest. Không để asset vô chủ.

Ví dụ:

```json
{
  "id": "npc_beer_vendor_idle_v1",
  "type": "sprite",
  "path": "assets/sprites/npc/beer_vendor_idle_v1.png",
  "source": "ai_generated",
  "model": "gemini-2.5-flash-image-preview",
  "tool": "custom-batch-script",
  "prompt_file": "docs/assets/prompts/npc_beer_vendor_idle_v1.md",
  "seed": "12345",
  "created_at": "2026-06-03",
  "license_note": "Generated asset; verify provider terms before commercial release.",
  "dimensions": [512, 512],
  "transparent_background": true,
  "usage": ["scene:market", "state:idle"],
  "status": "approved",
  "review_notes": "Readable silhouette at 64px scale."
}
```

Trạng thái gợi ý:

| Status | Nghĩa |
|--------|-------|
| `draft` | Mới sinh, chưa review |
| `approved` | Được dùng trong build |
| `needs_regen` | Ý tưởng đúng nhưng asset chưa đạt |
| `deprecated` | Không dùng nữa, giữ để compatibility/reference |
| `blocked_license` | Chưa rõ terms/license, không ship |

Manifest check nên fail nếu:

- file trong code nhưng không có manifest;
- manifest trỏ tới file không tồn tại;
- asset `draft`/`blocked_license` được ship production;
- image/audio vượt size budget mà không có lý do;
- prompt file thiếu với asset AI;
- asset approved bị overwrite nhưng manifest không đổi version.

---

## 15. AI Asset Batch Workflow

```text
Asset Request -> Prompt Sheet -> Generate Batch -> Contact Sheet
              -> Human/AI Review -> Select -> Normalize -> Integrate
              -> Manifest -> In-game Visual QA -> Approve
```

### 15.1 Asset request

Mỗi request nên có:

- asset id;
- gameplay use;
- exact size/dimensions;
- animation states nếu có;
- background/alpha;
- style constraints;
- negative prompt;
- acceptance criteria;
- budget: size, atlas, load priority.

### 15.2 Prompt sheet

Lưu prompt theo file:

```text
docs/assets/prompts/<asset-id>.md
```

Không chỉ lưu prompt cuối. Nếu iterate, ghi:

- version;
- model;
- seed;
- what changed;
- why rejected/approved.

### 15.3 Contact sheet review

Mỗi batch nên xuất contact sheet để review nhanh:

| Tiêu chí | Câu hỏi |
|----------|---------|
| Silhouette | Đọc được ở kích thước in-game nhỏ nhất không? |
| Style fit | Có nằm trong art direction không? |
| Gameplay readability | Có nhầm với enemy/item/UI khác không? |
| Animation-ready | Có dễ cắt frame/rig không? |
| Technical fit | Đúng alpha, size, padding, format? |
| Budget fit | Có vượt texture/load budget không? |
| Legal/terms | Có được dùng cho mục tiêu release không? |

### 15.4 Normalize/export

Sau khi chọn:

- crop/pad theo grid;
- scale đúng kích thước;
- remove background nếu cần;
- optimize PNG/WebP/OGG/MP3;
- tạo atlas nếu dùng spritesheet;
- update manifest;
- chạy game để xem trong context thật.

---

## 16. Asset Naming Và Folder Convention

Để dễ automate:

```text
assets/
  sprites/
    characters/<id>_<state>_v01.png
    items/<id>_v01.png
    effects/<id>_<state>_v01.png
  audio/
    music/<id>_loop_v01.ogg
    sfx/<category>/<id>_v01.wav
  ui/
    icons/<id>_v01.png
  atlases/
    <pack>_v01.json
    <pack>_v01.png
docs/assets/
  art-direction.md
  audio-direction.md
  asset-manifest.json
  prompts/
  contact-sheets/
```

Naming:

- lowercase;
- snake_case;
- version rõ ràng `v01`, `v02`;
- không dùng tên chung chung như `image1.png`, `new_sound.wav`;
- không overwrite asset approved nếu chưa có ý định migration.

---

## 17. Level / Content Workflow

Nếu game có level/content data, xem content như code:

```text
Level Idea -> Level Spec -> Data File -> Automated Validate -> Playtest -> Balance Notes -> Approve
```

Mỗi level/content pack nên có:

- objective;
- expected difficulty;
- target session length;
- main mechanic taught/tested;
- required assets;
- reward;
- estimated completion;
- fail/retry behavior;
- known cheese/exploit.

Automated validator nên bắt:

- missing asset;
- invalid spawn id;
- impossible objective;
- economy reward âm/vô hạn;
- duplicate ids;
- unreachable tile/zone nếu có map graph;
- level không có exit/win condition.

---

## 18. Balance Và Tuning

Dùng data constants/config cho tuning, tránh hardcode trong render/input code.

```text
src/game/config/
  balance.ts
  economy.ts
  levels/*.json
```

Balance change có thể ở Fast Lane nếu:

- chỉ sửa data/constants;
- có playtest note;
- không đổi save format/API;
- tests/smoke pass.

Balance change lên Standard/Foundation nếu:

- đổi reward formula;
- đổi progression unlock;
- ảnh hưởng monetization;
- có migration save;
- làm mất item/currency của người chơi.

---

## 19. Review Rubric Cho Game

Cross-model review nên có prompt/rubric rõ, không chỉ "review code":

```md
Review theo thứ tự:
1. Functional correctness: bug logic, race, invalid state.
2. Determinism/replay: RNG, tick timing, seed, input sequence.
3. Gameplay edge cases: spam input, pause/resume, retry, death, level restart.
4. Save/load/backward compatibility.
5. Performance: allocations, texture churn, ticker leaks, event listeners, audio leaks.
6. Asset integration: missing asset, wrong scale, alpha, atlas key, preload.
7. UX/readability: feedback, timing, affordance, text overflow, mobile input.
8. Tests: unit/sim/e2e/canvas smoke/visual regression có bắt đúng rủi ro không.
9. Scope: có gold-plate hoặc rewrite vượt spec không.
```

Bug fix sau review chỉ nên sửa đúng region liên quan. Nếu cùng một vùng bị patch quá nhiều vòng, dừng lại: split, revert-to-lean, hoặc đổi thiết kế.

---

## 20. Release Và Observe

Với game đang live:

- feature lớn merge sau flag off;
- internal build trước;
- canary nếu có user thật;
- rollback trigger viết trước;
- telemetry event viết trong spec;
- asset license/terms check trước production.

Definition of Done sau release:

- metrics không xấu hơn guardrail;
- crash/error rate ổn;
- feedback/playtest notes đã synthesize;
- next balance/content tasks được tạo nếu cần.

---

## 21. Điều Chỉnh Theo Giai Đoạn

| Giai đoạn | Tối ưu cho | Có thể nới | Không nên nới |
|-----------|------------|------------|---------------|
| **Tìm-the-fun / pre-fun** | Chứng minh core loop vui | Docs nhẹ, asset draft, visual regression, cross-browser | Playable prototype, playtest, build pass, keep/kill decision |
| **Vertical slice** | Trải nghiệm end-to-end | Một số automation nặng | Asset direction, manifest, replay, perf, tutorial flow |
| **Post-fun / production** | Regression và polish | Ít thứ | CI, e2e, screenshot diff, perf budget, save compatibility, license |
| **Live** | Stability + retention | Gần như không nới phần critical | Telemetry, rollback, economy safety, content validator |

Quy trình phục vụ ship game vui. Nếu quy trình làm chậm việc tìm fun trong prototype, giảm nghi lễ. Nếu đã live, đừng hy sinh gate để ship nhanh.

---

## 22. Hard Rules Cho Game Sessions

1. **Playable before perfect.** Prototype mechanic phải chơi được sớm; nếu 60s đầu chưa vui, dừng gold-plate architecture.
2. **Spec-first for logic, prototype-first for feel.** Logic/API/save cần spec; timing/feel có thể prototype và playtest trước.
3. **Replay test for gameplay logic.** RNG trong gameplay cần seed/replay hook.
4. **Asset manifest mandatory.** Asset không provenance thì không ship.
5. **No silent asset replacement.** Không overwrite asset approved nếu không update manifest và visual QA.
6. **Game logic separate from rendering where practical.** Để unit/simulation/replay test được.
7. **Canvas smoke + screenshot diff mandatory for rendering changes.** Smoke chứng minh có render; screenshot diff so baseline để bắt regression hình ảnh. Không chỉ nhìn tay mỗi lần.
8. **Review cap by lane.** Không loop review vô hạn.
9. **Performance is a gate.** Jank/stutter là bug gameplay, không phải polish.
10. **Fun needs evidence.** Gameplay change lớn cần playtest note hoặc metric, không chỉ "tests pass".

---

## 23. Skills Hữu Ích Nếu Dùng Claude/Cowork

| Giai đoạn | Skill |
|-----------|-------|
| Discovery / player research | `design:user-research`, `design:research-synthesis` |
| Playtest synthesis | `product-management:synthesize-research`, `design:research-synthesis` |
| Menu/HUD a11y | `design:accessibility-review` |
| Spec | `product-management:write-spec` |
| Telemetry review | `product-management:metrics-review` |
| Asset tạo art tĩnh | `canvas-design`, `algorithmic-art` |
