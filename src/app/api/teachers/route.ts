import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    // Find the active timetable for this school
    const activeTimetable = await prisma.timetable.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    })

    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: {
        subjects: { include: { subject: true } },
        lessons: activeTimetable
          ? { where: { timetableId: activeTimetable.id } }
          : { where: { timetableId: '__none__' } },
        absences: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(teachers)
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
    const {
      name,
      email,
      phone,
      colorHex,
      maxPeriodsPerDay,
      maxPeriodsPerWeek,
      excludeFromCover,
      schoolId,
      subjectIds,
    } = body

    const teacher = await prisma.teacher.create({
      data: {
        name,
        email,
        phone,
        colorHex,
        maxPeriodsPerDay: maxPeriodsPerDay ?? 6,
        maxPeriodsPerWeek: maxPeriodsPerWeek ?? 24,
        excludeFromCover: excludeFromCover ?? false,
        schoolId,
        subjects: {
          create: (subjectIds ?? []).map((id: string, i: number) => ({
            subjectId: id,
            isPrimary: i === 0,
          })),
        },
      },
      include: { subjects: { include: { subject: true } } },
    })
    return NextResponse.json(teacher)
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
    const {
      id,
      name,
      email,
      phone,
      colorHex,
      maxPeriodsPerDay,
      maxPeriodsPerWeek,
      excludeFromCover,
      subjectIds,
    } = body

    // Delete old subjects and recreate
    await prisma.teacherSubject.deleteMany({ where: { teacherId: id } })

    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        colorHex,
        maxPeriodsPerDay,
        maxPeriodsPerWeek,
        excludeFromCover,
        subjects: {
          create: (subjectIds ?? []).map((sid: string, i: number) => ({
            subjectId: sid,
            isPrimary: i === 0,
          })),
        },
      },
      include: { subjects: { include: { subject: true } } },
    })
    return NextResponse.json(teacher)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { teacherId: id } }),
      prisma.teacherSubject.deleteMany({ where: { teacherId: id } }),
      prisma.teacherAvailability.deleteMany({ where: { teacherId: id } }),
      prisma.teacherGrade.deleteMany({ where: { teacherId: id } }),
      prisma.absence.deleteMany({ where: { teacherId: id } }),
      prisma.leaveRequest.deleteMany({ where: { teacherId: id } }),
      prisma.teacher.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Teachers DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
