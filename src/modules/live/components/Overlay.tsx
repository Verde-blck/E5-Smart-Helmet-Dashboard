import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Full-screen dialog layer for the player and call screens.
 *
 * Rendered into <body> so it isn't clipped by a tile or card, and it stops
 * clicks from bubbling: the Monitoring Center tiles are links, and React
 * passes portal clicks up to them, which would navigate away mid-call.
 */
export function Overlay({
  label,
  onDismiss,
  children,
}: {
  label: string
  /** Escape key. The backdrop deliberately doesn't close: a misclick would hang up. */
  onDismiss: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      // The layer scrolls, not the page: on a short screen (a laptop with a
      // small window, a phone on its side) a call is taller than the view,
      // and hang-up must stay reachable. Centred when it fits.
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80"
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">{children}</div>
    </div>,
    document.body
  )
}
