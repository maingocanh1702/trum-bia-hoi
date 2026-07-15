// ── Engine thuần TS (không phụ thuộc DOM/Pixi) — chạy được cả UI lẫn headless sim ──
// Loop & số: 04-SPEC-prototype-phase0.md §3/§4 · serve theo Order cấp bàn: 03-SPEC-he-ban.md §4/§10

import {
  CUSTOMER_WEIGHTS, DAILY_EARN_CAP, ENJOY_MAX_MS, ENJOY_MIN_MS, FRESHNESS_MS, GLASS_COUNT,
  GROUP_SIZE_MAX, GROUP_SIZE_MIN, MENU, PATIENCE_RUSH_MULT, PATIENCE_THUONG_MS,
  PEAK_SPAWN_MULT, POUR_MS, P_MOI, P_NEM_GIVEN_MOI, P_SECOND_ROUND, QUEUE_SLOTS,
  SEATS_PER_TABLE, SHIFT_DURATION_MS, SPAWN_BASE_MS, SPAWN_WARMUP_MULT, TABLE_COUNT,
  TIP_PATIENCE_THRESHOLD, TIP_RATE, TIP_VIP_MULT, WASH_BASE, WASH_UPGRADED,
} from './constants'
import { mulberry32, randInt, weightedPick, type Rng } from './rng'
import type {
  Customer, CustomerType, Dish, Glass, Order, OrderItem,
  ServeEvent, Table, World,
} from './types'

let _uid = 0
const uid = (p: string) => `${p}${++_uid}`

export class Engine {
  world: World
  rng: Rng
  /** log dồn qua nhiều ca — để tính k aggregate (mục tiêu ≥500 lượt) */
  allEvents: ServeEvent[] = []

  constructor(seed = Date.now() & 0xffffffff) {
    this.rng = mulberry32(seed)
    this.world = this.freshWorld()
  }

  private freshWorld(): World {
    return {
      now: 0,
      coins: 0,
      dayEarned: 0,
      glasses: Array.from({ length: GLASS_COUNT }, () => ({ id: uid('g'), state: 'clean' } as Glass)),
      tables: Array.from({ length: TABLE_COUNT }, () => ({
        id: uid('t'), seats: Array(SEATS_PER_TABLE).fill(null),
        currentOrder: null, state: 'empty', roundsPlanned: 1, roundsDone: 0,
      } as Table)),
      queue: [],
      tap: { pouring: null },
      washer: { slots: [null], upgraded: false },
      rush: 'normal',
      autoPour: true,
      autoWash: true,
      shift: { running: false, elapsedMs: 0, durationMs: SHIFT_DURATION_MS, nextSpawnAt: 0, firstSpawnDone: false },
      log: [],
      lostCustomers: 0,
      rejectedAtDoor: 0,
      lastEvents: [],
    }
  }

  private say(msg: string) {
    const w = this.world
    w.lastEvents.unshift(msg)
    if (w.lastEvents.length > 6) w.lastEvents.pop()
  }

  // ───────────────────────── actions (player) ─────────────────────────

  startShift() {
    const w = this.world
    if (w.shift.running) return
    // reset trạng thái quán nhưng giữ coins + dayEarned (trần ngày) + allEvents
    for (const t of w.tables) { t.seats = Array(SEATS_PER_TABLE).fill(null); t.currentOrder = null; t.state = 'empty'; t.roundsDone = 0 }
    for (const g of w.glasses) { g.state = 'clean'; g.pouredAt = undefined; g.washStartedAt = undefined }
    w.queue = []
    w.tap.pouring = null
    w.washer.slots = w.washer.upgraded ? [null, null, null] : [null]
    w.log = []
    w.lostCustomers = 0
    w.rejectedAtDoor = 0
    w.shift.running = true
    w.shift.elapsedMs = 0
    w.shift.firstSpawnDone = false
    w.shift.nextSpawnAt = w.now + SPAWN_BASE_MS * SPAWN_WARMUP_MULT // warmup ×1.6
    this.say('🔔 Mở ca! Thể lực 100%.')
  }

