/**
 * Deterministic timetable scheduler — greedy constraint satisfaction.
 *
 * Strategy: SLOT-FIRST iteration.
 * For each time slot (day × period), schedule all classes simultaneously.
 * This ensures fairness: no class starves because another grabbed all teachers.
 *
 * Hard constraints (never violated):
 *   - Teacher not double-booked in a time slot
 *   - Room not double-booked in a time slot
 *   - Class not double-booked in a time slot
 *   - Teacher can only teach assigned subjects
 *   - Teacher can only teach grades they are assigned to (if grade data exists)
 *   - Teacher maxPeriodsPerDay respected
 *   - Teacher maxPeriodsPerWeek respected
 *   - No lessons during breaks
 *
 * Soft constraints (optimized):
 *   - Balance teacher workload across the week
 *   - Spread subject hours evenly across days (max 1 per subject per day per class)
 *   - Heavy subjects (Math, Science) in morning periods
 *   - PE not in first period
 *   - No same subject consecutively for a class
 *   - Match room type to subject (lab, gym, etc.)
 */

import type { ScheduleConstraints, GeneratedLesson } from './schedule-engine'

// ---------------------------------------------------------------------------
// Configuration — fallback hours when no grade curriculum is defined
// ---------------------------------------------------------------------------

/** Weekly hours per subject (Tunisian middle-school curriculum) */
const SUBJECT_HOURS: Record<string, number> = {
  Mathematics: 5,
  Arabic: 4,
  French: 3,
  English: 3,
  Physics: 2,
  Chemistry: 2,
  Biology: 2,
  History: 2,
  Geography: 2,
  'Islamic Studies': 2,
  'Physical Education': 2,
  Technology: 2,
}

/** Fallback hours by category if subject name not found */
const CATEGORY_HOURS: Record<string, number> = {
  MATH: 5,
  SCIENCE: 2,
  LANGUAGE: 3,
  HUMANITIES: 2,
  RELIGION: 2,
  PE: 2,
  TECH: 2,
}

/** Preferred room types per subject category */
const ROOM_PREFS: Record<string, string[]> = {
  SCIENCE: ['LAB_SCIENCE', 'CLASSROOM'],
  PE: ['GYM', 'CLASSROOM'],
  TECH: ['LAB_COMPUTER', 'CLASSROOM'],
}

// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

export interface SolverResult {
  lessons: GeneratedLesson[]
  stats: {
    totalSlots: number
    filledSlots: number
    emptySlots: number
    conflictsAvoided: number
    teacherUtilization: Record<string, number>
  }
}

