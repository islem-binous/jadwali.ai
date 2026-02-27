/**
 * JWT token management using jose (edge-compatible).
 * Tokens are signed with HS256 and stored in httpOnly cookies.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface SessionPayload extends JWTPayload {
  sub: string // userId
  sid: string // sessionId
}

const DEFAULT_SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds
const COOKIE_NAME = 'session'
let _sessionDurationOverride: number | null = null

/**
 * Set session duration from app settings (called by session.ts before creating sessions).
 */
export function setSessionDurationHours(hours: number) {
  _sessionDurationOverride = hours * 60 * 60
}

async function getSecret(): Promise<Uint8Array> {
  // Try environment variable first (local dev)
  if (process.env.JWT_SECRET) {
    return new TextEncoder().encode(process.env.JWT_SECRET)
  }
  // Try Cloudflare Workers secret
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext()
    const secret = (env as unknown as Record<string, string>).JWT_SECRET
    if (secret) return new TextEncoder().encode(secret)
  } catch {
    // Not running on Cloudflare
  }
  throw new Error('JWT_SECRET is not configured')
}

export async function createSessionToken(
  userId: string,
  sessionId: string
): Promise<string> {
  const secret = await getSecret()
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${_sessionDurationOverride ?? DEFAULT_SESSION_DURATION}s`)
    .sign(secret)
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = await getSecret()
    const { payload } = await jwtVerify(token, secret)
    if (!payload.sub || !payload.sid) return null
    return payload as SessionPayload
  } catch {
    return null
  }
}

/**
 * Lightweight JWT verification for middleware (no DB call).
 * Only checks signature and expiry, not session existence.
 */
export async function verifyTokenSignature(
  token: string
): Promise<boolean> {
  try {
    const secret = await getSecret()
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME
}

export function getSessionDuration(): number {
  return _sessionDurationOverride ?? DEFAULT_SESSION_DURATION
}
