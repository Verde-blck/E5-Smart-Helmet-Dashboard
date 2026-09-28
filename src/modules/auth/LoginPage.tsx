import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import { login } from './api/auth.api'
import {
  AuthLayout,
  FormError,
  PasswordField,
  SubmitButton,
  UsernameField,
  authLink,
} from './components/AuthLayout'

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const setUser = useAuthStore((s) => s.setUser)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const returnTo = (location.state as { from?: string } | null)?.from ?? '/'

  // Someone already signed in shouldn't be looking at a login form.
  if (isAuthenticated) return <Navigate to={returnTo} replace />

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      const user = await login({ username: values.username, password: values.password })
      setUser(user)
      navigate(returnTo, { replace: true })
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined

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
