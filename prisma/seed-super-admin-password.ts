/**
 * One-time script to set SUPER_ADMIN password.
 * Uses the same PBKDF2 algorithm as the app.
 *
 * Usage: npx tsx prisma/seed-super-admin-password.ts
 */

import Database from 'better-sqlite3'
import path from 'path'
import { webcrypto } from 'crypto'

const ITERATIONS = 100_000
const KEY_LENGTH = 32
const SALT_LENGTH = 32

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPassword(password: string): Promise<string> {
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const encoder = new TextEncoder()
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  return `${bufferToHex(salt.buffer)}:${bufferToHex(derivedBits)}`
}

async function main() {
  const email = 'contact@d-code.lu'
  const password = 'Con?dco/AUahAh1d@Jadwali'

  console.log(`Hashing password for ${email}...`)
  const passwordHash = await hashPassword(password)
  console.log(`Hash: ${passwordHash}`)

  // Update local dev.db
  const dbPath = path.join(process.cwd(), 'dev.db')
  try {
    const db = new Database(dbPath)
    const result = db.prepare('UPDATE "User" SET passwordHash = ? WHERE email = ?').run(passwordHash, email)
    if (result.changes > 0) {
      console.log(`✅ Local dev.db updated for ${email}`)
    } else {
      console.log(`⚠️  No user found with email ${email} in local dev.db`)
    }
    db.close()
  } catch (err) {
    console.log(`⚠️  Could not update local dev.db: ${err}`)
  }

  // Output SQL for D1
  console.log('\n📋 Run this SQL on D1 production:')
  console.log(`npx wrangler d1 execute jadwali-db --remote --command "UPDATE \\"User\\" SET passwordHash = '${passwordHash}' WHERE email = '${email}'"`)
}

main().catch(console.error)
