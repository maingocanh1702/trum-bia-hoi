import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, loadConfig, trayDishes, tableUpgrade, isSeatModel, restockQuote, DISHES, WEATHER, PAIR, type Command, type DomainEvent } from '../src';
import { serveNext } from '../sim/policy';
import { steadyDemand } from './fixtures/steady-demand';
import { capacityConfig } from './fixtures/capacity-model';
import { seat2022Config } from './fixtures/seat-pin';

// S6 (plan S6 row: "mâm hiện đúng số món theo cấp"): the yard draws on every table the tray its level allows. `trayDishes` must say what
// `Game.order()` really does: a one-chair table gives a guest ONE dish (beer or an instant dish), a pair table beer + a snack, and a pair table at a
// level whose row has `pExtraMoi` (Lv3 / Lv4 of the S4 ladder) a second snack. Measured on real orders of a played shift, never asserted from the config alone.
const T0 = Date.parse('2026-10-19T10:00:00+07:00');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `tray-${g.log.length}` });
/** The most dishes one guest ordered on one order, per table. */
function mostDishesPerGuest(events: readonly DomainEvent[]): Map<string, number> {
  const perGuest = new Map<string, { table: string; n: number }>();
  for (const e of events) if (e.type === 'dish_ordered') {
    const key = `${e.data.orderId}:${e.data.customerId}`, row = perGuest.get(key) ?? { table: String(e.data.tableId), n: 0 };
    row.n++; perGuest.set(key, row);
  }
  const most = new Map<string, number>();
  for (const { table, n } of perGuest.values()) most.set(table, Math.max(most.get(table) ?? 0, n));
  return most;
}

test('trayDishes says what a guest really orders: one dish at a one-chair table, beer + a snack at a pair, a second snack only at a level with pExtraMoi (seed 42)', () => {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = 1000000; raw.onboarding.enabled = false; raw.patience.thuongMs = 120000; steadyDemand(raw); // the tray shape is the subject: many guests, nobody walks out
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0;
  const g = new Game(loadConfig(raw), 42, T0), w = g.world, c = g.config.values; assert.ok(isSeatModel(c));
  const ladder = tableUpgrade(c)!.levels;
  while (w.tables.length < 4) assert.ok(send(g, { type: 'buyTable' }).ok);
  for (const table of w.tables.slice(1)) assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok); // table 1 keeps one chair
  w.lifePath = Math.max(...ladder.map(row => row.lifePathGate)); // every level gate open: the subject is the tray, not Duong Len Trum
  const [solo, pairLv1, pairLv3, pairLv4] = w.tables;
  for (let i = 1; i < 3; i++) assert.ok(send(g, { type: 'upgradeTable', tableId: pairLv3.id }).ok);
  for (let i = 1; i < 4; i++) assert.ok(send(g, { type: 'upgradeTable', tableId: pairLv4.id }).ok);
  assert.deepEqual(w.tables.map(t => [t.capacity, t.level]), [[1, 1], [2, 1], [2, 3], [2, 4]]);
  // The shape the yard will draw, read from the config and the table alone.
  assert.equal(trayDishes(c, solo), 1); assert.equal(trayDishes(c, pairLv1), 2); assert.equal(trayDishes(c, pairLv3), 3); assert.equal(trayDishes(c, pairLv4), 3);
  assert.equal(trayDishes(c, { level: 3, capacity: 1 }), 1, 'a one-chair table that kept a level (a migrated save) is a solo tray: the level counts only at two chairs');
  assert.equal(trayDishes(c, { level: 2, capacity: PAIR }), 2, 'Lv2 adds a round, not a dish');
  // Three shifts of real orders (the first three open at once, D8): no guest ever gets more than the tray says, and every tray is filled at least once.
  const want = new Map(w.tables.map(t => [t.id, trayDishes(c, t)]));
  for (let shift = 0; shift < 3; shift++) {
    assert.ok(send(g, { type: 'startShift' }).ok, `shift ${shift + 1}`);
    while (w.phase !== 'resting') {
      for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
      serveNext(g, command => { send(g, command); });
      g.advance(w.now + 100);
      if (w.shift && w.now >= w.shift.endsAt && w.phase === 'open') send(g, { type: 'endShift' });
    }
  }
  const most = mostDishesPerGuest(w.events);
  for (const table of w.tables) assert.equal(most.get(table.id), want.get(table.id), `table ${table.id} (${table.capacity} chairs, Lv${table.level})`);
  assert.ok(w.events.filter(e => e.type === 'dish_ordered').length > 60, 'enough orders to mean something');
});

test('trayDishes on older snapshots: a capacity pin is beer + a snack at every table, a seat pin before the ladders has no second snack', () => {
  const capacity = new Game(capacityConfig, 42, T0);
  for (const table of capacity.world.tables) assert.equal(trayDishes(capacity.config.values, table), 2);
  const pin = new Game(seat2022Config(), 42, T0), w = pin.world;
  assert.equal(trayDishes(pin.config.values, w.tables[0]), 1, 'one chair');
  assert.equal(trayDishes(pin.config.values, { level: 4, capacity: PAIR }), 2, 'no ladder row, so no second snack');
});
