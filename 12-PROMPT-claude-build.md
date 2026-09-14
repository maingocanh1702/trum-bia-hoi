# 🚀 PROMPT — Claude builds Trùm Bia Hơi, Codex reviews (v1.0)

> **Cách dùng (chủ dự án):** mở Claude Code tại gốc repo (`main` đã có đủ docs 08/09), dán nguyên **Phần 1**. Claude tự quyết quy trình build; sau mỗi slice Claude tự gọi **Codex review** bằng `codex exec review` với instruction ở **Phần 2** (file `docs/prompts/codex-review.md`, pipe qua stdin). Không có Level 3, không scope gate, không worktree bắt buộc — chỉ có **ràng buộc kết quả** + **review độc lập**.
> Ngày: 2026-09-08. Nguồn ràng buộc: `00-HANDOFF` v1.14 §4/§6, `11-PROMPT-PACK` v1.14 Phần B. Prompt viết tiếng Anh để dán thẳng.

---

## PHẦN 1 — Kickoff prompt (paste into Claude Code at the repo root)

```text
ROLE
You are the lead engineer building "Trùm Bia Hơi" — a free-to-play mobile-first web game:
serve customers in 12-minute shifts at a Hanoi sidewalk draft-beer stall (2000s), five economy
layers (unit · throughput · demand-mix · risk · meta), table groups served in one tap, beer that
goes flat 12 s after pouring. You ship the COMPLETE game in one phase (milestones M0–M9), in this
repo, and you decide how to work. An independent Codex review gates every slice.

READ FIRST (in this order, then start — do not ask the owner to re-explain the docs)
1. 00-HANDOFF-trum-bia-hoi.md            — entry point: scope §4, binding constraints §6, glossary §5
2. 11-PROMPT-PACK-designer-blender-dev.md — Part B "WHAT IS BINDING" is the contract; Part A tells you
                                            what assets the designer will deliver (use placeholders until then)
3. 02-GDD-trum-bia-hoi.md + 03-SPEC-he-ban.md — game rules (table/order/customer state machine)
4. 08-SPEC-economy-constants.md + docs/config/economy.tbh.json — every number (JSON wins)
5. 06-ROADMAP-trum-bia-hoi.md §"Lộ trình 1 phase" — milestones M0–M9 with exit criteria
6. 10-SPEC-tech-implementation.md §1/§5/§7/§9/§10/§13 — engine purity, config service, storage order, DoD
7. docs/features/F07–F28 (README is the index) · docs/reference/ (owner's layout references)
   · docs/TRANG-THAI-DOCS.md (latest state + what is still pending)
Everything else in the repo is reference or archive. prototype/ is ARCHIVED: do not inherit code,
layout or screens from it (read it only to see how k was measured).

BINDING (outcomes — everything not listed here is your call)
1. Rules come from GDD + 03-SPEC. Serve the whole table in one tap via a table-level order
   popover/bubble (03-SPEC §9.5); the four serve outcomes are visually distinct.
2. Numbers come ONLY from docs/config/economy.tbh.json through a config loader. No business
   literal in code (`// config-exempt: <reason>` for the rare non-economy number). New number →
   add key to JSON + classify in _meta.governance.tiers + row in 08-SPEC §22. `npm run
   check:config` at the repo root must stay green; point scripts/check_*.py at your engine at M0.
3. k invariant: k = mean(payment + tip) / 82.5 over ≥ 500 served orders, throughput never enters
   k (04-SPEC §5). Keep a headless sim over fixed seeds; k must stay in 2.0–3.0.
4. Engine purity: rules live in a pure package with no DOM/renderer imports, one seedable RNG,
   time passed in (never Date.now() inside). UI holds no rules.
5. Storage order: localStorage FIRST (versioned + migrate), server-authoritative at M4. From day
   one every mutation goes through an append-only event log with the shared event schema,
   idempotencyKey and per-shift configVersion, so moving to the server is swapping the SaveStore
   adapter. Once the server exists it is authoritative (replay, anti-cheat, reconnect per F23 §8).
6. FREE-TO-PLAY end to end: no session pass, no paywall, nothing sold for money. The only
   monetization is voluntary donation to the admin (F20), cosmetic thank-you only, soft prompts.
7. Onboarding per F27: guests play without signing up; Google sign-in is encouraged and signing
   in mid-shift attaches the running shift without interrupting it; first shift opens with ONE
   customer ordering ONE beer; not served in time → customer leaves; show only a brief toast with actual coin/reputation deductions, no explanatory text or dismissal dialog;
   three consecutive lost customers → step-by-step guide; first-ever play also runs the guide
   (skippable). Guide steps and thresholds are tier-C config, listeners on the event bus.
