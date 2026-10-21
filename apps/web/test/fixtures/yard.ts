import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, tableSlots, trayDishes, chairUpgrade, tableUpgrade, isSeatModel } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';

// S6 (plan S6 row, P4): the yard. `fresh` is a brand-new resting game (one table, one chair, seven empty places); `full` is a resting shop whose first alley is
// complete — every place a table of two chairs, table levels 1..4 and chair levels 1..3 spread over the eight tables, bought with real commands (the life-path
// gates of both ladders are opened on the config, the wallet pays). `inspect` reads a browser save back through the engine.
const mode = process.argv[2] ?? 'full';
if (mode === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save), w = g.world;
  process.stdout.write(JSON.stringify({ tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1 })), coins: w.coins }));
} else {
  const raw = structuredClone(config.raw); raw._meta.version = 'yard-fixture'; fullHud(raw); raw.onboarding.enabled = false;
  if (mode === 'live') { steadyDemand(raw); raw.patience.thuongMs = 180000; raw.shift.startingCoinsBase += raw.upgrades.table.tablePriceBase[0]; } // a guest soon, he waits while the page is inspected; the wallet pays table 2 and keeps the usual start
  if (mode === 'full') {
    for (const row of raw.upgrades.table.tableUpgrade.levels) row.lifePathGate = 0;
    for (const row of raw.upgrades.table.chairUpgrade.levels) row.lifePathGate = 0;
    raw.shift.startingCoinsBase = 2_000_000; // every price is still the config's; the subject is the drawing, not the wallet
  }
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-21T10:00:00+07:00')), w = g.world, v = g.config.values;
  if (!isSeatModel(v) || !tableUpgrade(v) || !chairUpgrade(v)) throw Error('fixture:not-the-seat-model-with-ladders');
  const send = (command: Parameters<Game['command']>[0]['command']) => { const r = g.command({ at: w.now, idempotencyKey: `yard-${g.log.length}`, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
  const slots = tableSlots(w, g.config);
  if (mode === 'live') {
    // An OPEN shift with a ready order at a table of the first row (its bubble above row 1 carries the one spotlight): the subject is the yard around a live
    // table, so demand is steady and nothing else is bought. A solo guest's tray (beer or an instant dish) is ready at once under instant pour.
    send({ type: 'buyTable' }); send({ type: 'startShift' });
    const ready = () => w.tables.findIndex(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready'));
    for (let i = 0; i < 6000 && ready() < 0; i++) g.advance(w.now + 100);
    if (ready() < 0) throw Error('fixture:no-ready-order');
    process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, slots, readyTable: ready(), tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1, dishes: trayDishes(v, t) })) }));
    process.exit(0);
  }
  if (mode === 'full') {
    while (w.tables.length < slots) send({ type: 'buyTable' });
    for (const table of w.tables) send({ type: 'buyChair', tableId: table.id });
    // Table n (1-based) goes to level 1 + (n - 1) % 4 and its chairs to 1 + (n - 1) % 3: every level of both ladders shows at least once among eight tables.
    for (const [i, table] of w.tables.entries()) {
      for (let level = 1; level < 1 + i % 4; level++) send({ type: 'upgradeTable', tableId: table.id });
      for (let level = 1; level < 1 + i % 3; level++) send({ type: 'upgradeChair', tableId: table.id });
    }
  }
  process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, slots, coins: w.coins,
    tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1, dishes: trayDishes(v, t) })) }));
}
