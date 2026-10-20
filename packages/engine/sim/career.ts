import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, config as bundledConfig, nextDayAt, dayKey, lifePathStatus, serveValueStats, seasonTier, type Command } from '../src/index';
import { createManagementPolicy, serveNext, STEP_MS, MANAGEMENT_MS, MAX_DAY_STEPS } from './policy';

// config-exempt: reproducible diagnostic policy/sampling limits, never live gameplay or economy tuning.
const MAX_DAYS = 90;
const DEFAULT_START = Date.parse('2026-09-09T00:00:00+07:00');
export const CAREER_POLICY = 'v2: fresh game; configured newbie shifts/day; full active stamina rest; 100ms whole-table/deadline service; 1s management; claim earned rewards; bulk restock/one when empty; keep one bulk per unlocked dish as capital reserve; phone/QR when affordable; seat model: save for the next table, then a second chair per table, before any other purchase; then cheapest eligible device/glass/sign/neon (capacity snapshots also table levels); never the dog (M6 deferred); target two glasses per seat; one flyer/shift; next higher location multiplier only after lease expiry. Every coin purchase is logged with its shift. No injected state or fabricated rewards. Diagnostic, not optimal-play or balance certification.';
/** One coin purchase (restock excluded) and the shift it lands in: bought while resting counts toward the next shift. */
export interface CareerPurchase { shift: number; day: number; command: Command['type']; item: string; cost: number }
const MILESTONE_COMMANDS: readonly Command['type'][] = ['buyTable', 'buyChair', 'upgrade', 'upgradeTable'];

/** What one closed shift did at the door and in the room (the shift's own `stats`): the input of the door table (door.ts). */
export interface CareerShift { shift: number; day: number; arrived: number; served: number; lost: number; rejected: number; noSeat: number; penalty: number }

