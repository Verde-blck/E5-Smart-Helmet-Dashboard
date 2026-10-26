import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { useDeviceNames } from '@/modules/devices/hooks/useDevices'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { runAlarmStream, streamStatus } from '../lib/alarmStream'
import {
  acknowledge,
  acknowledgeAll,
  chime,
  enableSound,
  installSoundUnlock,
  ring,
  ringingIds,
  soundEnabled,
  subscribeSound,
} from '../lib/alarmSound'
import { alarmLabel } from '../types'
import type { Alarm } from '../types'

interface Toast {
  alarm: Alarm
  until: number
}

export function LiveAlarms() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const navigate = useNavigate()
  const nameOf = useDeviceNames()
  const [toasts, setToasts] = useState<Toast[]>([])
  const ringingRef = useRef(new Map<string, Alarm>())
  const [now, setNow] = useState(Date.now())
  const ringing = useSyncExternalStore(subscribeSound, ringingIds)
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
            ringingRef.current.set(alarm.id, alarm)
            ring(alarm.id)
          }
          else {
            chime()
            setToasts((t) => [{ alarm, until: Date.now() + 8000 }, ...t].slice(0, 3))
          }
        },
        onUpdate: (alarm) => {
          queryClient.setQueryData<Alarm[]>(keyRef.current, (prev) =>
            prev?.map((a) => (a.id === alarm.id ? { ...a, status: alarm.status } : a))
          )
          if (alarm.status === 'resolved') acknowledge(alarm.id)
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
    if (toasts.length === 0 && ringing.length === 0) return
    const id = setInterval(() => {
      setNow(Date.now())
      setToasts((t) => t.filter((x) => x.until > Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [toasts.length, ringing.length])

  const ringingAlarms = ringing
    .map((id) => ringingRef.current.get(id))
    .filter((a): a is Alarm => !!a)
    .sort((a, b) => b.raisedAt - a.raisedAt)
  const top = ringingAlarms[0]

  function view(alarm: Alarm) {
    acknowledge(alarm.id)
    setToasts((t) => t.filter((x) => x.alarm.id !== alarm.id))
    navigate(`/alarms?alarm=${encodeURIComponent(alarm.id)}`)
  }

  return (
    <>
      {top && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-red-700 bg-red-600 px-4 py-2 text-white sm:px-6"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 motion-safe:animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 21h4" />
          </svg>
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{alarmLabel(top.type)}</span>
            {' · '}
            {nameOf(top.deviceId, top.deviceName)}
            <span className="text-red-100"> · {formatLastSeen(top.raisedAt, now)}</span>
            {ringingAlarms.length > 1 && (
              <span className="text-red-100"> · and {ringingAlarms.length - 1} more</span>
            )}
          </p>
          <button
            onClick={() => view(top)}
            className="rounded bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            View
          </button>
          <button
            onClick={acknowledgeAll}
            className="rounded border border-white/50 px-3 py-1 text-xs font-medium hover:bg-white/10"
          >
            Silence
          </button>
        </div>
      )}

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

      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 space-y-2" aria-live="polite">
          {toasts.map(({ alarm }) => (
            <div
              key={alarm.id}
              className="flex w-72 items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{alarmLabel(alarm.type)}</p>
                <p className="truncate text-xs text-slate-500">{nameOf(alarm.deviceId, alarm.deviceName)} · just now</p>
              </div>
              <button onClick={() => view(alarm)} className="text-xs font-medium text-brand-primary hover:underline">
                View
              </button>
              <button
                onClick={() => setToasts((t) => t.filter((x) => x.alarm.id !== alarm.id))}
                aria-label="Dismiss"
                className="text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
