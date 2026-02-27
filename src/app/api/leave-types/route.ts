import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

  const { error: authError } = await requireSchoolAccess(req, schoolId)
  if (authError) return authError

  try {
    const prisma = await getPrisma()
    const leaveTypes = await prisma.leaveType.findMany({
      where: { schoolId },
      include: { _count: { select: { requests: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(leaveTypes)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, name, nameAr, nameFr, maxDaysPerYear, colorHex, requiresApproval } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        schoolId,
        name,
        nameAr,
        nameFr,
        maxDaysPerYear: maxDaysPerYear || 12,
        colorHex: colorHex || '#F59E0B',
        requiresApproval: requiresApproval ?? true,
      },
    })
    return NextResponse.json(leaveType, { status: 201 })
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
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership
    const existing = await prisma.leaveType.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data,
    })
    return NextResponse.json(leaveType)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error: authError, user } = await requireAuth(req)
  if (authError) return authError

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const prisma = await getPrisma()

    // Verify ownership
    const existing = await prisma.leaveType.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.leaveType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
