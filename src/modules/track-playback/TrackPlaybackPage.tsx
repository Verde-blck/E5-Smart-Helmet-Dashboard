import { useMemo, useState } from 'react'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useTrack } from './hooks/useTrack'
import { TrackMap } from './components/TrackMap'
import { PlaybackControls } from './components/PlaybackControls'
import { AvailabilityChart } from './components/AvailabilityChart'
import { downloadCsv, formatDistance, formatDuration, trackToCsv } from './lib/track'
import { matchesDeviceSearch } from '@/modules/devices/lib/search'

function isoDate(ts: number): string {
  // Local date, not toISOString(): UTC names yesterday for the first hour after midnight in Lagos.
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

  const [requested, setRequested] = useState<{ from: number; to: number } | null>(null)
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)

  const matches = useMemo(
    () => devices.filter((d) => matchesDeviceSearch(d, search)),
    [devices, search]
  )

  const selected = devices.find((d) => d.id === deviceId) ?? null

  const { track, availability, isFetching, isError } = useTrack(
    deviceId,
    requested?.from ?? 0,
    requested?.to ?? 0,
    requested !== null
  )

  const dateProblem = dateRangeProblem(fromDate, toDate)

  function view() {
    if (dateProblem) return
    const from = new Date(`${fromDate}T00:00:00`).getTime()
    const to = new Date(`${toDate}T23:59:59.999`).getTime()
    setRequested({ from, to })
    setCursor(0)
    setPlaying(false)
  }

  return (
    <div>

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
              <label htmlFor="track-from" className="mb-1 block text-[11px] text-slate-500">From</label>
              <input
                id="track-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-invalid={dateProblem ? true : undefined}
                aria-describedby={dateProblem ? 'track-date-problem' : undefined}
                className={`rounded border px-2.5 py-1.5 text-sm ${dateProblem ? 'border-red-400' : 'border-slate-300'}`}
              />
            </div>
            <div>
              <label htmlFor="track-to" className="mb-1 block text-[11px] text-slate-500">To</label>
              <input
                id="track-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-invalid={dateProblem ? true : undefined}
                aria-describedby={dateProblem ? 'track-date-problem' : undefined}
                className={`rounded border px-2.5 py-1.5 text-sm ${dateProblem ? 'border-red-400' : 'border-slate-300'}`}
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
              <span className="text-xs text-slate-500"> </span>
            )}
            {dateProblem && (
              <p id="track-date-problem" role="alert" className="basis-full text-xs text-red-600">
                {dateProblem}
              </p>
            )}
          </div>

          {isError && <p className="text-sm text-red-600">Failed to load this track.</p>}

          {availability && (
            <div className="mb-4">
              <AvailabilityChart summary={availability} />
            </div>
          )}

          {track && track.points.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No position fixes recorded for {selected?.name} in that period — so
              there is no route to replay. The chart above still shows when it
              was reporting.
            </p>
          )}

          {track && track.points.length > 0 && (
            <div className="space-y-4">
              {track.stats.impossibleJumps > 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {track.stats.impossibleJumps} position{' '}
                  {track.stats.impossibleJumps === 1 ? 'reading was' : 'readings were'} left out of the
                  route and distance: each was too far away to have been travelled in the time.
                </p>
              )}

              {track.truncated && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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

function dateRangeProblem(from: string, to: string): string | null {
  if (!from && !to) return 'Choose a start and an end date.'
  if (!from) return 'Choose a start date.'
  if (!to) return 'Choose an end date.'
  if (from > to) return 'The start date must be on or before the end date.'
  return null
}
