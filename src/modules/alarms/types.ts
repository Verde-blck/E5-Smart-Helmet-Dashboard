/**
 * The alarm vocabulary, matched to the helmet protocol's numeric codes.
 *
 * The device module imports AlarmSeverity from here rather than redeclaring
 * it — one definition, so a new severity can't mean two different things.
 */
export type AlarmType =
  | 'sos'
  | 'fall'
  | 'impact'
  | 'helmet-removal'
  | 'geofence'
  | 'temperature'
  | 'low-power'
  | 'silent'
  | 'near-electric'
  | 'ascending'
  | 'voice-message'
  | 'other'

export type AlarmSeverity = 'critical' | 'warning'

/**
 * Two states, matching the backend exactly.
 *
 * An earlier design had a middle "acknowledged" state — seen but not yet
 * fixed — which is genuinely useful during an incident. The API has only
 * resolved/unresolved and endpoints to flip between them, so the dashboard
 * matches rather than inventing a state the server can't store. Worth
 * revisiting if the client asks for triage.
 */
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

/**
 * Numeric codes from the helmet's own protocol, as passed through by the API.
 * Confirmed against the live backend and the vendor's configuration screen.
 */
const CODE_TO_TYPE: Record<string, AlarmType> = {
  '1': 'helmet-removal',
  '2': 'geofence',
  '3': 'temperature',
  '4': 'fall',
  '6': 'silent',
  '7': 'sos',
  '11': 'near-electric',
  '12': 'ascending',
  manual_sos_button: 'sos',
  // A wearer recording a message surfaces here so it's noticed, rather than
  // sitting unseen in a conversation nobody has open.
  voice_message: 'voice-message',
}

export function alarmTypeFromCode(code: unknown): AlarmType {
  if (code === null || code === undefined) return 'other'
  // Anything unrecognised becomes a generic event rather than being dropped —
  // firmware can raise codes this table doesn't know about yet.
  return CODE_TO_TYPE[String(code).trim()] ?? 'other'
}

export const ALARM_LABELS: Record<AlarmType, string> = {
  sos: 'SOS / Emergency',
  fall: 'Fall / Man-down',
  impact: 'Impact',
  'helmet-removal': 'Helmet removed',
  geofence: 'Left work area',
  temperature: 'Temperature',
  'low-power': 'Low battery',
  silent: 'Silent alarm',
  'near-electric': 'Near electricity',
  ascending: 'Working at height',
  'voice-message': 'Voice message from wearer',
  other: 'Other event',
}

export function alarmLabel(type: string): string {
  return ALARM_LABELS[type as AlarmType] ?? ALARM_LABELS.other
}

/**
 * Severity is derived, because the API doesn't send one.
 *
 * Critical means someone may be in immediate danger: an SOS, a fall, contact
 * with live electricity, or a silent alarm — which is a duress trigger, so the
 * wearer may be unable to speak.
 */
const CRITICAL: ReadonlySet<AlarmType> = new Set<AlarmType>([
  'sos',
  'fall',
  'impact',
  'near-electric',
  'silent',
])

export function severityForType(type: AlarmType): AlarmSeverity {
  return CRITICAL.has(type) ? 'critical' : 'warning'
}

export function isActive(alarm: Alarm): boolean {
  return alarm.status === 'active'
}
