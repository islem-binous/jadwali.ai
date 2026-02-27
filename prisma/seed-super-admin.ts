import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

const dbPath = path.join(process.cwd(), 'dev.db')
const db = new Database(dbPath)

const id = crypto.randomUUID()
const authId = `local_${crypto.randomUUID()}`
const email = 'superadmin@schediq.com'
const name = 'Super Admin'

// Check if already exists
const existing = db.prepare('SELECT id FROM "User" WHERE email = ?').get(email)
if (existing) {
  console.log(`SUPER_ADMIN already exists (email: ${email})`)
  process.exit(0)
}

db.prepare(`
  INSERT INTO "User" ("id", "authId", "email", "name", "role", "language", "isActive", "schoolId", "createdAt")
  VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 'EN', 1, NULL, datetime('now'))
`).run(id, authId, email, name)

console.log('SUPER_ADMIN created successfully:')
console.log(`  id:    ${id}`)
console.log(`  email: ${email}`)
console.log(`  name:  ${name}`)
console.log(`  role:  SUPER_ADMIN`)

db.close()
