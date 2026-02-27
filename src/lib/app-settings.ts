/**
 * App-wide settings with in-memory caching.
 * Single-row "AppSettings" table (id = "default").
 */

import { getPrisma } from '@/lib/prisma'

export interface AppSettings {
  platformName: string
  maintenanceMode: boolean
  registrationEnabled: boolean
  googleOAuthEnabled: boolean
  defaultLanguage: string
  passwordMinLength: number
  sessionDurationHours: number
  aiEnabled: boolean
  trialPeriodDays: number
  maxSchools: number
}

const CACHE_TTL = 60_000 // 60 seconds
let cached: { data: AppSettings; ts: number } | null = null

export async function getAppSettings(): Promise<AppSettings> {
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  const prisma = await getPrisma()
  let row = await prisma.appSettings.findFirst({ where: { id: 'default' } })
  if (!row) {
    row = await prisma.appSettings.create({ data: { id: 'default' } })
  }

  const data: AppSettings = {
    platformName: row.platformName,
    maintenanceMode: row.maintenanceMode,
    registrationEnabled: row.registrationEnabled,
    googleOAuthEnabled: row.googleOAuthEnabled,
    defaultLanguage: row.defaultLanguage,
    passwordMinLength: row.passwordMinLength,
    sessionDurationHours: row.sessionDurationHours,
    aiEnabled: row.aiEnabled,
    trialPeriodDays: row.trialPeriodDays,
    maxSchools: row.maxSchools,
  }

  cached = { data, ts: Date.now() }
  return data
}

export function invalidateSettingsCache() {
  cached = null
}
