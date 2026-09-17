import type { Alarm } from '../types'
import { getMockFleet } from '@/modules/devices/api/devices.mock'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const fleet = getMockFleet()
const device = (i: number) => fleet[i] ?? fleet[0]

const alarms: Alarm[] = [
  {
    id: 'alm-001',
    deviceId: device(2).id,
    deviceName: device(2).name,
    type: 'sos',
    severity: 'critical',
    status: 'active',
    raisedAt: Date.now() - 4 * MINUTE,
    lat: device(2).telemetry.lat,
    lng: device(2).telemetry.lng,
    note: 'SOS button held for 3s',
  },
  {
    id: 'alm-002',
    deviceId: device(7).id,
    deviceName: device(7).name,
    type: 'helmet-removal',
    severity: 'warning',
    status: 'active',
    raisedAt: Date.now() - 22 * MINUTE,
  },
  {
    id: 'alm-003',
    deviceId: device(9).id,
    deviceName: device(9).name,
    type: 'low-power',
    severity: 'warning',
    status: 'acknowledged',
    raisedAt: Date.now() - 2 * HOUR,
    acknowledgedAt: Date.now() - 100 * MINUTE,
    acknowledgedBy: 'NG_David',
  },
  {
    id: 'alm-004',
    deviceId: device(5).id,
    deviceName: device(5).name,
    type: 'fall',
    severity: 'critical',
    status: 'resolved',
    raisedAt: Date.now() - 5 * HOUR,
    acknowledgedAt: Date.now() - 295 * MINUTE,
    acknowledgedBy: 'NG_David',
    resolvedAt: Date.now() - 4 * HOUR,
    note: 'False positive — dropped helmet',
  },
  {
    id: 'alm-005',
    deviceId: device(12).id,
    deviceName: device(12).name,
    type: 'geofence',
    severity: 'warning',
    status: 'resolved',
    raisedAt: Date.now() - 26 * HOUR,
    resolvedAt: Date.now() - 25 * HOUR,
  },
]

export function getMockAlarms(): Alarm[] {
  return alarms.map((a) => ({ ...a }))
}

export function acknowledgeMockAlarm(id: string, by: string): Alarm | undefined {
  const found = alarms.find((a) => a.id === id)
  if (!found || found.status !== 'active') return found ? { ...found } : undefined

  found.status = 'acknowledged'
  found.acknowledgedAt = Date.now()
  found.acknowledgedBy = by
  return { ...found }
}
