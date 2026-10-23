import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, decodeSave, loadConfig, isSeatModel, type ServeRecord } from '../src';
import { beerOut, firstGoal, pickSpotlight, queuePatience, servedOrders } from '../../../apps/web/src/spotlight';
import { featureReveal, idleToGuideMs, revealed } from '../../../apps/web/src/reveal';
import { capacityConfig } from './fixtures/capacity-model';

const free = { sheet: null, dialogOpen: false };
const at = Date.parse('2026-09-16T03:00:00Z');
const open = (g = new Game(undefined, 42, at)) => {
  assert.ok(g.command({ at: g.world.now, idempotencyKey: 'open', command: { type: 'startShift' } }).ok);
  return g;
};
/** Real engine time until the first order of shift 1 is ready (seed 42: seated 7.2 s, ordered 8 s, poured 10 s). */
const untilReady = (g = open()) => { for (let i = 0; i < 200 && !g.world.tables.some(t => t.order?.items.every(x => x.state === 'ready')); i++) g.advance(g.world.now + 100); return g; };
const serve = (orderId: string): ServeRecord => ({ t: 0, customerId: 'c', customerType: 'thuong', orderId, dishes: ['bia'], payment: 50, tip: 0, credited: 50, hadMoi: false, stale: false, patienceRatio: 1 });

test('first play walks the pointer guest -> check -> wallet and then goes quiet', () => {
  const g = open(), w = g.world;
  assert.deepEqual(pickSpotlight(w, g.config, free), { target: null, arrow: false });
  for (let i = 0; i < 100 && !w.tables.some(t => t.group); i++) g.advance(w.now + 100);
  const seated = w.tables.find(t => t.group)!;
  assert.deepEqual(pickSpotlight(w, g.config, free), { target: { kind: 'seated', tableId: seated.id }, arrow: true });
  untilReady(g);
  assert.deepEqual(pickSpotlight(w, g.config, free), { target: { kind: 'ready', tableId: seated.id }, arrow: true });
  w.serves.push(serve(seated.order!.id)); w.lastServedAt = w.now;
  seated.order!.state = 'served';
  assert.deepEqual(pickSpotlight(w, g.config, free), { target: { kind: 'wallet' }, arrow: true });
  w.now += 2400;
  assert.deepEqual(pickSpotlight(w, g.config, free), { target: null, arrow: false });
});

test('a ready order still calls for a tap after first play, without the pointer, and the most urgent table wins', () => {
  const g = untilReady(), w = g.world;
  w.completedShifts = 1;
  // Seat model: a new game has one table, and urgency needs two; the second is bought like a player would (a purchase needs no empty table).
  w.coins = 10_000_000; assert.ok(g.command({ at: w.now, idempotencyKey: 'second-table', command: { type: 'buyTable' } }).ok);
  const first = w.tables.find(t => t.order)!, other = w.tables.find(t => t !== first)!;
  assert.deepEqual(pickSpotlight(w, g.config, free), { target: { kind: 'ready', tableId: first.id }, arrow: false });
  // A second ready order that expires sooner takes the single spotlight; the earlier one keeps its plain check.
  other.state = 'waiting'; other.group = structuredClone(first.group);
  other.order = structuredClone(first.order!); other.order.id = 'order-urgent'; other.order.placedAt = first.order!.placedAt - 5000;
  assert.deepEqual(pickSpotlight(w, g.config, free).target, { kind: 'ready', tableId: other.id });
});

test('only a restock calls for a tap once the keg, the raw stock and any batch are all empty and it is affordable', () => {
  const g = open(), w = g.world; w.completedShifts = 1;
  assert.equal(beerOut(w, g.config), false);
  w.inventory.bia = 0; w.beer = { ready: 0, batch: null };
  assert.equal(beerOut(w, g.config), true);
  assert.deepEqual(pickSpotlight(w, g.config, free).target, { kind: 'restock' });
  w.beer = { ready: 0, batch: { quantity: 2, startedAt: w.now, readyAt: w.now + 5000 } };
  assert.equal(pickSpotlight(w, g.config, free).target, null, 'a running batch is already on its way');
  w.beer = { ready: 0, batch: null }; w.coins = 0;
  assert.equal(pickSpotlight(w, g.config, free).target, null, 'an unaffordable button must not blink');
  w.coins = 10_000; w.phase = 'resting';
  assert.equal(pickSpotlight(w, g.config, free).target?.kind === 'restock', false, 'nothing to restock for between shifts');
});

