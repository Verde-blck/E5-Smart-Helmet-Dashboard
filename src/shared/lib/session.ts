import { clearSession, logoutEverywhere } from '@/modules/auth/api/auth.api'
import { tokenStore } from '@/shared/lib/token'
import { queryClient } from '@/app/providers/query-client'
import { useAuthStore } from '@/shared/store/authStore'
import { stopRealtime } from '@/app/realtime/realtime'

// Clearing the store alone leaves the socket open and the old fleet in the cache.
export async function endSession({ notifyBackend = false } = {}) {
  const token = notifyBackend ? tokenStore.get() : null
  clearSession()
  logoutEverywhere(token)
  stopRealtime()
  useAuthStore.getState().clearUser()
  queryClient.clear()
}
