import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

export function RefreshButton({ queryKey, className = '' }: { queryKey: QueryKey; className?: string }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setDone(false), 2000)
    return () => clearTimeout(id)
  }, [done])

  async function refresh() {
    if (busy) return
    setBusy(true)
    setDone(false)
    try {
      await queryClient.refetchQueries({ queryKey, type: 'active' })
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={busy}
      aria-label="Refresh"
      title="Load anything new"
      className={`inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-70 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-3.5 w-3.5 ${busy ? 'motion-safe:animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v5h-5" />
      </svg>
      <span aria-live="polite">{busy ? 'Refreshing…' : done ? 'Updated' : 'Refresh'}</span>
    </button>
  )
}
