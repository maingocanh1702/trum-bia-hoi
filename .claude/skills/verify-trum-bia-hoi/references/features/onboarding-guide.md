# Onboarding & step guide (spec ref: `docs/features/F27-onboarding.md`; `docs/config/economy.tbh.json` → `onboarding`)

## Observable contract

- Config (`docs/config/economy.tbh.json:1100-1172`, tier C, `_rule: "F27 (🟢 ràng buộc 08/09)..."`), real shape:
  `enabled: true`, `firstShift: {guaranteedFirstGroupWithinMs: 8000, firstGroupType: 'thuong', firstGroupSize: 1,
  firstOrder: ['bia'], riskEventsDisabled: true, rushDisabled: true, excludedCustomerTypes: ['ngoily'], staleDisabled: true}` (`excludedCustomerTypes` JSON 2.1.3, founder 2026-10-22:
  the seated types an onboarding shift never draws; `staleDisabled` JSON 2.1.4, founder 2026-10-22: no flat beer in that shift), `lostStreakToGuide: 3`, `idleToGuideMs: 45000` (JSON 2.0.5),
  `stepGuide: {onFirstPlay: true, skippable: true, maxAutoRepeatsPerDay: 2, steps: [5 entries]}`,
  `loginPrompt: {afterFirstShift: true, onLeaderboardOpen: true, onLeaveWithProgress: true, cooldownShifts: 3,
  leaveProgress: {minCompletedShifts: 1, minLifetimeEarned: 1}}`, `hints.*`, `featureReveal:
  {upgradeAfterShifts: 0, questsAfterShifts: 2, leagueAfterShifts: 3, locationsAfterLifePathLevel: 1,
  hudAfterShifts: 0, upgradeAllAfterShifts: 2, journeyAfterShifts: 2, kickAfterShifts: 1}` (`upgradeAfterShifts` and `hudAfterShifts` were 1 until JSON 2.1.2, founder 2026-10-22) (`hudAfterShifts` · `upgradeAllAfterShifts` · `journeyAfterShifts` and `idleToGuideMs` are JSON 2.0.5 keys:
  older pins lack them, `config.ts` `ADDED_LATER` lets those load byte-for-byte and `reveal.ts` reads the seed for the absent ones; `kickAfterShifts` ("Mời về", JSON 2.1.3, AND-ed with
  the HUD in `revealed().kick`) and `firstShift.excludedCustomerTypes` are one `SEAT_KEYS_ADDED_LATER` row `since: '2.1.3'`: an older label loads without them byte for byte, `reveal.ts` reads the seed),
  `targets: {firstServeWithinMs: 30000, firstShiftLostGroupsMax: 1}`. The 5 `stepGuide.steps` entries
  (`id`/`waitFor`/`copyKey`, `open_upgrade` also carries `onlyAfter: "shift_closed"`) — see Gotchas for
  what `onlyAfter`'s value actually does. `k.band` (the invariant `sim:onboarding` checks against) is
  `[2.0, 3.0]` (`economy.tbh.json:132-134`), not hardcoded in the sim.
- **fun-onboarding-visual (2026-10-14, PLAN "Vui 3 ca" P0) — the screen teaches itself; the step banner is a fallback.** UI-only on the
  unchanged engine; every piece is a pure projection of `WorldView` + config:
  `apps/web/src/spotlight.ts` `pickSpotlight()` chooses the single thing that calls for a tap (ready order check → beer restock when the keg,
  raw stock and any batch are all empty and affordable → between shifts the first goal) and `App.tsx` marks exactly that element
  `data-spotlight` (never two). First play (`onboarding.enabled && stepGuide.onFirstPlay && completedShifts === 0`) adds a pointer arrow
  (`.spotlight-arrow`) guest → check → wallet and no banner. `reveal.ts` `revealed()` hides everything but wallet · keg · the goal chip (fun-next-goal, 2026-10-15; Settings can switch it off) until
  `featureReveal.hudAfterShifts` (Settings gear, timer, weather/rush row, stock strip, cooler/washer/kitchen, glass counter, bottom nav; Upgrades and Journey
  buttons have their own thresholds) and shows only one table's upgrade card (the first that can level up, an empty one when any is) in the Upgrades sheet until `upgradeAllAfterShifts`.
  **Since 2026-10-22 (founder override, JSON 2.1.2) `hudAfterShifts` and `upgradeAfterShifts` are 0: the HUD, the nav and the Upgrades button show from shift 1, so the "hides everything but wallet · keg · chip" sentence above is the 2026-10-14 behaviour; journey / quests / league still wait for 2 / 2 / 3 shifts.**
  `DoorQueue.tsx` renders queued groups with patience rings and a refused group's bubble (`door.seats` / `door.full`, from `queue_overflow {size}`);
  `FlyingFeedback.tsx` + `App.tsx` `launch()` fly coins from the served table to the wallet and drop lost reputation from the leaving table or the door.
  `local.ts` `advanceGuide()` no longer starts the banner at first play: it starts after `lostStreakToGuide` lost guests or on the synthetic
  `ui_idle` event (no tap for `onboarding.idleToGuideMs` while a shift runs and nobody was ever served), capped by `maxAutoRepeatsPerDay`.