export function solveTimetable(constraints: ScheduleConstraints): SolverResult {
  const { classes, teachers, subjects, rooms, periods, days, gradeCurriculum } = constraints

  // Guard: return empty result if no data to work with
  if (!classes.length || !teachers.length || !subjects.length || !periods.length || !days.length) {
    return {
      lessons: [],
      stats: { totalSlots: 0, filledSlots: 0, emptySlots: 0, conflictsAvoided: 0, teacherUtilization: {} },
    }
  }

  const teachingPeriods = periods.filter((p) => !p.isBreak)

  // Calculate total slots accounting for per-day period restrictions
  let totalSlotsPerClass = 0
  for (const day of days) {
    for (const p of teachingPeriods) {
      if (!p.applicableDays?.length || p.applicableDays.includes(day)) {
        totalSlotsPerClass++
      }
    }
  }

  // Lookups
  const subjectById = new Map(subjects.map((s) => [s.id, s]))
  const teacherById = new Map(teachers.map((t) => [t.id, t]))

  // Build teacher → subjects index
  const teachersBySubject = new Map<string, typeof teachers>()
  for (const sub of subjects) {
    teachersBySubject.set(
      sub.id,
      teachers.filter((t) => t.subjects.includes(sub.id)),
    )
  }

  // Build per-class curriculum: classId → [{ subjectId, hours }]
  const classCurricula = new Map<string, { subjectId: string; hours: number }[]>()

  for (const cls of classes) {
    let curriculum: { subjectId: string; hours: number }[]

    if (cls.gradeId && gradeCurriculum && gradeCurriculum[cls.gradeId]) {
      // Use grade-specific curriculum
      curriculum = gradeCurriculum[cls.gradeId].map((gc) => ({
        subjectId: gc.subjectId,
        hours: gc.hoursPerWeek,
      }))
    } else {
      // Fallback: all subjects with default hours
      curriculum = subjects.map((sub) => ({
        subjectId: sub.id,
        hours: SUBJECT_HOURS[sub.name] ?? CATEGORY_HOURS[sub.category] ?? 2,
      }))
    }

    // Sort: most-constrained subjects first (fewest eligible teachers for this class)
    curriculum.sort((a, b) => {
      const teachersA = countEligibleTeachers(a.subjectId, cls)
      const teachersB = countEligibleTeachers(b.subjectId, cls)
      return teachersA - teachersB
    })

    classCurricula.set(cls.id, curriculum)
  }

  /** Count eligible teachers for a subject+class (considering grade restrictions) */
  function countEligibleTeachers(subjectId: string, cls: typeof classes[0]): number {
    const subjectTeachers = teachersBySubject.get(subjectId) ?? []
    if (!cls.gradeId) return subjectTeachers.length
    return subjectTeachers.filter(
      (t) => !t.grades || t.grades.length === 0 || t.grades.includes(cls.gradeId!),
    ).length
  }

  // ---- Tracking state ----

  // Teacher busy: "day:periodId" → Set<teacherId>
  const teacherBusy = new Map<string, Set<string>>()
  // Room busy: "day:periodId" → Set<roomId>
  const roomBusy = new Map<string, Set<string>>()
  // Class busy: "day:periodId" → Set<classId>
  const classBusy = new Map<string, Set<string>>()

  // Teacher usage counters
  const teacherDayUsage = new Map<string, number[]>() // teacherId → [day0count, day1count, ...]
  const teacherWeekUsage = new Map<string, number>()   // teacherId → total

  // Per-class: subjectId → hours assigned this week
  const classSubjectWeek = new Map<string, Map<string, number>>()
  // Per-class per-day: subjectId → hours assigned this day
  const classSubjectDay = new Map<string, Map<string, number>>() // key: "classId:day"
  // Per-class: last assigned subjectId per day (for consecutive check)
  const classLastSubject = new Map<string, string>() // key: "classId:day"

  // Initialize
  for (const t of teachers) {
    teacherDayUsage.set(t.id, new Array(7).fill(0))
    teacherWeekUsage.set(t.id, 0)
  }
  for (const c of classes) {
    classSubjectWeek.set(c.id, new Map())
  }

  function sk(day: number, periodId: string): string {
    return `${day}:${periodId}`
  }

  function isTeacherFree(tid: string, day: number, pid: string): boolean {
    return !(teacherBusy.get(sk(day, pid))?.has(tid))
  }
  function isRoomFree(rid: string, day: number, pid: string): boolean {
    return !(roomBusy.get(sk(day, pid))?.has(rid))
  }
  function isClassFree(cid: string, day: number, pid: string): boolean {
    return !(classBusy.get(sk(day, pid))?.has(cid))
  }

  function canTeacherWork(tid: string, day: number): boolean {
    const t = teacherById.get(tid)!
    const dayUse = teacherDayUsage.get(tid)![day] ?? 0
    const weekUse = teacherWeekUsage.get(tid) ?? 0
    return dayUse < t.maxPeriodsPerDay && weekUse < t.maxPeriodsPerWeek
  }

  function getClassSubjectDayCount(cid: string, day: number, sid: string): number {
    return classSubjectDay.get(`${cid}:${day}`)?.get(sid) ?? 0
  }

  function getClassSubjectWeekCount(cid: string, sid: string): number {
    return classSubjectWeek.get(cid)?.get(sid) ?? 0
  }

  function assign(
    classId: string,
    teacherId: string,
    roomId: string,
    subjectId: string,
    day: number,
    periodId: string,
  ) {
    const key = sk(day, periodId)

    if (!teacherBusy.has(key)) teacherBusy.set(key, new Set())
    teacherBusy.get(key)!.add(teacherId)

    if (!roomBusy.has(key)) roomBusy.set(key, new Set())
    roomBusy.get(key)!.add(roomId)

    if (!classBusy.has(key)) classBusy.set(key, new Set())
    classBusy.get(key)!.add(classId)

    teacherDayUsage.get(teacherId)![day]++
    teacherWeekUsage.set(teacherId, (teacherWeekUsage.get(teacherId) ?? 0) + 1)

    // Class subject week
    const csw = classSubjectWeek.get(classId)!
    csw.set(subjectId, (csw.get(subjectId) ?? 0) + 1)

    // Class subject day
    const csdKey = `${classId}:${day}`
    if (!classSubjectDay.has(csdKey)) classSubjectDay.set(csdKey, new Map())
    const csd = classSubjectDay.get(csdKey)!
    csd.set(subjectId, (csd.get(subjectId) ?? 0) + 1)

    // Last subject for consecutive check
    classLastSubject.set(csdKey, subjectId)
  }

  // ---- Main loop: iterate by time slot ----

  const lessons: GeneratedLesson[] = []
  let conflictsAvoided = 0
  const sortedDays = [...days].sort((a, b) => a - b)

  for (const day of sortedDays) {
    for (let pIdx = 0; pIdx < teachingPeriods.length; pIdx++) {
      const period = teachingPeriods[pIdx]

      // Skip this period if it doesn't apply to this day
      if (period.applicableDays?.length && !period.applicableDays.includes(day)) continue

      // Shuffle class processing order per slot for fairness
      // Use a deterministic seed so results are reproducible
      const seed = day * 1000 + pIdx * 100
      const classOrder = shuffleDet(classes, seed)

      for (const cls of classOrder) {
        if (!isClassFree(cls.id, day, period.id)) continue

        // Get this class's curriculum
        const curriculum = classCurricula.get(cls.id) ?? []

        // Try each subject (most-constrained first)
        let bestLesson: GeneratedLesson | null = null
        let bestScore = -Infinity

        for (const { subjectId, hours: targetHours } of curriculum) {
          const sub = subjectById.get(subjectId)
          if (!sub) continue

          // Already got enough hours this week?
          const weekCount = getClassSubjectWeekCount(cls.id, subjectId)
          if (weekCount >= targetHours) continue

          // Already had this subject today? (max 1 per subject per day per class)
          const dayCount = getClassSubjectDayCount(cls.id, day, subjectId)
          if (dayCount >= 1) continue

          // Soft: avoid consecutive same subject
          const lastSub = classLastSubject.get(`${cls.id}:${day}`)
          const isConsecutive = lastSub === subjectId

          // Soft: PE not first period
          const isFirstPeriod = pIdx === 0
          if (sub.category === 'PE' && isFirstPeriod) continue

          // Find available teachers for this subject + grade
          const eligibleTeachers = (teachersBySubject.get(subjectId) ?? []).filter((t) => {
            if (!isTeacherFree(t.id, day, period.id)) return false
            if (!canTeacherWork(t.id, day)) return false
            // Grade restriction: if teacher has grade assignments, they must include this class's grade
            if (cls.gradeId && t.grades && t.grades.length > 0) {
              if (!t.grades.includes(cls.gradeId)) return false
            }
            return true
          })

          if (eligibleTeachers.length === 0) {
            conflictsAvoided++
            continue
          }

          // Pick teacher with lowest week usage (balance workload)
          eligibleTeachers.sort(
            (a, b) => (teacherWeekUsage.get(a.id) ?? 0) - (teacherWeekUsage.get(b.id) ?? 0),
          )
          const teacher = eligibleTeachers[0]

          // Find available room
          const prefTypes = ROOM_PREFS[sub.category] ?? ['CLASSROOM']
          let room: (typeof rooms)[0] | null = null

          for (const rt of prefTypes) {
            room = rooms.find((r) => r.type === rt && isRoomFree(r.id, day, period.id)) ?? null
            if (room) break
          }
          if (!room) {
            room = rooms.find((r) => isRoomFree(r.id, day, period.id)) ?? null
          }
          if (!room) {
            conflictsAvoided++
            continue
          }

          // Score this assignment
          let score = 0
          // Prefer most-constrained subjects (fewer teachers = higher priority)
          score += (10 - eligibleTeachers.length) * 10
          // Prefer subjects with more remaining hours
          score += (targetHours - weekCount) * 5
          // Prefer morning slots for heavy subjects
          if ((sub.category === 'MATH' || sub.category === 'SCIENCE') && pIdx < 3) score += 3
          // Penalize consecutive same subject
          if (isConsecutive) score -= 20
          // Prefer balanced teacher load
          score -= (teacherWeekUsage.get(teacher.id) ?? 0)

          if (score > bestScore) {
            bestScore = score
            bestLesson = {
              classId: cls.id,
              subjectId,
              teacherId: teacher.id,
              roomId: room.id,
              periodId: period.id,
              dayOfWeek: day,
            }
          }
        }

        if (bestLesson && bestLesson.roomId) {
          lessons.push(bestLesson)
          assign(
            bestLesson.classId,
            bestLesson.teacherId,
            bestLesson.roomId,
            bestLesson.subjectId,
            bestLesson.dayOfWeek,
            bestLesson.periodId,
          )
        }
      }
    }
  }

  // Build teacher utilization stats
  const teacherUtilization: Record<string, number> = {}
  for (const t of teachers) {
    teacherUtilization[t.name] = teacherWeekUsage.get(t.id) ?? 0
  }

  return {
    lessons,
    stats: {
      totalSlots: classes.length * totalSlotsPerClass,
      filledSlots: lessons.length,
      emptySlots: classes.length * totalSlotsPerClass - lessons.length,
      conflictsAvoided,
      teacherUtilization,
    },
  }
}

/** Deterministic Fisher-Yates shuffle */
function shuffleDet<T>(arr: readonly T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
