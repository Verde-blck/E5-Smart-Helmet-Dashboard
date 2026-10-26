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
      // Events missed while the socket was down are gone; a blanket invalidation is cheap at this
      // fleet size.
      const tenantId = currentTenantId()
      if (tenantId) queryClient.invalidateQueries({ queryKey: qk.tenant(tenantId) })
    },
  })
}

export function stopRealtime() {
  wsClient.disconnect()
}
