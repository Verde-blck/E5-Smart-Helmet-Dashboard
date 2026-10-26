import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import {
  deleteFence,
  fetchFences,
  removeWarningAudio,
  saveFence,
  uploadWarningAudio,
} from '../api/fences.api'
import type { FenceDraft } from '../types'

export function useFences(enabled = true) {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.fences.all(tenantId),
    queryFn: fetchFences,
    staleTime: 60_000,
    enabled,
  })
  return { fences: data ?? [], isLoading, isError }
}

export function useSaveFence() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  return useMutation({
    mutationFn: async ({
      draft,
      id,
      clip,
    }: {
      draft: FenceDraft
      id?: number
      clip?: Blob | null
    }) => {
      const saved = await saveFence(draft, id)
      if (clip) await uploadWarningAudio(saved.id, clip)
      else if (clip === null) await removeWarningAudio(saved.id)
      return saved
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.fences.all(tenantId) }),
  })
}

export function useDeleteFence() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  return useMutation({
    mutationFn: deleteFence,
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.fences.all(tenantId) }),
  })
}