/** `config` defaults to the bundled seed; a test may hand a patched snapshot to isolate one subject from the early-game pace. */
export function simulateCareer({ days = 30, seed = 42, startAt = DEFAULT_START, config = bundledConfig }: { days?: number; seed?: number; startAt?: number; config?: typeof bundledConfig } = {}, onDay?: (row: CareerDay) => void) {
  assert.ok(Number.isInteger(days) && days >= 1 && days <= MAX_DAYS, 'days must be an integer in 1..90');
  assert.ok(Number.isSafeInteger(seed), 'seed must be a safe integer');
  assert.ok(Number.isSafeInteger(startAt) && startAt >= 0 && dayKey(startAt - 1, config) !== dayKey(startAt, config), 'startAt must be a VN midnight');
  const game = new Game(config, seed, startAt), w = game.world, c = config.values;
  const rows: CareerDay[] = [];
  let spent: Record<string, number> = {}, rewardCredits = 0, lastManagement = -Infinity, today = 1;
  const purchases: CareerPurchase[] = [], shiftStats: CareerShift[] = [];
  const item = (command: Command) => command.type === 'buyTable' ? `table ${w.tables.length}`
    : command.type === 'buyChair' ? `second chair ${w.tables.reduce((n, t) => n + t.capacity, 0) - w.tables.length}`
    : command.type === 'upgrade' ? `${command.kind} Lv${w.equipment[command.kind]}`
    : command.type === 'upgradeTable' ? `table level ${w.tables.find(t => t.id === command.tableId)!.level}`
    : command.type === 'buyGlass' ? `glass ${w.glasses.length}` : command.type === 'buyUnlock' ? `unlock ${command.item}`
    : command.type === 'setSignboard' ? `sign ${command.style}` : command.type === 'rentLocation' ? `lease ${command.locationId}` : command.type;
  const send = (command: Command) => {
    const coins = w.coins, earned = w.lifetimeEarned;
    const result = game.command({ command, at: w.now, idempotencyKey: `career-${game.log.length}` });
    assert.ok(result.ok, `${command.type}: ${result.reason} at ${w.now}`);
    const other = w.coins - coins - (w.lifetimeEarned - earned);
    if (other < 0) {
      spent[command.type] = (spent[command.type] ?? 0) - other;
      if (command.type !== 'restock') purchases.push({ shift: w.completedShifts + 1, day: today, command: command.type, item: item(command), cost: -other });
    } else rewardCredits += other;
  };
  const manage=createManagementPolicy(game,send);
  for (let day = 0; day < days; day++) {
    today = day + 1; const purchaseStart = purchases.length;
    const openingCoins = w.coins, earnedBefore = w.lifetimeEarned, completedBefore = w.completedShifts;
    const serveStart = w.serves.length, eventStart = w.events.length;
    spent = {}; rewardCredits = 0;
    if (day) game.advance(w.now + 1); // previous report ends exactly one millisecond before midnight
    const date = dayKey(w.now, config), endAt = nextDayAt(w.now, config) - 1;
    let steps = 0, penalty = 0, arrived = 0, lost = 0, rejected = 0, deliveryCompleted = 0, deliveryMissed = 0, observed = w.completedShifts;
    while (w.completedShifts - completedBefore < c.shift.dailyShiftCap.newbie) {
      assert.ok(++steps <= MAX_DAY_STEPS && w.now < endAt, `career day ${date} did not finish its shifts`);
      if (w.phase === 'resting') {
        if (w.staminaMs < c.shift.durationMs) game.advance(w.now + Math.ceil((c.shift.durationMs - w.staminaMs) / c.shift.regenRate));
        manage(); send({ type: 'startShift' });
      }
      if (w.now - lastManagement >= MANAGEMENT_MS) { manage(); lastManagement = w.now; }
      serveNext(game,send);
      game.advance(w.now + STEP_MS);
      if (w.completedShifts > observed) {
        assert.equal(w.completedShifts, observed + 1);
        const s = w.shift!.stats;
        penalty += s.penalty; arrived += s.arrived; lost += s.lost; rejected += s.rejected;
        shiftStats.push({ shift: w.completedShifts, day: today, arrived: s.arrived, served: s.served, lost: s.lost, rejected: s.rejected, noSeat: s.noSeat ?? 0, penalty: s.penalty });
        deliveryCompleted += s.deliveryCompleted ?? 0; deliveryMissed += s.deliveryMissed ?? 0;
        observed = w.completedShifts;
      }
    }
    manage(); // includes claims earned by the last closed shift
    assert.equal(w.phase, 'resting'); assert.ok(w.now < endAt);
    game.advance(endAt);
    const events = w.events.slice(eventStart), depositRefund = events.filter(e => e.type === 'lease_deposit_refunded').reduce((sum, e) => sum + Number(e.data.amount), 0);
    const income = w.lifetimeEarned - earnedBefore, totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
    assert.equal(w.coins, openingCoins + income + rewardCredits + depositRefund - totalSpent - penalty, `wallet conservation ${date}`);
    assert.equal(w.dayEarned[date], income); assert.ok(income <= c.shift.dailyEarnCapBase);
    assert.equal(w.dayShifts[date], c.shift.dailyShiftCap.newbie);
    assert.ok([w.coins, w.lifetimeEarned, w.seasonEarned, ...Object.values(w.inventory)].every(n => Number.isSafeInteger(n) && n >= 0));
    assert.equal(game.log.length, game.log.filter(entry => entry.result.ok).length);
    const value = serveValueStats(w.serves.slice(serveStart), config);
    assert.ok(value.kValue !== null && value.served > 0, `no measurable service on ${date}`);
    const row = {
      day: day + 1, date, at: w.now, openingCoins, coins: w.coins, income, rewardCredits, depositRefund, spent: { ...spent }, totalSpent, penalty,
      lifetimeEarned: w.lifetimeEarned, reputation: w.reputation, shifts: w.completedShifts - completedBefore, served: value.served, arrived, lost, rejected, deliveryCompleted, deliveryMissed,
      mean: value.mean, k: value.kValue, withinKBand: value.kValue >= c.k.band[0] && value.kValue <= c.k.band[1],
      lifePath: w.lifePath, nextRequirements: lifePathStatus(w, config).rows[w.lifePath + 1]?.requirements ?? [], peak: w.peakLeague,
      equipment: { ...w.equipment }, tables: w.tables.map(t => ({ level: t.level, capacity: t.capacity })), glasses: w.glasses.length, dog: w.dogLevel, unlocks: [...w.unlocks],
      purchases: purchases.slice(purchaseStart),
      location: w.location, lease: w.lease ? { ...w.lease } : null,
      ranking: { id: w.seasons!.ranking.id, earned: w.seasonEarned, tier: seasonTier(w, config).tier.id, endsAt: w.seasons!.ranking.endsAt },
      contest: { id: w.seasons!.contest.id, earned: w.seasons!.contestEarned, tier: seasonTier(w, config, 'contest').tier.id, endsAt: w.seasons!.contest.endsAt },
    };
    rows.push(row); onDay?.(row);
  }
  const eventTypes = new Set(['life_path_level_reached', 'life_path_reward_claimed', 'lease_started', 'lease_expired', 'lease_deposit_refunded', 'unlock_bought', 'signboard_installed', 'signboard_bought', 'signboard_equipped', 'upgrade_bought', 'table_upgraded', 'table_bought', 'chair_bought', 'seat_model_adopted', 'glasses_bought', 'dog_bought', 'dog_upgraded', 'flyer_bought']);
  const report = { policy: CAREER_POLICY, days, seed, startAt, configVersion: config.version, rulesVersion: game.log.at(-1)!.rulesVersion,
    commandCount: game.log.length, commandHash: createHash('sha256').update(JSON.stringify(game.log)).digest('hex'), eventCount: w.events.length,
    kBand: c.k.band, advancedBandDecision: 'owner-2026-09-10: standard cold/full menus keep k 2..3; advanced career aggregate k <= 3.5; re-evaluate after Alpha playtest with real player data',
    value: serveValueStats(w.serves, config), rows, milestones: w.events.filter(e => eventTypes.has(e.type)), seasonResults: w.seasons!.results,
    purchases, purchaseMilestones: purchases.filter(p => MILESTONE_COMMANDS.includes(p.command)), shiftStats };
  return { game, report };
}

