import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, decodeSave, encodeSave, type Command } from '../../../../packages/engine/src';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';
if (process.argv[2] === 'inspect') {
  const g = decodeSave(readFileSync(0, 'utf8')), w = g.world, table = w.tables.find(t => t.order);
  console.log(JSON.stringify({ now: w.now, paused: !!w.paused, earned: w.seasonEarned, seasons: w.seasons, peak: w.peakLeague,
    waiting: table ? table.order!.placedAt + table.order!.patienceMs - w.now : null }));
} else {
  // The subject is the season board and the calendar, not the pace of one table: guests keep coming at the pace this save was written for. The calendar is the one the spec
  // was written for, a weekly ranking inside a two-week contest (JSON 2.1.0 seals one 21-day window for both, which cannot show "the ranking resets, the contest continues");
  // a custom version keeps the browser from replacing this pin with the bundled seed.
  const raw = steadyDemand(structuredClone(config.raw)); raw._meta.version = 'seasons-fixture'; raw.league.seasons.ranking.days = 7; raw.league.seasons.contest.days = 14;
  const g = new Game(loadConfig(raw), 42, Date.parse(config.values.league.seasons.epochUtc) + 6 * 86400000 + 20 * 3600000);
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
