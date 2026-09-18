import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { useAuthStore } from '@/shared/store/authStore'

const CHANGE_PASSWORD_PATH = '/change-password'

/** Authentication only. Per-module authorisation is ProtectedRoute's job. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword)
  const location = useLocation()

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // An admin-issued password is known by two people until it's changed, so
  // nothing else in the app renders until it has been. Checking the path here
  // is what stops the redirect looping on the change-password screen itself.
  if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  return <>{children}</>
}
