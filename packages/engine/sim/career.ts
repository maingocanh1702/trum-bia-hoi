import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, config as bundledConfig, nextDayAt, dayKey, lifePathStatus, restRequired, serveValueStats, seasonTier, singlesFirstShifts, type Command } from '../src/index';
import { createManagementPolicy, serveNext, STEP_MS, MANAGEMENT_MS, MAX_DAY_STEPS } from './policy';
import { doorTable, doorLines } from './door';
import { normalisedServes, normalisedStats, type NormalisedServe } from './normalised';

// config-exempt: reproducible diagnostic policy/sampling limits, never live gameplay or economy tuning.
const MAX_DAYS = 90;
// THE ACCEPTANCE PROTOCOL (plan section 5 S5 row, brief B5): "seed 42 và 99, career 28 ngày (bot ưu tiên bàn/ghế, thuê thẳng mặt bằng, không mua chó)" = the S1-S4
// career bot (seats and chairs first, then the cheapest) that leases the best location straight away, never the dog, started on the day every S1-S4 career started
// (the plan names no other start day). It is the default of `simulateCareer`, of `npm run sim:career:gate` and of the balance evaluator; the price-decides bot
// (`policy: { seatsFirst: false }`, v4) and the first Vietnam midnight of a 21-day season (`SEASON_START`) are information runs only.
const DEFAULT_START = Date.parse('2026-09-09T00:00:00+07:00');
/** The first Vietnam midnight after a 21-day ranking season began (epoch 2026-04-11T10:00Z + 7 x 21 days = 2026-09-05 17:00 VN): the `peak:` requirements of Duong Len Trum read the earnings of the CURRENT season window, so a career that starts later in a window sees them reset at its boundary. An information option, not the protocol. */
export const SEASON_START = Date.parse('2026-09-06T00:00:00+07:00');
export const CAREER_POLICY = 'v3 + direct leasing (plan section 5 S5: "bot ưu tiên bàn/ghế, thuê thẳng mặt bằng, không mua chó"): fresh game; configured newbie shifts/day; stamina rest only where the engine asks for it (restRequired: shifts 2 and 3 open at once, D8); 100ms whole-table/deadline service; 1s management; claim earned rewards; bulk restock/one when empty; keep one bulk per unlocked dish as capital reserve; phone/QR when affordable; seat model: save for the next table, then a second chair per table, before any other purchase; then cheapest eligible device/glass/sign/neon (capacity snapshots also table levels; seat snapshots with the S4 ladders also table and chair levels, once their life-path gate is open); never the dog (M6 deferred); target two glasses per seat; one flyer/shift; a free shop leases the best location the life path allows and the wallet pays for, straight away (direct leasing), again at every lease expiry. Every coin purchase is logged with its shift. No injected state or fabricated rewards. Diagnostic, not optimal-play or balance certification.';
export const CAREER_POLICY_PRICE = 'v4 (information only, not the acceptance protocol): as the protocol bot except that the price decides (plan section 9: "bot mua rẻ nhất trước"): the cheapest affordable purchase first among tables, second chairs, devices, glasses, signs/neon and, once their life-path gate is open, table and chair levels, instead of seats first.';
export const CAREER_POLICY_KICK = ' + Wave 3 kick bot (plan section 6, FEEDBACK II.3 "bot luôn-mời"; an option, never the acceptance protocol): every management second, while the shift is open with at least 40 s to go and a group waits at the door, send home (kickTable) the cheapest lingering table a waiting group can sit at, if the wallet pays it and keeps its stock reserve. A kick is a fee, not a purchase: it is left out of the purchase log.';
/** One coin purchase (restock excluded) and the shift it lands in: bought while resting counts toward the next shift. */
export interface CareerPurchase { shift: number; day: number; command: Command['type']; item: string; cost: number }
const MILESTONE_COMMANDS: readonly Command['type'][] = ['buyTable', 'buyChair', 'upgrade', 'upgradeTable', 'upgradeChair'];

/** What one closed shift did at the door and in the room (the shift's own `stats`): the input of the door table (door.ts). */
export interface CareerShift { shift: number; day: number; arrived: number; served: number; lost: number; rejected: number; noSeat: number; penalty: number }

