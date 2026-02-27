import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  const { error: authError } = await requireSchoolAccess(req, schoolId)
  if (authError) return authError

  const month = req.nextUrl.searchParams.get('month')
  const year = req.nextUrl.searchParams.get('year')
  const recurring = req.nextUrl.searchParams.get('recurring')

  try {
    const prisma = await getPrisma()
    // Build date range filter if month & year are provided
    const where: Record<string, unknown> = { schoolId }

    // Filter recurring holidays only
    if (recurring === 'true') {
      where.isRecurring = true
    }

    if (month && year) {
      const m = parseInt(month, 10)
      const y = parseInt(year, 10)
      const startOfMonth = new Date(y, m - 1, 1)
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999)

      // Events that overlap with the requested month
      where.OR = [
        { startDate: { gte: startOfMonth, lte: endOfMonth } },
        { endDate: { gte: startOfMonth, lte: endOfMonth } },
        { startDate: { lte: startOfMonth }, endDate: { gte: endOfMonth } },
      ]
    }

    const events = await prisma.schoolEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json(events)
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
      schoolId,
      title,
      titleAr,
      titleFr,
      description,
      type,
      startDate,
      endDate,
      colorHex,
      affectsClasses,
    } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const event = await prisma.schoolEvent.create({
      data: {
        schoolId,
        title,
        titleAr: titleAr ?? null,
        titleFr: titleFr ?? null,
        description: description ?? null,
        type: type ?? 'OTHER',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        colorHex: colorHex ?? '#4f6ef7',
        affectsClasses: typeof affectsClasses === 'string'
          ? affectsClasses
          : JSON.stringify(affectsClasses ?? []),
      },
    })

    return NextResponse.json(event)
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
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const {
      id,
      title,
      titleAr,
      titleFr,
      description,
      type,
      startDate,
      endDate,
      colorHex,
      affectsClasses,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.schoolEvent.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const event = await prisma.schoolEvent.update({
      where: { id },
      data: {
        title,
        titleAr: titleAr ?? null,
        titleFr: titleFr ?? null,
        description: description ?? null,
        type: type ?? 'OTHER',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        colorHex: colorHex ?? '#4f6ef7',
        affectsClasses: typeof affectsClasses === 'string'
          ? affectsClasses
          : JSON.stringify(affectsClasses ?? []),
      },
    })

    return NextResponse.json(event)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    const existing = await prisma.schoolEvent.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.schoolEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
