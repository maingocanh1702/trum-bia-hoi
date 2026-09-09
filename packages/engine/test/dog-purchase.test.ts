import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, dogUpgradeQuote, encodeSave, decodeSave, type Command, type Economy } from '../src';
const send = (g: Game, command: Command, at = g.world.now) => g.command({ idempotencyKey: `dog-${g.log.length}`, at, command });
function create(patch?: (c: Economy) => void) {
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 100000; patch?.(raw);
  return new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
}
function stock(g: Game, level: number) {
  while (g.world.equipment.stall < level) assert.equal(send(g, { type: 'upgrade', kind: 'stall' }).ok, true);
  for (const dish of ['lac', 'nem'] as const) assert.equal(send(g, { type: 'restock', dish, mode: 'full' }).ok, true);
}

test('an LP0 stall buys and grows the same dog with scaled coins and unscaled ingredients, then replays exactly', () => {
  const g = create(); stock(g, 3); const w = g.world, before = structuredClone(w);
  assert.equal(w.lifePath, 0); assert.equal(w.dogLevel, 0);
  for (const [level, expectedCost, dish, quantity] of [[1, 5000, 'lac', 20], [2, 20000, 'nem', 20], [3, 62500, 'nem', 40]] as const) {
    if (level === 3) send(g, { type: 'restock', dish: 'nem', mode: 'full' });
    const snapshot = structuredClone(w), q = dogUpgradeQuote(w, g.config);
    assert.equal(q.next!.level, level); assert.equal(q.cost, expectedCost); assert.equal(q.ok, true); assert.deepEqual(w, snapshot);
    assert.deepEqual(send(g, { type: 'upgradeDog', level }), { ok: true, amount: expectedCost });
    assert.equal(w.dogLevel, level); assert.equal(w.coins, snapshot.coins - expectedCost); assert.equal(w.inventory[dish], snapshot.inventory[dish] - quantity);
    assert.deepEqual(w.events.at(-1)!.data, { fromLevel: level - 1, toLevel: level, cost: expectedCost, [`material_${dish}`]: quantity });
    assert.equal(w.events.at(-1)!.type, level === 1 ? 'dog_bought' : 'dog_upgraded');
    assert.deepEqual(decodeSave(encodeSave(g)).world, w);
  }
  assert.equal(dogUpgradeQuote(w, g.config).next, null); assert.equal(dogUpgradeQuote(w, g.config).ok, false);
  assert.deepEqual(send(g, { type: 'upgradeDog', level: 4 }), { ok: false, reason: 'maxLevel' });
  for (const key of ['reputation','lifetimeEarned','seasonEarned','dayEarned','lifePath'] as const) assert.deepEqual(w[key], before[key]);
});

test('short stock or coins never causes a partial debit and no level can be skipped or bought twice', () => {
  const g = create(); const initial = structuredClone(g.world);
  assert.deepEqual(send(g, { type: 'upgradeDog', level: 1 }), { ok: false, reason: 'dogMaterials' }); assert.deepEqual(g.world, { ...initial, seasons: g.world.seasons });
  stock(g, 3);
  for (const level of [0, -1, 1.5, NaN, Infinity, 3]) {
    const before: Game['world'] = structuredClone(g.world); assert.equal(send(g, { type: 'upgradeDog', level }).ok, false); assert.deepEqual(g.world, before);
  }
  g.world.coins = 4999; const poor = structuredClone(g.world);
  assert.deepEqual(send(g, { type: 'upgradeDog', level: 1 }), { ok: false, reason: 'notEnoughCoins' }); assert.deepEqual(g.world, poor);
  g.world.coins = 100000; const envelope = { idempotencyKey: 'one-adoption', at: g.world.now, command: { type: 'upgradeDog', level: 1 } as const };
  assert.equal(g.command(envelope).ok, true); const bought = structuredClone(g.world);
  assert.equal(g.command(envelope).ok, true); assert.deepEqual(g.world, bought);
  assert.deepEqual(send(g, envelope.command), { ok: false, reason: 'dogLevelChanged' }); assert.deepEqual(g.world, bought);
  assert.deepEqual(g.command({ ...envelope, command: { type: 'upgradeDog', level: 2 } }), { ok: false, reason: 'idempotencyConflict' }); assert.deepEqual(g.world, bought);
});

test('purchase checks stock after live preparation and uses the existing active-shift spend ledger', () => {
  const g = create(c => { c.onboarding.enabled = false; c.demandMix.pMoi = 1; c.demandMix.pNemGivenMoi = 0; });
  stock(g, 2); send(g, { type: 'startShift' });
  g.world.inventory.lac = 20; const next = g.world.shift!.nextSpawnAt + g.config.values.runtime.tableSeatingMs;
  assert.equal(dogUpgradeQuote(g.world, g.config).ok, true);
  const coins = g.world.coins;
  assert.deepEqual(send(g, { type: 'upgradeDog', level: 1 }, next), { ok: false, reason: 'dogMaterials' });
  assert.equal(g.world.dogLevel, 0); assert.equal(g.world.coins, coins); assert.ok(g.world.inventory.lac < 20);
  send(g, { type: 'restock', dish: 'lac', mode: 'full' }); const spent = g.world.shift!.stats.spent;
  assert.deepEqual(send(g, { type: 'upgradeDog', level: 1 }), { ok: true, amount: 5000 });
  assert.equal(g.world.shift!.stats.spent, spent + 5000); assert.equal(g.world.shift!.stats.penalty, 0);
});

test('dog costs and materials follow validated snapshots, and reject unsupported ingredient mappings', () => {
  const g = create(c => { c.k.value = 3; c.dog.levels[0].coinBase = 1234; c.dog.levels[0].materials.lac = 7; });
  stock(g, 2); assert.deepEqual(send(g, { type: 'upgradeDog', level: 1 }), { ok: true, amount: 3702 });
  assert.equal(g.world.inventory.lac, 18); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  for (const patch of [
    (c: Economy) => { c.dog.levels[1].level = 3; },
    (c: Economy) => { c.dog.levels[0].coinBase = 0.5; },
    (c: Economy) => { c.dog.levels[0].coinBase = Number.MAX_SAFE_INTEGER; },
    (c: Economy) => { c.dog.levels[0].materials.lac = 0.5; },
    (c: Economy) => { c.dog.levels[0].hp = 0; },
  ]) assert.throws(() => create(patch), /config:dog/);
  // Shape validation deliberately refuses invented ingredients in a pinned snapshot.
  const raw = structuredClone(config.raw); Object.assign(raw.dog.levels[0].materials, { nem: 1 });
  assert.throws(() => loadConfig(raw), /config:dog.*keys/);
});

test('an actual pre-dog save retains its recorded commands and events and starts without a dog', () => {
  const saved = readFileSync(new URL('./fixtures/legacy-rush-v4.json', import.meta.url), 'utf8');
  const g = decodeSave(saved); assert.equal(g.world.dogLevel, 0); assert.deepEqual(g.world.events, JSON.parse(saved).events);
  send(g, { type: 'activity', active: true }); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});
