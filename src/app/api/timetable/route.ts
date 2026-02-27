import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const timetables = await prisma.timetable.findMany({
      where: { schoolId },
      include: { term: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(timetables)
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
    const { schoolId, name, termId } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !name) {
      return NextResponse.json(
        { error: 'schoolId and name are required' },
        { status: 400 }
      )
    }

    // D1 doesn't support interactive transactions — use sequential ops
    await prisma.timetable.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false },
    })
    const timetable = await prisma.timetable.create({
      data: {
        schoolId,
        name,
        termId: termId || null,
        status: 'DRAFT',
        isActive: true,
      },
      include: { term: true },
    })

    return NextResponse.json(timetable)
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
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing timetable id' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.timetable.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { timetableId: id } }),
      prisma.timetable.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const prismaErr = err as { code?: string }
    if (prismaErr.code === 'P2025') {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }
    console.error('[Timetable DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete timetable' }, { status: 500 })
  }
}
