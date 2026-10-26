import { useEffect, useState } from 'react'
import { useVideoCalendar } from '../hooks/useMedia'
import { formatBytes } from '../types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + by, 1))
}

interface Props {
  deviceId?: string
  date?: string
  onDateChange: (date: string | undefined) => void
}

export function VideoCalendar({ deviceId, date, onDateChange }: Props) {
  const today = new Date()
  const thisMonth = monthKey(today)
  const todayKey = `${thisMonth}-${pad(today.getDate())}`
  const [month, setMonth] = useState(date?.slice(0, 7) ?? thisMonth)

  useEffect(() => {
    if (date) setMonth(date.slice(0, 7))
  }, [date])

  const { data, isLoading, isError } = useVideoCalendar(month, deviceId)

  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const label = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const total = data?.month === month ? data.totalClips : null

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3" aria-label="Recordings calendar">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Previous month"
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="text-[11px] text-slate-400" aria-live="polite">
            {isError
              ? 'Couldn’t load this month'
              : isLoading || total === null
                ? 'Loading…'
                : `${total} ${total === 1 ? 'clip' : 'clips'}`}
          </p>
        </div>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= thisMonth}
          aria-label="Next month"
          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-[10px] font-medium text-slate-400">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />
          const key = `${month}-${pad(day)}`
          const info = data?.month === month ? data.days[key] : undefined
          const selected = key === date
          const isToday = key === todayKey
          return (
            <button
              key={key}
              onClick={() => onDateChange(selected ? undefined : key)}
              disabled={!info && !selected}
              aria-pressed={selected}
              aria-label={
                info
                  ? `${key}: ${info.count} ${info.count === 1 ? 'clip' : 'clips'}, ${formatBytes(info.totalBytes) ?? ''}`
                  : `${key}: no clips`
              }
              title={info ? `${info.count} clips · ${formatBytes(info.totalBytes)}` : undefined}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-xs ${
                selected
                  ? 'bg-brand-primary font-semibold text-white'
                  : info
                    ? 'bg-brand-primary/10 font-medium text-slate-800 hover:bg-brand-primary/20'
                    : 'text-slate-300'
              } ${isToday && !selected ? 'ring-1 ring-slate-300' : ''}`}
            >
              {day}
              {info && (
                <span className={`text-[9px] leading-none ${selected ? 'text-white/80' : 'text-brand-primary'}`}>
                  {info.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {date && (
        <button
          onClick={() => onDateChange(undefined)}
          className="mt-2 w-full rounded py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          Show all days
        </button>
      )}
    </section>
  )
}
