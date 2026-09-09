import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Game, config, DISHES, EQUIPMENT, restockQuote, upgradeQuote, buyGlassQuote, dogUpgradeQuote,
  unlockQuote, lifePathStatus, lifePathRewardQuote, deliveryQuote, nextDayAt, dayKey,
  attendanceRewardQuote, questRewardQuote, signboardQuote, flyerQuote, leaseQuote,
  serveValueStats, seasonTier, type Command,
} from '../src/index';

// config-exempt: reproducible diagnostic policy/sampling limits, never live gameplay or economy tuning.
const STEP_MS = 100, MANAGEMENT_MS = 1000, MAX_DAYS = 90, MAX_DAY_STEPS = 864000;
const DEFAULT_START = Date.parse('2026-09-09T00:00:00+07:00');
export const CAREER_POLICY = 'v1: fresh game; configured newbie shifts/day; full active stamina rest; 100ms whole-table/deadline service; 1s management; claim earned rewards; bulk restock/one when empty; keep one bulk per unlocked dish as capital reserve; dog1/phone/QR first, then cheapest eligible device/table/glass/dog/sign/neon; target two glasses per seat; upgrade existing tables only; one flyer/shift; next higher location multiplier only after lease expiry. No injected state or fabricated rewards. Diagnostic, not optimal-play or balance certification.';

