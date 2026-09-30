import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { fetchHelmetSettings, saveHelmetSettings } from '../api/settings.api'
import type { HelmetSettings } from '../types'

function key(tenantId: string, deviceId: string) {
  return [...qk.devices.detail(tenantId, deviceId), 'settings'] as const
}

export function useHelmetSettings(deviceId: string | null) {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: key(tenantId, deviceId ?? ''),
    queryFn: () => fetchHelmetSettings(deviceId as string),
    enabled: !!deviceId,
  })
  return { settings: data ?? null, isLoading, isError }
}

export function useSaveHelmetSettings(deviceId: string | null) {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()

  return useMutation({
    mutationFn: ({ before, after }: { before: HelmetSettings; after: HelmetSettings }) =>
      saveHelmetSettings(deviceId as string, before, after),
    onSuccess: (result) => {
      // Write straight into the cache. The saved values are what the backend
      // now holds, and they become the new baseline for the next diff.
      if (deviceId) queryClient.setQueryData(key(tenantId, deviceId), result.settings)
    },
  })
}
