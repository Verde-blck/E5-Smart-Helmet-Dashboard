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

/**
 * Who the user is and what they may do, as the backend reports it. The same
 * object comes back from login (2FA off), from verify-2fa, and from
 * GET /api/auth/me. The backend re-reads it on every request, so it is the
 * real access control; the dashboard uses it to show only what's allowed.
 */
interface ApiProfile {
  username?: string
  roleName?: string | null
  /** Full access; `permissions` is ignored. */
  superAdmin?: boolean
  permissions?: string[]
  /** Helmets the user is limited to; empty = every helmet. */
  deviceIds?: string[]
  twoFactorEnabled?: boolean
  /** True when the company requires 2FA and this account hasn't set it up. */
  mustSetup2fa?: boolean
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
    twoFactorEnabled: profile.twoFactorEnabled,
    scope: { allSites: true, sites: [] },
  }
}

/*
 * The last profile, kept with the token so a page reload can draw the right
 * menu straight away while /auth/me is fetched again. Tied to the token, so
 * a different account on this browser never inherits it.
 */
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

/** Stores the token, gets the profile (from the response or /auth/me), and builds the user. */
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

/**
 * Fetches the profile again and updates the signed-in user. Used after a
 * page reload, and when the backend refuses something, since that usually
 * means the user's role was changed while they were signed in.
 */
export async function refreshSession(): Promise<void> {
  const token = tokenStore.get()
  if (!token || env.useMocks) return
  try {
    const profile = await fetchProfile()
    cacheProfile(token, profile)
    const current = useAuthStore.getState().user
    useAuthStore.getState().setUser({
      ...userFromProfile(profile, current?.username ?? 'admin'),
      // Kept from sign-in; /auth/me doesn't carry it.
      mustChangePassword: current?.mustChangePassword,
    })
  } catch {
    // A 401 ends the session through the API client; anything else keeps
    // the current user until the next try.
  }
}

// ---------------------------------------------------------------------------
// Sign-in, including the optional second step
// ---------------------------------------------------------------------------

/** What the second sign-in step needs to carry forward from the first. */
export interface TwoFactorChallenge {
  username: string
  /**
   * One-time token proving the password step succeeded. The backend doesn't
   * issue one yet; we've asked for it, because without it verify-2fa can be
   * called with just a username. Passed through whenever it's present, so
   * nothing here changes when it arrives.
   */
  mfaToken?: string
}

export type LoginResult =
  | { status: 'signed-in'; user: AuthUser }
  | { status: 'needs-code'; challenge: TwoFactorChallenge }

interface LoginResponse {
  token?: string
  requires2fa?: boolean
  mfaToken?: string
  challengeToken?: string
}

/** Mock account that has 2FA switched on. Its code is always 123456. */
const MOCK_2FA_USER = 'MFA-001'
const MOCK_CODE = '123456'

/**
 * Step one. Resolves either with a signed-in user, or with a challenge when
 * the account has 2FA on, in which case the caller asks for a code and then
 * calls verifyTwoFactorLogin. No token is stored until that succeeds.
 */
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
    rememberTwoFactor(credentials.username, true)
    return {
      status: 'needs-code',
      challenge: {
        username: credentials.username,
        mfaToken: data.mfaToken ?? data.challengeToken,
      },
    }
  }

  if (!data.token) throw new Error('Sign-in response contained no token')
  rememberTwoFactor(credentials.username, false)
  const user = await completeSignIn(data.token, data, credentials.username)
  return { status: 'signed-in', user }
}

/**
 * Step two: the 6-digit code from the authenticator app. A wrong or expired
 * code comes back as a 401.
 */
export async function verifyTwoFactorLogin(
  challenge: TwoFactorChallenge,
  code: string
): Promise<AuthUser> {
  if (env.useMocks) {
    await delay(400)
    if (code !== MOCK_CODE) throw httpError(401)
    return mockUserFor(challenge.username)
  }

  const { data } = await apiClient.post<{ token: string } & ApiProfile>('/auth/login/verify-2fa', {
    username: challenge.username,
    code,
    ...(challenge.mfaToken ? { mfaToken: challenge.mfaToken } : {}),
  })
  return completeSignIn(data.token, data, challenge.username)
}

// ---------------------------------------------------------------------------
// Managing 2FA from the account security page
// ---------------------------------------------------------------------------

