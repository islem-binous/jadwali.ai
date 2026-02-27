import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()

  const [
    schoolCount,
    userCount,
    teacherCount,
    studentCount,
    staffCount,
    paymentCount,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.user.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.staff.count(),
    prisma.payment.count({ where: { status: 'COMPLETED' } }),
  ])

  // Plan breakdown
  const schools = await prisma.school.findMany({
    select: { plan: true, subscriptionStatus: true },
  })

  const planBreakdown: Record<string, number> = {}
  const statusBreakdown: Record<string, number> = {}
  for (const s of schools) {
    planBreakdown[s.plan] = (planBreakdown[s.plan] || 0) + 1
    statusBreakdown[s.subscriptionStatus] = (statusBreakdown[s.subscriptionStatus] || 0) + 1
  }

  // Total revenue
  const payments = await prisma.payment.findMany({
    where: { status: 'COMPLETED' },
    select: { amount: true },
  })
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

  return NextResponse.json({
    schoolCount,
    userCount,
    teacherCount,
    studentCount,
    staffCount,
    paymentCount,
    totalRevenue,
    planBreakdown,
    statusBreakdown,
  })
}
