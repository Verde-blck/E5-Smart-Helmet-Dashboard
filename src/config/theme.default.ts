import { env } from './env'

export const defaultTheme = {
  name: env.standaloneAppName,
  logoUrl: env.standaloneLogoUrl,
  colors: {
    primary: env.standaloneBrandPrimary,
    secondary: env.standaloneBrandSecondary,
  },
}

export type Theme = typeof defaultTheme
