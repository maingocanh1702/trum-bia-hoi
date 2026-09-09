import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, beerStatus, washerStatus } from '../../../../packages/engine/src';
if (process.argv[2] === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save), w = g.world;
  console.log(JSON.stringify({ beer: beerStatus(w, g.config), washer: washerStatus(w, g.config), inventory: w.inventory, remaining: w.shift!.endsAt - w.now, paused: !!w.paused, equipment: w.equipment }));
} else {
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 100000;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T04:00:00Z'));
  g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'open' });
  g.advance(g.world.now + 1000);
  console.log(JSON.stringify({ now: g.world.now, save: encodeSave(g) }));
}
