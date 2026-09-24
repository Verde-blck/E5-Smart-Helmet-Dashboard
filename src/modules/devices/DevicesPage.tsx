import { useMemo, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { SummaryCards } from './components/SummaryCards'
import { DeviceList } from './components/DeviceList'
import { HelmetTile } from './components/HelmetTile'
import { RegisterDeviceForm } from './components/RegisterDeviceForm'
import { useDevices } from './hooks/useDevices'

type View = 'tiles' | 'table'

export function DevicesPage() {
  const [registering, setRegistering] = useState(false)
  const [view, setView] = useState<View>('tiles')
  const [search, setSearch] = useState('')
  const { devices, now, isLoading } = useDevices()

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return devices
    // Name and full device ID both, since an operator reading a label off a
    // helmet has the IMEI, not the shortened display name.
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.id.toLowerCase().includes(needle) ||
        (d.assignedTo?.name ?? '').toLowerCase().includes(needle)
    )
  }, [devices, search])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
       
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, device ID or wearer"
            className="w-56 rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
            {(['tiles', 'table'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={`rounded px-2.5 py-1 capitalize ${
                  view === option
                    ? 'bg-brand-primary/10 font-medium text-slate-900'
                    : 'text-slate-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <Can perm="devices:write">
            {!registering && (
              <button
                onClick={() => setRegistering(true)}
                className="rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
              >
                + Register helmet
              </button>
            )}
          </Can>
        </div>
      </div>

      {registering && <RegisterDeviceForm onDone={() => setRegistering(false)} />}

      <SummaryCards />

      {search && (
        <p className="mb-2 text-xs text-slate-500">
          {matches.length} of {devices.length} helmets match “{search}”
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading fleet…</p>
      ) : matches.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No helmets match that search.
        </p>
      ) : view === 'tiles' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {matches.map((device) => (
            <HelmetTile key={device.id} device={device} now={now} />
          ))}
        </div>
      ) : (
        <DeviceList search={search} />
      )}
    </div>
  )
}
