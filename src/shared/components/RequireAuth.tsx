import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { useAuthStore } from '@/shared/store/authStore'

const CHANGE_PASSWORD_PATH = '/change-password'
export const SETUP_2FA_PATH = '/setup-2fa'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword)
  const mustSetup2fa = useAuthStore((s) => s.user?.mustSetup2fa)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Checking the path stops the redirect looping on the change-password screen.
  if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  if (mustSetup2fa && location.pathname !== SETUP_2FA_PATH && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={SETUP_2FA_PATH} replace />
  }

  return <>{children}</>
}
