import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { features } from '@/config/features'
import { qk } from '@/shared/lib/query-keys'
import { fetchMessages, sendVoiceMessage } from '../api/messages.api'

function key(tenantId: string, deviceId: string) {
  return [...qk.devices.detail(tenantId, deviceId), 'messages'] as const
}

export function useMessages(deviceId: string | null) {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: key(tenantId, deviceId ?? ''),
    queryFn: () => fetchMessages(deviceId as string),
    enabled: !!deviceId,
    // Polled so a reply from the helmet appears without the operator
    // reopening the panel.
    refetchInterval: features.realtimeSocket ? false : features.pollIntervalMs,
  })
  return { messages: data ?? [], isLoading, isError }
}

export function useSendVoiceMessage(deviceId: string | null) {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()

  return useMutation({
    mutationFn: (file: Blob) => sendVoiceMessage(deviceId as string, file),
    onSuccess: () => {
      if (deviceId) {
        void queryClient.invalidateQueries({ queryKey: key(tenantId, deviceId) })
      }
    },
  })
}
