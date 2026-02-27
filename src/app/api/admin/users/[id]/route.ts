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

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      school: { select: { id: true, name: true, plan: true } },
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true, classId: true } },
      staff: { select: { id: true, name: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
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

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: body.name ?? user.name,
      email: body.email ?? user.email,
      role: body.role ?? user.role,
      isActive: body.isActive ?? user.isActive,
      schoolId: body.schoolId !== undefined ? body.schoolId : user.schoolId,
      language: body.language ?? user.language,
      phone: body.phone !== undefined ? (body.phone || null) : user.phone,
    },
    include: { school: { select: { name: true } } },
  })

  return NextResponse.json({ user: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Cannot delete SUPER_ADMIN user' }, { status: 403 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
