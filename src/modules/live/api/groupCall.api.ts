import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { tokenStore } from '@/shared/lib/token'
import { MOCK_URL_PREFIX } from './live.api'

/*
 * Group video calls (beta): several helmets and the dashboard user in one
 * call room. From the backend's guide of 13 Oct 2026.
 *
 * Built to the same protocol as the one-to-one call, but whether the helmet
 * app shows and plays several other participants hasn't been confirmed on
 * real hardware yet (there's only one test helmet). Hence "beta" in the UI.
 */

/** The backend's limit per call. */
export const GROUP_CALL_MAX = 8

export interface GroupCallHelmet {
  deviceId: string
  /** false: offline. Calls aren't queued, so it won't join later. */
  delivered: boolean
  watchUrl: string
}

export interface GroupCall {
  callId: string
  helmets: GroupCallHelmet[]
  /** Where our microphone (and camera) goes, for every helmet to play. */
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

// Mock calls live as long as the page; the last one is reported back on GET.
const mockCalls = new Map<string, GroupCall>()

export async function startGroupCall(deviceIds: string[]): Promise<GroupCall> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const callId = `mock${Date.now().toString(36)}`
    const call: GroupCall = {
      callId,
      // The last helmet of three or more is "offline", to show that state.
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

/**
 * The call's details again, for rejoining after a page reload. Null when the
 * call no longer exists (404), e.g. after a backend restart.
 */
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

/**
 * Ends the call on every helmet. Sent on every way out, including the tab
 * closing, using keepalive because sendBeacon can't send the auth header.
 */
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

/**
 * The call this browser started, so a reload can offer to rejoin or end it
 * rather than leaving helmets stuck in a call nobody can see. Per tab
 * (sessionStorage), so another tab doesn't pick it up.
 */
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
