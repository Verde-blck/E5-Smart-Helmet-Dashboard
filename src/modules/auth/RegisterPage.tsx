import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import { useTenant } from '@/shared/hooks/useTenant'
import { login, registerAccount } from './api/auth.api'

const schema = z
  .object({
    username: z.string().trim().min(2, 'Choose a username of at least 2 characters'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: "Passwords don't match",
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
  const tenant = useTenant()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      await registerAccount({ username: values.username, password: values.password })

      // Registration returns no token, so sign in straight away rather than
      // making someone type the same details twice.
      const user = await login({ username: values.username.trim(), password: values.password })
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
          : 'Could not create the account. Please try again.'
      )
    }
  }

  const input = 'mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm'

  return (
    <div className="app-canvas flex h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-lg font-semibold text-slate-800">
          Create an account
        </h1>
        <p className="mb-4 text-xs text-slate-500">
          For {tenant?.name ?? 'the command centre'}.
        </p>

        <label className="mb-1 block text-xs text-slate-500">Username</label>
        <input
          {...register('username')}
          autoComplete="username"
          // Mobile keyboards capitalise the first letter by default, and
          // usernames are case-sensitive — so this has to be off.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={input}
        />
        {errors.username && (
          <p className="mb-2 text-xs text-red-600">{errors.username.message}</p>
        )}

        <label className="mb-1 block text-xs text-slate-500">Password</label>
        <input
          {...register('password')}
          type="password"
          autoComplete="new-password"
          className={input}
        />
        {errors.password && (
          <p className="mb-2 text-xs text-red-600">{errors.password.message}</p>
        )}

        <label className="mb-1 block text-xs text-slate-500">Confirm password</label>
        <input
          {...register('confirm')}
          type="password"
          autoComplete="new-password"
          className={input}
        />
        {errors.confirm && (
          <p className="mb-2 text-xs text-red-600">{errors.confirm.message}</p>
        )}

        {formError && <p className="mb-2 text-xs text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-primary py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          Already have one?{' '}
          <Link to="/login" className="text-brand-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
