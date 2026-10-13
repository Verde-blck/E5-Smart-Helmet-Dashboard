import { Link } from 'react-router-dom'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { SosCallButton } from '@/modules/live/components/SosCallButton'
import { useAlarms } from '../hooks/useAlarms'

/**
 * Unresolved SOS alarms, one card each, above everything else.
 *
 * When a wearer holds SOS, the helmet announces "calling the central office"
 * and waits in a video call for the control room to join. Each card's job
 * is to make that one click obvious. Joining works for any SOS: if the
 * helmet isn't already waiting, starting the call puts it into one.
 */
export function SosAlerts() {
  const { active, now } = useAlarms()
  const sos = active
    .filter((a) => a.type === 'sos')
    .sort((a, b) => b.raisedAt - a.raisedAt)

  if (sos.length === 0) return null

  return (
    <section aria-label="SOS alerts" className="mb-4 space-y-2">
      {sos.map((alarm) => (
        <div
          key={alarm.id}
          role="alert"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3"
        >
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900">
              SOS from{' '}
              <Link
                to={`/devices/${alarm.deviceId}`}
                className="underline-offset-2 hover:underline"
              >
                {alarm.deviceName}
              </Link>
            </p>
            <p className="text-xs text-red-800">
              {formatLastSeen(alarm.raisedAt, now)}. The wearer is waiting for the control room
              to join the call.
              {alarm.lat != null && alarm.lng != null && (
                <>
                  {' '}
                  <a
                    href={`https://www.google.com/maps?q=${alarm.lat},${alarm.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    Location
                  </a>
                </>
              )}
            </p>
          </div>
          <SosCallButton deviceId={alarm.deviceId} deviceName={alarm.deviceName} />
        </div>
      ))}
    </section>
  )
}
