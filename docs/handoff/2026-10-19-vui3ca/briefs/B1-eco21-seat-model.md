# B1 — slice S1 `eco21-seat-model` (Wave 2 "economy 2.1", rules 28)

Read `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/briefs/COMMON.md` first; it binds you. This file adds what is specific to S1.

## Where / which branch
- Worktree: `/Users/maingocanh/Projects/Trum Bia Hoi/.autopilot/worktrees/eco21` (node_modules installed; currently on `feat/economy-2-1` = `origin/main` @ `a775fc0`, config 2.0.4, `CURRENT_RULES` 27).
- Create your branch there: `git switch -c feat/eco21-seat-model feat/economy-2-1`. Evidence dir: `artifacts/verification/feat-eco21-seat-model/`.
- Wave 1 (Track A: goal chip, three-lane sheet, buy-button reasons, locale) is NOT in your base and must not be touched; it lands on `main` separately. Do not touch the Tier C
  `onboarding.*` / `nextGoal.*` sections or any `apps/web` file for presentation reasons — only what your slice needs so the web app still builds and plays (see "UI scope").
- Ports: Playwright/dev ports are derived from the worktree path (`npm run verify:port` prints them); never reuse the main checkout's.

## The slice (source of truth: plan §5 row S1, §1 D2 D12 D13 D14 D17 D18 D19, FEEDBACK §II.2 v3.3, DESIGN-story §3, 08-SPEC changelog row "2026-09-18 / chờ JSON 2.1.0, rules 28")
Rules 28 (`CURRENT_RULES` 27 → 28; every Wave 2/3 rule sits behind `rulesVersion >= 28`):
- A new game starts with 1 table × 1 seat (`startingTables` 3 → 1; first group of the onboarding is 1 guest ordering 1 beer — keep `config:firstGroup` validation satisfied).
- Group size by `spawn.pPair` (D17): a pair that finds no table with 2 seats leaves at the door → `queue_overflow { size, reason: 'noSeat' }`; NO penalty, NO reputation loss, NOT counted as `lost`; counted separately in the shift stats (`rejected`/a new counter — the shift book/UI wiring is S3).
- `buyTable` priced by `tablePriceBase` (index = tables owned), NO life-path gate, cap = `locations.list[].tableSlots` of the current location (first alley = 4; this wave every location = 4 except as listed in the W9 row of 08-SPEC — put the whole `tableSlots` array in JSON, it is a Tier A key).
- New command to buy a chair (name it `buyChair { tableId }` unless the codebase suggests better): priced by `chairPriceBase` (index = chairs bought beyond the first per table, i.e. across the shop), ≤ 2 seats per table, ONLY once the shop owns `tableSlots` tables (D18, key `chairsAfterTables`).
  Buying a table or a chair does NOT require an empty table: a new seat/shop table applies to the NEXT group; the group already seated keeps its size.
- Order shape follows the number of seats (D14): `table.orderShape.solo` (1 seat: beer OR one snack, instant; `pBeer` 0.7) and `.pair` (2 seats: each guest beer + one snack, `pMoi` 0.85, kitchen snack included). A 1-seat table NEVER yields a guest with beer + snack together; a 2-seat table does.
  This REPLACES capacity 2/4/6/8 and `extraMoiChance`; table levels no longer carry `capacity`.
- `lifePath[1].requires` "4 seats" → "4 tables" (plan D18/FEEDBACK: avoids the dead loop); re-check LP7's requirement text and every `requires` token that mentions seats.
- Remove from the live config: `upgrades.extraSeatPriceBase`, `capacity` from `upgrades.table.levels`; `startingTables` 3 → 1; `maxTables` becomes location-driven. Keep removed keys readable for OLD pinned snapshots/replays (legacy shape must still validate old saves).
- Save migration (D2): a rules ≤ 27 game must still replay BYTE-IDENTICAL (same hash) under its own rules. The migration to rules 28 (`min(tables, tableSlots)` tables, each `min(2, capacity)` seats, table level kept but only effective with 2 seats, no refund) runs ONCE and deterministically — design it like the existing system commands/rules adoption in `engine.ts`
  (study how earlier rules bumps and `adoptCalendarRules` work before inventing anything) and test: a 3-tables × 6-seats Lv3 save → 3 tables × 2 seats at table level 3.
