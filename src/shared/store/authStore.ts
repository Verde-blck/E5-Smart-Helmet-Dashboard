import { create } from 'zustand'
import type { Permission } from '@/shared/constants/modules'

export interface TenantConfig {
  id: string
  name: string
  logoUrl: string
  colors: { primary: string; secondary: string }
}

/**
 * Which sites this user may see. Computed by the backend from their assigned
 * site and whether their role is unscoped — NOT derived in the browser, so
 * there is one authority for the rule rather than two that can drift.
 */
export interface SiteScope {
  allSites: boolean
  sites: string[]
}

export interface AuthUser {
  id: string
  /** Login identifier. Site workers often have no reliable work email. */
  staffId: string
  name: string
  /** Contact only — not used to sign in. */
  email?: string
  role: string
  permissions: Permission[] // e.g. ['devices:read', 'media:read']
  /**
   * Set when an administrator issued or reset the password. The app refuses to
   * render anything but the change-password screen until it's cleared, so an
   * admin never keeps working knowledge of someone else's credentials.
   */
  mustChangePassword?: boolean
  scope?: SiteScope
}

interface AuthState {
  user: AuthUser | null
  tenant: TenantConfig | null
  isBootstrapping: boolean // true while auth+tenant are being resolved on app load
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  setTenant: (tenant: TenantConfig) => void
  setBootstrapping: (v: boolean) => void
  clearUser: () => void
}

// Single global slice for auth/tenant/session state, per the architecture
// doc: React Query owns server *data*, Zustand owns this kind of
// cross-cutting UI/session state that many unrelated components need.
//
// Note: clearUser() only touches this store. Ending a session properly also
// has to stop the socket and clear the query cache — use endSession() in
// shared/lib/session.ts, never this directly.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isBootstrapping: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTenant: (tenant) => set({ tenant }),
  setBootstrapping: (v) => set({ isBootstrapping: v }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}))
