import { create } from 'zustand'
import type { Permission } from '@/shared/constants/modules'

export interface TenantConfig {
  id: string
  name: string
  logoUrl: string
  colors: { primary: string; secondary: string }
  mapsApiKey?: string
  mapsMapId?: string
}

export interface SiteScope {
  allSites: boolean
  sites: string[]
}

export interface AuthUser {
  id: string
  username: string
  name: string
  email?: string
  role: string
  permissions: Permission[]
  mustChangePassword?: boolean
  scope?: SiteScope
  superAdmin?: boolean
  apiPermissions?: string[]
  deviceIds?: string[]
  mustSetup2fa?: boolean
  twoFactorEnabled?: boolean
}

interface AuthState {
  user: AuthUser | null
  tenant: TenantConfig | null
  isBootstrapping: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  setTenant: (tenant: TenantConfig) => void
  setBootstrapping: (v: boolean) => void
  clearUser: () => void
}

// clearUser() only touches this store; use endSession() to sign out.
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
