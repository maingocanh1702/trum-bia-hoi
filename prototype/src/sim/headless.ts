// ── Headless sim — chạy bot qua nhiều ca để (1) verify pipeline đo k, (2) lấy số k đầu tiên ──
// Chạy: npm run sim
// Bot chơi "tốt" (rót/rửa/serve ngay khi có thể) → k đo được ≈ trần của demand-mix hiện tại.
// 04 §5: mục tiêu ≥ 500 lượt.

import { Engine } from '../engine/engine'
import { computeStats, formatStats } from '../engine/metrics'

const TARGET_SERVES = 500
const TICK_MS = 100
const SEED = 20260611

const engine = new Engine(SEED)
let shiftIndex = 0
const perShift: string[] = []

function botAct() {
  const w = engine.world
  engine.wash()
  engine.pour()
  for (const t of w.tables) {
    const o = t.currentOrder
    if (!o || o.state !== 'pending') continue
    const items = o.items.filter((i) => i.state !== 'cancelled')
    if (items.every((i) => i.state === 'ready')) engine.serve(t.id)
  }
}

while (engine.allEvents.length < TARGET_SERVES) {
  shiftIndex++
  // xen kẽ rush để cảm cả 2 nhịp
  if ((shiftIndex % 2 === 0) !== (engine.world.rush === 'peak')) engine.toggleRush()
  engine.startShift()
  const before = engine.allEvents.length
  // chạy tới khi ca đóng VÀ quán sạch khách
  let guard = 0
  while (guard++ < 100_000) {
    engine.tick(TICK_MS)
    botAct()
    const w = engine.world
    const idle = w.tables.every((t) => t.state === 'empty') && w.queue.length === 0
    if (!w.shift.running && idle) break
  }
  const events = engine.world.log
  const s = computeStats(events, engine.world.lostCustomers, engine.world.rejectedAtDoor)
  perShift.push(
    `Ca ${shiftIndex} (${engine.world.rush}): ${events.length} lượt · mean ${s.meanValue.toFixed(1)} · k ${s.k.toFixed(2)} · mồi ${(s.pctMoi * 100).toFixed(0)}% · stale ${(s.pctStale * 100).toFixed(0)}% · mất ${s.lostCustomers} · từ chối ${s.rejectedAtDoor}`,
  )
  void before
}

console.log('═'.repeat(64))
console.log('🧪 HEADLESS SIM — Trùm Bia Hơi Phase 0 (bot chơi tối ưu)')
console.log('═'.repeat(64))
for (const line of perShift) console.log(line)
console.log('─'.repeat(64))
console.log(`AGGREGATE (${engine.allEvents.length} lượt, seed ${SEED}):`)
const agg = computeStats(engine.allEvents, 0, 0)
console.log(formatStats(agg))
console.log('─'.repeat(64))
console.log('Lưu ý: bot không mô phỏng tay người — k thật phải đo bằng chơi tay (npm run dev).')
