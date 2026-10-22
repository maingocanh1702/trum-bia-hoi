import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import seed from '../../../docs/config/economy.tbh.json';
import capacityModel from '../../../docs/config/legacy/economy-2.0.4.json';
import legacy from '../../../docs/config/legacy/economy-1.7.3.json';
import { Game, config, loadConfig, decodeSave, encodeSave, kickTableQuote, kickTableRule, validEnvelope, validReplayEnvelope, currentGuests, restockQuote, DISHES, WEATHER, type Command, type LoggedCommand, type Table } from '../src';
import { serveNext } from '../sim/policy';
import { capacityConfig } from './fixtures/capacity-model';
import { steadyDemand } from './fixtures/steady-demand';

// Wave 3 "Mời về" (plan section 6 `fun-kick-table`, FEEDBACK II.3, D3; brief B7). kickTable {tableId, maxCost} sends home a table whose guests linger after their
// tray was served: the group sips its served round (`consuming`) or only a Chi Pheo still keeps the table (`occupied`). The price, from the config only:
// sum over the guests of round(gross of the guest's latest order x kickTable.feeRate x customerTypes[type].leavePenaltyMult) (VIP x10, Chi Pheo 0), paid from
// the wallet and recorded as spent; reputation -kickTable.repPerGuest per guest, never scaled by k; the guests are not lost (no customer_left, no -5, no
// lostStreak); the table goes to cleaning and seats the next group. Rules stay 28: the command needs the `kickTable` section, so a snapshot without it is the
// earlier game byte for byte (the rules-28 history recorded by the S6 engine on JSON 2.1.0 below). Every state change here is a real command or clock advance.
type Seed = typeof seed;
const T0 = Date.parse('2026-10-22T10:00:00+07:00');
const send = (g: Game, command: Command, key = `kt-${g.log.length}`) => g.command({ command, at: g.world.now, idempotencyKey: key });
const must = (g: Game, command: Command) => { const r = send(g, command); assert.ok(r.ok, `${command.type}: ${r.reason}`); return r; };
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const kick = (g: Game, table: Table, maxCost = Number.MAX_SAFE_INTEGER, key?: string) => send(g, { type: 'kickTable', tableId: table.id, maxCost }, key);
const LINGERING = ['consuming', 'occupied'];
/** Only these guest types arrive, with these relative weights. */
const guests = (raw: Seed, weights: Record<string, number>) => { for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = weights[key] ?? 0; };
/** A seat-model shop on the bundled seed: `tables` tables (with their second chair from four on), sunny weather, no rush, steady demand, a wallet for real purchases. */
function shop(patch?: (raw: Seed) => void, { tables = 4, coinsBase = 400000, rngSeed = 42 }: { tables?: number; coinsBase?: number; rngSeed?: number } = {}) {
  const raw = structuredClone(seed);
  raw.shift.startingCoinsBase = coinsBase;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0; raw.onboarding.enabled = false;
  steadyDemand(raw);
  patch?.(raw);
  const g = new Game(loadConfig(raw), rngSeed, T0);
  while (g.world.tables.length < tables) must(g, { type: 'buyTable' });
  if (tables >= raw.upgrades.table.chairsAfterTables) for (const table of g.world.tables) must(g, { type: 'buyChair', tableId: table.id });
  return g;
}
/** Keep the shelves stocked and (unless told not to) serve every ready tray, 100 ms at a time, until `stop` holds or `ms` of game time passed. */
function play(g: Game, ms: number, { serve = true, stop }: { serve?: boolean; stop?: () => unknown } = {}) {
  const end = g.world.now + ms;
  while (g.world.now < end) {
    for (const dish of DISHES) if (restockQuote(g.world, g.config, dish, 'bulk').ok) send(g, { type: 'restock', dish, mode: 'bulk' });
    if (serve) serveNext(g, command => { send(g, command); });
    g.advance(g.world.now + 100);
    if (stop?.()) return true;
  }
  return false;
}
const find = (g: Game, pick: (t: Table) => boolean) => g.world.tables.find(pick);
/** The fee of one guest as FEEDBACK II.3 writes it, restated from the config for the assertions. */
const fee = (g: Game, table: Table, customerId: string) => {
  const gross = table.order!.items.filter(i => i.customerId === customerId).reduce((sum, i) => sum + seed.menu[i.dish].price, 0);
  const type = table.group!.customers.find(x => x.id === customerId)!.type;
  return Math.round(gross * seed.kickTable.feeRate * seed.customerTypes[type].leavePenaltyMult);
};
const s6Fixture = () => JSON.parse(readFileSync(new URL('./fixtures/seat-2.1.0-v28.json', import.meta.url), 'utf8')) as { source: string; worldSha256: string; save: string };
const s6Raw = () => structuredClone(JSON.parse(s6Fixture().save).config);
const s5Raw = () => structuredClone(JSON.parse(JSON.parse(readFileSync(new URL('./fixtures/seat-2.0.23-v28.json', import.meta.url), 'utf8')).save).config);

