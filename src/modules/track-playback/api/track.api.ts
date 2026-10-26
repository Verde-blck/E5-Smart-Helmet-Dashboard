import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { flag, millivoltsToVolts, num, pageContent, parseGasData, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { getMockTrackSamples } from './track.mock'
import type { TelemetrySample } from '@/modules/devices/types'
import { toFixType } from '@/modules/devices/api/devices.api'

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
  rawGasData?: string | null
  recordedAt?: string | null
  fixType?: string | null
  accuracyMeters?: number | string | null
}

const PAGE_SIZE = 2000

export interface TrackFetch {
  samples: TelemetrySample[]
  truncated: boolean
}

export async function fetchTrackSamples(
  deviceId: string,
  from: number,
  to: number
): Promise<TrackFetch> {
  if (env.useMocks) return { samples: getMockTrackSamples(deviceId, from, to), truncated: false }

  const { data } = await apiClient.get<Page<ApiTelemetry>>(
    `/devices/${deviceId}/telemetry`,
    { params: { page: 0, size: PAGE_SIZE } }
  )

  const rows = pageContent(data)
  const samples: TelemetrySample[] = rows.map((api) => ({
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
    fixType: toFixType(api.fixType),
    accuracyMeters: num(api.accuracyMeters as string | number | null | undefined),
  }))

  const oldest = samples.reduce((min, s) => Math.min(min, s.ts || Infinity), Infinity)
  const truncated = rows.length >= PAGE_SIZE && oldest > from

  return { samples, truncated }
}
