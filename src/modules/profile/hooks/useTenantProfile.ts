import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useAuthStore } from '@/shared/store/authStore'
import { applyBrandColors } from '@/shared/lib/color'
import { qk } from '@/shared/lib/query-keys'
import { fetchProfile, removeLogo, updateProfile, uploadLogo } from '../api/profile.api'
import type { TenantProfile } from '../types'

// Update both the query cache and the auth store's tenant, or the sidebar and sign-in page keep the
// old branding until a reload.
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
  const commit = useCommitProfile()
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: commit,
  })
}

export function useRemoveLogo() {
  const commit = useCommitProfile()
  return useMutation({
    mutationFn: () => removeLogo(),
    onSuccess: commit,
  })
}
