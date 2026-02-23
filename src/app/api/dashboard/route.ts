import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  const teacherId = req.nextUrl.searchParams.get('teacherId')
  const classId = req.nextUrl.searchParams.get('classId')

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    // Build lesson filter for today
    const todayDayIndex = (new Date().getDay() + 6) % 7 // Convert JS day (0=Sun) to our format (0=Mon)
    const lessonWhere: Record<string, unknown> = { dayOfWeek: todayDayIndex }
    if (teacherId) lessonWhere.teacherId = teacherId
    if (classId) lessonWhere.classId = classId

    const [classCount, teacherCount, roomCount, absencesToday, timetable] =
      await Promise.all([
        prisma.class.count({ where: { schoolId } }),
        prisma.teacher.count({ where: { schoolId } }),
        prisma.room.count({ where: { schoolId } }),
        prisma.absence.count({
          where: {
            schoolId,
            ...(teacherId ? { teacherId } : {}),
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
        prisma.timetable.findFirst({
          where: { schoolId, isActive: true },
          include: {
            lessons: {
              where: lessonWhere,
              include: {
                subject: true,
                teacher: true,
                class: true,
                room: true,
                period: true,
              },
            },
          },
        }),
      ])

    const totalLessons = timetable?.lessons.length ?? 0
    const coveredLessons =
      timetable?.lessons.filter((l) => !l.isConflict).length ?? 0
    const coverage =
      totalLessons > 0
        ? Math.round((coveredLessons / totalLessons) * 100)
        : 100

    // Today's lessons sorted by period order
    const todayLessons = (timetable?.lessons ?? []).sort(
      (a, b) => a.period.order - b.period.order
    )

    return NextResponse.json({
      classCount,
      teacherCount,
      roomCount,
      absencesToday,
      coverage,
      todayLessons,
      timetableStatus: timetable?.status ?? null,
    })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
