import type { QueryClient } from '@tanstack/react-query'
import { qk } from '@/shared/lib/query-keys'
import type { Device, Telemetry } from '@/modules/devices/types'
import type { AlarmSeverity } from '@/modules/alarms/types'

export type ServerEvent =
  | {
      type: 'device.heartbeat'
      deviceId: string
      ts: number
      telemetry: Telemetry
    }
  | { type: 'device.alarm'; deviceId: string; severity: AlarmSeverity | null }
  | { type: 'alarm.raised'; alarmId: string; deviceId: string }
  | { type: 'media.ready'; deviceId: string; mediaId: string }

function isServerEvent(value: unknown): value is ServerEvent {
  return typeof value === 'object' && value !== null && 'type' in value
}

// Heartbeats are patched into the cache (15 helmets at 2/min would be 30 refetches a minute); rarer
// events invalidate.
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
      qc.invalidateQueries({ queryKey: qk.media.all(tenantId) })
      break
  }
}
