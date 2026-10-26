import { clearSession } from '@/modules/auth/api/auth.api'
import { queryClient } from '@/app/providers/query-client'
import { useAuthStore } from '@/shared/store/authStore'
import { stopRealtime } from '@/app/realtime/realtime'

// Clearing the store alone leaves the socket open and the old fleet in the cache.
export async function endSession({ notifyBackend = false } = {}) {
  void notifyBackend

  clearSession()
  stopRealtime()
  useAuthStore.getState().clearUser()
  queryClient.clear()
}