test('between shifts the first goal is spotlighted on the nav, then on its own buy button, and only until the full list opens (capacity snapshot)', () => {
  const g = open(new Game(capacityConfig, 42, at)), w = g.world; w.phase = 'resting'; w.shift = null; w.completedShifts = 1; w.coins = 10_000;
  w.tables.forEach(t => { t.state = 'empty'; t.group = null; t.order = null; });
  const goal = firstGoal(w, g.config)!; assert.equal(goal.kind, 'table'); if (goal.kind !== 'table') return;
  assert.equal(goal.table.id, w.tables[0].id); assert.equal(goal.next.priceBase, g.config.values.upgrades.table.levels[1].priceBase);
  w.tables[0].state = 'cleaning';
  const moved = firstGoal(w, g.config)!; assert.equal(moved.kind, 'table');
  assert.equal(moved.kind === 'table' && moved.table.id, w.tables[1].id, 'a table mid-clean never becomes the one locked card');
  w.tables[0].state = 'empty';
  assert.deepEqual(pickSpotlight(w, g.config, free).target, { kind: 'upgradesNav' });
  assert.deepEqual(pickSpotlight(w, g.config, { sheet: 'upgrades', dialogOpen: true }).target, { kind: 'goal' });
  assert.equal(pickSpotlight(w, g.config, { sheet: 'stock', dialogOpen: true }).target, null, 'other sheets stay quiet');
  w.coins = goal.next.priceBase - 1;
  assert.equal(pickSpotlight(w, g.config, free).target, null, 'not affordable yet');
  w.coins = 10_000; w.tables[0].level = 2;
  assert.equal(pickSpotlight(w, g.config, free).target, null, 'bought: the nudge is spent');
  w.tables[0].level = 1; w.completedShifts = 2;
  assert.equal(pickSpotlight(w, g.config, free).target, null, 'the next-goal chip takes over once the list is open');
});

test('between shifts the first goal is table 2, spotlighted on the nav, then on its own buy button, and only until the full list opens (seat model)', () => {
  const g = open(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v));
  w.phase = 'resting'; w.shift = null; w.completedShifts = 1; w.coins = 10_000;
  const goal = firstGoal(w, g.config)!;
  assert.equal(goal.kind, 'buyTable'); assert.equal(goal.affordable, true); assert.equal(goal.bought, false);
  w.tables[0].state = 'cleaning';
  assert.equal(firstGoal(w, g.config)!.affordable, true, 'a purchase needs no empty table, so a table mid-clean changes nothing');
  w.tables[0].state = 'empty';
  assert.deepEqual(pickSpotlight(w, g.config, free).target, { kind: 'upgradesNav' });
  assert.deepEqual(pickSpotlight(w, g.config, { sheet: 'upgrades', dialogOpen: true }).target, { kind: 'goal' });
  assert.equal(pickSpotlight(w, g.config, { sheet: 'stock', dialogOpen: true }).target, null, 'other sheets stay quiet');
  w.coins = v.upgrades.table.tablePriceBase[0] - 1;
  assert.equal(firstGoal(w, g.config)!.affordable, false); assert.equal(pickSpotlight(w, g.config, free).target, null, 'not affordable yet');
  w.coins = 10_000; assert.ok(g.command({ at: w.now, idempotencyKey: 'table-2', command: { type: 'buyTable' } }).ok);
  assert.equal(firstGoal(w, g.config)!.bought, true); assert.equal(pickSpotlight(w, g.config, free).target, null, 'bought: the nudge is spent');
  const again = open(), x = again.world; x.phase = 'resting'; x.shift = null; x.completedShifts = 2; x.coins = 10_000;
  assert.equal(pickSpotlight(x, again.config, free).target, null, 'the next-goal chip takes over once the list is open');
});