test('a rules-28 history recorded on JSON 2.1.0 by the S6 engine replays byte for byte and re-encodes unchanged; on that pin no table can be sent home', () => {
  const fixture = s6Fixture(), saved = JSON.parse(fixture.save);
  assert.equal(fixture.source, '7186ab1', 'recorded by the S6 engine, before this slice');
  assert.equal(saved.config._meta.version, '2.1.0'); assert.equal(Object.hasOwn(saved.config, 'kickTable'), false, 'the S5/S6 content of 2.1.0 has no kickTable section');
  assert.ok(saved.log.every((e: LoggedCommand) => e.rulesVersion === 28));
  const g = decodeSave(fixture.save);
  assert.equal(sha(g.world), fixture.worldSha256, 'the history replays to the world the S6 engine recorded');
  assert.equal(encodeSave(g), JSON.stringify(saved), 'and re-encodes byte for byte');
  const kinds = new Set(g.world.events.map(e => e.type));
  for (const need of ['table_occupied', 'order_served', 'table_upgraded', 'chair_upgraded', 'shift_closed']) assert.ok(kinds.has(need), `the recorded history exercises ${need}`);
  assert.equal(kickTableRule(g.config.values), null);
  // The save plays on on its own pin: rested, it opens shift 4 and its lingering tables have no "Mời về".
  g.advance(g.world.now + Math.ceil((g.config.raw.shift.durationMs - g.world.staminaMs) / g.config.raw.shift.regenRate));
  must(g, { type: 'startShift' }); assert.equal(g.config.version, '2.1.0'); assert.equal(kickTableRule(g.config.values), null);
  assert.ok(play(g, 240000, { stop: () => find(g, t => LINGERING.includes(t.state)) }), 'a table lingers on the S6 pin');
  const table = find(g, t => LINGERING.includes(t.state))!, before = sha(g.world);
  assert.deepEqual(kickTableQuote(g.world, g.config, table), { guests: [], cost: null, reputation: 0, reason: 'kickTableUnavailable', ok: false });
  assert.deepEqual(kick(g, table), { ok: false, reason: 'kickTableUnavailable' });
  assert.equal(sha(g.world), before, 'a refused kick changes nothing in the world');
});