/** `config` defaults to the bundled seed; a test may hand a patched snapshot to isolate one subject from the early-game pace. */
export function simulateCareer({ days = 30, seed = 42, startAt = DEFAULT_START, config = bundledConfig, policy = {} }: { days?: number; seed?: number; startAt?: number; config?: typeof bundledConfig; policy?: { seatsFirst?: boolean; kick?: boolean } } = {}, onDay?: (row: CareerDay) => void) {
  assert.ok(Number.isInteger(days) && days >= 1 && days <= MAX_DAYS, 'days must be an integer in 1..90');
  assert.ok(Number.isSafeInteger(seed), 'seed must be a safe integer');
  assert.ok(Number.isSafeInteger(startAt) && startAt >= 0 && dayKey(startAt - 1, config) !== dayKey(startAt, config), 'startAt must be a VN midnight');
  const game = new Game(config, seed, startAt), w = game.world, c = config.values;
  const rows: CareerDay[] = [];
  let spent: Record<string, number> = {}, rewardCredits = 0, lastManagement = -Infinity, today = 1;
  const purchases: CareerPurchase[] = [], shiftStats: CareerShift[] = [], standardServes: NormalisedServe[] = [];
  const item = (command: Command) => command.type === 'buyTable' ? `table ${w.tables.length}`
    : command.type === 'buyChair' ? `second chair ${w.tables.reduce((n, t) => n + t.capacity, 0) - w.tables.length}`
    : command.type === 'upgrade' ? `${command.kind} Lv${w.equipment[command.kind]}`
    : command.type === 'upgradeTable' ? `table level ${w.tables.find(t => t.id === command.tableId)!.level}`
    : command.type === 'upgradeChair' ? `chair level ${w.tables.find(t => t.id === command.tableId)!.chairLevel ?? 1}`
    : command.type === 'buyGlass' ? `glass ${w.glasses.length}` : command.type === 'buyUnlock' ? `unlock ${command.item}`
    : command.type === 'setSignboard' ? `sign ${command.style}` : command.type === 'rentLocation' ? `lease ${command.locationId}` : command.type;
  const send = (command: Command) => {
    const coins = w.coins, earned = w.lifetimeEarned;
    // D4(a): what this serve is worth as a STANDARD order, read in the state the engine is about to pay in (see normalised.ts).
    const standard = command.type === 'serve' ? normalisedServes(w, game.config, command.tableId) : null;
    const result = game.command({ command, at: w.now, idempotencyKey: `career-${game.log.length}` });
    assert.ok(result.ok, `${command.type}: ${result.reason} at ${w.now}`);
    if (standard) standardServes.push(...standard);
    const other = w.coins - coins - (w.lifetimeEarned - earned);
    if (other < 0) {
      spent[command.type] = (spent[command.type] ?? 0) - other;
      if (command.type !== 'restock' && command.type !== 'kickTable') purchases.push({ shift: w.completedShifts + 1, day: today, command: command.type, item: item(command), cost: -other });
    } else rewardCredits += other;
  };
  const seatsFirst=policy.seatsFirst??true, kick=policy.kick??false, manage=createManagementPolicy(game,send,{directLease:true,seatsFirst,kick}); // the protocol bot: seats first + direct leasing; `seatsFirst: false` is the information bot v4, `kick: true` the Wave 3 kick bot
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
        if (restRequired(w, game.config)) game.advance(w.now + Math.ceil((c.shift.durationMs - w.staminaMs) / c.shift.regenRate)); // shifts 2 and 3 open at once (D8)
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
      equipment: { ...w.equipment }, tables: w.tables.map(t => ({ level: t.level, capacity: t.capacity, chairLevel: t.chairLevel ?? 1 })), glasses: w.glasses.length, dog: w.dogLevel, unlocks: [...w.unlocks],
      purchases: purchases.slice(purchaseStart),
      location: w.location, lease: w.lease ? { ...w.lease } : null,
      ranking: { id: w.seasons!.ranking.id, earned: w.seasonEarned, tier: seasonTier(w, config).tier.id, endsAt: w.seasons!.ranking.endsAt },
      contest: { id: w.seasons!.contest.id, earned: w.seasons!.contestEarned, tier: seasonTier(w, config, 'contest').tier.id, endsAt: w.seasons!.contest.endsAt },
    };
    rows.push(row); onDay?.(row);
  }
  const eventTypes = new Set(['life_path_level_reached', 'life_path_reward_claimed', 'lease_started', 'lease_expired', 'lease_deposit_refunded', 'unlock_bought', 'signboard_installed', 'signboard_bought', 'signboard_equipped', 'upgrade_bought', 'table_upgraded', 'chair_upgraded', 'table_bought', 'chair_bought', 'seat_model_adopted', 'glasses_bought', 'dog_bought', 'dog_upgraded', 'flyer_bought']);
  // Wave 3: what sending tables home did over the career (zero for the protocol bot): how often, what it cost in coins and in reputation actually taken.
  const kicked = w.events.filter(e => e.type === 'table_kicked');
  const kicks = { count: kicked.length, guests: kicked.reduce((n, e) => n + Number(e.data.count), 0), cost: kicked.reduce((n, e) => n + Number(e.data.cost), 0), reputation: kicked.reduce((n, e) => n + Number(e.data.reputation), 0) };
  const report = { policy: (seatsFirst ? CAREER_POLICY : CAREER_POLICY_PRICE) + (kick ? CAREER_POLICY_KICK : ''), kicks, days, seed, startAt, configVersion: config.version, rulesVersion: game.log.at(-1)!.rulesVersion,
    commandCount: game.log.length, commandHash: createHash('sha256').update(JSON.stringify(game.log)).digest('hex'), eventCount: w.events.length,
    kBand: c.k.band, advancedBandDecision: 'owner-2026-09-10: standard cold/full menus keep k 2..3; advanced career aggregate k <= 3.5; re-evaluate after Alpha playtest with real player data',
    value: serveValueStats(w.serves, config), normalised: normalisedStats(standardServes, c.k.anchorValuePerServe), rows, milestones: w.events.filter(e => eventTypes.has(e.type)), seasonResults: w.seasons!.results,
    purchases, purchaseMilestones: purchases.filter(p => MILESTONE_COMMANDS.includes(p.command)), shiftStats };
  return { game, report };
}

