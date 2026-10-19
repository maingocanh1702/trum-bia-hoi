import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, buyTableQuote, tableUpgradeQuote, type Command } from '../src';

// The goal chip and the buy buttons read these two quotes; they must say exactly what the commands will say (same price, same first refusal).
const game = () => new Game(undefined, 42, Date.parse('2026-09-16T03:00:00Z'));
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `quote-${g.log.length}` });

test('buyTableQuote prices the next table like the command and refuses in the same order', () => {
  const g = game(), w = g.world, max = g.config.values.upgrades.table.maxTables;
  w.coins = 0;
  const poor = buyTableQuote(w, g.config);
  assert.equal(poor.reason, 'notEnoughCoins'); assert.equal(send(g, { type: 'buyTable' }).reason, 'notEnoughCoins');
  assert.equal(poor.capacity, g.config.values.upgrades.table.levels[g.config.values.runtime.initialTableLevel - 1].capacity);
  w.coins = 10_000_000;
  for (let n = w.tables.length; n < max; n++) {
    const quote = buyTableQuote(w, g.config); assert.ok(quote.ok && quote.cost! > 0, `table ${n + 1}`);
    assert.deepEqual(send(g, { type: 'buyTable' }), { ok: true, amount: quote.cost }); // the quoted price is the debited price
  }
  assert.equal(w.tables.length, max);
  assert.equal(buyTableQuote(w, g.config).reason, 'maxTables'); assert.equal(send(g, { type: 'buyTable' }).reason, 'maxTables');
  const legacy = game(); legacy.world.phase = 'open';
  assert.equal(buyTableQuote(legacy.world, legacy.config, true).reason, 'outsideShiftOnly', 'the pre-live-upgrade rule comes first, as in the command');
});

test('tableUpgradeQuote matches upgradeTable: busy table, top level, badge, reputation, wallet and the price itself', () => {
  const g = game(), w = g.world, levels = g.config.values.upgrades.table.levels;
  const [first, second] = w.tables; w.coins = 10_000_000;
  first.state = 'seating'; first.group = null;
  const busy = tableUpgradeQuote(w, g.config, first);
  assert.equal(busy.reason, 'tableBusy'); assert.equal(busy.gate, null, 'busy is not a gate: a suggestion may still point at it');
  assert.equal(send(g, { type: 'upgradeTable', tableId: first.id }).reason, 'tableBusy');
  first.state = 'empty';
  const ready = tableUpgradeQuote(w, g.config, first); assert.ok(ready.ok); assert.equal(ready.cost, levels[1].priceBase); assert.equal(ready.next!.capacity, levels[1].capacity);
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
