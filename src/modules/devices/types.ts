import type { AlarmSeverity } from '@/modules/alarms/types'

export type { AlarmSeverity }

export type ConnectivityType = 'sim' | 'wifi'

/** Derived from lastSeenAt — never sent by the server. See lib/presence.ts. */
export type Presence = 'online' | 'degraded' | 'offline'

/**
 * Device-reported state, per FRD §4 Real-Time Monitoring.
 *
 * Every field is optional, and that is the whole point. The FRD qualifies each
 * of these with "where available" / "where supplied by the device", because
 * which of them a given helmet actually reports isn't known until the firmware
 * is on the bench. A required field that the device never sends becomes a
 * fake zero in the UI; an optional one renders as "not reported", which is the
 * truth. The detail view builds its rows from whatever is present.
 */
export interface Telemetry {
  batteryPercent?: number
  batteryVoltage?: number // FRD asks for level AND voltage — they diverge as cells age
  lat?: number
  lng?: number
  altitude?: number
  speed?: number
  heading?: number
  signalStrength?: number // dBm
  networkType?: string // '4G', 'LTE-M', 'Wi-Fi'…
  carrier?: string
  isWorn?: boolean
  isCharging?: boolean
  isRecording?: boolean
}

/**
 * Identity and registration data (from your database) kept separate from
 * telemetry (from the helmet). That split mirrors FRD §4 Device Management vs
 * §4 Real-Time Monitoring, and it means a device row still renders correctly
 * for a helmet that has been registered but has never connected.
 */
/**
 * Who wears this helmet.
 *
 * FRD §4 Device Management: "manage device assignment/ownership information".
 * Deliberately not a link to a dashboard account — the worker wearing the
 * helmet never signs in here. Every dashboard user is an administrator.
 */
export interface DeviceAssignment {
  name: string
  phone?: string
  jobTitle?: string
}

export interface Device {
  id: string
  name: string
  site: string
  assignedTo?: DeviceAssignment
  connectivity: ConnectivityType
  lastSeenAt: number
  activeAlarm: AlarmSeverity | null
  telemetry: Telemetry
}

/** A Device with presence resolved against the current clock. */
export interface DeviceView extends Device {
  presence: Presence
}

/** A single stored heartbeat. Backs the status-history views. */
export interface TelemetrySample {
  ts: number
  batteryPercent?: number
  batteryVoltage?: number
  connectivity?: ConnectivityType
  signalStrength?: number
  lat?: number
  lng?: number
}

export type HistoryRange = '1h' | '24h' | '7d'

/**
 * The window the API actually served, returned alongside the samples.
 *
 * stepMs matters downstream: history is downsampled server-side, so a gap in
 * the data can't be read against the 30s live heartbeat interval. At 30-minute
 * resolution every sample looks like a half-hour outage. See lib/history.ts.
 */
export interface TelemetryWindow {
  range: HistoryRange
  rangeStart: number
  rangeEnd: number
  stepMs: number
  samples: TelemetrySample[]
}
