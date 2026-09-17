import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import type { Permission } from '@/shared/constants/modules'

/**
 * Returns a checker rather than a boolean so one call site can test several
 * permissions (and so it can be used inside .filter()).
 *
 * This is UX only. It exists so users don't see buttons that will 403. The
 * backend must check the identical permission strings on every endpoint,
 * derived from the JWT and never from the request body.
 */
export function usePermission() {
  const permissions = useAuthStore((s) => s.user?.permissions)
  const granted = useMemo(() => new Set(permissions ?? []), [permissions])

  return useCallback(
    (required: Permission | Permission[]) =>
      (Array.isArray(required) ? required : [required]).every((p) => granted.has(p)),
    [granted]
  )
}
