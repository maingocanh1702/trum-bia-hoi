import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { Game, config, loadConfig, decodeSave, encodeSave, isSeatModel, tableUpgradeQuote, chairUpgradeQuote, tableBenefit, chairPatienceMult, restockQuote, upgradeQuote, buyGlassQuote, DISHES, EQUIPMENT, WEATHER, type Command } from '../src';
import { createManagementPolicy, serveNext } from '../sim/policy';
import { seat2022Raw } from './fixtures/seat-pin';
import { steadyDemand } from './fixtures/steady-demand';

// Plan "Vui 3 ca" S4 / FEEDBACK II.2 v3.3 / D14 D18 D19: table levels and chair levels. Every state change below is a real command or clock advance
// (a few tests set `w.lifePath` or a wallet directly, as goal-quotes.test.ts does: the gate arithmetic is the subject, not the days it takes to earn
// Duong Len Trum); the recorded save was produced by the engine of the slice before this one (fixtures/seat-v28-2022.ts, S3 tip 004e6ad).
type Seed = typeof seed;
const T0 = Date.parse('2026-10-20T10:00:00+07:00');
const K = seed.k.value;
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `s4-${g.log.length}` });
const must = (g: Game, command: Command) => { const r = send(g, command); assert.ok(r.ok, `${command.type}: ${r.reason}`); return r; };
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const version = (label: string) => label.split('.').map(Number);
const newer = (a: string, b: string) => { const [x, y] = [version(a), version(b)]; return (x[0] - y[0] || x[1] - y[1] || x[2] - y[2]) > 0; };
const onlyType = (raw: Seed, type: string) => { for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = key === type ? 1 : 0; };
/** Ordinary guests, a pair every few seconds, no second round unless asked: the arrivals of a busy alley without the dice. */
const busy = (raw: Seed) => {
  onlyType(raw, 'thuong'); raw.spawn.pPair = 1; raw.demandMix.pSecondRound = 0; raw.spawn.baseMs = raw.rush.none.floorMs = 1500;
};
/**
 * A seat-model shop on the bundled seed (or a patch of it): four tables with two chairs, a wallet for real purchases, sunny weather, no rush, steady demand,
 * and (unless `equip` is false) every device but the kitchen at its top level and a full rack of glasses, so that the pipeline never starves the tables under test.
 */
function shop(patch?: (raw: Seed) => void, { chairs = true, lifePath = 4, equip = true }: { chairs?: boolean; lifePath?: number; equip?: boolean } = {}, rngSeed = 42) {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = 4000000; // every price still comes from the config
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0; raw.onboarding.enabled = false;
  steadyDemand(raw);
  patch?.(raw);
  const g = new Game(loadConfig(raw), rngSeed, T0), w = g.world;
  while (w.tables.length < 4) must(g, { type: 'buyTable' });
  if (chairs) for (const table of w.tables) must(g, { type: 'buyChair', tableId: table.id });
  w.lifePath = lifePath;
  if (equip) {
    for (const kind of EQUIPMENT) if (kind !== 'kitchen') while (upgradeQuote(w, g.config, kind).ok) must(g, { type: 'upgrade', kind });
    const glasses = buyGlassQuote(w, g.config, 1); if (glasses.ok) must(g, { type: 'buyGlass', count: glasses.capacity - glasses.owned });
  }
  return g;
}
const levelUp = (g: Game, index: number, level: number) => { while (g.world.tables[index].level < level) must(g, { type: 'upgradeTable', tableId: g.world.tables[index].id }); };
const chairUp = (g: Game, index: number, level: number) => { while ((g.world.tables[index].chairLevel ?? 1) < level) must(g, { type: 'upgradeChair', tableId: g.world.tables[index].id }); };
/** Serve complete trays and keep shelves stocked for `ms` of game time. */
function run(g: Game, ms: number, { restock = true, each }: { restock?: boolean; each?: () => void } = {}) {
  const end = g.world.now + ms;
  while (g.world.now < end) {
    if (restock) for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(g, command); });
    g.advance(g.world.now + 100);
    each?.();
  }
}
/** What each group sat down with, read the moment it sits (the perks are recorded on the group, not read from the table later). */
function watcher(g: Game) {
  const seen = new Map<string, { table: string; rounds: number; level: number | undefined; chairLevel: number | undefined }>();
  return { seen, each: () => { for (const t of g.world.tables) if (t.group && !seen.has(t.group.id)) seen.set(t.group.id, { table: t.id, rounds: t.group.rounds, level: t.group.level, chairLevel: t.group.chairLevel }); } };
}
/** One row per group that sat down: its table, how many orders it placed, and whether a visit ended in an expired order. */
function visits(g: Game) {
  const rows: { tableId: string; groupId: string; at: number; orders: number; expired: boolean }[] = [], current = new Map<string, (typeof rows)[number]>();
  for (const e of g.world.events) {
    const tableId = String(e.data.tableId);
    if (e.type === 'group_seated') { const row = { tableId, groupId: String(e.data.groupId), at: e.at, orders: 0, expired: false }; rows.push(row); current.set(tableId, row); }
    else if (e.type === 'order_placed') current.get(tableId)!.orders++;
    else if (e.type === 'order_expired') current.get(tableId)!.expired = true;
  }
  return rows;
}
/** Step the clock until the table has an order; the dishes ordered, per customer. */
function firstOrder(g: Game, index = 0, limitMs = 120000) {
  const w = g.world, end = w.now + limitMs;
  while (!w.tables[index].order && w.now < end) g.advance(w.now + 100);
  const order = w.tables[index].order!; assert.ok(order, 'the table placed an order');
  return { order, dishes: w.events.filter(e => e.type === 'dish_ordered' && e.data.orderId === order.id).map(e => ({ dish: String(e.data.dish), customer: String(e.data.customerId) })) };
}
const priceBase = (target: 2 | 3 | 4, n: number) => { const row = config.values.upgrades.table.tableUpgrade.levels[target - 2]; return row.priceBase + row.stepBase * n; };
const chairPrice = (t: number) => config.values.upgrades.table.chairUpgrade.priceBase + config.values.upgrades.table.chairUpgrade.stepBase * t;

