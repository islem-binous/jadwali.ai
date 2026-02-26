import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    const studentId = req.nextUrl.searchParams.get('studentId')
    const category = req.nextUrl.searchParams.get('category')

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const where: Record<string, unknown> = { schoolId }

    if (studentId) {
      where.studentId = studentId
    }
    if (category) {
      where.category = category
    }

    const notes = await prisma.studentNote.findMany({
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
    return NextResponse.json(notes)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, studentId, authorId, category, content, isPrivate } = body

    if (!schoolId || !studentId || !authorId || !content) {
      return NextResponse.json(
        { error: 'schoolId, studentId, authorId, and content are required' },
        { status: 400 },
      )
    }

    const note = await prisma.studentNote.create({
      data: {
        schoolId,
        studentId,
        authorId,
        category: category || 'OBSERVATION',
        content,
        isPrivate: isPrivate ?? false,
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
    return NextResponse.json(note)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { id, category, content, isPrivate } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (category !== undefined) data.category = category
    if (content !== undefined) data.content = content
    if (isPrivate !== undefined) data.isPrivate = isPrivate

    const note = await prisma.studentNote.update({
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
    return NextResponse.json(note)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    await prisma.studentNote.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
