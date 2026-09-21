import { Link, useParams } from 'react-router-dom'
import { useDevice, useSetDeviceActive } from './hooks/useDevices'
import { formatLastSeen } from './lib/presence'
import { AlarmBadge, StatusDot } from './components/StatusDot'
import { Can } from '@/shared/components/Can'
import { MediaGrid } from '@/modules/media/components/MediaGrid'
import { useMediaList } from '@/modules/media/hooks/useMedia'
import { AlarmFeed } from '@/modules/alarms/components/AlarmFeed'
import { StatusHistory } from './components/StatusHistory'
import { DeviceCommands } from './components/DeviceCommands'
import { GasPanel } from './components/GasPanel'
import { useDeviceHistory } from './hooks/useDeviceHistory'
import { FleetMap } from '@/modules/map/components/FleetMap'
import type { Telemetry } from './types'

const PRESENCE_LABEL = {
  online: 'Online',
  degraded: 'Intermittent',
  offline: 'Offline',
} as const

const boolLabel = (v: boolean) => (v ? 'Yes' : 'No')

/**
 * Rows are built from what the helmet actually reported, not from a fixed
 * template. FRD §4 Real-Time Monitoring qualifies nearly every field with
 * "where available", so a firmware that doesn't expose altitude should show no
 * altitude row — not "Altitude: 0 m", which reads as ground level.
 */
function telemetryRows(t: Telemetry): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  const push = (label: string, value: string | null) => {
    if (value !== null) rows.push([label, value])
  }

  push('Battery', t.batteryPercent != null ? `${t.batteryPercent}%` : null)
  push('Battery voltage', t.batteryVoltage != null ? `${t.batteryVoltage.toFixed(2)} V` : null)
  push('Charging', t.isCharging != null ? boolLabel(t.isCharging) : null)
  push('Worn', t.isWorn != null ? boolLabel(t.isWorn) : null)
  push('Recording', t.isRecording != null ? boolLabel(t.isRecording) : null)
  push(
    'Location',
    t.lat != null && t.lng != null ? `${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}` : null
  )
  push('Altitude', t.altitude != null ? `${t.altitude} m` : null)
  push('Speed', t.speed != null ? `${t.speed} m/s` : null)
  push('Heading', t.heading != null ? `${t.heading}°` : null)
  push('Network', t.networkType ?? null)
  push('Carrier', t.carrier ?? null)
  push('Signal', t.signalStrength != null ? `${t.signalStrength} dBm` : null)

  return rows
}

export function DeviceDetailPage() {
  const { id = '' } = useParams()
  const { device, outOfScope, now, isLoading, isError } = useDevice(id)
  // Both kinds for this helmet, newest first, trimmed to a strip.
  const { media } = useMediaList({ deviceId: id })
  const setActive = useSetDeviceActive()

  // Gas only arrives on telemetry rows, not on the device record, so the most
  // recent sample is the current reading. Worth asking the backend to include
  // it on GET /devices — without it there's no way to flag gas across the
  // fleet without one request per helmet.
  const { window: recent } = useDeviceHistory(id, '1h')
  const latestSample = recent?.samples[recent.samples.length - 1]
  const gasReadings = device?.telemetry.gas ?? latestSample?.gas

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load this device.</p>
  if (outOfScope) {
    return (
      <div className="max-w-md">
        <h1 className="mb-2 text-lg font-semibold text-slate-800">Not available</h1>
        <p className="text-sm text-slate-500">
          That helmet is at a site you don't have access to.{' '}
          <Link to="/devices" className="text-brand-primary underline">
            Back to devices
          </Link>
          .
        </p>
      </div>
    )
  }
  if (!device) return <p className="text-sm text-red-600">Device not found.</p>

  const rows = telemetryRows(device.telemetry)

  return (
    <div className="max-w-3xl">
      <Link to="/devices" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to devices
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <StatusDot presence={device.presence} />
        <h1 className="text-lg font-semibold text-slate-800">{device.name}</h1>
        {device.activeAlarm && <AlarmBadge severity={device.activeAlarm} />}
        {!device.active && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            Deactivated
          </span>
        )}
        <Can perm="devices:write">
          <button
            onClick={() => setActive.mutate({ id: device.id, active: !device.active })}
            disabled={setActive.isPending}
            className="ml-auto rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {setActive.isPending
              ? 'Saving…'
              : device.active
                ? 'Deactivate'
                : 'Reactivate'}
          </button>
        </Can>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          Device
        </h2>
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-slate-500">Device ID</dt>
          <dd className="text-slate-800">{device.id}</dd>
          <dt className="text-slate-500">Site</dt>
          <dd className="text-slate-800">{device.site}</dd>
          <dt className="text-slate-500">Connection</dt>
          <dd className="text-slate-800">{PRESENCE_LABEL[device.presence]}</dd>
          <dt className="text-slate-500">Link type</dt>
          <dd className="uppercase text-slate-800">{device.connectivity}</dd>
          <dt className="text-slate-500">Last seen</dt>
          <dd className="text-slate-800">{formatLastSeen(device.lastSeenAt, now)}</dd>
          {/* Comes from the device record, not from a dashboard account —
              the person wearing this helmet never signs in here. It's what
              turns an SOS from a device ID into a person to call. */}
          <dt className="text-slate-500">Worn by</dt>
          <dd className="text-slate-800">
            {device.assignedTo ? (
              <>
                {device.assignedTo.name}
                {device.assignedTo.jobTitle && (
                  <span className="text-slate-500"> · {device.assignedTo.jobTitle}</span>
                )}
                {device.assignedTo.phone && (
                  <span className="block text-slate-500">{device.assignedTo.phone}</span>
                )}
              </>
            ) : (
              'Unassigned'
            )}
          </dd>
        </dl>
      </section>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          Telemetry
        </h2>
        {rows.length === 0 ? (
          <p className="text-slate-500">
            This helmet hasn't reported any telemetry yet.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <GasPanel readings={gasReadings} capturedAt={latestSample?.ts} />

      <DeviceCommands device={device} />

      <Can perm="map:read">
        {device.telemetry.lat != null && (
          <section className="mt-4">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Location
            </h2>
            <FleetMap devices={[device]} focusDeviceId={device.id} heightClass="h-64" />
          </section>
        )}
      </Can>

      <StatusHistory deviceId={device.id} />

      <Can perm="alarms:read">
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Alarm history
            </h2>
            <Link to="/alarms" className="text-xs text-slate-500 hover:text-slate-800">
              View all →
            </Link>
          </div>
          <AlarmFeed deviceId={device.id} limit={5} />
        </section>
      </Can>

      <Can perm="photos:read">
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Recent media
            </h2>
            <span className="flex gap-3 text-xs">
              <Link to="/photos" className="text-slate-500 hover:text-slate-800">
                Photos →
              </Link>
              <Link to="/videos" className="text-slate-500 hover:text-slate-800">
                Videos →
              </Link>
            </span>
          </div>
          <MediaGrid
            items={media.slice(0, 4)}
            emptyMessage="Nothing captured from this helmet yet."
          />
        </section>
      </Can>

      <p className="mt-4 text-xs text-slate-400">
        Location trail plugs in here once a map provider is chosen — history
        samples already carry lat/lng.
      </p>
    </div>
  )
}
