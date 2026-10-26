import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import {
  getMockProfile,
  removeMockLogo,
  updateMockProfile,
  uploadMockLogo,
} from './profile.mock'
import type { TenantProfile } from '../types'

interface ApiCompany {
  companyName?: string | null
  supportEmail?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  updatedAt?: string | null
}

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

export function profileErrorMessage(error: unknown, fallback: string): string {
  const res = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })
    ?.response
  if (res?.status === 403) return 'Your role doesn’t allow changing the company profile.'
  const message = res?.data?.message
  return message ? message.charAt(0).toUpperCase() + message.slice(1) + '.' : fallback
}
