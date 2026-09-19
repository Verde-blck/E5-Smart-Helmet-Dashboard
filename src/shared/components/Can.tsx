import { usePermission } from '@/shared/hooks/usePermission'
import type { Permission } from '@/shared/constants/modules'

/**
 * Conditional rendering for anything below route level — action buttons,
 * menu entries, table columns.
 *
 *   <Can perm="videos:delete">
 *     <button onClick={onDelete}>Delete recording</button>
 *   </Can>
 */
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
