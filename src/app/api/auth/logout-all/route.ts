import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { invalidateAllSessions, clearSessionCookie } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const { user, error } = await requireAuth(request)
    if (error) return error
    await invalidateAllSessions(user.id)
    const response = NextResponse.json({ ok: true })
    return clearSessionCookie(response)
  } catch (err) {
    console.error('[Logout All Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
