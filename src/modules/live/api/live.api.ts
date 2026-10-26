import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { tokenStore } from '@/shared/lib/token'

export interface LiveStart {
  delivered: boolean
  watchUrl: string
  alreadyLive?: boolean
}

export interface CallStart extends LiveStart {
  adminPushUrl: string
}

export const MOCK_URL_PREFIX = 'mock:'

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 500))

export async function startLive(deviceId: string): Promise<LiveStart> {
  if (env.useMocks) {
    await mockDelay()
    return { delivered: true, watchUrl: `${MOCK_URL_PREFIX}watch/${deviceId}` }
  }
  const { data } = await apiClient.post<Partial<LiveStart>>(`/devices/${deviceId}/live/start`)
  return {
    delivered: data?.delivered === true,
    watchUrl: data?.watchUrl ?? '',
    alreadyLive: data?.alreadyLive === true,
  }
}

export async function startCall(deviceId: string): Promise<CallStart> {
  if (env.useMocks) {
    await mockDelay()
    return {
      delivered: true,
      watchUrl: `${MOCK_URL_PREFIX}watch/${deviceId}`,
      adminPushUrl: `${MOCK_URL_PREFIX}push/${deviceId}`,
    }
  }
  const { data } = await apiClient.post<Partial<CallStart>>(
    `/devices/${deviceId}/webrtc-call/start`
  )
  return {
    delivered: data?.delivered === true,
    watchUrl: data?.watchUrl ?? '',
    adminPushUrl: data?.adminPushUrl ?? '',
  }
}

export type SessionMode = 'watch' | 'call'

// keepalive lets the request finish as the page unloads; sendBeacon can't send the auth header.
export function stopCall(
  deviceId: string,
  { unloading = false }: { unloading?: boolean } = {}
): Promise<void> {
  if (env.useMocks) return Promise.resolve()
  const path = `/devices/${deviceId}/webrtc-call/stop`

  if (unloading) {
    const base = (apiClient.defaults.baseURL ?? '/api').replace(/\/$/, '')
    const token = tokenStore.get()
    return fetch(`${base}${path}`, {
      method: 'POST',
      keepalive: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).then(
      () => undefined,
      () => undefined
    )
  }

  return apiClient.post(path).then(
    () => undefined,
    () => undefined
  )
}

// Never called when a player closes: the media server stops the helmet about 20 s after the last
// viewer leaves.
export async function endLiveForEveryone(deviceId: string): Promise<void> {
  if (env.useMocks) return
  await apiClient.post(`/devices/${deviceId}/live/stop`)
}
