# Autopilot RUN prompts — fable5 (2026-07-05)

> Flow = **repo-gốc** (`docs/autopilot-prompt-GENERIC.md`): mỗi slice qua gate → build → **codex review
> (per-slice)** → STOP_AT_READY → **merge tay** (never auto-merge). Chạy bằng model `claude-fable-5`.
> Project path đã baked: `/Users/maingocanh/Projects/Trum Bia Hoi`.
>
> Mỗi slice có launcher riêng `/ap-<slug>` trong `.claude/commands/`. Trước khi chạy, gỡ stale lock nếu
> còn: `rmdir ".autopilot/INFLIGHT.lock" 2>/dev/null; rm -f ".git/index.lock"`.

## Task 2 — build gameplay (chạy từng slice, đúng thứ tự)

Chạy lần lượt, mỗi cái review + merge tay xong mới sang cái kế (đụng `engine-core`/`economy-balance` ⇒
tuần tự; gate tự chặn nếu chồng):

```
/ap-economy-k-tune          # kéo k 1.63 → 2.0–3.0 (P1)
/ap-engine-core-loop        # F01 thể lực + trần ngày (P1)
/ap-engine-table-order      # F03 4 cấp bàn (P1)
/ap-economy-tip-penalty     # F06 uy tín/phạt cụm (P1)
/ap-engine-rush-golden      # F08 Giờ Vàng P1/P2 (P1)
/ap-engine-upgrades-basic   # F10 nâng cấp cơ bản (P1)
/ap-engine-customer-types-3 # F07 3 loại khách (P1)
/ap-engine-weather-min      # F09 thời tiết tối giản (P2)
/ap-account-locale-login    # F25 — chạy SAU /ap-ui-art-v1 (đụng game-ui/tokens.ts)
```
Sau mỗi slice merge: `/ap-cleanup <slug>`. Slice art (`/ap-ui-art-v1`, token disjoint) chạy **song song**
được với nhóm engine — chỉ đừng để trùng lúc với `/ap-account-locale-login`.

---

## Task 1 — PNG pixel-art production (F24 / `ui-art-v1`)

Chạy bằng `/ap-ui-art-v1` (launcher đã có). **Yêu cầu năng lực:** phiên phải có **tool sinh ảnh** (MCP
image model / gpt-image / DALL·E / local SD·ComfyUI CLI / API ảnh) để ra PNG thật. Không có → nó xuất
"generation package" (`assets/generation-plan.md` + `asset-index.json`) rồi dừng, KHÔNG chế PNG giả.

Dưới đây là paste block chi tiết nếu muốn chạy thủ công thay cho launcher:
```
Project: /Users/maingocanh/Projects/Trum Bia Hoi
Model: claude-fable-5.

cd into the project. Run ONE autopilot slice `ui-art-v1` (F24 asset production) following
docs/autopilot-prompt-GENERIC.md end to end. HALT on the first breaker (§D) and report it.

CONTEXT (read first):
- docs/asset-list-designer.md  (v0.7 — §0.1 AI generation contract, §0.2 group modifiers, §0.3.D era
  modifier, §10 totals ~478, §11 naming convention, per-section asset tables)
- docs/item-list-upgrade-levels.md  (per-level stats + visual progression for all upgrade levels)
- docs/design-tokens.md  (v1.0 palette — the ONLY source of hex)
- prototype/src/ui/pixiAssets.ts, icons.tsx, tokens.ts  (current placeholder render)

PRE-FLIGHT (§A): confirm docs/autopilot-manifests/ui-art-v1.json; git fetch; base_ref master exists.
GATE (§A.3.1): scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/ui-art-v1.json
WORKTREE after PASS: git worktree add .autopilot/worktrees/ui-art-v1 -b feat/ui-art-v1 master

DELIVERABLE 1 (always, no image tool needed): write assets/generation-plan.md — for EVERY asset in
docs/asset-list-designer.md (priority order §10 "Ưu tiên vẽ Phase 0 → P1"): final filename per §11,
target path prototype/public/assets/<group>/<name>.png, the COMPLETE text-to-image prompt = global prefix
(§0.1) + filled per-asset template (§0.1) + group modifier (§0.2) + era modifier (§0.3.D) + §0.3.B
morphology overrides, variant/state notes, §0.1 QA criteria. Batch 6–10 per group. Also write
assets/asset-index.json mapping asset-name -> {path, group, size, states[]}.

DELIVERABLE 2 (only if an image-gen tool exists): process the plan in batch order — generate -> crop to
true alpha -> resize nearest-neighbor 128x128 centered 10–14px padding -> export to
prototype/public/assets/<group>/<name>.png; after each batch pick a style winner as reference for the
next (§0.1); run the §0.1 QA checklist and regen failures. If NO image tool: STOP after Deliverable 1,
report the missing capability, do NOT fabricate PNGs.

WIRE-UP: add a PNG loader to pixiAssets.ts (Pixi Assets.load keyed by asset-index.json) with graceful
fallback to the existing code-drawn placeholder when a PNG is absent. Do NOT touch engine types/logic —
assets-binding + game-ui scope only. Keep tokens.ts hex bound to design-tokens.md.

VERIFY (§B.3): cd prototype && npm run build (must be clean; missing PNGs fall back, never crash).
REVIEW + STOP_AT_READY (§B.4–B.5): git diff --name-only master...HEAD ⊆ scope; codex 1x_clean;
scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/ui-art-v1.json; then STOP.
Report #assets planned vs #PNGs produced (by group), build + codex verdict, and — if the image tool was
missing — say so plainly. Do NOT merge (manual_only).
```

---

## Sau khi merge một slice
```
/ap-cleanup <slug>     # release reservation + remove worktree (GENERIC §C2)
```
Toàn bộ slice là **P1 manual_only / auto_merge:false** (trừ F09/F24 = P2) — **con người merge**, không
auto-merge. P0 (F21 xổ số, F26 payment) KHÔNG autopilot.
