import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()

    const termId = req.nextUrl.searchParams.get('termId')
    const classId = req.nextUrl.searchParams.get('classId')
    const subjectId = req.nextUrl.searchParams.get('subjectId')
    const teacherId = req.nextUrl.searchParams.get('teacherId')

    const where: Record<string, unknown> = { schoolId }
    if (termId) where.termId = termId
    if (classId) where.classId = classId
    if (subjectId) where.subjectId = subjectId
    if (teacherId) where.teacherId = teacherId

    const exams = await prisma.exam.findMany({
      where,
      include: {
        term: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { marks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(exams)
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
    const { schoolId, termId, subjectId, classId, teacherId, type, date, coefficient, maxScore } = body

    // Check uniqueness of [termId, subjectId, classId, type]
    const existing = await prisma.exam.findUnique({
      where: {
        termId_subjectId_classId_type: {
          termId,
          subjectId,
          classId,
          type,
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An exam with this term, subject, class, and type already exists' },
        { status: 409 }
      )
    }

    const exam = await prisma.exam.create({
      data: {
        schoolId,
        termId,
        subjectId,
        classId,
        teacherId,
        type,
        date: date ? new Date(date) : null,
        coefficient: coefficient ?? 1,
        maxScore: maxScore ?? 20,
      },
      include: {
        term: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(exam)
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
    const { id, date, coefficient, maxScore } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: date ? new Date(date) : null }),
        ...(coefficient !== undefined && { coefficient }),
        ...(maxScore !== undefined && { maxScore }),
      },
      include: {
        term: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(exam)
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
    await prisma.exam.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Exams DELETE]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
