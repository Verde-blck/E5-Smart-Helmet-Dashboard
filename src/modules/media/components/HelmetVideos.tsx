import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Can } from '@/shared/components/Can'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { fetchHelmetVideos, refreshAndWait, requestHelmetUpload } from '../api/localVideos.api'
import type { HelmetVideoReport } from '../api/localVideos.api'

const RANGES = [
  { days: 1, label: 'Last 24 hours' },
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
]

type Phase = 'idle' | 'refreshing' | 'offline' | 'no-report' | 'ready'

function formatRecorded(at: number | null): string {
  if (at == null) return '—'
  return new Date(at).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HelmetVideos() {
  const { devices } = useDevices()
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const [deviceId, setDeviceId] = useState('')
  const [days, setDays] = useState(7)
  const [phase, setPhase] = useState<Phase>('idle')
  const [report, setReport] = useState<HelmetVideoReport | null>(null)
  const [busy, setBusy] = useState<string | 'all' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const device = devices.find((d) => d.id === deviceId)
  const pending = report?.files.filter((f) => !f.uploaded && f.uploadRequestedAt != null) ?? []
  const notUploaded = report?.files.filter((f) => !f.uploaded && f.uploadRequestedAt == null) ?? []

  useEffect(() => () => abort.current?.abort(), [])

  useEffect(() => {
    if (!deviceId || pending.length === 0) return
    const id = setInterval(async () => {
      const next = await fetchHelmetVideos(deviceId).catch(() => null)
      if (!next) return
      setReport((prev) => {
        const arrived = next.files.some(
          (f) => f.uploaded && prev?.files.find((p) => p.fileName === f.fileName && !p.uploaded)
        )
        if (arrived) void queryClient.invalidateQueries({ queryKey: qk.media.all(tenantId) })
        return next
      })
    }, 10_000)
    return () => clearInterval(id)
  }, [deviceId, pending.length, queryClient, tenantId])

  async function refresh() {
    if (!deviceId) return
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setError(null)
    setPhase('refreshing')
    try {
      const { delivered, report: next } = await refreshAndWait(deviceId, days, controller.signal)
      if (controller.signal.aborted) return
      if (!delivered) setPhase('offline')
      else if (!next) setPhase('no-report')
      else {
        setReport(next)
        setPhase('ready')
      }
    } catch {
      if (!controller.signal.aborted) {
        setError('Couldn’t reach the server. Check your connection and try again.')
        setPhase('idle')
      }
    }
  }

  async function upload(target: { files: string[] } | { all: true }) {
    if (!deviceId) return
    setBusy('all' in target ? 'all' : target.files[0])
    setError(null)
    try {
      await requestHelmetUpload(deviceId, target)
      const requested = new Date().getTime()
      setReport((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.map((f) =>
                !f.uploaded && ('all' in target || target.files.includes(f.fileName))
                  ? { ...f, uploadRequestedAt: f.uploadRequestedAt ?? requested }
                  : f
              ),
            }
          : prev
      )
    } catch {
      setError('Couldn’t send the upload request. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <label className="text-xs text-slate-600">
          <span className="mb-1 block font-medium">Helmet</span>
          <select
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value)
              setReport(null)
              setPhase('idle')
            }}
            className="w-52 rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Choose a helmet…</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.presence === 'offline' ? ' (offline)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          <span className="mb-1 block font-medium">Look back</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {RANGES.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => void refresh()}
          disabled={!deviceId || phase === 'refreshing'}
          className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {phase === 'refreshing' ? 'Asking the helmet…' : 'Refresh'}
        </button>
        <p className="basis-full text-[11px] text-slate-400">
          Clips are about 100 MB per 5 minutes, so uploading over a phone hotspot uses a lot of data.
          Site Wi-Fi is better.
        </p>
      </div>

      {!deviceId && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Choose a helmet and press Refresh to see the recordings still on its memory card.
        </p>
      )}
      {deviceId && phase === 'idle' && !report && (
        <p className="text-sm text-slate-500">Press Refresh to ask {device?.name ?? 'the helmet'} what it has.</p>
      )}
      {phase === 'refreshing' && (
        <p className="text-sm text-slate-500" aria-live="polite">
          Asking the helmet for its list. This takes about 5 to 10 seconds.
        </p>
      )}
      {phase === 'offline' && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {device?.name ?? 'The helmet'} is offline, so it can’t report what’s on its card. Try again
          once it’s online.
        </p>
      )}
      {phase === 'no-report' && (
        <p className="text-sm text-amber-800">
          The helmet didn’t answer within 30 seconds. It may have a weak connection; try again.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {report && phase !== 'refreshing' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
            <p className="text-xs text-slate-500">
              {report.files.length} {report.files.length === 1 ? 'clip' : 'clips'} on the card ·{' '}
              {report.files.filter((f) => f.uploaded).length} already uploaded
              {pending.length > 0 && ` · ${pending.length} uploading`}
            </p>
            <Can perm="videos:write">
              {notUploaded.length > 0 && (
                <button
                  onClick={() => void upload({ all: true })}
                  disabled={busy !== null}
                  className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'all' ? 'Requesting…' : `Upload all ${notUploaded.length}`}
                </button>
              )}
            </Can>
          </div>
          {report.files.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No recordings in that period.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {report.files.map((f) => (
                <li key={f.fileName} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className="font-mono text-xs text-slate-600">{f.fileName}</span>
                  <span className="text-xs text-slate-500">{formatRecorded(f.recordedAt)}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {f.uploaded ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                        Uploaded
                      </span>
                    ) : f.uploadRequestedAt != null ? (
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">
                        Uploading…
                      </span>
                    ) : (
                      <>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                          On helmet only
                        </span>
                        <Can perm="videos:write">
                          <button
                            onClick={() => void upload({ files: [f.fileName] })}
                            disabled={busy !== null}
                            className="text-xs font-medium text-brand-primary hover:underline disabled:opacity-50"
                          >
                            {busy === f.fileName ? 'Requesting…' : 'Upload'}
                          </button>
                        </Can>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
              Uploads can take several minutes. Finished clips appear in Uploaded and on the calendar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
