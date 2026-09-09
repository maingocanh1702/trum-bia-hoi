import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, isEconomy2, leaseQuote, leaveLocationQuote, encodeSave, decodeSave, type Command } from '../src';
const send = (g: Game, command: Command, key = `lease-${g.log.length}`) => g.command({ command, at: g.world.now, idempotencyKey: key });
function game(patch?: (raw: typeof import('../../../docs/config/economy.tbh.json')) => void) {
  const raw = structuredClone(config.raw); assert.ok(isEconomy2(raw)); raw.shift.startingCoinsBase = 1000000;
  raw.lifePath[1].lifetimeBase = 1; raw.lifePath[1].requires = raw.lifePath[1].requires!.map(() => 'LP0');
  patch?.(raw); const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T04:00:00Z'));
  send(g, { type: 'startShift' }); g.advance(g.world.now + 11000);
  const table = g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).ok);
  send(g, { type: 'endShift' }); g.advance(g.world.now + 3600000);
  assert.equal(g.world.lifePath, 1); return g;
}
function rent(g: Game, locationId = 'ngo_cho', key?: string) {
  const q = leaseQuote(g.world, g.config, locationId);
  return send(g, { type: 'rentLocation', locationId, leaseId: q.leaseId, maxCost: q.cost }, key);
}
const replay = (g: Game) => assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
const leaseEvents = (g: Game) => g.world.events.filter(e => e.type.startsWith('lease_'));

test('rent prepays seven scaled daily rents plus deposit once; a failed or stale move preserves the old contract', () => {
  const g = game(), w = g.world, before = w.coins;
  const q = leaseQuote(w, g.config, 'ngo_cho'); assert.equal(q.rent, 70000); assert.equal(q.deposit, 17500); assert.equal(q.cost, 87500);
  assert.ok(rent(g, 'ngo_cho', 'first-lease').ok); assert.equal(w.coins, before - q.cost); assert.equal(w.location, 'ngo_cho');
  const signed = structuredClone(w), original = g.log.at(-1)!;
  assert.ok(g.command({ ...original, command: original.command as Command }).ok); assert.deepEqual(w, signed);
  for (const command of [
    { type: 'rentLocation', locationId: 'ben_xe', leaseId: null, maxCost: Number.MAX_SAFE_INTEGER },
    { type: 'rentLocation', locationId: 'ben_xe', leaseId: w.lease!.id, maxCost: 1 },
    { type: 'rentLocation', locationId: 'missing', leaseId: w.lease!.id, maxCost: 1 },
    { type: 'leaveLocation', leaseId: 'old' },
  ] as Command[]) { assert.equal(send(g, command).ok, false); assert.deepEqual(w, signed); }
  assert.equal(rent(g, 'pho_tay').reason, 'lifePathRequired'); assert.deepEqual(w, signed);
  assert.equal(w.lifetimeEarned, g.world.serves[0].credited); replay(g);
});

test('early switch and departure forfeit old deposit and rent; expiry at the exact boundary refunds instead', () => {
  const g = game(), w = g.world; rent(g); const first = structuredClone(w.lease!), before = w.coins;
  g.advance(w.now + 1000); const q = leaseQuote(w, g.config, 'ben_xe'); assert.ok(rent(g, 'ben_xe').ok);
  assert.equal(w.coins, before - q.cost); assert.notEqual(w.lease!.id, first.id);
  assert.equal(leaseEvents(g).find(e => e.type === 'lease_left')!.data.depositForfeited, first.deposit);
  const next = structuredClone(w.lease!); assert.ok(send(g, { type: 'leaveLocation', leaseId: next.id }).ok);
  assert.equal(w.lease, undefined); assert.equal(w.location, 'hem_nho'); assert.equal(w.coins, before - q.cost);
  rent(g); const lease = structuredClone(w.lease!), coins = w.coins;
  const result = g.command({ command: { type: 'leaveLocation', leaseId: lease.id }, at: lease.expiresAt, idempotencyKey: 'at-expiry' });
  assert.equal(result.reason, 'leaseChanged'); assert.equal(w.coins, coins + lease.deposit);
  assert.equal(leaseEvents(g).filter(e => e.type === 'lease_deposit_refunded').length, 1);
  assert.equal(w.seasonEarned, w.serves[0].credited); assert.equal(w.lifetimeEarned, w.serves[0].credited); assert.equal(Object.values(w.dayEarned).reduce((a, b) => a + b, 0), w.serves[0].credited); replay(g);
});

