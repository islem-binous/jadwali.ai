import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'
import { invalidateSettingsCache } from '@/lib/app-settings'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  try {
    const prisma = await getPrisma()
    let settings = await prisma.appSettings.findFirst({ where: { id: 'default' } })
    if (!settings) {
      settings = await prisma.appSettings.create({ data: { id: 'default' } })
    }
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
      'defaultLanguage', 'passwordMinLength',
      'sessionDurationHours', 'aiEnabled', 'trialPeriodDays', 'maxSchools',
    ]
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    let settings = await prisma.appSettings.findFirst({ where: { id: 'default' } })
    if (!settings) {
      settings = await prisma.appSettings.create({ data: { id: 'default', ...data } })
    } else {
      settings = await prisma.appSettings.update({ where: { id: 'default' }, data })
    }

    invalidateSettingsCache()
    return NextResponse.json(settings)
  } catch (err) {
    console.error('[Settings PUT Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
