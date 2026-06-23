import { Application, Container, Graphics, Rectangle } from 'pixi.js'
import { FRESHNESS_MS, FRESHNESS_WARN_MS, POUR_MS, WASH_BASE, WASH_UPGRADED } from '../engine/constants'
import type { Engine } from '../engine/engine'
import type { Glass, OrderItem, Table } from '../engine/types'
import {
  drawBeerGlass,
  drawChair,
  drawCustomerAvatar,
  drawDishIcon,
  drawKeg,
  drawOwner,
  drawProgress,
  drawQueueToken,
  drawStreetBackground,
  drawTableAsset,
  makeBodyText,
  makeText,
} from './pixiAssets'
import { pixiColors as COL, type WeatherKey, weatherTint } from './tokens'

export const VIEW_W = 600
export const VIEW_H = 720

interface FloatingText {
  color: number
  duration: number
  msg: string
  startAt: number
  x: number
  y: number
}

interface HitRegion {
  h: number
  onTap: () => void
  w: number
  x: number
  y: number
}

export class GameView {
  app = new Application()
  ready = false
  private engine: Engine
  private floaters: FloatingText[] = []
  private hitRegions: HitRegion[] = []
  private lastCoins = 0
  private weather: WeatherKey = 'sunny'

  constructor(engine: Engine) {
    this.engine = engine
  }

