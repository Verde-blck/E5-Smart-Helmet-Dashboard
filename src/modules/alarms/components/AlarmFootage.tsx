import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Can } from '@/shared/components/Can'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { useMediaList } from '@/modules/media/hooks/useMedia'
import { MediaViewer } from '@/modules/media/components/MediaViewer'
import { refreshAndWait, requestHelmetUpload } from '@/modules/media/api/localVideos.api'
import type { HelmetVideo } from '@/modules/media/api/localVideos.api'
import type { MediaItem } from '@/modules/media/types'
import type { Alarm } from '../types'

const MIN = 60_000
/**
 * The window around the alarm. Videos reach further back: a clip that started
 * before the alarm can still contain the moment it happened.
 */
export const WINDOW = { photoBefore: 10 * MIN, videoBefore: 30 * MIN, after: 5 * MIN }

function dayOf(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "4 min before", "at the time", "2 min after" */
export function relativeTo(at: number, alarmAt: number): string {
  const diff = Math.round((at - alarmAt) / MIN)
  if (diff === 0) return 'at the time'
  return diff < 0 ? `${-diff} min before` : `${diff} min after`
}

export function inWindow(item: Pick<MediaItem, 'kind' | 'capturedAt'>, alarmAt: number): boolean {
  const before = item.kind === 'video' ? WINDOW.videoBefore : WINDOW.photoBefore
  return item.capturedAt >= alarmAt - before && item.capturedAt <= alarmAt + WINDOW.after
}

/**
 * Photos and videos from the alarm's helmet around the time it fired.
 * Matched by device and recording time, since the backend doesn't link
 * footage to alarms yet.
 */
export function AlarmFootage({ alarm, now }: { alarm: Alarm; now: number }) {
  // Two days when the window crosses midnight; the same query otherwise.
  const startDay = dayOf(alarm.raisedAt - WINDOW.videoBefore)
  const endDay = dayOf(alarm.raisedAt + WINDOW.after)
  const first = useMediaList({ deviceId: alarm.deviceId, date: startDay })
  const second = useMediaList({ deviceId: alarm.deviceId, date: endDay })
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const footage = useMemo(() => {
    const byId = new Map<string, MediaItem>()
    for (const m of [...first.media, ...(endDay !== startDay ? second.media : [])]) {
      if (m.status === 'available' && inWindow(m, alarm.raisedAt)) byId.set(m.id, m)
    }
    // Closest to the moment first.
    return [...byId.values()].sort(
      (a, b) => Math.abs(a.capturedAt - alarm.raisedAt) - Math.abs(b.capturedAt - alarm.raisedAt)
    )
  }, [first.media, second.media, startDay, endDay, alarm.raisedAt])

  const loading = first.isLoading || (endDay !== startDay && second.isLoading)
  const photos = footage.filter((m) => m.kind === 'photo')
  const videos = footage.filter((m) => m.kind === 'video')

  return (
    <section>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Footage</h3>
      <p className="mb-3 text-[11px] text-slate-400">
        From this helmet, {WINDOW.videoBefore / MIN} minutes before to {WINDOW.after / MIN} after the
        alarm (photos from {WINDOW.photoBefore / MIN} minutes before).
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Looking for footage…</p>
      ) : footage.length === 0 ? (
        <MemoryCardCheck alarm={alarm} />
      ) : (
        <div className="space-y-3">
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setOpenIndex(footage.indexOf(p))}
                  className="group relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                >
                  {p.thumbnailUrl && (
                    <img src={p.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover group-hover:opacity-90" />
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1 text-[10px] text-white">
                    {relativeTo(p.capturedAt, alarm.raisedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {videos.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {videos.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => setOpenIndex(footage.indexOf(v))}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded bg-slate-800 text-xs text-white" aria-hidden="true">
                      ▶
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-slate-800">
                        Video, started {relativeTo(v.capturedAt, alarm.raisedAt)}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-400">{v.fileName}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-brand-primary">Play</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {openIndex !== null && footage[openIndex] && (
        <MediaViewer
          item={footage[openIndex]}
          now={now}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < footage.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
        />
      )}
    </section>
  )
}

type CardPhase = 'idle' | 'checking' | 'offline' | 'no-report' | 'listed' | 'requested'

/**
 * Nothing uploaded from that time. The clip may still be on the helmet's
 * memory card: ask the helmet, then ask it to upload the ones that matter.
 */
function MemoryCardCheck({ alarm }: { alarm: Alarm }) {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const [phase, setPhase] = useState<CardPhase>('idle')
  const [clips, setClips] = useState<HelmetVideo[]>([])

  // After asking for uploads, look again every 30 s so clips appear as they land.
  useEffect(() => {
    if (phase !== 'requested') return
    const id = setInterval(
      () => void queryClient.invalidateQueries({ queryKey: qk.media.all(tenantId) }),
      30_000
    )
    return () => clearInterval(id)
  }, [phase, queryClient, tenantId])

  async function check() {
    setPhase('checking')
    const ageDays = Math.ceil((Date.now() - alarm.raisedAt) / 86_400_000) + 1
    const controller = new AbortController()
    try {
      const { delivered, report } = await refreshAndWait(alarm.deviceId, Math.min(90, ageDays), controller.signal)
      if (!delivered) return setPhase('offline')
      if (!report) return setPhase('no-report')
      const matching = report.files.filter(
        (f) =>
          f.recordedAt != null &&
          f.recordedAt >= alarm.raisedAt - WINDOW.videoBefore &&
          f.recordedAt <= alarm.raisedAt + WINDOW.after
      )
      setClips(matching)
      setPhase('listed')
    } catch {
      setPhase('no-report')
    }
  }

  async function upload() {
    const wanted = clips.filter((c) => !c.uploaded).map((c) => c.fileName)
    if (wanted.length === 0) return
    await requestHelmetUpload(alarm.deviceId, { files: wanted }).catch(() => null)
    setPhase('requested')
  }

  const pending = clips.filter((c) => !c.uploaded)

  return (
    <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm">
      <p className="text-slate-600">No photos or videos from {alarm.deviceName} have been uploaded from around this time.</p>
      {phase === 'idle' && (
        <Can perm="videos:write">
          <button
            onClick={() => void check()}
            className="mt-2 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Check the helmet’s memory card
          </button>
        </Can>
      )}
      {phase === 'checking' && <p className="mt-2 text-xs text-slate-500" aria-live="polite">Asking the helmet. This takes about 5 to 10 seconds.</p>}
      {phase === 'offline' && <p className="mt-2 text-xs text-amber-800">The helmet is offline, so it can’t check its card. Try again once it’s online.</p>}
      {phase === 'no-report' && <p className="mt-2 text-xs text-amber-800">The helmet didn’t answer. It may have a weak connection; try again.</p>}
      {phase === 'listed' &&
        (clips.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">There’s nothing on the card from then either: the helmet wasn’t recording.</p>
        ) : pending.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">The clips from then are already uploaded; they’ll appear here shortly.</p>
        ) : (
          <div className="mt-2">
            <p className="text-xs text-slate-600">
              {pending.length} {pending.length === 1 ? 'clip' : 'clips'} from then {pending.length === 1 ? 'is' : 'are'} still on the helmet.
            </p>
            <button
              onClick={() => void upload()}
              className="mt-2 rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary/90"
            >
              Upload {pending.length === 1 ? 'it' : `these ${pending.length}`}
            </button>
            <p className="mt-1 text-[11px] text-slate-400">About 100 MB per 5 minutes of video; site Wi-Fi is better than a hotspot.</p>
          </div>
        ))}
      {phase === 'requested' && (
        <p className="mt-2 text-xs text-emerald-700">
          Upload requested. The clips appear here once they arrive, which can take several minutes.
        </p>
      )}
    </div>
  )
}