test('the S6 save adopts the bundled 2.1.1 at its next opening (a newer label, not a second content of 2.1.0): its tables can then be sent home, and the history replays byte for byte', () => {
  // Owner call 1 (the founder, 2026-10-22): the price moved to feeRate 0.5, a ninth content, so the label went to 2.1.1 (DECISIONS `## 07 · owner calls 2026-10-22`).
  // Until then the bundle was a second content of 2.1.0 and this save could never adopt it (configVersionConflict): it kept its pin and never offered "Mời về".
  const g = decodeSave(s6Fixture().save);
  g.advance(g.world.now + Math.ceil((g.config.raw.shift.durationMs - g.world.staminaMs) / g.config.raw.shift.regenRate));
  assert.equal(g.config.version, '2.1.0'); assert.equal(config.version, '2.1.1', 'the bundle carries a newer label than the pin');
  // A different content under the SAME label is still refused: the content stage 07 shipped as 2.1.0 (with the section, feeRate 1.5) cannot replace the S6 pin.
  const shipped = structuredClone(config.raw); shipped._meta.version = '2.1.0'; shipped._meta.date = '2026-10-20'; shipped.kickTable.feeRate = 1.5;
  assert.deepEqual(g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'open-same-label' }, loadConfig(shipped)), { ok: false, reason: 'configVersionConflict' },
    'the engine refuses a second content under one label');
  assert.equal(g.world.phase, 'resting'); assert.equal(kickTableRule(g.config.values), null, 'the save still runs its own S6 content');
  // The browser hands the bundle to the next opening because 2.1.1 is numerically newer than the pin (apps/web/src/local.ts `openingConfig`): accepted.
  must(g, { type: 'startShift' }); assert.equal(g.world.shift!.configVersion, '2.1.0', 'without the bundle the save opens on its own pin, as before');
  const h = decodeSave(s6Fixture().save);
  h.advance(h.world.now + Math.ceil((h.config.raw.shift.durationMs - h.world.staminaMs) / h.config.raw.shift.regenRate));
  assert.ok(h.command({ command: { type: 'startShift' }, at: h.world.now, idempotencyKey: 'open-bundle' }, config).ok, 'the newer bundle opens the next shift');
  assert.equal(h.world.shift!.configVersion, '2.1.1'); assert.deepEqual(kickTableRule(h.config.values), config.values.kickTable, 'and brings kickTable at the founder\'s price');
  assert.ok(play(h, 240000, { stop: () => find(h, t => LINGERING.includes(t.state)) }), 'a table lingers on the adopted 2.1.1');
  const table = find(h, t => LINGERING.includes(t.state))!, q = kickTableQuote(h.world, h.config, table);
  assert.ok(q.ok, `${q.reason}`); assert.deepEqual(kick(h, table, q.cost!), { ok: true, amount: q.cost }, 'its guests can be sent home');
  const again = decodeSave(encodeSave(h));
  assert.equal(sha(again.world), sha(h.world), 'the history (three shifts on the S6 pin, one on 2.1.1 with a send-home) replays to the same world');
  assert.equal(encodeSave(again), encodeSave(h), 'and re-encodes byte for byte');
});

test('the bundled seed carries kickTable {feeRate 0.5, repPerGuest 2} as a Tier A section that k does not scale, under the label 2.1.1', () => {
  // feeRate: the founder's answer to owner call 1 (2026-10-22): the plan's candidate 0.5, with the +10 % income rule read on the income NET of the kick fees
  // (sim/kick-table.ts: net +8.85 % | +9.06 % on seeds 42 | 99). Wave 3 had read the rule on gross income and sealed 1.5 under 2.1.0 (DECISIONS `## 06 ·`).
  assert.equal(seed.kickTable.feeRate, 0.5); assert.equal(seed.kickTable.repPerGuest, 2);
  assert.equal(typeof seed.kickTable._rule, 'string');
  assert.deepEqual([config.values.kickTable.feeRate, config.values.kickTable.repPerGuest], [0.5, 2], 'a rate and a count of reputation: neither ends in Base, k = 2.5 scales neither');
  assert.ok(seed._meta.governance.tiers.A.sections.includes('kickTable'), 'Tier A: dual approval, next day');
  for (const tier of ['B', 'C'] as const) assert.equal(seed._meta.governance.tiers[tier].sections.includes('kickTable'), false);
  assert.equal(seed._meta.version, '2.1.1', 'a new content gets a new label: 2.1.0 holds eight contents of history');
  assert.deepEqual(kickTableRule(config.values), config.values.kickTable);
  assert.equal(kickTableRule(capacityConfig.values), null); assert.equal(kickTableRule(loadConfig(structuredClone(legacy)).values), null);
});

