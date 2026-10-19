# B4 — slice S4 `eco21-table-chair-upgrades` (Wave 2, behind rules 28)

Read `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/briefs/COMMON.md` first; it binds you. This file adds what is specific to S4.

## Where / which branch
- Worktree `/Users/maingocanh/Projects/Trum Bia Hoi/.autopilot/worktrees/eco21`. Branch from S3's tip: `git switch -c feat/eco21-table-chair-upgrades feat/eco21-capacity-demand` (check `git log -1`). Evidence: `artifacts/verification/feat-eco21-table-chair-upgrades/`.
- Read the S1–S3 reports for the seat model (`buyChair`-style command, seats per table, rules-28 helper, orderShape) you extend.

## The slice (plan §5 row S4; D14, D18, D19; FEEDBACK §II.2 v3.3 + II.2b "nâng bàn / nâng ghế")
- **Table upgrade Lv1→4** (command `upgradeTable`, rules ≥ 28): the table MUST have 2 seats; benefits stack: Lv2 `extraRounds` +1 (the guests order one more round), Lv3 `pExtraMoi` 0.35 (a second snack, only when that snack is in stock — "chỉ gọi món còn hàng" — and the order is delivered only when every dish is ready — "chỉ giao khi đủ món"), Lv4 `tipMult` 1.25 (tip ×1.25 at THAT table only). Price by TARGET level with n = number of tables already at that level: →Lv2 `10 000 + 5 000·n`, →Lv3 `30 000 + 15 000·n`, →Lv4 `40 000 + 20 000·n` (these are the plan §5 row's V4e numbers). DECISION made by the orchestrator (record it as yours too): seed the JSON with the W9 set instead — →Lv2 `8 000 + 3 000·n`, →Lv3 `20 000 + 8 000·n`, →Lv4 `35 000 + 12 000·n` (08-SPEC changelog row "2026-09-18 / chờ JSON 2.1.0, rules 28", DESIGN-story §3) — because that row is the later, simulated bundle and plan §10 Prompt 4 says S5 starts from W9; the behaviour does not depend on the numbers and S5 finalises them. Gates by life path: Lv2 LP1, Lv3 LP2, Lv4 LP4 (drop the Kết Nối badge/reputation gate for rules ≥ 28; keep the old gate for old pins/replays).
- **Chair upgrade Lv1→3** (new command, e.g. `upgradeChair { tableId }`): `patienceMult` 1 / 1.15 / 1.30 applied to the ORDER patience (waiting for the dish) of that table; candidate price `4 000 + 2 000·t` (t = upgrades already bought shop-wide), gates LP1 / LP2. The patience bonus does NOT stack across rounds of the same order.
- Benefits change at once for the NEXT group; the group already seated is unchanged. Replace the postmvp `backrest` key. Events + analytics (`table_upgraded {what}`, chair upgrade event; `docs/analytics-events.md`).
- Career bot (`packages/engine/sim/policy.ts`): learns to upgrade tables and chairs and logs it per shift.

## Acceptance (plan §5 S4)
- Benefit changes exactly at the new level for the next group; Lv2 adds exactly one round; Lv3 adds a second snack only when stock exists and the order is delivered only when complete; Lv4 tip ×1.25 only at that table; chair patience does not accumulate across rounds; price depends on how many tables already sit at the target level; the new events/analytics exist; old replays byte-identical.
- `npm run verify:all`; standard k + `sim:career:gate` measured and reported (PARTIAL-with-deferral block if red, per COMMON.md).
- UI: keep the web app building and playable (buttons for the new commands with price + one reason via the existing quote pattern — see how `apps/web/src/App.tsx` `tableCard` reads quotes on the Wave 1 chain; that chain is NOT on your base, so mirror the pattern minimally); S6 owns the full lane UI.
