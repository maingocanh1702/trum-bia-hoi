# Onboarding & step guide (spec ref: `docs/features/F27-onboarding.md`; `docs/config/economy.tbh.json` → `onboarding`)

## Observable contract

- Config (`docs/config/economy.tbh.json:1100-1172`, tier C, `_rule: "F27 (🟢 ràng buộc 08/09)..."`), real shape:
  `enabled: true`, `firstShift: {guaranteedFirstGroupWithinMs: 8000, firstGroupType: 'thuong', firstGroupSize: 1,
  firstOrder: ['bia'], riskEventsDisabled: true, rushDisabled: true}`, `lostStreakToGuide: 3`,
  `stepGuide: {onFirstPlay: true, skippable: true, maxAutoRepeatsPerDay: 2, steps: [5 entries]}`,
  `loginPrompt: {afterFirstShift: true, onLeaderboardOpen: true, onLeaveWithProgress: true, cooldownShifts: 3,
  leaveProgress: {minCompletedShifts: 1, minLifetimeEarned: 1}}`, `hints.*`, `featureReveal:
  {upgradeAfterShifts: 1, questsAfterShifts: 2, leagueAfterShifts: 3, locationsAfterLifePathLevel: 1}`,
  `targets: {firstServeWithinMs: 30000, firstShiftLostGroupsMax: 1}`. The 5 `stepGuide.steps` entries
  (`id`/`waitFor`/`copyKey`, `open_upgrade` also carries `onlyAfter: "shift_closed"`) — see Gotchas for
  what `onlyAfter`'s value actually does. `k.band` (the invariant `sim:onboarding` checks against) is
  `[2.0, 3.0]` (`economy.tbh.json:132-134`), not hardcoded in the sim.
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
  `:69-70`) and resets `guideRuns` on day change. `shift_opened` → `lostStreak = 0`; if
  `!guideDone && stepGuide.onFirstPlay`, `guideIndex = 0` (`:73`). `customer_served` → `lostStreak = 0`
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

- `packages/engine/test/game.test.ts`, inside `'startup rejects configurations that create fractional
  stock, unusable equipment or silent audio crashes'` (a table-driven `assert.throws` test): the
  `'first customer can never fit'` case sets `c.onboarding.firstShift.firstGroupSize = 99` and asserts
  `loadConfig` throws — this is the **only** direct proof of the capacity invariant, and it proves the
  config.ts:262 load-time throw, not engine.ts:782's runtime `configOnboardingTables` fail (see
  Variants).
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

## Verification procedure

- `npm run sim:onboarding` — already part of `npm run verify`'s chain (per `SKILL.md`'s Required
  Sequence step 2: `check:config → check:i18n → build → test → sim:onboarding → sim:rush →
  sim:career:gate`).
- Targeted config-validation case: `node --import tsx --test packages/engine/test/game.test.ts`.
- `npx playwright test --config playwright.remote.config.ts apps/web/remote-test/login-invitation.spec.ts`.
- `npm run check:i18n` covers the 8 `onboarding.*` keys' VI/EN parity and interpolation shape.
- `npm run verify` is the whole-repo gate for any change here.

## Uncovered paths

- **No test exercises the step-guide state machine itself.** Across every engine and web test/spec
  file, zero hits for `stepGuide`, `advanceGuide`, or `lostStreakToGuide` outside the config default
  definition and the one config-validation case above. The lost-streak auto-trigger
  (3-in-a-row → jump to the `order_ready` step), the `maxAutoRepeatsPerDay` cap, the VN-day-rollover
  reset of `guideRuns`, and skip/persistence of `guideDone`/`guideIndex` across reload are all
  unverified by any automated test today.
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
  `advanceGuide` entirely (untested).
- **empty** — not evidenced (no test drives a `stepGuide.steps` traversal to `guideIndex === null`
  other than via skip).
- **persistence** — `readSettings()`'s `guideIndex` sanitization (`local.ts:17`, non-negative-integer-
  or-null guard); `login-invitation.spec.ts`'s "...cooldown survives a new tab".
- **capacity** — **two separate gates for the same invariant, only one tested**: `config.ts:262` throws
  at config-load time (tested via game.test.ts's `'first customer can never fit'`); `engine.ts:782`'s
  `configOnboardingTables` runtime fail at shift-open is a second, later check with no direct test
  found.
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
  guard the same invariant twice; only the load-time one currently has a test.
- `k.band` (`[2.0, 3.0]`, `economy.tbh.json:132-134`) is read from config by `sim:onboarding`'s final
  assertion (`headless.ts:71`), not hardcoded in the sim script itself.
- `stepGuide.steps[2]`'s `waitFor: 'order_served'` and step 4's `waitFor: 'coin_gain'` both fire on the
  same real player action (serving a customer emits both events); the guide only advances one step per
  matching event per `advanceGuide` call, so a single serve advances the guide at most one step even
  though two of its steps could plausibly match the same moment.

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
