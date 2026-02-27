import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { invalidateAllSessions, createSession, setSessionCookie } from '@/lib/auth/session'

export async function POST(request: Request) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser?.passwordHash) {
      return NextResponse.json(
        { error: 'Account uses Google sign-in, no password to change' },
        { status: 400 }
      )
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    // Invalidate all sessions and create a new one
    await invalidateAllSessions(user.id)
    const token = await createSession(user.id)

    const response = NextResponse.json({ ok: true })
    return setSessionCookie(response, token)
  } catch (err) {
    console.error('[Change Password Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
