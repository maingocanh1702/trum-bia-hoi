import { test } from 'node:test';
import assert from 'node:assert/strict';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import { Game, config, loadConfig, isSeatModel } from '../src';
import { furnishFirstAlley } from '../sim/scenario';
import { measureStandard, MIN_SERVED } from '../sim/headless';

// Plan "Vui 3 ca" S5: the standard sims (`npm run sim`, `sim:onboarding`, `sim:rush`) were red since S1 because a new shop is one table with one chair. They run on the
// furnished first alley now; HOW k is measured (mean payment + tip per serve over the anchor) is untouched.
const flags = { restedStart: false, qrStart: false, shipperStart: false, flyerStart: false };

test('the standard scenario is the complete first alley built with real commands, and the wallet is the one a new shop has', () => {
  const g = new Game(config, 42, 0), start = g.world.coins;
  assert.equal(g.world.tables.length, 1); assert.equal(g.world.tables[0].capacity, 1, 'a new game is one table with one chair');
  furnishFirstAlley(g);
  const slots = config.values.locations.list.find(l => l.id === g.world.location)!.tableSlots;
  assert.equal(g.world.tables.length, Math.min(config.values.upgrades.table.chairsAfterTables, slots));
  assert.ok(g.world.tables.every(t => t.capacity === 2 && t.level === 1 && t.state === 'empty'), 'every table has its second chair and no level');
  assert.equal(g.world.coins, start, 'topped up by exactly what each purchase cost: the starting wallet is intact');
  assert.equal(g.world.lifetimeEarned, 0, 'not earned, so no life-path or cap bookkeeping moves');
  assert.deepEqual(g.log.map(e => e.command.type), ['buyTable', 'buyTable', 'buyTable', 'buyChair', 'buyChair', 'buyChair', 'buyChair'].slice(0, g.log.length));
  assert.ok(g.log.every(e => e.result.ok && e.rulesVersion === 28), 'the shop is furnished with the engine\'s own commands');
  // The top-up itself is a measurement wallet, like every `w.unlocks.push` of the standard sims: nobody replays this history, so it is not replayable from a fresh save.
});

test('a capacity pin and a 1.x pin start furnished and are left alone', () => {
  const pin = loadConfig(structuredClone(capacityModel)), g = new Game(pin, 42, 0);
  assert.equal(isSeatModel(pin.values), false);
  const before = structuredClone(g.world); furnishFirstAlley(g);
  assert.deepEqual(g.world, before); assert.equal(g.log.length, 0);
});

test('the standard measurement runs on the furnished alley: 1000 serves of both profiles, k is mean value per serve over the anchor, onboarding on and off', () => {
  for (const [onboarding, kitchen] of [[true, 0], [false, config.raw.upgrades.kitchen.priceBase.length - 1]] as const) {
    const { row, arrival } = measureStandard(config.raw, kitchen, onboarding, 42, flags);
    assert.ok(row.serves >= MIN_SERVED && row.profile === (kitchen ? 'full-menu' : 'cold-menu') && row.onboardingEnabled === onboarding);
    assert.ok(Math.abs(row.k - row.mean / config.values.k.anchorValuePerServe) < 0.001, 'the method: mean(payment + tip) / anchor, nothing else');
    assert.equal(row.configVersion, config.version);
    assert.ok(arrival.spawned > 0 && arrival.forced === (onboarding ? 1 : 0), 'the forced onboarding guest is the first shift\'s only one');
  }
});
