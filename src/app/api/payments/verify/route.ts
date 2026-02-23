import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { verifyKonnectPayment, verifyPaymeePayment } from '@/lib/payment'
import { activateSubscription, computePeriodEnd } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()
    const payment = await prisma.payment.findUnique({ where: { orderId } })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'COMPLETED') {
      return NextResponse.json({
        status: 'COMPLETED',
        plan: payment.plan,
        periodEnd: payment.periodEnd,
      })
    }

    const verification =
      payment.provider === 'konnect'
        ? await verifyKonnectPayment(payment.providerRef)
        : await verifyPaymeePayment(payment.providerRef)

    if (verification.status === 'COMPLETED') {
      const periodEnd = computePeriodEnd(
        payment.billingCycle as 'monthly' | 'annual'
      )

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          periodStart: new Date(),
          periodEnd,
        },
      })

      await activateSubscription(
        payment.schoolId,
        payment.plan,
        payment.billingCycle as 'monthly' | 'annual',
        payment.provider
      )

      return NextResponse.json({
        status: 'COMPLETED',
        plan: payment.plan,
        periodEnd,
      })
    }

    return NextResponse.json({ status: 'PENDING' })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
