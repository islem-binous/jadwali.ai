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
    // Teacher double-booked
    const byTeacher = groupBy(slotLessons, (l) => l.teacherId)
    for (const [, tLessons] of Object.entries(byTeacher)) {
      if (tLessons.length > 1) {
        conflicts.push({
          type: 'TEACHER_DOUBLE_BOOKED',
          lessonIds: tLessons.map((l) => l.id),
          description: `Teacher double-booked at slot ${slot}`,
          severity: 'ERROR',
        })
      }
    }
    // Room double-booked
    const byRoom = groupBy(
      slotLessons.filter((l) => l.roomId),
      (l) => l.roomId!,
    )
    for (const [, rLessons] of Object.entries(byRoom)) {
      if (rLessons.length > 1) {
        conflicts.push({
          type: 'ROOM_DOUBLE_BOOKED',
          lessonIds: rLessons.map((l) => l.id),
          description: `Room double-booked at slot ${slot}`,
          severity: 'ERROR',
        })
      }
    }
    // Class double-booked
    const byClass = groupBy(slotLessons, (l) => l.classId)
    for (const [, cLessons] of Object.entries(byClass)) {
      if (cLessons.length > 1) {
        conflicts.push({
          type: 'CLASS_DOUBLE_BOOKED',
          lessonIds: cLessons.map((l) => l.id),
          description: `Class double-booked at slot ${slot}`,
          severity: 'ERROR',
        })
      }
    }
  }

  // Teacher daily max
  const byTeacherDay = groupBy(lessons, (l) => `${l.teacherId}-${l.dayOfWeek}`)
  for (const [, tLessons] of Object.entries(byTeacherDay)) {
    const maxDaily = tLessons[0].teacher?.maxPeriodsPerDay ?? 6
    if (tLessons.length > maxDaily) {
      conflicts.push({
        type: 'TEACHER_MAX_DAILY',
        lessonIds: tLessons.map((l) => l.id),
        description: `Teacher exceeds daily max (${tLessons.length}/${maxDaily})`,
        severity: 'WARNING',
      })
    }
  }

  // Teacher weekly max
  const byTeacherWeek = groupBy(lessons, (l) => l.teacherId)
  for (const [, tLessons] of Object.entries(byTeacherWeek)) {
    const maxWeekly = tLessons[0].teacher?.maxPeriodsPerWeek ?? 24
    if (tLessons.length > maxWeekly) {
      conflicts.push({
        type: 'TEACHER_MAX_WEEKLY',
        lessonIds: tLessons.map((l) => l.id),
        description: `Teacher exceeds weekly max (${tLessons.length}/${maxWeekly})`,
        severity: 'WARNING',
      })
    }
  }

  return conflicts
}
