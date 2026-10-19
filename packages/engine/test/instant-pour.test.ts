import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import { CURRENT_RULES, Game, config, loadConfig, decodeSave, encodeSave, beerStatus, orderPreparation, buyGlassQuote, restockQuote, isSeatModel, DISHES, WEATHER, type Command, type PreparationCause } from '../src';
import { capacityRaw } from './fixtures/capacity-model';
import { furnish } from './fixtures/seat-shop';
import { serveNext } from '../sim/policy';

// Plan "Vui 3 ca" S2 / FEEDBACK II.1: rules 28, beer.ready + a clean glass = a ready beer in the same tick. Every state change below is a real
// command or clock advance; the rules <= 27 proof replays genuine histories recorded by the pre-S2 engine (fixtures/capacity-v27.ts).
type Seed = typeof seed;
type Capacity = ReturnType<typeof capacityRaw>;
const T0 = Date.parse('2026-10-19T10:00:00+07:00');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `pour-${g.log.length}` });
const roundTrip = (g: Game) => assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
const sunny = (raw: Seed | Capacity) => { for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0; };

/** A furnished shop (4 tables x 2 chairs, a wallet for the real purchases) whose guests are all pairs ordering beer only: every order is two beers. */
function pairShop(patch?: (raw: Seed) => void, rngSeed = 42) {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = 1000000; sunny(raw);
  raw.rush.schedule.perShift = 0; raw.onboarding.enabled = false;
  raw.spawn.pPair = 1; raw.upgrades.table.orderShape.pair.pMoi = 0;
  raw.patience.thuongMs = 120000; // nobody leaves while a test inspects a waiting order
  patch?.(raw);
  const g = new Game(loadConfig(raw), rngSeed, T0);
  furnish(g, command => send(g, command));
  assert.ok(send(g, { type: 'startShift' }).ok);
  return g;
}
/** Step the clock until `n` orders exist; the newest one and the event that placed it (the step may overshoot the event by < 100 ms). */
function untilOrder(g: Game, n: number) {
  const w = g.world, placed = () => w.events.filter(e => e.type === 'order_placed');
  while (placed().length < n) { assert.ok(w.now < T0 + 600000, 'an order should have been placed by now'); g.advance(w.now + 100); }
  const event = placed()[n - 1], table = w.tables.find(t => t.id === event.data.tableId)!;
  return { table, order: table.order!, event };
}
const eventsOf = (g: Game, type: string, key: string, value: unknown) => g.world.events.filter(e => e.type === type && e.data[key] === value);

test('one tap, one pair: both beers are ready the tick the order is placed (beer.ready >= n and clean glasses >= n)', () => {
  const g = pairShop(), w = g.world, keg = g.config.values.upgrades.keg, glasses = g.config.values.glasses.start;
  assert.ok(isSeatModel(g.config.values)); assert.equal(g.log.at(-1)!.rulesVersion, CURRENT_RULES);
  assert.equal(keg.pourSlots[0], 1); assert.equal(keg.pourMs[0], 2000); // the keys stay in the config: before rules 28 the second beer waited 2 s behind the first
  assert.equal(w.beer!.ready, keg.kegStorage[0]); assert.equal(w.glasses.filter(x => x.state === 'clean').length, glasses);
  const { table, order, event } = untilOrder(g, 1);
  assert.equal(order.items.length, 2); assert.deepEqual(order.items.map(i => [i.dish, i.state, i.readyAt]), [['bia', 'ready', event.at], ['bia', 'ready', event.at]]);
  const ready = eventsOf(g, 'order_ready', 'orderId', order.id);
  assert.equal(ready.length, 1); assert.equal(ready[0].at, event.at, 'order_ready in the same tick as order_placed');
  for (const item of order.items) {
    const pouring = eventsOf(g, 'beer_pouring', 'itemId', item.id), poured = eventsOf(g, 'beer_poured', 'itemId', item.id);
    assert.deepEqual([pouring.length, poured.length], [1, 1]); assert.equal(pouring[0].at, event.at); assert.equal(poured[0].at, event.at);
    assert.equal(poured[0].data.fromReserve, true, 'a pour that never queued says so');
    const glass = w.glasses.find(x => x.id === item.glassId)!;
    assert.deepEqual([glass.state, glass.readyAt, glass.itemId], ['in_use', event.at, item.id], 'freshness starts on the tray, now');
  }
  assert.equal(w.beer!.ready, keg.kegStorage[0] - 2); assert.equal(w.glasses.filter(x => x.state === 'clean').length, glasses - 2);
  assert.deepEqual(w.beer!.batch, { quantity: Math.min(keg.kegBatch[0], 2), startedAt: event.at, readyAt: event.at + keg.refillMs[0] }, 'the two vacancies start refilling in the same tick');
  assert.equal(beerStatus(w, g.config).pouring, 0); assert.equal(orderPreparation(w, g.config, order), 'ready');
  // The serve is possible at once and pays a fresh, on-time order.
  assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: order.id }).ok);
  assert.equal(w.serves.length, 2); assert.ok(w.serves.every(s => !s.stale && s.dishes.length === 1 && s.dishes[0] === 'bia'));
  roundTrip(g);
});

