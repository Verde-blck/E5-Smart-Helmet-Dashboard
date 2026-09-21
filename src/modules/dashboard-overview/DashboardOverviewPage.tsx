import { Link } from 'react-router-dom'
import { Can } from '@/shared/components/Can'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { AlarmFeed } from '@/modules/alarms/components/AlarmFeed'
import { useAlarms } from '@/modules/alarms/hooks/useAlarms'
import { SummaryCards } from '@/modules/devices/components/SummaryCards'
import { useDevices, useFleetSummary } from '@/modules/devices/hooks/useDevices'
import { FleetMap } from '@/modules/map/components/FleetMap'
import { OnlineGauge } from './components/OnlineGauge'
import { AlarmFrequencyChart } from './components/AlarmFrequencyChart'

/**
 * A single screen that answers "is anything wrong right now" without
 * navigating anywhere: how much of the fleet is reporting, what has alarmed,
 * where everyone is, and whether today is unusual.
 *
 * Every panel is a view onto a module in the sidebar rather than a separate
 * data source, so nothing here can disagree with the page it links to.
 */
export function DashboardOverviewPage() {
  const { devices } = useDevices()
  const { summary } = useFleetSummary()
  const { alarms } = useAlarms()

  const online = summary?.online ?? devices.filter((d) => d.presence === 'online').length
  const total = summary?.total ?? devices.length

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Dashboard</h1>

      <SummaryCards />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <OnlineGauge online={online} total={total} />

        <div className="lg:col-span-2">
          <ErrorBoundary label="Alarm frequency">
            <AlarmFrequencyChart alarms={alarms} />
          </ErrorBoundary>
        </div>
      </div>

      <Can perm="map:read">
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Fleet location
            </h2>
            <Link to="/map" className="text-xs text-slate-500 hover:text-slate-800">
              Open map →
            </Link>
          </div>
          <ErrorBoundary label="The map">
            <FleetMap devices={devices} heightClass="h-72" />
          </ErrorBoundary>
        </section>
      </Can>

      <div className="grid gap-4 lg:grid-cols-2">
        <Can perm="alarms:read">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Unresolved alarms
              </h2>
              <Link to="/alarms" className="text-xs text-slate-500 hover:text-slate-800">
                View all →
              </Link>
            </div>
            <ErrorBoundary label="Active alarms">
              <AlarmFeed activeOnly limit={6} />
            </ErrorBoundary>
          </section>
        </Can>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Fleet status
            </h2>
            <Link to="/devices" className="text-xs text-slate-500 hover:text-slate-800">
              Monitoring Center →
            </Link>
          </div>
          <ErrorBoundary label="The fleet list">
            {/* Slice rather than a scroll pane: the overview is a summary, and
                the full list is one click away. */}
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {devices.slice(0, 6).map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/devices/${d.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          d.presence === 'online'
                            ? 'bg-emerald-500'
                            : d.presence === 'degraded'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                        }`}
                      />
                      <span className="truncate font-medium text-slate-800">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {d.telemetry.batteryPercent != null
                        ? `${d.telemetry.batteryPercent}%`
                        : '—'}
                    </span>
                  </Link>
                </li>
              ))}
              {devices.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-500">No helmets registered.</li>
              )}
            </ul>
          </ErrorBoundary>
          {devices.length > 6 && (
            <p className="mt-1 text-[11px] text-slate-400">
              Showing 6 of {devices.length} helmets
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
