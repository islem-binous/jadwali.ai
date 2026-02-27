import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'
import { invalidateSettingsCache } from '@/lib/app-settings'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  try {
    const prisma = await getPrisma()
    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    })
    return NextResponse.json(settings)
  } catch (err) {
    console.error('[Settings GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  try {
    const body = await request.json()
    const prisma = await getPrisma()

    const allowed = [
      'platformName', 'maintenanceMode', 'registrationEnabled',
      'googleOAuthEnabled', 'defaultLanguage', 'passwordMinLength',
      'sessionDurationHours', 'aiEnabled', 'trialPeriodDays', 'maxSchools',
    ]
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    })

    invalidateSettingsCache()
    return NextResponse.json(settings)
  } catch (err) {
    console.error('[Settings PUT Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