test('a solo guest on the first order is served the tick the guest sits down (onboarding order, one chair)', () => {
  const raw = structuredClone(seed); sunny(raw);
  const g = new Game(loadConfig(raw), 42, T0), w = g.world; assert.ok(send(g, { type: 'startShift' }).ok);
  const { order, event } = untilOrder(g, 1);
  assert.deepEqual(order.items.map(i => [i.dish, i.state, i.readyAt]), [['bia', 'ready', event.at]]);
  assert.equal(eventsOf(g, 'order_ready', 'orderId', order.id)[0].at, event.at);
  assert.ok(event.at - T0 <= g.config.values.onboarding.firstShift.guaranteedFirstGroupWithinMs, 'the first guest is served within the promised window');
  assert.equal(w.beer!.ready, g.config.values.upgrades.keg.kegStorage[0] - 1); roundTrip(g);
});

test('beer.ready exhausted: the order waits, a restock starts the batch, and the beer is ready the tick the batch lands', () => {
  const g = pairShop(raw => { raw.inventory.startingStock.bia = [4, 15]; }), w = g.world, keg = g.config.values.upgrades.keg; // the opening keg fill empties the raw stock
  assert.equal(w.inventory.bia, 0); assert.equal(w.beer!.ready, 4);
  for (const n of [1, 2]) { const { order } = untilOrder(g, n); assert.ok(order.items.every(i => i.state === 'ready'), `order ${n} still finds beer`); }
  assert.equal(w.beer!.ready, 0);
  const { table, order, event } = untilOrder(g, 3);
  assert.deepEqual(order.items.map(i => i.state), ['pending', 'pending']); assert.equal(eventsOf(g, 'order_ready', 'orderId', order.id).length, 0);
  assert.equal(orderPreparation(w, g.config, order), 'beerStock'); assert.equal(w.beer!.batch, null);
  assert.ok(restockQuote(w, g.config, 'bia', 'bulk').ok); assert.ok(send(g, { type: 'restock', dish: 'bia', mode: 'bulk' }).ok);
  const batch = w.beer!.batch!; assert.ok(batch); assert.equal(batch.quantity, keg.kegBatch[0]); assert.equal(batch.readyAt, w.now + keg.refillMs[0]);
  assert.deepEqual(order.items.map(i => i.state), ['pending', 'pending']); assert.equal(orderPreparation(w, g.config, order), 'beerRefill');
  g.advance(batch.readyAt - 1); assert.deepEqual(order.items.map(i => i.state), ['pending', 'pending']);
  g.advance(batch.readyAt);
  assert.deepEqual(order.items.map(i => [i.state, i.readyAt]), [['ready', batch.readyAt], ['ready', batch.readyAt]]);
  const landed = w.events.find(e => e.type === 'beer_batch_ready' && e.at === batch.readyAt)!, ready = eventsOf(g, 'order_ready', 'orderId', order.id);
  assert.ok(landed); assert.equal(ready.length, 1); assert.equal(ready[0].at, landed.at, 'order_ready in the tick of beer_batch_ready');
  assert.ok(event.at < landed.at); assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: order.id }).ok); roundTrip(g);
});

