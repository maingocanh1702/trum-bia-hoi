import { Game, config, loadConfig, encodeSave, decodeSave, menuReport, type Command, type DomainEvent } from '../../../../packages/engine/src';
import capacityModel from '../../../../docs/config/legacy/economy-2.0.4.json';
import { fullHud } from './full-hud';
import { steadyDemand } from '../../../../packages/engine/test/fixtures/steady-demand';

// Deterministic saves for fun-buy-buttons-reason (PLAN "Vui 3 ca" §4 + P3). Always the real engine, never hand-written JSON.
// The first three run on a capacity snapshot (the frozen 2.0.4 file: an old save pinned before the seat model keeps table levels = seats until its
// next opening), where Wave 1 wrote them; the seat-* modes are their counterparts on the bundled seat model (rules 28).
//   states        poor wallet, 3 tables: table 1 has guests, table 2 is affordable, table 3 (already Lv2) is not; buying another table is not affordable either
//   rich          rich wallet, shift not open: table 1 at Lv3 (its next level wants a badge), tables 2-3 affordable, another table affordable
//   maxed         both tables of a two-table shop are at their top level (the badge gate of Lv4 is lifted in this config): one has guests, one is empty
//   seat-states   seat model, poor wallet, 2 tables of one chair: table 3 is out of reach, a chair waits for four tables, a level wants two chairs
//   seat-rich     seat model, rich wallet, four tables of one chair, shift not open: every chair for sale, no level yet, the alley is full
//   seat-maxed    seat model, rich wallet, four tables: tables 1-2 are pairs at their top level (life-path gates lifted), table 1 has guests, table 2 is empty
//   beer|wait|seat  a shift open a few seconds before the first guest leaves for that reason: out of beer · waited too long · no seat
//   book          a shift under way in which guests left for different reasons (the counts differ per reason)
//   inspect       print the table levels and the leave events of a save read from stdin
const mode = process.argv[2] ?? 'states';
const start = Date.parse('2026-09-16T03:00:00Z');
const LEAD_MS = 4000; // how long before the first leaving guest the "live" saves are taken

