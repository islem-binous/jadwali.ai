import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: { grade: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(classes)
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
    const body = await req.json()
    const { schoolId, name, gradeId, capacity, colorHex } = body

    const created = await prisma.class.create({
      data: {
        schoolId,
        name,
        gradeId: gradeId || null,
        capacity: capacity ?? 30,
        colorHex: colorHex ?? '#4f6ef7',
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
    const body = await req.json()
    const { id, name, gradeId, capacity, colorHex } = body

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name,
        gradeId: gradeId || null,
        capacity,
        colorHex,
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
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { classId: id } }),
      prisma.student.deleteMany({ where: { classId: id } }),
      prisma.class.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Classes DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
