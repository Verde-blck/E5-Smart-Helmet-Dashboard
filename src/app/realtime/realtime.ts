import { wsClient } from '@/shared/lib/websocket-client'
import { queryClient } from '@/app/providers/query-client'
import { useAuthStore } from '@/shared/store/authStore'
import { qk } from '@/shared/lib/query-keys'
import { routeEvent } from './socket-router'

function currentTenantId() {
  return useAuthStore.getState().tenant?.id ?? null
}

export function startRealtime() {
  wsClient.connect({
    onMessage: (data) => {
      const tenantId = currentTenantId()
      if (tenantId) routeEvent(queryClient, tenantId, data)
    },
    onReconnect: () => {
      // Events that arrived while the socket was down are gone. At this fleet
      // size a blanket invalidation costs a handful of requests and removes an
      // entire class of "the dashboard was wrong until I refreshed" reports.
      const tenantId = currentTenantId()
      if (tenantId) queryClient.invalidateQueries({ queryKey: qk.tenant(tenantId) })
    },
  })
}

export function stopRealtime() {
  wsClient.disconnect()
}
