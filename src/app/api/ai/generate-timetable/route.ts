import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { solveTimetable } from '@/lib/schedule-solver'
import type { ScheduleConstraints } from '@/lib/schedule-engine'
import { detectConflicts } from '@/lib/conflict-detector'
import { requireSchoolAccess } from '@/lib/auth/require-auth'
import { getAppSettings } from '@/lib/app-settings'
import { getEffectiveMaxWeekly, getEffectiveMaxDaily } from '@/lib/teacher-seniority'

interface ReadinessIssue {
  type: string
  message: string
  details: string[]
  detailsAr?: string[]
  detailsFr?: string[]
}

interface SubjectEstimate {
  subject: string
  nameAr?: string | null
  nameFr?: string | null
  hoursNeeded: number
  teachersNeeded: number
  teachersAvailable: number
  deficit: number
}

interface RoomTypeRequirement {
  sessionType: number
  sessionTypeName: string
  requiredRoomTypes: string[]
  sessionsNeeded: number
  roomsAvailable: number
  deficit: number
}

interface ReadinessReport {
  ready: boolean
  critical: ReadinessIssue[]
  warnings: ReadinessIssue[]
  estimates: SubjectEstimate[]
  roomRequirements?: RoomTypeRequirement[]
  summary: {
    totalClasses: number
    totalTeachers: number
    totalTeachersNeeded: number
    totalSubjects: number
    totalRooms: number
    classroomsNeeded: number
    teacherCapacity: string
    sessionAware: boolean
    groupSessionCount?: number
    biweeklySessionCount?: number
    multiHourSessionCount?: number
  }
}

// Session type → required room types (must match schedule-solver.ts)
const SESSION_TYPE_ROOM_REQUIREMENTS: Record<number, { name: string; roomTypes: string[] }> = {
  1: { name: 'Regular', roomTypes: ['CLASSROOM'] },
  2: { name: 'Lab SVT', roomTypes: ['LAB_SCIENCE', 'LAB_BIOLOGY', 'LAB'] },
  3: { name: 'Lab Physics', roomTypes: ['LAB_SCIENCE', 'LAB_PHYSICS', 'LAB_CHEMISTRY', 'LAB'] },
  4: { name: 'Lab Tech', roomTypes: ['LAB_ENGINEERING', 'LAB'] },
  5: { name: 'PE', roomTypes: ['GYM', 'GYMNASIUM'] },
  6: { name: 'Computer Lab', roomTypes: ['LAB_COMPUTER'] },
  7: { name: 'Mech Engineering', roomTypes: ['LAB_ENGINEERING'] },
  8: { name: 'Elec Engineering', roomTypes: ['LAB_ENGINEERING'] },
}

interface SessionInfo {
  subjectId: string
  sequence: number
  duration: number
  sessionTypeCode: number
  isGroup: boolean
  isBiweekly: boolean
  pairingCode: number
}

