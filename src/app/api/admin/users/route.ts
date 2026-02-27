import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const url = new URL(request.url)
  const search = url.searchParams.get('search') || ''
  const role = url.searchParams.get('role') || ''
  const schoolId = url.searchParams.get('schoolId') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ]
  }
  if (role) {
    where.role = role
  }
  if (schoolId) {
    where.schoolId = schoolId
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      school: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const body = await request.json()
  const { email, name, role, language, schoolId } = body

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'Email, name, and role are required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      authId: `admin_${crypto.randomUUID()}`,
      email,
      name,
      role,
      language: language || 'FR',
      schoolId: schoolId || null,
    },
    include: { school: { select: { name: true } } },
  })

  return NextResponse.json({ user }, { status: 201 })
}
