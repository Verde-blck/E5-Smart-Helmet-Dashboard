import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { useAuthStore } from '@/shared/store/authStore'

const CHANGE_PASSWORD_PATH = '/change-password'
export const SETUP_2FA_PATH = '/setup-2fa'

/** Authentication only. Per-module authorisation is ProtectedRoute's job. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword)
  const mustSetup2fa = useAuthStore((s) => s.user?.mustSetup2fa)
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

  // The company requires two-factor sign-in and this account hasn't set it
  // up. The backend refuses everything else until it has, so go straight to
  // the setup screen rather than showing pages full of errors.
  if (mustSetup2fa && location.pathname !== SETUP_2FA_PATH && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={SETUP_2FA_PATH} replace />
  }

  return <>{children}</>
}
