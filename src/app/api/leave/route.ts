import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

  const status = req.nextUrl.searchParams.get('status')
  const teacherId = req.nextUrl.searchParams.get('teacherId')

  try {
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
    const body = await req.json()
    const { schoolId, teacherId, leaveTypeId, startDate, endDate, reason } = body

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
    const body = await req.json()
    const { id, status, approvedById, reason, ...rest } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updateData: Record<string, unknown> = { ...rest }
    if (status) {
      updateData.status = status
      if (status === 'APPROVED') {
        updateData.approvedAt = new Date()
        if (approvedById) updateData.approvedById = approvedById
      }
    }
    if (reason !== undefined) updateData.reason = reason

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
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await prisma.leaveRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
