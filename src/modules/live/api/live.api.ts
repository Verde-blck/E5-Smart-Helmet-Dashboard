import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { tokenStore } from '@/shared/lib/token'

/*
 * Live view and video calls, from the backend's Helmet Video & Live Stream
 * guide (12 Oct 2026).
 *
 * The backend only tells the helmet what to do and hands back URLs. The video
 * itself flows between the browser and the media server over WebRTC; see
 * lib/webrtc.ts. Only the HTTPS media-server URLs from these responses are
 * used in the browser; the helmet's own rtmp:// and http:// push addresses
 * would be blocked on the HTTPS dashboard as mixed content.
 */

export interface LiveStart {
  /** false: helmet offline. Not queued: the command is dropped. */
  delivered: boolean
  /** WebRTC play endpoint on the media server. */
  watchUrl: string
  /** Someone is already watching; this viewer joins their stream. */
  alreadyLive?: boolean
}

export interface CallStart extends LiveStart {
  /** WebRTC push endpoint the helmet plays our camera and mic from. */
  adminPushUrl: string
}

/** Marks mock URLs, which lib/webrtc.ts answers with a generated stream. */
export const MOCK_URL_PREFIX = 'mock:'

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 500))

export async function startLive(deviceId: string): Promise<LiveStart> {
  if (env.useMocks) {
    await mockDelay()
    return { delivered: true, watchUrl: `${MOCK_URL_PREFIX}watch/${deviceId}` }
  }
  // Every viewer calls start. If the helmet is already streaming, the
  // backend doesn't restart it; the reply says alreadyLive and we just join.
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

/**
 * Takes the helmet out of call mode. Sent on every way a call ends,
 * including the tab closing: a normal request is cancelled as the page
 * unloads, so `keepalive` hands it to the browser to finish. sendBeacon
 * can't carry the auth header, so the backend would answer 403.
 *
 * Live view has no equivalent on close, deliberately: see endLiveForEveryone.
 */
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

/**
 * Stops a helmet's live stream for every viewer, not just this one.
 *
 * Closing a player never calls this. Several people can watch one helmet,
 * and the media server stops the helmet by itself about 20 seconds after
 * the last viewer leaves, closed tabs and crashed browsers included. This is
 * only for an operator who explicitly wants the helmet to stop streaming now.
 */
export async function endLiveForEveryone(deviceId: string): Promise<void> {
  if (env.useMocks) return
  await apiClient.post(`/devices/${deviceId}/live/stop`)
}
