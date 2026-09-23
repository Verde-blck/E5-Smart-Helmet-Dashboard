import { useState } from 'react'
import { BroadcastPanel } from './BroadcastPanel'

/**
 * The megaphone from the reference platform's Monitoring Center — the entry
 * point to the voice conversation with a helmet's wearer.
 */
export function BroadcastButton({
  deviceId,
  deviceName,
  className = '',
  label,
}: {
  deviceId: string
  deviceName: string
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={(e) => {
          // Sits inside cards and table rows that are themselves links.
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        title={`Send a voice message to ${deviceName}`}
        aria-label={`Send a voice message to ${deviceName}`}
        className={`inline-flex items-center gap-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-primary ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M4 9v6h3l6 4V5L7 9H4Z" />
          <path d="M17 9.5a4 4 0 0 1 0 5" />
          <path d="M19.5 7a7.5 7.5 0 0 1 0 10" />
        </svg>
        {label && <span className="text-xs">{label}</span>}
      </button>

      {open && (
        <BroadcastPanel
          deviceId={deviceId}
          deviceName={deviceName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
