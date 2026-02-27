import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'
import { invalidatePlansCache } from '@/lib/plans'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  try {
    const prisma = await getPrisma()
    const plans = await prisma.pricingPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(plans)
  } catch (err) {
    console.error('[Admin Plans GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  try {
    const body = await request.json()
    const { id, ...fields } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })
    }

    const prisma = await getPrisma()

    const allowed = [
      'nameEn', 'nameFr', 'nameAr',
      'priceMonthly', 'priceAnnual',
      'maxTeachers', 'maxClasses', 'maxTimetables',
      'aiGeneration', 'aiAssistant', 'substituteAI',
      'exportPDF', 'exportExcel', 'shareLink', 'multiUser',
      'support',
      'featureListEn', 'featureListFr', 'featureListAr',
      'highlighted', 'sortOrder', 'isActive',
    ]

    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in fields) data[key] = fields[key]
    }

    const plan = await prisma.pricingPlan.update({
      where: { id },
      data,
    })

    invalidatePlansCache()
    return NextResponse.json(plan)
  } catch (err) {
    console.error('[Admin Plans PUT Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
