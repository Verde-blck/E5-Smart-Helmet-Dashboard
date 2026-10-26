export const env = {
  multiTenant: import.meta.env.VITE_MULTI_TENANT === 'true',
  // Relative by default so requests go through the dev proxy and never hit CORS.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
  standaloneAppName: import.meta.env.VITE_APP_NAME ?? 'Helmet Dashboard',
  standaloneLogoUrl: import.meta.env.VITE_APP_LOGO_URL ?? '',
  standaloneBrandPrimary: import.meta.env.VITE_BRAND_PRIMARY ?? '#0f766e',
  standaloneBrandSecondary: import.meta.env.VITE_BRAND_SECONDARY ?? '#1e293b',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  googleMapsMapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID',
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
} as const
