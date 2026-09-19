import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { useAuth } from '@/shared/hooks/useAuth'
import { env } from '@/config/env'
import { login } from './api/auth.api'

const schema = z.object({
  // Deliberately permissive: usernames are whatever the employer already
  // issues — a badge number, an initial-plus-surname — and rejecting a real
  // one at the login screen is a support call. The backend decides validity.
  username: z.string().trim().min(2, 'Enter your username'),
  password: z.string().min(1, 'Required'),
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
      const user = await login({ username: values.username.trim(), password: values.password })
      setUser(user)
      // RequireAuth diverts to the change-password screen when the account is
      // flagged, so there's nothing to branch on here.
      navigate(returnTo, { replace: true })
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined
      setFormError(
        status === 401
          ? 'Incorrect username or password.'
          : 'Could not sign in. Please try again.'
      )
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6"
      >
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Sign in</h1>
        <p className="mb-4 text-xs text-slate-500">
          Accounts are created by your administrator.
        </p>

        <label className="mb-1 block text-xs text-slate-500">Username</label>
        <input
          {...register('username')}
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          className="mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.username && (
          <p className="mb-2 text-xs text-red-600">{errors.username.message}</p>
        )}

        <label className="mb-1 block text-xs text-slate-500">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.password && (
          <p className="mb-2 text-xs text-red-600">{errors.password.message}</p>
        )}

        {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          Forgotten your password? Your administrator can reset it.
        </p>

        {env.useMocks && (
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Mocks on — any password works. Try ADM-001 (admin), OP-014
            (restricted role) or NEW-001 (forced password change).
          </p>
        )}
      </form>
    </div>
  )
}
