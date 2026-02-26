export const SCHEDULE_SYSTEM_PROMPT = `
You are Jadwali's intelligent timetable scheduling engine for Tunisian secondary schools.
Your task is to generate lesson assignments for a school timetable following Tunisian education rules.

## OUTPUT FORMAT
Return a JSON object with a "lessons" key containing an array.
Each lesson object must have these exact fields:
{
  "lessons": [
    {
      "classId": "exact_class_id_from_data",
      "subjectId": "exact_subject_id_from_data",
      "teacherId": "exact_teacher_id_from_data",
      "roomId": "exact_room_id_from_data_or_null",
      "periodId": "exact_period_id_from_data",
      "dayOfWeek": 0
    }
  ]
}

## HARD CONSTRAINTS (never violate):
1. A teacher cannot be in two places at the same time
2. A class cannot have two lessons at the same time
3. A room cannot host two classes at the same time
4. A teacher can only teach subjects they are assigned to
5. Do not exceed a teacher's maxPeriodsPerDay (default 4h/day) or maxPeriodsPerWeek (default 18h/week; 15h/week for teachers with 25+ years seniority)
6. Use ONLY the exact IDs provided in the school data below
7. Do not schedule lessons during break periods
8. Do not conflict with any ALREADY SCHEDULED lessons listed below
9. PEDAGOGIC DAY: If a subject has pedagogicDay > 0, it MUST NOT be scheduled on that day (1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)
10. ROOM PROTECTION: Specialized rooms (labs, computer rooms) are RESERVED for matching session types only. Do NOT assign regular classes to specialized rooms unless ALL classrooms are full and the lab is empty.
11. LIBRARY/GYM ABSOLUTE: NEVER use library or gymnasium for any subject other than their intended purpose (gym → PE only, library → study only). No exceptions.

## SOFT CONSTRAINTS (optimize for, in priority order):
1. Balance teacher workload across the week
2. Heavy subjects (Math ≥5h, Physics, Arabic) should be in MORNING periods (periods 1-4)
3. PE and Arts should not be first period; prefer AFTERNOON
4. Same subject should not appear twice consecutively for a class
5. Spread sessions of the same subject across DIFFERENT days
6. Teachers prefer not to have isolated free periods ("holes")
7. Each day should have a balanced mix of heavy and light subjects
8. Respect room capacity vs class size

Return ONLY the JSON object. No explanations or text outside the JSON.
`

export interface GeneratedLesson {
  classId: string
  subjectId: string
  teacherId: string
  roomId: string | null
  periodId: string
  dayOfWeek: number
}

export interface ScheduleConstraints {
  classes: { id: string; name: string; capacity: number; gradeId?: string | null }[]
  teachers: {
    id: string
    name: string
    maxPeriodsPerDay: number
    maxPeriodsPerWeek: number
    subjects: string[]
    grades?: string[] // grade IDs this teacher can teach
  }[]
  subjects: { id: string; name: string; category: string; pedagogicDay?: number }[]
  rooms: { id: string; name: string; type: string; capacity: number }[]
  periods: { id: string; name: string; order: number; isBreak: boolean; applicableDays?: number[] }[]
  days: number[]
  /** Per-grade curriculum: gradeId → [{ subjectId, hoursPerWeek }] */
  gradeCurriculum?: Record<string, { subjectId: string; hoursPerWeek: number }[]>
}

export function buildConstraintPrompt(constraints: ScheduleConstraints): string {
  return `
## SCHOOL DATA:
Classes (${constraints.classes.length}): ${JSON.stringify(constraints.classes)}
Teachers (${constraints.teachers.length}): ${JSON.stringify(constraints.teachers)}
Subjects (${constraints.subjects.length}): ${JSON.stringify(constraints.subjects)}
Rooms (${constraints.rooms.length}): ${JSON.stringify(constraints.rooms)}
Periods (${constraints.periods.filter((p) => !p.isBreak).length} teaching periods): ${JSON.stringify(constraints.periods.filter((p) => !p.isBreak))}
Days: ${JSON.stringify(constraints.days)} (0=Monday...5=Saturday)

Generate a complete timetable assigning all classes their required lessons.
Each class needs approximately ${constraints.periods.filter((p) => !p.isBreak).length} lessons per day across ${constraints.days.length} days.
`
}

