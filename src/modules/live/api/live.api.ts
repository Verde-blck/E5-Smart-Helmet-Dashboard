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
  /** false: helmet offline. The command is queued for when it reconnects. */
  delivered: boolean
  /** WebRTC play endpoint on the media server. */
  watchUrl: string
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
  const { data } = await apiClient.post<Partial<LiveStart>>(`/devices/${deviceId}/live/start`)
  return { delivered: data?.delivered === true, watchUrl: data?.watchUrl ?? '' }
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

const STOP_PATH: Record<SessionMode, string> = {
  watch: 'live/stop',
  call: 'webrtc-call/stop',
}

/**
 * Tells the helmet to stop streaming, or to leave call mode.
 *
 * This matters more than it looks: a helmet keeps streaming, on its own
 * mobile data, until it's told to stop. So it's sent on every way out,
 * including the tab closing. In that last case a normal request is cancelled
 * as the page unloads, so `keepalive` hands it to the browser to finish.
 * sendBeacon would be the usual tool, but it can't carry the auth header.
 */
export function stopSession(
  deviceId: string,
  mode: SessionMode,
  { unloading = false }: { unloading?: boolean } = {}
): Promise<void> {
  if (env.useMocks) return Promise.resolve()

  const path = `/devices/${deviceId}/${STOP_PATH[mode]}`

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
    // Nothing useful to do if stop fails; the helmet also stops by itself
    // once the media server stops receiving video.
    () => undefined
  )
}
