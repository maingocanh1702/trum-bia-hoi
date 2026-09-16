# Trùm Bia Hơi feature map

Behaviour-level inventory of Trùm Bia Hơi (Hanoi sidewalk draft-beer stall tycoon). Agents use this
map to decide what to run and what counts as proof before calling a slice done; humans use it as the
regression checklist. Adapted from
[poteto/verification-skill-example](https://github.com/poteto/verification-skill-example)'s feature
map to this repo's engine/server/web-local/web-remote shape.

**Coverage today: 23 of 23 files.** Wave V1 (`trum-bia-hoi-agent-understanding-verification-implementation-plan.md`
§5) shipped in three PRs by area: gameplay-core (table → kitchen → serve → glass → economy → save →
cross-system), the engine/server remainder (shift/spawn/economy/progression pieces), and web-remote/
admin (session, admin registry, shell, assets). Every file below now exists and is linked;
`ls references/features/*.md` remains the ground truth if this prose ever drifts.

## Baseline preconditions

- Node ≥ 22.12.0 (`package.json` `engines`), `npm ci` at repo root (workspaces `packages/*`,
  `apps/*`).
- `VITE_TBH_LOCAL=1` for the legacy/local Playwright suite (`playwright.config.ts` sets this for its
  own webServer — you don't need to export it by hand to run `npm run test:e2e`).
- Remote-mode UI tests need the isolated API fixture, never a mocked `/api` — each remote-tier config
  spins up its own `server.ts` fixture.
- Ports are fixed today, not per-worktree (`verify:port` is wave V3): dev `5173` / API `5175`
  (`npm run dev`, `npm run dev:server`); e2e legacy `playwright.config.ts` baseURL `4178`; remote
  `playwright.remote.config.ts` baseURL `4179` / auth `4180`; dev-identity
  `playwright.dev-identity.config.ts` same `4179`/`4180` (near-duplicate of remote, different
  `testMatch`/`testIgnore`); accessibility `playwright.accessibility.config.ts` spreads dev-identity;
  admin `playwright.admin.config.ts` baseURL `4181` / API `4182`; playable
  `playwright.playable.config.ts`, 3 viewport projects, baseURL `4209/4211/4213`, auth+API
  `4210/4212/4214`. Two worktrees running the UI tier at once on the main ports will collide — this
  is a known gap, not yet fixed (see `SKILL.md` Stale-Build Rule).
- This repo has 9 worktrees active in parallel at times (`git worktree list`); confirm you're testing
  the instance you think you are before trusting a result.

## Proof and skip reporting

The relevant feature file(s) define the coverage set for a change — see `SKILL.md`'s Required
Sequence for the full procedure. Summary:

- **Every proof line is a test/spec name or a sim command** (`file.test.ts`: exact `test('...')`
  string, `file.spec.ts`: exact Playwright test name, or an exact `npm run sim*` invocation) —
  verified by opening the file, not a prose claim. "The app opens" is not proof.
- Exercise every reachable variant the change can affect: success, cancel/reason, empty, persistence,
  capacity, duplicate/idempotent, stale, time-jump, offline/reconnect — whichever apply to that
  feature (each feature file's own Variants section says which).
- Fixture saves (`packages/engine/test/fixtures/*.ts`, `apps/web/test/fixtures/*.ts`) count as
  driving the production path — they replay real commands through the real engine
  (`execFileSync`/`game.command`), they are not hand-written JSON.
- When a path is genuinely unreachable or skipped, name it with the `SKIPPED:` block from `SKILL.md`
  — reason, closest verified path, risk. Don't silently omit it.

## Verification tooling itself

The bridge/fixture machinery this map's UI-tier procedures depend on (`window.__TBH_VERIFY__`,
`apps/web/test/tbh-fixture.ts`) is infrastructure, not a gameplay feature — it has no honest home in
the 23 feature files below, so its own correctness is proven here instead of stretched into an
unrelated one:

- `packages/engine/src/snapshot.ts` (the pure `World → VerificationSnapshot` the bridge exposes) —
  proven by `packages/engine/test/snapshot.test.ts` (4 cases): the full documented field-group
  contract populated with non-trivial values (queue/lease/signboard/flyer/dog/daily/attendance, not
  just the empty/default case), shift-timing that excludes paused/hidden wall time and freezes once a
  shift closes, purity (`game.world` untouched, output is real JSON via
  `JSON.parse(JSON.stringify(s))`), and the resting/no-shift null-field shape.
- `apps/web/test/tbh-fixture.ts` (the shared Playwright fixture wrapping the bridge — `tbh.snapshot()`,
  `tbh.waitForEvent()`, `tbh.shot()`, `tbh.consoleErrors()`, `tbh.evidence()`) — proven by
  `apps/web/test/tbh-fixture.test.ts` (13 cases): evidence-path construction and sanitisation
  (a branch containing `/`, and a traversal-shaped shot name, both collapse to one safe path segment
  under `artifacts/verification/<branch>/`), `matchEvent`'s strict-since event matching,
  `waitForEvent`'s polling/timeout behaviour, console-error collection, and the exported fixture's
  exact five-method surface.
- The bridge driven end to end through a real page, not just unit-tested:
  `apps/web/test/bridge.spec.ts` — cited under [serve-outcomes](serve-outcomes.md), since that test's
  actual subject is a serve outcome, not the bridge's own mechanics.

## Full sweep

Walk this map top to bottom for a broad regression; finish with `multi-system-journeys.md`. This is
the wave-V1 target order (`trum-bia-hoi-agent-understanding-verification-implementation-plan.md`
§5.2) — every file below exists today.

```text
shift-lifecycle ✅ → spawn-queue-seating ✅ → table-lifecycle ✅ → order-rounds-kitchen ✅ → serve-outcomes ✅
→ glass-beer-flat ✅ → keg-refill ✅ → restock-inventory-menu ✅ → economy-k-ledger ✅ → rush-weather ✅
→ stamina-attendance-lifepath ✅ → quests-daily-bonus ✅ → upgrades-equipment-tables ✅ → location-lease ✅
→ flyer-signboard-dog ✅ → seasons-leaderboard ✅ → onboarding-guide ✅ → save-replay-local ✅
→ remote-session-outbox ✅ → admin-registry ✅ → ui-shell-i18n-a11y ✅ → assets-manifest ✅ → multi-system-journeys ✅
```

## Shift & flow

- [shift-lifecycle](shift-lifecycle.md): the shift clock (prepare/wash/rush/close), `manual-close`,
  well-rested carry-over, `rush-clock`.
- [spawn-queue-seating](spawn-queue-seating.md): customer arrival interval, queue formation and
  overflow, the separate shipper delivery-order lane.

## Table & service

- [table-lifecycle](table-lifecycle.md): the table/order state machine (`EMPTY` → `SEATING` →
  `ORDERING` → `AWAITING_SERVE` → `CONSUMING` → `PAYING` → `CLEANING` → `EMPTY`), one-table-one-group,
  the occupied/Chí Phèo edge case.
- [order-rounds-kitchen](order-rounds-kitchen.md): kitchen pan/burner prep pipeline, keg/pour
  projection feeding `Game#prepare()`, repeat order rounds ("lai rai") within one table visit.
- [serve-outcomes](serve-outcomes.md): the serve-tap outcome taxonomy (early / late / grace /
  expired, plus the code-level `stale` case) and the two-clock (patience + freshness) combine rule.
- [glass-beer-flat](glass-beer-flat.md): per-glass freshness/flat lifecycle, cooler-upgrade effect,
  the keg status it depends on.
- [keg-refill](keg-refill.md): dedicated keg-level/refill-purchase feature file (glass-beer-flat
  covers keg *status* only as far as the freshness contract needs it).
- [restock-inventory-menu](restock-inventory-menu.md): ingredient stock, menu pause, restock
  commands.

## Economy & progression

- [economy-k-ledger](economy-k-ledger.md): the single mutating ledger helper (`credit()`), k
  (value-per-served-order) measurement via sims.
- [rush-weather](rush-weather.md): rush schedule + weather multiplier pressure.
- [stamina-attendance-lifepath](stamina-attendance-lifepath.md): stamina/well-rested, attendance
  streak, life-path unlock gating.
- [quests-daily-bonus](quests-daily-bonus.md): daily quest planning + claim, attendance rewards.
- [upgrades-equipment-tables](upgrades-equipment-tables.md): equipment upgrade purchase/quote
  (cooler, etc.), live-upgrade application mid-shift.
- [location-lease](location-lease.md): lease quote, rent/leave location.
- [flyer-signboard-dog](flyer-signboard-dog.md): flyer campaigns, signboard style, dog level
  purchase.
- [seasons-leaderboard](seasons-leaderboard.md): season rollover/sync, server leaderboard +
  competition snapshot.

## Onboarding & persistence

- [onboarding-guide](onboarding-guide.md): F27 guided-onboarding steps, engine `firstShift`/
  `lostStreak` forcing, `sim:onboarding`'s k-band assertion.
- [save-replay-local](save-replay-local.md): `encodeSave`/`decodeSave` replay, checkpoint fast path,
  IndexedDB local career storage, the documented `claimLocal` boundary.
- [remote-session-outbox](remote-session-outbox.md): `remote.ts` journal, one-writer lock, heartbeat,
  reconnect, Google account link/switch.

## Admin & shell

- [admin-registry](admin-registry.md): `Admin*` screens, server registry publish/rollback,
  admin-auth (5 roles, TOTP MFA), local-history moderation.
- [ui-shell-i18n-a11y](ui-shell-i18n-a11y.md): `App.tsx` shell, i18n fallback, 44px hit targets,
  reduced-motion, viewport matrix.
- [assets-manifest](assets-manifest.md): manifest entries, `check:assets`, `Sprite`/`audio.ts`
  consumers.

## Multi-system

- [multi-system-journeys](multi-system-journeys.md): journeys that cross engine↔web, local↔remote,
  or shift/save/season together — read this whenever your change isn't cleanly inside one tier.

## Entry contract

Every feature file uses the same structure (plan §5.3):

```text
# <Feature>                     (spec refs: 03-SPEC / 08-SPEC / decision doc)
## Observable contract          world fields · events · Result.outcome/reason · DOM/aria · server responses
## How to reach it               engine: commands + advance / fixture generator · UI: buttons by aria name · remote: API route
## Existing proof                engine tests (file: test name) · server tests · web specs · sims
## Verification procedure        what to run for a change here, per tier
## Uncovered paths                behaviours with no test today — the honest gap list
## Variants                      success · cancel · reason · empty · persistence · capacity · duplicate/idempotent · stale · time-jump · offline/reconnect
## Gotchas · Related
```

## Conventions for authors

Each rule below exists because it was learned the hard way, in this repo, once — the one-line
incident is the receipt, not decoration:

- **Existing-proof and Uncovered claims come from reading test bodies and following helpers, never
  from test names.** (S1–S4: `replay()` in `locations.test.ts:21` was missed; `encodeSave()`
  equality was mistaken for replay proof.)
- **A queue task that cites a library API must verify the API exists in the installed version
  first** (`node -p "typeof require('x').y"`). (m02-doctor: `ts.createSourceFile` does not exist in
  `typescript@7.0.2`; cost two review rounds.)
- **"Matching the plan's X/Y/Z groups" is not an acceptance criterion.** Each group gets its own
  falsifiable pass/fail line, or is named as out of scope. (m02-doctor: the reviewer measured against
  the plan document and the slice ballooned.)
- **An owner amendment that adds a hard rule is checked against the real tree before it is
  written.** (m02-doctor: "ban bare Date/Math" contradicted 94 legitimate uses; the writer had to
  HALT to expose it.)

**Review-cap rule:** the 4-round review cap resets once after an owner-directed scope change; a
second reset requires a new slice.
