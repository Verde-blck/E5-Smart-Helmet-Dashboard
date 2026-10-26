import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import type { Permission } from '@/shared/constants/modules'

export function usePermission() {
  const permissions = useAuthStore((s) => s.user?.permissions)
  const granted = useMemo(() => new Set(permissions ?? []), [permissions])

  return useCallback(
    (required: Permission | Permission[]) =>
      (Array.isArray(required) ? required : [required]).every((p) => granted.has(p)),
    [granted]
  )
}
