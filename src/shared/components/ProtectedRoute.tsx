import { Navigate } from 'react-router-dom'
import { usePermission } from '@/shared/hooks/usePermission'
import type { Permission } from '@/shared/constants/modules'

export function ProtectedRoute({
  perm,
  children,
}: {
  perm: Permission
  children: React.ReactNode
}) {
  const can = usePermission()
  // /unauthorized now renders inside the Layout, so a user who lands there
  // still has the sidebar and can navigate somewhere they do have access to.
  if (!can(perm)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}
