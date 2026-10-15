import { useState } from 'react'
import { useRegisterDevice } from '../hooks/useDevices'
import { DEVICE_NAME_MAX } from '../api/devices.api'

/**
 * Device IDs are IMEIs — fifteen digits in practice, but the check is kept
 * loose because the backend doesn't validate at all and a malformed body
 * comes back as a 500 rather than a useful error. Better to catch the obvious
 * mistakes here than to show an operator "Internal Server Error".
 */
function validate(id: string): string | null {
  const trimmed = id.trim()
  if (!trimmed) return 'Enter the device ID printed on the helmet'
  if (!/^\d+$/.test(trimmed)) return 'Device IDs are digits only'
  if (trimmed.length < 10 || trimmed.length > 20) {
    return `That's ${trimmed.length} digits — an IMEI is usually 15`
  }
  return null
}

export function RegisterDeviceForm({ onDone }: { onDone: () => void }) {
  const [deviceId, setDeviceId] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<{ id: string; name: string; named: boolean } | null>(null)
  const register = useRegisterDevice()

  function submit() {
    const problem = validate(deviceId)
    setError(problem)
    setRegistered(null)
    if (problem) return

    register.mutate({ deviceId: deviceId.trim(), name: name.trim() || undefined }, {
      onSuccess: ({ device, named }) => {
        setRegistered({ id: device.id, name: name.trim(), named })
        setDeviceId('')
        setName('')
      },
      onError: () => setError('Could not register that helmet. Check the ID and try again.'),
    })
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-medium text-slate-800">Register a helmet</h2>

      <div className="flex flex-wrap items-start gap-2">
        <input
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onDone()
          }}
          placeholder="866652022956404"
          inputMode="numeric"
          spellCheck={false}
          aria-label="Device ID"
          className="w-56 rounded border border-slate-300 px-2.5 py-1.5 font-mono text-sm"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, DEVICE_NAME_MAX))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onDone()
          }}
          placeholder="Name (optional), e.g. John - Site A"
          aria-label="Helmet name"
          className="w-64 rounded border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={register.isPending}
          className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {register.isPending ? 'Registering…' : 'Register'}
        </button>
        <button
          onClick={onDone}
          className="px-1 py-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          Done
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {registered && (
        <p className="mt-2 text-xs text-emerald-700">
          {/* Registering an existing ID returns it unchanged rather than
              erroring, so the wording covers both cases honestly. */}
          {registered.name && registered.named ? `${registered.name} (${registered.id})` : `Helmet ${registered.id}`}{' '}
          is registered. It will show as offline until it first reports in.
        </p>
      )}
      {registered && registered.name && !registered.named && (
        <p className="mt-1 text-xs text-amber-700">
          The name couldn’t be saved. Rename it from the helmet’s page.
        </p>
      )}
    </div>
  )
}
