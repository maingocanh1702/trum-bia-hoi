import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, tableUpgrade, chairUpgrade } from '../../../../packages/engine/src';
import { serveNext } from '../../../../packages/engine/sim/policy';
import { fullHud } from './full-hud';

// Table and chair levels (S4, rules 28): a resting shop on the bundled seat seed with four tables of two chairs, Duong Len Trum LP1 reached (its
// threshold lowered to one coin earned: the real 125 000 coins are days of play, the gate arithmetic is what the spec drives) and a wallet that
// pays two table levels' worth of ladder: the first table's Lv2, one chair level for each of the first two tables, and no more. Always the real
// engine (tables, chairs and the shift that earns LP1 are real commands), never hand-written JSON. `inspect` reads a browser save back.
if (process.argv[2] === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save);
  process.stdout.write(JSON.stringify({ coins: g.world.coins, lifePath: g.world.lifePath, tables: g.world.tables.map(t => ({ seats: t.capacity, level: t.level, chairLevel: t.chairLevel ?? 1 })),
    events: g.world.events.filter(e => e.type === 'table_upgraded' || e.type === 'chair_upgraded').map(e => ({ type: e.type, ...e.data })) }));
} else {
  const start = Date.parse('2026-10-20T10:00:00+07:00'), TARGET = 55_000; // coins left once the shift is over: Lv2 + two chair levels fit (45 000), the next level (27 500) does not
  const build = (startingCoinsBase: number) => {
    const raw = structuredClone(config.raw); raw._meta.version = 'table-upgrade-fixture'; fullHud(raw);
    raw.lifePath[1].lifetimeBase = 1; raw.shift.startingCoinsBase = startingCoinsBase;
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
