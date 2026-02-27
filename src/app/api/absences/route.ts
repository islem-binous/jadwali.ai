import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    const filter = req.nextUrl.searchParams.get('filter') // 'today' | 'upcoming' | 'all'
    const teacherId = req.nextUrl.searchParams.get('teacherId')
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const { error: authError, user } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    let where: Record<string, unknown> = { schoolId }
    // Role-based: teachers see only their own absences
    if (user!.role === 'TEACHER' && user!.teacherId) {
      where.teacherId = user!.teacherId
    } else if (teacherId) {
      where.teacherId = teacherId
    }
    if (filter === 'today') {
      // Absence overlaps today: startDate <= todayEnd AND (endDate >= todayStart OR endDate is null AND date >= todayStart)
      where.date = { lte: todayEnd }
      where.OR = [
        { endDate: { gte: todayStart } },
        { endDate: null, date: { gte: todayStart } },
      ]
    } else if (filter === 'upcoming') {
      // Starts after today, or endDate is after today
      where.OR = [
        { date: { gt: todayEnd } },
        { endDate: { gt: todayEnd } },
      ]
    }

    const absences = await prisma.absence.findMany({
      where,
      include: { teacher: { include: { subjects: { include: { subject: true } } } } },
      orderBy: { date: 'asc' },
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
    const { schoolId, teacherId, date, endDate, type, periods, note } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !teacherId || !date) {
      return NextResponse.json(
        { error: 'schoolId, teacherId, and date are required' },
        { status: 400 },
      )
    }

    const absence = await prisma.absence.create({
      data: {
        schoolId,
        teacherId,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        type: type || 'SICK',
        periods: JSON.stringify(periods || []),
        note,
        status: 'PENDING',
      },
      include: { teacher: { include: { subjects: { include: { subject: true } } } } },
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
    const { id, teacherId, date, endDate, type, periods, note, status, substituteId } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing absence id' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.absence.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (teacherId !== undefined) data.teacherId = teacherId
    if (date !== undefined) data.date = new Date(date)
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
    if (type !== undefined) data.type = type
    if (periods !== undefined) data.periods = JSON.stringify(periods)
    if (note !== undefined) data.note = note
    if (status !== undefined) data.status = status
    if (substituteId !== undefined) data.substituteId = substituteId

    const absence = await prisma.absence.update({
      where: { id },
      data,
      include: { teacher: { include: { subjects: { include: { subject: true } } } } },
    })
    return NextResponse.json(absence)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error: authError, user } = await requireAuth(req)
  if (authError) return authError

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()

    // Verify ownership
    const existing = await prisma.absence.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.absence.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
