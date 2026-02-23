import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const { schoolId, userId } = await req.json()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (
      !user ||
      user.schoolId !== schoolId ||
      !['OWNER', 'ADMIN'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        plan: 'FREE',
        subscriptionStatus: 'CANCELLED',
      },
    })

    return NextResponse.json({ plan: 'FREE' })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Failed to downgrade' },
      { status: 500 }
    )
  }
}
