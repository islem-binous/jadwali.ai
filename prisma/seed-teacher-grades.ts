import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

const db = new Database(path.join(__dirname, '..', 'dev.db'))

function cuid(): string {
  return crypto.randomBytes(12).toString('base64url')
}

const GRADES = [
  { code: 1, nameAr: 'استاذ أول للتعليم الثانوي', nameFr: "Professeur principal de l'enseignement secondaire", nameEn: 'Senior Secondary Teacher' },
  { code: 2, nameAr: 'استاذ تعليم ثانوي', nameFr: "Professeur de l'enseignement secondaire", nameEn: 'Secondary Teacher' },
  { code: 6, nameAr: 'أستاذ أول مميز', nameFr: 'Professeur principal distingué', nameEn: 'Distinguished Senior Teacher' },
  { code: 7, nameAr: 'أستاذ أول درجة إستثنائية', nameFr: 'Professeur principal hors classe', nameEn: 'Exceptional Grade Senior Teacher' },
  { code: 8, nameAr: 'أستاذ أول فوق الرتبة', nameFr: 'Professeur principal hors grade', nameEn: 'Above-Rank Senior Teacher' },
  { code: 9, nameAr: 'أستاذ أول', nameFr: 'Professeur principal', nameEn: 'Senior Teacher' },
  { code: 10, nameAr: 'عون وقتي أ 2', nameFr: 'Agent temporaire A2', nameEn: 'Temporary Agent A2' },
  { code: 12, nameAr: 'نائبة', nameFr: 'Suppléante', nameEn: 'Female Substitute' },
  { code: 13, nameAr: 'نائب', nameFr: 'Suppléant', nameEn: 'Male Substitute' },
]

function main() {
  console.log('Seeding Tunisian teacher grades...')

  const sqlLines: string[] = []
  const insert = db.prepare(
    'INSERT INTO TunisianTeacherGrade (id, code, nameAr, nameFr, nameEn) VALUES (?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET nameAr = excluded.nameAr, nameFr = excluded.nameFr, nameEn = excluded.nameEn'
  )

  db.transaction(() => {
    for (const g of GRADES) {
      const id = cuid()
      insert.run(id, g.code, g.nameAr, g.nameFr, g.nameEn)
      const ar = g.nameAr.replace(/'/g, "''")
      const fr = g.nameFr.replace(/'/g, "''")
      const en = g.nameEn.replace(/'/g, "''")
      sqlLines.push(`INSERT OR IGNORE INTO TunisianTeacherGrade (id, code, nameAr, nameFr, nameEn) VALUES ('${id}', ${g.code}, '${ar}', '${fr}', '${en}');`)
    }
  })()

  console.log(`  Inserted ${GRADES.length} teacher grades`)

  const sqlPath = path.join(__dirname, 'd1-seed-teacher-grades.sql')
  fs.writeFileSync(sqlPath, sqlLines.join('\n') + '\n')
  console.log(`  SQL for D1 written to ${sqlPath}`)
}

main()
