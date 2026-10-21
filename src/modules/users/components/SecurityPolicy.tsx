import { useState } from 'react'
import { useRequire2fa } from '../hooks/useAdmins'

/**
 * The company rule for two-factor sign-in. When it's on, anyone without 2FA
 * is taken straight to setup at their next sign-in (and signed-in users on
 * their next action), and nobody can turn theirs off.
 */
export function SecurityPolicy({ canEdit }: { canEdit: boolean }) {
  const { require2fa, isLoading, isError, save } = useRequire2fa()
  const [confirming, setConfirming] = useState(false)

  if (isLoading || isError) return null

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-800">Require two-factor sign-in for everyone</p>
          <p className="text-xs text-slate-500">
            {require2fa
              ? 'On. Accounts without it have to set it up before they can use the dashboard, and nobody can turn theirs off.'
              : 'Off. Each person chooses whether to use it.'}
          </p>
        </div>
        {canEdit && !confirming && (
          <button
            role="switch"
            aria-checked={require2fa}
            aria-label="Require two-factor sign-in for everyone"
            onClick={() => (require2fa ? save.mutate(false) : setConfirming(true))}
            disabled={save.isPending}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              require2fa ? 'bg-brand-primary' : 'bg-slate-300'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                require2fa ? 'left-[1.375rem]' : 'left-0.5'
              }`}
            />
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p>
            Everyone without two-factor sign-in will have to set it up straight away, including people
            signed in now. They’ll need an authenticator app on their phone.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                save.mutate(true)
                setConfirming(false)
              }}
              className="rounded bg-amber-600 px-2.5 py-1 font-medium text-white hover:bg-amber-700"
            >
              Require it
            </button>
            <button onClick={() => setConfirming(false)} className="px-2 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
      {save.isError && <p className="mt-2 text-xs text-red-600">Couldn’t save. Try again.</p>}
    </section>
  )
}