test('snapshots from before kickTable load with their bytes; every half-way shape is refused; kickTable never loosens an older shape', () => {
  const s6 = s6Raw(); assert.equal(JSON.stringify(loadConfig(s6).raw), JSON.stringify(s6), 'the S6 content of 2.1.0: raw bytes kept');
  const s5 = s5Raw(); assert.equal(JSON.stringify(loadConfig(s5).raw), JSON.stringify(s5), 'a 2.0.23 pin too');
  const full = structuredClone(seed); assert.equal(loadConfig(full).version, '2.1.1', 'the bundled seed itself');
  // The contents of 2.1.0 that carried the section (Wave 3 and stage 07, feeRate 0.5 then 1.5: browser saves and dev databases of this laptop) are complete
  // snapshots of a label older than 2.1.1, so they load with their bytes as well.
  const shipped = structuredClone(seed); shipped._meta.version = '2.1.0'; shipped._meta.date = '2026-10-20'; shipped.kickTable.feeRate = 1.5;
  assert.equal(JSON.stringify(loadConfig(shipped).raw), JSON.stringify(shipped), 'the stage-07 content of 2.1.0: raw bytes kept');
  assert.equal(kickTableRule(loadConfig(shipped).values)?.feeRate, 1.5, 'and its own price');
  // A pin labelled before 2.1.0 that already carries the section is a complete snapshot (the S3-S5 convention); loading it first must not change how the S6 pin
  // is shaped afterwards (the template cache is keyed by the groups a pin lacks, not by their labels).
  const early = s5Raw(); early.kickTable = structuredClone(seed.kickTable); early._meta.governance.tiers.A.sections.push('kickTable');
  assert.equal(kickTableRule(loadConfig(early).values)?.feeRate, seed.kickTable.feeRate);
  assert.equal(JSON.stringify(loadConfig(s6Raw()).raw), JSON.stringify(s6), 'the S6 pin still loads after it');
  const bad: [string, RegExp, () => unknown][] = [
    ['the section without its Tier A entry', /config:_meta\.governance\.tiers\.A\.sections:array/, () => { const r = s6Raw(); r.kickTable = structuredClone(seed.kickTable); return r; }],
    ['the Tier A entry without the section', /config:_meta\.governance\.tiers\.A\.sections:array/, () => { const r = s6Raw(); r._meta.governance.tiers.A.sections.push('kickTable'); return r; }],
    ['the label 2.1.1 without the section', /config::keys/, () => { const r = s6Raw(); r._meta.version = '2.1.1'; return r; }],
    ['a later label without the section', /config::keys/, () => { const r = s6Raw(); r._meta.version = '2.2.0'; return r; }],
    ['an unknown key in the section', /config:kickTable:keys/, () => { const r = structuredClone(seed) as any; r.kickTable.bogus = 1; return r; }],
    ['a missing rate', /config:kickTable:keys/, () => { const r = structuredClone(seed) as any; delete r.kickTable.feeRate; return r; }],
    ['a rate that is not a number', /config:kickTable\.feeRate:type/, () => { const r = structuredClone(seed) as any; r.kickTable.feeRate = '0.5'; return r; }],
    ['a negative rate', /negative/, () => { const r = structuredClone(seed) as any; r.kickTable.feeRate = -0.5; return r; }],
    ['a rate whose fee is no longer a safe whole number', /config:kickTable\.maximumFee:integer/, () => { const r = structuredClone(seed) as any; r.kickTable.feeRate = 1e300; return r; }],
    ['a fraction of reputation', /config:kickTable\.repPerGuest:integer/, () => { const r = structuredClone(seed) as any; r.kickTable.repPerGuest = 1.5; return r; }],
    ['a negative reputation cost', /negative|config:kickTable\.repPerGuest/, () => { const r = structuredClone(seed) as any; r.kickTable.repPerGuest = -2; return r; }],
  ];
  for (const [name, refusal, make] of bad) assert.throws(() => loadConfig(make()), refusal, name);
  for (const [name, base] of [['1.7.3', legacy], ['2.0.4', capacityModel]] as const) {
    const old = structuredClone(base) as any; old.kickTable = structuredClone(seed.kickTable);
    assert.throws(() => loadConfig(old), /config::keys/, `${name} + the section`);
  }
});

