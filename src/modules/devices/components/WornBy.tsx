import { useState } from 'react'
import { Can } from '@/shared/components/Can'
import { WORKER_NAME_MAX } from '../api/devices.api'
import { useAssignWorker } from '../hooks/useDevices'
import type { DeviceView } from '../types'

/**
 * Who wears this helmet. It turns an alarm from a device ID into a person to
 * call: notifications read "SOS: John Ade (ES5 3)". The worker never signs
 * in to the dashboard; this is just the helmet's record.
 */
export function WornBy({ device }: { device: DeviceView }) {
  const worker = device.assignedTo
  const save = useAssignWorker()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [staffId, setStaffId] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  function start() {
    setName(worker?.name ?? '')
    setStaffId(worker?.staffId ?? '')
    setPhone(worker?.phone ?? '')
    setError(null)
    setEditing(true)
  }

  function submit() {
    if (!name.trim()) return setError('Enter the worker’s name.')
    setError(null)
    save.mutate(
      { deviceId: device.id, worker: { name, staffId, phone } },
      {
        onSuccess: () => setEditing(false),
        onError: () => setError('Couldn’t save. Check your connection and try again.'),
      }
    )
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, WORKER_NAME_MAX))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Name"
            aria-label="Worker’s name"
            autoFocus
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <input
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="Staff ID (optional)"
            aria-label="Staff ID"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            aria-label="Phone"
            inputMode="tel"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={save.isPending}
            className="rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-800">
            Cancel
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        {worker ? (
          <>
            {worker.name}
            {worker.staffId && <span className="text-slate-500"> · {worker.staffId}</span>}
            {worker.jobTitle && <span className="text-slate-500"> · {worker.jobTitle}</span>}
            {worker.phone && <span className="block text-slate-500">{worker.phone}</span>}
          </>
        ) : (
          <span className="text-slate-500">Unassigned</span>
        )}
      </div>
      <Can perm="devices:write">
        <span className="flex gap-3 text-xs">
          <button onClick={start} className="font-medium text-brand-primary hover:underline">
            {worker ? 'Edit' : 'Assign'}
          </button>
          {worker && (
            <button
              onClick={() => save.mutate({ deviceId: device.id, worker: null })}
              disabled={save.isPending}
              className="text-slate-500 hover:text-red-600"
            >
              Clear
            </button>
          )}
        </span>
      </Can>
    </div>
  )
}
