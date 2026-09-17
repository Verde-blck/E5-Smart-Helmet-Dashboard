import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { fetchDeviceTelemetry } from '../api/devices.api'
import {
  deriveConnectionPeriods,
  lowestBattery,
  outageCount,
  uptimeRatio,
} from '../lib/history'
import type { HistoryRange } from '../types'

export function useDeviceHistory(deviceId: string, range: HistoryRange) {
  const tenantId = useTenantId()

  const { data, isLoading, isError } = useQuery({
    // Keyed on range only. Putting the window's end timestamp in the key would
    // mint a new cache entry every render and refetch forever.
    queryKey: qk.devices.telemetry(tenantId, deviceId, range),
    queryFn: () => fetchDeviceTelemetry(deviceId, range),
    enabled: !!deviceId,
    staleTime: 60_000,
  })

  const derived = useMemo(() => {
    if (!data) return null
    const periods = deriveConnectionPeriods(data)
    return {
      periods,
      uptime: uptimeRatio(periods),
      outages: outageCount(periods),
      minBattery: lowestBattery(data.samples),
    }
  }, [data])

  return { window: data ?? null, derived, isLoading, isError }
}