- Career bot (`packages/engine/sim/policy.ts` + `career.ts`): the bot buys tables, chairs and upgrades (not the dog) and LOGS every purchase per shift, so `npm run sim:career` prints purchase milestones by shift (this pays the Wave-0 debt, plan §3 last row). Build it as a real policy; `~/keg-matrix/feedback-0917/` is scratch reference only — never copy its patched engine.
- JSON keys you add (all Tier A unless the registry says otherwise; register in `_meta.governance`, 08-SPEC §22 rows + changelog row, `npm run check:config` green, admin registry coverage): seed them with the W9 candidate numbers from the 08-SPEC changelog row "2026-09-18 / chờ JSON 2.1.0, rules 28" (`tableSlots`, `spawn.pPair`, `table.orderShape`, `tablePriceBase`, `chairPriceBase`, `chairsAfterTables`; plus whatever S1 strictly needs). Keys that belong to S2–S5 (`capacityDemand`, queue/patience, upgrade ladders, LP/league/lease/cap, `tip.rate`, `kickTable`) are NOT yours — leave them. Leave `_meta.version` unchanged (S5 sets 2.1.0); if a test or validator genuinely demands a bump for changed seed content, take the smallest option and record it in DECISIONS.md.

## Acceptance (plan §5 S1)
- Cannot buy chair 2 with < 4 tables; no chair 3 on a table; no 5th table in the first alley.
- A 1-seat table never gives beer + snack to one guest; a 2-seat table does (fixed seed).
- Buying a chair/table while a table is `occupied` does not change the seated group.
- Migration test (3 × 6 Lv3 → 3 × 2 at level 3). Old replay fixtures (`packages/engine/test/fixtures/*`, `apps/web/test/fixtures/*.json`) still match their hashes.
- Pair with no 2-seat table → `queue_overflow{reason:'noSeat'}`, no `lost`, no reputation change.
- `npm run sim:career` prints per-shift purchase milestones for tables/chairs/upgrades.
- k: run `npm run sim:career:gate` and the standard k sims anyway and REPORT the numbers. The plan expects S1 alone may break the k gate: if it does, the verdict is PARTIAL with a `SKIPPED/DEFERRED: k rebalanced in S5 per plan §5` block — never PASS, never retune numbers.

## UI scope (smallest thing that keeps the product working; S6 owns the real UI)
`apps/web` must still typecheck and a new game must still be playable end-to-end through the existing screens: tables render with 1–2 seats, the existing "buy table" / upgrade buttons dispatch the new/renamed commands with correct prices and honest disabled states, strings in vi+en, `check:i18n` green. Keep sprites as they are. Where Playwright specs assume the old 3-table start, adapt the FIXTURES/specs to the new model (engine-made saves) — do not weaken assertions.
Run the UI tiers the touched feature files name (local suite `npx playwright test '\.spec\.ts$' --workers=3`, a11y, remote/guest as the diff touches them; helper: `ROOT=<worktree> bash /Users/maingocanh/Projects/Trum\ Bia\ Hoi/.autorun/ui-tiers.sh <evidence-dir> local a11y …`). A spec that can only be fixed by S6's UI work gets a legitimate `SKIPPED:` block (verdict PARTIAL), with the closest verified path.

## Suggested order of work (commit after each)
1. Test-first: engine tests for the acceptance lines above (they will fail), plus fixture-hash guard tests.
2. Config keys + types + validation + legacy-shape tolerance; rules constant 28 + gating.
3. Seat model, chair command, buy-table rules, group-size/noSeat, order shape, migration.
4. Sim policy + career output; k numbers.
5. Minimal UI + i18n + spec/fixture adaptation; docs (03-SPEC table lifecycle/spawn sections, 08-SPEC §22 + changelog, F10/F13/F07 changelog rows, `docs/analytics-events.md` for `queue_overflow{noSeat}`/`chair_bought`, 10-SPEC rules 28 + migration, tracker + dashboard, verify skill feature-file citations).
6. Verification + `report.md`; final message.
