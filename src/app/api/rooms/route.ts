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

    const rooms = await prisma.room.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(rooms)
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
    const { schoolId, name, building, capacity, type } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const created = await prisma.room.create({
      data: {
        schoolId,
        name,
        building: building || null,
        capacity: capacity ?? 30,
        type: type ?? 'CLASSROOM',
      },
    })
    return NextResponse.json(created)
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
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, building, capacity, type } = body

    const updated = await prisma.room.update({
      where: { id },
      data: {
        name,
        building: building || null,
        capacity,
        type,
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    // Unlink lessons from this room (roomId is nullable) instead of deleting them
    await prisma.$transaction([
      prisma.lesson.updateMany({ where: { roomId: id }, data: { roomId: null } }),
      prisma.room.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Rooms DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