/** The rules-28 history S3 shipped: bundled seat seed 2.0.22 (the S1 level ladder: old prices, Ket Noi gate, no level benefit), recorded by tip 004e6ad. */
function seat2022() {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/seat-2.0.22-v28.json', import.meta.url), 'utf8')), saved = JSON.parse(fixture.save);
  return { fixture, saved, save: fixture.save as string, raw: seat2022Raw };
}

test('a rules-28 history recorded on JSON 2.0.22 replays byte for byte and re-encodes unchanged: the old level prices, the old gate, no level benefit', () => {
  const { fixture, saved, save } = seat2022();
  assert.equal(saved.config._meta.version, '2.0.22'); assert.ok(saved.log.every((e: { rulesVersion: number }) => e.rulesVersion === 28));
  const g = decodeSave(save);
  assert.equal(sha(g.world), fixture.worldSha256, 'the pre-S4 history replays to the world the old engine recorded');
  assert.equal(encodeSave(g), JSON.stringify(saved), 'and re-encodes byte for byte');
  assert.ok(isSeatModel(g.config.values) && g.config.version === '2.0.22' && !('tableUpgrade' in g.config.values.upgrades.table));
  const upgrades = saved.log.filter((e: { command: { type: string } }) => e.command.type === 'upgradeTable');
  assert.deepEqual(upgrades.map((e: { result: { ok: boolean; reason?: string; amount?: number } }) => [e.result.ok, e.result.reason ?? e.result.amount]),
    [[true, 3750], [true, 15000], [true, 3750], [false, 'badgeRequired']], 'the S1 ladder: 1 500 / 6 000 base x 2.5, then the Ket Noi badge');
  const kinds = new Set(g.world.events.map(e => e.type));
  for (const need of ['table_upgraded', 'chair_bought', 'order_placed', 'order_served']) assert.ok(kinds.has(need), `the recorded history exercises ${need}`);
  assert.deepEqual(g.world.events.filter(e => e.type === 'table_upgraded').map(e => Object.keys(e.data)), [['tableId', 'level'], ['tableId', 'level'], ['tableId', 'level']], 'the old event payload');
  assert.ok(g.world.tables.every(t => t.chairLevel === undefined) && g.world.tables.some(t => t.level === 3), 'a pin leaves no new field on its tables');
});

test('the bundled numbers are the plan\'s W9 set: table levels 8k+3k·n / 20k+8k·n / 35k+12k·n at LP1 / LP2 / LP4, chairs 4k+2k·t at LP1 / LP2, Tier A keys, a version above 2.0.22, no postmvp backrest', () => {
  // S5 owns every number: when it retunes these, this is the one test that names them.
  const t = seed.upgrades.table;
  assert.deepEqual(t.tableUpgrade.levels.map(l => [l.level, l.priceBase, l.stepBase, l.lifePathGate]), [[2, 8000, 3000, 1], [3, 20000, 8000, 2], [4, 35000, 12000, 4]]);
  assert.deepEqual(t.tableUpgrade.levels.map(l => [l.extraRounds, l.pExtraMoi, l.tipMult]), [[1, 0, 1], [1, 0.35, 1], [1, 0.35, 1.25]], 'a level lists what the table gives in total: the benefits stack');
  assert.deepEqual([t.chairUpgrade.priceBase, t.chairUpgrade.stepBase], [4000, 2000]);
  assert.deepEqual(t.chairUpgrade.levels.map(l => [l.level, l.lifePathGate, l.patienceMult]), [[2, 1, 1.15], [3, 2, 1.3]]);
  for (const entry of ['upgrades.table.tableUpgrade', 'upgrades.table.chairUpgrade']) assert.ok(seed._meta.governance.tiers.A.sections.includes(entry), `${entry} moves the whole economy: Tier A`);
  assert.equal('backrest' in seed.upgrades, false, 'the postmvp placeholder is replaced by chairUpgrade');
  assert.ok(newer(seed._meta.version, '2.0.22'), `${seed._meta.version} is above 2.0.22`);
  // Base keys are scaled by k once, at load: the engine reads whole coin prices.
  const v = config.values.upgrades.table;
  assert.deepEqual(v.tableUpgrade.levels.map(l => [l.priceBase, l.stepBase]), [[20000, 7500], [50000, 20000], [87500, 30000]]);
  assert.deepEqual([v.chairUpgrade.priceBase, v.chairUpgrade.stepBase], [10000, 5000]);
  assert.equal(K, 2.5);
});

test('tableBenefit and chairPatienceMult read the ladder: level 1 and a snapshot without the keys give nothing', () => {
  assert.deepEqual([1, 2, 3, 4].map(level => tableBenefit(config.values, level)), [
    { extraRounds: 0, pExtraMoi: 0, tipMult: 1 }, { extraRounds: 1, pExtraMoi: 0, tipMult: 1 },
    { extraRounds: 1, pExtraMoi: 0.35, tipMult: 1 }, { extraRounds: 1, pExtraMoi: 0.35, tipMult: 1.25 }]);
  assert.deepEqual([1, 2, 3].map(level => chairPatienceMult(config.values, level)), [1, 1.15, 1.3]);
  for (const old of [loadConfig(seat2022Raw()), loadConfig(structuredClone(capacityModel)), loadConfig(structuredClone(legacy))]) {
    assert.deepEqual([1, 2, 3, 4].map(level => tableBenefit(old.values, level)), Array(4).fill({ extraRounds: 0, pExtraMoi: 0, tipMult: 1 }), `${old.version}: no benefit`);
    assert.deepEqual([1, 2, 3].map(level => chairPatienceMult(old.values, level)), [1, 1, 1], `${old.version}: no chair level`);
  }
});

