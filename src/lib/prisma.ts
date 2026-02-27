// Use /edge entry point which uses WASM (required for Cloudflare Workers)
// This works in both Node.js (local dev) and Cloudflare Workers (production)
import { PrismaClient } from '@prisma/client/edge'

let cachedPrisma: PrismaClient | null = null

export async function getPrisma(): Promise<PrismaClient> {
  if (cachedPrisma) return cachedPrisma

  // Try Cloudflare D1 first (production), fall back to better-sqlite3 (local dev)
  try {
    const { PrismaD1 } = await import('@prisma/adapter-d1')
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext()
    const adapter = new PrismaD1(env.DB)
    cachedPrisma = new PrismaClient({ adapter })
  } catch (d1Err) {
    console.error('[getPrisma] D1 adapter failed, falling back to better-sqlite3:', d1Err)
    // Local dev: use better-sqlite3 adapter with SQLite file
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
    const path = await import('path')
    const dbPath = path.join(process.cwd(), 'dev.db')
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
    cachedPrisma = new PrismaClient({ adapter })
  }

  return cachedPrisma
}
