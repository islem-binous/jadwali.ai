import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const prisma = await getPrisma()

    const schools = await prisma.tunisianSchool.findMany({
      where: {
        nameAr: { contains: q },
      },
      include: {
        governorate: { select: { nameAr: true } },
      },
      take: 20,
    })

    return NextResponse.json(
      schools.map((s: any) => ({
        id: s.id,
        code: s.code,
        nameAr: s.nameAr,
        governorate: s.governorate.nameAr,
        zipCode: s.zipCode,
      }))
    )
  } catch (error) {
    console.error('School search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
