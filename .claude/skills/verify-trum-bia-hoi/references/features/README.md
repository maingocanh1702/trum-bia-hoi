# Trùm Bia Hơi feature map

Behaviour-level inventory of Trùm Bia Hơi (Hanoi sidewalk draft-beer stall tycoon). Agents use this
map to decide what to run and what counts as proof before calling a slice done; humans use it as the
regression checklist. Adapted from
[poteto/verification-skill-example](https://github.com/poteto/verification-skill-example)'s feature
map to this repo's engine/server/web-local/web-remote shape.

**Coverage today: 12 of 23 files.** Wave V1 (`trum-bia-hoi-agent-understanding-verification-implementation-plan.md`
§5) is split into 3–4 PRs by area; this PR is the gameplay-core slice (table → kitchen → serve →
glass → economy → save → cross-system). The remaining 11 are listed below with a one-line scope and
no link — do not assume they exist; `ls references/features/*.md` is the ground truth, this prose
summary is not.

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

## Full sweep

Walk this map top to bottom for a broad regression; finish with `multi-system-journeys.md`. This is
the wave-V1 target order (`trum-bia-hoi-agent-understanding-verification-implementation-plan.md`
§5.2) — the ✅ files exist today, the rest are named for when a later slice adds them.

```text
shift-lifecycle → spawn-queue-seating → table-lifecycle ✅ → order-rounds-kitchen ✅ → serve-outcomes ✅
→ glass-beer-flat ✅ → keg-refill → restock-inventory-menu → economy-k-ledger ✅ → rush-weather
→ stamina-attendance-lifepath → quests-daily-bonus → upgrades-equipment-tables → location-lease
→ flyer-signboard-dog → seasons-leaderboard → onboarding-guide ✅ → save-replay-local ✅
→ remote-session-outbox ✅ → admin-registry ✅ → ui-shell-i18n-a11y ✅ → assets-manifest ✅ → multi-system-journeys ✅
```

## Shift & flow

- `shift-lifecycle` *(not yet written)*: the shift clock (prepare/wash/rush/close), `manual-close`,
  well-rested carry-over, `rush-clock`.
- `spawn-queue-seating` *(not yet written)*: customer arrival interval, queue formation and overflow,
  the separate shipper delivery-order lane.

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
- `keg-refill` *(not yet written)*: dedicated keg-level/refill-purchase feature file (glass-beer-flat
  covers keg *status* only as far as the freshness contract needs it).
- `restock-inventory-menu` *(not yet written)*: ingredient stock, menu pause, restock commands.

## Economy & progression

- [economy-k-ledger](economy-k-ledger.md): the single mutating ledger helper (`credit()`), k
  (value-per-served-order) measurement via sims.
- `rush-weather` *(not yet written)*: rush schedule + weather multiplier pressure.
- `stamina-attendance-lifepath` *(not yet written)*: stamina/well-rested, attendance streak,
  life-path unlock gating.
- `quests-daily-bonus` *(not yet written)*: daily quest planning + claim, attendance rewards.
- `upgrades-equipment-tables` *(not yet written)*: equipment upgrade purchase/quote (cooler, etc.),
  live-upgrade application mid-shift.
- `location-lease` *(not yet written)*: lease quote, rent/leave location.
- `flyer-signboard-dog` *(not yet written)*: flyer campaigns, signboard style, dog level purchase.
- `seasons-leaderboard` *(not yet written)*: season rollover/sync, server leaderboard + competition
  snapshot.

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
