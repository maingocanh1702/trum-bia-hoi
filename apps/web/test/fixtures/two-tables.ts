import { Game, config, loadConfig, encodeSave } from '../../../../packages/engine/src';

// Seat model (rules 28): a new game that bought its second table before the first shift, through the real command.
// A custom version keeps the bundle from replacing this snapshot; the wallet covers exactly that table.
const raw = structuredClone(config.raw); raw._meta.version = 'two-tables-fixture';
raw.shift.startingCoinsBase += raw.upgrades.table.tablePriceBase[0];
const game = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
const result = game.command({ idempotencyKey: 'second-table', at: game.world.now, command: { type: 'buyTable' } });
if (!result.ok) throw Error(`fixture:${result.reason}`);
process.stdout.write(JSON.stringify({ save: encodeSave(game), now: game.world.now }));
