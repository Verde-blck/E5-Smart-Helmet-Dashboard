import { env } from './env'

// Fallback branding used until a tenant's real theme loads, and permanently
// in standalone mode where there is only one "tenant". Colours are stored as
// hex here and in TenantConfig because that is what a colour picker and a
// backend will hand you; conversion to the channel form Tailwind needs
// happens in shared/lib/color.ts at apply time.
export const defaultTheme = {
  name: env.standaloneAppName,
  logoUrl: env.standaloneLogoUrl,
  colors: {
    primary: env.standaloneBrandPrimary,
    secondary: env.standaloneBrandSecondary,
  },
}

export type Theme = typeof defaultTheme