test('a table level is priced by its TARGET level and by how many tables have already reached it: the same total whatever the order of the purchases', () => {
  const total = (steps: [number, number][]) => {
    const g = shop(), w = g.world; const before = w.coins;
    for (const [index, level] of steps) {
      const q = tableUpgradeQuote(w, g.config, w.tables[index]);
      assert.equal(q.next!.level, level); assert.deepEqual(send(g, { type: 'upgradeTable', tableId: w.tables[index].id }), { ok: true, amount: q.cost }, 'the quoted price is the debited price');
    }
    return before - w.coins;
  };
  const g = shop(), w = g.world, quote = (i: number) => tableUpgradeQuote(w, g.config, w.tables[i]).cost;
  assert.equal(quote(0), priceBase(2, 0)); assert.equal(quote(0), 20000, '8 000 x 2.5 for the first table at Lv2');
  levelUp(g, 0, 2);
  assert.equal(quote(1), priceBase(2, 1)); assert.equal(quote(1), 27500, 'one table has reached Lv2: 8 000 + 3 000 x 1, shown x 2.5');
  assert.equal(quote(0), priceBase(3, 0)); assert.equal(quote(0), 50000, 'Lv3 has its own ladder: 20 000 + 8 000 x 0');
  levelUp(g, 0, 3);
  assert.equal(quote(1), priceBase(2, 1), 'a table that moved on to Lv3 still counts as having reached Lv2: the price does not fall back');
  assert.equal(quote(1), 27500);
  levelUp(g, 1, 2); levelUp(g, 2, 2);
  assert.equal(quote(3), priceBase(2, 3)); assert.equal(quote(3), 42500);
  assert.equal(quote(1), priceBase(3, 1), 'the second table to reach Lv3 pays 20 000 + 8 000 x 1'); assert.equal(quote(1), 70000);
  levelUp(g, 0, 4); assert.equal(tableUpgradeQuote(w, g.config, w.tables[0]).gate, 'maxLevel');
  assert.equal(quote(1), priceBase(3, 1)); levelUp(g, 1, 3);
  assert.equal(quote(1), priceBase(4, 1), 'Lv4: 35 000 + 12 000 x 1 once one table is there'); assert.equal(quote(1), 117500);
  const forward = total([[0, 2], [1, 2], [0, 3], [1, 3], [2, 2]]), interleaved = total([[1, 2], [0, 2], [1, 3], [0, 3], [2, 2]]), staged = total([[0, 2], [0, 3], [1, 2], [1, 3], [2, 2]]);
  assert.equal(forward, interleaved); assert.equal(forward, staged);
  assert.equal(forward, 20000 + 27500 + 50000 + 70000 + 35000, 'path independent: n counts tables at or above the target level');
});

test('tableUpgradeQuote answers what upgradeTable will: two chairs, the top level, the life-path gate (Lv2 LP1, Lv3 LP2, Lv4 LP4; no badge, no reputation), then the wallet', () => {
  const g = shop(undefined, { chairs: false }), w = g.world;
  const [one, two] = w.tables;
  must(g, { type: 'buyChair', tableId: two.id });
  const needs = tableUpgradeQuote(w, g.config, one);
  assert.equal(needs.gate, 'tableNeedsChairs'); assert.equal(needs.reason, 'tableNeedsChairs'); assert.deepEqual(send(g, { type: 'upgradeTable', tableId: one.id }), { ok: false, reason: 'tableNeedsChairs' });
  for (const [level, gate] of [[2, 1], [3, 2], [4, 4]] as const) {
    assert.equal(two.level, level - 1);
    for (const lifePath of [gate - 1, gate]) {
      w.lifePath = lifePath; w.coins = 10_000_000;
      const q = tableUpgradeQuote(w, g.config, two);
      assert.equal(q.requiredLifePath, gate);
      if (lifePath < gate) {
        assert.equal(q.gate, 'lifePathRequired'); assert.equal(q.reason, 'lifePathRequired'); assert.equal(q.ok, false);
        assert.deepEqual(send(g, { type: 'upgradeTable', tableId: two.id }), { ok: false, reason: 'lifePathRequired' });
      } else {
        assert.equal(q.gate, null); assert.ok(q.ok);
        w.coins = q.cost! - 1; assert.equal(tableUpgradeQuote(w, g.config, two).reason, 'notEnoughCoins'); assert.deepEqual(send(g, { type: 'upgradeTable', tableId: two.id }), { ok: false, reason: 'notEnoughCoins' });
        w.coins = q.cost!; assert.deepEqual(send(g, { type: 'upgradeTable', tableId: two.id }), { ok: true, amount: q.cost }); assert.equal(w.coins, 0); assert.equal(two.level, level);
      }
    }
  }
  assert.deepEqual(w.badges, []); assert.equal(w.reputation, 0, 'Lv4 needed neither the Ket Noi badge nor reputation');
  const top = tableUpgradeQuote(w, g.config, two);
  assert.equal(top.gate, 'maxLevel'); assert.equal(top.cost, null); assert.equal(top.next, null); assert.deepEqual(send(g, { type: 'upgradeTable', tableId: two.id }), { ok: false, reason: 'maxLevel' });
  two.state = 'seating'; two.group = null; // guests at the table never block a purchase
  assert.equal(tableUpgradeQuote(w, g.config, two).reason, 'maxLevel');
  assert.deepEqual(send(g, { type: 'upgradeTable', tableId: 'nowhere' }), { ok: false, reason: 'tableGone' });
});

