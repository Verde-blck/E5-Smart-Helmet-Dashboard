import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import {
  flag,
  millivoltsToVolts,
  num,
  pageContent,
  parseGasData,
  shortDeviceName,
  ts,
} from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { getMockDevice, getMockFleet, getMockTelemetryWindow } from './devices.mock'
import { HISTORY_RANGES } from '../lib/history'
import type { Device, HistoryRange, TelemetrySample, TelemetryWindow } from '../types'

/** Exactly what GET /api/devices returns — every value a string. */
interface ApiDevice {
  deviceId: string
  lastBatteryLevel?: string | null
  lastLatitude?: string | null
  lastLongitude?: string | null
  lastWearStatus?: string | null
  lastNetStrength?: string | null
  firstSeenAt?: string | null
  lastSeenAt?: string | null
  accountId?: string | null
  active?: boolean
  online?: boolean
}

interface ApiTelemetry {
  id: number
  deviceId: string
  batteryLevel?: string | null
  batteryVoltage?: string | null
  altitude?: string | null
  chargingStatus?: string | null
  latitude?: string | null
  longitude?: string | null
  wearStatus?: string | null
  netStrength?: string | null
  netType?: string | null
  gpsLevel?: string | null
  rawGasData?: string | null
  recordedAt?: string | null
}

function toDevice(api: ApiDevice): Device {
  return {
    id: api.deviceId,
    name: shortDeviceName(api.deviceId),
    // site, assignedTo and activeAlarm have no source in the API yet.
    active: api.active ?? true,
    connectivity: 'sim',
    // Presence is still derived from this timestamp rather than from the
    // API's `online` flag, so the device list and the status history agree.
    // The API applies a 2-minute rule; ours is 90 seconds.
    lastSeenAt: ts(api.lastSeenAt) ?? 0,
    activeAlarm: null,
    telemetry: {
      batteryPercent: num(api.lastBatteryLevel),
      lat: num(api.lastLatitude),
      lng: num(api.lastLongitude),
      isWorn: flag(api.lastWearStatus),
      signalStrength: num(api.lastNetStrength),
    },
  }
}

export async function fetchDevices(): Promise<Device[]> {
  if (env.useMocks) return getMockFleet()
  const { data } = await apiClient.get<ApiDevice[]>('/devices')
  return (data ?? []).map(toDevice)
}

export async function fetchDevice(id: string): Promise<Device | undefined> {
  if (env.useMocks) return getMockDevice(id)
  const { data } = await apiClient.get<ApiDevice>(`/devices/${id}`)
  return data ? toDevice(data) : undefined
}

/** Registration state. Independent of whether the helmet is connected. */
export async function setDeviceActive(id: string, active: boolean): Promise<void> {
  if (env.useMocks) return
  await apiClient.patch(`/devices/${id}/${active ? 'activate' : 'deactivate'}`)
}

function toSample(api: ApiTelemetry): TelemetrySample {
  return {
    ts: ts(api.recordedAt) ?? 0,
    batteryPercent: num(api.batteryLevel),
    batteryVoltage: millivoltsToVolts(api.batteryVoltage),
    altitude: num(api.altitude),
    lat: num(api.latitude),
    lng: num(api.longitude),
    signalStrength: num(api.netStrength),
    isCharging: flag(api.chargingStatus),
    isWorn: flag(api.wearStatus),
    gas: parseGasData(api.rawGasData),
  }
}

/**
 * Status history for one helmet.
 *
 * The API paginates raw rows newest-first with no date filtering, so the whole
 * recent set is pulled in one large page and the window is applied here. That
 * is fine at the current volume — a few hundred rows per device — but it does
 * not scale: the endpoint should accept `from`, `to` and a step, and aggregate
 * server-side. Flagged with the backend.
 */
export async function fetchDeviceTelemetry(
  id: string,
  range: HistoryRange
): Promise<TelemetryWindow> {
  if (env.useMocks) return getMockTelemetryWindow(id, range)

  const { durationMs, stepMs } = HISTORY_RANGES[range]
  const rangeEnd = Date.now()
  const rangeStart = rangeEnd - durationMs

  const { data } = await apiClient.get<Page<ApiTelemetry>>(`/devices/${id}/telemetry`, {
    params: { page: 0, size: 1000 },
  })

  const samples = pageContent(data)
    .map(toSample)
    .filter((s) => s.ts >= rangeStart && s.ts <= rangeEnd)
    // The API returns newest first; the chart walks forwards in time.
    .sort((a, b) => a.ts - b.ts)

  return { range, rangeStart, rangeEnd, stepMs, samples }
}
