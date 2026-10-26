import { useMemo, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { SummaryCards } from './components/SummaryCards'
import { DeviceList } from './components/DeviceList'
import { HelmetTile } from './components/HelmetTile'
import { RegisterDeviceForm } from './components/RegisterDeviceForm'
import { useDevices } from './hooks/useDevices'
import { RefreshButton } from '@/shared/components/RefreshButton'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { LiveWall } from '@/modules/live/components/LiveWall'

type View = 'tiles' | 'table' | 'wall'

const VIEW_LABEL: Record<View, string> = {
  tiles: 'Tiles',
  table: 'Table',
  wall: 'Live wall',
}

export function DevicesPage() {
  const tenantId = useTenantId()
  const [registering, setRegistering] = useState(false)
  const [view, setView] = useState<View>('tiles')
  const [search, setSearch] = useState('')
  // Kept here rather than in the wall, so switching views remembers its helmets.
  const [wallIds, setWallIds] = useState<string[]>([])
  const { devices, now, isLoading } = useDevices()

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return devices
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
          {/* Live wall streams are connections, not cached data, so refreshing doesn't touch them. */}
          <RefreshButton queryKey={qk.devices.all(tenantId)} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, device ID or wearer"
            className="w-56 rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
            {(['tiles', 'table', 'wall'] as const).map((option) => {
              const button = (
                <button
                  key={option}
                  onClick={() => setView(option)}
                  aria-pressed={view === option}
                  className={`rounded px-2.5 py-1 ${
                    view === option
                      ? 'bg-brand-primary/10 font-medium text-slate-900'
                      : 'text-slate-500'
                  }`}
                >
                  {VIEW_LABEL[option]}
                </button>
              )
              return option === 'wall' ? (
                <Can key={option} perm="live:read">
                  {button}
                </Can>
              ) : (
                button
              )
            })}
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

      {view !== 'wall' && <SummaryCards />}

      {search && view !== 'wall' && (
        <p className="mb-2 text-xs text-slate-500">
          {matches.length} of {devices.length} helmets match “{search}”
        </p>
      )}

      {view === 'wall' ? (
        // Outside the loading/empty checks: a search matching nothing mustn't unmount the wall and
        // stop its streams.
        <LiveWall
          devices={matches}
          allDevices={devices}
          selected={wallIds}
          onSelectedChange={setWallIds}
        />
      ) : isLoading ? (
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