export function buildBatchPrompt(
  constraints: ScheduleConstraints,
  batchClasses: ScheduleConstraints['classes'],
  alreadyScheduled: GeneratedLesson[]
): string {
  const teachingPeriods = constraints.periods.filter((p) => !p.isBreak)

  let prompt = `
## SCHOOL DATA:
ALL Teachers (${constraints.teachers.length}): ${JSON.stringify(constraints.teachers)}
ALL Subjects (${constraints.subjects.length}): ${JSON.stringify(constraints.subjects)}
ALL Rooms (${constraints.rooms.length}): ${JSON.stringify(constraints.rooms)}
Teaching Periods (${teachingPeriods.length}): ${JSON.stringify(teachingPeriods)}
School Days: ${JSON.stringify(constraints.days)} (0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday)

## CLASSES TO SCHEDULE IN THIS BATCH (${batchClasses.length}):
${JSON.stringify(batchClasses)}

Each class needs exactly 1 lesson per teaching period per school day.
Per class: ${teachingPeriods.length} periods × ${constraints.days.length} days = ${teachingPeriods.length * constraints.days.length} lessons.
Total lessons for this batch: ${batchClasses.length} × ${teachingPeriods.length * constraints.days.length} = ${batchClasses.length * teachingPeriods.length * constraints.days.length}.
Generate ALL lessons — do not skip any time slots.
`

  if (alreadyScheduled.length > 0) {
    prompt += `
## ALREADY SCHEDULED LESSONS (DO NOT CONFLICT WITH THESE):
These teachers and rooms are already occupied at these times:
${JSON.stringify(
  alreadyScheduled.map((l) => ({
    teacherId: l.teacherId,
    roomId: l.roomId,
    periodId: l.periodId,
    dayOfWeek: l.dayOfWeek,
  }))
)}

You MUST NOT assign any teacher or room to a slot where they are already scheduled above.
`
  }

  return prompt
}

export function parseAIResponse(text: string): GeneratedLesson[] {
  let cleaned = text.trim()

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  // Try to parse as JSON object with "lessons" key
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed.lessons)) return parsed.lessons
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Try to extract JSON from the text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch {
        // Fall through
      }
    }
    const objectMatch = cleaned.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0])
        if (Array.isArray(parsed.lessons)) return parsed.lessons
      } catch {
        // Fall through
      }
    }
  }

  return []
}

export function validateLessons(
  lessons: GeneratedLesson[],
  constraints: ScheduleConstraints
): { valid: GeneratedLesson[]; skipped: number } {
  const classIds = new Set(constraints.classes.map((c) => c.id))
  const subjectIds = new Set(constraints.subjects.map((s) => s.id))
  const teacherIds = new Set(constraints.teachers.map((t) => t.id))
  const roomIds = new Set(constraints.rooms.map((r) => r.id))
  const periodIds = new Set(constraints.periods.filter((p) => !p.isBreak).map((p) => p.id))
  const validDays = new Set(constraints.days)

  const valid: GeneratedLesson[] = []
  let skipped = 0

  for (const lesson of lessons) {
    if (
      classIds.has(lesson.classId) &&
      subjectIds.has(lesson.subjectId) &&
      teacherIds.has(lesson.teacherId) &&
      (lesson.roomId === null || roomIds.has(lesson.roomId)) &&
      periodIds.has(lesson.periodId) &&
      validDays.has(lesson.dayOfWeek)
    ) {
      valid.push(lesson)
    } else {
      skipped++
    }
  }

  return { valid, skipped }
}
