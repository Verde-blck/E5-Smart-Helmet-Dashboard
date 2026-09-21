const STORAGE_KEY = 'authToken'

interface JwtPayload {
  sub?: string
  exp?: number
  iat?: number
}

/**
 * Reads a JWT's payload without verifying it.
 *
 * Verification is the server's job — this is only used to recover the
 * username and expiry after a page reload, because the API has no /auth/me
 * endpoint to ask. Never treat anything in here as trustworthy.
 */
export function decodeToken(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as JwtPayload
  } catch {
    return null
  }
}

export function isExpired(token: string, skewMs = 30_000): boolean {
  const exp = decodeToken(token)?.exp
  if (!exp) return false // no expiry claim — let the server decide
  // Treat a token that's about to expire as already expired, so a request
  // doesn't set off mid-flight and come back 401.
  return Date.now() + skewMs >= exp * 1000
}

/**
 * The token lives in localStorage because there is no refresh endpoint and no
 * httpOnly cookie — without it, every page reload would force a fresh login.
 *
 * That is a deliberate trade-off, not an oversight: a token readable by
 * JavaScript is exposed to XSS. It should move to an httpOnly cookie with a
 * refresh flow when the backend supports one.
 */
export const tokenStore = {
  get(): string | null {
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) return null
    if (isExpired(token)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return token
  },
  set(token: string) {
    localStorage.setItem(STORAGE_KEY, token)
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY)
  },
}
