// ── Số khởi điểm — 04-SPEC-prototype-phase0.md §4 ──
// 🟢 = bất biến Phase 0 · 🟡 = chỉnh được khi đo (đổi ở đây, KHÔNG đổi phương pháp đo)

import type { Dish } from './types'

/** 🟢 Hằng số neo k — giá trị/lượt trà đá gốc. KHÔNG ĐỔI. */
export const K_ANCHOR = 82.5

/** Menu (xu) — GDD §2, giữ nguyên */
export const MENU: Record<Dish, { price: number; cost: number; needsGlass: boolean; label: string; emoji: string }> = {
  bia: { price: 50, cost: 10, needsGlass: true, label: 'Bia hơi', emoji: '🍺' },
  lac: { price: 75, cost: 26, needsGlass: false, label: 'Lạc', emoji: '🥜' },
  nem: { price: 150, cost: 60, needsGlass: false, label: 'Nem chua', emoji: '🍢' },
}

// ── Spawn & patience (economy-spec §3) 🟡 ──
export const SPAWN_BASE_MS = 10_500
export const SPAWN_WARMUP_MULT = 1.6 // lượt đầu ca ×1.6 = 16.800ms
export const PEAK_SPAWN_MULT = 0.66 // peak: interval ×0.66 (≈ dồn 1.5×)

export const PATIENCE_THUONG_MS = 18_000
export const PATIENCE_RUSH_MULT = 0.611 // vội/VIP ×0.611 ≈ 11.000ms

export const ENJOY_MIN_MS = 5_000
export const ENJOY_MAX_MS = 10_000

// ── Throughput (GDD §4) ──
export const GLASS_COUNT = 10 // 🟢 buy-cap, Phase 0 cố định
export const POUR_MS = 3_000 // 1 vòi
export const WASH_BASE = { slots: 1, washMs: 7_000 } // 🟡 cấp thấp nhất → bottleneck rõ
export const WASH_UPGRADED = { slots: 3, washMs: 2_500 } // nút "nâng rửa" giả lập

// ── Freshness — bia mất hơi (GDD §6, MVP mềm) 🟡 ──
export const FRESHNESS_MS = 12_000
export const FRESHNESS_WARN_MS = 9_000 // cờ vàng ~75%

// ── Tip (GDD §8, tối giản Phase 0) ──
export const TIP_PATIENCE_THRESHOLD = 0.5 // patience/max < 0.5 → tip 0
export const TIP_RATE = 0.3
export const TIP_VIP_MULT = 10

// ── Loại khách (weight, GDD §7) ──
export const CUSTOMER_WEIGHTS = { thuong: 1.0, voi: 0.3, vip: 0.1 } as const

// ── Cấu hình bàn / ca 🟡 ──
export const TABLE_COUNT = 3
export const SEATS_PER_TABLE = 2
export const QUEUE_SLOTS = 2 + Math.floor((TABLE_COUNT * SEATS_PER_TABLE) / 3) // = 4 (03 §1)
export const SHIFT_DURATION_MS = 120_000 // 🟡 chưa neo GDD, đủ dài để cảm nhịp

// ── Demand mix 🟡 (KHÔNG có trong spec — giả định để đo, chỉnh thoải mái) ──
export const P_MOI = 0.85 // xác suất 1 khách gọi kèm 1 mồi
export const P_NEM_GIVEN_MOI = 0.65 // trong số gọi mồi: 65% nem, 35% lạc
export const P_SECOND_ROUND = 0.35 // nhóm thường gọi đợt 2 (vội: luôn 1 đợt)
export const GROUP_SIZE_MIN = 1
export const GROUP_SIZE_MAX = 2
