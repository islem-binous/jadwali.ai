// Prisma client with D1 adapter for Cloudflare Workers, SQLite fallback for local dev.
// PrismaClient VALUE is dynamically imported to avoid WASM initialization crashes at module load time.
// Type-only import is safe — stripped at compile time, no WASM loading.

import type { PrismaClient } from '@prisma/client/edge'

let cachedPrisma: PrismaClient | null = null

export async function getPrisma(): Promise<PrismaClient> {
  if (cachedPrisma) return cachedPrisma

  // Try Cloudflare D1 first (production), fall back to better-sqlite3 (local dev)
  try {
    const { PrismaClient: PC } = await import('@prisma/client/edge')
    const { PrismaD1 } = await import('@prisma/adapter-d1')
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext()
    const adapter = new PrismaD1(env.DB)
    cachedPrisma = new PC({ adapter }) as PrismaClient
  } catch (d1Err) {
    try {
      // Local dev: use better-sqlite3 adapter with SQLite file
      const { PrismaClient: PC } = await import('@prisma/client/edge')
      const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
      const path = await import('path')
      const dbPath = path.join(process.cwd(), 'dev.db')
      const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
      cachedPrisma = new PC({ adapter }) as PrismaClient
    } catch (sqliteErr) {
      console.error('[getPrisma] D1 error:', d1Err)
      console.error('[getPrisma] SQLite fallback error:', sqliteErr)
      throw new Error('Failed to initialize database connection')
    }
  }

  return cachedPrisma!
}

/**
 * Reset cached Prisma client. Call when a query fails due to stale connection.
 */
export function resetPrismaCache() {
  cachedPrisma = null
}
