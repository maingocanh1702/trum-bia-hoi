import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { Game, config, decodeSave, encodeSave, loadConfig, type RulesVersion } from '../src';
import { mixedPinGame, nextPin, pinConfig } from './fixtures/config-pinning';

function restore(game: Game) {
  return Game.restoreTrusted(game.configs.map(c => loadConfig(JSON.parse(JSON.stringify(c.raw)))),
    { seed: game.seed, createdAt: game.createdAt, world: structuredClone(game.world), log: structuredClone(game.log) },
    JSON.parse(JSON.stringify(game.checkpoint())));
}
function equal(a: Game, b: Game) {
  assert.deepEqual(a.world, b.world); assert.deepEqual(a.log, b.log);
  assert.deepEqual(a.checkpoint(), b.checkpoint()); assert.equal(encodeSave(a), encodeSave(b));
}

test('every archived replay state restores its actual bookkeeping and continues with identical events, currency and retry results', () => {
  let checked = 0;
  for (const name of readdirSync(new URL('./fixtures', import.meta.url)).filter(n => n.endsWith('.json') && !n.endsWith('-expected.json'))) {
    const text = readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'), raw = JSON.parse(text);
    if (!Array.isArray(raw.log) || !raw.config) continue;
    const replayed = decodeSave(text), resumed = restore(replayed); equal(replayed, resumed);
    const last = replayed.log.at(-1);
    if (last && !['connectionLost', 'connectionRestored', 'adoptCalendarRules'].includes(last.command.type)) {
      assert.deepEqual(resumed.command(last as never), replayed.command(last as never)); equal(replayed, resumed);
    }
    for (const delta of [1, 15000]) {
      const now = replayed.world.now + delta; replayed.catchUp(now); resumed.catchUp(now); equal(replayed, resumed);
    }
    const command = { at: replayed.world.now, idempotencyKey: 'checkpoint-current-menu', command: { type: 'activity' as const, active: true, paused: true } };
    assert.deepEqual(resumed.command(command), replayed.command(command));
    replayed.catchUp(replayed.world.now + 86400000); resumed.catchUp(resumed.world.now + 86400000); equal(replayed, resumed); checked++;
  }
  assert.ok(checked >= 28);
});

test('rules1 through24 preserve an active rush through closing and retain the original producing batch deadlines', () => {
  const legacy = loadConfig(JSON.parse(readFileSync(new URL('../../../docs/config/legacy/economy-1.7.3.json', import.meta.url), 'utf8')));
  for (let version = 1; version <= 24; version++) {
    const raw = structuredClone((version < 21 ? legacy : config).raw);
    raw.onboarding.enabled = false; raw.patience.thuongMs = 1000000;
    const c = loadConfig(raw), game = new Game(c, 42, Date.parse('2026-09-10T10:00:00Z'));
    const send = (key: string, command: { type: 'startShift' | 'endShift' }) => game.replay({ at: game.world.now,
      idempotencyKey: key, command, result: { ok: true }, configVersion: c.version, rulesVersion: version as RulesVersion });
    assert.ok(send('open', { type: 'startShift' }).ok);
    game.advance(game.world.now + 1000); let resumed = restore(game); equal(game, resumed);
    const rush = game.world.shift!.rushes[0]; game.advance(rush.start + 1); resumed = restore(game);
    assert.equal(resumed.checkpoint().activeRushIndex, game.checkpoint().activeRushIndex);
    const closing = { at: game.world.now, idempotencyKey: 'end', command: { type: 'endShift' as const },
      result: { ok: true }, configVersion: c.version, rulesVersion: version as RulesVersion };
    assert.deepEqual(resumed.replay(closing), game.replay(closing)); equal(game, resumed);
    resumed = restore(game); game.advance(rush.end + 1); resumed.advance(rush.end + 1); equal(game, resumed);
  }
});

test('successful and rejected opening config candidates restore independently of the last logged candidate', () => {
  for (const game of [mixedPinGame(), new Game(pinConfig('pin-A'), 42, 0)]) {
    if (game.world.phase === 'resting') game.command({ at: game.world.now, idempotencyKey: 'open', command: { type: 'startShift' } });
    const current = game.config.version;
    const rejected = game.command({ at: game.world.now, idempotencyKey: 'rejected-next', command: { type: 'startShift' } }, nextPin());
    assert.equal(rejected.ok, false); assert.equal(game.config.version, current);
    const resumed = restore(game); equal(game, resumed);
    game.advance(game.world.now + 15000); resumed.advance(resumed.world.now + 15000); equal(game, resumed);
  }
});

test('unknown checkpoint versions, missing pins, wrong history counts and duplicate retry keys are not restored', () => {
  const game = new Game(); game.command({ at: 0, idempotencyKey: 'open', command: { type: 'startShift' } });
  const snapshot = { seed: game.seed, createdAt: game.createdAt, world: structuredClone(game.world), log: structuredClone(game.log) };
  for (const patch of [{ version: 999 }, { currentConfigVersion: 'missing' }, { commandCount: 0 }, { eventCount: 0 }, { activeRushIndex: -1 }]) {
    assert.throws(() => Game.restoreTrusted(game.configs, snapshot, { ...game.checkpoint(), ...patch } as never), /checkpoint:invalid/);
  }
  assert.throws(() => Game.restoreTrusted([], snapshot, game.checkpoint()), /checkpoint:invalid/);
  assert.throws(() => Game.restoreTrusted(game.configs, { ...snapshot, log: [...snapshot.log, snapshot.log[0]] },
    { ...game.checkpoint(), commandCount: 2 }), /checkpoint:invalid/);
});


test('rules24 hidden recovery and resting loss checkpoint exactly, including a retry after a later outage', () => {
  const g = new Game(config, 42, Date.parse('2026-09-10T10:00:00Z'));
  assert.ok(g.disconnect(g.world.now, null, 'initial-rest-loss').ok);
  let resumed = restore(g); equal(g, resumed);
  assert.ok(g.reconnect(g.world.now, 'first-recovery', false, true).ok);
  assert.ok(resumed.reconnect(resumed.world.now, 'first-recovery', false, true).ok); equal(g, resumed);
  resumed = restore(g);
  for (const game of [g, resumed]) {
    game.reconnect(game.world.now, 'visible', true);
    game.command({ at: game.world.now, idempotencyKey: 'open-after-recovery', command: { type: 'startShift' } });
    game.advance(game.world.now + 11100);
    game.disconnect(game.world.now, game.world.shift!.id, 'second-loss');
  }
  equal(g, resumed); resumed = restore(g);
  assert.ok(g.reconnect(g.createdAt, 'first-recovery', false, true).ok);
  assert.ok(resumed.reconnect(resumed.createdAt, 'first-recovery', false, true).ok); equal(g, resumed);
  const end = g.world.now + config.values.network.reconnectGraceMs + 300000;
  g.catchUp(end); resumed.catchUp(end); equal(g, resumed);
});
