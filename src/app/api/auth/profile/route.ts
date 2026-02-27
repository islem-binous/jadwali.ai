import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/require-auth'

export async function PUT(request: Request) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  try {
    const { name, phone, language, avatarUrl } = await request.json()
    const prisma = await getPrisma()

    const data: Record<string, string | null> = {}
    if (name !== undefined) data.name = name
    if (phone !== undefined) data.phone = phone || null
    if (language !== undefined) data.language = language
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    })

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        language: updated.language,
        avatarUrl: updated.avatarUrl,
      },
    })
  } catch (err) {
    console.error('[Profile Update Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