- Engine (`packages/engine/src/engine.ts`): `World.lostStreak` starts at `0` (`:66`), `+= 1` on a queue
  arrival timing out (`:415`, emits `customer_left` reason `'queue'`), `++` on an order timing out
  (`:511`, emits `order_expired`), reset to `0` on shift-open (`:808`) and on a successful
  `order_served` (`:890`). `spawn()` (`:541-546`): the first group of an onboarding shift is forced to
  `firstShift.firstGroupSize`/`firstGroupType` instead of the normal random size/weighted-type roll.
  `order()` (`:580-587`): the first order of an onboarding shift is forced to exactly
  `firstShift.firstOrder` (`['bia']`) instead of the normal demand-mix roll. Shift-open (`:781-808`):
  `onboarding = c.onboarding.enabled && w.completedShifts === 0`; if no table can seat
  `firstGroupSize` this **fails at config-load time already** (see Gotchas) but is *also* re-checked
  here and fails `'configOnboardingTables'` (`:782`) if it somehow reaches shift-open unfit; rush
  scheduling is skipped when `firstShift.rushDisabled` (`:783`); the shift's `nextSpawnAt` is computed
  from `guaranteedFirstGroupWithinMs - c.runtime.tableSeatingMs` instead of the normal spawn-interval
  math (`:806`); the shift record carries `onboarding`/`firstGroup: true` flags consumed by `spawn()`/`order()`.
- Config validation (`packages/engine/src/config.ts`): `:257` `whole(c.onboarding.firstShift.firstGroupSize, ...)`;
  `:258-260` validates `loginPrompt.leaveProgress` thresholds when present; `:262`
  `if (c.onboarding.firstShift.firstGroupSize > initialTable.capacity || ... guaranteedFirstGroupWithinMs <
  c.runtime.tableSeatingMs) throw Error('config:firstGroup')` — this is a **separate, earlier** gate
  than engine.ts:782's runtime `configOnboardingTables` fail (see Variants/capacity and Gotchas).
  `:95` migrates old snapshots missing `loginPrompt.leaveProgress`; `:128-129` folds `firstOrder`'s cost
  into the conservative whole-order price bound.
- Web `Settings` shape (`apps/web/src/local.ts:6`, persisted under `tbh.settings.v1`): `guideDone: boolean;
  guideIndex: number | null; guideRuns: number; guideDay: string; lostStreak: number; loginPromptPlayer:
  string; loginPromptShift: number` — **this `lostStreak` is a second, independent counter from
  `World.lostStreak`** (see Gotchas). `readSettings()` (`:12-20`) sanitizes `guideIndex` to a
  non-negative integer or `null`.
- `advanceGuide(settings, game, events, uiEvent?)` (`local.ts:65-90`): no-op if `!c.enabled`. Buckets
  events by a VN-timezone day key (`Intl.DateTimeFormat('en-CA', {timeZone: shift.dayRollover.tz})`,
  `:69-70`) and resets `guideRuns` on day change. `shift_opened` → `lostStreak = 0`; **since 2026-10-14 it no longer
  sets `guideIndex = 0` at first play** (the screen teaches itself — see the fun-onboarding-visual bullet above; the old
  `!guideDone && stepGuide.onFirstPlay` auto-start is gone). The synthetic `ui_idle` event starts the same fallback step
  once `guideIndex === null`, `world.serves.length === 0` and `guideRuns < maxAutoRepeatsPerDay`. `customer_served` → `lostStreak = 0`
  (`:75`). `customer_left` → `lostStreak += event.count ?? 1`; once it reaches `lostStreakToGuide`
  *and* `guideRuns < maxAutoRepeatsPerDay`, jumps `guideIndex` to the step whose `waitFor ===
  'order_ready'`, increments `guideRuns`, resets `lostStreak` (`:77-81`). Step advance: when the
  current step's `waitFor` matches the incoming event type (gated by `onlyAfter`, see Gotchas),
  `guideIndex++`; past the last step → `guideIndex = null; guideDone = true` (`:83-86`).
