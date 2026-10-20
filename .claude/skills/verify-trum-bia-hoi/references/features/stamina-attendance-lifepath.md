# Stamina, attendance & life path (08-SPEC-economy-constants.md §13 "Thể lực, ca, trần ngày, quyền chơi"; §9 well-rested formula; §14 "Nhiệm vụ, điểm danh..." — F17; §15 "Đường Lên Trùm" — F13)

## Three mechanics, one player-facing bundle, three different source files

This file groups by player-facing concept, not by module — a trap worth naming up front:
**stamina is not in `progression.ts`** (it's `World.staminaMs` et al. plus transitions inside
`engine.ts` itself); **attendance (`attendanceDay`/`attendanceRewardQuote`) lives in `quests.ts`**
(`.claude/skills/how/references/tbh-map.md`'s own table already flags this: "daily quests **and**
attendance (both live here, despite the file name)"); `progression.ts` itself owns **only** life-path
status/unlock gating (`requirementStatus`, `lifePathStatus`, `unlockQuote`, `lifePathRewardQuote`).
[shift-lifecycle](shift-lifecycle.md) owns the narrow "well-rested carries the shift's `restStartedAt`
anchor across a boundary" angle only — this file owns the full well-rested bonus formula and
threshold. [quests-daily-bonus](quests-daily-bonus.md) owns `claimQuest`/`claimDailyBonus` from the
same `quests.ts` file — cross-link, not restated here.

## Observable contract

- Stamina fields (`types.ts`, inside `World`): `staminaMs`, `staminaAnchorMs`, `staminaAnchorAt`,
  `restStartedAt: number`, `wellRestedDays: Record<string, boolean>`. `Shift.wellRestedUntil: number |
  null` (per-shift, set once at `startShift`).
- `Attendance` (`types.ts:58-61`): `{cycleDay, lastActiveDateKey, lastClaimDateKey, expiresAt,
  claimedDays: number[]}`, held at `World.attendance?` (optional — absent until first observed).
- Life-path/unlock fields: `World.lifePath: number` (current reached level index),
  `World.claimedLifePaths: number[]`, `World.badgeShards`/`cosmeticTokens: number`,
  `World.unlocks: string[]` (`types.ts:84,90`).
- Events: `well_rested_started` (`engine.ts:821`, `{shiftId, day, until, mult}`), `well_rested_bonus`
  (`:885`, fired per-customer inside `serve` when `nominalBonus` is nonzero — `{customerId, orderId,
  nominal, credited}`), `attendance_day_opened` (`:299`, private `observeAttendance()`, driven by
  `attendanceDay()` in `quests.ts` — fires whenever the cycle's `transition` isn't `'same'`,
  `{day, cycleDay, expiresAt, transition}`), `attendance_claimed` (`:948`, `{day, cycleDay,
  reputation}`), `life_path_level_reached` (`:734`, autonomous — see How to reach it),
  `life_path_reward_claimed` (`:927`), `life_path_gate_blocked` (`:935`), `unlock_bought` (`:940`,
  `{item, cost}`).
- `Result.reason` values: `'restFirst'` (`startShift`, stamina below full and
  `c.shift.openRequiresFullStamina`), `'rewardUnavailable'`/`'rewardOverflow'` (`claimLifePath`),
  `'unlockOwned'`/`'featureLocked'`/`'notEnoughCoins'` (`buyUnlock`), `'attendanceExpired'`/
  `'attendanceInactive'`/`'attendanceClaimed'`/`'rewardOverflow'` (`claimAttendance`,
  `quests.ts`'s `attendanceRewardQuote`).
- Config: `c.values.shift.wellRested.{mult,durationMs,oncePerDay}`, `c.values.shift.regenRate`,
  `c.values.shift.openRequiresFullStamina`; `c.values.quests.loginTrackRepBase[]` (7-day reward
  curve), `c.values.quests.loginMissResets`; `c.values.lifePath[]` (`{lifetimeBase, requires?,
  extra}` per level); `c.values.unlocks.<item>.{gate, priceBase}`. **Alias drift is a validated
  invariant, not a convention**: `config.ts:151` throws `config:wellRestedAliases` unless
  `c.tip.wellRestedMult === c.shift.wellRested.mult`, `c.tip.wellRestedDurationMs ===
  c.shift.wellRested.durationMs`, and `c.tip.wellRestedKeyedBy === 'open-day'` all hold — two config
  namespaces must agree on one fact.
- DOM/aria (`apps/web/test/attendance.spec.ts`, `game.spec.ts`'s life-path test — real selectors, not
  paraphrased): nav button `'Nhiệm vụ ngày'` → region `aria-label="Điểm danh 7 ngày"` (`role=region`),
  `.attendance-track li` cells, claim button `` `Nhận +${reward} uy tín` ``, claimed state
  `'Đã nhận hôm nay'` (disabled). Nav button `'Đường lên Trùm'` → `.journey-summary h3` title,
  `.milestone-list > li[data-level="N"]` per milestone, `.journey-summary progress` (lifetime-earned
  progress bar), `'Xem nâng cấp quán'` → `.business-card` unlock tiles, buy button `` `Mua ·
  ${price} xu` ``, owned state `'Đã có'` (disabled).

- **Rules 28 (S1):** `parseProgressRequirement` adds `N tables` (owned tables); LP1 `requires` is `["4 tables"]` (D18), LP7 keeps `"10 seats"` (chairs) — unreachable while every alley has 4 slots. Pinned snapshots keep `"4 seats"`.

## How to reach it

- `{type:'claimLifePath', level}` (`engine.ts:921-929`) — `lifePathRewardQuote` gates on level
  reached/unclaimed/safe; success calls `credit(w, c, q.coin, 'quest')` + `addStock` + increments
  `badgeShards`/`cosmeticTokens`, pushes `level` onto `claimedLifePaths`.
- `{type:'buyUnlock', item}` (`:930-941`) — `unlockQuote` gates ownership + `requirementStatus` gates
  + coins; on a failed gate it emits `life_path_gate_blocked` **before** returning `fail`, a rare
  case of a failure path still emitting a domain event.
- `{type:'claimAttendance', day}` (`:942-950`) — `attendanceRewardQuote` (`quests.ts`) computes the
  reason/reward from `attendanceDay`'s preview; success calls `this.observeAttendance(true)` again
  (idempotent re-observe) then `changeRep`.
- **Life-path level is autonomous, not player-set**: `lifePathStatus(world, config).level` is
  recomputed from `lifetimeEarned` after every credited serve (`engine.ts:731-734`) — "Engine tự đánh
  giá LP theo `lifetimeEarned` sau mỗi lượt phục vụ" per 08-SPEC §15. The player only *claims the
  reward* for a level already silently reached; `claimLifePath` cannot skip ahead.
- **`observeAttendance()` (`engine.ts:293`, private) is a single choke point invoked from six call
  sites**: the menu-pause tick (`:226`, gated `rulesVersion >= MENU_PAUSE_RULES = 16`), the general
  autonomous tick (`:351`), `advance()`'s catch-up path (`:718`), `{type:'activity', active:true}`
  (`:767`), `startShift` (`:812`), and `claimAttendance` itself (`:945`) — all gated `rulesVersion >=
  ATTENDANCE_RULES = 13`. Any change to attendance semantics must be verified against all six.
- Well-rested check (`:805`) reads the wall-clock `restStartedAt`, stamped at Game creation and at
  every closing→resting transition ([shift-lifecycle](shift-lifecycle.md)'s `engine.ts:429`) — a
  *different* number from `staminaMs`, which is `'restFirst'`'s own separate full-stamina gate.
- UI: `'Nhiệm vụ ngày'` sheet → attendance panel → claim button. `'Đường lên Trùm'` sheet → milestone
  list + progress bar → `'Xem nâng cấp quán'` → business-card unlock tiles → buy button. Both modes
  identical (no server-specific life-path/attendance route; rides the same `/player/command`).

## Existing proof

- `apps/web/test/ui-clarity.spec.ts` — `A5 legacy pinned save shows direct pour without a refill or reserve in ${locale}` (VI/EN) loads the historical v12 archive and pins the direct-pour/no-reserve copy.

- `apps/web/test/ui-clarity.spec.ts` — `A5 zero configured recovery rate shows paused recovery without an invalid ETA` pins the config-allowed zero-rate display without changing engine rules.

- `apps/web/test/ui-clarity.spec.ts` — `A5 clear production stages, customer rounds and first-open art in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) checks the keg's reserve and refill labels (a seat-model game has no tap line since S2 `eco21-instant-pour`; the tap/refill pair of a capacity pin is pinned by `apps/web/test/instant-pour.spec.ts`), customer-round explanation, and manifest-backed tofu/phone/wood-sign preload plus decoded images on the first stock/upgrade visit. `A5 recovery ETA follows active rest, survives reload and disappears when stamina is full` reaches exhausted natural closure through engine commands, checks the configured active-rest countdown and reload/full recovery. Run with `npx playwright test apps/web/test/ui-clarity.spec.ts` (local config).

- `packages/engine/test/well-rested.test.ts` (11 tests, the bonus-mechanic itself): `'rest must be
  strictly longer than six hours and a start retry consumes the opening day only once'`, `'each
  customer receives the rounded combined-service bonus without changing base k records'`, `'the exact
  bonus deadline ends the multiplier while a served order is still fresh'`, `'partial and exhausted
  daily caps clamp the actual bonus and all three earning ledgers'`, `'the first grant stays on its
  opening day while earnings and the finished shift cross midnight'` (the shift-boundary carry-over
  case — also relevant to [shift-lifecycle](shift-lifecycle.md)'s narrower angle), `'same-day repeat
  rests do not grant twice; the next opening day and configured repeat mode do'`, `'offline rest
  qualifies by wall time but cannot bypass full-stamina opening or consume a failed grant'`, `'hidden
  time preserves the remaining bonus through replay and never resurrects an expired buff'`, `'the real
  pre-bonus v2 save preserves amounts, event IDs and its unboosted open shift'`, `'well-rested aliases
  cannot drift and invalid multipliers or clock units fail before play'` (the exact
  `config:wellRestedAliases` proof above), `'modern config rejects overflowing service bonuses; legacy
  snapshots still refuse the entire mixed order before partial service'`.
- `packages/engine/test/attendance.test.ts` (8 tests): `'seven observed days pay each scaled
  reputation reward once, then wrap without inflating any earning ledger'`, `'observed but unclaimed
  days keep the attendance cycle, expire their reward and never masquerade as claimed'`, `'disabling
  missed-day reset advances one observed slot, not the number of offline days'`, `'hidden time never
  records attendance or pays rewards, while return after missed days resets precisely once'`, `'active
  VN midnight opens the next slot at the same exact instant for tiny and large time steps'` (the
  direct proof of `attendance_day_opened` above),
  `'reputation and active-shift overflow refuse before claim mutation, with a safe boundary retry'`,
  `'invalid, wrong-day and inactive first claims neither create attendance nor change balances'`,
  `'genuine rules12 daily claim and hidden-rollover saves preserve their original rules13 attendance
  adoption'`.
- `packages/engine/test/progression.test.ts` (7 tests): `'actual v5 history stays unchanged; current
  progression unlocks phone and LP2 before any reward claim'`, `'all configured subsidiary gates are
  enforced and kitchen cannot make the five-level core device goal unreachable'`, `'every configured
  reward uses the same overflow conversion, counts repeated shards and cannot be claimed twice'`,
  `'unreached, malformed and unsafe claims leave all reward balances and stamps unchanged'` (line 76 —
  the direct `life_path_gate_blocked` assertion), `'phone and QR validate gates, current coins and
  exact identity; QR changes real whole-table tips and replay'`, `'config rejects unknown
  gates/rewards, cycles, non-integral payouts and progress-counted reward sources'`, `'phone and QR
  cannot require milestones that need them, including through earlier levels or another unlock'`. Line
  20 of the first test directly asserts `life_path_level_reached` fires exactly once with `level:
  'LP1'` — the autonomous-catch-up mechanism is proven, not just claimed.
- `packages/engine/test/career.test.ts:6` — `'two real career days conserve the wallet and replay
  purchases, claims, clocks and earned LP from a fresh save'` — cited **because** it directly asserts
  `game.log.some(e => e.command.type === 'claimLifePath')` and `report.rows[1].lifePath === 1` across
  a real 2-day bot-driven replay (not just adjacency to "career"); it also asserts `attendance_claimed`
  fires twice. This is the only integration-level proof that claiming and attendance survive a
  multi-day realistic run; [economy-k-ledger](economy-k-ledger.md) already cites this file's sim
  cousin (`sim:career:gate`'s `assertAdvancedCareerK`) for the k-band angle — that gate's own
  precondition (`lifePath >= 4`) is indirect, real-run evidence that life-path progression reaches at
  least LP4 in a 30-day simulated career, though it asserts nothing about the claim mechanics
  themselves.
- `apps/web/test/attendance.spec.ts` (4 tests): `` `attendance claims exactly once, shows unclaimed
  past days and survives reload at ${viewport.width}×${viewport.height}` ``, `'live midnight expires
  an unclaimed check-in and wraps after the seventh observed day'`, `'returning after offline days
  resets the cycle without backfilling rewards or attendance'`, `'a new guest visit is recorded before
  opening a shift'`.
- `apps/web/test/game.spec.ts` — `` `life path rewards and business upgrades remain separate at
  ${viewport.width}×${viewport.height}` `` (line 509): drives a real `progression.ts` fixture, asserts
  the milestone list, progress bar, and that buying `phone` doesn't unlock `qr` early.

- `packages/engine/test/seat-model.test.ts` — `life path 1 counts tables, not seats, so a two-chair table can never block the next table`; `packages/engine/test/progression.test.ts` — `LP1 needs its scaled lifetime threshold and four tables, without deferred dog ownership; old config pins remain strict` (six seats on three tables are not LP1) and `all configured subsidiary gates...` (LP7 needs a fifth table's slot).

## Verification procedure

- `node --import tsx --test packages/engine/test/well-rested.test.ts
  packages/engine/test/attendance.test.ts packages/engine/test/progression.test.ts` (or `npm test` for
  the full suite — bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/attendance.spec.ts apps/web/test/game.spec.ts` (or `npm run
  test:e2e`).
- `npm run check:config` before touching `shift.wellRested.*`, `tip.wellRested*`,
  `quests.loginTrackRepBase`/`loginMissResets`, or any `lifePath[]`/`unlocks.*` entry — validates the
  alias-drift guard and the gate/cycle checks progression.test.ts's config-rejection case exercises.
- `npm run sim:career:gate` — not a substitute for the above; see Existing proof's note on what its
  `lifePath >= 4` precondition does and doesn't prove.

## Uncovered paths

- **`unlock_bought` is never asserted by any test** (grep-confirmed zero hits across
  `packages/engine/test` and `apps/web/test`). `buyUnlock`'s success path is proven via `Result`/coin
  deltas (`progression.test.ts` line 80) but the event itself — the thing a UI toast or future
  analytics hook would consume — has no direct proof.
- **Stamina hitting 0 mid-shift stopping arrivals is tested, but not by any file in this feature's own
  three test files** — it's `packages/engine/test/shipper.test.ts`'s `'stamina exhaustion stops
  arrivals but keeps the last delivery available until handoff'`, owned by
  [spawn-queue-seating](spawn-queue-seating.md). Cross-link rather than treat as a gap.
- **Stamina freezing during a true network disconnect is tested, but by
  `packages/engine/test/disconnection.test.ts`** (28 cases, several asserting `staminaMs`/`attendance`
  are byte-identical across a disconnect/reconnect cycle, e.g. lines 20-348) — not one of this file's
  three primary tests, and disconnection.test.ts's own home is the not-yet-written
  `remote-session-outbox`. Cited here only so a future reader doesn't assume it's missing.
- **No test exercises `buyUnlock`'s `'phone'`/`'qr'` gates together with `claimAttendance` or
  `well-rested` in the same run** — the three mechanics in this file are each unit-proven in
  isolation; no integration test combines a claimed attendance reward, an active well-rested bonus,
  and a life-path unlock purchase in one shift.
- **Corrected claim**: `attendance.test.ts`'s third test (`'disabling missed-day reset advances one
  observed slot, not the number of offline days'`) DOES combine `loginMissResets:false` with a
  30-day (`DAY * 30`) gap and asserts `cycleDay` still advances by exactly one slot — a genuine
  multi-week case, not just a single-miss one. What's still untested: a gap that crosses a *second*
  VN-midnight boundary while active/online (as opposed to one offline jump), and whether repeated
  offline gaps in sequence (not just one) still advance by exactly one slot each time.

## Variants

- **success** — `claimLifePath`/`buyUnlock`/`claimAttendance` all return `{ok:true, amount}` after a
  real gate pass; well-rested bonus applies inside a normal `serve`.
- **reason** — exhaustively listed in Observable contract; all confirmed asserted by exact string
  except `unlock_bought`'s absence is about the *event*, not the reason (`buyUnlock`'s reasons are all
  asserted).
- **empty** — a fresh `World` has `attendance: undefined` until first observed; `lifePathStatus` on a
  brand-new game returns `level: 0` with every row `reached:false`.
- **persistence** — **re-corrected claim**: counted by actual `decodeSave(` calls, not by grepping
  `decodeSave|encodeSave` together — a bare `encodeSave()` used alone (no decode) is a byte-string
  equality check for "nothing mutated," not replay/round-trip proof, and inflated the earlier count.
  `well-rested.test.ts` is **6/11**, not 8/11: `'each customer receives the rounded combined-service
  bonus...'`, `'partial and exhausted daily caps clamp...'`, `'the first grant stays on its opening
  day...'`, `'same-day repeat rests do not grant twice...'`, `'hidden time preserves the remaining
  bonus through replay...'` (the one test that actually keeps playing on the decoded object
  afterward, not just an equality check), and `'the real pre-bonus v2 save preserves amounts...'`
  (loads a real legacy fixture). The two excluded (`'rest must be strictly longer than six
  hours...'`, `'modern config rejects overflowing service bonuses...'`) only call bare `encodeSave()`
  for a before/after string-equality check, never `decodeSave`. `attendance.test.ts` (6/8) and
  `progression.test.ts` (2/7) were re-verified under the same stricter rule and are unchanged — most
  of `progression.test.ts`'s cases are pure config-validation/quote checks with no state to persist.
  The real v5/v12/v13/v2 legacy-save tests specifically pin cross-version stamina/attendance/life-path
  field survival; don't assume every other cited test also round-trips.
- **capacity** — `loginTrackRepBase.length` bounds the attendance cycle (wraps at 7); `lifePath[]`
  array length bounds claimable levels.
- **duplicate/idempotent** — `attendance.test.ts`'s claimed-state check (`'Đã nhận hôm nay'` disabled);
  `progression.test.ts`'s repeated-`buyUnlock`-on-owned-item test (`'unlockOwned'`).
- **stale** — not directly applicable; attendance's own staleness is `'attendanceExpired'` (a
  same-day-window check), covered above.
- **time-jump** — `attendance.test.ts`'s hidden-time and VN-midnight tests; `well-rested.test.ts`'s
  hidden-time-preserves-remaining-bonus test; both step fine and coarse.
- **offline-reconnect** — `well-rested.test.ts`'s offline-rest-qualifies-by-wall-time test; deeper
  disconnect coverage lives in `disconnection.test.ts` (see Uncovered paths).

## Gotchas

- Stamina is **not** in `progression.ts` — don't go looking for it there; it's `World.staminaMs` plus
  `engine.ts` transitions (see [shift-lifecycle](shift-lifecycle.md) for the counting-down half).
- Attendance functions (`attendanceDay`, `attendanceRewardQuote`) live in `quests.ts`, not here and not
  in `progression.ts` — a source-file/feature-file mismatch, matching the same pattern
  `order-rounds-kitchen.md` already documents for "menu pause is not in menu.ts".
- `life_path_gate_blocked` fires on a **failed** `buyUnlock` — one of the few failure paths in the
  engine that still emits a domain event before returning `fail(...)`.
- `ATTENDANCE_RULES = 13` and `MENU_PAUSE_RULES = 16` (`engine.ts:24,27`) gate different subsets of
  `observeAttendance()`'s six call sites — a save below rules13 never observes attendance at all,
  regardless of the other five sites' own version gates.
- The well-rested bonus is a *separate counted credit*, not a multiplier baked into `payment`/`tip`
  themselves — `rules.ts`'s own comment: "Base payment/tip remain the k measurement; the service boost
  is a separate counted credit." Don't assume `wellRestedBonus` changes what feeds `kValue`.

## Related

[shift-lifecycle](shift-lifecycle.md) (stamina's own countdown/regen and the `restStartedAt` anchor
this file's well-rested check reads), [spawn-queue-seating](spawn-queue-seating.md) (stamina-zero
blocking arrivals), [quests-daily-bonus](quests-daily-bonus.md) (`claimQuest`/`claimDailyBonus`, same
`quests.ts` file as attendance), [upgrades-equipment-tables](upgrades-equipment-tables.md) (equipment
upgrades gated by `lifePathGate`, a different gate mechanism reusing the same `lifePath` level),
[economy-k-ledger](economy-k-ledger.md) (`credit()` is the only ledger mutator these claims call
through; `sim:career:gate`'s `lifePath >= 4` precondition), `remote-session-outbox` (disconnection
freezing of stamina/attendance, not yet written).


### A1 — 2026-09-16 proof
- `apps/web/test/local-config.test.ts`: newer bundled config adoption only at next successful opening; running/historical pins, custom/newer versions and replay retained.
- `packages/engine/test/progression.test.ts`: LP1 scaled threshold/four seats without dog; old pinned dog requirement still enforced.
- `apps/web/test/improve-lp1.spec.ts`: production browser guest with real previously earned income migrates LP1, opens next shift, reloads unchanged with no visible dog. Run `npx playwright test --config playwright.improve.config.ts improve-lp1.spec.ts`.

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 A5 | Cite UI clarity, first-open asset preload and active-rest ETA regression; no engine/config rule changes. |

## Changelog — S1 seat model
| Date | Change |
|---|---|
| 2026-10-19 | S1 rules 28: LP1 counts tables; tests cited. |