8. Locale vi + en (100% i18n keys, en falls back to vi + log). Admin Config Registry (BRD §5.2)
   is built alongside the game, not after.
9. UI invariants regardless of your layout: hit targets ≥ 44 px, no hover-only, colour never the
   only signal, 390×844 / 360×740 / 1280×720 without horizontal scroll, prefers-reduced-motion,
   sheets never pause the shift, penalty dialogs no-pause. Preferred look: the spatial yard HUD in
   docs/reference/ (README explains each screenshot), not the card list in 09-SPEC §3.1.
10. Audio: every action/event plays the sound mapped in docs/asset-production-checklist.md §B7 via
    event id → assets/manifest.json → path (grouped folders, ambient theme via config). No
    hardcoded audio paths; dedupe within 100 ms; mute toggle. Placeholders until files arrive.
11. Pending by owner decision (do NOT build, keep the seam): inspection quiz (`risk.inspection.
    enabled=false`), content bank in docs/content/ (schema only). Lottery stays off
    (`lottery.legalGate`). Defaults for open decisions are in 00-HANDOFF §4.5 — use them, don't wait.
12. Code lives here as npm workspaces: packages/engine (pure), apps/web, apps/server (from M4).
    Never under prototype/. Keep main buildable.

YOU DECIDE, FREELY
Architecture inside those workspaces, libraries (Pixi.js + React is a suggestion), rendering,
state management, build tooling, every screen and interaction, slice size and order, branch
strategy, commit granularity, test framework, how you run Codex. No autopilot / Level 3 kit
is required (.autopilot/ and docs/autopilot-* are archived — ignore them).

WORKING LOOP (the only process rule: an independent review gates each slice)
For every slice you consider done:
  a. Verify yourself: `npm run check:config` green · build + tests green · headless sim reports k
     in 2.0–3.0 whenever economy/sim code changed · smoke on 390×844 and 1280×720 · no console
     errors, no missing assets (placeholders count).
  b. Codex review (independent, adversarial):
       git add -A && codex exec review --base main - < docs/prompts/codex-review.md
     (use --uncommitted instead of --base when reviewing before the first commit of a slice;
     use --commit <sha> to re-review a fix). The reviewer sees the diff plus the binding list
     above. Its verdict is CLEAN or a findings list with BLOCKER / MAJOR / MINOR.
  c. Fix every BLOCKER and MAJOR, re-run (a) and (b) until CLEAN. A MINOR may be waived only with
     a one-line reason in the slice report. An empty or unparseable review is a FAIL, not a pass.
  d. Merge/commit the way you chose; update docs/implementation-tracker.md status and rebuild the
     dashboard (`python3 tools/dashboard-engine/build_dashboard.py --no-network`); append a
     changelog row to any doc you deviated from.
  e. Report (≤ 15 lines): slice · files · what changed · verification results (check:config,
     build/tests, k per seed if measured) · Codex verdict + findings handled/waived · next slice.

MILESTONES (06-ROADMAP v3.1; exit criteria are what matters, dates are not assigned)
M0 foundation: workspaces, config loader + schema over economy.tbh.json, pure engine + shift loop,
   headless k sim, check_*.py pointed at packages/engine, skeletons for docs/analytics-events.md,
   i18n vi.json/en.json, assets/manifest.json, placeholder convention (00-HANDOFF §4.4).
   Exit: check:config green on the new code · sim k in band on 5 seeds · build + tests green.
M1 core serve loop + localStorage save + your UI · M2 onboarding (F27) + guest/locale (F25) ·
M3 full demand-mix (6 dishes + kitchen, 7 customer types, 5 weathers, rush schedule) ·
M4 server + accounts + config service + admin + reconnect · M5 meta (league, F28 leaderboard +
shrine, life path, 9 locations, quests, referral, crate, cosmetics) · M6 risk (gangster, patrol,
fight, offline theft, dog; inspection stays off) · M7 donation + age gate + full en ·
M8 events (World Cup with admin-entered fixtures, season shop; lottery off) · M9 QA/perf/release
(first playable < 5 s on mobile, ≥ 30 fps, 0 console errors, 0 missing assets, k in band).
Hard dependencies: M0 → M1 → M2 → M3 → M4 → (M5 ‖ M6) → M7 → M8 → M9; M2 may start once M1
plays one shift. Assets arrive progressively from the designer via assets/manifest.json.

