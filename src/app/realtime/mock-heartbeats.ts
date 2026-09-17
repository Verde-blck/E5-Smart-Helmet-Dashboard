import { queryClient } from '@/app/providers/query-client'
import { useAuthStore } from '@/shared/store/authStore'
import { useConnectionStore } from '@/shared/store/connectionStore'
import { tickMockFleet } from '@/modules/devices/api/devices.mock'
import { routeEvent } from './socket-router'

const TICK_MS = 5_000

/**
 * Drives the mock fleet through the real socket-router path so the whole
 * event → cache → derived-presence chain is exercised with no backend.
 *
 * Without this, mock timestamps are frozen at import and every helmet decays
 * to 'offline' 90 seconds after the page loads.
 */
export function startMockHeartbeats(): () => void {
  let tick = 0
  useConnectionStore.getState().set('live')

  const id = setInterval(() => {
    const tenantId = useAuthStore.getState().tenant?.id
    if (!tenantId) return

    tick += 1
    for (const device of tickMockFleet(tick)) {
      routeEvent(queryClient, tenantId, {
        type: 'device.heartbeat',
        deviceId: device.id,
        ts: device.lastSeenAt,
        telemetry: device.telemetry,
      })
    }
  }, TICK_MS)

  return () => {
    clearInterval(id)
    useConnectionStore.getState().set('offline')
  }
}
