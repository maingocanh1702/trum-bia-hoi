import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, buyChairQuote, buyTableQuote, tableUpgradeQuote, isSeatModel, type Command } from '../src';
import { capacityConfig } from './fixtures/capacity-model';
import { seat2022Config } from './fixtures/seat-pin';

// The goal chip and the buy buttons read these three quotes; they must say exactly what the commands will say (same price, same first refusal).
// Wave 1 wrote the first two on the 3-table capacity model: they run unchanged on a pinned capacity snapshot (an old save still plays on it
// until its next opening adopts the seat model); the seat model (rules 28) has its own parity tests below, one per command.
const at = Date.parse('2026-09-16T03:00:00Z');
const game = () => new Game(undefined, 42, at); // the bundled seed: seat model
const capacityGame = () => new Game(capacityConfig, 42, at); // pinned before the seat model: the table level sets the seats
const pinGame = () => new Game(seat2022Config(), 42, at); // a seat snapshot from before the S4 ladders (JSON 2.0.22): the S1 level ladder with its badge and reputation gates
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `quote-${g.log.length}` });

test('buyTableQuote prices the next table like the command and refuses in the same order (capacity snapshot)', () => {
  const g = capacityGame(), w = g.world, v = g.config.values; assert.ok(!isSeatModel(v)); // narrows to the capacity shape
  const max = v.upgrades.table.maxTables;
  w.coins = 0;
  const poor = buyTableQuote(w, g.config);
  assert.equal(poor.reason, 'notEnoughCoins'); assert.equal(send(g, { type: 'buyTable' }).reason, 'notEnoughCoins');
  assert.equal(poor.capacity, v.upgrades.table.levels[v.runtime.initialTableLevel - 1].capacity);
  w.coins = 10_000_000;
  for (let n = w.tables.length; n < max; n++) {
    const quote = buyTableQuote(w, g.config); assert.ok(quote.ok && quote.cost! > 0, `table ${n + 1}`);
    assert.deepEqual(send(g, { type: 'buyTable' }), { ok: true, amount: quote.cost }); // the quoted price is the debited price
  }
  assert.equal(w.tables.length, max);
  assert.equal(buyTableQuote(w, g.config).reason, 'maxTables'); assert.equal(send(g, { type: 'buyTable' }).reason, 'maxTables');
  const legacy = capacityGame(); legacy.world.phase = 'open';
  assert.equal(buyTableQuote(legacy.world, legacy.config, true).reason, 'outsideShiftOnly', 'the pre-live-upgrade rule comes first, as in the command');
});

test('tableUpgradeQuote matches upgradeTable: busy table, top level, badge, reputation, wallet and the price itself (capacity snapshot)', () => {
  const g = capacityGame(), w = g.world, v = g.config.values; assert.ok(!isSeatModel(v));
  const levels = v.upgrades.table.levels, [first, second] = w.tables; w.coins = 10_000_000;
  first.state = 'seating'; first.group = null;
  const busy = tableUpgradeQuote(w, g.config, first);
  assert.equal(busy.reason, 'tableBusy'); assert.equal(busy.gate, null, 'busy is not a gate: a suggestion may still point at it');
  assert.equal(send(g, { type: 'upgradeTable', tableId: first.id }).reason, 'tableBusy');
  first.state = 'empty';
  const ready = tableUpgradeQuote(w, g.config, first); assert.ok(ready.ok); assert.equal(ready.cost, levels[1].priceBase); assert.equal((ready.next as { capacity: number }).capacity, levels[1].capacity);
  assert.deepEqual(send(g, { type: 'upgradeTable', tableId: first.id }), { ok: true, amount: ready.cost });
  second.level = levels.length - 1; // the entry after it is the top level, which the shipped ladder gates behind a badge and reputation
  const gated = levels[second.level];
  assert.ok(gated.requiredBadge && gated.repBase, 'the shipped Lv4 asks for a badge and reputation');
  assert.equal(tableUpgradeQuote(w, g.config, second).gate, 'badgeRequired'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'badgeRequired');
  w.badges.push(gated.requiredBadge!); w.reputation = gated.repBase![0] - 1;
  assert.equal(tableUpgradeQuote(w, g.config, second).gate, 'reputationRequired'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'reputationRequired');
  w.reputation = gated.repBase![0]; w.coins = gated.priceBase - 1;
  assert.equal(tableUpgradeQuote(w, g.config, second).reason, 'notEnoughCoins'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'notEnoughCoins');
  w.coins = 10_000_000; assert.ok(send(g, { type: 'upgradeTable', tableId: second.id }).ok);
  const top = tableUpgradeQuote(w, g.config, second); assert.equal(top.gate, 'maxLevel'); assert.equal(top.cost, null); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'maxLevel');
  // At the top level with guests seated the command answers tableBusy first; the quote keeps `gate: 'maxLevel'` so a button can tell "never" from "not now".
  second.state = 'seating'; second.group = null;
  const topBusy = tableUpgradeQuote(w, g.config, second); assert.equal(topBusy.reason, 'tableBusy'); assert.equal(topBusy.gate, 'maxLevel'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'tableBusy');
});

