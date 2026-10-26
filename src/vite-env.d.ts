/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MULTI_TENANT?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_WS_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_LOGO_URL?: string
  readonly VITE_BRAND_PRIMARY?: string
  readonly VITE_BRAND_SECONDARY?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  gm_authFailure?: () => void
}