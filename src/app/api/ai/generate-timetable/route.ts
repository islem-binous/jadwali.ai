import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { solveTimetable } from '@/lib/schedule-solver'
import type { ScheduleConstraints } from '@/lib/schedule-engine'
import { detectConflicts } from '@/lib/conflict-detector'
import { requireSchoolAccess } from '@/lib/auth/require-auth'
import { getAppSettings } from '@/lib/app-settings'

interface ReadinessIssue {
  type: string
  message: string
  details: string[]
}

interface SubjectEstimate {
  subject: string
  hoursNeeded: number
  teachersNeeded: number
  teachersAvailable: number
  deficit: number
}

interface ReadinessReport {
  ready: boolean
  critical: ReadinessIssue[]
  warnings: ReadinessIssue[]
  estimates: SubjectEstimate[]
  summary: {
    totalClasses: number
    totalTeachers: number
    totalTeachersNeeded: number
    totalSubjects: number
    totalRooms: number
    classroomsNeeded: number
    teacherCapacity: string
  }
}

function validateReadiness(
  classes: any[],
  teachers: any[],
  subjects: any[],
  rooms: any[],
  gradeCurriculum: Record<string, { subjectId: string; hoursPerWeek: number }[]>,
  gradeNameMap: Map<string, string>,
): ReadinessReport {
  const critical: ReadinessIssue[] = []
  const warnings: ReadinessIssue[] = []

  // 1. Subject-Teacher Coverage
  const teacherSubjectMap = new Map<string, Set<string>>()
  for (const t of teachers) {
    for (const ts of t.subjects) {
      if (!teacherSubjectMap.has(ts.subjectId)) teacherSubjectMap.set(ts.subjectId, new Set())
      teacherSubjectMap.get(ts.subjectId)!.add(t.id)
    }
  }

  const subjectNameMap = new Map(subjects.map((s: any) => [s.id, s.name]))
  const hasCurriculum = Object.keys(gradeCurriculum).length > 0

  if (hasCurriculum) {
    // Check curriculum-based coverage: each grade's subjects need a teacher
    const uncoveredByGrade = new Map<string, Set<string>>()
    for (const [gradeId, curriculum] of Object.entries(gradeCurriculum)) {
      for (const gc of curriculum) {
        const teachersForSubject = teacherSubjectMap.get(gc.subjectId)
        if (!teachersForSubject || teachersForSubject.size === 0) {
          const gradeName = gradeNameMap.get(gradeId) || gradeId
          const subjectName = subjectNameMap.get(gc.subjectId) || gc.subjectId
          if (!uncoveredByGrade.has(gradeName)) uncoveredByGrade.set(gradeName, new Set())
          uncoveredByGrade.get(gradeName)!.add(subjectName)
        }
      }
    }

    if (uncoveredByGrade.size > 0) {
      const details: string[] = []
      for (const [gradeName, subjectNames] of uncoveredByGrade) {
        details.push(`${gradeName}: ${[...subjectNames].join(', ')}`)
      }
      critical.push({
        type: 'MISSING_TEACHERS',
        message: 'Some curriculum subjects have no assigned teachers',
        details,
      })
    }
  } else {
    // No grade curriculum: solver assigns ALL subjects to ALL classes (fallback mode)
    // Every subject must have at least one teacher
    const uncoveredSubjects: string[] = []
    for (const sub of subjects) {
      const teachersForSubject = teacherSubjectMap.get(sub.id)
      if (!teachersForSubject || teachersForSubject.size === 0) {
        uncoveredSubjects.push(sub.name)
      }
    }

    if (uncoveredSubjects.length > 0) {
      critical.push({
        type: 'MISSING_TEACHERS',
        message: `${uncoveredSubjects.length} subject(s) have no assigned teachers`,
        details: uncoveredSubjects.map(name => `${name}: no teacher assigned`),
      })
    }
  }

  // 1b. Per-subject teacher estimation
  // For each subject, calculate hours needed and teachers required
  const DEFAULT_MAX_PER_WEEK = 18
  const estimates: SubjectEstimate[] = []

  for (const sub of subjects) {
    const subjectTeacherIds = teacherSubjectMap.get(sub.id)
    const teachersAvailable = subjectTeacherIds ? subjectTeacherIds.size : 0

    // How many hours does this subject need across all classes?
    let hoursNeeded = 0

    if (hasCurriculum) {
      for (const [gradeId, curriculum] of Object.entries(gradeCurriculum)) {
        const entry = curriculum.find(gc => gc.subjectId === sub.id)
        if (entry) {
          const numClasses = classes.filter((c: any) => c.gradeId === gradeId).length
          hoursNeeded += entry.hoursPerWeek * numClasses
        }
      }
    } else {
      // Fallback: all classes need all subjects (~2h each)
      hoursNeeded = classes.length * 2
    }

    if (hoursNeeded === 0) continue

    // Teachers needed = ceil(hoursNeeded / maxPeriodsPerWeek)
    const teachersNeeded = Math.ceil(hoursNeeded / DEFAULT_MAX_PER_WEEK)
    const deficit = Math.max(0, teachersNeeded - teachersAvailable)

    estimates.push({
      subject: sub.name,
      hoursNeeded,
      teachersNeeded,
      teachersAvailable,
      deficit,
    })
  }

  // Sort: subjects with biggest deficit first
  estimates.sort((a, b) => b.deficit - a.deficit)

  // Flag subjects with capacity issues
  const subjectCapacityIssues = estimates
    .filter(e => e.deficit > 0)
    .map(e => `${e.subject}: needs ${e.teachersNeeded} teacher(s) (${e.hoursNeeded}h/week), has ${e.teachersAvailable} — need ${e.deficit} more`)

  if (subjectCapacityIssues.length > 0) {
    warnings.push({
      type: 'SUBJECT_CAPACITY',
      message: 'Some subjects need more teachers',
      details: subjectCapacityIssues,
    })
  }

  // 2. Room / Classroom estimation
  const roomTypes = new Set(rooms.map((r: any) => r.type))
  const missingRoomTypes: string[] = []

  const hasScience = subjects.some((s: any) => s.category === 'SCIENCE')
  if (hasScience && !roomTypes.has('LAB_SCIENCE') && !roomTypes.has('LAB') && !roomTypes.has('LAB_PHYSICS') && !roomTypes.has('LAB_BIOLOGY') && !roomTypes.has('LAB_CHEMISTRY')) {
    missingRoomTypes.push('Science Lab (needed for science subjects)')
  }
  const hasPE = subjects.some((s: any) => s.category === 'PE')
  if (hasPE && !roomTypes.has('GYM') && !roomTypes.has('GYMNASIUM')) {
    missingRoomTypes.push('Gymnasium / Sports facility (needed for PE)')
  }
  const hasTech = subjects.some((s: any) => s.category === 'TECH')
  if (hasTech && !roomTypes.has('LAB_COMPUTER')) {
    missingRoomTypes.push('Computer Lab (needed for technology/computer subjects)')
  }

  if (missingRoomTypes.length > 0) {
    warnings.push({
      type: 'MISSING_ROOMS',
      message: 'Some specialized room types are missing',
      details: missingRoomTypes,
    })
  }

  // Classrooms needed: at any given period, each class needs a room
  // Minimum classrooms = number of classes (since all classes run in parallel)
  const classroomsNeeded = classes.length
  const classroomsAvailable = rooms.length
  if (classroomsAvailable < classroomsNeeded) {
    warnings.push({
      type: 'INSUFFICIENT_ROOMS',
      message: `Not enough rooms: ${classroomsAvailable} available, ${classroomsNeeded} needed (1 per class)`,
      details: [`Need ${classroomsNeeded - classroomsAvailable} more room(s) to avoid scheduling gaps`],
    })
  }

  // 3. Teacher Workload Feasibility (overall)
  const totalCapacity = teachers.reduce((sum: number, t: any) => sum + (t.maxPeriodsPerWeek || 18), 0)
  let totalDemand = estimates.reduce((sum, e) => sum + e.hoursNeeded, 0)
  const totalTeachersNeeded = estimates.reduce((sum, e) => sum + e.teachersNeeded, 0)

  if (totalDemand > 0 && totalCapacity < totalDemand) {
    warnings.push({
      type: 'CAPACITY_SHORTAGE',
      message: `Overall teacher capacity insufficient`,
      details: [`Available: ${totalCapacity}h/week — Required: ${totalDemand}h/week (deficit: ${totalDemand - totalCapacity}h)`],
    })
  }

  // 4. Classes without grade curriculum
  const classesWithoutCurriculum = classes.filter((c: any) => !c.gradeId || !gradeCurriculum[c.gradeId])
  if (classesWithoutCurriculum.length > 0) {
    warnings.push({
      type: 'NO_CURRICULUM',
      message: `${classesWithoutCurriculum.length} class(es) have no grade curriculum defined`,
      details: classesWithoutCurriculum.map((c: any) => `${c.name}: will use fallback subject hours`),
    })
  }

  return {
    ready: critical.length === 0,
    critical,
    warnings,
    estimates,
    summary: {
      totalClasses: classes.length,
      totalTeachers: teachers.length,
      totalTeachersNeeded,
      totalSubjects: subjects.length,
      totalRooms: rooms.length,
      classroomsNeeded,
      teacherCapacity: totalDemand > 0
        ? `${totalCapacity}h available / ${totalDemand}h needed`
        : `${totalCapacity}h available`,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const { schoolId } = await req.json()

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    // Check if AI features are enabled
    try {
      const settings = await getAppSettings()
      if (!settings.aiEnabled) {
        return Response.json({ success: false, error: 'AI features are currently disabled' }, { status: 403 })
      }
    } catch {
      // If settings fetch fails, allow AI to proceed
    }

    if (!schoolId || typeof schoolId !== 'string') {
      return Response.json({ success: false, error: 'Missing schoolId' }, { status: 400 })
    }

    // Fetch school data (including grade curriculum and teacher-grade assignments)
    const [school, classes, teachers, subjects, rooms, periods, gradeCurriculumRows, teacherGradeRows, grades] = await Promise.all([
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
      prisma.grade.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    ])

    if (!school) {
      return Response.json({ success: false, error: 'School not found' }, { status: 404 })
    }

    const missing = [
      classes.length === 0 && 'classes',
      teachers.length === 0 && 'teachers',
      subjects.length === 0 && 'subjects',
      periods.length === 0 && 'periods',
    ].filter(Boolean)

    if (missing.length > 0) {
      return Response.json(
        { success: false, error: `Insufficient school data. Missing: ${missing.join(', ')}. Add them first.` },
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

    // ---- Pre-validation: readiness report ----
    const gradeNameMap = new Map(grades.map((g: any) => [g.id, g.name]))
    const readinessReport = validateReadiness(classes, teachers, subjects, rooms, gradeCurriculum, gradeNameMap)

    if (!readinessReport.ready) {
      return Response.json({
        success: false,
        readinessReport,
      })
    }

    // Build constraints
    const constraints: ScheduleConstraints = {
      classes: classes.map((c: any) => ({ id: c.id, name: c.name, capacity: c.capacity ?? 30, gradeId: c.gradeId })),
      teachers: teachers.map((t: any) => ({
        id: t.id,
        name: t.name,
        maxPeriodsPerDay: t.maxPeriodsPerDay,
        maxPeriodsPerWeek: t.maxPeriodsPerWeek,
        subjects: t.subjects.map((ts: any) => ts.subjectId),
        grades: teacherGrades.get(t.id) ?? [],
      })),
      subjects: subjects.map((s: any) => ({ id: s.id, name: s.name, category: s.category, pedagogicDay: s.pedagogicDay ?? 0 })),
      rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, type: r.type ?? 'CLASSROOM', capacity: r.capacity ?? 30 })),
      periods: periods.map((p: any) => {
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
      teacher: teachers.find((t: any) => t.id === l.teacherId)
        ? {
            name: (teachers.find((t: any) => t.id === l.teacherId) as any)!.name,
            maxPeriodsPerDay: (teachers.find((t: any) => t.id === l.teacherId) as any)!.maxPeriodsPerDay,
            maxPeriodsPerWeek: (teachers.find((t: any) => t.id === l.teacherId) as any)!.maxPeriodsPerWeek,
          }
        : undefined,
    }))
    const conflicts = detectConflicts(lessonsWithTempIds)
    const conflictTempIds = new Set(conflicts.flatMap((c) => c.lessonIds))

    // Save to database — D1 doesn't support interactive transactions
    await prisma.timetable.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false },
    })

    const timetable = await prisma.timetable.create({
      data: {
        schoolId,
        name: `AI Generated ${new Date().toLocaleDateString('en-GB')}`,
        generatedByAi: true,
        isActive: true,
        status: 'DRAFT',
      },
    })

    // Insert lessons in batches
    let created = 0
    for (const lesson of result.lessons) {
      const tempId = `temp-${created}`
      const hasConflict = conflictTempIds.has(tempId)
      const conflictInfo = hasConflict
        ? conflicts.find((c) => c.lessonIds.includes(tempId))
        : null

      await prisma.lesson.create({
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

    return Response.json({
      success: true,
      timetableId: timetable.id,
      timetableName: timetable.name,
      lessonsCreated: created,
      conflictsFound: conflicts.length,
      solveTimeMs: solveMs,
      stats: result.stats,
      readinessReport: readinessReport.warnings.length > 0 ? readinessReport : undefined,
    })
  } catch (err) {
    console.error('[Generate Timetable] Error:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
