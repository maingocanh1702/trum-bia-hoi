# Daily quests & five-of-five bonus (`docs/features/F17-quest-system.md` "Nhiệm Vụ Quán Nhậu")

F17's data-model sketch (§2) is a generic `Quest{id,type:QuestType,bucket?,target,progress,reward:
Reward[],state:'active'|'claimable'|'claimed'|'expired',seedKey}` with `QuestType` including
`'attendance'|'referral'|'sign_in'|'life_path'`. **The real code has no such generic type.**
`packages/engine/src/quests.ts` defines one `DailyQuests` container (`types.ts:51-56`) holding
`DailyQuest` rows (`types.ts:47-50`: `{id,kind,bucket,target,progress,coin,reputation,claimed}` — no
`state` machine, no `Reward[]`, no `seedKey` field name) keyed by a plain `kind` string, reseeded
once per VN calendar day. `'attendance'`/`'sign_in'` are not a `kind` in `daily.rows` at all — that
mechanic is a wholly separate `Attendance` record (also defined in `quests.ts`, despite the file
name) owned by the sibling [stamina-attendance-lifepath](stamina-attendance-lifepath.md). `'referral'`
and `'life_path'` as quest *types* are not implemented — the only two fixed (non-random) rows today
are `shift_3` and `gift_3` (below), and life-path progress is its own unrelated command surface
(`claimLifePath`, see [stamina-attendance-lifepath](stamina-attendance-lifepath.md)).

## Observable contract

- `World.daily?: DailyQuests` (`types.ts:51-56`): `{day, tier, seed, expiresAt, rows: DailyQuest[],
  bonusClaimed, recipients: string[], lossFreeSince, lossFreeServed, vipShift, vipServed, vipLost,
  rushSlot, rushShift, rushServed}`. The last nine fields are **progress-tracking scratch state for
  the 3 "risk" bucket kinds**, not player-visible quests themselves.
- `DailyQuest` (`types.ts:47-50`): `{id, kind, bucket, target, progress, coin, reputation, claimed}`.
  `id` is `` `${day}:${bucket}:${kind}` `` for the 3 randomized rows, `` `${day}:${id}` `` for the 2
  fixed rows (`quests.ts` `planDailyQuests`).
- Kinds by bucket (`docs/config/economy.tbh.json` `quests.daily`, verified directly): **service**
  (`serve_customers`, `serve_beer`, `serve_moi`, `serve_tables`) · **quality** (`perfect_tip`,
  `earn_coins_base`, `no_stale_beer`) · **risk** (`zero_loss_window`, `survive_rush`, `no_lost_vip`,
  `zeroLossWindowMs:240000`) — one `kind` is sampled per bucket per day, so exactly 3 of these 10
  possible kinds appear on any given day. **Fixed** (always both present): `shift_3` (target 3),
  `gift_3` (target 3, `uniqueRecipients:true`). Total 5 rows, matching
  `quests.spec.ts`'s `.quest-list li` count of 5 and F17 §3's "3 randomized core + 2 fixed". Target
  curve: `targetCurve: "base + (max-base) * ((clamp(tier,1,9)-1)/8)^1.5"`, applied via
  `dailyTargetCurve()` (`config.ts`) and consumed in `planDailyQuests` (`quests.ts:15-25`); the
  `earn_coins_base` kind additionally multiplies its target by `c.values.k.value` (`quests.ts:22`) —
  the only kind that's k-scaled.
- `bonusAll5: {flyer:1, badgeShard:1}` — the five-of-five bonus reward is flyers/badge-shards only,
  **never coins** (`questRewardQuote`'s `coin = questId === null ? 0 : row?.coin ?? 0`,
  `quests.ts:44`) — claiming it never touches `w.coins`/`dayEarned`/`seasonEarned` at all, a narrower
  invariant than but consistent with [economy-k-ledger](economy-k-ledger.md)'s single-mutator rule.
- Events: `quest_generated` (`engine.ts:307`, once per row, on daily reseed — `{questId, kind, target,
  day, tier, seed}`), `quest_progressed` (`engine.ts:104`, fired on *every* domain event while
  `rulesVersion >= QUEST_RULES(12)` and `world.daily` is set — also `engine.ts:316` for the
  passive `zero_loss_window` tick), `quest_claimed` / `daily_bonus_claimed` (`engine.ts:959`, one or
  the other depending on whether `q.row` is set — i.e. a per-row claim vs the five-of-five bonus
  claim — `{day, questId, coin, reputation, flyers, badgeShards}`).
- `Result` reasons (`questRewardQuote`, `quests.ts:38-45`): `'questExpired'` (day mismatch or past
  `expiresAt`), `'questClaimed'`, `'questIncomplete'`, `'questGone'` (per-row only, unknown
  `questId`), `'rewardOverflow'` (safe-integer/negative guard on coins/reputation/badgeShards),
  `'flyerStockFull'` (bonus only, gates `w.flyers + bonusAll5.flyer` against `unlocks.flyer.stockCap`).
- DOM/aria (`quests.spec.ts`): trigger button `'Nhiệm vụ ngày'` / `'Daily quests'` (i18n), dialog same
  name, row `[data-quest="<kind>"]`, per-row `<progress>` element, claim button `'Nhận thưởng'` →
  `'Đã nhận'` once claimed, bonus button `.quest-bonus button`, unclaimed gift row shows `'Gửi quà
  chưa khả dụng'` (no producer exists yet — see Uncovered paths).

