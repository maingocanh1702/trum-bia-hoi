import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import { CURRENT_RULES, Game, config, loadConfig, decodeSave, encodeSave, buyTableQuote, buyChairQuote, requirementStatus, restockQuote, isSeatModel, DISHES, WEATHER, type Command, type DomainEvent, type LoggedCommand } from '../src';
import { serveNext } from '../sim/policy';

// Plan "Vui 3 ca" S1 / FEEDBACK II.2 v3.3: rules 28 seat model. Every state change below is a real command or clock advance.
type Seed = typeof seed;
const T0 = Date.parse('2026-10-19T10:00:00+07:00');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `seat-${g.log.length}` });
function seatGame(patch?: (raw: Seed) => void, rngSeed = 42) {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = 1000000; // a wallet for real purchases; every price still comes from the config
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0;
  patch?.(raw);
  return new Game(loadConfig(raw), rngSeed, T0);
}
function onlyType(raw: Seed, type: 'thuong' | 'chipheo') {
  for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = key === type ? 1 : 0;
}
/** Serve complete trays and keep shelves stocked until the predicate holds. */
function play(g: Game, until: () => boolean, limitMs = 720000) {
  const end = g.world.now + limitMs;
  while (!until() && g.world.now < end) {
    for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(g, command); });
    g.advance(g.world.now + 100);
  }
  assert.ok(until(), 'expected game state before the fixture deadline');
}
/** Dishes each guest ordered, keyed by order and customer, with the chairs of the table at order time. */
function trays(events: readonly DomainEvent[], seats: (tableId: string) => number) {
  const rows = new Map<string, { seats: number; dishes: string[] }>();
  for (const e of events) if (e.type === 'dish_ordered') {
    const key = `${e.data.orderId}:${e.data.customerId}`;
    const row = rows.get(key) ?? { seats: seats(String(e.data.tableId)), dishes: [] };
    row.dishes.push(String(e.data.dish)); rows.set(key, row);
  }
  return [...rows.values()];
}

