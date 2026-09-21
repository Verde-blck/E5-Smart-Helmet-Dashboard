import { getMockFleet } from '@/modules/devices/api/devices.mock'
import { severityForType } from '../types'
import type { Alarm, AlarmType } from '../types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const fleet = getMockFleet()
const device = (i: number) => fleet[i] ?? fleet[0]

function make(
  id: string,
  deviceIndex: number,
  type: AlarmType,
  raisedAgoMs: number,
  extras: Partial<Alarm> = {}
): Alarm {
  const d = device(deviceIndex)
  return {
    id,
    deviceId: d.id,
    deviceName: d.name,
    site: d.site,
    type,
    severity: severityForType(type),
    status: 'active',
    raisedAt: Date.now() - raisedAgoMs,
    lat: d.telemetry.lat,
    lng: d.telemetry.lng,
    ...extras,
  }
}

// Covers every severity and both states, plus the three alarm types the
// firmware raises that weren't modelled before this integration.
const alarms: Alarm[] = [
  make('alm-001', 2, 'sos', 4 * MINUTE, { note: 'SOS button held for 3s' }),
  make('alm-002', 7, 'helmet-removal', 22 * MINUTE),
  make('alm-003', 4, 'near-electric', 48 * MINUTE, { note: 'Proximity to live conductor' }),
  make('alm-004', 6, 'silent', 90 * MINUTE),
  make('alm-005', 9, 'low-power', 2 * HOUR, {
    status: 'resolved',
    resolvedAt: Date.now() - 100 * MINUTE,
    resolvedBy: 'NG_David',
  }),
  make('alm-006', 5, 'fall', 5 * HOUR, {
    status: 'resolved',
    resolvedAt: Date.now() - 4 * HOUR,
    resolvedBy: 'NG_David',
    note: 'False positive — dropped helmet',
  }),
  make('alm-007', 12, 'geofence', 26 * HOUR, {
    status: 'resolved',
    resolvedAt: Date.now() - 25 * HOUR,
  }),
  make('alm-008', 3, 'ascending', 30 * HOUR, {
    status: 'resolved',
    resolvedAt: Date.now() - 29 * HOUR,
  }),
]

export function getMockAlarms(): Alarm[] {
  return alarms.map((a) => ({ ...a }))
}

export function setMockAlarmResolved(id: string, resolved: boolean, by: string): void {
  const found = alarms.find((a) => a.id === id)
  if (!found) return

  found.status = resolved ? 'resolved' : 'active'
  found.resolvedAt = resolved ? Date.now() : undefined
  found.resolvedBy = resolved ? by : undefined
}
