import { Container, Graphics, Text, type TextStyleOptions } from 'pixi.js'
import type { Customer, Dish, Glass, RushLevel, Table } from '../engine/types'
import { hexToNumber, pixiColors as COL, type WeatherKey, weatherTint, type as font } from './tokens'

export function makeText(
  value: string,
  size: number,
  fill: number | string = COL.cream,
  family: string = font.hud,
  weight: TextStyleOptions['fontWeight'] = '600',
): Text {
  return new Text({
    text: value,
    style: {
      fill,
      fontFamily: family,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: 0,
    },
  })
}

export function makeBodyText(value: string, size: number, fill: number | string = COL.creamMuted): Text {
  return makeText(value, size, fill, font.body, '500')
}

export function drawProgress(
  parent: Container,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,
  fill: number,
  background = COL.panelBorder,
) {
  const pct = Math.max(0, Math.min(1, value))
  parent.addChild(new Graphics().roundRect(x, y, width, height, height / 2).fill(background))
  parent.addChild(new Graphics().roundRect(x, y, width * pct, height, height / 2).fill(fill))
}

export function drawStreetBackground(
  parent: Container,
  width: number,
  height: number,
  weather: WeatherKey,
  rush: RushLevel,
  now: number,
) {
  parent.addChild(new Graphics().rect(0, 0, width, height).fill(COL.streetBg))
  parent.addChild(new Graphics().rect(0, 0, width, 74).fill(COL.panel))
  parent.addChild(new Graphics().rect(0, 74, width, 10).fill(COL.panelDeep))

  for (let x = -30; x < width; x += 58) {
    const tile = new Graphics()
      .moveTo(x, 84)
      .lineTo(x + 42, 84)
      .lineTo(x + 72, height)
      .lineTo(x + 16, height)
      .closePath()
      .fill(COL.streetBgShade)
    tile.alpha = 0.18
    parent.addChild(tile)
  }

  for (let i = 0; i < 16; i++) {
    const x = (i * 47 + 13) % width
    const y = 112 + ((i * 83) % (height - 144))
    const spot = new Graphics().ellipse(x, y, 18 + (i % 3) * 8, 6 + (i % 2) * 5).fill(COL.ink)
    spot.alpha = 0.055
    parent.addChild(spot)
  }

  drawSignboard(parent, 18, 14, rush)
  drawAwning(parent, width - 188, 12, now)

  const tint = weatherTint[weather]
  const overlay = new Graphics().rect(0, 0, width, height).fill(hexToNumber(tint.color))
  overlay.alpha = tint.alpha
  parent.addChild(overlay)

  if (weather === 'rain') drawRain(parent, width, height, now)
  if (rush === 'peak') drawRushRibbon(parent, width, now)
}

function drawSignboard(parent: Container, x: number, y: number, rush: RushLevel) {
  const sign = new Container()
  sign.position.set(x, y)
  sign.addChild(new Graphics().roundRect(0, 0, 238, 48, 8).fill(COL.panelRaised).stroke({ color: COL.panelBorder, width: 2 }))
  sign.addChild(new Graphics().rect(12, -8, 14, 14).fill(COL.inoxDark))
  sign.addChild(new Graphics().rect(210, -8, 14, 14).fill(COL.inoxDark))
  const title = makeText('TRUM BIA HOI', 19, COL.beerFoam)
  title.position.set(16, 7)
  sign.addChild(title)
  const subtitle = makeBodyText(rush === 'peak' ? 'Gio vang tan tam dang len' : 'Via he 2000s - mo ca la do', 10, COL.creamMuted)
  subtitle.position.set(17, 30)
  sign.addChild(subtitle)
  parent.addChild(sign)
}

function drawAwning(parent: Container, x: number, y: number, now: number) {
  const awning = new Container()
  awning.position.set(x, y)
  awning.addChild(new Graphics().roundRect(0, 0, 160, 38, 6).fill(COL.beerFoam).stroke({ color: COL.outline, width: 2 }))
  for (let i = 0; i < 5; i++) {
    const stripe = new Graphics().rect(i * 32, 0, 16, 38).fill(i % 2 === 0 ? COL.stoolRed : COL.beerFoam)
    stripe.alpha = i % 2 === 0 ? 0.92 : 0.75
    awning.addChild(stripe)
  }
  const sway = Math.sin(now / 500) * 1.5
  awning.rotation = sway * 0.002
  parent.addChild(awning)
}

