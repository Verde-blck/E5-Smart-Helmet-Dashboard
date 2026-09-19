import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import { features } from '@/config/features'

/**
 * Site-level visibility.
 *
 * Roles decide which *modules* a user can open. Scope decides which *sites'*
 * helmets, alarms and footage they see inside them. Two separate mechanisms.
 *
 * The filtering in this app is for interface consistency, not security. The
 * backend must apply the same restriction to every device, alarm, telemetry
 * and media query, and check it before signing any media URL — otherwise a
 * scoped user opens devtools and reads the unfiltered response.
 *
 * Which is also why an absent scope fails *open* here rather than closed: if
 * the server filtered, everything the client holds is already in scope, so
 * hiding it would only break the UI. Fail-closed would blank the dashboard for
 * every user the moment the field were missing from a response.
 */
export function useSiteScope() {
  const scope = useAuthStore((s) => s.user?.scope)

  // Dormant by default — see config/features.ts. Everything below still works
  // when it's switched on; this just makes every check pass while it's off.
  const allSites = !features.siteScoping || (scope?.allSites ?? true)
  const sites = useMemo(
    () => (features.siteScoping ? (scope?.sites ?? []) : []),
    [scope?.sites]
  )

  const inScope = useCallback(
    (site?: string) => {
      if (allSites) return true
      // An item with no site recorded is treated as visible for the same
      // reason: the server chose to send it.
      if (site == null) return true
      return sites.includes(site)
    },
    [allSites, sites]
  )

  return {
    allSites,
    sites,
    inScope,
    /** True when this user sees a subset of the fleet. */
    isScoped: !allSites,
    /** Scoped, but with no site assigned — they would see nothing. */
    hasNoSite: !allSites && sites.length === 0,
  }
}
