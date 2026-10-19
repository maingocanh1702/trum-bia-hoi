# B7 — Wave 3 `fun-kick-table` ("Mời về", behind rules 28)

Read `/Users/maingocanh/Projects/Trum Bia Hoi/.autorun/vui3ca/briefs/COMMON.md` first; it binds you. This file adds what is specific to Wave 3.

## Where / which branch
- Worktree `/Users/maingocanh/Projects/Trum Bia Hoi/.autopilot/worktrees/eco21`. Branch from S6's tip: `git switch -c feat/fun-kick-table feat/eco21-ui-assets` (check `git log -1`). Evidence: `artifacts/verification/feat-fun-kick-table/`.
- Read the S1–S6 reports. The rules version is 28 (shared with Wave 2 — do NOT bump it again). S5's final numbers are in the JSON.

## The slice (plan §6 row `fun-kick-table`, §1 D3, §10 Prompt 5; FEEDBACK §II.3)
- Command `kickTable { tableId, maxCost }`, rules ≥ 28: valid ONLY when the table is `occupied` ("đang nhâm nhi" — guests lingering after being served, not waiting for a dish); refuse for every other table state and for an unknown table. Cost in coins = `feeRate` × the gross of each guest's latest order × `leavePenaltyMult` (VIP ×10, **Chí Phèo 0** coins — D3: he can be sent home for 0 coins and −2 reputation); reputation −`repPerGuest` per guest (NOT multiplied by k — `reputation.notScaledByK`). `maxCost` guards against a price that moved since the player saw it (refuse with a distinct reason when the real cost exceeds it). Not enough coins → refuse. Idempotent (same idempotency key = same result, no double charge). The guests leave without being counted `lost`, without the `customerLeft` penalty; the coins are recorded as `spent`; the table goes to cleaning. Events + analytics (`docs/analytics-events.md`).
- New Tier A keys (register in `_meta.governance`, 08-SPEC §22 + changelog, admin registry coverage — S6's k-admission path): `kickTable.feeRate` (candidate 0.5), `kickTable.repPerGuest` (candidate 2). Replace the 🟡 "Tiễn ngồi lỳ" row of 08-SPEC §9 and update the table lifecycle in 03-SPEC.
- UI: the table popover gets "Mời về" showing the coin price and the reputation cost, one-tap confirm (vi + en strings, ≤ 6 words per label, 44 px targets, prefers-reduced-motion), dimmed with exactly ONE reason when it cannot be used (table not lingering / not enough coins) using the same quote-reads-the-command pattern as the buy buttons (add a pure read-only `kickTableQuote` in `rules.ts`, parity-tested against the command).
- Career bot policy "send a lingering table home when the queue is non-empty and ≥ 40 s of the shift remain" in `packages/engine/sim/policy.ts` (+ a never-kick baseline).

## Acceptance (plan §6, FEEDBACK §II.3)
- Engine tests: all four table states (only `occupied` accepts), not enough coins, `maxCost`, VIP ×10, Chí Phèo 0 coins / −2 rep, idempotent replay, no `lost`, no double penalty; old replays byte-identical.
- Sim, seeds 42 AND 99, kick-policy vs never-kick bot: 30-day income ≤ +10 % and final reputation ≥ 0. If income overshoots +10 %, raise `feeRate` and re-run until it holds (record every attempt). Put BOTH tables in the report and the PR.
- `npm run verify:all` green on seeds 42 and 99, `sim:career:gate` passes, standard k 2.0–3.0 (S5 has rebalanced: this slice must not break the k gate — if it does, that is a FAIL to fix, not a PARTIAL), UI specs at 390×844 · 360×740 · 1280×720 + `npm run test:a11y` 0 violations, Codex-ready diff.
