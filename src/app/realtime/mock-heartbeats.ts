import { queryClient } from '@/app/providers/query-client'
import { useAuthStore } from '@/shared/store/authStore'
import { useConnectionStore } from '@/shared/store/connectionStore'
import { tickMockFleet } from '@/modules/devices/api/devices.mock'
import { routeEvent } from './socket-router'

const TICK_MS = 5_000

// Without simulated heartbeats, mock timestamps freeze at import and every helmet decays to
// offline.
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