test('chairUpgradeQuote answers what upgradeChair will: Lv2 at LP1, Lv3 at LP2, 4k + 2k · t with t the upgrades bought shop-wide, then the wallet and the top level', () => {
  const g = shop(undefined, { lifePath: 0 }), w = g.world, quote = (i: number) => chairUpgradeQuote(w, g.config, w.tables[i]);
  w.coins = 10_000_000;
  assert.equal(quote(0).gate, 'lifePathRequired'); assert.equal(quote(0).requiredLifePath, 1); assert.deepEqual(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }), { ok: false, reason: 'lifePathRequired' });
  w.lifePath = 1;
  assert.equal(quote(0).cost, chairPrice(0)); assert.equal(quote(0).cost, 10000, '4 000 x 2.5');
  w.coins = quote(0).cost! - 1; assert.equal(quote(0).reason, 'notEnoughCoins'); assert.deepEqual(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }), { ok: false, reason: 'notEnoughCoins' });
  w.coins = 10_000_000;
  assert.deepEqual(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }), { ok: true, amount: 10000 }); assert.equal(w.tables[0].chairLevel, 2);
  assert.equal(quote(1).cost, chairPrice(1)); assert.equal(quote(1).cost, 15000, 'the shop has bought one: t = 1 whichever table is next');
  assert.equal(quote(0).gate, 'lifePathRequired'); assert.equal(quote(0).requiredLifePath, 2); assert.equal(quote(0).cost, chairPrice(1), 'Lv3 of the same table is the second upgrade of the shop');
  w.lifePath = 2;
  assert.deepEqual(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }), { ok: true, amount: 15000 }); assert.equal(w.tables[0].chairLevel, 3);
  assert.equal(quote(2).cost, chairPrice(2)); assert.equal(quote(2).cost, 20000);
  assert.equal(quote(0).gate, 'maxLevel'); assert.equal(quote(0).cost, null); assert.deepEqual(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }), { ok: false, reason: 'maxLevel' });
  for (const i of [1, 2, 3]) for (const level of [2, 3]) { assert.equal(quote(i).cost, chairPrice(w.tables.reduce((n, t) => n + (t.chairLevel ?? 1) - 1, 0))); chairUp(g, i, level); }
  assert.deepEqual(w.tables.map(t => t.chairLevel), [3, 3, 3, 3]);
  assert.deepEqual(send(g, { type: 'upgradeChair', tableId: 'nowhere' }), { ok: false, reason: 'tableGone' });
  // A one-chair table has a chair too: the upgrade does not ask for the second one.
  const small = shop(undefined, { chairs: false, lifePath: 1 }); small.world.coins = 10_000_000;
  assert.ok(chairUpgradeQuote(small.world, small.config, small.world.tables[0]).ok); must(small, { type: 'upgradeChair', tableId: small.world.tables[0].id }); assert.equal(small.world.tables[0].capacity, 1);
});

test('Lv2 adds exactly one round and it stays at Lv3 and Lv4: tables of Lv1 to Lv4 side by side with ordinary pairs, each group sat down with its level (seed 42)', () => {
  const g = shop(raw => { busy(raw); raw.upgrades.table.orderShape.pair.pMoi = 0; }), w = g.world;
  levelUp(g, 1, 2); levelUp(g, 2, 3); levelUp(g, 3, 4);
  assert.deepEqual(w.tables.map(t => t.level), [1, 2, 3, 4]);
  must(g, { type: 'startShift' });
  const watch = watcher(g); run(g, 420000, watch);
  const stop = w.now - 90000; must(g, { type: 'endShift' });
  const rows = visits(g).filter(v => !v.expired && v.at < stop);
  for (const level of [1, 2, 3, 4]) {
    const mine = rows.filter(v => w.tables.findIndex(t => t.id === v.tableId) + 1 === level);
    assert.ok(mine.length >= 3, `Lv${level}: ${mine.length} finished visits`);
    for (const v of mine) {
      const got = watch.seen.get(v.groupId)!;
      assert.equal(got.level, level, `Lv${level}: the group is recorded with the level it sat at`); assert.equal(got.rounds, level === 1 ? 1 : 2, `Lv${level}: rounds at seating (1 rolled, +1 from Lv2)`);
      assert.equal(v.orders, level === 1 ? 1 : 2, `Lv${level}: orders placed by one visit`);
    }
  }
});

test('a benefit serves the NEXT group: the group already seated keeps its level, its rounds and its chair level', () => {
  const g = shop(raw => { busy(raw); raw.upgrades.table.orderShape.pair.pMoi = 0; }, { lifePath: 2 }), w = g.world, first = w.tables[0];
  must(g, { type: 'startShift' });
  const watch = watcher(g); let guard = 0;
  while (!(first.group && ['waiting', 'consuming'].includes(first.state)) && guard++ < 2000) { run(g, 100, { ...watch }); }
  const seated = first.group!; assert.ok(seated, 'a pair sat at the first table'); assert.deepEqual([seated.level, seated.chairLevel, seated.rounds], [1, 1, 1]);
  const patience = first.order!.patienceMs;
  must(g, { type: 'upgradeTable', tableId: first.id }); must(g, { type: 'upgradeChair', tableId: first.id });
  assert.deepEqual([seated.level, seated.chairLevel, seated.rounds], [1, 1, 1], 'the purchase does not touch the group at the table');
  assert.equal(first.order!.patienceMs, patience, 'nor the order it is waiting on');
  let next = null as null | typeof seated;
  for (let i = 0; i < 4000 && !next; i++) { run(g, 100, watch); if (first.group && first.group.id !== seated.id) next = first.group; }
  assert.ok(next, 'a later pair sat at the same table'); assert.deepEqual([next.level, next.chairLevel, next.rounds], [2, 2, 2], 'the next group gets Lv2 and the better chairs');
  run(g, 60000, watch); must(g, { type: 'endShift' });
  const mine = visits(g).filter(v => v.tableId === first.id && !v.expired);
  assert.equal(mine.find(v => v.groupId === seated.id)!.orders, 1, 'the seated group ordered once, as the group it sat down as');
  assert.equal(mine.find(v => v.groupId === next!.id)?.orders, 2, 'the next group ordered twice');
});

