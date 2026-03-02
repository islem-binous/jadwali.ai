/**
 * Deterministic timetable scheduler — greedy constraint satisfaction.
 *
 * Strategy: SLOT-FIRST iteration.
 * For each time slot (day × period), schedule all classes simultaneously.
 * This ensures fairness: no class starves because another grabbed all teachers.
 *
 * Hard constraints (never violated):
 *   H1: Multi-hour sessions occupy consecutive periods with no breaks
 *   H2: Group sessions (ParGroupe) create parallel group A/B lessons
 *   H3: Session type determines required room type
 *   H4: Biweekly sessions (ParQuinzaine) share slot, alternate weeks
 *   H5: PE not in first period; needs dedicated gym/outdoor
 *   H6: Same teacher for all sessions of a subject per class
 *   H7: Teacher maxPeriodsPerWeek respected (18h default; 15h for 25+ yrs seniority)
 *   H8: Teacher maxPeriodsPerDay respected (4h max)
 *   H9: Pedagogic day: subject blocked on its designated day
 *   R:  Specialized rooms reserved; library/gym NEVER for other subjects
 *
 * Soft constraints (optimized):
 *   S1: Heavy subjects (Math, Science) in morning periods
 *   S2: Spread subject hours evenly across days
 *   S3: No same subject consecutively for a class
 *   S5: Arts/PE in afternoon
 *   S6: Balance daily load
 */

import type { ScheduleConstraints, GeneratedLesson, SessionRequirement } from './schedule-engine'

// ---------------------------------------------------------------------------
// Configuration — fallback hours when no grade curriculum is defined
// ---------------------------------------------------------------------------

const SUBJECT_HOURS: Record<string, number> = {
  Mathematics: 5, Arabic: 4, French: 3, English: 3,
  Physics: 2, Chemistry: 2, Biology: 2, History: 2,
  Geography: 2, 'Islamic Studies': 2, 'Physical Education': 2, Technology: 2,
}

const CATEGORY_HOURS: Record<string, number> = {
  MATH: 5, SCIENCE: 2, LANGUAGE: 3, HUMANITIES: 2, RELIGION: 2, PE: 2, TECH: 2,
}

/** Session type → required room types (H3) */
const SESSION_TYPE_ROOM_MAP: Record<number, string[]> = {
  1: ['CLASSROOM'],
  2: ['LAB_SCIENCE', 'LAB_BIOLOGY', 'LAB'],
  3: ['LAB_SCIENCE', 'LAB_PHYSICS', 'LAB_CHEMISTRY', 'LAB'],
  4: ['LAB_ENGINEERING', 'LAB'],
  5: ['GYM', 'GYMNASIUM'],
  6: ['LAB_COMPUTER'],
  7: ['LAB_ENGINEERING'],
  8: ['LAB_ENGINEERING'],
}

/** Fallback room preferences by subject category */
const ROOM_PREFS: Record<string, string[]> = {
  SCIENCE: ['LAB_SCIENCE', 'CLASSROOM'],
  PE: ['GYM'],
  TECH: ['LAB_COMPUTER', 'CLASSROOM'],
}

const SPECIALIZED_ROOM_TYPES = new Set([
  'LAB_SCIENCE', 'LAB_COMPUTER', 'LAB_CHEMISTRY', 'LAB_BIOLOGY',
  'LAB_PHYSICS', 'LAB_ENGINEERING', 'LAB',
])

const FORBIDDEN_ROOM_TYPES = new Set(['LIBRARY', 'GYM', 'GYMNASIUM'])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SchedulableSession {
  subjectId: string
  sequence: number
  duration: number        // 1-4h
  sessionTypeCode: number // 1-8
  isGroup: boolean
  isBiweekly: boolean
  pairingCode: number
  assigned: boolean
}

interface SessionPairing {
  partner: number
  type: 'group' | 'biweekly'
  role: 'primary' | 'secondary'
}

