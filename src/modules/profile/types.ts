
export interface TenantProfile {
  id: string
  name: string
  logoUrl: string
  colors: { primary: string; secondary: string }
  supportEmail?: string
}

export const LOGO_MAX_BYTES = 512 * 1024
export const LOGO_MAX_DIMENSION = 1024
export const LOGO_MIN_DIMENSION = 32
export const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export interface LogoRejection {
  reason: string
}

export function describeLogoTypes(): string {
  return 'PNG, JPEG or WebP'
}