test('Lv3: a second snack with probability pExtraMoi, only for a snack that is in stock, and the tray is delivered only when every dish is ready', () => {
  const rich = (stock?: { lac: number; nem: number }) => (raw: Seed) => {
    busy(raw); raw.upgrades.table.orderShape.pair.pMoi = 1; // every guest orders beer and a first snack
    for (const row of raw.upgrades.table.tableUpgrade.levels) if (row.pExtraMoi > 0) row.pExtraMoi = 1; // the dice are tested below
    if (stock) { raw.inventory.startingStock.lac[0] = stock.lac; raw.inventory.startingStock.nem[0] = stock.nem; }
  };
  const tray = (level: number, patch: (raw: Seed) => void) => {
    const g = shop(patch), w = g.world; levelUp(g, 0, level); must(g, { type: 'startShift' });
    const { order, dishes } = firstOrder(g, 0); const snacks = new Map<string, number>();
    for (const d of dishes) if (d.dish !== 'bia') snacks.set(d.customer, (snacks.get(d.customer) ?? 0) + 1);
    return { g, w, order, dishes, snacks: [...snacks.values()].sort(), beers: dishes.filter(d => d.dish === 'bia').length };
  };
  for (const level of [1, 2]) { const t = tray(level, rich()); assert.deepEqual([t.beers, t.snacks], [2, [1, 1]], `Lv${level}: beer and one snack each, never a second`); }
  const three = tray(3, rich()); assert.deepEqual([three.beers, three.snacks, three.order.items.length], [2, [2, 2], 6], 'Lv3: each guest of the pair orders a second snack');
  const four = tray(4, rich()); assert.deepEqual([four.beers, four.snacks], [2, [2, 2]], 'the second snack stays at Lv4');
  // Stock 3 for four wanted snacks: the last second snack is simply not ordered (only dishes still on the shelf are ordered).
  const short = tray(3, rich({ lac: 2, nem: 1 }));
  assert.deepEqual([short.beers, short.snacks, short.order.items.length], [2, [1, 2], 5], 'three snacks on the shelf: the guest who comes last has no second one');
  assert.ok(short.w.inventory.lac >= 0 && short.w.inventory.nem >= 0);
  const none = tray(3, rich({ lac: 0, nem: 0 })); assert.deepEqual([none.beers, none.snacks], [2, []], 'no snack on the shelf: beer only, no second snack either');
  // The tray is delivered whole: hot dishes cook in the kitchen while the beers are already poured.
  const hot = (raw: Seed) => { rich()(raw); raw.demandMix.pHotGivenMoi = 1; };
  const g = shop(hot), w = g.world; levelUp(g, 0, 3);
  must(g, { type: 'upgrade', kind: 'kitchen' }); must(g, { type: 'restock', dish: 'dau', mode: 'bulk' }); must(g, { type: 'restock', dish: 'topmo', mode: 'bulk' });
  must(g, { type: 'startShift' });
  const { order, dishes } = firstOrder(g, 0); assert.equal(dishes.length, 6, 'two beers and two hot dishes each');
  const cooked = order.items.filter(i => i.dish !== 'bia'); assert.equal(cooked.length, 4); assert.ok(cooked.every(i => ['dau', 'topmo'].includes(i.dish)));
  let partial = 0, guard = 0;
  while (!order.items.every(i => i.state === 'ready') && guard++ < 400) {
    if (order.items.some(i => i.dish === 'bia' && i.state === 'ready') && order.items.some(i => i.state !== 'ready')) {
      partial++; assert.deepEqual(send(g, { type: 'serve', tableId: w.tables[0].id, orderId: order.id }), { ok: false, reason: 'orderNotReady' }, 'a tray with a dish still cooking is not delivered');
    }
    g.advance(w.now + 100);
  }
  assert.ok(partial > 0, 'the beers were ready while a dish was still cooking'); assert.ok(order.items.every(i => i.state === 'ready'));
  assert.ok(send(g, { type: 'serve', tableId: w.tables[0].id, orderId: order.id }).ok, 'and it is delivered once every dish is ready');
});

test('Lv3 uses the bundled 35 %: about a third of the trays with a first snack carry a second one, none below Lv3 (a table of each level, seed 42)', () => {
  const g = shop(raw => { busy(raw); raw.upgrades.table.orderShape.pair.pMoi = 1; }), w = g.world;
  levelUp(g, 1, 2); levelUp(g, 2, 3); levelUp(g, 3, 4);
  must(g, { type: 'startShift' }); run(g, 600000); must(g, { type: 'endShift' });
  const perGuest = new Map<string, number>(), tableOf = new Map<string, string>(); // snacks of one guest in one order (a guest has one tray per round)
  for (const e of w.events) if (e.type === 'dish_ordered' && e.data.dish !== 'bia') { const key = `${e.data.orderId}:${e.data.customerId}`; perGuest.set(key, (perGuest.get(key) ?? 0) + 1); tableOf.set(key, String(e.data.tableId)); }
  const share = (index: number) => { const mine = [...perGuest].filter(([id]) => tableOf.get(id) === w.tables[index].id).map(([, n]) => n); return { guests: mine.length, second: mine.filter(n => n > 1).length, max: Math.max(...mine) }; };
  for (const index of [0, 1]) { const s = share(index); assert.ok(s.guests >= 10, `table ${index + 1}: ${s.guests} guests`); assert.equal(s.max, 1, `table ${index + 1} never orders a second snack`); }
  for (const index of [2, 3]) {
    const s = share(index); assert.ok(s.guests >= 10, `table ${index + 1}: ${s.guests} guests`);
    assert.ok(s.second / s.guests > 0.15 && s.second / s.guests < 0.6, `table ${index + 1}: ${s.second} of ${s.guests} guests ordered a second snack (pExtraMoi ${seed.upgrades.table.tableUpgrade.levels[1].pExtraMoi})`);
  }
});