test('calendar expiry is identical under fine/coarse ticks while a customer menu or offline save pauses the shift', () => {
  for (const active of [true, false]) {
    const a = game(); rent(a); send(a, { type: 'startShift' }); while (!a.world.tables[0].order) a.advance(a.world.now + 100);
    send(a, active ? { type: 'activity', active: true, paused: true } : { type: 'activity', active: false });
    const b = decodeSave(encodeSave(a)), expires = a.world.lease!.expiresAt;
    const wait = a.world.tables[0].order!.placedAt + a.world.tables[0].order!.patienceMs - a.world.now;
    const coins = a.world.coins, deposit = a.world.lease!.deposit;
    a.advance(expires + 1000);
    while (b.world.now < expires + 1000) b.advance(Math.min(expires + 1000, b.world.now + 3600000));
    assert.deepEqual(a.world, b.world); assert.equal(a.world.location, 'hem_nho'); assert.equal(a.world.coins, coins + deposit);
    assert.equal(a.world.tables[0].order!.placedAt + a.world.tables[0].order!.patienceMs - a.world.now, wait);
    assert.equal(leaseEvents(a).find(e => e.type === 'lease_expired')!.at, expires); replay(a);
    const again = structuredClone(a.world); a.advance(a.world.now); assert.deepEqual(a.world, again);
  }
});

test('unpaused expiry during service uses the same calendar deadline, never the shifted gameplay clock', () => {
  const a = game(); rent(a); const end = a.world.lease!.expiresAt; a.advance(end - 15000);
  send(a, { type: 'startShift' }); const b = decodeSave(encodeSave(a)); a.advance(end + 1000);
  while (b.world.now < end + 1000) b.advance(Math.min(end + 1000, b.world.now + 100));
  assert.deepEqual(a.world, b.world); assert.equal(a.world.phase, 'open'); assert.equal(a.world.location, 'hem_nho');
  assert.equal(leaseEvents(a).find(e => e.type === 'lease_expired')!.at, end); replay(a);
});

test('location LP and funds gates fail closed; in-shift movement is refused while equipment upgrades remain available', () => {
  const g = new Game(); assert.equal(leaseQuote(g.world, g.config, 'ngo_cho').reason, 'lifePathRequired');
  const a = game(raw => { raw.shift.startingCoinsBase = 1; }); assert.equal(rent(a).reason, 'notEnoughCoins'); assert.equal(a.world.lease, undefined);
  const b = game(); rent(b); send(b, { type: 'startShift' }); send(b, { type: 'activity', active: true, paused: true });
  const saved = structuredClone(b.world); assert.equal(rent(b, 'ben_xe').reason, 'locationOutsideShift'); assert.deepEqual(b.world, saved);
  assert.equal(send(b, { type: 'leaveLocation', leaseId: b.world.lease!.id }).reason, 'locationOutsideShift');
  assert.ok(send(b, { type: 'upgrade', kind: 'keg' }).ok); assert.equal(b.world.paused, true); replay(b);
});

test('a new config can reprice future leases but cannot change a signed contract or remove its fallback', () => {
  const g = game(); rent(g); const lease = structuredClone(g.world.lease!), raw = structuredClone(g.config.raw); assert.ok(isEconomy2(raw));
  raw._meta.version = 'lease-price-next'; raw.locations.list[1].rentPerDayBase *= 2; raw.locations.depositRate = 0.5; raw.locations.leaseDays = 14;
  assert.ok(g.command({ command: { type: 'startShift' }, at: g.world.now, idempotencyKey: 'new-pin' }, loadConfig(raw)).ok);
  assert.deepEqual(g.world.lease, lease); send(g, { type: 'activity', active: true, paused: true }); const coins = g.world.coins;
  g.advance(lease.expiresAt); assert.equal(g.world.coins, coins + lease.deposit); replay(g);
  const h = game(); rent(h); const missing = structuredClone(h.config.raw); assert.ok(isEconomy2(missing));
  missing._meta.version = 'new-fallback'; missing.locations.fallback = missing.locations.list[0].id = 'other';
  assert.equal(h.command({ command: { type: 'startShift' }, at: h.world.now, idempotencyKey: 'missing' }, loadConfig(missing)).reason, 'configLocationMissing');
  assert.equal(h.world.location, 'ngo_cho'); assert.ok(h.world.lease); replay(h);
});

test('an overflowing refund remains owed after expiry, blocks replacement, then settles exactly once when spending makes room', () => {
  const g = game(); rent(g); const lease = structuredClone(g.world.lease!); g.world.coins = Number.MAX_SAFE_INTEGER;
  g.advance(lease.expiresAt); assert.equal(g.world.location, 'hem_nho'); assert.equal(g.world.lease!.expired, true);
  assert.equal(g.world.coins, Number.MAX_SAFE_INTEGER); assert.equal(rent(g, 'ben_xe').reason, 'leaseRefundPending');
  assert.equal(leaveLocationQuote(g.world).ok, false);
  assert.ok(send(g, { type: 'buyGlass', count: 20 }).ok); assert.equal(g.world.lease, undefined);
  assert.equal(g.world.coins, Number.MAX_SAFE_INTEGER - 20000 + lease.deposit);
  g.advance(g.world.now + 1); assert.equal(leaseEvents(g).filter(e => e.type === 'lease_deposit_refunded').length, 1);
});

