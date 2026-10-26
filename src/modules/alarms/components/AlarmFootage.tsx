import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Can } from '@/shared/components/Can'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { useMediaList } from '@/modules/media/hooks/useMedia'
import { MediaViewer } from '@/modules/media/components/MediaViewer'
import { refreshAndWait, requestHelmetUpload } from '@/modules/media/api/localVideos.api'
import type { HelmetVideo } from '@/modules/media/api/localVideos.api'
import type { MediaItem } from '@/modules/media/types'
import type { Alarm, AlarmType } from '../types'
import { fetchAlarmFootage } from '../api/alarms.api'

const MIN = 60_000
export const WINDOW = { photoBefore: 10 * MIN, videoBefore: 30 * MIN, after: 5 * MIN }

function dayOf(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function relativeTo(at: number, alarmAt: number): string {
  const diff = Math.round((at - alarmAt) / MIN)
  if (diff === 0) return 'at the time'
  return diff < 0 ? `${-diff} min before` : `${diff} min after`
}

export function inWindow(item: Pick<MediaItem, 'kind' | 'capturedAt'>, alarmAt: number): boolean {
  const before = item.kind === 'video' ? WINDOW.videoBefore : WINDOW.photoBefore
  return item.capturedAt >= alarmAt - before && item.capturedAt <= alarmAt + WINDOW.after
}

const AUTO_CAPTURE: ReadonlySet<AlarmType> = new Set<AlarmType>(['sos', 'fall', 'near-electric'])
const EXPECT_FOR = 2 * 60 * MIN

export function AlarmFootage({ alarm, now }: { alarm: Alarm; now: number }) {
  const tenantId = useTenantId()
  const expecting = AUTO_CAPTURE.has(alarm.type) && now - alarm.raisedAt < EXPECT_FOR
  const linkedQuery = useQuery({
    queryKey: [...qk.alarms.all(tenantId), 'footage', alarm.id],
    queryFn: () => fetchAlarmFootage(alarm.id),
    refetchInterval: (query) =>
      expecting && !(query.state.data ?? []).some((m) => m.kind === 'video') ? 30_000 : false,
  })
  const linked = useMemo(() => linkedQuery.data ?? [], [linkedQuery.data])
  const linkedIds = useMemo(() => new Set(linked.map((m) => m.id)), [linked])
  const waitingForClip = expecting && !linked.some((m) => m.kind === 'video')

  const startDay = dayOf(alarm.raisedAt - WINDOW.videoBefore)
  const endDay = dayOf(alarm.raisedAt + WINDOW.after)
  const first = useMediaList({ deviceId: alarm.deviceId, date: startDay })
  const second = useMediaList({ deviceId: alarm.deviceId, date: endDay })
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const footage = useMemo(() => {
    const byId = new Map<string, MediaItem>()
    for (const m of linked) if (m.status === 'available') byId.set(m.id, m)
    for (const m of [...first.media, ...(endDay !== startDay ? second.media : [])]) {
      if (m.status === 'available' && inWindow(m, alarm.raisedAt) && !byId.has(m.id)) byId.set(m.id, m)
    }
    return [...byId.values()].sort((a, b) => {
      const linkedDelta = Number(linkedIds.has(b.id)) - Number(linkedIds.has(a.id))
      if (linkedDelta !== 0) return linkedDelta
      return Math.abs(a.capturedAt - alarm.raisedAt) - Math.abs(b.capturedAt - alarm.raisedAt)
    })
  }, [linked, linkedIds, first.media, second.media, startDay, endDay, alarm.raisedAt])

  const loading = linkedQuery.isLoading || first.isLoading || (endDay !== startDay && second.isLoading)
  const photos = footage.filter((m) => m.kind === 'photo')
  const videos = footage.filter((m) => m.kind === 'video')

  return (
    <section>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Footage</h3>
      <p className="mb-3 text-[11px] text-slate-400">
        {linked.length > 0 ? 'Captured because of this alarm, plus anything else ' : 'Anything '}
        from this helmet {WINDOW.videoBefore / MIN} minutes before to {WINDOW.after / MIN} after the
        alarm (photos from {WINDOW.photoBefore / MIN} minutes before).
      </p>
      {waitingForClip && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800" aria-live="polite">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 motion-safe:animate-spin" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Footage uploading… The helmet records 2 minutes for this alarm; the clip usually arrives
          within 35 minutes, longer on a weak connection.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Looking for footage…</p>
      ) : footage.length === 0 ? (
        waitingForClip ? null : <MemoryCardCheck alarm={alarm} />
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
                  {linkedIds.has(p.id) && (
                    <span className="absolute left-1 top-1 rounded bg-brand-primary px-1 text-[10px] font-medium text-white">
                      This alarm
                    </span>
                  )}
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
                        {linkedIds.has(v.id) && (
                          <span className="ml-1.5 rounded bg-brand-primary/10 px-1 text-[10px] font-medium text-brand-primary">
                            This alarm
                          </span>
                        )}
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

function MemoryCardCheck({ alarm }: { alarm: Alarm }) {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const [phase, setPhase] = useState<CardPhase>('idle')
  const [clips, setClips] = useState<HelmetVideo[]>([])

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
