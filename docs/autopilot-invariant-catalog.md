# Autopilot — invariant catalog (canonical domain tokens) — Trum Bia Hoi

> Scope-gate đọc file này để validate `invariants:` của mỗi manifest. Token lạ → **HALT INVARIANT_UNKNOWN**.
> 1 token = 1 khái niệm domain (KHÔNG phải 1 file). Hai feature share token → chạy **tuần tự**.

## Quy tắc
- Chọn token TỪ danh sách dưới. Cần khái niệm mới → **thêm 1 dòng vào block `catalog` trước**, rồi mới dùng.
- Token nằm giữa hai marker `catalog:start` và `catalog:end` ở cuối file; mỗi dòng = `token - mô tả`.
  Script chỉ lấy phần trước ` - `. Đừng đổi 2 marker. Token = `[a-z][a-z0-9_-]*`.

## Bản đồ repo (tham chiếu khi đặt scope/invariants)
- **Game prototype** (`prototype/`, TS · Vite+Pixi+React) — verify: `cd prototype && npm run build` (tsc + vite); sim: `npm run sim`.
  - `src/engine/` engine.ts·types.ts·constants.ts·rng.ts·metrics.ts — core mô phỏng + economy + rng + đo k.
  - `src/ui/` App.tsx·GameView.ts·components.tsx·icons.tsx·pixiAssets.ts·tokens.ts — render Pixi/React.
  - `src/sim/headless.ts` — harness chạy bot đo k.
- **Dashboard-engine** (`tools/dashboard-engine/`, Python) — event engine + status machine + signal collectors.
- **Design docs** (`*.md` ở root: GDD, SPEC, economy-spec, ROADMAP) — nguồn rule game.

## Canonical tokens

<!-- catalog:start -->
workflow-authority - task contract and Level 3 operating-policy changes
kit-integrity - shared scripts, templates, versions and consumer rollout
risk-policy - action/surface risk derivation and autonomy lane
terminal-lifecycle - READY/AWAIT/HALT, recovery and cleanup
review-integrity - independent review, breaker and readiness evidence
delegation-safety - worktree, writer ownership and child-agent boundaries
audit-integrity - task evidence, provenance and learning history
merge-authority - landing and optional separately-authorized automation
engine-core - prototype/src/engine engine.ts+types.ts: state machine ca/bàn/order, serve/pour/wash (choke-point chính)
economy-balance - engine/constants.ts + engine/metrics.ts + economy-spec: số cân bằng, demand-mix, chỉ số k (đụng = lệch balance)
rng-determinism - engine/rng.ts + SEED: random tất định cho sim/reproducibility (đổi = vỡ kết quả đo)
sim-harness - prototype/src/sim/headless.ts + scripts/measure_k.py: pipeline chạy bot + đo lường
game-ui - prototype/src/ui/* : render Pixi + React, GameView, components, layout
assets-binding - pixiAssets.ts + icons.tsx + tokens.ts + assets/: nạp/route asset hình ảnh
build-config - prototype/package.json · package-lock · tsconfig.json · vite.config.ts
dashboard-engine - tools/dashboard-engine/** : work-state engine, status machine, signal collectors (Python)
scripts-py - scripts/*.py : tooling Python ngoài prototype (measure_k, dashboard)
design-docs - *.md ở root (GDD/SPEC/economy-spec/ROADMAP): rule & spec game
<!-- catalog:end -->