test('configurable early refund uses stored terms and never counts returned principal as income', () => {
  const g = game(raw => { raw.locations.earlyLeaveLosesDeposit = false; }); rent(g); const before = g.world.coins, deposit = g.world.lease!.deposit;
  assert.ok(send(g, { type: 'leaveLocation', leaseId: g.world.lease!.id }).ok); assert.equal(g.world.coins, before + deposit);
  assert.equal(g.world.lifetimeEarned, g.world.serves[0].credited); replay(g);
});

test('malformed identities, unsafe lease arithmetic and unknown command authorities cannot create contracts', () => {
  for (const patch of [
    (r: typeof import('../../../docs/config/economy.tbh.json')) => { r.locations.list[1].id = r.locations.list[0].id; },
    (r: typeof import('../../../docs/config/economy.tbh.json')) => { r.locations.fallback = 'missing'; },
    (r: typeof import('../../../docs/config/economy.tbh.json')) => { r.locations.list[1].rentPerDayBase = Number.MAX_SAFE_INTEGER; },
    (r: typeof import('../../../docs/config/economy.tbh.json')) => { r.locations.leaseDays = Number.MAX_SAFE_INTEGER; },
  ]) assert.throws(() => game(patch), /config:/);
  const g = game(); for (const command of [{ type: 'rentLocation', locationId: 'ngo_cho', maxCost: 100000 }, { type: 'rentLocation', locationId: 'ngo_cho', leaseId: null, maxCost: Infinity }, { type: 'leaveLocation', leaseId: '' }]) {
    assert.equal(send(g, command as Command).reason, 'invalidCommand'); assert.equal(g.world.lease, undefined);
  }
  const w = structuredClone(g.world); w.now = Number.MAX_SAFE_INTEGER; assert.equal(leaseQuote(w, g.config, 'ngo_cho').ok, false);
});

test('the captured actual rules21 save replays unchanged and adopts leasing only on a current command', () => {
  const save = readFileSync(new URL('./fixtures/pre-lease-v21.json', import.meta.url), 'utf8');
  const g = decodeSave(save), expected = JSON.parse(readFileSync(new URL('./fixtures/pre-lease-v21-expected.json', import.meta.url), 'utf8'));
  assert.deepEqual(g.world, expected); assert.equal(g.log.at(-1)!.rulesVersion, 21); assert.equal(g.world.lease, undefined);
  send(g, { type: 'activity', active: true, paused: true }); assert.equal(g.log.at(-1)!.rulesVersion, 22); replay(g);
  const modern = game(); rent(modern); const entry = structuredClone(modern.log.at(-1)!); entry.rulesVersion = 21;
  assert.throws(() => game().replay(entry), /replay:rulesVersion/);
});


test('a successful new pin moves an unleased player to its free fallback; failed opening never moves them', () => {
  const raw = structuredClone(config.raw); assert.ok(isEconomy2(raw)); raw._meta.version = 'fallback-move';
  raw.locations.fallback = raw.locations.list[0].id = 'other'; raw.locations.list[1].id = 'hem_nho';
  const pin = loadConfig(raw), g = new Game(config, 42, Date.parse('2026-09-09T04:00:00Z'));
  assert.ok(g.command({ at: g.world.now, idempotencyKey: 'pin', command: { type: 'startShift' } }, pin).ok);
  assert.equal(g.world.location, 'other'); assert.equal(g.world.lease, undefined); assert.equal(g.world.lifePath, 0); replay(g);
  const h = game(), before = structuredClone(h.world); h.world.staminaMs = 0;
  assert.equal(h.command({ at: h.world.now, idempotencyKey: 'failed-pin', command: { type: 'startShift' } }, pin).reason, 'restFirst');
  assert.equal(h.world.location, before.location); assert.notEqual(h.config.version, pin.version);
});

test('a pin cannot turn the signed fallback into a paid location or accept an overflowing service multiplier', () => {
  const g = game(); rent(g); const raw = structuredClone(g.config.raw); assert.ok(isEconomy2(raw)); raw._meta.version = 'fallback-reused';
  raw.locations.fallback = raw.locations.list[0].id = 'other'; raw.locations.list[2].id = 'hem_nho';
  const before = structuredClone(g.world);
  assert.equal(g.command({ at: g.world.now, idempotencyKey: 'reuse-fallback', command: { type: 'startShift' } }, loadConfig(raw)).reason, 'configLocationMissing');
  assert.deepEqual(g.world, before); replay(g);
  for (const mult of [Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER / 1000]) {
    const unsafe = structuredClone(config.raw); unsafe.locations.list[1].mult = mult;
    assert.throws(() => loadConfig(unsafe), /config:locations.maximumService/);
  }
  const large = structuredClone(config.raw); large.locations.list[1].mult = 1000000; assert.ok(loadConfig(large));
});
