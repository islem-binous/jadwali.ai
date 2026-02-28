/**
 * Session management — create, validate, invalidate sessions in DB.
 * Uses JWT tokens stored in httpOnly cookies.
 */

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import {
  createSessionToken,
  verifySessionToken,
  getSessionCookieName,
  getSessionDuration,
  setSessionDurationHours,
} from './jwt'
import { getAppSettings } from '@/lib/app-settings'

export async function createSession(userId: string): Promise<string> {
  // Load dynamic session duration from app settings
  try {
    const settings = await getAppSettings()
    if (settings.sessionDurationHours > 0) {
      setSessionDurationHours(settings.sessionDurationHours)
    }
  } catch {
    // Use default duration if settings unavailable
  }

  const prisma = await getPrisma()
  const expiresAt = new Date(Date.now() + getSessionDuration() * 1000)

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  })

  return createSessionToken(userId, session.id)
}

export async function validateSession(token: string) {
  try {
    console.log('[validateSession] Verifying token...')
    const payload = await verifySessionToken(token)
    if (!payload) {
      console.error('[validateSession] Token verification failed (invalid/expired JWT)')
      return null
    }
    console.log('[validateSession] Token valid, sid:', payload.sid)

    console.log('[validateSession] Getting prisma...')
    const prisma = await getPrisma()
    console.log('[validateSession] Querying session...')
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      include: {
        user: {
          include: { school: true, student: true, staff: true },
        },
      },
    })

    if (!session) {
      console.error('[validateSession] Session not found in DB, sid:', payload.sid)
      return null
    }
    if (session.expiresAt < new Date()) {
      console.error('[validateSession] Session expired:', session.expiresAt.toISOString())
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    if (!session.user.isActive) {
      console.error('[validateSession] User inactive:', session.user.id)
      return null
    }

    console.log('[validateSession] Success, user:', session.user.email)
    return { session, user: session.user }
  } catch (err) {
    console.error('[validateSession] Error:', err)
    return null
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  const prisma = await getPrisma()
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  const prisma = await getPrisma()
  await prisma.session.deleteMany({ where: { userId } })
}

export function setSessionCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: getSessionDuration(),
  })
  return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(getSessionCookieName())
  return response
}
