import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const periods = await prisma.period.findMany({
      where: { schoolId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(periods)
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
    const { schoolId, name, startTime, endTime, order, isBreak, breakLabel, applicableDays } = body

    if (!schoolId || !name || !startTime || !endTime || order === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const period = await prisma.period.create({
      data: {
        schoolId, name, startTime, endTime, order,
        isBreak: isBreak ?? false,
        breakLabel: breakLabel ?? null,
        applicableDays: applicableDays ? JSON.stringify(applicableDays) : '[]',
      },
    })

    return NextResponse.json(period)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, startTime, endTime, order, isBreak, breakLabel, applicableDays } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing period id' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime
    if (order !== undefined) data.order = order
    if (isBreak !== undefined) data.isBreak = isBreak
    if (breakLabel !== undefined) data.breakLabel = breakLabel
    if (applicableDays !== undefined) data.applicableDays = JSON.stringify(applicableDays)

    const period = await prisma.period.update({ where: { id }, data })
    return NextResponse.json(period)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing period id' }, { status: 400 })
    }

    // Delete related records first (lessons, availabilities, substitutes)
    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { periodId: id } }),
      prisma.substitute.deleteMany({ where: { periodId: id } }),
      prisma.teacherAvailability.deleteMany({ where: { periodId: id } }),
      prisma.period.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const prismaErr = err as { code?: string }
    if (prismaErr.code === 'P2025') {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }
    console.error('[Periods DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete period' }, { status: 500 })
  }
}
