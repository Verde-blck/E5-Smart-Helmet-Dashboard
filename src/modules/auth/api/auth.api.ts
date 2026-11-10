import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { decodeToken, tokenStore } from '@/shared/lib/token'
import { mockUserFor } from '@/shared/lib/mock-data'
import { ALL_PERMISSIONS } from '@/shared/constants/modules'
import type { Permission } from '@/shared/constants/modules'
import { useAuthStore } from '@/shared/store/authStore'
import type { AuthUser } from '@/shared/store/authStore'
import { expandPermissions } from '@/modules/users/lib/permissions'

export interface Credentials {
  username: string
  password: string
}

interface ApiProfile {
  username?: string
  roleName?: string | null
  superAdmin?: boolean
  permissions?: string[]
  deviceIds?: string[]
  twoFactorEnabled?: boolean
  mustSetup2fa?: boolean
  mustChangePassword?: boolean
}

function isProfile(value: unknown): value is ApiProfile {
  const v = value as ApiProfile | null
  return !!v && (Array.isArray(v.permissions) || typeof v.superAdmin === 'boolean')
}

function userFromProfile(profile: ApiProfile, fallbackUsername: string): AuthUser {
  const username = profile.username ?? fallbackUsername
  const codes = profile.permissions ?? []
  return {
    id: username,
    username,
    name: username,
    role: profile.superAdmin ? 'Super admin' : profile.roleName || 'Administrator',
    permissions: profile.superAdmin ? ALL_PERMISSIONS : (expandPermissions(codes) as Permission[]),
    apiPermissions: codes,
    superAdmin: profile.superAdmin === true,
    deviceIds: profile.deviceIds ?? [],
    mustSetup2fa: profile.mustSetup2fa === true,
    mustChangePassword: profile.mustChangePassword === true,
    twoFactorEnabled: profile.twoFactorEnabled,
    scope: { allSites: true, sites: [] },
  }
}

const PROFILE_KEY = 'e5.profile'
const tokenTag = (token: string) => token.slice(-24)

function cacheProfile(token: string, profile: ApiProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ tag: tokenTag(token), profile }))
  } catch {
    // Storage unavailable; the next reload just waits for /auth/me.
  }
}

function cachedProfile(token: string): ApiProfile | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as { tag?: string; profile?: ApiProfile } | null
    return raw?.tag === tokenTag(token) && isProfile(raw.profile) ? raw.profile : null
  } catch {
    return null
  }
}

export async function fetchProfile(): Promise<ApiProfile> {
  const { data } = await apiClient.get<ApiProfile>('/auth/me')
  return data
}

async function completeSignIn(token: string, response: unknown, username: string): Promise<AuthUser> {
  tokenStore.set(token)
  const inline = response as { profile?: unknown } | null
  const profile = isProfile(inline?.profile)
    ? (inline!.profile as ApiProfile)
    : isProfile(response)
      ? response
      : await fetchProfile()
  cacheProfile(token, profile)
  if (typeof profile.twoFactorEnabled === 'boolean') {
    rememberTwoFactor(profile.username ?? username, profile.twoFactorEnabled)
  }
  return userFromProfile(profile, username)
}

export async function refreshSession(): Promise<void> {
  const token = tokenStore.get()
  if (!token || env.useMocks) return
  try {
    const profile = await fetchProfile()
    cacheProfile(token, profile)
    const current = useAuthStore.getState().user
    useAuthStore.getState().setUser({
      ...userFromProfile(profile, current?.username ?? 'admin'),
    })
  } catch {
    // A 401 ends the session through the API client; anything else keeps
    // the current user until the next try.
  }
}

export interface TwoFactorChallenge {
  username: string
  // Issued by the backend with requires2fa; it replaces the username when verifying.
  challenge?: string
}

export type LoginResult =
  | { status: 'signed-in'; user: AuthUser }
  | { status: 'needs-code'; challenge: TwoFactorChallenge }

interface LoginResponse {
  token?: string
  requires2fa?: boolean
  challenge?: string
}

const MOCK_2FA_USER = 'MFA-001'
const MOCK_CODE = '123456'

export async function login(credentials: Credentials): Promise<LoginResult> {
  if (env.useMocks) {
    if (credentials.username === MOCK_2FA_USER) {
      rememberTwoFactor(credentials.username, true)
      return { status: 'needs-code', challenge: { username: credentials.username } }
    }
    return { status: 'signed-in', user: mockUserFor(credentials.username) }
  }

  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials)

  if (data.requires2fa) {
    if (!data.challenge) throw new Error('missing_2fa_challenge')
    rememberTwoFactor(credentials.username, true)
    return {
      status: 'needs-code',
      challenge: { username: credentials.username, challenge: data.challenge },
    }
  }

  if (!data.token) throw new Error('Sign-in response contained no token')
  rememberTwoFactor(credentials.username, false)
  const user = await completeSignIn(data.token, data, credentials.username)
  return { status: 'signed-in', user }
}

export async function verifyTwoFactorLogin(
  challenge: TwoFactorChallenge,
  code: string
): Promise<AuthUser> {
  if (env.useMocks) {
    await delay(400)
    if (code !== MOCK_CODE) throw httpError(401)
    return mockUserFor(challenge.username)
  }

  if (!challenge.challenge) throw new Error('missing_2fa_challenge')
  const { data } = await apiClient.post<{ token: string } & ApiProfile>('/auth/login/verify-2fa', {
    challenge: challenge.challenge,
    code,
  })
  return completeSignIn(data.token, data, challenge.username)
}

