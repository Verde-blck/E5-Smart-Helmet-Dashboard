import { useId } from 'react'

interface CodeFieldProps {
  label: string
  value: string
  onChange: (code: string) => void
  error?: string | null
  autoFocus?: boolean
  disabled?: boolean
}

/**
 * Input for a 6-digit authenticator code, used at sign-in and on the account
 * security page.
 *
 * One field rather than six boxes: pasting works, the phone's number pad
 * opens, and iOS/Android can autofill it (autoComplete="one-time-code").
 * Anything that isn't a digit is dropped, so a code pasted as "123 456"
 * still works.
 */
export function CodeField({ label, value, onChange, error, autoFocus, disabled }: CodeFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-[#1A2B28]">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="000000"
        autoFocus={autoFocus}
        // Read-only rather than disabled while checking: disabling drops focus,
        // and after a wrong code the user should be able to type straight away.
        readOnly={disabled}
        aria-busy={disabled || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={
          'block w-full rounded-lg border bg-white py-3 text-center font-mono text-2xl tracking-[0.5em] text-[#1A2B28] ' +
          'placeholder:text-[#1A2B28]/20 transition-[border-color,box-shadow] duration-150 ' +
          'focus:border-brand-primary focus:outline-none focus:ring-[3px] focus:ring-[#A3E2D7] read-only:opacity-60 ' +
          (error ? 'border-red-600' : 'border-[#1A2B28]/15 hover:border-[#1A2B28]/30')
        }
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/** User-facing message for a failed code, shared by every place that asks for one. */
export function codeErrorMessage(status: number | undefined): string {
  if (status === 401 || status === 400) {
    return 'That code didn’t work. Codes change every 30 seconds, so enter the one showing now.'
  }
  if (status === 429) return 'Too many attempts. Wait a minute, then try again.'
  return 'Could not reach the server. Check your connection and try again.'
}
