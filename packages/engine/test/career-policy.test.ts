import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, config, loadConfig, upgradeQuote, buyTableQuote, type Command, type SeedConfig } from '../src';
import { createManagementPolicy } from '../sim/policy';
import { simulateCareer, CAREER_POLICY, CAREER_POLICY_PRICE, SEASON_START } from '../sim/career';
import { steadyDemand } from './fixtures/steady-demand';

// Plan "Vui 3 ca" S5, career policy v4: a free shop leases the best location directly (D13, DESIGN-story "thuê thẳng mặt bằng"), and the price decides what the bot
// buys (plan section 9: "bot mua rẻ nhất trước"). Both are options of the management policy, so the server forecast keeps projecting the v3 bot it always did.
const T0 = Date.parse('2026-10-20T10:00:00+07:00');
const send = (g: Game) => (command: Command) => { const r = g.command({ command, at: g.world.now, idempotencyKey: `pol-${g.log.length}` }); assert.ok(r.ok, `${command.type}: ${r.reason}`); };
const SPENDING: Command['type'][] = ['buyTable', 'buyChair', 'upgrade', 'upgradeTable', 'upgradeChair', 'buyGlass', 'buyUnlock', 'installSignboard', 'setSignboard', 'rentLocation'];
const bought = (g: Game) => g.log.filter(e => (e.result.amount ?? 0) > 0 && SPENDING.includes(e.command.type as Command['type'])).map(e => e.command.type);

test('a free shop leases the best location its life path allows and its wallet pays for; the stepwise v3 bot takes the next one up', () => {
  const rich = (options: { directLease: boolean }, lifePath: number) => {
    const raw = structuredClone(seed); raw.shift.startingCoinsBase = 4000000;
    const g = new Game(loadConfig(raw), 42, T0); g.world.lifePath = lifePath; // the gate arithmetic is the subject, not the days it takes to earn Duong Len Trum
    createManagementPolicy(g, send(g), options)();
    return g;
  };
  const list = config.values.locations.list.filter(l => l.id !== config.values.locations.fallback);
  for (const lifePath of [1, 3, 5]) {
    const open = list.filter(l => l.gateLifePath <= lifePath).sort((a, b) => b.mult - a.mult), direct = rich({ directLease: true }, lifePath), stepwise = rich({ directLease: false }, lifePath);
    assert.equal(direct.world.location, open[0].id, `LP${lifePath}: the best open location straight away`);
    assert.ok(direct.log.some(e => e.command.type === 'rentLocation' && e.result.ok));
    assert.equal(stepwise.world.location, list.sort((a, b) => a.mult - b.mult).find(l => l.mult > 1)!.id, `LP${lifePath}: v3 climbs one location per lease`);
  }
  // Nothing to lease below the gate of the first location; a poor wallet leases nothing.
  const poor = new Game(config, 42, T0); poor.world.lifePath = 5; poor.world.claimedLifePaths = [1, 2, 3, 4, 5]; poor.world.coins = 100; // the rewards of the levels are claimed: nothing to pay with
  createManagementPolicy(poor, send(poor), { directLease: true })();
  assert.equal(poor.world.location, config.values.locations.fallback, 'the wallet decides when it cannot pay');
});

test('the price decides: with a table that costs more than a device the bot buys the device first, and the seats-first bot saves for the table', () => {
  const pricey = (seatsFirst: boolean) => {
    const raw = structuredClone(seed); raw.shift.startingCoinsBase = 4000; raw.upgrades.table.tablePriceBase[0] = 40000;
    const g = new Game(loadConfig(raw), 42, T0); createManagementPolicy(g, send(g), { seatsFirst })();
    return g;
  };
  const cheapest = pricey(false), seatsFirst = pricey(true);
  assert.ok(bought(cheapest).includes('upgrade'), 'a device is the cheapest thing it can pay for'); assert.equal(cheapest.world.tables.length, 1);
  assert.deepEqual(bought(seatsFirst), [], 'saving for the table: nothing else is bought');
  assert.equal(seatsFirst.world.tables.length, 1);
  // With the ordinary prices no device level costs less than table 2 (the stall's second level costs the same, 1 500: the goal chip needs it so, sealed-economy.test.ts),
  // and a tie goes to the seat, so a rich new shop buys table 2 first under both bots.
  const ordinary = (seatsFirst: boolean) => {
    const raw = structuredClone(seed); raw.shift.startingCoinsBase = 4000;
    const g = new Game(loadConfig(raw), 42, T0); createManagementPolicy(g, send(g), { seatsFirst })();
    return g;
  };
  const fresh = (() => { const raw = structuredClone(seed); raw.shift.startingCoinsBase = 4000; return new Game(loadConfig(raw), 42, T0); })();
  const stall = upgradeQuote(fresh.world, fresh.config, 'stall'), table = buyTableQuote(fresh.world, fresh.config);
  assert.ok(stall.ok && table.ok && stall.cost! >= table.cost!, 'no device level is cheaper than table 2 in the sealed numbers');
  const byPrice = ordinary(false), bySeats = ordinary(true);
  for (const g of [byPrice, bySeats]) { assert.deepEqual(bought(g), ['buyTable']); assert.equal(g.world.tables.length, 2); }
});

test('the career runs the protocol of plan S5 by default (seats first, direct leasing, the day every S1-S4 career started); the price-decides bot and the first midnight of a season are options', () => {
  assert.match(CAREER_POLICY, /^v3 \+ direct leasing/); assert.match(CAREER_POLICY, /seat model: save for the next table, then a second chair per table, before any other purchase/); assert.match(CAREER_POLICY, /never the dog/);
  assert.match(CAREER_POLICY_PRICE, /^v4 \(information only/);
  const cfg = loadConfig(steadyDemand(structuredClone(config.raw))) as SeedConfig;
  const { game, report } = simulateCareer({ days: 1, seed: 42, config: cfg });
  assert.equal(report.policy, CAREER_POLICY); assert.equal(report.rows[0].date, '2026-09-09');
  assert.equal(game.world.completedShifts, config.values.shift.dailyShiftCap.newbie);
  const w = game.world, openings = w.events.filter(e => e.type === 'shift_opened').map(e => e.at), closings = w.events.filter(e => e.type === 'shift_closed').map(e => e.at);
  // Shifts 2 and 3 open the moment the previous one closes (D8: no cooldown); shift 4 waits for the stamina.
  assert.ok(openings[1] - closings[0] < 60000 && openings[2] - closings[1] < 60000, 'shifts 2 and 3 do not wait');
  assert.ok(openings[3] - closings[2] >= config.values.shift.durationMs / config.values.shift.regenRate - 1000, 'shift 4 waits the 30 minutes');
  // The information runs: the price decides, and the career starts at the first Vietnam midnight of a 21-day season.
  const price = simulateCareer({ days: 1, seed: 42, config: cfg, startAt: SEASON_START, policy: { seatsFirst: false } }).report;
  assert.equal(price.policy, CAREER_POLICY_PRICE); assert.equal(price.rows[0].date, '2026-09-06');
});
