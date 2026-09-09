import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, planDailyQuests, applyQuestEvent, questRewardQuote, dayKey, encodeSave, decodeSave, WEATHER, type Command, type Config, type Economy, type DailyQuest, type DomainEvent } from '../src';
const DAY = 86400000;
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `quests-${g.log.length}` });
function snapshot(patch = (_: Economy) => {}) {
  const r = structuredClone(config.raw); r.onboarding.enabled = false; r.rush.schedule.perShift = 0;
  for (const w of WEATHER) r.weather[w].weight = w === 'sunny' ? 1 : 0;
  for (const [key, type] of Object.entries(r.customerTypes)) if (type.usesTable) type.weight = key === 'thuong' ? 1 : 0;
  r.demandMix.pMoi = 1; r.demandMix.pNemGivenMoi = 0; r.demandMix.pSecondRound = 0;
  patch(r); return loadConfig(r);
}
function findGame(kind: string, c = snapshot()) {
  for (let d = 0; d < 90; d++) { const g = new Game(c, 42, d * DAY); if (planDailyQuests(g.world, c).rows.some(r => r.kind === kind)) return g; }
  throw Error(`No seeded day for ${kind}`);
}
const row = (g: Game, kind: string) => g.world.daily!.rows.find(r => r.kind === kind)!;
function ready(g: Game) {
  const end = g.world.now + 60000;
  while (g.world.now < end) { const t = g.world.tables.find(t => t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')); if (t) return t; g.advance(g.world.now + 100); }
  throw Error('No ready table');
}
function serve(g: Game) { const t = ready(g); assert.ok(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok); }
const cheap = (r: Economy) => { for (const b of r.quests.daily.buckets) for (const v of Object.values(b.pool)) if (v) { v[0] = 1; v[1] = 1; } };

test('daily rows use independent date/tier seeds, closed pools, pinned targets and one Base scaling', () => {
  const seen = new Set<string>();
  for (let d = 0; d < 60; d++) {
    const a = new Game(config, 1, d * DAY), b = new Game(config, 987, d * DAY);
    const before = [a.world.rng, a.world.nextId]; const x = planDailyQuests(a.world, config), y = planDailyQuests(b.world, config);
    assert.deepEqual(x, y); assert.deepEqual([a.world.rng, a.world.nextId], before); assert.equal(x.rows.length, config.values.quests.daily.count);
    x.rows.filter(r => !r.kind.endsWith('_3')).forEach(r => seen.add(r.kind));
    assert.equal(x.rows[0].reputation, Math.round(config.raw.quests.daily.buckets[0].rewardRepBase * config.raw.k.value));
  }
  assert.equal(seen.size, 10);
  const g = new Game(config); g.world.seasonEarned = config.values.league.tiers[2].minSeasonEarnedBase;
  const p = planDailyQuests(g.world, config); assert.equal(p.tier, 3);
  for (const q of p.rows.slice(0, 3)) {
    const range = (config.raw.quests.daily.buckets.find(b => b.id === q.bucket)!.pool as Record<string, number[] | undefined>)[q.kind]!;
    assert.equal(q.target, Math.ceil((range[0] + (range[1] - range[0]) * ((3 - 1) / 8) ** 1.5) * (q.kind === 'earn_coins_base' ? config.raw.k.value : 1)));
  }
  send(g, { type: 'startShift' }); const pinned = structuredClone(g.world.daily);
  g.world.seasonEarned = config.values.league.tiers.at(-1)!.minSeasonEarnedBase; send(g, { type: 'activity', active: true });
  assert.deepEqual(g.world.daily, pinned);
});

test('all service and quality variants advance from actual whole-table serves, with earned rewards outside counted ledgers', () => {
  for (const kind of ['serve_customers', 'serve_beer', 'serve_moi', 'serve_tables', 'perfect_tip', 'earn_coins_base', 'no_stale_beer']) {
    const g = findGame(kind, snapshot(cheap)); assert.ok(send(g, { type: 'startShift' }).ok); serve(g);
    const q = row(g, kind); assert.equal(q.progress, q.target, kind);
    const before = { coins: g.world.coins, rep: g.world.reputation, season: g.world.seasonEarned, lifetime: g.world.lifetimeEarned, days: structuredClone(g.world.dayEarned), statsRep: g.world.shift!.stats.rep };
    const e = { at: g.world.now, idempotencyKey: 'claim-once', command: { type: 'claimQuest' as const, day: g.world.daily!.day, questId: q.id } };
    assert.deepEqual(g.command(e), { ok: true, amount: q.coin }); assert.deepEqual(g.command(e), { ok: true, amount: q.coin });
    assert.equal(send(g, e.command).reason, 'questClaimed');
    assert.equal(g.world.coins, before.coins + q.coin); assert.equal(g.world.reputation, before.rep + q.reputation); assert.equal(g.world.shift!.stats.rep, before.statsRep + q.reputation);
    assert.equal(g.world.seasonEarned, before.season); assert.equal(g.world.lifetimeEarned, before.lifetime); assert.deepEqual(g.world.dayEarned, before.days);
    assert.equal(g.world.events.filter(e => e.type === 'quest_claimed').length, 1); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});

test('stale beer does not satisfy fresh beer or tip quality, and blocked claims never mutate balances', () => {
  for (const kind of ['perfect_tip', 'no_stale_beer']) {
    const g = findGame(kind, snapshot(r => { cheap(r); r.patience.thuongMs = 120000; })); send(g, { type: 'startShift' }); const t = ready(g);
    const readyAt = Math.max(...t.order!.items.map(i => i.readyAt ?? 0)); g.advance(readyAt + g.config.values.upgrades.cooler.freshnessMs[0]! + 1);
    assert.ok(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok); assert.equal(row(g, kind).progress, 0);
    const before = structuredClone(g.world); assert.equal(send(g, { type: 'claimQuest', day: g.world.daily!.day, questId: row(g, kind).id }).reason, 'questIncomplete'); assert.deepEqual(g.world, before);
  }
  const g = findGame('serve_tables', snapshot(cheap)); send(g, { type: 'startShift' }); serve(g); const q = row(g, 'serve_tables');
  g.world.coins = Number.MAX_SAFE_INTEGER; const before = structuredClone(g.world);
  assert.equal(send(g, { type: 'claimQuest', day: g.world.daily!.day, questId: q.id }).reason, 'rewardOverflow'); assert.deepEqual(g.world, before);
  assert.equal(send(g, { type: 'claimQuest', day: 'old-day', questId: q.id }).reason, 'questExpired');
  assert.equal(send(g, { type: 'claimQuest', day: g.world.daily!.day, questId: 'wrong' }).reason, 'questGone');
});

test('zero-loss time excludes hidden play and empty waiting, and a loss at the exact boundary resets the window', () => {
  const c = snapshot(r => { r.patience.thuongMs = 500000; }), idle = findGame('zero_loss_window', c);
  send(idle, { type: 'startShift' }); idle.advance(idle.world.now + c.values.quests.daily.buckets[2].zeroLossWindowMs!); assert.equal(row(idle, 'zero_loss_window').progress, 0);
  const g = findGame('zero_loss_window', c); send(g, { type: 'startShift' }); const initial = g.world.now; serve(g);
  const remaining = c.values.quests.daily.buckets[2].zeroLossWindowMs! - (g.world.now - initial);
  send(g, { type: 'activity', active: false }); g.advance(g.world.now + 120000); send(g, { type: 'activity', active: true });
  g.advance(g.world.now + remaining - 1); assert.equal(row(g, 'zero_loss_window').progress, 0); g.advance(g.world.now + 1); assert.equal(row(g, 'zero_loss_window').progress, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  const boundary = findGame('zero_loss_window', c); send(boundary, { type: 'startShift' }); serve(boundary); const t = ready(boundary);
  const deadline = boundary.world.daily!.lossFreeSince! + c.values.quests.daily.buckets[2].zeroLossWindowMs!;
  // Controlled assigned-order deadline at the very end of the quality window.
  t.order!.patienceMs = deadline - t.order!.placedAt - c.values.patience.graceMs;
  boundary.advance(deadline); assert.equal(row(boundary, 'zero_loss_window').progress, 0); assert.equal(boundary.world.daily!.lossFreeSince, deadline);
});

test('surviving rush needs actual service and its whole observed window, not an early finalized pulse', () => {
  for (const closeEarly of [false, true]) {
    const g = findGame('survive_rush', snapshot(r => { r.rush.light.durationMs = 10000; r.enjoy.minMs = r.enjoy.maxMs = 1000; }));
    send(g, { type: 'startShift' }); const t = ready(g), start = g.world.now + 1000;
    g.world.shift!.nextSpawnAt = g.world.shift!.endsAt;
    g.world.shift!.rushes = [{ kind: 'light', start, end: start + g.config.values.rush.light.durationMs }];
    g.advance(start); assert.ok(send(g, { type: 'serve', tableId: t.id, orderId: t.order!.id }).ok);
    if (closeEarly) send(g, { type: 'endShift' });
    g.advance(start + g.config.values.rush.light.durationMs); assert.equal(row(g, 'survive_rush').progress, closeEarly ? 0 : 1);
  }
});

test('VIP protection requires a full shift with VIP service, and paid dismissal cannot qualify', () => {
  for (const dismiss of [false, true]) {
    const g = findGame('no_lost_vip', snapshot(r => {
      r.customerTypes.vip.weight = 100; r.customerTypes.thuong.weight = 0; r.customerTypes.vip.maxPerGroupPhase2 = r.upgrades.table.levels.at(-1)!.capacity;
      r.enjoy.minMs = r.enjoy.maxMs = 1000; r.shift.startingCoinsBase = 100000;
    }));
    send(g, { type: 'startShift' }); serve(g); assert.ok(g.world.serves.some(s => s.customerType === 'vip'));
    if (dismiss) assert.ok(send(g, { type: 'kickAll', shiftId: g.world.shift!.id, maxCost: 1000000 }).ok); else send(g, { type: 'endShift' });
    g.advance(g.world.now + 5000); assert.equal(g.world.phase, 'resting'); assert.equal(row(g, 'no_lost_vip').progress, dismiss ? 0 : 1); assert.equal(row(g, 'shift_3').progress, 1);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
  const ordinary = findGame('no_lost_vip'); send(ordinary, { type: 'startShift' }); serve(ordinary); send(ordinary, { type: 'endShift' }); ordinary.advance(ordinary.world.now + 120000);
  assert.equal(row(ordinary, 'no_lost_vip').progress, 0);
});

test('VN midnight expires claims exactly, pins the new set and credits bridge finalization to its new day', () => {
  const c = snapshot(cheap), g = new Game(c, 42, Date.parse('2026-09-09T16:59:30Z'));
  send(g, { type: 'startShift' }); serve(g); const old = structuredClone(g.world.daily!);
  g.advance(old.expiresAt); assert.equal(g.world.daily!.day, '2026-09-10'); assert.equal(g.world.daily!.rows.every(r => r.progress === 0), true);
  assert.equal(send(g, { type: 'claimQuest', day: old.day, questId: old.rows[0].id }).reason, 'questExpired');
  send(g, { type: 'endShift' }); g.advance(g.world.now + 120000); assert.equal(row(g, 'shift_3').progress, 1);
  send(g, { type: 'activity', active: false }); const absent = structuredClone(g.world.daily);
  g.advance(g.world.now + DAY * 2); assert.deepEqual(g.world.daily, absent);
  send(g, { type: 'activity', active: true });
  assert.equal(g.world.daily!.day, dayKey(g.world.now, c)); assert.equal(g.world.daily!.rows.every(r => r.progress === 0), true);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('four local quests cannot claim the five-of-five bonus; trusted gifts require distinct non-self recipients and full-stock claims stay atomic', () => {
  const g = findGame('zero_loss_window', snapshot(cheap)); send(g, { type: 'startShift' }); const d = g.world.daily!;
  // Controlled downstream completion state; no production command can assert these values.
  for (const q of d.rows) if (q.kind !== 'gift_3') q.progress = q.target;
  const command = { type: 'claimDailyBonus' as const, day: d.day };
  assert.equal(send(g, command).reason, 'questIncomplete');
  const event = (recipientId: string): DomainEvent => ({ id: recipientId, type: 'gift_sent', at: g.world.now, configVersion: g.config.version, idempotencyKey: recipientId, data: { recipientId } });
  for (const recipient of [g.world.playerId, 'a', 'a', 'b']) applyQuestEvent(g.world, g.config, event(recipient));
  assert.equal(row(g, 'gift_3').progress, 2); assert.equal(send(g, command).reason, 'questIncomplete');
  applyQuestEvent(g.world, g.config, event('c')); g.world.flyers = g.config.values.unlocks.flyer.stockCap; const before = structuredClone(g.world);
  assert.equal(send(g, command).reason, 'flyerStockFull'); assert.deepEqual(g.world, before);
  g.world.flyers--; const coins = g.world.coins, rep = g.world.reputation, season = g.world.seasonEarned, shards = g.world.badgeShards;
  const e = { command, at: g.world.now, idempotencyKey: 'bonus-once' }; assert.ok(g.command(e).ok); assert.ok(g.command(e).ok); assert.equal(send(g, command).reason, 'questClaimed');
  assert.equal(g.world.flyers, g.config.values.unlocks.flyer.stockCap); assert.equal(g.world.badgeShards, shards + g.config.values.quests.daily.bonusAll5.badgeShard); assert.ok(g.world.unlocks.includes('flyer'));
  assert.equal(g.world.coins, coins); assert.equal(g.world.reputation, rep); assert.equal(g.world.seasonEarned, season);
});

test('quest intake rejects altered grammar, unsafe targets/rewards and contradictory five-of-five flags', () => {
  for (const patch of [
    (r: Economy) => { r.quests.daily.targetCurve += '; process.exit()'; }, (r: Economy) => { r.quests.daily.targetCurve = r.quests.daily.targetCurve.replace('/8', '/7'); },
    (r: Economy) => { r.quests.daily.buckets[0].pool.serve_customers = [0, 1]; }, (r: Economy) => { r.quests.daily.buckets[0].rewardCoinBase = Number.MAX_SAFE_INTEGER; },
    (r: Economy) => { r.quests.daily.count = 3; }, (r: Economy) => { r.quests.daily.fixed[1].uniqueRecipients = false; },
    (r: Economy) => { r.unlocks.flyer.freeOnDaily5of5 = false; }, (r: Economy) => { r.quests.daily.bonusAll5.flyer = r.unlocks.flyer.stockCap + 1; },
  ]) assert.throws(() => snapshot(patch), /config:/);
});

test('genuine rules11 campaign snapshots preserve history and begin daily quests only with a new opening', () => {
  for (const state of ['active', 'ended']) {
    const text = readFileSync(new URL(`./fixtures/legacy-flyer-${state}-v11.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-flyer-${state}-v11-expected.json`, import.meta.url), 'utf8'));
    const g = decodeSave(text); assert.deepEqual(g.world, expected.world); assert.equal(g.world.daily, undefined);
    const prior = structuredClone(g.world); send(g, { type: 'activity', active: true });
    assert.deepEqual(g.world, { ...prior, staminaAnchorAt: prior.now, staminaAnchorMs: prior.staminaMs, attendance: g.world.attendance, shift: { ...prior.shift!, menu: { eventStart: prior.events.length, serveStart: prior.serves.length, complete: false } }, nextId: prior.nextId + 2, events: [...prior.events, { id: `event-${prior.nextId + 1}`, type: 'menu_tracking_started', at: prior.now, configVersion: g.config.version, idempotencyKey: g.log.at(-1)!.idempotencyKey, data: { shiftId: prior.shift!.id, complete: false } }, g.world.events.at(-1)!] }); assert.equal(g.world.events.at(-1)!.type, 'attendance_day_opened'); assert.equal(g.log.at(-1)!.rulesVersion, 20);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
    send(g, { type: 'endShift' }); g.advance(g.world.now + g.config.values.shift.durationMs);
    assert.equal(g.world.phase, 'resting'); assert.equal(g.world.daily, undefined);
    assert.ok(send(g, { type: 'startShift' }).ok); assert.equal(g.world.daily!.rows.length, g.config.values.quests.daily.count);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});
