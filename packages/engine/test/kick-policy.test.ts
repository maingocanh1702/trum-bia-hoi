import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../../docs/config/economy.tbh.json';
import { Game, loadConfig, kickTableQuote, LINGERING_TABLE_STATES, WEATHER, type Command } from '../src';
import { createManagementPolicy, kickLingering, serveNext, KICK_MIN_SHIFT_LEFT_MS, MANAGEMENT_MS, STEP_MS } from '../sim/policy';
import { simulateCareer } from '../sim/career';
import { kickLines, kickVerdict, type KickRun } from '../sim/kick-table';
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
  // Two days: since JSON 2.1.4 a save's first three shifts seat singles only (founder 2026-10-23), and seed 42's first day then leaves no lingering table to send home (0 kicks; 6 over two days).
  const never = simulateCareer({ days: 2, seed: 42 }).report, kick = simulateCareer({ days: 2, seed: 42, policy: { kick: true } }).report;
  assert.equal(never.kicks.count, 0); assert.equal(never.policy.includes('kick bot'), false, 'the protocol bot is the default');
  assert.ok(kick.kicks.count > 0, `${kick.kicks.count} kicks in two days`); assert.ok(kick.policy.includes('kick bot'));
  assert.equal(kick.purchases.some(p => p.command === 'kickTable'), false, 'a kick is a fee, left out of the purchase log');
  assert.equal(kick.rows.reduce((sum, row) => sum + (row.spent.kickTable ?? 0), 0), kick.kicks.cost, 'the career ledger books every fee as spent (its wallet check holds every day)');
});

// Owner call 1 (the founder, 2026-10-22): the plan's "+10 % income" rule of `npm run sim:kick` is read on the 30-day income NET of the kick fees, with
// `kickTable.feeRate` 0.5; the gross gain (income before the fees) stays printed as information. Doctored runs pin the reading, so neither the gate nor its
// printout can drift back to gross silently: the founder's own seed-42 numbers at 0.5 (gross +13.24 %, net +8.85 %) pass, a net gain past +10 % fails.
test('the sim:kick gate reads the 30-day income net of the kick fees (owner call 1, 2026-10-22); the gross gain is printed as information', () => {
  const run = (bot: 'never' | 'kick', income: number, kickCost: number): KickRun => ({ seed: 42, bot, income, net: income - kickCost, kicks: kickCost ? 100 : 0,
    kickGuests: kickCost ? 150 : 0, kickCost, kickReputation: kickCost ? 300 : 0, finalReputation: 1000, served: 30000, lost: 900, standardK: 3.15, standardValue: 9_040_022,
    rawK: 3.93, lifePath: 7, commandHash: bot });
  const never = run('never', 10_000_000, 0);
  const founder = kickVerdict(never, run('kick', 11_324_000, 11_324_000 - 10_885_000));
  assert.ok(Math.abs(founder.incomeOver - 0.1324) < 1e-9 && Math.abs(founder.netOver - 0.0885) < 1e-9);
  assert.equal(founder.incomeOk, true, 'net +8.85 % passes although the gross gain is +13.24 %');
  assert.equal(kickVerdict(never, run('kick', 12_000_000, 1_001_000)).incomeOk, true, 'net +9.99 % passes');
  assert.equal(kickVerdict(never, run('kick', 11_001_000, 0)).incomeOk, false, 'net +10.01 % fails, whatever the gross says');
  assert.equal(kickVerdict(never, run('kick', 13_000_000, 1_999_000)).incomeOk, false, 'net +10.01 % behind a gross +30 % fails too');
  const lines = kickLines([founder], 0.5, 2, 30);
  assert.ok(lines.includes('30-day income net of the kick fees, kick bot vs never-kick | <= +10 % | +8.85 % | PASS'), lines.join('\n'));
  assert.ok(lines.includes('information: 30-day income before the kick fees (gross), kick bot vs never-kick | - | +13.24 % | INFO'), lines.join('\n'));
  assert.deepEqual(lines.filter(line => / \| (PASS|FAIL)$/.test(line)).map(line => line.split(' | ')[0]),
    ['30-day income net of the kick fees, kick bot vs never-kick', 'final reputation, kick bot (never-kick)'], 'two gate rows: the net income and the reputation');
  const failing = kickLines([kickVerdict(never, run('kick', 11_001_000, 0))], 0.5, 2, 30);
  assert.ok(failing.includes('30-day income net of the kick fees, kick bot vs never-kick | <= +10 % | +10.01 % | FAIL'), failing.join('\n'));
});