test('Lv4: the tip is x1.25 at that table only, from the group that sits down after the purchase', () => {
  const g = shop(raw => { busy(raw); raw.upgrades.table.orderShape.pair.pMoi = 0; raw.spawn.pPair = 0.5; }), w = g.world, c = g.config.values;
  levelUp(g, 0, 4); levelUp(g, 1, 3);
  must(g, { type: 'startShift' }); run(g, 600000); must(g, { type: 'endShift' });
  const tableOf = new Map(w.events.filter(e => e.type === 'order_served').map(e => [String(e.data.orderId), String(e.data.tableId)]));
  const expected = (payment: number, mult: number) => Math.round(Math.round(payment * c.tip.rate) * c.rush.none.tipMult * c.weather.sunny.tipMult * c.customerTypes.thuong.tipMult * mult);
  const by = new Map<string, { tip: number; payment: number }[]>();
  for (const s of w.serves) if (s.tip > 0) { const id = tableOf.get(s.orderId)!; by.set(id, [...(by.get(id) ?? []), { tip: s.tip, payment: s.payment }]); }
  const top = by.get(w.tables[0].id) ?? [], rest = [1, 2, 3].flatMap(i => by.get(w.tables[i].id) ?? []);
  assert.ok(top.length >= 5 && rest.length >= 5, `${top.length} tips at the Lv4 table, ${rest.length} elsewhere`);
  for (const s of top) assert.equal(s.tip, expected(s.payment, 1.25), 'Lv4 table: x1.25');
  for (const s of rest) assert.equal(s.tip, expected(s.payment, 1), 'every other table, Lv3 included: unchanged');
  assert.ok(top.some(s => s.tip !== expected(s.payment, 1)), 'the multiplier is visible in the coins, not only in the formula');
});

test('chair patienceMult applies to the ORDER patience of the table\'s next group, 1 / 1.15 / 1.30, and never accumulates across the rounds of one visit', () => {
  const g = shop(raw => { busy(raw); raw.demandMix.pSecondRound = 1; raw.upgrades.table.orderShape.pair.pMoi = 0; }, { lifePath: 2 }), w = g.world;
  chairUp(g, 1, 2); chairUp(g, 2, 3);
  must(g, { type: 'startShift' });
  const orders = new Map<string, { table: number; patienceMs: number; base: number; group: string; chairLevel: number | undefined }>();
  run(g, 420000, { each: () => { w.tables.forEach((t, i) => { if (t.order && t.group && !orders.has(t.order.id)) orders.set(t.order.id, { table: i, patienceMs: t.order.patienceMs, base: Math.min(...t.group.customers.map(x => x.patienceMs)), group: t.group.id, chairLevel: t.group.chairLevel }); }); } });
  const mult = [1, 1.15, 1.3, 1];
  for (const [index, m] of mult.entries()) {
    const mine = [...orders.values()].filter(o => o.table === index); assert.ok(mine.length >= 6, `table ${index + 1}: ${mine.length} orders`);
    for (const o of mine) assert.equal(o.patienceMs, Math.round(o.base * m), `table ${index + 1}: ${o.base} ms x ${m}`);
  }
  const perGroup = new Map<string, number[]>();
  for (const o of orders.values()) if (o.table === 2) perGroup.set(o.group, [...(perGroup.get(o.group) ?? []), o.patienceMs]);
  const twoRounds = [...perGroup.values()].filter(list => list.length === 2); assert.ok(twoRounds.length >= 3, 'groups at the Lv3 chairs ordered twice');
  for (const [first, second] of twoRounds) assert.equal(second, first, 'the second round has the same patience as the first: 1.30 once, not 1.30 squared');
  assert.ok(w.tables.every(t => t.group === null || t.group.chairLevel === (t.chairLevel ?? 1)));
});

test('upgrades emit one event each with what they cost and what they bring: table_upgraded{tableId, level, cost, what}, chair_upgraded{tableId, level, cost, patienceMult}', () => {
  const g = shop(), w = g.world, [a, b] = w.tables, from = w.events.length;
  must(g, { type: 'upgradeTable', tableId: a.id }); must(g, { type: 'upgradeTable', tableId: a.id }); must(g, { type: 'upgradeTable', tableId: a.id });
  must(g, { type: 'upgradeChair', tableId: b.id }); must(g, { type: 'upgradeChair', tableId: b.id });
  const events = w.events.slice(from).filter(e => ['table_upgraded', 'chair_upgraded'].includes(e.type));
  assert.deepEqual(events.map(e => [e.type, e.data]), [
    ['table_upgraded', { tableId: a.id, level: 2, cost: 20000, what: 'extraRounds' }], ['table_upgraded', { tableId: a.id, level: 3, cost: 50000, what: 'pExtraMoi' }],
    ['table_upgraded', { tableId: a.id, level: 4, cost: 87500, what: 'tipMult' }],
    ['chair_upgraded', { tableId: b.id, level: 2, cost: 10000, patienceMult: 1.15 }], ['chair_upgraded', { tableId: b.id, level: 3, cost: 15000, patienceMult: 1.3 }]]);
  assert.ok(events.every(e => e.configVersion === config.version));
  const refused = w.events.length; send(g, { type: 'upgradeChair', tableId: b.id });
  assert.equal(w.events.length, refused, 'a refused upgrade emits nothing');
});

test('a snapshot from before the keys keeps its own ladder: no chair upgrade, no life-path gate on the table level, the Ket Noi gate for Lv4, no benefit to the group', () => {
  const g = new Game(loadConfig(seat2022Raw()), 42, T0), w = g.world; const c = g.config.values; assert.ok(isSeatModel(c));
  while (w.tables.length < 4) must(g, { type: 'buyTable' });
  for (const t of w.tables) must(g, { type: 'buyChair', tableId: t.id });
  const q = tableUpgradeQuote(w, g.config, w.tables[0]);
  assert.equal(q.cost, c.upgrades.table.levels[1].priceBase); assert.equal(q.requiredLifePath, 0); assert.equal(w.lifePath, 0, 'LP0 is enough on the old ladder');
  levelUp(g, 0, 3); assert.deepEqual(tableBenefit(c, 3), { extraRounds: 0, pExtraMoi: 0, tipMult: 1 });
  assert.equal(tableUpgradeQuote(w, g.config, w.tables[0]).gate, 'badgeRequired');
  assert.deepEqual(send(g, { type: 'upgradeChair', tableId: w.tables[0].id }), { ok: false, reason: 'chairUpgradeUnavailable' });
  assert.equal(chairUpgradeQuote(w, g.config, w.tables[0]).ok, false); assert.equal(w.tables[0].chairLevel, undefined);
  must(g, { type: 'startShift' }); const watch = watcher(g); run(g, 240000, watch);
  assert.ok(watch.seen.size >= 5, `${watch.seen.size} groups sat down`);
  assert.ok([...watch.seen.values()].every(s => s.level === undefined && s.chairLevel === undefined), 'no perk is recorded on a pin\'s groups');
});

