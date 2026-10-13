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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6"
    >
      {children}
    </div>,
    document.body
  )
}
