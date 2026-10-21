import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, loadConfig, kickTableQuote, LINGERING_TABLE_STATES, WEATHER, type Command } from '../src';
import { createManagementPolicy, kickLingering, serveNext, KICK_MIN_SHIFT_LEFT_MS, MANAGEMENT_MS, STEP_MS } from '../sim/policy';
import { simulateCareer } from '../sim/career';
import { steadyDemand } from './fixtures/steady-demand';

// Wave 3 (plan section 6 `fun-kick-table`, FEEDBACK II.3): the career-sim "kick" bot sends a lingering table home when the queue is non-empty and at least 40 s of
// the shift remain; the never-kick bot (the acceptance protocol, the default) sends none. The policy runs through the real commands.
type Seed = typeof seed;
const T0 = Date.parse('2026-10-22T10:00:00+07:00');
/** A full first alley of lai rai and ordinary pairs at a busy door: tables linger a long time while groups wait. */
function busyAlley() {
  const raw = structuredClone(seed) as Seed;
  raw.shift.startingCoinsBase = 400000; raw.onboarding.enabled = false; raw.rush.schedule.perShift = 0;
  for (const weather of WEATHER) raw.weather[weather].weight = weather === 'sunny' ? 1 : 0;
  for (const [key, profile] of Object.entries(raw.customerTypes)) if ('weight' in profile) profile.weight = ({ thuong: 2, ngoily: 1, vip: 1 } as Record<string, number>)[key] ?? 0;
  raw.spawn.baseMs = raw.rush.none.floorMs = 3000; steadyDemand(raw);
  const g = new Game(loadConfig(raw), 42, T0);
  const send = (command: Command) => { const r = g.command({ command, at: g.world.now, idempotencyKey: `kp-${g.log.length}` }); assert.ok(r.ok, `${command.type}: ${r.reason}`); return r; };
  while (g.world.tables.length < 4) send({ type: 'buyTable' });
  for (const table of g.world.tables) send({ type: 'buyChair', tableId: table.id });
  return { g, send };
}

test('the kick bot sends a lingering table home only while a group waits and at least 40 s of the shift remain: the cheapest table a waiting group can sit at', () => {
  const { g, send } = busyAlley(), w = g.world;
  let kicks = 0, heldBack = 0;
  const guarded = (command: Command) => {
    if (command.type === 'kickTable') {
      const table = w.tables.find(t => t.id === command.tableId)!, q = kickTableQuote(w, g.config, table);
      assert.equal(w.phase, 'open'); assert.ok(w.shift!.endsAt - w.now >= KICK_MIN_SHIFT_LEFT_MS, `${w.shift!.endsAt - w.now} ms left`);
      assert.ok(w.queue.length > 0, 'a group waits at the door'); assert.ok(w.queue.some(group => group.customers.length <= table.capacity), 'a waiting group fits the table');
      assert.ok(LINGERING_TABLE_STATES.includes(table.state)); assert.ok(q.ok); assert.equal(command.maxCost, q.cost, 'the price the bot saw');
      const cheapest = Math.min(...w.tables.filter(t => w.queue.some(group => group.customers.length <= t.capacity)).map(t => kickTableQuote(w, g.config, t)).filter(x => x.ok).map(x => x.cost!));
      assert.equal(q.cost, cheapest, 'the cheapest eligible table');
      kicks++;
    }
    send(command);
  };
  const manage = createManagementPolicy(g, guarded, { directLease: true, kick: true });
  send({ type: 'startShift' });
  let last = -Infinity;
  for (let guard = 0; w.phase !== 'resting' && guard < 20000; guard++) {
    if (w.now - last >= MANAGEMENT_MS) {
      // In the last 40 s of the shift, or with nobody at the door, a lingering table is never sent home.
      const eligible = w.tables.some(t => kickTableQuote(w, g.config, t).ok);
      const before = kicks; manage(); last = w.now;
      if (eligible && (w.phase !== 'open' || w.shift!.endsAt - w.now < KICK_MIN_SHIFT_LEFT_MS || !w.queue.length)) { assert.equal(kicks, before, 'held back'); heldBack++; }
    }
    serveNext(g, guarded);
    g.advance(w.now + STEP_MS);
  }
  assert.equal(w.phase, 'resting', 'the shift closed');
  assert.ok(kicks >= 5, `${kicks} kicks`); assert.ok(heldBack > 0, 'the rule held the bot back at least once (not vacuous)');
  assert.equal(w.events.filter(e => e.type === 'table_kicked').length, kicks);
});

test('kickLingering waits for a table a waiting group can sit at, and for a wallet that keeps its reserve', () => {
  const { g, send } = busyAlley(), w = g.world;
  send({ type: 'startShift' });
  let poor = 0, sent = 0;
  for (let i = 0; i < 2400 && w.phase === 'open'; i++) {
    serveNext(g, send); g.advance(w.now + STEP_MS);
    if (i % 10) continue;
    const any = w.tables.find(t => kickTableQuote(w, g.config, t).ok);
    if (!any || !w.queue.length) continue;
    if (kickLingering(g, send, () => false) !== null) assert.fail('a wallet that cannot keep its reserve sends nobody home');
    poor++;
    if (kickLingering(g, send, () => true) !== null) sent++;
  }
  assert.ok(poor > 0 && sent > 0, `${poor} refusals, ${sent} kicks`);
});

test('the never-kick protocol bot sends no table home; the kick bot does, and its fees are spent, never purchases', () => {
  const never = simulateCareer({ days: 1, seed: 42 }).report, kick = simulateCareer({ days: 1, seed: 42, policy: { kick: true } }).report;
  assert.equal(never.kicks.count, 0); assert.equal(never.policy.includes('kick bot'), false, 'the protocol bot is the default');
  assert.ok(kick.kicks.count > 0, `${kick.kicks.count} kicks in a day`); assert.ok(kick.policy.includes('kick bot'));
  assert.equal(kick.purchases.some(p => p.command === 'kickTable'), false, 'a kick is a fee, left out of the purchase log');
  assert.equal(kick.rows.reduce((sum, row) => sum + (row.spent.kickTable ?? 0), 0), kick.kicks.cost, 'the career ledger books every fee as spent (its wallet check holds every day)');
});