test('upgradeChair is a rules-28 command: a log entry recorded below rules 28 is refused on replay, and a rules-28 history with both upgrades re-encodes byte for byte', () => {
  const g = shop(raw => { busy(raw); for (const row of raw.upgrades.table.tableUpgrade.levels) row.lifePathGate = 0; for (const row of raw.upgrades.table.chairUpgrade.levels) row.lifePathGate = 0; }, { lifePath: 0 }), w = g.world; // no gate: nothing is set by hand, so the whole history replays
  levelUp(g, 0, 2); chairUp(g, 1, 2); chairUp(g, 0, 2); must(g, { type: 'startShift' }); run(g, 90000); must(g, { type: 'endShift' }); run(g, 60000, { restock: false });
  const text = encodeSave(g), back = decodeSave(text);
  assert.equal(encodeSave(back), text, 'byte for byte'); assert.deepEqual(back.world, w, 'the whole world, perks included, replays to the same state');
  assert.ok(back.world.tables.some(t => t.chairLevel === 2) && back.world.events.some(e => e.type === 'chair_upgraded'));
  const old = JSON.parse(text); old.log.find((e: { command: { type: string } }) => e.command.type === 'upgradeChair').rulesVersion = 27;
  assert.throws(() => decodeSave(JSON.stringify(old)), /replay:rulesVersion/);
});

test('a pinned 2.0.22 save adopts the new bundle at its next opening: the tables it bought keep their levels and give their benefits from that opening on', () => {
  const { save } = seat2022(), g = decodeSave(save), w = g.world;
  const levels = w.tables.map(t => [t.id, t.level, t.capacity]); assert.equal(g.config.version, '2.0.22');
  assert.deepEqual(levels.map(([, level]) => level), [3, 2, 1, 1]);
  const coins = w.coins;
  assert.ok(g.command({ command: { type: 'startShift' }, at: w.now, idempotencyKey: 'repin' }, config).ok);
  assert.equal(g.config.version, config.version);
  assert.deepEqual(w.events.filter(e => e.type === 'config_pinned').at(-1)!.data, { shiftId: w.shift!.id, previousVersion: '2.0.22', configVersion: config.version });
  assert.equal(w.events.filter(e => e.type === 'seat_model_adopted').length, 0, 'a seat pin never re-derives the seats');
  assert.deepEqual(w.tables.map(t => [t.id, t.level, t.capacity]), levels); assert.equal(w.coins, coins, 'nothing is refunded or charged');
  assert.equal(tableUpgradeQuote(w, g.config, w.tables[2]).cost, priceBase(2, 2), 'two tables have already reached Lv2: the new ladder counts them');
  const watch = watcher(g); run(g, 300000, watch);
  const mine = [...watch.seen.values()]; assert.ok(mine.length > 5);
  assert.ok(mine.every(s => s.level !== undefined && s.chairLevel === 1), 'every group of the new pin records its perks');
  assert.ok(mine.some(s => s.table === w.tables[0].id && s.level === 3) && mine.some(s => s.table === w.tables[1].id && s.level === 2));
  assert.deepEqual(decodeSave(encodeSave(g)).world, w, 'the whole history, the repin included, replays byte for byte');
});

test('snapshots from before the keys load, bytes kept, and refuse every half-way shape; the new keys never loosen an older shape', () => {
  const raw = () => seat2022Raw();
  for (const [name, patch] of [['2.0.22', () => {}], ['2.0.21 (no capacity demand either)', (r: any) => {
    r._meta.version = '2.0.21'; delete r.spawn.capacityDemand;
    r._meta.governance.tiers.A.sections = r._meta.governance.tiers.A.sections.filter((s: string) => s !== 'spawn.capacityDemand');
  }]] as [string, (r: any) => void][]) {
    const pin = raw(); patch(pin);
    assert.equal(JSON.stringify(loadConfig(pin).raw), JSON.stringify(pin), `${name}: raw bytes preserved`);
    const v = loadConfig(pin).values.upgrades;
    assert.equal('backrest' in v, true, `${name}: its postmvp backrest is still there`); assert.equal('tableUpgrade' in v.table, false);
  }
  const ladder = () => structuredClone(seed.upgrades.table.tableUpgrade), chair = () => structuredClone(seed.upgrades.table.chairUpgrade);
  const tiers = (r: any) => { r._meta.governance.tiers.A.sections.push('upgrades.table.tableUpgrade', 'upgrades.table.chairUpgrade'); };
  const bad: [string, RegExp, (r: any) => void][] = [
    ['the keys without their Tier A entries', /config:_meta\.governance\.tiers\.A\.sections:array/, r => { r.upgrades.table.tableUpgrade = ladder(); r.upgrades.table.chairUpgrade = chair(); }],
    ['the Tier A entries without the keys', /config:_meta\.governance\.tiers\.A\.sections:array/, r => { tiers(r); }],
    ['only one of the two keys', /config:upgrades\.table:keys/, r => { r.upgrades.table.tableUpgrade = ladder(); tiers(r); delete r.upgrades.backrest; }],
    ['a snapshot labelled with the new version that lacks the keys', /config:upgrades\.table:keys/, r => { r._meta.version = seed._meta.version; tiers(r); delete r.upgrades.backrest; }],
    ['a snapshot with the new keys that still carries the backrest', /config:upgrades:keys/, r => { r.upgrades.table.tableUpgrade = ladder(); r.upgrades.table.chairUpgrade = chair(); tiers(r); }],
    ['a snapshot that lost the backrest without the new keys', /config:upgrades:keys/, r => { delete r.upgrades.backrest; }],
    ['an unknown key inside tableUpgrade', /config:upgrades\.table\.tableUpgrade:keys/, r => { r.upgrades.table.tableUpgrade = { ...ladder(), bogus: 1 }; r.upgrades.table.chairUpgrade = chair(); tiers(r); delete r.upgrades.backrest; }],
    ['an unknown key inside a level', /config:upgrades\.table\.tableUpgrade\.levels\.0:keys/, r => { const l = ladder(); (l.levels[0] as any).bogus = 1; r.upgrades.table.tableUpgrade = l; r.upgrades.table.chairUpgrade = chair(); tiers(r); delete r.upgrades.backrest; }],
    ['a wrongly typed price', /config:upgrades\.table\.tableUpgrade\.levels\.0\.priceBase:type/, r => { const l = ladder(); (l.levels[0] as any).priceBase = '8000'; r.upgrades.table.tableUpgrade = l; r.upgrades.table.chairUpgrade = chair(); tiers(r); delete r.upgrades.backrest; }],
    ['a short chair ladder', /config:upgrades\.table\.chairUpgrade\.levels:array/, r => { const c = chair(); c.levels.pop(); r.upgrades.table.tableUpgrade = ladder(); r.upgrades.table.chairUpgrade = c; tiers(r); delete r.upgrades.backrest; }],
  ];
  for (const [name, refusal, patch] of bad) { const pin = raw(); patch(pin); assert.throws(() => loadConfig(pin), refusal, name); }
  assert.equal(loadConfig(structuredClone(seed)).version, seed._meta.version, 'the bundled seed itself loads');
  // A 1.x or capacity snapshot never carries them: refused exactly as before.
  for (const [name, base] of [['1.7.3', legacy], ['2.0.4', capacityModel]] as const) {
    const old = structuredClone(base) as any; assert.equal(loadConfig(structuredClone(base)).version, name);
    old.upgrades.table.tableUpgrade = ladder(); assert.throws(() => loadConfig(old), /config:upgrades\.table:keys/, `${name} + tableUpgrade`);
  }
});

