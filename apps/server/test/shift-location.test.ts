import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, leaseQuote, encodeSave, decodeSave, type Command } from '@tbh/engine';
import { shiftLocationReport } from '../../shared/shift-location';
const send = (g: Game, command: Command) => {
  const result = g.command({ at: g.world.now, command, idempotencyKey: `location-book-${g.log.length}` });
  assert.equal(result.ok, true, result.reason ?? 'command rejected'); return result;
};
function tenant() {
  const raw = structuredClone(config.raw); raw.shift.startingCoinsBase = 1000000;
  raw.lifePath[1].lifetimeBase = 1; raw.lifePath[1].requires = raw.lifePath[1].requires!.map(() => 'LP0');
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-09T04:00:00Z'));
  send(g, { type: 'startShift' }); g.advance(g.world.now + 11000);
  const table = g.world.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id });
  send(g, { type: 'endShift' }); g.advance(g.world.now + 3600000); return g;
}
function rent(g: Game, locationId = 'ngo_cho') {
  const q = leaseQuote(g.world, g.config, locationId);
  send(g, { type: 'rentLocation', locationId, leaseId: q.leaseId, maxCost: q.cost });
}
const rows = (g: Game) => shiftLocationReport(g.world, g.config)!.locations;

test('shift book retains the paid location after moving at rest, expiry and replay without changing state', () => {
  const g = tenant(), baseline = rows(g); rent(g);
  assert.deepEqual(rows(g), baseline, 'a new lease must not relabel the previous closed shift');
  send(g, { type: 'startShift' }); const expected = [{ id: 'ngo_cho', mult: 1.019 }]; // the sealed 2.1.0 ramp: Ngo Cho is the first step above the free alley (1.0), not the old 1.1
  assert.deepEqual(rows(g), expected); send(g, { type: 'endShift' });
  rent(g, 'ben_xe'); const before = encodeSave(g);
  assert.deepEqual(rows(g), expected); assert.equal(encodeSave(g), before);
  g.advance(g.world.lease!.expiresAt + 1000);
  assert.deepEqual(rows(g), expected); assert.deepEqual(rows(decodeSave(encodeSave(g))), expected);
});

test('lease expiry in a paused shift shows both actual multipliers, using its pinned config', () => {
  const g = tenant(); rent(g);
  const raw = structuredClone(g.config.raw); raw._meta.version = 'location-report-next';
  raw.locations.list.find(row => row.id === 'ngo_cho')!.mult = 1.15;
  assert.ok(g.command({ at: g.world.now, command: { type: 'startShift' }, idempotencyKey: 'next-config' }, loadConfig(raw)).ok);
  send(g, { type: 'activity', active: true, paused: true });
  g.advance(g.world.lease!.expiresAt);
  const expected = [{ id: 'ngo_cho', mult: 1.15 }, { id: 'hem_nho', mult: 1 }];
  assert.deepEqual(rows(g), expected); assert.deepEqual(rows(decodeSave(encodeSave(g))), expected);
  assert.equal(shiftLocationReport(g.world, config), null, 'a different config cannot reprice historical copy');
});

test('missing shift provenance does not substitute the current location', () => {
  const g = new Game(); assert.equal(shiftLocationReport(g.world, g.config), null);
  send(g, { type: 'startShift' });
  assert.deepEqual(rows(g), [{ id: 'hem_nho', mult: 1 }]);
  g.world.events = []; assert.equal(shiftLocationReport(g.world, g.config), null);
});
