import type { QueryClient } from '@tanstack/react-query'
import { qk } from '@/shared/lib/query-keys'
import type { Device, Telemetry } from '@/modules/devices/types'
import type { AlarmSeverity } from '@/modules/alarms/types'

export type ServerEvent =
  | {
      type: 'device.heartbeat'
      deviceId: string
      ts: number
      /** Partial by design — a helmet sends what it has. See Telemetry. */
      telemetry: Telemetry
    }
  | { type: 'device.alarm'; deviceId: string; severity: AlarmSeverity | null }
  | { type: 'alarm.raised'; alarmId: string; deviceId: string }
  | { type: 'media.ready'; deviceId: string; mediaId: string }

function isServerEvent(value: unknown): value is ServerEvent {
  return typeof value === 'object' && value !== null && 'type' in value
}

/**
 * Two rules decide setQueryData vs invalidateQueries:
 *
 *  - High-frequency events with a complete payload (heartbeats) are patched
 *    directly. Fifteen helmets at 2/min is 30 refetches a minute otherwise.
 *  - Low-frequency events implying joined data (alarm raised, media ready) are
 *    invalidated, because the socket payload lacks the enrichment the list
 *    view needs and a half-built record renders subtly wrong.
 *
 * Note what is NOT here: invalidateQueries({ queryKey: ['devices'] }). Query
 * filters are prefix matches, so that also invalidates ['devices', id] — it
 * throws away the patch written the line above and refetches the whole fleet.
 */
export function routeEvent(qc: QueryClient, tenantId: string, incoming: unknown) {
  if (!isServerEvent(incoming)) return
  const event = incoming

  const patchDevice = (deviceId: string, apply: (device: Device) => Device) => {
    qc.setQueryData<Device[]>(qk.devices.all(tenantId), (prev) =>
      prev?.map((d) => (d.id === deviceId ? apply(d) : d))
    )
    qc.setQueryData<Device>(qk.devices.detail(tenantId, deviceId), (prev) =>
      prev ? apply(prev) : prev
    )
  }

  switch (event.type) {
    case 'device.heartbeat':
      patchDevice(event.deviceId, (device) => ({
        ...device,
        lastSeenAt: event.ts,
        // Merged, not replaced: a heartbeat carrying only battery must not
        // wipe the last known GPS fix.
        telemetry: { ...device.telemetry, ...event.telemetry },
      }))
      break

    case 'device.alarm':
      patchDevice(event.deviceId, (device) => ({ ...device, activeAlarm: event.severity }))
      qc.invalidateQueries({ queryKey: qk.alarms.all(tenantId) })
      break

    case 'alarm.raised':
      qc.invalidateQueries({ queryKey: qk.alarms.all(tenantId) })
      qc.invalidateQueries({ queryKey: qk.devices.detail(tenantId, event.deviceId) })
      break

    case 'media.ready':
      // One prefix covers every filtered list — photos, videos, per-device.
      qc.invalidateQueries({ queryKey: qk.media.all(tenantId) })
      break
  }
}
