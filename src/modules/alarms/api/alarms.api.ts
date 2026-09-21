import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { num, pageContent, shortDeviceName, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { getMockAlarms, setMockAlarmResolved } from './alarms.mock'
import { alarmTypeFromCode, severityForType } from '../types'
import type { Alarm } from '../types'

/** Exactly what GET /api/alarms returns inside its page. */
interface ApiAlarm {
  id: number
  deviceId: string
  alarmType?: string | null
  latitude?: string | null
  longitude?: string | null
  occurredAt?: string | null
  resolved?: boolean
}

function toAlarm(api: ApiAlarm): Alarm {
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
