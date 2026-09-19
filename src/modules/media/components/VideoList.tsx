import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Can } from '@/shared/components/Can'
import { DataCard } from '@/shared/components/DataCard'
import { useNow } from '@/shared/hooks/useNow'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { formatBytes, formatDuration } from '../types'
import type { MediaItem } from '../types'
import { MediaViewer } from './MediaViewer'

const STATUS_LABEL = {
  available: 'Ready',
  uploading: 'Uploading',
  failed: 'Failed',
} as const

const STATUS_STYLE = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  uploading: 'bg-amber-50 text-amber-700 ring-amber-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
} as const

function StatusChip({ status }: { status: MediaItem['status'] }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

/**
 * Recordings read better as a file list than a thumbnail grid — the useful
 * columns are name, length and size, and a wall of near-identical video
 * stills tells an operator nothing.
 */
export function VideoList({
  items,
  onDelete,
}: {
  items: MediaItem[]
  onDelete?: (id: string) => void
}) {
  const now = useNow(30_000)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No recordings match those filters.
      </p>
    )
  }

  const actions = (item: MediaItem, index: number) => (
    <div className="flex items-center justify-end gap-3 text-xs">
      <button
        onClick={() => setOpenIndex(index)}
        disabled={item.status !== 'available'}
        className="text-slate-500 hover:text-slate-800 disabled:opacity-40"
      >
        Play
      </button>
      {onDelete && (
        <Can perm="videos:delete">
          <button onClick={() => onDelete(item.id)} className="text-red-600 hover:underline">
            Delete
          </button>
        </Can>
      )}
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {items.map((item, index) => (
          <DataCard
            key={item.id}
            title={
              <span className="truncate font-mono text-xs text-slate-800">
                {item.fileName ?? item.id}
              </span>
            }
            badges={<StatusChip status={item.status} />}
            rows={[
              {
                label: 'Device',
                value: (
                  <Link to={`/devices/${item.deviceId}`} className="underline-offset-2 hover:underline">
                    {item.deviceName}
                  </Link>
                ),
              },
              { label: 'Captured', value: formatLastSeen(item.capturedAt, now) },
              { label: 'Length', value: formatDuration(item.durationMs) ?? '—' },
              { label: 'Size', value: formatBytes(item.sizeBytes) ?? '—' },
            ]}
            action={actions(item, index)}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">File name</th>
              <th className="px-4 py-2 font-medium">Device</th>
              <th className="px-4 py-2 font-medium">Captured</th>
              <th className="px-4 py-2 font-medium">Length</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span className="font-mono text-xs text-slate-700">
                    {item.fileName ?? item.id}
                  </span>
                  {item.triggeredBy === 'alarm' && (
                    <span className="ml-2 rounded bg-red-600 px-1 text-[10px] font-medium text-white">
                      ALARM
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Link
                    to={`/devices/${item.deviceId}`}
                    className="text-slate-600 underline-offset-2 hover:underline"
                  >
                    {item.deviceName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {formatLastSeen(item.capturedAt, now)}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatDuration(item.durationMs) ?? '—'}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatBytes(item.sizeBytes) ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <StatusChip status={item.status} />
                </td>
                <td className="px-4 py-2">{actions(item, index)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openIndex !== null && items[openIndex] && (
        <MediaViewer
          item={items[openIndex]}
          now={now}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < items.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
          onDelete={
            onDelete
              ? (id) => {
                  onDelete(id)
                  setOpenIndex(null)
                }
              : undefined
          }
        />
      )}
    </>
  )
}
