import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  const type = req.nextUrl.searchParams.get('type')

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    if (type === 'faculty') {
      const teachers = await prisma.teacher.findMany({
        where: { schoolId },
        include: {
          subjects: { include: { subject: true } },
          lessons: {
            include: { period: true },
          },
          absences: true,
        },
        orderBy: { name: 'asc' },
      })

      const data = teachers.map((t) => {
        // Count periods per day (0=Mon..4=Fri)
        const periodsPerDay = [0, 0, 0, 0, 0]
        t.lessons.forEach((l) => {
          if (l.dayOfWeek >= 0 && l.dayOfWeek <= 4) {
            periodsPerDay[l.dayOfWeek]++
          }
        })

        return {
          id: t.id,
          name: t.name,
          colorHex: t.colorHex,
          totalPeriods: t.lessons.length,
          maxPerDay: t.maxPeriodsPerDay,
          maxPerWeek: t.maxPeriodsPerWeek,
          subjects: t.subjects.map((ts) => ({
            name: ts.subject.name,
            colorHex: ts.subject.colorHex,
            isPrimary: ts.isPrimary,
          })),
          absenceCount: t.absences.length,
          periodsPerDay,
        }
      })

      return NextResponse.json(data)
    }

    if (type === 'class') {
      const classes = await prisma.class.findMany({
        where: { schoolId },
        include: {
          grade: true,
          lessons: {
            include: {
              subject: true,
              period: true,
            },
          },
          students: true,
        },
        orderBy: { name: 'asc' },
      })

      const data = classes.map((c) => {
        const periodsPerDay = [0, 0, 0, 0, 0]
        const subjectMap: Record<string, { name: string; colorHex: string; count: number }> = {}

        c.lessons.forEach((l) => {
          if (l.dayOfWeek >= 0 && l.dayOfWeek <= 4) {
            periodsPerDay[l.dayOfWeek]++
          }
          if (!subjectMap[l.subjectId]) {
            subjectMap[l.subjectId] = {
              name: l.subject.name,
              colorHex: l.subject.colorHex,
              count: 0,
            }
          }
          subjectMap[l.subjectId].count++
        })

        return {
          id: c.id,
          name: c.name,
          grade: c.grade?.name ?? null,
          totalPeriods: c.lessons.length,
          studentCount: c.students.length,
          periodsPerDay,
          subjects: Object.values(subjectMap),
        }
      })

      return NextResponse.json(data)
    }

    if (type === 'leave') {
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { schoolId },
        include: {
          teacher: true,
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const summary = {
        total: leaveRequests.length,
        pending: leaveRequests.filter((r) => r.status === 'PENDING').length,
        approved: leaveRequests.filter((r) => r.status === 'APPROVED').length,
        rejected: leaveRequests.filter((r) => r.status === 'REJECTED').length,
        totalDays: leaveRequests
          .filter((r) => r.status === 'APPROVED')
          .reduce((sum, r) => sum + r.daysCount, 0),
      }

      const requests = leaveRequests.map((r) => ({
        id: r.id,
        teacherName: r.teacher.name,
        teacherColor: r.teacher.colorHex,
        type: r.leaveType.name,
        typeColor: r.leaveType.colorHex,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        daysCount: r.daysCount,
        status: r.status,
        reason: r.reason,
      }))

      return NextResponse.json({ summary, requests })
    }

    if (type === 'substitute') {
      const absences = await prisma.absence.findMany({
        where: { schoolId },
        include: {
          teacher: true,
          substitute: true,
        },
        orderBy: { date: 'desc' },
      })

      const data = absences.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        teacherName: a.teacher.name,
        teacherColor: a.teacher.colorHex,
        type: a.type,
        status: a.status,
        substituteId: a.substituteId,
        substituteTeacherId: a.substitute?.teacherId ?? null,
      }))

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
