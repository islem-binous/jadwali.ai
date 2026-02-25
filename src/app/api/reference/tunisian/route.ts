import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET() {
  try {
    const prisma = await getPrisma()

    const [grades, subjects, sessionTypes] = await Promise.all([
      prisma.tunisianGradeLevel.findMany({ orderBy: { code: 'asc' } }),
      prisma.tunisianSubject.findMany({
        include: { sessionType: true },
        orderBy: { code: 'asc' },
      }),
      prisma.tunisianSessionType.findMany({ orderBy: { code: 'asc' } }),
    ])

    return NextResponse.json({ grades, subjects, sessionTypes })
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string }
    if (
      err?.message?.includes('no such table') ||
      err?.message?.includes('D1_ERROR') ||
      err?.code === 'P2021'
    ) {
      return NextResponse.json({ grades: [], subjects: [], sessionTypes: [] })
    }
    console.error('Reference data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
