import { useMemo, useState } from 'react'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useTrack } from './hooks/useTrack'
import { TrackMap } from './components/TrackMap'
import { PlaybackControls } from './components/PlaybackControls'
import { downloadCsv, formatDistance, formatDuration, trackToCsv } from './lib/track'

function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function Stat({ label, value, tone = 'text-slate-800' }: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

export function TrackPlaybackPage() {
  const { devices } = useDevices()
  const [search, setSearch] = useState('')
  const [deviceId, setDeviceId] = useState<string | null>(null)

  const today = Date.now()
  const [fromDate, setFromDate] = useState(isoDate(today - 7 * 86_400_000))
  const [toDate, setToDate] = useState(isoDate(today))

  // Only set when View is pressed, so editing the dates doesn't fire requests.
  const [requested, setRequested] = useState<{ from: number; to: number } | null>(null)
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return devices
    return devices.filter(
      (d) => d.name.toLowerCase().includes(needle) || d.id.includes(needle.trim())
    )
  }, [devices, search])

  const selected = devices.find((d) => d.id === deviceId) ?? null

  const { track, isFetching, isError } = useTrack(
    deviceId,
    requested?.from ?? 0,
    requested?.to ?? 0,
    requested !== null
  )

  function view() {
    const from = new Date(`${fromDate}T00:00:00`).getTime()
    const to = new Date(`${toDate}T23:59:59.999`).getTime()
    if (Number.isNaN(from) || Number.isNaN(to) || from > to) return
    setRequested({ from, to })
    setCursor(0)
    setPlaying(false)
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-800">Track Playback</h1>
      <p className="mb-4 text-xs text-slate-500">
        Replay where a helmet has been over a chosen period.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <aside>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter name or device ID"
            className="mb-2 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <ul className="max-h-[30rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {matches.map((device) => (
              <li key={device.id}>
                <button
                  onClick={() => {
                    setDeviceId(device.id)
                    setRequested(null)
                  }}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    device.id === deviceId ? 'bg-brand-primary/10' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate font-medium text-slate-800">
                    {device.name}
                  </span>
                  <span className="block font-mono text-[11px] text-slate-400">{device.id}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">No helmets match.</li>
            )}
          </ul>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>

            <button
              onClick={view}
              disabled={!deviceId || isFetching}
              className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {isFetching ? 'Loading…' : 'View'}
            </button>

            <button
              onClick={() =>
                track &&
                selected &&
                downloadCsv(
                  `track-${selected.id}-${fromDate}-to-${toDate}.csv`,
                  trackToCsv(track, selected.name)
                )
              }
              disabled={!track || track.points.length === 0}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Export
            </button>

            {!deviceId && (
              <span className="text-xs text-slate-500">Select a helmet to begin.</span>
            )}
          </div>

          {isError && <p className="text-sm text-red-600">Failed to load this track.</p>}

          {track && track.points.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No position fixes recorded for {selected?.name} in that period.
            </p>
          )}

          {track && track.points.length > 0 && (
            <div className="space-y-4">
              {track.stats.impossibleJumps > 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {track.stats.impossibleJumps} position{' '}
                  {track.stats.impossibleJumps === 1 ? 'fix was' : 'fixes were'} excluded as
                  physically impossible — a jump too far to have been travelled in the time.
                  This device's history contains readings from where it was tested before
                  shipping, and counting them would add thousands of kilometres to the total.
                </p>
              )}

              {track.truncated && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {/* Better to say the range was cut than to show a short
                      track that looks like the helmet stood still. */}
                  Only the most recent part of this range was returned — the
                  telemetry endpoint has no date filter, so older history was
                  cut off. Narrow the range for a complete track.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <Stat label="Distance" value={formatDistance(track.stats.distanceMetres)} />
                <Stat label="Time span" value={formatDuration(track.stats.durationMs)} />
                <Stat label="Moving" value={formatDuration(track.stats.movingMs)} />
                <Stat
                  label="Top speed"
                  value={`${track.stats.maxSpeedMps.toFixed(1)} m/s`}
                />
                <Stat
                  label="Longest gap"
                  value={
                    track.stats.longestGapMs > 0
                      ? formatDuration(track.stats.longestGapMs)
                      : 'None'
                  }
                  tone={track.stats.longestGapMs > 0 ? 'text-amber-700' : 'text-slate-800'}
                />
                <Stat
                  label="Segments"
                  value={String(track.stats.segments)}
                  tone={track.stats.segments > 1 ? 'text-amber-700' : 'text-slate-800'}
                />
              </div>

              <TrackMap track={track} cursor={cursor} />

              <PlaybackControls
                track={track}
                cursor={cursor}
                setCursor={setCursor}
                playing={playing}
                setPlaying={setPlaying}
                speed={speed}
                setSpeed={setSpeed}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
