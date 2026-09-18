import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, restockQuote, stockCap, beerStatus } from '../../../../packages/engine/src';

const mode = process.argv[2] ?? 'ready';
if (mode === 'quote') {
  const world = JSON.parse(readFileSync(0, 'utf8'));
  console.log(JSON.stringify({ ...restockQuote(world, config, 'bia', 'full'), cap: stockCap(world, config) }));
  process.exit(0);
}
let game: Game;
if (mode === 'inspect') game = decodeSave(readFileSync(0, 'utf8'));
else {
  const raw = structuredClone(config.raw);
  const keg = raw.upgrades.keg;
  raw.inventory.startingStock.bia[0] = mode === 'full' ? raw.upgrades.stall.stockCap[0]
    : mode === 'poor' ? keg.kegStorage[0] + keg.kegBatch[0] - 1
    : mode === 'batch' || mode === 'threshold' ? keg.kegStorage[0] + keg.kegBatch[0] : keg.kegBatch[0];
  if (mode === 'poor') raw.shift.startingCoinsBase = 0;
  game = new Game(loadConfig(raw), 42, Date.parse('2026-09-16T03:00:00Z'));
  if (mode !== 'full') {
    const result = game.command({ at: game.world.now, idempotencyKey: 'quick-stock-open', command: { type: 'startShift' } });
    if (!result.ok) throw Error('fixture:shift-not-open');
    if (mode === 'batch') {
      for (let step = 0; step < 600 && !(game.world.inventory.bia === 0 && game.world.beer?.batch); step++) game.advance(game.world.now + 100);
      if (!game.world.beer?.batch || game.world.inventory.bia !== 0) throw Error('fixture:no-empty-stock-batch');
    } else game.advance(game.world.now + (mode === 'poor' || mode === 'threshold' ? 100 : keg.refillMs[0] + keg.pourMs[0]));
  }
}
const w = game.world;
console.log(JSON.stringify({
  save: mode === 'inspect' ? undefined : encodeSave(game), now: w.now,
  stock: w.inventory.bia, cap: stockCap(w, game.config), batchSize: beerStatus(w, game.config).batchSize, ready: w.beer?.ready ?? 0, batch: w.beer?.batch?.quantity ?? 0,
  coins: w.coins, paused: Boolean(w.paused), remaining: w.shift ? w.shift.endsAt - w.now : null,
  quote: restockQuote(w, game.config, 'bia', 'full'),
  restocked: w.events.filter(e => e.type === 'restocked' && e.data.dish === 'bia').map(e => e.data),
  restockCommands: game.log.filter(entry => entry.command.type === 'restock').length,
}));
