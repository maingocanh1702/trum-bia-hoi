import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, guestPatienceLeft } from '../../../packages/engine/src';
import { holds, hintRules, nextHint } from '../src/hints';

// Founder 2026-10-22 (Part B2): the pure choice of a just-in-time hint (hints.ts), on real engine states. The DOM side (one banner, never over a sheet, done once)
// is pinned in serve-feedback.spec.ts.
const start = Date.parse('2026-10-23T10:00:00+07:00');
function served(late: boolean, mutate: (raw: typeof config.raw) => void = () => {}) {
  const raw = structuredClone(config.raw); mutate(raw);
  const g = new Game(loadConfig(raw), 42, start), w = g.world;
  g.command({ idempotencyKey: 'h-start', at: w.now, command: { type: 'startShift' } });
  for (let i = 0; i < 4000 && !(w.tables[0].order && w.tables[0].order.items.every(x => x.state === 'ready')); i++) g.advance(w.now + 100);
  const table = w.tables[0], order = table.order!, own = Math.min(...table.group!.customers.map(x => x.patienceMs));
  if (late) g.advance(order.placedAt + Math.round(own * (1 - raw.tip.patienceThreshold / 2)));
  assert.equal(guestPatienceLeft(w, order, table.group!.customers[0]) < raw.tip.patienceThreshold, late);
  const r = g.command({ idempotencyKey: 'h-serve', at: w.now, command: { type: 'serve', tableId: table.id, orderId: order.id } });
  assert.equal(r.ok, true);
  return g;
}

test('B2.1d the first late serve of an open shift is the moment of the tip-window hint; a tipped serve, a shown hint or onboarding off is not', () => {
  const late = served(true), hint = nextHint(late.world, late.config, []);
  assert.deepEqual(hint, { id: 'tipWindow', since: late.world.serves.length });
  assert.equal(holds(hint!, late.world, late.config), true);
  assert.equal(nextHint(late.world, late.config, ['tipWindow']), null, 'shown once: never again (neverRepeatAfterDone)');
  const early = served(false);
  assert.equal(nextHint(early.world, early.config, []), null, 'a serve inside the tip window needs no hint');
  const off = served(true, raw => { raw.onboarding.enabled = false; });
  assert.equal(nextHint(off.world, off.config, []), null, 'hints belong to onboarding');
  const none = served(true, raw => { raw.onboarding.hints.maxConcurrent = 0; });
  assert.equal(nextHint(none.world, none.config, []), null, 'maxConcurrent 0 shows nothing');
  const repeat = served(true, raw => { raw.onboarding.hints.neverRepeatAfterDone = false; });
  assert.deepEqual(nextHint(repeat.world, repeat.config, ['tipWindow']), { id: 'tipWindow', since: repeat.world.serves.length }, 'without neverRepeatAfterDone a done hint may speak again');
});

test('B2.1d the tip-window hint stops mattering at the next serve or when the shift closes; pinned contents without `onboarding.hints` read the seed rules', () => {
  const g = served(true), hint = nextHint(g.world, g.config, [])!;
  g.command({ idempotencyKey: 'h-end', at: g.world.now, command: { type: 'endShift' } });
  assert.equal(holds(hint, g.world, g.config), false, 'closing: the shift is no longer open');
  const next = served(true);
  assert.equal(holds({ id: 'tipWindow', since: next.world.serves.length - 1 }, next.world, next.config), false, 'a serve after the hint appeared ends it');
  const raw = structuredClone(config.raw) as { onboarding: Record<string, unknown> }; delete raw.onboarding.hints;
  assert.deepEqual(hintRules({ values: raw } as unknown as Parameters<typeof hintRules>[0]), config.values.onboarding.hints);
});
