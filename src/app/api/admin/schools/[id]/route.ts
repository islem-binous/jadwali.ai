import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()

  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          teachers: true,
          classes: true,
          subjects: true,
          rooms: true,
          payments: true,
          staffMembers: true,
        },
      },
    },
  })

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({ school })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()
  const body = await request.json()

  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  const updated = await prisma.school.update({
    where: { id },
    data: {
      name: body.name ?? school.name,
      slug: body.slug ?? school.slug,
      language: body.language ?? school.language,
      plan: body.plan ?? school.plan,
      subscriptionStatus: body.subscriptionStatus ?? school.subscriptionStatus,
      subscriptionEndsAt: body.subscriptionEndsAt ? new Date(body.subscriptionEndsAt) : school.subscriptionEndsAt,
    },
  })

  return NextResponse.json({ school: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()

  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  await prisma.school.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