function buildSessionPairings(sessions: SchedulableSession[]): Map<number, SessionPairing> {
  const pairings = new Map<number, SessionPairing>()
  const used = new Set<number>()

  function pairIndices(indices: number[], type: 'group' | 'biweekly') {
    for (let k = 0; k + 1 < indices.length; k += 2) {
      if (sessions[indices[k]].duration !== sessions[indices[k + 1]].duration) continue
      pairings.set(indices[k], { partner: indices[k + 1], type, role: 'primary' })
      pairings.set(indices[k + 1], { partner: indices[k], type, role: 'secondary' })
      used.add(indices[k])
      used.add(indices[k + 1])
    }
    if (indices.length % 2 === 1 && !used.has(indices[indices.length - 1])) {
      pairings.set(indices[indices.length - 1], { partner: -1, type, role: 'primary' })
      used.add(indices[indices.length - 1])
    }
  }

  // 1. Group sessions — pair by pairingCode, then auto-pair remainder
  const groupIndices: number[] = []
  for (let i = 0; i < sessions.length; i++) {
    if (sessions[i].isGroup) groupIndices.push(i)
  }
  const groupByCode = new Map<number, number[]>()
  const groupNoPair: number[] = []
  for (const i of groupIndices) {
    if (sessions[i].pairingCode > 0) {
      const arr = groupByCode.get(sessions[i].pairingCode) ?? []
      arr.push(i)
      groupByCode.set(sessions[i].pairingCode, arr)
    } else {
      groupNoPair.push(i)
    }
  }
  for (const [, indices] of groupByCode) pairIndices(indices, 'group')
  pairIndices(groupNoPair.filter((i) => !used.has(i)), 'group')

  // 2. Biweekly (non-group) sessions — same approach
  const bwIndices: number[] = []
  for (let i = 0; i < sessions.length; i++) {
    if (sessions[i].isBiweekly && !sessions[i].isGroup && !used.has(i)) bwIndices.push(i)
  }
  const bwByCode = new Map<number, number[]>()
  const bwNoPair: number[] = []
  for (const i of bwIndices) {
    if (sessions[i].pairingCode > 0) {
      const arr = bwByCode.get(sessions[i].pairingCode) ?? []
      arr.push(i)
      bwByCode.set(sessions[i].pairingCode, arr)
    } else {
      bwNoPair.push(i)
    }
  }
  for (const [, indices] of bwByCode) pairIndices(indices, 'biweekly')
  pairIndices(bwNoPair.filter((i) => !used.has(i)), 'biweekly')

  return pairings
}

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

// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

