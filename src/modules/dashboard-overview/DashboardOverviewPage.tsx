import { Link } from 'react-router-dom'
import { SummaryCards } from '@/modules/devices/components/SummaryCards'
import { DeviceList } from '@/modules/devices/components/DeviceList'
import { AlarmFeed } from '@/modules/alarms/components/AlarmFeed'
import { Can } from '@/shared/components/Can'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

// Reuses the devices and alarms modules' components rather than duplicating
// them — "Dashboard overview" and those modules show overlapping data by
// design per the FRD; only the surrounding page chrome differs.
export function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Dashboard</h1>
      <SummaryCards />

      <Can perm="alarms:read">
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Active alarms</h2>
            <Link to="/alarms" className="text-xs text-slate-500 hover:text-slate-800">
              View all →
            </Link>
          </div>
          <ErrorBoundary label="Active alarms">
            <AlarmFeed activeOnly />
          </ErrorBoundary>
        </section>
      </Can>

      <h2 className="mb-2 text-sm font-medium text-slate-700">Fleet</h2>
      <p className="mb-2 text-xs text-slate-500">
        Map view goes here once a map provider is wired in — per-device lat/lng
        is already in the telemetry model.
      </p>
      <ErrorBoundary label="The fleet list">
        <DeviceList />
      </ErrorBoundary>
    </div>
  )
}
