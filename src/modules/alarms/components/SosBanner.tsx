import { useEffect } from 'react'
import { isSos } from '../types'
import { useDeviceNames } from '@/modules/devices/hooks/useDevices'
import { Link, useLocation } from 'react-router-dom'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { SosCallButton } from '@/modules/live/components/SosCallButton'
import { useAlarms } from '../hooks/useAlarms'
import { acknowledge } from '../lib/alarmSound'

export function SosBanner() {
  const { active: rawActive, now } = useAlarms()
  const nameOf = useDeviceNames()
  const active = rawActive.map((a) => ({ ...a, deviceName: nameOf(a.deviceId, a.deviceName) }))
  const { pathname } = useLocation()
  const sos = active.filter((a) => isSos(a.type)).sort((a, b) => b.raisedAt - a.raisedAt)

  useSosTitle(sos.length)

  if (sos.length === 0 || pathname.startsWith('/alarms')) return null

  const latest = sos[0]
  const more = sos.length - 1

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-red-300 bg-red-50 px-4 py-2.5 sm:px-6"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-red-900">
        <span className="font-semibold">SOS from {latest.deviceName}</span>
        <span className="text-red-800"> · {formatLastSeen(latest.raisedAt, now)}</span>
        {more > 0 && (
          <>
            {' '}
            <Link to="/alarms" className="font-medium underline underline-offset-2">
              and {more} more
            </Link>
          </>
        )}
      </p>
      <span onClickCapture={() => sos.forEach((a) => acknowledge(a.id))}>
        <SosCallButton deviceId={latest.deviceId} deviceName={latest.deviceName} />
      </span>
      <Link to="/alarms" className="text-xs font-medium text-red-800 hover:text-red-950">
        View alarms
      </Link>
    </div>
  )
}

function useSosTitle(count: number) {
  useEffect(() => {
    if (count === 0) return
    const original = document.title
    document.title = `(${count > 1 ? `${count} SOS` : 'SOS'}) ${original}`
    return () => {
      document.title = original
    }
  }, [count])
}
