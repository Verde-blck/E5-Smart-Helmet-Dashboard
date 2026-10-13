import { useCallback, useState, useSyncExternalStore } from 'react'
import type { DeviceView } from '@/modules/devices/types'
import type { HelmetSession, SessionState } from '../lib/session'
import { WALL_MAX, useWallSessions } from '../hooks/useWallSessions'
import { Overlay } from './Overlay'
import { StatusPill, StateMessage } from './LiveViewModal'
import { StreamVideo } from './StreamVideo'
import { SpeakerIcon } from './icons'

const noopSubscribe = () => () => {}
const noState = () => null

function useSessionState(session: HelmetSession | null): SessionState | null {
  return useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getState : noState
  ) as SessionState | null
}

interface Props {
  /** Helmets to choose from, already filtered by the page's search box. */
  devices: DeviceView[]
  /** Kept by the page, so returning to the wall remembers the choice. */
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  /** The whole fleet, so a selected helmet stays on the wall when search hides it. */
  allDevices: DeviceView[]
}

/**
 * Up to six helmets live at once.
 *
 * Every tile is muted; enlarging one plays its sound, so there's never more
 * than one helmet talking. Each tile is an independent session, so one
 * helmet's weak signal never affects the others.
 */
export function LiveWall({ devices, selected, onSelectedChange, allDevices }: Props) {
  const wall = useWallSessions()
  const [focusId, setFocusId] = useState<string | null>(null)

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
          <div className="flex gap-2">
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

function WallTile({
  name,
  session,
  onStart,
  onRemove,
  onFocus,
}: {
  name: string
  session: HelmetSession | null
  onStart: () => void
  onRemove: () => void
  onFocus: () => void
}) {
  const state = useSessionState(session)
  const live = state?.status === 'live'

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 text-white">
      <StreamVideo
        stream={state?.remoteStream ?? null}
        muted
        className="h-full w-full object-cover"
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

/**
 * One wall tile, enlarged and with sound. Uses the tile's own connection, so
 * opening and closing it doesn't restart anything; closing returns to the
 * wall without stopping the helmet.
 */
function FocusView({
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
