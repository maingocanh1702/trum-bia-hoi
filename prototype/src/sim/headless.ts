// ── Headless sim — chạy bot qua nhiều ca để (1) verify pipeline đo k, (2) lấy số k đầu tiên ──
// Chạy: npm run sim
// Bot chơi "tốt" (rót/rửa/serve ngay khi có thể) → k đo được ≈ trần của demand-mix hiện tại.
// 04 §5: mục tiêu ≥ 500 lượt.

import { Engine } from '../engine/engine'
import { computeStats, formatStats } from '../engine/metrics'
import type { RushLevel, ServeEvent, ShiftStats } from '../engine/types'

const TARGET_SERVES = 500
const TICK_MS = 100
const FIXED_SEEDS = [20260611, 1, 2, 3, 42]
const K_MIN = 2
const K_MAX = 3
const NORMAL_LOSS_MAX = 0.1
// Regression ceiling from the measured pre-fix range, not a final feel threshold.
const PEAK_PRE_FIX_BASELINE_MIN = 0.576

type ModeTotals = { events: ServeEvent[]; lostCustomers: number; rejectedAtDoor: number }
type SeedResult = {
  seed: number
  perShift: string[]
  normal: ShiftStats
  peak: ShiftStats
  aggregate: ShiftStats
}

// SIM_SEED=<n> runs one forensic seed; otherwise run the fixed regression set.
// Ambient declare: file runs under tsx (node) only, never bundled by vite; keeps DOM tsconfig dep-free.
declare const process: { env: Record<string, string | undefined>; exitCode?: number }

const seedOverride = process.env.SIM_SEED
const parsedSeed = seedOverride === undefined ? undefined : Number(seedOverride)
if (parsedSeed !== undefined && !Number.isFinite(parsedSeed)) {
  throw new Error(`SIM_SEED must be a finite number, received: ${seedOverride}`)
}
const seeds = parsedSeed === undefined ? FIXED_SEEDS : [parsedSeed]

