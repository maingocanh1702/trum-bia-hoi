import { Game, config, loadConfig, encodeSave, decodeSave, menuReport, type Command, type DomainEvent } from '../../../../packages/engine/src';
import { fullHud } from './full-hud';

// Deterministic saves for fun-buy-buttons-reason (PLAN "Vui 3 ca" §4 + P3). Always the real engine, never hand-written JSON.
//   states        poor wallet, 3 tables: table 1 has guests, table 2 is affordable, table 3 (already Lv2) is not; buying another table is not affordable either
//   rich          rich wallet, shift not open: table 1 at Lv3 (its next level wants a badge), tables 2-3 affordable, another table affordable
//   beer|wait|seat  a shift open a few seconds before the first guest leaves for that reason: out of beer · waited too long · no seat
//   book          a shift under way in which guests left for different reasons (the counts differ per reason)
//   inspect       print the table levels and the leave events of a save read from stdin
const mode = process.argv[2] ?? 'states';
const start = Date.parse('2026-09-16T03:00:00Z');
const LEAD_MS = 4000; // how long before the first leaving guest the "live" saves are taken

const send = (g: Game, command: Command, key: string) => { const r = g.command({ at: g.world.now, idempotencyKey: key, command }); if (!r.ok) throw Error(`fixture:${JSON.stringify(command)}:${r.reason}`); };
const step = (g: Game, until: () => boolean, ms = 100, max = 60000) => { for (let i = 0; i < max && !until(); i++) g.advance(g.world.now + ms); if (!until()) throw Error('fixture:condition-not-reached'); };
const configured = (patch: (raw: typeof config.raw) => void) => { const raw = structuredClone(config.raw); fullHud(raw); patch(raw); return new Game(loadConfig(raw), 42, start); };
const leaving = (e: DomainEvent) => e.type === 'order_expired' || e.type === 'queue_overflow' || e.type === 'customer_left' && e.data.reason === 'queue';

/** A game, a way to get it to the moment just before the first guest leaves for the wanted reason, and the event that tells it. */
function liveBefore(build: () => Game, wanted: (e: DomainEvent) => boolean) {
  const probe = build(), seen = probe.world.events.length; // the scenario is deterministic: probe it once, rebuild it up to just before that event
  step(probe, () => probe.world.events.slice(seen).some(e => leaving(e) && wanted(e)));
  const event = probe.world.events.slice(seen).find(e => leaving(e) && wanted(e))!, g = build();
  g.advance(Math.max(g.world.now, event.at - LEAD_MS));
  if (g.world.events.some(e => leaving(e) && wanted(e) && e.at >= start)) throw Error('fixture:event-happened-too-early');
  return { save: encodeSave(g), now: g.world.now, event: { type: event.type, at: event.at, cause: event.data.cause ?? null }, leadMs: event.at - g.world.now };
}
const shiftOne = (patch: (raw: typeof config.raw) => void) => () => { const g = configured(patch); send(g, { type: 'startShift' }, 'open'); return g; };

if (mode === 'states') {
  const g = configured(raw => { raw.shift.startingCoinsBase = 3500; }); // 8 750 xu
  send(g, { type: 'upgradeTable', tableId: g.world.tables[1].id }, 'lv2'); // table 2 -> Lv2 (3 750): 5 000 left, the next level costs 15 000
  send(g, { type: 'startShift' }, 'open');
  step(g, () => g.world.tables[0].state !== 'empty');
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })) }));
} else if (mode === 'rich') {
  const g = configured(raw => { raw.shift.startingCoinsBase = 400_000; });
  for (const n of [1, 2]) { send(g, { type: 'upgradeTable', tableId: g.world.tables[0].id }, `lv${n}`); step(g, () => g.world.tables[0].state === 'empty'); }
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })) }));
} else if (mode === 'beer') {
  console.log(JSON.stringify(liveBefore(shiftOne(raw => { raw.onboarding.enabled = false; raw.inventory.startingStock.bia[0] = 0; }), e => e.type === 'order_expired' && ['beerStock', 'beerRefill'].includes(String(e.data.cause)))));
} else if (mode === 'wait') {
  console.log(JSON.stringify(liveBefore(shiftOne(raw => { raw.onboarding.enabled = false; }), e => e.type === 'order_expired' && !['beerStock', 'beerRefill', 'foodStock'].includes(String(e.data.cause)))));
} else if (mode === 'seat') {
  // One table, a long-patience guest seated and a full door queue: the next arrival is turned away.
  const build = () => { const g = configured(raw => { raw.onboarding.enabled = false; raw.upgrades.table.startingTables = 1; raw.spawn.baseMs = 2000; raw.patience.thuongMs = 180000; }); send(g, { type: 'startShift' }, 'open'); return g; };
  console.log(JSON.stringify(liveBefore(build, e => e.type === 'queue_overflow')));
} else if (mode === 'book') {
  // Mid-shift (the shift book opens from the nav only while a shift runs). Waiting is the common reason, beer rarer, groups are also turned
  // away: the counts differ, so the book's order is not the fixed default order.
  const g = configured(raw => { raw.onboarding.enabled = false; raw.upgrades.table.startingTables = 1; raw.spawn.baseMs = 3000; raw.patience.thuongMs = 30000; raw.inventory.startingStock.bia[0] = 0; });
  send(g, { type: 'startShift' }, 'open');
  step(g, () => g.world.shift!.stats.lost >= 1, 1000); send(g, { type: 'restock', dish: 'bia', mode: 'full' }, 'beer'); // the first guests found no beer; then the stall restocked and nobody served
  step(g, () => g.world.shift!.stats.lost >= 24 && g.world.shift!.stats.rejected >= 5, 1000);
  if (g.world.phase === 'resting') throw Error('fixture:shift-already-closed');
  const report = menuReport(g.world, g.config)!, stats = g.world.shift!.stats;
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, losses: report.losses, rejected: stats.rejected, lost: stats.lost }));
} else {
  const g = decodeSave(await new Promise<string>(resolve => { let text = ''; process.stdin.on('data', c => { text += c; }); process.stdin.on('end', () => resolve(text)); }));
  console.log(JSON.stringify({ coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })), phase: g.world.phase, leaves: g.world.events.filter(leaving).map(e => ({ type: e.type, cause: e.data.cause ?? null })) }));
}