test('a new game opens one table with one chair; the home alley caps tables at its tableSlots with no life-path gate', () => {
  const g = seatGame(), w = g.world, c = g.config.values; assert.ok(isSeatModel(c));
  assert.equal(c.upgrades.table.startingTables, 1);
  assert.deepEqual(w.tables.map(t => [t.capacity, t.level]), [[1, c.runtime.initialTableLevel]]);
  const slots = c.locations.list.find(row => row.id === w.location)!.tableSlots;
  assert.equal(slots, 4);
  const paid: number[] = [];
  while (w.tables.length < slots) {
    const q = buyTableQuote(w, g.config); assert.ok(q.ok, q.reason ?? '');
    assert.equal(q.cost, c.upgrades.table.tablePriceBase[w.tables.length - 1]);
    assert.deepEqual(send(g, { type: 'buyTable' }), { ok: true, amount: q.cost }); paid.push(q.cost!);
  }
  assert.equal(w.lifePath, 0, 'tables 2-4 are never gated by Duong Len Trum');
  assert.deepEqual(paid, seed.upgrades.table.tablePriceBase.slice(0, 3).map(n => Math.round(n * seed.k.value)));
  assert.deepEqual(w.tables.map(t => t.capacity), [1, 1, 1, 1], 'every bought table comes with exactly one chair');
  assert.deepEqual(buyTableQuote(w, g.config).reason, 'maxTables');
  assert.deepEqual(send(g, { type: 'buyTable' }), { ok: false, reason: 'maxTables' });
  const bought = w.events.filter(e => e.type === 'table_bought');
  assert.deepEqual(bought.map(e => e.data.tableId), w.tables.slice(1).map(t => t.id));
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a second chair opens only after chairsAfterTables tables, a table never holds a third, and price indexes chairs across the shop', () => {
  const g = seatGame(), w = g.world, c = g.config.values; assert.ok(isSeatModel(c));
  assert.equal(c.upgrades.table.chairsAfterTables, 4);
  while (w.tables.length < c.upgrades.table.chairsAfterTables - 1) assert.ok(send(g, { type: 'buyTable' }).ok);
  const [first, second] = w.tables;
  assert.equal(buyChairQuote(w, g.config, first).reason, 'chairsLocked');
  assert.deepEqual(send(g, { type: 'buyChair', tableId: first.id }), { ok: false, reason: 'chairsLocked' });
  assert.equal(first.capacity, 1);
  assert.ok(send(g, { type: 'buyTable' }).ok);
  const prices = c.upgrades.table.chairPriceBase;
  assert.deepEqual(send(g, { type: 'buyChair', tableId: first.id }), { ok: true, amount: prices[0] });
  assert.equal(first.capacity, 2);
  assert.deepEqual(send(g, { type: 'buyChair', tableId: first.id }), { ok: false, reason: 'maxChairs' });
  assert.deepEqual(send(g, { type: 'buyChair', tableId: second.id }), { ok: true, amount: prices[1] });
  assert.deepEqual(send(g, { type: 'buyChair', tableId: 'table-404' }), { ok: false, reason: 'tableGone' });
  const coins = w.coins;
  assert.deepEqual(w.events.filter(e => e.type === 'chair_bought').map(e => e.data), [
    { tableId: first.id, seats: 2, cost: prices[0] }, { tableId: second.id, seats: 2, cost: prices[1] }]);
  // Table levels belong to two-chair tables (D18); the level still lives on the table.
  const single = w.tables[2];
  assert.deepEqual(send(g, { type: 'upgradeTable', tableId: single.id }), { ok: false, reason: 'tableNeedsChairs' });
  assert.equal(w.coins, coins);
  const level = first.level, upgraded = send(g, { type: 'upgradeTable', tableId: first.id });
  assert.ok(upgraded.ok); assert.equal(first.level, level + 1); assert.equal(first.capacity, 2, 'a level never adds chairs');
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('a one-chair table never gives one guest beer and a dish together; a two-chair table does (seed 42)', () => {
  const g = seatGame(raw => { raw.onboarding.enabled = false; raw.patience.thuongMs = 120000; }), w = g.world;
  while (w.tables.length < 4) assert.ok(send(g, { type: 'buyTable' }).ok);
  const pairTable = w.tables[3];
  assert.ok(send(g, { type: 'buyChair', tableId: pairTable.id }).ok);
  assert.ok(send(g, { type: 'startShift' }).ok);
  play(g, () => w.phase === 'resting', 900000); // one whole shift
  const rows = trays(w.events, id => w.tables.find(t => t.id === id)!.capacity);
  const solo = rows.filter(r => r.seats === 1), pair = rows.filter(r => r.seats === 2);
  assert.ok(solo.length >= 15 && pair.length >= 30, `enough trays: ${solo.length} solo, ${pair.length} pair`);
  assert.ok(solo.every(r => r.dishes.length === 1), 'solo guests order exactly one item');
  assert.ok(solo.some(r => r.dishes[0] === 'bia') && solo.some(r => r.dishes[0] !== 'bia'), 'solo trays are beer OR one instant dish');
  assert.ok(solo.every(r => g.config.values.menu[r.dishes[0] as typeof DISHES[number]].station !== 'kitchen'), 'a solo dish is instant');
  assert.ok(pair.every(r => r.dishes[0] === 'bia' && r.dishes.length <= 2), 'pair-table guests always start with beer');
  assert.ok(pair.some(r => r.dishes.length === 2), 'a two-chair table serves beer and a dish to one guest');
});

test('a pair with no two-chair table leaves at the door: no penalty, no reputation change, never lost', () => {
  const g = seatGame(raw => { raw.spawn.pPair = 1; }), w = g.world;
  assert.ok(send(g, { type: 'startShift' }).ok);
  play(g, () => w.serves.length === 1); // onboarding's forced single still sits and pays
  const coins = w.coins, reputation = w.reputation, streak = w.lostStreak, from = w.events.length;
  assert.ok(reputation > 0, 'a reputation loss would be visible');
  play(g, () => w.events.slice(from).filter(e => e.type === 'queue_overflow').length >= 3);
  const doors = w.events.slice(from).filter(e => e.type === 'queue_overflow');
  assert.ok(doors.every(e => e.data.size === 2 && e.data.reason === 'noSeat'));
  assert.equal(w.events.slice(from).filter(e => e.type === 'customer_left' || e.type === 'order_expired').length, 0);
  const s = w.shift!.stats;
  assert.equal(s.lost, 0); assert.equal(s.penalty, 0); assert.equal(s.noSeat, 2 * doors.length); assert.equal(s.rejected, s.noSeat);
  assert.equal(w.coins, coins); assert.equal(w.reputation, reputation); assert.equal(w.lostStreak, streak);
  assert.equal(w.queue.length, 0, 'a pair never waits for a chair that does not exist');
});

test('buying tables and a chair while a table is occupied keeps the seated group', () => {
  const g = seatGame(raw => { raw.onboarding.enabled = false; raw.spawn.pPair = 0; onlyType(raw, 'chipheo'); raw.patience.thuongMs = 60000; }), w = g.world;
  assert.ok(send(g, { type: 'startShift' }).ok);
  const table = w.tables[0];
  play(g, () => table.state === 'occupied');
  const group = structuredClone(table.group), until = table.until;
  while (w.tables.length < 4) assert.ok(send(g, { type: 'buyTable' }).ok);
  assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok);
  assert.equal(table.state, 'occupied'); assert.equal(table.until, until); assert.equal(table.capacity, 2);
  assert.deepEqual(table.group, group, 'the seated group keeps its guests and its tray');
});

test('a chair bought mid-visit changes the tray only for the next group, never for the seated one', () => {
  const g = seatGame(raw => {
    raw.onboarding.enabled = false; raw.spawn.pPair = 0; onlyType(raw, 'thuong'); raw.patience.thuongMs = 120000;
    raw.rounds.thuong = [3, 3]; raw.upgrades.table.chairsAfterTables = 1;
    raw.upgrades.table.orderShape.solo.pBeer = 1; raw.upgrades.table.orderShape.pair.pMoi = 1;
  }), w = g.world, table = w.tables[0];
  assert.ok(send(g, { type: 'startShift' }).ok);
  play(g, () => table.roundsServed === 1);
  const seated = table.group!;
  assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok); assert.equal(table.capacity, 2);
  play(g, () => table.group !== null && table.group.id !== seated.id && table.order !== null);
  const ordered = (groupCustomers: string[]) => trays(w.events.filter(e => groupCustomers.includes(String(e.data.customerId))), () => 0).map(r => r.dishes);
  assert.deepEqual(ordered(seated.customers.map(c => c.id)), [['bia'], ['bia'], ['bia']], 'all three rounds keep the one-chair tray');
  assert.ok(ordered(table.group!.customers.map(c => c.id)).every(dishes => dishes.length === 2 && dishes[0] === 'bia'), 'the next group gets the two-chair tray');
});

