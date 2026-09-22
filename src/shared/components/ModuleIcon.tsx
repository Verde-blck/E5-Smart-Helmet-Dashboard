export type IconName =
  | 'dashboard'
  | 'monitoring'
  | 'map'
  | 'photo'
  | 'video'
  | 'alarm'
  | 'users'
  | 'building'
  | 'sliders'
  | 'route'

/**
 * Hand-drawn rather than a library.
 *
 * Eight icons is about sixty lines of path data against ~30KB for an icon
 * package, on a bundle site supervisors may load over mobile data. They
 * inherit currentColor, so they follow the nav's active and hover states
 * without any extra wiring.
 */
const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  monitoring: (
    <>
      {/* A hard hat — the thing being monitored, rather than a generic screen */}
      <path d="M3 17a9 9 0 0 1 18 0" />
      <path d="M9 8.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3.5" />
      <line x1="2" y1="17" x2="22" y2="17" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M8 5l1.2-2h5.6L16 5" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="M15 10.5 22 7v10l-7-3.5Z" />
    </>
  ),
  alarm: (
    <>
      <path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9a6 6 0 0 0-6-6Z" />
      <path d="M10.5 18a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 11.5a3 3 0 0 0 0-6" />
      <path d="M17.5 20a5.5 5.5 0 0 0-2-4.3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19h5a4 4 0 0 0 0-8h-3a4 4 0 0 1 0-8h5" />
    </>
  ),
  sliders: (
    <>
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="16" r="2.4" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="9" y1="8" x2="9" y2="8" />
      <line x1="15" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="15" y2="12" />
      <path d="M10 21v-4h4v4" />
    </>
  ),
}

export function ModuleIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
