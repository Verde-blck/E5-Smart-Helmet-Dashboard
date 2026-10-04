import { useMemo, useState } from 'react'
import { env } from '@/config/env'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useHelmetSettings } from './hooks/useHelmetSettings'
import { SettingsForm } from './components/SettingsForm'

export function UnitSettingPage() {
  const { devices, isLoading: devicesLoading } = useDevices()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return devices
    return devices.filter(
      (d) => d.name.toLowerCase().includes(needle) || d.id.includes(needle)
    )
  }, [devices, search])

  const selected = devices.find((d) => d.id === selectedId) ?? null
  const { settings, isLoading, isError } = useHelmetSettings(selected?.id ?? null)

  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        Configuration pushed down to a helmet. Pick a device to edit its settings.
      </p>

      {!env.useMocks && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {/* Saving and delivery work; the helmet acting on a change doesn't
              yet have the manufacturer's confirmation, same as live video and
              calling. Better said here than discovered on site. */}
          Settings save and are sent to the helmet, but it hasn’t yet been confirmed with the
          manufacturer that the helmet applies every change. Check a changed setting on the
          device before relying on it.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or device ID"
            className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />

          {devicesLoading ? (
            <p className="text-sm text-slate-500">Loading fleet…</p>
          ) : matches.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
              No helmets match.
            </p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {matches.map((device) => (
                <li key={device.id}>
                  <button
                    onClick={() => setSelectedId(device.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                      device.id === selectedId ? 'bg-brand-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {device.name}
                      </span>
                      <span className="block font-mono text-[11px] text-slate-400">
                        {device.id}
                      </span>
                    </span>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        device.presence === 'online'
                          ? 'bg-emerald-500'
                          : device.presence === 'degraded'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div>
          {!selected ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Select a helmet to view and edit its settings.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-slate-500">Loading settings…</p>
          ) : isError || !settings ? (
            <p className="text-sm text-red-600">Failed to load settings for this helmet.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium text-slate-800">{selected.name}</h2>
                <span className="font-mono text-xs text-slate-400">{selected.id}</span>
                {selected.presence !== 'online' && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                    Offline 
                  </span>
                )}
              </div>
              <SettingsForm key={selected.id} device={selected} initial={settings} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