## How to reach it

- Autonomous generation: `ensureDailyQuests()` (`engine.ts:301-308`, private), called from both
  `processDue()` (`:350`, the live tick) and `advancePaused()` (`:227`, so a new day rolls over even
  while gameplay is paused/absent) whenever `rulesVersion >= QUEST_RULES`. Regenerates when `!w.daily`
  or `w.now >= w.daily.expiresAt`; a guard at `:304` skips the paused branch entirely when the player
  has been absent with no gameplay events, refreshing once on the next real visit instead of
  backfilling every missed day.
- Passive progress: `applyQuestEvent(world, config, event)` (`quests.ts:29-58`) is called once per
  emitted domain event (`engine.ts:104`) — it owns nearly every kind's progress (`serve_customers`,
  `serve_beer`, `serve_moi`, `perfect_tip`, `no_stale_beer`, `serve_tables`, `earn_coins_base`,
  `shift_3`, `no_lost_vip`, `gift_3`, plus the risk-bucket scratch state). `tickQuests()`
  (`engine.ts:309-315`) separately drives `zero_loss_window` on a real-time clock (increments once
  every `zeroLossWindowMs` of continuous loss-free active play), and `survive_rush` is finalized on
  `rush_ended` inside `applyQuestEvent` itself, not `tickQuests`.
- **`gift_3` has no real production trigger** — its only input is a `'gift_sent'` domain event
  (`quests.ts:66`), and `packages/engine/src/quests.ts:65`'s own comment states "Only the future
  trusted transfer producer emits this; no public progress/gift command exists." Confirmed by grep:
  the only two places `'gift_sent'` appears repo-wide are that `quests.ts` handler and
  `quests.test.ts:137`, which constructs the event by hand.
- Commands: `{type:'claimQuest', day, questId}` / `{type:'claimDailyBonus', day}` — same
  `case 'claimQuest': case 'claimDailyBonus':` handler (`engine.ts:951-961`); `questId:null`
  internally distinguishes the bonus claim. Validated at `engine.ts:1079-1080`
  (`claimQuest` requires a non-empty string `questId`; `claimDailyBonus` requires only `day`).
  `claimAttendance` is validated on the adjacent line but is a **different** command entirely, owned
  by [stamina-attendance-lifepath](stamina-attendance-lifepath.md).
- UI: nav → `'Nhiệm vụ ngày'` sheet → per-row `'Nhận thưởng'` once `progress >= target`, or
  `.quest-bonus button` once all 5 rows are **completed** (`quests.ts:75`'s eligibility check is
  `daily.rows.some(r => r.progress < r.target)`, i.e. progress vs. target — not `row.claimed`; the
  bonus is claimable even if individual rows haven't been claimed yet, as long as every row's progress
  has reached its target). Both modes dispatch through the same `run(cmd)` fork as every other command
  (`App.tsx:166`) — no local/remote divergence in this feature.

## Existing proof

