import { useAuthStore } from '@/shared/store/authStore'

export function useTenant() {
  return useAuthStore((s) => s.tenant)
}

// Tenant-prefixed keys stop the cache serving one organisation's fleet to another.
export function useTenantId() {
  return useAuthStore((s) => s.tenant?.id ?? 'unknown')
}
