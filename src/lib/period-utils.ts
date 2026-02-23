/**
 * Check if a period is active on a given day of week.
 * applicableDays is a JSON string like "[0,1,2]". Empty array or missing = all days.
 */
export function isPeriodActiveOnDay(
  applicableDays: string | undefined | null,
  day: number,
): boolean {
  if (!applicableDays) return true
  try {
    const days: number[] = JSON.parse(applicableDays)
    if (!Array.isArray(days) || days.length === 0) return true
    return days.includes(day)
  } catch {
    return true
  }
}

/**
 * Parse applicableDays string to number array.
 * Returns empty array (meaning "all days") if not set or invalid.
 */
export function parseApplicableDays(
  applicableDays: string | undefined | null,
): number[] {
  if (!applicableDays) return []
  try {
    const days = JSON.parse(applicableDays)
    return Array.isArray(days) ? days : []
  } catch {
    return []
  }
}