  endShift() {
    this.world.shift.running = false
    this.say('🌙 Đóng ca.')
  }

  /** Thể lực % (F01) — SUY RA từ tiến độ ca (một nguồn: shift.elapsed/duration), không có state riêng.
   *  Mở ca = 100%, cạn tuyến tính trong 12'; hết thể lực = hết ca. Tab ẩn không tick → không hao (anti-idle). */
  staminaPct(): number {
    const s = this.world.shift
    return Math.max(0, 1 - s.elapsedMs / s.durationMs)
  }


  toggleRush() {
    const w = this.world
    w.rush = w.rush === 'normal' ? 'peak' : 'normal'
    this.say(w.rush === 'peak' ? '🔥 CAO ĐIỂM (spawn ×1.5)' : '😌 Về nhịp thường')
  }

  toggleWashUpgrade() {
    const w = this.world
    w.washer.upgraded = !w.washer.upgraded
    const cfg = w.washer.upgraded ? WASH_UPGRADED : WASH_BASE
    // giữ slot đang rửa, thêm/bớt slot trống
    const active = w.washer.slots.filter((s) => s !== null)
    w.washer.slots = [...active]
    while (w.washer.slots.length < cfg.slots) w.washer.slots.push(null)
    w.washer.slots = w.washer.slots.slice(0, Math.max(cfg.slots, active.length))
    this.say(w.washer.upgraded ? '🛠️ Nâng rửa: 3 slot × 2.5s' : '🪣 Rửa thường: 1 slot × 7s')
  }

  toggleAutoPour() {
    this.world.autoPour = !this.world.autoPour
    this.say(this.world.autoPour ? '🤖 Tự động rót: BẬt' : '✋ Rót tay')
  }

  toggleAutoWash() {
    this.world.autoWash = !this.world.autoWash
    this.say(this.world.autoWash ? '🤖 Tự động rửa: BẬt' : '✋ Rửa tay')
  }

  /** Rót bia cho item bia gấp nhất (cần vòi rảnh + cốc sạch). Trả về false nếu không rót được. */
  pour(): boolean {
    const w = this.world
    if (w.tap.pouring) return false
    const glass = w.glasses.find((g) => g.state === 'clean')
    if (!glass) return false
    // item bia pending gấp nhất trên mọi bàn
    let best: { order: Order; item: OrderItem; remain: number } | null = null
    for (const t of w.tables) {
      const o = t.currentOrder
      if (!o || o.state !== 'pending') continue
      const remain = o.placedAt + o.patienceMs - w.now
      for (const it of o.items) {
        if (it.dish === 'bia' && it.state === 'pending') {
          if (!best || remain < best.remain) best = { order: o, item: it, remain }
          break
        }
      }
    }
    if (!best) return false
    glass.state = 'in_use'
    best.item.state = 'pouring'
    best.item.glassId = glass.id
    w.tap.pouring = { orderId: best.order.id, itemId: best.item.id, glassId: glass.id, startedAt: w.now }
    return true
  }

  /** Bỏ cốc bẩn vào mọi slot rửa trống. Trả về số cốc bắt đầu rửa. */
  wash(): number {
    const w = this.world
    let n = 0
    for (let i = 0; i < w.washer.slots.length; i++) {
      if (w.washer.slots[i]) continue
      const dirty = w.glasses.find((g) => g.state === 'dirty')
      if (!dirty) break
      dirty.state = 'washing'
      dirty.washStartedAt = w.now
      w.washer.slots[i] = { glassId: dirty.id, startedAt: w.now }
      n++
    }
    return n
  }

