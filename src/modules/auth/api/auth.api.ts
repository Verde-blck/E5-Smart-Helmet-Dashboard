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
  tokenStore.set(data.token)
  return { status: 'signed-in', user: userFromToken(data.token, credentials.username) }
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

  const { data } = await apiClient.post<{ token: string }>('/auth/login/verify-2fa', {
    username: challenge.username,
    code,
    ...(challenge.mfaToken ? { mfaToken: challenge.mfaToken } : {}),
  })
  tokenStore.set(data.token)
  return userFromToken(data.token, challenge.username)
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
export async function startTwoFactorSetup(username: string): Promise<TwoFactorSetup> {
  if (env.useMocks) {
    await delay(400)
    const secret = 'JBSWY3DPEHPK3PXP'
    const label = encodeURIComponent(`E5 Energy:${username}`)
    return {
      secret,
      otpAuthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=E5%20Energy`,
    }
  }

  const { data } = await apiClient.post<TwoFactorSetup>('/auth/2fa/setup')
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
