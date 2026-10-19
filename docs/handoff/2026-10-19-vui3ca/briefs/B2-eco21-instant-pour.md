# B2 — slice S2 `eco21-instant-pour` (Wave 2, behind rules 28)

Read `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/briefs/COMMON.md` first; it binds you. This file adds what is specific to S2.

## Where / which branch
- Worktree: `/Users/maingocanh/Projects/Trum Bia Hoi/.autopilot/worktrees/eco21` (node_modules installed). It currently has `feat/eco21-seat-model` (S1, done) checked out or reachable — create your branch from S1's tip:
  `git switch -c feat/eco21-instant-pour feat/eco21-seat-model` (verify `git log -1` shows S1's tip first). Evidence dir: `artifacts/verification/feat-eco21-instant-pour/`.
- Read S1's report first (`artifacts/verification/feat-eco21-seat-model/report.md`, `git log feat/economy-2-1..feat/eco21-seat-model`) for the names it introduced (rules 28 gating helper, config keys) and reuse them.

## The slice (plan §5 row S2; FEEDBACK §II.1; D14)
- Rules ≥ 28: when a guest orders beer and `world.beer.ready > 0` AND a clean glass exists, the beer item becomes `ready` in the SAME tick (no tap queue, no `pourMs` wait on the serving path). When `beer.ready` is 0 the order waits for the batch as today.
  The tap queue leaves the serving path; the keys `upgrades.keg.pourMs` / `pourSlots` STAY in the config (old replays/pinned snapshots use them) but rules ≥ 28 never read them on the serving path.
  Code to study: `Game.prepare()` in `packages/engine/src/engine.ts` (the `modern`/`batches` branches around the glass/pour logic), `packages/engine/src/production.ts` `beerStatus`, `preparation.ts` (loss/cause attribution must still be coherent: with instant pour the `tap` cause cannot occur under rules ≥ 28).
- UI: the keg/bom shows ONE set of numbers; the label "rót sẵn n cốc" means exactly "n beers a guest can get right now" (`beer.ready` and clean glasses), no second pour-slot counter (`App.tsx`, `apps/web/src/` bom/keg panel, vi + en copy, `docs/features/F04*`/04-SPEC copy per the row). Update the i18n strings and the matching specs/fixtures honestly.
- Acceptance (plan §5 S2 + FEEDBACK §II.1): engine tests — `beer.ready ≥ n`, clean glasses ≥ n, order of n beers → `order_ready` (items ready) in the same tick; `beer.ready` exhausted → the order waits for the next batch; a rules-27 replay (old save/fixture) is BYTE-IDENTICAL (replay hash unchanged); `npm run verify` green; 03-SPEC + 08-SPEC changelog rows; F04 UI copy.
- Numbers: do not change any existing number. If you must add a key (you should not), Tier A/B/C per COMMON.md.
- k: run the standard k sims + `npm run sim:career:gate` and REPORT. FEEDBACK §II.1 predicts instant pour alone lifts income +3…+8 % (k 3.51 → 3.79 at day 21), so the career gate may go red here: verdict PARTIAL with `SKIPPED/DEFERRED: k rebalanced in S5 per plan §5` — never tune.

## UI scope
Keep the web app building and playable; update only what the beer panel/keg detail/stock strip show about pouring, plus their vi/en strings. Run the UI specs the touched feature files cite (keg-refill, glass-beer-flat, order-rounds-kitchen, ui-clarity, quick-beer-stock …) and a11y; adapt FIXTURES/specs to rules 28 with honest assertions.
