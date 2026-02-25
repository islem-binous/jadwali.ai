import { PrismaClient } from '@/generated/prisma/client/edge'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Cache PrismaClient in the global scope to avoid re-initializing
// the WASM query engine on every request within the same isolate
let cachedPrisma: PrismaClient | null = null

export async function getPrisma(): Promise<PrismaClient> {
  if (cachedPrisma) return cachedPrisma
  const { env } = await getCloudflareContext()
  const adapter = new PrismaD1(env.DB)
  cachedPrisma = new PrismaClient({ adapter })
  return cachedPrisma
}
