import axios from 'axios'
import { env } from '@/config/env'
import { tokenStore } from './token'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.request.use((config) => {
  if (env.multiTenant) {
    const tenantId = localStorage.getItem('tenantId')
    if (tenantId) config.headers['X-Tenant-Id'] = tenantId
  }
  return config
})

export interface ForbiddenDetail {
  permission?: string
  deviceId?: string
}

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const url: string = error?.config?.url ?? ''
    const body = error?.response?.data as ({ error?: string } & ForbiddenDetail) | undefined

    if (status === 403 && body?.error === 'forbidden') {
      window.dispatchEvent(
        new CustomEvent<ForbiddenDetail>('auth:forbidden', {
          detail: { permission: body.permission, deviceId: body.deviceId },
        })
      )
      return Promise.reject(error)
    }

    if (status === 403 && body?.error === '2fa_setup_required') {
      window.dispatchEvent(new CustomEvent('auth:2fa-setup-required'))
      return Promise.reject(error)
    }

    if (status === 403 && body?.error === 'password_change_required') {
      window.dispatchEvent(new CustomEvent('auth:password-change-required'))
      return Promise.reject(error)
    }

    // On sign-in, password change and 2FA, a 401 means a wrong password or code, which those
    // pages explain. Anywhere else, or session_expired on any endpoint, the session has ended.
    const accountAction = /\/auth\/(login|change-password|2fa\/)/.test(url)
    const expired = status === 401 && body?.error === 'session_expired'
    if (expired || ((status === 401 || status === 403) && !accountAction)) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { expired } }))
    }

    return Promise.reject(error)
  }
)