test('the ladders fail closed: consecutive levels, whole scaled prices, life-path gates inside the path, benefits that only grow, probabilities in [0, 1]', () => {
  const cases: [string, RegExp, (raw: Seed) => void][] = [
    ['a missing level', /config:upgrades\.table\.tableUpgrade\.levels:array/, raw => { raw.upgrades.table.tableUpgrade.levels.pop(); }],
    ['levels out of order', /config:upgrades\.table\.tableUpgrade:levelOrder/, raw => { raw.upgrades.table.tableUpgrade.levels[0].level = 3; }],
    ['a fractional price', /tableUpgrade\.levels\.0\.priceBase:integer/, raw => { raw.upgrades.table.tableUpgrade.levels[0].priceBase = 8000.5; }],
    ['a negative step', /tableUpgrade\.levels\.1\.stepBase:negative/, raw => { raw.upgrades.table.tableUpgrade.levels[1].stepBase = -1; }],
    ['a gate beyond the life path', /config:lifePathGate/, raw => { raw.upgrades.table.tableUpgrade.levels[2].lifePathGate = 99; }],
    ['a fractional extra round', /tableUpgrade\.levels\.0\.extraRounds:integer/, raw => { raw.upgrades.table.tableUpgrade.levels[0].extraRounds = 0.5; }],
    ['a benefit that shrinks with the level', /config:upgrades\.table\.tableUpgrade:benefitOrder/, raw => { raw.upgrades.table.tableUpgrade.levels[2].extraRounds = 0; }],
    ['a probability above one', /config:upgrades\.table\.tableUpgrade:pExtraMoi/, raw => { raw.upgrades.table.tableUpgrade.levels[2].pExtraMoi = 1.5; raw.upgrades.table.tableUpgrade.levels[1].pExtraMoi = 1.5; }],
    ['a tip multiplier below one', /config:upgrades\.table\.tableUpgrade:tipMult/, raw => { raw.upgrades.table.tableUpgrade.levels.forEach(l => { l.tipMult = 0.5; }); }],
    ['a chair level out of order', /config:upgrades\.table\.chairUpgrade:levelOrder/, raw => { raw.upgrades.table.chairUpgrade.levels[1].level = 2; }],
    ['a patience multiplier below one', /config:upgrades\.table\.chairUpgrade:patienceMult/, raw => { raw.upgrades.table.chairUpgrade.levels[0].patienceMult = 0.9; raw.upgrades.table.chairUpgrade.levels[1].patienceMult = 0.95; }],
    ['a patience multiplier that shrinks', /config:upgrades\.table\.chairUpgrade:patienceMult/, raw => { raw.upgrades.table.chairUpgrade.levels[1].patienceMult = 1.1; }],
    ['a fractional chair price', /chairUpgrade\.priceBase:integer/, raw => { raw.upgrades.table.chairUpgrade.priceBase = 4000.5; }],
    ['a chair gate beyond the life path', /config:lifePathGate/, raw => { raw.upgrades.table.chairUpgrade.levels[0].lifePathGate = 99; }],
  ];
  for (const [name, refusal, patch] of cases) { const raw = structuredClone(seed); patch(raw); assert.throws(() => loadConfig(raw), refusal, name); }
});

test('the career bot learns the upgrades: with a wallet and the life path it buys table and chair levels, cheapest first, after the seats', () => {
  const g = shop(undefined, { chairs: false, lifePath: 2, equip: false }), w = g.world; w.coins = 10_000_000;
  const sent: Command[] = []; const manage = createManagementPolicy(g, command => { sent.push(command); must(g, command); });
  for (let i = 0; i < 80; i++) manage();
  const kinds = new Set(sent.map(c => c.type)); assert.ok(kinds.has('buyChair'), 'seats first'); assert.ok(kinds.has('upgradeTable') && kinds.has('upgradeChair'), `bought ${[...kinds].join(', ')}`);
  assert.ok(sent.findIndex(c => c.type === 'upgradeTable') > sent.map(c => c.type).lastIndexOf('buyChair'), 'every seat is bought before the first level');
  assert.ok(w.tables.some(t => t.level >= 2) && w.tables.some(t => (t.chairLevel ?? 1) >= 2));
  assert.ok(w.tables.every(t => t.level <= 3 && (t.chairLevel ?? 1) <= 3), 'LP2: no Lv4 table, no chair beyond Lv3');
});