test('life path 1 counts tables, not seats, so a two-chair table can never block the next table', () => {
  const g = seatGame(), w = g.world;
  assert.deepEqual(seed.lifePath[1].requires, ['4 tables']);
  assert.equal(requirementStatus(w, g.config, '4 tables').met, false);
  while (w.tables.length < 4) assert.ok(send(g, { type: 'buyTable' }).ok);
  assert.deepEqual(requirementStatus(w, g.config, '4 tables'), { kind: 'tables', have: 4, need: 4, met: true });
  assert.deepEqual(requirementStatus(w, g.config, '4 seats'), { kind: 'seats', have: 4, need: 4, met: true });
});

/** Genuine rules-27 histories on the frozen 2.0.4 capacity model, recorded by the pre-seat engine (fixtures/capacity-v27.ts). */
function capacitySave(tables: 3 | 6) {
  const fixture = JSON.parse(readFileSync(new URL(`./fixtures/capacity-lv3x${tables}-v27.json`, import.meta.url), 'utf8'));
  const g = decodeSave(fixture.save);
  assert.equal(createHash('sha256').update(JSON.stringify(g.world)).digest('hex'), fixture.worldSha256, 'rules-27 replay is byte-identical to the old engine');
  assert.ok(g.log.every(e => e.rulesVersion === 27)); assert.equal(g.world.phase, 'resting');
  return { g, save: fixture.save as string };
}
test('D2 migration: a 3-table x6-seat Lv3 save becomes 3 tables x2 chairs at level 3, once and replayably', () => {
  const { g, save } = capacitySave(3), w = g.world, oldLog = JSON.parse(save).log, oldEvents = JSON.parse(save).events;
  assert.deepEqual(w.tables.map(t => [t.capacity, t.level]), [[6, 3], [6, 3], [6, 3]]);
  const ids = w.tables.map(t => t.id), coins = w.coins;
  assert.ok(g.command({ command: { type: 'startShift' }, at: w.now, idempotencyKey: 'adopt-seats' }, config).ok);
  assert.equal(g.config.version, config.version); assert.equal(g.log.at(-1)!.rulesVersion, CURRENT_RULES);
  assert.deepEqual(w.tables.map(t => [t.id, t.capacity, t.level]), ids.map(id => [id, 2, 3]));
  assert.equal(w.coins, coins, 'no refund');
  const adopted = w.events.filter(e => e.type === 'seat_model_adopted');
  assert.deepEqual(adopted.map(e => e.data), [{ shiftId: w.shift!.id, tablesBefore: 3, tablesAfter: 3, seatsBefore: 18, seatsAfter: 6 }]);
  assert.ok(send(g, { type: 'endShift' }).ok); g.advance(w.now + 3600000);
  assert.ok(send(g, { type: 'startShift' }).ok);
  assert.equal(w.events.filter(e => e.type === 'seat_model_adopted').length, 1, 'the migration runs once');
  assert.deepEqual(w.tables.map(t => [t.capacity, t.level]), [[2, 3], [2, 3], [2, 3]]);
  const resaved = JSON.parse(encodeSave(g));
  assert.deepEqual(resaved.log.slice(0, oldLog.length), oldLog, 'adoption never rewrites the rules-27 history');
  assert.deepEqual(resaved.events.slice(0, oldEvents.length), oldEvents);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w, 'the adoption replays byte for byte');
});
test('D2 migration keeps only the first tableSlots tables of a larger shop', () => {
  const { g } = capacitySave(6), w = g.world, kept = w.tables.slice(0, 4).map(t => t.id);
  assert.ok(g.command({ command: { type: 'startShift' }, at: w.now, idempotencyKey: 'adopt-seats' }, config).ok);
  assert.deepEqual(w.tables.map(t => [t.id, t.capacity]), kept.map(id => [id, 2]));
  assert.deepEqual(w.events.find(e => e.type === 'seat_model_adopted')!.data, { shiftId: w.shift!.id, tablesBefore: 6, tablesAfter: 4, seatsBefore: 36, seatsAfter: 8 });
  assert.deepEqual(buyTableQuote(w, g.config).reason, 'maxTables');
});

