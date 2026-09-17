import { useState } from 'react'
import { useNow } from '@/shared/hooks/useNow'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { useDeleteMedia, useMediaList } from '../hooks/useMedia'
import { formatDuration } from '../types'
import type { MediaItem, MediaKind } from '../types'
import { MediaViewer } from './MediaViewer'

function StatusOverlay({ item }: { item: MediaItem }) {
  if (item.status === 'available') return null

  const label =
    item.status === 'uploading' ? 'Uploading from helmet…' : 'Upload failed'
  const tone = item.status === 'uploading' ? 'text-amber-200' : 'text-red-200'

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
      <span className={`px-2 text-center text-xs ${tone}`}>{label}</span>
    </div>
  )
}

export function MediaGrid({ deviceId, limit }: { deviceId?: string; limit?: number }) {
  const { media, isLoading, isError } = useMediaList(deviceId)
  const remove = useDeleteMedia(deviceId)
  const now = useNow(30_000)
  const [kind, setKind] = useState<MediaKind | 'all'>('all')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const filtered = media.filter((m) => kind === 'all' || m.kind === kind)
  const visible = limit ? filtered.slice(0, limit) : filtered

  if (isLoading) return <p className="text-sm text-slate-500">Loading media…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load media.</p>

  return (
    <div>
      {!limit && (
        <div className="mb-3 flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
          {(['all', 'photo', 'video'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setKind(option)}
              className={`rounded px-2.5 py-1 capitalize ${
                kind === option
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {option === 'all' ? 'All' : `${option}s`}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No media captured yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((item, index) => {
            const uploadLagMs =
              item.uploadedAt != null ? item.uploadedAt - item.capturedAt : 0
            const arrivedLate = uploadLagMs > 10 * 60_000

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
                  <p className="truncate text-xs font-medium text-slate-700">
                    {item.deviceName}
                  </p>
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
      )}

      {openIndex !== null && visible[openIndex] && (
        <MediaViewer
          item={visible[openIndex]}
          now={now}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={
            openIndex < visible.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined
          }
          onDelete={(id) => {
            remove.mutate(id)
            setOpenIndex(null)
          }}
        />
      )}
    </div>
  )
}
