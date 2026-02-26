import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    const staff = await prisma.staff.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(staff)
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
    const { schoolId, name, email, phone, cin, matricule, staffTitle } = body

    const staff = await prisma.staff.create({
      data: {
        schoolId,
        name,
        email: email || null,
        phone: phone || null,
        cin: cin || null,
        matricule: matricule || null,
        staffTitle: staffTitle || null,
      },
    })
    return NextResponse.json(staff)
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
    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, email, phone, cin, matricule, staffTitle } = body

    const staff = await prisma.staff.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        cin: cin || null,
        matricule: matricule || null,
        staffTitle: staffTitle || null,
      },
    })
    return NextResponse.json(staff)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    // Unlink any User that references this staff record
    await prisma.user.updateMany({
      where: { staffId: id },
      data: { staffId: null },
    })
    await prisma.staff.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Staff DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
