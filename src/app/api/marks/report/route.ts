import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireSchoolAccess } from '@/lib/auth/require-auth'

// GET /api/marks/report?studentId=xxx&termId=xxx
// Computes a full report card for a student in a given term
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get('studentId')
    const termId = req.nextUrl.searchParams.get('termId')
    const schoolId = req.nextUrl.searchParams.get('schoolId')

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!studentId || !termId) {
      return NextResponse.json(
        { error: 'Both studentId and termId are required' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()

    // 1. Fetch the student to know their class and grade
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { id: true, name: true, gradeId: true } },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const classId = student.classId
    if (!classId || !student.class) {
      return NextResponse.json({ error: 'Student is not assigned to a class' }, { status: 400 })
    }
    const gradeId = student.class.gradeId

    // 2. Fetch all exams for this class in this term
    const exams = await prisma.exam.findMany({
      where: { classId, termId },
      include: {
        subject: { select: { id: true, name: true } },
      },
    })

    if (exams.length === 0) {
      return NextResponse.json({
        subjects: [],
        overall: null,
        rank: null,
        classSize: 0,
      })
    }

    // 3. Fetch all marks for this student in those exams
    const examIds = exams.map((e) => e.id)
    const marks = await prisma.examMark.findMany({
      where: {
        examId: { in: examIds },
        studentId,
      },
    })

    // Build a lookup: examId -> mark
    const markByExam = new Map(marks.map((m) => [m.examId, m]))

    // 4. Group exams by subject
    const subjectExams = new Map<
      string,
      { subjectName: string; exams: typeof exams }
    >()
    for (const exam of exams) {
      const existing = subjectExams.get(exam.subjectId)
      if (existing) {
        existing.exams.push(exam)
      } else {
        subjectExams.set(exam.subjectId, {
          subjectName: exam.subject.name,
          exams: [exam],
        })
      }
    }

    // 5. Fetch GradeCurriculum for coefficient lookup (if grade exists)
    const curriculumMap = new Map<string, number>()
    if (gradeId) {
      const curriculum = await prisma.gradeCurriculum.findMany({
        where: { gradeId },
      })
      for (const c of curriculum) {
        curriculumMap.set(c.subjectId, c.coefficient)
      }
    }

    // 6. Compute per-subject results
    const subjects: {
      subjectId: string
      subjectName: string
      coefficient: number
      dc1: number | null
      dc2: number | null
      dc3: number | null
      ds: number | null
      dcAverage: number | null
      termAverage: number | null
      weighted: number | null
    }[] = []

    for (const [subjectId, { subjectName, exams: subjectExamList }] of subjectExams) {
      const coefficient = curriculumMap.get(subjectId) ?? 1

      // Extract scores by exam type
      let dc1: number | null = null
      let dc2: number | null = null
      let dc3: number | null = null
      let ds: number | null = null

      for (const exam of subjectExamList) {
        const mark = markByExam.get(exam.id)
        const score = mark?.score ?? null

        switch (exam.type) {
          case 'DC1':
            dc1 = score
            break
          case 'DC2':
            dc2 = score
            break
          case 'DC3':
            dc3 = score
            break
          case 'DS':
            ds = score
            break
        }
      }

      // dcAverage = mean of non-null DC scores
      const dcScores = [dc1, dc2, dc3].filter((s): s is number => s !== null)
      const dcAverage = dcScores.length > 0
        ? dcScores.reduce((a, b) => a + b, 0) / dcScores.length
        : null

      // termAverage = (dcAverage + 2 * DS) / 3 if DS exists, otherwise just dcAverage
      let termAverage: number | null = null
      if (dcAverage !== null && ds !== null) {
        termAverage = (dcAverage + 2 * ds) / 3
      } else if (dcAverage !== null) {
        termAverage = dcAverage
      } else if (ds !== null) {
        termAverage = ds
      }

      const weighted = termAverage !== null ? termAverage * coefficient : null

      subjects.push({
        subjectId,
        subjectName,
        coefficient,
        dc1,
        dc2,
        dc3,
        ds,
        dcAverage: dcAverage !== null ? Math.round(dcAverage * 100) / 100 : null,
        termAverage: termAverage !== null ? Math.round(termAverage * 100) / 100 : null,
        weighted: weighted !== null ? Math.round(weighted * 100) / 100 : null,
      })
    }

    // 7. Overall average = sum(weighted) / sum(coefficients) for subjects with marks
    const subjectsWithMarks = subjects.filter((s) => s.termAverage !== null)
    const sumWeighted = subjectsWithMarks.reduce((acc, s) => acc + (s.weighted ?? 0), 0)
    const sumCoefficients = subjectsWithMarks.reduce((acc, s) => acc + s.coefficient, 0)
    const overall = sumCoefficients > 0
      ? Math.round((sumWeighted / sumCoefficients) * 100) / 100
      : null

    // 8. Rank: compute overall average for ALL students in the same class for this term
    const classStudents = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    })

    const allClassMarks = await prisma.examMark.findMany({
      where: {
        examId: { in: examIds },
        studentId: { in: classStudents.map((s) => s.id) },
      },
    })

    // Group marks by student
    const marksByStudent = new Map<string, typeof allClassMarks>()
    for (const m of allClassMarks) {
      const existing = marksByStudent.get(m.studentId)
      if (existing) {
        existing.push(m)
      } else {
        marksByStudent.set(m.studentId, [m])
      }
    }

    // Compute overall average for each student
    const studentAverages: { studentId: string; average: number }[] = []

    for (const s of classStudents) {
      const studentMarks = marksByStudent.get(s.id) || []
      const studentMarkByExam = new Map(studentMarks.map((m) => [m.examId, m]))

      let sTotalWeighted = 0
      let sTotalCoeff = 0

      for (const [subjectId, { exams: subjectExamList }] of subjectExams) {
        const coeff = curriculumMap.get(subjectId) ?? 1

        let sDc1: number | null = null
        let sDc2: number | null = null
        let sDc3: number | null = null
        let sDs: number | null = null

        for (const exam of subjectExamList) {
          const mark = studentMarkByExam.get(exam.id)
          const score = mark?.score ?? null

          switch (exam.type) {
            case 'DC1':
              sDc1 = score
              break
            case 'DC2':
              sDc2 = score
              break
            case 'DC3':
              sDc3 = score
              break
            case 'DS':
              sDs = score
              break
          }
        }

        const sDcScores = [sDc1, sDc2, sDc3].filter((v): v is number => v !== null)
        const sDcAvg = sDcScores.length > 0
          ? sDcScores.reduce((a, b) => a + b, 0) / sDcScores.length
          : null

        let sTermAvg: number | null = null
        if (sDcAvg !== null && sDs !== null) {
          sTermAvg = (sDcAvg + 2 * sDs) / 3
        } else if (sDcAvg !== null) {
          sTermAvg = sDcAvg
        } else if (sDs !== null) {
          sTermAvg = sDs
        }

        if (sTermAvg !== null) {
          sTotalWeighted += sTermAvg * coeff
          sTotalCoeff += coeff
        }
      }

      if (sTotalCoeff > 0) {
        studentAverages.push({
          studentId: s.id,
          average: sTotalWeighted / sTotalCoeff,
        })
      }
    }

    // Sort descending to determine rank
    studentAverages.sort((a, b) => b.average - a.average)
    const rank = overall !== null
      ? studentAverages.findIndex((s) => s.studentId === studentId) + 1
      : null

    return NextResponse.json({
      subjects,
      overall,
      rank: rank && rank > 0 ? rank : null,
      classSize: classStudents.length,
    })
  } catch (err) {
    console.error('[Marks Report GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
