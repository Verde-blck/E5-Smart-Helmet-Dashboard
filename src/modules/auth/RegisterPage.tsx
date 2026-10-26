import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import { login, registerAccount, statusOf } from './api/auth.api'
import {
  AuthLayout,
  FormError,
  PasswordField,
  SubmitButton,
  UsernameField,
  authLink,
} from './components/AuthLayout'

const schema = z
  .object({
    username: z.string().trim().min(2, 'Choose a username of at least 2 characters'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Passwords don’t match',
  })

type FormValues = z.infer<typeof schema>

/** Sign-up is closed: the backend only allows it while no accounts exist. */
const CLOSED =
  'New accounts are created by an administrator. Ask yours to set one up for you.'

/**
 * Why sign-up failed, in words that help.
 *
 * The backend only allows sign-up while there are no accounts at all; after
 * that, administrators create them. It may refuse with 403 or 409, and 409 is
 * also used for a username that's taken, so the body decides which it is.
 */
function registerErrorMessage(error: unknown): string {
  const res = (error as {
    response?: { status?: number; data?: { error?: string; message?: string } }
  })?.response

  // No response at all: a real connection problem.
  if (!res) return 'Could not reach the server. Check your connection and try again.'

  const status = statusOf(error)
  const said = `${res.data?.error ?? ''} ${res.data?.message ?? ''}`.toLowerCase()
  const closed = /regist|closed|disabled|not allowed|no accounts|already exist|admin/.test(said)
  const taken = /taken|in use|already registered|username/.test(said) && !closed

  if (status === 409) return taken || !said.trim() ? 'That username is already taken. Try another.' : CLOSED
  if (status === 401 || status === 403 || status === 404 || status === 405) return CLOSED
  if (status === 400 && res.data?.message) return sentence(res.data.message)
  if (status && status >= 500) return 'Something went wrong on the server. Try again in a moment.'
  return res.data?.message ? sentence(res.data.message) : 'Could not create the account. Try again.'
}

/** "password must be at least 8 characters" → "Password must be at least 8 characters." */
function sentence(text: string): string {
  const t = text.trim()
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.')
}

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const setUser = useAuthStore((s) => s.setUser)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      await registerAccount({ username: values.username, password: values.password })
    } catch (error: unknown) {
      setFormError(registerErrorMessage(error))
      return
    }

    // Registration returns no token, so sign in straight away rather than
    // making someone type the same details twice. If that fails, the account
    // still exists, so send them to the sign-in page rather than showing an
    // error that suggests it wasn't created.
    try {
      const result = await login({ username: values.username, password: values.password })
      if (result.status === 'signed-in') {
        setUser(result.user)
        navigate('/', { replace: true })
        return
      }
    } catch {
      // Fall through to the sign-in page.
    }
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Choose a username and password for the command centre."
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className={authLink}>
            Sign in
          </Link>
        </p>
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
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          registration={register('confirm')}
          error={errors.confirm?.message}
          autoComplete="new-password"
        />

        <SubmitButton busy={isSubmitting} busyLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
