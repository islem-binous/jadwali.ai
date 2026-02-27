import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const prisma = await getPrisma()
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        periods: { orderBy: { order: 'asc' } },
        tunisianSchool: { include: { governorate: true } },
      },
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
    const { id, name, country, timezone, language, schoolDays, tunisianSchoolId } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing school id' }, { status: 400 })
    }

    const { error: authError } = await requireSchoolAccess(req, id)
    if (authError) return authError

    const data: Record<string, unknown> = {}
    if (country !== undefined) data.country = country
    if (timezone !== undefined) data.timezone = timezone
    if (language !== undefined) data.language = language
    if (schoolDays !== undefined) data.schoolDays = JSON.stringify(schoolDays)

    // Handle TunisianSchool linking/unlinking
    if (tunisianSchoolId !== undefined) {
      if (tunisianSchoolId === null) {
        // Unlinking: clear the link, keep current slug
        data.tunisianSchoolId = null
        if (name !== undefined) data.name = name
      } else {
        // Linking or changing linked school
        const tunisianSchool = await prisma.tunisianSchool.findUnique({
          where: { id: tunisianSchoolId },
        })
        if (!tunisianSchool) {
          return NextResponse.json(
            { error: 'Selected school not found in registry' },
            { status: 404 }
          )
        }
        // Check not claimed by another school
        const existingSchool = await prisma.school.findUnique({
          where: { tunisianSchoolId },
        })
        if (existingSchool && existingSchool.id !== id) {
          return NextResponse.json(
            { error: 'This school is already registered' },
            { status: 409 }
          )
        }
        data.tunisianSchoolId = tunisianSchoolId
        data.slug = tunisianSchool.code
        data.name = tunisianSchool.nameAr
      }
    } else {
      // No tunisianSchoolId in request — allow name change only if not linked
      if (name !== undefined) {
        const currentSchool = await prisma.school.findUnique({ where: { id } })
        if (currentSchool && !currentSchool.tunisianSchoolId) {
          data.name = name
        }
      }
    }

    const school = await prisma.school.update({
      where: { id },
      data,
      include: {
        periods: { orderBy: { order: 'asc' } },
        tunisianSchool: { include: { governorate: true } },
      },
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