test('seat-model commands and snapshots refuse pre-28 replay entries', () => {
  const g = seatGame();
  const entry = (command: Command, rulesVersion: number) => ({ at: 0, idempotencyKey: `r${rulesVersion}`, command, rulesVersion, configVersion: g.config.version, result: { ok: true } }) as LoggedCommand;
  assert.throws(() => g.replay(entry({ type: 'buyTable' }, 27)), /replay:rulesVersion/);
  const legacy = new Game(loadConfig(structuredClone(capacityModel)), 42, T0);
  assert.throws(() => legacy.replay({ ...entry({ type: 'buyChair', tableId: 'table-1' }, 27), configVersion: legacy.config.version }), /replay:rulesVersion/);
});

test('seat-model snapshots fail closed on unreachable chairs, short price ladders, unseatable onboarding or bad probabilities', () => {
  const cases: [string, (raw: Seed) => void][] = [
    ['no table slot for the starting table', raw => { raw.locations.list[0].tableSlots = 0; }],
    ['chairs after more tables than any alley holds', raw => { raw.upgrades.table.chairsAfterTables = 5; }],
    ['table ladder shorter than the slots', raw => { raw.upgrades.table.tablePriceBase = [600]; }],
    ['chair ladder shorter than the slots', raw => { raw.upgrades.table.chairPriceBase = [4000]; }],
    ['pair probability', raw => { raw.spawn.pPair = 1.5; }],
    ['solo beer probability', raw => { raw.upgrades.table.orderShape.solo.pBeer = 2; }],
    ['pair dish probability', raw => { raw.upgrades.table.orderShape.pair.pMoi = 1.1; }],
    ['first group larger than one chair', raw => { raw.onboarding.firstShift.firstGroupSize = 2; }],
    ['first guest ordering two items at one chair', raw => { raw.onboarding.firstShift.firstOrder = ['bia', 'lac']; }],
    ['fractional slot', raw => { raw.locations.list[1].tableSlots = 4.5; }],
  ];
  for (const [name, patch] of cases) { const raw = structuredClone(seed); patch(raw); assert.throws(() => loadConfig(raw), name); }
  const partial = structuredClone(seed) as Partial<Seed['upgrades']['table']> & Seed; delete (partial.upgrades.table as Partial<Seed['upgrades']['table']>).chairsAfterTables;
  assert.throws(() => loadConfig(partial), /config:/, 'a partial seat snapshot is not a capacity snapshot');
  assert.equal(loadConfig(structuredClone(capacityModel)).version, '2.0.4', 'the frozen capacity model still loads for old pins');
});