test('only a table whose guests linger after their tray accepts: seating, waiting (pending or in grace), cleaning, empty and an unknown table are refused', () => {
  const g = shop(raw => { guests(raw, { thuong: 1 }); raw.spawn.pPair = 1; raw.demandMix.pSecondRound = 0; }), w = g.world;
  must(g, { type: 'startShift' });
  const seen: Record<string, ReturnType<typeof kick>> = {};
  assert.equal(kick(g, { ...w.tables[0], id: 'table-none' }).reason, 'tableGone');
  assert.ok(play(g, 60000, { serve: false, stop: () => find(g, t => t.state === 'seating') }));
  let table = find(g, t => t.state === 'seating')!; seen.seating = kick(g, table);
  assert.ok(play(g, 60000, { serve: false, stop: () => table.state === 'waiting' && table.order!.state === 'pending' }));
  seen.pending = kick(g, table);
  assert.ok(play(g, 60000, { serve: false, stop: () => table.order!.state === 'grace' && table.order!.items.every(i => i.state === 'ready') }));
  seen.grace = kick(g, table);
  assert.equal(table.state, 'waiting'); assert.equal(table.order!.state, 'grace', 'a refused kick leaves the order in grace');
  must(g, { type: 'serve', tableId: table.id, orderId: table.order!.id });
  assert.equal(table.state, 'consuming');
  seen.consuming = kick(g, table);
  assert.equal(table.state, 'cleaning');
  seen.cleaning = kick(g, table);
  g.advance(w.now + g.config.values.runtime.tableCleaningMs);
  table = find(g, t => t.state === 'empty') ?? (() => { assert.ok(play(g, 60000, { stop: () => find(g, t => t.state === 'empty') })); return find(g, t => t.state === 'empty')!; })();
  seen.empty = kick(g, table);
  for (const state of ['seating', 'pending', 'grace', 'cleaning', 'empty']) assert.deepEqual(seen[state], { ok: false, reason: 'tableNotLingering' }, state);
  assert.equal(seen.consuming.ok, true, 'consuming: the group sits on its served tray');
  // The fourth state with guests, occupied: a Chi Pheo who stayed after his round (D3) goes home too.
  const h = shop(raw => { guests(raw, { chipheo: 1 }); raw.spawn.pPair = 0; }), x = h.world;
  must(h, { type: 'startShift' });
  assert.ok(play(h, 240000, { stop: () => find(h, t => t.state === 'occupied') }), 'a Chi Pheo occupies a table');
  const occupied = find(h, t => t.state === 'occupied')!;
  assert.deepEqual(currentGuests(occupied).map(c => c.type), ['chipheo']);
  assert.equal(kick(h, occupied).ok, true, 'occupied'); assert.equal(occupied.state, 'cleaning'); assert.equal(x.phase, 'open');
});

test('the price is feeRate x the gross of each guest\'s latest order x the type\'s leavePenaltyMult: VIP x10 (a pair with a VIP pays both), the reputation -repPerGuest per guest', () => {
  const g = shop(raw => { guests(raw, { thuong: 1, vip: 1 }); raw.spawn.pPair = 1; raw.demandMix.pSecondRound = 0; raw.upgrades.table.orderShape.pair.pMoi = 1; }), w = g.world;
  must(g, { type: 'startShift' });
  assert.ok(play(g, 240000, { stop: () => find(g, t => t.state === 'consuming' && t.group!.customers.some(c => c.type === 'vip') && t.group!.customers.some(c => c.type === 'thuong')) }), 'a pair with a VIP sits on its tray');
  const table = find(g, t => t.state === 'consuming' && t.group!.customers.some(c => c.type === 'vip') && t.group!.customers.some(c => c.type === 'thuong'))!;
  const [ordinary, vip] = ['thuong', 'vip'].map(type => table.group!.customers.find(c => c.type === type)!);
  const q = kickTableQuote(w, g.config, table);
  assert.deepEqual(q.guests.map(x => [x.customerId, x.type, x.fee]), [...table.group!.customers].map(c => [c.id, c.type, fee(g, table, c.id)]));
  assert.equal(q.guests.find(x => x.type === 'vip')!.fee, Math.round(table.order!.items.filter(i => i.customerId === vip.id).reduce((s, i) => s + seed.menu[i.dish].price, 0) * 0.5 * 10), 'VIP: x10');
  assert.equal(q.guests.find(x => x.type === 'thuong')!.fee, Math.round(table.order!.items.filter(i => i.customerId === ordinary.id).reduce((s, i) => s + seed.menu[i.dish].price, 0) * 0.5), 'an ordinary guest: x1');
  assert.equal(q.cost, fee(g, table, ordinary.id) + fee(g, table, vip.id)); assert.equal(q.reputation, 2 * 2, '2 guests x repPerGuest 2, not x k');
  const coins = w.coins, rep = w.reputation, spent = w.shift!.stats.spent;
  assert.deepEqual(kick(g, table, q.cost!), { ok: true, amount: q.cost });
  assert.equal(w.coins, coins - q.cost!, 'paid from the wallet'); assert.equal(w.shift!.stats.spent, spent + q.cost!, 'recorded as spent');
  assert.equal(w.reputation, rep - 4, 'reputation -2 per guest (the shop had more than 4)'); assert.ok(rep >= 4);
});

