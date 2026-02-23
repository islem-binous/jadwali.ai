import { getPrisma } from '@/lib/prisma'

export function computePeriodEnd(
  cycle: 'monthly' | 'annual',
  from?: Date
): Date {
  const start = from || new Date()
  const end = new Date(start)
  if (cycle === 'monthly') {
    end.setMonth(end.getMonth() + 1)
  } else {
    end.setFullYear(end.getFullYear() + 1)
  }
  return end
}

export async function activateSubscription(
  schoolId: string,
  plan: string,
  billingCycle: 'monthly' | 'annual',
  provider: string
) {
  const prisma = await getPrisma()
  const periodEnd = computePeriodEnd(billingCycle)

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      plan,
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: periodEnd,
      paymentProvider: provider,
    },
  })

  return { plan, subscriptionEndsAt: periodEnd }
}

export async function checkAndDowngradeExpired(
  schoolId: string
): Promise<boolean> {
  const prisma = await getPrisma()
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { plan: true, subscriptionStatus: true, subscriptionEndsAt: true },
  })

  if (!school) return false
  if (school.plan === 'FREE') return false
  if (school.subscriptionStatus !== 'ACTIVE') return false
  if (!school.subscriptionEndsAt) return false

  if (school.subscriptionEndsAt <= new Date()) {
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        plan: 'FREE',
        subscriptionStatus: 'EXPIRED',
      },
    })
    return true
  }

  return false
}
