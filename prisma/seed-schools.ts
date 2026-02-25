import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import path from 'path'
import crypto from 'crypto'

const db = new Database(path.join(__dirname, '..', 'dev.db'))

function cuid(): string {
  return crypto.randomBytes(12).toString('base64url')
}

function main() {
  console.log('Seeding Tunisian reference data...')

  // ── Read Governorate Excel ──────────────────────────────────
  const gouvPath = path.join(__dirname, '..', 'data', 'Gouv_list.xlsx')
  const gouvWb = XLSX.readFile(gouvPath)
  const gouvSheet = gouvWb.Sheets[gouvWb.SheetNames[0]]
  const gouvRows = XLSX.utils.sheet_to_json<{
    auto: number
    CodeGouv: string
    LibeGouvAr: string
    Libelle: string
  }>(gouvSheet)

  console.log(`  Found ${gouvRows.length} governorates`)

  const insertGouv = db.prepare(
    'INSERT INTO Governorate (id, code, nameAr) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET nameAr = excluded.nameAr'
  )

  const insertGouvMany = db.transaction((rows: typeof gouvRows) => {
    for (const row of rows) {
      insertGouv.run(cuid(), String(row.CodeGouv), row.Libelle)
    }
  })

  insertGouvMany(gouvRows)
  console.log(`  Inserted ${gouvRows.length} governorates`)

  // ── Read Schools Excel ──────────────────────────────────────
  const schoolsPath = path.join(__dirname, '..', 'data', 'all_school_in_tunisia.xlsx')
  const schoolsWb = XLSX.readFile(schoolsPath)
  const schoolsSheet = schoolsWb.Sheets[schoolsWb.SheetNames[0]]
  const schoolRows = XLSX.utils.sheet_to_json<{
    auto: number
    CodeEtab: string
    LibeEtabAr: string
    CodeGouv: string
    CodeTypeEtab: number
    CodeDele: string
  }>(schoolsSheet)

  console.log(`  Found ${schoolRows.length} school rows`)

  const insertSchool = db.prepare(
    'INSERT INTO TunisianSchool (id, code, nameAr, governorateCode, zipCode) VALUES (?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET nameAr = excluded.nameAr, governorateCode = excluded.governorateCode, zipCode = excluded.zipCode'
  )

  const seen = new Set<string>()
  let skipped = 0
  let inserted = 0

  const insertSchoolMany = db.transaction((rows: typeof schoolRows) => {
    for (const row of rows) {
      const code = String(row.CodeEtab)
      if (seen.has(code)) {
        skipped++
        continue
      }
      seen.add(code)
      insertSchool.run(cuid(), code, row.LibeEtabAr, String(row.CodeGouv), String(row.CodeDele))
      inserted++
    }
  })

  insertSchoolMany(schoolRows)

  console.log(`  Inserted ${inserted} schools (skipped ${skipped} duplicates)`)
  console.log('Tunisian reference data seeded!')
}

main()
db.close()