function botAct(engine: Engine) {
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

function emptyModeTotals(): ModeTotals {
  return { events: [], lostCustomers: 0, rejectedAtDoor: 0 }
}

function customerLossRate(stats: ShiftStats): number {
  const arrivals = stats.serves + stats.lostCustomers + stats.rejectedAtDoor
  return arrivals === 0 ? 0 : (stats.lostCustomers + stats.rejectedAtDoor) / arrivals
}

function runSeed(seed: number): SeedResult {
  const engine = new Engine(seed)
  let shiftIndex = 0
  const perShift: string[] = []
  const totals: Record<RushLevel, ModeTotals> = {
    normal: emptyModeTotals(),
    peak: emptyModeTotals(),
  }

  while (engine.allEvents.length < TARGET_SERVES) {
    shiftIndex++
    // xen kẽ rush để cảm cả 2 nhịp
    if ((shiftIndex % 2 === 0) !== (engine.world.rush === 'peak')) engine.toggleRush()
    const mode = engine.world.rush
    engine.startShift()
    // chạy tới khi ca đóng VÀ quán sạch khách
    let guard = 0
    while (guard++ < 100_000) {
      engine.tick(TICK_MS)
      botAct(engine)
      const w = engine.world
      const idle = w.tables.every((t) => t.state === 'empty') && w.queue.length === 0
      if (!w.shift.running && idle) break
    }
    if (guard > 100_000) throw new Error(`Seed ${seed}, shift ${shiftIndex} exceeded the drain guard`)

    const events = engine.world.log
    const lostCustomers = engine.world.lostCustomers
    const rejectedAtDoor = engine.world.rejectedAtDoor
    const bucket = totals[mode]
    bucket.events.push(...events)
    bucket.lostCustomers += lostCustomers
    bucket.rejectedAtDoor += rejectedAtDoor

    const stats = computeStats(events, lostCustomers, rejectedAtDoor)
    perShift.push(
      `Ca ${shiftIndex} (${mode}): ${events.length} lượt · mean ${stats.meanValue.toFixed(1)} · k ${stats.k.toFixed(2)} · mồi ${(stats.pctMoi * 100).toFixed(0)}% · stale ${(stats.pctStale * 100).toFixed(0)}% · mất ${stats.lostCustomers} · từ chối ${stats.rejectedAtDoor}`,
    )
  }

  const normal = computeStats(
    totals.normal.events,
    totals.normal.lostCustomers,
    totals.normal.rejectedAtDoor,
  )
  const peak = computeStats(
    totals.peak.events,
    totals.peak.lostCustomers,
    totals.peak.rejectedAtDoor,
  )
  const aggregate = computeStats(
    engine.allEvents,
    normal.lostCustomers + peak.lostCustomers,
    normal.rejectedAtDoor + peak.rejectedAtDoor,
  )
  return { seed, perShift, normal, peak, aggregate }
}

function verify(result: SeedResult): string[] {
  const failures: string[] = []
  const { aggregate, normal, peak } = result
  if (aggregate.k < K_MIN || aggregate.k > K_MAX) {
    failures.push(`k ${aggregate.k.toFixed(2)} is outside ${K_MIN.toFixed(1)}–${K_MAX.toFixed(1)}`)
  }
  const normalLoss = customerLossRate(normal)
  if (normalLoss >= NORMAL_LOSS_MAX) {
    failures.push(`normal loss ${(normalLoss * 100).toFixed(1)}% is not below ${NORMAL_LOSS_MAX * 100}%`)
  }
  const peakLoss = customerLossRate(peak)
  if (peakLoss >= PEAK_PRE_FIX_BASELINE_MIN) {
    failures.push(`peak loss ${(peakLoss * 100).toFixed(1)}% did not improve below the pre-fix floor ${(PEAK_PRE_FIX_BASELINE_MIN * 100).toFixed(1)}%`)
  }
  if (aggregate.serves !== normal.serves + peak.serves) failures.push('aggregate served total does not match mode buckets')
  if (aggregate.lostCustomers !== normal.lostCustomers + peak.lostCustomers) failures.push('aggregate lost total does not match mode buckets')
  if (aggregate.rejectedAtDoor !== normal.rejectedAtDoor + peak.rejectedAtDoor) failures.push('aggregate rejected total does not match mode buckets')
  return failures
}

const results = seeds.map(runSeed)
let failed = false

console.log('═'.repeat(72))
console.log('🧪 HEADLESS SIM — Trùm Bia Hơi Phase 0 (bot chơi tối ưu)')
console.log('═'.repeat(72))
for (const result of results) {
  for (const line of result.perShift) console.log(`[seed ${result.seed}] ${line}`)
  console.log('─'.repeat(72))
  console.log(`SEED ${result.seed} · NORMAL: ${result.normal.serves} served · ${result.normal.lostCustomers} mất · ${result.normal.rejectedAtDoor} từ chối · loss ${(customerLossRate(result.normal) * 100).toFixed(1)}%`)
  console.log(`SEED ${result.seed} · PEAK:   ${result.peak.serves} served · ${result.peak.lostCustomers} mất · ${result.peak.rejectedAtDoor} từ chối · loss ${(customerLossRate(result.peak) * 100).toFixed(1)}%`)
  console.log(`AGGREGATE (${result.aggregate.serves} lượt, seed ${result.seed}):`)
  console.log(formatStats(result.aggregate))
  const failures = verify(result)
  if (failures.length === 0) console.log('GATE: PASS')
  else {
    failed = true
    for (const failure of failures) console.error(`GATE: FAIL — ${failure}`)
  }
  console.log('─'.repeat(72))
}

console.log('seed | k    | normal loss | peak loss | lost/rejected | gate')
for (const result of results) {
  const failures = verify(result)
  console.log(
    `${String(result.seed).padEnd(8)} | ${result.aggregate.k.toFixed(2)} | ${(customerLossRate(result.normal) * 100).toFixed(1).padStart(10)}% | ${(customerLossRate(result.peak) * 100).toFixed(1).padStart(8)}% | ${String(result.aggregate.lostCustomers).padStart(4)}/${String(result.aggregate.rejectedAtDoor).padEnd(8)} | ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
  )
}
console.log('Lưu ý: peak regression ceiling chỉ chứng minh giảm so với baseline; ngưỡng feel cuối vẫn phải đo bằng chơi tay (npm run dev).')

if (failed) process.exitCode = 1