- UI (`apps/web/src/App.tsx`): `showGuide = c.onboarding.enabled && guide && (!guide.onlyAfter ||
  w.completedShifts > 0)` (`:282`) renders `<div className="guide" role="status"><span
  className="guide-mark">!</span><p>{t(guide.copyKey)}</p>{skippable && <button>{t('skip')}</button>}</div>`
  (`:387`) — skip sets `{guideDone: true, guideIndex: null}` directly, bypassing `advanceGuide`.
  `questsRevealed = !c.onboarding.enabled || w.completedShifts >= featureReveal.questsAfterShifts`
  (`:98`) and the `journey` sheet's Giải Nhậu entry gates on `featureReveal.leagueAfterShifts`
  (`:459`). `processEvents()` calls `advanceGuide(prefs.current, game, events)` every tick (`:141`);
  opening the `upgrades` sheet synthesizes a `ui_sheet_open:upgrade` event into `advanceGuide` (`:195`)
  — this is how `stepGuide.steps[4]` (`open_upgrade`, `waitFor: 'ui_sheet_open:upgrade'`) can ever
  advance, since the engine never emits that event type itself. `LoginInvitation` (imported from
  `./Account`) is rendered only when `sheet === 'book' && invitation === 'firstShift'` or `sheet ===
  'seasons' && invitation === 'leaderboard'`, and only for `remote?.identity.provider === 'guest'`
  (`:406`); the `invitation` reason is set by an effect keyed off which sheet just opened (`:198-199`).
- `canInvite()` (`apps/web/src/login-prompt.ts`, full 15 lines): `LoginTouchpoint = 'firstShift' |
  'leaderboard' | 'leave'`. Refuses immediately if not `guest`, `!c.enabled`, or the same player is
  still inside `cooldownShifts` of their last prompt (`:8`). `'firstShift'` → true only exactly at
  `completedShifts === 1` (a comment marks this "config-exempt: ... an ordinal, not a balance
  threshold", `:9`). `'leaderboard'` → `onLeaderboardOpen` (`:10`). Otherwise (the `'leave'`
  touchpoint) → `onLeaveWithProgress && (completedShifts >= leaveProgress.minCompletedShifts ||
  lifetimeEarned >= leaveProgress.minLifetimeEarned)`, falling back to the *default* config's
  `leaveProgress` if the live pinned config predates it (`:11-14`). The function's own doc comment:
  "Presentation only: completed shifts and earnings come from the current server snapshot."
- i18n keys actually present in `apps/web/src/i18n/vi.json` (grep-confirmed, 8 keys): `onboarding.step.watch_arrive`,
  `onboarding.step.wait_ready`, `onboarding.step.tap_serve`, `onboarding.step.see_reward`,
  `onboarding.step.open_upgrade` (one per `stepGuide.steps[].copyKey`), plus `onboarding.login.firstShift`,
  `onboarding.login.leaderboard`, `onboarding.login.leave` (one per `LoginTouchpoint`).

## How to reach it

- Engine: start a shift (`game.command({type: 'startShift', ...})`) while `world.completedShifts === 0`
  and `config.values.onboarding.enabled` — every onboarding branch above is driven purely by config +
  world state, there is no dedicated onboarding command.
- Sim: `npm run sim:onboarding` = `tsx packages/engine/sim/headless.ts --onboarding-pair`
  (`package.json:19`).
- UI: the guide banner and `LoginInvitation` dialog render inside the normal `App()` shell
  (`apps/web/src/App.tsx`) — no separate route; driven entirely by `Settings`/config state above.
- Config: `docs/config/economy.tbh.json` → `onboarding` (tier C, admin-editable per F27's acceptance
  "Mọi ngưỡng/bước ở §4 đổi được ở admin không deploy").

## Existing proof

