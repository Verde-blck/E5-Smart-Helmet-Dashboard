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
  if (!can(perm)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}