function drawRain(parent: Container, width: number, height: number, now: number) {
  for (let i = 0; i < 34; i++) {
    const x = (i * 37 + now / 22) % width
    const y = (i * 61 + now / 8) % height
    const drop = new Graphics().moveTo(x, y).lineTo(x - 8, y + 16).stroke({ color: 0xbcd2e0, width: 1.4 })
    drop.alpha = 0.35
    parent.addChild(drop)
  }
}

function drawRushRibbon(parent: Container, width: number, now: number) {
  const x = 260 + Math.sin(now / 220) * 8
  const ribbon = new Graphics()
    .roundRect(x, 22, width - x - 22, 28, 8)
    .fill(COL.stoolRed)
    .stroke({ color: COL.stoolRedDeep, width: 2 })
  ribbon.alpha = 0.86
  parent.addChild(ribbon)
  const text = makeText('CAO DIEM', 14, 0xffffff)
  text.position.set(x + 18, 27)
  parent.addChild(text)
}

export function drawQueueToken(parent: Container, x: number, y: number, count: number, urgent: boolean) {
  const token = new Container()
  token.position.set(x, y)
  token.addChild(
    new Graphics()
      .roundRect(0, 0, 54, 34, 8)
      .fill(urgent ? COL.stoolRed : COL.panelRaised)
      .stroke({ color: urgent ? COL.danger : COL.panelBorder, width: 2 }),
  )
  for (let i = 0; i < count; i++) drawTinyPerson(token, 15 + i * 12, 17, urgent ? COL.beerFoam : COL.cream)
  parent.addChild(token)
}

export function drawTableAsset(parent: Container, table: Table, width: number, height: number, border: number, pulse: number) {
  parent.addChild(
    new Graphics()
      .roundRect(0, 0, width, height, 8)
      .fill(COL.panel)
      .stroke({ color: border, width: 2.5 + pulse }),
  )
  parent.addChild(new Graphics().roundRect(12, 42, width - 24, 76, 24).fill(COL.inoxDark))
  parent.addChild(new Graphics().roundRect(18, 34, width - 36, 72, 24).fill(COL.inox).stroke({ color: COL.outline, width: 2 }))
  parent.addChild(new Graphics().ellipse(width / 2, 70, width / 2 - 44, 20).fill(0xffffff).stroke({ color: COL.inoxMid, width: 1 }))
  const shine = new Graphics().ellipse(width / 2 - 38, 56, 58, 9).fill(0xffffff)
  shine.alpha = 0.22
  parent.addChild(shine)

  const stateColor = table.state === 'empty' ? COL.panelBorder : table.state === 'enjoying' ? COL.info : COL.beerAmber
  parent.addChild(new Graphics().circle(width - 18, 18, 5).fill(stateColor).stroke({ color: COL.outline, width: 1 }))
}

export function drawChair(parent: Container, x: number, y: number, occupied: boolean, alert = false) {
  const chair = new Graphics()
  chair.roundRect(x - 16, y - 9, 32, 22, 7)
    .fill(alert ? COL.danger : occupied ? COL.stoolRed : COL.stoolRedDeep)
    .stroke({ color: COL.outline, width: 1.5 })
  parent.addChild(chair)
  parent.addChild(new Graphics().rect(x - 12, y + 10, 5, 12).fill(COL.stoolRedDeep))
  parent.addChild(new Graphics().rect(x + 7, y + 10, 5, 12).fill(COL.stoolRedDeep))
}

