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
        select: { id: true, nameAr: true, nameFr: true, name: true },
      })

      const startLevel = existing.length + 1
      let gradesCreated = 0
      let gradesSkipped = 0
      let gradesUpdated = 0

      // Track all grade codes that were imported (for curriculum lookup)
      const importedGradeCodes: string[] = []

      for (const item of (items as GradeItem[])) {
        importedGradeCodes.push(item.code)

        // Check if grade already exists by nameAr, nameFr, or name
        const match = existing.find(
          (g) =>
            (g.nameAr && g.nameAr.toLowerCase() === item.nameAr.toLowerCase()) ||
            (g.name && g.name.toLowerCase() === (item.nameFr || item.nameAr).toLowerCase()) ||
            (g.nameFr && item.nameFr && g.nameFr.toLowerCase() === item.nameFr.toLowerCase()),
        )

        if (match) {
          // Update nameAr/nameFr if missing on existing grade
          if (!match.nameAr || !match.nameFr) {
            await prisma.grade.update({
              where: { id: match.id },
              data: {
                nameAr: match.nameAr || item.nameAr,
                nameFr: match.nameFr || item.nameFr || null,
              },
            })
            gradesUpdated++
          }
          gradesSkipped++
          continue
        }

        await prisma.grade.create({
          data: {
            schoolId,
            name: item.nameFr || item.nameAr,
            nameAr: item.nameAr,
            nameFr: item.nameFr || null,
            level: startLevel + gradesCreated,
          },
        })
        gradesCreated++
      }

      // ── Auto-import subjects + curriculum from TunisianCurriculumEntry ──
      let subjectsCreated = 0
      let subjectsSkipped = 0
      let curriculumCreated = 0
      let sessionsCreated = 0

      // Fetch reference data
      let tunisianEntries: {
        gradeLevelCode: string
        subjectCode: string
        sequence: number
        volumeHoraire: number
        parGroupe: boolean
        parQuinzaine: boolean
        codeTypeCours: number
        codeAss: number
      }[] = []
      let tunisianSubjects: { code: string; nameAr: string; nameFr: string | null; sessionTypeCode: number; pedagogicDay: number }[] = []

      try {
        ;[tunisianEntries, tunisianSubjects] = await Promise.all([
          prisma.tunisianCurriculumEntry.findMany({
            where: { gradeLevelCode: { in: importedGradeCodes } },
          }),
          prisma.tunisianSubject.findMany({
            select: { code: true, nameAr: true, nameFr: true, sessionTypeCode: true, pedagogicDay: true },
          }),
        ])
      } catch {
        // Tables may not exist yet (D1 migration pending)
      }

      if (tunisianEntries.length > 0) {
        // Find unique subject codes needed by the imported grades
        const neededSubjectCodes = new Set(tunisianEntries.map(e => e.subjectCode))
        const tunisianSubjectMap = new Map(tunisianSubjects.map(s => [s.code, s]))

        // Create Subject records for each needed subject
        const existingSubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, nameAr: true, nameFr: true, name: true },
        })

        for (const code of neededSubjectCodes) {
          const tunSub = tunisianSubjectMap.get(code)
          if (!tunSub) continue

          // Check if subject already exists
          const match = existingSubjects.find(
            (s) =>
              (s.nameAr && s.nameAr.toLowerCase() === tunSub.nameAr.toLowerCase()) ||
              (s.name && s.name.toLowerCase() === (tunSub.nameFr || tunSub.nameAr).toLowerCase()) ||
              (s.nameFr && tunSub.nameFr && s.nameFr.toLowerCase() === tunSub.nameFr.toLowerCase()),
          )

          if (match) {
            // Update nameAr/nameFr if missing
            if (!match.nameAr || !match.nameFr) {
              await prisma.subject.update({
                where: { id: match.id },
                data: {
                  nameAr: match.nameAr || tunSub.nameAr,
                  nameFr: match.nameFr || tunSub.nameFr || null,
                },
              })
            }
            subjectsSkipped++
            continue
          }

          const category = mapCategory(code)
          const colorHex = CATEGORY_COLORS[category] || '#4f6ef7'

          await prisma.subject.create({
            data: {
              schoolId,
              name: tunSub.nameFr || tunSub.nameAr,
              nameAr: tunSub.nameAr,
              nameFr: tunSub.nameFr || null,
              colorHex,
              category,
              pedagogicDay: tunSub.pedagogicDay ?? 0,
            },
          })
          subjectsCreated++
        }

        // Reload school grades and subjects for curriculum creation
        const schoolGrades = await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, nameAr: true, name: true },
        })
        const allSubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, nameAr: true, category: true, name: true },
        })
        const tunisianGradeLevels = await prisma.tunisianGradeLevel.findMany({
          select: { code: true, nameAr: true, nameFr: true },
        })

        // Build lookup maps
        const gradeNameToCode = new Map<string, string>()
        for (const g of tunisianGradeLevels) {
          gradeNameToCode.set(g.nameAr, g.code)
          if (g.nameFr) gradeNameToCode.set(g.nameFr, g.code)
        }
        const subjectNameToCode = new Map<string, string>()
        for (const s of tunisianSubjects) {
          subjectNameToCode.set(s.nameAr, s.code)
          if (s.nameFr) subjectNameToCode.set(s.nameFr, s.code)
        }

        // Group entries by gradeCode:subjectCode
        const entryMap = new Map<string, typeof tunisianEntries>()
        for (const e of tunisianEntries) {
          const key = `${e.gradeLevelCode}:${e.subjectCode}`
          if (!entryMap.has(key)) entryMap.set(key, [])
          entryMap.get(key)!.push(e)
        }

        // Create GradeCurriculum + CurriculumSession
        for (const grade of schoolGrades) {
          const gradeCode = gradeNameToCode.get(grade.nameAr || '')
            || gradeNameToCode.get(grade.name || '')
          if (!gradeCode) continue

          for (const sub of allSubjects) {
            const subjectCode = subjectNameToCode.get(sub.nameAr || '')
              || subjectNameToCode.get(sub.name || '')
            if (!subjectCode) continue

            const entries = entryMap.get(`${gradeCode}:${subjectCode}`)
            if (!entries?.length) continue

            const totalHours = entries.reduce((s, e) => s + e.volumeHoraire, 0)

            const existingCurr = await prisma.gradeCurriculum.findFirst({
              where: { gradeId: grade.id, subjectId: sub.id },
            })

            let gcId: string
            if (existingCurr) {
              await prisma.gradeCurriculum.update({
                where: { id: existingCurr.id },
                data: { hoursPerWeek: totalHours },
              })
              gcId = existingCurr.id
            } else {
              const gc = await prisma.gradeCurriculum.create({
                data: { gradeId: grade.id, subjectId: sub.id, hoursPerWeek: totalHours },
              })
              gcId = gc.id
              curriculumCreated++
            }

            // Delete existing sessions then recreate
            await prisma.curriculumSession.deleteMany({ where: { curriculumId: gcId } })

            for (const entry of entries) {
              await prisma.curriculumSession.create({
                data: {
                  curriculumId: gcId,
                  sequence: entry.sequence,
                  duration: entry.volumeHoraire,
                  sessionTypeCode: entry.codeTypeCours,
                  isGroup: entry.parGroupe,
                  isBiweekly: entry.parQuinzaine,
                  pairingCode: entry.codeAss,
                },
              })
              sessionsCreated++
            }
          }
        }
      }

      return NextResponse.json({
        created: gradesCreated,
        skipped: gradesSkipped,
        updated: gradesUpdated,
        subjectsCreated,
        subjectsSkipped,
        curriculumCreated,
        sessionsCreated,
      })
    }

    if (type === 'subjects') {
      const existing = await prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, nameAr: true, nameFr: true, name: true },
      })

      let created = 0
      let skipped = 0
      let updated = 0

      for (const item of items as SubjectItem[]) {
        // Check if subject already exists by nameAr, nameFr, or name
        const match = existing.find(
          (s) =>
            (s.nameAr && s.nameAr.toLowerCase() === item.nameAr.toLowerCase()) ||
            (s.name && s.name.toLowerCase() === (item.nameFr || item.nameAr).toLowerCase()) ||
            (s.nameFr && item.nameFr && s.nameFr.toLowerCase() === item.nameFr.toLowerCase()),
        )

        if (match) {
          // Update nameAr/nameFr if missing on existing subject
          if (!match.nameAr || !match.nameFr) {
            await prisma.subject.update({
              where: { id: match.id },
              data: {
                nameAr: match.nameAr || item.nameAr,
                nameFr: match.nameFr || item.nameFr || null,
              },
            })
            updated++
          }
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

      // Auto-populate GradeCurriculum using TunisianCurriculumEntry reference data
      const schoolGrades = await prisma.grade.findMany({
        where: { schoolId },
        select: { id: true, nameAr: true, name: true },
      })
      const allSubjects = await prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, nameAr: true, category: true, name: true },
      })

      // Fetch reference data for grade-specific curriculum
      let tunisianEntries: {
        gradeLevelCode: string
        subjectCode: string
        sequence: number
        volumeHoraire: number
        parGroupe: boolean
        parQuinzaine: boolean
        codeTypeCours: number
        codeAss: number
      }[] = []
      let tunisianGrades: { code: string; nameAr: string; nameFr: string | null }[] = []
      let tunisianSubjects: { code: string; nameAr: string; nameFr: string | null }[] = []

      try {
        ;[tunisianEntries, tunisianGrades, tunisianSubjects] = await Promise.all([
          prisma.tunisianCurriculumEntry.findMany(),
          prisma.tunisianGradeLevel.findMany({ select: { code: true, nameAr: true, nameFr: true } }),
          prisma.tunisianSubject.findMany({ select: { code: true, nameAr: true, nameFr: true } }),
        ])
      } catch {
        // Tables may not exist yet (D1 migration pending)
      }

      let curriculumCreated = 0
      let sessionsCreated = 0
      const usedReferenceData = tunisianEntries.length > 0

      if (schoolGrades.length > 0 && allSubjects.length > 0) {
        if (usedReferenceData) {
          // Build lookup maps: try nameAr first, then nameFr, then name
          const gradeNameToCode = new Map<string, string>()
          for (const g of tunisianGrades) {
            gradeNameToCode.set(g.nameAr, g.code)
            if (g.nameFr) gradeNameToCode.set(g.nameFr, g.code)
          }
          const subjectNameToCode = new Map<string, string>()
          for (const s of tunisianSubjects) {
            subjectNameToCode.set(s.nameAr, s.code)
            if (s.nameFr) subjectNameToCode.set(s.nameFr, s.code)
          }

          // Group entries by gradeCode:subjectCode
          const entryMap = new Map<string, typeof tunisianEntries>()
          for (const e of tunisianEntries) {
            const key = `${e.gradeLevelCode}:${e.subjectCode}`
            if (!entryMap.has(key)) entryMap.set(key, [])
            entryMap.get(key)!.push(e)
          }

          for (const grade of schoolGrades) {
            // Match school grade → Tunisian grade code by nameAr, nameFr, or name
            const gradeCode = gradeNameToCode.get(grade.nameAr || '')
              || gradeNameToCode.get(grade.name || '')
            if (!gradeCode) continue

            for (const sub of allSubjects) {
              // Match school subject → Tunisian subject code by nameAr, nameFr, or name
              const subjectCode = subjectNameToCode.get(sub.nameAr || '')
                || subjectNameToCode.get(sub.name || '')
              if (!subjectCode) continue

              const entries = entryMap.get(`${gradeCode}:${subjectCode}`)
              if (!entries?.length) continue // Subject not in this grade's curriculum

              const totalHours = entries.reduce((s, e) => s + e.volumeHoraire, 0)

              // Skip if curriculum already exists
              const existing = await prisma.gradeCurriculum.findFirst({
                where: { gradeId: grade.id, subjectId: sub.id },
              })

              let gcId: string
              if (existing) {
                // Update hours to match reference data
                await prisma.gradeCurriculum.update({
                  where: { id: existing.id },
                  data: { hoursPerWeek: totalHours },
                })
                gcId = existing.id
              } else {
                const gc = await prisma.gradeCurriculum.create({
                  data: { gradeId: grade.id, subjectId: sub.id, hoursPerWeek: totalHours },
                })
                gcId = gc.id
                curriculumCreated++
              }

              // Delete existing sessions for this curriculum entry then recreate
              await prisma.curriculumSession.deleteMany({ where: { curriculumId: gcId } })

              // Create CurriculumSession entries
              for (const entry of entries) {
                await prisma.curriculumSession.create({
                  data: {
                    curriculumId: gcId,
                    sequence: entry.sequence,
                    duration: entry.volumeHoraire,
                    sessionTypeCode: entry.codeTypeCours,
                    isGroup: entry.parGroupe,
                    isBiweekly: entry.parQuinzaine,
                    pairingCode: entry.codeAss,
                  },
                })
                sessionsCreated++
              }
            }
          }
        } else {
          // Fallback: flat hours when no reference data exists
          for (const grade of schoolGrades) {
            for (const sub of allSubjects) {
              const code = sub.nameAr || ''
              const hoursPerWeek = SUBJECT_HOURS_BY_CODE[code]
                ?? DEFAULT_HOURS_BY_CATEGORY[sub.category || 'CORE']
                ?? 2

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
      }

      return NextResponse.json({ created, skipped, updated, curriculumCreated, sessionsCreated })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err) {
    console.error('[Reference Import]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
