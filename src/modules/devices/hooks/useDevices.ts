import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useNow } from '@/shared/hooks/useNow'
import { qk } from '@/shared/lib/query-keys'
import { fetchDevice, fetchDevices } from '../api/devices.api'
import { toDeviceView } from '../lib/presence'
import type { DeviceView } from '../types'

// These hooks return DeviceView, not Device: presence is resolved here against
// a ticking clock so every consumer sees the same answer and none of them have
// to remember to recompute it.

export function useDevices() {
  const tenantId = useTenantId()
  const now = useNow()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.devices.all(tenantId),
    queryFn: fetchDevices,
  })

  const devices = useMemo<DeviceView[]>(
    () => (data ?? []).map((d) => toDeviceView(d, now)),
    [data, now]
  )

  return { devices, now, isLoading, isError, refetch }
}

export function useDevice(id: string) {
  const tenantId = useTenantId()
  const now = useNow()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.devices.detail(tenantId, id),
    queryFn: () => fetchDevice(id),
    enabled: !!id,
  })

  const device = useMemo<DeviceView | null>(
    () => (data ? toDeviceView(data, now) : null),
    [data, now]
  )

  return { device, now, isLoading, isError }
}
