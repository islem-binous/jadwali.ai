import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        user: null,
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(teachers)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
