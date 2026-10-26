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

    // A 401 from login means a wrong password, which the sign-in page handles.
    if ((status === 401 || status === 403) && !url.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    return Promise.reject(error)
  }
)
