import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useAuthStore } from '@/shared/store/authStore'
import { applyBrandColors } from '@/shared/lib/color'
import { qk } from '@/shared/lib/query-keys'
import { fetchProfile, removeLogo, updateProfile, uploadLogo } from '../api/profile.api'
import type { TenantProfile } from '../types'

/**
 * Saving branding has to update two places: the query cache (so this form is
 * consistent) and the auth store's tenant (so the sidebar, topbar and login
 * screen repaint immediately). Missing the second is why rebranding tools
 * usually need a page refresh to show their own result.
 */
function useCommitProfile() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const setTenant = useAuthStore((s) => s.setTenant)
  const tenant = useAuthStore((s) => s.tenant)

  return (profile: TenantProfile) => {
    queryClient.setQueryData(qk.profile(tenantId), profile)
    setTenant({
      ...(tenant ?? { id: profile.id }),
      id: profile.id,
      name: profile.name,
      logoUrl: profile.logoUrl,
      colors: profile.colors,
    })
    applyBrandColors(profile.colors)
  }
}

export function useTenantProfile() {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.profile(tenantId),
    queryFn: fetchProfile,
  })
  return { profile: data ?? null, isLoading, isError }
}

export function useUpdateProfile() {
  const commit = useCommitProfile()
  return useMutation({
    mutationFn: (patch: Partial<TenantProfile>) => updateProfile(patch),
    onSuccess: commit,
  })
}

export function useUploadLogo() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const commit = useCommitProfile()

  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: ({ logoUrl }) => {
      const current = queryClient.getQueryData<TenantProfile>(qk.profile(tenantId))
      if (current) commit({ ...current, logoUrl })
    },
  })
}

export function useRemoveLogo() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const commit = useCommitProfile()

  return useMutation({
    mutationFn: () => removeLogo(),
    onSuccess: () => {
      const current = queryClient.getQueryData<TenantProfile>(qk.profile(tenantId))
      if (current) commit({ ...current, logoUrl: '' })
    },
  })
}