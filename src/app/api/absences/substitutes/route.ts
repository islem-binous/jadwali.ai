import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { findSubstitutes } from '@/lib/substitute-matcher'
import { requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const absenceId = req.nextUrl.searchParams.get('absenceId')
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!absenceId || !schoolId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const absence = await prisma.absence.findUnique({
      where: { id: absenceId },
      include: { teacher: true },
    })
    if (!absence) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 })
    }

    // Get affected lessons for the absent teacher on that day
    // Convert JS getDay() (0=Sun) to our convention (0=Mon)
    const dayOfWeek = (new Date(absence.date).getDay() + 6) % 7
    const timetable = await prisma.timetable.findFirst({
      where: { schoolId, isActive: true },
    })

    if (!timetable) return NextResponse.json([])

    const affectedLessons = await prisma.lesson.findMany({
      where: {
        timetableId: timetable.id,
        teacherId: absence.teacherId,
        dayOfWeek,
      },
      include: { subject: true, period: true },
    })

    const affectedSlots = affectedLessons.map((l: { dayOfWeek: number; periodId: string; subjectId: string }) => ({
      dayOfWeek: l.dayOfWeek,
      periodId: l.periodId,
      subjectId: l.subjectId,
    }))

    // Get all candidate teachers
    const candidates = await prisma.teacher.findMany({
      where: { schoolId },
      include: { subjects: { include: { subject: true } } },
    })

    // Get all existing lessons for the day
    const existingLessons = await prisma.lesson.findMany({
      where: { timetableId: timetable.id, dayOfWeek },
      select: { teacherId: true, dayOfWeek: true, periodId: true },
    })

    const matches = findSubstitutes(absence.teacherId, affectedSlots, candidates, existingLessons)

    return NextResponse.json(matches)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
