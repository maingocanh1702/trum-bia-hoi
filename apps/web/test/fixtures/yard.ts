import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, tableSlots, trayDishes, chairUpgrade, tableUpgrade, isSeatModel, restockQuote, DISHES, WEATHER } from '../../../../packages/engine/src';
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
  if (mode === 'closing-low') raw.inventory.startingStock.bia = [1, 1]; // the closing shift with its beer stock low: the prompt takes the slot, the closing line joins it
  if (mode === 'live' || mode === 'closing' || mode === 'closing-low') { steadyDemand(raw); raw.patience.thuongMs = 180000; raw.shift.startingCoinsBase += raw.upgrades.table.tablePriceBase[0]; } // a guest soon, he waits while the page is inspected; the wallet pays table 2 and keeps the usual start
  if (mode === 'rows') { steadyDemand(raw); raw.patience.thuongMs = 600000; raw.shift.startingCoinsBase = 2_000_000; } // a full alley of pairs; the guests wait while the page is inspected
  if (mode === 'linger-rows') { // pairs of "lai rai" guests (a label on every caption, long sipping), sunny, no rush; the open orders wait while the page is inspected
    for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
    raw.rush.schedule.perShift = 0; raw.spawn.capacityDemand.maxMult = 1; raw.spawn.pPair = 1; raw.spawn.baseMs = raw.rush.none.floorMs = 3000;
    for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = key === 'ngoily' ? 1 : key === 'thuong' ? 0.001 : 0;
    raw.patience.thuongMs = 600000; raw.shift.startingCoinsBase = 2_000_000; raw.glasses.start = raw.glasses.buyCap; // sixteen guests at once hold sixteen glasses
  }
  if (mode === 'full') {
    for (const row of raw.upgrades.table.tableUpgrade.levels) row.lifePathGate = 0;
    for (const row of raw.upgrades.table.chairUpgrade.levels) row.lifePathGate = 0;
    raw.shift.startingCoinsBase = 2_000_000; // every price is still the config's; the subject is the drawing, not the wallet
  }
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-21T10:00:00+07:00')), w = g.world, v = g.config.values;
  if (!isSeatModel(v) || !tableUpgrade(v) || !chairUpgrade(v)) throw Error('fixture:not-the-seat-model-with-ladders');
  const send = (command: Parameters<Game['command']>[0]['command']) => { const r = g.command({ at: w.now, idempotencyKey: `yard-${g.log.length}`, command }); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
  const slots = tableSlots(w, g.config);
  if (mode === 'live' || mode === 'closing' || mode === 'closing-low') {
    // `closing` (B2.8 second pass): the same live shift, then the player closes it (`endShift`) while the guest still waits, so the closing line shows.
    // An OPEN shift with a ready order at a table of the first row (its bubble above row 1 carries the one spotlight): the subject is the yard around a live
    // table, so demand is steady and nothing else is bought. A solo guest's tray (beer or an instant dish) is ready at once under instant pour.
    send({ type: 'buyTable' }); send({ type: 'startShift' });
    const ready = () => w.tables.findIndex(t => t.order && ['pending', 'grace'].includes(t.order.state) && t.order.items.every(i => i.state === 'ready'));
    for (let i = 0; i < 6000 && ready() < 0; i++) g.advance(w.now + 100);
    if (ready() < 0) throw Error('fixture:no-ready-order');
    if (mode !== 'live') { send({ type: 'endShift' }); if (w.phase !== 'closing') throw Error(`fixture:not-closing:${w.phase}`); }
    process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, slots, readyTable: ready(), tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1, dishes: trayDishes(v, t) })) }));
    process.exit(0);
  }
  if (mode === 'rows') {
    // Review 07 r1 (W1): a busy alley of eight tables of two chairs, an OPEN shift, and an unserved order at tables of every row below the first, so each of
    // those rows hangs an order bubble (and its patience track) under the table above it. Nothing is served; the patience is long enough to inspect the page.
    while (w.tables.length < slots) send({ type: 'buyTable' });
    for (const table of w.tables) send({ type: 'buyChair', tableId: table.id });
    send({ type: 'startShift' });
    const open = () => w.tables.flatMap((t, i) => t.order && ['pending', 'grace'].includes(t.order.state) ? [i] : []);
    const wanted = [2, 3, 4, 5, 6, 7]; // rows 2-4 of a phone's two columns, rows 2-3 of the three columns of a wide screen
    for (let i = 0; i < 20000 && !wanted.every(n => open().includes(n)); i++) g.advance(w.now + 100);
    if (!wanted.every(n => open().includes(n))) throw Error(`fixture:rows-without-orders:${open().join(',')}`);
    process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, slots, openTables: open(), tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1, dishes: trayDishes(v, t) })) }));
    process.exit(0);
  }
  if (mode === 'linger-rows') {
    // Review 07 r1 (W1, second look): the tallest caption is a lingering table's — its guest label, its state and the enjoy countdown hang about 21 px below the
    // table's space. Eight tables of two chairs, an OPEN shift: tables 1-3 (the first row on every screen) and 5-6 are served and sipping (`consuming`, countdown
    // shown) while tables 4, 7 and 8 wait with an open order, so an order bubble hangs right under a lingering caption on a phone's two columns (4 under 2, 7-8
    // under 5-6) and on a wide screen's three (4 under 1, 8 under 5). Only the chosen tables are served, by the real `serve` command.
    while (w.tables.length < slots) send({ type: 'buyTable' });
    for (const table of w.tables) send({ type: 'buyChair', tableId: table.id });
    send({ type: 'startShift' });
    const serveAt = [0, 1, 2, 3], waitAt = [4, 5, 6, 7]; // founder 2026-10-22 (B2.8): four abreast in two rows, so row 1 lingers over every open order of row 2 (was [0,1,2,4,5] / [3,6,7] for two or three columns)
    const sipping = (i: number) => w.tables[i].state === 'consuming' && w.tables[i].until !== null;
    const waiting = (i: number) => Boolean(w.tables[i].order && ['pending', 'grace'].includes(w.tables[i].order!.state));
    const done = () => serveAt.every(sipping) && waitAt.every(waiting);
    for (let i = 0; i < 40000 && !done(); i++) {
      for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) g.command({ at: w.now, idempotencyKey: `yard-${g.log.length}`, command: { type: 'restock', dish, mode: 'bulk' } });
      for (const n of serveAt) {
        const order = w.tables[n].order;
        if (order && ['pending', 'grace'].includes(order.state) && order.items.every(item => item.state === 'ready')) g.command({ at: w.now, idempotencyKey: `yard-${g.log.length}`, command: { type: 'serve', tableId: w.tables[n].id, orderId: order.id } }); // the engine refuses above the serve ceiling: tried again next tick
      }
      g.advance(w.now + 100);
    }
    if (!done()) throw Error(`fixture:linger-rows-not-reached:${w.tables.map(t => t.state).join(',')}`);
    process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, slots, lingering: serveAt, openTables: waitAt, tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1, dishes: trayDishes(v, t) })) }));
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
    // Review 07 r1 (W4): a shop that has never opened shows the "Quán nhỏ đã sẵn sàng" note over the grid; open one shift and close it before anyone
    // arrives, so the resting yard itself (eight tables, their chair art and trays) is what the page shows.
    send({ type: 'startShift' }); send({ type: 'endShift' });
    for (let i = 0; i < 6000 && w.phase !== 'resting'; i++) g.advance(w.now + 100);
    if (w.phase !== 'resting' || w.completedShifts !== 1) throw Error('fixture:full-shift-not-closed');
  }
  process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, slots, coins: w.coins,
    tables: w.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1, dishes: trayDishes(v, t) })) }));
}
