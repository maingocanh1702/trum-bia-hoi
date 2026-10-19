import {
  DISHES, EQUIPMENT, isSeatModel, restockQuote, upgradeQuote, buyGlassQuote, buyTableQuote, buyChairQuote, tableUpgradeQuote,
  unlockQuote, lifePathStatus, lifePathRewardQuote, deliveryQuote, dayKey,
  attendanceRewardQuote, questRewardQuote, signboardQuote, flyerQuote, leaseQuote,
  type Game, type Command,
} from '../src/index';

// config-exempt: deterministic diagnostic policy cadence/budget, never live game tuning.
export const STEP_MS=100, MANAGEMENT_MS=1000, MAX_DAY_STEPS=864000;

/** The seat-model purchase the bot saves for next (a table, else a second chair), or null once the seats are complete. */
export function seatGrowth(game: Game): { cost: number; command: Command } | null {
  const w = game.world, config = game.config;
  if (!isSeatModel(config.values)) return null;
  const pending = (q: { cost: number | null; ok: boolean; reason: string | null }) => q.cost !== null && (q.ok || q.reason === 'notEnoughCoins');
  const table = buyTableQuote(w, config);
  if (pending(table)) return { cost: table.cost!, command: { type: 'buyTable' } };
  for (const t of w.tables) { const q = buyChairQuote(w, config, t.id); if (pending(q)) return { cost: q.cost!, command: { type: 'buyChair', tableId: t.id } }; }
  return null;
}

export function createManagementPolicy(game:Game,send:(command:Command)=>void) {
  const w=game.world;
  let attainedLocationId:unknown=w.lease?.locationId??w.location;
  if(!w.lease)for(let i=w.events.length-1;i>=0;i--) {
    const event=w.events[i];
    if(event.type==='lease_started'){attainedLocationId=event.data.locationId;break;}
  }
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
    for (const item of ['phone', 'qr'] as const) { const q = unlockQuote(w, config, item); if (q.ok && affordable(q.cost)) send({ type: 'buyUnlock', item }); }
    // Seat model (plan S1, D18): seats first -- the next table, else one second chair -- saving for it before anything else.
    const growth = seatGrowth(game);
    if (growth) { if (affordable(growth.cost)) send(growth.command); return attendLocation(); }
    const candidates: { cost: number; command: Command }[] = [];
    for (const kind of EQUIPMENT) { const q = upgradeQuote(w, config, kind); if (q.ok) candidates.push({ cost: q.cost!, command: { type: 'upgrade', kind } }); }
    // Table levels pay off only on capacity snapshots until the seat-model level benefits land (plan S4).
    if (!isSeatModel(c)) for (const table of w.tables) { const q = tableUpgradeQuote(w, config, table.id); if (q.ok) candidates.push({ cost: q.cost!, command: { type: 'upgradeTable', tableId: table.id } }); }
    const glasses = buyGlassQuote(w, config, 1);
    // config-exempt: bot policy targets two circulating glasses per seat, capped by the real purchase quote.
    if (glasses.ok && w.glasses.length < w.tables.reduce((sum, t) => sum + t.capacity, 0) * 2) candidates.push({ cost: glasses.cost, command: { type: 'buyGlass', count: 1 } });
    const sign = signboardQuote(w, config), neon = signboardQuote(w, config, 'neon');
    if (sign.ok) candidates.push({ cost: sign.cost, command: { type: 'installSignboard' } });
    if (neon.ok) candidates.push({ cost: neon.cost, command: { type: 'setSignboard', style: 'neon' } });
    const purchase = candidates.sort((a, b) => a.cost - b.cost).find(q => affordable(q.cost));
    if (purchase) send(purchase.command);
    attendLocation();
  }
  function attendLocation() {
    const config=game.config,c=config.values;
    if (w.phase === 'open' && !w.shift!.flyersUsed) {
      const q = flyerQuote(w, config);
      if (!q.stock && !q.buyReason) send({ type: 'buyFlyer' });
      if (!flyerQuote(w, config).useReason) send({ type: 'activateFlyer', shiftId: w.shift!.id });
    }
    if (w.phase === 'resting' && !w.lease) {
      const attained=c.locations.list.find(l=>l.id===attainedLocationId);
      if(!attained)throw Error('policy:locationMissing');
      const ordered = c.locations.list.filter(l => l.id !== c.locations.fallback).sort((a, b) => a.mult - b.mult);
      const target = ordered.find(l => l.mult > attained.mult && leaseQuote(w, config, l.id).requiredLifePath <= w.lifePath)
        ?? ordered.find(l => l.id === attainedLocationId);
      if (target) {
        const q = leaseQuote(w, config, target.id);
        if (q.ok && affordable(q.cost)) { send({ type: 'rentLocation', locationId: target.id, leaseId: q.leaseId, maxCost: q.cost }); attainedLocationId = target.id; }
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
