import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, dayKey, attendanceDay, attendanceRewardQuote, encodeSave, decodeSave, type Command } from '../src';
const DAY = 86400000, ORIGIN = Date.parse('2026-09-01T10:00:00Z');
const send = (g: Game, command: Command) => g.command({ command, at: g.world.now, idempotencyKey: `attendance-${g.log.length}` });
const visit = (g: Game, at: number) => { send(g, { type: 'activity', active: false }); g.advance(at); assert.ok(send(g, { type: 'activity', active: true }).ok); };
const claim = (g: Game) => send(g, { type: 'claimAttendance', day: dayKey(g.world.now, g.config) });

test('seven observed days pay each scaled reputation reward once, then wrap without inflating any earning ledger', () => {
  const g = new Game(config, 42, ORIGIN), coins = g.world.coins; let reputation = 0;
  for (let day = 0; day <= config.values.quests.loginTrackRepBase.length; day++) {
    visit(g, ORIGIN + day * DAY);
    const slot = day % config.values.quests.loginTrackRepBase.length, q = attendanceRewardQuote(g.world, config, dayKey(g.world.now, config));
    assert.equal(q.track.cycleDay, slot + 1); assert.equal(q.reputation, Math.round(config.raw.quests.loginTrackRepBase[slot] * config.raw.k.value));
    const envelope = { command: { type: 'claimAttendance' as const, day: q.track.lastActiveDateKey }, at: g.world.now, idempotencyKey: `claim-day-${day}` };
    assert.deepEqual(g.command(envelope), { ok: true, amount: q.reputation }); reputation += q.reputation;
    assert.deepEqual(g.command(envelope), { ok: true, amount: q.reputation }); assert.equal(claim(g).reason, 'attendanceClaimed');
    assert.equal(g.world.reputation, reputation); assert.equal(g.world.coins, coins); assert.equal(g.world.seasonEarned, 0); assert.equal(g.world.lifetimeEarned, 0); assert.deepEqual(g.world.dayEarned, {});
    assert.deepEqual(g.world.attendance!.claimedDays, Array.from({ length: slot + 1 }, (_, i) => i + 1));
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
  assert.equal(g.world.events.filter(e => e.type === 'attendance_claimed').length, 8);
  assert.equal(g.world.events.filter(e => e.type === 'attendance_day_opened').length, 8);
  assert.equal(g.world.events.filter(e => e.type === 'attendance_day_opened').at(-1)!.data.transition, 'wrap');
});

test('observed but unclaimed days keep the attendance cycle, expire their reward and never masquerade as claimed', () => {
  const g = new Game(config, 42, ORIGIN); visit(g, ORIGIN); const oldDay = dayKey(g.world.now, config);
  visit(g, ORIGIN + DAY); assert.equal(g.world.attendance!.cycleDay, 2); assert.deepEqual(g.world.attendance!.claimedDays, []);
  assert.equal(send(g, { type: 'claimAttendance', day: oldDay }).reason, 'attendanceExpired'); assert.ok(claim(g).ok);
  assert.equal(g.world.reputation, config.values.quests.loginTrackRepBase[1]); assert.deepEqual(g.world.attendance!.claimedDays, [2]);
  visit(g, ORIGIN + DAY * 3); assert.equal(g.world.attendance!.cycleDay, 1); assert.deepEqual(g.world.attendance!.claimedDays, []);
  assert.equal(g.world.events.at(-1)!.data.transition, 'reset'); assert.ok(claim(g).ok);
  assert.equal(g.world.reputation, config.values.quests.loginTrackRepBase[1] + config.values.quests.loginTrackRepBase[0]);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('disabling missed-day reset advances one observed slot, not the number of offline days', () => {
  const raw = structuredClone(config.raw); raw.quests.loginMissResets = false; const g = new Game(loadConfig(raw), 42, ORIGIN);
  visit(g, ORIGIN); claim(g); visit(g, ORIGIN + DAY * 30);
  assert.equal(g.world.attendance!.cycleDay, 2); assert.deepEqual(g.world.attendance!.claimedDays, [1]); assert.ok(claim(g).ok);
  assert.equal(g.world.reputation, g.config.values.quests.loginTrackRepBase[0] + g.config.values.quests.loginTrackRepBase[1]);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('hidden time never records attendance or pays rewards, while return after missed days resets precisely once', () => {
  const g = new Game(config, 42, ORIGIN); send(g, { type: 'startShift' }); g.advance(g.world.now + 11000); claim(g);
  const track = structuredClone(g.world.attendance), rep = g.world.reputation, count = g.world.events.filter(e => e.type.startsWith('attendance_')).length;
  send(g, { type: 'activity', active: false }); g.advance(g.world.now + DAY * 30);
  assert.deepEqual(g.world.attendance, track); assert.equal(g.world.reputation, rep); assert.equal(g.world.events.filter(e => e.type.startsWith('attendance_')).length, count);
  assert.equal(claim(g).reason, 'attendanceInactive'); assert.deepEqual(g.world.attendance, track);
  send(g, { type: 'activity', active: true }); const today = g.world.attendance!.lastActiveDateKey;
  assert.equal(g.world.attendance!.cycleDay, 1); assert.equal(g.world.events.at(-1)!.data.transition, 'reset');
  const opened = g.world.events.filter(e => e.type === 'attendance_day_opened').length; send(g, { type: 'activity', active: true });
  assert.equal(g.world.events.filter(e => e.type === 'attendance_day_opened').length, opened); assert.ok(claim(g).ok);
  assert.equal(g.world.attendance!.lastClaimDateKey, today); assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('active VN midnight opens the next slot at the same exact instant for tiny and large time steps', () => {
  const start = Date.parse('2026-09-01T16:59:58Z'), midnight = Date.parse('2026-09-01T17:00:00Z');
  const a = new Game(config, 42, start), b = new Game(config, 42, start);
  for (const g of [a, b]) { visit(g, start); assert.equal(g.world.attendance!.expiresAt, midnight); claim(g); }
  a.advance(midnight - 1); assert.equal(a.world.attendance!.cycleDay, 1); a.advance(midnight);
  while (b.world.now < midnight) b.advance(Math.min(midnight, b.world.now + 100));
  assert.equal(a.world.attendance!.cycleDay, 2); assert.deepEqual(a.world, b.world);
  const event = a.world.events.at(-1)!; assert.equal(event.type, 'attendance_day_opened'); assert.equal(event.at, midnight); assert.equal(event.data.day, '2026-09-02');
  const before = a.world.reputation; assert.equal(send(a, { type: 'claimAttendance', day: '2026-09-01' }).reason, 'attendanceExpired'); assert.equal(a.world.reputation, before);
  assert.ok(claim(a).ok); assert.deepEqual(decodeSave(encodeSave(a)).world, a.world);
});

test('reputation and active-shift overflow refuse before claim mutation, with a safe boundary retry', () => {
  const g = new Game(config, 42, ORIGIN); send(g, { type: 'startShift' });
  g.world.reputation = Number.MAX_SAFE_INTEGER; let before = structuredClone(g.world);
  assert.equal(claim(g).reason, 'rewardOverflow'); assert.deepEqual(g.world, before);
  const reward = config.values.quests.loginTrackRepBase[0]; g.world.reputation -= reward; g.world.shift!.stats.rep = Number.MAX_SAFE_INTEGER;
  before = structuredClone(g.world); assert.equal(claim(g).reason, 'rewardOverflow'); assert.deepEqual(g.world, before);
  g.world.shift!.stats.rep -= reward; assert.ok(claim(g).ok); assert.equal(g.world.reputation, Number.MAX_SAFE_INTEGER); assert.equal(g.world.shift!.stats.rep, Number.MAX_SAFE_INTEGER);
  assert.equal(g.world.events.filter(e => e.type === 'attendance_claimed').length, 1);
});

test('invalid, wrong-day and inactive first claims neither create attendance nor change balances', () => {
  const g = new Game(config, 42, ORIGIN), before = structuredClone(g.world);
  assert.equal(send(g, { type: 'claimAttendance', day: 'not-today' }).reason, 'attendanceExpired'); assert.deepEqual(g.world, before);
  assert.equal(send(g, { type: 'claimAttendance', day: 12 } as unknown as Command).reason, 'invalidCommand'); assert.deepEqual(g.world, before);
  send(g, { type: 'activity', active: false }); assert.equal(claim(g).reason, 'attendanceInactive'); assert.equal(g.world.attendance, undefined);
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER]) { const raw = structuredClone(config.raw); raw.quests.loginTrackRepBase[0] = value; assert.throws(() => loadConfig(raw), /config:/); }
  send(g, { type: 'activity', active: true }); assert.equal(g.world.attendance!.cycleDay, 1);
});

test('genuine rules12 daily claim and hidden-rollover saves preserve all history, then add only the first current attendance stamp', () => {
  for (const name of ['claimed', 'hidden-rollover']) {
    const file = readFileSync(new URL(`./fixtures/legacy-daily-${name}-v12.json`, import.meta.url), 'utf8');
    const expected = JSON.parse(readFileSync(new URL(`./fixtures/legacy-daily-${name}-v12-expected.json`, import.meta.url), 'utf8'));
    assert.equal(expected.source, 'a22fa90898f0ebd275ec32d92d27fe75c2a8900c');
    const g = decodeSave(file); assert.deepEqual(g.world, expected.world); assert.equal(g.world.attendance, undefined);
    const before = structuredClone(g.world), track = attendanceDay(g.world, g.config).track, key = `attendance-${g.log.length}`;
    // Existing v12 return also resumes the daily zero-loss clock; compare that full legacy projection.
    const legacy = decodeSave(file); legacy.replay({ command: { type: 'activity', active: true }, at: legacy.world.now, idempotencyKey: key, rulesVersion: 12, configVersion: legacy.config.version, result: { ok: true } });
    assert.ok(send(g, { type: 'activity', active: true }).ok);
    assert.deepEqual(g.world, { ...legacy.world, attendance: track, nextId: before.nextId + 1, events: [...before.events, { id: `event-${before.nextId + 1}`, type: 'attendance_day_opened', at: before.now, configVersion: g.config.version, idempotencyKey: key, data: { day: track.lastActiveDateKey, cycleDay: 1, expiresAt: track.expiresAt, transition: 'first' } }] });
    assert.ok(claim(g).ok); assert.equal(g.world.coins, before.coins); assert.deepEqual(g.world.daily, legacy.world.daily);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
  }
});
