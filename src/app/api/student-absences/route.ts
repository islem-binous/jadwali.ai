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

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const where: Record<string, unknown> = { schoolId }

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
        periodIds: JSON.stringify(periodIds || []),
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
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, type, reason, justifiedBy, note } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing absence id' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (type !== undefined) data.type = type
    if (reason !== undefined) data.reason = reason
    if (note !== undefined) data.note = note
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
  const { error: authError } = await requireAuth(req)
  if (authError) return authError

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    await prisma.studentAbsence.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