test('a pre-seat snapshot from Wave 1 (JSON 2.0.5/2.0.6: the capacity model plus presentation keys) still loads, bytes kept; a bad key or tier list still fails closed', () => {
  // Wave 1 shipped on the capacity model: its pins carry keys the frozen 2.0.4 file does not know. The seed is their template.
  const wave1 = () => {
    const raw = structuredClone(capacityModel) as any; raw._meta.version = '2.0.6';
    raw.onboarding.idleToGuideMs = seed.onboarding.idleToGuideMs;
    Object.assign(raw.onboarding.featureReveal, { hudAfterShifts: seed.onboarding.featureReveal.hudAfterShifts, upgradeAllAfterShifts: seed.onboarding.featureReveal.upgradeAllAfterShifts, journeyAfterShifts: seed.onboarding.featureReveal.journeyAfterShifts });
    raw.nextGoal = structuredClone(seed.nextGoal); raw._meta.governance.tiers.C.sections = [...seed._meta.governance.tiers.C.sections];
    return raw;
  };
  const pinned = loadConfig(wave1());
  assert.equal(JSON.stringify(pinned.raw), JSON.stringify(wave1()), 'raw bytes preserved');
  assert.equal(isSeatModel(pinned.values), false, 'still a capacity model: its next opening adopts the seat model');
  const g = new Game(pinned, 42, T0);
  assert.equal(decodeSave(encodeSave(g)).config.version, '2.0.6', 'a save pinned at that version decodes');
  const bad: [string, (raw: any) => void][] = [
    ['an unknown key inside nextGoal', raw => { raw.nextGoal.other = 1; }],
    ['a non-positive reach', raw => { raw.nextGoal.reachMult = 0; }],
    ['an unknown top-level key', raw => { raw.bogus = 1; }],
    ['a wrongly typed threshold', raw => { raw.onboarding.idleToGuideMs = 'soon'; }],
    ['an unknown reveal key', raw => { raw.onboarding.featureReveal.bogusAfterShifts = 1; }],
    ['an unknown tier C section', raw => { raw._meta.governance.tiers.C.sections.push('bogus'); }],
    ['a later section moved into another tier', raw => { raw._meta.governance.tiers.B.sections.push('nextGoal'); }],
  ];
  for (const [name, patch] of bad) { const raw = wave1(); patch(raw); assert.throws(() => loadConfig(raw), /config:/, name); }
});

test('a snapshot key named like an Object.prototype member is an unknown key at every object node, never a known one', () => {
  // JSON.parse (admin proposals, preview, uploaded archives) makes such a key an own property. `k in expected` found it on the prototype chain, so it was
  // neither refused nor shape-checked and a partial or malformed config could go live (same on main).
  const cases: [string[], string, unknown][] = [
    [['onboarding', 'featureReveal'], 'constructor', { price: 1 }], [['nextGoal'], 'toString', 1], [[], 'valueOf', 1],
    [['menu', 'bia'], 'hasOwnProperty', 1], [['lifePath', '0'], 'isPrototypeOf', 1], [['_meta'], 'propertyIsEnumerable', 1],
  ];
  const put = (raw: any, path: string[], name: string, value: unknown) => { path.reduce((node: any, key) => node[key], raw)[name] = value; return raw; };
  for (const [path, name, value] of cases) {
    assert.throws(() => loadConfig(put(structuredClone(seed), path, name, value)), new RegExp(`config:${path.join('\\.')}:keys`), `seat model: ${[...path, name].join('.')}`);
    if (path[0] !== 'nextGoal') assert.throws(() => loadConfig(put(structuredClone(capacityModel), path, name, value)), new RegExp(`config:${path.join('\\.')}:keys`), `capacity model: ${[...path, name].join('.')}`);
  }
  const proto = structuredClone(seed) as any; Object.defineProperty(proto, '__proto__', { value: { x: 1 }, enumerable: true, configurable: true, writable: true });
  assert.throws(() => loadConfig(proto), /config::keys/, 'an own __proto__ key');
  assert.equal(loadConfig(structuredClone(seed)).version, seed._meta.version, 'the bundled seed itself still loads');
});