- `packages/engine/test/quests.test.ts` (10 tests, all engine-tier): `'daily rows use independent
  date/tier seeds, closed pools, pinned targets and one Base scaling'`, `'all service and quality
  variants advance from actual whole-table serves, with earned rewards outside counted ledgers'`,
  `'stale beer does not satisfy fresh beer or tip quality, and blocked claims never mutate
  balances'`, `'zero-loss time excludes hidden play and empty waiting, and a loss at the exact
  boundary resets the window'`, `'surviving rush needs actual service and its whole observed window,
  not an early finalized pulse'`, `'VIP protection requires a full shift with VIP service, and paid
  dismissal cannot qualify'`, `'VN midnight expires claims exactly, pins the new set and credits
  bridge finalization to its new day'`, `'four local quests cannot claim the five-of-five bonus;
  trusted gifts require distinct non-self recipients and full-stock claims stay atomic'` (the direct
  five-of-five + `gift_3` proof: drives 4 rows to completion by hand, claims the bonus only after a
  4th distinct recipient via 3 synthetic `gift_sent` events, asserts `flyerStockFull` fails closed
  with a full `assert.deepEqual(g.world, before)` no-mutation check, asserts the idempotent
  double-`command()` send, and asserts `coins`/`reputation`/`seasonEarned` stay byte-unchanged by the
  bonus — only `flyers`/`badgeShards`/`unlocks` move), `'quest intake rejects altered grammar, unsafe
  targets/rewards and contradictory five-of-five flags'` (8 config-mutation cases, each asserting
  `/config:/`), `'genuine rules11 campaign snapshots preserve history and begin daily quests only
  with a new opening'`.
- `apps/web/test/quests.spec.ts` (3 top-level tests, 5 runtime executions once the viewport loop is
  counted): `` `daily claim follows actual service, persists once and switches locale at
  ${viewport.width}×${viewport.height}` `` (×3 viewports — real whole-table serve → progress bar →
  claim → coin/reputation delta → reload-persistence → `quest_claimed` event count in the save →
  locale switch), `'open daily sheet expires an unclaimed reward at VN midnight'`, and a ×2-threshold
  loop: `` `onboarding reveals both quest entries only after ${threshold} finalized shifts` `` (the
  quest sheet is gated behind an onboarding shift-count threshold, not shown from game start).

## Verification procedure

- `node --import tsx --test packages/engine/test/quests.test.ts` (or `npm test` for the full suite —
  bare `tsx` is not guaranteed on `PATH` outside an npm script).
- `npx playwright test apps/web/test/quests.spec.ts` (or `npm run test:e2e`).
- `npm run check:config` before touching any `quests.daily` shape (buckets, pools, `targetCurve`,
  `bonusAll5`) — the intake-rejection test above pins 8 distinct invalid-config cases.

## Uncovered paths

- **`quest_generated` and `quest_progressed` are never asserted by event name anywhere** (grep-
  confirmed zero hits in both `quests.test.ts` and `quests.spec.ts`). All progress/generation proof is
  inferred from `DailyQuest.progress`/`.rows.length` field reads, never from the event stream itself.
- **`gift_3`'s only real trigger is a hand-built `'gift_sent'` event in the test file itself** — no
  command, UI action, or other engine code path currently produces this event in real play (see How
  to reach it). This isn't a bug, it's an intentionally deferred producer (per the source comment),
  but it means the whole gift-quest *arrival* path is unverifiable until that producer exists —
  today's coverage starts from a synthetic event, not a real trusted-transfer flow.
- **No test asserts `quest_generated`'s per-row payload on a fresh reseed** (kind/target/day/tier
  correctness at generation time) — `'daily rows use independent date/tier seeds...'` asserts the
  *shape* of `planDailyQuests`'s pure return value directly, not the emitted event.
- **The five-of-five bonus's own UI is not exercised by `quests.spec.ts`** — the spec's `.quest-bonus
  button` is asserted only as `toBeDisabled()` after a single claim (4 of 5 rows still needed); no web
  spec drives a full 5-row completion and clicks the bonus button.
