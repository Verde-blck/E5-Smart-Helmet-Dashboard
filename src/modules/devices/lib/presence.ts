import type { Device, DeviceView, Presence } from '../types'

export const HEARTBEAT_MS = 30_000

/**
 * A helmet on a SIM will drop routinely — cell handoff, a basement, a tunnel.
 * If "online" means "we hold an open socket" the alarm feed becomes noise
 * within a day and operators stop reading it. Presence is a function of time
 * since last contact instead.
 */
export function derivePresence(lastSeenAt: number, now: number): Presence {
  const age = now - lastSeenAt
  if (age < HEARTBEAT_MS * 3) return 'online' // up to two missed beats
  if (age < HEARTBEAT_MS * 10) return 'degraded' // ~5 min, likely coverage gap
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
