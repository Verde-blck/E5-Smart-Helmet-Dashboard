import { create } from 'zustand'
import type { Permission } from '@/shared/constants/modules'

export interface TenantConfig {
  id: string
  name: string
  logoUrl: string
  colors: { primary: string; secondary: string }
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  permissions: Permission[] // e.g. ['devices:read', 'media:read']
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
