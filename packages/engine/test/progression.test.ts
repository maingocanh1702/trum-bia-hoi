import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, lifePathStatus, requirementStatus, lifePathRewardQuote, unlockQuote, kickAllQuote, customerValue, encodeSave, decodeSave, type Command, type Result, type Economy } from '../src';
const saved = readFileSync(new URL('./fixtures/legacy-progression-v5.json', import.meta.url), 'utf8');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `progress-${g.log.length}` });
function reachLP2() {
  const g = decodeSave(saved); send(g, { type: 'activity', active: true });
  assert.equal(send(g, { type: 'buyUnlock', item: 'phone' }).ok, true);
  assert.equal(send(g, { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: kickAllQuote(g.world, g.config).cost }).ok, true);
  assert.equal(send(g, { type: 'upgrade', kind: 'stall' }).ok, true);
  assert.equal(g.world.lifePath, 2); return g;
}

test('actual v5 history stays unchanged; current progression unlocks phone and LP2 before any reward claim', () => {
  const g = decodeSave(saved), expected = JSON.parse(readFileSync(new URL('./fixtures/legacy-progression-v5-expected.json', import.meta.url), 'utf8'));
  assert.equal(g.world.lifePath, expected.lifePath); assert.equal(g.world.nextId, expected.nextId); assert.equal(g.world.coins, expected.coins); assert.equal(g.world.lifetimeEarned, expected.lifetime);
  assert.deepEqual(g.world.events, JSON.parse(saved).events); assert.deepEqual(g.log.at(-1)!.result, expected.result);
  send(g, { type: 'activity', active: true }); assert.equal(g.world.lifePath, 1);
  const reached = g.world.events.filter(e => e.type === 'life_path_level_reached'); assert.equal(reached.length, 1); assert.equal(reached[0].data.level, 'LP1');
  const lp2 = reachLP2(); assert.deepEqual(lp2.world.claimedLifePaths, []); assert.equal(unlockQuote(lp2.world, lp2.config, 'qr').ok, true);
  assert.deepEqual(decodeSave(encodeSave(lp2)).world, lp2.world); assert.equal(lp2.log.at(-1)!.rulesVersion, 6);
  assert.deepEqual(lifePathStatus(lp2.world, lp2.config).rows.filter(r => r.claimable).map(r => r.id), ['LP1', 'LP2']);
  const lifetime = lp2.world.lifetimeEarned, season = lp2.world.seasonEarned, day = structuredClone(lp2.world.dayEarned);
  assert.equal(send(lp2, { type: 'claimLifePath', level: 2 }).ok, true); assert.equal(lp2.world.badgeShards, 1);
  assert.equal(send(lp2, { type: 'claimLifePath', level: 1 }).ok, true); assert.deepEqual(lp2.world.claimedLifePaths, [2, 1]);
  assert.equal(lp2.world.lifetimeEarned, lifetime); assert.equal(lp2.world.seasonEarned, season); assert.deepEqual(lp2.world.dayEarned, day);
  assert.deepEqual(decodeSave(encodeSave(lp2)).world, lp2.world);
});

test('all configured subsidiary gates are enforced and kitchen cannot make the five-level core device goal unreachable', () => {
  const w = structuredClone(new Game().world); w.lifetimeEarned = config.values.lifePath.at(-1)!.lifetimeBase;
  const level = () => lifePathStatus(w, config).level;
  assert.equal(level(), 0); w.dogLevel = 1; assert.equal(level(), 1);
  w.unlocks.push('phone'); w.equipment.stall = 3; assert.equal(level(), 2);
  w.unlocks.push('qr'); assert.equal(level(), 2);
  Object.assign(w.equipment, { keg: 3, washer: 3, cooler: 3 }); assert.equal(w.equipment.kitchen, 0); assert.equal(level(), 3);
  w.unlocks.push('flyer'); assert.equal(level(), 3); w.peakLeague = 'bach_kim'; assert.equal(level(), 4);
  w.unlocks.push('signboard'); assert.equal(level(), 4); w.peakLeague = 'hong_ngoc'; assert.equal(level(), 5);
  Object.assign(w.equipment, { keg: 5, washer: 5, cooler: 5 }); w.peakLeague = 'kim_cuong'; assert.equal(level(), 5);
  w.equipment.stall = 5; assert.equal(level(), 6); w.peakLeague = 'huyen_thoai'; assert.equal(level(), 6);
  w.tables[0].capacity = 6; assert.equal(level(), 7);
  w.lifePath = 7; w.coins = 0; w.lifetimeEarned = 0; assert.equal(level(), 7);
  assert.equal(requirementStatus(w, config, 'equipment=5').met, true); assert.equal(requirementStatus(w, config, 'stall=5').met, true);
});

