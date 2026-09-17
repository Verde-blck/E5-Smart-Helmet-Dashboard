import { useState } from 'react'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { MediaGrid } from './components/MediaGrid'

export function MediaPage() {
  const { devices } = useDevices()
  const [deviceId, setDeviceId] = useState<string>('')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Media</h1>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
        >
          <option value="">All devices</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Remounted per device so the grid's filter and open-item state reset
          rather than pointing at an index in the previous device's list. */}
      <MediaGrid key={deviceId || 'all'} deviceId={deviceId || undefined} />
    </div>
  )
}
