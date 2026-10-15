import { useEffect, useRef, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { DEVICE_NAME_MAX } from '../api/devices.api'
import { useRenameDevice } from '../hooks/useDevices'
import type { DeviceView } from '../types'

/**
 * The helmet's name as the page heading, with its device ID underneath and
 * an inline rename. The ID stays visible because it's what's printed on the
 * helmet, and what support will ask for.
 */
export function DeviceNameHeading({ device }: { device: DeviceView }) {
  const rename = useRenameDevice()
  const named = device.named !== false
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  function start() {
    setDraft(named ? device.name : '')
    setError(null)
    setSaved(false)
    setEditing(true)
  }

  function save() {
    const name = draft.trim()
    if (!name) {
      setError('Enter a name.')
      return
    }
    if (name === device.name && named) {
      setEditing(false)
      return
    }
    setError(null)
    rename.mutate(
      { deviceId: device.id, name },
      {
        onSuccess: () => {
          setEditing(false)
          setSaved(true)
        },
        onError: () => setError('Couldn’t save the name. Check your connection and try again.'),
      }
    )
  }

  if (editing) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, DEVICE_NAME_MAX))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setEditing(false)
            }}
            placeholder="e.g. John - Site A"
            aria-label="Helmet name"
            disabled={rename.isPending}
            className="w-64 rounded border border-slate-300 px-2.5 py-1 text-base font-semibold text-slate-800"
          />
          <button
            onClick={save}
            disabled={rename.isPending}
            className="rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {rename.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={rename.isPending}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{device.id}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="truncate text-lg font-semibold text-slate-800">
          {named ? device.name : 'Unnamed helmet'}
        </h1>
        <Can perm="devices:write">
          <button
            onClick={start}
            aria-label={named ? `Rename ${device.name}` : 'Name this helmet'}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
              <path d="M14 6l4 4" />
            </svg>
            {named ? 'Rename' : 'Name it'}
          </button>
        </Can>
      </div>
      <p className="font-mono text-[11px] text-slate-400">{device.id}</p>
      {saved && (
        <p role="status" className="mt-1 text-xs text-emerald-700">
          Saved. The helmet picks up its new name the next time it logs in.
        </p>
      )}
    </div>
  )
}
