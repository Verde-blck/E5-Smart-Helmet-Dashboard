import { usePermission } from '@/shared/hooks/usePermission'
import type { Permission } from '@/shared/constants/modules'

export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission | Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const can = usePermission()
  return <>{can(perm) ? children : fallback}</>
}
