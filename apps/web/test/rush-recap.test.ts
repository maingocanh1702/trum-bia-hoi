import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, config, loadConfig, restockQuote, type Command, type DomainEvent } from '../../../packages/engine/src';
import { rushRecap } from '../src/rush-recap';

// Founder 2026-10-22 (Part B2.6): the recap of a finished rush is built from the rush's own events (rush-recap.ts). Real engine: shift 2 of a new save
// (shift 1 is the onboarding shift, without rushes), a bot that serves what is ready and keeps beer in stock, through both rushes of the shift.
function secondShift() {
  const raw = structuredClone(config.raw);
  const g = new Game(loadConfig(raw), 7, Date.parse('2026-10-23T10:00:00+07:00')), w = g.world;
  const send = (command: Command) => g.command({ idempotencyKey: `rr-${g.log.length}`, at: w.now, command });
  const serveReady = () => { for (const t of w.tables) if (t.order?.state === 'pending' && t.order.items.every(i => i.state === 'ready')) send({ type: 'serve', tableId: t.id, orderId: t.order.id }); };
  send({ type: 'startShift' }); send({ type: 'endShift' });
  for (let i = 0; i < 3000 && w.phase !== 'resting'; i++) { serveReady(); g.advance(w.now + 100); }
  send({ type: 'startShift' });
  for (let i = 0; i < 20000 && w.phase === 'open'; i++) {
    if (w.inventory.bia < 3 && restockQuote(w, g.config, 'bia', 'full').ok) send({ type: 'restock', dish: 'bia', mode: 'full' });
    if (i % 3) serveReady(); // a slow-ish bot: some guests wait, some leave
    g.advance(w.now + 100);
  }
  return g;
}

test('B2.6 a finished rush recaps its own events: arrived, served, left (gone + turned away), tips, net after penalties, and the change against the rush before it; without its own events (a remote snapshot) there is no card', () => {
  const g = secondShift(), events = g.world.events, ended = events.filter(e => e.type === 'rush_ended' && typeof e.data.arrived === 'number');
  assert.ok(ended.length >= 2, `rushes recapped: ${ended.length}`);
  let previousNet: number | null = null;
  for (const end of ended) {
    const recap = rushRecap(events, end)!, d = end.data;
    const at = events.indexOf(end); let start = at - 1;
    while (start >= 0 && !(events[start].type === 'rush_started' && events[start].data.slot === d.slot && events[start].data.shiftId === d.shiftId)) start--;
    assert.ok(start >= 0 && start < at);
    // The net restated from the raw events of the rush, not from the summary or the app's filter (review B2-r1): what its served orders paid minus what its
    // guests' leaving cost (an order timing out, a guest giving up in the queue). A missed delivery is no guest's leaving and no delivery is in the revenue.
    const window: DomainEvent[] = events.slice(start + 1, at), sum = (type: string, key: string, pick = (_: DomainEvent) => true) => window.filter(e => e.type === type && pick(e)).reduce((s, e) => s + Number(e.data[key] ?? 0), 0);
    const net = sum('order_served', 'amount') - sum('order_expired', 'penalty') - sum('customer_left', 'penalty', e => e.data.reason === 'queue');
    assert.equal(sum('order_served', 'amount'), Number(d.revenue), 'the revenue of the summary is the served orders of the rush');
    assert.deepEqual(recap, { kind: d.kind, arrived: d.arrived, served: d.served, left: Number(d.lost) + Number(d.rejected), tips: d.tips, net, change: previousNet === null ? null : net - previousNet });
    // A missed delivery inside the rush leaves its net as it is.
    const missed = { id: 'missed', type: 'shipper_missed', at: 0, configVersion: config.version, idempotencyKey: 'missed', data: { penalty: 999 } } as DomainEvent;
    assert.equal(rushRecap([...events.slice(0, at), missed, ...events.slice(at)], end)!.net, net);
    previousNet = recap.net;
  }
  const unscheduled = { id: 'x', type: 'rush_ended', at: 0, configVersion: config.version, idempotencyKey: 'x', data: { kind: 'light' } } as DomainEvent;
  assert.equal(rushRecap([...events, unscheduled], unscheduled), null, 'a rush_ended without its summary (an older snapshot) has no recap');
  // A remote snapshot carries only the order_served of open orders and the rush_ended of its shift (apps/server/src/http.ts `publicState`): the rush's
  // penalties are not on hand, so there is no card rather than a net that leaves them out.
  const presentation = events.filter(e => e.type === 'order_served' || e.type === 'rush_ended');
  for (const end of ended) assert.equal(rushRecap(presentation, end), null, 'no card without the rush\'s own events');
  // The rush before it lost its start (a trimmed log): this rush keeps its card, without a change line.
  const firstStart = events.find(e => e.type === 'rush_started' && e.data.slot === ended[0].data.slot && e.data.shiftId === ended[0].data.shiftId)!;
  const second = rushRecap(events.filter(e => e !== firstStart), ended[1])!;
  assert.deepEqual(second, { ...rushRecap(events, ended[1])!, change: null });
});
