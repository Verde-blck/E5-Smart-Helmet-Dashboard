import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import {
  createAdmin,
  createGroup,
  deleteAdmin,
  deleteGroup,
  fetchAdmins,
  fetchGroups,
  fetchPermissions,
  renameGroup,
  updateAdmin,
} from '../api/admins.api'
import type { AdministratorUpdate, NewAdministrator } from '../types'

export function useAdmins() {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.users(tenantId),
    queryFn: fetchAdmins,
  })
  return { admins: data ?? [], isLoading, isError }
}

export function useGroups() {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.roles(tenantId),
    queryFn: fetchGroups,
  })
  return { groups: data ?? [], isLoading, isError }
}

export function usePermissionCatalogue() {
  const tenantId = useTenantId()
  const { data } = useQuery({
    queryKey: [...qk.tenant(tenantId), 'permissions'] as const,
    queryFn: fetchPermissions,
    // The catalogue is fixed server-side; no reason to re-request it often.
    staleTime: 60 * 60_000,
  })
  return data ?? []
}

function useInvalidate() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.users(tenantId) })
    void queryClient.invalidateQueries({ queryKey: qk.roles(tenantId) })
  }
}

export function useCreateAdmin() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: NewAdministrator) => createAdmin(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAdmin() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: AdministratorUpdate }) =>
      updateAdmin(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeleteAdmin() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => deleteAdmin(id), onSuccess: invalidate })
}

export function useCreateGroup() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (name: string) => createGroup(name), onSuccess: invalidate })
}

export function useRenameGroup() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameGroup(id, name),
    onSuccess: invalidate,
  })
}

export function useDeleteGroup() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => deleteGroup(id), onSuccess: invalidate })
}
