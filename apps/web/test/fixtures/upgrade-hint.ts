import { execFileSync } from 'node:child_process';
import { Game, config, loadConfig, decodeSave, encodeSave } from '../../../../packages/engine/src';
const mode = process.argv[2];
let g: Game;
if (mode === 'crowded') {
  const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.patience.thuongMs = 600000;
  // The wallet affords the next table and every table is busy, so the one enabled control of the tables lane is "buy table" (dimmed buy buttons are not focusable).
  raw.shift.startingCoinsBase = 100000;
  g = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
  g.command({ at: g.world.now, idempotencyKey: 'start', command: { type: 'startShift' } }); g.advance(g.world.now + 180000);
} else {
  const source = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/service-states.ts', mode === 'fresh' ? 'early' : 'stale'], { encoding: 'utf8' }));
  g = decodeSave(source.save); const table = g.world.tables[0];
  g.command({ at: g.world.now, idempotencyKey: 'hint-service', command: { type: 'serve', tableId: table.id, orderId: table.order!.id } });
  if (mode === 'next') {
    g.command({ at: g.world.now, idempotencyKey: 'close', command: { type: 'endShift' } }); g.advance(g.world.now + 3600000);
    const result = g.command({ at: g.world.now, idempotencyKey: 'next', command: { type: 'startShift' } });
    if (!result.ok) throw Error(JSON.stringify(result));
  }
}
console.log(JSON.stringify({ now: g.world.now, save: encodeSave(g), stale: g.world.serves.slice(g.world.shift!.menu!.serveStart).filter(s => s.stale).length, rejected: g.world.shift!.stats.rejected }));
