import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import { login, registerAccount } from './api/auth.api'
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

      // Registration returns no token, so sign in straight away rather than
      // making someone type the same details twice.
      const user = await login({ username: values.username, password: values.password })
      setUser(user)
      navigate('/', { replace: true })
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined

      setFormError(
        status === 409
          ? 'That username is already taken. Try another.'
          : 'Could not create the account. Check your connection and try again.'
      )
    }
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
