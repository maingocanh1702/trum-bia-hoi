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

test('B2.6 a finished rush recaps its own events: arrived, served, left (gone + turned away), tips, net after penalties, and the change against the rush before it', () => {
  const g = secondShift(), events = g.world.events, ended = events.filter(e => e.type === 'rush_ended' && typeof e.data.arrived === 'number');
  assert.ok(ended.length >= 2, `rushes recapped: ${ended.length}`);
  let previousNet: number | null = null;
  for (const end of ended) {
    const recap = rushRecap(events, end)!, d = end.data;
    const at = events.indexOf(end); let start = at - 1;
    while (start >= 0 && !(events[start].type === 'rush_started' && events[start].data.slot === d.slot && events[start].data.shiftId === d.shiftId)) start--;
    assert.ok(start >= 0 && start < at);
    const window: DomainEvent[] = events.slice(start + 1, at);
    const penalty = window.filter(e => e.type === 'order_expired' || e.type === 'shipper_missed' || (e.type === 'customer_left' && e.data.reason === 'queue')).reduce((s, e) => s + Number(e.data.penalty ?? 0), 0);
    assert.deepEqual(recap, { kind: d.kind, arrived: d.arrived, served: d.served, left: Number(d.lost) + Number(d.rejected), tips: d.tips, net: Number(d.revenue) - penalty, change: previousNet === null ? null : Number(d.revenue) - penalty - previousNet });
    previousNet = recap.net;
  }
  const unscheduled = { id: 'x', type: 'rush_ended', at: 0, configVersion: config.version, idempotencyKey: 'x', data: { kind: 'light' } } as DomainEvent;
  assert.equal(rushRecap([...events, unscheduled], unscheduled), null, 'a rush_ended without its summary (an older snapshot) has no recap');
});
