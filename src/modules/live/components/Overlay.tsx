import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Overlay({
  label,
  onDismiss,
  children,
}: {
  label: string
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80"
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">{children}</div>
    </div>,
    document.body
  )
}
