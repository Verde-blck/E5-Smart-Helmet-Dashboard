import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { endSession } from '@/shared/lib/session'
import { changeOwnPassword } from './api/auth.api'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter the password you were given'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Those don't match",
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'Choose something different from the password you were given',
    path: ['newPassword'],
  })

type FormValues = z.infer<typeof schema>

/**
 * Rendered outside the app shell, with no navigation, and reached only by
 * redirect from RequireAuth. The point of the forced change is that the
 * administrator who issued the password stops knowing it — so this screen has
 * to be genuinely unskippable rather than a dismissible prompt.
 */
export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      await changeOwnPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      if (user) setUser({ ...user, mustChangePassword: false })
      navigate('/', { replace: true })
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined
      setFormError(
        status === 400 || status === 401
          ? "That current password isn't right."
          : 'Could not change your password. Please try again.'
      )
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6"
      >
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Choose a password</h1>
        <p className="mb-4 text-xs text-slate-500">
          {user?.name ? `${user.name}, y` : 'Y'}our account was set up with a
          temporary password. Pick your own before continuing.
        </p>

        <label className="mb-1 block text-xs text-slate-500">Temporary password</label>
        <input
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          className="mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.currentPassword && (
          <p className="mb-2 text-xs text-red-600">{errors.currentPassword.message}</p>
        )}

        <label className="mb-1 block text-xs text-slate-500">New password</label>
        <input
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          className="mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.newPassword && (
          <p className="mb-2 text-xs text-red-600">{errors.newPassword.message}</p>
        )}

        <label className="mb-1 block text-xs text-slate-500">Confirm new password</label>
        <input
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.confirmPassword && (
          <p className="mb-2 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}

        {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Set password and continue'}
        </button>

        <button
          type="button"
          onClick={async () => {
            await endSession({ notifyBackend: true })
            navigate('/login', { replace: true })
          }}
          className="mt-3 w-full text-center text-[11px] text-slate-400 hover:text-slate-600"
        >
          Sign out instead
        </button>
      </form>
    </div>
  )
}
