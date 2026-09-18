import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useNow } from '@/shared/hooks/useNow'
import { useSiteScope } from '@/shared/hooks/useSiteScope'
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
  const { inScope } = useSiteScope()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.devices.all(tenantId),
    queryFn: fetchDevices,
  })

  const devices = useMemo<DeviceView[]>(
    () => (data ?? []).filter((d) => inScope(d.site)).map((d) => toDeviceView(d, now)),
    [data, now, inScope]
  )

  return { devices, now, isLoading, isError, refetch }
}

export function useDevice(id: string) {
  const tenantId = useTenantId()
  const now = useNow()
  const { inScope } = useSiteScope()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.devices.detail(tenantId, id),
    queryFn: () => fetchDevice(id),
    enabled: !!id,
  })

  const device = useMemo<DeviceView | null>(
    () => (data ? toDeviceView(data, now) : null),
    [data, now]
  )

  // Reached by a pasted or bookmarked link to a helmet at another site. The
  // server should 404 it; this keeps the UI honest if it doesn't.
  const outOfScope = !!data && !inScope(data.site)

  return { device: outOfScope ? null : device, outOfScope, now, isLoading, isError }
}
