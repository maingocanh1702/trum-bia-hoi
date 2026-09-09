import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, seasonWindow, seasonTier, type Command } from '../src';
import { credit } from '../src/rules';
import { nextSeasonEnd } from '../src/seasons';
const DAY = 86400000;
const epoch = Date.parse(config.values.league.seasons.epochUtc);
const send = (g: Game, command: Command) => g.command({ at: g.world.now, idempotencyKey: `season-${g.log.length}`, command });
const replay = (g: Game) => assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
function served(at = epoch + DAY, c = config) {
  const g = new Game(c, 42, at);
  assert.ok(send(g, { type: 'startShift' }).ok); g.advance(at + 11000);
  const table = g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  assert.ok(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }).ok);
  return g;
}

test('actual service creates both seasonal counters and a real peak; refunds, quest rewards and spending cannot inflate them', () => {
  const g = served(), w = g.world, amount = w.serves[0].credited;
  assert.equal(w.seasonEarned, amount); assert.equal(w.seasons!.contestEarned, amount); assert.equal(w.peakLeague, 'dong');
  assert.equal(w.seasons!.ranking.firstReachedCurrentSeasonEarnedAt, w.now);
  assert.ok(send(g, { type: 'restock', dish: 'bia', mode: 'one' }).ok); assert.equal(w.seasonEarned, amount);
  const original = structuredClone(w); replay(g);
  for (const source of ['quest', 'lottery', 'donation', 'compensation', 'adminGrant', 'depositRefund', 'giftOverflow']) credit(w, config, 100, source);
  assert.deepEqual(w.seasons, original.seasons); assert.equal(w.seasonEarned, amount); assert.equal(w.lifetimeEarned, amount);
  credit(w, config, 100, 'shipperNet'); assert.equal(w.seasonEarned, amount + 100); assert.equal(w.seasons!.contestEarned, amount + 100);
});

test('exact ranking boundary resets only ranking; menu and offline clocks preserve waiting time and fine/coarse replay equality', () => {
  for (const active of [true, false]) {
    const a = served(), w = a.world;
    send(a, { type: 'activity', active, ...(active ? { paused: true } : {}) });
    const b = decodeSave(encodeSave(a)), amount = w.seasonEarned, end = w.seasons!.ranking.endsAt;
    const table = w.tables.find(t => t.order)!, wait = table.order!.placedAt + table.order!.patienceMs - w.now;
    a.advance(end);
    while (b.world.now < end) b.advance(Math.min(end, b.world.now + DAY / 3));
    assert.deepEqual(a.world, b.world); assert.equal(w.seasonEarned, 0); assert.equal(w.seasons!.contestEarned, amount);
    assert.equal(w.seasons!.ranking.firstReachedCurrentSeasonEarnedAt, null); assert.equal(w.peakLeague, 'dong');
    assert.equal(w.seasons!.results.length, 1); assert.equal(w.seasons!.results[0].endsAt, end); assert.equal(w.seasons!.results[0].earned, amount);
    assert.equal(table.order!.placedAt + table.order!.patienceMs - w.now, wait); replay(a);
    const savedResult = structuredClone(w.seasons!.results[0]);
    a.advance(epoch + 14 * DAY); assert.equal(w.seasons!.contestEarned, 0); assert.deepEqual(w.seasons!.results[0], savedResult); replay(a);
  }
});

test('an order served exactly at rollover belongs wholly to the new window and idempotent retries do not add another score', () => {
  const end = epoch + 7 * DAY, g = new Game(config, 42, end - 11000);
  send(g, { type: 'startShift' }); g.advance(end);
  const table = g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  const e = { at: end, idempotencyKey: 'at-boundary', command: { type: 'serve' as const, tableId: table.id, orderId: table.order!.id } };
  assert.ok(g.command(e).ok); const w = structuredClone(g.world); assert.ok(g.command(e).ok); assert.deepEqual(g.world, w);
  assert.equal(w.seasons!.ranking.startsAt, end); assert.equal(w.seasons!.ranking.firstReachedCurrentSeasonEarnedAt, end);
  assert.equal(w.seasons!.results.length, 0); assert.equal(w.seasonEarned, w.serves[0].credited); replay(g);
});

