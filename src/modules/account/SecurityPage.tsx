import { useState, type FormEvent, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  knownTwoFactorState,
  startTwoFactorSetup,
  statusOf,
  type TwoFactorSetup,
} from '@/modules/auth/api/auth.api'
import { CodeField, codeErrorMessage } from '@/modules/auth/components/CodeField'

type Mode =
  | { kind: 'idle' }
  | { kind: 'loading-setup' }
  | { kind: 'setup'; setup: TwoFactorSetup }
  | { kind: 'disable' }

/**
 * Account security: lets the signed-in user turn two-factor authentication on
 * or off for their own account. Available to everyone, so no permission guard.
 */
export function SecurityPage() {
  const { user } = useAuth()
  const username = user?.username ?? ''

  const [enabled, setEnabled] = useState<boolean | null>(() => knownTwoFactorState(username))
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [notice, setNotice] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  async function beginSetup() {
    setNotice(null)
    setPageError(null)
    setMode({ kind: 'loading-setup' })
    try {
      setMode({ kind: 'setup', setup: await startTwoFactorSetup(username) })
    } catch {
      setPageError('Could not start setup. Check your connection and try again.')
      setMode({ kind: 'idle' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl">Account security</h1>
      <p className="mt-1 text-sm text-slate-600">Settings for how you sign in as {username}.</p>

      {notice && (
        <p role="status" className="mt-5 rounded-lg border border-brand-primary/25 bg-brand-primary/5 px-4 py-3 text-sm text-slate-800">
          {notice}
        </p>
      )}
      {pageError && (
        <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError}
        </p>
      )}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base">Two-factor authentication</h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              After your password, sign-in also asks for a 6-digit code from Google Authenticator,
              Microsoft Authenticator or a similar app on your phone.
            </p>
          </div>
          <StatusBadge enabled={enabled} />
        </div>

        <div className="px-5 py-4">
          {mode.kind === 'idle' && (
            <IdleActions
              enabled={enabled}
              onEnable={beginSetup}
              onDisable={() => {
                setNotice(null)
                setPageError(null)
                setMode({ kind: 'disable' })
              }}
            />
          )}

          {mode.kind === 'loading-setup' && (
            <p className="text-sm text-slate-600" aria-live="polite">
              Preparing your setup code…
            </p>
          )}

          {mode.kind === 'setup' && (
            <SetupFlow
              setup={mode.setup}
              username={username}
              onCancel={() => setMode({ kind: 'idle' })}
              onDone={() => {
                setEnabled(true)
                setMode({ kind: 'idle' })
                setNotice('Two-factor authentication is on. You’ll be asked for a code the next time you sign in.')
              }}
            />
          )}

          {mode.kind === 'disable' && (
            <DisableFlow
              username={username}
              onCancel={() => setMode({ kind: 'idle' })}
              onDone={() => {
                setEnabled(false)
                setMode({ kind: 'idle' })
                setNotice('Two-factor authentication is off. Sign-in now needs only your password.')
              }}
            />
          )}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

function StatusBadge({ enabled }: { enabled: boolean | null }) {
  const [label, style] =
    enabled === true
      ? ['On', 'bg-brand-primary/10 text-brand-primary']
      : enabled === false
        ? ['Off', 'bg-slate-100 text-slate-600']
        : ['Unknown', 'bg-slate-100 text-slate-500']
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>
  )
}

/**
 * The status comes from how this account last signed in on this browser,
 * because the API has no status endpoint. When we haven't seen it, both
 * actions are offered rather than guessing.
 */
function IdleActions({
  enabled,
  onEnable,
  onDisable,
}: {
  enabled: boolean | null
  onEnable: () => void
  onDisable: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {enabled !== true && (
        <PrimaryButton onClick={onEnable}>
          {enabled === null ? 'Set up two-factor authentication' : 'Turn on'}
        </PrimaryButton>
      )}
      {enabled !== false && <SecondaryButton onClick={onDisable}>Turn off</SecondaryButton>}
      {enabled === null && (
        <p className="basis-full text-xs text-slate-500">
          We couldn’t confirm whether it’s on for your account. Signing out and back in will update this.
        </p>
      )}
    </div>
  )
}

function SetupFlow({
  setup,
  username,
  onCancel,
  onDone,
}: {
  setup: TwoFactorSetup
  username: string
  onCancel: () => void
  onDone: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await confirmTwoFactorSetup(username, code)
      onDone()
    } catch (err: unknown) {
      setError(codeErrorMessage(statusOf(err)))
      setCode('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ol className="space-y-6">
        <Step n={1} title="Scan this code with your authenticator app">
          <div className="mt-3 flex flex-wrap items-start gap-5">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <QRCodeSVG
                value={setup.otpAuthUrl}
                size={168}
                level="M"
                title="QR code for your authenticator app"
              />
            </div>
            <div className="min-w-0 max-w-xs text-sm text-slate-600">
              <p>In the app, choose to add an account, then scan the QR code.</p>
              <p className="mt-3">Can’t scan it? Enter this key instead:</p>
              <ManualKey secret={setup.secret} />
            </div>
          </div>
        </Step>

        <Step n={2} title="Enter the 6-digit code the app now shows">
          <div className="mt-3 max-w-[16rem]">
            <CodeField
              label="Code from the app"
              value={code}
              onChange={(next) => {
                setCode(next)
                if (error) setError(null)
              }}
              error={error}
              disabled={busy}
            />
          </div>
          <p className="text-xs text-slate-500">
            Keep the app on your phone. If you lose access to it, you won’t be able to sign in until
            an administrator resets two-factor authentication for you.
          </p>
        </Step>
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Confirming…' : 'Confirm and turn on'}
        </PrimaryButton>
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  )
}

function DisableFlow({
  username,
  onCancel,
  onDone,
}: {
  username: string
  onCancel: () => void
  onDone: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await disableTwoFactor(username, code)
      onDone()
    } catch (err: unknown) {
      setError(codeErrorMessage(statusOf(err)))
      setCode('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-sm text-slate-600">
        To confirm it’s you, enter the current code from your authenticator app. Afterwards, sign-in
        will need only your password.
      </p>
      <div className="mt-4 max-w-[16rem]">
        <CodeField
          label="Code from the app"
          value={code}
          onChange={(next) => {
            setCode(next)
            if (error) setError(null)
          }}
          error={error}
          autoFocus
          disabled={busy}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-60"
        >
          {busy ? 'Turning off…' : 'Turn off two-factor authentication'}
        </button>
        <SecondaryButton onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  )
}

/** The key in groups of four, which is far easier to type than one long run. */
function ManualKey({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false)
  const grouped = secret.replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') ?? secret

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret.replace(/\s+/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked; the key is selectable, so it can still be copied by hand.
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="select-all break-all rounded-md bg-slate-100 px-2.5 py-1.5 font-mono text-[0.8125rem] tracking-wide text-slate-800">
        {grouped}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:opacity-60"
    >
      {children}
    </button>
  )
}
