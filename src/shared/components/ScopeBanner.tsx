import { useSiteScope } from '@/shared/hooks/useSiteScope'

/**
 * A scoped user seeing "Total devices 5" would reasonably conclude the fleet
 * is five helmets. Saying so explicitly is the difference between a filtered
 * view and a misleading one.
 */
export function ScopeBanner() {
  const { isScoped, sites, hasNoSite } = useSiteScope()

  if (!isScoped) return null

  if (hasNoSite) {
    return (
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        No site has been assigned to your account, so there is nothing to show
        yet. Ask your administrator to assign you to a site.
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
      Showing {sites.join(', ')} only. Helmets, alarms and footage from other
      sites are managed separately.
    </div>
  )
}
