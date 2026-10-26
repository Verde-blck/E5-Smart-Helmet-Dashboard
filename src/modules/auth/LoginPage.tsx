import { useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, type AuthUser } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import { login, statusOf, verifyTwoFactorLogin, type TwoFactorChallenge } from './api/auth.api'
import {
  AuthLayout,
  FormError,
  PasswordField,
  SubmitButton,
  UsernameField,
  authLink,
} from './components/AuthLayout'
import { CodeField, codeErrorMessage } from './components/CodeField'

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

  // Set when the password was right but the account has 2FA on.
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)

  const returnTo = (location.state as { from?: string } | null)?.from ?? '/'

  // Someone already signed in shouldn't be looking at a login form.
  if (isAuthenticated) return <Navigate to={returnTo} replace />

  function finish(user: AuthUser) {
    setUser(user)
    navigate(returnTo, { replace: true })
  }

  return challenge ? (
    <CodeStep challenge={challenge} onSignedIn={finish} onBack={() => setChallenge(null)} />
  ) : (
    <PasswordStep onSignedIn={finish} onNeedsCode={setChallenge} />
  )
}

// ---------------------------------------------------------------------------

function PasswordStep({
  onSignedIn,
  onNeedsCode,
}: {
  onSignedIn: (user: AuthUser) => void
  onNeedsCode: (challenge: TwoFactorChallenge) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      const result = await login({ username: values.username, password: values.password })
      if (result.status === 'needs-code') onNeedsCode(result.challenge)
      else onSignedIn(result.user)
    } catch (error: unknown) {
      const status = statusOf(error)
      setFormError(
        status === 401 || status === 403
          ? 'That username and password don’t match. Usernames are case-sensitive.'
          : 'Could not reach the server. Check your connection and try again.'
      )
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to the command centre."
      footer={
        <>
          <p>
            New here?{' '}
            <Link to="/register" className={authLink}>
              Create an account
            </Link>
          </p>
          <p>Forgotten your password? Your administrator can reset it.</p>
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

// ---------------------------------------------------------------------------

function CodeStep({
  challenge,
  onSignedIn,
  onBack,
}: {
  challenge: TwoFactorChallenge
  onSignedIn: (user: AuthUser) => void
  onBack: () => void
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
      setError(codeErrorMessage(statusOf(err)))
      // Clear it so the next code can be typed straight in.
      setCode('')
      setBusy(false)
    }
  }

  function handleChange(next: string) {
    setCode(next)
    if (error) setError(null)
    // Submit as soon as the sixth digit lands, including on paste/autofill.
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
