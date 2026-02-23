import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  const format = req.nextUrl.searchParams.get('format') || 'csv'
  const type = req.nextUrl.searchParams.get('type') || 'timetable'
  const timetableId = req.nextUrl.searchParams.get('timetableId')

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
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
          const rows = lessons.map(l => [
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
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
          ].join('\n')

          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="timetable-export.csv"`,
            },
          })
        }

        // JSON format
        return NextResponse.json(lessons.map(l => ({
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
          include: { subjects: { include: { subject: true } } },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const headers = ['Name', 'Email', 'Phone', 'Subjects', 'Max/Day', 'Max/Week']
          const rows = teachers.map(t => [
            t.name,
            t.email || '',
            t.phone || '',
            t.subjects.map(s => s.subject.name).join('; '),
            String(t.maxPeriodsPerDay),
            String(t.maxPeriodsPerWeek),
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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
          const rows = leaveRequests.map(r => [
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
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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
          const rows = absences.map(a => [
            new Date(a.date).toLocaleDateString(),
            a.teacher.name,
            a.type,
            a.status,
            a.note || '',
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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

      case 'subjects': {
        const subjects = await prisma.subject.findMany({
          where: { schoolId },
          orderBy: { name: 'asc' },
        })

        if (format === 'csv') {
          const headers = ['Name', 'Name (French)', 'Name (Arabic)', 'Category', 'Color']
          const rows = subjects.map(s => [
            s.name,
            s.nameFr || '',
            s.nameAr || '',
            s.category,
            s.colorHex,
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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
          const rows = classes.map(c => [
            c.name,
            c.grade?.name || '',
            String(c.capacity),
            c.colorHex,
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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
          const rows = rooms.map(r => [
            r.name,
            r.building || '',
            String(r.capacity),
            r.type,
          ])

          const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
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
