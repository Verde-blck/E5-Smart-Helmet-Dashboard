// Central place that reads Vite env vars. Nothing else in the app should
// touch import.meta.env directly — this keeps SaaS vs standalone switching
// to one file.
export const env = {
  multiTenant: import.meta.env.VITE_MULTI_TENANT === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
  standaloneAppName: import.meta.env.VITE_APP_NAME ?? 'Helmet Dashboard',
  standaloneLogoUrl: import.meta.env.VITE_APP_LOGO_URL ?? '',
  // Standalone deployments rebrand through env vars, not a code change.
  standaloneBrandPrimary: import.meta.env.VITE_BRAND_PRIMARY ?? '#0f766e',
  standaloneBrandSecondary: import.meta.env.VITE_BRAND_SECONDARY ?? '#1e293b',
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
} as const
