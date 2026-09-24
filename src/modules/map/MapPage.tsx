import { useDevices } from '@/modules/devices/hooks/useDevices'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { FleetMap } from './components/FleetMap'

export function MapPage() {
  const { devices, now, isLoading } = useDevices()

  const located = devices.filter((d) => d.telemetry.lat != null)
  const alarming = devices.filter((d) => d.activeAlarm !== null)
  // A helmet with no fix isn't on the map, and an operator counting pins
  // needs to know that rather than assume the fleet is smaller.
  const missing = devices.length - located.length

  const stale = located
    .filter((d) => d.presence !== 'online')
    .sort((a, b) => a.lastSeenAt - b.lastSeenAt)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {located.length} of {devices.length} helmets reporting a position
          {missing > 0 && ` · ${missing} without a fix`}
          {alarming.length > 0 && ` · ${alarming.length} in alarm`}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading fleet…</p>
      ) : (
        <FleetMap devices={devices} />
      )}

      {stale.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Positions shown for {stale.length}{' '}
          {stale.length === 1 ? 'helmet' : 'helmets'} are last-known, not live —
          oldest {formatLastSeen(stale[0].lastSeenAt, now)}.
        </p>
      )}
    </div>
  )
}
