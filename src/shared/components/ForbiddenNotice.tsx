import { useEffect, useRef, useState } from 'react'
import type { ForbiddenDetail } from '@/shared/lib/api-client'
import { refreshSession } from '@/modules/auth/api/auth.api'
import { PERMISSION_TREE, viewCodeOf } from '@/modules/users/lib/permissions'
import type { PermissionNode } from '@/modules/users/lib/permissions'

function describe(code: string): string {
  const find = (nodes: PermissionNode[]): PermissionNode | undefined => {
    for (const n of nodes) {
      if (n.code === viewCodeOf(code)) return n
      const inner = n.children && find(n.children)
      if (inner) return inner
    }
    return undefined
  }
  const label = find(PERMISSION_TREE)?.label ?? code.replace(/_/g, ' ').toLowerCase()
  return code.endsWith('_MANAGE') ? `change ${label}` : label
}

function messageFor(detail: ForbiddenDetail): string {
  if (detail.deviceId) return 'That helmet isn’t one of the helmets assigned to you.'
  if (detail.permission) {
    return `Your role doesn’t include ${describe(detail.permission)}. Ask an administrator to add it.`
  }
  return 'Your role doesn’t allow that. Ask an administrator.'
}

export function ForbiddenNotice() {
  const [message, setMessage] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefresh = useRef(0)

  useEffect(() => {
    const onForbidden = (e: Event) => {
      setMessage(messageFor((e as CustomEvent<ForbiddenDetail>).detail ?? {}))
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setMessage(null), 6000)
      if (Date.now() - lastRefresh.current > 5000) {
        lastRefresh.current = Date.now()
        void refreshSession()
      }
    }
    window.addEventListener('auth:forbidden', onForbidden)
    return () => {
      window.removeEventListener('auth:forbidden', onForbidden)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  if (!message) return null
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg"
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <p className="min-w-0 flex-1">{message}</p>
      <button onClick={() => setMessage(null)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-700">
        ×
      </button>
    </div>
  )
}