test('the latest order prices the kick: a lai rai table in its second round pays for that round, not for the whole visit', () => {
  const g = shop(raw => { guests(raw, { ngoily: 1 }); raw.spawn.pPair = 0; }), w = g.world;
  must(g, { type: 'startShift' });
  assert.ok(play(g, 600000, { stop: () => find(g, t => t.state === 'consuming' && t.roundsServed === 2) }), 'a lai rai guest sits on its second tray');
  const table = find(g, t => t.state === 'consuming' && t.roundsServed === 2)!, guest = table.group!.customers[0];
  const orders = w.events.filter(e => e.type === 'order_placed' && e.data.tableId === table.id).map(e => String(e.data.orderId));
  assert.equal(orders.at(-1), table.order!.id, 'the table holds the order of its latest round');
  const q = kickTableQuote(w, g.config, table);
  assert.equal(q.cost, fee(g, table, guest.id)); assert.equal(q.guests.length, 1); assert.equal(q.reputation, 2);
  const r = kick(g, table); assert.deepEqual(r, { ok: true, amount: q.cost });
  assert.equal(w.events.filter(e => e.type === 'table_kicked').at(-1)!.data.orderId, table.order!.id);
});

test('D3: a Chi Pheo who keeps a table goes home for 0 coins and -2 reputation', () => {
  const g = shop(raw => { guests(raw, { thuong: 3, chipheo: 1 }); raw.spawn.pPair = 0; }), w = g.world;
  must(g, { type: 'startShift' });
  assert.ok(play(g, 600000, { stop: () => w.reputation >= 2 && find(g, t => t.state === 'occupied') }), 'an occupied table, with reputation to lose');
  const table = find(g, t => t.state === 'occupied')!;
  const q = kickTableQuote(w, g.config, table);
  assert.deepEqual(q.guests.map(x => [x.type, x.fee]), [['chipheo', 0]]); assert.equal(q.cost, 0); assert.equal(q.reputation, 2);
  const coins = w.coins, rep = w.reputation;
  assert.deepEqual(kick(g, table, 0), { ok: true, amount: 0 }, 'maxCost 0 is enough: he costs nothing');
  assert.equal(w.coins, coins); assert.equal(w.reputation, rep - 2);
  assert.deepEqual(w.events.filter(e => e.type === 'table_kicked').at(-1)!.data, { shiftId: w.shift!.id, tableId: table.id, groupId: table.group!.id, orderId: table.order!.id, count: 1, cost: 0, reputation: 2, vip: 0, chipheo: 1 });
});

test('a price that moved is refused with kickCostChanged before the wallet; a short wallet with notEnoughCoins; neither costs anything', () => {
  // One table, one chair, an empty wallet, nearly only VIPs (the signboard check wants one other type): a served VIP pays 2.7 x his gross (payment + the tip
  // x10) and his kick costs feeRate x 10 = 5 x his gross (0.5, the founder's price), so the wallet of his own serve never covers it.
  const g = shop(raw => { guests(raw, { vip: 1, thuong: 0.001 }); raw.spawn.pPair = 0; }, { tables: 1, coinsBase: 0 }), w = g.world;
  must(g, { type: 'startShift' });
  const vipSits = () => find(g, t => t.state === 'consuming' && t.group!.customers[0].type === 'vip');
  assert.ok(play(g, 120000, { stop: vipSits }));
  const table = vipSits()!, q = kickTableQuote(w, g.config, table);
  assert.ok(q.cost! > w.coins, `the wallet ${w.coins} is short of ${q.cost}`); assert.equal(q.reason, 'notEnoughCoins'); assert.equal(q.ok, false);
  const before = sha(w);
  assert.deepEqual(kick(g, table, q.cost! - 1), { ok: false, reason: 'kickCostChanged' }, 'maxCost below the real price: the price moved');
  assert.deepEqual(kick(g, table, q.cost!), { ok: false, reason: 'notEnoughCoins' });
  assert.equal(sha(w), before, 'no coin, no reputation, no table state moved');
  assert.equal(table.state, 'consuming');
});

test('idempotent: the same key answers the same result and charges once; another key on the cleaned table is refused', () => {
  const g = shop(raw => { guests(raw, { thuong: 1 }); raw.spawn.pPair = 1; }), w = g.world;
  must(g, { type: 'startShift' });
  assert.ok(play(g, 240000, { stop: () => find(g, t => t.state === 'consuming') }));
  const table = find(g, t => t.state === 'consuming')!, q = kickTableQuote(w, g.config, table);
  const first = kick(g, table, q.cost!, 'kick-once'), coins = w.coins, rep = w.reputation, events = w.events.length, log = g.log.length;
  assert.deepEqual(first, { ok: true, amount: q.cost });
  assert.deepEqual(kick(g, table, q.cost!, 'kick-once'), first, 'a retry answers the recorded result');
  assert.deepEqual([w.coins, w.reputation, w.events.length, g.log.length], [coins, rep, events, log], 'and charges nothing twice');
  assert.deepEqual(kick(g, table, q.cost! + 1, 'kick-once'), { ok: false, reason: 'idempotencyConflict' }, 'the same key with another command is a conflict');
  assert.deepEqual(kick(g, table, q.cost!, 'kick-again'), { ok: false, reason: 'tableNotLingering' }, 'the table is being cleaned');
  assert.equal(w.coins, coins);
});