test('feature reveal follows completed shifts, onboarding off shows everything and old pins fall back to the seed', () => {
  const g = new Game(), none = revealed({ completedShifts: 0 }, g.config);
  // JSON 2.1.2 (founder, 2026-10-22): the HUD and the Upgrades button exist from shift 1; the full list, the journey, the quests and the league keep 2 / 2 / 2 / 3.
  // JSON 2.1.3 (founder, 2026-10-22): "Mời về" (`kick`) waits for one completed shift.
  assert.deepEqual(none, { hud: true, kick: false, upgrades: true, upgradeList: false, journey: false, quests: false, league: false });
  assert.deepEqual(revealed({ completedShifts: 1 }, g.config), { hud: true, kick: true, upgrades: true, upgradeList: false, journey: false, quests: false, league: false });
  assert.deepEqual(revealed({ completedShifts: 2 }, g.config), { hud: true, kick: true, upgrades: true, upgradeList: true, journey: true, quests: true, league: false });
  assert.equal(revealed({ completedShifts: 3 }, g.config).league, true);
  const off = structuredClone(config.raw); off.onboarding.enabled = false;
  assert.ok(Object.values(revealed({ completedShifts: 0 }, loadConfig(off))).every(Boolean));
  const legacy = decodeSave(readFileSync('packages/engine/test/fixtures/legacy-save-v1.json', 'utf8'));
  assert.ok(Object.values(revealed({ completedShifts: 0 }, legacy.config)).every(Boolean), '1.x pins predate progressive disclosure');
  const old = structuredClone(config.raw); old._meta.version = '2.0.4-pin';
  for (const key of ['hudAfterShifts', 'upgradeAllAfterShifts', 'journeyAfterShifts']) delete (old.onboarding.featureReveal as Record<string, number>)[key];
  delete (old.onboarding as Record<string, unknown>).idleToGuideMs;
  const pinned = loadConfig(old);
  assert.equal(JSON.stringify(pinned.raw), JSON.stringify(old), 'raw bytes preserved');
  assert.deepEqual(featureReveal(pinned), featureReveal(config)); assert.equal(idleToGuideMs(pinned), idleToGuideMs(config));
  assert.deepEqual(revealed({ completedShifts: 1 }, pinned), revealed({ completedShifts: 1 }, config));
});

// Returning players (2.1.2): the content of 2.1.1 is the bundle with the two thresholds at 1. A save pinned to it keeps them (hidden at 0 completed shifts) until its
// next opening takes the bundle, as `dispatch` hands it to `startShift` (apps/web/src/local.ts `openingConfig`: the numerically newer label wins); one completed shift
// already showed the HUD and the button, so nothing moves for a player past shift 1. The 2.1.0 save is the recorded, older pin of the same family.
// 2.1.3 (founder 2026-10-22): the 2.1.1 content also lacks `kickAfterShifts` (and `excludedCustomerTypes`); "Mời về" stays out of shift 1 before and after the adoption.
// 2.1.4 (founder 2026-10-22, early pacing): it lacks the three pacing keys too, so it is the 2.1.1 content as it shipped.
test('a save pinned to 2.1.1 keeps its HUD thresholds until its next opening adopts the bundled 2.1.4, and shows no Mời về in shift 1 either way', () => {
  const was = structuredClone(config.raw); was._meta.version = '2.1.1'; Object.assign(was.onboarding.featureReveal, { hudAfterShifts: 1, upgradeAfterShifts: 1 });
  delete (was.onboarding.featureReveal as Record<string, number>).kickAfterShifts; delete (was.onboarding.firstShift as Record<string, unknown>).excludedCustomerTypes;
  delete (was.spawn as Record<string, unknown>).singlesFirstShifts; delete (was.rush.schedule as Record<string, unknown>).replanPendingArrival; delete (was.onboarding.firstShift as Record<string, unknown>).staleDisabled;
  was._meta.governance.tiers.A.sections = was._meta.governance.tiers.A.sections.filter(name => name !== 'spawn.singlesFirstShifts');
  const g = new Game(loadConfig(was), 42, at), w = g.world;
  assert.equal(g.config.version, '2.1.1'); assert.equal(config.version, '2.1.4');
  assert.deepEqual(revealed(w, g.config), { hud: false, kick: false, upgrades: false, upgradeList: false, journey: false, quests: false, league: false }, 'its own thresholds, before any shift');
  assert.deepEqual(revealed({ completedShifts: 1 }, g.config), revealed({ completedShifts: 1 }, config), 'one finished shift: the same screen on the pin and on the bundle');
  assert.ok(g.command({ at: w.now, idempotencyKey: 'open', command: { type: 'startShift' } }, config).ok, 'the opening takes the newer bundle');
  assert.equal(g.config.version, '2.1.4');
  assert.deepEqual(revealed(g.world, g.config), { hud: true, kick: false, upgrades: true, upgradeList: false, journey: false, quests: false, league: false });
  const recorded = decodeSave(JSON.parse(readFileSync('packages/engine/test/fixtures/seat-2.1.0-v28.json', 'utf8')).save).config;
  const own = recorded.values.onboarding.featureReveal as Record<string, number>; // older snapshots may lack the key, so the loaded type is a union
  assert.deepEqual([recorded.version, own.hudAfterShifts, own.upgradeAfterShifts], ['2.1.0', 1, 1], 'a recorded 2.1.0 pin');
  assert.equal(revealed({ completedShifts: 0 }, recorded).hud, false); assert.equal(revealed({ completedShifts: 0 }, config).hud, true);
});

