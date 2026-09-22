import { useEffect, useRef } from 'react'
import type { Track } from '../types'

const SPEEDS = [1, 4, 16, 64] as const

export function PlaybackControls({
  track,
  cursor,
  setCursor,
  playing,
  setPlaying,
  speed,
  setSpeed,
}: {
  track: Track
  cursor: number
  setCursor: (next: number) => void
  playing: boolean
  setPlaying: (next: boolean) => void
  speed: number
  setSpeed: (next: number) => void
}) {
  const last = track.points.length - 1
  const point = track.points[cursor]

  // Advance on a timer rather than by wall-clock interpolation: the fixes are
  // irregularly spaced, so stepping point-to-point keeps playback smooth and
  // the position always a real reading rather than a guess between two.
  const cursorRef = useRef(cursor)
  cursorRef.current = cursor

  useEffect(() => {
    if (!playing) return

    const id = setInterval(() => {
      const next = cursorRef.current + 1
      if (next > last) {
        setPlaying(false)
        return
      }
      setCursor(next)
    }, Math.max(16, 500 / speed))

    return () => clearInterval(id)
  }, [playing, speed, last, setCursor, setPlaying])

  if (!point) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            // Restart from the beginning if it's sitting at the end.
            if (cursor >= last) setCursor(0)
            setPlaying(!playing)
          }}
          className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90"
        >
          {playing ? 'Pause' : cursor >= last ? 'Replay' : 'Play'}
        </button>

        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
          {SPEEDS.map((option) => (
            <button
              key={option}
              onClick={() => setSpeed(option)}
              className={`rounded px-2 py-0.5 ${
                speed === option
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {option}×
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500">
          {new Date(point.ts).toLocaleString()} · point {cursor + 1} of {last + 1}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={last}
        value={cursor}
        onChange={(e) => {
          setPlaying(false)
          setCursor(Number(e.target.value))
        }}
        className="mt-3 w-full accent-brand-primary"
        aria-label="Playback position"
      />

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </span>
        {point.altitude != null && <span>Altitude {point.altitude} m</span>}
        {point.batteryPercent != null && <span>Battery {point.batteryPercent}%</span>}
        <span>Speed {point.speedMps.toFixed(1)} m/s</span>
      </div>
    </div>
  )
}
