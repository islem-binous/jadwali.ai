export interface SubstituteMatch {
  teacherId: string
  teacherName: string
  teacherColor: string
  primarySubject: string
  matchScore: number
  reasons: string[]
  warnings: string[]
  availableSlots: number
  totalSlots: number
}

interface TeacherCandidate {
  id: string
  name: string
  colorHex: string
  excludeFromCover: boolean
  maxPeriodsPerWeek: number
  subjects: { subjectId: string; subject: { name: string }; isPrimary: boolean }[]
}

interface LessonSlot {
  dayOfWeek: number
  periodId: string
  subjectId: string
}

export function findSubstitutes(
  absentTeacherId: string,
  affectedSlots: LessonSlot[],
  candidates: TeacherCandidate[],
  existingLessons: { teacherId: string; dayOfWeek: number; periodId: string }[],
): SubstituteMatch[] {
  const matches: SubstituteMatch[] = []
  const neededSubjectIds = [...new Set(affectedSlots.map((s) => s.subjectId))]
  const neededSlotKeys = affectedSlots.map((s) => `${s.dayOfWeek}-${s.periodId}`)

  for (const candidate of candidates) {
    if (candidate.id === absentTeacherId) continue
    if (candidate.excludeFromCover) continue

    let score = 0
    const reasons: string[] = []
    const warnings: string[] = []

    // 1. Subject match (40 pts)
    const candidateSubjectIds = candidate.subjects.map((s) => s.subjectId)
    const overlap = neededSubjectIds.filter((id) => candidateSubjectIds.includes(id))
    if (overlap.length === neededSubjectIds.length) {
      score += 40
      reasons.push('Qualified for all subjects')
    } else if (overlap.length > 0) {
      score += 20
      warnings.push('Partially qualified')
    } else {
      warnings.push('Different subject area')
    }

    // 2. Availability (30 pts)
    const busySlots = existingLessons
      .filter((l) => l.teacherId === candidate.id)
      .map((l) => `${l.dayOfWeek}-${l.periodId}`)
    const freeSlots = neededSlotKeys.filter((s) => !busySlots.includes(s))
    const availRatio = freeSlots.length / neededSlotKeys.length
    score += Math.round(availRatio * 30)
    if (availRatio === 1) reasons.push('Available for all periods')
    else if (availRatio > 0)
      reasons.push(`Available for ${freeSlots.length}/${neededSlotKeys.length} periods`)
    else warnings.push('Not available for any period')

    // 3. Workload headroom (20 pts)
    const currentWeekly = existingLessons.filter((l) => l.teacherId === candidate.id).length
    const headroom = candidate.maxPeriodsPerWeek - currentWeekly
    if (headroom >= neededSlotKeys.length) {
      score += 20
      reasons.push('Within workload limits')
    } else if (headroom > 0) {
      score += 10
      warnings.push(`Near workload limit (${currentWeekly}/${candidate.maxPeriodsPerWeek})`)
    } else {
      warnings.push('At maximum workload')
    }

    // 4. Bonus: if candidate has it as primary subject (+10)
    const hasPrimary = candidate.subjects.some(
      (s) => neededSubjectIds.includes(s.subjectId) && s.isPrimary,
    )
    if (hasPrimary) {
      score += 10
      reasons.push('Primary subject match')
    }

    if (score > 30) {
      const primarySub = candidate.subjects.find((s) => s.isPrimary)
      matches.push({
        teacherId: candidate.id,
        teacherName: candidate.name,
        teacherColor: candidate.colorHex,
        primarySubject: primarySub?.subject.name ?? '',
        matchScore: Math.min(score, 100),
        reasons,
        warnings,
        availableSlots: freeSlots.length,
        totalSlots: neededSlotKeys.length,
      })
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)
}
