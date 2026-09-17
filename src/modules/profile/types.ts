/**
 * Everything a tenant can rebrand. This is the whole white-label surface —
 * if a field isn't here, changing it needs a redeploy, which defeats the point.
 */
export interface TenantProfile {
  id: string
  name: string
  logoUrl: string
  colors: { primary: string; secondary: string }
  /**
   * White-labelled deployments usually need "contact support" to point at the
   * reseller rather than at you. Optional: standalone installs often leave it
   * empty.
   */
  supportEmail?: string
}

// Logo limits. Enforced here for fast feedback and AGAIN on the backend,
// which is the copy that matters — a client-side check is a convenience, not
// a control.
export const LOGO_MAX_BYTES = 512 * 1024
export const LOGO_MAX_DIMENSION = 1024
export const LOGO_MIN_DIMENSION = 32

/**
 * SVG is deliberately absent. An uploaded SVG can carry script, and a tenant
 * logo renders on every page of that tenant's dashboard — including the login
 * screen, before anyone has authenticated.
 */
export const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export interface LogoRejection {
  reason: string
}

export function describeLogoTypes(): string {
  return 'PNG, JPEG or WebP'
}