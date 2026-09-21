import { clearSession } from '@/modules/auth/api/auth.api'
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
  // No logout endpoint exists, so notifyBackend is a no-op for now. Kept in
  // the signature so call sites don't change when one is added.
  void notifyBackend

  clearSession()
  stopRealtime()
  useAuthStore.getState().clearUser()
  queryClient.clear()
}