test('the guests are not lost: no customer_left, no -5, no lostStreak; the coins are spent, the table is cleaned and seats the next queued group', () => {
  const g = shop(raw => { guests(raw, { ngoily: 1 }); raw.spawn.pPair = 1; raw.spawn.baseMs = raw.rush.none.floorMs = 2000; }), w = g.world;
  must(g, { type: 'startShift' });
  assert.ok(play(g, 600000, { stop: () => w.queue.length > 0 && w.reputation >= 4 && find(g, t => t.state === 'consuming' && t.capacity >= w.queue[0].customers.length) }), 'a lingering pair while a group waits');
  const table = find(g, t => t.state === 'consuming' && t.capacity >= w.queue[0].customers.length)!, waiting = w.queue[0].id;
  const lost = w.shift!.stats.lost, streak = w.lostStreak, rep = w.reputation, spent = w.shift!.stats.spent, from = w.events.length, q = kickTableQuote(w, g.config, table);
  assert.equal(kick(g, table).ok, true);
  const events = w.events.slice(from);
  assert.deepEqual(events.map(e => e.type).slice(0, 2), ['table_kicked', 'table_cleaning'], 'sent home, then cleaned');
  assert.equal(events.some(e => e.type === 'customer_left' || e.type === 'customer_dismissed' || e.type === 'order_expired'), false, 'nobody left angry, nobody was dismissed by a close');
  assert.equal(w.shift!.stats.lost, lost); assert.equal(w.lostStreak, streak);
  assert.equal(w.reputation, rep - q.reputation, `-${seed.kickTable.repPerGuest} per guest, not ${seed.reputation.customerLeft}`);
  assert.equal(w.shift!.stats.spent, spent + q.cost!);
  assert.equal(table.state, 'cleaning'); assert.equal(table.until, w.now + g.config.values.runtime.tableCleaningMs);
  assert.ok(w.glasses.every(glass => glass.itemId === null || !table.order!.items.some(i => i.id === glass.itemId)), 'the glasses of the table went to the wash');
  play(g, g.config.values.runtime.tableCleaningMs + 100, { serve: false });
  assert.ok(w.events.slice(from).some(e => e.type === 'group_seated' && e.data.tableId === table.id && e.data.groupId === waiting), 'the waiting group sits down at the freed table');
});

test('the reputation never goes below zero: the event records what was really taken', () => {
  const g = shop(raw => { guests(raw, { chipheo: 1 }); raw.spawn.pPair = 0; }), w = g.world;
  must(g, { type: 'startShift' });
  assert.ok(play(g, 240000, { stop: () => w.reputation < 2 && find(g, t => LINGERING.includes(t.state)) }), 'a lingering Chi Pheo while the shop has less reputation than the price');
  const table = find(g, t => LINGERING.includes(t.state))!, rep = w.reputation, q = kickTableQuote(w, g.config, table);
  assert.ok(q.reputation > rep);
  assert.equal(kick(g, table).ok, true);
  assert.equal(w.reputation, 0); assert.equal(w.events.filter(e => e.type === 'table_kicked').at(-1)!.data.reputation, rep);
});

