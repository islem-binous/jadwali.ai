import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyKonnectPayment } from '@/lib/payment'
import { activateSubscription, computePeriodEnd } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  const paymentRef = req.nextUrl.searchParams.get('payment_ref')

  if (!paymentRef) {
    return NextResponse.json({ error: 'Missing payment_ref' }, { status: 400 })
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { providerRef: paymentRef, provider: 'konnect' },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'COMPLETED') {
      return NextResponse.json({ ok: true, message: 'Already processed' })
    }

    const verification = await verifyKonnectPayment(paymentRef)

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
        'konnect'
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Konnect webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
