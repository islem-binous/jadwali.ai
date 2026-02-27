import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { invalidateAllSessions } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Two modes: request reset (email) or execute reset (token + newPassword)
    if (body.email && !body.token) {
      return handleRequestReset(body.email)
    }
    if (body.token && body.newPassword) {
      return handleExecuteReset(body.token, body.newPassword)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    console.error('[Reset Password Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleRequestReset(email: string) {
  const prisma = await getPrisma()
  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to avoid email enumeration
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true })
  }

  // Generate a secure token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  // TODO: Send email with reset link
  // For now, log token (only visible in server logs)
  console.log(`[Password Reset] Token for ${email}: ${token}`)

  return NextResponse.json({ ok: true })
}

async function handleExecuteReset(token: string, newPassword: string) {
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const prisma = await getPrisma()
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  if (resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  // Hash new password and update user
  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  })

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  })

  // Invalidate all existing sessions
  await invalidateAllSessions(resetToken.userId)

  return NextResponse.json({ ok: true })
}