test('inactive empty decades skip blank results; populated period outcomes are stable under coarse and fine catch-up', () => {
  const a = served(); send(a, { type: 'activity', active: false }); const b = decodeSave(encodeSave(a));
  const end = epoch + 365 * 60 * DAY; a.catchUp(end);
  while (b.world.now < end) b.catchUp(Math.min(end, b.world.now + 365 * DAY));
  assert.deepEqual(a.world, b.world); assert.equal(a.world.seasons!.results.length, 2); assert.equal(nextSeasonEnd(a.world), Infinity); replay(a);
  const early = new Game(config, 1, 0); send(early, { type: 'activity', active: false });
  assert.ok(early.world.seasons!.ranking.startsAt <= 0); assert.ok(early.world.seasons!.ranking.endsAt > 0);
  early.catchUp(epoch); assert.equal(early.world.seasons!.results.length, 0); replay(early);
});

test('daily cap counts actual credited income only; zero credit leaves tie timestamp unchanged and tier thresholds are scaled once', () => {
  const raw = structuredClone(config.raw); raw.shift.dailyEarnCapBase = 100000;
  const c = loadConfig(raw), g = new Game(c, 42, epoch); send(g, { type: 'activity', active: true });
  credit(g.world, c, c.values.league.tiers[1].minSeasonEarnedBase, 'servePayment');
  assert.equal(seasonTier(g.world, c).tier.id, 'bac'); assert.equal(g.world.peakLeague, 'bac');
  g.advance(epoch + 1); credit(g.world, c, c.values.shift.dailyEarnCapBase, 'serveTip');
  const s = structuredClone(g.world.seasons), total = g.world.seasonEarned;
  assert.equal(total, c.values.shift.dailyEarnCapBase); g.advance(epoch + 2); assert.equal(credit(g.world, c, 100, 'shipperNet'), 0);
  assert.deepEqual(g.world.seasons, s); assert.equal(g.world.seasonEarned, total);
  const before = structuredClone(g.world); g.world.seasons!.contestEarned = Number.MAX_SAFE_INTEGER;
  // New day removes the ordinary daily cap; overflow refuses before the wallet changes.
  g.advance(epoch + DAY); const wallet = g.world.coins;
  assert.throws(() => credit(g.world, c, 1, 'servePayment'), /unsafe-season/); assert.equal(g.world.coins, wallet); assert.equal(g.world.seasonEarned, before.seasonEarned);
});

test('completed shifts are attributed at close time independently of earnings, with no fake authenticated rank', () => {
  const g = served(); send(g, { type: 'endShift' }); g.advance(g.world.now + 3600000);
  assert.equal(g.world.completedShifts, 1); assert.equal(g.world.seasons!.ranking.closedShifts, 1); assert.equal(g.world.seasons!.contest.closedShifts, 1);
  send(g, { type: 'activity', active: false }); g.catchUp(epoch + 7 * DAY);
  assert.equal(g.world.seasons!.results[0].closedShifts, 1); assert.equal(g.world.seasons!.ranking.closedShifts, 0); replay(g);
});

