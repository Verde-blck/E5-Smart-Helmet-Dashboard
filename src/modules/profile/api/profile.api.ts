import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import {
  getMockProfile,
  removeMockLogo,
  updateMockProfile,
  uploadMockLogo,
} from './profile.mock'
import type { TenantProfile } from '../types'

/**
 * No tenant id in any of these calls, by design. The backend resolves the
 * tenant from the session claim. If the endpoint accepted an id from the
 * client, any authenticated user could rebrand — or read the branding of —
 * another company by editing a request.
 */
export async function fetchProfile(): Promise<TenantProfile> {
  if (env.useMocks) return getMockProfile()
  const { data } = await apiClient.get<TenantProfile>('/tenant/profile')
  return data
}

export async function updateProfile(patch: Partial<TenantProfile>): Promise<TenantProfile> {
  if (env.useMocks) return updateMockProfile(patch)
  const { data } = await apiClient.patch<TenantProfile>('/tenant/profile', patch)
  return data
}

/**
 * Logos go through the API rather than straight to object storage, unlike
 * helmet media. They're small, and the server needs the bytes in hand to
 * verify the real content type, re-encode, and cap the dimensions. Trusting a
 * client-declared MIME type here would let an SVG through under an image/png
 * label.
 */
export async function uploadLogo(file: File): Promise<{ logoUrl: string }> {
  if (env.useMocks) return uploadMockLogo(file)

  const form = new FormData()
  form.append('logo', file)
  const { data } = await apiClient.post<{ logoUrl: string }>('/tenant/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function removeLogo(): Promise<void> {
  if (env.useMocks) return removeMockLogo()
  await apiClient.delete('/tenant/logo')
}