import { useAuthStore } from '@/shared/store/authStore'

export function useTenant() {
  return useAuthStore((s) => s.tenant)
}

/**
 * Every React Query key is prefixed with this. In SaaS mode a user who belongs
 * to two orgs can switch tenants, and without the prefix the cache will serve
 * org A's fleet to org B for as long as the data stays fresh.
 */
export function useTenantId() {
  return useAuthStore((s) => s.tenant?.id ?? 'unknown')
}
