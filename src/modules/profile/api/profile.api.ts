import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import {
  getMockProfile,
  removeMockLogo,
  updateMockProfile,
  uploadMockLogo,
} from './profile.mock'
import type { TenantProfile } from '../types'

/*
 * Company profile and branding, from the backend's guide of 21 Oct 2026.
 *
 *   GET    /branding               public: the sign-in page and start-up
 *   GET    /settings/company       any signed-in user
 *   PUT    /settings/company       ADMINISTRATOR_SETTING; any subset, "" clears a field
 *   POST   /settings/company/logo  ADMINISTRATOR_SETTING; multipart field "file"
 *   DELETE /settings/company/logo  ADMINISTRATOR_SETTING
 *
 * All five answer with the profile. The tenant comes from the session, never
 * from the request, so nobody can rebrand another company by editing one.
 */

interface ApiCompany {
  companyName?: string | null
  supportEmail?: string | null
  /** Signed, valid for an hour: use it, never store it. */
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  updatedAt?: string | null
}

/** Fields that aren't set come back null: fall back to the default E5 look. */
function toProfile(api: ApiCompany | null | undefined): TenantProfile {
  return {
    id: 'standalone',
    name: api?.companyName?.trim() || env.standaloneAppName,
    logoUrl: api?.logoUrl || env.standaloneLogoUrl,
    colors: {
      primary: api?.primaryColor || env.standaloneBrandPrimary,
      secondary: api?.secondaryColor || env.standaloneBrandSecondary,
    },
    supportEmail: api?.supportEmail || undefined,
  }
}

/** The look before anyone signs in. No token needed. */
export async function fetchBranding(): Promise<TenantProfile> {
  if (env.useMocks) return getMockProfile()
  const { data } = await apiClient.get<ApiCompany>('/branding')
  return toProfile(data)
}

export async function fetchProfile(): Promise<TenantProfile> {
  if (env.useMocks) return getMockProfile()
  const { data } = await apiClient.get<ApiCompany>('/settings/company')
  return toProfile(data)
}

/** Sends only what's in the patch. An empty support email clears it. */
export async function updateProfile(patch: Partial<TenantProfile>): Promise<TenantProfile> {
  if (env.useMocks) return updateMockProfile(patch)
  const body: Partial<ApiCompany> = {}
  if (patch.name !== undefined) body.companyName = patch.name.trim()
  if (patch.supportEmail !== undefined) body.supportEmail = patch.supportEmail.trim()
  if (patch.colors) {
    body.primaryColor = patch.colors.primary
    body.secondaryColor = patch.colors.secondary
  }
  const { data } = await apiClient.put<ApiCompany>('/settings/company', body)
  return toProfile(data)
}

/**
 * Logos go through the API, which checks the real image (not the file name):
 * PNG, JPEG or WebP, at most 512 KB and 1024 px a side. Replacing one
 * deletes the old file.
 */
export async function uploadLogo(file: File): Promise<TenantProfile> {
  if (env.useMocks) {
    const { logoUrl } = await uploadMockLogo(file)
    return { ...(await getMockProfile()), logoUrl }
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<ApiCompany>('/settings/company/logo', form)
  return toProfile(data)
}

export async function removeLogo(): Promise<TenantProfile> {
  if (env.useMocks) {
    await removeMockLogo()
    return { ...(await getMockProfile()), logoUrl: '' }
  }
  const { data } = await apiClient.delete<ApiCompany>('/settings/company/logo')
  return toProfile(data)
}

/**
 * The backend's own reason, e.g. "logo must be at most 1024 px on each side
 * (this one is 1200 x 800)". Nothing is saved if any field is invalid.
 */
export function profileErrorMessage(error: unknown, fallback: string): string {
  const res = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })
    ?.response
  if (res?.status === 403) return 'Your role doesn’t allow changing the company profile.'
  const message = res?.data?.message
  return message ? message.charAt(0).toUpperCase() + message.slice(1) + '.' : fallback
}
