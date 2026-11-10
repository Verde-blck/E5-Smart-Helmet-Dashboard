import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, type AuthUser } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  TOO_MANY_ATTEMPTS,
  challengeProblemNotice,
  isChallengeProblem,
  isTooManyAttempts,
  login,
  statusOf,
  verifyTwoFactorLogin,
  type TwoFactorChallenge,
} from './api/auth.api'
import {
  AuthLayout,
  FormError,
  PasswordField,
  SubmitButton,
  UsernameField,
  authLink,
} from './components/AuthLayout'
import { CodeField, codeErrorMessage } from './components/CodeField'

// A 401 is a wrong username or password; a 403 means the account can't sign in right now.
function signInErrorMessage(error: unknown): string {
  if (isTooManyAttempts(error)) return TOO_MANY_ATTEMPTS
  const status = statusOf(error)
  if (status === 401) return 'That username and password don’t match. Usernames are case-sensitive.'
  if (isChallengeProblem(error)) return 'Sign-in couldn’t start the verification step. Please try again.'
  if (status === 403) {
    // A refusal at sign-in is usually a server or configuration problem (such as an address the
    // server doesn't accept), not the password, so say that unless the backend gives its reason.
    const said = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    return said
      ? `The server refused the sign-in: ${said.replace(/\.$/, '')}.`
      : 'The server refused the sign-in. This is usually a server or configuration problem, not your password. Try again shortly, or contact your administrator.'
  }
  if (status && status >= 500) return 'Something went wrong on the server. Try again in a moment.'
  return 'Could not reach the server. Check your connection and try again.'
}

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const setUser = useAuthStore((s) => s.setUser)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const returnTo = (location.state as { from?: string } | null)?.from ?? '/'

  if (isAuthenticated) return <Navigate to={returnTo} replace />

  function finish(user: AuthUser) {
    setUser(user)
    navigate(returnTo, { replace: true })
  }

  return challenge ? (
    <CodeStep
      challenge={challenge}
      onSignedIn={finish}
      onBack={() => setChallenge(null)}
      onExpired={(message) => {
        setChallenge(null)
        setNotice(message)
      }}
    />
  ) : (
    <PasswordStep
      notice={notice}
      onSignedIn={finish}
      onNeedsCode={(c) => {
        setNotice(null)
        setChallenge(c)
      }}
    />
  )
}

function PasswordStep({
  notice,
  onSignedIn,
  onNeedsCode,
}: {
  notice: string | null
  onSignedIn: (user: AuthUser) => void
  onNeedsCode: (challenge: TwoFactorChallenge) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [formError, setFormError] = useState<string | null>(() => {
    if (notice) return notice
    try {
      return sessionStorage.getItem('e5.signedOut') === 'expired'
        ? 'Your session expired. Please sign in again.'
        : null
    } catch {
      return null
    }
  })
  // Cleared in an effect, not the initialiser: React runs initialisers twice in development.
  useEffect(() => {
    try {
      sessionStorage.removeItem('e5.signedOut')
    } catch {
      // Nothing to clear.
    }
  }, [])

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      const result = await login({ username: values.username, password: values.password })
      if (result.status === 'needs-code') onNeedsCode(result.challenge)
      else onSignedIn(result.user)
    } catch (error: unknown) {
      setFormError(signInErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to the command centre."
      footer={
        <>
          <p>
            <Link to="/forgot-password" className={authLink}>
              Forgotten your password?
            </Link>
          </p>
          <p>Need an account? Your administrator can create one.</p>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError message={formError} />

        <UsernameField
          label="Username"
          registration={register('username')}
          error={errors.username?.message}
          autoComplete="username"
        />
        <PasswordField
          label="Password"
          registration={register('password')}
          error={errors.password?.message}
          autoComplete="current-password"
        />

        <SubmitButton busy={isSubmitting} busyLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}

function CodeStep({
  challenge,
  onSignedIn,
  onBack,
  onExpired,
}: {
  challenge: TwoFactorChallenge
  onSignedIn: (user: AuthUser) => void
  onBack: () => void
  onExpired: (message: string) => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function verify(value: string) {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      onSignedIn(await verifyTwoFactorLogin(challenge, value))
    } catch (err: unknown) {
      if (isChallengeProblem(err)) {
        onExpired(challengeProblemNotice(err))
        return
      }
      setError(isTooManyAttempts(err) ? TOO_MANY_ATTEMPTS : codeErrorMessage(statusOf(err)))
      setCode('')
      setBusy(false)
    }
  }

  function handleChange(next: string) {
    setCode(next)
    if (error) setError(null)
    if (next.length === 6) void verify(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (code.length === 6) void verify(code)
    else setError('Enter all 6 digits.')
  }

  return (
    <AuthLayout
      title="Enter your code"
      subtitle={`Open your authenticator app and enter the 6-digit code for ${challenge.username}.`}
      footer={
        <p>
          Lost access to your authenticator app? Your administrator can reset it.
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <CodeField
          label="Authentication code"
          value={code}
          onChange={handleChange}
          error={error}
          autoFocus
          disabled={busy}
        />

        <SubmitButton busy={busy} busyLabel="Verifying…">
          Verify
        </SubmitButton>

        <button
          type="button"
          onClick={onBack}
          className={`mt-4 block w-full text-center text-[0.8125rem] ${authLink}`}
        >
          Use a different account
        </button>
      </form>
    </AuthLayout>
  )
}
