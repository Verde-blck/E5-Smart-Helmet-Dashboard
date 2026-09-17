import { Link } from 'react-router-dom'
import { DataCard } from '@/shared/components/DataCard'
import { useDevices } from '../hooks/useDevices'
import { formatLastSeen } from '../lib/presence'
import { AlarmBadge, StatusDot } from './StatusDot'
import type { DeviceView } from '../types'

function Badges({ device }: { device: DeviceView }) {
  return (
    <>
      {device.activeAlarm && <AlarmBadge severity={device.activeAlarm} />}
      {device.telemetry.isRecording && (
        <span className="text-[11px] font-medium text-red-600">REC</span>
      )}
    </>
  )
}

// "—" rather than 0%: a helmet that doesn't report battery is not a helmet
// with a flat battery.
const battery = (device: DeviceView) =>
  device.telemetry.batteryPercent != null ? `${device.telemetry.batteryPercent}%` : '—'

export function DeviceList() {
  const { devices, now, isLoading, isError } = useDevices()

  if (isLoading) return <p className="text-sm text-slate-500">Loading devices…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load devices.</p>

  return (
    <>
      {/* Phones: stacked cards. Five columns don't fit in 375px even with
          horizontal scroll, and scrolling a table one-handed is miserable. */}
      <div className="flex flex-col gap-2 md:hidden">
        {devices.map((device) => (
          <DataCard
            key={device.id}
            to={`/devices/${device.id}`}
            title={
              <span className="flex items-center gap-2">
                <StatusDot presence={device.presence} />
                <span className="text-sm font-medium text-slate-800">{device.name}</span>
              </span>
            }
            badges={<Badges device={device} />}
            rows={[
              { label: 'Site', value: device.site },
              { label: 'Link', value: device.connectivity.toUpperCase() },
              { label: 'Battery', value: battery(device) },
              { label: 'Last seen', value: formatLastSeen(device.lastSeenAt, now) },
            ]}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Device</th>
              <th className="px-4 py-2 font-medium">Site</th>
              <th className="px-4 py-2 font-medium">Link</th>
              <th className="px-4 py-2 font-medium">Battery</th>
              <th className="px-4 py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/devices/${device.id}`} className="flex items-center gap-2">
                    <StatusDot presence={device.presence} />
                    <span className="font-medium text-slate-800">{device.name}</span>
                    <Badges device={device} />
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{device.site}</td>
                <td className="px-4 py-2 uppercase text-slate-600">{device.connectivity}</td>
                <td className="px-4 py-2 text-slate-600">{battery(device)}</td>
                <td
                  className={`px-4 py-2 ${
                    device.presence === 'offline' ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {formatLastSeen(device.lastSeenAt, now)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
