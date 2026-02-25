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

    const schools: any[] = await prisma.$queryRaw`
      SELECT s.id, s.code, s."nameAr", s."zipCode", g."nameAr" as "governorate"
      FROM "TunisianSchool" s
      JOIN "Governorate" g ON g."code" = s."governorateCode"
      WHERE s."nameAr" LIKE ${'%' + q + '%'}
      LIMIT 20
    `

    return NextResponse.json(
      schools.map((s: any) => ({
        id: s.id,
        code: s.code,
        nameAr: s.nameAr,
        governorate: s.governorate,
        zipCode: s.zipCode,
      }))
    )
  } catch (error: any) {
    // Table may not exist yet if migrations haven't been applied
    if (
      error?.message?.includes('no such table') ||
      error?.message?.includes('D1_ERROR') ||
      error?.code === 'P2021'
    ) {
      return NextResponse.json([])
    }
    console.error('School search error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message || String(error) },
      { status: 500 }
    )
  }
}
