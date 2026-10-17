import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { num, pageContent, shortDeviceName, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { getMockAlarms, setMockAlarmResolved } from './alarms.mock'
import { alarmTypeFromCode, severityForType } from '../types'
import type { Alarm } from '../types'
import { toPhoto, toVideo } from '@/modules/media/api/media.api'
import type { ApiPhoto, ApiVideo } from '@/modules/media/api/media.api'
import type { MediaItem } from '@/modules/media/types'

/** Exactly what GET /api/alarms returns inside its page. */
export interface ApiAlarm {
  id: number
  deviceId: string
  alarmType?: string | null
  latitude?: string | null
  longitude?: string | null
  occurredAt?: string | null
  resolved?: boolean
}

export function toAlarm(api: ApiAlarm): Alarm {
  const type = alarmTypeFromCode(api.alarmType)
  return {
    id: String(api.id),
    deviceId: api.deviceId,
    // No device name in the API; the short IMEI stands in.
    deviceName: shortDeviceName(api.deviceId),
    type,
    // Derived — the API sends no severity. See severityForType.
    severity: severityForType(type),
    status: api.resolved ? 'resolved' : 'active',
    raisedAt: ts(api.occurredAt) ?? 0,
    lat: num(api.latitude),
    lng: num(api.longitude),
  }
}

/**
 * The endpoint is paginated and has no "all" mode, so this takes a single
 * large page. Fine at current volume; it should move to proper pagination or
 * a date filter once alarm history grows.
 */
export async function fetchAlarms(): Promise<Alarm[]> {
  if (env.useMocks) return getMockAlarms()

  const { data } = await apiClient.get<Page<ApiAlarm>>('/alarms', {
    params: { page: 0, size: 200 },
  })
  return pageContent(data).map(toAlarm)
}

/**
 * Resolve or reopen. Two endpoints rather than one with a body, which is how
 * the API models it.
 */
export async function setAlarmResolved(
  id: string,
  resolved: boolean,
  by: string
): Promise<void> {
  if (env.useMocks) {
    setMockAlarmResolved(id, resolved, by)
    return
  }
  await apiClient.patch(`/alarms/${id}/${resolved ? 'resolve' : 'unresolve'}`)
}

/**
 * The photos and videos captured because of this alarm (GET /api/alarms/{id}).
 *
 * The backend captures automatically for SOS (7), fall or impact (4) and
 * near electricity (11): a photo about 5 s after, and 2 minutes of video.
 * The photo arrives within about 20 s; clips can take 35 minutes or more.
 * Older alarms have nothing linked, so callers fall back to time matching.
 */
export async function fetchAlarmFootage(id: string): Promise<MediaItem[]> {
  if (env.useMocks) return []
  const { data } = await apiClient.get<{ photos?: ApiPhoto[]; videos?: ApiVideo[] }>(`/alarms/${id}`)
  return [...(data?.photos ?? []).map(toPhoto), ...(data?.videos ?? []).map(toVideo)]
}
