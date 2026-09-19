/**
 * Flags for behaviour that is built but not currently in use.
 *
 * Each one exists because a requirement was confirmed, built, and then
 * superseded — keeping the code inert behind a flag is cheaper than deleting
 * and rewriting it if the requirement returns.
 */
export const features = {
  /**
   * Site-level visibility scoping: users see only helmets, alarms and footage
   * at their assigned site.
   *
   * Dormant. Every dashboard user is an administrator in a command centre, and
   * a site-scoped administrator is a contradiction — they'd lose sight of
   * helmets they are responsible for.
   *
   * To reactivate: set this true. That restores the filtering, the scope
   * banner, the site field on the administrator form and the per-role
   * "sees every site" toggle. Note the frontend filter is only ever cosmetic —
   * the backend has to filter every device, alarm, telemetry and media query
   * too, and check scope before signing a media URL, or a user simply reads
   * the unfiltered response from devtools.
   */
  siteScoping: false,
} as const