test('kickTableQuote answers what kickTable will, at every sampled moment of two busy shifts: the same refusal, the same price', () => {
  const reasons = new Map<string, number>();
  // A poor one-table shop of mostly VIPs (their kick is dearer than what they paid) and a rich alley of four pairs of every guest type, Chi Pheo included.
  const shops = [
    shop(raw => { guests(raw, { vip: 2, thuong: 1 }); raw.spawn.pPair = 0; }, { tables: 1, coinsBase: 0 }),
    shop(raw => { guests(raw, { thuong: 2, ngoily: 1, vip: 1, chipheo: 1 }); raw.spawn.baseMs = raw.rush.none.floorMs = 3000; }),
  ];
  for (const [n, g] of shops.entries()) {
    const w = g.world;
    must(g, { type: 'startShift' });
    for (let sample = 0; sample < 40 && w.phase === 'open'; sample++) {
      play(g, 3000);
      for (const table of w.tables) {
        const before = sha(w), q = kickTableQuote(w, g.config, table);
        assert.equal(sha(w), before, 'the quote is pure');
        const coins = w.coins, r = kick(g, table, q.cost ?? 0, `parity-${n}-${sample}-${table.id}`); // the real command, sent with the price the quote showed
        assert.equal(r.ok, q.ok, `${table.state}: ${q.reason}`);
        if (q.ok) { assert.equal(r.amount, q.cost); assert.equal(w.coins, coins - q.cost!); } else { assert.equal(r.reason, q.reason); assert.equal(sha(w), before, 'a refusal moves nothing'); }
        reasons.set(q.reason ?? 'ok', (reasons.get(q.reason ?? 'ok') ?? 0) + 1);
      }
    }
  }
  for (const reason of ['ok', 'tableNotLingering', 'notEnoughCoins']) assert.ok(reasons.get(reason), `the sweep met ${reason} (${[...reasons]})`);
});

test('a snapshot without the section refuses kickTable: a capacity pin at rules 28 (an old save) and a copy of the seed without it', () => {
  for (const [name, c] of [['capacity pin', capacityConfig], ['S6 content of 2.1.0', loadConfig(s6Raw())]] as const) {
    const g = new Game(c, 42, T0), w = g.world;
    must(g, { type: 'startShift' });
    assert.ok(play(g, 240000, { stop: () => find(g, t => LINGERING.includes(t.state)) }), `${name}: a table lingers`);
    const table = find(g, t => LINGERING.includes(t.state))!, before = sha(w);
    assert.equal(kickTableQuote(w, g.config, table).reason, 'kickTableUnavailable', name);
    assert.deepEqual(kick(g, table), { ok: false, reason: 'kickTableUnavailable' }, name);
    assert.equal(sha(w), before, `${name}: nothing moved`);
  }
});

test('kickTable is a rules-28 command: the envelope needs a table and a whole maxCost, and replay refuses an entry below rules 28', () => {
  const envelope = (command: unknown) => ({ idempotencyKey: 'k', at: 0, command });
  assert.equal(validEnvelope(envelope({ type: 'kickTable', tableId: 'table-1', maxCost: 0 })), true);
  for (const command of [{ type: 'kickTable', tableId: 'table-1' }, { type: 'kickTable', tableId: 'table-1', maxCost: -1 }, { type: 'kickTable', tableId: 'table-1', maxCost: 1.5 },
    { type: 'kickTable', tableId: 5, maxCost: 0 }, { type: 'kickTable', maxCost: 0 }]) {
    assert.equal(validEnvelope(envelope(command)), false, JSON.stringify(command)); assert.equal(validReplayEnvelope(envelope(command)), false);
  }
  const g = new Game(capacityConfig, 42, T0);
  const entry: LoggedCommand = { idempotencyKey: 'old-kick', at: T0, command: { type: 'kickTable', tableId: g.world.tables[0].id, maxCost: 0 }, result: { ok: false, reason: 'kickTableUnavailable' }, configVersion: capacityConfig.version, rulesVersion: 27 };
  assert.throws(() => g.replay(entry, capacityConfig), /replay:rulesVersion/);
});

test('a history that sends tables home replays byte for byte', () => {
  const g = shop(raw => { guests(raw, { thuong: 2, ngoily: 1, vip: 1, chipheo: 1 }); raw.spawn.baseMs = raw.rush.none.floorMs = 3000; }), w = g.world;
  must(g, { type: 'startShift' });
  let kicks = 0;
  for (let step = 0; step < 120 && w.phase === 'open'; step++) {
    play(g, 2000);
    const table = find(g, t => kickTableQuote(w, g.config, t).ok);
    if (table && w.queue.length) { must(g, { type: 'kickTable', tableId: table.id, maxCost: kickTableQuote(w, g.config, table).cost! }); kicks++; }
  }
  assert.ok(kicks >= 3, `${kicks} kicks`);
  const decoded = decodeSave(encodeSave(g));
  assert.equal(sha(decoded.world), sha(w)); assert.equal(encodeSave(decoded), encodeSave(g));
});