  /** Chốt cộng ví DUY NHẤT cho doanh thu phục vụ — chặn tại trần ngày (F01, GDD §3).
   *  Log ServeEvent KHÔNG bị trần đụng tới (04 §5: k đo giá trị/lượt từ log, không đo ví). */
  private creditServeEarnings(value: number): number {
    const w = this.world
    if (value <= 0) return 0
    const remaining = DAILY_EARN_CAP - w.dayEarned
    if (remaining <= 0) return 0
    const credited = Math.min(value, remaining)
    w.coins += credited
    w.dayEarned += credited
    if (credited < value) this.say(`🧱 CHẠM TRẦN NGÀY ${DAILY_EARN_CAP / 1000}k xu — xu vượt trần không cộng.`)
    return credited
  }

  /** Phục vụ cả Order của bàn (1 chạm giao cả đợt — 03 §4). Chỉ hợp lệ khi đủ món ready. */
  serve(tableId: string): boolean {
    const w = this.world
    const table = w.tables.find((t) => t.id === tableId)
    const order = table?.currentOrder
    if (!table || !order || order.state !== 'pending') return false
    const items = order.items.filter((i) => i.state !== 'cancelled')
    if (!items.every((i) => i.state === 'ready')) return false

    const ratio = Math.max(0, (order.placedAt + order.patienceMs - w.now) / order.patienceMs)
    for (const seat of table.seats) {
      if (!seat || seat.state !== 'ordered') continue
      const mine = items.filter((i) => i.customerId === seat.id)
      if (mine.length === 0) continue
      const payment = mine.reduce((s, i) => s + MENU[i.dish].price, 0)
      const hadMoi = mine.some((i) => i.dish !== 'bia')
      const stale = mine.some(
        (i) => i.dish === 'bia' && i.pouredAt !== undefined && w.now - i.pouredAt > FRESHNESS_MS,
      )
      // Tip (GDD §8 tối giản): <60% patience → 0 · ×freshness (0 nếu hết hơi) · ×VIP 10
      let tip = ratio < TIP_PATIENCE_THRESHOLD ? 0 : Math.round(payment * TIP_RATE)
      if (stale) tip = 0
      if (seat.type === 'vip') tip *= TIP_VIP_MULT
      const credited = this.creditServeEarnings(payment + tip)
      const ev: ServeEvent = {
        t: w.now, customerType: seat.type,
        dishes: mine.map((i) => i.dish as Dish),
        payment, tip, credited, hadMoi, stale,
      }
      w.log.push(ev)
      this.allEvents.push(ev)
      if (stale) this.say(`⚠️ Cốc hết hơi! ${seat.type} tip ×0 (+${credited})`)
      else if (credited < payment + tip) this.say(`💰 +${credited} xu (trần ngày)`)
      else this.say(`💰 +${payment}${tip ? ` +tip ${tip}` : ''}${seat.type === 'vip' ? ' (VIP ×10)' : ''}`)
      seat.state = 'enjoying'
      seat.enjoyUntil = w.now + randInt(this.rng, ENJOY_MIN_MS, ENJOY_MAX_MS)
      for (const i of mine) i.state = 'served'
    }
    order.state = 'served'
    table.roundsDone++
    table.state = 'enjoying'
    return true
  }

  // ───────────────────────── tick ─────────────────────────

  tick(dtMs: number) {
    const w = this.world
    w.now += dtMs
    if (w.shift.running) {
      w.shift.elapsedMs += dtMs
      if (w.shift.elapsedMs >= w.shift.durationMs) {
        w.shift.running = false
        this.say('😮‍💨 Hết thể lực — đóng ca. Khách đang ngồi vẫn phục vụ nốt.')
      } else if (w.now >= w.shift.nextSpawnAt) {
        const spawnedCustomerCount = this.spawnGroup()
        // SPAWN_BASE_MS là nhịp mỗi khách; nhóm N người phải tiêu thụ N nhịp đến khách kế tiếp.
        const interval = SPAWN_BASE_MS * spawnedCustomerCount * (w.rush === 'peak' ? PEAK_SPAWN_MULT : 1)
        w.shift.nextSpawnAt = w.now + interval
        w.shift.firstSpawnDone = true
      }
    }
    this.tickPour()
    this.tickWasher()
    this.tickOrders()
    this.tickEnjoy()
    this.tickQueue()
    // auto-assist (toggle trong HUD) — để cô lập từng cơ chế khi đo feel
    if (w.autoWash) this.wash()
    if (w.autoPour) this.pour()
  }

