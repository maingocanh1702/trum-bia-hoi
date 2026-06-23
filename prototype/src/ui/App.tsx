import { useEffect, useRef, useState } from 'react'
import { Engine } from '../engine/engine'
import { computeStats, formatStats } from '../engine/metrics'
import type { GlassState, ShiftStats } from '../engine/types'
import { ControlButton, IconButton, InfoCard, Sheet, StatusPill } from './components'
import { GameView } from './GameView'
import { Icon } from './icons'
import { type WeatherKey, weatherTint } from './tokens'

const weatherOrder: WeatherKey[] = ['sunny', 'evening', 'hot', 'humid', 'rain', 'cold']

interface HudState {
  activeTables: number
  aggStats: ShiftStats | null
  autoPour: boolean
  autoWash: boolean
  coins: number
  events: string[]
  glasses: Record<GlassState, number>
  lostCustomers: number
  pendingTables: number
  queueGroups: number
  rejectedAtDoor: number
  remainSec: number
  running: boolean
  rush: 'normal' | 'peak'
  shiftStats: ShiftStats | null
  totalServes: number
  washUpgraded: boolean
}

export default function App() {
  const engineRef = useRef<Engine>()
  const mountRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<GameView>()
  const [hud, setHud] = useState<HudState | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [weather, setWeather] = useState<WeatherKey>('sunny')

  useEffect(() => {
    const engine = new Engine()
    const view = new GameView(engine)
    engineRef.current = engine
    viewRef.current = view
    let raf = 0
    let last = performance.now()
    let lastRender = 0
    let wasRunning = false
    let disposed = false

    view.init(mountRef.current!).then(() => {
      const loop = (now: number) => {
        if (disposed) return
        const dt = Math.min(200, now - last)
        last = now
        try {
          engine.tick(dt)
          if (now - lastRender > 100) {
            lastRender = now
            view.render()
            const world = engine.world
            const idle = world.tables.every((table) => table.state === 'empty') && world.queue.length === 0
            if (wasRunning && !world.shift.running && idle && world.log.length > 0) {
              wasRunning = false
              setShowStats(true)
            }
            if (world.shift.running) wasRunning = true
            const shiftStats = world.log.length > 0 ? computeStats(world.log, world.lostCustomers, world.rejectedAtDoor) : null
            setHud({
              activeTables: world.tables.filter((table) => table.state !== 'empty').length,
              aggStats: engine.allEvents.length > 0 ? computeStats(engine.allEvents, 0, 0) : null,
              autoPour: world.autoPour,
              autoWash: world.autoWash,
              coins: world.coins,
              events: [...world.lastEvents],
              glasses: glassCounts(engine),
              lostCustomers: world.lostCustomers,
              pendingTables: world.tables.filter((table) => table.currentOrder?.state === 'pending').length,
              queueGroups: world.queue.length,
              rejectedAtDoor: world.rejectedAtDoor,
              remainSec: Math.max(0, (world.shift.durationMs - world.shift.elapsedMs) / 1000),
              running: world.shift.running,
              rush: world.rush,
              shiftStats,
              totalServes: engine.allEvents.length,
              washUpgraded: world.washer.upgraded,
            })
          }
        } catch (error) {
          console.error('[game loop]', error)
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      view.destroy()
    }
  }, [])

  useEffect(() => {
    viewRef.current?.setWeather(weather)
  }, [weather])

  const engine = engineRef.current
  const weatherLabel = weatherTint[weather].label
  const cleanGlasses = hud?.glasses.clean ?? 0
  const kValue = hud?.shiftStats ? hud.shiftStats.k.toFixed(2) : '—'

  const cycleWeather = () => {
    setWeather((current) => weatherOrder[(weatherOrder.indexOf(current) + 1) % weatherOrder.length])
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">TBH</span>
          <div>
            <h1>Trùm Bia Hơi</h1>
            <p>Hẻm nhỏ · Vụ Bia thử nghiệm</p>
          </div>
        </div>
        <div className="topbar__actions">
          <IconButton icon="bell" label="Thông báo" onClick={() => engine?.startShift()} />
          <IconButton icon="ai" label="Bia Đấm" onClick={() => cycleWeather()} />
        </div>
      </header>

      <section className="status-grid" aria-label="Trạng thái quán">
        <StatusPill icon="coin" label="Xu" value={`${hud?.coins ?? 0}`} tone="coin" />
        <StatusPill icon="weather" label="Trời" value={weatherLabel} tone={weather === 'rain' ? 'warning' : 'info'} />
        <StatusPill icon="glass" label="Cốc sạch" value={`${cleanGlasses}/10`} tone={cleanGlasses <= 2 ? 'warning' : 'success'} />
        <StatusPill icon="cup" label="k" value={kValue} tone={hud?.shiftStats && hud.shiftStats.k < 2 ? 'warning' : 'info'} />
      </section>

      <section className="operation-bar" aria-label="Điều khiển ca">
        <ControlButton
          icon={hud?.running ? 'pause' : 'play'}
          label={hud?.running ? 'Đóng ca' : 'Mở ca'}
          meta={hud?.running ? `${hud.remainSec.toFixed(0)}s` : 'sẵn sàng'}
          onClick={() => {
            if (hud?.running) engine?.endShift()
            else {
              engine?.startShift()
              setShowStats(false)
            }
          }}
          tone={hud?.running ? 'warning' : 'primary'}
        />
        <ControlButton
          active={hud?.rush === 'peak'}
          icon="rush"
          label={hud?.rush === 'peak' ? 'Cao điểm' : 'Nhịp thường'}
          meta="spawn"
          onClick={() => engine?.toggleRush()}
          tone={hud?.rush === 'peak' ? 'danger' : 'neutral'}
        />
        <ControlButton
          active={hud?.washUpgraded}
          icon="washer"
          label={hud?.washUpgraded ? 'Rửa nhanh' : 'Rửa cơ bản'}
          meta={hud?.washUpgraded ? '3 slot' : '1 slot'}
          onClick={() => engine?.toggleWashUpgrade()}
          tone={hud?.washUpgraded ? 'success' : 'neutral'}
        />
        <ControlButton
          active={hud?.autoPour}
          icon="tap"
          label={hud?.autoPour ? 'Auto rót' : 'Rót tay'}
          meta="vòi bia"
          onClick={() => engine?.toggleAutoPour()}
          tone={hud?.autoPour ? 'success' : 'neutral'}
        />
        <ControlButton
          active={hud?.autoWash}
          icon="washer"
          label={hud?.autoWash ? 'Auto rửa' : 'Rửa tay'}
          meta="cốc bẩn"
          onClick={() => engine?.toggleAutoWash()}
          tone={hud?.autoWash ? 'success' : 'neutral'}
        />
        <ControlButton icon="weather" label="Đổi trời" meta={weatherLabel} onClick={cycleWeather} tone="neutral" />
        <ControlButton icon="stats" label="Sổ ca" meta={`${hud?.totalServes ?? 0} lượt`} onClick={() => setShowStats(true)} tone="neutral" />
      </section>

      <div className="canvas-wrap" ref={mountRef} />

      <section className="ops-strip" aria-label="Nhịp vận hành">
        <InfoCard
          detail={`hàng đợi ${hud?.queueGroups ?? 0} nhóm`}
          icon="table"
          title="Bàn"
          value={`${hud?.activeTables ?? 0}/3`}
          tone={(hud?.pendingTables ?? 0) >= 2 ? 'warning' : 'info'}
        />
        <InfoCard
          detail={`${hud?.glasses.dirty ?? 0} bẩn · ${hud?.glasses.washing ?? 0} đang rửa`}
          icon="glass"
          title="Vòng cốc"
          value={`${hud?.glasses.in_use ?? 0} đang dùng`}
          tone={(hud?.glasses.dirty ?? 0) >= 4 ? 'warning' : 'success'}
        />
        <InfoCard
          detail={`${hud?.rejectedAtDoor ?? 0} từ chối tại cửa`}
          icon="quest"
          title="Mất khách"
          value={`${hud?.lostCustomers ?? 0}`}
          tone={(hud?.lostCustomers ?? 0) > 0 ? 'danger' : 'success'}
        />
      </section>

      <section className="event-log" aria-label="Nhật ký ca">
        {(hud?.events.length ? hud.events : ['Quán sẵn sàng.']).map((event, index) => (
          <div key={`${event}-${index}`} style={{ opacity: 1 - index * 0.13 }}>
            {event}
          </div>
        ))}
      </section>

      <nav className="bottom-rail" aria-label="Màn phụ">
        <button onClick={() => engine?.toggleWashUpgrade()} type="button">
          <span><Icon name="upgrade" /></span>
          Nâng cấp
        </button>
        <button onClick={cycleWeather} type="button">
          <span><Icon name="shop" /></span>
          Nhập hàng
        </button>
        <button onClick={() => setShowStats(true)} type="button">
          <span><Icon name="trophy" /></span>
          Giải Nhậu
        </button>
        <button onClick={cycleWeather} type="button">
          <span><Icon name="ticket" /></span>
          Vụ Bia
        </button>
      </nav>

      {showStats && hud ? (
        <Sheet title="Sổ ca" onClose={() => setShowStats(false)}>
          <div className="stats-layout">
            {hud.shiftStats ? (
              <section>
                <h3>Ca vừa rồi</h3>
                <pre>{formatStats(hud.shiftStats)}</pre>
              </section>
            ) : null}
            {hud.aggStats ? (
              <section>
                <h3>Dồn cả phiên</h3>
                <pre>{formatStats(hud.aggStats)}</pre>
              </section>
            ) : null}
          </div>
          <div className="sheet__actions">
            <button
              className="plain-action"
              onClick={() => {
                const data = JSON.stringify(engineRef.current?.allEvents ?? [], null, 1)
                navigator.clipboard?.writeText(data)
              }}
              type="button"
            >
              Copy log
            </button>
            <button className="primary-action" onClick={() => setShowStats(false)} type="button">
              Chốt
            </button>
          </div>
        </Sheet>
      ) : null}
    </main>
  )
}

function glassCounts(engine: Engine): Record<GlassState, number> {
  return engine.world.glasses.reduce(
    (acc, glass) => {
      acc[glass.state] += 1
      return acc
    },
    { clean: 0, dirty: 0, in_use: 0, washing: 0 } as Record<GlassState, number>,
  )
}
