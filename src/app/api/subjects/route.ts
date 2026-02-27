import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  const { error: authError } = await requireSchoolAccess(req, schoolId)
  if (authError) return authError

  try {
    const prisma = await getPrisma()
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(subjects)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, name, nameAr, nameFr, colorHex, category, pedagogicDay } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const created = await prisma.subject.create({
      data: {
        schoolId,
        name,
        nameAr: nameAr || null,
        nameFr: nameFr || null,
        colorHex: colorHex ?? '#4f6ef7',
        category: category ?? 'OTHER',
        pedagogicDay: pedagogicDay ?? 0,
      },
    })
    return NextResponse.json(created)
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
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, nameAr, nameFr, colorHex, category, pedagogicDay } = body

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name,
        nameAr: nameAr || null,
        nameFr: nameFr || null,
        colorHex,
        category,
        pedagogicDay: pedagogicDay ?? 0,
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const { error: authError } = await requireAuth(req)
  if (authError) return authError

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { subjectId: id } }),
      prisma.teacherSubject.deleteMany({ where: { subjectId: id } }),
      prisma.gradeCurriculum.deleteMany({ where: { subjectId: id } }),
      prisma.subject.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Subjects DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
