import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, tableUpgrade, chairUpgrade } from '../../../../packages/engine/src';
import { serveNext } from '../../../../packages/engine/sim/policy';
import { fullHud } from './full-hud';

// Table and chair levels (S4, rules 28): a resting shop on the bundled seat seed with four tables of two chairs, Duong Len Trum LP1 reached (its
// threshold lowered to one coin earned: the real 20 000 coins are days of play, the gate arithmetic is what the spec drives) and a wallet that
// pays two table levels' worth of ladder: the first table's Lv2, one chair level for each of the first two tables, and no more. Always the real
// engine (tables, chairs and the shift that earns LP1 are real commands), never hand-written JSON. `inspect` reads a browser save back.
if (process.argv[2] === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save);
  process.stdout.write(JSON.stringify({ coins: g.world.coins, lifePath: g.world.lifePath, tables: g.world.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1 })),
    events: g.world.events.filter(e => e.type === 'table_upgraded' || e.type === 'chair_upgraded').map(e => ({ type: e.type, ...e.data })) }));
} else if (process.argv[2] === 'bar') {
  // The patience bar of a table with level-3 chairs (order patience x1.30): the order's own deadline is 30 % longer than the guest's patience, the tip window is not.
  // Two saves of the same shift, with table 1's first order at 30 % and at 46 % of the guest's own patience: the tip window (the first 40 %) closes in between, while
  // the share of the STRETCHED deadline left is still 1 - 0.46 / 1.3 = 65 % at the second one. Real commands and clock steps, never hand-written JSON.
  const start = Date.parse('2026-10-20T10:00:00+07:00'), raw = structuredClone(config.raw);
  raw._meta.version = 'table-upgrade-fixture'; fullHud(raw); raw.onboarding.enabled = false; raw.shift.startingCoinsBase = 100_000;
  for (const row of raw.upgrades.table.chairUpgrade.levels) row.lifePathGate = 0; // the shipped gates (LP1 / LP2) are earned over days; the bar is the subject here
  const g = new Game(loadConfig(raw), 42, start), w = g.world;
  const send = (command: Parameters<Game['command']>[0]['command']) => { const r = g.command({ at: w.now, idempotencyKey: `bar-${g.log.length}`, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
  while (w.tables.length < 4) send({ type: 'buyTable' });
  for (const table of w.tables) send({ type: 'buyChair', tableId: table.id });
  send({ type: 'upgradeChair', tableId: w.tables[0].id }); send({ type: 'upgradeChair', tableId: w.tables[0].id });
  send({ type: 'startShift' });
  for (let i = 0; i < 4000 && !w.tables[0].order; i++) g.advance(w.now + 100);
  const table = w.tables[0], order = table.order;
  if (!order || !table.group || table.chairLevel !== 3 || table.group.chairLevel !== 3) throw Error('fixture:no-order-at-the-chair-lv3-table');
  const own = Math.min(...table.group.customers.map(x => x.patienceMs));
  if (order.patienceMs !== Math.round(own * 1.3)) throw Error(`fixture:order-patience ${order.patienceMs} of ${own}`);
  const at = (share: number) => { g.advance(order.placedAt + Math.round(own * share)); if (order.state !== 'pending') throw Error('fixture:order-not-pending'); return { save: encodeSave(g), now: w.now, elapsedMs: w.now - order.placedAt }; };
  const early = at(0.3), late = at(0.46);
  process.stdout.write(JSON.stringify({ early, late, ownMs: own, orderMs: order.patienceMs, threshold: config.values.tip.patienceThreshold }));
} else {
  const start = Date.parse('2026-10-20T10:00:00+07:00'), TARGET = 102_500; // coins left once the shift is over: Lv2 (17 500) + two chair levels (30 000, 45 000) fit, with 10 000 to spare: neither the next table level (23 750) nor the third table's chairs do
  const build = (startingCoinsBase: number) => {
    const raw = structuredClone(config.raw); raw._meta.version = 'table-upgrade-fixture'; fullHud(raw);
    raw.lifePath[1].lifetimeBase = 1; raw.shift.startingCoinsBase = startingCoinsBase;
    // The chip suggests what is within reach of an average shift first (nextGoal.reachMult); in the 2.1.0 prices the stall's second level (1 875) is, a table level (17 500) is not.
    // The subject is the table and chair card, so everything counts as within reach and the chip follows its lane order (capacity first).
    raw.nextGoal.reachMult = 1000;
    const g = new Game(loadConfig(raw), 42, start), w = g.world;
    const send = (command: Parameters<Game['command']>[0]['command']) => { const r = g.command({ at: w.now, idempotencyKey: `tu-${g.log.length}`, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
    while (w.tables.length < 4) send({ type: 'buyTable' });
    for (const table of w.tables) send({ type: 'buyChair', tableId: table.id });
    const afterPurchases = w.coins;
    send({ type: 'startShift' });
    for (let i = 0; i < 4000 && w.serves.length < 4; i++) { serveNext(g, command => { g.command({ at: w.now, idempotencyKey: `tu-${g.log.length}`, command }); }); g.advance(w.now + 100); }
    if (w.serves.length < 4) throw Error('fixture:no-guests-served');
    send({ type: 'endShift' });
    for (let i = 0; i < 20000 && w.phase !== 'resting'; i++) { serveNext(g, command => { g.command({ at: w.now, idempotencyKey: `tu-${g.log.length}`, command }); }); g.advance(w.now + 100); }
    if (w.phase !== 'resting' || w.lifePath < 1) throw Error(`fixture:state ${w.phase} LP${w.lifePath}`);
    return { g, earned: w.coins - afterPurchases, purchases: afterPurchases };
  };
  const probe = build(400_000), base = Math.round((TARGET + (400_000 * config.raw.k.value - probe.purchases) - probe.earned) / config.raw.k.value);
  const { g } = build(base), w = g.world, v = g.config.values, ladder = tableUpgrade(v)!, chair = chairUpgrade(v)!;
  const levelPrice = (target: 2 | 3 | 4, n: number) => ladder.levels[target - 2].priceBase + ladder.levels[target - 2].stepBase * n;
  process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, coins: w.coins, lifePath: w.lifePath,
    levelPrices: { lv2: [0, 1, 2, 3].map(n => levelPrice(2, n)), lv3: [0, 1, 2, 3].map(n => levelPrice(3, n)) },
    chairPrices: [0, 1, 2, 3].map(t => chair.priceBase + chair.stepBase * t) }));
}
