import { Game, config, loadConfig, encodeSave, guestPatienceLeft, freshnessMs } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Founder 2026-10-22 (Part B2.1): the moments of one order that serve feedback speaks about, made with real commands and clock steps.
//   serve-feedback window   -> { open, late, stale }: the same kind of shop at three moments of a ready order (tip window open; closed by the guest's own
//                              patience; still inside the patience share but the beer went flat), onboarding off so nothing else speaks
//   serve-feedback hint     -> a brand-new save (onboarding on, the bundled shift 1) whose first order is ready and already past the tip window: the next tap on
//                              Serve is the save's first late serve
const mode = process.argv[2] ?? 'window';
const start = Date.parse('2026-10-23T10:00:00+07:00');
function readyOrder(raw: typeof config.raw, seed = 42) {
  const g = new Game(loadConfig(raw), seed, start), w = g.world;
  const r = g.command({ idempotencyKey: 'sf-start', at: w.now, command: { type: 'startShift' } });
  if (!r.ok) throw Error(`fixture:startShift:${r.reason}`);
  for (let i = 0; i < 4000 && !(w.tables[0].order && w.tables[0].order.items.every(x => x.state === 'ready')); i++) g.advance(w.now + 100);
  const table = w.tables[0], order = table.order;
  if (!order || order.state !== 'pending' || !table.group) throw Error('fixture:no-ready-order');
  const own = Math.min(...table.group.customers.map(x => x.patienceMs));
  return { g, w, table, order, own };
}
const moment = (g: Game) => ({ save: encodeSave(g), now: g.world.now });

if (mode === 'window') {
  const raw = fullHud(structuredClone(config.raw)); raw._meta.version = 'serve-feedback-fixture'; raw.onboarding.enabled = false; raw.spawn.pPair = 0;
  raw.upgrades.cooler.freshnessMs[0] = raw.shift.durationMs; // the patience moments are judged with a beer that never goes flat
  const a = readyOrder(raw), threshold = raw.tip.patienceThreshold;
  a.g.advance(a.order.placedAt + Math.round(a.own * (1 - threshold) / 2)); // half of the tip window used
  if (guestPatienceLeft(a.w, a.order, a.table.group!.customers[0]) < threshold) throw Error('fixture:open-not-open');
  const open = moment(a.g);
  a.g.advance(a.order.placedAt + Math.round(a.own * (1 - threshold / 2))); // past the window, the guest still waits
  if (a.order.state !== 'pending' || guestPatienceLeft(a.w, a.order, a.table.group!.customers[0]) >= threshold) throw Error('fixture:late-not-late');
  const late = moment(a.g);
  // A flat beer closes the tip window even while the guest's patience share is still above the threshold.
  const rawStale = fullHud(structuredClone(config.raw)); rawStale._meta.version = 'serve-feedback-fixture'; rawStale.onboarding.enabled = false; rawStale.spawn.pPair = 0;
  rawStale.patience.thuongMs *= 5; // a test input: the guest waits long enough for the beer to go flat first
  const b = readyOrder(rawStale), glass = Math.max(...b.order.items.filter(x => x.glassId).map(x => x.readyAt!));
  b.g.advance(glass + freshnessMs(b.w, b.g.config) + 100);
  if (b.order.state !== 'pending' || guestPatienceLeft(b.w, b.order, b.table.group!.customers[0]) < threshold) throw Error('fixture:stale-left-the-window');
  process.stdout.write(JSON.stringify({ open, late, stale: moment(b.g), threshold }));
} else if (mode === 'hint') {
  const raw = fullHud(structuredClone(config.raw)); // onboarding on: the bundled shift 1 of a new save (first guest a single regular, one beer, no flat beer)
  const a = readyOrder(raw);
  a.g.advance(a.order.placedAt + Math.round(a.own * (1 - raw.tip.patienceThreshold / 2)));
  if (a.order.state !== 'pending' || guestPatienceLeft(a.w, a.order, a.table.group!.customers[0]) >= raw.tip.patienceThreshold) throw Error('fixture:hint-not-late');
  process.stdout.write(JSON.stringify({ ...moment(a.g), completedShifts: a.w.completedShifts }));
} else throw Error(`fixture:mode ${mode}`);
