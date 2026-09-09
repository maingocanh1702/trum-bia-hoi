import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, rushStatus, kickAllQuote, encodeSave, decodeSave, type Command, type Economy } from '../src';
const send = (g: Game, command: Command, at = g.world.now) => g.command({ idempotencyKey: `rush-${g.log.length}`, at, command });
function create(patch?: (c: Economy) => void) {
  const raw = structuredClone(config.raw); raw.onboarding.enabled = false; raw.patience.thuongMs = 1000000;
  patch?.(raw);
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-09-08T10:00:00Z'));
  // These clock regressions retain legacy layouts, including historically accepted overlapping slots.
  assert.deepEqual(g.replay({ idempotencyKey: 'legacy-rush-open', at: g.world.now, command: { type: 'startShift' }, rulesVersion: 7, configVersion: g.config.version, result: { ok: true } }), { ok: true });
  return g;
}

test('warning fires exactly once at the configured boundary and active rush has its own remaining clock', () => {
  const g = create(), w = g.world, first = w.shift!.rushes[0];
  const warningAt = first.start - g.config.values.rush.schedule.warningMs;
  g.advance(warningAt - 1); assert.equal(rushStatus(w, g.config).next!.warning, false);
  assert.equal(w.events.filter(e => e.type === 'rush_warning').length, 0);
  g.advance(warningAt); assert.equal(rushStatus(w, g.config).next!.warning, true);
  g.advance(warningAt + 1000);
  assert.equal(w.events.filter(e => e.type === 'rush_warning').length, 1);
  assert.equal(w.events.find(e => e.type === 'rush_warning')!.at, warningAt);
  g.advance(first.start);
  const status = rushStatus(w, g.config);
  assert.equal(status.active!.kind, 'light'); assert.equal(status.active!.remainingMs, first.end - first.start);
  assert.equal(status.next!.kind, 'heavy');
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('closing ends the current rush on time, prices the boundary serve normally and never starts a later rush', () => {
  const g = create(), w = g.world, first = w.shift!.rushes[0], second = w.shift!.rushes[1];
  g.advance(first.start + 1000); send(g, { type: 'endShift' });
  const arrived = w.shift!.stats.arrived;
  assert.equal(rushStatus(w, g.config).next, null); assert.equal(w.shift!.rush, 'light');
  g.advance(first.end - 1); assert.equal(w.shift!.rush, 'light');
  const table = w.tables.find(t => t.order?.items.every(i => i.state === 'ready'))!;
  assert.deepEqual(send(g, { type: 'serve', tableId: table.id, orderId: table.order!.id }, first.end), { ok: true, outcome: 'stale', amount: 200 });
  assert.equal(w.shift!.rush, 'none'); assert.equal(w.events.filter(e => e.type === 'rush_ended').length, 1);
  assert.equal(w.events.find(e => e.type === 'rush_ended')!.at, first.end);
  g.advance(second.start + 1);
  assert.equal(w.shift!.rush, 'none'); assert.equal(w.shift!.stats.arrived, arrived);
  assert.equal(w.events.filter(e => e.type === 'rush_started').length, 1);
  assert.equal(w.events.filter(e => e.type === 'rush_warning').length, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('hidden time moves warning/start/end deadlines and never repeats an already shown warning', () => {
  const g = create(), w = g.world, first = w.shift!.rushes[0];
  g.advance(first.start - 15000); const remaining = rushStatus(w, g.config).next!.remainingMs;
  send(g, { type: 'activity', active: false }); g.advance(w.now + 86400000);
  assert.equal(rushStatus(w, g.config).next!.remainingMs, remaining);
  send(g, { type: 'activity', active: true });
  assert.equal(w.events.filter(e => e.type === 'rush_warning').length, 1);
  g.advance(first.start); send(g, { type: 'endShift' });
  send(g, { type: 'activity', active: false }); g.advance(w.now + 60000); send(g, { type: 'activity', active: true });
  g.advance(first.end); assert.equal(w.shift!.rush, 'none');
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});

test('manual finalization ends an active rush once and rest never advertises a future rush', () => {
  const g = create(c => { c.shift.startingCoinsBase = 10000; }), w = g.world, first = w.shift!.rushes[0];
  g.advance(first.start + 1000);
  assert.ok(send(g, { type: 'kickAll', shiftId: w.shift!.id, maxCost: kickAllQuote(w, g.config).cost }).ok);
  assert.equal(w.phase, 'resting'); assert.equal(w.shift!.rush, 'none');
  assert.deepEqual(rushStatus(w, g.config), { active: null, next: null });
  g.advance(w.shift!.endsAt);
  assert.equal(w.events.filter(e => e.type === 'rush_ended').length, 1);
});

test('tiny and large advances preserve all warning and closing-rush event timestamps', () => {
  const a = create(), b = create();
  for (const g of [a, b]) send(g, { type: 'endShift' }, g.world.shift!.rushes[0].start + 1000);
  const end = a.world.shift!.rushes[1].end + 1;
  a.advance(end); while (b.world.now < end) b.advance(Math.min(end, b.world.now + 1000));
  assert.deepEqual(a.world, b.world);
});

test('real v4 closing rush replay preserves old earnings, then a same-timestamp current command synchronizes the clock', () => {
  const read = (name: string) => readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8');
  const text = read('legacy-rush-v4'), expected = JSON.parse(read('legacy-rush-v4-expected')), g = decodeSave(text);
  for (const key of ['coins', 'reputation', 'phase', 'nextId'] as const) assert.equal(g.world[key], expected[key]);
  assert.equal(g.world.shift!.rush, expected.rush); assert.deepEqual(g.world.shift!.stats, expected.stats);
  assert.deepEqual(g.log.at(-1)!.result, expected.result); assert.deepEqual(g.world.events, JSON.parse(text).events);
  assert.ok(g.log.every(e => e.rulesVersion === 4));
  send(g, { type: 'activity', active: true });
  assert.equal(g.world.coins, expected.coins); assert.equal(g.world.shift!.rush, 'none');
  assert.equal(g.world.events.at(-2)!.type, 'rush_ended'); assert.equal(g.world.events.at(-1)!.type, 'attendance_day_opened'); assert.equal(g.log.at(-1)!.rulesVersion, 19);
  assert.deepEqual(decodeSave(encodeSave(g)).world, g.world);
});

test('zero warnings or zero scheduled slots disable their events, while fractional time and counts fail closed', () => {
  for (const patch of [(c: Economy) => { c.rush.schedule.warningMs = .5; }, (c: Economy) => { c.rush.schedule.perShift = .5; }, (c: Economy) => { c.rush.light.durationMs = 0; }]) assert.throws(() => create(patch));
  const a = create(c => { c.rush.schedule.warningMs = 0; }); a.advance(a.world.shift!.rushes[0].start);
  assert.equal(a.world.events.filter(e => e.type === 'rush_warning').length, 0);
  const b = create(c => { c.rush.schedule.perShift = 0; }); b.advance(b.world.shift!.endsAt);
  assert.equal(b.world.events.filter(e => e.type.startsWith('rush_')).length, 0);
});


test('stopping arrivals before the first warning cancels upcoming rush activation without pausing service', () => {
  const g = create(), w = g.world;
  g.advance(w.shift!.nextSpawnAt + g.config.values.runtime.tableSeatingMs);
  send(g, { type: 'endShift' }); g.advance(w.shift!.rushes[0].end);
  assert.equal(w.phase, 'closing'); assert.equal(w.shift!.rush, 'none');
  assert.equal(w.events.filter(e => e.type.startsWith('rush_')).length, 0);
  assert.deepEqual(rushStatus(w, g.config), { active: null, next: null });
});


test('closing binds the original slot even when a configured later rush has the same kind and overlaps it', () => {
  const g = create(c => { c.rush.schedule.perShift = 3; c.rush.light.durationMs = 500000; }), w = g.world;
  const first = w.shift!.rushes[0], last = w.shift!.rushes[2];
  assert.equal(first.kind, last.kind); assert.ok(last.start < first.end);
  g.advance(first.start + 1); send(g, { type: 'endShift' });
  assert.equal(w.shift!.rushUntil, first.end);
  g.advance(first.end);
  assert.equal(w.shift!.rush, 'none'); assert.equal(w.shift!.rushUntil, null);
  assert.equal(w.events.filter(e => e.type === 'rush_started').length, 1);
  assert.deepEqual(decodeSave(encodeSave(g)).world, w);
});