export function simulateCareer({ days = 30, seed = 42, startAt = DEFAULT_START } = {}, onDay?: (row: CareerDay) => void) {
  assert.ok(Number.isInteger(days) && days >= 1 && days <= MAX_DAYS, 'days must be an integer in 1..90');
  assert.ok(Number.isSafeInteger(seed), 'seed must be a safe integer');
  assert.ok(Number.isSafeInteger(startAt) && startAt >= 0 && dayKey(startAt - 1, config) !== dayKey(startAt, config), 'startAt must be a VN midnight');
  const game = new Game(config, seed, startAt), w = game.world, c = config.values;
  const rows: CareerDay[] = [];
  let spent: Record<string, number> = {}, rewardCredits = 0, lastManagement = -Infinity;
  let highestLocationMult = c.locations.list.find(l => l.id === w.location)!.mult;
  const send = (command: Command) => {
    const coins = w.coins, earned = w.lifetimeEarned;
    const result = game.command({ command, at: w.now, idempotencyKey: `career-${game.log.length}` });
    assert.ok(result.ok, `${command.type}: ${result.reason} at ${w.now}`);
    const other = w.coins - coins - (w.lifetimeEarned - earned);
    if (other < 0) spent[command.type] = (spent[command.type] ?? 0) - other;
    else rewardCredits += other;
  };
  const reserve = () => DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= w.equipment.kitchen)
    .reduce((sum, d) => sum + c.inventory.bulkSize * c.menu[d].bulkCost, 0);
  const affordable = (cost: number) => cost + reserve() <= w.coins;
  function manage() {
    const day = dayKey(w.now, config);
    for (const row of lifePathStatus(w, config).rows) if (row.claimable && lifePathRewardQuote(w, config, row.index)?.safe) send({ type: 'claimLifePath', level: row.index });
    if (!attendanceRewardQuote(w, config, day).reason) send({ type: 'claimAttendance', day });
    for (const row of w.daily?.rows ?? []) if (!questRewardQuote(w, config, day, row.id).reason) send({ type: 'claimQuest', day, questId: row.id });
    if (!questRewardQuote(w, config, day, null).reason) send({ type: 'claimDailyBonus', day });
    for (const dish of DISHES) {
      if (restockQuote(w, config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
      else if (!w.inventory[dish] && restockQuote(w, config, dish, 'one').ok) send({ type: 'restock', dish, mode: 'one' });
    }
    const dog = dogUpgradeQuote(w, config);
    if (!w.dogLevel && dog.ok && affordable(dog.cost!)) send({ type: 'upgradeDog', level: dog.next!.level });
    for (const item of ['phone', 'qr'] as const) { const q = unlockQuote(w, config, item); if (q.ok && affordable(q.cost)) send({ type: 'buyUnlock', item }); }
    const candidates: { cost: number; command: Command }[] = [];
    for (const kind of EQUIPMENT) { const q = upgradeQuote(w, config, kind); if (q.ok) candidates.push({ cost: q.cost!, command: { type: 'upgrade', kind } }); }
    for (const table of w.tables) {
      const next = c.upgrades.table.levels[table.level];
      if (table.state === 'empty' && next && (!next.requiredBadge || w.badges.includes(next.requiredBadge)) && (!next.repBase || w.reputation >= next.repBase[0])) candidates.push({ cost: next.priceBase, command: { type: 'upgradeTable', tableId: table.id } });
    }
    const glasses = buyGlassQuote(w, config, 1);
    // config-exempt: bot policy targets two circulating glasses per seat, capped by the real purchase quote.
    if (glasses.ok && w.glasses.length < w.tables.reduce((sum, t) => sum + t.capacity, 0) * 2) candidates.push({ cost: glasses.cost, command: { type: 'buyGlass', count: 1 } });
    const nextDog = dogUpgradeQuote(w, config);
    if (w.dogLevel && nextDog.ok) candidates.push({ cost: nextDog.cost!, command: { type: 'upgradeDog', level: nextDog.next!.level } });
    const sign = signboardQuote(w, config), neon = signboardQuote(w, config, 'neon');
    if (sign.ok) candidates.push({ cost: sign.cost, command: { type: 'installSignboard' } });
    if (neon.ok) candidates.push({ cost: neon.cost, command: { type: 'setSignboard', style: 'neon' } });
    const purchase = candidates.sort((a, b) => a.cost - b.cost).find(q => affordable(q.cost));
    if (purchase) send(purchase.command);
    if (w.phase === 'open' && !w.shift!.flyersUsed) {
      const q = flyerQuote(w, config);
      if (!q.stock && !q.buyReason) send({ type: 'buyFlyer' });
      if (!flyerQuote(w, config).useReason) send({ type: 'activateFlyer', shiftId: w.shift!.id });
    }
    if (w.phase === 'resting' && !w.lease) {
      const ordered = c.locations.list.filter(l => l.id !== c.locations.fallback).sort((a, b) => a.mult - b.mult);
      const target = ordered.find(l => l.mult > highestLocationMult && leaseQuote(w, config, l.id).requiredLifePath <= w.lifePath)
        ?? ordered.find(l => l.mult === highestLocationMult);
      if (target) {
        const q = leaseQuote(w, config, target.id);
        if (q.ok && affordable(q.cost)) { send({ type: 'rentLocation', locationId: target.id, leaseId: q.leaseId, maxCost: q.cost }); highestLocationMult = target.mult; }
      }
    }
  }
  for (let day = 0; day < days; day++) {
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
      // The bot respects the configured ceiling; the engine remains the authoritative guard.
      if (w.lastServedAt === null || w.now - w.lastServedAt >= 1000 / c.spawn.playerServeCeilingPerSec) {
        const ready: { deadline: number; command: Command }[] = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready'))
          .map(t => ({ deadline: t.order!.placedAt + t.order!.patienceMs, command: { type: 'serve', tableId: t.id, orderId: t.order!.id } }));
        const delivery = deliveryQuote(w, config);
        if (delivery?.ready && delivery.safe) ready.push({ deadline: delivery.order.expiresAt, command: { type: 'serveDelivery', deliveryId: delivery.order.id } });
        ready.sort((a, b) => a.deadline - b.deadline);
        if (ready[0]) send(ready[0].command);
      }
      game.advance(w.now + STEP_MS);
      if (w.completedShifts > observed) {
        assert.equal(w.completedShifts, observed + 1);
        const s = w.shift!.stats;
        penalty += s.penalty; arrived += s.arrived; lost += s.lost; rejected += s.rejected;
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
      location: w.location, lease: w.lease ? { ...w.lease } : null,
      ranking: { id: w.seasons!.ranking.id, earned: w.seasonEarned, tier: seasonTier(w, config).tier.id, endsAt: w.seasons!.ranking.endsAt },
      contest: { id: w.seasons!.contest.id, earned: w.seasons!.contestEarned, tier: seasonTier(w, config, 'contest').tier.id, endsAt: w.seasons!.contest.endsAt },
    };
    rows.push(row); onDay?.(row);
  }
  const eventTypes = new Set(['life_path_level_reached', 'life_path_reward_claimed', 'lease_started', 'lease_expired', 'lease_deposit_refunded', 'unlock_bought', 'signboard_installed', 'signboard_bought', 'signboard_equipped', 'upgrade_bought', 'table_upgraded', 'glasses_bought', 'dog_bought', 'dog_upgraded', 'flyer_bought']);
  const report = { policy: CAREER_POLICY, days, seed, startAt, configVersion: config.version, rulesVersion: game.log.at(-1)!.rulesVersion,
    commandCount: game.log.length, commandHash: createHash('sha256').update(JSON.stringify(game.log)).digest('hex'), eventCount: w.events.length,
    kBand: c.k.band, advancedBandDecision: 'pending-owner; report measured k without tuning numbers or certifying balance',
    value: serveValueStats(w.serves, config), rows, milestones: w.events.filter(e => eventTypes.has(e.type)), seasonResults: w.seasons!.results };
  return { game, report };
}

export interface CareerDay {
  day: number; date: string; at: number; openingCoins: number; coins: number; income: number; rewardCredits: number; depositRefund: number;
  spent: Record<string, number>; totalSpent: number; penalty: number; lifetimeEarned: number; reputation: number; shifts: number; served: number;
  arrived: number; lost: number; rejected: number; deliveryCompleted: number; deliveryMissed: number; mean: number | null; k: number; withinKBand: boolean;
  lifePath: number; nextRequirements: ReturnType<typeof lifePathStatus>['rows'][number]['requirements']; peak: string | null;
  equipment: Game['world']['equipment']; tables: { level: number; capacity: number }[]; glasses: number; dog: number; unlocks: string[];
  location: string; lease: Game['world']['lease'] | null;
  ranking: { id: string; earned: number; tier: string; endsAt: number }; contest: { id: string; earned: number; tier: string; endsAt: number };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(args.every(a => /^--(days|seed|out)=.+$/.test(a)), 'Usage: npm run sim:career -- --days=30 --seed=42 [--out=report.json]');
  const option = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const { report } = simulateCareer({ days: Number(option('days') ?? 30), seed: Number(option('seed') ?? 42) }, row => console.log(JSON.stringify(row)));
  if (option('out')) writeFileSync(option('out')!, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ days: report.days, commands: report.commandCount, commandHash: report.commandHash, value: report.value, advancedBandDecision: report.advancedBandDecision }));
}
