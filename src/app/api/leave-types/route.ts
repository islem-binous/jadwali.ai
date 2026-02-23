import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

  try {
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
    const body = await req.json()
    const { schoolId, name, nameAr, nameFr, maxDaysPerYear, colorHex, requiresApproval } = body
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
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

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
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await prisma.leaveType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
