import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { solveTimetable } from '@/lib/schedule-solver'
import type { ScheduleConstraints } from '@/lib/schedule-engine'
import { detectConflicts } from '@/lib/conflict-detector'

export async function POST(req: NextRequest) {
  try {
    const { schoolId } = await req.json()

    if (!schoolId || typeof schoolId !== 'string') {
      return Response.json({ success: false, error: 'Missing schoolId' }, { status: 400 })
    }

    // Fetch school data (including grade curriculum and teacher-grade assignments)
    const [school, classes, teachers, subjects, rooms, periods, gradeCurriculumRows, teacherGradeRows] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.class.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      prisma.teacher.findMany({
        where: { schoolId },
        include: { subjects: { include: { subject: true } } },
      }),
      prisma.subject.findMany({ where: { schoolId } }),
      prisma.room.findMany({ where: { schoolId } }),
      prisma.period.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
      prisma.gradeCurriculum.findMany({
        where: { grade: { schoolId } },
      }),
      prisma.teacherGrade.findMany({
        where: { grade: { schoolId } },
      }),
    ])

    if (!school) {
      return Response.json({ success: false, error: 'School not found' }, { status: 404 })
    }

    if (classes.length === 0 || teachers.length === 0 || subjects.length === 0 || periods.length === 0) {
      return Response.json(
        { success: false, error: 'Insufficient school data. Add classes, teachers, subjects, and periods first.' },
        { status: 400 },
      )
    }

    const schoolDays: number[] = JSON.parse(school.schoolDays || '[0,1,2,3,4,5]')

    // Build grade curriculum lookup: gradeId → [{ subjectId, hoursPerWeek }]
    const gradeCurriculum: Record<string, { subjectId: string; hoursPerWeek: number }[]> = {}
    for (const gc of gradeCurriculumRows) {
      if (!gradeCurriculum[gc.gradeId]) gradeCurriculum[gc.gradeId] = []
      gradeCurriculum[gc.gradeId].push({ subjectId: gc.subjectId, hoursPerWeek: gc.hoursPerWeek })
    }

    // Build teacher-grade lookup: teacherId → gradeId[]
    const teacherGrades = new Map<string, string[]>()
    for (const tg of teacherGradeRows) {
      if (!teacherGrades.has(tg.teacherId)) teacherGrades.set(tg.teacherId, [])
      teacherGrades.get(tg.teacherId)!.push(tg.gradeId)
    }

    // Build constraints
    const constraints: ScheduleConstraints = {
      classes: classes.map((c) => ({ id: c.id, name: c.name, capacity: c.capacity ?? 30, gradeId: c.gradeId })),
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        maxPeriodsPerDay: t.maxPeriodsPerDay,
        maxPeriodsPerWeek: t.maxPeriodsPerWeek,
        subjects: t.subjects.map((ts) => ts.subjectId),
        grades: teacherGrades.get(t.id) ?? [],
      })),
      subjects: subjects.map((s) => ({ id: s.id, name: s.name, category: s.category })),
      rooms: rooms.map((r) => ({ id: r.id, name: r.name, type: r.type ?? 'CLASSROOM', capacity: r.capacity ?? 30 })),
      periods: periods.map((p) => {
        let applicableDays: number[] = []
        try { applicableDays = JSON.parse(p.applicableDays || '[]') } catch (err) {
    console.error('[API Error]', err) /* default empty */ }
        return { id: p.id, name: p.name, order: p.order, isBreak: p.isBreak, applicableDays }
      }),
      days: schoolDays,
      gradeCurriculum: Object.keys(gradeCurriculum).length > 0 ? gradeCurriculum : undefined,
    }

    console.log(`[Generate] Solving timetable — ${classes.length} classes, ${teachers.length} teachers, ${subjects.length} subjects`)
    const startTime = Date.now()

    // Run deterministic solver
    const result = solveTimetable(constraints)
    const solveMs = Date.now() - startTime
    console.log(`[Generate] Solved in ${solveMs}ms — ${result.lessons.length} lessons, ${result.stats.conflictsAvoided} conflicts avoided`)

    // Detect remaining conflicts (double-bookings the solver couldn't avoid)
    const lessonsWithTempIds = result.lessons.map((l, idx) => ({
      ...l,
      id: `temp-${idx}`,
      teacher: teachers.find((t) => t.id === l.teacherId)
        ? {
            name: teachers.find((t) => t.id === l.teacherId)!.name,
            maxPeriodsPerDay: teachers.find((t) => t.id === l.teacherId)!.maxPeriodsPerDay,
            maxPeriodsPerWeek: teachers.find((t) => t.id === l.teacherId)!.maxPeriodsPerWeek,
          }
        : undefined,
    }))
    const conflicts = detectConflicts(lessonsWithTempIds)
    const conflictTempIds = new Set(conflicts.flatMap((c) => c.lessonIds))

    // Save to database
    const dbResult = await prisma.$transaction(async (tx) => {
      // Deactivate old active timetables
      await tx.timetable.updateMany({
        where: { schoolId, isActive: true },
        data: { isActive: false },
      })

      // Create new timetable
      const timetable = await tx.timetable.create({
        data: {
          schoolId,
          name: `AI Generated ${new Date().toLocaleDateString('en-GB')}`,
          generatedByAi: true,
          isActive: true,
          status: 'DRAFT',
        },
      })

      // Insert lessons
      let created = 0
      for (const lesson of result.lessons) {
        const tempId = `temp-${created}`
        const hasConflict = conflictTempIds.has(tempId)
        const conflictInfo = hasConflict
          ? conflicts.find((c) => c.lessonIds.includes(tempId))
          : null

        await tx.lesson.create({
          data: {
            timetableId: timetable.id,
            classId: lesson.classId,
            subjectId: lesson.subjectId,
            teacherId: lesson.teacherId,
            roomId: lesson.roomId,
            periodId: lesson.periodId,
            dayOfWeek: lesson.dayOfWeek,
            isConflict: hasConflict,
            conflictNote: conflictInfo?.description ?? null,
          },
        })
        created++
      }

      return { timetable, created }
    })

    return Response.json({
      success: true,
      timetableId: dbResult.timetable.id,
      timetableName: dbResult.timetable.name,
      lessonsCreated: dbResult.created,
      conflictsFound: conflicts.length,
      solveTimeMs: solveMs,
      stats: result.stats,
    })
  } catch (err) {
    console.error('[Generate Timetable] Error:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
