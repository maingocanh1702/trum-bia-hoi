import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, encodeSave, decodeSave } from '../../../packages/engine/src';
import { dispatch } from '../src/local';

test('returning browser guests keep a running config pin, then adopt a newer bundled seed without losing receipts', () => {
  mock.method(Date, 'now', () => 0);
  try {
    const old = structuredClone(config.raw); old._meta.version = '2.0.3'; old.lifePath[1].requires!.push('dog');
    const g = new Game(loadConfig(old), 42, 0);
    g.command({ at: 0, idempotencyKey: 'old-open', command: { type: 'startShift' } });
    const prefix = structuredClone(g.world.events);
    dispatch(g, { type: 'activity', active: true });
    assert.equal(g.config.version, old._meta.version);
    dispatch(g, { type: 'startShift' }); // already open cannot switch pins
    assert.equal(g.config.version, old._meta.version);
    dispatch(g, { type: 'endShift' });
    assert.equal(g.world.phase, 'resting');
    assert.ok(dispatch(g, { type: 'startShift' }).ok);
    assert.equal(g.config.version, config.version);
    assert.deepEqual(g.world.events.slice(0, prefix.length), prefix);
    assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
    assert.equal(g.log.find(x => x.idempotencyKey === 'old-open')!.configVersion, old._meta.version);
  } finally { mock.restoreAll(); }
});

test('same, newer and custom browser config versions are not replaced by the bundle', () => {
  mock.method(Date, 'now', () => 0);
  try {
    for (const version of [config.version, '2.99.0', 'local-preview']) {
      const raw = structuredClone(config.raw); raw._meta.version = version;
      const g = new Game(loadConfig(raw), 42, 0);
      assert.ok(dispatch(g, { type: 'startShift' }).ok);
      assert.equal(g.config.version, version);
    }
  } finally { mock.restoreAll(); }
});