test('period terms stay pinned through config changes and each next season adopts the latest accepted config', () => {
  const g = served(); send(g, { type: 'endShift' }); g.advance(g.world.now + 3600000);
  const periods = structuredClone(g.world.seasons!), raw = structuredClone(config.raw); raw._meta.version = 'seasons-next';
  raw.league.tiers.forEach((tier, i) => { if (i) tier.minSeasonEarnedBase *= 2; }); raw.ledgers.countedSources.fill('servePayment');
  const next = loadConfig(raw);
  assert.ok(g.command({ at: g.world.now, idempotencyKey: 'new-pin', command: { type: 'startShift' } }, next).ok);
  assert.deepEqual(g.world.seasons, periods);
  send(g, { type: 'activity', active: false }); g.catchUp(periods.ranking.endsAt);
  assert.equal(g.world.seasons!.ranking.configVersion, next.version); assert.equal(g.world.seasons!.contest.configVersion, config.version);
  assert.deepEqual(g.world.seasons!.ranking.tiers, next.values.league.tiers); assert.deepEqual(g.world.seasons!.contest.tiers, periods.contest.tiers);
  replay(g);
  const ranking = g.world.seasonEarned, contest = g.world.seasons!.contestEarned; credit(g.world, next, 50, 'serveTip');
  assert.equal(g.world.seasonEarned, ranking); assert.equal(g.world.seasons!.contestEarned, contest + 50);
  g.catchUp(periods.contest.endsAt); assert.equal(g.world.seasons!.contest.configVersion, next.version);
  const shifted = structuredClone(config.raw); shifted._meta.version = 'different-schedule'; shifted.league.seasons.ranking.days = 10;
  const initial = new Game(config, 42, epoch);
  assert.ok(initial.command({ at: epoch, idempotencyKey: 'first-pin', command: { type: 'startShift' } }, loadConfig(shifted)).ok);
  assert.equal(initial.world.seasons!.ranking.endsAt, epoch + 10 * DAY); replay(initial);
});

test('captured rules22 history remains unchanged; explicit adoption archives the old aggregate without inventing a season peak', () => {
  const g = decodeSave(readFileSync(new URL('./fixtures/pre-seasons-v22.json', import.meta.url), 'utf8'));
  const expected = JSON.parse(readFileSync(new URL('./fixtures/pre-seasons-v22-expected.json', import.meta.url), 'utf8'));
  assert.deepEqual(g.world, expected); assert.equal(g.log.at(-1)!.rulesVersion, 22);
  send(g, { type: 'activity', active: true, paused: true });
  assert.equal(g.log.at(-1)!.rulesVersion, 23); assert.equal(g.world.seasonEarned, 0); assert.equal(g.world.seasons!.legacy.earned, expected.seasonEarned);
  assert.equal(g.world.lifetimeEarned, expected.lifetimeEarned); assert.equal(g.world.peakLeague, null); replay(g);
  assert.throws(() => g.replay({ ...g.log.at(-1)!, rulesVersion: 22, idempotencyKey: 'downgraded' }), /replay:rulesVersion/);
});

test('invalid calendar definitions and changes to permanent tier identities fail closed', () => {
  for (const patch of [
    (r: typeof config.raw) => { r.league.seasons.epochUtc = '2026-02-30T10:00:00Z'; },
    (r: typeof config.raw) => { r.league.seasons.ranking.days = 0; },
    (r: typeof config.raw) => { r.league.seasons.contest.days = Number.MAX_SAFE_INTEGER; },
    (r: typeof config.raw) => { r.league.seasons.tz = 'America/New_York'; },
  ]) { const raw = structuredClone(config.raw); patch(raw); assert.throws(() => loadConfig(raw), /config:/); }
  const g = served(); send(g, { type: 'endShift' }); g.advance(g.world.now + 3600000);
  const raw = structuredClone(config.raw); raw._meta.version = 'rename-league'; raw.league.tiers[0].id = 'other';
  const c = loadConfig(raw), before = structuredClone(g.world);
  assert.equal(g.command({ at: g.world.now, idempotencyKey: 'bad-pin', command: { type: 'startShift' } }, c).reason, 'configSeasonTiers');
  assert.deepEqual(g.world, before); replay(g);
  assert.throws(() => seasonWindow(Number.MAX_SAFE_INTEGER, config, 'ranking'), /unsafe-clock/);
});

test('real served revenue crosses configured tiers and the reached peak survives both season resets', () => {
  const raw = structuredClone(config.raw); raw.league.tiers.forEach((tier, i) => { tier.minSeasonEarnedBase = i; });
  const g = served(epoch + DAY, loadConfig(raw)); assert.equal(g.world.peakLeague, 'huyen_thoai');
  assert.equal(seasonTier(g.world, g.config).tier.id, 'huyen_thoai');
  send(g, { type: 'activity', active: false }); g.catchUp(epoch + 14 * DAY);
  assert.equal(g.world.peakLeague, 'huyen_thoai'); assert.equal(seasonTier(g.world, g.config).tier.id, 'dong'); replay(g);
});
