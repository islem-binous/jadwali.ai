import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  const format = req.nextUrl.searchParams.get('format') || 'csv'
  const type = req.nextUrl.searchParams.get('type') || 'timetable'
  const timetableId = req.nextUrl.searchParams.get('timetableId')

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  const { error: authError } = await requireSchoolAccess(req, schoolId)
  if (authError) return authError

  try {
    const prisma = await getPrisma()
    switch (type) {
      case 'timetable': {
        if (!timetableId) {
          return NextResponse.json({ error: 'Missing timetableId' }, { status: 400 })
        }

        const lessons = await prisma.lesson.findMany({
          where: { timetableId },
          include: {
            class: true,
            subject: true,
            teacher: true,
            room: true,
            period: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { period: { order: 'asc' } }],
        })

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

        if (format === 'csv') {
          const headers = ['Day', 'Period', 'Time', 'Class', 'Subject', 'Teacher', 'Room']
          const rows = lessons.map((l: any) => [
            dayNames[l.dayOfWeek] || `Day ${l.dayOfWeek}`,
            l.period.name,
            `${l.period.startTime}-${l.period.endTime}`,
            l.class.name,
            l.subject.name,
            l.teacher.name,
            l.room?.name || '',
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="timetable-export.csv"`,
            },
          })
        }

        // JSON format
        return NextResponse.json(lessons.map((l: any) => ({
          day: dayNames[l.dayOfWeek],
          period: l.period.name,
          time: `${l.period.startTime}-${l.period.endTime}`,
          class: l.class.name,
          subject: l.subject.name,
          teacher: l.teacher.name,
          room: l.room?.name || '',
        })))
      }

      case 'teachers': {
        const teachers = await prisma.teacher.findMany({
          where: { schoolId },
          include: { subjects: { include: { subject: true } }, professionalGrade: true },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const headers = ['Name', 'Email', 'Phone', 'Matricule', 'CIN', 'Sex', 'Recruitment Date', 'Professional Grade', 'Subjects', 'Max/Day', 'Max/Week']
          const rows = teachers.map((t: any) => [
            t.name,
            t.email || '',
            t.phone || '',
            t.matricule || '',
            t.cin || '',
            t.sex || '',
            t.recruitmentDate ? new Date(t.recruitmentDate).toISOString().slice(0, 10) : '',
            t.professionalGrade?.nameFr || t.professionalGrade?.nameAr || '',
            t.subjects.map((s: any) => s.subject.name).join('; '),
            String(t.maxPeriodsPerDay),
            String(t.maxPeriodsPerWeek),
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="teachers-export.csv"`,
            },
          })
        }

        return NextResponse.json(teachers)
      }

      case 'leave': {
        const leaveRequests = await prisma.leaveRequest.findMany({
          where: { schoolId },
          include: { teacher: true, leaveType: true },
          orderBy: { createdAt: 'desc' },
        })

        if (format === 'csv') {
          const headers = ['Teacher', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason']
          const rows = leaveRequests.map((r: any) => [
            r.teacher.name,
            r.leaveType.name,
            new Date(r.startDate).toLocaleDateString(),
            new Date(r.endDate).toLocaleDateString(),
            String(r.daysCount),
            r.status,
            r.reason || '',
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="leave-history.csv"`,
            },
          })
        }

        return NextResponse.json(leaveRequests)
      }

      case 'absences': {
        const absences = await prisma.absence.findMany({
          where: { schoolId },
          include: { teacher: true, substitute: true },
          orderBy: { date: 'desc' },
        })

        if (format === 'csv') {
          const headers = ['Date', 'Teacher', 'Type', 'Status', 'Note']
          const rows = absences.map((a: any) => [
            new Date(a.date).toLocaleDateString(),
            a.teacher.name,
            a.type,
            a.status,
            a.note || '',
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="absences-export.csv"`,
            },
          })
        }

        return NextResponse.json(absences)
      }

      case 'students': {
        const students = await prisma.student.findMany({
          where: { schoolId },
          include: { class: true },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const headers = ['Name', 'Email', 'Phone', 'Matricule', 'Sex', 'Birth Date', 'Class']
          const rows = students.map((s: any) => [
            s.name,
            s.email || '',
            s.phone || '',
            s.matricule || '',
            s.sex || '',
            s.birthDate ? new Date(s.birthDate).toISOString().slice(0, 10) : '',
            s.class.name,
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="students-export.csv"`,
            },
          })
        }

        return NextResponse.json(students)
      }

      case 'subjects': {
        const subjects = await prisma.subject.findMany({
          where: { schoolId },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const dayLabels = ['None', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          const headers = ['Name', 'Name (French)', 'Name (Arabic)', 'Category', 'Color', 'Pedagogic Day']
          const rows = subjects.map((s: any) => [
            s.name,
            s.nameFr || '',
            s.nameAr || '',
            s.category,
            s.colorHex,
            dayLabels[s.pedagogicDay ?? 0] || 'None',
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="subjects-export.csv"`,
            },
          })
        }

        return NextResponse.json(subjects)
      }

      case 'classes': {
        const classes = await prisma.class.findMany({
          where: { schoolId },
          include: { grade: true },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const headers = ['Name', 'Grade', 'Capacity', 'Color']
          const rows = classes.map((c: any) => [
            c.name,
            c.grade?.name || '',
            String(c.capacity),
            c.colorHex,
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="classes-export.csv"`,
            },
          })
        }

        return NextResponse.json(classes)
      }

      case 'rooms': {
        const rooms = await prisma.room.findMany({
          where: { schoolId },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const headers = ['Name', 'Building', 'Capacity', 'Type']
          const rows = rooms.map((r: any) => [
            r.name,
            r.building || '',
            String(r.capacity),
            r.type,
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="rooms-export.csv"`,
            },
          })
        }

        return NextResponse.json(rooms)
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
