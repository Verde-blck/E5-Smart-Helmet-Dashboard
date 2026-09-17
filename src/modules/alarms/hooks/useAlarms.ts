import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useNow } from '@/shared/hooks/useNow'
import { useAuth } from '@/shared/hooks/useAuth'
import { qk } from '@/shared/lib/query-keys'
import { acknowledgeAlarm, fetchAlarms } from '../api/alarms.api'
import type { Alarm } from '../types'

export function useAlarms() {
  const tenantId = useTenantId()
  const now = useNow()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.alarms.all(tenantId),
    queryFn: fetchAlarms,
  })

  // Newest first, active always above history — an operator opening this page
  // during an incident should not have to scroll to find the live event.
  const alarms = useMemo(() => {
    const list = data ?? []
    return [...list].sort((a, b) => {
      const activeDelta = Number(b.status === 'active') - Number(a.status === 'active')
      return activeDelta !== 0 ? activeDelta : b.raisedAt - a.raisedAt
    })
  }, [data])

  const active = useMemo(() => alarms.filter((a) => a.status === 'active'), [alarms])

  return { alarms, active, now, isLoading, isError }
}

export function useAcknowledgeAlarm() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => acknowledgeAlarm(id, user?.name ?? 'Unknown'),
    onMutate: async (id) => {
      // Optimistic: an acknowledge that takes a round-trip to grey out feels
      // broken during an incident, which is exactly when it gets used.
      const key = qk.alarms.all(tenantId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Alarm[]>(key)

      queryClient.setQueryData<Alarm[]>(key, (prev) =>
        prev?.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'acknowledged',
                acknowledgedAt: Date.now(),
                acknowledgedBy: user?.name,
              }
            : a
        )
      )

      return { previous, key }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _err, _id, context) => {
      if (context?.key) void queryClient.invalidateQueries({ queryKey: context.key })
    },
  })
}
