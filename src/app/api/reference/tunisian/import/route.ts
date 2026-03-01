import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireSchoolAccess } from '@/lib/auth/require-auth'

// ── Subject category mapping ───────────────────────────────
const LANGUAGE_CODES = new Set([
  'عربية', 'فرنسية', 'انقليزية', 'الإيطالية', 'الروسية', 'الصينية',
])
const SCIENCE_CODES = new Set([
  'ع.فيزيائية', 'ع.الح.و.الأرض', 'ع.بيولوجية', 'ع.الحياة اختيا',
  'إعلامية', 'البرمجة', 'الخوارزميات', 'ق,البيانات',
  'الأنظمة والشبك', 'تك.المعلومات',
])
const SPORTS_CODES = new Set(['ت.بدنية', 'إخ.رياضي'])
const ARTS_CODES = new Set(['ت.مسرحية', 'ت.تشكيلية', 'ت.موسيقية'])
const ENGINEERING_CODES = new Set(['ه.آلية', 'ه.كهربائية'])

// ── Default weekly hours by category (Tunisian curriculum averages) ──
const DEFAULT_HOURS_BY_CATEGORY: Record<string, number> = {
  CORE: 4,      // Arabic, Math, History-Geo
  LANGUAGE: 3,  // French, English, etc.
  SCIENCE: 3,   // Physics, Biology, Computer Science
  SPORTS: 2,    // PE
  ARTS: 1,      // Music, Theatre, Visual Arts
  OTHER: 2,     // Engineering, etc.
}

// ── Specific subject hours (overrides category defaults) ──
const SUBJECT_HOURS_BY_CODE: Record<string, number> = {
  'عربية': 5,        // Arabic
  'رياضيات': 5,      // Mathematics
  'فرنسية': 4,       // French
  'انقليزية': 3,     // English
  'ع.فيزيائية': 3,   // Physics
  'ع.الح.و.الأرض': 3, // Life Sciences
  'التا و الجغ': 2,  // History & Geography
  'ت.إسلامية': 1,    // Islamic Education
  'ت.مدنية': 1,      // Civic Education
  'ت.تكنولوجية': 3,  // Technology
  'إعلامية': 2,      // Computer Science
  'ت.بدنية': 2,      // PE
  'ت.مسرحية': 1,     // Theatre
  'ت.تشكيلية': 1,    // Visual Arts
  'ت.موسيقية': 1,    // Music
  'الفلسفة': 2,      // Philosophy
}

function mapCategory(code: string): string {
  if (LANGUAGE_CODES.has(code)) return 'LANGUAGE'
  if (SCIENCE_CODES.has(code)) return 'SCIENCE'
  if (SPORTS_CODES.has(code)) return 'SPORTS'
  if (ARTS_CODES.has(code)) return 'ARTS'
  if (ENGINEERING_CODES.has(code)) return 'OTHER'
  return 'CORE'
}

const CATEGORY_COLORS: Record<string, string> = {
  CORE: '#4f6ef7',
  LANGUAGE: '#a855f7',
  SCIENCE: '#22c55e',
  SPORTS: '#f59e0b',
  ARTS: '#ec4899',
  OTHER: '#6b7280',
}

// ── Import handler ─────────────────────────────────────────
interface GradeItem {
  code: string
  nameAr: string
  nameFr?: string | null
  nameEn?: string | null
}

interface SubjectItem {
  code: string
  nameAr: string
  nameFr?: string | null
  nameEn?: string | null
  sessionTypeCode: number
  pedagogicDay?: number
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { type, schoolId, items } = body as {
      type: 'grades' | 'subjects'
      schoolId: string
      items: GradeItem[] | SubjectItem[]
    }

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !type || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'grades') {
      const existing = await prisma.grade.findMany({
        where: { schoolId },
        select: { nameAr: true, name: true },
      })
      const existingNames = new Set([
        ...existing.map((g: { nameAr: string | null }) => g.nameAr?.toLowerCase()),
        ...existing.map((g: { name: string }) => g.name.toLowerCase()),
      ])

      const startLevel = existing.length + 1
      let created = 0
      let skipped = 0

      for (const [index, item] of (items as GradeItem[]).entries()) {
        if (existingNames.has(item.nameAr.toLowerCase())) {
          skipped++
          continue
        }
        await prisma.grade.create({
          data: {
            schoolId,
            name: item.nameFr || item.nameAr,
            nameAr: item.nameAr,
            nameFr: item.nameFr || null,
            level: startLevel + created,
          },
        })
        created++
      }

      return NextResponse.json({ created, skipped })
    }

    if (type === 'subjects') {
      const existing = await prisma.subject.findMany({
        where: { schoolId },
        select: { nameAr: true, name: true },
      })
      const existingNames = new Set([
        ...existing.map((s: { nameAr: string | null }) => s.nameAr?.toLowerCase()),
        ...existing.map((s: { name: string }) => s.name.toLowerCase()),
      ])

      let created = 0
      let skipped = 0

      for (const item of items as SubjectItem[]) {
        if (existingNames.has(item.nameAr.toLowerCase())) {
          skipped++
          continue
        }
        const category = mapCategory(item.code)
        const colorHex = CATEGORY_COLORS[category] || '#4f6ef7'

        await prisma.subject.create({
          data: {
            schoolId,
            name: item.nameFr || item.nameAr,
            nameAr: item.nameAr,
            nameFr: item.nameFr || null,
            colorHex,
            category,
            pedagogicDay: item.pedagogicDay ?? 0,
          },
        })
        created++
      }

      // Auto-populate GradeCurriculum: link imported subjects to existing grades
      const schoolGrades = await prisma.grade.findMany({
        where: { schoolId },
        select: { id: true },
      })
      const allSubjects = await prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, nameAr: true, category: true },
      })

      let curriculumCreated = 0
      if (schoolGrades.length > 0 && allSubjects.length > 0) {
        for (const grade of schoolGrades) {
          for (const sub of allSubjects) {
            const code = sub.nameAr || ''
            const hoursPerWeek = SUBJECT_HOURS_BY_CODE[code]
              ?? DEFAULT_HOURS_BY_CATEGORY[sub.category || 'CORE']
              ?? 2

            // Upsert: skip if already exists
            const existing = await prisma.gradeCurriculum.findFirst({
              where: { gradeId: grade.id, subjectId: sub.id },
            })
            if (!existing) {
              await prisma.gradeCurriculum.create({
                data: { gradeId: grade.id, subjectId: sub.id, hoursPerWeek },
              })
              curriculumCreated++
            }
          }
        }
      }

      return NextResponse.json({ created, skipped, curriculumCreated })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err) {
    console.error('[Reference Import]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
