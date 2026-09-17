import { env } from '@/config/env'
import { apiClient } from './api-client'
import { queryClient } from '@/app/providers/query-client'
import { useAuthStore } from '@/shared/store/authStore'
import { stopRealtime } from '@/app/realtime/realtime'

/**
 * The only correct way to end a session. Clearing the auth store alone leaves
 * the socket open and the previous user's fleet sitting in the query cache,
 * where the next person to log in on that browser sees it flash before the
 * refetch lands.
 */
export async function endSession({ notifyBackend = false } = {}) {
  if (notifyBackend && !env.useMocks) {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Cookie may already be expired or revoked — local teardown still runs.
    }
  }

  stopRealtime()
  useAuthStore.getState().clearUser()
  queryClient.clear()
}
