import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const url = new URL(request.url)
  const search = url.searchParams.get('search') || ''
  const plan = url.searchParams.get('plan') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
    ]
  }
  if (plan) {
    where.plan = plan
  }

  const schools = await prisma.school.findMany({
    where,
    include: {
      _count: {
        select: {
          users: true,
          teachers: true,
          classes: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ schools })
}

export async function POST(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const body = await request.json()
  const { name, slug, language, plan } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
  }

  const existing = await prisma.school.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  }

  const school = await prisma.school.create({
    data: {
      name,
      slug,
      language: language || 'FR',
      plan: plan || 'FREE',
    },
  })

  return NextResponse.json({ school }, { status: 201 })
}
