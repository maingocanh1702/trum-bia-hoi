import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Seat model (rules 28): a resting new game whose wallet buys tables 2-4 and one second chair, leaving the usual
// starting coins. `inspect` reads a browser save back through the real engine.
if (process.argv[2] === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save);
  process.stdout.write(JSON.stringify({ coins: g.world.coins, tables: g.world.tables.map(t => ({ seats: t.capacity, level: t.level })),
    events: g.world.events.filter(e => e.type === 'table_bought' || e.type === 'chair_bought').map(e => ({ type: e.type, cost: e.data.cost })) }));
} else {
  const raw = structuredClone(config.raw); raw._meta.version = 'seat-model-fixture'; fullHud(raw); // not an onboarding fixture: the whole HUD from the first shift (Wave 1 reveal thresholds)
  const table = raw.upgrades.table, prices = [...table.tablePriceBase.slice(0, 3), table.chairPriceBase[0]];
  raw.shift.startingCoinsBase += prices.reduce((sum, n) => sum + n, 0);
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-19T10:00:00+07:00'));
  const values = g.config.values;
  process.stdout.write(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins,
    tablePrices: prices.slice(0, 3).map(n => Math.round(n * raw.k.value)), chairPrice: Math.round(prices[3] * raw.k.value),
    nextChairPrice: Math.round(table.chairPriceBase[1] * raw.k.value),
    levelPrice: values.upgrades.table.tableUpgrade.levels[0].priceBase, chairUpPrice: values.upgrades.table.chairUpgrade.priceBase })); // S4: the first level of the first table, and the first chair upgrade of the shop
}