export interface TwoFactorSetup {
  /** Base32 key, for typing in by hand when the QR code won't scan. */
  secret: string
  /** otpauth:// URL, rendered as the QR code. */
  otpAuthUrl: string
}

/**
 * Generates a new secret. 2FA is not on yet: it only switches on when
 * confirmTwoFactorSetup succeeds, which proves the app was set up correctly.
 */
/** Why the backend refused a 2FA change, when it says. */
export type TwoFactorRefusal = 'already-enabled' | 'required-by-company'

export function twoFactorRefusal(error: unknown): TwoFactorRefusal | null {
  const res = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  if (res?.status !== 409) return null
  if (res.data?.error === '2fa_already_enabled') return 'already-enabled'
  if (res.data?.error === '2fa_required_by_company') return 'required-by-company'
  return null
}

/**
 * Starts setting up 2FA. When it's already on (moving to a new phone), the
 * backend needs the current code, and the old phone keeps working until the
 * new one is confirmed. Without the code it answers 409 2fa_already_enabled.
 */
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

/**
 * Sends the current code even though the backend doesn't check it yet. We've
 * asked for it to, so that someone at an unattended, signed-in browser can't
 * switch 2FA off; asking for it in the UI now means nothing changes then.
 */
export async function disableTwoFactor(username: string, code: string): Promise<void> {
  if (env.useMocks) {
    await delay(400)
    if (code !== MOCK_CODE) throw httpError(401)
  } else {
    await apiClient.post('/auth/2fa/disable', { code })
  }
  rememberTwoFactor(username, false)
}

/*
 * Whether 2FA is on for an account.
 *
 * The API has no endpoint that reports this, so it's inferred: signing in
 * tells us (requires2fa true or false), and so does confirming or disabling.
 * The answer is kept per username on this browser. null means we haven't
 * seen this account sign in here since the feature shipped. A status field
 * on the login response, or GET /auth/2fa/status, would replace all of this.
 */
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

// ---------------------------------------------------------------------------
// Registration and session
// ---------------------------------------------------------------------------

export interface RegisterInput {
  username: string
  password: string
}

/**
 * Creates an account through the public registration endpoint.
 *
 * Responds in plain text rather than JSON — "User created" on success, or a
 * 409 with "Username already exists". No token comes back, so the caller
 * signs in afterwards to get one.
 *
 * Worth knowing: an account made this way has no permissions attached. That
 * currently grants full access rather than none, because the backend does not
 * yet enforce the permission list.
 */
export async function registerAccount(input: RegisterInput): Promise<void> {
  if (env.useMocks) {
    await delay(400)
    if (input.username.trim().toLowerCase() === 'admin') throw httpError(409)
    return
  }

  await apiClient.post('/auth/register', {
    username: input.username.trim(),
    password: input.password,
    accountId: null,
  })
}

/**
 * Restores a session after a page reload. Returns the user straight away from
 * the profile cached at sign-in, and asks /auth/me in the background so a
 * role change made meanwhile applies within a moment. Null when there's no
 * token.
 */
export function restoreSession(): AuthUser | null {
  const token = tokenStore.get()
  if (!token) return null
  // Draw from the last known profile now; confirm it with the backend next.
  void Promise.resolve().then(refreshSession)
  const cached = cachedProfile(token)
  return cached
    ? userFromProfile(cached, decodeToken(token)?.sub ?? 'admin')
    : // Nothing cached: show nothing until /auth/me answers, rather than everything.
      userFromProfile({ permissions: [] }, decodeToken(token)?.sub ?? 'admin')
}

/**
 * There is no logout endpoint, so this only clears the client. The token stays
 * valid at the server for the rest of its 24 hours — worth knowing on a shared
 * machine, and worth asking the backend for a revocation endpoint.
 */
export function clearSession(): void {
  tokenStore.clear()
  try {
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    // Nothing to clear.
  }
}

/** No password-change endpoint exists yet; kept so the UI can stay wired. */
export async function changeOwnPassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (env.useMocks) return
  await apiClient.post('/auth/password', input)
}

// ---------------------------------------------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Shaped like an Axios error, so callers handle mocks and live the same way. */
function httpError(status: number) {
  const error = new Error(`HTTP ${status}`) as Error & { response?: { status: number } }
  error.response = { status }
  return error
}

/** Reads the HTTP status off an Axios (or mock) error, if there is one. */
export function statusOf(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null
    ? (error as { response?: { status?: number } }).response?.status
    : undefined
}
