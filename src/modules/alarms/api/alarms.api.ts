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
    deviceName: shortDeviceName(api.deviceId),
    type,
    severity: severityForType(type),
    status: api.resolved ? 'resolved' : 'active',
    raisedAt: ts(api.occurredAt) ?? 0,
    lat: num(api.latitude),
    lng: num(api.longitude),
  }
}

export async function fetchAlarms(): Promise<Alarm[]> {
  if (env.useMocks) return getMockAlarms()

  const { data } = await apiClient.get<Page<ApiAlarm>>('/alarms', {
    params: { page: 0, size: 200 },
  })
  return pageContent(data).map(toAlarm)
}

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

// Photos arrive within about 20 s; clips can take 35 minutes or more.
export async function fetchAlarmFootage(id: string): Promise<MediaItem[]> {
  if (env.useMocks) return []
  const { data } = await apiClient.get<{ photos?: ApiPhoto[]; videos?: ApiVideo[] }>(`/alarms/${id}`)
  return [...(data?.photos ?? []).map(toPhoto), ...(data?.videos ?? []).map(toVideo)]
}