export interface CareerDay {
  day: number; date: string; at: number; openingCoins: number; coins: number; income: number; rewardCredits: number; depositRefund: number;
  spent: Record<string, number>; totalSpent: number; penalty: number; lifetimeEarned: number; reputation: number; shifts: number; served: number;
  arrived: number; lost: number; rejected: number; deliveryCompleted: number; deliveryMissed: number; mean: number | null; k: number; withinKBand: boolean;
  lifePath: number; nextRequirements: ReturnType<typeof lifePathStatus>['rows'][number]['requirements']; peak: string | null;
  equipment: Game['world']['equipment']; tables: { level: number; capacity: number; chairLevel: number }[]; glasses: number; dog: number; unlocks: string[];
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

// config-exempt: D4(a), owner decision 18/09 (04-SPEC section 5): the 30-day total value of the standard orders may exceed the 8.35 tr baseline of the 2.0.x
// economy by at most 14 % (10 % until the founder's re-seal of 2026-10-23, QD-117 B option 1: 9 185 000 -> 9 519 000). An acceptance protocol, not a live gameplay
// limit and not a tuning input.
export const ADVANCED_TOTAL_VALUE_BASELINE = 8350000, ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE = 0.14;
export type AdvancedKBasis = 'standard-order' | 'raw';
/** D4(a) (04-SPEC section 5): config 2.1.0 and later gate the k of the standard order; earlier configs keep the old gate on the raw k. */
export function advancedKBasis(version: string): AdvancedKBasis {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  assert.ok(m, `config version ${version} is not X.Y.Z`);
  return Number(m[1]) > 2 || Number(m[1]) === 2 && Number(m[2]) >= 1 ? 'standard-order' : 'raw';
}
/** The numbers of one complete career that the advanced gates read: the standard order from 2.1.0 on, the raw measurement before; the other one is carried for the reader. */
export function advancedGateSample(report: { seed: number; days: number; configVersion: string; rows: readonly { lifePath: number }[];
  value: { served: number; kValue: number | null; totalValue: number | null }; normalised: { served: number; kValue: number | null; totalValue: number } }) {
  const basis = advancedKBasis(report.configVersion), standard = basis === 'standard-order';
  return { seed: report.seed, days: report.days, lifePath: report.rows.at(-1)!.lifePath,
    served: standard ? report.normalised.served : report.value.served, k: standard ? report.normalised.kValue : report.value.kValue,
    totalValue: standard ? report.normalised.totalValue : report.value.totalValue, basis, rawK: report.value.kValue, rawTotalValue: report.value.totalValue };
}
export function assertAdvancedCareerValue(samples: { seed: number; days: number; totalValue: number | null }[]) {
  assert.ok(samples.length >= 2 && samples.every(s => Number.isSafeInteger(s.seed)) &&
    new Set(samples.map(s => s.seed >>> 0)).size === samples.length, 'advanced gate requires at least two distinct RNG seeds');
  const limit = Math.round(ADVANCED_TOTAL_VALUE_BASELINE * (1 + ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE));
  for (const s of samples) {
    assert.ok(Number.isInteger(s.days) && s.days >= 30 && s.totalValue !== null && Number.isSafeInteger(s.totalValue) && s.totalValue >= 0,
      `seed ${s.seed}: total value requires 30 days of real serve measurements`);
    assert.ok(s.totalValue <= limit, `seed ${s.seed}: 30-day total value ${s.totalValue} exceeds ${limit} (+${Math.round(ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE * 100)} % of the ${ADVANCED_TOTAL_VALUE_BASELINE} baseline)`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), advanced = args.includes('--check-advanced'), door = args.includes('--door');
  assert.ok(args.every(a => a === '--check-advanced' || a === '--door' || /^--(days|seed|out)=.+$/.test(a)) && !(advanced && door),
    'Usage: sim:career [--days=30 --seed=42 [--door] | --check-advanced] [--out=report.json]');
  const option = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  assert.ok(!advanced || (!option('days') && !option('seed')), 'advanced gate uses fixed 30-day seeds 42 and 99');
  if (advanced) {
    const samples = [42, 99].map(seed => {
      const { report } = simulateCareer({ days: 30, seed }, row => console.log(JSON.stringify({ seed, day: row.day, lifePath: row.lifePath, k: row.k })));
      return { ...advancedGateSample(report), configVersion: report.configVersion, rulesVersion: report.rulesVersion, commandHash: report.commandHash };
    });
    assertAdvancedCareerK(samples); // each complete career, never a daily maximum or mean of daily k values
    // D4(a): from config 2.1.0 the k above is the k of the standard order, and the 30-day total value of those orders has its own ceiling.
    if (samples.every(s => s.basis === 'standard-order')) assertAdvancedCareerValue(samples);
    const result = { status: 'PASS', profile: 'advanced-progression', policy: CAREER_POLICY, maxK: ADVANCED_CAREER_K_MAX,
      maxTotalValue: Math.round(ADVANCED_TOTAL_VALUE_BASELINE * (1 + ADVANCED_TOTAL_VALUE_MAX_OVER_BASELINE)),
      reEvaluate: 'after Alpha playtest with real player data', samples };
    if (option('out')) writeFileSync(option('out')!, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } else {
    const { report } = simulateCareer({ days: Number(option('days') ?? 30), seed: Number(option('seed') ?? 42) }, row => console.log(JSON.stringify(row)));
    if (option('out')) writeFileSync(option('out')!, JSON.stringify(report, null, 2) + '\n');
    // Plan S1 / section 3: when each table, chair and device level was bought, by shift.
    for (const p of report.purchaseMilestones) console.log(`PURCHASE shift ${p.shift} (day ${p.day}): ${p.item} - ${p.cost} coins`);
    // Plan S3: who leaves WITH a penalty, by band, and what shift 1 shows at the door (a report, never a gate: the numbers are tuned in S5).
    if (door) { const table = doorTable(report, singlesFirstShifts(bundledConfig.values) > 0); for (const line of doorLines(table)) console.log(line); console.log(`DOOR ${JSON.stringify(table)}`); }
    console.log(JSON.stringify({ days: report.days, commands: report.commandCount, commandHash: report.commandHash, value: report.value, normalised: report.normalised, advancedBandDecision: report.advancedBandDecision }));
  }
}
