import type { SignalBars as Bars } from '../lib/signal'

export function SignalBars({
  bars,
  label,
  className = 'h-3 w-4',
}: {
  bars: Bars | null
  label: string
  className?: string
}) {
  const fill = bars == null || bars === 0 ? '#cbd5e1' : bars >= 3 ? '#10b981' : '#f59e0b'
  return (
    <svg viewBox="0 0 16 12" className={className} role="img" aria-label={label}>
      <title>{label}</title>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 4}
          y={9 - i * 3}
          width="3"
          height={3 + i * 3}
          rx="0.6"
          fill={bars != null && i < bars ? fill : '#e2e8f0'}
        />
      ))}
    </svg>
  )
}
