import { mockTenant } from '@/shared/lib/mock-data'
import type { TenantProfile } from '../types'

// Mutable so edits survive within a session, the way a saved profile would.
let profile: TenantProfile = {
  id: mockTenant.id,
  name: mockTenant.name,
  logoUrl: mockTenant.logoUrl,
  colors: { ...mockTenant.colors },
  supportEmail: 'safety@acme-construction.example',
}

export function getMockProfile(): TenantProfile {
  return { ...profile, colors: { ...profile.colors } }
}

export function updateMockProfile(patch: Partial<TenantProfile>): TenantProfile {
  profile = {
    ...profile,
    ...patch,
    colors: { ...profile.colors, ...(patch.colors ?? {}) },
  }
  return getMockProfile()
}

/** Mocks keep the logo as a data URL; the real backend returns a stored URL. */
export async function uploadMockLogo(file: File): Promise<{ logoUrl: string }> {
  const logoUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })

  profile = { ...profile, logoUrl }
  return { logoUrl }
}

export function removeMockLogo(): void {
  profile = { ...profile, logoUrl: '' }
}