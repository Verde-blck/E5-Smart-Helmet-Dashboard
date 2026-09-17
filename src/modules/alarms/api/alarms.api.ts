import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { acknowledgeMockAlarm, getMockAlarms } from './alarms.mock'
import type { Alarm } from '../types'

export async function fetchAlarms(): Promise<Alarm[]> {
  if (env.useMocks) return getMockAlarms()
  const { data } = await apiClient.get<Alarm[]>('/alarms')
  return data
}

export async function acknowledgeAlarm(id: string, by: string): Promise<Alarm | undefined> {
  if (env.useMocks) return acknowledgeMockAlarm(id, by)
  const { data } = await apiClient.post<Alarm>(`/alarms/${id}/acknowledge`)
  return data
}
