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
import {
  setMockWorker,
  renameMockDevice,
  getMockDevice,
  getMockFleet,
  getMockSummary,
  getMockTelemetryWindow,
  registerMockDevice,
} from './devices.mock'
import { HISTORY_RANGES } from '../lib/history'
import type {
  Device,
  FixType,
  SimStatus,
  FleetSummary,
  HistoryRange,
  TelemetrySample,
  TelemetryWindow,
} from '../types'

interface ApiDevice {
  deviceId: string
  name?: string | null
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
  lastRawGasData?: string | null
  lastGasAt?: string | null
  lastFixType?: string | null
  lastGpsLevel?: string | number | null
  lastAccuracyMeters?: number | string | null
  simStatus?: number | string | null
  simPhoneNumber?: string | null
  simDataUsedMb?: number | string | null
  networkType?: string | null
  workerName?: string | null
  workerStaffId?: string | null
  workerPhone?: string | null
  worn?: boolean | null
}

const FIX_TYPES = ['gps', 'network', 'wifi', 'other'] as const

export function toFixType(value: unknown): FixType | undefined {
  const v = String(value ?? '').toLowerCase()
  return (FIX_TYPES as readonly string[]).includes(v) ? (v as FixType) : undefined
}

function toSimStatus(value: unknown): SimStatus | undefined {
  const n = Number(value)
  return n === 1 ? 'present' : n === 2 ? 'absent' : value == null ? undefined : 'unknown'
}

function toNetworkLabel(value: unknown): string | undefined {
  const v = String(value ?? '').toLowerCase()
  return v === 'wifi' ? 'Wi-Fi' : v === '4g' ? '4G' : v ? v.toUpperCase() : undefined
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
    name: api.name?.trim() || shortDeviceName(api.deviceId),
    named: Boolean(api.name?.trim()),
    assignedTo: api.workerName?.trim()
      ? {
          name: api.workerName.trim(),
          staffId: api.workerStaffId || undefined,
          phone: api.workerPhone || undefined,
        }
      : undefined,
    active: api.active ?? true,
    connectivity: String(api.networkType ?? '').toLowerCase() === 'wifi' ? 'wifi' : 'sim',
    lastSeenAt: ts(api.lastSeenAt) ?? 0,
    activeAlarm: null,
    telemetry: {
      batteryPercent: num(api.lastBatteryLevel),
      lat: num(api.lastLatitude),
      lng: num(api.lastLongitude),
      isWorn: typeof api.worn === 'boolean' ? api.worn : undefined,
      signalStrength: num(api.lastNetStrength),
      gas: parseGasData(api.lastRawGasData),
      gasAt: ts(api.lastGasAt),
      fixType: toFixType(api.lastFixType),
      gpsLevel: num(api.lastGpsLevel as string | number | null | undefined),
      accuracyMeters: num(api.lastAccuracyMeters as string | number | null | undefined),
      simStatus: toSimStatus(api.simStatus),
      simPhoneNumber: api.simPhoneNumber || undefined,
      simDataUsedMb: num(api.simDataUsedMb as string | number | null | undefined),
      networkType: toNetworkLabel(api.networkType),
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

interface ApiSummary {
  totalHelmets?: number
  onlineHelmets?: number
  offlineHelmets?: number
  activeHelmets?: number
  inactiveHelmets?: number
  recentAlarmsCount24h?: number
}

export async function fetchFleetSummary(): Promise<FleetSummary> {
  if (env.useMocks) return getMockSummary()

  const { data } = await apiClient.get<ApiSummary>('/dashboard/summary')
  return {
    total: data.totalHelmets ?? 0,
    online: data.onlineHelmets ?? 0,
    offline: data.offlineHelmets ?? 0,
    active: data.activeHelmets ?? 0,
    inactive: data.inactiveHelmets ?? 0,
    alarms24h: data.recentAlarmsCount24h ?? 0,
  }
}

// Idempotent on the backend: an existing ID returns its record rather than an error.
export async function registerDevice(deviceId: string): Promise<Device> {
  const id = deviceId.trim()
  if (env.useMocks) return registerMockDevice(id)

  const { data } = await apiClient.post<ApiDevice>('/devices', { deviceId: id })
  return toDevice(data)
}

export const DEVICE_NAME_MAX = 40

export async function renameDevice(deviceId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    renameMockDevice(deviceId, trimmed)
    return
  }
  await apiClient.patch(`/devices/${deviceId}/name`, { name: trimmed })
}

export interface WorkerInput {
  name: string
  staffId?: string
  phone?: string
}

export const WORKER_NAME_MAX = 80

export async function assignWorker(deviceId: string, worker: WorkerInput): Promise<void> {
  const body = {
    name: worker.name.trim(),
    ...(worker.staffId?.trim() ? { staffId: worker.staffId.trim() } : {}),
    ...(worker.phone?.trim() ? { phone: worker.phone.trim() } : {}),
  }
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    setMockWorker(deviceId, body)
    return
  }
  await apiClient.put(`/devices/${deviceId}/worker`, body)
}

export async function clearWorker(deviceId: string): Promise<void> {
  if (env.useMocks) {
    setMockWorker(deviceId, null)
    return
  }
  await apiClient.delete(`/devices/${deviceId}/worker`)
}

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
