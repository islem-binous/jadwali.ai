import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { periods: { orderBy: { order: 'asc' } } },
    })

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    return NextResponse.json(school)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, country, timezone, language, schoolDays } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing school id' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (country !== undefined) data.country = country
    if (timezone !== undefined) data.timezone = timezone
    if (language !== undefined) data.language = language
    if (schoolDays !== undefined) data.schoolDays = JSON.stringify(schoolDays)

    const school = await prisma.school.update({
      where: { id },
      data,
    })

    return NextResponse.json(school)
  } catch (err) {
    console.error('PUT /api/school error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
