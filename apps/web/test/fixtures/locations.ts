import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, decodeSave, encodeSave, type Command } from '../../../../packages/engine/src';
if (process.argv[2] === 'inspect') {
  const g = decodeSave(readFileSync(0, 'utf8')), w = g.world;
  console.log(JSON.stringify({ now: w.now, coins: w.coins, paused: !!w.paused, location: w.location, lease: w.lease, phase: w.phase, earned: w.lifetimeEarned }));
} else {
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 1000000;
  raw.lifePath[1].lifetimeBase = 1; raw.lifePath[1].requires = raw.lifePath[1].requires!.map(() => 'LP0');
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T04:00:00Z'));
  const send = (command: Command) => g.command({ at: g.world.now, command, idempotencyKey: `web-lease-${g.log.length}` });
  send({ type: 'startShift' }); g.advance(g.world.now + 11000);
  const table = g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  send({ type: 'serve', tableId: table.id, orderId: table.order!.id }); send({ type: 'endShift' }); g.advance(g.world.now + 3600000);
  console.log(JSON.stringify({ now: g.world.now, save: encodeSave(g) }));
}
