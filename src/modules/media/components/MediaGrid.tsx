import { useState } from 'react'
import { useNow } from '@/shared/hooks/useNow'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { formatDuration } from '../types'
import type { MediaItem } from '../types'
import { MediaViewer } from './MediaViewer'

function StatusOverlay({ item }: { item: MediaItem }) {
  if (item.status === 'available') return null

  const label = item.status === 'uploading' ? 'Uploading from helmet…' : 'Upload failed'
  const tone = item.status === 'uploading' ? 'text-amber-200' : 'text-red-200'

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
      <span className={`px-2 text-center text-xs ${tone}`}>{label}</span>
    </div>
  )
}

interface Props {
  items: MediaItem[]
  onDelete?: (id: string) => void
  emptyMessage?: string
}

export function MediaGrid({ items, onDelete, emptyMessage = 'Nothing captured yet.' }: Props) {
  const now = useNow(30_000)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => {
          const lag = item.uploadedAt != null ? item.uploadedAt - item.capturedAt : 0
          const arrivedLate = lag > 10 * 60_000

          return (
            <button
              key={item.id}
              onClick={() => item.status === 'available' && setOpenIndex(index)}
              disabled={item.status !== 'available'}
              className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left disabled:cursor-default"
            >
              <div className="relative aspect-video bg-slate-100">
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                <StatusOverlay item={item} />
                {item.kind === 'video' && item.status === 'available' && (
                  <span className="absolute bottom-1 right-1 rounded bg-slate-900/75 px-1 text-[10px] text-white">
                    {formatDuration(item.durationMs)}
                  </span>
                )}
                {item.triggeredBy === 'alarm' && (
                  <span className="absolute left-1 top-1 rounded bg-red-600 px-1 text-[10px] font-medium text-white">
                    ALARM
                  </span>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="truncate text-xs font-medium text-slate-700">{item.deviceName}</p>
                <p className="text-[11px] text-slate-400">
                  {formatLastSeen(item.capturedAt, now)}
                  {/* Captured long before it arrived — the helmet was offline.
                      Without this the gallery looks like it's reordering itself. */}
                  {arrivedLate && <span className="ml-1 text-amber-600">· late upload</span>}
                </p>
              </div>
            </button>
          )
        })}
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
    </div>
  )
}
