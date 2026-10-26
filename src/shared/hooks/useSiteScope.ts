import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import { features } from '@/config/features'

// Filtering here is for consistency, not security: the backend must enforce scope.
export function useSiteScope() {
  const scope = useAuthStore((s) => s.user?.scope)

  const allSites = !features.siteScoping || (scope?.allSites ?? true)
  const sites = useMemo(
    () => (features.siteScoping ? (scope?.sites ?? []) : []),
    [scope?.sites]
  )

  const inScope = useCallback(
    (site?: string) => {
      if (allSites) return true
      if (site == null) return true
      return sites.includes(site)
    },
    [allSites, sites]
  )

  return {
    allSites,
    sites,
    inScope,
    isScoped: !allSites,
    hasNoSite: !allSites && sites.length === 0,
  }
}