  private tickPour() {
    const w = this.world
    const p = w.tap.pouring
    if (!p) return
    if (w.now - p.startedAt < POUR_MS) return
    const glass = w.glasses.find((g) => g.id === p.glassId)!
    const order = this.findOrder(p.orderId)
    w.tap.pouring = null
    if (!order || order.state !== 'pending') { glass.state = 'dirty'; return } // order chết giữa chừng
    const item = order.items.find((i) => i.id === p.itemId)!
    item.state = 'ready'
    item.pouredAt = w.now
    glass.pouredAt = w.now
  }

  private tickWasher() {
    const w = this.world
    const cfg = w.washer.upgraded ? WASH_UPGRADED : WASH_BASE
    for (let i = 0; i < w.washer.slots.length; i++) {
      const s = w.washer.slots[i]
      if (!s) continue
      if (w.now - s.startedAt >= cfg.washMs) {
        const glass = w.glasses.find((g) => g.id === s.glassId)!
        glass.state = 'clean'
        glass.pouredAt = undefined
        glass.washStartedAt = undefined
        w.washer.slots[i] = null
      }
    }
  }

  private tickOrders() {
    const w = this.world
    for (const t of w.tables) {
      const o = t.currentOrder
      if (!o || o.state !== 'pending') continue
      if (w.now <= o.placedAt + o.patienceMs) continue
      // ── Order quá hạn → CẢ NHÓM chưa phục vụ bỏ đi cùng lúc (03 §5; Phase 0 không phạt xu) ──
      o.state = 'expired'
      for (const it of o.items) {
        if (it.state === 'pouring' && w.tap.pouring?.itemId === it.id) w.tap.pouring = null
        if (it.glassId) {
          const g = w.glasses.find((x) => x.id === it.glassId)
          if (g) { g.state = 'dirty'; g.pouredAt = undefined } // cốc đã rót → dirty (phạt ngầm 1 vòng rửa)
        }
        if (it.state !== 'served') it.state = 'cancelled'
      }
      let lost = 0
      for (let i = 0; i < t.seats.length; i++) {
        const c = t.seats[i]
        if (!c) continue
        if (c.state === 'ordered' || c.state === 'waiting') { lost++; c.state = 'left' }
        t.seats[i] = null // kết thúc buổi cả bàn (03 §5)
      }
      w.lostCustomers += lost
      t.currentOrder = null
      t.state = 'empty'
      this.say(`😤 Bàn bỏ đi! Mất ${lost} khách`)
    }
  }

  private tickEnjoy() {
    const w = this.world
    for (const t of w.tables) {
      if (t.state !== 'enjoying') continue
      let allDone = true
      for (const c of t.seats) {
        if (!c) continue
        if (c.state === 'enjoying' && c.enjoyUntil !== undefined && w.now >= c.enjoyUntil) {
          c.state = 'served' // xong đợt này, chờ cả nhóm
          this.releaseGlassOf(c.id, t)
        }
        if (c.state === 'enjoying') allDone = false
      }
      if (!allDone) continue
      // cả nhóm xong đợt
      if (t.roundsDone < t.roundsPlanned) {
        const customers = t.seats.filter((c): c is Customer => c !== null && c.state !== 'left')
        if (customers.length > 0) { this.placeOrder(t, customers, t.roundsDone + 1); continue }
      }
      // hết nhu cầu → rời bàn
      for (let i = 0; i < t.seats.length; i++) {
        if (t.seats[i]) { t.seats[i]!.state = 'left'; t.seats[i] = null }
      }
      t.currentOrder = null
      t.state = 'empty'
    }
  }