const send = (g: Game, command: Command, key: string) => { const r = g.command({ at: g.world.now, idempotencyKey: key, command }); if (!r.ok) throw Error(`fixture:${JSON.stringify(command)}:${r.reason}`); };
const step = (g: Game, until: () => boolean, ms = 100, max = 60000) => { for (let i = 0; i < max && !until(); i++) g.advance(g.world.now + ms); if (!until()) throw Error('fixture:condition-not-reached'); };
const configured = (patch: (raw: typeof config.raw) => void) => { const raw = structuredClone(config.raw); fullHud(raw); patch(raw); return new Game(loadConfig(raw), 42, start); };
/** A capacity snapshot with a custom version, so the bundled seat model never replaces it at an opening. */
const pinned = (patch: (raw: typeof capacityModel) => void) => { const raw = structuredClone(capacityModel); fullHud(raw); raw._meta.version = 'capacity-fixture'; patch(raw); return new Game(loadConfig(raw), 42, start); };
/** A seat-model shop with a wallet for real purchases: `tables` tables owned and the first `pairs` of them with a second chair. */
function seatShop(tables: number, pairs: number, patch: (raw: typeof config.raw) => void = () => {}) {
  const g = configured(raw => { raw.shift.startingCoinsBase = 400_000; patch(raw); });
  while (g.world.tables.length < tables) send(g, { type: 'buyTable' }, `table-${g.world.tables.length + 1}`);
  for (const table of g.world.tables.slice(0, pairs)) send(g, { type: 'buyChair', tableId: table.id }, `chair-${table.id}`);
  return g;
}
const facts = (g: Game) => ({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state, seats: t.capacity })) });
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
  const g = pinned(raw => { raw.shift.startingCoinsBase = 3500; }); // 8 750 xu
  send(g, { type: 'upgradeTable', tableId: g.world.tables[1].id }, 'lv2'); // table 2 -> Lv2 (3 750): 5 000 left, the next level costs 15 000
  send(g, { type: 'startShift' }, 'open');
  step(g, () => g.world.tables[0].state !== 'empty');
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })) }));
} else if (mode === 'rich') {
  const g = pinned(raw => { raw.shift.startingCoinsBase = 400_000; });
  for (const n of [1, 2]) { send(g, { type: 'upgradeTable', tableId: g.world.tables[0].id }, `lv${n}`); step(g, () => g.world.tables[0].state === 'empty'); }
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })) }));
} else if (mode === 'maxed') {
  // The shipped Lv4 asks for the Kết Nối badge (a social feature), so the top level is reached with that one gate lifted: tables can then really be upgraded to the end.
  const g = pinned(raw => {
    raw.shift.startingCoinsBase = 400_000; raw.upgrades.table.startingTables = 2;
    const top = raw.upgrades.table.levels[3]; top.requiredBadge = ''; top.repBase = [0, top.repBase![1]];
  });
  for (const [t, table] of g.world.tables.entries()) for (const n of [1, 2, 3]) send(g, { type: 'upgradeTable', tableId: table.id }, `t${t}lv${n}`);
  send(g, { type: 'startShift' }, 'open'); step(g, () => g.world.tables[0].state !== 'empty');
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })) }));
} else if (mode === 'seat-states') {
  // One table bought with the wallet the shop started with, so the next table (4 000) and every chair are out of reach: 750 xu are left.
  const g = configured(raw => { raw.shift.startingCoinsBase += raw.upgrades.table.tablePriceBase[0]; });
  send(g, { type: 'buyTable' }, 'table-2');
  console.log(JSON.stringify(facts(g)));
} else if (mode === 'seat-rich') {
  console.log(JSON.stringify(facts(seatShop(4, 0))));
} else if (mode === 'seat-maxed') {
  // The shipped levels sit behind Duong Len Trum (LP1 / LP2 / LP4, S4), earned over days: those gates are lifted here so two pairs can really be upgraded to the end.
  const g = seatShop(4, 2, raw => { for (const row of raw.upgrades.table.tableUpgrade.levels) row.lifePathGate = 0; });
  for (const table of g.world.tables.slice(0, 2)) for (const n of [1, 2, 3]) send(g, { type: 'upgradeTable', tableId: table.id }, `${table.id}-lv${n}`);
  send(g, { type: 'startShift' }, 'open'); step(g, () => g.world.tables[0].state !== 'empty');
  console.log(JSON.stringify(facts(g)));
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
  const g = configured(raw => { steadyDemand(raw); raw.onboarding.enabled = false; raw.upgrades.table.startingTables = 1; raw.spawn.baseMs = 3000; raw.patience.thuongMs = 30000; raw.inventory.startingStock.bia[0] = 0; }); // steady demand: the subject is the book, not the door cadence
  send(g, { type: 'startShift' }, 'open');
  // The first guests found no beer (seat model: a pair or a queued group may time out first, so wait for a loss that is really about beer); then the stall restocked and nobody served.
  const beerLost = () => { const l = menuReport(g.world, g.config)!.losses; return l.beerStock + l.beerRefill; };
  step(g, () => beerLost() >= 1, 1000); send(g, { type: 'restock', dish: 'bia', mode: 'full' }, 'beer');
  step(g, () => g.world.shift!.stats.lost >= 24 && g.world.shift!.stats.rejected >= 5 && (g.world.shift!.stats.noSeat ?? 0) >= 2, 1000); // and pairs turned away for lack of a two-chair table (S3: the book counts them)
  if (g.world.phase === 'resting') throw Error('fixture:shift-already-closed');
  const report = menuReport(g.world, g.config)!, stats = g.world.shift!.stats;
  console.log(JSON.stringify({ save: encodeSave(g), now: g.world.now, losses: report.losses, rejected: stats.rejected, noSeat: stats.noSeat ?? 0, lost: stats.lost }));
} else {
  const g = decodeSave(await new Promise<string>(resolve => { let text = ''; process.stdin.on('data', c => { text += c; }); process.stdin.on('end', () => resolve(text)); }));
  console.log(JSON.stringify({ coins: g.world.coins, tables: g.world.tables.map(t => ({ level: t.level, state: t.state })), phase: g.world.phase, leaves: g.world.events.filter(leaving).map(e => ({ type: e.type, cause: e.data.cause ?? null })) }));
}