- **`ensureDailyQuests`'s absent-day skip guard** (`engine.ts:304`, `!w.active && !create &&
  gameplayPaused()`) has no test isolating it by name — coverage is incidental inside the
  hidden/offline-time tests of other files, not a dedicated quest-reseed-while-absent case here.

## Variants

- **success** — every service/quality kind incremented via a real `serve`; full walkthrough in
  `quests.spec.ts`'s main test.
- **cancel** — not applicable; no cancel action exists for a quest claim.
- **reason** — `'questExpired'`, `'questClaimed'`, `'questIncomplete'`, `'questGone'`,
  `'rewardOverflow'`, `'flyerStockFull'` — all asserted by exact string in `quests.test.ts`.
- **empty** — a bucket kind that never progresses simply stays `progress:0`, blocking both its own
  claim and the five-of-five bonus (`'questIncomplete'`); not a distinct code path.
- **persistence** — `quests.spec.ts`'s reload after claiming asserts the claimed state and coin/
  reputation delta survive; `decodeSave(encodeSave(g))` round-trips `world.daily` in every engine test
  via the shared harness (implicit, not separately named).
- **capacity** — `flyerStockFull` on the bonus claim; `Number.isSafeInteger` overflow guards on coins/
  reputation/badgeShards.
- **duplicate/idempotent** — the five-of-five test's `g.command(e)` sent twice with the same
  `idempotencyKey`, both `ok:true`, reward applied once (`applyCommand`'s cached-result replay,
  documented in [economy-k-ledger](economy-k-ledger.md)).
- **stale** — `'stale beer does not satisfy fresh beer or tip quality...'` — a stale glass blocks
  `perfect_tip`/`no_stale_beer` progress specifically (cross-cutting with
  [glass-beer-flat](glass-beer-flat.md)'s staleness computation).
- **time-jump** — the VN-midnight test (both engine and web) advances exactly to/past `expiresAt` and
  asserts the old set can no longer be claimed and a new set exists.
- **offline-reconnect** — `ensureDailyQuests` is called from `advancePaused()` specifically so an
  offline day-rollover is caught on the next tick; not isolated by a dedicated test here (see
  Uncovered paths).

## Gotchas

- `quests.ts` implements **two unrelated player-facing mechanics** — daily quests (this file) and
  attendance (`attendanceDay`/`attendanceRewardQuote`/`claimAttendance`, owned by
  [stamina-attendance-lifepath](stamina-attendance-lifepath.md)) — despite the file's singular name;
  don't assume every export belongs to "quests" as a feature.
- `QUEST_RULES = 12` (`engine.ts:23`) gates nearly everything in this file (generation, progress,
  even the paused-tick refresh) — a save/replay below rules12 simply never had daily quests; that's
  expected legacy behavior, not a bug.
- The five-of-five bonus is claimed with `questId: null` internally (via `claimDailyBonus`, which
  never takes a `questId` argument) — don't confuse this with a per-row `claimQuest` that happens to
  pass a falsy id; they're different `Command` variants entirely.
- `earn_coins_base` is the **only** kind whose target is itself k-scaled at generation time
  (`quests.ts:22`); the other 9 kinds' targets scale only with `tier` via `dailyTargetCurve`, not `k`.

## Related

[stamina-attendance-lifepath](stamina-attendance-lifepath.md) (attendance/sign-in lives in this same
source file but is a fully separate mechanic and command), [economy-k-ledger](economy-k-ledger.md)
(`credit(w, c, q.coin, 'quest')` is how a per-row coin reward reaches the ledger — the five-of-five
bonus itself never calls `credit` since it has no coin reward), [glass-beer-flat](glass-beer-flat.md)
(staleness gates `perfect_tip`/`no_stale_beer` progress), [seasons-leaderboard](seasons-leaderboard.md)
(quest coin rewards go through `credit(w, c, q.coin, 'quest')`, adding to `w.coins`, but `'quest'` is
in `ledgers.excluded` — **corrected claim**: quest credit does *not* count toward
`seasonEarned`/`lifetimeEarned`/`dayEarned`, confirmed both by config
(`ledgers.excluded: ["quest",...]`) and directly by `quests.test.ts`'s own first test above, which
asserts `g.world.seasonEarned`/`lifetimeEarned`/`dayEarned` stay byte-unchanged after a real quest
claim credits coins; the bonus's flyer/badge-shard reward never calls `credit` at all, so it's excluded
by construction rather than by source-list).
