import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireSchoolAccess, requireAuth } from '@/lib/auth/require-auth'

// GET /api/marks?examId=xxx          — grade sheet for one exam
// GET /api/marks?studentId=xxx&termId=xxx — all marks for a student in a term
export async function GET(req: NextRequest) {
  try {
    const examId = req.nextUrl.searchParams.get('examId')
    const studentId = req.nextUrl.searchParams.get('studentId')
    const termId = req.nextUrl.searchParams.get('termId')
    const schoolId = req.nextUrl.searchParams.get('schoolId')

    const { error: authError, user } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!examId && !(studentId && termId)) {
      return NextResponse.json(
        { error: 'Provide examId, or both studentId and termId' },
        { status: 400 }
      )
    }

    // Role-based: students can only see their own marks
    const effectiveStudentId = user!.role === 'STUDENT' && user!.studentId
      ? user!.studentId
      : studentId

    const prisma = await getPrisma()

    if (examId) {
      // Grade sheet for one exam
      const markWhere: Record<string, unknown> = { examId }
      // Students only see their own marks in an exam
      if (user!.role === 'STUDENT' && user!.studentId) {
        markWhere.studentId = user!.studentId
      }
      // Teachers only see marks for exams they own
      if (user!.role === 'TEACHER' && user!.teacherId) {
        const exam = await prisma.exam.findUnique({
          where: { id: examId },
          select: { teacherId: true },
        })
        if (exam && exam.teacherId !== user!.teacherId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      const marks = await prisma.examMark.findMany({
        where: markWhere,
        include: {
          student: { select: { id: true, name: true } },
          exam: {
            select: {
              id: true,
              type: true,
              subjectId: true,
              subject: { select: { id: true, name: true } },
              maxScore: true,
              coefficient: true,
            },
          },
        },
        orderBy: { student: { name: 'asc' } },
      })
      return NextResponse.json(marks)
    }

    // All marks for a student in a given term
    const marks = await prisma.examMark.findMany({
      where: {
        studentId: effectiveStudentId!,
        exam: { termId: termId! },
      },
      include: {
        student: { select: { id: true, name: true } },
        exam: {
          select: {
            id: true,
            type: true,
            subjectId: true,
            subject: { select: { id: true, name: true } },
            maxScore: true,
            coefficient: true,
          },
        },
      },
      orderBy: { student: { name: 'asc' } },
    })
    return NextResponse.json(marks)
  } catch (err) {
    console.error('[Marks GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/marks — bulk upsert marks for an exam
export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { examId, marks, enteredBy } = body as {
      examId: string
      marks: { studentId: string; score?: number | null; absent?: boolean; note?: string | null }[]
      enteredBy?: string
    }

    const { error: authError } = await requireSchoolAccess(req, body.schoolId)
    if (authError) return authError

    if (!examId || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json(
        { error: 'examId and a non-empty marks array are required' },
        { status: 400 }
      )
    }

    const now = new Date()

    const upserts = marks.map((m) =>
      prisma.examMark.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId: m.studentId,
          },
        },
        create: {
          examId,
          studentId: m.studentId,
          score: m.score ?? null,
          absent: m.absent ?? false,
          note: m.note ?? null,
          enteredBy: enteredBy ?? null,
          enteredAt: now,
        },
        update: {
          score: m.score ?? null,
          absent: m.absent ?? false,
          note: m.note ?? null,
          enteredBy: enteredBy ?? null,
          enteredAt: now,
        },
      })
    )

    const results = await prisma.$transaction(upserts)

    return NextResponse.json({ count: results.length })
  } catch (err) {
    console.error('[Marks POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/marks — single mark edit
export async function PUT(req: NextRequest) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError
    const prisma = await getPrisma()
    const body = await req.json()
    const { id, score, absent, note } = body as {
      id: string
      score?: number | null
      absent?: boolean
      note?: string | null
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing mark id' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.examMark.findUnique({
      where: { id },
      select: { exam: { select: { schoolId: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && existing.exam.schoolId !== user!.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (score !== undefined) data.score = score
    if (absent !== undefined) data.absent = absent
    if (note !== undefined) data.note = note

    const updated = await prisma.examMark.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, name: true } },
        exam: {
          select: {
            id: true,
            type: true,
            subjectId: true,
            subject: { select: { id: true, name: true } },
            maxScore: true,
            coefficient: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[Marks PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
