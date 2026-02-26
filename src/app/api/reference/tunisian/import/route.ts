import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

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

      return NextResponse.json({ created, skipped })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err) {
    console.error('[Reference Import]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
