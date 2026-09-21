import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { decodeToken, tokenStore } from '@/shared/lib/token'
import { mockUserFor } from '@/shared/lib/mock-data'
import { ALL_PERMISSIONS } from '@/shared/constants/modules'
import type { AuthUser } from '@/shared/store/authStore'

export interface Credentials {
  username: string
  password: string
}

/**
 * Builds the session user from the token alone.
 *
 * The API returns only `{ token }` — no name, no role, no permissions — and
 * has no /auth/me endpoint. Everything below the username is therefore
 * assumed, not granted: every authenticated account gets the full permission
 * set, because the backend has no concept of a partial one.
 *
 * The consequence is worth being explicit about: with a live backend, the
 * permission model in this dashboard is presentational. Nothing is being
 * enforced anywhere. It stays in place because the UI is built on it and the
 * backend may grow roles later, but it should not be described to anyone as
 * access control until it is.
 */
function userFromToken(token: string, fallbackUsername: string): AuthUser {
  const username = decodeToken(token)?.sub ?? fallbackUsername
  return {
    id: username,
    username,
    name: username,
    role: 'Administrator',
    permissions: ALL_PERMISSIONS,
    scope: { allSites: true, sites: [] },
  }
}

export async function login(credentials: Credentials): Promise<AuthUser> {
  if (env.useMocks) return mockUserFor(credentials.username)

  const { data } = await apiClient.post<{ token: string }>('/auth/login', credentials)
  tokenStore.set(data.token)
  return userFromToken(data.token, credentials.username)
}

/**
 * Restores a session after a page reload, from the stored token rather than
 * from the server. Returns null when there's no token or it has expired.
 */
export function restoreSession(): AuthUser | null {
  const token = tokenStore.get()
  return token ? userFromToken(token, 'admin') : null
}

/**
 * There is no logout endpoint, so this only clears the client. The token stays
 * valid at the server for the rest of its 24 hours — worth knowing on a shared
 * machine, and worth asking the backend for a revocation endpoint.
 */
export function clearSession(): void {
  tokenStore.clear()
}

/** No password-change endpoint exists yet; kept so the UI can stay wired. */
export async function changeOwnPassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (env.useMocks) return
  await apiClient.post('/auth/password', input)
}
