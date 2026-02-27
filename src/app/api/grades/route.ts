import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const grades = await prisma.grade.findMany({
      where: { schoolId },
      include: {
        curriculum: { include: { subject: true } },
        teachers: { include: { teacher: true } },
        _count: { select: { classes: true } },
      },
      orderBy: { level: 'asc' },
    })

    return NextResponse.json(grades)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, name, nameAr, nameFr, level } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !name) {
      return NextResponse.json({ error: 'schoolId and name are required' }, { status: 400 })
    }

    const grade = await prisma.grade.create({
      data: {
        schoolId,
        name,
        nameAr: nameAr || null,
        nameFr: nameFr || null,
        level: level ?? 1,
      },
    })

    return NextResponse.json(grade)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, nameAr, nameFr, level } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing grade id' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (nameAr !== undefined) data.nameAr = nameAr || null
    if (nameFr !== undefined) data.nameFr = nameFr || null
    if (level !== undefined) data.level = level

    const grade = await prisma.grade.update({ where: { id }, data })
    return NextResponse.json(grade)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing grade id' }, { status: 400 })
    }

    // Cascade: unlink classes, delete curriculum entries, delete teacher-grade links
    await prisma.$transaction([
      prisma.class.updateMany({ where: { gradeId: id }, data: { gradeId: null } }),
      prisma.gradeCurriculum.deleteMany({ where: { gradeId: id } }),
      prisma.teacherGrade.deleteMany({ where: { gradeId: id } }),
      prisma.grade.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const prismaErr = err as { code?: string }
    if (prismaErr.code === 'P2025') {
      return NextResponse.json({ error: 'Grade not found' }, { status: 404 })
    }
    console.error('[Grades DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete grade' }, { status: 500 })
  }
}
