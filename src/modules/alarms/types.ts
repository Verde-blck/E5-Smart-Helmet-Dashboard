export type AlarmType =
  | 'sos'
  | 'sos-button'
  | 'fall'
  | 'helmet-removal'
  | 'geofence'
  | 'restricted-area'
  | 'temperature'
  | 'silent'
  | 'near-electric'
  | 'ascending'
  | 'beacon-enter'
  | 'beacon-leave'
  | 'body-temperature'
  | 'heart-rate'
  | 'blood-pressure'
  | 'voice-message'
  | 'other'

export type AlarmSeverity = 'critical' | 'warning'

export type AlarmStatus = 'active' | 'resolved'

export interface Alarm {
  id: string
  deviceId: string
  deviceName: string
  site?: string
  type: AlarmType
  severity: AlarmSeverity
  status: AlarmStatus
  raisedAt: number
  resolvedAt?: number
  resolvedBy?: string
  lat?: number
  lng?: number
  note?: string
}

const CODE_TO_TYPE: Record<string, AlarmType> = {
  '1': 'helmet-removal',
  '2': 'geofence',
  '3': 'temperature',
  '4': 'fall',
  '5': 'restricted-area',
  '6': 'silent',
  '7': 'sos',
  '11': 'near-electric',
  '12': 'ascending',
  '17': 'beacon-enter',
  '18': 'beacon-leave',
  '20': 'body-temperature',
  '21': 'heart-rate',
  '22': 'blood-pressure',
  manual_sos_button: 'sos-button',
  voice_message: 'voice-message',
}

export function alarmTypeFromCode(code: unknown): AlarmType {
  if (code === null || code === undefined) return 'other'
  return CODE_TO_TYPE[String(code).trim()] ?? 'other'
}

export const ALARM_LABELS: Record<AlarmType, string> = {
  sos: 'SOS',
  'sos-button': 'SOS with call',
  fall: 'Fall or impact',
  'helmet-removal': 'Helmet removed',
  geofence: 'Left work area',
  'restricted-area': 'Entered restricted area',
  temperature: 'High temperature',
  silent: 'No movement',
  'near-electric': 'Near live electricity',
  ascending: 'Working at height',
  'beacon-enter': 'Entered beacon zone',
  'beacon-leave': 'Left beacon zone',
  'body-temperature': 'High body temperature',
  'heart-rate': 'Abnormal heart rate',
  'blood-pressure': 'Abnormal blood pressure',
  'voice-message': 'Voice message',
  other: 'Other event',
}

export function isSos(type: AlarmType): boolean {
  return type === 'sos' || type === 'sos-button'
}

export function alarmLabel(type: string): string {
  return ALARM_LABELS[type as AlarmType] ?? ALARM_LABELS.other
}

const CRITICAL: ReadonlySet<AlarmType> = new Set<AlarmType>([
  'sos',
  'sos-button',
  'fall',
  'near-electric',
  'silent',
])

export function severityForType(type: AlarmType): AlarmSeverity {
  return CRITICAL.has(type) ? 'critical' : 'warning'
}

export function isActive(alarm: Alarm): boolean {
  return alarm.status === 'active'
}
