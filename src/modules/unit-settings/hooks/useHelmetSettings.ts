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
    mutationFn: (settings: HelmetSettings) =>
      saveHelmetSettings(deviceId as string, settings),
    onSuccess: (saved) => {
      // Write straight into the cache: the helmet may be offline, so a
      // refetch would return the old values until it next reports in.
      if (deviceId) queryClient.setQueryData(key(tenantId, deviceId), saved)
    },
  })
}