test('beer in the keg but no clean glass: the second beer waits for a glass, and a bought glass pours it that very tick', () => {
  const g = pairShop(raw => { raw.glasses.start = 1; }), w = g.world;
  assert.equal(beerStatus(w, g.config).serveNow, 1, 'four beers in the keg but one clean glass: one beer a guest can get right now');
  const { order, event } = untilOrder(g, 1);
  assert.deepEqual(order.items.map(i => i.state), ['ready', 'pending']); assert.ok(w.beer!.ready > 0);
  assert.equal(orderPreparation(w, g.config, order), 'glasses'); assert.equal(eventsOf(g, 'order_ready', 'orderId', order.id).length, 0);
  assert.equal(beerStatus(w, g.config).serveNow, 0);
  assert.ok(buyGlassQuote(w, g.config, 1).ok); assert.ok(send(g, { type: 'buyGlass', count: 1 }).ok);
  assert.deepEqual(order.items.map(i => [i.state, i.readyAt]), [['ready', event.at], ['ready', w.now]], 'the bought glass is poured at the tick of the purchase');
  const ready = eventsOf(g, 'order_ready', 'orderId', order.id); assert.equal(ready.length, 1); assert.equal(ready[0].at, w.now); roundTrip(g);
});

test('beerStatus says how many beers a guest can get right now: the smaller of ready beer and clean glasses (seat model); capacity pins keep their reserve count', () => {
  const g = pairShop(raw => { raw.glasses.start = 3; }), w = g.world, status = () => beerStatus(w, g.config), clean = () => w.glasses.filter(x => x.state === 'clean').length;
  assert.equal(status().instant, true); assert.deepEqual([status().stored, clean(), status().serveNow], [4, 3, 3], 'ready 4, clean 3');
  untilOrder(g, 1); assert.deepEqual([status().stored, clean(), status().serveNow], [2, 1, 1], 'a pair took two beers and two glasses: ready 2, clean 1');
  const pin = new Game(loadConfig(capacityRaw()), 42, T0); assert.ok(send(pin, { type: 'startShift' }).ok);
  assert.equal(isSeatModel(pin.config.values), false); assert.equal(beerStatus(pin.world, pin.config).instant, false);
  assert.equal(beerStatus(pin.world, pin.config).serveNow, beerStatus(pin.world, pin.config).stored);
});

/** Bot-driven play of an open or closed shop: restock (from `restockFrom` ms on), serve the oldest ready tray, step the clock. */
function play(g: Game, ms: number, { restockFrom = 0, seen }: { restockFrom?: number; seen?: (g: Game) => void } = {}) {
  const w = g.world, start = w.now, end = start + ms;
  if (w.phase === 'resting') assert.ok(send(g, { type: 'startShift' }).ok);
  while (w.now < end) {
    if (w.now - start >= restockFrom) for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(g, command); });
    g.advance(w.now + 100); seen?.(g);
  }
  return JSON.stringify(w);
}

test('pourMs and pourSlots are never read on the serving path of a seat-model game, and still drive a capacity pin', () => {
  const absurd = (raw: Seed | Capacity) => { raw.upgrades.keg.pourSlots = [1, 1, 1, 1, 1]; raw.upgrades.keg.pourMs = [90000, 90000, 90000, 90000, 90000]; };
  const swift = (raw: Seed | Capacity) => { raw.upgrades.keg.pourSlots = [6, 6, 6, 6, 6]; raw.upgrades.keg.pourMs = [1, 1, 1, 1, 1]; };
  const shop = (patch: (raw: Seed) => void) => { const raw = structuredClone(seed); raw.shift.startingCoinsBase = 1000000; sunny(raw); patch(raw); const g = new Game(loadConfig(raw), 42, T0); furnish(g, command => send(g, command)); return g; };
  const slow = shop(absurd), fast = shop(swift), a = play(slow, 240000), b = play(fast, 240000);
  assert.equal(a, b, 'a 90 s tap and a 1 ms tap give the same world, event for event');
  assert.ok(slow.world.serves.length >= 8 && slow.world.serves.some(s => s.dishes.includes('bia')), 'a real shift was played');
  assert.equal(slow.world.events.filter(e => e.type === 'beer_poured').every(e => e.data.fromReserve === true), true);
  // The same two keys on the frozen capacity model: the tap is still live there, so the worlds differ.
  const pin = (patch: (raw: Capacity) => void) => { const raw = capacityRaw(); raw.shift.startingCoinsBase = 1000000; sunny(raw); patch(raw); return new Game(loadConfig(raw), 42, T0); };
  assert.notEqual(play(pin(absurd), 240000), play(pin(swift), 240000));
});

