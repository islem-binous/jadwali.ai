import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    const classId = req.nextUrl.searchParams.get('classId')
    const studentId = req.nextUrl.searchParams.get('studentId')
    const date = req.nextUrl.searchParams.get('date')
    const type = req.nextUrl.searchParams.get('type')

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const { error: authError, user } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const where: Record<string, unknown> = { schoolId }

    // Role-based filtering
    if (user!.role === 'STUDENT' && user!.studentId) {
      where.studentId = user!.studentId // Students see only their own absences
    } else if (user!.role === 'TEACHER' && user!.teacherId) {
      // Teachers see absences for students in their classes
      let teacherClassFilter: unknown = null

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
        const teacherLessons = await prisma.lesson.findMany({
          where: { teacherId: user!.teacherId, timetableId: timetable.id },
          select: { classId: true },
          distinct: ['classId'],
        })
        const teacherClassIds = teacherLessons.map((l) => l.classId)
        if (teacherClassIds.length > 0) {
          teacherClassFilter = { in: teacherClassIds }
        }
      }

      // 2) Fallback: use TeacherGrade → Grade → Class
      if (!teacherClassFilter) {
        const teacherGrades = await prisma.teacherGrade.findMany({
          where: { teacherId: user!.teacherId },
          select: { gradeId: true },
        })
        if (teacherGrades.length > 0) {
          const gradeIds = teacherGrades.map((tg: { gradeId: string }) => tg.gradeId)
          const gradeClasses = await prisma.class.findMany({
            where: { schoolId, gradeId: { in: gradeIds } },
            select: { id: true },
          })
          if (gradeClasses.length > 0) {
            teacherClassFilter = { in: gradeClasses.map((c: { id: string }) => c.id) }
          }
        }
      }

      if (teacherClassFilter) {
        where.student = { classId: teacherClassFilter }
      }
      // If no grades assigned either, teacher sees all school absences
    }

    if (classId) {
      where.student = { classId }
    }
    if (studentId) {
      where.studentId = studentId
    }
    if (date) {
      const d = new Date(date)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      where.date = { gte: dayStart, lte: dayEnd }
    }
    if (type) {
      where.type = type
    }

    const absences = await prisma.studentAbsence.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(absences)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, studentId, date, periodIds, type, reason, reportedBy } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !studentId || !date) {
      return NextResponse.json(
        { error: 'schoolId, studentId, and date are required' },
        { status: 400 },
      )
    }

    const absence = await prisma.studentAbsence.create({
      data: {
        schoolId,
        studentId,
        date: new Date(date),
        periodIds: Array.isArray(periodIds) ? JSON.stringify(periodIds) : (periodIds || '[]'),
        type: type || 'UNJUSTIFIED',
        reason: reason || null,
        reportedBy: reportedBy || null,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
    })
    return NextResponse.json(absence)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, type, reason, justifiedBy, note, date, periodIds } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing absence id' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.studentAbsence.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (type !== undefined) data.type = type
    if (reason !== undefined) data.reason = reason
    if (note !== undefined) data.note = note
    if (date !== undefined) data.date = new Date(date)
    if (periodIds !== undefined) {
      data.periodIds = Array.isArray(periodIds) ? JSON.stringify(periodIds) : (periodIds || '[]')
    }
    if (justifiedBy !== undefined) {
      data.justifiedBy = justifiedBy
      data.justifiedAt = new Date()
    }

    const absence = await prisma.studentAbsence.update({
      where: { id },
      data,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
    })
    return NextResponse.json(absence)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const existing = await prisma.studentAbsence.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.studentAbsence.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
