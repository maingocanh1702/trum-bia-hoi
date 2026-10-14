import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, decodeSave, loadConfig, type ServeRecord } from '../src';
import { beerOut, firstGoal, pickSpotlight, servedOrders } from '../../../apps/web/src/spotlight';
import { featureReveal, idleToGuideMs, revealed } from '../../../apps/web/src/reveal';

const free = { sheet: null, dialogOpen: false };
const open = (g = new Game(undefined, 42, Date.parse('2026-09-16T03:00:00Z'))) => {
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

test('between shifts the first goal is spotlighted on the nav, then on its own buy button, and only until the full list opens', () => {
  const g = open(), w = g.world; w.phase = 'resting'; w.shift = null; w.completedShifts = 1; w.coins = 10_000;
  w.tables.forEach(t => { t.state = 'empty'; t.group = null; t.order = null; });
  const goal = firstGoal(w, g.config)!;
  assert.equal(goal.table.id, w.tables[0].id); assert.equal(goal.next.priceBase, config.values.upgrades.table.levels[1].priceBase);
  w.tables[0].state = 'cleaning';
  assert.equal(firstGoal(w, g.config)!.table.id, w.tables[1].id, 'a table mid-clean never becomes the one locked card');
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

test('feature reveal follows completed shifts, onboarding off shows everything and old pins fall back to the seed', () => {
  const g = new Game(), none = revealed({ completedShifts: 0 }, g.config);
  assert.deepEqual(none, { hud: false, upgrades: false, upgradeList: false, journey: false, quests: false, league: false });
  assert.deepEqual(revealed({ completedShifts: 1 }, g.config), { hud: true, upgrades: true, upgradeList: false, journey: false, quests: false, league: false });
  assert.deepEqual(revealed({ completedShifts: 2 }, g.config), { hud: true, upgrades: true, upgradeList: true, journey: true, quests: true, league: false });
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

test('served orders are counted once per order, not per guest', () => {
  assert.equal(servedOrders({ serves: [serve('a'), serve('a'), serve('b')] }), 2);
});
