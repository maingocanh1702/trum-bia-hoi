import { readFileSync } from 'node:fs';
import { Game, config, loadConfig, encodeSave, decodeSave, kickTableQuote, kickTableRule, restockQuote, DISHES, WEATHER, type Command, type Table } from '../../../../packages/engine/src';
import { serveNext } from '../../../../packages/engine/sim/policy';
import { fullHud } from './full-hud';

// Wave 3 "Mời về" (plan section 6, D3): saves made by the real engine for kick-table.spec.ts. Every mode but `pin-rest` is an OPEN shift of a seat-model shop, played
// with real commands (restock, serve) until the state the spec needs exists; the clock of the page then stands still at `now`.
//   linger    four tables of two chairs, a lingering pair (its tray served, `consuming`), another table waiting for its food, a group at the door, a wallet that pays
//   poor      one table, an empty wallet, a VIP sipping his served tray: his kick costs more than he paid
//   occupied  a table a Chi Pheo keeps after his round (`occupied`): 0 coins, -2 reputation
//   pin       `linger` on a content of JSON 2.1.0 without the `kickTable` section (the S5/S6 contents): the shift it is pinned for offers no "Mời về"
//   pin-rest  the same 2.1.0 pin after one whole shift, at rest: the bundle is 2.1.3 (2.1.1 since owner call 1, 2026-10-22; 2.1.2 the founder's HUD override, 2.1.3 his
//             shift-1 fixes), a numerically newer label, so the browser opens the next shift on it (`local.ts` `openingConfig`) and with it kickTable
//   first     shift 1 of a new save (onboarding on, the HUD revealed from shift 1 since JSON 2.1.2) with a lingering table
//   second    the same new save after its shift 1 (played to its natural end), in shift 2 with a lingering table: "Mời về" is revealed from there (JSON 2.1.3)
//   closing   `linger`, then the player closes the shift (`endShift`): the lingering pair still sits, the shift is `closing` (the command would still take it)
//   inspect   reads a browser save back through the engine (stdin)
const mode = process.argv[2] ?? 'linger';
const lingering = (t: Table) => t.state === 'consuming' || t.state === 'occupied';
if (mode === 'inspect') {
  const g = decodeSave(JSON.parse(readFileSync(0, 'utf8')).save), w = g.world;
  process.stdout.write(JSON.stringify({ coins: w.coins, reputation: w.reputation, phase: w.phase, paused: Boolean(w.paused), lost: w.shift?.stats.lost ?? null, spent: w.shift?.stats.spent ?? null,
    queue: w.queue.map(group => group.id), tables: w.tables.map(t => ({ id: t.id, state: t.state, group: t.group?.id ?? null })),
    kicks: w.events.filter(e => e.type === 'table_kicked').map(e => e.data), kickCommands: g.log.filter(entry => entry.command.type === 'kickTable').map(entry => ({ ...entry.command, result: entry.result })),
    left: w.events.filter(e => e.type === 'customer_left').length, completedShifts: w.completedShifts, configVersion: g.config.version, shiftConfigVersion: w.shift?.configVersion ?? null,
    feeRate: kickTableRule(g.config.values)?.feeRate ?? null }));
} else {
  const raw = structuredClone(config.raw);
  const fresh = mode === 'first' || mode === 'second', pinned = mode === 'pin' || mode === 'pin-rest';
  if (!fresh) { fullHud(raw); raw.onboarding.enabled = false; }
  raw._meta.version = pinned ? '2.1.0' : 'kick-table-fixture'; // a pin keeps its own content until a numerically newer bundle opens its next shift
  if (pinned) { delete (raw as { kickTable?: unknown }).kickTable; raw._meta.governance.tiers.A.sections = raw._meta.governance.tiers.A.sections.filter(name => name !== 'kickTable'); }
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  raw.rush.schedule.perShift = 0; raw.spawn.capacityDemand.maxMult = 1;
  const weights: Record<string, number> = mode === 'poor' ? { vip: 1, thuong: 0.001 } : mode === 'occupied' ? { thuong: 3, chipheo: 1 } : fresh ? { thuong: 1, ngoily: 1 } : { thuong: 1, ngoily: 2 };
  for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = weights[key] ?? 0;
  const tables = mode === 'poor' || fresh ? 1 : 4;
  raw.spawn.pPair = tables === 1 ? 0 : 1; raw.spawn.baseMs = raw.rush.none.floorMs = 3000;
  raw.shift.startingCoinsBase = mode === 'poor' ? 0 : fresh ? raw.shift.startingCoinsBase : 40000;
  const g = new Game(loadConfig(raw), 42, Date.parse('2026-10-22T10:00:00+07:00')), w = g.world;
  const send = (command: Command) => g.command({ at: w.now, idempotencyKey: `kt-${g.log.length}`, command });
  const must = (command: Command) => { const r = send(command); if (!r.ok) throw Error(`fixture:${command.type}:${r.reason}`); };
  const step = () => {
    for (const dish of DISHES) if (restockQuote(w, g.config, dish, 'bulk').ok) send({ type: 'restock', dish, mode: 'bulk' });
    serveNext(g, command => { send(command); });
    g.advance(w.now + 100);
  };
  while (w.tables.length < tables) must({ type: 'buyTable' });
  if (tables >= raw.upgrades.table.chairsAfterTables) for (const table of w.tables) must({ type: 'buyChair', tableId: table.id });
  must({ type: 'startShift' });
  if (mode === 'second') { // shift 1 to its natural end, then shift 2 (the first shifts of a save need no rest)
    for (let i = 0; w.phase !== 'resting'; i++) { if (i > 20000) throw Error('fixture:second:no-close'); step(); }
    must({ type: 'startShift' });
  }
  if (mode === 'pin-rest') {
    for (let i = 0; w.phase !== 'resting'; i++) { if (i > 20000) throw Error('fixture:pin-rest:no-close'); step(); } // the shift runs to its natural end
    process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, phase: w.phase, completedShifts: w.completedShifts, version: g.config.version,
      feeRate: kickTableRule(g.config.values)?.feeRate ?? null, bundle: { version: config.version, feeRate: kickTableRule(config.values)?.feeRate ?? null } }));
  } else {
    const ready = (): boolean => {
      if (mode === 'poor') return w.tables.some(t => t.state === 'consuming' && t.group!.customers[0].type === 'vip');
      if (mode === 'occupied') return w.reputation >= 2 && w.tables.some(t => t.state === 'occupied');
      if (fresh) return w.tables.some(lingering);
      return w.queue.length > 0 && w.tables.some(t => t.state === 'consuming' && t.group!.customers.length === 2) && w.tables.some(t => t.state === 'waiting' && t.order!.state === 'pending');
    };
    for (let i = 0; !ready(); i++) { if (i > 6000 || w.phase !== 'open') throw Error(`fixture:${mode}:not-reached`); step(); }
    if (mode === 'closing') must({ type: 'endShift' });
    const target = w.tables.find(t => mode === 'poor' ? t.state === 'consuming' : mode === 'occupied' ? t.state === 'occupied' : fresh ? lingering(t) : t.state === 'consuming' && t.group!.customers.length === 2)!;
    const waiting = w.tables.find(t => t.state === 'waiting' && t.order!.state === 'pending') ?? null;
    const quote = kickTableQuote(w, g.config, target);
    process.stdout.write(JSON.stringify({ save: encodeSave(g), now: w.now, phase: w.phase, coins: w.coins, reputation: w.reputation, completedShifts: w.completedShifts,
      target: { id: target.id, n: w.tables.indexOf(target) + 1, state: target.state, guests: target.group!.customers.length }, waiting: waiting && { id: waiting.id, n: w.tables.indexOf(waiting) + 1 },
      quote: { cost: quote.cost, reputation: quote.reputation, reason: quote.reason, ok: quote.ok }, queue: w.queue.map(group => ({ id: group.id, size: group.customers.length })),
      cleaningMs: g.config.values.runtime.tableCleaningMs, seatingMs: g.config.values.runtime.tableSeatingMs }));
  }
}
