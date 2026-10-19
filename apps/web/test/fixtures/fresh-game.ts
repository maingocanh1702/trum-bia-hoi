import { Game, config, loadConfig, encodeSave } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// A brand-new guest save: no shift opened, every HUD control available from shift 1 (specs that are not about onboarding).
//   fresh-game [isoTime] [seed] [tables]
// Seat model (rules 28): a new game owns one table; `tables` > 1 buys the extra ones with the real `buyTable` command, the wallet
// covering exactly their price, so the save starts with the same coins as a one-table game.
const now = Date.parse(process.argv[2] ?? '2026-09-08T10:00:00Z'), seed = Number(process.argv[3] ?? 42), tables = Number(process.argv[4] ?? 1);
const raw = fullHud(structuredClone(config.raw));
for (let n = 2; n <= tables; n++) raw.shift.startingCoinsBase += raw.upgrades.table.tablePriceBase[n - 2];
const game = new Game(loadConfig(raw), seed, now);
for (let n = 2; n <= tables; n++) {
  const result = game.command({ idempotencyKey: `table-${n}`, at: game.world.now, command: { type: 'buyTable' } });
  if (!result.ok) throw Error(`fixture:${result.reason}`);
}
console.log(JSON.stringify({ save: encodeSave(game), now: game.world.now }));