test('a Wave 1 save (rules 27, pinned the way the Wave 1 build wrote it) replays byte for byte and adopts the seat model once at its next opening', () => {
  // The genuine rules-27 history of the 3-table x6-seat save, with its pinned config rewritten like a v-fb1 pin: the capacity model plus the Tier C
  // presentation keys JSON 2.0.6 added and nothing else (the version label stays: every logged command names the pin it ran under). This is the
  // shape of the save the browser holds when the merged build ships.
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/capacity-lv3x3-v27.json', import.meta.url), 'utf8')), saved = JSON.parse(fixture.save), raw = saved.config;
  raw.onboarding.idleToGuideMs = seed.onboarding.idleToGuideMs;
  Object.assign(raw.onboarding.featureReveal, { hudAfterShifts: seed.onboarding.featureReveal.hudAfterShifts, upgradeAllAfterShifts: seed.onboarding.featureReveal.upgradeAllAfterShifts, journeyAfterShifts: seed.onboarding.featureReveal.journeyAfterShifts });
  raw.nextGoal = structuredClone(seed.nextGoal); raw._meta.governance.tiers.C.sections = [...seed._meta.governance.tiers.C.sections];
  const g = decodeSave(JSON.stringify(saved)), w = g.world;
  assert.ok('nextGoal' in g.config.values && 'idleToGuideMs' in g.config.values.onboarding, 'the pin carries the Wave 1 keys'); assert.equal(isSeatModel(g.config.values), false);
  assert.equal(createHash('sha256').update(JSON.stringify(w)).digest('hex'), fixture.worldSha256, 'the rules-27 history replays byte for byte under the Wave 1 pin');
  assert.ok(g.log.every(e => e.rulesVersion === 27));
  const ids = w.tables.map(t => t.id), coins = w.coins;
  assert.deepEqual(w.tables.map(t => [t.capacity, t.level]), [[6, 3], [6, 3], [6, 3]]);
  assert.ok(g.command({ command: { type: 'startShift' }, at: w.now, idempotencyKey: 'adopt-seats' }, config).ok);
  assert.equal(g.config.version, config.version); assert.equal(isSeatModel(g.config.values), true); assert.equal(g.log.at(-1)!.rulesVersion, CURRENT_RULES);
  assert.deepEqual(w.tables.map(t => [t.id, t.capacity, t.level]), ids.map(id => [id, 2, 3]));
  assert.equal(w.coins, coins, 'no refund');
  assert.deepEqual(w.events.filter(e => e.type === 'seat_model_adopted').map(e => e.data), [{ shiftId: w.shift!.id, tablesBefore: 3, tablesAfter: 3, seatsBefore: 18, seatsAfter: 6 }]);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w, 'the adoption replays byte for byte');
  assert.equal(JSON.stringify((g.config.raw as typeof seed).nextGoal), JSON.stringify(seed.nextGoal), 'Wave 1 presentation keys come with the bundle');
});
test('every committed replay fixture still decodes to its recorded log', () => {
  const dirs = [new URL('./fixtures/', import.meta.url), new URL('../../../apps/web/test/fixtures/', import.meta.url)];
  let checked = 0;
  for (const dir of dirs) for (const name of readdirSync(dir).filter(file => file.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
    for (const text of [data, data?.save].filter(x => x && (typeof x === 'string' || Array.isArray(x.log))).map(x => typeof x === 'string' ? x : JSON.stringify(x))) {
      const recorded = JSON.parse(text);
      if (!Array.isArray(recorded.log)) continue;
      assert.deepEqual(decodeSave(text).log, recorded.version === 1 ? decodeSave(text).log : recorded.log, name); checked++;
    }
  }
  assert.ok(checked >= 30, `fixtures checked: ${checked}`);
});