test('rules 28 never puts a beer in a pour: no beer item is ever preparing and no tap cause is ever reported, with beer running short', () => {
  const g = pairShop(raw => { raw.patience.thuongMs = 18000; raw.inventory.startingStock.bia = [4, 15]; raw.upgrades.keg.pourMs = [90000, 90000, 90000, 90000, 90000]; }), w = g.world;
  const causes = new Set<PreparationCause>(); let pouring = 0;
  play(g, 300000, { restockFrom: 120000, seen: () => { // no restock for the first two minutes: orders wait for beer and expire, then batches land again
    pouring += beerStatus(w, g.config).pouring;
    for (const t of w.tables) if (t.order && ['pending', 'grace'].includes(t.order.state)) causes.add(orderPreparation(w, g.config, t.order));
  } });
  assert.equal(pouring, 0, 'no beer is ever in a pour');
  assert.ok(!causes.has('tap')); assert.ok(causes.has('beerStock') && causes.has('beerRefill'), 'the sweep saw orders waiting for beer and for a batch');
  const expired = w.events.filter(e => e.type === 'order_expired'); assert.ok(expired.length > 0 && expired.every(e => e.data.cause !== 'tap'));
  assert.ok(w.events.some(e => e.type === 'beer_batch_ready'), 'batches landed during the sweep'); roundTrip(g);
});

/** Genuine rules-27 histories on the frozen 2.0.4 capacity model, recorded by the pre-seat engine (fixtures/capacity-v27.ts), which poured every beer through the tap. */
function v27(tables: 3 | 6) {
  const fixture = JSON.parse(readFileSync(new URL(`./fixtures/capacity-lv3x${tables}-v27.json`, import.meta.url), 'utf8'));
  return { fixture, load: () => decodeSave(fixture.save) };
}
for (const tables of [3, 6] as const) test(`a recorded rules-27 shift on ${tables} capacity tables replays byte for byte and shows the tap it was recorded with`, () => {
  const { fixture, load } = v27(tables), g = load(), w = g.world;
  assert.equal(createHash('sha256').update(JSON.stringify(w)).digest('hex'), fixture.worldSha256, 'identical to the world the pre-S2 engine recorded');
  assert.ok(g.log.every(e => e.rulesVersion === 27)); assert.equal(isSeatModel(g.config.values), false);
  const pourMs = g.config.values.upgrades.keg.pourMs[0];
  const delays = w.events.filter(e => e.type === 'beer_pouring').flatMap(p => {
    const poured = w.events.find(e => e.type === 'beer_poured' && e.data.itemId === p.data.itemId);
    return poured ? [poured.at - p.at] : [];
  });
  assert.ok(delays.length >= 10, 'the history pours plenty of beer'); assert.ok(delays.every(d => d === pourMs), `every beer of the history took the tap's ${pourMs} ms`);
  assert.ok(w.events.every(e => e.type !== 'beer_poured' || !('fromReserve' in e.data)), 'no pour of the history came from the reserve');
  roundTrip(g);
});

test('a rules-27 save keeps the tap through its live rules-28 commands and pours instantly only at the opening that adopts the seat model', () => {
  const { load } = v27(3);
  /** The first order that carries a beer, on whichever config the opening pinned. */
  const firstBeer = (g: Game) => {
    const w = g.world, end = w.now + 300000; let seen = w.events.filter(e => e.type === 'order_placed').length;
    while (w.now < end) {
      g.advance(w.now + 100);
      const placed = w.events.filter(e => e.type === 'order_placed');
      for (const e of placed.slice(seen)) {
        const order = w.tables.find(t => t.id === e.data.tableId)!.order!, item = order.items.find(i => i.dish === 'bia');
        if (item) return { item, placedAt: e.at };
      }
      seen = placed.length;
    }
    throw Error('no beer was ordered');
  };
  const kept = load(); assert.ok(send(kept, { type: 'startShift' }).ok); // a live command on the pinned capacity config
  assert.equal(kept.log.at(-1)!.rulesVersion, CURRENT_RULES); assert.equal(isSeatModel(kept.config.values), false);
  const tap = firstBeer(kept), pourMs = kept.config.values.upgrades.keg.pourMs[kept.world.equipment.keg - 1];
  assert.equal(tap.item.state, 'preparing'); assert.equal(tap.item.readyAt, tap.placedAt + pourMs, 'rules 28 alone does not switch the pour: the pinned capacity config keeps its tap');
  roundTrip(kept);
  const adopted = load(); assert.ok(adopted.command({ command: { type: 'startShift' }, at: adopted.world.now, idempotencyKey: 'adopt-seats' }, config).ok);
  assert.equal(isSeatModel(adopted.config.values), true);
  const instant = firstBeer(adopted);
  assert.deepEqual([instant.item.state, instant.item.readyAt], ['ready', instant.placedAt], 'the opening that adopts the seat model also adopts the instant pour');
  roundTrip(adopted);
});
