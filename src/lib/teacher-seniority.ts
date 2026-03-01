/**
 * Tunisian teacher seniority rule:
 * Teachers with 25+ years of service → max 15h/week (instead of default 18h).
 * Always uses the stricter of: seniority limit or manual override.
 */

const SENIORITY_THRESHOLD_YEARS = 25
const SENIOR_MAX_WEEKLY = 15
const DEFAULT_MAX_DAILY = 4

export function getEffectiveMaxWeekly(teacher: {
  maxPeriodsPerWeek: number
  recruitmentDate?: Date | string | null
}): number {
  if (!teacher.recruitmentDate) return teacher.maxPeriodsPerWeek

  const recruitDate = new Date(teacher.recruitmentDate)
  const now = new Date()
  const yearsOfService = now.getFullYear() - recruitDate.getFullYear()

  if (yearsOfService >= SENIORITY_THRESHOLD_YEARS) {
    return Math.min(SENIOR_MAX_WEEKLY, teacher.maxPeriodsPerWeek)
  }

  return teacher.maxPeriodsPerWeek
}

export function getEffectiveMaxDaily(teacher: {
  maxPeriodsPerDay: number
}): number {
  // H8: No teacher > 4h in a single day, no exceptions
  return Math.min(teacher.maxPeriodsPerDay, DEFAULT_MAX_DAILY)
}
