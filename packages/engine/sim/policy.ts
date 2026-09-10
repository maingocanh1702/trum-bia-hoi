import {
  DISHES, EQUIPMENT, restockQuote, upgradeQuote, buyGlassQuote, dogUpgradeQuote,
  unlockQuote, lifePathStatus, lifePathRewardQuote, deliveryQuote, dayKey,
  attendanceRewardQuote, questRewardQuote, signboardQuote, flyerQuote, leaseQuote,
  type Game, type Command,
} from '../src/index';

// config-exempt: deterministic diagnostic policy cadence/budget, never live game tuning.
export const STEP_MS=100, MANAGEMENT_MS=1000, MAX_DAY_STEPS=864000;

export function createManagementPolicy(game:Game,send:(command:Command)=>void) {
  const w=game.world;
  let highestLocationMult=game.config.values.locations.list.find(l=>l.id===w.location)!.mult;
  const reserve = () => {const c=game.config.values;return DISHES.filter(d => c.menu[d].unlock.kitchenLevel <= w.equipment.kitchen)
    .reduce((sum, d) => sum + c.inventory.bulkSize * c.menu[d].bulkCost, 0);};
  const affordable = (cost: number) => cost + reserve() <= w.coins;
  function manage() {
    const config=game.config,c=config.values;
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
  return manage;
}

export function serveNext(game:Game,send:(command:Command)=>void) {
  const w=game.world,config=game.config,c=config.values;
      // The bot respects the configured ceiling; the engine remains the authoritative guard.
      if (w.lastServedAt === null || w.now - w.lastServedAt >= 1000 / c.spawn.playerServeCeilingPerSec) {
        const ready: { deadline: number; command: Command }[] = w.tables.filter(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready'))
          .map(t => ({ deadline: t.order!.placedAt + t.order!.patienceMs, command: { type: 'serve', tableId: t.id, orderId: t.order!.id } }));
        const delivery = deliveryQuote(w, config);
        if (delivery?.ready && delivery.safe) ready.push({ deadline: delivery.order.expiresAt, command: { type: 'serveDelivery', deliveryId: delivery.order.id } });
        ready.sort((a, b) => a.deadline - b.deadline);
        if (ready[0]) send(ready[0].command);
      }
}
