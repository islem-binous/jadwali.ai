import { NextResponse } from 'next/server'
import { validateSession, invalidateSession, clearSessionCookie } from '@/lib/auth/session'
import { getSessionCookieName } from '@/lib/auth/jwt'

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieName = getSessionCookieName()
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  const token = match?.[1]

  if (token) {
    const result = await validateSession(token)
    if (result) {
      await invalidateSession(result.session.id)
    }
  }

  const response = NextResponse.json({ ok: true })
  return clearSessionCookie(response)
}
