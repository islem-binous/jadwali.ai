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

    const where: Record<string, unknown> = { schoolId }

    // Optional: filter classes by teacher
    const teacherId = req.nextUrl.searchParams.get('teacherId')
    if (teacherId) {
      let classIds: string[] = []

      // 1) Try timetable lessons (active first, then most recent)
      let timetable = await prisma.timetable.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true },
      })
      if (!timetable) {
        timetable = await prisma.timetable.findFirst({
          where: { schoolId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      }
      if (timetable) {
        const lessons = await prisma.lesson.findMany({
          where: { teacherId, timetableId: timetable.id },
          select: { classId: true },
          distinct: ['classId'],
        })
        classIds = lessons.map((l: { classId: string }) => l.classId)
      }

      // 2) Fallback: use TeacherGrade → Grade → Class
      if (classIds.length === 0) {
        const teacherGrades = await prisma.teacherGrade.findMany({
          where: { teacherId },
          select: { gradeId: true },
        })
        if (teacherGrades.length > 0) {
          const gradeIds = teacherGrades.map((tg: { gradeId: string }) => tg.gradeId)
          where.gradeId = { in: gradeIds }
        }
      } else {
        where.id = { in: classIds }
      }
    }

    const classes = await prisma.class.findMany({
      where,
      include: { grade: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(classes)
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
    const { schoolId, name, gradeId, capacity, colorHex } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const created = await prisma.class.create({
      data: {
        schoolId,
        name,
        gradeId: gradeId || null,
        capacity: capacity ?? 30,
        colorHex: colorHex ?? '#4f6ef7',
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
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, gradeId, capacity, colorHex } = body

    // Verify ownership
    const existing = await prisma.class.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name,
        gradeId: gradeId || null,
        capacity,
        colorHex,
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
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    const prisma = await getPrisma()

    // Verify ownership
    const existing = await prisma.class.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { classId: id } }),
      prisma.student.deleteMany({ where: { classId: id } }),
      prisma.class.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Classes DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