// Founder 2026-10-22 (JSON 2.1.3, A1): "Mời về" leaves shift 1. It has its own threshold `featureReveal.kickAfterShifts` (1), AND-ed with the HUD; a pin without the key
// (2.1.2, 2.1.1 and every older content) reads the bundled seed's, like the other reveal keys, so on a 2.1.2 pin (HUD from shift 1) the button leaves shift 1 at once.
test('Mời về has its own reveal threshold, after one completed shift and never without the HUD; a pin without the key reads the seed', () => {
  assert.equal(config.raw.onboarding.featureReveal.kickAfterShifts, 1);
  assert.deepEqual([0, 1, 2].map(n => revealed({ completedShifts: n }, config).kick), [false, true, true]);
  const pin = (version: string, hud: number) => {
    const raw = structuredClone(config.raw); raw._meta.version = version; Object.assign(raw.onboarding.featureReveal, { hudAfterShifts: hud, upgradeAfterShifts: hud });
    delete (raw.onboarding.featureReveal as Record<string, number>).kickAfterShifts; delete (raw.onboarding.firstShift as Record<string, unknown>).excludedCustomerTypes;
    return loadConfig(raw);
  };
  const shown = (c: ReturnType<typeof pin>) => [0, 1].map(n => { const r = revealed({ completedShifts: n }, c); return [r.hud, r.kick]; });
  assert.equal(featureReveal(pin('2.1.2', 0)).kickAfterShifts, 1, 'the absent key falls back to the bundled seed');
  assert.deepEqual(shown(pin('2.1.2', 0)), [[true, false], [true, true]], '2.1.2: the HUD in shift 1, Mời về from shift 2');
  assert.deepEqual(shown(pin('2.1.1', 1)), [[false, false], [true, true]], '2.1.1 (v-fb2): neither in shift 1, both from shift 2, as before');
  const early = structuredClone(config.raw); Object.assign(early.onboarding.featureReveal, { kickAfterShifts: 0, hudAfterShifts: 1 });
  assert.equal(revealed({ completedShifts: 0 }, loadConfig(early)).kick, false, 'a threshold of 0 still waits for the HUD');
  early.onboarding.featureReveal.hudAfterShifts = 0; assert.equal(revealed({ completedShifts: 0 }, loadConfig(early)).kick, true, 'and comes with it');
  const off = structuredClone(config.raw); off.onboarding.enabled = false; assert.equal(revealed({ completedShifts: 0 }, loadConfig(off)).kick, true, 'onboarding off shows everything');
});

test('served orders are counted once per order, not per guest', () => {
  assert.equal(servedOrders({ serves: [serve('a'), serve('a'), serve('b')] }), 2);
});

test('the door ring drains with the least patient guest and keeps a sliver while a rules-v1 group is still held for graceMs', () => {
  const door = (rules?: number) => {
    const g = open(); if (rules) (g as unknown as { rulesVersion: number }).rulesVersion = rules; // the client cannot see this
    const w = g.world, arrivedAt = w.now, group = { id: 'door-1', rounds: 1, arrivedAt, customers: [{ id: 'c1', type: 'thuong' as const, patienceMs: 3000, enjoyMs: 1000 }, { id: 'c2', type: 'thuong' as const, patienceMs: 9000, enjoyMs: 1000 }] };
    w.tables.forEach(t => { t.state = 'occupied'; t.until = null; }); // every seat taken: the group has to wait at the door
    w.queue.push(group); g.advance(arrivedAt + 3100);
    return { group, kept: w.queue.length === 1, ring: queuePatience(group, w.now), graceMs: g.config.values.patience.graceMs };
  };
  const group = { id: 'g', arrivedAt: 1000, customers: [{ patienceMs: 8000 }, { patienceMs: 4000 }] } as never;
  assert.equal(queuePatience(group, 1000), 1); assert.equal(queuePatience(group, 3000), 0.5);
  const current = door(), v1 = door(1);
  assert.equal(current.kept, false, 'current rules drop the group at its least patient guest');
  assert.equal(v1.kept, true, 'rules v1 hold it graceMs longer'); assert.ok(v1.graceMs > 100);
  assert.ok(v1.ring > 0, 'so the ring never reads empty while the group is still there');
});
