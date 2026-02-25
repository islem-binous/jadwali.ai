import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

const db = new Database(path.join(__dirname, '..', 'dev.db'))

function cuid(): string {
  return crypto.randomBytes(12).toString('base64url')
}

function main() {
  console.log('Seeding Tunisian curriculum reference data...')

  const sqlLines: string[] = []

  // ── Session Types (8 rows) ───────────────────────────────
  const catPath = path.join(__dirname, '..', 'data', 'subjects_categories.xlsx')
  const catWb = XLSX.readFile(catPath)
  const catRows = XLSX.utils.sheet_to_json<{
    CodeType: number
    Libelle: string
  }>(catWb.Sheets[catWb.SheetNames[0]])

  console.log(`  Found ${catRows.length} session types`)

  const insertCat = db.prepare(
    'INSERT INTO TunisianSessionType (id, code, nameAr) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET nameAr = excluded.nameAr'
  )

  db.transaction(() => {
    for (const row of catRows) {
      const id = cuid()
      insertCat.run(id, row.CodeType, row.Libelle)
      const escaped = row.Libelle.replace(/'/g, "''")
      sqlLines.push(`INSERT OR IGNORE INTO TunisianSessionType (id, code, nameAr) VALUES ('${id}', ${row.CodeType}, '${escaped}');`)
    }
  })()

  console.log(`  Inserted ${catRows.length} session types`)

  // ── Subjects (35 rows) ───────────────────────────────────
  const subPath = path.join(__dirname, '..', 'data', 'All_subjects.xlsx')
  const subWb = XLSX.readFile(subPath)
  const subRows = XLSX.utils.sheet_to_json<{
    CodeMatiere: string
    Libelle: string
    SubjectCategory: number
  }>(subWb.Sheets[subWb.SheetNames[0]])

  console.log(`  Found ${subRows.length} subjects`)

  const insertSub = db.prepare(
    'INSERT INTO TunisianSubject (id, code, nameAr, sessionTypeCode) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET nameAr = excluded.nameAr, sessionTypeCode = excluded.sessionTypeCode'
  )

  db.transaction(() => {
    for (const row of subRows) {
      const id = cuid()
      const code = String(row.CodeMatiere)
      insertSub.run(id, code, row.Libelle, row.SubjectCategory)
      const escapedCode = code.replace(/'/g, "''")
      const escapedName = row.Libelle.replace(/'/g, "''")
      sqlLines.push(`INSERT OR IGNORE INTO TunisianSubject (id, code, nameAr, sessionTypeCode) VALUES ('${id}', '${escapedCode}', '${escapedName}', ${row.SubjectCategory});`)
    }
  })()

  console.log(`  Inserted ${subRows.length} subjects`)

  // ── Grade Levels (25 rows) ───────────────────────────────
  const gradePath = path.join(__dirname, '..', 'data', 'all_schools_grades.xlsx')
  const gradeWb = XLSX.readFile(gradePath)
  const gradeRows = XLSX.utils.sheet_to_json<{
    CodeNiveau: string
    LibelleNiveau: string
  }>(gradeWb.Sheets[gradeWb.SheetNames[0]])

  console.log(`  Found ${gradeRows.length} grade levels`)

  const insertGrade = db.prepare(
    'INSERT INTO TunisianGradeLevel (id, code, nameAr) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET nameAr = excluded.nameAr'
  )

  db.transaction(() => {
    for (const row of gradeRows) {
      const id = cuid()
      const code = String(row.CodeNiveau)
      insertGrade.run(id, code, row.LibelleNiveau)
      const escapedCode = code.replace(/'/g, "''")
      const escapedName = row.LibelleNiveau.replace(/'/g, "''")
      sqlLines.push(`INSERT OR IGNORE INTO TunisianGradeLevel (id, code, nameAr) VALUES ('${id}', '${escapedCode}', '${escapedName}');`)
    }
  })()

  console.log(`  Inserted ${gradeRows.length} grade levels`)

  // ── Write SQL seed file ──────────────────────────────────
  const sqlPath = path.join(__dirname, 'seed-curriculum.sql')
  fs.writeFileSync(sqlPath, sqlLines.join('\n') + '\n')
  console.log(`  Generated ${sqlPath} (${sqlLines.length} statements)`)

  console.log('Tunisian curriculum reference data seeded!')
}

main()
db.close()
