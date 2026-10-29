import { useQueries } from '@tanstack/react-query'
import { features } from '@/config/features'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { fetchGasLiveness } from '../api/gas.api'
import type { GasLiveness } from '../api/gas.api'
import type { DeviceView } from '../types'

// The backend's answer when it has one; otherwise derived from presence, so a failed request
// never shows stale readings as current.
function fallback(device: DeviceView, now: number): GasLiveness {
  const online = device.presence !== 'offline'
  const gasAt = device.telemetry.gasAt
  return {
    online,
    ageSeconds: gasAt ? Math.max(0, Math.round((now - gasAt) / 1000)) : null,
    live: online,
  }
}

export function useGasLiveness(devices: DeviceView[]): Map<string, GasLiveness> {
  const tenantId = useTenantId()
  const results = useQueries({
    queries: devices.map((d) => ({
      queryKey: [...qk.devices.all(tenantId), 'gas-liveness', d.id],
      queryFn: () => fetchGasLiveness(d.id),
      refetchInterval: features.pollIntervalMs,
      retry: false,
    })),
  })
  const now = Date.now()
  return new Map(devices.map((d, i) => [d.id, results[i]?.data ?? fallback(d, now)]))
}