START
Begin with M0. Before writing code, post a ≤ 20-line plan: workspace layout, engine/tick design,
config loader + schema approach, sim harness, test framework, branch strategy, and how you will
wire Codex review. Then build. Ask the owner ONLY when a binding rule contradicts another doc or
when one of the three "chốt sau" items (donation gateway automation, age-gate level, football API)
actually blocks you — otherwise decide, note the decision in your report, and keep moving.
```

---

## PHẦN 2 — Codex review instruction (`docs/prompts/codex-review.md`, piped vào `codex exec review`)

```text
You are the independent reviewer for "Trùm Bia Hơi" (free-to-play beer-stall tycoon, this repo).
Review the diff adversarially. Your job is to find what would embarrass us in production or
violate the owner's binding rules — not to praise. Output ONLY the format at the bottom.

CHECK, IN THIS ORDER
1. Binding violations (each is a BLOCKER):
   - Business numbers hardcoded in code instead of read from docs/config/economy.tbh.json
     through the config loader (prices, times, weights, caps, thresholds, tiers). A literal is
     acceptable only with `// config-exempt: <reason>` AND when it is genuinely not economy.
   - Game rules inside UI/renderer code; engine code importing DOM, Pixi, React or any renderer;
     Date.now()/Math.random() inside the engine instead of injected time / seeded RNG.
   - Any paywall, session pass, paid unlock, coins/power/ranking sold for money, or dark-pattern
     prompt. The game is free; the only monetization is voluntary donation (cosmetic thank-you).
   - Serving customers individually instead of the whole table in one tap (03-SPEC §9.5), or
     the four serve outcomes not distinguishable.
   - Mutations that bypass the append-only event log / idempotencyKey / configVersion pinning;
     client-side save treated as the source of truth after the server exists (M4+).
   - Building what the owner marked pending or off: inspection quiz, lottery, content-bank
     features; or new code placed under prototype/.
   - New JSON keys without _meta.governance tier + 08-SPEC §22 row (check:config must be green).
2. Correctness: state-machine transitions (table/order/customer), day rollover in Asia/Ho_Chi_Minh,
   cap/credit arithmetic, k measurement only from value per served order, race conditions in
   serve/grace, migration of versioned local saves, idempotency on retries.
3. Tests and verification: are the claims in the slice report backed by tests or the sim? Missing
   or tautological tests for changed rules = MAJOR. Sim not run when economy code changed = MAJOR.
4. Security / robustness (server slices): input validation, auth on mutating endpoints, no
   trusting client totals, rate limits on donate/serve, secrets not committed.
5. UI invariants when UI changed: 44 px hit targets, no hover-only, colour-only signals, i18n keys
   (no hardcoded strings), reduced-motion, sheets don't pause the shift.
6. Docs hygiene (MINOR unless it hides a rule change): deviation from a doc without a changelog
   row; tracker/dashboard not updated for a feature state change.

RULES
- Cite file:line for every finding. Say why it matters and the smallest fix.
- Do not invent style nits; do not restate the diff. If you cannot see a diff, say EMPTY DIFF —
  that is a failure, not a pass.
- Severity: BLOCKER = binding violation or data loss/security; MAJOR = wrong behaviour or
  unverified rule change; MINOR = hygiene.

OUTPUT FORMAT (exactly)
VERDICT: CLEAN | FINDINGS
[if FINDINGS]
- [BLOCKER|MAJOR|MINOR] <file>:<line> — <what> — <why> — <fix>
SUMMARY: <one line: what this slice does and the biggest risk left>
```

---

## Ghi chú vận hành (VN)

- Claude Code chạy ở gốc repo, nhánh `main` (đã ff-merge docs pack). Codex CLI ≥ 0.152 có `codex exec review`; nếu muốn model khác: `codex exec review -m <model> --base main - < docs/prompts/codex-review.md`.
- Review là **ràng buộc kết quả** (phải CLEAN hoặc xử lý hết BLOCKER/MAJOR), không phải quy trình cầm tay — Claude tự quyết khi nào một "slice" kết thúc.
- Designer chạy song song với Phần A của `11-PROMPT-PACK`; asset vào qua `assets/manifest.json`, Claude thay placeholder dần.
- Muốn dừng/đổi hướng: sửa docs (GDD/JSON/HANDOFF) rồi bảo Claude "re-read docs, continue" — không sửa prompt này giữa chừng.

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.0 | Bản đầu 2026-09-08: kickoff prompt cho Claude Code (Level 3 bỏ, dev tự quyết) + instruction Codex review qua `codex exec review`. |

| 2026-09-08 owner UI update | Lost-customer feedback is a numeric coin/reputation toast only; removed the earlier explanation/dialog requirement. Owner asset references: docs/reference/assets-owner-2026-09-08/. |