function validateReadiness(
  classes: any[],
  teachers: any[],
  subjects: any[],
  rooms: any[],
  gradeCurriculum: Record<string, { subjectId: string; hoursPerWeek: number }[]>,
  gradeNameMap: Map<string, string>,
  gradeSessions?: Record<string, SessionInfo[]>,
  gradeNameArMap?: Map<string, string>,
  gradeNameFrMap?: Map<string, string>,
): ReadinessReport {
  const critical: ReadinessIssue[] = []
  const warnings: ReadinessIssue[] = []
  const hasSessionData = gradeSessions && Object.keys(gradeSessions).length > 0

  // 1. Subject-Teacher Coverage
  const teacherSubjectMap = new Map<string, Set<string>>()
  for (const t of teachers) {
    for (const ts of t.subjects) {
      if (!teacherSubjectMap.has(ts.subjectId)) teacherSubjectMap.set(ts.subjectId, new Set())
      teacherSubjectMap.get(ts.subjectId)!.add(t.id)
    }
  }

  const subjectNameMap = new Map(subjects.map((s: any) => [s.id, s.name]))
  const subjectNameArMap = new Map(subjects.map((s: any) => [s.id, s.nameAr || s.name]))
  const subjectNameFrMap = new Map(subjects.map((s: any) => [s.id, s.nameFr || s.name]))
  const hasCurriculum = Object.keys(gradeCurriculum).length > 0

  if (hasCurriculum) {
    // Check curriculum-based coverage: each grade's subjects need a teacher
    // Track by gradeId so we can build locale-specific detail lines
    const uncoveredByGradeId = new Map<string, Set<string>>() // gradeId → Set<subjectId>
    for (const [gradeId, curriculum] of Object.entries(gradeCurriculum)) {
      for (const gc of curriculum) {
        const teachersForSubject = teacherSubjectMap.get(gc.subjectId)
        if (!teachersForSubject || teachersForSubject.size === 0) {
          if (!uncoveredByGradeId.has(gradeId)) uncoveredByGradeId.set(gradeId, new Set())
          uncoveredByGradeId.get(gradeId)!.add(gc.subjectId)
        }
      }
    }

    if (uncoveredByGradeId.size > 0) {
      const details: string[] = []
      const detailsAr: string[] = []
      const detailsFr: string[] = []
      for (const [gradeId, subjectIds] of uncoveredByGradeId) {
        const gName = gradeNameMap.get(gradeId) || gradeId
        const gNameAr = gradeNameArMap?.get(gradeId) || gName
        const gNameFr = gradeNameFrMap?.get(gradeId) || gName
        const sNames = [...subjectIds].map(id => subjectNameMap.get(id) || id)
        const sNamesAr = [...subjectIds].map(id => subjectNameArMap.get(id) || subjectNameMap.get(id) || id)
        const sNamesFr = [...subjectIds].map(id => subjectNameFrMap.get(id) || subjectNameMap.get(id) || id)
        details.push(`${gName}: ${sNames.join(', ')}`)
        detailsAr.push(`${gNameAr}: ${sNamesAr.join('، ')}`)
        detailsFr.push(`${gNameFr}: ${sNamesFr.join(', ')}`)
      }
      critical.push({
        type: 'MISSING_TEACHERS',
        message: 'Some curriculum subjects have no assigned teachers',
        details,
        detailsAr,
        detailsFr,
      })
    }
  } else {
    // No grade curriculum: solver assigns ALL subjects to ALL classes (fallback mode)
    const uncoveredSubjectIds: string[] = []
    for (const sub of subjects) {
      const teachersForSubject = teacherSubjectMap.get(sub.id)
      if (!teachersForSubject || teachersForSubject.size === 0) {
        uncoveredSubjectIds.push(sub.id)
      }
    }

    if (uncoveredSubjectIds.length > 0) {
      critical.push({
        type: 'MISSING_TEACHERS',
        message: `${uncoveredSubjectIds.length} subject(s) have no assigned teachers`,
        details: uncoveredSubjectIds.map(id => `${subjectNameMap.get(id) || id}: no teacher assigned`),
        detailsAr: uncoveredSubjectIds.map(id => `${subjectNameArMap.get(id) || id}: لا يوجد معلم مُعيّن`),
        detailsFr: uncoveredSubjectIds.map(id => `${subjectNameFrMap.get(id) || id}: aucun enseignant assigné`),
      })
    }
  }

  // 1b. Per-subject teacher estimation (session-aware when data available)
  const estimates: SubjectEstimate[] = []

  for (const sub of subjects) {
    const subjectTeacherIds = teacherSubjectMap.get(sub.id)
    const teachersAvailable = subjectTeacherIds ? subjectTeacherIds.size : 0

    let hoursNeeded = 0

    if (hasSessionData) {
      // Session-aware: count actual session hours per class
      for (const [gradeId, sessions] of Object.entries(gradeSessions!)) {
        const subjectSessions = sessions.filter(s => s.subjectId === sub.id)
        if (subjectSessions.length === 0) continue
        const numClasses = classes.filter((c: any) => c.gradeId === gradeId).length
        // Group sessions need 2 teachers (one per group), biweekly count as half
        for (const sess of subjectSessions) {
          const teacherMultiplier = sess.isGroup ? 2 : 1
          const weekMultiplier = sess.isBiweekly ? 0.5 : 1
          hoursNeeded += sess.duration * numClasses * teacherMultiplier * weekMultiplier
        }
      }
    } else if (hasCurriculum) {
      for (const [gradeId, curriculum] of Object.entries(gradeCurriculum)) {
        const entry = curriculum.find(gc => gc.subjectId === sub.id)
        if (entry) {
          const numClasses = classes.filter((c: any) => c.gradeId === gradeId).length
          hoursNeeded += entry.hoursPerWeek * numClasses
        }
      }
    } else {
      hoursNeeded = classes.length * 2
    }

    if (hoursNeeded === 0) continue

    // Use seniority-aware capacity: average actual teacher capacity for this subject
    let avgCapacity = 18
    if (subjectTeacherIds && subjectTeacherIds.size > 0) {
      const subjectTeachers = teachers.filter((t: any) => subjectTeacherIds.has(t.id))
      avgCapacity = subjectTeachers.reduce((sum: number, t: any) => sum + getEffectiveMaxWeekly(t), 0) / subjectTeachers.length
    }

    const teachersNeeded = Math.ceil(hoursNeeded / avgCapacity)
    const deficit = Math.max(0, teachersNeeded - teachersAvailable)

    estimates.push({
      subject: sub.name,
      nameAr: sub.nameAr || null,
      nameFr: sub.nameFr || null,
      hoursNeeded: Math.round(hoursNeeded * 10) / 10, // round for biweekly fractions
      teachersNeeded,
      teachersAvailable,
      deficit,
    })
  }

  estimates.sort((a, b) => b.deficit - a.deficit)

  const deficitEstimates = estimates.filter(e => e.deficit > 0)

  if (deficitEstimates.length > 0) {
    warnings.push({
      type: 'SUBJECT_CAPACITY',
      message: 'Some subjects need more teachers',
      details: deficitEstimates.map(e => `${e.subject}: needs ${e.teachersNeeded} teacher(s) (${e.hoursNeeded}h/week), has ${e.teachersAvailable} — need ${e.deficit} more`),
      detailsAr: deficitEstimates.map(e => `${e.nameAr || e.subject}: يحتاج ${e.teachersNeeded} معلم(ين) (${e.hoursNeeded} ساعة/أسبوع)، لديه ${e.teachersAvailable} — يحتاج ${e.deficit} إضافي`),
      detailsFr: deficitEstimates.map(e => `${e.nameFr || e.subject}: besoin de ${e.teachersNeeded} enseignant(s) (${e.hoursNeeded}h/sem), a ${e.teachersAvailable} — besoin de ${e.deficit} de plus`),
    })
  }

  // 2. Room / Classroom estimation — session-type-aware when data available
  const roomsByType = new Map<string, number>()
  for (const r of rooms) {
    const t = (r as any).type || 'CLASSROOM'
    roomsByType.set(t, (roomsByType.get(t) || 0) + 1)
  }

  const roomRequirements: RoomTypeRequirement[] = []

  if (hasSessionData) {
    // Count max concurrent sessions per session type across all classes
    // Simplified: count total sessions per type across all grades × classes
    const sessionTypeCount = new Map<number, number>()

    for (const [gradeId, sessions] of Object.entries(gradeSessions!)) {
      const numClasses = classes.filter((c: any) => c.gradeId === gradeId).length
      for (const sess of sessions) {
        const stc = sess.sessionTypeCode
        if (stc >= 2) { // Only specialized rooms (skip regular classrooms)
          const count = sess.isGroup ? numClasses * 2 : numClasses // group needs 2 rooms
          sessionTypeCount.set(stc, (sessionTypeCount.get(stc) || 0) + count)
        }
      }
    }

    for (const [stc, totalSessions] of sessionTypeCount) {
      const typeInfo = SESSION_TYPE_ROOM_REQUIREMENTS[stc]
      if (!typeInfo) continue

      const availableRooms = typeInfo.roomTypes.reduce((sum, rt) => sum + (roomsByType.get(rt) || 0), 0)
      const deficit = availableRooms === 0 ? totalSessions : 0 // critical if NO rooms of this type

      roomRequirements.push({
        sessionType: stc,
        sessionTypeName: typeInfo.name,
        requiredRoomTypes: typeInfo.roomTypes,
        sessionsNeeded: totalSessions,
        roomsAvailable: availableRooms,
        deficit,
      })
    }

    const missingRoomTypes = roomRequirements.filter(r => r.roomsAvailable === 0)
    if (missingRoomTypes.length > 0) {
      critical.push({
        type: 'MISSING_SPECIALIZED_ROOMS',
        message: 'Required specialized rooms are missing for session types in the curriculum',
        details: missingRoomTypes.map(r =>
          `${r.sessionTypeName} (type ${r.sessionType}): ${r.sessionsNeeded} session(s) need ${r.requiredRoomTypes.join(' or ')} — 0 available`
        ),
        detailsAr: missingRoomTypes.map(r =>
          `${r.sessionTypeName} (نوع ${r.sessionType}): ${r.sessionsNeeded} حصة تحتاج ${r.requiredRoomTypes.join(' أو ')} — 0 متاح`
        ),
        detailsFr: missingRoomTypes.map(r =>
          `${r.sessionTypeName} (type ${r.sessionType}): ${r.sessionsNeeded} séance(s) nécessitent ${r.requiredRoomTypes.join(' ou ')} — 0 disponible`
        ),
      })
    }

    // Warn if low room capacity for a type (rooms exist but may be insufficient)
    const lowCapacityRooms = roomRequirements.filter(r => r.roomsAvailable > 0 && r.sessionsNeeded > r.roomsAvailable * 6)
    if (lowCapacityRooms.length > 0) {
      warnings.push({
        type: 'LOW_ROOM_CAPACITY',
        message: 'Some room types may be overbooked',
        details: lowCapacityRooms.map(r =>
          `${r.sessionTypeName}: ${r.sessionsNeeded} sessions/week, only ${r.roomsAvailable} room(s) available`
        ),
        detailsAr: lowCapacityRooms.map(r =>
          `${r.sessionTypeName}: ${r.sessionsNeeded} حصة/أسبوع، فقط ${r.roomsAvailable} قاعة متاحة`
        ),
        detailsFr: lowCapacityRooms.map(r =>
          `${r.sessionTypeName}: ${r.sessionsNeeded} séances/sem, seulement ${r.roomsAvailable} salle(s) disponible(s)`
        ),
      })
    }
  } else {
    // Fallback: category-based room checks
    const roomTypes = new Set(rooms.map((r: any) => r.type))

    const missingRoomEn: string[] = []
    const missingRoomAr: string[] = []
    const missingRoomFr: string[] = []
    const hasScience = subjects.some((s: any) => s.category === 'SCIENCE')
    if (hasScience && !roomTypes.has('LAB_SCIENCE') && !roomTypes.has('LAB') && !roomTypes.has('LAB_PHYSICS') && !roomTypes.has('LAB_BIOLOGY') && !roomTypes.has('LAB_CHEMISTRY')) {
      missingRoomEn.push('Science Lab (needed for science subjects)')
      missingRoomAr.push('مخبر علوم (مطلوب لمواد العلوم)')
      missingRoomFr.push('Laboratoire de sciences (requis pour les matières scientifiques)')
    }
    const hasPE = subjects.some((s: any) => s.category === 'PE')
    if (hasPE && !roomTypes.has('GYM') && !roomTypes.has('GYMNASIUM')) {
      missingRoomEn.push('Gymnasium / Sports facility (needed for PE)')
      missingRoomAr.push('قاعة رياضة / ملعب (مطلوب للتربية البدنية)')
      missingRoomFr.push('Gymnase / Salle de sport (requis pour l\'EPS)')
    }
    const hasTech = subjects.some((s: any) => s.category === 'TECH')
    if (hasTech && !roomTypes.has('LAB_COMPUTER')) {
      missingRoomEn.push('Computer Lab (needed for technology/computer subjects)')
      missingRoomAr.push('مخبر حاسوب (مطلوب لمواد التكنولوجيا/الإعلامية)')
      missingRoomFr.push('Salle informatique (requise pour les matières technologiques)')
    }

    if (missingRoomEn.length > 0) {
      warnings.push({
        type: 'MISSING_ROOMS',
        message: 'Some specialized room types are missing',
        details: missingRoomEn,
        detailsAr: missingRoomAr,
        detailsFr: missingRoomFr,
      })
    }
  }

  // Classrooms needed: at any given period, each class needs a room
  // Group sessions need 2 rooms in the same slot
  let classroomsNeeded = classes.length
  if (hasSessionData) {
    // Count max group sessions in any single grade to estimate peak room need
    let maxGroupBoost = 0
    for (const [gradeId, sessions] of Object.entries(gradeSessions!)) {
      const groupCount = sessions.filter(s => s.isGroup).length
      const numClasses = classes.filter((c: any) => c.gradeId === gradeId).length
      maxGroupBoost = Math.max(maxGroupBoost, groupCount * numClasses)
    }
    classroomsNeeded += Math.ceil(maxGroupBoost / 6) // spread across ~6 periods/day
  }

  const classroomsAvailable = rooms.length
  if (classroomsAvailable < classroomsNeeded) {
    const deficit = classroomsNeeded - classroomsAvailable
    warnings.push({
      type: 'INSUFFICIENT_ROOMS',
      message: `Not enough rooms: ${classroomsAvailable} available, ~${classroomsNeeded} needed (accounting for group sessions)`,
      details: [`Need ~${deficit} more room(s) to avoid scheduling gaps`],
      detailsAr: [`يحتاج ~${deficit} قاعة إضافية لتجنب فجوات في الجدول`],
      detailsFr: [`Besoin de ~${deficit} salle(s) supplémentaire(s) pour éviter les lacunes`],
    })
  }

  // 3. Teacher Workload Feasibility (seniority-aware)
  const totalCapacity = teachers.reduce((sum: number, t: any) => sum + getEffectiveMaxWeekly(t), 0)
  const totalDemand = estimates.reduce((sum, e) => sum + e.hoursNeeded, 0)
  const totalTeachersNeeded = estimates.reduce((sum, e) => sum + e.teachersNeeded, 0)

  if (totalDemand > 0 && totalCapacity < totalDemand) {
    const deficit = totalDemand - totalCapacity
    warnings.push({
      type: 'CAPACITY_SHORTAGE',
      message: `Overall teacher capacity insufficient`,
      details: [`Available: ${totalCapacity}h/week — Required: ${totalDemand}h/week (deficit: ${deficit}h)`],
      detailsAr: [`المتاح: ${totalCapacity} ساعة/أسبوع — المطلوب: ${totalDemand} ساعة/أسبوع (عجز: ${deficit} ساعة)`],
      detailsFr: [`Disponible: ${totalCapacity}h/sem — Requis: ${totalDemand}h/sem (déficit: ${deficit}h)`],
    })
  }

  // 4. Classes without grade curriculum
  const classesWithoutCurriculum = classes.filter((c: any) => !c.gradeId || !gradeCurriculum[c.gradeId])
  if (classesWithoutCurriculum.length > 0) {
    warnings.push({
      type: 'NO_CURRICULUM',
      message: `${classesWithoutCurriculum.length} class(es) have no grade curriculum defined`,
      details: classesWithoutCurriculum.map((c: any) => `${c.name}: will use fallback subject hours`),
      detailsAr: classesWithoutCurriculum.map((c: any) => `${c.name}: سيستخدم ساعات المواد الافتراضية`),
      detailsFr: classesWithoutCurriculum.map((c: any) => `${c.name}: utilisera les heures par défaut`),
    })
  }

  // 5. Session-specific stats
  let groupSessionCount = 0
  let biweeklySessionCount = 0
  let multiHourSessionCount = 0

  if (hasSessionData) {
    for (const sessions of Object.values(gradeSessions!)) {
      for (const s of sessions) {
        if (s.isGroup) groupSessionCount++
        if (s.isBiweekly) biweeklySessionCount++
        if (s.duration > 1) multiHourSessionCount++
      }
    }
  }

  return {
    ready: critical.length === 0,
    critical,
    warnings,
    estimates,
    roomRequirements: roomRequirements.length > 0 ? roomRequirements : undefined,
    summary: {
      totalClasses: classes.length,
      totalTeachers: teachers.length,
      totalTeachersNeeded,
      totalSubjects: subjects.length,
      totalRooms: rooms.length,
      classroomsNeeded,
      teacherCapacity: totalDemand > 0
        ? `${totalCapacity}h available / ${Math.round(totalDemand)}h needed`
        : `${totalCapacity}h available`,
      sessionAware: !!hasSessionData,
      groupSessionCount: hasSessionData ? groupSessionCount : undefined,
      biweeklySessionCount: hasSessionData ? biweeklySessionCount : undefined,
      multiHourSessionCount: hasSessionData ? multiHourSessionCount : undefined,
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
    const [school, classes, teachers, subjects, rooms, periods, gradeCurriculumRows, teacherGradeRows, grades, curriculumSessionRows] = await Promise.all([
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
      prisma.grade.findMany({ where: { schoolId }, select: { id: true, name: true, nameAr: true, nameFr: true } }),
      prisma.curriculumSession.findMany({
        where: { curriculum: { grade: { schoolId } } },
        include: { curriculum: { select: { gradeId: true, subjectId: true } } },
      }).catch(() => [] as any[]),
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

    // Build per-grade session requirements: gradeId → SessionRequirement[]
    const gradeSessions: Record<string, { subjectId: string; sequence: number; duration: number; sessionTypeCode: number; isGroup: boolean; isBiweekly: boolean; pairingCode: number }[]> = {}
    for (const cs of curriculumSessionRows) {
      const gradeId = cs.curriculum?.gradeId
      const subjectId = cs.curriculum?.subjectId
      if (!gradeId || !subjectId) continue
      if (!gradeSessions[gradeId]) gradeSessions[gradeId] = []
      gradeSessions[gradeId].push({
        subjectId,
        sequence: cs.sequence,
        duration: cs.duration,
        sessionTypeCode: cs.sessionTypeCode,
        isGroup: cs.isGroup,
        isBiweekly: cs.isBiweekly,
        pairingCode: cs.pairingCode,
      })
    }

    // ---- Pre-validation: readiness report ----
    const gradeNameMap = new Map<string, string>(grades.map((g: any) => [g.id, g.name]))
    const gradeNameArMap = new Map<string, string>(grades.map((g: any) => [g.id, g.nameAr || g.name]))
    const gradeNameFrMap = new Map<string, string>(grades.map((g: any) => [g.id, g.nameFr || g.name]))
    const readinessReport = validateReadiness(classes, teachers, subjects, rooms, gradeCurriculum, gradeNameMap, gradeSessions, gradeNameArMap, gradeNameFrMap)

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
        maxPeriodsPerDay: getEffectiveMaxDaily(t),
        maxPeriodsPerWeek: getEffectiveMaxWeekly(t),
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
      gradeSessions: Object.keys(gradeSessions).length > 0 ? gradeSessions : undefined,
    }

    console.log(`[Generate] Solving timetable — ${classes.length} classes, ${teachers.length} teachers, ${subjects.length} subjects`)
    const startTime = Date.now()

    // Run deterministic solver
    const result = solveTimetable(constraints)
    const solveMs = Date.now() - startTime
    console.log(`[Generate] Solved in ${solveMs}ms — ${result.lessons.length} lessons, ${result.stats.placedSessions}/${result.stats.totalSessions} sessions placed, ${result.stats.unplacedCount} unplaced`)

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
          sessionTypeCode: lesson.sessionTypeCode ?? null,
          groupLabel: lesson.groupLabel ?? null,
          blockId: lesson.blockId ?? null,
          weekType: lesson.weekType ?? null,
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
      unplacedSessions: result.unplacedSessions.length > 0 ? result.unplacedSessions : undefined,
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
