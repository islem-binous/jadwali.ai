import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const url = new URL(request.url)
  const schoolId = url.searchParams.get('schoolId') || ''
  const status = url.searchParams.get('status') || ''

  const where: any = {}
  if (schoolId) where.schoolId = schoolId
  if (status) where.status = status

  const payments = await prisma.payment.findMany({
    where,
    include: {
      school: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ payments })
}