  async init(mount: HTMLElement) {
    await this.app.init({ width: VIEW_W, height: VIEW_H, background: COL.streetBg, antialias: true })
    mount.appendChild(this.app.canvas)
    this.app.canvas.style.height = 'auto'
    this.app.canvas.style.width = '100%'
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = new Rectangle(0, 0, VIEW_W, VIEW_H)
    this.app.stage.on('pointertap', (event) => {
      const { x, y } = event.global
      for (let i = this.hitRegions.length - 1; i >= 0; i--) {
        const hit = this.hitRegions[i]
        if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
          hit.onTap()
          break
        }
      }
    })
    this.ready = true
  }

  setWeather(weather: WeatherKey) {
    this.weather = weather
  }

  render() {
    if (!this.ready) return

    const stage = this.app.stage
    for (const child of stage.removeChildren()) child.destroy({ children: true })
    this.hitRegions = []

    const world = this.engine.world
    drawStreetBackground(stage, VIEW_W, VIEW_H, this.weather, world.rush, world.now)
    this.drawTopLane()
    this.drawQueue()
    world.tables.forEach((table, index) => this.drawTable(table, index))
    this.drawKegStation()
    this.drawSink()
    this.drawGlassRack()
    drawOwner(stage, 528, 645, world.now)

    if (!world.shift.running && world.tables.every((table) => table.state === 'empty') && world.queue.length === 0) {
      this.drawClosedHint()
    }

    if (world.coins > this.lastCoins && this.lastCoins > 0) {
      this.spawnFloat(`+${world.coins - this.lastCoins} xu`, COL.coinGold, VIEW_W / 2, 112)
    }
    this.lastCoins = world.coins
    this.drawFloaters()
  }

  destroy() {
    this.app.destroy(true)
  }

  private registerHit(x: number, y: number, w: number, h: number, onTap: () => void) {
    this.hitRegions.push({ x, y, w, h, onTap })
  }

  private drawTopLane() {
    const world = this.engine.world
    const lane = new Container()
    lane.position.set(18, 88)
    lane.addChild(new Graphics().roundRect(0, 0, VIEW_W - 36, 42, 8).fill(COL.panel).stroke({ color: COL.panelBorder, width: 2 }))
    const weather = weatherTint[this.weather]
    const label = makeText(`${weather.label} / ${world.rush === 'peak' ? 'Cao diem' : 'Nhip thuong'}`, 13, COL.beerFoam)
    label.position.set(16, 11)
    lane.addChild(label)

    const pressure = world.tables.filter((table) => table.currentOrder?.state === 'pending').length / world.tables.length
    drawProgress(lane, 256, 15, 130, 10, pressure, world.rush === 'peak' ? COL.stoolRed : COL.success)
    const pressureLabel = makeBodyText('ap luc ban', 10, COL.creamMuted)
    pressureLabel.position.set(396, 9)
    lane.addChild(pressureLabel)

    const clean = world.glasses.filter((glass) => glass.state === 'clean').length
    drawProgress(lane, 474, 15, 72, 10, clean / world.glasses.length, clean > 2 ? COL.glassClean : COL.warning)
    const glassLabel = makeBodyText(`${clean}/${world.glasses.length} coc`, 10, COL.creamMuted)
    glassLabel.position.set(474, 25)
    lane.addChild(glassLabel)
    this.app.stage.addChild(lane)
  }

  private drawQueue() {
    const world = this.engine.world
    const queue = new Container()
    queue.position.set(22, 134)
    const title = makeBodyText('HANG DOI', 10, COL.ink)
    title.position.set(0, 8)
    queue.addChild(title)
    if (world.queue.length === 0) {
      const empty = makeBodyText('san sang don khach', 11, COL.ink)
      empty.alpha = 0.6
      empty.position.set(75, 7)
      queue.addChild(empty)
    }
    world.queue.forEach((group, index) => {
      const patience = Math.min(...group.customers.map((customer) => customer.maxPatienceMs))
      const urgent = world.now - group.queuedAt > patience * 0.6
      drawQueueToken(queue, 78 + index * 61, 0, group.customers.length, urgent)
    })
    this.app.stage.addChild(queue)
  }

  private drawTable(table: Table, index: number) {
    const world = this.engine.world
    const width = 352
    const height = 148
    const x = 22
    const y = 178 + index * 164
    const order = table.currentOrder
    let border = COL.panelBorder
    let patienceRatio = 1
    if (order?.state === 'pending') {
      patienceRatio = Math.max(0, (order.placedAt + order.patienceMs - world.now) / order.patienceMs)
      border = patienceRatio > 0.6 ? COL.success : patienceRatio > 0.3 ? COL.warning : COL.danger
    } else if (table.state === 'enjoying') {
      border = COL.info
    }

    const readyItems = order?.items.filter((item) => item.state !== 'cancelled') ?? []
    const allReady = readyItems.length > 0 && readyItems.every((item) => item.state === 'ready')
    const card = new Container()
    card.position.set(x, y)
    const pulse = allReady ? 1.8 + Math.sin(world.now / 160) * 1.1 : 0
    drawTableAsset(card, table, width, height, border, pulse)

    const title = makeText(`BAN ${index + 1}`, 13, COL.beerFoam)
    title.position.set(14, 12)
    card.addChild(title)
    const subtitle = makeBodyText(this.tableStatusText(table), 10, COL.creamMuted)
    subtitle.position.set(70, 14)
    card.addChild(subtitle)
    if (order?.state === 'pending') drawProgress(card, 210, 18, 118, 8, patienceRatio, border, COL.panelBorder)

    const seats = [
      { x: 86, y: 104 },
      { x: 272, y: 104 },
    ]
    table.seats.forEach((customer, seatIndex) => {
      const seat = seats[seatIndex]
      drawChair(card, seat.x, seat.y, customer !== null, order?.state === 'pending' && patienceRatio < 0.25)
      if (customer) {
        drawCustomerAvatar(card, customer, seat.x, seat.y - 28, order?.state === 'pending' && patienceRatio < 0.25)
      }
    })

    if (order?.state === 'pending') {
      this.drawOrderTray(card, order.items, world.now)
      if (allReady) this.drawServeCall(card, width, height)
    } else if (table.state === 'enjoying') {
      const enjoying = makeText('DANG NHAP LY', 14, COL.info)
      enjoying.position.set(116, 112)
      card.addChild(enjoying)
    } else {
      const empty = makeBodyText('cho nhom moi', 11, COL.creamMuted)
      empty.position.set(136, 112)
      card.addChild(empty)
    }

    this.app.stage.addChild(card)
    this.registerHit(x, y, width, height, () => this.engine.serve(table.id))
  }

  private tableStatusText(table: Table) {
    if (table.currentOrder?.state === 'pending') return `dot ${table.currentOrder.round}/${table.roundsPlanned} dang goi`
    if (table.state === 'enjoying') return 'dang lai rai'
    return 'trong'
  }

  private drawOrderTray(parent: Container, items: OrderItem[], now: number) {
    const tray = new Container()
    tray.position.set(112, 72)
    tray.addChild(new Graphics().roundRect(0, 0, 130, 45, 8).fill(COL.panelRaised).stroke({ color: COL.panelBorder, width: 1.5 }))
    items
      .filter((item) => item.state !== 'cancelled')
      .slice(0, 5)
      .forEach((item, index) => {
        const ix = 20 + index * 23
        const iy = 20
        drawDishIcon(tray, item.dish, ix, iy, 0.54)
        const color = this.itemStateColor(item, now)
        tray.addChild(new Graphics().circle(ix + 8, iy - 15, 4).fill(color).stroke({ color: COL.outline, width: 0.7 }))
      })
    parent.addChild(tray)
  }

  private itemStateColor(item: OrderItem, now: number) {
    if (item.state === 'pending') return COL.panelBorder
    if (item.state === 'pouring') return COL.info
    if (item.dish !== 'bia' || item.pouredAt === undefined) return COL.success
    const age = now - item.pouredAt
    if (age > FRESHNESS_MS) return COL.glassStale
    if (age > FRESHNESS_WARN_MS) return COL.warning
    return COL.success
  }

  private drawServeCall(parent: Container, width: number, height: number) {
    const button = new Graphics()
      .roundRect(width - 122, height - 39, 106, 28, 8)
      .fill(COL.stoolRed)
      .stroke({ color: COL.stoolRedDeep, width: 2 })
    parent.addChild(button)
    const text = makeText('CHOT MAM', 12, 0xffffff)
    text.position.set(width - 103, height - 33)
    parent.addChild(text)
  }

  private drawKegStation() {
    const world = this.engine.world
    const pouring = world.tap.pouring
    const progress = pouring ? Math.min(1, (world.now - pouring.startedAt) / POUR_MS) : 0
    drawKeg(this.app.stage, 398, 178, pouring !== null, progress, world.autoPour)
    this.registerHit(398, 178, 176, 116, () => this.engine.pour())
  }

  private drawSink() {
    const world = this.engine.world
    const cfg = world.washer.upgraded ? WASH_UPGRADED : WASH_BASE
    const x = 398
    const y = 308
    const panel = new Container()
    panel.position.set(x, y)
    const dirty = world.glasses.filter((glass) => glass.state === 'dirty').length
    panel.addChild(
      new Graphics()
        .roundRect(0, 0, 176, 128, 8)
        .fill(COL.panel)
        .stroke({ color: dirty > 0 ? COL.warning : COL.panelBorder, width: 2 }),
    )
    const title = makeBodyText(world.autoWash ? 'Bon rua tu dong' : 'Cham de rua', 11, COL.cream)
    title.position.set(13, 10)
    panel.addChild(title)
    const sub = makeBodyText(`${cfg.slots} slot x ${(cfg.washMs / 1000).toFixed(1)}s / ban ${dirty}`, 9, COL.creamMuted)
    sub.position.set(13, 27)
    panel.addChild(sub)

    panel.addChild(new Graphics().roundRect(20, 51, 136, 44, 12).fill(COL.inox).stroke({ color: COL.outline, width: 2 }))
    panel.addChild(new Graphics().ellipse(88, 58, 54, 11).fill(COL.glassWashing))
    world.washer.slots.forEach((slot, index) => {
      const barY = 103 + index * 8
      panel.addChild(new Graphics().roundRect(17, barY, 142, 5, 2.5).fill(COL.panelBorder))
      if (slot) {
        const progress = Math.min(1, (world.now - slot.startedAt) / cfg.washMs)
        panel.addChild(new Graphics().roundRect(17, barY, 142 * progress, 5, 2.5).fill(COL.info))
      }
    })
    this.app.stage.addChild(panel)
    this.registerHit(x, y, 176, 128, () => this.engine.wash())
  }

  private drawGlassRack() {
    const world = this.engine.world
    const x = 398
    const y = 450
    const rack = new Container()
    rack.position.set(x, y)
    rack.addChild(new Graphics().roundRect(0, 0, 176, 168, 8).fill(COL.panel).stroke({ color: COL.panelBorder, width: 2 }))
    const counts = this.glassCounts()
    const title = makeBodyText(`Gia coc ${counts.clean} sach / ${counts.dirty} ban`, 11, COL.cream)
    title.position.set(13, 10)
    rack.addChild(title)
    world.glasses.forEach((glass, index) => {
      const gx = 28 + (index % 5) * 30
      const gy = 55 + Math.floor(index / 5) * 50
      const { state, freshness } = this.visualGlassState(glass)
      drawBeerGlass(rack, gx, gy, 0.78, state, freshness)
      if (glass.state === 'in_use' && glass.pouredAt !== undefined) {
        const age = world.now - glass.pouredAt
        const pct = Math.max(0, 1 - age / FRESHNESS_MS)
        const color = age > FRESHNESS_MS ? COL.glassStale : age > FRESHNESS_WARN_MS ? COL.warning : COL.success
        drawProgress(rack, gx - 10, gy + 24, 20, 3, pct, color, COL.panelBorder)
      }
    })
    this.app.stage.addChild(rack)
  }

  private glassCounts() {
    return this.engine.world.glasses.reduce(
      (acc, glass) => {
        acc[glass.state] += 1
        return acc
      },
      { clean: 0, dirty: 0, in_use: 0, washing: 0 } as Record<Glass['state'], number>,
    )
  }

  private visualGlassState(glass: Glass): { freshness: number; state: Glass['state'] | 'flat' | 'warn' | 'full' } {
    const world = this.engine.world
    if (glass.state !== 'in_use' || glass.pouredAt === undefined) return { freshness: 1, state: glass.state }
    const age = world.now - glass.pouredAt
    const freshness = Math.max(0, 1 - age / FRESHNESS_MS)
    if (age > FRESHNESS_MS) return { freshness, state: 'flat' }
    if (age > FRESHNESS_WARN_MS) return { freshness, state: 'warn' }
    return { freshness, state: 'full' }
  }

  private drawClosedHint() {
    const panel = new Container()
    panel.position.set(116, 612)
    panel.addChild(new Graphics().roundRect(0, 0, 300, 58, 8).fill(COL.panel).stroke({ color: COL.panelBorder, width: 2 }))
    const title = makeText('QUAN DANG NGHI', 15, COL.beerFoam)
    title.position.set(18, 10)
    panel.addChild(title)
    const body = makeBodyText('mo ca de bat dau phuc vu 3 ban dau tien', 11, COL.creamMuted)
    body.position.set(18, 34)
    panel.addChild(body)
    this.app.stage.addChild(panel)
  }

  private spawnFloat(msg: string, color: number, x: number, y: number) {
    this.floaters.push({ color, duration: 1200, msg, startAt: performance.now(), x, y })
  }

  private drawFloaters() {
    const now = performance.now()
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const floater = this.floaters[i]
      const pct = (now - floater.startAt) / floater.duration
      if (pct >= 1) {
        this.floaters.splice(i, 1)
        continue
      }
      const text = makeText(floater.msg, 18, floater.color)
      text.anchor.set(0.5)
      text.alpha = 1 - pct * pct
      text.position.set(floater.x, floater.y - pct * 82)
      this.app.stage.addChild(text)
    }
  }
}
