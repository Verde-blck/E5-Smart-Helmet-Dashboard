// The alarm vocabulary from FRD §4 Safety Alarm & Event Management. The device
// module imports AlarmSeverity from here rather than redeclaring it — one
// definition, so a new severity can't mean two different things in two places.

export type AlarmType =
  | 'sos'
  | 'fall'
  | 'impact'
  | 'helmet-removal'
  | 'geofence'
  | 'temperature'
  | 'low-power'
  | 'other'

export type AlarmSeverity = 'critical' | 'warning'
export type AlarmStatus = 'active' | 'acknowledged' | 'resolved'

export interface Alarm {
  id: string
  deviceId: string
  deviceName: string
  /** Site the helmet was at. Lets scope be checked without a join. */
  site?: string
  type: AlarmType
  severity: AlarmSeverity
  status: AlarmStatus
  raisedAt: number
  acknowledgedAt?: number
  acknowledgedBy?: string
  resolvedAt?: number
  lat?: number
  lng?: number
  note?: string
}

// 'other' is deliberate. The FRD qualifies most event types with "where
// supported", and says other supported events may be exposed by the helmet
// interface — so an unrecognised type from the backend must render as an
// alarm with an unknown label, never be dropped on the floor.
export const ALARM_LABELS: Record<AlarmType, string> = {
  sos: 'SOS / Emergency',
  fall: 'Fall / Man-down',
  impact: 'Impact',
  'helmet-removal': 'Helmet removed',
  geofence: 'Restricted area',
  temperature: 'Temperature',
  'low-power': 'Low battery',
  other: 'Other event',
}

export function alarmLabel(type: string): string {
  return ALARM_LABELS[type as AlarmType] ?? ALARM_LABELS.other
}

/** FRD acceptance wording: "active and historical alarm events". */
export function isActive(alarm: Alarm): boolean {
  return alarm.status === 'active'
}