export function drawCustomerAvatar(parent: Container, customer: Customer, x: number, y: number, warning = false) {
  const colorsByType: Record<Customer['type'], { shirt: number; skin: number; badge: number; label: string }> = {
    thuong: { shirt: 0x4f8b62, skin: 0xc88b5a, badge: COL.success, label: 'NH' },
    voi: { shirt: 0x4473b9, skin: 0xd59664, badge: COL.stoolRed, label: 'VOI' },
    vip: { shirt: 0x3c2b74, skin: 0xe0a56d, badge: COL.coinGold, label: 'VIP' },
  }
  const c = colorsByType[customer.type]
  const body = new Graphics()
    .roundRect(x - 13, y - 1, 26, 30, 8)
    .fill(c.shirt)
    .stroke({ color: COL.outline, width: 1.5 })
  parent.addChild(body)
  parent.addChild(new Graphics().circle(x, y - 12, 12).fill(c.skin).stroke({ color: COL.outline, width: 1.5 }))
  parent.addChild(new Graphics().circle(x - 4, y - 14, 1.4).fill(COL.ink))
  parent.addChild(new Graphics().circle(x + 4, y - 14, 1.4).fill(COL.ink))
  parent.addChild(new Graphics().arc(x, y - 10, 5, 0.1, Math.PI - 0.1).stroke({ color: COL.ink, width: 1.2 }))
  if (customer.type === 'vip') {
    parent.addChild(new Graphics().circle(x + 12, y - 22, 4).fill(COL.coinGold).stroke({ color: COL.outline, width: 1 }))
  }
  const badge = new Graphics()
    .roundRect(x - 16, y + 27, 32, 13, 5)
    .fill(c.badge)
    .stroke({ color: COL.outline, width: 1 })
  parent.addChild(badge)
  const label = makeText(c.label, customer.type === 'voi' ? 7 : 8, customer.type === 'vip' ? COL.ink : 0xffffff)
  label.anchor.set(0.5)
  label.position.set(x, y + 29)
  parent.addChild(label)
  if (warning) {
    const ring = new Graphics().circle(x, y - 7, 28).stroke({ color: COL.danger, width: 2 })
    ring.alpha = 0.72
    parent.addChild(ring)
  }
}

export function drawBeerGlass(
  parent: Container,
  x: number,
  y: number,
  scale: number,
  state: Glass['state'] | 'flat' | 'warn' | 'full',
  freshness = 1,
) {
  const g = new Container()
  g.position.set(x, y)
  g.scale.set(scale)
  const glassLine = new Graphics()
    .moveTo(-9, -18)
    .lineTo(9, -18)
    .lineTo(7, 18)
    .lineTo(-7, 18)
    .closePath()
    .fill(COL.glassClean)
    .stroke({ color: COL.outline, width: 1.5 })
  glassLine.alpha = state === 'clean' ? 0.7 : 0.92
  g.addChild(glassLine)
  if (state === 'in_use' || state === 'full' || state === 'warn' || state === 'flat') {
    const beerColor = state === 'flat' ? COL.glassStale : state === 'warn' ? COL.glassWarn : COL.beerAmber
    const beerHeight = 28 * Math.max(0.2, Math.min(1, freshness))
    g.addChild(new Graphics().roundRect(-7, 17 - beerHeight, 14, beerHeight, 2).fill(beerColor))
    if (state !== 'flat') {
      g.addChild(new Graphics().ellipse(0, 17 - beerHeight, 8, 3).fill(COL.beerFoam))
      if (freshness > 0.45) g.addChild(new Graphics().circle(-3, 15 - beerHeight, 2).fill(COL.beerFoam))
    }
  }
  if (state === 'dirty') {
    g.addChild(new Graphics().roundRect(-6, -1, 12, 15, 3).fill(COL.glassDirty))
    g.addChild(new Graphics().circle(2, -8, 2).fill(COL.glassDirty))
  }
  if (state === 'washing') {
    g.addChild(new Graphics().roundRect(-7, 1, 14, 15, 3).fill(COL.glassWashing))
    g.addChild(new Graphics().circle(-4, -7, 3).fill(0xffffff))
    g.addChild(new Graphics().circle(5, -11, 2).fill(0xffffff))
  }
  g.addChild(new Graphics().moveTo(-5, -15).lineTo(-4, 14).stroke({ color: 0xffffff, width: 1 }))
  g.addChild(new Graphics().moveTo(0, -16).lineTo(0, 15).stroke({ color: 0xffffff, width: 1 }))
  g.addChild(new Graphics().moveTo(5, -15).lineTo(4, 14).stroke({ color: 0xffffff, width: 1 }))
  parent.addChild(g)
}

