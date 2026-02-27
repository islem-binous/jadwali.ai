import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { verifyPassword } from '@/lib/auth/password'
import { invalidateAllSessions, clearSessionCookie } from '@/lib/auth/session'

export async function POST(request: Request) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  try {
    // SUPER_ADMIN cannot be deleted this way
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'SUPER_ADMIN accounts cannot be self-deleted' },
        { status: 403 }
      )
    }

    const { password } = await request.json()
    if (!password) {
      return NextResponse.json(
        { error: 'Password required for account deletion' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser?.passwordHash) {
      return NextResponse.json(
        { error: 'Account uses Google sign-in. Contact admin to delete.' },
        { status: 400 }
      )
    }

    const valid = await verifyPassword(password, dbUser.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      )
    }

    // Invalidate all sessions
    await invalidateAllSessions(user.id)

    // Delete user (cascading will remove sessions and reset tokens)
    await prisma.user.delete({ where: { id: user.id } })

    const response = NextResponse.json({ ok: true })
    return clearSessionCookie(response)
  } catch (err) {
    console.error('[Delete Account Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
