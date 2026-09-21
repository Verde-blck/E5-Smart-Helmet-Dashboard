import axios from 'axios'
import { env } from '@/config/env'
import { tokenStore } from './token'

// Every module's api/*.api.ts file should import THIS, not axios directly —
// that keeps base URL, auth, and tenant-header logic in one place so it's
// identical whether you're running SaaS or standalone.
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
})

// Bearer token rather than a cookie, because that's what the API issues.
// See shared/lib/token.ts for why it's stored where it is.
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A hint for local dev on localhost, where there's no subdomain to read.
//
// The backend MUST treat this as a hint only and validate it against the
// tenant claim in the session. If it trusts the header, any user can edit
// localStorage and read another company's fleet.
apiClient.interceptors.request.use((config) => {
  if (env.multiTenant) {
    const tenantId = localStorage.getItem('tenantId')
    if (tenantId) config.headers['X-Tenant-Id'] = tenantId
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const url: string = error?.config?.url ?? ''

    // A 401 from the login endpoint is "wrong password", not "session died" —
    // LoginPage surfaces that itself.
    // The API returns 403 as well as 401 for an expired or missing token, so
    // both have to end the session — unlike a permissions 403, which this
    // backend never sends, since every account is a full administrator.
    if ((status === 401 || status === 403) && !url.includes('/auth/login')) {
      // AppBootstrap listens for this and ends the session. Reaching into the
      // store from here would import React state into a plain module and make
      // the teardown order impossible to follow.
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    return Promise.reject(error)
  }
)
