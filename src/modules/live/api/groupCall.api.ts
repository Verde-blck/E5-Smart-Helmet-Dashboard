import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { tokenStore } from '@/shared/lib/token'
import { MOCK_URL_PREFIX } from './live.api'

export const GROUP_CALL_MAX = 8

export interface GroupCallHelmet {
  deviceId: string
  delivered: boolean
  watchUrl: string
}

export interface GroupCall {
  callId: string
  helmets: GroupCallHelmet[]
  adminPushUrl: string
}

interface ApiGroupCall {
  callId?: string
  helmets?: { deviceId: string; delivered?: boolean; watchUrl?: string }[]
  adminPushUrl?: string
}

function toGroupCall(data: ApiGroupCall | null | undefined): GroupCall {
  if (!data?.callId) throw new Error('The backend didn’t return a call.')
  return {
    callId: data.callId,
    helmets: (data.helmets ?? []).map((h) => ({
      deviceId: h.deviceId,
      delivered: h.delivered === true,
      watchUrl: h.watchUrl ?? '',
    })),
    adminPushUrl: data.adminPushUrl ?? '',
  }
}

const mockCalls = new Map<string, GroupCall>()

export async function startGroupCall(deviceIds: string[]): Promise<GroupCall> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const callId = `mock${Date.now().toString(36)}`
    const call: GroupCall = {
      callId,
      helmets: deviceIds.map((deviceId, i) => ({
        deviceId,
        delivered: !(deviceIds.length >= 3 && i === deviceIds.length - 1),
        watchUrl: `${MOCK_URL_PREFIX}watch/${deviceId}`,
      })),
      adminPushUrl: `${MOCK_URL_PREFIX}push/${callId}`,
    }
    mockCalls.set(callId, call)
    return call
  }
  const { data } = await apiClient.post<ApiGroupCall>('/webrtc-group-call/start', {
    deviceIds: deviceIds.slice(0, GROUP_CALL_MAX),
  })
  return toGroupCall(data)
}

export async function getGroupCall(callId: string): Promise<GroupCall | null> {
  if (env.useMocks) return mockCalls.get(callId) ?? null
  try {
    const { data } = await apiClient.get<ApiGroupCall>(`/webrtc-group-call/${callId}`)
    return toGroupCall(data)
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) return null
    throw error
  }
}

// keepalive, because sendBeacon can't send the auth header.
export function stopGroupCall(
  callId: string,
  { unloading = false }: { unloading?: boolean } = {}
): Promise<void> {
  if (env.useMocks) {
    mockCalls.delete(callId)
    return Promise.resolve()
  }
  const path = `/webrtc-group-call/${callId}/stop`
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

const ACTIVE_KEY = 'e5.groupCall'

export const activeGroupCall = {
  get(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_KEY)
    } catch {
      return null
    }
  },
  set(callId: string | null) {
    try {
      if (callId) sessionStorage.setItem(ACTIVE_KEY, callId)
      else sessionStorage.removeItem(ACTIVE_KEY)
    } catch {
      // Storage blocked; rejoining after a reload just won't be offered.
    }
  },
}
