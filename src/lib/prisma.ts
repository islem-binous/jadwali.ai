// Prisma client with D1 adapter for Cloudflare Workers, SQLite fallback for local dev.
//
// CRITICAL: D1 bindings (env.DB) are request-scoped in Cloudflare Workers.
// Caching PrismaClient across requests causes hangs because the cached client
// holds a stale D1 binding from a previous request context.
// Solution: Create a fresh PrismaClient per request for D1, cache only for SQLite (local dev).

import type { PrismaClient } from '@prisma/client/edge'

// Cache imported modules (class definitions are safe to cache across requests)
let _PC: (new (opts?: unknown) => PrismaClient) | null = null
let _PrismaD1: (new (db: unknown) => unknown) | null = null
let _getCloudflareContext: (() => Promise<{ env: Record<string, unknown> }>) | null = null

// Track whether we're running on D1 or SQLite
let _isD1: boolean | null = null

// SQLite client is safe to cache (no request-scoped bindings)
let _sqlitePrisma: PrismaClient | null = null

async function ensureImports(): Promise<void> {
  if (_PC) return
  const mod = await import('@prisma/client/edge')
  _PC = mod.PrismaClient as unknown as typeof _PC
}

export async function getPrisma(): Promise<PrismaClient> {
  await ensureImports()

  // Try Cloudflare D1 (production) — fresh client per request
  if (_isD1 !== false) {
    try {
      if (!_PrismaD1) {
        const mod = await import('@prisma/adapter-d1')
        _PrismaD1 = mod.PrismaD1 as unknown as typeof _PrismaD1
      }
      if (!_getCloudflareContext) {
        const mod = await import('@opennextjs/cloudflare')
        _getCloudflareContext = mod.getCloudflareContext as unknown as typeof _getCloudflareContext
      }

      const { env } = await _getCloudflareContext!()
      const adapter = new _PrismaD1!(env.DB)
      _isD1 = true

      // Always create a fresh PrismaClient with the current request's D1 binding
      return new _PC!({ adapter }) as PrismaClient
    } catch {
      _isD1 = false
    }
  }

  // Local dev: SQLite fallback (safe to cache)
  if (!_sqlitePrisma) {
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
    const path = await import('path')
    const dbPath = path.join(process.cwd(), 'dev.db')
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
    _sqlitePrisma = new _PC!({ adapter }) as PrismaClient
  }

  return _sqlitePrisma
}
