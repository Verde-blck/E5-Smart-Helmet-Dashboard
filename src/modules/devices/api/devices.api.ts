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

/** Exactly what GET /api/devices returns — every value a string. */
interface ApiDevice {
  deviceId: string
  /** Display name, e.g. "Test Helmet". Empty until someone names it. */
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
  /** Same "GAS--value;GAS--value" format as telemetry. Null until a sensor reports. */
  lastRawGasData?: string | null
  lastGasAt?: string | null
  /** "gps" | "network" | "wifi" | "other" */
  lastFixType?: string | null
  /** "1" strong, "0" weak, "-1" no GPS */
  lastGpsLevel?: string | number | null
  lastAccuracyMeters?: number | string | null
  /** 0 unknown, 1 SIM present, 2 no SIM */
  simStatus?: number | string | null
  simPhoneNumber?: string | null
  simDataUsedMb?: number | string | null
  /** "wifi" | "4g" */
  networkType?: string | null
  /** Who wears it; null = unassigned. Set with PUT /devices/{id}/worker. */
  workerName?: string | null
  workerStaffId?: string | null
  workerPhone?: string | null
  /**
   * true worn, false not worn, null unknown (offline or not reported), so a
   * disconnected helmet never shows as worn. Replaces lastWearStatus.
   */
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

/** "4g" → "4G", "wifi" → "Wi-Fi". */
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
    // The deviceId stays the key for every API call; the name is display
    // only. A helmet without one shows its shortened ID instead.
    id: api.deviceId,
    name: api.name?.trim() || shortDeviceName(api.deviceId),
    named: Boolean(api.name?.trim()),
    // site and activeAlarm have no source in the API yet.
    assignedTo: api.workerName?.trim()
      ? {
          name: api.workerName.trim(),
          staffId: api.workerStaffId || undefined,
          phone: api.workerPhone || undefined,
        }
      : undefined,
    active: api.active ?? true,
    // What the helmet is actually on right now; it switches by itself.
    connectivity: String(api.networkType ?? '').toLowerCase() === 'wifi' ? 'wifi' : 'sim',
    // Presence is still derived from this timestamp rather than from the
    // API's `online` flag, so the device list and the status history agree.
    // The API applies a 2-minute rule; ours is 90 seconds.
    lastSeenAt: ts(api.lastSeenAt) ?? 0,
    activeAlarm: null,
    telemetry: {
      batteryPercent: num(api.lastBatteryLevel),
      lat: num(api.lastLatitude),
      lng: num(api.lastLongitude),
      // The backend's own reading; the raw lastWearStatus code is no longer used.
      isWorn: typeof api.worn === 'boolean' ? api.worn : undefined,
      signalStrength: num(api.lastNetStrength),
      // Empty until a helmet with a gas sensor reports, so the gas slot
      // shows "no reading" rather than a false all-clear of zeros.
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

/**
 * Commissions a helmet before it has ever connected, so an administrator
 * unboxing a crate of units can enter them rather than waiting for each one
 * to phone home.
 *
 * Idempotent on the backend: posting an ID that already exists returns the
 * existing record rather than creating a duplicate. It does not validate the
 * body, though — an empty or malformed request produces a 500 — so the ID is
 * checked here before it's sent.
 */
export async function registerDevice(deviceId: string): Promise<Device> {
  const id = deviceId.trim()
  if (env.useMocks) return registerMockDevice(id)

  const { data } = await apiClient.post<ApiDevice>('/devices', { deviceId: id })
  return toDevice(data)
}

/** Longest name the form accepts; the helmet shows it too, so keep it short. */
export const DEVICE_NAME_MAX = 40

/**
 * Renames a helmet (PATCH /api/devices/{deviceId}/name). The helmet itself
 * picks the new name up the next time it logs in.
 */
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

/** Longest worker name the backend accepts. */
export const WORKER_NAME_MAX = 80

/**
 * Who wears this helmet (PUT /devices/{id}/worker). Only the name is
 * required. Alarm notifications then name the person: "SOS: John Ade (ES5 3)".
 */
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
