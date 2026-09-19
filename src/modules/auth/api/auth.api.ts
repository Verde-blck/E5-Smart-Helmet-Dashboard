import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { mockUserFor } from '@/shared/lib/mock-data'
import type { AuthUser } from '@/shared/store/authStore'

export interface Credentials {
  username: string
  password: string
}

/**
 * Username, not email. Users are provisioned by an administrator and many have
 * no work email at all, so the identifier has to be one the employer issues.
 */
export async function login(credentials: Credentials): Promise<AuthUser> {
  if (env.useMocks) return mockUserFor(credentials.username)
  const { data } = await apiClient.post<AuthUser>('/auth/login', credentials)
  return data
}

/**
 * Called by the user on themselves. The backend verifies currentPassword
 * rather than trusting the session alone — a stolen session shouldn't be
 * enough to change the password and lock the real owner out.
 */
export async function changeOwnPassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (env.useMocks) return
  await apiClient.post('/auth/password', input)
}