test('every configured reward uses the same overflow conversion, counts repeated shards and cannot be claimed twice', () => {
  const g = new Game(), w = g.world; w.lifePath = 7; w.coins = 0; w.equipment.stall = 5; w.equipment.kitchen = 4;
  for (const dish of Object.keys(w.inventory) as (keyof typeof w.inventory)[]) w.inventory[dish] = 150;
  const expected = [12754, 25000, 50616, 125000, 250616, 626416, 1251416];
  let total = 0;
  for (let level = 1; level <= 7; level++) {
    const quote = lifePathRewardQuote(w, g.config, level)!; assert.equal(quote.amount, expected[level - 1]);
    const command = { type: 'claimLifePath', level } as const, envelope = { command, at: w.now, idempotencyKey: `reward-${level}` };
    assert.deepEqual(g.command(envelope), { ok: true, amount: expected[level - 1] }); total += expected[level - 1]; assert.equal(w.coins, total);
    const claimed = structuredClone(w); assert.equal(g.command(envelope).ok, true); assert.deepEqual(w, claimed);
    assert.deepEqual(send(g, command), { ok: false, reason: 'rewardUnavailable' }); assert.deepEqual(w, claimed);
  }
  assert.equal(w.badgeShards, 4); assert.equal(w.cosmeticTokens, 2); assert.equal(w.lifetimeEarned, 0); assert.equal(w.seasonEarned, 0); assert.deepEqual(w.dayEarned, {});
  assert.equal(w.events.filter(e => e.type === 'life_path_reward_claimed').length, 7);
  assert.ok(Object.values(w.inventory).every(n => n === 150));
});

test('unreached, malformed and unsafe claims leave all reward balances and stamps unchanged', () => {
  const g = reachLP2(), w = g.world;
  for (const level of [0, -1, NaN, 1.5, 3, 999]) { const before = structuredClone(w); assert.equal(send(g, { type: 'claimLifePath', level }).ok, false); assert.deepEqual(w, before); }
  w.coins = Number.MAX_SAFE_INTEGER; let before = structuredClone(w);
  assert.deepEqual(send(g, { type: 'claimLifePath', level: 1 }), { ok: false, reason: 'rewardOverflow' }); assert.deepEqual(w, before);
  w.coins = 0; w.badgeShards = Number.MAX_SAFE_INTEGER; before = structuredClone(w);
  assert.deepEqual(send(g, { type: 'claimLifePath', level: 2 }), { ok: false, reason: 'rewardOverflow' }); assert.deepEqual(w, before);
});

test('phone and QR validate gates, current coins and exact identity; QR changes real whole-table tips and replay', () => {
  const locked = new Game(); const money = locked.world.coins;
  assert.deepEqual(send(locked, { type: 'buyUnlock', item: 'phone' }), { ok: false, reason: 'featureLocked' }); assert.equal(locked.world.coins, money); assert.deepEqual(locked.world.unlocks, []);
  assert.equal(locked.world.events.at(-1)!.type, 'life_path_gate_blocked');
  const g = reachLP2(); const balance = g.world.coins;
  assert.deepEqual(send(g, { type: 'buyUnlock', item: 'phone' }), { ok: false, reason: 'unlockOwned' }); assert.equal(g.world.coins, balance);
  const old = decodeSave(encodeSave(g));
  assert.deepEqual(send(g, { type: 'buyUnlock', item: 'qr' }), { ok: true, amount: 20000 }); assert.equal(g.world.coins, balance - 20000);
  assert.deepEqual(send(g, { type: 'buyUnlock', item: 'qr' }), { ok: false, reason: 'unlockOwned' });
  const results: { result: Result; value: ReturnType<typeof customerValue>[] }[] = [];
  for (const game of [old, g]) {
    game.advance(game.world.now + game.config.values.shift.durationMs / game.config.values.shift.regenRate);
    send(game, { type: 'startShift' });
    for (let i = 0; i < 200 && !game.world.tables.some(t => t.order?.state === 'pending' && t.order.items.every(item => item.state === 'ready')); i++) game.advance(game.world.now + 500);
    const table = game.world.tables.find(t => t.order?.state === 'pending' && t.order.items.every(item => item.state === 'ready'))!;
    assert.ok(table); const value = table.group!.customers.map(customer => customerValue(game.world, game.config, table.order!, customer));
    const result = send(game, { type: 'serve', tableId: table.id, orderId: table.order!.id }); assert.equal(result.ok, true); results.push({ result, value });
    assert.deepEqual(decodeSave(encodeSave(game)).world, game.world);
  }
  assert.ok(results[1].result.amount! > results[0].result.amount!); assert.ok(results[1].value.some((value, i) => value.tip > results[0].value[i].tip));
  const poor = reachLP2(); poor.world.coins = 19999; const before = structuredClone(poor.world);
  assert.deepEqual(send(poor, { type: 'buyUnlock', item: 'qr' }), { ok: false, reason: 'notEnoughCoins' }); assert.deepEqual(poor.world, before);
});

test('config rejects unknown gates/rewards, cycles, non-integral payouts and progress-counted reward sources', () => {
  for (const patch of [
    (c: Economy) => { c.lifePath[1].requires![0] = '4 seat'; },
    (c: Economy) => { c.lifePath[1].requires![0] = 'LP1'; },
    (c: Economy) => { c.lifePath[4].requires![1] = 'peak:invented'; },
    (c: Economy) => { c.lifePath[1].extra[0] = 'crate.unknown'; },
    (c: Economy) => { c.lifePath[1].rewardCoinBase = 0.5; },
    (c: Economy) => { c.crates.small.bia = Number.MAX_SAFE_INTEGER; },
    (c: Economy) => { c.lifePath[1].lifetimeBase = c.lifePath[2].lifetimeBase; },
    (c: Economy) => { c.unlocks.phone.gate = 'LP999'; },
    (c: Economy) => { c.ledgers.countedSources[0] = 'quest'; },
    (c: Economy) => { c.league.tiers[1].id = c.league.tiers[0].id; },
  ]) { const raw = structuredClone(config.raw); patch(raw); assert.throws(() => loadConfig(raw), /config:/); }
});
