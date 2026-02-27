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
} from './jwt'

export async function createSession(userId: string): Promise<string> {
  const prisma = await getPrisma()
  const expiresAt = new Date(Date.now() + getSessionDuration() * 1000)

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  })

  return createSessionToken(userId, session.id)
}

export async function validateSession(token: string) {
  const payload = await verifySessionToken(token)
  if (!payload) return null

  const prisma = await getPrisma()
  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        include: { school: true, student: true, staff: true },
      },
    },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    // Expired — clean up
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.user.isActive) return null

  return { session, user: session.user }
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
