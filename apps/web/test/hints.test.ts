import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { Game, config, loadConfig, guestPatienceLeft, decodeSave } from '../../../packages/engine/src';
import { HINT_TARGET, holds, hintRules, nextHint } from '../src/hints';

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

// B2.2: the moment of each hint, on the fixtures the DOM spec boots (hints.spec.ts), read back through the engine's own decoder.
const at = (mode: string) => decodeSave(JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'apps/web/test/fixtures/hints.ts', mode], { encoding: 'utf8' })).save);
test('B2.2 each just-in-time hint has its moment: stock, glasses, slot, rush and freshness; the most urgent first; a lit hint waits while another spotlight is on', () => {
  for (const mode of ['stock', 'glasses', 'slot', 'rush', 'freshness'] as const) {
    const g = at(mode), hint = nextHint(g.world, g.config, []);
    assert.equal(hint?.id, mode, mode);
    assert.equal(holds(hint!, g.world, g.config), true, `${mode} holds`);
    assert.equal(nextHint(g.world, g.config, [mode]), null, `${mode} shown once`);
    assert.equal(nextHint(g.world, g.config, [], { spotBusy: true })?.id ?? null, HINT_TARGET[mode] ? null : mode, `${mode} with another spotlight on`);
    // Review B2-r1: the strip, the sink and the rush pill are HUD; with the HUD hidden (a pin's shift 1) their hints wait, and a shown one stops holding.
    const hudOnly = ['stock', 'glasses', 'rush'].includes(mode);
    assert.equal(nextHint(g.world, g.config, [], { hud: false })?.id === mode, !hudOnly, `${mode} without the HUD`);
    assert.equal(holds(hint!, g.world, g.config, { hud: false }), !hudOnly, `${mode} holds without the HUD`);
  }
  // Review B2-r1: the glasses hint needs a real shortage (glasses at the sink, fewer clean than the beers poured): a returning save at keg Lv3, its 12-beer
  // reserve above the 10 glasses, with every glass clean in an open shift gets none.
  const clean = at('clean'), others = ['tipWindow', 'rush', 'freshness', 'stock', 'slot'];
  assert.equal(clean.world.equipment.keg, 3); assert.ok(clean.world.glasses.every(x => x.state === 'clean'));
  assert.equal(nextHint(clean.world, clean.config, others), null, 'no glasses hint while every glass is clean');
  const short = at('glasses');
  assert.ok(short.world.glasses.some(x => x.state === 'dirty' || x.state === 'washing'), 'the glasses fixture has glasses at the sink');
  assert.equal(nextHint(short.world, short.config, others)?.id, 'glasses');
  const nohud = at('nohud'); // the DOM case of hints.spec.ts: the moment is there, the HUD is not
  assert.equal(nextHint(nohud.world, nohud.config, [])?.id, 'stock'); assert.equal(nextHint(nohud.world, nohud.config, [], { hud: false }), null);
  const both = at('both');
  assert.equal(nextHint(both.world, both.config, [])?.id, 'stock'); assert.equal(nextHint(both.world, both.config, ['stock'])?.id, 'slot');
  assert.equal(nextHint(both.world, both.config, ['stock'], { upgrades: false }), null, 'no tappable place while the Upgrades sheet is hidden');
});
test('B2.2 shift 1 of a new save has no freshness hint: beer does not go flat there (JSON 2.1.4 staleDisabled)', () => {
  const g = new Game(undefined, 42, Date.parse('2026-10-23T10:00:00+07:00'));
  g.command({ idempotencyKey: 'f-start', at: g.world.now, command: { type: 'startShift' } });
  for (let i = 0; i < 4000 && !g.world.tables.some(t => t.order?.items.every(x => x.state === 'ready')); i++) g.advance(g.world.now + 100);
  assert.ok(g.world.tables.some(t => t.order?.state === 'pending' && t.order.items.some(x => x.dish === 'bia' && x.state === 'ready')), 'a poured beer waits');
  assert.equal(nextHint(g.world, g.config, [])?.id === 'freshness', false);
});
