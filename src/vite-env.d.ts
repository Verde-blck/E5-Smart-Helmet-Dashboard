/// <reference types="vite/client" />

// Without this file `tsc -b` fails with TS2339 on every import.meta.env
// access in config/env.ts. Declaring the keys explicitly also means a typo
// like VITE_MULTITENANT is a compile error rather than a silent undefined.
interface ImportMetaEnv {
  readonly VITE_MULTI_TENANT?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_LOGO_URL?: string
  readonly VITE_BRAND_PRIMARY?: string
  readonly VITE_BRAND_SECONDARY?: string
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
