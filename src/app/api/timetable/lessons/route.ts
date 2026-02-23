import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const timetableId = req.nextUrl.searchParams.get('timetableId')
    if (!timetableId) {
      return NextResponse.json({ error: 'Missing timetableId' }, { status: 400 })
    }

    const lessons = await prisma.lesson.findMany({
      where: { timetableId },
      include: {
        subject: true,
        teacher: true,
        class: true,
        room: true,
        period: true,
      },
    })

    return NextResponse.json(lessons)
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
    const body = await req.json()
    const { id, dayOfWeek, periodId, subjectId, teacherId, roomId, classId } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek
    if (periodId !== undefined) data.periodId = periodId
    if (subjectId !== undefined) data.subjectId = subjectId
    if (teacherId !== undefined) data.teacherId = teacherId
    if (roomId !== undefined) data.roomId = roomId || null
    if (classId !== undefined) data.classId = classId

    const lesson = await prisma.lesson.update({
      where: { id },
      data,
      include: {
        subject: true,
        teacher: true,
        class: true,
        room: true,
        period: true,
      },
    })

    return NextResponse.json(lesson)
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
    const body = await req.json()
    const { timetableId, classId, subjectId, teacherId, roomId, periodId, dayOfWeek } = body

    if (!timetableId || !classId || !subjectId || !teacherId || !periodId || dayOfWeek === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const lesson = await prisma.lesson.create({
      data: {
        timetableId,
        classId,
        subjectId,
        teacherId,
        roomId: roomId || null,
        periodId,
        dayOfWeek,
      },
      include: {
        subject: true,
        teacher: true,
        class: true,
        room: true,
        period: true,
      },
    })

    return NextResponse.json(lesson)
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
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 })
    }

    await prisma.lesson.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