export function drawDishIcon(parent: Container, dish: Dish, x: number, y: number, scale = 1) {
  const c = new Container()
  c.position.set(x, y)
  c.scale.set(scale)
  c.addChild(new Graphics().ellipse(0, 6, 18, 8).fill(0xf7f0df).stroke({ color: COL.outline, width: 1.3 }))
  if (dish === 'bia') {
    drawBeerGlass(c, 0, -2, 0.72, 'full')
  } else if (dish === 'lac') {
    for (let i = 0; i < 8; i++) {
      const px = -10 + (i % 4) * 6
      const py = 2 + Math.floor(i / 4) * 5
      c.addChild(new Graphics().ellipse(px, py, 3.3, 2.2).fill(0xc98639).stroke({ color: COL.outline, width: 0.5 }))
    }
  } else {
    for (let i = 0; i < 4; i++) {
      c.addChild(new Graphics().roundRect(-12 + i * 8, -3 + (i % 2) * 4, 7, 12, 3).fill(0xc94633).stroke({ color: COL.outline, width: 0.8 }))
    }
    c.addChild(new Graphics().moveTo(-16, 12).lineTo(15, -9).stroke({ color: 0xb78342, width: 1.5 }))
  }
  parent.addChild(c)
}

export function drawKeg(parent: Container, x: number, y: number, busy: boolean, progress: number, auto: boolean) {
  const c = new Container()
  c.position.set(x, y)
  c.addChild(new Graphics().roundRect(0, 0, 176, 116, 8).fill(COL.panel).stroke({ color: busy ? COL.info : COL.panelBorder, width: 2 }))
  c.addChild(new Graphics().ellipse(58, 58, 40, 48).fill(COL.inox).stroke({ color: COL.outline, width: 2 }))
  c.addChild(new Graphics().ellipse(58, 36, 38, 12).fill(COL.inoxMid))
  c.addChild(new Graphics().ellipse(58, 80, 38, 12).fill(COL.inoxDark))
  c.addChild(new Graphics().rect(102, 38, 42, 10).fill(0xb7793c).stroke({ color: COL.outline, width: 1.5 }))
  c.addChild(new Graphics().rect(137, 45, 10, 30).fill(0xb7793c).stroke({ color: COL.outline, width: 1.5 }))
  c.addChild(new Graphics().roundRect(118, 76, 46, 16, 6).fill(COL.beerAmberDeep).stroke({ color: COL.outline, width: 1.5 }))
  const title = makeBodyText(auto ? 'Bom bia tu dong' : 'Cham de rot', 11, COL.cream)
  title.position.set(12, 9)
  c.addChild(title)
  if (busy) {
    drawProgress(c, 14, 96, 148, 8, progress, COL.beerAmber)
    c.addChild(new Graphics().rect(142, 68, 4, 18 + Math.sin(progress * Math.PI) * 8).fill(COL.beerAmber))
  } else {
    const hint = makeBodyText('Voi dong + bom inox', 9, COL.creamMuted)
    hint.position.set(14, 96)
    c.addChild(hint)
  }
  parent.addChild(c)
}

export function drawOwner(parent: Container, x: number, y: number, now: number) {
  const bob = Math.sin(now / 260) * 2
  const c = new Container()
  c.position.set(x, y + bob)
  c.addChild(new Graphics().ellipse(0, 42, 28, 8).fill(COL.shadow))
  c.addChild(new Graphics().roundRect(-15, -2, 30, 42, 9).fill(0x255f4d).stroke({ color: COL.outline, width: 1.5 }))
  c.addChild(new Graphics().roundRect(-10, 7, 20, 29, 5).fill(COL.beerFoam).stroke({ color: COL.outline, width: 1 }))
  c.addChild(new Graphics().circle(0, -16, 14).fill(0xd19261).stroke({ color: COL.outline, width: 1.5 }))
  c.addChild(new Graphics().ellipse(0, -27, 14, 6).fill(0x2d1c11))
  c.addChild(new Graphics().moveTo(-18, 8).lineTo(-34, 20).stroke({ color: 0xd19261, width: 5 }))
  c.addChild(new Graphics().moveTo(18, 8).lineTo(34, 16).stroke({ color: 0xd19261, width: 5 }))
  drawBeerGlass(c, 38, 14, 0.45, 'full')
  parent.addChild(c)
}

function drawTinyPerson(parent: Container, x: number, y: number, color: number) {
  parent.addChild(new Graphics().circle(x, y - 6, 5).fill(color).stroke({ color: COL.outline, width: 0.8 }))
  parent.addChild(new Graphics().roundRect(x - 5, y, 10, 11, 3).fill(color).stroke({ color: COL.outline, width: 0.8 }))
}
