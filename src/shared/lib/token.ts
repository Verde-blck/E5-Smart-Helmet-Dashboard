const STORAGE_KEY = 'authToken'

interface JwtPayload {
  sub?: string
  exp?: number
  iat?: number
}

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
  if (!exp) return false // Treat a token about to expire as expired, so a request doesn't leave valid and arrive 401.
  return Date.now() + skewMs >= exp * 1000
}

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
