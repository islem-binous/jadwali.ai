export type ConflictType =
  | 'TEACHER_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | 'CLASS_DOUBLE_BOOKED'
  | 'TEACHER_UNAVAILABLE'
  | 'TEACHER_MAX_DAILY'
  | 'TEACHER_MAX_WEEKLY'

export interface Conflict {
  type: ConflictType
  lessonIds: string[]
  description: string
  severity: 'ERROR' | 'WARNING'
}

interface LessonForConflict {
  id: string
  teacherId: string
  roomId: string | null
  classId: string
  periodId: string
  dayOfWeek: number
  groupLabel?: string | null
  weekType?: string | null
  teacher?: { name: string; maxPeriodsPerDay: number; maxPeriodsPerWeek: number }
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    ;(acc[key] ||= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function detectConflicts(lessons: LessonForConflict[]): Conflict[] {
  const conflicts: Conflict[] = []

  // Group by timeslot
  const bySlot = groupBy(lessons, (l) => `${l.dayOfWeek}-${l.periodId}`)

  for (const [slot, slotLessons] of Object.entries(bySlot)) {
    // Teacher double-booked — only within same weekType (different weekTypes alternate, no overlap)
    const byTeacher = groupBy(slotLessons, (l) => l.teacherId)
    for (const [, tLessons] of Object.entries(byTeacher)) {
      if (tLessons.length <= 1) continue
      const byWeek = groupBy(tLessons, (l) => l.weekType ?? '__none__')
      for (const [, weekLessons] of Object.entries(byWeek)) {
        if (weekLessons.length > 1) {
          conflicts.push({
            type: 'TEACHER_DOUBLE_BOOKED',
            lessonIds: weekLessons.map((l) => l.id),
            description: `Teacher double-booked at slot ${slot}`,
            severity: 'ERROR',
          })
        }
      }
    }

    // Room double-booked — only within same weekType
    const byRoom = groupBy(
      slotLessons.filter((l) => l.roomId),
      (l) => l.roomId!,
    )
    for (const [, rLessons] of Object.entries(byRoom)) {
      if (rLessons.length <= 1) continue
      const byWeek = groupBy(rLessons, (l) => l.weekType ?? '__none__')
      for (const [, weekLessons] of Object.entries(byWeek)) {
        if (weekLessons.length > 1) {
          conflicts.push({
            type: 'ROOM_DOUBLE_BOOKED',
            lessonIds: weekLessons.map((l) => l.id),
            description: `Room double-booked at slot ${slot}`,
            severity: 'ERROR',
          })
        }
      }
    }

    // Class double-booked — only if same (weekType, groupLabel) pair
    // Group sessions legitimately have GroupA + GroupB at same slot.
    // Biweekly sessions legitimately have WeekA + WeekB at same slot.
    // Paired group+biweekly can have up to 4 lessons: (A/A, B/A, A/B, B/B) — all OK.
    const byClass = groupBy(slotLessons, (l) => l.classId)
    for (const [, cLessons] of Object.entries(byClass)) {
      if (cLessons.length <= 1) continue
      const byWeek = groupBy(cLessons, (l) => l.weekType ?? '__none__')
      for (const [, weekLessons] of Object.entries(byWeek)) {
        if (weekLessons.length <= 1) continue
        const byGroup = groupBy(weekLessons, (l) => l.groupLabel ?? '__none__')
        for (const [, groupLessons] of Object.entries(byGroup)) {
          if (groupLessons.length > 1) {
            conflicts.push({
              type: 'CLASS_DOUBLE_BOOKED',
              lessonIds: groupLessons.map((l) => l.id),
              description: `Class double-booked at slot ${slot}`,
              severity: 'ERROR',
            })
          }
        }
      }
    }
  }

  // Teacher daily max — count unique physical slots (not raw lesson records)
  // A teacher at the same period with WeekA + WeekB lessons occupies 1 real slot
  const byTeacherDay = groupBy(lessons, (l) => `${l.teacherId}-${l.dayOfWeek}`)
  for (const [, tLessons] of Object.entries(byTeacherDay)) {
    const maxDaily = tLessons[0].teacher?.maxPeriodsPerDay ?? 6
    const uniqueSlots = new Set(tLessons.map((l) => l.periodId))
    if (uniqueSlots.size > maxDaily) {
      conflicts.push({
        type: 'TEACHER_MAX_DAILY',
        lessonIds: tLessons.map((l) => l.id),
        description: `Teacher exceeds daily max (${uniqueSlots.size}/${maxDaily})`,
        severity: 'WARNING',
      })
    }
  }

  // Teacher weekly max — count unique (day, period) physical slots
  const byTeacherWeek = groupBy(lessons, (l) => l.teacherId)
  for (const [, tLessons] of Object.entries(byTeacherWeek)) {
    const maxWeekly = tLessons[0].teacher?.maxPeriodsPerWeek ?? 24
    const uniqueSlots = new Set(tLessons.map((l) => `${l.dayOfWeek}-${l.periodId}`))
    if (uniqueSlots.size > maxWeekly) {
      conflicts.push({
        type: 'TEACHER_MAX_WEEKLY',
        lessonIds: tLessons.map((l) => l.id),
        description: `Teacher exceeds weekly max (${uniqueSlots.size}/${maxWeekly})`,
        severity: 'WARNING',
      })
    }
  }

  return conflicts
}
