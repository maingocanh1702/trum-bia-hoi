import { readFileSync } from 'node:fs';
import { Game, config, decodeSave, encodeSave, type Command } from '../../../../packages/engine/src';
if (process.argv[2] === 'inspect') {
  const g = decodeSave(readFileSync(0, 'utf8')), w = g.world, table = w.tables.find(t => t.order);
  console.log(JSON.stringify({ now: w.now, paused: !!w.paused, earned: w.seasonEarned, seasons: w.seasons, peak: w.peakLeague,
    waiting: table ? table.order!.placedAt + table.order!.patienceMs - w.now : null }));
} else {
  const g = new Game(config, 42, Date.parse(config.values.league.seasons.epochUtc) + 6 * 86400000 + 20 * 3600000);
  const send = (command: Command) => { const r = g.command({ at: g.world.now, command, idempotencyKey: `web-season-${g.log.length}` }); if (!r.ok) throw Error(JSON.stringify(r)); };
  for (let i = 0; i < 3; i++) {
    send({ type: 'startShift' });
    const stopAt = g.world.now + 120000;
    while (!g.world.tables.some(t => t.order?.items.every(i => i.state === 'ready')) && g.world.now < stopAt) g.advance(g.world.now + 100);
    const table = g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
    send({ type: 'serve', tableId: table.id, orderId: table.order!.id }); send({ type: 'endShift' }); g.advance(g.world.now + 3600000);
  }
  send({ type: 'startShift' }); while (!g.world.tables.some(t => t.order)) g.advance(g.world.now + 100);
  console.log(JSON.stringify({ now: g.world.now, save: encodeSave(g) }));
}
