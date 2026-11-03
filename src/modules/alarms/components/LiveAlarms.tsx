import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { useDeviceNames, useDevices } from '@/modules/devices/hooks/useDevices'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { SosCallButton } from '@/modules/live/components/SosCallButton'
import { runAlarmStream, streamStatus } from '../lib/alarmStream'
import {
  acknowledge,
  acknowledgeAll,
  chime,
  enableSound,
  installSoundUnlock,
  ring,
  soundEnabled,
  subscribeSound,
} from '../lib/alarmSound'
import { alarmDetail, alarmTitle } from '../lib/alarmCopy'
import { isSos } from '../types'
import type { Alarm } from '../types'

const WARNING_VISIBLE_MS = 10_000

interface Warning {
  alarm: Alarm
  until: number
}

export function LiveAlarms() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const navigate = useNavigate()
  const nameOf = useDeviceNames()
  const { devices } = useDevices()
  // Critical alarms waiting for someone to act, newest first. Kept apart from the ringing set:
  // silencing must never make a danger alarm disappear unanswered.
  const [critical, setCritical] = useState<Alarm[]>([])
  const [calling, setCalling] = useState<Alarm | null>(null)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [now, setNow] = useState(Date.now())
  const audible = useSyncExternalStore(subscribeSound, soundEnabled)
  const key = qk.alarms.all(tenantId)
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => installSoundUnlock(), [])

  useEffect(() => {
    const controller = new AbortController()
    void runAlarmStream(
      {
        onAlarm: (alarm) => {
          let isNew = false
          queryClient.setQueryData<Alarm[]>(keyRef.current, (prev) => {
            if (!prev) return prev
            if (prev.some((a) => a.id === alarm.id)) return prev
            isNew = true
            return [alarm, ...prev]
          })
          if (!queryClient.getQueryData(keyRef.current)) {
            isNew = true
            void queryClient.invalidateQueries({ queryKey: keyRef.current })
          }
          // Replayed after a reconnect and already known: no sound.
          if (!isNew || alarm.status !== 'active') return
          if (alarm.severity === 'critical') {
            ring(alarm.id)
            setCritical((list) => (list.some((a) => a.id === alarm.id) ? list : [alarm, ...list]))
          } else {
            chime()
            setWarnings((list) => [{ alarm, until: Date.now() + WARNING_VISIBLE_MS }, ...list].slice(0, 3))
          }
        },
        onUpdate: (alarm) => {
          queryClient.setQueryData<Alarm[]>(keyRef.current, (prev) =>
            prev?.map((a) => (a.id === alarm.id ? { ...a, status: alarm.status } : a))
          )
          if (alarm.status === 'resolved') {
            acknowledge(alarm.id)
            setCritical((list) => list.filter((a) => a.id !== alarm.id))
            setWarnings((list) => list.filter((w) => w.alarm.id !== alarm.id))
          }
        },
        onStatus: (up) => streamStatus.set(up),
        // Updates aren't replayed after a gap, so resync the list once.
        onReconnected: () => void queryClient.invalidateQueries({ queryKey: keyRef.current }),
      },
      controller.signal
    )
    return () => {
      controller.abort()
      streamStatus.set(false)
      acknowledgeAll()
    }
  }, [queryClient])

  useEffect(() => {
    if (warnings.length === 0 && critical.length === 0) return
    const id = setInterval(() => {
      setNow(Date.now())
      setWarnings((list) => list.filter((w) => w.until > Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [warnings.length, critical.length])

  function settle(alarm: Alarm) {
    acknowledge(alarm.id)
    setCritical((list) => list.filter((a) => a.id !== alarm.id))
  }

  function who(alarm: Alarm) {
    const device = devices.find((d) => d.id === alarm.deviceId)
    const helmet = nameOf(alarm.deviceId, alarm.deviceName)
    return { worker: device?.assignedTo?.name, helmet }
  }

  // During an SOS call the next danger alarm waits (still ringing) rather than covering the call screen.
  const top = calling ? undefined : critical[0]

  return (
    <>
      {!audible && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900 sm:px-6">
          <span className="min-w-0 flex-1">
            Alarm sound is off until you click anywhere on the page. Browsers block sound before that.
          </span>
          <button
            onClick={() => void enableSound()}
            className="rounded bg-amber-600 px-2.5 py-1 font-medium text-white hover:bg-amber-700"
          >
            Enable alarm sound
          </button>
        </div>
      )}

      {/* One keyed list, so the pop-up whose button started an SOS call stays mounted (hidden)
          until hang-up; unmounting it would end the call. */}
      {[calling, top].filter((a): a is Alarm => !!a).map((alarm) => (
        <CriticalAlarm
          key={alarm.id}
          alarm={alarm}
          {...who(alarm)}
          now={now}
          hidden={alarm.id === calling?.id}
          waiting={critical.filter((a) => a.id !== calling?.id).length - 1}
          onClose={() => settle(alarm)}
          onMap={() => {
            settle(alarm)
            navigate(`/map?device=${encodeURIComponent(alarm.deviceId)}`)
          }}
          onJoin={() => {
            acknowledge(alarm.id)
            setCalling(alarm)
          }}
          onHangUp={() => {
            settle(alarm)
            setCalling(null)
          }}
        />
      ))}

      {warnings.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
          {warnings.map(({ alarm }) => {
            const { worker, helmet } = who(alarm)
            return (
              <div
                key={alarm.id}
                role="status"
                className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
              >
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-950">{alarmTitle(alarm.type)}</p>
                  <p className="truncate text-xs font-medium text-amber-900">
                    {worker ? `${worker} · ${helmet}` : helmet}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800">{alarmDetail(alarm)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    onClick={() => {
                      setWarnings((list) => list.filter((w) => w.alarm.id !== alarm.id))
                      navigate(`/alarms?alarm=${encodeURIComponent(alarm.id)}`)
                    }}
                    className="rounded px-2 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setWarnings((list) => list.filter((w) => w.alarm.id !== alarm.id))}
                    aria-label="Dismiss"
                    className="px-2 text-sm leading-none text-amber-700 hover:text-amber-950"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function CriticalAlarm({
  alarm,
  worker,
  helmet,
  now,
  hidden,
  waiting,
  onClose,
  onMap,
  onJoin,
  onHangUp,
}: {
  alarm: Alarm
  worker?: string
  helmet: string
  now: number
  hidden: boolean
  waiting: number
  onClose: () => void
  onMap: () => void
  onJoin: () => void
  onHangUp: () => void
}) {
  const title = alarmTitle(alarm.type)
  const hasLocation = alarm.lat != null && alarm.lng != null

  return (
    <div className={hidden ? 'hidden' : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4'}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="critical-alarm-title"
        aria-describedby="critical-alarm-detail"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-4 ring-red-600"
      >
        <div className="flex items-center gap-4 bg-red-600 px-6 py-5 text-white">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
            <span className="absolute inset-0 rounded-full bg-white/25 motion-safe:animate-ping" aria-hidden="true" />
            <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-100">
              {isSos(alarm.type) ? 'Emergency' : 'Danger alarm'}
              {waiting > 0 && ` · ${waiting} more waiting`}
            </p>
            <h2 id="critical-alarm-title" className="text-2xl font-bold leading-tight">
              {title}
            </h2>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-lg font-semibold text-slate-900">{worker ?? helmet}</p>
          {worker && <p className="text-sm text-slate-500">{helmet}</p>}
          <p id="critical-alarm-detail" className="mt-3 text-sm text-slate-700">
            {alarmDetail(alarm)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {formatLastSeen(alarm.raisedAt, now)}
            {!hasLocation && ' · no location reported'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            onClick={onMap}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            View on map
          </button>
          {isSos(alarm.type) && (
            <SosCallButton
              deviceId={alarm.deviceId}
              deviceName={helmet}
              label="Join call"
              onJoin={onJoin}
              onHangUp={onHangUp}
              className="px-4 py-2"
            />
          )}
        </div>
      </div>
    </div>
  )
}