export interface CareerDay {
  day: number; date: string; at: number; openingCoins: number; coins: number; income: number; rewardCredits: number; depositRefund: number;
  spent: Record<string, number>; totalSpent: number; penalty: number; lifetimeEarned: number; reputation: number; shifts: number; served: number;
  arrived: number; lost: number; rejected: number; deliveryCompleted: number; deliveryMissed: number; mean: number | null; k: number; withinKBand: boolean;
  lifePath: number; nextRequirements: ReturnType<typeof lifePathStatus>['rows'][number]['requirements']; peak: string | null;
  equipment: Game['world']['equipment']; tables: { level: number; capacity: number }[]; glasses: number; dog: number; unlocks: string[];
  purchases: CareerPurchase[]; location: string; lease: Game['world']['lease'] | null;
  ranking: { id: string; earned: number; tier: string; endsAt: number }; contest: { id: string; earned: number; tier: string; endsAt: number };
}

// config-exempt: owner acceptance protocol, not a live gameplay limit or economy retuning.
export const ADVANCED_CAREER_K_MAX = 3.5;
export function assertAdvancedCareerK(samples: { seed: number; days: number; lifePath: number; served: number; k: number | null }[]) {
  assert.ok(samples.length >= 2 && samples.every(s => Number.isSafeInteger(s.seed)) &&
    new Set(samples.map(s => s.seed >>> 0)).size === samples.length, 'advanced gate requires at least two distinct RNG seeds');
  for (const s of samples) {
    assert.ok(Number.isInteger(s.days) && s.days >= 30 && Number.isInteger(s.lifePath) && s.lifePath >= 4,
      `seed ${s.seed}: advanced profile requires >=30 days and LP4`);
    assert.ok(Number.isSafeInteger(s.served) && s.served >= 500 && s.k !== null && Number.isFinite(s.k) && s.k >= 0,
      `seed ${s.seed}: k requires >=500 real serve measurements`);
    assert.ok(s.k <= ADVANCED_CAREER_K_MAX, `seed ${s.seed}: advanced k=${s.k} exceeds soft cap ${ADVANCED_CAREER_K_MAX}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), advanced = args.includes('--check-advanced');
  assert.ok(args.every(a => a === '--check-advanced' || /^--(days|seed|out)=.+$/.test(a)),
    'Usage: sim:career [--days=30 --seed=42 | --check-advanced] [--out=report.json]');
  const option = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  assert.ok(!advanced || (!option('days') && !option('seed')), 'advanced gate uses fixed 30-day seeds 42 and 99');
  if (advanced) {
    const samples = [42, 99].map(seed => {
      const { report } = simulateCareer({ days: 30, seed }, row => console.log(JSON.stringify({ seed, day: row.day, lifePath: row.lifePath, k: row.k })));
      return { seed, days: report.days, lifePath: report.rows.at(-1)!.lifePath, served: report.value.served, k: report.value.kValue,
        configVersion: report.configVersion, rulesVersion: report.rulesVersion, commandHash: report.commandHash };
    });
    assertAdvancedCareerK(samples); // each complete career, never a daily maximum or mean of daily k values
    const result = { status: 'PASS', profile: 'advanced-progression', policy: CAREER_POLICY, maxK: ADVANCED_CAREER_K_MAX,
      reEvaluate: 'after Alpha playtest with real player data', samples };
    if (option('out')) writeFileSync(option('out')!, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } else {
    const { report } = simulateCareer({ days: Number(option('days') ?? 30), seed: Number(option('seed') ?? 42) }, row => console.log(JSON.stringify(row)));
    if (option('out')) writeFileSync(option('out')!, JSON.stringify(report, null, 2) + '\n');
    // Plan S1 / section 3: when each table, chair and device level was bought, by shift.
    for (const p of report.purchaseMilestones) console.log(`PURCHASE shift ${p.shift} (day ${p.day}): ${p.item} - ${p.cost} coins`);
    console.log(JSON.stringify({ days: report.days, commands: report.commandCount, commandHash: report.commandHash, value: report.value, advancedBandDecision: report.advancedBandDecision }));
  }
}
