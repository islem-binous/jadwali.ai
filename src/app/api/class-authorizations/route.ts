import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

/* ------------------------------------------------------------------ */
/*  GET — List class authorizations                                    */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    const studentId = req.nextUrl.searchParams.get('studentId')
    const status = req.nextUrl.searchParams.get('status')

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const where: Record<string, unknown> = { schoolId }
    if (studentId) where.studentId = studentId
    if (status && status !== 'ALL') where.status = status

    const authorizations = await prisma.classAuthorization.findMany({
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(authorizations)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  POST — Create a class authorization request                        */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, studentId, absenceDate, absenceEndDate, reason } = body

    if (!schoolId || !studentId || !absenceDate || !reason) {
      return NextResponse.json(
        { error: 'schoolId, studentId, absenceDate, and reason are required' },
        { status: 400 },
      )
    }

    const authorization = await prisma.classAuthorization.create({
      data: {
        schoolId,
        studentId,
        absenceDate: new Date(absenceDate),
        absenceEndDate: absenceEndDate ? new Date(absenceEndDate) : null,
        reason,
        status: 'PENDING',
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

    return NextResponse.json(authorization)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  PUT — Approve or reject an authorization                           */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { id, status, reviewedById, rejectionReason } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 },
      )
    }

    const data: Record<string, unknown> = {
      status,
      reviewedAt: new Date(),
    }
    if (reviewedById !== undefined) data.reviewedById = reviewedById
    if (rejectionReason !== undefined) data.rejectionReason = rejectionReason

    const authorization = await prisma.classAuthorization.update({
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

    // When APPROVED, auto-justify matching StudentAbsence records
    if (status === 'APPROVED') {
      const startDate = new Date(authorization.absenceDate)
      const endDate = authorization.absenceEndDate
        ? new Date(authorization.absenceEndDate)
        : new Date(authorization.absenceDate)

      // Set start to beginning of day, end to end of day
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)

      await prisma.studentAbsence.updateMany({
        where: {
          studentId: authorization.studentId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        data: {
          type: 'JUSTIFIED',
          justifiedBy: reviewedById ?? null,
          justifiedAt: new Date(),
        },
      })
    }

    return NextResponse.json(authorization)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE — Remove an authorization                                   */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    await prisma.classAuthorization.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
