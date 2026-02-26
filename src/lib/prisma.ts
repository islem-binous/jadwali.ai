import { PrismaClient } from '@prisma/client'

let cachedPrisma: PrismaClient | null = null

export async function getPrisma(): Promise<PrismaClient> {
  if (cachedPrisma) return cachedPrisma

  if (process.env.NODE_ENV === 'development' || !process.env.CF_PAGES) {
    // Local dev: use better-sqlite3 adapter
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
    const path = await import('path')
    const dbPath = path.join(process.cwd(), 'dev.db')
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
    cachedPrisma = new PrismaClient({ adapter })
  } else {
    // Cloudflare Workers: use D1 adapter
    const { PrismaD1 } = await import('@prisma/adapter-d1')
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext()
    const adapter = new PrismaD1(env.DB)
    cachedPrisma = new PrismaClient({ adapter })
  }

  return cachedPrisma
}
