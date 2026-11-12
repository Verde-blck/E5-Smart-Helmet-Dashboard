import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fetchBranding } from '@/modules/profile/api/profile.api'
import { withTimeout } from '@/shared/lib/withTimeout'
import { AuthLayout, SubmitButton, authLink } from './components/AuthLayout'

// The backend can't send reset emails, so administrators reset passwords. This page gets the request
// to them, and the user then sets their own password at the next sign-in.
export function ForgotPasswordPage() {
  const [supportEmail, setSupportEmail] = useState<string | null | undefined>(undefined)
  const [companyName, setCompanyName] = useState('E5 Energy')
  const [username, setUsername] = useState('')
  const [sent, setSent] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [unreachable, setUnreachable] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setSupportEmail(undefined)
    setUnreachable(false)
    withTimeout(fetchBranding(), 8_000)
      .then((b) => {
        if (cancelled) return
        setSupportEmail(b.supportEmail ?? null)
        setCompanyName(b.name)
      })
      .catch(() => {
        if (cancelled) return
        setSupportEmail(null)
        setUnreachable(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  function request(event: FormEvent) {
    event.preventDefault()
    if (!username.trim()) {
      setUsernameError('Enter your username.')
      return
    }
    if (!supportEmail) return
    const subject = `Password reset request: ${username.trim()}`
    const body = [
      'Hello,',
      '',
      `Please reset the password for my ${companyName} command centre account.`,
      '',
      `Username: ${username.trim()}`,
      '',
      'Thank you.',
    ].join('\n')
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <AuthLayout
      title="Forgotten your password?"
      subtitle="Your administrator resets it, then you choose a new one the next time you sign in."
      footer={
        <p>
          Remembered it?{' '}
          <Link to="/login" className={authLink}>
            Back to sign in
          </Link>
        </p>
      }
    >
      {supportEmail === undefined ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : supportEmail ? (
        <form onSubmit={request} noValidate>
          <label htmlFor="reset-username" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">
            Your username
          </label>
          <input
            id="reset-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (usernameError) setUsernameError(null)
            }}
            autoComplete="username"
            autoFocus
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={usernameError ? 'reset-username-error' : undefined}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${usernameError ? 'border-red-400' : 'border-slate-300'}`}
          />
          <p id="reset-username-error" role={usernameError ? 'alert' : undefined} className="mb-4 mt-1 min-h-[1rem] text-xs text-red-600">
            {usernameError}
          </p>
          <SubmitButton busy={false} busyLabel="">
            Email {supportEmail}
          </SubmitButton>
          {sent ? (
            <p role="status" className="mt-3 text-sm text-slate-600">
              Your email app should have opened with the request ready to send. Once your password
              has been reset, sign in with the temporary password you’re given.
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              This opens your email app with a ready-written request to {companyName} support.
            </p>
          )}
        </form>
      ) : (
        <div className="text-sm text-slate-600">
          {unreachable && (
            <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">
              We couldn’t reach the server just now.{' '}
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-medium underline underline-offset-2">
                Try again
              </button>
            </p>
          )}
          <p>
            Ask your administrator to reset your password. Once they have, sign in with the temporary
            password they give you, and you’ll be asked to choose your own.
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