export interface TwoFactorSetup {
  secret: string
  otpAuthUrl: string
}

export type TwoFactorRefusal = 'already-enabled' | 'required-by-company'

export function twoFactorRefusal(error: unknown): TwoFactorRefusal | null {
  const res = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  if (res?.status !== 409) return null
  if (res.data?.error === '2fa_already_enabled') return 'already-enabled'
  if (res.data?.error === '2fa_required_by_company') return 'required-by-company'
  return null
}

export async function startTwoFactorSetup(username: string, currentCode?: string): Promise<TwoFactorSetup> {
  if (env.useMocks) {
    await delay(400)
    const secret = 'JBSWY3DPEHPK3PXP'
    const label = encodeURIComponent(`E5 Energy:${username}`)
    return {
      secret,
      otpAuthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=E5%20Energy`,
    }
  }

  const { data } = await apiClient.post<TwoFactorSetup>(
    '/auth/2fa/setup',
    currentCode ? { code: currentCode } : undefined
  )
  return data
}

export async function confirmTwoFactorSetup(username: string, code: string): Promise<void> {
  if (env.useMocks) {
    await delay(400)
    if (code !== MOCK_CODE) throw httpError(401)
  } else {
    await apiClient.post('/auth/2fa/confirm', { code })
  }
  rememberTwoFactor(username, true)
}

export async function disableTwoFactor(username: string, code: string): Promise<void> {
  if (env.useMocks) {
    await delay(400)
    if (code !== MOCK_CODE) throw httpError(401)
  } else {
    await apiClient.post('/auth/2fa/disable', { code })
  }
  rememberTwoFactor(username, false)
}

const stateKey = (username: string) => `e5.twoFactor.${username}`

function rememberTwoFactor(username: string, enabled: boolean): void {
  try {
    localStorage.setItem(stateKey(username), enabled ? 'on' : 'off')
  } catch {
    // Storage unavailable (private mode); the page will show "unknown".
  }
}

export function knownTwoFactorState(username: string): boolean | null {
  try {
    const value = localStorage.getItem(stateKey(username))
    return value === 'on' ? true : value === 'off' ? false : null
  } catch {
    return null
  }
}

export function restoreSession(): AuthUser | null {
  const token = tokenStore.get()
  if (!token) return null
  void Promise.resolve().then(refreshSession)
  const cached = cachedProfile(token)
  return cached
    ? userFromProfile(cached, decodeToken(token)?.sub ?? 'admin')
    : // Nothing cached: show nothing until /auth/me answers, rather than everything.
      userFromProfile({ permissions: [] }, decodeToken(token)?.sub ?? 'admin')
}

export function clearSession(): void {
  tokenStore.clear()
  try {
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // Nothing to clear.
  }
}

export async function changeOwnPassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (env.useMocks) return
  const { data } = await apiClient.post<{ token?: string }>('/auth/change-password', input)
  // The old token stops working the moment the password changes.
  if (data?.token) tokenStore.set(data.token)
}

// Ends the session on every device. Fired after the local sign-out, with the token captured first,
// so signing out is instant; keepalive lets the request finish even if the page unloads.
export function logoutEverywhere(token: string | null): void {
  if (env.useMocks || !token) return
  const base = (apiClient.defaults.baseURL ?? '/api').replace(/\/$/, '')
  void fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => undefined)
}

// The verification step can't continue: the challenge is missing, expired, or its code already used.
export function isChallengeProblem(error: unknown): boolean {
  if (error instanceof Error && error.message === 'missing_2fa_challenge') return true
  const res = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  return res?.status === 410 || /challenge|expired|already_used/i.test(res?.data?.error ?? '')
}

export function challengeProblemNotice(error: unknown): string {
  const code = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
  return code === 'code_already_used'
    ? 'That code has already been used. Enter your password again, then use the next code from your app.'
    : 'Your verification step expired. Enter your password again to get a new one.'
}

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Wait 15 minutes and try again.'

export function isTooManyAttempts(error: unknown): boolean {
  const res = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  return res?.status === 429 || res?.data?.error === 'too_many_attempts'
}

/** The backend's reason for refusing a password change, in words a user can act on. */
export function passwordChangeError(error: unknown): string {
  const res = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  if (isTooManyAttempts(error)) return TOO_MANY_ATTEMPTS
  switch (res?.data?.error) {
    case 'wrong_current_password':
      return 'That current password isn’t right.'
    case 'password_too_short':
      return 'Your new password needs at least 8 characters.'
    case 'same_password':
      return 'Choose a new password that’s different from your current one.'
  }
  if (!res) return 'Could not reach the server. Check your connection and try again.'
  if (res.status === 401) return 'That current password isn’t right.'
  return 'Could not change your password. Please try again.'
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function httpError(status: number) {
  const error = new Error(`HTTP ${status}`) as Error & { response?: { status: number } }
  error.response = { status }
  return error
}

export function statusOf(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null
    ? (error as { response?: { status?: number } }).response?.status
    : undefined
}
