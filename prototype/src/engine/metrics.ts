// ── Đo k — 04-SPEC-prototype-phase0.md §5 (🟢 BẤT BIẾN PHƯƠNG PHÁP) ──
// k = DT_bia_mỗi_lượt / 82.5 · throughput KHÔNG BAO GIỜ cộng vào k.

import { K_ANCHOR } from './constants'
import type { ServeEvent, ShiftStats } from './types'

export function computeStats(
  events: ServeEvent[],
  lostCustomers: number,
  rejectedAtDoor: number,
): ShiftStats {
  const n = events.length
  const meanValue = n === 0 ? 0 : events.reduce((s, e) => s + e.payment + e.tip, 0) / n
  const biaServes = events.filter((e) => e.dishes.includes('bia'))
  return {
    serves: n,
    meanValue,
    k: meanValue / K_ANCHOR,
    pctMoi: n === 0 ? 0 : events.filter((e) => e.hadMoi).length / n,
    pctStale: biaServes.length === 0 ? 0 : biaServes.filter((e) => e.stale).length / biaServes.length,
    lostCustomers,
    rejectedAtDoor,
    coinsEarned: events.reduce((s, e) => s + e.payment + e.tip, 0),
  }
}

export function formatStats(s: ShiftStats): string {
  return [
    `Lượt served: ${s.serves}`,
    `DT_bia_mỗi_lượt: ${s.meanValue.toFixed(1)} xu`,
    `k = ${s.meanValue.toFixed(1)} / ${K_ANCHOR} = ${s.k.toFixed(2)}  (giả định 2.5 · chấp nhận 2.0–3.0)`,
    `% lượt có mồi: ${(s.pctMoi * 100).toFixed(0)}%`,
    `% cốc hết hơi khi giao: ${(s.pctStale * 100).toFixed(0)}%`,
    `Khách bỏ đi: ${s.lostCustomers} · Từ chối tại cửa: ${s.rejectedAtDoor}`,
    `Tổng thu: ${s.coinsEarned} xu`,
  ].join('\n')
}
