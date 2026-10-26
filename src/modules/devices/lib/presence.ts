import type { Device, DeviceView, Presence } from '../types'

export const HEARTBEAT_MS = 30_000

export const ONLINE_WINDOW_MS = 120_000

export const DEGRADED_WINDOW_MS = 10 * 60_000

// Presence comes from time since last contact, not an open socket: SIM helmets drop routinely, and
// socket-based status would make the alarm feed noise.
export function derivePresence(lastSeenAt: number, now: number): Presence {
  const age = now - lastSeenAt
  if (age < ONLINE_WINDOW_MS) return 'online'
  if (age < DEGRADED_WINDOW_MS) return 'degraded'
  return 'offline'
}

export function toDeviceView(device: Device, now: number): DeviceView {
  return { ...device, presence: derivePresence(device.lastSeenAt, now) }
}

export function formatLastSeen(lastSeenAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - lastSeenAt) / 1000))
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.floor(hours / 24)}d ago`
}
