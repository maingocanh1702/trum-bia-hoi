import assert from 'node:assert/strict';
import { config, Game, DISHES, loadConfig } from '../packages/engine/src/index';

const w = new Game().world;
assert.equal(w.coins, Math.round(config.raw.shift.startingCoinsBase * config.raw.k.value));
assert.equal(w.glasses.length, config.raw.glasses.start);
assert.equal(w.tables.length, config.raw.upgrades.table.startingTables);
for (const dish of DISHES) assert.equal(config.values.menu[dish].price, config.raw.menu[dish].price);
assert.equal(config.values.freshness.baseMs, config.raw.freshness.baseMs);
assert.equal(config.get('shift.dailyEarnCapBase'), Math.round(config.raw.shift.dailyEarnCapBase * config.raw.k.value));
assert.equal(config.values.lottery.legalGate, false);
assert.deepEqual(loadConfig(config.raw).values, config.values);
console.log(`Config ${config.version}: runtime loader/schema, Base scaling and new-game initialization match the registry seed.`);
