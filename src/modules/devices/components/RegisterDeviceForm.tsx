import { useState } from 'react'
import { useRegisterDevice } from '../hooks/useDevices'
import { DEVICE_NAME_MAX } from '../api/devices.api'

const IMEI_LENGTH = 15

// IDs copied from a label or document often carry spaces, dashes or invisible characters.
function normaliseImei(input: string): string {
  return input.replace(/[\s\-\u200b-\u200d\u2060\ufeff]/g, '')
}

function validate(id: string): string | null {
  if (!id) return 'Enter the device ID printed on the helmet.'
  if (!/^\d+$/.test(id)) return 'A device ID contains digits only.'
  if (id.length !== IMEI_LENGTH) {
    return `An IMEI has ${IMEI_LENGTH} digits. This one has ${id.length}.`
  }
  return null
}

function registerErrorMessage(error: unknown): string {
  const res = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response
  if (res?.data?.error === 'invalid_device_id') {
    return `That isn’t a valid helmet ID. Use the ${IMEI_LENGTH}-digit IMEI printed on the helmet.`
  }
  if (res?.status === 409) return 'That helmet is already registered.'
  if (res?.status === 403) return 'Your role doesn’t allow registering helmets.'
  if (!res) return 'Could not reach the server. Check your connection and try again.'
  return res.data?.message ?? 'Could not register that helmet. Check the ID and try again.'
}

export function RegisterDeviceForm({ onDone }: { onDone: () => void }) {
  const [deviceId, setDeviceId] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<{ id: string; name: string; named: boolean } | null>(null)
  const register = useRegisterDevice()

  function submit() {
    const id = normaliseImei(deviceId)
    const problem = validate(id)
    setError(problem)
    setRegistered(null)
    if (problem) return

    register.mutate({ deviceId: id, name: name.trim() || undefined }, {
      onSuccess: ({ device, named }) => {
        setRegistered({ id: device.id, name: name.trim(), named })
        setDeviceId('')
        setName('')
      },
      onError: (err) => setError(registerErrorMessage(err)),
    })
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-medium text-slate-800">Register a helmet</h2>

      <div className="flex flex-wrap items-start gap-2">
        <input
          value={deviceId}
          onChange={(e) => {
            setDeviceId(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onDone()
          }}
          placeholder="866652022956404"
          inputMode="numeric"
          spellCheck={false}
          aria-label="Device ID"
          aria-invalid={error ? true : undefined}
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

      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}

      {registered && (
        <p className="mt-2 text-xs text-emerald-700">
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