  /** cốc của khách (đợt vừa uống) → dirty */
  private releaseGlassOf(customerId: string, t: Table) {
    const o = t.currentOrder
    if (!o) return
    for (const it of o.items) {
      if (it.customerId === customerId && it.glassId) {
        const g = this.world.glasses.find((x) => x.id === it.glassId)
        if (g && g.state === 'in_use') { g.state = 'dirty'; g.pouredAt = undefined }
      }
    }
  }

  private tickQueue() {
    const w = this.world
    // nhóm trong queue hết kiên nhẫn → bỏ về
    for (let i = w.queue.length - 1; i >= 0; i--) {
      const g = w.queue[i]
      const patience = Math.min(...g.customers.map((c) => c.maxPatienceMs))
      if (w.now - g.queuedAt > patience) {
        w.lostCustomers += g.customers.length
        w.queue.splice(i, 1)
        this.say(`🚶 Nhóm ${g.customers.length} người bỏ hàng đợi`)
      }
    }
    // bàn trống → mời nhóm đầu hàng vào
    for (const t of w.tables) {
      if (t.state !== 'empty' || w.queue.length === 0) continue
      const g = w.queue.shift()!
      this.seatGroup(t, g.customers)
    }
  }

  // ───────────────────────── spawn / order ─────────────────────────

  private makeCustomer(): Customer {
    const type = weightedPick(this.rng, CUSTOMER_WEIGHTS) as CustomerType
    const maxPatienceMs =
      type === 'thuong' ? PATIENCE_THUONG_MS : Math.round(PATIENCE_THUONG_MS * PATIENCE_RUSH_MULT)
    return {
      id: uid('c'), type, tableId: '', seatIndex: -1,
      state: 'waiting', maxPatienceMs,
    }
  }

  private spawnGroup(): number {
    const w = this.world
    const size = randInt(this.rng, GROUP_SIZE_MIN, GROUP_SIZE_MAX)
    const customers = Array.from({ length: size }, () => this.makeCustomer())
    const emptyTable = w.tables.find((t) => t.state === 'empty')
    if (emptyTable) { this.seatGroup(emptyTable, customers); return size }
    if (w.queue.length < QUEUE_SLOTS) {
      w.queue.push({ id: uid('q'), customers, queuedAt: w.now })
      return size
    }
    w.rejectedAtDoor += size // overflow — từ chối tại cửa, không phạt (03 §1)
    return size
  }

  private seatGroup(t: Table, customers: Customer[]) {
    customers.forEach((c, i) => { c.tableId = t.id; c.seatIndex = i; t.seats[i] = c })
    const anyVoi = customers.some((c) => c.type === 'voi')
    t.roundsPlanned = anyVoi ? 1 : this.rng() < P_SECOND_ROUND ? 2 : 1 // 03 §10: 1–2 đợt/bàn
    t.roundsDone = 0
    this.placeOrder(t, customers, 1)
  }

  private placeOrder(t: Table, customers: Customer[], round: number) {
    const w = this.world
    const items: OrderItem[] = []
    for (const c of customers) {
      c.state = 'ordered'
      c.enjoyUntil = undefined
      items.push({ id: uid('i'), dish: 'bia', customerId: c.id, needsGlass: true, state: 'pending' })
      if (this.rng() < P_MOI) {
        const moi: Dish = this.rng() < P_NEM_GIVEN_MOI ? 'nem' : 'lac'
        items.push({ id: uid('i'), dish: moi, customerId: c.id, needsGlass: false, state: 'ready' }) // prep tức thì
      }
    }
    t.currentOrder = {
      id: uid('o'), tableId: t.id, round, items,
      placedAt: w.now,
      patienceMs: Math.min(...customers.map((c) => c.maxPatienceMs)), // min của nhóm (03 §4)
      state: 'pending',
    }
    t.state = 'awaiting_serve'
  }

  private findOrder(orderId: string): Order | null {
    for (const t of this.world.tables) if (t.currentOrder?.id === orderId) return t.currentOrder
    return null
  }
}