- **Founder 2026-10-22, Part B2 (just-in-time hints, `apps/web/src/hints.ts`, device settings `hintsDone[]`).** `apps/web/test/serve-feedback.spec.ts` `` `B2.1d the first late serve brings one hint, once: never over a sheet, gone after the tap, not again after reload (${locale}) at 390×844` `` (vi/en: no hint before a serve; the first late serve of a new save's shift 1 shows `hint.tipWindow` as the one banner of the guide slot, "Đã hiểu" ≥ 44 px, axe 0; a management sheet hides it and closing brings it back; the tap removes it; after a reload with the same late serve as the last one it stays away).

- **fun-onboarding-visual (2026-10-14).** `apps/web/test/first-shift-visual.spec.ts` (local config, engine-made saves from
  `apps/web/test/fixtures/first-shift-visual.ts`, DOM-only, 390×844 · 360×740 · 1280×720 where marked ×3; run
  `npx playwright test apps/web/test/first-shift-visual.spec.ts --workers=2`):
  `P0 first shift shows wallet, keg and one thing to tap at a time at ${w}px` (×3: the whole HUD shown since JSON 2.1.2 (the 2026-10-14 minimal HUD is gone), at most one `[data-spotlight]` on every 250 ms frame,
  stages guest → check → serve → wallet in order, the pointer retires after the first serve, no `.guide`, no horizontal scroll) ·
  `P0 coins fly from the table to the wallet and lost reputation falls from the guest at ${w}px` (×3) ·
  `P0 numbers and spotlights keep their cue without motion when the player asks for reduced motion` ·
  `P0 the step guide is only a fallback: idleness before the first serve starts it once and a tap resets the wait` ·
  `P0 the ready check with its pointer passes axe and keeps 44px targets at ${w}px` (×3) ·
  `P0 an empty keg is greyed and exactly the refill button asks for a tap` (+ axe) ·
  `P0 the door shows patience rings and a refused group of ${2|1} says "${2 ghế|Hết chỗ}" at ${w}px` (×6, + axe on `.door`) ·
  `P0 two refusals inside one bubble lifetime: the door says the newest reason and no bubble covers a guest at ${w}px` (×3, S6 review round 2: fixture `crowd2` with two `queue_overflow` 630 ms apart;
  at most one refused group drawn with its one bubble, no `.door-bubble` box over another `.door-guest` on any 100 ms frame, the second refusal replaces the first < 2.2 s after it; no axe: the live clock keeps refusing groups, the ×6 case is the door's axe pass) ·
  `2.1.2 a brand-new save shows the whole HUD and Nâng cấp from shift 1 and keeps the journey for shift 2 at ${w}px` (×3 + axe + shot `hud-shift1-first-screen-${w}.png`: the nav reads Mở ca · Nhập hàng · Nâng cấp, the gear, timer row, weather row and stock strip are visible, no Journey button, no `.quest-trigger`, no `[data-spotlight]`, the Upgrades sheet holds one `[data-goal="buyTable"]`; the thresholds themselves: `packages/engine/test/spotlight-reveal.test.ts`, `sealed-economy.test.ts`) ·
  `P0 after shift 1 the HUD opens up and the Upgrades sheet holds exactly one card at ${w}px` (×3, + axe; fixture `rest`: a capacity snapshot, the frozen 2.0.4 file with a custom version, where the card is the first table level-up) ·
  `P0 on the seat model after shift 1 the Upgrades sheet holds exactly one card, the second table, at ${w}px` (×3, + axe; fixture `seat-rest`: the bundled seat model, the card is `[data-goal="buyTable"]` "Mua bàn · 1.070 xu" with the single spotlight,
  after buying it the one card is the next table at 9.250 xu and the nudge is spent; the save holds 2 tables and `coins − 1.070`) ·
  `P0 after shift 2 the full Upgrades list and the Journey button open and nothing blinks`.
  Stage 00 (Wave 1 × S1, 2026-10-20): a new shop has one table and its seed is random, so the coins-fly case waits up to 150 s of game time (was 40 s) for the first guest who really walks out
  — a pair is turned away at the door without a penalty (`spawn.pPair`), the first single who sits down and waits out their patience is the one whose reputation falls; same assertion, 12/12 on a repeat.
  Unit proof: `packages/engine/test/spotlight-reveal.test.ts` (8 cases: `pickSpotlight` precedence, first-play pointer, restock boundaries,
  first-goal window — `... (capacity snapshot)` and `between shifts the first goal is table 2, spotlighted on the nav, then on its own buy button, and only until the full list opens (seat model)` —
  `revealed()` thresholds incl. onboarding-off, 1.x pins and old-pin seed fallback, and the door ring's `queuePatience`
  against a real rules-v1 engine that holds a queued group `graceMs` past its patience) and `packages/engine/test/presentation.test.ts`
  `first play shows no step banner; the fallback starts on idleness before the first serve, once, within the daily cap` and
  `reveal thresholds and the idle window are optional in old pins, validated when present, and never fractional or negative`.
  Specs that are not about onboarding keep the whole HUD through `apps/web/test/fixtures/full-hud.ts` (`fullHud(raw)` zeroes the four reveal thresholds)
  or `apps/web/test/fresh-game.ts` (`bootFresh`); the five-new-player test is an owner playtest (`docs/phase0-alpha-playtest.md` §6), never PASS here.
- **Founder 2026-10-22, Part A (JSON 2.1.3).** A1 "Mời về" not in shift 1: `packages/engine/test/spotlight-reveal.test.ts` `Mời về has its own reveal threshold, after one completed shift and never without the HUD; a pin without the key reads the seed`
  (+ `kick` in `feature reveal follows completed shifts, …` and `a save pinned to 2.1.1 keeps its HUD thresholds until its next opening adopts the bundled 2.1.4, and shows no Mời về in shift 1 either way`);
  UI: `apps/web/test/kick-table.spec.ts` `Wave 3 in shift 1 Mời về is not shown yet, though the HUD is: it is revealed after one completed shift (JSON 2.1.3, founder 2026-10-22)` (fixture `first`; review A-r1, 2026-10-23: it also opens the shift book from the nav and finds no "Mời tất cả về", which `App.tsx` gates with the same `show.kick`) and
  `Wave 3 after one completed shift Mời về is on a lingering table: the price line and the button (JSON 2.1.3, founder 2026-10-22)` (fixture `second`). A2 no `ngoily` in the onboarding shift:
  `packages/engine/test/first-shift-guests.test.ts` (6 cases: none in shift 1 even at weight 0.6 and back in shift 2; the exclusion equals the draw at weight 0, shift 1 identical world;
  a 2.1.2 pin still draws them and replays byte for byte; the recorded S6 history `seat-2.1.0-v28.json` served one in its shift 1 and still replays to its hash; onboarding off excludes none;
  key loading and validation). A3 one "Mở ca": `apps/web/test/yard.spec.ts` `A3 at rest exactly one Mở ca is on screen, the bottom nav's: whole, uncovered and in the thumb zone, and the opening note points at it (${locale}) at ${viewport.width}px`
  (vi/en × 390/360/1280, axe) and `apps/web/test/first-shift-visual.spec.ts` `A3 a save pinned to 2.1.1 with no shift played hides the bottom nav, so the opening note keeps its one Mở ca; the opening adopts the bundle at ${viewport.width}px` (×3, axe; fixture `pin-2.1.1`);
  the four `.first()` of PR #32 in `first-shift-visual.spec.ts` are strict locators again.
- `apps/web/test/feedback.spec.ts` — `A4 ${locale} actual empty and refilling order feedback agrees with the guide at ${width}px` (VI/EN ×360/390/1280): wait-ready uses the actual current order cause, including empty raw stock and a reserved refill with raw stock zero. Run `npx playwright test apps/web/test/feedback.spec.ts`.

- `packages/engine/test/game.test.ts`, inside `'startup rejects configurations that create fractional
  stock, unusable equipment or silent audio crashes'` (a table-driven `assert.throws` test): the
  `'first customer can never fit'` case sets `c.onboarding.firstShift.firstGroupSize = 99` and asserts
  `loadConfig` throws — this proves the config.ts:262 load-time throw specifically; the sibling
  runtime check has its own direct test too (see Variants).
- `packages/engine/test/config-pinning.test.ts:144` `'a candidate designed for larger initial tables
  cannot strand the first group at a preserved small stall'` is direct proof of engine.ts:782's
  runtime `configOnboardingTables` fail: it pins a candidate config with `firstGroupSize = 4` onto a
  game with only smaller tables while `completedShifts === 0`, and asserts
  `g.command(open(g), candidate)` returns exactly `{ok: false, reason: 'configOnboardingTables'}`. Run
  via `npm test` or targeted: `node --import tsx --test packages/engine/test/config-pinning.test.ts`.
- `packages/engine/test/presentation.test.ts` **is** the step-guide state machine's dedicated proof —
  contrary to an earlier pass's "zero hits" claim here: `'the event-driven guide resets after serving
  and obeys the daily repeat cap'` (`:16`) drives `advanceGuide` through a `customer_served` reset,
  then a 3-in-a-row `customer_left` streak, and asserts `guideIndex` jumps to the
  `waitFor: 'order_ready'` step with `guideRuns` incrementing (`:23-24`), then loops 20 more losses and
  asserts `guideRuns` caps at `config.values.onboarding.stepGuide.maxAutoRepeatsPerDay` (`:26`) — direct
  proof of both the lost-streak auto-trigger and the daily-repeat cap. `'a three-customer queue loss
  triggers the three-customer guide immediately'` (`:30`) asserts a single `customer_left` event
  carrying `data.count: 3` triggers the same jump in one call, proving `lostStreak += event.count` (not
  a flat `+= 1`). Run via `npm test` or targeted: `node --import tsx --test
  packages/engine/test/presentation.test.ts`.
- `apps/web/admin-test/admin.spec.ts:259` `'M2-ONBOARDING local editor publishes thresholds and guide
  steps; disabled mode hides a retained guide in VI/EN'` is direct proof that an admin-published
  `onboarding.stepGuide.steps`/`lostStreakToGuide`/`firstShift.guaranteedFirstGroupWithinMs` change
  reaches a real runtime player session: it publishes a changed `stepGuide.steps[0].copyKey`, opens a
  fresh guest session pinned to that version, and asserts the fetched config matches (`:306`), the
  guide banner renders the new copy, and the forced first-shift spawn timing
  (`nextSpawnAt - startedAt`) equals the *published* `guaranteedFirstGroupWithinMs` minus
  `config.runtime.tableSeatingMs` (`:312`, matching engine.ts:806's own formula), with the
  disabled-mode counterpart falling back to normal spawn math. Run via `npx playwright test --config
  playwright.admin.config.ts apps/web/admin-test/admin.spec.ts` (see
  [admin-registry](admin-registry.md)). It does not exercise the lost-streak trigger or repeat cap —
  see `presentation.test.ts` above for that.
- `apps/web/test/game.spec.ts:242` `'muting, guide skipping and reduced-motion preference survive
  normal play'` clicks the guide's skip button (`'Bỏ qua'`), reloads, and asserts `tbh.settings.v1`
  matches `{guideDone: true, ...}` with the guide banner (`.guide`) at zero count — direct proof that
  the skip button's `{guideDone: true, guideIndex: null}` write (`App.tsx:387`) persists across reload
  and actually suppresses the banner, not just an in-memory UI toggle. Run via `npx playwright test
  apps/web/test/game.spec.ts` (default `playwright.config.ts`).
- `npm run sim:onboarding` (ran via its documented invocation, not re-executed this pass): runs
  `Game` with `onboarding.enabled` both `true`/`false`, crossed with 2 kitchen-level profiles × 5 fixed
  seeds (`headless.ts:11-18`), requires ≥1000 real serves per row (`MIN_SERVED`), then asserts **every**
  row's `k` sits inside `seedConfig.values.k.band` (`headless.ts:71`) — this is the actual proof behind
  this repo's "onboarding never breaks k" invariant. Final line: `'PASS: actual customer payment + tip
  / anchor; no throughput term, >=1000 serves per seed in cold and fully unlocked menu profiles.'`
- `apps/web/remote-test/login-invitation.spec.ts`, 6 tests — the real proof for `canInvite()`/
  `LoginInvitation`: `` `first closed shift offers exactly three benefits without loading Google or
  hiding the book in ${locale}` `` (run for both `vi`/`en`, `:32`), `'all guest invitation surfaces
  share cooldown and unlock again at the configured shift boundary'` (`:53`), `'disabled invitation
  flags suppress each surface while the account entry remains usable'` (`:68`), `'accepting the
  invitation uses the existing Google panel and unavailable login stays skippable'` (`:78`), `'leaving
  with guest progress never warns of data loss and the invitation cooldown survives a new tab'`
  (`:90`), `'eligible departure invitations never block leaving a device-persistent guest'` (`:103`).
- Corroborating but **not** dedicated onboarding proof — these tests set `onboarding.enabled = false`
  or tweak `firstShift.*` purely as fixture knobs to isolate an unrelated mechanic, and assert nothing
  about onboarding itself: `packages/engine/test/rush-clock.test.ts:7`, `rush-schedule.test.ts:8`,
  `economy2.test.ts:34,49,105,133,142` (kitchen-batch/keg-carry setup via `firstGroupSize`/`firstOrder`/
  `guaranteedFirstGroupWithinMs`), `game.test.ts:224,317` (round-precedence sampling setup),
  `checkpoint.test.ts:41`, `well-rested.test.ts:40,160`, `production.test.ts:30`.
- **Founder 2026-10-22, Part B1 (JSON 2.1.4).** B1.3 no flat beer in the onboarding shift: `packages/engine/test/early-pacing.test.ts` `B1.3 no flat beer in shift 1: a beer left 15 s on the tray is served fresh (no glass_stale, no stale serve, no stale reputation); from shift 2 the same wait makes it flat` and `B1.3 a pin without the key (JSON 2.1.3): the first beer of a new save left 15 s goes flat, as before`; UI `apps/web/test/economy2.spec.ts` `JSON 2.1.4 in shift 1 of a new save beer never goes flat: the cooler badge reads ∞, while its sheet still states the level's own seconds`. Shift 1 at one table also seats singles only (spawn-queue-seating, B1.1). Measurement of shifts 1-2 (not a gate): `node --import tsx packages/engine/sim/early-pacing.ts`.

## Verification procedure

- `npm run sim:onboarding` — already part of `npm run verify`'s chain (per `SKILL.md`'s Required
  Sequence step 2: `check:config → check:i18n → build → test → sim:onboarding → sim:rush →
  sim:career:gate`).
- Targeted config-validation case: `node --import tsx --test packages/engine/test/game.test.ts`.
- `npx playwright test --config playwright.remote.config.ts apps/web/remote-test/login-invitation.spec.ts`.
- `npm run check:i18n` covers the 8 `onboarding.*` keys' VI/EN parity and interpolation shape.
- `npm run verify` is the whole-repo gate for any change here.

## Uncovered paths

- **The VN-day-rollover reset of `guideRuns` is the one step-guide mechanic with no test.**
  `presentation.test.ts`, `admin.spec.ts:259` and `game.spec.ts:242` (see Existing proof) between them
  cover the lost-streak auto-trigger, the `maxAutoRepeatsPerDay` cap, published-config propagation, and
  skip/persistence of `guideDone`/`guideIndex` across reload — an earlier pass here called all of this
  untested; it wasn't. `settings.guideDay !== day` resetting `guideRuns` to `0` on a new VN calendar day
  (`local.ts:70`) is the one piece with zero hits for `guideDay` outside fixture initialization
  (grep-confirmed across `apps/web/test`, `apps/web/*-test`, `packages/engine/test`).
- **`firstShift`'s forced mechanics are never asserted as onboarding correctness in their own right** —
  every real hit found (listed under "corroborating but not dedicated" above) uses `firstGroupSize`/
  `firstGroupType`/`firstOrder`/`guaranteedFirstGroupWithinMs`/`riskEventsDisabled`/`rushDisabled` only
  to shape a fixture for testing something else.
- The engine's own `World.lostStreak` (increment/reset sites above) is not confirmed to be read by any
  consumer within the files opened this pass — it may be presentation/telemetry-only on `WorldView`;
  not traced further.
- No test drives `ui_sheet_open:upgrade` through `advanceGuide` to confirm step 5 (`open_upgrade`)
  actually advances/completes the guide.
- `hints.*` and `targets.*` (`firstServeWithinMs`, `firstShiftLostGroupsMax`) config blocks exist but no
  code reading them was found in the files opened this pass (only `stepGuide`/`firstShift`/
  `loginPrompt`/`featureReveal` are wired to code above) — plausibly consumed elsewhere, not confirmed.

## Variants

- **success** — sim:onboarding's `onboardingEnabled: true` rows; `login-invitation.spec.ts`'s
  accept-the-invitation test.
- **cancel/reason** — `login-invitation.spec.ts`'s "disabled invitation flags suppress..." and
  "leaving ... never warns of data loss..." tests; the UI's own skip button (`App.tsx:387`) bypasses
  `advanceGuide` entirely — exercised end-to-end by `game.spec.ts:242` (skip persists across reload,
  guide banner stays hidden).
- **empty** — not evidenced (no test drives a `stepGuide.steps` traversal to `guideIndex === null`
  other than via skip).
- **persistence** — `readSettings()`'s `guideIndex` sanitization (`local.ts:17`, non-negative-integer-
  or-null guard); `login-invitation.spec.ts`'s "...cooldown survives a new tab"; `game.spec.ts:242`
  (skip's `guideDone`/`guideIndex` write survives reload).
- **capacity** — **two separate gates for the same invariant, both tested**: `config.ts:262` throws at
  config-load time (`game.test.ts`'s `'first customer can never fit'`); `engine.ts:782`'s
  `configOnboardingTables` runtime fail — reached via a config-pin at shift-open when
  `w.completedShifts === 0` — is directly asserted by `config-pinning.test.ts:144`'s `'...cannot strand
  the first group...'` (`{ok: false, reason: 'configOnboardingTables'}`).
- **duplicate/idempotent** — not evidenced.
- **stale** — not evidenced.
- **time-jump** — sim:onboarding's `game.advance(w.now + STEP_MS)` loop across up to `MAX_STEPS =
  500000` steps per seed.
- **offline/reconnect** — not applicable to this module; see [remote-session-outbox](remote-session-outbox.md).

## Gotchas

- **`onlyAfter`'s string value is never compared — only its truthiness matters.** Config's step 5 sets
  `onlyAfter: "shift_closed"`, which reads like "wait for a `shift_closed` event", but both real call
  sites — `App.tsx:282`'s `!guide.onlyAfter || w.completedShifts > 0` and `local.ts:85`'s `!step.onlyAfter
  || game.world.completedShifts > 0` — treat it as a plain boolean gate on `completedShifts > 0`. The
  literal string `"shift_closed"` is dead content; any non-empty string would behave identically.
- **Two `lostStreak` counters with the same name, different owners, different lifecycles.**
  `World.lostStreak` (engine, `engine.ts`) increments on queue-timeout/order-expiry and resets on
  shift-open/order-served; `Settings.lostStreak` (web, `local.ts`, persisted in `tbh.settings.v1`) is
  computed independently inside `advanceGuide` from the `customer_left` domain event's `count` field,
  not by reading `World.lostStreak`. They track the same real-world phenomenon through two unrelated
  code paths — a change to one does not touch the other.
- The load-time (`config.ts:262`) and runtime (`engine.ts:782`) `firstGroupSize`-vs-capacity checks
  guard the same invariant twice, at two different moments (config load vs. a config-pin at
  shift-open); both are directly tested (`game.test.ts`'s `'first customer can never fit'`,
  `config-pinning.test.ts:144`'s `'...cannot strand the first group...'`).
- `k.band` (`[2.0, 3.0]`, `economy.tbh.json:132-134`) is read from config by `sim:onboarding`'s final
  assertion (`headless.ts:71`), not hardcoded in the sim script itself.
- `stepGuide.steps[2]`'s `waitFor: 'order_served'` and step 4's `waitFor: 'coin_gain'` both fire on the
  same real player action (serving a customer emits both events). `advanceGuide` advances `guideIndex`
  **once per matching event, inside its per-event loop** (`local.ts:68-87`) — not once per call — so
  when both events land in the same `events` array (one serve), the guide advances twice in a single
  `advanceGuide` invocation (confirmed by reading the loop body directly; no committed test exercises
  this exact `order_served`→`coin_gain` sequence today — `presentation.test.ts`'s dedicated step-guide
  tests use `shift_opened`/`customer_served`/`customer_left` fixtures only, not this pair).

## Related

[remote-session-outbox](remote-session-outbox.md) — guest identity and the `LoginInvitation`
touchpoints ultimately hand off to the same account-link flow that module's `remote.ts` exposes.
[ui-shell-i18n-a11y](ui-shell-i18n-a11y.md) — the guide banner's copy goes through the same `t()`/
`check:i18n` path as the rest of the shell, and its animation (if any) is subject to the same
`prefers-reduced-motion` rules. [economy-k-ledger](economy-k-ledger.md) — `sim:onboarding` is one of
the two sims (with `sim:rush`) that pin the `k` invariant this repo treats as binding.
[table-lifecycle](table-lifecycle.md) — the `configOnboardingTables`/`config:firstGroup` capacity
gates exist because the first onboarding group must fit an actual table from that feature's state
machine.

## Changelog — A4
| Date | Change |
|---|---|
| 2026-09-16 | Add current order feedback and rules26 loss evidence regression citations; historical replay remains unchanged. |
| 2026-10-14 fun-onboarding-visual | First play no longer starts the step banner: spotlight + pointer, minimal first-shift HUD, door queue, flying numbers; the banner is a fallback (lost streak or `idleToGuideMs`). JSON 2.0.5 adds `onboarding.idleToGuideMs` and `featureReveal.{hudAfterShifts, upgradeAllAfterShifts, journeyAfterShifts}`. New proof cited above; the five-new-player test stays an owner playtest. |
| 2026-10-22 founder override (JSON 2.1.2, config only) | `featureReveal.hudAfterShifts` and `upgradeAfterShifts` 1 → 0: shift 1 shows the whole HUD, the bottom nav (Mở ca · Nhập hàng · Nâng cấp) and the Upgrades button (founder: he needs restock and upgrade from the start); journey / quests / league (2 / 2 / 3) and `upgradeAllAfterShifts` 2 unchanged; no code. `first-shift-visual.spec.ts` asserts the HUD at shift 1 instead of the minimal one (and `.first()` on the two "Mở ca" buttons), plus a new test; `next-goal.spec.ts` counts the gear in `.hud`; `kick-table.spec.ts` now expects Mời về in shift 1 (same gate); `spotlight-reveal.test.ts` / `sealed-economy.test.ts` pin the thresholds and a 2.1.1 pin keeping its own until the next opening adopts 2.1.2. |
| 2026-10-22 founder, Part A (JSON 2.1.3) | Two Tier C keys: `featureReveal.kickAfterShifts` 1 ("Mời về" from shift 2, AND-ed with the HUD: `revealed().kick`) and `firstShift.excludedCustomerTypes` ["ngoily"] (an engine rule of the onboarding shift, gated by the key); the opening note drops its "Mở ca" while the bottom nav is shown and points at the nav's (`rest.startBelow`). `kick-table.spec.ts` again expects no Mời về in shift 1 (the 2.1.2 row above had turned it around) plus a shift-2 case; `first-shift-visual.spec.ts` uses strict "Mở ca" locators again and gains the 2.1.1-pin exception; `yard.spec.ts` asserts one Mở ca in the thumb zone; new `first-shift-guests.test.ts`. Proof cited above. |
| 2026-10-23 founder, Part B1 (JSON 2.1.4) | `firstShift.staleDisabled` true (Tier C, engine rule gated by the key): no flat beer while the save has completed no shift; `firstShift` shape and the renamed 2.1.1-pin citation updated. STOP: `sim:balance` + `sim:career:gate` red on this label, waiting for the founder (08-SPEC changelog 2026-10-23 / JSON 2.1.4). |
| 2026-10-23 founder 22/10, Part B2.1 (UI only) | The `hints.*` block gets a reader: `apps/web/src/hints.ts` (`maxConcurrent`, `dismissOnTap`, `neverRepeatAfterDone`; `returningPlayerResetAfterDays` not read: F27 ties it to the step guide); `Settings.hintsDone` (`apps/web/src/local.ts`, sanitised to strings). A hint shares the step guide's banner slot, never shows over a sheet, an equipment panel or the order card, and lights its target only when `pickSpotlight` lights nothing. First hint: `tipWindow` after the first late serve. Proof cited above. The "`hints.*` … exist but no code reads them" line under Uncovered paths is no longer true for `hints.*`. |
