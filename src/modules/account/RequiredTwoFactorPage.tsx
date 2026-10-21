import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { useAuthStore } from '@/shared/store/authStore'
import { endSession } from '@/shared/lib/session'
import { AuthLayout } from '@/modules/auth/components/AuthLayout'
import { refreshSession, startTwoFactorSetup, type TwoFactorSetup } from '@/modules/auth/api/auth.api'
import { SetupFlow } from './SecurityPage'

/**
 * The company requires two-factor sign-in and this account hasn't set it up.
 * Until it has, the backend refuses everything else, so this is the only
 * screen: scan the QR code, type the code, and carry on into the dashboard.
 */
export function RequiredTwoFactorPage() {
  const { user } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const username = user?.username ?? ''
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.mustSetup2fa) return
    let cancelled = false
    startTwoFactorSetup(username)
      .then((s) => !cancelled && setSetup(s))
      .catch(() => !cancelled && setError('Could not start setup. Check your connection and reload the page.'))
    return () => {
      cancelled = true
    }
  }, [username, user?.mustSetup2fa])

  // Nothing to do here once it's set up (or if it never was required).
  if (!user?.mustSetup2fa) return <Navigate to="/" replace />

  return (
    <AuthLayout
      title="Set up two-factor sign-in"
      subtitle="Your company requires it for every account. It takes about a minute."
      footer={
        <p>
          Not now?{' '}
          <button type="button" onClick={() => void endSession()} className="font-medium underline underline-offset-2">
            Sign out
          </button>
        </p>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : !setup ? (
        <p className="text-sm text-slate-600" aria-live="polite">
          Preparing your setup code…
        </p>
      ) : (
        <SetupFlow
          setup={setup}
          username={username}
          onCancel={() => void endSession()}
          onDone={() => {
            // Unblock straight away, then confirm with the backend.
            setUser({ ...user, mustSetup2fa: false, twoFactorEnabled: true })
            void refreshSession()
            navigate('/', { replace: true })
          }}
        />
      )}
    </AuthLayout>
  )
}