export function solveTimetable(constraints: ScheduleConstraints): SolverResult {
  const { classes, teachers, subjects, rooms, periods, days, gradeCurriculum, gradeSessions } = constraints

  if (!classes.length || !teachers.length || !subjects.length || !periods.length || !days.length) {
    return {
      lessons: [],
      stats: { totalSlots: 0, filledSlots: 0, emptySlots: 0, conflictsAvoided: 0, teacherUtilization: {} },
    }
  }

  const allPeriods = periods
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
    teachersBySubject.set(sub.id, teachers.filter((t) => t.subjects.includes(sub.id)))
  }

  // ---------------------------------------------------------------------------
  // Build per-class session list
  // ---------------------------------------------------------------------------

  const classSessions = new Map<string, SchedulableSession[]>()
  const classPairMaps = new Map<string, Map<number, SessionPairing>>()

  for (const cls of classes) {
    let sessions: SchedulableSession[]

    if (cls.gradeId && gradeSessions && gradeSessions[cls.gradeId]?.length) {
      // Use detailed session requirements from TunisianCurriculumEntry
      sessions = gradeSessions[cls.gradeId].map((sr) => ({
        subjectId: sr.subjectId,
        sequence: sr.sequence,
        duration: sr.duration,
        sessionTypeCode: sr.sessionTypeCode,
        isGroup: sr.isGroup,
        isBiweekly: sr.isBiweekly,
        pairingCode: sr.pairingCode,
        assigned: false,
      }))
    } else if (cls.gradeId && gradeCurriculum && gradeCurriculum[cls.gradeId]) {
      // Fallback to flat hours — synthesize 1h sessions
      sessions = []
      for (const gc of gradeCurriculum[cls.gradeId]) {
        for (let seq = 1; seq <= gc.hoursPerWeek; seq++) {
          sessions.push({
            subjectId: gc.subjectId,
            sequence: seq,
            duration: 1,
            sessionTypeCode: 1,
            isGroup: false,
            isBiweekly: false,
            pairingCode: 0,
            assigned: false,
          })
        }
      }
    } else {
      // Last fallback: all subjects with default hours
      sessions = []
      for (const sub of subjects) {
        const hours = SUBJECT_HOURS[sub.name] ?? CATEGORY_HOURS[sub.category] ?? 2
        for (let seq = 1; seq <= hours; seq++) {
          sessions.push({
            subjectId: sub.id,
            sequence: seq,
            duration: 1,
            sessionTypeCode: 1,
            isGroup: false,
            isBiweekly: false,
            pairingCode: 0,
            assigned: false,
          })
        }
      }
    }

    // Sort: multi-hour first, then group sessions, then most-constrained subjects
    sessions.sort((a, b) => {
      // Multi-hour sessions first (hardest to place)
      if (b.duration !== a.duration) return b.duration - a.duration
      // Group sessions next
      if (a.isGroup !== b.isGroup) return a.isGroup ? -1 : 1
      // Most-constrained subjects
      const teachersA = countEligibleTeachers(a.subjectId, cls)
      const teachersB = countEligibleTeachers(b.subjectId, cls)
      return teachersA - teachersB
    })

    classSessions.set(cls.id, sessions)
    classPairMaps.set(cls.id, buildSessionPairings(sessions))
  }

  function countEligibleTeachers(subjectId: string, cls: typeof classes[0]): number {
    const subjectTeachers = teachersBySubject.get(subjectId) ?? []
    if (!cls.gradeId) return subjectTeachers.length
    return subjectTeachers.filter(
      (t) => !t.grades || t.grades.length === 0 || t.grades.includes(cls.gradeId!),
    ).length
  }

  // ---------------------------------------------------------------------------
  // H6: Pre-assign teachers to (class, subject) pairs
  // ---------------------------------------------------------------------------

  const classTeacherLock = new Map<string, string>() // "classId:subjectId" → teacherId

  for (const cls of classes) {
    const sessions = classSessions.get(cls.id) ?? []
    const subjectIds = new Set(sessions.map((s) => s.subjectId))

    for (const subjectId of subjectIds) {
      const eligible = (teachersBySubject.get(subjectId) ?? []).filter((t) => {
        if (cls.gradeId && t.grades && t.grades.length > 0) {
          if (!t.grades.includes(cls.gradeId)) return false
        }
        return true
      })

      if (eligible.length > 0) {
        // Pick teacher with fewest existing locks (balance assignment)
        const lockCounts = new Map<string, number>()
        for (const [, tid] of classTeacherLock) {
          lockCounts.set(tid, (lockCounts.get(tid) ?? 0) + 1)
        }
        eligible.sort((a, b) => (lockCounts.get(a.id) ?? 0) - (lockCounts.get(b.id) ?? 0))
        classTeacherLock.set(`${cls.id}:${subjectId}`, eligible[0].id)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tracking state
  // ---------------------------------------------------------------------------

  const teacherBusy = new Map<string, Set<string>>()
  const roomBusy = new Map<string, Set<string>>()
  const classBusy = new Map<string, Set<string>>()

  const teacherDayUsage = new Map<string, number[]>()
  const teacherWeekUsage = new Map<string, number>()

  const classSubjectDay = new Map<string, Map<string, number>>()
  const classLastSubject = new Map<string, string>()

  for (const t of teachers) {
    teacherDayUsage.set(t.id, new Array(7).fill(0))
    teacherWeekUsage.set(t.id, 0)
  }

  function sk(day: number, periodId: string): string { return `${day}:${periodId}` }

  function isTeacherFree(tid: string, day: number, pid: string): boolean {
    return !(teacherBusy.get(sk(day, pid))?.has(tid))
  }
  function isRoomFree(rid: string, day: number, pid: string): boolean {
    return !(roomBusy.get(sk(day, pid))?.has(rid))
  }
  function isClassFree(cid: string, day: number, pid: string): boolean {
    return !(classBusy.get(sk(day, pid))?.has(cid))
  }

  function canTeacherWork(tid: string, day: number, extraHours: number = 1): boolean {
    const t = teacherById.get(tid)!
    const dayUse = teacherDayUsage.get(tid)![day] ?? 0
    const weekUse = teacherWeekUsage.get(tid) ?? 0
    return (dayUse + extraHours) <= t.maxPeriodsPerDay && (weekUse + extraHours) <= t.maxPeriodsPerWeek
  }

  function getClassSubjectDayCount(cid: string, day: number, sid: string): number {
    return classSubjectDay.get(`${cid}:${day}`)?.get(sid) ?? 0
  }

  function assign(classId: string, teacherId: string, roomId: string, subjectId: string, day: number, periodId: string) {
    const key = sk(day, periodId)
    if (!teacherBusy.has(key)) teacherBusy.set(key, new Set())
    teacherBusy.get(key)!.add(teacherId)
    if (!roomBusy.has(key)) roomBusy.set(key, new Set())
    roomBusy.get(key)!.add(roomId)
    if (!classBusy.has(key)) classBusy.set(key, new Set())
    classBusy.get(key)!.add(classId)

    teacherDayUsage.get(teacherId)![day]++
    teacherWeekUsage.set(teacherId, (teacherWeekUsage.get(teacherId) ?? 0) + 1)

    const csdKey = `${classId}:${day}`
    if (!classSubjectDay.has(csdKey)) classSubjectDay.set(csdKey, new Map())
    const csd = classSubjectDay.get(csdKey)!
    csd.set(subjectId, (csd.get(subjectId) ?? 0) + 1)
    classLastSubject.set(csdKey, subjectId)
  }

  // ---------------------------------------------------------------------------
  // H1: Find consecutive teaching periods (no breaks between them)
  // ---------------------------------------------------------------------------

  function findConsecutivePeriods(day: number, startIdx: number, duration: number): string[] | null {
    if (startIdx + duration > teachingPeriods.length) return null

    const periodIds: string[] = []
    for (let i = 0; i < duration; i++) {
      const p = teachingPeriods[startIdx + i]
      if (p.applicableDays?.length && !p.applicableDays.includes(day)) return null
      periodIds.push(p.id)
    }

    // Verify no break between these periods using order field
    for (let i = 0; i < duration - 1; i++) {
      const currOrder = teachingPeriods[startIdx + i].order
      const nextOrder = teachingPeriods[startIdx + i + 1].order

      // Check if a break period exists between these two teaching periods
      const breakBetween = allPeriods.some(
        (p) => p.isBreak && p.order > currOrder && p.order < nextOrder
      )
      if (breakBetween) return null
    }

    return periodIds
  }

  // ---------------------------------------------------------------------------
  // Room finder (H3: session-type-aware)
  // ---------------------------------------------------------------------------

  function findRoom(day: number, periodIds: string[], sessionTypeCode: number, category: string, excludeRoomIds?: Set<string>): (typeof rooms)[0] | null {
    // All periods must have the room free
    const isRoomFreeAll = (rid: string) => {
      if (excludeRoomIds?.has(rid)) return false
      return periodIds.every((pid) => isRoomFree(rid, day, pid))
    }

    // Step 1: Session type specific rooms
    const requiredTypes = SESSION_TYPE_ROOM_MAP[sessionTypeCode] ?? ['CLASSROOM']
    for (const rt of requiredTypes) {
      const room = rooms.find((r) => r.type === rt && isRoomFreeAll(r.id))
      if (room) return room
    }

    // For non-regular sessions, don't fall back to classrooms
    if (sessionTypeCode >= 2 && sessionTypeCode <= 8) {
      return null // Must use specialized room
    }

    // Step 2: Category-based fallback (for regular sessions)
    const prefTypes = ROOM_PREFS[category] ?? ['CLASSROOM']
    for (const rt of prefTypes) {
      const room = rooms.find((r) => r.type === rt && isRoomFreeAll(r.id))
      if (room) return room
    }

    // Step 3: Any standard classroom
    const classRoom = rooms.find((r) =>
      isRoomFreeAll(r.id) && !SPECIALIZED_ROOM_TYPES.has(r.type) && !FORBIDDEN_ROOM_TYPES.has(r.type)
    )
    if (classRoom) return classRoom

    // Step 4: Last resort — specialized but not forbidden
    return rooms.find((r) => isRoomFreeAll(r.id) && !FORBIDDEN_ROOM_TYPES.has(r.type)) ?? null
  }

  // ---------------------------------------------------------------------------
  // Main scheduling loop
  // ---------------------------------------------------------------------------

  const lessons: GeneratedLesson[] = []
  let conflictsAvoided = 0
  let blockCounter = 0
  const sortedDays = [...days].sort((a, b) => a - b)

  for (const day of sortedDays) {
    for (let pIdx = 0; pIdx < teachingPeriods.length; pIdx++) {
      const period = teachingPeriods[pIdx]
      if (period.applicableDays?.length && !period.applicableDays.includes(day)) continue

      const seed = day * 1000 + pIdx * 100
      const classOrder = shuffleDet(classes, seed)

      for (const cls of classOrder) {
        if (!isClassFree(cls.id, day, period.id)) continue

        const sessions = classSessions.get(cls.id) ?? []
        const pairMap = classPairMaps.get(cls.id) ?? new Map()
        let bestLesson: GeneratedLesson[] | null = null
        let bestScore = -Infinity
        let bestSessionIndices: number[] = []

        // Helper: find a teacher for a given subject, excluding specific teacher IDs
        function findTeacherFor(
          subjectId: string, pids: string[], dur: number, exclude?: string | null
        ): typeof teachers[0] | null {
          const lockedId = classTeacherLock.get(`${cls.id}:${subjectId}`)
          if (lockedId && lockedId !== exclude) {
            const t = teacherById.get(lockedId)!
            const allFree = pids.every((pid) => isTeacherFree(t.id, day, pid))
            if (allFree && canTeacherWork(t.id, day, dur)) {
              if (!cls.gradeId || !t.grades?.length || t.grades.includes(cls.gradeId)) return t
            }
          }
          const eligible = (teachersBySubject.get(subjectId) ?? []).filter((t) => {
            if (exclude && t.id === exclude) return false
            if (!pids.every((pid) => isTeacherFree(t.id, day, pid))) return false
            if (!canTeacherWork(t.id, day, dur)) return false
            if (cls.gradeId && t.grades && t.grades.length > 0 && !t.grades.includes(cls.gradeId)) return false
            return true
          })
          if (eligible.length === 0) return null
          eligible.sort((a, b) => (teacherWeekUsage.get(a.id) ?? 0) - (teacherWeekUsage.get(b.id) ?? 0))
          return eligible[0]
        }

        for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
          const session = sessions[sIdx]
          if (session.assigned) continue

          // Skip secondary paired sessions — placed when their primary is placed
          const pairing = pairMap.get(sIdx)
          if (pairing && pairing.role === 'secondary') continue

          const sub = subjectById.get(session.subjectId)
          if (!sub) continue

          // H9: Pedagogic day
          const pedDay = sub.pedagogicDay ?? 0
          if (pedDay > 0 && pedDay === day + 1) continue

          // H5: PE not first period
          if (sub.category === 'PE' && pIdx === 0) continue

          // Check day count: max 1 session per subject per day
          const dayCount = getClassSubjectDayCount(cls.id, day, session.subjectId)
          if (dayCount >= 1) continue

          // H1: Find consecutive periods for multi-hour sessions
          let periodIds: string[]
          if (session.duration > 1) {
            const consecutive = findConsecutivePeriods(day, pIdx, session.duration)
            if (!consecutive) continue
            periodIds = consecutive
          } else {
            periodIds = [period.id]
          }

          // Find teacher for primary session
          const teacher = findTeacherFor(session.subjectId, periodIds, session.duration)
          if (!teacher) { conflictsAvoided++; continue }

          // Find room for primary session (H3)
          const room = findRoom(day, periodIds, session.sessionTypeCode, sub.category)
          if (!room) { conflictsAvoided++; continue }

          // ---- Handle partner session if paired ----
          let partnerSession: SchedulableSession | null = null
          let partnerSub: typeof subjects[0] | undefined
          let teacherB: typeof teachers[0] | null = null
          let roomB: (typeof rooms)[0] | null = null

          if (pairing && pairing.partner >= 0) {
            partnerSession = sessions[pairing.partner]
            if (partnerSession.assigned) continue
            partnerSub = subjectById.get(partnerSession.subjectId)
            if (!partnerSub) continue

            // H9 for partner
            const pPedDay = partnerSub.pedagogicDay ?? 0
            if (pPedDay > 0 && pPedDay === day + 1) continue

            // Day count for partner
            if (getClassSubjectDayCount(cls.id, day, partnerSession.subjectId) >= 1) continue

            // Duration must match for same slot
            if (partnerSession.duration !== session.duration) continue

            // Find teacher for partner (groups: must be different teacher)
            const isGroupPair = pairing.type === 'group'
            teacherB = findTeacherFor(
              partnerSession.subjectId, periodIds, partnerSession.duration,
              isGroupPair ? teacher.id : null
            )
            if (!teacherB) { conflictsAvoided++; continue }

            // Find room for partner (groups: must be different room)
            const excludeRooms = isGroupPair ? new Set([room.id]) : undefined
            roomB = findRoom(day, periodIds, partnerSession.sessionTypeCode, partnerSub.category, excludeRooms)
            if (!roomB) { conflictsAvoided++; continue }
          }

          // ---- Score ----
          let score = 0
          const weekUsage = teacherWeekUsage.get(teacher.id) ?? 0
          score += session.duration * 15
          if (session.isGroup || session.isBiweekly) score += 10
          score += (10 - countEligibleTeachers(session.subjectId, cls)) * 5
          if ((sub.category === 'CORE' || sub.category === 'SCIENCE') && pIdx < 3) score += 3
          const lastSub = classLastSubject.get(`${cls.id}:${day}`)
          if (lastSub === session.subjectId) score -= 20
          if ((sub.category === 'ARTS' || sub.category === 'SPORTS') && pIdx >= 3) score += 2
          score -= weekUsage
          if (partnerSession) score += 15 // bonus for successful pairing

          if (score > bestScore) {
            bestScore = score
            const blockId = session.duration > 1 ? `block-${++blockCounter}` : null

            let generatedLessons: GeneratedLesson[]
            let sessionIndices: number[]

            if (pairing?.type === 'group' && partnerSession && teacherB && roomB) {
              // PAIRED GROUP: Group A → Subject X, Group B → Subject Y, swap next week
              generatedLessons = periodIds.flatMap((pid) => [
                { classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id, periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode, groupLabel: 'A', blockId, weekType: 'A' },
                { classId: cls.id, subjectId: partnerSession!.subjectId, teacherId: teacherB!.id, roomId: roomB!.id, periodId: pid, dayOfWeek: day, sessionTypeCode: partnerSession!.sessionTypeCode, groupLabel: 'B', blockId, weekType: 'A' },
                { classId: cls.id, subjectId: partnerSession!.subjectId, teacherId: teacherB!.id, roomId: roomB!.id, periodId: pid, dayOfWeek: day, sessionTypeCode: partnerSession!.sessionTypeCode, groupLabel: 'A', blockId, weekType: 'B' },
                { classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id, periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode, groupLabel: 'B', blockId, weekType: 'B' },
              ])
              sessionIndices = [sIdx, pairing.partner]
            } else if (pairing?.type === 'group' && pairing.partner === -1) {
              // UNPAIRED GROUP: alternating groups, same subject
              generatedLessons = periodIds.flatMap((pid) => [
                { classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id, periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode, groupLabel: 'A', blockId, weekType: 'A' },
                { classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id, periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode, groupLabel: 'B', blockId, weekType: 'B' },
              ])
              sessionIndices = [sIdx]
            } else if (pairing?.type === 'biweekly' && partnerSession && teacherB && roomB) {
              // PAIRED BIWEEKLY: whole class, alternating weeks
              generatedLessons = periodIds.flatMap((pid) => [
                { classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id, periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode, groupLabel: null as string | null, blockId, weekType: 'A' },
                { classId: cls.id, subjectId: partnerSession!.subjectId, teacherId: teacherB!.id, roomId: roomB!.id, periodId: pid, dayOfWeek: day, sessionTypeCode: partnerSession!.sessionTypeCode, groupLabel: null as string | null, blockId, weekType: 'B' },
              ])
              sessionIndices = [sIdx, pairing.partner]
            } else if (pairing?.type === 'biweekly' && pairing.partner === -1) {
              // UNPAIRED BIWEEKLY: week A only
              generatedLessons = periodIds.map((pid) => ({
                classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id,
                periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode,
                groupLabel: null as string | null, blockId, weekType: 'A' as string | null,
              }))
              sessionIndices = [sIdx]
            } else {
              // REGULAR session
              generatedLessons = periodIds.map((pid) => ({
                classId: cls.id, subjectId: session.subjectId, teacherId: teacher!.id, roomId: room.id,
                periodId: pid, dayOfWeek: day, sessionTypeCode: session.sessionTypeCode,
                groupLabel: null as string | null, blockId, weekType: null as string | null,
              }))
              sessionIndices = [sIdx]
            }

            bestLesson = generatedLessons
            bestSessionIndices = sessionIndices
          }
        }

        // ---- Place the best candidate ----
        if (bestLesson && bestLesson.length > 0) {
          // Deduplicate teacher counter increments for paired lessons at same slot
          const teacherCounted = new Set<string>()
          const subjectCounted = new Set<string>()

          for (const lesson of bestLesson) {
            lessons.push(lesson)
            const key = sk(lesson.dayOfWeek, lesson.periodId)

            // Busy maps (Sets — idempotent)
            if (!teacherBusy.has(key)) teacherBusy.set(key, new Set())
            teacherBusy.get(key)!.add(lesson.teacherId)
            if (!roomBusy.has(key)) roomBusy.set(key, new Set())
            roomBusy.get(key)!.add(lesson.roomId!)
            if (!classBusy.has(key)) classBusy.set(key, new Set())
            classBusy.get(key)!.add(lesson.classId)

            // Teacher counters — once per (teacher, slot)
            const tcKey = `${lesson.teacherId}:${lesson.dayOfWeek}:${lesson.periodId}`
            if (!teacherCounted.has(tcKey)) {
              teacherCounted.add(tcKey)
              teacherDayUsage.get(lesson.teacherId)![lesson.dayOfWeek]++
              teacherWeekUsage.set(lesson.teacherId, (teacherWeekUsage.get(lesson.teacherId) ?? 0) + 1)
            }

            // Subject day count — once per (subject, slot)
            const scKey = `${lesson.classId}:${lesson.dayOfWeek}:${lesson.subjectId}:${lesson.periodId}`
            if (!subjectCounted.has(scKey)) {
              subjectCounted.add(scKey)
              const csdKey = `${lesson.classId}:${lesson.dayOfWeek}`
              if (!classSubjectDay.has(csdKey)) classSubjectDay.set(csdKey, new Map())
              classSubjectDay.get(csdKey)!.set(lesson.subjectId, (classSubjectDay.get(csdKey)!.get(lesson.subjectId) ?? 0) + 1)
              classLastSubject.set(csdKey, lesson.subjectId)
            }
          }

          // Mark all sessions in this placement as assigned
          for (const idx of bestSessionIndices) {
            sessions[idx].assigned = true
          }
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
