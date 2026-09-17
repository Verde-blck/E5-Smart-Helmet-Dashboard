import { Navigate } from 'react-router-dom'
import { MODULES } from '@/shared/constants/modules'
import { usePermission } from '@/shared/hooks/usePermission'
import { DashboardOverviewPage } from '@/modules/dashboard-overview/DashboardOverviewPage'

/**
 * "/" is not a page everyone can see. A role scoped to device monitoring — the
 * brief's own example — has no dashboard permission, and sending it to a guard
 * that redirects to "/" is an infinite loop; sending it to a bare
 * "Not authorized" screen is a dead end with no navigation.
 *
 * So: show the dashboard to those who can see it, otherwise drop them at the
 * first module they can, otherwise say so plainly.
 */
export function LandingRedirect() {
  const can = usePermission()

  if (can('dashboard:read')) return <DashboardOverviewPage />

  const firstAllowed = MODULES.find((m) => m.key !== 'dashboard' && can(`${m.key}:read`))
  if (firstAllowed) return <Navigate to={firstAllowed.route} replace />

  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-lg font-semibold text-slate-800">No modules assigned</h1>
      <p className="text-sm text-slate-500">
        Your account doesn't have access to any modules yet. Ask an administrator
        to assign your role a module in Users &amp; Roles.
      </p>
    </div>
  )
}
