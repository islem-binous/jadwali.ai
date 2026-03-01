import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const status = req.nextUrl.searchParams.get('status')
    const teacherId = req.nextUrl.searchParams.get('teacherId')
    const prisma = await getPrisma()
    const where: Record<string, unknown> = { schoolId }
    if (status) where.status = status
    if (teacherId) where.teacherId = teacherId

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        teacher: {
          include: { subjects: { include: { subject: true } } },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(requests)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, teacherId, leaveTypeId, startDate, endDate, reason } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !teacherId || !leaveTypeId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate business days
    const start = new Date(startDate)
    const end = new Date(endDate)
    let daysCount = 0
    const current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) daysCount++
      current.setDate(current.getDate() + 1)
    }
    if (daysCount === 0) daysCount = 1

    // Check if leave type auto-approves
    const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } })
    const autoApprove = leaveType && !leaveType.requiresApproval

    const request = await prisma.leaveRequest.create({
      data: {
        schoolId,
        teacherId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        daysCount,
        reason: reason || null,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        approvedAt: autoApprove ? new Date() : undefined,
      },
      include: { teacher: true, leaveType: true },
    })
    return NextResponse.json(request, { status: 201 })
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
    const { id, status, approvedById, reason, ...rest } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership
    const existing = await prisma.leaveRequest.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    // Status change (admin approve/reject)
    if (status) {
      updateData.status = status
      if (status === 'APPROVED') {
        updateData.approvedAt = new Date()
        if (approvedById) updateData.approvedById = approvedById
      }
    }
    if (reason !== undefined) updateData.reason = reason

    // Teacher edit fields
    if (rest.leaveTypeId) updateData.leaveTypeId = rest.leaveTypeId
    if (rest.startDate) updateData.startDate = new Date(rest.startDate)
    if (rest.endDate) updateData.endDate = new Date(rest.endDate)
    if (rest.startDate && rest.endDate) {
      // Recalculate business days
      const s = new Date(rest.startDate)
      const e = new Date(rest.endDate)
      let days = 0
      const cur = new Date(s)
      while (cur <= e) {
        const day = cur.getDay()
        if (day !== 0 && day !== 6) days++
        cur.setDate(cur.getDate() + 1)
      }
      updateData.daysCount = Math.max(days, 1)
    }

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: { teacher: true, leaveType: true },
    })
    return NextResponse.json(request)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const prisma = await getPrisma()

    // Verify ownership
    const existing = await prisma.leaveRequest.findUnique({ where: { id }, select: { schoolId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.leaveRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