test('buyTableQuote (seat model) prices the n-th table from the ladder like the command: wallet, then the alley ceiling', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v)); // narrows to the seat shape
  const slots = v.locations.list.find(row => row.id === w.location)!.tableSlots;
  w.coins = 0;
  const poor = buyTableQuote(w, g.config);
  assert.equal(poor.reason, 'notEnoughCoins'); assert.equal(send(g, { type: 'buyTable' }).reason, 'notEnoughCoins');
  assert.equal(poor.capacity, 1, 'a new table comes with one chair'); assert.equal(poor.slots, slots);
  w.coins = 10_000_000;
  for (let n = w.tables.length; n < slots; n++) {
    const quote = buyTableQuote(w, g.config); assert.ok(quote.ok); assert.equal(quote.cost, v.upgrades.table.tablePriceBase[n - 1], `table ${n + 1}`);
    w.tables[n - 1].state = 'seating'; // guests at a table never block a purchase
    assert.deepEqual(send(g, { type: 'buyTable' }), { ok: true, amount: quote.cost }); // the quoted price is the debited price
  }
  assert.equal(w.tables.length, slots);
  assert.equal(buyTableQuote(w, g.config).reason, 'maxTables'); assert.equal(send(g, { type: 'buyTable' }).reason, 'maxTables');
  const open = game(); open.world.phase = 'open';
  assert.equal(buyTableQuote(open.world, open.config, true).reason, 'outsideShiftOnly', 'the pre-live-upgrade rule still comes first when asked for');
});

test('buyChairQuote matches buyChair: locked until the shop owns chairsAfterTables tables, then the wallet, then a pair is the most', () => {
  const g = game(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v));
  const table = v.upgrades.table, first = w.tables[0]; w.coins = 10_000_000;
  const locked = buyChairQuote(w, g.config, first);
  assert.equal(locked.reason, 'chairsLocked'); assert.equal(send(g, { type: 'buyChair', tableId: first.id }).reason, 'chairsLocked');
  while (w.tables.length < table.chairsAfterTables) assert.ok(send(g, { type: 'buyTable' }).ok);
  w.coins = table.chairPriceBase[0] - 1;
  const poor = buyChairQuote(w, g.config, first);
  assert.equal(poor.reason, 'notEnoughCoins'); assert.equal(send(g, { type: 'buyChair', tableId: first.id }).reason, 'notEnoughCoins');
  w.coins = 10_000_000; first.state = 'seating'; first.group = null; // guests at the table never block the chair
  const ready = buyChairQuote(w, g.config, first); assert.ok(ready.ok); assert.equal(ready.cost, table.chairPriceBase[0]);
  assert.deepEqual(send(g, { type: 'buyChair', tableId: first.id }), { ok: true, amount: ready.cost }); assert.equal(first.capacity, 2);
  const full = buyChairQuote(w, g.config, first);
  assert.equal(full.reason, 'maxChairs'); assert.equal(send(g, { type: 'buyChair', tableId: first.id }).reason, 'maxChairs');
  const next = buyChairQuote(w, g.config, w.tables[1]);
  assert.equal(next.cost, table.chairPriceBase[1], 'the price follows the second chairs owned across the shop'); assert.ok(next.ok);
});

test('tableUpgradeQuote (seat model, a pin from before the S4 ladders) matches upgradeTable: two chairs first, then badge, reputation, wallet and top level; guests never block it', () => {
  const g = pinGame(), w = g.world, v = g.config.values; assert.ok(isSeatModel(v));
  const levels = v.upgrades.table.levels, chairs = v.upgrades.table.chairsAfterTables; w.coins = 10_000_000;
  const first = w.tables[0];
  const needs = tableUpgradeQuote(w, g.config, first);
  assert.equal(needs.gate, 'tableNeedsChairs'); assert.equal(needs.reason, 'tableNeedsChairs'); assert.equal(send(g, { type: 'upgradeTable', tableId: first.id }).reason, 'tableNeedsChairs');
  while (w.tables.length < chairs) assert.ok(send(g, { type: 'buyTable' }).ok);
  for (const table of w.tables.slice(0, 2)) assert.ok(send(g, { type: 'buyChair', tableId: table.id }).ok);
  const second = w.tables[1];
  first.state = 'seating'; first.group = null; // a table with guests: under the seat model the purchase needs no empty table
  const busy = tableUpgradeQuote(w, g.config, first);
  assert.ok(busy.ok, 'guests do not block the upgrade'); assert.equal(busy.cost, levels[1].priceBase);
  assert.deepEqual(send(g, { type: 'upgradeTable', tableId: first.id }), { ok: true, amount: busy.cost });
  second.level = levels.length - 1; // the entry after it is the top level, which the shipped ladder gates behind a badge and reputation
  const gated = levels[second.level];
  assert.ok(gated.requiredBadge && gated.repBase, 'the shipped Lv4 asks for a badge and reputation');
  assert.equal(tableUpgradeQuote(w, g.config, second).gate, 'badgeRequired'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'badgeRequired');
  w.badges.push(gated.requiredBadge!); w.reputation = gated.repBase![0] - 1;
  assert.equal(tableUpgradeQuote(w, g.config, second).gate, 'reputationRequired'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'reputationRequired');
  w.reputation = gated.repBase![0]; w.coins = gated.priceBase - 1;
  assert.equal(tableUpgradeQuote(w, g.config, second).reason, 'notEnoughCoins'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'notEnoughCoins');
  w.coins = 10_000_000; assert.ok(send(g, { type: 'upgradeTable', tableId: second.id }).ok);
  const top = tableUpgradeQuote(w, g.config, second); assert.equal(top.gate, 'maxLevel'); assert.equal(top.cost, null); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'maxLevel');
  second.state = 'seating'; second.group = null; // the top level stays "never", guests or not
  assert.equal(tableUpgradeQuote(w, g.config, second).reason, 'maxLevel'); assert.equal(send(g, { type: 'upgradeTable', tableId: second.id }).reason, 'maxLevel');
});
