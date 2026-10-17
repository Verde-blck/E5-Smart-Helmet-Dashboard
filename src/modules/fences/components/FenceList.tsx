import { useState } from 'react'
import { Can } from '@/shared/components/Can'
import { describePeriod, isTooSmall } from '../lib/geometry'
import { BEHAVIOR_LABEL } from '../types'
import type { Fence } from '../types'

interface Props {
  fences: Fence[]
  isLoading: boolean
  isError: boolean
  selectedId: number | null
  onSelect: (id: number) => void
  onNew: () => void
  onEdit: (fence: Fence) => void
  onDelete: (fence: Fence) => Promise<void>
}

export function FenceList({ fences, isLoading, isError, selectedId, onSelect, onNew, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Fences</h3>
        <Can perm="fences:write">
          <button
            onClick={onNew}
            className="rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary/90"
          >
            New fence
          </button>
        </Can>
      </div>
      <p className="mb-3 text-[11px] text-slate-400">
        A breach raises a “Left work area” or “Entered restricted area” alarm. Not yet tested on a
        real helmet.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading fences…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Couldn’t load fences.</p>
      ) : fences.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
          No fences yet. Draw a work area or a no-entry zone on the map.
        </p>
      ) : (
        <ul className="space-y-2">
          {fences.map((fence) => {
            const selected = fence.id === selectedId
            return (
              <li
                key={fence.id}
                className={`rounded-md border p-2.5 text-xs ${
                  selected ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  onClick={() => onSelect(fence.id)}
                  className="block w-full text-left"
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
                        !fence.active ? 'bg-slate-300' : fence.behavior === 'NO_ENTRY' ? 'bg-amber-500' : 'bg-[#0A6659]'
                      }`}
                    />
                    <span className="truncate text-sm font-medium text-slate-800">{fence.name}</span>
                    {!fence.active && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">Off</span>
                    )}
                  </span>
                  <span className="mt-1 block text-slate-500">
                    {BEHAVIOR_LABEL[fence.behavior].short} ·{' '}
                    {fence.type === 'ROUND'
                      ? `circle, ${Math.round(fence.radiusMeters)} m radius`
                      : `${fence.points.length}-corner polygon`}
                  </span>
                  <span className="block text-slate-500">
                    {fence.validPeriods.length
                      ? fence.validPeriods.map(describePeriod).join(', ')
                      : 'Always on'}{' '}
                    · {fence.deviceIds.length ? `${fence.deviceIds.length} helmets` : 'every helmet'}
                    {fence.hasWarningAudio && ' · warning clip'}
                  </span>
                  {isTooSmall(fence) && (
                    <span className="mt-1 block text-amber-700">Small fence: may false-alarm</span>
                  )}
                </button>

                <Can perm="fences:write">
                  <div className="mt-2 flex items-center gap-3">
                    {confirming === fence.id ? (
                      <>
                        <span className="text-slate-600">Delete this fence?</span>
                        <button
                          onClick={async () => {
                            setDeleting(fence.id)
                            try {
                              await onDelete(fence)
                            } finally {
                              setDeleting(null)
                              setConfirming(null)
                            }
                          }}
                          disabled={deleting === fence.id}
                          className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {deleting === fence.id ? 'Deleting…' : 'Delete'}
                        </button>
                        <button onClick={() => setConfirming(null)} className="text-slate-500">
                          Keep
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onEdit(fence)} className="font-medium text-brand-primary hover:underline">
                          Edit
                        </button>
                        <button onClick={() => setConfirming(fence.id)} className="text-slate-500 hover:text-red-600">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </Can>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
