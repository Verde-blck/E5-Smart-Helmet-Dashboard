import { useAuthStore } from '@/shared/store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return { user, isAuthenticated }
}
