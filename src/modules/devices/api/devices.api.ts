import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { getMockDevice, getMockFleet, getMockTelemetryWindow } from './devices.mock'
import { HISTORY_RANGES } from '../lib/history'
import type { Device, HistoryRange, TelemetryWindow } from '../types'

// Swap the mock branch out once GET /devices and GET /devices/:id exist on
// the backend — nothing outside this file needs to change.
export async function fetchDevices(): Promise<Device[]> {
  if (env.useMocks) return getMockFleet()
  const { data } = await apiClient.get<Device[]>('/devices')
  return data
}

export async function fetchDevice(id: string): Promise<Device | undefined> {
  if (env.useMocks) return getMockDevice(id)
  const { data } = await apiClient.get<Device>(`/devices/${id}`)
  return data
}

/**
 * Status history for one helmet.
 *
 * The backend should aggregate to the requested step rather than returning raw
 * heartbeats — seven days of 30-second samples is 20,160 rows per device — and
 * should echo back the window it actually served, so the chart axes describe
 * the data rather than what the client asked for.
 */
export async function fetchDeviceTelemetry(
  id: string,
  range: HistoryRange
): Promise<TelemetryWindow> {
  if (env.useMocks) return getMockTelemetryWindow(id, range)

  const { durationMs, stepMs } = HISTORY_RANGES[range]
  const to = Date.now()
  const from = to - durationMs

  const { data } = await apiClient.get<TelemetryWindow>(`/devices/${id}/telemetry`, {
    params: { from, to, stepMs },
  })
  return data
}