import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useTenant } from '@/shared/hooks/useTenant'
import { WALL_MAX, useWallSessions } from './hooks/useWallSessions'
import { FocusView, WallTile } from './components/LiveWall'

function columnsFor(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 2
  return 3
}

// Unlike the in-dashboard wall, this never pauses when hidden: staying up on a second screen is its
// job.
export function WallDisplayPage() {
  const [params, setParams] = useSearchParams()
  const { devices } = useDevices()
  const tenant = useTenant()
  const wall = useWallSessions({ pauseWhenHidden: false })

  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, WALL_MAX)
  const [started, setStarted] = useState(false)
  const [editing, setEditing] = useState(ids.length === 0)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const byId = new Map(devices.map((d) => [d.id, d]))
  const nameOf = (id: string) => byId.get(id)?.name ?? `…${id.slice(-5)}`

  useEffect(() => {
    document.title = `Live wall · ${tenant?.name ?? 'Command Centre'}`
  }, [tenant?.name])

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!fullscreen) {
      setChromeVisible(true)
      return
    }
    const show = () => {
      setChromeVisible(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setChromeVisible(false), 3000)
    }
    show()
    window.addEventListener('mousemove', show)
    return () => {
      window.removeEventListener('mousemove', show)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [fullscreen])

  function setIds(next: string[]) {
    setParams(next.length ? { ids: next.join(',') } : {}, { replace: true })
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Not allowed or not supported; the wall still works in the window.
    }
  }

  function start(withFullscreen: boolean) {
    if (withFullscreen) void enterFullscreen()
    ids.forEach((id) => wall.start(id))
    setStarted(true)
  }

  function toggle(id: string) {
    if (ids.includes(id)) {
      wall.stop(id)
      if (focusId === id) setFocusId(null)
      setIds(ids.filter((x) => x !== id))
    } else if (ids.length < WALL_MAX) {
      if (started) wall.start(id)
      setIds([...ids, id])
    }
  }

  const cols = columnsFor(ids.length)
  const rows = Math.max(1, Math.ceil(ids.length / cols))
  const focused = focusId ? byId.get(focusId) : undefined

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header
        className={`z-10 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 transition-opacity duration-300 ${
          fullscreen ? 'absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent pb-6' : 'border-b border-white/10'
        } ${chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <p className="text-sm font-semibold">Live wall</p>
        <p className="text-xs text-slate-400">
          {tenant?.name ?? 'Command Centre'} · {ids.length} of {WALL_MAX} helmets
        </p>
        <Clock />
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className="rounded bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
          >
            {editing ? 'Done' : 'Edit helmets'}
          </button>
          {started &&
            (fullscreen ? (
              <button
                onClick={() => void document.exitFullscreen()}
                className="rounded bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
              >
                Exit full screen
              </button>
            ) : (
              <button
                onClick={() => void enterFullscreen()}
                className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-200"
              >
                Full screen
              </button>
            ))}
          <button
            onClick={() => window.close()}
            className="rounded bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
          >
            Close wall
          </button>
        </div>

        {editing && (
          <div className="basis-full rounded-md bg-white/5 p-2">
            <p className="mb-1.5 text-[11px] text-slate-400">
              Choose up to {WALL_MAX}. Each uses about 0.9 GB of its mobile data per hour while shown.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {devices.map((d) => {
                const on = ids.includes(d.id)
                const blocked = !on && (ids.length >= WALL_MAX || !d.active)
                return (
                  <button
                    key={d.id}
                    onClick={() => toggle(d.id)}
                    disabled={blocked}
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs disabled:opacity-30 ${
                      on ? 'border-[#A3E2D7] bg-[#A3E2D7]/15 text-white' : 'border-white/15 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        d.presence === 'online' ? 'bg-emerald-400' : d.presence === 'degraded' ? 'bg-amber-400' : 'bg-slate-500'
                      }`}
                    />
                    {d.name}
                    {on && <span aria-hidden="true">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 p-2">
        {ids.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Choose helmets with Edit helmets.
          </div>
        ) : !started ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-xl bg-white/5 p-6 text-center">
              <p className="text-base font-semibold">Ready to show {ids.length} {ids.length === 1 ? 'helmet' : 'helmets'}</p>
              <p className="mt-1 text-sm text-slate-400">
                Move this window to the screen it should be on, then start. It keeps playing while you
                work in the dashboard.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  onClick={() => start(true)}
                  autoFocus
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                >
                  Start in full screen
                </button>
                <button onClick={() => start(false)} className="text-sm text-slate-300 hover:text-white">
                  Start in this window
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="grid h-full gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {ids.map((id) => (
              <WallTile
                key={id}
                fill
                name={nameOf(id)}
                session={wall.get(id)}
                onStart={() => wall.start(id)}
                onRemove={() => toggle(id)}
                onFocus={() => setFocusId(id)}
              />
            ))}
          </div>
        )}
      </main>

      {focused && (
        <FocusView name={focused.name} session={wall.get(focused.id)} onClose={() => setFocusId(null)} />
      )}
    </div>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return (
    <p className="font-mono text-xs tabular-nums text-slate-400">
      {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </p>
  )
}
