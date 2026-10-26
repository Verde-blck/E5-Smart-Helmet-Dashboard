import type { AlarmSeverity } from '@/modules/alarms/types'
import type { GasReading } from '@/shared/lib/api-normalize'

export type { AlarmSeverity }

export type ConnectivityType = 'sim' | 'wifi'

export type Presence = 'online' | 'degraded' | 'offline'

export interface Telemetry {
  batteryPercent?: number
  batteryVoltage?: number
  lat?: number
  lng?: number
  altitude?: number
  speed?: number
  heading?: number
  signalStrength?: number
  networkType?: string
  carrier?: string
  isWorn?: boolean
  isCharging?: boolean
  isRecording?: boolean
  gas?: GasReading[]
  gasAt?: number
  fixType?: FixType
  gpsLevel?: number
  accuracyMeters?: number
  simStatus?: SimStatus
  simPhoneNumber?: string
  simDataUsedMb?: number
}

export type FixType = 'gps' | 'network' | 'wifi' | 'other'
export type SimStatus = 'present' | 'absent' | 'unknown'

export interface DeviceAssignment {
  name: string
  staffId?: string
  phone?: string
  jobTitle?: string
}

export interface Device {
  id: string
  name: string
  named?: boolean
  site?: string
  assignedTo?: DeviceAssignment
  active: boolean
  connectivity: ConnectivityType
  lastSeenAt: number
  activeAlarm: AlarmSeverity | null
  telemetry: Telemetry
}

export interface DeviceView extends Device {
  presence: Presence
}

export interface TelemetrySample {
  ts: number
  batteryPercent?: number
  batteryVoltage?: number
  connectivity?: ConnectivityType
  signalStrength?: number
  lat?: number
  lng?: number
  altitude?: number
  isCharging?: boolean
  isWorn?: boolean
  gas?: GasReading[]
  fixType?: FixType
  accuracyMeters?: number
}

export type HistoryRange = '1h' | '24h' | '7d'

export interface TelemetryWindow {
  range: HistoryRange
  rangeStart: number
  rangeEnd: number
  stepMs: number
  samples: TelemetrySample[]
}

export interface FleetSummary {
  total: number
  online: number
  offline: number
  active: number
  inactive: number
  alarms24h: number
}
