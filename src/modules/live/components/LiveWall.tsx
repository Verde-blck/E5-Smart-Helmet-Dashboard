import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { DeviceView } from '@/modules/devices/types'
import type { HelmetSession, SessionState } from '../lib/session'
import { WALL_MAX, useWallSessions } from '../hooks/useWallSessions'
import { Overlay } from './Overlay'
import { StatusPill, StateMessage } from './LiveViewModal'
import { StreamVideo } from './StreamVideo'
import { SpeakerIcon } from './icons'

const noopSubscribe = () => () => {}
const noState = () => null

export function useSessionState(session: HelmetSession | null): SessionState | null {
  return useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getState : noState
  ) as SessionState | null
}

interface Props {
  devices: DeviceView[]
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  allDevices: DeviceView[]
}

export function openWallWindow(ids: string[]): Window | null {
  const url = `/wall?ids=${encodeURIComponent(ids.join(','))}`
  // A window, not a tab: a background tab is hidden and can't sit on a second screen. The name
  // reuses an open wall.
  return window.open(url, 'e5-live-wall', 'popup,width=1280,height=760')
}

export function LiveWall({ devices, selected, onSelectedChange, allDevices }: Props) {
  const wall = useWallSessions()
  const [focusId, setFocusId] = useState<string | null>(null)
  const [poppedOut, setPoppedOut] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const wallWindow = useRef<Window | null>(null)

  useEffect(() => {
    if (!poppedOut) return
    const id = setInterval(() => {
      if (!wallWindow.current || wallWindow.current.closed) {
        wallWindow.current = null
        setPoppedOut(false)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [poppedOut])

  function popOut() {
    const win = openWallWindow(selected)
    if (!win) {
      setBlocked(true)
      return
    }
    setBlocked(false)
    wallWindow.current = win
    // The window runs its own connections; keeping these would download every stream twice.
    wall.stopAll()
    setFocusId(null)
    setPoppedOut(true)
  }

  if (poppedOut) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-slate-800">The live wall is open in its own window.</p>
        <p className="mt-1 text-xs text-slate-500">
          Drag it to a second screen or TV and press Full screen there. You can keep working here.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => wallWindow.current?.focus()}
            className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            Show the wall window
          </button>
          <button
            onClick={() => {
              wallWindow.current?.close()
              wallWindow.current = null
              setPoppedOut(false)
            }}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close it and watch here
          </button>
        </div>
      </div>
    )
  }

  const byId = new Map(allDevices.map((d) => [d.id, d]))
  const full = selected.length >= WALL_MAX
  const idle = selected.filter((id) => !wall.get(id))

  function toggle(device: DeviceView) {
    if (selected.includes(device.id)) {
      wall.stop(device.id)
      onSelectedChange(selected.filter((id) => id !== device.id))
      if (focusId === device.id) setFocusId(null)
    } else if (!full) {
      onSelectedChange([...selected, device.id])
      wall.start(device.id)
    }
  }

  const focused = focusId ? byId.get(focusId) : undefined

  return (
    <div>
      <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-700">
            <span className="font-medium">
              {selected.length} of {WALL_MAX}
            </span>{' '}
            helmets on the wall
            <span className="ml-2 text-xs text-slate-400">
              Each uses about 0.9 GB of its mobile data per hour.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.length > 0 && (
              <button
                onClick={popOut}
                title="Open the wall in its own window, for a second screen or TV"
                className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </svg>
                Open in new window
              </button>
            )}
            {idle.length > 0 && (
              <button
                onClick={() => idle.forEach((id) => wall.start(id))}
                className="rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
              >
                Start all
              </button>
            )}
            {wall.running > 0 && (
              <button
                onClick={() => {
                  wall.stopAll()
                  setFocusId(null)
                }}
                className="rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Stop all
              </button>
            )}
          </div>
        </div>

        {blocked && (
          <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            The browser blocked the new window. Allow pop-ups for this site (the icon at the right
            of the address bar), then try again.
          </p>
        )}
        {allDevices.length === 0 ? (
          <p className="text-xs text-slate-500">Loading fleet…</p>
        ) : devices.length === 0 ? (
          <p className="text-xs text-slate-500">No helmets match that search.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Helmets on the wall">
            {devices.map((device) => {
              const on = selected.includes(device.id)
              const blocked = !on && (full || !device.active)
              return (
                <button
                  key={device.id}
                  onClick={() => toggle(device)}
                  disabled={blocked}
                  aria-pressed={on}
                  title={
                    !device.active
                      ? 'Deactivated'
                      : full && !on
                        ? `The wall holds ${WALL_MAX} helmets. Remove one first.`
                        : undefined
                  }
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs disabled:opacity-40 ${
                    on
                      ? 'border-brand-primary bg-brand-primary/10 font-medium text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      device.presence === 'online'
                        ? 'bg-emerald-500'
                        : device.presence === 'degraded'
                          ? 'bg-amber-400'
                          : 'bg-slate-300'
                    }`}
                  />
                  {device.name}
                  {on && <span aria-hidden="true">✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Pick up to {WALL_MAX} helmets above to watch them live side by side.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {selected.map((id) => {
            const device = byId.get(id)
            return (
              <WallTile
                key={id}
                name={device?.name ?? id}
                session={wall.get(id)}
                onStart={() => wall.start(id)}
                onRemove={() => device && toggle(device)}
                onFocus={() => setFocusId(id)}
              />
            )
          })}
        </div>
      )}

      {focused && (
        <FocusView
          name={focused.name}
          session={wall.get(focused.id)}
          onClose={() => setFocusId(null)}
        />
      )}
    </div>
  )
}

export function WallTile({
  name,
  session,
  onStart,
  onRemove,
  onFocus,
  fill = false,
}: {
  name: string
  session: HelmetSession | null
  onStart: () => void
  onRemove: () => void
  onFocus: () => void
  fill?: boolean
}) {
  const state = useSessionState(session)
  const live = state?.status === 'live'

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-900 text-white ${
        fill ? 'h-full min-h-0' : 'aspect-video'
      }`}
    >
      <StreamVideo
        stream={state?.remoteStream ?? null}
        muted
        className={`h-full w-full ${fill ? 'object-contain' : 'object-cover'}`}
      />

      {!live && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          {state ? (
            <StateMessage
              state={state}
              deviceName={name}
              onRetry={() => session?.retry()}
              onStartAgain={onStart}
            />
          ) : (
            <div>
              <p className="text-sm text-slate-400">Stopped</p>
              <button
                onClick={onStart}
                className="mt-2 rounded-md bg-white px-3 py-1 text-xs font-medium text-slate-900 hover:bg-slate-200"
              >
                Start
              </button>
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-2.5 pb-4 pt-2">
        <div className="flex min-w-0 items-center gap-2">
          {state && <StatusPill status={state.status} />}
          <span className="truncate text-xs font-medium">{name}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onFocus}
            disabled={!live}
            aria-label={`Enlarge ${name} and play its sound`}
            title="Enlarge with sound"
            className="flex h-7 w-7 items-center justify-center rounded bg-black/40 hover:bg-black/60 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            aria-label={`Remove ${name} from the wall`}
            title="Remove from wall"
            className="flex h-7 w-7 items-center justify-center rounded bg-black/40 text-base leading-none hover:bg-black/60"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

export function FocusView({
  name,
  session,
  onClose,
}: {
  name: string
  session: HelmetSession | null
  onClose: () => void
}) {
  const state = useSessionState(session)
  const [muted, setMuted] = useState(false)
  const onBlocked = useCallback(() => setMuted(true), [])

  return (
    <Overlay label={`${name}, enlarged`} onDismiss={onClose}>
      <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {state && <StatusPill status={state.status} />}
            <p className="truncate text-sm font-medium">{name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              aria-pressed={!muted}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            >
              <SpeakerIcon off={muted} />
              {muted ? 'Turn sound on' : 'Mute'}
            </button>
            <button
              onClick={onClose}
              autoFocus
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E2D7]"
            >
              Back to wall
            </button>
          </div>
        </div>
        <div className="aspect-video bg-black">
          <StreamVideo
            stream={state?.remoteStream ?? null}
            muted={muted}
            onAutoplayBlocked={onBlocked}
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </Overlay>
  )
}
