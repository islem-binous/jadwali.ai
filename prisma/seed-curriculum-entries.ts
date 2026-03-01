import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

const db = new Database(path.join(__dirname, '..', 'dev.db'))

function cuid(): string {
  return crypto.randomBytes(12).toString('base64url')
}

// ── Subject code mapping: distribution file → TunisianSubject.code ──
const CODE_MAP: Record<string, string> = {
  'ت إسلامية': 'ت.إسلامية',
  'ت بدنية': 'ت.بدنية',
  'ت تكنولوجية': 'ت.تكنولوجية',
  'ت مدنية': 'ت.مدنية',
  'ت مسرحية': 'ت.مسرحية',
  'تربية تشكيلية': 'ت.تشكيلية',
  'تربية موسيقية': 'ت.موسيقية',
  'تك. المعلومات': 'تك.المعلومات',
  'ع الح و الأرض': 'ع.الح.و.الأرض',
  'ع فيزيائية': 'ع.فيزيائية',
  'ع. بيولوجية': 'ع.بيولوجية',
  'ق البيانات': 'ق,البيانات',
}

function normalizeSubjectCode(raw: string): string {
  return CODE_MAP[raw] ?? raw
}

function main() {
  console.log('Seeding Tunisian curriculum entries (per-grade subject distribution)...')

  const sqlLines: string[] = []

  // ── Read distribution Excel ─────────────────────────────
  const filePath = path.join(__dirname, '..', 'data', 'subjects_distribution_and_duration_per_week.xlsx')
  const wb = XLSX.readFile(filePath)
  const rows = XLSX.utils.sheet_to_json<{
    IDProgramme: number
    CodeNiveau: string
    CodeMatiere: string
    CodeTypeCours: number
    VolumeHoraire: number
    ParGroupe: boolean
    ParQuinzaine: boolean
    CodeAss: number
  }>(wb.Sheets[wb.SheetNames[0]])

  console.log(`  Found ${rows.length} distribution rows`)

  // Verify that referenced grade codes exist in TunisianGradeLevel
  const existingGrades = db.prepare('SELECT code FROM TunisianGradeLevel').all() as { code: string }[]
  const gradeSet = new Set(existingGrades.map(g => g.code))
  console.log(`  Existing grade levels: ${gradeSet.size}`)

  // Verify that referenced subject codes exist in TunisianSubject
  const existingSubjects = db.prepare('SELECT code FROM TunisianSubject').all() as { code: string }[]
  const subjectSet = new Set(existingSubjects.map(s => s.code))
  console.log(`  Existing subjects: ${subjectSet.size}`)

  // ── Group by (gradeCode, subjectCode) and assign sequence ──
  const grouped = new Map<string, typeof rows>()
  let skippedGrade = 0
  let skippedSubject = 0

  for (const row of rows) {
    const gradeCode = String(row.CodeNiveau)
    const subjectCode = normalizeSubjectCode(String(row.CodeMatiere))

    if (!gradeSet.has(gradeCode)) {
      skippedGrade++
      continue
    }
    if (!subjectSet.has(subjectCode)) {
      console.warn(`  Warning: subject code "${subjectCode}" (raw: "${row.CodeMatiere}") not found in TunisianSubject`)
      skippedSubject++
      continue
    }

    const key = `${gradeCode}:${subjectCode}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push({ ...row, CodeMatiere: subjectCode })
  }

  if (skippedGrade > 0) console.warn(`  Skipped ${skippedGrade} rows with unknown grade codes`)
  if (skippedSubject > 0) console.warn(`  Skipped ${skippedSubject} rows with unknown subject codes`)

  // ── Insert into TunisianCurriculumEntry ──
  const insertStmt = db.prepare(`
    INSERT INTO TunisianCurriculumEntry (id, gradeLevelCode, subjectCode, sequence, volumeHoraire, parGroupe, parQuinzaine, codeTypeCours, codeAss)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(gradeLevelCode, subjectCode, sequence) DO UPDATE SET
      volumeHoraire = excluded.volumeHoraire,
      parGroupe = excluded.parGroupe,
      parQuinzaine = excluded.parQuinzaine,
      codeTypeCours = excluded.codeTypeCours,
      codeAss = excluded.codeAss
  `)

  let totalInserted = 0

  db.transaction(() => {
    for (const [key, entries] of grouped) {
      const [gradeCode, subjectCode] = key.split(':')

      for (let seq = 0; seq < entries.length; seq++) {
        const entry = entries[seq]
        const id = cuid()
        const sequence = seq + 1

        insertStmt.run(
          id,
          gradeCode,
          subjectCode,
          sequence,
          entry.VolumeHoraire,
          entry.ParGroupe ? 1 : 0,
          entry.ParQuinzaine ? 1 : 0,
          entry.CodeTypeCours,
          entry.CodeAss,
        )

        const escapedGrade = gradeCode.replace(/'/g, "''")
        const escapedSubject = subjectCode.replace(/'/g, "''")
        sqlLines.push(
          `INSERT OR REPLACE INTO TunisianCurriculumEntry (id, gradeLevelCode, subjectCode, sequence, volumeHoraire, parGroupe, parQuinzaine, codeTypeCours, codeAss) VALUES ('${id}', '${escapedGrade}', '${escapedSubject}', ${sequence}, ${entry.VolumeHoraire}, ${entry.ParGroupe ? 1 : 0}, ${entry.ParQuinzaine ? 1 : 0}, ${entry.CodeTypeCours}, ${entry.CodeAss});`
        )
        totalInserted++
      }
    }
  })()

  console.log(`  Inserted ${totalInserted} curriculum entries across ${grouped.size} grade-subject combinations`)

  // ── Write SQL seed file ──
  const sqlPath = path.join(__dirname, 'seed-curriculum-entries.sql')
  fs.writeFileSync(sqlPath, sqlLines.join('\n') + '\n')
  console.log(`  Generated ${sqlPath} (${sqlLines.length} statements)`)

  // ── Print summary per grade ──
  const gradeSummary = new Map<string, { subjects: number; sessions: number; totalHours: number }>()
  for (const [key, entries] of grouped) {
    const gradeCode = key.split(':')[0]
    if (!gradeSummary.has(gradeCode)) {
      gradeSummary.set(gradeCode, { subjects: 0, sessions: 0, totalHours: 0 })
    }
    const gs = gradeSummary.get(gradeCode)!
    gs.subjects++
    gs.sessions += entries.length
    gs.totalHours += entries.reduce((s, e) => s + e.VolumeHoraire, 0)
  }

  console.log('\n  Grade Summary:')
  for (const [code, stats] of [...gradeSummary].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${code}: ${stats.subjects} subjects, ${stats.sessions} sessions, ${stats.totalHours}h/week`)
  }

  console.log('\nTunisian curriculum entries seeded!')
}

main()
db.close()
