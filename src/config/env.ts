// Central place that reads Vite env vars. Nothing else in the app should
// touch import.meta.env directly — this keeps SaaS vs standalone switching
// to one file.
export const env = {
  multiTenant: import.meta.env.VITE_MULTI_TENANT === 'true',
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    'https://e5energy-production.up.railway.app/api',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws',
  standaloneAppName: import.meta.env.VITE_APP_NAME ?? 'Helmet Dashboard',
  standaloneLogoUrl: import.meta.env.VITE_APP_LOGO_URL ?? '',
  // Standalone deployments rebrand through env vars, not a code change.
  standaloneBrandPrimary: import.meta.env.VITE_BRAND_PRIMARY ?? '#0f766e',
  standaloneBrandSecondary: import.meta.env.VITE_BRAND_SECONDARY ?? '#1e293b',
  /**
   * Publishable Maps key. Safe to ship in the bundle, but it MUST carry an
   * HTTP-referrer restriction at Google's end — an unrestricted key in a
   * public bundle is someone else's map bill.
   *
   * Standalone only. In SaaS mode one bundle serves every tenant, so a
   * build-time key can't be per-tenant; it comes from tenant config instead.
   */
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  /**
   * Advanced markers refuse to load without a Map ID. DEMO_MAP_ID works for
   * development; production wants a real one from the Maps Management page.
   */
  googleMapsMapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID',
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
} as const
