// ── Domain model — bám 04-SPEC-prototype-phase0.md §3 (🟢 CORE) ──
// + serve theo ĐỢT GỌI (Order) cấp bàn theo 03-SPEC-he-ban.md §4/§10.

export type Dish = 'bia' | 'lac' | 'nem'

export type GlassState = 'clean' | 'in_use' | 'dirty' | 'washing'

export interface Glass {
  id: string
  state: GlassState
  /** mốc rót XONG — bắt đầu đếm freshness (chỉ bia) */
  pouredAt?: number
  washStartedAt?: number
}

export type CustomerType = 'thuong' | 'voi' | 'vip'

export type CustomerState = 'waiting' | 'ordered' | 'served' | 'enjoying' | 'left'

export interface Customer {
  id: string
  type: CustomerType
  tableId: string
  seatIndex: number
  state: CustomerState
  maxPatienceMs: number
  /** enjoy đến lúc nào (sau served) */
  enjoyUntil?: number
}

export type OrderItemState = 'pending' | 'pouring' | 'ready' | 'served' | 'cancelled'

export interface OrderItem {
  id: string
  dish: Dish
  customerId: string
  needsGlass: boolean // chỉ 'bia' = true
  glassId?: string
  pouredAt?: number
  state: OrderItemState
}

export type OrderState = 'pending' | 'served' | 'expired'

/** MỘT đợt gọi của 1 bàn (gom item của các khách trong nhóm) — 03 §4 */
export interface Order {
  id: string
  tableId: string
  round: number
  items: OrderItem[]
  placedAt: number
  /** = min patience của các khách trong nhóm lúc gọi */
  patienceMs: number
  state: OrderState
}

export type TableState = 'empty' | 'awaiting_serve' | 'enjoying'

export interface Table {
  id: string
  seats: (Customer | null)[] // 2 ghế
  currentOrder: Order | null
  state: TableState
  roundsPlanned: number
  roundsDone: number
}

/** Nhóm chờ ở hàng đợi (một-bàn-một-nhóm, 03 §1) */
export interface QueuedGroup {
  id: string
  customers: Customer[] // tableId/seatIndex gán khi ngồi
  queuedAt: number
}

export interface Tap {
  /** đang rót cho item nào */
  pouring: { orderId: string; itemId: string; glassId: string; startedAt: number } | null
}

export interface WasherSlot {
  glassId: string
  startedAt: number
}

export interface Washer {
  slots: (WasherSlot | null)[]
  upgraded: boolean // false: 1 slot × 7000ms · true: 3 slot × 2500ms
}

export type RushLevel = 'normal' | 'peak'

/** 04 §5 — log đo k (bất biến phương pháp) */
export interface ServeEvent {
  t: number
  customerType: CustomerType
  dishes: Dish[]
  payment: number // chưa gồm tip
  tip: number
  hadMoi: boolean
  /** thêm để đo %: cốc bia hết hơi lúc giao? */
  stale: boolean
}

export interface ShiftStats {
  serves: number
  meanValue: number // mean(payment + tip)
  k: number // meanValue / 82.5
  pctMoi: number
  pctStale: number // trên các lượt có bia
  lostCustomers: number
  rejectedAtDoor: number
  coinsEarned: number
}

export interface World {
  now: number
  coins: number
  glasses: Glass[] // 10 (buy-cap, Phase 0 cố định)
  tables: Table[] // 3 bàn
  queue: QueuedGroup[]
  tap: Tap
  washer: Washer
  rush: RushLevel
  autoPour: boolean
  autoWash: boolean
  shift: {
    running: boolean
    elapsedMs: number
    durationMs: number
    nextSpawnAt: number
    firstSpawnDone: boolean
  }
  log: ServeEvent[]
  lostCustomers: number
  rejectedAtDoor: number
  /** ticker text cho UI (sự kiện gần nhất) */
  lastEvents: string[]
}
