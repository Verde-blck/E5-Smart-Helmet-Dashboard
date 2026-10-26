import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { WifiPanel } from './components/WifiPanel'
import { SiteWifiCard } from './components/SiteWifiCard'
import { ConnectionCard } from './components/ConnectionCard'

const PRESENCE_DOT = {
  online: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  offline: 'bg-slate-300',
} as const

export function WifiPage() {
  const { devices, isLoading } = useDevices()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const selectedId = params.get('device')

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const list = needle
      ? devices.filter((d) => d.name.toLowerCase().includes(needle) || d.id.includes(needle))
      : devices
    const rank = { online: 0, degraded: 1, offline: 2 } as const
    return [...list].sort((a, b) => rank[a.presence] - rank[b.presence])
  }, [devices, search])

  const selected = devices.find((d) => d.id === selectedId) ?? null

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-800">Connectivity</h1>
      <p className="mb-4 text-xs text-slate-500">
        How each helmet connects. Helmets switch by themselves: a saved Wi-Fi when one is in range,
        mobile data otherwise.
      </p>

      <SiteWifiCard />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or device ID"
            className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading fleet…</p>
          ) : matches.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
              No helmets match.
            </p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {matches.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setParams({ device: d.id }, { replace: true })}
                    aria-pressed={d.id === selectedId}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                      d.id === selectedId ? 'bg-brand-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{d.name}</span>
                      <span className="block font-mono text-[11px] text-slate-400">{d.id}</span>
                    </span>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${PRESENCE_DOT[d.presence]}`}
                      title={d.presence === 'online' ? 'Online' : d.presence === 'degraded' ? 'Intermittent' : 'Offline'}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-800">Helmet offline?</p>
            <p className="mt-1">
              Every E5 helmet knows the setup hotspot. Turn on a phone hotspot named{' '}
              <b>E5-Setup</b> with the setup password, wait for the helmet to show online here, then
              scan.
            </p>
          </div>
        </aside>

        <div>
          {!selected ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Select a helmet to see its connection, SIM and Wi-Fi.
            </p>
          ) : (
            <>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium text-slate-800">{selected.name}</h2>
                <span className="font-mono text-xs text-slate-400">{selected.id}</span>
                {selected.presence !== 'online' && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                    {selected.presence === 'offline' ? 'Offline: it can’t scan until it’s online' : 'Intermittent connection'}
                  </span>
                )}
              </div>
              <ConnectionCard key={`c-${selected.id}`} device={selected} />
              <WifiPanel key={selected.id} device={selected} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
